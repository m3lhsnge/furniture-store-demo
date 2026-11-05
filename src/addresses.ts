export type Address = { id: string; label: string; country: string; province: string; district: string; line: string; phone: string }

export const normalizeTurkishPhone = (value: string) => {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('90')) return `0${digits.slice(2)}`
  if (digits.length === 10 && /^[2-5]/.test(digits)) return `0${digits}`
  return digits
}

export function readAddresses(value: unknown): Address[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item): Address[] => {
    if (typeof item === 'string') return [{ id: crypto.randomUUID(), label: 'Eski adres', country: 'Türkiye', province: '', district: '', line: item, phone: '' }]
    if (!item || typeof item !== 'object') return []
    const row = item as Record<string, unknown>
    if (typeof row.line !== 'string' || !row.line.trim()) return []
    return [{ id: typeof row.id === 'string' ? row.id : crypto.randomUUID(), label: typeof row.label === 'string' ? row.label : 'Adres', country: typeof row.country === 'string' ? row.country : 'Türkiye', province: typeof row.province === 'string' ? row.province : '', district: typeof row.district === 'string' ? row.district : '', line: row.line, phone: typeof row.phone === 'string' ? row.phone : '' }]
  })
}

export function addressText(address: Address): string {
  return [address.line, address.district, address.province, address.country].filter(Boolean).join(', ')
}
