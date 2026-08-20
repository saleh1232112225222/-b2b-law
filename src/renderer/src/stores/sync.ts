import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { SyncEngineService, SyncQueueItem, SyncConflict } from '../services/syncEngine.service'

export const useSyncStore = defineStore('sync', () => {
  const isSyncing = ref(false)
  const syncStatus = ref<'synced' | 'syncing' | 'push_required' | 'pull_required' | 'conflict' | 'offline' | 'failed'>('synced')
  const lastSyncAt = ref<string | null>(SyncEngineService.getLastSync())
  const conflicts = ref<SyncConflict[]>([])
  const pendingQueue = ref<SyncQueueItem[]>(SyncEngineService.getPendingQueue())
  const errorMessage = ref<string | null>(null)

  const pendingCount = computed(() => pendingQueue.value.length)
  const conflictCount = computed(() => conflicts.value.length)

  const checkStatus = async (): Promise<void> => {
    pendingQueue.value = SyncEngineService.getPendingQueue()
    if (!navigator.onLine) {
      syncStatus.value = 'offline'
      return
    }

    try {
      const res = await (window as any).api.sync?.getStatus?.() || { status: 'synced', unresolvedConflicts: 0 }
      if (res.unresolvedConflicts > 0) {
        syncStatus.value = 'conflict'
        await fetchConflicts()
      } else if (pendingQueue.value.length > 0) {
        syncStatus.value = 'push_required'
      } else {
        syncStatus.value = res.status || 'synced'
      }
      if (res.lastSyncAt) {
        lastSyncAt.value = res.lastSyncAt
      }
    } catch {
      if (pendingQueue.value.length > 0) {
        syncStatus.value = 'push_required'
      } else {
        syncStatus.value = 'synced'
      }
    }
  }

  const fetchConflicts = async (): Promise<void> => {
    try {
      const data = await (window as any).api.sync?.getConflicts?.()
      conflicts.value = Array.isArray(data) ? data : []
    } catch (err: any) {
      console.error('[SyncStore] Failed to fetch conflicts:', err)
    }
  }

  const syncNow = async (): Promise<{ success: boolean; message?: string }> => {
    if (isSyncing.value) return { success: false, message: 'المزامنة جارية بالفعل' }
    if (!navigator.onLine) {
      syncStatus.value = 'offline'
      return { success: false, message: 'لا يوجد اتصال بالإنترنت' }
    }

    isSyncing.value = true
    syncStatus.value = 'syncing'
    errorMessage.value = null

    try {
      // 1. Push Pending Operations
      const currentQueue = SyncEngineService.getPendingQueue()
      if (currentQueue.length > 0) {
        try {
          const pushRes = await (window as any).api?.sync?.push?.({
            operations: currentQueue,
            device_id: SyncEngineService.getDeviceId()
          })

          if (pushRes?.results) {
            const remainingQueue = currentQueue.filter((item) => {
              const res = pushRes.results.find((r: any) => r.operation_id === item.operation_id)
              return res && res.status === 'failed'
            })
            SyncEngineService.savePendingQueue(remainingQueue)
            pendingQueue.value = remainingQueue
          }
        } catch (pushErr) {
          console.warn('[SyncStore] Push operations deferred:', pushErr)
        }
      }

      // 2. Pull Updates Since Last Sync
      const lastSync = SyncEngineService.getLastSync()
      try {
        await (window as any).api?.sync?.pull?.({ since: lastSync })
      } catch (pullErr) {
        console.warn('[SyncStore] Pull updates deferred:', pullErr)
      }

      const now = new Date().toISOString()
      SyncEngineService.setLastSync(now)
      lastSyncAt.value = now

      // 3. Refresh Status
      await checkStatus()
      isSyncing.value = false
      syncStatus.value = 'synced'
      return {
        success: true,
        message: 'عزيزي المستخدم: خدمة المزامنة السحابية قيد التطوير والترقية حالياً، وسوف تتاح بكامل مميزاتها في الإصدارات القادمة بإذن الله.'
      }
    } catch (err: any) {
      isSyncing.value = false
      syncStatus.value = 'synced'
      return {
        success: true,
        message: 'عزيزي المستخدم: خدمة المزامنة السحابية قيد التطوير والترقية حالياً، وسوف تتاح بكامل مميزاتها في الإصدارات القادمة بإذن الله.'
      }
    }
  }

  const resolveConflict = async (
    conflictId: string,
    strategy: 'accept_remote' | 'accept_local' | 'manual_merge',
    mergedPayload?: Record<string, any>
  ): Promise<boolean> => {
    try {
      await (window as any).api.sync?.resolveConflict?.({
        conflict_id: conflictId,
        strategy,
        merged_payload: mergedPayload
      })
      conflicts.value = conflicts.value.filter((c) => c.id !== conflictId)
      await checkStatus()
      return true
    } catch (err) {
      console.error('[SyncStore] Failed to resolve conflict:', err)
      return false
    }
  }

  return {
    isSyncing,
    syncStatus,
    lastSyncAt,
    conflicts,
    pendingQueue,
    pendingCount,
    conflictCount,
    errorMessage,
    checkStatus,
    fetchConflicts,
    syncNow,
    resolveConflict
  }
})
