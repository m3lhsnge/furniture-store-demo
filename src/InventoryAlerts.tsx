import type { CatalogProduct } from './catalog'

export default function InventoryAlerts({ products, edit }: { products: CatalogProduct[]; edit: (productId: number) => void }) {
  const low = products.flatMap(product => (product.options || []).filter(option => option.stock_quantity <= 3).map(option => ({ product, option })))
    .sort((a, b) => a.option.stock_quantity - b.option.stock_quantity)
  const inactive = products.filter(product => !product.in_stock)
  return <section id="inventory-admin" className="inventory-alerts"><h2>Stok Uyarıları</h2><p>3 adet ve altındaki kombinasyonlar: {low.length} · Satışa kapalı ürünler: {inactive.length}</p>
    {low.length ? <div className="inventory-list">{low.map(({ product, option }) => <div className="admin-row" key={option.id}><span>{product.title}<small>{[option.fabric, option.leg].filter(Boolean).join(' · ')} · {option.stock_quantity === 0 ? 'Tükendi' : `${option.stock_quantity} adet kaldı`}</small></span><button onClick={() => edit(product.id)}>Seçenekleri Aç</button></div>)}</div> : <p>Azalan kombinasyon yok.</p>}
    {inactive.length > 0 && <p>Satışa kapalı: {inactive.map(product => product.title).join(', ')}</p>}
  </section>
}
