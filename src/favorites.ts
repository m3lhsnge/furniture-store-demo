import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'

const legacyKey = 'nordic-favorites'
const pendingKey = 'nordic-pending-favorite'
function readLegacy(): number[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(legacyKey) || '[]')
    return Array.isArray(value) ? [...new Set(value.filter((id): id is number => Number.isSafeInteger(id) && id > 0))].slice(0, 500) : []
  } catch { return [] }
}
function readPending(): number | null {
  try { const value = Number(sessionStorage.getItem(pendingKey)); return Number.isSafeInteger(value) && value > 0 ? value : null } catch { return null }
}
function clearMigrated() {
  try { localStorage.removeItem(legacyKey); sessionStorage.removeItem(pendingKey) } catch { /* Storage may be unavailable. */ }
}

export function useFavorites() {
  const [ids, setIds] = useState<number[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const pending = useRef(new Set<number>())

  useEffect(() => {
    if (!supabase) { setAuthReady(true); setLoading(false); return }
    let live = true
    void supabase.auth.getSession().then(({ data }) => { if (live) { setUserId(data.session?.user.id ?? null); setAuthReady(true) } })
    const { data } = supabase.auth.onAuthStateChange((event, session) => { if (live) { setUserId(session?.user.id ?? null); if(event !== 'INITIAL_SESSION')setAuthReady(true) } })
    return () => { live = false; data.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!authReady) return
    if (!supabase || !userId) { setIds([]); setMessage(''); setLoading(false); return }
    let live = true
    const client = supabase
    const load = async () => {
      setLoading(true)
      const result = await client.from('favorites').select('product_id').eq('user_id', userId)
      if (!live) return
      if (result.error) { setIds([]); setMessage('Favoriler yüklenemedi. Lütfen yeniden deneyin.'); setLoading(false); return }
      let merged = result.data.map(row => Number(row.product_id))
      const pendingId = readPending()
      const missing = [...new Set([...readLegacy(), ...(pendingId ? [pendingId] : [])])].filter(id => !merged.includes(id))
      if (missing.length) {
        const valid = await client.from('products').select('id').in('id', missing)
        if (!live) return
        if (valid.error) { setMessage('Favorileriniz hesaba aktarılamadı.'); setLoading(false); return }
        if (valid.data.length) {
          const added = await client.from('favorites').upsert(valid.data.map(row => ({ user_id: userId, product_id: row.id })), { onConflict: 'user_id,product_id', ignoreDuplicates: true })
          if (!live) return
          if (added.error) { setMessage('Favorileriniz hesaba aktarılamadı.'); setLoading(false); return }
          merged = [...new Set([...merged, ...valid.data.map(row => Number(row.id))])]
        }
      }
      clearMigrated()
      if (live) { setIds(merged); setMessage(''); setLoading(false) }
    }
    void load()
    window.addEventListener('focus', load)
    return () => { live = false; window.removeEventListener('focus', load) }
  }, [authReady, userId])

  const toggle = async (productId: number) => {
    if (pending.current.has(productId) || loading) return
    if (!supabase || !userId) {
      try { sessionStorage.setItem(pendingKey, String(productId)) } catch { /* The login route still works. */ }
      const next = window.location.pathname + window.location.search
      window.location.assign(`/account?next=${encodeURIComponent(next)}`)
      return
    }
    const wasFavorite = ids.includes(productId)
    setIds(previous => wasFavorite ? previous.filter(id => id !== productId) : [...previous, productId])
    setMessage('')
    pending.current.add(productId)
    const result = wasFavorite
      ? await supabase.from('favorites').delete().eq('user_id', userId).eq('product_id', productId)
      : await supabase.from('favorites').insert({ user_id: userId, product_id: productId })
    pending.current.delete(productId)
    if (result.error) {
      setIds(previous => wasFavorite ? [...previous, productId] : previous.filter(id => id !== productId))
      setMessage('Favori kaydedilemedi. Lütfen yeniden deneyin.')
    }
  }

  return { ids, toggle, loading, message, authenticated: Boolean(userId) }
}
