import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { roleLabel } from './roles'

type StoreUser = { id: string; email: string; name: string; role: string; is_active: boolean; created_at: string; orders_count: number }
type Result = { total: number; users: StoreUser[] }

export default function UsersAdmin({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<StoreUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')

  useEffect(() => { const timer = window.setTimeout(() => { setSearch(query.trim()); setPage(0) }, 300); return () => window.clearTimeout(timer) }, [query])
  useEffect(() => {
    let live = true
    setLoading(true)
    void supabase!.rpc('list_store_users_page', { page_number: page, query_text: search }).then(({ data, error }) => {
      if (!live) return
      if (error) { setMessage('Kullanıcılar yüklenemedi. 010-user-management.sql kurulumunu ve geliştirici yetkinizi kontrol edin.'); setUsers([]); setTotal(0) }
      else { const result = data as Result; setUsers(result.users || []); setTotal(Number(result.total || 0)); setMessage('') }
      setLoading(false)
    })
    return () => { live = false }
  }, [page, search, refresh])

  async function changeRole(user: StoreUser, next: string) {
    if (!window.confirm(`${user.email} için ${roleLabel(next)} rolü uygulansın mı?`)) { setUsers(previous => [...previous]); return }
    setBusy(true)
    const result = await supabase!.rpc('manage_store_role', { target: user.id, new_role: next })
    setMessage(result.error ? result.error.message : 'Rol güncellendi.')
    setRefresh(value => value + 1)
    setBusy(false)
  }
  async function saveName(user: StoreUser) {
    setBusy(true)
    const result = await supabase!.rpc('manage_store_user_name', { target: user.id, new_name: draftName.trim() })
    setMessage(result.error ? result.error.message : 'Ad güncellendi.')
    if (!result.error) { setEditingId(null); setRefresh(value => value + 1) }
    setBusy(false)
  }
  async function setActive(user: StoreUser) {
    const next = !user.is_active
    if (!window.confirm(`${user.email} hesabı ${next ? 'yeniden etkinleştirilsin' : 'pasifleştirilsin'} mi?`)) return
    setBusy(true)
    const result = await supabase!.rpc('set_store_user_active', { target: user.id, is_active: next })
    setMessage(result.error ? `Durum değiştirilemedi: ${result.error.message}` : `Kullanıcı ${next ? 'etkinleştirildi' : 'pasifleştirildi'}.`)
    if (!result.error) setRefresh(value => value + 1)
    setBusy(false)
  }

  return <section className="users-admin" aria-labelledby="users-title"><div className="users-heading"><div><p className="eyebrow">GELİŞTİRİCİ PANELİ</p><h2 id="users-title">Kullanıcılar</h2><p>Toplam {total} kullanıcı · Sayfa {page + 1}/{Math.max(1, Math.ceil(total / 20))}</p></div><label>Kullanıcı ara<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Ad veya e-posta" maxLength={100} /></label></div><p role="status">{message}</p><p className="users-note">Pasifleştirilen hesap ve siparişleri korunur. Kullanıcı daha sonra yeniden etkinleştirilebilir.</p>
    <div className="users-table-head"><span>Kullanıcı</span><span>Rol</span><span>Durum</span><span>Sipariş</span><span>İşlemler</span></div>
    {loading ? <p>Kullanıcılar yükleniyor…</p> : users.length ? users.map(user => <div className="users-row" key={user.id}><div><strong>{user.email}</strong>{editingId === user.id ? <div className="user-name-edit"><input aria-label={`${user.email} adı`} value={draftName} onChange={event => setDraftName(event.target.value)} maxLength={120} /><button disabled={busy} onClick={() => void saveName(user)}>Kaydet</button><button disabled={busy} onClick={() => setEditingId(null)}>Vazgeç</button></div> : <small>{user.name || 'Ad belirtilmedi'}{user.id === currentUserId ? ' · Siz' : ''}</small>}</div><select aria-label={`${user.email} rolü`} disabled={busy || user.id === currentUserId} value={user.role} onChange={event => void changeRole(user, event.target.value)}>{['customer', 'staff', 'developer'].map(role => <option key={role} value={role}>{roleLabel(role)}</option>)}</select><span className={user.is_active ? 'user-active' : 'user-inactive'}>{user.is_active ? 'Aktif' : 'Pasif'}</span><span>{user.orders_count}</span><div className="user-actions"><button disabled={busy} onClick={() => { setEditingId(user.id); setDraftName(user.name || '') }}>Adı Düzenle</button><button className={user.is_active ? 'danger-action' : ''} disabled={busy || user.id === currentUserId} onClick={() => void setActive(user)}>{user.is_active ? 'Pasifleştir' : 'Etkinleştir'}</button></div></div>) : <p>Bu aramada kullanıcı bulunamadı.</p>}
    <div className="order-pagination"><button disabled={page === 0 || loading} onClick={() => setPage(value => value - 1)}>Önceki</button><button disabled={(page + 1) * 20 >= total || loading} onClick={() => setPage(value => value + 1)}>Sonraki</button></div>
  </section>
}
