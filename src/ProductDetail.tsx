import { useEffect, useRef, useState } from 'react'
import { photoStyle, type CatalogProduct, type ProductOption } from './catalog'

export default function ProductDetail({ product, category, add, back, favorite, toggleFavorite }: {
  product: CatalogProduct; category: string; add: (finish: string, option?: ProductOption) => void
  back: () => void; favorite: boolean; toggleFavorite: () => void
}) {
  const options = product.options || []
  const images = Array.from(new Set([product.image_url, ...(product.gallery || []), ...options.map(option => option.image_url)].filter(Boolean))) as string[]
  const initialOption = options.find(option => option.stock_quantity > 0) || options[0]
  const [optionId, setOptionId] = useState(initialOption?.id)
  const [finish, setFinish] = useState(product.variants?.[0] || '')
  const [index, setIndex] = useState(0)
  const [zoom, setZoom] = useState(false)
  const ref = useRef<HTMLDialogElement>(null)
  const selected = options.find(option => option.id === optionId) || initialOption
  const fabrics = [...new Set(options.map(option => option.fabric))]
  const hasFabric = fabrics.some(Boolean)
  const matchingFabric = options.filter(option => !hasFabric || option.fabric === selected?.fabric)
  const legs = [...new Set(matchingFabric.map(option => option.leg))]
  const hasLeg = legs.some(Boolean)
  const price = product.price + (selected?.price_delta || 0)

  useEffect(() => { if (zoom) ref.current?.showModal(); else ref.current?.close() }, [zoom])
  useEffect(() => { document.title = `${product.title} | Nordic Living`; return () => { document.title = 'Nordic Living' } }, [product.title])
  useEffect(() => { if (selected?.image_url) { const imageIndex = images.indexOf(selected.image_url); if (imageIndex >= 0) setIndex(imageIndex) } }, [selected?.image_url])

  const photo = (large = false) => images[index] && images[index] !== '/assets/product-grid.png'
    ? <img src={images[index]} alt={`${product.title} — ${index + 1}`} decoding="async" />
    : <div className={large ? 'detail-sprite large' : 'detail-sprite'} style={photoStyle(product)} />
  const selectFabric = (fabric: string) => {
    const choices = options.filter(option => option.fabric === fabric)
    setOptionId((choices.find(option => option.stock_quantity > 0) || choices[0]).id)
  }
  const selectLeg = (leg: string) => {
    const option = matchingFabric.find(choice => choice.leg === leg)
    if (option) setOptionId(option.id)
  }

  return <main className="product-page page-width">
    <nav className="breadcrumbs"><button onClick={back}>Koleksiyon</button> / {category} / {product.title}</nav>
    <div className="product-layout"><section><button className="gallery-main" onClick={() => setZoom(true)} aria-label="Görseli büyüt">{photo()}<span>＋ Büyüt</span></button><div className="thumbnails">{images.map((src, position) => <button aria-label={`${position + 1}. fotoğraf`} aria-pressed={index === position} key={src} onClick={() => setIndex(position)}>{src === '/assets/product-grid.png' ? <div style={photoStyle(product)} /> : <img loading="lazy" src={src} alt="" />}</button>)}</div></section>
      <section className="purchase-panel"><p className="eyebrow">{category}</p><h1>{product.title}</h1><button className="detail-favorite" type="button" aria-pressed={favorite} onClick={toggleFavorite}>{favorite ? '♥ Favorilerimden çıkar' : '♡ Favorilerime ekle'}</button><p className="detail-price">₺{price.toLocaleString('tr-TR')}</p><p>{product.description}</p>
        {options.length > 0 ? <div className="option-selectors">{hasFabric && <label>Kumaş / Malzeme<select value={selected?.fabric || ''} onChange={event => selectFabric(event.target.value)}>{fabrics.map(value => <option key={value} value={value}>{value || 'Standart'}</option>)}</select></label>}{hasLeg && <label>Ayak / Gövde<select value={selected?.leg || ''} onChange={event => selectLeg(event.target.value)}>{legs.map(value => <option key={value} value={value}>{value || 'Standart'}</option>)}</select></label>}</div> : product.variants?.length > 0 && <label>Malzeme / Renk<select value={finish} onChange={event => setFinish(event.target.value)}>{product.variants.map(value => <option key={value}>{value}</option>)}</select></label>}
        <div className="purchase-action"><button className="checkout-button" disabled={price < 0} onClick={() => add(selected ? [selected.fabric, selected.leg].filter(Boolean).join(' · ') : finish, selected)}>Sepete Ekle</button></div>
        <details open><summary>Ölçüler ve özellikler</summary>{Object.entries(product.dimensions || {}).map(([name, value]) => <p key={name}>{name}: {value}</p>)}{!Object.keys(product.dimensions || {}).length && <p>Ölçü bilgisi için bizimle iletişime geçin.</p>}</details><details><summary>Malzeme ve bakım</summary><p>Ürüne uygun bakım bilgilerini sipariş öncesinde mağazamızdan öğrenebilirsiniz.</p></details><details><summary>Teslimat ve kurulum</summary><p>Teslimat ve kurulum koşulları adresinize ve seçtiğiniz ürüne göre belirlenir. Bu mağazada verilen siparişler demo amaçlıdır.</p></details>
      </section></div>
    <dialog className="lightbox" ref={ref} onCancel={() => setZoom(false)} onKeyDown={event => { if (event.key === 'ArrowRight') setIndex((index + 1) % images.length); if (event.key === 'ArrowLeft') setIndex((index - 1 + images.length) % images.length) }}><button autoFocus className="lightbox-close" onClick={() => setZoom(false)}>Kapat ×</button>{photo(true)}<div className="lightbox-controls"><button onClick={() => setIndex((index - 1 + images.length) % images.length)}>← Önceki</button><span>{index + 1} / {images.length}</span><button onClick={() => setIndex((index + 1) % images.length)}>Sonraki →</button></div></dialog>
  </main>
}
