import { describe, expect, it, vi } from 'vitest'
import { startAfterDatabaseReady } from '../startup/startupPolicy'

describe('server startup safety gate', () => {
  it('does not accept traffic until every database startup task succeeds', async () => {
    const calls: string[] = []
    await startAfterDatabaseReady([
      async () => { calls.push('migrations') },
      async () => { calls.push('sync-schema') }
    ], async () => { calls.push('listen') })
    expect(calls).toEqual(['migrations', 'sync-schema', 'listen'])

    const listen = vi.fn()
    await expect(startAfterDatabaseReady([async () => { throw new Error('migration failed') }], listen)).rejects.toThrow('migration failed')
    expect(listen).not.toHaveBeenCalled()
  })
})
