import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'

const idleMs = 30 * 60 * 1000
const touchEveryMs = 2 * 60 * 1000
const activityKey = 'nordic-session-activity-v1'

function sessionId(session: Session): string | null {
  try {
    const encoded = session.access_token.split('.')[1]
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const claims = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')))
    return typeof claims.session_id === 'string' ? claims.session_id : null
  } catch { return null }
}

function storedActivity(id: string): number | null {
  try {
    const saved = JSON.parse(localStorage.getItem(activityKey) || 'null')
    return saved?.id === id && Number.isFinite(saved.at) ? saved.at : null
  } catch { return null }
}

function saveActivity(id: string, at: number) {
  try { localStorage.setItem(activityKey, JSON.stringify({ id, at })) } catch { /* Browser storage may be unavailable. */ }
}

export function startSessionTimeout() {
  if (!supabase) return
  const auth = supabase
  let activeId: string | null = null
  let lastActivity = 0
  let lastTouch = 0
  let timer = 0
  let signingOut = false

  const endSession = () => {
    if (signingOut || !activeId) return
    signingOut = true
    window.clearTimeout(timer)
    void auth.auth.signOut({ scope: 'local' }).then(({ error }) => {
      if (error && activeId) timer = window.setTimeout(endSession, 5_000)
    }).finally(() => { signingOut = false })
  }
  const latestActivity = () => activeId ? Math.max(lastActivity, storedActivity(activeId) || 0) : 0
  const schedule = () => {
    window.clearTimeout(timer)
    if (!activeId) return
    const remaining = idleMs - (Date.now() - latestActivity())
    if (remaining <= 0) { endSession(); return }
    timer = window.setTimeout(schedule, remaining)
  }
  const touchServer = () => {
    if (!activeId || Date.now() - lastTouch < touchEveryMs) return
    const touchedId = activeId
    lastTouch = Date.now()
    void auth.rpc('touch_store_session').then(({ data, error }) => {
      if (!error && data === false && activeId === touchedId) endSession()
    })
  }
  const activity = () => {
    if (!activeId || signingOut) return
    const now = Date.now()
    if (now - latestActivity() >= idleMs) { endSession(); return }
    if (now - lastActivity < 15_000) return
    lastActivity = now
    saveActivity(activeId, now)
    schedule()
    touchServer()
  }
  const handleSession = (session: Session | null) => {
    const id = session ? sessionId(session) : null
    if (id === activeId) return
    activeId = id
    signingOut = false
    lastTouch = 0
    window.clearTimeout(timer)
    if (!id) return
    lastActivity = storedActivity(id) || Date.now()
    saveActivity(id, lastActivity)
    schedule()
    if (!signingOut) touchServer()
  }

  auth.auth.onAuthStateChange((_event, session) => { window.setTimeout(() => handleSession(session), 0) })
  for (const event of ['pointerdown', 'pointermove', 'keydown', 'scroll']) window.addEventListener(event, activity, { passive: true })
  window.addEventListener('focus', () => { if (activeId) { schedule(); activity() } })
  document.addEventListener('visibilitychange', () => { if (!document.hidden && activeId) { schedule(); activity() } })
  window.addEventListener('storage', event => { if (event.key === activityKey && activeId) schedule() })
  // Validate without extending activity: revoked sessions must also close in idle tabs.
  window.setInterval(() => {
    if (!activeId || signingOut) return
    const checkedId = activeId
    void auth.rpc('current_store_active').then(({ data, error }) => {
      if (!error && data === false && activeId === checkedId) endSession()
    })
  }, touchEveryMs)
}
