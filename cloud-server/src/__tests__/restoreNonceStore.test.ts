import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { FileRestoreNonceStore } from '../recovery/restoreNonceStore'

const directories: string[] = []
afterEach(() => {
  for (const directory of directories.splice(0)) fs.rmSync(directory, { recursive: true, force: true })
})

describe('FileRestoreNonceStore', () => {
  it('atomically rejects replay across independent store instances', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nonce-test-'))
    directories.push(directory)
    const stores = [new FileRestoreNonceStore(directory), new FileRestoreNonceStore(directory)]
    const results = await Promise.all(stores.map((store) => store.consume('same-nonce', Date.now() + 60_000)))
    expect(results.sort()).toEqual([false, true])
  })

  it('rejects already expired claims without writing state', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nonce-test-'))
    directories.push(directory)
    expect(await new FileRestoreNonceStore(directory).consume('expired', Date.now() - 1)).toBe(false)
    expect(fs.readdirSync(directory)).toHaveLength(0)
  })
})
