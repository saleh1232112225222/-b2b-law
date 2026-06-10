import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Agency } from '../types/agency'

export const useAgenciesStore = defineStore('agencies', () => {
  const agencies = ref<Agency[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchAgencies = async () => {
    loading.value = true
    error.value = null
    try {
      agencies.value = await window.api.agencies.getAll()
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  const addAgency = async (record: unknown) => {
    try {
      const dataToSave = JSON.parse(JSON.stringify(record))
      await window.api.agencies.create(dataToSave)
      await fetchAgencies()
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  const updateAgency = async (id: string, record: unknown) => {
    try {
      const dataToSave = JSON.parse(JSON.stringify(record))
      await window.api.agencies.update(id, dataToSave)
      await fetchAgencies()
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  const deleteAgency = async (id: string) => {
    try {
      await window.api.agencies.delete(id)
      await fetchAgencies()
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  return {
    agencies,
    loading,
    error,
    fetchAgencies,
    addAgency,
    updateAgency,
    deleteAgency
  }
})
