import { useEffect, type MouseEvent } from 'react'

type LegalKind = 'privacy' | 'disclosure'

export default function LegalPage({ kind, navigate }: { kind: LegalKind; navigate: (path: string) => void }) {
  const disclosure = kind === 'disclosure'
  const title = disclosure ? 'Kişisel Veriler Aydınlatma Metni' : 'Gizlilik Metni'

  useEffect(() => {
    document.title = `${title} | Nordic Living Demo`
    return () => { document.title = 'Nordic Living' }
  }, [title])

  const link = (path: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(path)
  }

  return <main className="legal-page page-width">
    <nav className="listing-breadcrumb" aria-label="Gezinme yolu"><a href="/" onClick={link('/')}>Ana sayfa</a><span aria-hidden="true">›</span><span aria-current="page">{title}</span></nav>
    <div className="legal-intro"><p className="eyebrow">NORDIC LIVING DEMO</p><h1>{title}</h1><p>Nordic Living, mobilya sergileme ve demo sipariş akışını göstermek için hazırlanmış bir projedir. Gerçek satış, ödeme veya teslimat yapılmaz.</p></div>
    {disclosure ? <div className="legal-content">
      <section><h2>Veri sorumlusu ve iletişim</h2><p>Veri sorumlusu: Demo proje sahibi. Uygulama kapsamında işlenen kişisel verilerle ilgili talepleriniz için <a href="/iletisim" onClick={link('/iletisim')}>İletişim sayfasından demo proje sahibine ulaşabilirsiniz</a>.</p></section>
      <section><h2>İşlenen veriler</h2><p>Hesap açarken ad ve e-posta adresi; giriş için şifre; profil düzenlerken ad, telefon ve adres bilgileri işlenir. Favorileriniz ve demo siparişinizin ürünleri, tutarı, adı, telefon ve adres bilgileri de hesapla ilişkili olarak kaydedilebilir. Oturum ve sepet bilgileri tarayıcıda tutulabilir.</p></section>
      <section><h2>Amaç ve yöntem</h2><p>Veriler, kullanıcının başlattığı hesap, favori, profil ve demo sipariş işlevlerini çalıştırmak; hesabı korumak ve taleplere yanıt vermek için, formlara girilen bilgiler ve uygulama kullanımı yoluyla elektronik ortamda işlenir. Demo sipariş kaydı gerçek bir satın alma sözleşmesi veya teslimat talebi oluşturmaz.</p></section>
      <section><h2>Hizmet sağlayıcılar ve aktarım</h2><p>Hesap ve demo işlevlerini sunmak için bilgiler, gerekli barındırma ve kimlik doğrulama hizmeti sağlayıcılarıyla paylaşılabilir. Sayfadaki yazı tipleri dış bir hizmetten yüklenebilir. İletişim veya sepet paylaşım bağlantılarını açmanız hâlinde ilgili dış siteye yönlendirilirsiniz; o sitenin kendi gizlilik koşulları geçerlidir.</p></section>
      <section><h2>Saklama ve haklarınız</h2><p>Demo verileri için uygulamada otomatik bir silme süresi tanımlı değildir. Hesabınız ve verileriniz hakkında bilgi alma, düzeltme veya silme talebinizi <a href="/iletisim" onClick={link('/iletisim')}>İletişim sayfasından</a> iletebilirsiniz. Şifreniz yönetim panelinde görüntülenmez.</p></section>
    </div> : <div className="legal-content">
      <section><h2>Bu sitenin kapsamı</h2><p>Ürünler, fiyatlar, sepet ve sipariş adımları yalnızca yazılım demosunu göstermek içindir. Sitede gerçek ödeme alınmaz; ürün satışı ve teslimat hizmeti sunulmaz. Demo formlarında gerçek adres veya telefon bilgisi yerine örnek bilgiler kullanmanızı öneririz.</p></section>
      <section><h2>Hesap ve kayıtlar</h2><p>Hesap açarsanız adınız ve e-posta adresiniz kaydedilir. Profilinize eklediğiniz telefon ve adresler, favorileriniz ve oluşturduğunuz demo sipariş kayıtları da saklanabilir. Sepetiniz ve oturum tercihleriniz cihazınızda tutulabilir.</p></section>
      <section><h2>Tarayıcı ve dış hizmetler</h2><p>Sitenin çalışması için bazı bilgiler tarayıcınızda saklanır. Uygulamaya reklam veya davranış analizi amacıyla bir izleme aracı eklenmemiştir. Hesap ve barındırma hizmeti sağlayıcıları ile tıkladığınız dış bağlantılar kendi hizmetleri kapsamında veri işleyebilir.</p></section>
      <section><h2>Verilerinizle ilgili talepler</h2><p>Bu demoda kullanıcı hesabını ve tüm ilişkili verileri otomatik silen bir özellik bulunmaz. Erişim, düzeltme veya silme talepleriniz için <a href="/iletisim" onClick={link('/iletisim')}>İletişim sayfasını</a> kullanabilirsiniz. Ayrıntılar için <a href="/aydinlatma-metni" onClick={link('/aydinlatma-metni')}>Kişisel Veriler Aydınlatma Metni</a> sayfasına bakın.</p></section>
    </div>}
    <div className="legal-bottom"><a href={disclosure ? '/gizlilik' : '/aydinlatma-metni'} onClick={link(disclosure ? '/gizlilik' : '/aydinlatma-metni')}>{disclosure ? 'Gizlilik Metni' : 'Kişisel Veriler Aydınlatma Metni'}</a><a href="/iletisim" onClick={link('/iletisim')}>İletişime Geç</a></div>
  </main>
}
