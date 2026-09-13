import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'

// Polyfill ResizeObserver for Vuetify components in happy-dom
if (typeof (globalThis as any).ResizeObserver === 'undefined') {
  ;(globalThis as any).ResizeObserver = class ResizeObserver {
    observe(): void {
      /* noop */
    }
    unobserve(): void {
      /* noop */
    }
    disconnect(): void {
      /* noop */
    }
  }
}

// Mock vue-router hooks
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {}, params: {} }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() })
}))

import CaseReport from '../views/CaseReport.vue'
import DetailedCaseInquiry from '../views/DetailedCaseInquiry.vue'
import ClientFullProfile from '../components/finance/ClientFullProfile.vue'
import JudgmentsReport from '../views/JudgmentsReport.vue'
import PartnerBudgetReport from '../views/PartnerBudgetReport.vue'

const vuetify = createVuetify()

function mountWithGlobals(component: any, options?: any) {
  return mount(component, {
    global: {
      plugins: [vuetify],
      stubs: {
        LucideIcon: true,
        PrintReportFrame: true,
        PrintSignaturePage: true,
        RouterLink: true
      }
    },
    ...options
  })
}

describe('Reports Vue Components Live Mounting & State Transitions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()

    // Default mock window.api
    ;(window as any).api = {
      reports: {
        getCaseReport: vi.fn(),
        listCases: vi.fn().mockResolvedValue([]),
        getJudgmentsReport: vi.fn().mockResolvedValue({
          rows: [],
          stats: { total: 0, inFavor: 0, against: 0, winRate: 0 },
          analyticalSummary: { casesByCourt: {} }
        }),
        getPartnerBudgetReport: vi.fn().mockResolvedValue({
          income: 50000,
          expense: 20000,
          budgeted: 25000,
          budget: 25000,
          categoriesStats: [
            {
              category_id: '1',
              category_name: 'إيجار',
              actual_amount: 20000,
              budget_limit: 25000,
              percent: 80
            }
          ],
          lawyer_contributions: [
            {
              lawyer_name: 'شريك 1',
              works_count: 5,
              total_contracts_amount: 60000,
              collected_amount: 40000,
              contribution_percentage: 100
            }
          ]
        })
      },
      clients: {
        getAll: vi.fn().mockResolvedValue([])
      },
      cases: {
        list: vi.fn().mockResolvedValue([])
      }
    }
  })

  // 1. CaseReport.vue
  describe('CaseReport.vue', () => {
    it('mounts in empty state prompting user to pick a case', () => {
      const wrapper = mountWithGlobals(CaseReport)
      expect(wrapper.text()).toContain('تقرير قضية شامل')
      expect(wrapper.text()).toContain('الرجاء اختيار قضية لتوليد التقرير الشامل')
    })

    it('renders unauthorized indicator when report.kpis.hasFinancialAccess is false', async () => {
      const mockReportData = {
        case: {
          id: 'case-1',
          case_number: 'CASE-2026-99',
          status: 'قيد النظر',
          client_name: 'شركة العروبة',
          parties: [{ id: 'p1', name: 'طرف 1', party_type: 'client' }]
        },
        executive: { counts: { sessionsNext7: 2, tasksOverdue: 0 } },
        kpis: {
          sessionsTotal: 5,
          hasFinancialAccess: false,
          totalIn: null,
          totalOut: null,
          balance: null
        },
        timeline: { rows: [], pageInfo: { page: 1, pageSize: 50, totalRows: 0 } },
        sessions: { rows: [] },
        activity: { rows: [] }
      }

      const wrapper = mountWithGlobals(CaseReport)
      ;(wrapper.vm as any).report = mockReportData
      ;(wrapper.vm as any).loading = false
      await nextTick()

      expect(wrapper.text()).toContain('CASE-2026-99')
      expect(wrapper.text()).toContain('بيانات القضية الأساسية')
      expect(wrapper.text()).toContain('إجمالي الجلسات')
      expect(wrapper.text()).toContain('5')

      // Financial values must show 'غير مصرح' without currency or NaN
      expect(wrapper.text()).toContain('غير مصرح')
      expect(wrapper.text()).not.toContain('NaN')
      expect(wrapper.text()).not.toContain('undefined')
    })

    it('renders financial figures when report.kpis.hasFinancialAccess is true', async () => {
      const mockReportData = {
        case: {
          id: 'case-1',
          case_number: 'CASE-2026-99',
          status: 'قيد النظر',
          client_name: 'شركة العروبة',
          parties: []
        },
        kpis: {
          sessionsTotal: 3,
          hasFinancialAccess: true,
          totalIn: 12000,
          totalOut: 4000,
          balance: 8000
        },
        timeline: { rows: [] },
        sessions: { rows: [] },
        activity: { rows: [] }
      }

      const wrapper = mountWithGlobals(CaseReport)
      ;(wrapper.vm as any).report = mockReportData
      ;(wrapper.vm as any).loading = false
      await nextTick()

      expect(wrapper.text()).toContain('12000')
      expect(wrapper.text()).toContain('8000')
      expect(wrapper.text()).toContain('ر.س')
    })
  })

  // 2. DetailedCaseInquiry.vue
  describe('DetailedCaseInquiry.vue', () => {
    it('mounts in waiting state before case selection', () => {
      const wrapper = mountWithGlobals(DetailedCaseInquiry)
      expect(wrapper.text()).toContain('الاستعلام التفصيلي عن قضية')
      expect(wrapper.text()).toContain('بانتظار رقم الاستعلام')
    })

    it('displays locked message in finance section when hasFinancialAccess is false', async () => {
      const wrapper = mountWithGlobals(DetailedCaseInquiry)
      ;(wrapper.vm as any).report = {
        case: { id: 'c1', case_number: 'INQ-100', parties: [] },
        kpis: { hasFinancialAccess: false, totalIn: null, totalOut: null, balance: null },
        timeline: { rows: [] },
        sessions: { rows: [] },
        activity: { rows: [] }
      }
      ;(wrapper.vm as any).loading = false
      // Open finance section
      const finSec = (wrapper.vm as any).expandableSections.find((s: any) => s.key === 'finance')
      if (finSec) finSec.open = true
      await nextTick()

      expect(wrapper.text()).toContain('غير مصرح بعرض البيانات المالية لهذه القضية')
      expect(wrapper.text()).not.toContain('NaN')
    })
  })

  // 3. ClientFullProfile.vue
  describe('ClientFullProfile.vue', () => {
    it('mounts with client search interface and handles null profile gracefully without crashing', () => {
      const wrapper = mountWithGlobals(ClientFullProfile)
      expect(wrapper.text()).toContain('الملف المالي للعميل')
      expect(wrapper.text()).not.toContain('NaN')
    })

    it('renders compliant client profile cleanly with 10 summary items', async () => {
      const wrapper = mountWithGlobals(ClientFullProfile)
      ;(wrapper.vm as any).profile = {
        client: { id: 'cl-1', name: 'الشركة المتحدة', type: 'شركات' },
        cases: [
          {
            id: 'case-1',
            case_number: '101',
            contract_amount: 5000,
            paid_amount: 3000,
            remaining: 2000
          }
        ],
        services: [],
        payments: [
          { id: 'p-1', amount: 3000, payment_method: 'تحويل', payment_date: '2026-06-01' }
        ],
        invoices: [],
        vouchers: [],
        installment_schedules: [],
        summary: {
          total_cases: 1,
          total_services: 0,
          total_services_amount: 0,
          total_services_paid: 0,
          total_services_remaining: 0,
          total_payments: 3000,
          total_invoices: 0,
          total_vouchers: 0,
          pending_installments: 0,
          overdue_installments: 0
        }
      }
      await nextTick()

      expect(wrapper.text()).toContain('الشركة المتحدة')
      expect(wrapper.text()).toContain('شركات')
      expect(wrapper.text()).not.toContain('undefined')
    })
  })

  // 4. JudgmentsReport.vue
  describe('JudgmentsReport.vue', () => {
    it('mounts and renders judgments report header and table', () => {
      const wrapper = mountWithGlobals(JudgmentsReport)
      expect(wrapper.text()).toContain('تقرير الأحكام والقرارات القضائية')
      expect(wrapper.text()).not.toContain('NaN')
    })
  })

  // 5. PartnerBudgetReport.vue
  describe('PartnerBudgetReport.vue', () => {
    it('mounts and renders partner budget metrics and categories table', async () => {
      const wrapper = mountWithGlobals(PartnerBudgetReport)
      expect(wrapper.text()).toContain('ميزانية وأعمال الشركاء')
      expect(wrapper.text()).not.toContain('NaN')
    })
  })
})
