import { districtsFor, provinces, validateAddress } from './locations'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { supabase } from './lib/supabase'
import { photoStyle } from './catalog'
import { addressText, normalizeTurkishPhone, readAddresses, type Address } from './addresses'
export type Product = { id: number; name: string; category: string; price: number; position: string; image_url?: string | null; variants?: string[]; dimensions?: Record<string,string>; description?: string; in_stock?: boolean; tag?: string }
type Line = { key: string; product: Product; finish: string; quantity: number; optionId?: number; optionStock?: number }
const money = (n: number) => `₺${n.toLocaleString('tr-TR')}`
function readLines(): Line[] {
  try { const data = JSON.parse(localStorage.getItem('nordic-cart-v1') || '[]'); return Array.isArray(data) ? data.filter(x => x && typeof x.key === 'string' && x.product && Number.isFinite(x.product.price) && x.product.price > 0 && Number.isInteger(x.quantity) && x.quantity > 0) : [] } catch { return [] }
}
function Modal({ title, close, children }: {title: string; close: () => void; children: ReactNode}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); const old = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { dialog.close(); document.body.style.overflow = old } }, [])
  return <dialog ref={ref} className={`commerce-modal ${title === 'Sepetim' ? 'cart-slide' : ''}`} onCancel={close} onClick={event=>{if(event.target!==ref.current)return;const bounds=ref.current.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)close()}}><div className="commerce-heading"><h2>{title}</h2><button autoFocus onClick={close} aria-label="Kapat">×</button></div>{children}</dialog>
}
export function useCommerce() {
  const [busy,setBusy]=useState(false)
 const requestId=useRef(crypto.randomUUID())
 const submitLock=useRef(false)
 const [cloudOrder,setCloudOrder]=useState(false)
 const [quote,setQuote]=useState<number|null>(null)
 const [customerName,setCustomerName]=useState('')
 const [customerPhone,setCustomerPhone]=useState('')
 const [deliveryAddress,setDeliveryAddress]=useState('')
 const [province,setProvince]=useState('')
 const [district,setDistrict]=useState('')
  const [savedAddresses,setSavedAddresses]=useState<Address[]>([])
  const selectAddress = (address: Address) => { setDeliveryAddress(address.line); setProvince(address.province); setDistrict(address.district); setCustomerPhone(normalizeTurkishPhone(address.phone)) }
 const [lines, setLines] = useState<Line[]>(readLines)
 const autoOpenedCart=useRef((()=>{try{return sessionStorage.getItem('nordic-cart-opened')==='1'||lines.length>0}catch{return lines.length>0}})())
 const [cartNotice,setCartNotice]=useState('')
  const [screen, setScreen] = useState<'cart' | 'checkout' | 'success' | null>(null)
  const [coupon, setCoupon] = useState('')
  const [discount, setDiscount] = useState(false)
  const [message, setMessage] = useState('')
  const [order, setOrder] = useState('')
  const [storageError, setStorageError] = useState(false)
  useEffect(() => { try { localStorage.setItem('nordic-cart-v1', JSON.stringify(lines)); setStorageError(false) } catch { setStorageError(true) } }, [lines])
  useEffect(()=>{if(!cartNotice)return;const timer=window.setTimeout(()=>setCartNotice(''),4000);return()=>window.clearTimeout(timer)},[cartNotice])
  const subtotal = lines.reduce((s, l) => s + l.product.price * l.quantity, 0)
  const total = Math.round(subtotal * (discount ? .9 : 1))
  const cartPayload = () => lines.map(l => ({id:l.product.id,quantity:l.quantity,finish:l.finish,...(l.optionId?{option_id:l.optionId}:{})}))
  const openCheckout = async () => {
    if (!lines.length || busy) return
    setBusy(true);setMessage('');setQuote(null)
    if (supabase) {
      const result = await supabase.rpc('quote_demo_order', {cart:cartPayload(),coupon:discount?'DEMO10':''})
      if (result.error) {
        setMessage(result.error.message.includes('Sipariş için giriş') ? 'Sipariş için Hesabım bölümünden giriş yapın.' : 'Sipariş tutarı doğrulanamadı. Ürünleri kontrol edip yeniden deneyin.')
        setBusy(false);return
      }
      setQuote(Number(result.data.total))
      const session = await supabase.auth.getSession()
      const user = session.data.session?.user
      if (user) {
        const profile = await supabase.from('profiles').select('full_name,phone,addresses').eq('id',user.id).maybeSingle()
        setCustomerName(profile.data?.full_name || user.user_metadata.full_name || '')
        setCustomerPhone(profile.data?.phone || '')
        const addresses = readAddresses(profile.data?.addresses)
        setSavedAddresses(addresses)
        if (!deliveryAddress && addresses.length) selectAddress(addresses[0])
      }
    } else setQuote(total)
    setScreen('checkout');setBusy(false)
  }
  const change = (key: string, delta: number) => {setQuote(null);setLines(old => old.map(l => l.key === key ? {...l, quantity: l.quantity + delta} : l).filter(l => l.quantity > 0))}
  const addProduct = (product:Product, finish:string, optionId?:number, optionStock?:number) => {
        const key=product.id+':'+(optionId??finish)
    setQuote(null);setLines(old=>old.some(l=>l.key===key)?old.map(l=>l.key===key?{...l,quantity:l.quantity+1}:l):[...old,{key,product,finish,quantity:1,optionId,optionStock}]);if(!autoOpenedCart.current){autoOpenedCart.current=true;try{sessionStorage.setItem('nordic-cart-opened','1')}catch{}setScreen('cart')}else setCartNotice('Ürün sepete eklendi.')
  }
  const close = () => { setScreen(null); setMessage('') }
  const ui = <>
    {cartNotice&&<div className="cart-notice" role="status"><span>{cartNotice}</span><button onClick={()=>{setCartNotice('');setScreen('cart')}}>Sepeti Gör</button><button aria-label="Bildirimi kapat" onClick={()=>setCartNotice('')}>×</button></div>}
    {screen === 'cart' && <Modal title="Sepetim" close={close}><p className="demo-flow-note">Bu sepet yalnızca demodur; burada gerçek satın alma veya ödeme yapılmaz.</p>{storageError && <p role="alert">Tarayıcı kaydı kullanılamıyor; sepet bu oturum boyunca korunacaktır.</p>}{lines.length ? <>{lines.map(l => <div className="commerce-line" key={l.key}><div className="cart-thumb" style={photoStyle(l.product)}/><div><h3>{l.product.name}</h3><p>{l.finish}</p><div className="quantity"><button aria-label={`${l.product.name} adet azalt`} onClick={() => change(l.key, -1)}>−</button><span>{l.quantity}</span><button aria-label={`${l.product.name} adet artır`} onClick={() => change(l.key, 1)}>+</button></div><button className="text-action" onClick={() => change(l.key, -l.quantity)}>Kaldır</button></div><strong>{money(l.product.price * l.quantity)}</strong></div>)}<form className="coupon-form" onSubmit={e => {e.preventDefault(); const valid = coupon.trim().toUpperCase() === 'DEMO10'; setDiscount(valid); setQuote(null); setMessage(valid ? '%10 indirim uygulandı.' : 'Bu kupon geçerli değil. DEMO10 kullanabilirsiniz.')}}><input aria-label="İndirim kodu" placeholder="İndirim kodu: DEMO10" value={coupon} onChange={e => setCoupon(e.target.value)}/><button>Uygula</button></form><p role="status">{message}</p><p>Ara toplam: {money(subtotal)}</p>{discount && <p>İndirim: −{money(subtotal - total)}</p>}<h3>Toplam: {money(total)}</h3><button className="checkout-button" disabled={busy} onClick={() => void openCheckout()}>{busy?'Tutar doğrulanıyor…':'Demo Siparişe Geç'}</button><a className="whatsapp-link" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent('Nordic Living demo sepeti — gerçek sipariş değildir\n' + lines.map(l => `${l.quantity} × ${l.product.name} — ${l.finish}: ${money(l.product.price * l.quantity)}`).join('\n') + `\n${discount ? 'DEMO10: %10 indirim\n' : ''}Toplam: ${money(total)}`)}`}>Sepeti WhatsApp ile Paylaş</a></> : <div className="empty-cart"><h3>Sepetiniz henüz boş</h3><button onClick={close}>Koleksiyonu keşfet</button></div>}</Modal>}
    {screen === 'checkout' && <Modal title="Demo Sipariş" close={close}><p className="demo-flow-note">Bu ekran yalnızca sipariş akışını gösterir. Gerçek ödeme veya teslimat yapılmaz; denemek için örnek bilgiler kullanın.</p><p className="privacy-inline">Forma bilgi girmeden önce <a href="/aydinlatma-metni">kişisel veriler aydınlatma metnini</a> okuyun.</p><form className="checkout-form" onSubmit={async e => {e.preventDefault();if(!lines.length||submitLock.current)return;submitLock.current=true;setBusy(true);const form=new FormData(e.currentTarget);try{const checked=validateAddress({id:'checkout',label:'Teslimat',country:'Türkiye',province,district,line:deliveryAddress,phone:customerPhone});if(!checked.address)throw new Error(checked.error);if(!/[\p{L}]/u.test(customerName))throw new Error('Ad soyad en az bir harf içermeli.');
 if(supabase){if(quote===null)throw new Error('Sipariş tutarı doğrulanamadı. Sepete dönüp yeniden deneyin.');const orderArgs={request_id:requestId.current,cart:cartPayload(),customer_name:String(form.get('name')),phone:checked.address.phone,address:addressText(checked.address),expected_total:quote,coupon:discount?'DEMO10':''};const result=await supabase.rpc('place_demo_order_secure',orderArgs);if(result.error){if(result.error.message.includes('Sipariş tutarı değişti')){const fresh=await supabase.rpc('quote_demo_order',{cart:cartPayload(),coupon:discount?'DEMO10':''});setQuote(fresh.error?null:Number(fresh.data.total));throw new Error(fresh.error?'Güncel tutar alınamadı. Sepete dönüp yeniden deneyin.':'Ürün fiyatı değişti. Yeni toplamı kontrol edip yeniden onaylayın.')}throw new Error(result.error.message.includes('Sipariş için giriş')||result.error.message.includes('Oturum geçersiz')?'Sipariş vermek için Hesabım bölümünden giriş yapın.':'Sipariş kaydedilemedi. Oturumunuzu, ürün seçeneklerini ve mağaza bağlantısını kontrol edin.')}setOrder(result.data.order_number);setCloudOrder(true)}
 else{const code='TR-2026-'+crypto.randomUUID().slice(0,8).toUpperCase();const previous=JSON.parse(localStorage.getItem('nordic-orders-v1')||'[]');if(!Array.isArray(previous))throw new Error('Yerel kayıt okunamadı.');localStorage.setItem('nordic-orders-v1',JSON.stringify([...previous,{id:code,items:lines,total,status:'Alındı'}]));setOrder(code);setCloudOrder(false)}
 setLines([]);setDiscount(false);setCoupon('');setScreen('success');setMessage('');requestId.current=crypto.randomUUID();if(supabase)window.dispatchEvent(new Event('nordic-catalog-refresh'))
 }catch(error){setMessage(error instanceof Error?error.message:'Sipariş tamamlanamadı.')}finally{submitLock.current=false;setBusy(false)}}}><label>Ad soyad<input name="name" required minLength={3} autoComplete="name" value={customerName} onChange={e=>setCustomerName(e.target.value)}/></label><label>Telefon<input name="phone" type="tel" required inputMode="numeric" maxLength={11} pattern="0[2-5][0-9]{9}" autoComplete="tel-national" value={customerPhone} onChange={e=>setCustomerPhone(e.target.value.replace(/\D/g,'').slice(0,11))}/></label>{savedAddresses.length>0&&<label>Kayıtlı adresler<select value="" onChange={e=>{const address=savedAddresses.find(a=>a.id===e.target.value);if(address)selectAddress(address)}}><option value="">Kayıtlı adres seçin</option>{savedAddresses.map(address=><option key={address.id} value={address.id}>{address.label} · {address.province}</option>)}</select></label>}<label>Ülke<input value="Türkiye" readOnly/></label><label>İl<input required list="checkout-provinces" value={province} onChange={e=>{setProvince(e.target.value);setDistrict('')}}/><datalist id="checkout-provinces">{provinces.map(p=><option key={p} value={p}/>)}</datalist></label><label>İlçe<input required list="checkout-districts" disabled={!districtsFor(province).length} value={district} onChange={e=>setDistrict(e.target.value)}/><datalist id="checkout-districts">{districtsFor(province).map(d=><option key={d} value={d}/>)}</datalist></label><label>Teslimat adresi<textarea name="address" required minLength={10} maxLength={500} autoComplete="street-address" value={deliveryAddress} onChange={e=>setDeliveryAddress(e.target.value)}/></label>{supabase&&<p>Hesabınızda kayıtlı e-posta adresi siparişe eklenir.</p>}<div className="demo-card">DEMO SİPARİŞ<br/><small>Kart bilgisi istenmez ve ödeme alınmaz.</small></div>{quote!==null&&quote!==total&&<p role="status">Ürün fiyatı güncellenmiş. Sepet görünümündeki {money(total)} yerine güncel tutar geçerlidir.</p>}<h3>Onaylanacak toplam {money(quote??total)}</h3><p role="alert">{message}</p><button disabled={busy||quote===null} className="checkout-button">{busy?'Kaydediliyor…':'Demo Siparişi Tamamla'}</button><button type="button" className="text-action" onClick={() => setScreen('cart')}>Sepete dön</button></form></Modal>}
    {screen === 'success' && <Modal title="Demo sipariş kaydedildi" close={close}><div className="success-state"><span>✓</span><h3>{order}</h3><p>{cloudOrder ? 'Demo sipariş kaydınız oluşturuldu. Hesabım bölümünden görüntüleyebilirsiniz.' : 'Demo siparişiniz bu tarayıcıya kaydedildi.'}</p><p>Bu kayıt gerçek bir sipariş veya teslimat oluşturmaz.</p><button className="checkout-button" onClick={close}>Alışverişe Devam Et</button></div></Modal>}
  </>
  return {addProduct, count: lines.reduce((s,l) => s + l.quantity, 0), openCart: () => {setCartNotice('');setMessage(''); setScreen('cart')}, ui}
}
