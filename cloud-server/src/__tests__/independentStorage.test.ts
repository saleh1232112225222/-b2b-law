import fs from 'fs'
import os from 'os'
import path from 'path'
import { createHash } from 'crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { LocalIndependentStorage } from '../recovery/independentStorage'

const roots: string[] = []
afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true })
})

describe('independent safety backup storage', () => {
  it('copies, re-hashes, and downloads a byte-identical object', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'b2b-independent-'))
    roots.push(root)
    const source = path.join(root, 'source.bin')
    const downloaded = path.join(root, 'downloaded.bin')
    const bytes = Buffer.from('verified-independent-backup')
    fs.writeFileSync(source, bytes)
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    const storage = new LocalIndependentStorage(path.join(root, 'remote-account'))
    const stored = await storage.putVerified(source, 'tenant.b2btenant', sha256)
    await storage.download(stored.id, downloaded)
    expect(stored.sha256).toBe(sha256)
    expect(fs.readFileSync(downloaded)).toEqual(bytes)
  })

  it('fails closed when the expected hash is wrong', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'b2b-independent-'))
    roots.push(root)
    const source = path.join(root, 'source.bin')
    fs.writeFileSync(source, 'changed')
    const storage = new LocalIndependentStorage(path.join(root, 'remote-account'))
    await expect(storage.putVerified(source, 'tenant.b2btenant', '0'.repeat(64))).rejects.toThrow(
      'INDEPENDENT_BACKUP_HASH_MISMATCH'
    )
  })
})
