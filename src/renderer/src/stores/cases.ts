import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Case } from '../types/case'

import { useAppStore } from './app'

export const useCasesStore = defineStore('cases', () => {
  const appStore = useAppStore()
  const cases = ref<Case[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(25)
  const q = ref('')
  const status = ref('الكل')
  const priority = ref('الكل')
  const responsibleUserId = ref('')

  const fetchCases = async (): Promise<void> => {
    loading.value = true
    try {
      const params = {
        page: page.value,
        pageSize: pageSize.value,
        q: q.value,
        status: status.value,
        priority: priority.value,
        responsible_user_id: responsibleUserId.value || undefined
      }
      total.value = await window.api.cases.count(params)
      cases.value = await window.api.cases.list(params)
    } catch (e: unknown) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  const fetchAllCases = async (): Promise<void> => {
    loading.value = true
    try {
      cases.value = await window.api.cases.getAll()
      total.value = cases.value.length
    } catch (e: unknown) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  const addCase = async (caseData: Partial<Case>): Promise<void> => {
    try {
      const dataToSave = JSON.parse(JSON.stringify(caseData))
      await window.api.cases.create(dataToSave)
      appStore.markChanges()
      await fetchCases()
    } catch (e: unknown) {
      error.value = (e as Error).message
      throw e
    }
  }

  const deleteCase = async (id: string): Promise<void> => {
    try {
      await window.api.cases.delete(id)
      appStore.markChanges()
      await fetchCases()
    } catch (e: unknown) {
      error.value = (e as Error).message
      throw e
    }
  }

  const updateCase = async (caseData: Case): Promise<void> => {
    try {
      const dataToSave = JSON.parse(JSON.stringify(caseData))
      await window.api.cases.update(dataToSave.id!, dataToSave)
      appStore.markChanges()
      await fetchCases()
    } catch (e: unknown) {
      error.value = (e as Error).message
      throw e
    }
  }

  const searchCases = async (query: string) => {
    q.value = query || ''
    page.value = 1
    return fetchCases()
  }

  return {
    cases,
    loading,
    error,
    total,
    page,
    pageSize,
    q,
    status,
    priority,
    responsibleUserId,
    fetchCases,
    fetchAllCases,
    addCase,
    updateCase,
    deleteCase,
    searchCases
  }
})
