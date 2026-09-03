import { beforeEach, describe, expect, it } from 'vitest'
import api, { setApiMode } from './ApiAdapter'

describe('ApiAdapter sync fail-closed behavior', () => {
  beforeEach(() => {
    setApiMode('desktop')
    delete (window as any).ipcRenderer
  })

  it('rejects sync operations when the desktop transport is unavailable', async () => {
    await expect(api.sync.getStatus()).rejects.toThrow('خدمة المزامنة غير متاحة')
    await expect(api.sync.pull({ afterCursor: 0 })).rejects.toThrow('خدمة المزامنة غير متاحة')
    await expect(api.sync.push({ operations: [] })).rejects.toThrow('خدمة المزامنة غير متاحة')
    await expect(api.sync.resolveConflict({ conflictId: 'conflict-1' })).rejects.toThrow(
      'خدمة المزامنة غير متاحة'
    )
  })
})
