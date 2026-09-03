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
  const attachmentProgress = ref<{ total: number; completed: number; currentFileName?: string } | null>(null)

  const pendingCount = computed(() => pendingQueue.value.length)
  const conflictCount = computed(() => conflicts.value.length)
  const hasAttachmentTransfers = computed(() => !!attachmentProgress.value && attachmentProgress.value.total > attachmentProgress.value.completed)

  const checkStatus = async (): Promise<void> => {
    pendingQueue.value = SyncEngineService.getPendingQueue()
    if (!navigator.onLine) {
      syncStatus.value = 'offline'
      return
    }

    try {
      const syncApi = (window as any).api?.sync;
      if (!syncApi || typeof syncApi.getStatus !== 'function') {
        syncStatus.value = 'offline';
        return;
      }
      const res = await syncApi.getStatus();
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
    } catch (error) {
      syncStatus.value = 'failed'
      errorMessage.value = error instanceof Error ? error.message : 'تعذر التحقق من حالة المزامنة'
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
      const transport = (window as any).api?.sync
      if (!transport || typeof transport.push !== 'function' || typeof transport.pull !== 'function') {
        throw new Error('خدمة المزامنة غير متاحة على هذا الجهاز')
      }

      const deviceId = SyncEngineService.getDeviceId()

      // 1. Push Pending Operations
      const currentQueue = SyncEngineService.getPendingQueue()
      if (currentQueue.length > 0) {
        const pushRes = await transport.push({
          operations: currentQueue.map((item) => ({
            operationId: item.operation_id,
            entityType: item.entity_type,
            entityId: item.entity_id,
            operation: item.operation,
            baseRevision: Number(item.base_revision ?? 0),
            payload: item.payload
          })),
          deviceId
        })

        if (!pushRes || !Array.isArray(pushRes.results)) {
          throw new Error('استجابة رفع المزامنة غير صالحة')
        }
        const remainingQueue = currentQueue.filter((item) => {
          const result = pushRes.results.find((candidate: any) => candidate.operationId === item.operation_id)
          return !result || result.status !== 'synced'
        })
        SyncEngineService.savePendingQueue(remainingQueue)
        pendingQueue.value = remainingQueue
      }

      // 2. Pull Updates Since Last Sync
      const pullResult = await transport.pull({
        afterCursor: 0,
        deviceId
      })
      if (
        !pullResult ||
        !Array.isArray(pullResult.changes) ||
        !Number.isSafeInteger(pullResult.nextCursor) ||
        typeof pullResult.hasMore !== 'boolean'
      ) {
        throw new Error('استجابة تنزيل المزامنة غير صالحة')
      }

      const now = new Date().toISOString()
      SyncEngineService.setLastSync(now)
      lastSyncAt.value = now

      // 3. Refresh Status
      await checkStatus()
      isSyncing.value = false
      return {
        success: true,
        message: 'تمت المزامنة بنجاح'
      }
    } catch (err: any) {
      isSyncing.value = false
      syncStatus.value = 'failed'
      errorMessage.value = err?.message || 'فشلت عملية المزامنة'
      return {
        success: false,
        message: errorMessage.value || 'فشلت عملية المزامنة'
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
