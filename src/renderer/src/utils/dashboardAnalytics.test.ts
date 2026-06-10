import { describe, expect, it } from 'vitest'
import {
  computeCaseBreakdown,
  computeSixMonthTrend,
  computePerformanceMetrics
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
})
