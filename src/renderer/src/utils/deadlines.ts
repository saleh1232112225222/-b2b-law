export type DeadlineOptions = {
  weekendDays?: number[]
  holidays?: string[]
}

const toIso = (d: Date): string => d.toISOString().split('T')[0]

const parseIso = (iso: string): Date | null => {
  const s = String(iso || '').trim()
  if (!s) return null
  const d = new Date(s)
  if (isNaN(d.getTime())) return null
  return d
}

const makeHolidaySet = (holidays?: string[]) =>
  new Set((holidays || []).map((h) => String(h || '').trim()).filter(Boolean))

const isNonWorkingDay = (d: Date, weekendDays: number[], holidaySet: Set<string>) => {
  if (weekendDays.includes(d.getDay())) return true
  return holidaySet.has(toIso(d))
}

export const computeDeadline = (
  startDateIso: string,
  days: number,
  options: DeadlineOptions = {}
): string => {
  const start = parseIso(startDateIso)
  if (!start) return ''
  const n = Number(days)
  if (!Number.isFinite(n) || n < 0) return ''

  const weekendDays = options.weekendDays || [5, 6]
  const holidaySet = makeHolidaySet(options.holidays)

  const end = new Date(start)
  end.setDate(end.getDate() + n)

  while (isNonWorkingDay(end, weekendDays, holidaySet)) {
    end.setDate(end.getDate() + 1)
  }

  return toIso(end)
}
