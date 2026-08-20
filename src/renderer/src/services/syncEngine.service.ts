import { v4 as uuidv4 } from 'uuid'

export interface SyncQueueItem {
  id: string
  operation_id: string
  entity_type: string
  entity_id: string
  operation: 'create' | 'update' | 'delete'
  base_revision?: string | number
  payload: Record<string, any>
  content_hash: string
  created_at: string
  status: 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed'
  error?: string
}

export interface SyncConflict {
  id: string
  entity_type: string
  entity_id: string
  local_value: Record<string, any>
  remote_value: Record<string, any>
  local_revision?: number
  remote_revision?: number
  created_at: string
  status: 'unresolved' | 'resolved'
}

const STORAGE_QUEUE_KEY = 'b2b_sync_pending_queue'
const STORAGE_DEVICE_KEY = 'b2b_device_id'
const STORAGE_LAST_SYNC_KEY = 'b2b_last_sync_timestamp'

export class SyncEngineService {
  public static getDeviceId(): string {
    let id = localStorage.getItem(STORAGE_DEVICE_KEY)
    if (!id) {
      id = 'dev_' + uuidv4().slice(0, 8)
      localStorage.setItem(STORAGE_DEVICE_KEY, id)
    }
    return id
  }

  public static getDeviceIdHeader(): string {
    return this.getDeviceId()
  }

  public static getPendingQueue(): SyncQueueItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_QUEUE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  public static savePendingQueue(queue: SyncQueueItem[]): void {
    try {
      localStorage.setItem(STORAGE_QUEUE_KEY, JSON.stringify(queue))
    } catch (e) {
      console.error('[SyncEngine] Failed to persist queue:', e)
    }
  }

  public static queueOperation(
    entityType: string,
    entityId: string,
    operation: 'create' | 'update' | 'delete',
    payload: Record<string, any>,
    baseRevision?: string | number
  ): SyncQueueItem {
    const queue = this.getPendingQueue()
    const item: SyncQueueItem = {
      id: uuidv4(),
      operation_id: `op_${uuidv4()}`,
      entity_type: entityType,
      entity_id: entityId,
      operation,
      base_revision: baseRevision,
      payload,
      content_hash: this.calculateHash(payload),
      created_at: new Date().toISOString(),
      status: 'pending'
    }

    queue.push(item)
    this.savePendingQueue(queue)
    return item
  }

  public static calculateHash(obj: Record<string, any>): string {
    if (!obj || typeof obj !== 'object') return ''
    const clean: Record<string, any> = {}
    const ignored = new Set(['created_at', 'updated_at', 'revision', 'version', 'company_id'])
    Object.keys(obj)
      .sort()
      .forEach((k) => {
        if (!ignored.has(k)) clean[k] = obj[k] === undefined ? null : obj[k]
      })
    const str = JSON.stringify(clean)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash |= 0
    }
    return Math.abs(hash).toString(16)
  }

  public static getLastSync(): string | null {
    return localStorage.getItem(STORAGE_LAST_SYNC_KEY)
  }

  public static setLastSync(time: string): void {
    localStorage.setItem(STORAGE_LAST_SYNC_KEY, time)
  }

  public static getDeviceIdHeader(): string {
    return this.getDeviceId()
  }
}
