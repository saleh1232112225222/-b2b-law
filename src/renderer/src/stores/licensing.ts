import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useLicensingStore = defineStore('licensing', () => {
  const trialInfo = ref<{
    isValid: boolean
    daysLeft: number
    message: string
    isActivated: boolean
  } | null>(null)
  const loading = ref(false)
  const showWarningDialog = ref(false)

  const refreshStatus = async () => {
    loading.value = true
    try {
      const info = await (window as any).api.licensing.checkTrial()
      trialInfo.value = info
    } catch (err) {
      console.error('Failed to fetch trial info:', err)
    } finally {
      loading.value = false
    }
  }

  const isReadOnly = computed(() => {
    if (!trialInfo.value) return false
    // In dev, if not activated, we might be trial
    if (trialInfo.value.message && trialInfo.value.message.includes('Cloud mode')) {
      return !trialInfo.value.isValid
    }
    return !trialInfo.value.isValid && !trialInfo.value.isActivated
  })

  const triggerReadOnlyWarning = () => {
    showWarningDialog.value = true
  }

  return {
    trialInfo,
    loading,
    showWarningDialog,
    isReadOnly,
    refreshStatus,
    triggerReadOnlyWarning
  }
})
