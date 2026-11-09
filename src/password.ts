export const passwordHelp = 'En az 8 karakter; en az bir büyük harf, küçük harf ve rakam kullanın. Boşluk ve özel karakter kullanabilirsiniz.'

export function passwordError(password: string): string | null {
  if (Array.from(password).length < 8) return passwordHelp
  if (!/[A-ZÇĞİÖŞÜ]/.test(password) || !/[a-zçğıöşü]/.test(password) || !/[0-9]/.test(password)) return passwordHelp
  if (new TextEncoder().encode(password).length > 72) return 'Şifre çok uzun. En fazla 72 bayt kullanın; Türkçe harfler ve emojiler birden fazla bayt olabilir.'
  return null
}
