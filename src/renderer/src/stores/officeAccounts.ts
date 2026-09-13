import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  ClientFinancialSummary,
  ClientFullProfile,
  OfficeAccountsReport
} from '../types/finance'

export const useOfficeAccountsStore = defineStore('officeAccounts', () => {
  const clientSummary = ref<ClientFinancialSummary | null>(null)
  const clientFullProfile = ref<ClientFullProfile | null>(null)
  const report = ref<OfficeAccountsReport | null>(null)
  const loading = ref(false)

  const fetchClientSummary = async (clientId: string) => {
    loading.value = true
    try {
      clientSummary.value = await window.api.legalServices.getClientFinancialSummary(clientId)
    } catch (e) {
      clientSummary.value = null
    } finally {
      loading.value = false
    }
  }

  const isCompliantProfile = (p: any): p is ClientFullProfile => {
    if (!p || typeof p !== 'object') return false
    if (!p.client || typeof p.client !== 'object' || !p.client.id || !p.client.name) return false
    if (
      !Array.isArray(p.cases) ||
      !Array.isArray(p.services) ||
      !Array.isArray(p.payments) ||
      !Array.isArray(p.invoices) ||
      !Array.isArray(p.vouchers) ||
      !Array.isArray(p.installment_schedules)
    ) {
      return false
    }
    const s = p.summary
    if (!s || typeof s !== 'object') return false
    return (
      typeof s.total_cases === 'number' &&
      typeof s.total_services === 'number' &&
      typeof s.total_services_amount === 'number' &&
      typeof s.total_services_paid === 'number' &&
      typeof s.total_services_remaining === 'number' &&
      typeof s.total_payments === 'number' &&
      typeof s.total_invoices === 'number' &&
      typeof s.total_vouchers === 'number' &&
      typeof s.pending_installments === 'number' &&
      typeof s.overdue_installments === 'number'
    )
  }

  const fetchClientFullProfile = async (clientId: string) => {
    loading.value = true
    try {
      const candidates = [
        () => (window.api as any).reports?.getClientFinancialReport?.(clientId),
        () => (window.api as any).legalServices?.getClientFullProfile?.(clientId),
        () => (window.api as any).paymentTracking?.getClientFullProfile?.(clientId)
      ]

      let result: ClientFullProfile | null = null
      for (const fn of candidates) {
        try {
          const res = await fn?.()
          if (!res || typeof res !== 'object') continue

          // Safe normalization if candidate returns 'installments' instead of 'installment_schedules'
          if (!Array.isArray(res.installment_schedules) && Array.isArray(res.installments)) {
            res.installment_schedules = res.installments
          }

          if (isCompliantProfile(res)) {
            result = res
            break
          }
        } catch {
          // Continue to next candidate
        }
      }

      clientFullProfile.value = result
      return clientFullProfile.value
    } catch (e) {
      clientFullProfile.value = null
      return null
    } finally {
      loading.value = false
    }
  }

  const fetchReport = async (filters?: Record<string, any>) => {
    loading.value = true
    try {
      report.value = await window.api.legalServices.getOfficeAccountsReport(filters || {})
    } catch (e) {
      report.value = null
    } finally {
      loading.value = false
    }
  }

  return {
    clientSummary,
    clientFullProfile,
    report,
    loading,
    fetchClientSummary,
    fetchClientFullProfile,
    fetchReport
  }
})
