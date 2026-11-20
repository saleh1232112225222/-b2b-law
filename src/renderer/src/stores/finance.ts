import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  Transaction,
  Account,
  FinanceStats,
  Invoice,
  Voucher,
  Receivable,
  PaymentSchedule,
  PaymentRecord
} from '../types'

export interface CashFlowItem {
  month: string
  income: number
  expense: number
  net: number
}

export interface FinanceQueryFilters {
  from?: string
  to?: string
  type?: string
  category?: string
  caseId?: string
  clientId?: string
  q?: string
}

export const useFinanceStore = defineStore('finance', () => {
  const transactions = ref<Transaction[]>([])
  const totalTransactionsCount = ref(0)
  const cashFlow = ref<CashFlowItem[]>([])
  const activeFilters = ref<FinanceQueryFilters>({})
  const invoices = ref<Invoice[]>([])
  const vouchers = ref<Voucher[]>([])
  const accounts = ref<Account[]>([])
  const receivables = ref<Receivable[]>([])
  const stats = ref<FinanceStats & Record<string, any>>({ income: 0, expense: 0, balance: 0 })
  const loading = ref(false)
  const transactionsLoading = ref(false)
  const error = ref<string | null>(null)
  const searchQuery = ref('')

  const fetchFilteredTransactions = async (params?: {
    page?: number
    pageSize?: number
    sortDir?: 'asc' | 'desc'
    filters?: FinanceQueryFilters
  }) => {
    transactionsLoading.value = true
    try {
      const api = window.api as any
      const mergedFilters: FinanceQueryFilters = {
        ...activeFilters.value,
        ...(params?.filters || {})
      }
      const cleanFilters: FinanceQueryFilters = {}
      if (mergedFilters.type && mergedFilters.type !== 'all') cleanFilters.type = mergedFilters.type
      if (mergedFilters.category && mergedFilters.category !== 'all')
        cleanFilters.category = mergedFilters.category
      if (mergedFilters.caseId) cleanFilters.caseId = mergedFilters.caseId
      if (mergedFilters.clientId) cleanFilters.clientId = mergedFilters.clientId
      if (mergedFilters.from) cleanFilters.from = mergedFilters.from
      if (mergedFilters.to) cleanFilters.to = mergedFilters.to
      if (mergedFilters.q && mergedFilters.q.trim() !== '') cleanFilters.q = mergedFilters.q.trim()

      activeFilters.value = cleanFilters

      if (api.finances?.list && api.finances?.count) {
        const [rows, total] = await Promise.all([
          api.finances.list({
            page: params?.page || 1,
            pageSize: params?.pageSize || 200,
            sortDir: params?.sortDir || 'desc',
            filters: cleanFilters
          }),
          api.finances.count(cleanFilters)
        ])
        transactions.value = Array.isArray(rows) ? rows : []
        totalTransactionsCount.value = Number(total || 0)
      } else {
        const all = await api.finances.getAll()
        transactions.value = Array.isArray(all) ? all : []
        totalTransactionsCount.value = transactions.value.length
      }
    } catch (e: unknown) {
      error.value = (e as Error).message
    } finally {
      transactionsLoading.value = false
    }
  }

  const fetchCashFlow = async (months = 6) => {
    try {
      const api = window.api as any
      if (api.finances?.getCashFlow) {
        const data = await api.finances.getCashFlow(months)
        cashFlow.value = Array.isArray(data) ? data : []
      }
    } catch (e) {
      console.warn('Failed to fetch cash flow:', e)
    }
  }

  const fetchFinanceData = async () => {
    loading.value = true
    error.value = null
    try {
      const api = window.api as any
      const [inv, vch, accs, recs, statistics] = await Promise.all([
        api.invoices.getAll(),
        api.vouchers.getAll(),
        api.accounts.getAll(),
        api.receivables.getAll(),
        api.finances.getStats(),
        fetchFilteredTransactions({ filters: activeFilters.value }),
        fetchCashFlow(6)
      ])
      invoices.value = inv
      vouchers.value = vch
      accounts.value = accs
      receivables.value = recs
      stats.value = statistics
    } catch (e: unknown) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  const addTransaction = async (record: Partial<Transaction>) => {
    try {
      const dataToSave = JSON.parse(JSON.stringify(record))
      const created = await window.api.finances.create(dataToSave)
      await fetchFinanceData()
      return created
    } catch (e: unknown) {
      error.value = (e as Error).message
      throw e
    }
  }

  const updateTransaction = async (id: string, record: Partial<Transaction>) => {
    try {
      const dataToSave = JSON.parse(JSON.stringify(record))
      await (window.api.finances as any).update(id, dataToSave)
      await fetchFinanceData()
    } catch (e: unknown) {
      error.value = (e as Error).message
      throw e
    }
  }

  const addInvoice = async (record: Partial<Invoice> & Record<string, any>) => {
    try {
      const dataToSave = JSON.parse(JSON.stringify(record))
      const res: any = await window.api.invoices.createWithReceivable(dataToSave)
      await fetchFinanceData()
      return res?.invoice?.id || res?.id || res
    } catch (e: unknown) {
      error.value = (e as Error).message
      throw e
    }
  }

  const updateInvoiceStatus = async (id: string, status: string) => {
    try {
      await (window.api.invoices as any).updateStatus(id, status)
      await fetchFinanceData()
    } catch (e: unknown) {
      error.value = (e as Error).message
      throw e
    }
  }

  const addVoucher = async (record: Partial<Voucher>) => {
    try {
      const dataToSave = JSON.parse(JSON.stringify(record))
      const result = await window.api.vouchers.createLinked(dataToSave)
      await fetchFinanceData()
      return result
    } catch (e: unknown) {
      error.value = (e as Error).message
      throw e
    }
  }

  const applyReceivablePayment = async (id: string, amount: number, accountId?: string) => {
    try {
      await window.api.receivables.applyPayment(id, amount, accountId)
      await fetchFinanceData()
    } catch (e: unknown) {
      error.value = (e as Error).message
      throw e
    }
  }

  const deleteTransaction = async (id: string) => {
    try {
      await window.api.finances.delete(id)
      await fetchFinanceData()
    } catch (e: unknown) {
      error.value = (e as Error).message
      throw e
    }
  }

  const deleteInvoice = async (id: string) => {
    try {
      await window.api.invoices.delete(id)
      await fetchFinanceData()
    } catch (e: unknown) {
      error.value = (e as Error).message
      throw e
    }
  }

  const deleteVoucher = async (id: string) => {
    try {
      await window.api.vouchers.delete(id)
      await fetchFinanceData()
    } catch (e: unknown) {
      error.value = (e as Error).message
      throw e
    }
  }

  // ═══════════════════════════════════════════════════
  // Office Accounts — حسابات المكتب
  // ═══════════════════════════════════════════════════
  const paymentSchedules = ref<PaymentSchedule[]>([])
  const paymentHistory = ref<PaymentRecord[]>([])

  const recordPayment = async (
    engagementId: string,
    payment: {
      amount: number
      payment_method?: string
      payment_schedule_id?: string
      account_id?: string
      notes?: string
    }
  ) => {
    try {
      const result = await window.api.legalServices.recordPayment(engagementId, payment)
      await fetchFinanceData()
      return result
    } catch (e: unknown) {
      error.value = (e as Error).message
      throw e
    }
  }

  const fetchPayments = async (engagementId: string) => {
    try {
      paymentHistory.value = await window.api.legalServices.getPayments(engagementId)
    } catch (e: unknown) {
      paymentHistory.value = []
    }
  }

  const createInstallments = async (
    engagementId: string,
    installments: {
      title: string
      amount: number
      due_date: string
    }[],
    frequency?: string
  ) => {
    try {
      await window.api.legalServices.createInstallments(engagementId, { installments, frequency })
    } catch (e: unknown) {
      throw e
    }
  }

  const fetchInstallments = async (engagementId: string) => {
    try {
      paymentSchedules.value = await window.api.legalServices.getInstallments(engagementId)
    } catch (e: unknown) {
      paymentSchedules.value = []
    }
  }

  const adjustFee = async (
    engagementId: string,
    adjustment: {
      new_compensation: number
      reason: string
      adjustment_type: 'increase' | 'decrease'
    }
  ) => {
    try {
      await window.api.legalServices.adjustFee(engagementId, adjustment)
      await fetchFinanceData()
    } catch (e: unknown) {
      throw e
    }
  }

  const closeFinance = async (engagementId: string) => {
    try {
      await window.api.legalServices.closeFinance(engagementId)
      await fetchFinanceData()
    } catch (e: unknown) {
      throw e
    }
  }

  const budgetStats = ref<any>({
    income: 0,
    expense: 0,
    budget: 0,
    utilization: 0,
    lawyer_contributions: []
  })
  const budgets = ref<any[]>([])

  const fetchBudgetStats = async (month?: number, year?: number) => {
    if (typeof month === 'number' && month > 100) {
      const temp = month
      month = year
      year = temp
    }
    try {
      const res =
        (await (window.api as any).reports?.getPartnerBudgetReport?.({ month, year })) ||
        (await (window.api as any).reports?.getBudgetStats?.({ month, year })) ||
        (await (window.api as any).officeManagement?.getBudgetStats?.({ month, year }))
      if (res) {
        budgetStats.value = res
      }
    } catch (e) {
      console.warn('Could not fetch budget stats:', e)
    }
  }

  const fetchBudgets = async (month?: number, year?: number) => {
    try {
      const res = await (window.api as any).officeManagement?.getBudgets?.({ month, year })
      if (res) {
        budgets.value = res
      }
    } catch (e) {
      console.warn('Could not fetch budgets:', e)
    }
  }

  const saveBudgets = async (payload: any) => {
    try {
      await (window.api as any).officeManagement?.saveBudgets?.(payload)
      await fetchBudgets()
    } catch (e) {
      console.warn('Could not save budgets:', e)
    }
  }

  return {
    transactions,
    totalTransactionsCount,
    cashFlow,
    activeFilters,
    invoices,
    vouchers,
    accounts,
    receivables,
    stats,
    loading,
    transactionsLoading,
    error,
    searchQuery,
    fetchFinanceData,
    fetchFilteredTransactions,
    fetchCashFlow,
    addTransaction,
    updateTransaction,
    addInvoice,
    updateInvoiceStatus,
    addVoucher,
    applyReceivablePayment,
    deleteTransaction,
    deleteInvoice,
    deleteVoucher,
    // Office Accounts
    paymentSchedules,
    paymentHistory,
    recordPayment,
    fetchPayments,
    createInstallments,
    fetchInstallments,
    adjustFee,
    closeFinance,
    // Budget
    budgetStats,
    budgets,
    fetchBudgetStats,
    fetchBudgets,
    saveBudgets
  }
})
