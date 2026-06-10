import { computed, ref } from 'vue'

type RoleKey = 'admin' | 'secretary' | 'licensed_lawyer' | 'trainee_lawyer'

export const usePermissions = () => {
  const sessionRef = ref<{
    userId: string
    username: string
    roleKey: RoleKey
    permissions: string[]
  } | null>(null)

  const reload = () => {
    const raw = localStorage.getItem('web_currentUserSession')
    if (!raw) {
      sessionRef.value = null
      return
    }
    try {
      sessionRef.value = JSON.parse(raw) as {
        userId: string
        username: string
        roleKey: RoleKey
        permissions: string[]
      }
    } catch {
      sessionRef.value = null
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('auth-changed', reload)
  }

  reload()

  const session = computed(() => sessionRef.value)

  const can = (permissionKey: string) => {
    const s = session.value
    if (!s) return false
    if (s.roleKey === 'admin') return true
    return Array.isArray(s.permissions) && s.permissions.includes(permissionKey)
  }

  return { session, can, reload }
}
