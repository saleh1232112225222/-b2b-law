const HIJRI_MONTHS = [
  'محرم',
  'صفر',
  'ربيع الأول',
  'ربيع الثاني',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذو القعدة',
  'ذو الحجة'
]

/**
 * Hijri Converter with manual month mapping to ensure correct Arabic names
 */
export const getTodayHijri = () => {
  return convertToHijri(new Date())
}

export const convertToHijri = (date: Date) => {
  if (!date || isNaN(date.getTime())) return ''

  try {
    // We use Intl to get the numeric parts of the Hijri date
    const formatter = new Intl.DateTimeFormat('ar-u-ca-islamic-umalqura-nu-latn', {
      weekday: 'long',
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    })

    const parts = formatter.formatToParts(date)
    const day = parts.find((p) => p.type === 'day')?.value
    const monthIndex = parseInt(parts.find((p) => p.type === 'month')?.value || '1') - 1
    const year = parts.find((p) => p.type === 'year')?.value
    const weekday = parts.find((p) => p.type === 'weekday')?.value

    const monthName = HIJRI_MONTHS[monthIndex] || ''

    return `${weekday}، ${day} ${monthName} ${year}`
  } catch (e) {
    // Fallback to simpler Islamic if umalqura fails
    try {
      const formatter = new Intl.DateTimeFormat('ar-u-ca-islamic-nu-latn', {
        weekday: 'long',
        day: 'numeric',
        month: 'numeric',
        year: 'numeric'
      })
      const parts = formatter.formatToParts(date)
      const day = parts.find((p) => p.type === 'day')?.value
      const monthIndex = parseInt(parts.find((p) => p.type === 'month')?.value || '1') - 1
      const year = parts.find((p) => p.type === 'year')?.value
      const weekday = parts.find((p) => p.type === 'weekday')?.value
      const monthName = HIJRI_MONTHS[monthIndex] || ''
      return `${weekday}، ${day} ${monthName} ${year}`
    } catch (e2) {
      console.error('Hijri conversion failed:', e2)
      return ''
    }
  }
}
