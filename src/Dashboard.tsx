import { useEffect, useState } from 'react'
import { Armchair, ChartNoAxesCombined, Coins, Package } from 'lucide-react'
import { photoStyle, type CatalogProduct } from './catalog'
import { supabase } from './lib/supabase'

type Day = { date: string; amount: number }
type DashboardData = {
  total_amount: number; total_orders: number; period_amount: number; previous_amount: number
  period_orders: number; pending_orders: number; active_products: number
  status_counts: Record<string, number>; daily: Day[]
  top_products: { name: string; quantity: number }[]
}
const money = (value: number) => `₺${Number(value).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`
const statuses = [
  { name: 'Alındı', color: '#ded4c7' },
  { name: 'Hazırlanıyor', color: '#b88370' },
  { name: 'Kargoda', color: '#bdb7af' },
  { name: 'Teslim Edildi', color: '#66775d' },
]

export default function Dashboard({ refresh, products }: { refresh: number; products: CatalogProduct[] }) {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let live = true
    setLoading(true)
    void supabase!.rpc('store_dashboard', { period_days: days }).then(({ data: result, error: failure }) => {
      if (!live) return
      setError(failure ? 'Rapor yüklenemedi. Supabase rapor fonksiyonunu ve hesap yetkinizi kontrol edin.' : '')
      setData(failure ? null : result as DashboardData)
      setLoading(false)
    })
    return () => { live = false }
  }, [days, refresh])

  const daily = data?.daily || []
  const max = Math.max(1, ...daily.map(day => Number(day.amount)))
  const points = daily.map((day, index) => {
    const x = daily.length === 1 ? 300 : 30 + index * 550 / (daily.length - 1)
    const y = 220 - Number(day.amount) * 180 / max
    return `${x},${y}`
  }).join(' ')
  const area = points ? `M 30 220 L ${points.replaceAll(' ', ' L ')} L 580 220 Z` : ''
  const change = data && Number(data.previous_amount) > 0 ? Math.round((Number(data.period_amount) - Number(data.previous_amount)) / Number(data.previous_amount) * 100) : null
  const totalStatuses = statuses.reduce((sum, status) => sum + Number(data?.status_counts?.[status.name] || 0), 0)
  let usedPercent = 0
  const segments = statuses.map(status => {
    const end = usedPercent + (totalStatuses ? Number(data?.status_counts?.[status.name] || 0) / totalStatuses * 100 : 0)
    const segment = `${status.color} ${usedPercent}% ${end}%`
    usedPercent = end
    return segment
  })
  const donut = totalStatuses ? `conic-gradient(${segments.join(', ')})` : 'conic-gradient(#e7e1da 0 100%)'

  return <section id="overview" className="dashboard" aria-labelledby="dashboard-title">
    <div className="dashboard-heading"><div><p className="eyebrow">GENEL BAKIŞ</p><h2 id="dashboard-title">Satış Performansı</h2></div><label>Dönem<select value={days} onChange={event => setDays(Number(event.target.value))}><option value={7}>Son 7 Gün</option><option value={30}>Son 30 Gün</option><option value={90}>Son 90 Gün</option></select></label></div>
    <p className="dashboard-note">Tutarlar kayıtlı demo siparişlerdir; tahsil edilmiş ödeme değildir. Dönemler Türkiye saatine göredir.</p>
    {loading && <p role="status">Rapor yükleniyor…</p>}{error && <p role="alert">{error}</p>}
    {data && !loading && <>
      <div className="dashboard-metrics">
        <div><span className="metric-icon"><Coins size={25} strokeWidth={1.5}/></span><span>Toplam Ciro (Demo)</span><strong>{money(data.total_amount)}</strong><small>{data.total_orders} sipariş</small></div>
        <div><span className="metric-icon"><ChartNoAxesCombined size={25} strokeWidth={1.5}/></span><span>Seçili Dönem</span><strong>{money(data.period_amount)}</strong><small>{data.period_orders} sipariş{change !== null ? ` · ${change > 0 ? '+' : ''}${change}%` : ''}</small></div>
        <div><span className="metric-icon"><Package size={25} strokeWidth={1.5}/></span><span>Bekleyen Siparişler</span><strong>{data.pending_orders}</strong><small>Tüm dönemler</small></div>
        <div><span className="metric-icon"><Armchair size={25} strokeWidth={1.5}/></span><span>Aktif Ürünler</span><strong>{data.active_products}</strong><small>Stokta işaretli</small></div>
      </div>
      <div className="dashboard-panels"><div className="dashboard-chart"><h3>Satış Grafiği</h3>{daily.some(day => Number(day.amount) > 0) ? <><svg viewBox="0 0 600 240" preserveAspectRatio="none" role="img" aria-label={`Son ${days} günün günlük demo sipariş tutarı grafiği`}><defs><linearGradient id="sales-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9b6d50" stopOpacity=".3"/><stop offset="1" stopColor="#9b6d50" stopOpacity=".02"/></linearGradient></defs>{[40,85,130,175,220].map(y => <line key={y} x1="30" x2="580" y1={y} y2={y} stroke="#ded9d3" strokeWidth="1"/>)}<path d={area} fill="url(#sales-fill)"/><polyline points={points} fill="none" stroke="#765039" strokeWidth="2.5" vectorEffect="non-scaling-stroke"/></svg><div className="chart-ends"><span>{new Date(daily[0].date + 'T12:00:00').toLocaleDateString('tr-TR')}</span><span>{money(max)} en yüksek gün</span><span>{new Date(daily[daily.length-1].date + 'T12:00:00').toLocaleDateString('tr-TR')}</span></div></> : <p>Bu dönemde sipariş yok.</p>}</div>
        <div className="dashboard-status"><h3>Sipariş Durumu</h3><div className="status-layout"><div className="status-donut" style={{ background: donut }} role="img" aria-label={`Seçili dönemde ${totalStatuses} sipariş`}><div><strong>{totalStatuses}</strong><span>Toplam<br/>Sipariş</span></div></div><ul className="dashboard-list">{statuses.map(status => <li key={status.name}><span><i style={{background:status.color}}/>{status.name}</span><strong>{data.status_counts?.[status.name] || 0}</strong></li>)}</ul></div></div></div>
      <div className="dashboard-bestsellers"><h3>En Çok Satanlar</h3>{data.top_products.length ? <div className="bestseller-list">{data.top_products.map(item => { const product = products.find(candidate => candidate.title === item.name); return <div key={item.name}>{product ? <span className="bestseller-photo" style={photoStyle(product)} aria-hidden="true" /> : <span className="bestseller-photo" />}<span>{item.name}<small>Seçili dönem</small></span><strong>{item.quantity}<small>satış</small></strong></div> })}</div> : <p>Bu dönemde satılan ürün yok.</p>}</div>
    </>}
  </section>
}
