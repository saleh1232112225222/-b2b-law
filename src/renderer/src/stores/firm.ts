import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Firm } from '../types'

export const useFirmStore = defineStore('firm', () => {
  const firmData = ref<Firm | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchFirmData = async () => {
    loading.value = true
    error.value = null
    try {
      const d = (await window.api.firm.get()) as Firm
      if (d?.logo_path) {
        try {
          d.logo_src = await (window as any).api.firm.resolveLogoSrc(d.logo_path)
        } catch {
          d.logo_src = ''
        }
      }
      firmData.value = d
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  const updateFirmData = async (data: Firm) => {
    try {
      const dataToSave = JSON.parse(JSON.stringify(data))
      delete (dataToSave as any).logo_src
      await window.api.firm.update(dataToSave)
      await fetchFirmData()
    } catch (e: unknown) {
      error.value = (e as Error).message
      throw e
    }
  }

  return {
    firmData,
    loading,
    error,
    fetchFirmData,
    updateFirmData
  }
})
