export const formatDate = (iso?: string): string => {
  const s = String(iso || '').trim()
  if (!s) return '---'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString('ar-SA')
}

export const formatSessionDate = (s: any): string => {
  const d = String(s?.date || '').trim()
  const t = String(s?.time || '').trim()
  const label = d ? formatDate(d) : '---'
  return t ? `${label} — ${t}` : label
}

export const ordinal = (idx: number): string => {
  const map = [
    'الأولى',
    'الثانية',
    'الثالثة',
    'الرابعة',
    'الخامسة',
    'السادسة',
    'السابعة',
    'الثامنة',
    'التاسعة',
    'العاشرة'
  ]
  if (idx >= 0 && idx < map.length) return map[idx]
  return String(idx + 1)
}
