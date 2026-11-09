import { useState, type FormEvent } from 'react'
import { supabase } from './lib/supabase'
import { useCatalog, photoStyle, productCode, type CatalogProduct, type Category } from './catalog'
import { prepareImage } from './images'
import { adminTitles, type AdminView } from './adminView'
import AdminSidebar from './AdminSidebar'
import Management from './Management'
import InventoryAlerts from './InventoryAlerts'
import ProductOptionsEditor from './ProductOptionsEditor'
import UsersAdmin from './UsersAdmin'
import { homeClick } from './navigation'

const slugify = (text: string) => text.toLocaleLowerCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export default function Admin({ role, userId }: { role: string; userId: string }) {
  const catalog = useCatalog(true)
  const [view, setView] = useState<AdminView>('overview')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [gallery, setGallery] = useState<string[]>([])
  const [productFormVersion, setProductFormVersion] = useState(0)
  const [categoryFormVersion, setCategoryFormVersion] = useState(0)
  const [optionProductId, setOptionProductId] = useState<number | null>(null)
  const [showProductForm, setShowProductForm] = useState(false)
  const [productCategoryId, setProductCategoryId] = useState<number | null>(null)
  const optionProduct = catalog.products.find(product => product.id === optionProductId)

  function selectView(next: AdminView) {
    if (next === 'users' && role !== 'developer') return
    setView(next)
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  function editProduct(product: CatalogProduct) {
    setEditingProduct(product)
    setShowProductForm(true)
    setProductCategoryId(product.category_id)
    setGallery(Array.from(new Set([product.image_url, ...(product.gallery || [])].filter(Boolean))) as string[])
    setProductFormVersion(value => value + 1)
    selectView('products')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function resetProduct() {
    setEditingProduct(null)
    setShowProductForm(false)
    setGallery([])
    setProductFormVersion(value => value + 1)
  }
  function editCategory(category: Category) {
    setEditingCategory(category)
    setCategoryFormVersion(value => value + 1)
    selectView('categories')
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    const form = event.currentTarget
    const values = new FormData(form)
    const title = String(values.get('title') || '').trim()
    const customCode = String(values.get('code') || '').trim().toUpperCase()
    const categoryId = Number(values.get('category_id'))
    const category = catalog.categories.find(item => item.id === categoryId)
    const price = Number(values.get('price'))
    const files = (form.elements.namedItem('photos') as HTMLInputElement).files
    if (!title || !category || !Number.isFinite(price) || price < 0) { setMessage('Ürün adı, kategori ve fiyatı kontrol edin.'); return }
    if (customCode && !/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(customCode)) { setMessage('Ürün kodu 3–40 karakter olmalı; yalnızca harf, rakam, tire ve alt çizgi kullanın.'); return }
    if (customCode && /^NL-[0-9]+$/.test(customCode) && customCode !== productCode(editingProduct?.id || 0)) { setMessage('NL- ile başlayan sayısal kodlar otomatik kodlara ayrılmıştır.'); return }
    if (gallery.length + (files?.length || 0) > 12) { setMessage('En fazla 12 fotoğraf ekleyebilirsiniz.'); return }
    setBusy(true); setMessage('')
    const uploaded: string[] = []
    const paths: string[] = []
    try {
      for (const file of Array.from(files || [])) {
        const blob = await prepareImage(file)
        const path = `${userId}/${crypto.randomUUID()}.webp`
        const result = await supabase.storage.from('furniture-images').upload(path, blob, { contentType: 'image/webp', upsert: false })
        if (result.error) throw result.error
        paths.push(path)
        uploaded.push(supabase.storage.from('furniture-images').getPublicUrl(path).data.publicUrl)
      }
      const photos = [...gallery, ...uploaded]
      const payload = {
        title,
        slug: editingProduct?.slug || `${slugify(title) || 'urun'}-${crypto.randomUUID().slice(0, 8)}`,
        category: category.name,
        category_id: categoryId,
        price,
        description: String(values.get('description') || '').trim(),
        dimensions: { ölçü: String(values.get('dimensions') || '').trim() },
        variants: String(values.get('variants') || '').split(',').map(value => value.trim()).filter(Boolean),
        image_url: photos[0] || null,
        gallery: photos.slice(1),
        in_stock: values.get('in_stock') === 'on',
        ...(customCode ? { code: customCode } : {}),
      }
      const result = editingProduct
        ? await supabase.from('products').update(payload).eq('id', editingProduct.id)
        : await supabase.from('products').insert(payload)
      if (result.error) throw result.error
      setMessage(editingProduct ? 'Ürün güncellendi.' : 'Ürün eklendi.')
      resetProduct()
      setProductCategoryId(categoryId)
      await catalog.reload()
    } catch (error) {
      if (paths.length) await supabase.storage.from('furniture-images').remove(paths)
      setMessage(error && typeof error === 'object' && 'code' in error && error.code === '23505' ? 'Bu ürün kodu kullanılıyor. Başka bir kod girin.' : 'Ürün kaydedilemedi. Bilgileri ve ürün kodunu kontrol edin.')
    } finally { setBusy(false) }
  }
  async function deleteProduct(product: CatalogProduct) {
    if (!supabase || !window.confirm(`${product.title} ürünü silinsin mi?`)) return
    setBusy(true)
    const result = await supabase.from('products').delete().eq('id', product.id)
    setMessage(result.error ? 'Ürün silinemedi. Yeniden deneyin.' : 'Ürün silindi.')
    if (!result.error) { if (optionProductId === product.id) setOptionProductId(null); await catalog.reload() }
    setBusy(false)
  }
  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    const values = new FormData(event.currentTarget)
    const payload = { name: String(values.get('name') || '').trim(), sort_order: Number(values.get('sort_order') || 0), visible: values.get('visible') === 'on' }
    if (!payload.name) { setMessage('Kategori adı gerekli.'); return }
    setBusy(true)
    const result = editingCategory
      ? await supabase.from('categories').update(payload).eq('id', editingCategory.id)
      : await supabase.from('categories').insert(payload)
    setMessage(result.error ? 'Kategori kaydedilemedi. Bilgileri kontrol edip yeniden deneyin.' : 'Kategori kaydedildi.')
    if (!result.error) { setEditingCategory(null); setCategoryFormVersion(value => value + 1); await catalog.reload() }
    setBusy(false)
  }
  async function deleteCategory(category: Category) {
    if (!supabase || !window.confirm(`${category.name} kategorisi silinsin mi?`)) return
    setBusy(true)
    const result = await supabase.from('categories').delete().eq('id', category.id)
    setMessage(result.error ? 'Kategori silinemedi. Önce bu kategorideki ürünleri başka kategoriye taşıyın.' : 'Kategori silindi.')
    if (!result.error) await catalog.reload()
    setBusy(false)
  }

  return <div className="admin-shell"><AdminSidebar role={role} view={view} onSelect={selectView} /><main className="admin-page admin-main"><header className="admin-heading"><div><p className="eyebrow">NORDIC LIVING YÖNETİM</p><h1>{adminTitles[view]}</h1><p className="admin-subtitle">{view === 'overview' ? 'Mağazanızın bugünkü görünümü' : `${adminTitles[view]} yönetimi`}</p></div><div className="admin-header-actions"><a className="admin-home-link" href="/" onClick={homeClick}>Ana sayfaya dön</a><button type="button" onClick={() => void supabase?.auth.signOut()}>Çıkış Yap</button></div></header>{catalog.error && <p role="alert">{catalog.error}</p>}{message && <p role="status">{message}</p>}{catalog.loading && <p>Katalog yükleniyor…</p>}
    {view === 'overview' && <Management view="overview" products={catalog.products} onOpenOrders={() => selectView('orders')} />}
    {view === 'orders' && <Management view="orders" products={catalog.products} onOpenOrders={() => selectView('orders')} />}
    {view === 'products' && <><div className="admin-columns">{showProductForm && <section><h2>{editingProduct ? 'Ürünü Düzenle' : 'Yeni Ürün'}</h2><form key={`product-${editingProduct?.id || 'new'}-${productFormVersion}`} onSubmit={saveProduct}><fieldset disabled={busy}><label>Ürün adı<input name="title" required maxLength={160} defaultValue={editingProduct?.title || ''} /></label><label>Ürün kodu (isteğe bağlı)<input name="code" maxLength={40} defaultValue={editingProduct?.code || ''} placeholder={editingProduct ? productCode(editingProduct.id) : 'Boş bırakın: otomatik kod'} autoCapitalize="characters" /><small>Boşsa otomatik atanır. Özel kod 3–40 karakter olabilir; harf, rakam, - ve _ kullanın.</small></label><label>Kategori<select name="category_id" required defaultValue={editingProduct?.category_id || ''}><option value="" disabled>Kategori seçin</option>{catalog.categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Fiyat (₺)<input name="price" type="number" min="0" step="0.01" required defaultValue={editingProduct?.price ?? ''} /></label><label>Açıklama<textarea name="description" defaultValue={editingProduct?.description || ''} /></label><label>Ölçüler<input name="dimensions" defaultValue={editingProduct?.dimensions?.ölçü || ''} /></label><label>Eski metin seçenekleri (virgülle ayırın)<input name="variants" defaultValue={(editingProduct?.variants || []).join(', ')} /></label><label className="check-label"><input name="in_stock" type="checkbox" defaultChecked={editingProduct?.in_stock ?? true} /> Satışta</label><label>Ürün fotoğrafları<input name="photos" type="file" multiple accept="image/jpeg,image/png,image/webp" /></label><p className="upload-hint">En fazla 12 fotoğraf. Fotoğraflar yüklemeden önce WebP olarak küçültülür. İlk fotoğraf kapaktır.</p><div className="upload-gallery">{gallery.map((url, index) => <div key={`${url}-${index}`}><img src={url} alt={`${index + 1}. ürün fotoğrafı`} /><strong>{index === 0 ? 'Kapak' : `${index + 1}. fotoğraf`}</strong><div className="upload-actions"><button type="button" disabled={index === 0} onClick={() => setGallery(old => { const next = [...old]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next })}>←</button><button type="button" disabled={index === gallery.length - 1} onClick={() => setGallery(old => { const next = [...old]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; return next })}>→</button></div><button type="button" onClick={() => setGallery(old => old.filter((_, position) => position !== index))}>Kaldır</button></div>)}</div><button type="submit">{busy ? 'Kaydediliyor…' : editingProduct ? 'Ürünü Güncelle' : 'Ürün Ekle'}</button>{editingProduct && <button type="button" onClick={resetProduct}>Vazgeç</button>}</fieldset></form></section>}<section><div className="admin-product-heading"><h2>Kategorilere Göre Ürünler</h2><button type="button" onClick={() => { resetProduct(); setShowProductForm(true) }}>＋ Yeni Ürün</button></div><div className="admin-category-tabs" role="tablist" aria-label="Ürün kategorileri">{catalog.categories.map(category => <button type="button" role="tab" aria-selected={(productCategoryId ?? catalog.categories[0]?.id) === category.id} className={(productCategoryId ?? catalog.categories[0]?.id) === category.id ? 'is-active' : ''} key={category.id} onClick={() => setProductCategoryId(category.id)}>{category.name} <small>{catalog.products.filter(product => product.category_id === category.id).length}</small></button>)}</div>{catalog.products.filter(product => product.category_id === (productCategoryId ?? catalog.categories[0]?.id)).map(product => <div className="admin-row" key={product.id}><div className="admin-thumb" style={photoStyle(product)} /><span>{product.title}<small>{product.code || productCode(product.id)} · ₺{product.price.toLocaleString('tr-TR')} · {catalog.categories.find(category => category.id === product.category_id)?.name}</small></span><button disabled={busy} onClick={() => editProduct(product)}>Düzenle</button><button disabled={busy} onClick={() => setOptionProductId(product.id)}>Seçenekler</button><button disabled={busy} onClick={() => void deleteProduct(product)}>Sil</button></div>)}{!catalog.products.some(product => product.category_id === (productCategoryId ?? catalog.categories[0]?.id)) && <p>Bu kategoride henüz ürün yok.</p>}</section></div>{optionProduct && <ProductOptionsEditor product={optionProduct} reload={catalog.reload} close={() => setOptionProductId(null)} />}</>}
    {view === 'categories' && <div className="admin-columns"><section><h2>{editingCategory ? 'Kategoriyi Düzenle' : 'Yeni Kategori'}</h2><form key={`category-${editingCategory?.id || 'new'}-${categoryFormVersion}`} onSubmit={saveCategory}><fieldset disabled={busy}><label>Ad<input name="name" required maxLength={100} defaultValue={editingCategory?.name || ''} /></label><label>Sıra<input name="sort_order" type="number" step="1" defaultValue={editingCategory?.sort_order ?? 0} /></label><label className="check-label"><input name="visible" type="checkbox" defaultChecked={editingCategory?.visible ?? true} /> Mağazada görünür</label><button type="submit">{editingCategory ? 'Kategoriyi Güncelle' : 'Kategori Ekle'}</button>{editingCategory && <button type="button" onClick={() => { setEditingCategory(null); setCategoryFormVersion(value => value + 1) }}>Vazgeç</button>}</fieldset></form></section><section><h2>Kategoriler</h2>{catalog.categories.map(category => <div className="admin-row" key={category.id}><span>{category.name}<small>Sıra: {category.sort_order} · {category.visible ? 'Görünür' : 'Gizli'}</small></span><button disabled={busy} onClick={() => editCategory(category)}>Düzenle</button><button disabled={busy} onClick={() => void deleteCategory(category)}>Sil</button></div>)}</section></div>}
    {view === 'inventory' && <><InventoryAlerts products={catalog.products} edit={id => { setOptionProductId(id); selectView('products') }} /><p className="inventory-help">Stok adedi ürün seçenekleri üzerinden güncellenir.</p></>}
    {view === 'users' && role === 'developer' && <UsersAdmin currentUserId={userId} />}
  </main></div>
}
