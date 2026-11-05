import { useState, type FormEvent } from 'react'
import { ChevronDown, MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { normalizeTurkishPhone, type Address } from './addresses'
import { districtsFor, provinces, validateAddress } from './locations'

const blankAddress = (): Address => ({ id: crypto.randomUUID(), label: 'Ev', country: 'Türkiye', province: '', district: '', line: '', phone: '' })

export default function AddressBook({ addresses, busy, onSave, onRemove }: {
  addresses: Address[]
  busy: boolean
  onSave: (address: Address) => Promise<boolean>
  onRemove: (id: string) => Promise<boolean>
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Address>(blankAddress)
  const [error, setError] = useState('')

  const startEdit = (address: Address) => {
    setDraft({ ...address, phone: normalizeTurkishPhone(address.phone) })
    setEditingId(address.id)
    setOpenId(address.id)
    setError('')
  }
  const cancelEdit = () => { setEditingId(null); setError('') }
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = validateAddress(draft)
    if (!result.address) { setError(result.error || 'Adres bilgilerini kontrol edin.'); return }
    setError('')
    if (await onSave(result.address)) { setEditingId(null); setOpenId(result.address.id) }
  }
  const remove = async (id: string) => {
    if (!window.confirm('Bu adres kaldırılsın mı?')) return
    if (await onRemove(id)) { setOpenId(null); setEditingId(null); setError('') }
  }

  return <section className="address-book">
    <div className="profile-section-head"><h2><MapPin size={21} /> Adreslerim</h2><button type="button" disabled={busy} onClick={() => { const next = blankAddress(); setDraft(next); setOpenId(next.id); setEditingId(next.id); setError('') }}><Plus size={17} /> Adres Ekle</button></div>
    <div className="address-list">{addresses.map(address => <div className="address-tile" key={address.id}>
      <button type="button" className="address-summary" aria-expanded={openId === address.id} onClick={() => { setOpenId(openId === address.id ? null : address.id); cancelEdit() }}><span><strong>{address.label}</strong><small>{[address.district, address.province].filter(Boolean).join(' · ') || 'Konum belirtilmedi'}</small></span><ChevronDown size={18} /></button>
      {openId === address.id && editingId !== address.id && <div className="address-details"><p><b>Ülke</b>{address.country || '—'}</p><p><b>İl / İlçe</b>{[address.province, address.district].filter(Boolean).join(' / ') || '—'}</p><p><b>Açık adres</b>{address.line}</p><p><b>Telefon</b>{address.phone || '—'}</p><div className="address-actions"><button type="button" disabled={busy} onClick={() => startEdit(address)}><Pencil size={15} /> Düzenle</button><button type="button" disabled={busy} className="address-remove" onClick={() => void remove(address.id)}><Trash2 size={15} /> Kaldır</button></div></div>}
    </div>)}{!addresses.length && editingId === null && <p className="profile-help">Henüz kayıtlı adresiniz yok.</p>}</div>
    {editingId !== null && <form className="address-editor" onSubmit={event => void save(event)}><fieldset disabled={busy}><h3>{addresses.some(address => address.id === editingId) ? 'Adresi düzenle' : 'Yeni adres'}</h3><div className="profile-fields">
      <label>Adres adı<input required maxLength={60} value={draft.label} onChange={event => setDraft(previous => ({ ...previous, label: event.target.value }))} placeholder="Ev, iş yeri…" /></label>
      <label>Ülke<select value={draft.country} onChange={event => setDraft(previous => ({ ...previous, country: event.target.value, province: '', district: '' }))}><option value="Türkiye">Türkiye</option></select></label>
      <label>İl<input required list="province-options" autoComplete="address-level1" value={draft.province} onChange={event => setDraft(previous => ({ ...previous, province: event.target.value, district: '' }))} placeholder="İl seçin veya yazın" /><datalist id="province-options">{provinces.map(province => <option key={province} value={province} />)}</datalist></label>
      <label>İlçe<input required list="district-options" autoComplete="address-level2" disabled={!districtsFor(draft.province).length} value={draft.district} onChange={event => setDraft(previous => ({ ...previous, district: event.target.value }))} placeholder="İlçe seçin veya yazın" /><datalist id="district-options">{districtsFor(draft.province).map(district => <option key={district} value={district} />)}</datalist></label>
      <label>Telefon numarası<input required type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={11} pattern="0[2-5][0-9]{9}" value={draft.phone} onChange={event => setDraft(previous => ({ ...previous, phone: event.target.value.replace(/\D/g, '').slice(0, 11) }))} placeholder="05XXXXXXXXX" /></label>
      <label className="profile-wide">Açık adres<textarea required minLength={10} maxLength={500} value={draft.line} onChange={event => setDraft(previous => ({ ...previous, line: event.target.value }))} placeholder="Mahalle, cadde, sokak, bina ve daire numarası" /></label>
    </div>{error && <p className="address-error" role="alert">{error}</p>}<div className="address-actions"><button type="submit">Adresi Kaydet</button><button type="button" className="address-cancel" onClick={cancelEdit}>Vazgeç</button></div></fieldset></form>}
  </section>
}
