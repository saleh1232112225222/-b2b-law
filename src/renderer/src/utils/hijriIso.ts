type HijriParts = { year: number; month: number; day: number }

const pad2 = (n: number) => String(n).padStart(2, '0')

const parseIsoDate = (iso: string): Date | null => {
  const s = String(iso || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(s)
  if (isNaN(d.getTime())) return null
  return d
}

const getHijriParts = (date: Date): HijriParts | null => {
  if (!date || isNaN(date.getTime())) return null
  try {
    const fmt = new Intl.DateTimeFormat('ar-u-ca-islamic-umalqura-nu-latn', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    })
    const parts = fmt.formatToParts(date)
    const day = Number(parts.find((p) => p.type === 'day')?.value)
    const month = Number(parts.find((p) => p.type === 'month')?.value)
    const year = Number(parts.find((p) => p.type === 'year')?.value)
    if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null
    return { year, month, day }
  } catch {
    return null
  }
}

export const gregorianIsoToHijriIso = (gregIso: string): string => {
  const d = parseIsoDate(gregIso)
  if (!d) return ''
  const p = getHijriParts(d)
  if (!p) return ''
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`
}

export const hijriIsoToGregorianIso = (hijriIso: string): string => {
  const s = String(hijriIso || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return ''
  const [y, m, d] = s.split('-').map((x) => Number(x))
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return ''
  if (m < 1 || m > 12 || d < 1 || d > 30) return ''

  const approxYear = Math.floor(y * 0.97 + 622)
  const start = new Date(Date.UTC(approxYear - 1, 0, 1))
  const end = new Date(Date.UTC(approxYear + 1, 11, 31))

  const target = { year: y, month: m, day: d }
  for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
    const candidate = new Date(t)
    const p = getHijriParts(candidate)
    if (!p) continue
    if (p.year === target.year && p.month === target.month && p.day === target.day) {
      return candidate.toISOString().split('T')[0]
    }
  }

  return ''
}
