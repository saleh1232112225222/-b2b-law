import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { LocalIndependentStorage } from '../recovery/independentStorage'
import { createStandaloneTenantExport } from '../recovery/standaloneTenantExport'

const roots: string[] = []
afterEach(() => roots.splice(0).forEach(root => fs.rmSync(root, { recursive: true, force: true })))

describe('standalone tenant export', () => {
  it('creates a dual-slot encrypted tenant package, independently stores it, downloads and fully verifies it', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'b2b-tenant-cli-')); roots.push(root)
    const tenantId = '99111111-1111-4111-8111-111111111111'
    const record = Buffer.from(JSON.stringify({ id: tenantId, name: 'Tenant' }))
    const attachment = Buffer.from('%PDF-1.4\nverified attachment bytes\n%%EOF')
    const result = await createStandaloneTenantExport({
      tenantId,
      outputDir: path.join(root, 'catalog'),
      recoveryPassphrase: 'standalone-tenant-recovery-passphrase',
      automationKey: Buffer.alloc(32, 7),
      entries: [
        { kind: 'record', name: 'companies:000000', source: record, byteLength: record.length },
        { kind: 'attachment', name: 'documents:file.pdf', source: attachment, byteLength: attachment.length }
      ],
      contractHash: 'a'.repeat(64),
      sourceSchemaHash: 'b'.repeat(64),
      storage: new LocalIndependentStorage(path.join(root, 'independent'))
    })
    expect(fs.existsSync(result.artifact)).toBe(true)
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(result.byteLength).toBeGreaterThan(record.length + attachment.length)
    const catalog = fs.readFileSync(path.join(root, 'catalog', 'verified-tenant-catalog.jsonl'), 'utf8').trim()
    expect(JSON.parse(catalog)).toMatchObject({ sha256: result.sha256, independentObjectId: result.independentObjectId })
  }, 30_000)
})
