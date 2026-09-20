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
  case_id?: string
  case_number?: string
  najiz_url?: string
  meeting_link?: string
  raw?: any
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

/**
 * Determines whether a given case status represents a closed / finished / completed case.
 * Handles variations such as 'منتهية بحكم قطعي', 'كان لم تكن', 'بانتظار التنفيذ', etc.
 */
export const isClosedCaseStatus = (
  status: string | null | undefined,
  isArchived?: number | boolean
): boolean => {
  if (isArchived) return true
  const s = String(status || '').trim()
  if (!s) return false
  if (s === 'مغلقة' || s === 'منتهية' || s === 'مؤرشفة' || s === 'أرشيف') return true
  if (s.includes('منتهي') || s.includes('منتهية')) return true
  if (s.includes('مغلق') || s.includes('إغلاق')) return true
  if (s.includes('مؤرشف') || s.includes('أرشيف')) return true
  if (s.includes('لم تكن')) return true // matches 'كأن لم تكن', 'كان لم تكن', 'لم تكن'
  if (s.includes('قطعي') || s.includes('قطعية')) return true // matches 'منتهية بحكم قطعي', 'مكتسب القطعية'
  if (s.includes('محكوم') && !s.includes('غير نهائي')) return true // matches 'محكومة بحكم نهائي'
  if (s === 'بانتظار التنفيذ' || s.includes('تنفيذ')) return true // finished in court, in enforcement phase
  if (s.includes('مشطوب') || s.includes('شطب')) return true
  return false
}

/**
 * Determines whether a case is active in litigation.
 * A case is active if it is not archived, not closed/done, and not suspended/pending ('معلقة').
 */
export const isActiveCaseStatus = (
  status: string | null | undefined,
  isArchived?: number | boolean
): boolean => {
  if (isArchived) return false
  const s = String(status || '').trim()
  if (!s) return false
  if (
    s === 'قيد النظر' ||
    s === 'تحت الدراسة' ||
    s.includes('غير نهائي') ||
    s === 'موقفة بطلب من أطراف الدعوى'
  ) {
    return true
  }
  if (s === 'معلقة') return false
  return !isClosedCaseStatus(s, isArchived)
}

export const classifyCaseBucket = (c: Case, now: Date = new Date()): CaseStatusBucket => {
  const status = String(c?.status || '').trim()
  const reg = parseDate(c?.registration_date)
  const ageDays = reg ? daysBetween(reg, now) : null

  if (isClosedCaseStatus(status, c?.is_archived)) return 'done'
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
  const doneCases = list.filter((c) => isClosedCaseStatus(c?.status, c?.is_archived))

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
    const najizUrl = String(
      (s as any).najiz_url || (s as any).case_najiz_url || s.meeting_link || ''
    ).trim()
    items.push({
      type: 'session',
      date: s.date,
      title: `جلسة: ${s.case_number || ''}`.trim(),
      subtitle:
        `${s.time ? `الوقت: ${s.time}` : ''} ${s.client_name ? `| الموكل: ${s.client_name}` : ''}`.trim() ||
        undefined,
      color,
      case_id: s.case_id,
      case_number: s.case_number,
      najiz_url: najizUrl,
      meeting_link: s.meeting_link,
      raw: s
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
      color,
      case_id: (t as any).case_id,
      case_number: t.case_number,
      najiz_url: (t as any).najiz_url || '',
      raw: t
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
