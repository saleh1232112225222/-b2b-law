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

export const useFinanceStore = defineStore('finance', () => {
  const transactions = ref<Transaction[]>([])
  const invoices = ref<Invoice[]>([])
  const vouchers = ref<Voucher[]>([])
  const accounts = ref<Account[]>([])
  const receivables = ref<Receivable[]>([])
  const stats = ref<FinanceStats>({ income: 0, expense: 0, balance: 0 })
  const loading = ref(false)
  const error = ref<string | null>(null)
  const searchQuery = ref('')

  const fetchFinanceData = async () => {
    loading.value = true
    error.value = null
    try {
      const api = window.api
      const [trans, inv, vch, accs, recs, statistics] = await Promise.all([
        api.finances.getAll(),
        api.invoices.getAll(),
        api.vouchers.getAll(),
        api.accounts.getAll(),
        api.receivables.getAll(),
        api.finances.getStats()
      ])
      transactions.value = trans
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
      await window.api.finances.create(dataToSave)
      await fetchFinanceData()
    } catch (e: unknown) {
      error.value = (e as Error).message
      throw e
    }
  }

  const addInvoice = async (record: Partial<Invoice>) => {
    try {
      const dataToSave = JSON.parse(JSON.stringify(record))
      const invoiceId = await window.api.invoices.create(dataToSave)

      // Phase 4: Auto-create receivable from invoice
      const invoice = { ...dataToSave, id: invoiceId } as Invoice
      await window.api.receivables.createFromInvoice(invoice)

      await fetchFinanceData()
    } catch (e: unknown) {
      error.value = (e as Error).message
      throw e
    }
  }

  const addVoucher = async (record: Partial<Voucher>) => {
    try {
      const dataToSave = JSON.parse(JSON.stringify(record))
      await window.api.vouchers.create(dataToSave)
      await fetchFinanceData()
    } catch (e: unknown) {
      error.value = (e as Error).message
      throw e
    }
  }

  const applyReceivablePayment = async (id: string, amount: number) => {
    try {
      await window.api.receivables.applyPayment(id, amount)
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

  return {
    transactions,
    invoices,
    vouchers,
    accounts,
    receivables,
    stats,
    loading,
    error,
    searchQuery,
    fetchFinanceData,
    addTransaction,
    addInvoice,
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
    closeFinance
  }
})
