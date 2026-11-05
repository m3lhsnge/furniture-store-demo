import locations from './trLocations.json'
import { normalizeTurkishPhone, type Address } from './addresses'

// Source: TurkiyeAPI province and district datasets (MIT), https://github.com/ubeydeozdmr/turkiye-api
export const provinces = locations.map(location => location.province)
const locationKey = (value: string) => value.trim().toLocaleLowerCase('tr-TR')
export const findProvince = (value: string) => locations.find(location => locationKey(location.province) === locationKey(value))
export const findDistrict = (province: string, district: string) => findProvince(province)?.districts.find(name => locationKey(name) === locationKey(district))
export const districtsFor = (province: string) => findProvince(province)?.districts || []

export function validateAddress(address: Address): { address?: Address; error?: string } {
  const province = findProvince(address.province)
  const district = province && findDistrict(province.province, address.district)
  const phone = normalizeTurkishPhone(address.phone)
  if (!address.label.trim() || !/[\p{L}]/u.test(address.label)) return { error: 'Adres adı en az bir harf içermeli.' }
  if (address.country !== 'Türkiye') return { error: 'Şu anda yalnızca Türkiye adresleri eklenebilir.' }
  if (!province) return { error: 'Listeden geçerli bir il seçin.' }
  if (!district) return { error: 'Seçilen ile bağlı geçerli bir ilçe seçin.' }
  if (!/^0[2-5]\d{9}$/.test(phone)) return { error: 'Telefon numarası 0 ile başlayan 11 haneli bir Türkiye numarası olmalı.' }
  if (address.line.trim().length < 10 || !/[\p{L}]/u.test(address.line)) return { error: 'Açık adres en az 10 karakter ve bir harf içermeli.' }
  return { address: { ...address, label: address.label.trim(), country: 'Türkiye', province: province.province, district, phone, line: address.line.trim() } }
}
