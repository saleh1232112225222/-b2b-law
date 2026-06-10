import type { Case } from '../types/case'
import type { Session } from '../types/session'
import type { Task } from '../types/task'

// Pure functions used by the dashboard to compute calendar events, charts datasets, and performance metrics.
export type CaseStatusBucket = 'new' | 'review' | 'court' | 'done'

export interface CaseBreakdown {
  total: number
  buckets: Record<CaseStatusBucket, number>
}

export interface MonthTrendPoint {
  key: string
  label: string
  value: number
}

export interface PerformanceMetrics {
  completionRate: number
  avgDaysToClose: number | null
  newCasesThisMonth: number
  customerSatisfactionRate: number | null
}

export type ImportantDateType = 'session' | 'task' | 'agency'

export interface ImportantDateItem {
  type: ImportantDateType
  date: string
  title: string
  subtitle?: string
  color: 'primary' | 'warning' | 'error' | 'success' | 'info' | 'grey'
}

const toIsoDate = (d: Date): string => d.toLocaleDateString('en-CA')

const parseDate = (iso: string | undefined | null): Date | null => {
  const s = String(iso || '').trim()
  if (!s) return null
  const d = new Date(s)
  return Number.isFinite(d.getTime()) ? d : null
}

const daysBetween = (a: Date, b: Date): number => {
  const ms = b.getTime() - a.getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

export const getSixMonthKeys = (now: Date = new Date()): { key: string; label: string }[] => {
  const out: { key: string; label: string }[] = []
  const base = new Date(now)
  base.setDate(1)
  for (let i = 5; i >= 0; i--) {
    const d = new Date(base)
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('ar-SA', { month: 'short' })
    out.push({ key, label })
  }
  return out
}

export const classifyCaseBucket = (c: Case, now: Date = new Date()): CaseStatusBucket => {
  const status = String(c?.status || '').trim()
  const reg = parseDate(c?.registration_date)
  const ageDays = reg ? daysBetween(reg, now) : null

  if (
    status === 'مغلقة' ||
    status === 'مؤرشفة' ||
    status === 'منتهية' ||
    status === 'محكومة بحكم نهائي' ||
    status === 'كأن لم تكن'
  )
    return 'done'
  if (status === 'تحت الدراسة') return 'review'

  if (status === 'قيد النظر') {
    if (ageDays != null && ageDays <= 30) return 'new'
    return 'court'
  }

  if (ageDays != null && ageDays <= 30) return 'new'
  return 'court'
}

export const computeCaseBreakdown = (cases: Case[], now: Date = new Date()): CaseBreakdown => {
  const buckets: Record<CaseStatusBucket, number> = { new: 0, review: 0, court: 0, done: 0 }
  const list = Array.isArray(cases) ? cases : []
  for (const c of list) {
    const b = classifyCaseBucket(c, now)
    buckets[b] += 1
  }
  return { total: list.length, buckets }
}

export const computeSixMonthTrend = (cases: Case[], now: Date = new Date()): MonthTrendPoint[] => {
  const keys = getSixMonthKeys(now)
  const map = new Map(keys.map((k) => [k.key, 0]))
  for (const c of Array.isArray(cases) ? cases : []) {
    const d = parseDate(c?.registration_date)
    if (!d) continue
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!map.has(key)) continue
    map.set(key, (map.get(key) || 0) + 1)
  }
  return keys.map((k) => ({ key: k.key, label: k.label, value: map.get(k.key) || 0 }))
}

export const computePerformanceMetrics = (
  cases: Case[],
  now: Date = new Date()
): PerformanceMetrics => {
  const list = Array.isArray(cases) ? cases : []
  const total = list.length
  const doneCases = list.filter(
    (c) => String(c?.status || '').trim() === 'مغلقة' || String(c?.status || '').trim() === 'مؤرشفة'
  )

  const completionRate = total > 0 ? doneCases.length / total : 0

  const closeDurations: number[] = []
  for (const c of doneCases) {
    const start = parseDate(c?.registration_date)
    const end = parseDate(c?.updated_at) || parseDate(c?.archived_at) || null
    if (!start || !end) continue
    const days = daysBetween(start, end)
    if (Number.isFinite(days) && days >= 0) closeDurations.push(days)
  }
  const avgDaysToClose =
    closeDurations.length > 0
      ? Math.round(closeDurations.reduce((a, b) => a + b, 0) / closeDurations.length)
      : null

  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const newCasesThisMonth = list.filter((c) => {
    const d = parseDate(c?.registration_date)
    if (!d) return false
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return key === monthKey
  }).length

  const satisfactionBase = list.filter((c) => String(c?.assessment || '').trim()).length
  const customerSatisfactionRate = total > 0 ? satisfactionBase / total : null

  return { completionRate, avgDaysToClose, newCasesThisMonth, customerSatisfactionRate }
}

export const computeImportantDates = (input: {
  sessions: Session[]
  tasks: Task[]
  agencyAlerts: any[]
  from?: string
  to?: string
}): ImportantDateItem[] => {
  const from = input.from ? parseDate(input.from) : null
  const to = input.to ? parseDate(input.to) : null

  const inRange = (iso: string): boolean => {
    const d = parseDate(iso)
    if (!d) return false
    if (from && d < from) return false
    if (to && d > to) return false
    return true
  }

  const items: ImportantDateItem[] = []

  for (const s of Array.isArray(input.sessions) ? input.sessions : []) {
    if (!inRange(s.date)) continue
    const isPast = parseDate(s.date) ? parseDate(s.date)!.getTime() < Date.now() : false
    const color = s.status === 'قادمة' ? 'primary' : isPast ? 'grey' : 'info'
    items.push({
      type: 'session',
      date: s.date,
      title: `جلسة: ${s.case_number || ''}`.trim(),
      subtitle:
        `${s.time ? `الوقت: ${s.time}` : ''} ${s.client_name ? `| الموكل: ${s.client_name}` : ''}`.trim() ||
        undefined,
      color
    })
  }

  for (const t of Array.isArray(input.tasks) ? input.tasks : []) {
    const d = String(t?.due_date || '').trim()
    if (!d || !inRange(d)) continue
    const p = String(t?.priority || '').trim()
    const color = p === 'عالية' ? 'error' : p === 'متوسطة' ? 'warning' : 'info'
    items.push({
      type: 'task',
      date: d,
      title: `مهمة: ${t.title}`,
      subtitle: t.case_number ? `قضية: ${t.case_number}` : undefined,
      color
    })
  }

  for (const ag of Array.isArray(input.agencyAlerts) ? input.agencyAlerts : []) {
    const d = String((ag as any)?.expiry_date || '').trim()
    if (!d || !inRange(d)) continue
    const days = Number((ag as any)?.days_remaining)
    const color = Number.isFinite(days)
      ? days < 0
        ? 'error'
        : days <= 15
          ? 'warning'
          : 'info'
      : 'grey'
    items.push({
      type: 'agency',
      date: d,
      title: `انتهاء وكالة: ${(ag as any)?.client_name || ''}`.trim(),
      subtitle: (ag as any)?.agency_number ? `رقم: ${(ag as any)?.agency_number}` : undefined,
      color
    })
  }

  items.sort((a, b) => {
    const da = parseDate(a.date)?.getTime() ?? 0
    const db = parseDate(b.date)?.getTime() ?? 0
    return da - db
  })

  return items
}

export const getMonthRange = (anchor: Date): { from: string; to: string } => {
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
  return { from: toIsoDate(start), to: toIsoDate(end) }
}
