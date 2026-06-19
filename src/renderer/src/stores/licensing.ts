import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useLicensingStore = defineStore('licensing', () => {
  const trialInfo = ref<{
    isValid: boolean
    daysLeft: number
    message: string
    isActivated: boolean
  } | null>(null)
  const subscriptionStatus = ref<{
    status: 'trial' | 'active' | 'expired' | 'canceled' | 'none'
    trialEnd?: string
    currentPeriodEnd?: string
    daysLeft: number
    isExpired: boolean
    planName?: string
    planNameAr?: string
  } | null>(null)
  const loading = ref(false)
  const showWarningDialog = ref(false)
  const showExpiredDialog = ref(false)

  const refreshStatus = async () => {
    loading.value = true
    try {
      // Web/Cloud mode - check via API
      if (typeof __IS_WEB__ !== 'undefined' && __IS_WEB__) {
        const token = localStorage.getItem('b2b_cloud_token')
        if (!token) {
          trialInfo.value = {
            isValid: false,
            daysLeft: 0,
            message: 'غير مسجل الدخول',
            isActivated: false
          }
          return
        }

        try {
          const response = await fetch('/api/subscriptions/status', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })

          if (response.ok) {
            const data = await response.json()
            
            subscriptionStatus.value = {
              status: data.status || (data.isActive ? 'active' : 'expired'),
              trialEnd: data.trialEnd,
              currentPeriodEnd: data.currentPeriodEnd,
              daysLeft: data.daysLeft || 0,
              isExpired: data.isExpired || false,
              planName: data.planName,
              planNameAr: data.planNameAr
            }

            trialInfo.value = {
              isValid: data.isActive || !data.isExpired,
              daysLeft: data.daysLeft || 0,
              message: data.isActive 
                ? `اشتراك نشط - ${data.planNameAr || data.planName || 'مدفوع'}`
                : data.isExpired 
                  ? 'انتهت الفترة التجريبية' 
                  : `فترة تجريبية - ${data.daysLeft} يوم متبقي`,
              isActivated: data.status === 'active'
            }

            // Show expired dialog if trial ended
            if (data.isExpired && data.status !== 'active') {
              showExpiredDialog.value = true
            }
          } else {
            // API error - assume trial mode
            trialInfo.value = {
              isValid: true,
              daysLeft: 7,
              message: 'فترة تجريبية (افتراضي)',
              isActivated: false
            }
          }
        } catch (err) {
          console.error('Failed to fetch subscription status:', err)
          // Network error - assume trial mode
          trialInfo.value = {
            isValid: true,
            daysLeft: 7,
            message: 'فترة تجريبية (افتراضي)',
            isActivated: false
          }
        }
      } else {
        // Desktop mode - use IPC
        const info = await (window as any).api.licensing.checkTrial()
        trialInfo.value = info
      }
    } catch (err) {
      console.error('Failed to fetch trial info:', err)
    } finally {
      loading.value = false
    }
  }

  const isReadOnly = computed(() => {
    // Web mode - check subscription status
    if (typeof __IS_WEB__ !== 'undefined' && __IS_WEB__) {
      if (!subscriptionStatus.value) return false
      return subscriptionStatus.value.isExpired && subscriptionStatus.value.status !== 'active'
    }
    
    // Desktop mode - check trial info
    if (!trialInfo.value) return false
    if (trialInfo.value.message && trialInfo.value.message.includes('Cloud mode')) {
      return !trialInfo.value.isValid
    }
    return !trialInfo.value.isValid && !trialInfo.value.isActivated
  })

  const isTrialExpired = computed(() => {
    if (typeof __IS_WEB__ !== 'undefined' && __IS_WEB__) {
      return subscriptionStatus.value?.isExpired && subscriptionStatus.value?.status !== 'active'
    }
    return trialInfo.value ? (!trialInfo.value.isValid && !trialInfo.value.isActivated) : false
  })

  // عد تنازلي قبل انتهاء التجربة (يظهر في آخر 3 أيام)
  const isApproachingExpiration = computed(() => {
    if (typeof __IS_WEB__ !== 'undefined' && __IS_WEB__) {
      const s = subscriptionStatus.value
      if (!s) return false
      if (s.status === 'active') return false
      return s.daysLeft > 0 && s.daysLeft <= 3
    }
    const t = trialInfo.value
    return t ? (t.daysLeft > 0 && t.daysLeft <= 3 && !t.isActivated) : false
  })

  // أيام متبقية بالضبط (للعداد التنازلي)
  const daysRemaining = computed(() => {
    if (typeof __IS_WEB__ !== 'undefined' && __IS_WEB__) {
      return subscriptionStatus.value?.daysLeft ?? 0
    }
    return trialInfo.value?.daysLeft ?? 0
  })

  // تاريخ انتهاء التجربة (للعد التنازلي اللحظي)
  const trialEnd = computed<string | undefined>(() => {
    if (typeof __IS_WEB__ !== 'undefined' && __IS_WEB__) {
      return subscriptionStatus.value?.trialEnd
    }
    return undefined
  })

  const triggerReadOnlyWarning = () => {
    showWarningDialog.value = true
  }

  const hideExpiredDialog = () => {
    showExpiredDialog.value = false
  }

  return {
    trialInfo,
    subscriptionStatus,
    loading,
    showWarningDialog,
    showExpiredDialog,
    isReadOnly,
    isTrialExpired,
    isApproachingExpiration,
    daysRemaining,
    trialEnd,
    refreshStatus,
    triggerReadOnlyWarning,
    hideExpiredDialog
  }
})
