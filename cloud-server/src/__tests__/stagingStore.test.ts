import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { DirectoryRecoveryStagingSink } from '../recovery/stagingStore'

const roots: string[] = []
afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true })
})

describe('restore staging store', () => {
  it('uses private files and removes them on abort', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'b2b-stage-test-'))
    roots.push(root)
    const sink = new DirectoryRecoveryStagingSink(root)
    await sink.beginEntry({ kind: 'record', name: 'clients:000001', byteLength: 2 })
    await sink.writeEntryChunk(Buffer.from('{}'))
    await sink.endEntry({ kind: 'record', name: 'clients:000001', byteLength: 2, sha256: '0'.repeat(64) })
    expect(sink.summary().recordCount).toBe(1)
    expect(fs.existsSync(sink.entries[0].filePath)).toBe(true)
    await sink.abort()
    expect(fs.existsSync(sink.directory)).toBe(false)
  })
})
