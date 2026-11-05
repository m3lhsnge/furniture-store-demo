export type AdminView = 'overview' | 'products' | 'orders' | 'categories' | 'inventory' | 'users'
export const adminTitles: Record<AdminView, string> = {
  overview: 'Genel Bakış', products: 'Ürünler', orders: 'Siparişler', categories: 'Kategoriler', inventory: 'Stok', users: 'Kullanıcılar',
}
