import { Boxes, ChartNoAxesCombined, ClipboardList, Layers3, ShieldCheck, Sofa, Store, UsersRound } from 'lucide-react'
import { type AdminView } from './adminView'
import { roleLabel } from './roles'
import { homeClick } from './navigation'

export default function AdminSidebar({ role, view, onSelect }: { role: string; view: AdminView; onSelect: (view: AdminView) => void }) {
  const links = [
    { id: 'overview' as const, label: 'Genel Bakış', icon: ChartNoAxesCombined },
    { id: 'products' as const, label: 'Ürünler', icon: Sofa },
    { id: 'orders' as const, label: 'Siparişler', icon: ClipboardList },
    { id: 'categories' as const, label: 'Kategoriler', icon: Layers3 },
    { id: 'inventory' as const, label: 'Stok', icon: Boxes },
    ...(role === 'developer' ? [{ id: 'users' as const, label: 'Kullanıcılar', icon: UsersRound }] : []),
  ]
  return <aside className="admin-sidebar"><div className="admin-sidebar-brand"><span>NORDIC<br />LIVING</span><i /><small>YÖNETİM</small></div><nav aria-label="Yönetim bölümleri">{links.map(({ id, label, icon: Icon }) => <button type="button" className={view === id ? 'is-active' : ''} aria-current={view === id ? 'page' : undefined} onClick={() => onSelect(id)} key={id}><Icon size={20} strokeWidth={1.6} /><span>{label}</span></button>)}<a href="/" onClick={homeClick}><Store size={20} strokeWidth={1.6} /><span>Ana sayfaya dön</span></a></nav><div className="admin-sidebar-user"><ShieldCheck size={27} strokeWidth={1.3} /><span>Nordic Living<small>{roleLabel(role)}</small></span></div></aside>
}
