import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface OfficeDashboard {
  period: { month: number; year: number }
  summary: {
    total_revenue: number
    total_expenses: number
    net_profit: number
    yearly_revenue: number
    total_services_due: number
    total_services_paid: number
    collection_rate: number
  }
  expenses_by_category: { category: string; total: number }[]
  partners: {
    partner_id: string
    name: string
    employee_name: string
    share_percentage: number
    role: string
    distributable_amount: number
  }[]
  partner_contributions: any[]
  budget: { category: string; budgeted_amount: number; actual_amount: number }[]
}

export const useOfficeManagementStore = defineStore('officeManagement', () => {
  const dashboard = ref<OfficeDashboard | null>(null)
  const expenses = ref<any[]>([])
  const partners = ref<any[]>([])
  const contributions = ref<any[]>([])
  const budgets = ref<any[]>([])
  const distributions = ref<any[]>([])
  const loading = ref(false)

  const fetchDashboard = async (params?: { month?: number; year?: number }) => {
    loading.value = true
    try {
      dashboard.value = await (window as any).api.officeManagement.getDashboard(params)
    } catch (e) {
      console.error('Error fetching dashboard:', e)
      dashboard.value = null
    } finally {
      loading.value = false
    }
  }

  const fetchExpenses = async (params?: any) => {
    try {
      expenses.value = await (window as any).api.officeManagement.getExpenses(params)
    } catch (e) {
      expenses.value = []
    }
  }

  const addExpense = async (data: any) => {
    const result = await (window as any).api.officeManagement.addExpense(data)
    await fetchExpenses()
    return result
  }

  const deleteExpense = async (id: string) => {
    await (window as any).api.officeManagement.deleteExpense(id)
    await fetchExpenses()
  }

  const fetchPartners = async () => {
    try {
      partners.value = await (window as any).api.officeManagement.getPartners()
    } catch (e) {
      partners.value = []
    }
  }

  const addPartner = async (data: any) => {
    const result = await (window as any).api.officeManagement.addPartner(data)
    await fetchPartners()
    return result
  }

  const updatePartner = async (id: string, data: any) => {
    await (window as any).api.officeManagement.updatePartner(id, data)
    await fetchPartners()
  }

  const fetchContributions = async (params?: any) => {
    try {
      contributions.value = await (window as any).api.officeManagement.getContributions(params)
    } catch (e) {
      contributions.value = []
    }
  }

  const addContribution = async (data: any) => {
    const result = await (window as any).api.officeManagement.addContribution(data)
    await fetchContributions()
    return result
  }

  const fetchBudgets = async (params?: any) => {
    try {
      budgets.value = await (window as any).api.officeManagement.getBudgets(params)
    } catch (e) {
      budgets.value = []
    }
  }

  const updateBudget = async (data: any) => {
    await (window as any).api.officeManagement.updateBudget(data)
    await fetchBudgets()
  }

  const fetchDistributions = async (params?: any) => {
    try {
      distributions.value = await (window as any).api.officeManagement.getDistributions(params)
    } catch (e) {
      distributions.value = []
    }
  }

  const distributeProfits = async (data: { month: number; year: number }) => {
    const result = await (window as any).api.officeManagement.distributeProfits(data)
    await fetchDistributions({ month: data.month, year: data.year })
    return result
  }

  return {
    dashboard, expenses, partners, contributions, budgets, distributions, loading,
    fetchDashboard, fetchExpenses, addExpense, deleteExpense,
    fetchPartners, addPartner, updatePartner,
    fetchContributions, addContribution,
    fetchBudgets, updateBudget,
    fetchDistributions, distributeProfits
  }
})
