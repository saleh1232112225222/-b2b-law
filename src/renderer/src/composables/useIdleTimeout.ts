import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { usePermissions } from './usePermissions'

const IDLE_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes of inactivity
const WARNING_DURATION_SEC = 60 // 60 seconds warning countdown

export function useIdleTimeout(onLogout: () => void) {
  const route = useRoute()
  const { session } = usePermissions()

  const isWarningVisible = ref(false)
  const countdown = ref(WARNING_DURATION_SEC)

  let idleTimer: any = null
  let countdownInterval: any = null
  let lastActivityTime = Date.now()

  const isAuthPage = () => {
    return (
      route.path === '/login' ||
      route.path === '/register' ||
      route.name === 'Login' ||
      route.name === 'Register' ||
      !session.value
    )
  }

  const startCountdown = () => {
    countdown.value = WARNING_DURATION_SEC
    isWarningVisible.value = true

    if (countdownInterval) clearInterval(countdownInterval)
    countdownInterval = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(countdownInterval)
        countdownInterval = null
        isWarningVisible.value = false
        onLogout()
      }
    }, 1000)
  }

  const resetIdleTimer = () => {
    if (isWarningVisible.value) {
      // Don't reset in the background if the warning dialog is actively on screen
      return
    }

    lastActivityTime = Date.now()
    if (idleTimer) clearTimeout(idleTimer)

    if (isAuthPage()) {
      return
    }

    idleTimer = setTimeout(() => {
      if (!isAuthPage()) {
        startCountdown()
      }
    }, IDLE_TIMEOUT_MS)
  }

  const extendSession = () => {
    if (countdownInterval) {
      clearInterval(countdownInterval)
      countdownInterval = null
    }
    isWarningVisible.value = false
    countdown.value = WARNING_DURATION_SEC
    lastActivityTime = Date.now()
    resetIdleTimer()
  }

  const handleManualLogout = () => {
    if (countdownInterval) {
      clearInterval(countdownInterval)
      countdownInterval = null
    }
    isWarningVisible.value = false
    onLogout()
  }

  // Activity listeners with throttle (1 second)
  let throttleTimer = 0
  const handleUserActivity = () => {
    const now = Date.now()
    if (now - throttleTimer > 1000) {
      throttleTimer = now
      resetIdleTimer()
    }
  }

  const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel', 'click']

  const setupListeners = () => {
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true })
    })
    resetIdleTimer()
  }

  const cleanupListeners = () => {
    if (idleTimer) clearTimeout(idleTimer)
    if (countdownInterval) clearInterval(countdownInterval)
    activityEvents.forEach((event) => {
      window.removeEventListener(event, handleUserActivity)
    })
  }

  watch(
    () => route.path,
    () => {
      if (isAuthPage()) {
        if (idleTimer) clearTimeout(idleTimer)
        if (countdownInterval) clearInterval(countdownInterval)
        isWarningVisible.value = false
      } else {
        resetIdleTimer()
      }
    }
  )

  watch(
    () => session.value,
    (newVal) => {
      if (newVal) {
        resetIdleTimer()
      } else {
        if (idleTimer) clearTimeout(idleTimer)
        if (countdownInterval) clearInterval(countdownInterval)
        isWarningVisible.value = false
      }
    }
  )

  onMounted(() => {
    setupListeners()
  })

  onUnmounted(() => {
    cleanupListeners()
  })

  return {
    isWarningVisible,
    countdown,
    extendSession,
    handleManualLogout
  }
}
