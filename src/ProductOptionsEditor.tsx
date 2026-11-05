import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from './lib/supabase'
import type { CatalogProduct, ProductOption } from './catalog'

export default function ProductOptionsEditor({ product, reload, close }: { product: CatalogProduct; reload: () => Promise<void>; close: () => void }) {
  const [editing, setEditing] = useState<ProductOption | null>(null)
  const [formVersion, setFormVersion] = useState(0)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const photos = Array.from(new Set([product.image_url, ...(product.gallery || []), ...(product.options || []).map(option => option.image_url)].filter(Boolean))) as string[]
  useEffect(() => { setEditing(null); setMessage('') }, [product.id])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const fabric = String(values.get('fabric') || '').trim()
    const leg = String(values.get('leg') || '').trim()
    const price_delta = Number(values.get('price_delta'))
    const stock_quantity = Number(values.get('stock_quantity'))
    if (!fabric && !leg) { setMessage('Kumaş/malzeme veya ayak/gövde alanlarından birini doldurun.'); return }
    if (!Number.isFinite(price_delta) || product.price + price_delta < 0) { setMessage('Fiyat farkı ürün fiyatını negatife düşüremez.'); return }
    if (!Number.isSafeInteger(stock_quantity) || stock_quantity < 0) { setMessage('Stok adedi sıfır veya pozitif tam sayı olmalı.'); return }
    setBusy(true); setMessage('')
    const payload = { product_id: product.id, fabric, leg, price_delta, stock_quantity, image_url: String(values.get('image_url') || '') || null, sort_order: Number(values.get('sort_order') || 0) }
    const result = editing
      ? await supabase!.from('product_options').update(payload).eq('id', editing.id)
      : await supabase!.from('product_options').insert(payload)
    if (result.error) setMessage('Seçenek kaydedilemedi. Aynı kumaş ve ayak birleşimi zaten mevcut olabilir; 009 SQL kurulumunu ve yetkinizi kontrol edin.')
    else { setMessage('Seçenek kaydedildi.'); setEditing(null); setFormVersion(value => value + 1); await reload() }
    setBusy(false)
  }

  async function remove(option: ProductOption) {
    if (!window.confirm(`${option.fabric} ${option.leg} seçeneği silinsin mi?`)) return
    setBusy(true); setMessage('')
    const result = await supabase!.from('product_options').delete().eq('id', option.id)
    setMessage(result.error ? 'Seçenek silinemedi.' : 'Seçenek silindi.')
    if (!result.error) { setEditing(null); await reload() }
    setBusy(false)
  }

  return <section className="option-editor" aria-labelledby="option-editor-title"><div className="option-editor-heading"><div><p className="eyebrow">ÜRÜN SEÇENEKLERİ</p><h2 id="option-editor-title">{product.title}</h2></div><button type="button" onClick={close}>Kapat</button></div><p>Kumaş ve ayak birleşimleri ayrı fiyat ve stokla satılır. İlk birleşimi eklediğinizde eski metin seçenekleri satışta kullanılmaz. Seçenek fotoğrafını önce ürün galerisine yükleyip burada seçebilirsiniz.</p><p role="status">{message}</p>
    <form key={`${product.id}-${editing?.id || 'new'}-${formVersion}`} onSubmit={save}><fieldset disabled={busy}><div className="option-fields"><label>Kumaş / Malzeme<input name="fabric" maxLength={80} defaultValue={editing?.fabric || ''} /></label><label>Ayak / Gövde<input name="leg" maxLength={80} defaultValue={editing?.leg || ''} /></label><label>Fiyat farkı (₺)<input name="price_delta" type="number" step="0.01" required defaultValue={editing?.price_delta ?? 0} /></label><label>Stok adedi<input name="stock_quantity" type="number" min="0" step="1" required defaultValue={editing?.stock_quantity ?? 0} /></label><label>Sıra<input name="sort_order" type="number" step="1" defaultValue={editing?.sort_order ?? 0} /></label><label>Seçeneğe özel fotoğraf<select name="image_url" defaultValue={editing?.image_url || ''}><option value="">Ürün kapak fotoğrafı</option>{photos.map((url, index) => <option key={url} value={url}>{index + 1}. galeri fotoğrafı</option>)}</select></label></div><div className="option-actions"><button type="submit">{editing ? 'Seçeneği Güncelle' : 'Seçenek Ekle'}</button>{editing && <button type="button" onClick={() => setEditing(null)}>Vazgeç</button>}</div></fieldset></form>
    <div className="option-list">{(product.options || []).map(option => <div className="admin-row" key={option.id}>{option.image_url && <img src={option.image_url} alt="" loading="lazy" />}<span>{[option.fabric, option.leg].filter(Boolean).join(' · ')}<small>{option.price_delta >= 0 ? '+' : ''}{option.price_delta.toLocaleString('tr-TR')} ₺ · {option.stock_quantity} adet stokta</small></span><button disabled={busy} onClick={() => setEditing(option)}>Düzenle</button><button disabled={busy} onClick={() => void remove(option)}>Sil</button></div>)}{!product.options?.length && <p>Henüz birleşim tanımlanmadı.</p>}</div>
  </section>
}
