import { describe, expect, it, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFinanceStore } from '../stores/finance'
import { useOfficeAccountsStore } from '../stores/officeAccounts'
import router from '../router'
import api from '../api/ApiAdapter'

describe('Reports Frontend Contracts & Integrations (5 Issues)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  describe('Issue 1: Judgments Report (/reports/judgments)', () => {
    it('ApiAdapter exposes getJudgmentsReport on reports namespace', () => {
      expect(typeof api.reports.getJudgmentsReport).toBe('function')
    })
  })

  describe('Issue 2: Case Report Contracts', () => {
    it('ApiAdapter exposes getCaseReport on reports namespace', () => {
      expect(typeof api.reports.getCaseReport).toBe('function')
    })
  })

  describe('Issue 3: Client Financial Profile Contract & Fallback', () => {
    it('ensures ClientFullProfile contract compliance with installment_schedules and 10 summary keys', async () => {
      const officeStore = useOfficeAccountsStore()

      // Mock compliant API response from /reports/client-financial/:clientId
      const compliantApiResponse = {
        client: { id: 'c-1', name: 'شركة الأمل' },
        first_deal_date: '2025-01-01',
        cases: [{ id: 'case-1', case_number: '101' }],
        services: [],
        payments: [],
        invoices: [],
        vouchers: [],
        installment_schedules: [
          { id: 'inst-1', amount: 500, due_date: '2026-10-01', status: 'pending' }
        ],
        summary: {
          total_cases: 1,
          total_services: 0,
          total_services_amount: 0,
          total_services_paid: 0,
          total_services_remaining: 0,
          total_payments: 0,
          total_invoices: 0,
          total_vouchers: 0,
          pending_installments: 1,
          overdue_installments: 0
        }
      }

      ;(window as any).api = {
        reports: {
          getClientFinancialReport: vi.fn().mockResolvedValue(compliantApiResponse)
        }
      }

      const profile = await officeStore.fetchClientFullProfile('c-1')

      // Crucial test for ClientFullProfile.vue:473 - must not throw
      expect(profile).toBeDefined()
      expect(Array.isArray(profile!.installment_schedules)).toBe(true)
      expect(profile!.installment_schedules.length).toBe(1)
      expect(profile!.installment_schedules[0].id).toBe('inst-1')

      // All 10 summary keys must be numbers and present
      const summaryKeys = [
        'total_cases',
        'total_services',
        'total_services_amount',
        'total_services_paid',
        'total_services_remaining',
        'total_payments',
        'total_invoices',
        'total_vouchers',
        'pending_installments',
        'overdue_installments'
      ] as const
      for (const key of summaryKeys) {
        expect(profile!.summary).toHaveProperty(key)
        expect(typeof (profile!.summary as Record<string, number>)[key]).toBe('number')
      }
    })

    it('strictly rejects non-compliant responses lacking client or required arrays/summary keys', async () => {
      const officeStore = useOfficeAccountsStore()

      // A truthy but non-compliant response (e.g. legacy endpoint returning { success: true, dummy: 1 } without client, summary or arrays)
      const nonCompliantResponse = {
        success: true,
        data: 'random string'
      }

      ;(window as any).api = {
        reports: {
          getClientFinancialReport: vi.fn().mockResolvedValue(nonCompliantResponse)
        },
        legalServices: {
          getClientFullProfile: vi.fn().mockRejectedValue(new Error('not available'))
        },
        paymentTracking: {
          getClientFullProfile: vi.fn().mockResolvedValue({ notCompliant: true })
        }
      }

      const profile = await officeStore.fetchClientFullProfile('c-fallback')

      // Must reject broken partial objects completely to prevent ClientFullProfile.vue from crashing
      expect(profile).toBeNull()
      expect(officeStore.clientFullProfile).toBeNull()
    })

    it('bypasses non-compliant candidate in chain and accepts the compliant candidate', async () => {
      const officeStore = useOfficeAccountsStore()

      const compliantResponse = {
        client: { id: 'c-1', name: 'شركة البركة' },
        cases: [],
        services: [],
        payments: [],
        invoices: [],
        vouchers: [],
        installment_schedules: [],
        summary: {
          total_cases: 0,
          total_services: 0,
          total_services_amount: 0,
          total_services_paid: 0,
          total_services_remaining: 0,
          total_payments: 0,
          total_invoices: 0,
          total_vouchers: 0,
          pending_installments: 0,
          overdue_installments: 0
        }
      }

      ;(window as any).api = {
        reports: {
          getClientFinancialReport: vi.fn().mockResolvedValue({ partialBroken: true })
        },
        legalServices: {
          getClientFullProfile: vi.fn().mockResolvedValue(compliantResponse)
        }
      }

      const profile = await officeStore.fetchClientFullProfile('c-fallback')
      expect(profile).toBeDefined()
      expect(profile?.client.name).toBe('شركة البركة')
      expect(Array.isArray(profile?.installment_schedules)).toBe(true)
    })
  })

  describe('Issue 4: Partner Budget Dashboard Store Connection', () => {
    it('finance store fetchBudgetStats successfully invokes reports.getPartnerBudgetReport', async () => {
      const financeStore = useFinanceStore()

      const budgetFixture = {
        period: 'year',
        totalRevenue: 50000,
        totalExpenses: 20000,
        netIncome: 30000,
        burnRate: 1666,
        runwayMonths: 12,
        categories: [{ category: 'قضايا', amount: 50000, percentage: 100 }],
        monthlyTrends: [],
        lawyerContributions: [{ lawyer_name: 'أحمد', cases_count: 5, total_revenue: 50000 }]
      }

      const getPartnerBudgetReportMock = vi.fn().mockResolvedValue(budgetFixture)

      ;(window as any).api = {
        reports: {
          getPartnerBudgetReport: getPartnerBudgetReportMock
        }
      }

      await financeStore.fetchBudgetStats(5, 2026)

      expect(getPartnerBudgetReportMock).toHaveBeenCalledWith({ month: 5, year: 2026 })
      expect(financeStore.budgetStats).toEqual(budgetFixture)
    })

    it('ApiAdapter maps getPartnerBudgetReport and getBudgetStats on reports namespace', () => {
      expect(typeof api.reports.getPartnerBudgetReport).toBe('function')
      expect(typeof api.reports.getBudgetStats).toBe('function')
    })
  })

  describe('Issue 5: Permissions Alignment for Detailed Inquiry', () => {
    it('matches router permission for detailed-inquiry with backend requireAnyPermission', () => {
      const detailedInquiryRoute = router
        .getRoutes()
        .find((r) => r.path === '/reports/detailed-inquiry')
      expect(detailedInquiryRoute).toBeDefined()
      expect(detailedInquiryRoute?.meta?.permissions).toBeDefined()

      const permissions = detailedInquiryRoute?.meta?.permissions as string[]
      expect(permissions).toContain('view_cases')
      expect(permissions).toContain('export_reports')
    })
  })
})
