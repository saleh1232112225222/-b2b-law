import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Expert } from '../types'

export const useExpertsStore = defineStore('experts', () => {
  const experts = ref<Expert[]>([])
  const searchQuery = ref('')
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchExperts = async () => {
    loading.value = true
    error.value = null
    try {
      experts.value = (await window.api.experts.getAll()) as Expert[]
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  const addExpert = async (record: Partial<Expert>) => {
    try {
      const dataToSave = JSON.parse(JSON.stringify(record))
      await window.api.experts.create(dataToSave)
      await fetchExperts()
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  const updateExpert = async (id: string, record: Partial<Expert>) => {
    try {
      const dataToSave = JSON.parse(JSON.stringify(record))
      await window.api.experts.update(id, dataToSave)
      await fetchExperts()
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  const deleteExpert = async (id: string) => {
    try {
      await window.api.experts.delete(id)
      await fetchExperts()
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  return {
    experts,
    searchQuery,
    loading,
    error,
    fetchExperts,
    addExpert,
    updateExpert,
    deleteExpert
  }
})
