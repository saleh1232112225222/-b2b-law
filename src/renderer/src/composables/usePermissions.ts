import { computed, ref, watch } from 'vue'

type RoleKey = 'admin' | 'secretary' | 'licensed_lawyer' | 'trainee_lawyer'

interface SessionData {
  userId: string
  username: string
  roleKey: RoleKey
  companyId?: string | null
  permissions: string[]
}

// Use a module-level ref so all components share the same reactive state
const sessionRef = ref<SessionData | null>(null)

const loadFromStorage = () => {
  const raw = localStorage.getItem('web_currentUserSession')
  if (!raw) {
    sessionRef.value = null
    return
  }
  try {
    sessionRef.value = JSON.parse(raw) as SessionData
  } catch {
    sessionRef.value = null
  }
}

// Load immediately
loadFromStorage()

// Listen for auth changes globally
if (typeof window !== 'undefined') {
  window.addEventListener('auth-changed', loadFromStorage)
  // Also listen for storage changes (in case another tab logs in)
  window.addEventListener('storage', (e) => {
    if (e.key === 'web_currentUserSession') {
      loadFromStorage()
    }
  })
}

export const usePermissions = () => {
  const session = computed(() => sessionRef.value)

  // can() as a computed-friendly reactive function
  // Returns a reactive computed that re-evaluates when session changes
  const can = (permissionKey: string): boolean => {
    const s = sessionRef.value
    if (!s) return false
    if (s.roleKey === 'admin') return true
    return Array.isArray(s.permissions) && s.permissions.includes(permissionKey)
  }

  const reload = () => {
    loadFromStorage()
  }

  return { session, can, reload }
}
