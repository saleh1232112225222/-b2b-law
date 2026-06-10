import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const hasUnsavedChanges = ref(false)

  const markChanges = () => {
    hasUnsavedChanges.value = true
  }

  const clearChanges = () => {
    hasUnsavedChanges.value = false
  }

  return {
    hasUnsavedChanges,
    markChanges,
    clearChanges
  }
})
