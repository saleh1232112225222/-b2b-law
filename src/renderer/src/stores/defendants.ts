import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Defendant } from '../types'
import { useAppStore } from './app'

export const useDefendantsStore = defineStore('defendants', () => {
  const appStore = useAppStore()
  const defendants = ref<Defendant[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(25)
  const q = ref('')
  const includeDeleted = ref(false)

  const fetchDefendants = async (
    params: { page?: number; pageSize?: number; q?: string; includeDeleted?: boolean } = {}
  ): Promise<void> => {
    loading.value = true
    error.value = null
    try {
      const finalParams = {
        page: params.page || page.value,
        pageSize: params.pageSize || pageSize.value,
        q: params.q !== undefined ? params.q : q.value,
        includeDeleted:
          params.includeDeleted !== undefined ? params.includeDeleted : includeDeleted.value
      }

      total.value = await window.api.defendants.count(finalParams)
      defendants.value = await window.api.defendants.list(finalParams)

      page.value = finalParams.page
      pageSize.value = finalParams.pageSize
      q.value = finalParams.q
      includeDeleted.value = finalParams.includeDeleted
    } catch (e: unknown) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  const fetchAllDefendants = async (): Promise<void> => {
    loading.value = true
    error.value = null
    try {
      defendants.value = await window.api.defendants.getAll()
      total.value = defendants.value.length
    } catch (e: unknown) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  const addDefendant = async (defendant: Partial<Defendant>): Promise<string> => {
    try {
      const dataToSave = JSON.parse(JSON.stringify(defendant))
      const id = await window.api.defendants.create(dataToSave)
      appStore.markChanges()
      await fetchDefendants()
      return id
    } catch (e: unknown) {
      error.value = (e as Error).message
      throw e
    }
  }

  const updateDefendant = async (defendant: Defendant): Promise<void> => {
    try {
      const dataToSave = JSON.parse(JSON.stringify(defendant))
      await window.api.defendants.update(dataToSave.id, dataToSave)
      appStore.markChanges()
      await fetchDefendants()
    } catch (e: unknown) {
      error.value = (e as Error).message
      throw e
    }
  }

  const deleteDefendant = async (id: string): Promise<void> => {
    try {
      await window.api.defendants.delete(id)
      appStore.markChanges()
      await fetchDefendants()
    } catch (e: unknown) {
      error.value = (e as Error).message
      throw e
    }
  }

  const restoreDefendant = async (id: string): Promise<void> => {
    try {
      await window.api.defendants.restore(id)
      appStore.markChanges()
      await fetchDefendants()
    } catch (e: unknown) {
      error.value = (e as Error).message
      throw e
    }
  }

  const searchDefendants = async (query: string) => {
    q.value = query || ''
    page.value = 1
    return fetchDefendants()
  }

  return {
    defendants,
    loading,
    error,
    total,
    page,
    pageSize,
    q,
    includeDeleted,
    fetchDefendants,
    fetchAllDefendants,
    addDefendant,
    updateDefendant,
    deleteDefendant,
    restoreDefendant,
    searchDefendants
  }
})
