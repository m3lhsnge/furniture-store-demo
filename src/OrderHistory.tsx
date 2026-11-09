import { useEffect, useState } from 'react'
import { ArrowRight, ChevronDown, Package } from 'lucide-react'
import { photoStyle, productCode } from './catalog'
import { supabase } from './lib/supabase'
import { stages, type Order } from './orders'

type ProductLink = { id: number; slug: string; image_url: string | null }
const money = (value: number) => `₺${value.toLocaleString('tr-TR')}`
const date = (value: string) => new Date(value).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' })

export default function OrderHistory({ orders, total, page, loading, onPage }: {
  orders: Order[]
  total: number
  page: number
  loading: boolean
  onPage: (page: number) => void
}) {
  const [products, setProducts] = useState<Record<number, ProductLink>>({})
  useEffect(() => {
    const ids = [...new Set(orders.flatMap(order => Array.isArray(order.items) ? order.items.map(item => Number(item.id)).filter(Number.isSafeInteger) : []))]
    if (!ids.length) return
    let live = true
    void supabase!.from('products').select('id,slug,image_url').in('id', ids).then(({ data }) => {
      if (live && data) setProducts(Object.fromEntries(data.map(product => [Number(product.id), product])))
    })
    return () => { live = false }
  }, [orders])

  return <section className="order-history"><h2><Package size={21} /> Siparişlerim</h2><p className="profile-help">Toplam {total} demo sipariş · Sayfa {page + 1}/{Math.max(1, Math.ceil(total / 10))}</p>
    {loading ? <p>Siparişler yükleniyor…</p> : orders.length ? <div className="order-history-list">{orders.map(order => {
      const current = stages.indexOf(order.status)
      const subtotal = Array.isArray(order.items) ? order.items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0) : 0
      const discount = Math.max(0, subtotal - Number(order.total_amount))
      return <details className="order-history-card" key={order.id}><summary><span><strong>{order.order_number}</strong><small>{date(order.created_at)}</small></span><span className="order-history-summary-right"><b>Durum: {order.status}</b><strong>{money(Number(order.total_amount))}</strong></span><ChevronDown className="order-history-chevron" size={17} /></summary>
        <div className="order-history-body"><ol className="order-progress" aria-label="Sipariş aşamaları">{stages.map((stage, index) => <li className={current >= 0 && index <= current ? 'done' : ''} aria-current={index === current ? 'step' : undefined} key={stage}><span>{index + 1}</span>{stage}</li>)}</ol>
          <div className="order-history-info"><p><b>Sipariş tarihi</b>{date(order.created_at)}</p><p><b>Durum</b>{order.status}</p><p><b>Demo teslimat adresi</b>{order.address}</p></div>
          <h3>Ürünler</h3><div className="order-items">{Array.isArray(order.items) && order.items.map((item, index) => {
            const id = Number(item.id)
            const product = products[id]
            const unitPrice = Number(item.price) || 0
            const quantity = Number(item.quantity) || 0
            const optionText = item.finish || [item.fabric, item.leg].filter(Boolean).join(' · ') || 'Standart seçenek'
            const productContent = <><span className="order-item-photo" aria-hidden="true" style={photoStyle({ id: Number.isSafeInteger(id) ? id : index + 1, image_url: item.image_url || product?.image_url })} /><span className="order-item-name"><strong>{item.name}</strong><small>{item.code || (Number.isSafeInteger(id) && id > 0 ? productCode(id) : 'Kod yok')} · {optionText}</small><small>{date(order.created_at)}</small></span>{product && <ArrowRight size={17} />}</>
            return <div className="order-item" key={`${order.id}-${index}`}><div className="order-item-main">{product ? <a href={`/urun/${encodeURIComponent(product.slug)}`} aria-label={`${item.name} ürün sayfasına git`}>{productContent}</a> : <div>{productContent}</div>}</div><div className="order-item-meta"><span>{quantity} adet</span><span>Birim {money(unitPrice)}</span><strong>{money(unitPrice * quantity)}</strong></div></div>
          })}</div>{discount > 0 && <p className="order-history-discount">Demo indirimi <span>−{money(discount)}</span></p>}<p className="order-history-total">Demo toplam <strong>{money(Number(order.total_amount))}</strong></p>
        </div></details>
    })}</div> : <p>Henüz demo siparişiniz bulunmuyor.</p>}
    {total > 10 && <div className="order-pagination"><button type="button" disabled={loading || page === 0} onClick={() => onPage(page - 1)}>Önceki</button><button type="button" disabled={loading || (page + 1) * 10 >= total} onClick={() => onPage(page + 1)}>Sonraki</button></div>}
  </section>
}
