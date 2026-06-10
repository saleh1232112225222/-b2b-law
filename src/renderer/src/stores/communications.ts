import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Communication } from '../types'

export const useCommunicationsStore = defineStore('communications', () => {
  const communications = ref<Communication[]>([])
  const searchQuery = ref('')
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchCommunications = async () => {
    loading.value = true
    error.value = null
    try {
      communications.value = (await window.api.communications.getAll()) as Communication[]
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  const addCommunication = async (record: Partial<Communication>) => {
    try {
      const dataToSave = JSON.parse(JSON.stringify(record))
      await window.api.communications.create(dataToSave)
      await fetchCommunications()
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  const updateCommunication = async (id: string, record: Partial<Communication>) => {
    try {
      const dataToSave = JSON.parse(JSON.stringify(record))
      await window.api.communications.update(id, dataToSave)
      await fetchCommunications()
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  const deleteCommunication = async (id: string) => {
    try {
      await window.api.communications.delete(id)
      await fetchCommunications()
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  return {
    communications,
    searchQuery,
    loading,
    error,
    fetchCommunications,
    addCommunication,
    updateCommunication,
    deleteCommunication
  }
})
