import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Client } from '../types'
import { useAppStore } from './app'

export const useClientsStore = defineStore('clients', () => {
  const appStore = useAppStore()
  const clients = ref<Client[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(25)
  const q = ref('')

  const fetchClients = async (
    params: { page?: number; pageSize?: number; q?: string } = {}
  ): Promise<void> => {
    loading.value = true
    error.value = null
    try {
      const finalParams = {
        page: params.page || page.value,
        pageSize: params.pageSize || pageSize.value,
        q: params.q !== undefined ? params.q : q.value
      }
      total.value = await window.api.clients.count(finalParams)
      clients.value = await window.api.clients.list(finalParams)

      // Sync store state
      page.value = finalParams.page
      pageSize.value = finalParams.pageSize
      q.value = finalParams.q
    } catch (e: unknown) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  const fetchAllClients = async (): Promise<void> => {
    loading.value = true
    error.value = null
    try {
      clients.value = await window.api.clients.getAll()
      total.value = clients.value.length
    } catch (e: unknown) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  const addClient = async (client: Partial<Client>): Promise<void> => {
    try {
      const dataToSave = JSON.parse(JSON.stringify(client))
      await window.api.clients.create(dataToSave)
      appStore.markChanges()
      await fetchClients()
    } catch (e: unknown) {
      error.value = (e as Error).message
      throw e // Rethrow so UI can catch it
    }
  }

  const deleteClient = async (id: string) => {
    try {
      await window.api.clients.delete(id)
      appStore.markChanges()
      await fetchClients()
    } catch (e: unknown) {
      error.value = (e as Error).message
      throw e
    }
  }

  const updateClient = async (client: Client): Promise<void> => {
    try {
      const dataToSave = JSON.parse(JSON.stringify(client))
      await window.api.clients.update(dataToSave.id, dataToSave)
      appStore.markChanges()
      await fetchClients()
    } catch (e: unknown) {
      error.value = (e as Error).message
      throw e
    }
  }

  const searchClients = async (query: string) => {
    q.value = query || ''
    page.value = 1
    return fetchClients()
  }

  return {
    clients,
    loading,
    error,
    total,
    page,
    pageSize,
    q,
    fetchClients,
    fetchAllClients,
    addClient,
    updateClient,
    deleteClient,
    searchClients
  }
})
