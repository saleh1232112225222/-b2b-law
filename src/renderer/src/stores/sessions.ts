import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Session } from '../types'
import { useAppStore } from './app'

interface SessionParams {
  page?: number
  pageSize?: number
  q?: string
  case_id?: string
  status?: string
  client_id?: string
  from?: string
  to?: string
  sortField?: string
  sortDir?: 'asc' | 'desc'
}

export const useSessionsStore = defineStore('sessions', () => {
  const appStore = useAppStore()
  const sessions = ref<Session[]>([])
  const todaySessions = ref<Session[]>([])
  const tomorrowSessions = ref<Session[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const searchQuery = ref('')
  const totalSessions = ref(0)

  async function fetchSessions(params?: SessionParams): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const q = searchQuery.value || ''
      const finalParams = {
        ...params,
        q
      }
      sessions.value = await window.api.sessions.list(finalParams)
      totalSessions.value = await window.api.sessions.count(finalParams)
    } catch (e: unknown) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function listSessions(params: SessionParams): Promise<void> {
    await fetchSessions(params)
  }

  const countSessions = async (filters?: SessionParams) => {
    try {
      totalSessions.value = await window.api.sessions.count(filters)
      return totalSessions.value
    } catch (e: unknown) {
      error.value = (e as Error).message
      throw e
    }
  }

  async function fetchTodaySessions(limit: number = 25): Promise<void> {
    const today = new Date().toLocaleDateString('en-CA')
    try {
      todaySessions.value = await window.api.sessions.list({
        page: 1,
        pageSize: Math.max(1, Math.min(200, Number(limit || 25))),
        from: today,
        to: today,
        status: 'الكل'
      })
    } catch (e: unknown) {
      console.error('Error fetching today sessions:', e)
    }
  }

  async function fetchTomorrowSessions(limit: number = 25): Promise<void> {
    const tomorrowDate = new Date()
    tomorrowDate.setDate(tomorrowDate.getDate() + 1)
    const tomorrowStr = tomorrowDate.toLocaleDateString('en-CA')
    try {
      tomorrowSessions.value = await window.api.sessions.list({
        page: 1,
        pageSize: Math.max(1, Math.min(200, Number(limit || 25))),
        from: tomorrowStr,
        to: tomorrowStr,
        status: 'الكل'
      })
    } catch (e: unknown) {
      console.error('Error fetching tomorrow sessions:', e)
    }
  }

  const addSession = async (session: Partial<Session>) => {
    try {
      const dataToSave = JSON.parse(JSON.stringify(session))
      await window.api.sessions.create(dataToSave)
      appStore.markChanges()
      await fetchTodaySessions()
      await fetchTomorrowSessions()
    } catch (e: unknown) {
      error.value = (e as Error).message
      throw e
    }
  }

  const updateSession = async (session: Session) => {
    try {
      const dataToSave = JSON.parse(JSON.stringify(session))
      await window.api.sessions.update(dataToSave.id as string, dataToSave)
      appStore.markChanges()
      await fetchTodaySessions()
      await fetchTomorrowSessions()
    } catch (e: unknown) {
      error.value = (e as Error).message
      console.error(e)
      throw e
    }
  }

  const deleteSession = async (id: string) => {
    try {
      await window.api.sessions.delete(id)
      appStore.markChanges()
      await fetchTodaySessions()
      await fetchTomorrowSessions()
    } catch (e: unknown) {
      error.value = (e as Error).message
      console.error(e)
      throw e
    }
  }

  const setSearchQuery = (query: string) => {
    searchQuery.value = query
  }

  return {
    sessions,
    totalSessions,
    todaySessions,
    tomorrowSessions,
    loading,
    searchQuery,
    fetchSessions,
    listSessions,
    countSessions,
    fetchTodaySessions,
    fetchTomorrowSessions,
    addSession,
    updateSession,
    deleteSession,
    setSearchQuery
  }
})
