import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSyncStore } from './sync'

describe('sync store failure reporting', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
  })

  it('does not report synced when the status request fails', async () => {
    ;(window as any).api = {
      sync: { getStatus: vi.fn().mockRejectedValue(new Error('network unavailable')) }
    }

    const store = useSyncStore()
    await store.checkStatus()

    expect(store.syncStatus).toBe('failed')
    expect(store.errorMessage).toBe('network unavailable')
  })

  it('returns failure and preserves lastSyncAt when push fails', async () => {
    localStorage.setItem(
      'b2b_sync_pending_queue',
      JSON.stringify([
        {
          id: 'local-1',
          operation_id: 'operation-1',
          entity_type: 'clients',
          entity_id: 'client-1',
          operation: 'create',
          base_revision: 0,
          payload: { id: 'client-1', name: 'Client A' },
          content_hash: 'known-hash',
          created_at: '2026-08-31T00:00:00.000Z',
          status: 'pending'
        }
      ])
    )
    ;(window as any).api = {
      sync: {
        push: vi.fn().mockRejectedValue(new Error('push failed')),
        pull: vi.fn(),
        getStatus: vi.fn()
      }
    }

    const store = useSyncStore()
    const result = await store.syncNow()

    expect(result.success).toBe(false)
    expect(store.syncStatus).toBe('failed')
    expect(store.lastSyncAt).toBeNull()
    expect(JSON.parse(localStorage.getItem('b2b_sync_pending_queue') || '[]')).toHaveLength(1)
  })
})
