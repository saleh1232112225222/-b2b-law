import { describe, expect, it } from 'vitest'
import {
  computeCaseBreakdown,
  computeSixMonthTrend,
  computePerformanceMetrics,
  isClosedCaseStatus,
  isActiveCaseStatus
} from './dashboardAnalytics'

describe('dashboardAnalytics', () => {
  it('computes case breakdown buckets', () => {
    const now = new Date('2026-04-20T00:00:00.000Z')
    const cases: any[] = [
      { status: 'قيد النظر', registration_date: '2026-04-10' },
      { status: 'قيد النظر', registration_date: '2025-10-10' },
      { status: 'تحت الدراسة', registration_date: '2026-01-01' },
      { status: 'مغلقة', registration_date: '2025-01-01', updated_at: '2025-02-01' }
    ]
    const r = computeCaseBreakdown(cases as any, now)
    expect(r.total).toBe(4)
    expect(r.buckets.new).toBe(1)
    expect(r.buckets.court).toBe(1)
    expect(r.buckets.review).toBe(1)
    expect(r.buckets.done).toBe(1)
  })

  it('computes six month trend for registrations', () => {
    const now = new Date('2026-04-20T00:00:00.000Z')
    const cases: any[] = [
      { registration_date: '2026-04-01' },
      { registration_date: '2026-04-12' },
      { registration_date: '2026-03-02' },
      { registration_date: '2025-01-01' }
    ]
    const t = computeSixMonthTrend(cases as any, now)
    expect(t).toHaveLength(6)
    expect(t[t.length - 1].key).toBe('2026-04')
    expect(t[t.length - 1].value).toBe(2)
  })

  it('computes performance metrics with stable defaults', () => {
    const now = new Date('2026-04-20T00:00:00.000Z')
    const cases: any[] = [
      { status: 'قيد النظر', registration_date: '2026-04-10' },
      {
        status: 'مغلقة',
        registration_date: '2026-01-10',
        updated_at: '2026-02-10',
        assessment: 'ok'
      }
    ]
    const m = computePerformanceMetrics(cases as any, now)
    expect(m.completionRate).toBeCloseTo(0.5)
    expect(m.newCasesThisMonth).toBe(1)
    expect(m.avgDaysToClose).toBeGreaterThan(0)
    expect(m.customerSatisfactionRate).toBeCloseTo(0.5)
  })

  it('correctly classifies closed and active case statuses', () => {
    expect(isClosedCaseStatus('منتهية')).toBe(true)
    expect(isClosedCaseStatus('منتهية بحكم قطعي')).toBe(true)
    expect(isClosedCaseStatus('كأن لم تكن')).toBe(true)
    expect(isClosedCaseStatus('كان لم تكن')).toBe(true)
    expect(isClosedCaseStatus('محكومة بحكم نهائي')).toBe(true)
    expect(isClosedCaseStatus('بانتظار التنفيذ')).toBe(true)
    expect(isClosedCaseStatus('مغلقة')).toBe(true)
    expect(isClosedCaseStatus('قيد النظر', 1)).toBe(true)

    expect(isActiveCaseStatus('قيد النظر')).toBe(true)
    expect(isActiveCaseStatus('تحت الدراسة')).toBe(true)
    expect(isActiveCaseStatus('محكومة بحكم غير نهائي')).toBe(true)
    expect(isActiveCaseStatus('معلقة')).toBe(false)
    expect(isActiveCaseStatus('منتهية بحكم قطعي')).toBe(false)
    expect(isActiveCaseStatus('كأن لم تكن')).toBe(false)
    expect(isActiveCaseStatus('بانتظار التنفيذ')).toBe(false)
  })
})
