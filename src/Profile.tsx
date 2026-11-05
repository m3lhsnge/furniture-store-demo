import { useEffect, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { ArrowLeft, UserRound } from 'lucide-react'
import { supabase } from './lib/supabase'
import type { Order } from './orders'
import { normalizeTurkishPhone, readAddresses, type Address } from './addresses'
import { validateAddress } from './locations'
import AddressBook from './AddressBook'
import OrderHistory from './OrderHistory'
import { homeClick } from './navigation'

export default function Profile({ session }: { session: Session }) {
  const [name, setName] = useState(String(session.user.user_metadata.full_name || ''))
  const [phone, setPhone] = useState('')
  const [addresses, setAddresses] = useState<Address[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [orderPage, setOrderPage] = useState(0)
  const [ordersTotal, setOrdersTotal] = useState(0)
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [email, setEmail] = useState(session.user.email || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordMode, setPasswordMode] = useState<'current' | 'email' | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { setEmail(session.user.email || '') }, [session.user.email])
  useEffect(() => { setOrderPage(0) }, [session.user.id])

  useEffect(() => {
    let live = true
    void supabase!.from('profiles').select('full_name,phone,addresses').eq('id', session.user.id).maybeSingle().then(profile => {
      if (!live) return
      if (profile.error) setMessage('Profil bilgileri yüklenemedi. Yeniden deneyin.')
      else {
        if (profile.data) { setName(profile.data.full_name || ''); setPhone(normalizeTurkishPhone(profile.data.phone || '')); setAddresses(readAddresses(profile.data.addresses)) }
      }
      setLoading(false)
    })
    return () => { live = false }
  }, [session.user.id])

  useEffect(() => {
    let live = true
    setOrdersLoading(true)
    void supabase!.from('orders').select('*', { count: 'exact' }).eq('user_id', session.user.id).order('created_at', { ascending: false }).range(orderPage * 10, orderPage * 10 + 9).then(({ data, count, error }) => {
      if (!live) return
      if (error) setMessage('Siparişler yüklenemedi. Yeniden deneyin.')
      else { setOrders(data || []); setOrdersTotal(count || 0) }
      setOrdersLoading(false)
    })
    return () => { live = false }
  }, [session.user.id, orderPage])

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedPhone = normalizeTurkishPhone(phone)
    if (normalizedPhone && !/^0[2-5]\d{9}$/.test(normalizedPhone)) { setMessage('Telefon numarası 0 ile başlayan 11 haneli bir Türkiye numarası olmalı.'); return }
    setBusy(true); setMessage('')
    const result = await supabase!.from('profiles').upsert({ id: session.user.id, full_name: name.trim(), phone: normalizedPhone, addresses, updated_at: new Date().toISOString() })
    setMessage(result.error ? 'Bilgiler kaydedilemedi.' : 'Profiliniz kaydedildi.')
    if (!result.error) setPhone(normalizedPhone)
    setBusy(false)
  }
  async function commitAddresses(next: Address[]): Promise<boolean> {
    if (busy) return false
    const normalizedPhone = normalizeTurkishPhone(phone)
    if (normalizedPhone && !/^0[2-5]\d{9}$/.test(normalizedPhone)) { setMessage('Önce kişisel bilgilerdeki telefon numarasını tamamlayın.'); return false }
    const checked = next.map(address => {
      const original = addresses.find(item => item.id === address.id)
      return original && JSON.stringify(original) === JSON.stringify(address) ? { address } : validateAddress(address)
    })
    if (checked.some(result => !result.address)) { setMessage(checked.find(result => result.error)?.error || 'Adres bilgilerini kontrol edin.'); return false }
    setBusy(true); setMessage('')
    const result = await supabase!.from('profiles').upsert({ id: session.user.id, full_name: name.trim(), phone: normalizedPhone, addresses: checked.map(item => item.address), updated_at: new Date().toISOString() })
    if (!result.error) setAddresses(checked.map(item => item.address!))
    setMessage(result.error ? 'Adres kaydedilemedi. Yeniden deneyin.' : 'Adresleriniz kaydedildi.')
    setBusy(false)
    return !result.error
  }
  const saveAddress = (address: Address) => commitAddresses(addresses.some(item => item.id === address.id) ? addresses.map(item => item.id === address.id ? address : item) : [...addresses, address])
  async function changeEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (email.trim().toLowerCase() === session.user.email?.toLowerCase()) { setMessage('Bu e-posta adresi zaten hesabınızda kayıtlı.'); return }
    setBusy(true); setMessage('')
    const result = await supabase!.auth.updateUser({ email: email.trim() }, { emailRedirectTo: `${window.location.origin}/account` })
    setMessage(result.error ? 'E-posta değiştirilemedi. Adresi ve oturumunuzu kontrol edin.' : 'E-posta değişikliği için gönderilen doğrulama bağlantılarını kontrol edin.')
    setBusy(false)
  }
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (newPassword.length < 8) { setMessage('Yeni şifre en az 8 karakter olmalı.'); return }
    setBusy(true); setMessage('')
    const result = await supabase!.auth.updateUser({ password: newPassword, current_password: currentPassword })
    setMessage(result.error ? 'Şifre değiştirilemedi. Mevcut şifreyi kontrol edin.' : 'Şifreniz güncellendi.')
    if (!result.error) { setCurrentPassword(''); setNewPassword(''); setPasswordMode(null) }
    setBusy(false)
  }

  async function sendPasswordLink() {
    const accountEmail = session.user.email
    if (!accountEmail) { setMessage('Hesabınıza bağlı bir e-posta adresi bulunamadı.'); return }
    setBusy(true); setMessage('')
    const result = await supabase!.auth.resetPasswordForEmail(accountEmail, { redirectTo: `${window.location.origin}/account` })
    setMessage(result.error ? 'Şifre yenileme bağlantısı gönderilemedi. E-posta ayarlarını kontrol edip yeniden deneyin.' : `Şifre yenileme bağlantısı ${accountEmail} adresine gönderildi. Gelen kutunuzu kontrol edin.`)
    setBusy(false)
  }

  return <main className="admin-page profile-page"><header className="profile-header"><div><p className="eyebrow">NORDIC LIVING HESAP</p><h1>Hesabım</h1><p>Bilgilerinizi ve siparişlerinizi buradan yönetin.</p></div><nav><a href="/" onClick={homeClick}><ArrowLeft size={17} /> Ana sayfaya dön</a><a href="/favorilerim">Favorilerim</a><button onClick={() => void supabase!.auth.signOut()}>Çıkış Yap</button></nav></header><p className="profile-status" role="status">{message}</p>{loading ? <p>Profiliniz hazırlanıyor…</p> : <div className="profile-grid"><div className="profile-stack"><section><h2><UserRound size={21} /> Kişisel bilgiler</h2><form onSubmit={saveProfile}><fieldset disabled={busy}><div className="profile-fields"><label>Ad soyad<input required minLength={3} value={name} onChange={event => setName(event.target.value)} autoComplete="name" /></label><label>Telefon<input type="tel" inputMode="numeric" maxLength={11} pattern="0[2-5][0-9]{9}" value={phone} onChange={event => setPhone(event.target.value.replace(/\D/g, '').slice(0, 11))} autoComplete="tel-national" placeholder="05XXXXXXXXX" /></label></div><button>Bilgileri Kaydet</button></fieldset></form></section><AddressBook addresses={addresses} busy={busy} onSave={saveAddress} onRemove={id => commitAddresses(addresses.filter(item => item.id !== id))} /></div><div className="profile-stack"><section><h2>Giriş ve güvenlik</h2><form onSubmit={changeEmail}><fieldset disabled={busy}><label>E-posta adresi<input type="email" required value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" /></label><button>E-postayı Değiştir</button></fieldset></form><p className="profile-help">Yeni adresinizi e-posta bağlantısıyla doğrulamanız gerekir.</p><div className="password-change">
  <button type="button" className="password-change-toggle" aria-expanded={passwordMode !== null} onClick={() => { setPasswordMode(passwordMode === null ? 'current' : null); setMessage('') }}>Şifreyi Değiştir</button>
  {passwordMode !== null && <div className="password-methods"><p>Nasıl değiştirmek istersiniz?</p><div className="password-method-actions"><button type="button" className={passwordMode === 'current' ? 'is-active' : ''} aria-pressed={passwordMode === 'current'} onClick={() => { setPasswordMode('current'); setMessage('') }}>Mevcut şifremle</button><button type="button" className={passwordMode === 'email' ? 'is-active' : ''} aria-pressed={passwordMode === 'email'} onClick={() => { setPasswordMode('email'); setCurrentPassword(''); setNewPassword(''); setMessage('') }}>E-posta bağlantısıyla</button></div></div>}
  {passwordMode === 'current' && <form onSubmit={changePassword}><fieldset disabled={busy}><label>Mevcut şifre<input type="password" required value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} autoComplete="current-password" /></label><label>Yeni şifre<input type="password" required minLength={8} value={newPassword} onChange={event => setNewPassword(event.target.value)} autoComplete="new-password" /></label><button>Şifreyi Güncelle</button></fieldset></form>}
  {passwordMode === 'email' && <div className="password-email-option"><p>Yenileme bağlantısını <strong>{session.user.email}</strong> adresine göndereceğiz. Bağlantı açıldığında yeni şifrenizi belirleyebilirsiniz.</p><button type="button" disabled={busy} onClick={() => void sendPasswordLink()}>{busy ? 'Gönderiliyor…' : 'E-posta Bağlantısı Gönder'}</button></div>}
</div></section><OrderHistory orders={orders} total={ordersTotal} page={orderPage} loading={ordersLoading} onPage={setOrderPage} /></div></div>}</main>
}
