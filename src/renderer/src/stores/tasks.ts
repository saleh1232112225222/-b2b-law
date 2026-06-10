import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { Task } from '../types/task'
import { useAppStore } from './app'

const PRIORITIES = ['عالية', 'متوسطة', 'منخفضة'] as const
type Priority = (typeof PRIORITIES)[number]
type StatusFilter =
  | 'draft'
  | 'scheduled'
  | 'in_progress'
  | 'waiting'
  | 'blocked'
  | 'completed'
  | 'closed'
  | 'cancelled'
  | 'all'

export const useTasksStore = defineStore('tasks', () => {
  const appStore = useAppStore()
  const loading = ref(false)
  const error = ref<string | null>(null)

  const tasks = ref<Task[]>([])
  const pendingTasks = ref<Task[]>([])

  const searchQuery = ref('')
  const responsibleUserId = ref<string>('')
  const statusFilter = ref<StatusFilter>('in_progress')

  const pageSize = ref(40)

  const itemsByPriority = ref<Record<Priority, Task[]>>({
    عالية: [],
    متوسطة: [],
    منخفضة: []
  })
  const pageByPriority = ref<Record<Priority, number>>({
    عالية: 1,
    متوسطة: 1,
    منخفضة: 1
  })
  const totalByPriority = ref<Record<Priority, number>>({
    عالية: 0,
    متوسطة: 0,
    منخفضة: 0
  })
  const loadingByPriority = ref<Record<Priority, boolean>>({
    عالية: false,
    متوسطة: false,
    منخفضة: false
  })

  const stats = ref<{ total: number; in_progress: number; completed: number }>({
    total: 0,
    in_progress: 0,
    completed: 0
  })

  const buildBaseParams = () => ({
    q: searchQuery.value || '',
    responsible_user_id: responsibleUserId.value || undefined
  })

  const buildStatusParam = () => (statusFilter.value === 'all' ? 'all' : statusFilter.value)

  const refreshStats = async (): Promise<void> => {
    const base = buildBaseParams()
    // Total is active + archived to maintain correct percentages if completed includes archived
    const activeTotal = await window.api.tasks.count({ ...base, status: 'all', is_archived: 0 })
    const archivedTotal = await window.api.tasks.count({ ...base, is_archived: 1 })
    const total = activeTotal + archivedTotal

    const in_progress = await window.api.tasks.count({
      ...base,
      status: 'in_progress',
      is_archived: 0
    })

    // Completed includes: status='completed', status='closed', or any archived task
    const completed_count = await window.api.tasks.count({
      ...base,
      status: 'completed',
      is_archived: 0
    })
    const closed_count = await window.api.tasks.count({ ...base, status: 'closed', is_archived: 0 })
    const archived_count = await window.api.tasks.count({ ...base, is_archived: 1 })

    const completed = completed_count + closed_count + archived_count
    stats.value = { total, in_progress, completed }
  }

  const refreshPriorityTotals = async (): Promise<void> => {
    const base = buildBaseParams()
    const status = buildStatusParam()
    const entries = await Promise.all(
      PRIORITIES.map(
        async (p) =>
          [
            p,
            await window.api.tasks.count({ ...base, status, priority: p, is_archived: 0 })
          ] as const
      )
    )
    totalByPriority.value = entries.reduce(
      (acc, [p, c]) => {
        acc[p] = Number(c || 0)
        return acc
      },
      { ...totalByPriority.value }
    )
  }

  const fetchPriorityPage = async (priority: Priority, nextPage: number): Promise<Task[]> => {
    const base = buildBaseParams()
    const status = buildStatusParam()
    return window.api.tasks.list({
      page: nextPage,
      pageSize: pageSize.value,
      ...base,
      status,
      priority,
      is_archived: 0
    })
  }

  const refresh = async (): Promise<void> => {
    loading.value = true
    error.value = null
    try {
      PRIORITIES.forEach((p) => {
        itemsByPriority.value[p] = []
        pageByPriority.value[p] = 1
      })
      await Promise.all([refreshStats(), refreshPriorityTotals()])
      await Promise.all(
        PRIORITIES.map(async (p) => {
          loadingByPriority.value[p] = true
          try {
            const items = await fetchPriorityPage(p, 1)
            itemsByPriority.value[p] = items
          } finally {
            loadingByPriority.value[p] = false
          }
        })
      )
    } catch (e: unknown) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  const fetchTasks = async (query?: string): Promise<void> => {
    error.value = null
    try {
      const q = query !== undefined ? query : searchQuery.value
      tasks.value = await window.api.tasks.list({
        page: 1,
        pageSize: 500,
        q,
        status: 'all',
        responsible_user_id: responsibleUserId.value || undefined,
        is_archived: 0
      })
    } catch (e: unknown) {
      error.value = (e as Error).message
    }
  }

  const fetchPendingTasks = async (): Promise<void> => {
    error.value = null
    try {
      pendingTasks.value = await window.api.tasks.list({
        page: 1,
        pageSize: 50,
        q: '',
        status: 'in_progress',
        responsible_user_id: responsibleUserId.value || undefined,
        is_archived: 0
      })
    } catch (e: unknown) {
      error.value = (e as Error).message
    }
  }

  const loadMore = async (priority: Priority): Promise<void> => {
    if (loadingByPriority.value[priority]) return
    const loaded = itemsByPriority.value[priority].length
    const total = totalByPriority.value[priority]
    if (loaded >= total) return
    loadingByPriority.value[priority] = true
    try {
      const nextPage = pageByPriority.value[priority] + 1
      const nextItems = await fetchPriorityPage(priority, nextPage)
      if (nextItems.length) {
        itemsByPriority.value[priority] = [...itemsByPriority.value[priority], ...nextItems]
        pageByPriority.value[priority] = nextPage
      }
    } catch (e: unknown) {
      error.value = (e as Error).message
      throw e
    } finally {
      loadingByPriority.value[priority] = false
    }
  }

  const hasMore = (priority: Priority): boolean => {
    return itemsByPriority.value[priority].length < totalByPriority.value[priority]
  }

  const setSearchQuery = (query: string): void => {
    searchQuery.value = query
  }

  const setResponsibleUserId = (id: string): void => {
    responsibleUserId.value = id
  }

  const setStatusFilter = (s: StatusFilter): void => {
    statusFilter.value = s
  }

  const addTask = async (task: Partial<Task>): Promise<void> => {
    try {
      const dataToSave = JSON.parse(JSON.stringify(task))
      await window.api.tasks.create(dataToSave)
      appStore.markChanges()
      await refresh()
    } catch (e: unknown) {
      error.value = (e as Error).message
      throw e
    }
  }

  const updateTask = async (id: string, task: Partial<Task>): Promise<void> => {
    try {
      const dataToSave = JSON.parse(JSON.stringify(task))
      await window.api.tasks.update(id, dataToSave)
      appStore.markChanges()
      await refresh()
    } catch (e: unknown) {
      error.value = (e as Error).message
      throw e
    }
  }

  const transitionTask = async (
    id: string,
    to_status: string,
    payload?: {
      note?: string
      reason?: string
      waiting_on_type?: string
      waiting_on_name?: string
      blocked_reason?: string
    }
  ): Promise<void> => {
    try {
      await window.api.tasks.transition({ id, to_status, ...(payload || {}) })
      appStore.markChanges()
      await refresh()
    } catch (e: unknown) {
      error.value = (e as Error).message
      throw e
    }
  }

  const totalLoaded = computed(() => {
    return PRIORITIES.reduce((sum, p) => sum + itemsByPriority.value[p].length, 0)
  })

  return {
    PRIORITIES,
    loading,
    loadingByPriority,
    error,
    tasks,
    pendingTasks,
    searchQuery,
    responsibleUserId,
    statusFilter,
    pageSize,
    itemsByPriority,
    totalByPriority,
    stats,
    totalLoaded,
    setSearchQuery,
    setResponsibleUserId,
    setStatusFilter,
    fetchTasks,
    fetchPendingTasks,
    refresh,
    loadMore,
    hasMore,
    addTask,
    updateTask,
    transitionTask
  }
})
