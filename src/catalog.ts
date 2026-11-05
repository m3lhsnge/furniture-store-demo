import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { supabase } from './lib/supabase'

export type Category = { id: number; name: string; sort_order: number; visible: boolean }
export type ProductOption = { id: number; product_id: number; fabric: string; leg: string; price_delta: number; stock_quantity: number; image_url: string | null; sort_order: number }
export type CatalogProduct = { id: number; title: string; slug: string; category_id: number; price: number; description: string; dimensions: Record<string, string>; gallery?: string[]; image_url: string | null; variants: string[]; options?: ProductOption[]; in_stock: boolean }
export const demoCategories: Category[] = ['Salon', 'Yemek Alanı', 'Yatak Odası', 'Aydınlatma'].map((name, i) => ({id: i + 1, name, sort_order: i, visible: true}))
export const demoProducts: CatalogProduct[] = ['Eira Modüler Koltuk', 'Nara Yemek Masası', 'Sora Döşemeli Yatak', 'Kiri Sarkıt Aydınlatma'].map((title, i) => ({id:i+1,title,slug:`urun-${i+1}`,category_id:i+1,price:[89900,54900,72900,8900][i],description:'Doğal dokular ve zamansız formlar.',dimensions:{ölçü:['286 × 72 × 104 cm','220 × 75 × 100 cm','180 × 100 × 220 cm','Ø 60 × 45 cm'][i]},image_url:'/assets/product-grid.png',variants:i===1?['Masif Koyu Ceviz','Doğal Meşe']:i===3?['Krem · Ø 60 cm']:['Krem Keten Bukle','Antrasit Bukle','Adaçayı Keten'],in_stock:true}))
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
   // The older schema remains usable until 012-option-stock-privacy.sql is applied.
   const o = !admin && firstOptions.error ? await supabase.from('product_options').select('*').order('sort_order').order('id') : firstOptions
   const options=new Map<number,ProductOption[]>()
   if(!o.error)for(const row of o.data){const productId=Number(row.product_id);options.set(productId,[...(options.get(productId)||[]),{...row,id:Number(row.id),product_id:productId,price_delta:Number(row.price_delta),stock_quantity:admin||row.available===undefined?Number(row.stock_quantity):row.available?1:0}])}
   const nextProducts = p.data.map(x=>({...x,price:Number(x.price),options:options.get(Number(x.id))||[]}))
   cachedCatalog[cacheKey] = { products: nextProducts, categories: c.data }
   catalogFetchedAt[cacheKey] = Date.now()
   if(admin) catalogFetchedAt.store = 0
   setProducts(nextProducts); setCategories(c.data); setError(o.error?'Ürün seçenekleri yüklenemedi. 009/012 SQL kurulumunu kontrol edin.':'')
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
