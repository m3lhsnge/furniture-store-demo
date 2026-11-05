import { useEffect, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { ArrowLeft, MapPin, Plus, UserRound } from 'lucide-react'
import { supabase } from './lib/supabase'
import { stages, type Order } from './orders'
import { readAddresses, type Address } from './addresses'
import { homeClick } from './navigation'

const blankAddress = (): Address => ({ id: crypto.randomUUID(), label: 'Ev', country: 'Türkiye', province: '', district: '', line: '', phone: '' })

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
        if (profile.data) { setName(profile.data.full_name || ''); setPhone(profile.data.phone || ''); setAddresses(readAddresses(profile.data.addresses)) }
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

  function updateAddress(id: string, patch: Partial<Address>) { setAddresses(previous => previous.map(address => address.id === id ? { ...address, ...patch } : address)) }
  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (event.currentTarget.querySelector('.address-card') && addresses.some(address => !address.label.trim() || !address.country.trim() || !address.province.trim() || !address.district.trim() || !address.line.trim() || !address.phone.trim())) { setMessage('Adres alanlarını tamamlayın veya eksik adresi kaldırın.'); return }
    setBusy(true); setMessage('')
    const result = await supabase!.from('profiles').upsert({ id: session.user.id, full_name: name.trim(), phone: phone.trim(), addresses, updated_at: new Date().toISOString() })
    setMessage(result.error ? 'Bilgiler kaydedilemedi.' : 'Profiliniz kaydedildi.')
    setBusy(false)
  }
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

  return <main className="admin-page profile-page"><header className="profile-header"><div><p className="eyebrow">NORDIC LIVING HESAP</p><h1>Hesabım</h1><p>Bilgilerinizi ve siparişlerinizi buradan yönetin.</p></div><nav><a href="/" onClick={homeClick}><ArrowLeft size={17} /> Ana sayfaya dön</a><a href="/favorilerim">Favorilerim</a><button onClick={() => void supabase!.auth.signOut()}>Çıkış Yap</button></nav></header><p className="profile-status" role="status">{message}</p>{loading ? <p>Profiliniz hazırlanıyor…</p> : <div className="profile-grid"><div className="profile-stack"><section><h2><UserRound size={21} /> Kişisel bilgiler</h2><form onSubmit={saveProfile}><fieldset disabled={busy}><div className="profile-fields"><label>Ad soyad<input required minLength={3} value={name} onChange={event => setName(event.target.value)} autoComplete="name" /></label><label>Telefon<input type="tel" value={phone} onChange={event => setPhone(event.target.value)} autoComplete="tel" /></label></div><button>Bilgileri Kaydet</button></fieldset></form></section><section><div className="profile-section-head"><h2><MapPin size={21} /> Adreslerim</h2><button type="button" onClick={() => setAddresses(previous => [...previous, blankAddress()])}><Plus size={17} /> Adres Ekle</button></div><form onSubmit={saveProfile}><fieldset disabled={busy}>{addresses.map((address, index) => <div className="address-card" key={address.id}><div className="profile-section-head"><h3>Adres {index + 1}</h3><button type="button" className="profile-text-button" onClick={() => setAddresses(previous => previous.filter(item => item.id !== address.id))}>Kaldır</button></div><div className="profile-fields"><label>Adres adı<input required value={address.label} onChange={event => updateAddress(address.id, { label: event.target.value })} placeholder="Ev, iş yeri…" /></label><label>Ülke<input required value={address.country} onChange={event => updateAddress(address.id, { country: event.target.value })} autoComplete="country-name" /></label><label>İl<input required value={address.province} onChange={event => updateAddress(address.id, { province: event.target.value })} autoComplete="address-level1" /></label><label>İlçe<input required value={address.district} onChange={event => updateAddress(address.id, { district: event.target.value })} autoComplete="address-level2" /></label><label>Telefon numarası<input required type="tel" value={address.phone} onChange={event => updateAddress(address.id, { phone: event.target.value })} autoComplete="tel" /></label><label className="profile-wide">Açık adres<textarea required minLength={10} value={address.line} onChange={event => updateAddress(address.id, { line: event.target.value })} autoComplete="street-address" placeholder="Mahalle, cadde, sokak, bina ve daire numarası" /></label></div></div>)}{!addresses.length && <p>Henüz kayıtlı adresiniz yok.</p>}<button>Adresleri Kaydet</button></fieldset></form></section></div><div className="profile-stack"><section><h2>Giriş ve güvenlik</h2><form onSubmit={changeEmail}><fieldset disabled={busy}><label>E-posta adresi<input type="email" required value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" /></label><button>E-postayı Değiştir</button></fieldset></form><p className="profile-help">Yeni adresinizi e-posta bağlantısıyla doğrulamanız gerekir.</p><div className="password-change">
  <button type="button" className="password-change-toggle" aria-expanded={passwordMode !== null} onClick={() => { setPasswordMode(passwordMode === null ? 'current' : null); setMessage('') }}>Şifreyi Değiştir</button>
  {passwordMode !== null && <div className="password-methods"><p>Nasıl değiştirmek istersiniz?</p><div className="password-method-actions"><button type="button" className={passwordMode === 'current' ? 'is-active' : ''} aria-pressed={passwordMode === 'current'} onClick={() => { setPasswordMode('current'); setMessage('') }}>Mevcut şifremle</button><button type="button" className={passwordMode === 'email' ? 'is-active' : ''} aria-pressed={passwordMode === 'email'} onClick={() => { setPasswordMode('email'); setCurrentPassword(''); setNewPassword(''); setMessage('') }}>E-posta bağlantısıyla</button></div></div>}
  {passwordMode === 'current' && <form onSubmit={changePassword}><fieldset disabled={busy}><label>Mevcut şifre<input type="password" required value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} autoComplete="current-password" /></label><label>Yeni şifre<input type="password" required minLength={8} value={newPassword} onChange={event => setNewPassword(event.target.value)} autoComplete="new-password" /></label><button>Şifreyi Güncelle</button></fieldset></form>}
  {passwordMode === 'email' && <div className="password-email-option"><p>Yenileme bağlantısını <strong>{session.user.email}</strong> adresine göndereceğiz. Bağlantı açıldığında yeni şifrenizi belirleyebilirsiniz.</p><button type="button" disabled={busy} onClick={() => void sendPasswordLink()}>{busy ? 'Gönderiliyor…' : 'E-posta Bağlantısı Gönder'}</button></div>}
</div></section><section><h2>Siparişlerim</h2><p className="profile-help">Toplam {ordersTotal} sipariş · Sayfa {orderPage + 1}/{Math.max(1, Math.ceil(ordersTotal / 10))}</p>{ordersLoading ? <p>Siparişler yükleniyor…</p> : orders.map(order => <details key={order.id}><summary>{order.order_number} · ₺{Number(order.total_amount).toLocaleString('tr-TR')}</summary><ol className="order-progress">{stages.map((stage, index) => <li className={index <= stages.indexOf(order.status) ? 'done' : ''} key={stage}>{stage}</li>)}</ol><p>{order.address}</p>{order.items.map((item, index) => <p key={index}>{item.quantity} × {item.name} · {item.finish}</p>)}</details>)}{!ordersLoading && !orders.length && <p>Henüz siparişiniz bulunmuyor.</p>}{ordersTotal > 10 && <div className="order-pagination"><button type="button" disabled={ordersLoading || orderPage === 0} onClick={() => setOrderPage(page => page - 1)}>Önceki</button><button type="button" disabled={ordersLoading || (orderPage + 1) * 10 >= ordersTotal} onClick={() => setOrderPage(page => page + 1)}>Sonraki</button></div>}</section></div></div>}</main>
}
