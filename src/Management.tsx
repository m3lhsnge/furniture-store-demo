import { useEffect, useState } from 'react'
import Dashboard from './Dashboard'
import type { CatalogProduct } from './catalog'
import { supabase } from './lib/supabase'
import { stages, type Order } from './orders'

const pageSize = 20
const currency = (value: number) => `₺${Number(value).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`

export default function Management({ view, products, onOpenOrders }: { view: 'overview' | 'orders'; products: CatalogProduct[]; onOpenOrders: () => void }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let live = true
    setLoading(true)
    let query = supabase!.from('orders').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(view === 'overview' ? 0 : page * pageSize, view === 'overview' ? 4 : (page + 1) * pageSize - 1)
    if (view === 'orders') {
      if (status) query = query.eq('status', status)
      if (from) query = query.gte('created_at', new Date(`${from}T00:00:00`).toISOString())
      if (to) { const end = new Date(`${to}T00:00:00`); end.setDate(end.getDate() + 1); query = query.lt('created_at', end.toISOString()) }
    }
    void query.then(({ data, count, error }) => {
      if (!live) return
      setLoading(false)
      if (error) { setMessage('Siparişler yüklenemedi.'); setOrders([]); setTotal(0) }
      else { setOrders(data as Order[]); setTotal(count ?? 0) }
    })
    return () => { live = false }
  }, [view, status, from, to, page, refresh])

  async function updateStatus(order: Order, next: string) {
    setBusy(true); setMessage('')
    const { error } = await supabase!.from('orders').update({ status: next }).eq('id', order.id)
    setMessage(error ? 'Durum güncellenemedi.' : 'Sipariş durumu güncellendi.')
    if (!error) setRefresh(value => value + 1)
    setBusy(false)
  }

  const table = <><div className="order-table-head"><span>Sipariş</span><span>Müşteri</span><span>Tarih</span><span>Tutar</span><span>Durum</span></div>{loading ? <p>Siparişler yükleniyor…</p> : orders.length ? orders.map(order => <details className="order-table-row" key={order.id}><summary><span>{order.order_number}</span><span>{order.customer_name}</span><span>{new Date(order.created_at).toLocaleDateString('tr-TR')}</span><span>{currency(order.total_amount)}</span><span className="order-status-pill" data-status={order.status}>{order.status}</span></summary><div className="order-expanded"><p>{order.address} · {order.phone}</p>{order.items.map((item, index) => <p key={index}>{item.quantity} × {item.name}{item.finish ? ` · ${item.finish}` : ''}</p>)}{view === 'orders' && <label>Sipariş durumu<select disabled={busy} value={order.status} onChange={event => void updateStatus(order, event.target.value)}>{stages.map(value => <option key={value}>{value}</option>)}</select></label>}</div></details>) : <p>Henüz sipariş yok.</p>}</>

  return view === 'overview' ? <><Dashboard refresh={refresh} products={products} /><section className="orders-admin"><div className="orders-heading"><h2>Son Siparişler</h2><button type="button" onClick={onOpenOrders}>Tüm Siparişler →</button></div>{table}</section></> : <section className="orders-admin"><h2>Siparişler</h2><div className="order-filters"><label>Durum<select value={status} onChange={event => { setStatus(event.target.value); setPage(0) }}><option value="">Tümü</option>{stages.map(value => <option key={value}>{value}</option>)}</select></label><label>Başlangıç<input type="date" value={from} max={to || undefined} onChange={event => { setFrom(event.target.value); setPage(0) }} /></label><label>Bitiş<input type="date" value={to} min={from || undefined} onChange={event => { setTo(event.target.value); setPage(0) }} /></label></div><p>{total} sipariş bulundu · Sayfa {page + 1}/{Math.max(1, Math.ceil(total / pageSize))}</p><p role="status">{message}</p>{table}<div className="order-pagination"><button disabled={page === 0 || loading} onClick={() => setPage(value => value - 1)}>Önceki</button><button disabled={(page + 1) * pageSize >= total || loading} onClick={() => setPage(value => value + 1)}>Sonraki</button></div></section>
}
