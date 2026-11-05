import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { ArrowLeft, ArrowRight, LockKeyhole, Mail, UserRound } from 'lucide-react'
import { supabase } from './lib/supabase'
import { isOperator } from './roles'
import { homeClick, navigate } from './navigation'

const Admin = lazy(() => import('./Admin'))
const Profile = lazy(() => import('./Profile'))
type Mode = 'login' | 'signup' | 'reset'

export default function Account() {
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState('customer')
  const [roleReady, setRoleReady] = useState(false)
  const [roleError, setRoleError] = useState(false)
  const [recovery, setRecovery] = useState(window.location.hash.includes('type=recovery'))
  const [ready, setReady] = useState(false)
  const [mode, setMode] = useState<Mode>('login')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [recoveryPasswordSaved, setRecoveryPasswordSaved] = useState(false)

  useEffect(() => {
    if (!supabase) { setReady(true); return }
    let live = true
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!live) return
      setSession(data.session)
      setReady(true)
      if (error) setMessage('Oturum bilgisi alınamadı. Yeniden giriş yapın.')
    })
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (!live) return
      setSession(next)
      setReady(true)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
    })
    return () => { live = false; data.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!session) { setRole('customer'); setRoleReady(false); return }
    let live = true
    setRoleReady(false)
    const check = async () => {
      const result = await supabase!.rpc('current_store_role')
      if (!live) return
      if (result.data === 'inactive') {
        setMessage('Bu hesap şu anda pasif. Yardım için mağazayla iletişime geçin.')
        await supabase!.auth.signOut()
        return
      }
      setRole(result.error ? 'customer' : result.data)
      setRoleError(Boolean(result.error))
      setRoleReady(true)
    }
    void check()
    window.addEventListener('focus', check)
    return () => { live = false; window.removeEventListener('focus', check) }
  }, [session?.user.id])

  useEffect(() => {
    if (!session || recovery) return
    const next = new URLSearchParams(window.location.search).get('next')
    if (!next) return
    try {
      const target = new URL(next, window.location.origin)
      if (target.origin === window.location.origin && target.pathname !== '/account') navigate(target.pathname + target.search + target.hash)
    } catch { /* Ignore invalid return paths. */ }
  }, [session, recovery])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    const values = new FormData(event.currentTarget)
    const email = String(values.get('email') || '').trim()
    setBusy(true); setMessage('')
    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/account` })
        if (error) throw error
        setMessage('Hesap mevcutsa şifre yenileme bağlantısı e-posta adresinize gönderilecektir.')
      } else {
        const password = String(values.get('password') || '')
        if (mode === 'signup') {
          const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: String(values.get('name') || '').trim() }, emailRedirectTo: `${window.location.origin}/account` } })
          if (error) throw error
          if (!data.session) setMessage('Kaydınızı tamamlamak için e-posta adresinizdeki aktivasyon bağlantısını açın.')
        } else {
          const { error } = await supabase.auth.signInWithPassword({ email, password })
          if (error) throw error
        }
      }
    } catch {
      setMessage(mode === 'reset' ? 'Bağlantı gönderilemedi. Daha sonra yeniden deneyin.' : mode === 'signup' ? 'Kayıt tamamlanamadı. Bilgilerinizi kontrol edin.' : 'Giriş yapılamadı. E-posta, şifre ve aktivasyonu kontrol edin.')
    } finally { setBusy(false) }
  }

  async function completeRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setBusy(true); setMessage('')
    if (!recoveryPasswordSaved) {
      const values = new FormData(event.currentTarget)
      const result = await supabase.auth.updateUser({ password: String(values.get('password')) })
      if (result.error) { setMessage('Şifre güncellenemedi. Yeni şifreyi kontrol edip tekrar deneyin.'); setBusy(false); return }
      setRecoveryPasswordSaved(true)
    }
    const signedOut = await supabase.auth.signOut({ scope: 'global' })
    if (signedOut.error) { setMessage('Şifre güncellendi ancak diğer oturumlar kapatılamadı. “Tüm oturumları kapat” düğmesini tekrar deneyin.'); setBusy(false); return }
    setRecovery(false)
    setRecoveryPasswordSaved(false)
    history.replaceState(null, '', '/account')
    setMode('login')
    setMessage('Şifreniz değiştirildi. Yeni şifrenizle giriş yapın.')
    setBusy(false)
  }

  if (session && recovery) return <main className="account-layout"><div className="account-visual"><a className="logo" href="/" onClick={homeClick}>NORDIC LIVING</a><h2>Yeni bir başlangıç.</h2></div><section className="admin-page admin-login account-card"><a className="account-home" href="/" onClick={homeClick}><ArrowLeft size={17} /> Ana sayfaya dön</a><h1>Yeni şifre</h1><form onSubmit={completeRecovery}>{!recoveryPasswordSaved && <label>Yeni şifre<input name="password" type="password" minLength={8} required autoComplete="new-password" /></label>}<button disabled={busy}>{busy ? 'İşleniyor…' : recoveryPasswordSaved ? 'Tüm Oturumları Kapat' : 'Şifreyi Güncelle ve Çıkış Yap'}</button></form><p role="status">{message}</p></section></main>
  if (session && !roleReady) return <main className="account-loading"><span className="logo">NORDIC LIVING</span><p>Hesabınız açılıyor…</p></main>
  if (session && roleError) return <main className="admin-page"><h1>Hesap açılamadı</h1><p>Hesabınız şu anda açılamıyor. Lütfen daha sonra yeniden deneyin.</p><button onClick={() => window.location.reload()}>Yeniden Dene</button><button onClick={() => void supabase!.auth.signOut()}>Çıkış Yap</button></main>
  if (session) return <Suspense fallback={<main className="account-loading">Hesabınız açılıyor…</main>}>{isOperator(role) ? <Admin role={role} userId={session.user.id} /> : <Profile session={session} />}</Suspense>

  return <main className="account-layout"><div className="account-visual"><a className="logo" href="/" onClick={homeClick}>NORDIC LIVING</a><div><p className="eyebrow">SADE YAŞAM, ZAMANSIZ TASARIM</p><h2>Evinize ait<br />güzel başlangıçlar.</h2></div><span>Doğal dokularla yaşam alanınıza yeni bir hikâye.</span></div><section className="admin-page admin-login account-card"><a className="account-home" href="/" onClick={homeClick}><ArrowLeft size={17} /> Ana sayfaya dön</a><div className="account-intro"><p className="eyebrow">NORDIC LIVING HESAP</p><h1>{mode === 'signup' ? 'Hesap oluşturun' : mode === 'reset' ? 'Şifrenizi yenileyin' : 'Hoş geldiniz'}</h1><p>{mode === 'signup' ? 'Favorilerinizi kaydedin ve siparişlerinizi takip edin.' : mode === 'reset' ? 'Yenileme bağlantısını e-postanıza göndereceğiz.' : 'Eviniz için seçtiklerinize kaldığınız yerden devam edin.'}</p></div>{!ready ? <p>Hesap hazırlanıyor…</p> : !supabase ? <p>Hesap hizmeti şu anda kullanılamıyor.</p> : <form className="account-form" onSubmit={submit}><fieldset disabled={busy}>{mode === 'signup' && <label>Ad soyad<span className="account-input"><UserRound size={18} /><input name="name" required minLength={3} autoComplete="name" placeholder="Adınız ve soyadınız" /></span></label>}<label>E-posta adresi<span className="account-input"><Mail size={18} /><input name="email" type="email" required autoComplete="username" placeholder="ornek@eposta.com" /></span></label>{mode !== 'reset' && <label>Şifre<span className="account-input"><LockKeyhole size={18} /><input name="password" type="password" required minLength={mode === 'signup' ? 8 : 1} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder="Şifrenizi girin" /></span></label>}{mode === 'signup' && <small>En az 8 karakter. Kayıt için e-posta doğrulaması gerekebilir.</small>}{mode === 'signup' && <p className="privacy-inline">Hesap açmadan önce <a href="/aydinlatma-metni">kişisel veriler aydınlatma metnini</a> okuyun.</p>}<button className="account-submit">{busy ? 'Lütfen bekleyin…' : mode === 'signup' ? 'Hesap Oluştur' : mode === 'reset' ? 'Bağlantı Gönder' : 'Giriş Yap'} <ArrowRight size={18} /></button></fieldset></form>}<p className="account-message" role="status">{message}</p><div className="account-switch">{mode === 'login' ? <><button type="button" onClick={() => { setMode('signup'); setMessage('') }}>Hesap oluştur</button><button type="button" onClick={() => { setMode('reset'); setMessage('') }}>Şifremi unuttum</button></> : <button type="button" onClick={() => { setMode('login'); setMessage('') }}>← Giriş ekranına dön</button>}</div></section></main>
}
