import { defineStore } from 'pinia'
import { ref } from 'vue'
import { LegalEngagement } from '../types/legal'
import { useAppStore } from './app'

export const useLegalStore = defineStore('legal', () => {
  const appStore = useAppStore()
  
  const services = ref<LegalEngagement[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(25)
  const q = ref('')
  const filterCategory = ref('الكل')
  const filterStatus = ref('الكل')

  // Reference tables data
  const categories = ref<any[]>([])
  const types = ref<any[]>([])
  const statuses = ref<any[]>([])
  const priorities = ref<any[]>([])
  const metadataLoaded = ref(false)

  // Finance record cache
  const financeRecord = ref<any | null>(null)

  const fetchMetadata = async (): Promise<void> => {
    if (metadataLoaded.value) return
    loading.value = true
    try {
      const [cats, typs, stats, prs] = await Promise.all([
        window.api.legalServices.getCategories(),
        window.api.legalServices.getTypes(),
        window.api.legalServices.getStatuses(),
        window.api.legalServices.getPriorities()
      ])
      categories.value = cats
      types.value = typs
      statuses.value = stats
      priorities.value = prs
      metadataLoaded.value = true
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  const fetchServices = async (
    params: { page?: number; pageSize?: number; q?: string; category_id?: string; status_id?: string } = {}
  ): Promise<void> => {
    loading.value = true
    error.value = null
    try {
      const finalParams = {
        page: params.page || page.value,
        pageSize: params.pageSize || pageSize.value,
        q: params.q !== undefined ? params.q : q.value,
        category_id: params.category_id !== undefined ? params.category_id : filterCategory.value,
        status_id: params.status_id !== undefined ? params.status_id : filterStatus.value
      }

      total.value = await window.api.legalServices.count(finalParams)
      services.value = await window.api.legalServices.list(finalParams)

      // Sync state
      page.value = finalParams.page
      pageSize.value = finalParams.pageSize
      q.value = finalParams.q
      filterCategory.value = finalParams.category_id
      filterStatus.value = finalParams.status_id
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  const addService = async (service: Partial<LegalEngagement>): Promise<string> => {
    loading.value = true
    error.value = null
    try {
      const dataToSave = JSON.parse(JSON.stringify(service))
      const id = await window.api.legalServices.create(dataToSave)
      appStore.markChanges()
      await fetchServices()
      return id
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const updateService = async (id: string, service: Partial<LegalEngagement>): Promise<void> => {
    loading.value = true
    error.value = null
    try {
      const dataToSave = JSON.parse(JSON.stringify(service))
      await window.api.legalServices.update(id, dataToSave)
      appStore.markChanges()
      await fetchServices()
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const deleteService = async (id: string): Promise<void> => {
    loading.value = true
    error.value = null
    try {
      await window.api.legalServices.delete(id)
      appStore.markChanges()
      await fetchServices()
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  const fetchFinanceRecord = async (engagementId: string): Promise<void> => {
    try {
      financeRecord.value = await window.api.legalServices.getFinance(engagementId)
    } catch (e: any) {
      financeRecord.value = null
    }
  }

  return {
    services,
    loading,
    error,
    total,
    page,
    pageSize,
    q,
    filterCategory,
    filterStatus,
    categories,
    types,
    statuses,
    priorities,
    metadataLoaded,
    financeRecord,
    fetchMetadata,
    fetchServices,
    addService,
    updateService,
    deleteService,
    fetchFinanceRecord
  }
})
