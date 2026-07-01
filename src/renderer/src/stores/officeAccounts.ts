import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ClientFinancialSummary, OfficeAccountsReport } from '../types/finance'

export const useOfficeAccountsStore = defineStore('officeAccounts', () => {
  const clientSummary = ref<ClientFinancialSummary | null>(null)
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

  const fetchReport = async (filters: Record<string, any>) => {
    loading.value = true
    try {
      report.value = await window.api.legalServices.getOfficeAccountsReport(filters)
    } catch (e) {
      report.value = null
    } finally {
      loading.value = false
    }
  }

  return { clientSummary, report, loading, fetchClientSummary, fetchReport }
})
