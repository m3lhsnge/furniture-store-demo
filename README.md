# Nordic Living

Mobilya ürünlerini sergileyen, müşteri hesabı ve yönetim paneli içeren responsive bir e-ticaret **demo uygulaması**.

> **Demo sürümü:** Sipariş akışı örnek amaçlıdır. Gerçek ödeme alınmaz. Yönetim panelindeki sipariş tutarları ve ciro göstergeleri tahsil edilmiş gelir anlamına gelmez.

## Özellikler

- Kategori sayfaları, ürün arama ve filtreleme
- Çoklu görsel, büyütülebilir galeri ve ürün seçenekleri içeren detay sayfaları
- Oturum açan müşteriler için favoriler, sepet, adresler ve sipariş geçmişi
- E-posta doğrulama ve şifre sıfırlama için Supabase Auth entegrasyonu
- Yetkili panelinde ürün, kategori, sipariş ve mağaza göstergeleri yönetimi
- Geliştirici rolünde kullanıcıların rolünü ve aktiflik durumunu yönetme
- Telefon, tablet ve masaüstü ekranlara uyumlu arayüz

## Kullanılan teknolojiler

| Katman | Teknoloji |
| --- | --- |
| Arayüz | React, TypeScript, CSS, Lucide ikonları |
| Geliştirme ve derleme | Vite |
| Kimlik doğrulama ve veri | Supabase Auth, PostgreSQL, Storage |
| Veri erişimi | Supabase JS, Row Level Security (RLS) ve veritabanı fonksiyonları |

## Yerel kurulum

Güncel Node.js ve npm ile bir Supabase projesi gerekir.

1. Depoyu bilgisayarınıza indirin ve proje klasöründe bağımlılıkları kurun:

   ```bash
   npm install
   ```

2. `.env.example` dosyasını `.env.local` adıyla kopyalayın. Supabase projenizin **Project URL** ve **publishable key** değerlerini aşağıdaki değişkenlere yerel dosyanızda girin:

   ```dotenv
   VITE_SUPABASE_URL=
   VITE_SUPABASE_PUBLISHABLE_KEY=
   ```

   `.env.local` Git'e eklenmez. `secret` veya `service_role` anahtarlarını istemci ortam değişkenlerine koymayın.

3. Veritabanı kurulumu için gereken SQL dosyaları açık depoda paylaşılmaz. Dosyalara erişmek için [GitHub profilim üzerinden benimle iletişime geçin](https://github.com/m3lhsnge). Dosyaları temin ettikten sonra yeni bir Supabase projesinde SQL Editor üzerinden şu sırayla çalıştırın:

   `setup.sql` → `002-categories.sql` → `003-admin-access.sql` → `004-store-completion.sql` → `005-first-developer.sql` → `006-dashboard.sql` → `007-checkout-confirmation.sql` → `008-favorites.sql` → `009-product-options.sql` → `010-user-management.sql` → `011-session-revocation.sql` → `012-option-stock-privacy.sql`

   `003-admin-access.sql` çalıştırılmadan önce **Authentication → Users** bölümünde kendi hesabınızı oluşturun ve dosyadaki örnek e-posta alanını yalnızca SQL Editor'da kendi hesabınızla değiştirin. `005-first-developer.sql` için de aynı hesabın e-posta alanını SQL Editor'da doldurun. Bu iki dosya hesap veya şifre oluşturmaz. Kişisel e-posta adresinizi değiştirilmiş SQL dosyasına kaydedip depoya göndermeyin.

4. Supabase Auth URL ayarlarında yerel uygulama adresini ve `/account` dönüş adresini izin verilen yönlendirmelere ekleyin. Yerel geliştirme için örnek adres `http://localhost:5173/account` şeklindedir. E-posta doğrulama ve şifre sıfırlama iletileri için Supabase Auth e-posta ayarlarını yapılandırın.

5. Uygulamayı başlatın:

   ```bash
   npm run dev
   ```

Derleme kontrolü için `npm run build`, derlenen sürümü yerelde görmek için `npm run preview` kullanabilirsiniz.

## Roller ve demo kapsamı

Müşteriler mağazayı kullanır. Yetkililer mağaza yönetimine erişir. Geliştiriciler yönetim özelliklerine ek olarak kullanıcıların rolünü ve aktiflik durumunu düzenleyebilir. Pasifleştirilen kullanıcıların hesabı ve sipariş geçmişi silinmez.

Sipariş oluşturma, kupon ve yönetim paneli akışları demo amaçlıdır. Uygulama gerçek ödeme sağlayıcısına bağlı değildir. Supabase bağlantısı olmadan arayüz örnek katalog verileriyle görüntülenebilir; hesap ve veritabanına bağlı işlemler için kurulumun tamamlanması gerekir.
