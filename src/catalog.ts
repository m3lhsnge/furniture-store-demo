import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { supabase } from './lib/supabase'

export type Category = { id: number; name: string; sort_order: number; visible: boolean }
export type ProductOption = { id: number; product_id: number; fabric: string; leg: string; price_delta: number; stock_quantity: number; image_url: string | null; sort_order: number }
export type CatalogProduct = { id: number; code?: string; title: string; slug: string; category_id: number; price: number; description: string; dimensions: Record<string, string>; gallery?: string[]; image_url: string | null; variants: string[]; options?: ProductOption[]; in_stock: boolean }
export const productCode = (id: number) => `NL-${String(id).padStart(6, '0')}`
export const demoCategories: Category[] = ['Salon', 'Yemek Alanı', 'Yatak Odası', 'Aydınlatma'].map((name, i) => ({id: i + 1, name, sort_order: i, visible: true}))
const sampleProducts: Record<string, { photos: string[]; description: string }> = {
 'eira-moduler-koltuk': { photos: [1, 2, 3].map(n => `/assets/catalog/eira-${n}.webp`), description: 'Yumuşak bukle dokusu, geniş oturumu ve alçak profiliyle sakin bir yaşam alanı için tasarlanmış modüler koltuk. Görseller demo sunumu içindir.' },
 'nara-yemek-masasi': { photos: [1, 2, 3].map(n => `/assets/catalog/nara-${n}.webp`), description: 'Koyu ceviz görünümü ve yalın çizgileriyle yemek alanına sıcaklık katan geniş masa. Görseller demo sunumu içindir.' },
 'sora-dosemeli-yatak': { photos: [1, 2, 3].map(n => `/assets/catalog/sora-${n}.webp`), description: 'Kumaş kaplı yuvarlak hatları ve alçak karyola formuyla huzurlu bir yatak odası görünümü. Görseller demo sunumu içindir.' },
 'kiri-sarkit-aydinlatma': { photos: [1, 2, 3].map(n => `/assets/catalog/kiri-${n}.webp`), description: 'Katmanlı kâğıt görünümüyle yumuşak ışık veren sade bir sarkıt aydınlatma. Görseller demo sunumu içindir.' },
}
function withSampleGallery(product: CatalogProduct): CatalogProduct {
 const sample = sampleProducts[product.slug]
 if (!sample || (product.image_url && product.image_url !== '/assets/product-grid.png') || product.gallery?.length) return product
 return { ...product, image_url: sample.photos[0], gallery: sample.photos.slice(1), description: product.description && product.description !== 'Doğal dokular ve zamansız formlar.' ? product.description : sample.description }
}
export const demoProducts: CatalogProduct[] = ['Eira Modüler Koltuk', 'Nara Yemek Masası', 'Sora Döşemeli Yatak', 'Kiri Sarkıt Aydınlatma'].map((title, i) => withSampleGallery({id:i+1,title,slug:['eira-moduler-koltuk','nara-yemek-masasi','sora-dosemeli-yatak','kiri-sarkit-aydinlatma'][i],category_id:i+1,price:[89900,54900,72900,8900][i],description:'Doğal dokular ve zamansız formlar.',dimensions:{ölçü:['286 × 72 × 104 cm','220 × 75 × 100 cm','180 × 100 × 220 cm','Ø 60 × 45 cm'][i]},image_url:'/assets/product-grid.png',variants:i===1?['Masif Koyu Ceviz','Doğal Meşe']:i===3?['Krem · Ø 60 cm']:['Krem Keten Bukle','Antrasit Bukle','Adaçayı Keten'],in_stock:true}))
type CatalogCache = { products: CatalogProduct[]; categories: Category[] } | null
const cachedCatalog: Record<'store' | 'admin', CatalogCache> = { store: null, admin: null }
const catalogFetchedAt = { store: 0, admin: 0 }
const catalogFreshForMs = 60_000
export function useCatalog(admin = false) {
 const cacheKey = admin ? 'admin' : 'store'
 const [products,setProducts] = useState<CatalogProduct[]>(supabase ? cachedCatalog[cacheKey]?.products || [] : demoProducts)
 const [categories,setCategories] = useState<Category[]>(supabase ? cachedCatalog[cacheKey]?.categories || [] : demoCategories)
 const [loading,setLoading] = useState(!!supabase && !cachedCatalog[cacheKey])
 const [error,setError] = useState('')
 const requestPending = useRef(false)
 const reload = useCallback(async () => {
  if (!supabase || requestPending.current) return
  requestPending.current = true
  setLoading(true)
  try {
   const [p,c,firstOptions] = await Promise.all([supabase.from('products').select('*').order('id'),supabase.from('categories').select('*').order('sort_order').order('id'),supabase.from(admin ? 'product_options' : 'storefront_product_options').select('*').order('sort_order').order('id')])
   if (p.error || c.error) throw p.error || c.error
   const o = firstOptions
   const options=new Map<number,ProductOption[]>()
   if(!o.error)for(const row of o.data){const productId=Number(row.product_id);options.set(productId,[...(options.get(productId)||[]),{...row,id:Number(row.id),product_id:productId,price_delta:Number(row.price_delta),stock_quantity:admin||row.available===undefined?Number(row.stock_quantity):row.available?1:0}])}
   const nextProducts = p.data.filter(product => admin || c.data.some(category => category.id === product.category_id && category.visible)).map(x=>withSampleGallery({...x,price:Number(x.price),options:options.get(Number(x.id))||[]}))
   cachedCatalog[cacheKey] = { products: nextProducts, categories: c.data }
   catalogFetchedAt[cacheKey] = Date.now()
   if(admin) catalogFetchedAt.store = 0
   setProducts(nextProducts); setCategories(c.data); setError(o.error?'Bazı ürün seçenekleri şu anda gösterilemiyor.':'')
  } catch { setError('Katalog yüklenemedi. Lütfen yeniden deneyin.') }
  finally {requestPending.current = false; setLoading(false)}
 },[admin,cacheKey])
 useEffect(()=>{const refreshIfStale=()=>{if(Date.now()-catalogFetchedAt[cacheKey]>catalogFreshForMs)void reload()};refreshIfStale();const refresh=()=>{void reload()};window.addEventListener('focus',refreshIfStale);window.addEventListener('nordic-catalog-refresh',refresh);return()=>{window.removeEventListener('focus',refreshIfStale);window.removeEventListener('nordic-catalog-refresh',refresh)}},[cacheKey,reload])
 return {products,categories,loading,error,reload}
}
export function photoStyle(product: {id:number; image_url?: string | null; position?:string}): CSSProperties {
 const sprite = !product.image_url || product.image_url === '/assets/product-grid.png'
 return {backgroundImage: `url(${JSON.stringify(sprite ? '/assets/product-grid.webp' : product.image_url)})`,backgroundSize:sprite?'200% 200%':'cover',backgroundPosition:sprite?(product.position || ['0% 0%','100% 0%','0% 100%','100% 100%'][(product.id-1)%4]):'center'}
}
