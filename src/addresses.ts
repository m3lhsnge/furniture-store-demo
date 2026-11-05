export type Address = { id: string; label: string; country: string; province: string; district: string; line: string; phone: string }

export function readAddresses(value: unknown): Address[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item): Address[] => {
    if (typeof item === 'string') return [{ id: crypto.randomUUID(), label: 'Eski adres', country: 'Türkiye', province: '', district: '', line: item, phone: '' }]
    if (!item || typeof item !== 'object') return []
    const row = item as Record<string, unknown>
    if (typeof row.line !== 'string' || !row.line.trim()) return []
    return [{ id: typeof row.id === 'string' ? row.id : crypto.randomUUID(), label: String(row.label || 'Adres'), country: String(row.country || 'Türkiye'), province: String(row.province || ''), district: String(row.district || ''), line: row.line, phone: String(row.phone || '') }]
  })
}

export function addressText(address: Address): string {
  return [address.line, address.district, address.province, address.country].filter(Boolean).join(', ')
}
