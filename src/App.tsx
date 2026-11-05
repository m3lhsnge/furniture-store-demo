import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useCommerce } from './commerce'
import { useCatalog, photoStyle } from './catalog'
import { useFavorites } from './favorites'
const loadAccount=()=>import('./Account')
const Account=lazy(loadAccount)
const ProductDetail=lazy(()=>import('./ProductDetail'))
import {
  ArrowRight,
  ChevronDown,
  Heart,
  Menu,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from 'lucide-react'

const formatPrice = (value: number) => `₺${value.toLocaleString('tr-TR')}`

function Storefront() {
  const catalog = useCatalog()
  const [path,setPath]=useState(window.location.pathname)
  useEffect(()=>{const sync=()=>setPath(window.location.pathname);window.addEventListener('popstate',sync);return ()=>window.removeEventListener('popstate',sync)},[])
  const navigate=(target:string)=>{history.pushState(null,'',target);setPath(target);window.scrollTo({top:0})}
  const visit=(slug:string|null)=>navigate(slug?'/urun/'+encodeURIComponent(slug):'/')
  const visitCategory=(id:number)=>{setQuery('');setMaxPrice('');navigate('/kategori/'+id)}
  const visitFavorites=()=>{setQuery('');setMaxPrice('');navigate('/favorilerim')}
  const slug=path.startsWith('/urun/')?decodeURIComponent(path.slice(6)):null
  const categoryPageId=path.startsWith('/kategori/')?Number(path.slice(10)):null
  const favoritesPage=path==='/favorilerim'
  const contactPage=path.replace(/\/$/, '')==='/iletisim'
  const listingPage=favoritesPage||categoryPageId!==null
  const [maxPrice,setMaxPrice]=useState('')
  const [sort,setSort]=useState('default')
  const [visibleCount,setVisibleCount]=useState(12)
  const [searchOpen,setSearchOpen]=useState(false)
  const [debounced,setDebounced]=useState('')
  const favorites = useFavorites()
  useEffect(()=>{if(favoritesPage&&!favorites.loading&&!favorites.authenticated)window.location.replace('/account?next=%2Ffavorilerim')},[favoritesPage,favorites.loading,favorites.authenticated])
  const categories = catalog.categories.filter(c=>c.visible)
  const currentCategory=categories.find(category=>category.id===categoryPageId)
  const products = useMemo(()=>catalog.products.map(p=>({...p, in_stock:p.in_stock&&(!p.options?.length||p.options.some(option=>option.stock_quantity>0)), displayPrice:p.price+(p.options?.length?Math.min(...(p.options.some(option=>option.stock_quantity>0)?p.options.filter(option=>option.stock_quantity>0):p.options).map(option=>option.price_delta)):0), name:p.title, category:catalog.categories.find(c=>c.id===p.category_id)?.name || '', position:['0% 0%','100% 0%','0% 100%','100% 100%'][(p.id-1)%4]})),[catalog.products,catalog.categories])
  const commerce = useCommerce()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [query, setQuery] = useState('')
  useEffect(()=>{const timer=setTimeout(()=>setDebounced(query.trim()),250);return ()=>clearTimeout(timer)},[query])
  const results=debounced.length>=3?products.filter(p=>(p.name+' '+p.category).toLocaleLowerCase('tr-TR').includes(debounced.toLocaleLowerCase('tr-TR'))):[]
  const active=catalog.products.find(p=>p.slug===slug)
  const visibleProducts = useMemo(() => {
    const normalized = debounced.length>=3?debounced.toLocaleLowerCase('tr-TR'):''
    return products.filter(p=>categoryPageId===null||p.category_id===currentCategory?.id).filter(p=>!favoritesPage||favorites.ids.includes(p.id)).filter((product) => `${product.name} ${product.category}`.toLocaleLowerCase('tr-TR').includes(normalized)).filter(p=>(!maxPrice||p.displayPrice<=Number(maxPrice))).sort((a,b)=>sort==='low'?a.displayPrice-b.displayPrice:sort==='high'?b.displayPrice-a.displayPrice:0)
  }, [debounced, categoryPageId, currentCategory?.id, favoritesPage, products, maxPrice, sort, favorites.ids])
  useEffect(()=>setVisibleCount(12),[categoryPageId,favoritesPage,debounced,maxPrice,sort])

  return (
    <div className="site-shell">
      <div className="announcement">Nordic Living yeni koleksiyonunu keşfedin</div>
      <header className="header">
        <div className="header-main page-width">
          <div className="search-container"><label className="search-field">
            <Search size={19} strokeWidth={1.6} />
            <input
              value={query}
              onFocus={()=>setSearchOpen(true)}
              onKeyDown={e=>{if(e.key==='Escape')setSearchOpen(false);if(e.key==='Enter'&&query.trim().length>=3){visit(null);setSearchOpen(false);window.setTimeout(()=>document.getElementById('collection')?.scrollIntoView(),0)}}}
              onChange={(event) => {setQuery(event.target.value);setSearchOpen(true)}}
              placeholder="Eviniz için ne arıyorsunuz?"
              aria-label="Ürün ara"
            />
          </label>{searchOpen&&query.length>0&&<div className="search-results"><button onClick={()=>setSearchOpen(false)} aria-label="Aramayı kapat">×</button>{query.trim().length<3?<p>En az 3 karakter yazın.</p>:<>{results.slice(0,6).map(p=><button className="search-result" key={p.id} onClick={()=>{visit(p.slug);setSearchOpen(false)}}><span className="search-thumb" style={photoStyle(p)}/><span>{p.name}<small>{formatPrice(p.displayPrice)}</small></span></button>)}{!results.length&&<p>Sonuç bulunamadı.</p>}<a href="#collection" onClick={e=>{e.preventDefault();visit(null);setSearchOpen(false);window.setTimeout(()=>document.getElementById('collection')?.scrollIntoView(),0)}}>Tüm sonuçları gör ({results.length})</a></>}</div>}</div>
          <button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Menüyü aç">
            <Menu size={24} />
          </button>
          <a className="logo" href="/" aria-label="Nordic Living ana sayfa">NORDIC LIVING</a>
          <div className="header-actions">
            <button className="action-button favorites-link" onClick={visitFavorites} aria-label={`Favorilerim (${favorites.ids.length})`}><Heart size={21} strokeWidth={1.4} fill={favoritesPage?'currentColor':'none'}/><span>Favorilerim</span></button>
            <button className="action-button" onClick={() => commerce.openCart()}>
              <span className="icon-wrap"><ShoppingBag size={22} strokeWidth={1.4} /><b>{commerce.count}</b></span>
              <span>Sepetim</span>
            </button>
            <span className="action-divider" />
            <a className="action-button account-link" href="/account" onPointerEnter={()=>void loadAccount()} onFocus={()=>void loadAccount()} onClick={event=>{if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();history.pushState(null,'','/account');window.dispatchEvent(new PopStateEvent('popstate'));window.scrollTo({top:0})}}><UserRound size={22} strokeWidth={1.4} /><span>Hesabım</span></a>
          </div>
        </div>
        <nav className="category-nav" aria-label="Ürün kategorileri">
          <div className="page-width category-inner">
            <a href="/" onClick={e=>{e.preventDefault();visit(null)}}>KOLEKSİYON 2026</a>{categories.map((category) => <div className="nav-category" key={category.id}><a href={'/kategori/'+category.id} onClick={e=>{e.preventDefault();visitCategory(category.id)}}>{category.name.toLocaleUpperCase("tr-TR")}</a><div className="category-suggestions"><strong>{category.name}</strong>{products.filter(p=>p.category_id===category.id).slice(0,3).map(p=><button key={p.id} onClick={()=>visit(p.slug)}><span className="search-thumb" style={photoStyle(p)}/>{p.name}</button>)}<a href={'/kategori/'+category.id} onClick={e=>{e.preventDefault();visitCategory(category.id)}}>Tüm ürünleri gör →</a></div></div>)}
          </div>
        </nav>
      </header>

      {contactPage ? <main className="contact-page page-width"><nav className="listing-breadcrumb" aria-label="Gezinme yolu"><a href="/" onClick={e=>{e.preventDefault();visit(null)}}>Ana sayfa</a><span aria-hidden="true">›</span><span aria-current="page">İletişim</span></nav><div className="contact-intro"><p className="eyebrow">NORDIC LIVING DEMO</p><h1>İletişime Geç</h1><p>Bu demo sürüm hakkında benimle aşağıdaki hesaplardan iletişime geçebilirsiniz.</p></div><div className="contact-links"><a href="https://github.com/m3lhsnge" target="_blank" rel="noopener noreferrer"><span className="contact-icon"><img src="/assets/github-mark.svg" width="30" height="30" alt=""/></span><span><strong>GitHub</strong><small>github.com/m3lhsnge</small></span><ArrowRight size={20}/></a><a href="https://www.instagram.com/m3lhakaa/" target="_blank" rel="noopener noreferrer"><span className="contact-icon"><img src="/assets/instagram-mark.svg" width="30" height="30" alt=""/></span><span><strong>Instagram</strong><small>instagram.com/m3lhakaa</small></span><ArrowRight size={20}/></a></div></main> : slug ? active ? <Suspense fallback={<p>Ürün yükleniyor…</p>}><ProductDetail key={active.id} product={active} category={categories.find(c=>c.id===active.category_id)?.name||''} back={()=>visit(null)} add={(finish,option)=>commerce.addProduct({...active,name:active.title,category:'',position:'',price:active.price+(option?.price_delta||0),image_url:option?.image_url||active.image_url,in_stock:active.in_stock&&(!option||option.stock_quantity>0)},finish,option?.id,option?.stock_quantity)} favorite={favorites.ids.includes(active.id)} toggleFavorite={()=>void favorites.toggle(active.id)}/></Suspense> : <main className="page-width"><h1>{catalog.loading?'Ürün yükleniyor…':'Ürün bulunamadı'}</h1>{catalog.error&&<p>{catalog.error}</p>}<button onClick={()=>visit(null)}>Koleksiyona dön</button></main> : <main id="top" className={listingPage?'listing-view':''}>
        {listingPage&&<nav className="listing-breadcrumb page-width" aria-label="Gezinme yolu"><a href="/" onClick={e=>{e.preventDefault();visit(null)}}>Ana sayfa</a><span aria-hidden="true">›</span><span aria-current="page">{favoritesPage?'Favorilerim':currentCategory?.name||'Kategori'}</span></nav>}
        <section className="hero">
          <img src="/assets/nordic-hero.webp" fetchPriority="high" width="1672" height="941" alt="Krem bukle koltuklu sıcak ve dingin Japandi salon" />
          <div className="hero-shade" />
          <div className="page-width hero-content">
            <p className="eyebrow">YENİ KOLEKSİYON</p>
            <h1>2026 Yaşam Alanı<br />Koleksiyonu</h1>
            <p>Sessiz lüks, doğal dokular ve zamansız formlar.</p>
            <a className="primary-button" href="#collection">Koleksiyonu Keşfet <ArrowRight size={18} /></a>
          </div>
          <span className="hero-index">01 <i /> 04</span>
        </section>

        <section className="room-discovery page-width"><p className="eyebrow">YAŞAM ALANLARINI KEŞFEDİN</p><h2>Her odada, sizin hikâyeniz.</h2><div className="room-grid">{categories.map(c=>{const p=products.find(p=>p.category_id===c.id);return <a key={c.id} href={'/kategori/'+c.id} onClick={e=>{e.preventDefault();visitCategory(c.id)}}><div className="room-photo" style={p?photoStyle(p):undefined}/><span>{c.name}<ArrowRight size={20}/></span></a>})}</div></section>
        <section className="collection page-width" id="collection">
          <div className="section-heading">
            <div><p className="eyebrow">{favoritesPage?'KAYDETTİĞİNİZ ÜRÜNLER':categoryPageId!==null?'KATEGORİ':'ÖZENLE SEÇİLDİ'}</p><h2>{favoritesPage?'Favorilerim':categoryPageId!==null?currentCategory?.name||'Kategori bulunamadı':'Seçkin Parçalar'}</h2></div>
            {listingPage?<a href="/" onClick={e=>{e.preventDefault();visit(null);setQuery('')}}>Tüm koleksiyon <ArrowRight size={18}/></a>:<a href="#collection" onClick={()=>setQuery('')}>Tümünü Gör <ArrowRight size={18} /></a>}
          </div>
          <div className="catalog-filters"><label>En yüksek fiyat<input type="number" min="0" placeholder="₺" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)}/></label><select aria-label="Sıralama" value={sort} onChange={e=>setSort(e.target.value)}><option value="default">Önerilen sıralama</option><option value="low">Fiyat: düşükten yükseğe</option><option value="high">Fiyat: yüksekten düşüğe</option></select></div>{catalog.loading && <p role="status">Koleksiyon yükleniyor…</p>}{favorites.loading&&<p role="status">Favoriler yükleniyor…</p>}{favorites.message&&<p role="alert">{favorites.message}</p>}{catalog.error && <p role="alert">{catalog.error} <button onClick={()=>void catalog.reload()}>Yeniden Dene</button></p>}
          {visibleProducts.length ? (
            <div className="product-grid">
              {visibleProducts.slice(0,visibleCount).map((product) => (
                <article className="product-card" key={product.id}>
                  <div className="product-image" style={photoStyle(product)}>
                    <a className="product-hit" href={'/urun/'+product.slug} onClick={e=>{e.preventDefault();visit(product.slug)}} aria-label={product.name}/><button className="heart-button" aria-pressed={favorites.ids.includes(product.id)} disabled={favorites.loading} onClick={()=>void favorites.toggle(product.id)} aria-label={`${product.name} ürününü ${favorites.ids.includes(product.id)?'favorilerden çıkar':'favorilere ekle'}`}><Heart size={19} strokeWidth={1.5} /></button>
                    <button className="quick-add" onClick={() => visit(product.slug)}>Ürünü İncele <ArrowRight size={17} /></button>
                  </div>
                  <p className="product-category">{product.category}</p>
                  <div className="product-title-row"><h3><a href={'/urun/'+product.slug} onClick={e=>{e.preventDefault();visit(product.slug)}}>{product.name}</a></h3><span>{formatPrice(product.displayPrice)}{Boolean(product.options?.length)&&<small> başlangıç</small>}</span></div>
                </article>
              ))}
            </div>
          ) : !catalog.loading && !catalog.error ? (
            <div className="empty-search"><Search size={28} /><h3>{favoritesPage?'Henüz favori ürününüz yok.':currentCategory?'Bu kategoride eşleşen ürün bulunamadı.':'Aradığınız ürün bulunamadı.'}</h3><button onClick={() => {setQuery('');setMaxPrice('');if(favoritesPage)visit(null)}}>{favoritesPage?'Koleksiyonu keşfet':'Filtreleri temizle'}</button></div>
          ) : null}
          {visibleProducts.length>visibleCount&&<div className="catalog-more"><p>{visibleCount} / {visibleProducts.length} ürün gösteriliyor</p><button type="button" onClick={()=>setVisibleCount(count=>count+12)}>Daha Fazla Ürün Göster <ArrowRight size={17}/></button></div>}
        </section>

        <section id="story" className="manifesto page-width">
          <div className="manifesto-copy">
            <p className="eyebrow">NORDIC LIVING FELSEFESİ</p>
            <h2>Evinizin ritmine uyum sağlayan, zamansız tasarımlar.</h2>
            <p>Doğal malzemelerin sıcaklığını yalın formlarla buluşturuyor; uzun yıllar hayatınıza eşlik edecek parçalar tasarlıyoruz.</p>
            <a href="#story">Hikâyemizi Keşfedin <ArrowRight size={17} /></a>
          </div>
          <div className="manifesto-image" aria-label="Doğal ahşap yemek masası" />
          <div className="material-note"><span>01</span><p>Masif ceviz<br /><small>Doğal ve karakterli</small></p></div>
        </section>

        <section className="service-strip">
          <div className="page-width service-grid">
            <div><span>01</span><h3>Teslimat Bilgisi</h3><p>Ürün ve adresinize göre koşulları birlikte belirleyelim.</p></div>
            <div><span>02</span><h3>Demo Sipariş</h3><p>Ödeme alınmadan sipariş akışını deneyin.</p></div>
            <div><span>03</span><h3>Uzman Desteği</h3><p>Doğru parçayı seçerken yanınızdayız.</p></div>
          </div>
        </section>
      </main>}

      <footer className="footer">
        <div className="page-width footer-inner"><div className="footer-brand"><span className="footer-logo">NORDIC LIVING</span><span className="footer-demo">Bu bir demo sürümdür.</span><a className="footer-contact" href="/iletisim" onClick={e=>{if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();navigate('/iletisim')}}>İletişime Geç <ArrowRight size={16}/></a></div><p>Doğal dokular. Sessiz mekânlar. Kalıcı yaşam.</p><span>© 2026 Nordic Living</span></div>
      </footer>

      {commerce.ui}

      <div className={`mobile-drawer ${mobileOpen ? 'is-open' : ''}`}>
        <div><span className="mobile-logo">NORDIC LIVING</span><button onClick={() => setMobileOpen(false)}><X /></button></div>
        <nav>{categories.map((category) => <a key={category.id} href={'/kategori/'+category.id} onClick={e => {e.preventDefault();setMobileOpen(false);visitCategory(category.id)}}>{category.name}<ChevronDown size={17} /></a>)}<a href="/favorilerim" onClick={e=>{e.preventDefault();setMobileOpen(false);visitFavorites()}}>Favorilerim<Heart size={17}/></a></nav>
      </div>
    </div>
  )
}

export default function App() { const [path,setPath]=useState(window.location.pathname);useEffect(()=>{const sync=()=>setPath(window.location.pathname);window.addEventListener('popstate',sync);return()=>window.removeEventListener('popstate',sync)},[]);return ['/account', '/login', '/admin'].includes(path.replace(/\/$/, '')) ? <Suspense fallback={<p>Hesabınız yükleniyor…</p>}><Account/></Suspense> : <Storefront/> }
