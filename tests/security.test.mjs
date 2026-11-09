import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import { passwordError } from '../src/password.ts'

test('password policy accepts long phrases and rejects weak or oversized passwords', () => {
  for (const value of ['123456789', 'abcdefgh', 'ABCDEFGH', 'Abc123']) assert.ok(passwordError(value))
  for (const value of ['ExamplePass123', 'Uzun bir Parola 123!', 'TürkçeŞifre123']) assert.equal(passwordError(value), null)
  assert.ok(passwordError('Aa1' + 'x'.repeat(70)))
  assert.equal(passwordError('Aa1' + 'x'.repeat(69)), null)
})

test('idle sessions, shared activity, revocation and logout retries', async () => {
  const originalNow = Date.now
  const saved = new Map()
  const listeners = new Map()
  let now = 1_800_000_000_000, nextId = 0, stateChange, signouts = 0, active = true, failLogout = false
  const timers = new Map()
  const schedule = (fn, ms, repeat = false) => { const id = ++nextId; timers.set(id, { fn, at: now + ms, ms, repeat }); return id }
  const emit = (event, value = {}) => { for (const fn of listeners.get(event) || []) fn(value) }
  const flush = async () => { for(let i=0;i<8;i++) await Promise.resolve() }
  const advance = async ms => {
    const end = now + ms
    while (true) {
      const due = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a,b) => a[1].at-b[1].at)[0]
      if (!due) break
      const [id,t] = due; now=t.at; timers.delete(id); if(t.repeat) timers.set(id,{...t,at:now+t.ms}); t.fn(); await flush()
    }
    now=end; await flush()
  }
  Date.now = () => now
  globalThis.window = { setTimeout: (fn,ms) => schedule(fn,ms), clearTimeout: id=>timers.delete(id), setInterval:(fn,ms)=>schedule(fn,ms,true), addEventListener:(event,fn)=>listeners.set(event,[...(listeners.get(event)||[]),fn]) }
  globalThis.document = {hidden:false,addEventListener:window.addEventListener}
  globalThis.localStorage = { getItem:key=>saved.get(key)??null, setItem:(key,value)=>saved.set(key,value) }
  globalThis.__sessionTestClient = {
    auth: { onAuthStateChange: fn => { stateChange=fn }, signOut: async () => { signouts++; if(failLogout) return {error:new Error('offline')}; stateChange('SIGNED_OUT',null); return {error:null} } },
    rpc: async name => ({data:name==='current_store_active'?active:true,error:null})
  }
  const session = id => ({access_token:'x.'+Buffer.from(JSON.stringify({session_id:id})).toString('base64url')+'.x'})
  try {
    let source = await readFile(new URL('../src/sessionTimeout.ts',import.meta.url),'utf8')
    source=source.replace("import { supabase } from './lib/supabase'",'const supabase = globalThis.__sessionTestClient')
    const js=stripTypeScriptTypes(source)
    const module=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'))
    module.startSessionTimeout()
    stateChange('SIGNED_IN',session('one'));await advance(0)
    await advance(29*60_000);assert.equal(signouts,0)
    await advance(60_000);assert.equal(signouts,1)
    stateChange('SIGNED_IN',session('two'));await advance(0)
    await advance(20*60_000);emit('pointerdown')
    await advance(20*60_000);assert.equal(signouts,1)
    saved.set('nordic-session-activity-v1',JSON.stringify({id:'two',at:now}));emit('storage',{key:'nordic-session-activity-v1'})
    await advance(29*60_000);assert.equal(signouts,1)
    await advance(60_000);assert.equal(signouts,2)
    stateChange('SIGNED_IN',session('three'));await advance(0);active=false
    await advance(2*60_000);assert.equal(signouts,3)
    active=true;stateChange('SIGNED_IN',session('four'));await advance(0);failLogout=true
    await advance(30*60_000);assert.equal(signouts,4)
    failLogout=false;await advance(5_000);assert.equal(signouts,5)
  } finally {
    Date.now=originalNow
    for(const key of ['window','document','localStorage','__sessionTestClient']) delete globalThis[key]
  }
})
