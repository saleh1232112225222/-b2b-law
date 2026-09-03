import { query } from '../db/connection'
import { createHash, randomUUID } from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { pipeline } from 'stream/promises'
import { createEncryptedRecoveryArchive, stageEncryptedRecoveryArchive, type RecoveryArchiveInputEntry } from '../shared/recoveryArchive'
import { DirectoryRecoveryStagingSink } from './stagingStore'
import type { IndependentBackupStorage } from './independentStorage'

export interface StandaloneTenantExportInput {
  tenantId: string
  outputDir: string
  recoveryPassphrase: string
  automationKey: Buffer
  entries: AsyncIterable<RecoveryArchiveInputEntry> | Iterable<RecoveryArchiveInputEntry>
  contractHash: string
  sourceSchemaHash: string
  storage: IndependentBackupStorage
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256')
  for await (const chunk of fs.createReadStream(filePath)) hash.update(chunk as Buffer)
  return hash.digest('hex')
}

export async function createStandaloneTenantExport(input: StandaloneTenantExportInput): Promise<{
  exportId: string
  artifact: string
  sha256: string
  byteLength: number
  independentObjectId: string
  verifiedAt: string
}> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.tenantId)) throw new Error('TENANT_ID_INVALID')
  if (input.recoveryPassphrase.normalize('NFKC').length < 20 || input.automationKey.length !== 32) throw new Error('TENANT_EXPORT_ENCRYPTION_SECRETS_REQUIRED')
  const outputDir = path.resolve(input.outputDir)
  const exportId = randomUUID()
  fs.mkdirSync(outputDir, { recursive: true, mode: 0o700 })
  const artifact = path.join(outputDir, `tenant-${input.tenantId}-${new Date().toISOString().replace(/[:.]/g, '-')}.b2btenant`)
  const verifyDownload = path.join(os.tmpdir(), `b2b-tenant-verify-${randomUUID()}.b2btenant`)
  const sink = new DirectoryRecoveryStagingSink()
  try {
    await pipeline(
      createEncryptedRecoveryArchive(input.entries, {
        contractId: 'b2b-law-canonical-v3',
        contractHash: input.contractHash,
        sourceSchemaHash: input.sourceSchemaHash,
        sourceApp: 'web',
        sourceVersion: '1.0.1',
        tenantId: input.tenantId,
        lineage: { type: 'full' }
      }, input.recoveryPassphrase, input.automationKey),
      fs.createWriteStream(artifact, { flags: 'wx', mode: 0o600 })
    )
    const sha256 = await sha256File(artifact)
    const stored = await input.storage.putVerified(artifact, path.basename(artifact), sha256)
    await input.storage.download(stored.id, verifyDownload)
    if (await sha256File(verifyDownload) !== sha256) throw new Error('TENANT_EXPORT_INDEPENDENT_HASH_MISMATCH')
    await stageEncryptedRecoveryArchive(fs.createReadStream(verifyDownload), { automationKey: input.automationKey }, input.tenantId, sink)
    const verifiedAt = new Date().toISOString()
    const result = { exportId, artifact, sha256, byteLength: fs.statSync(artifact).size, independentObjectId: stored.id, verifiedAt }
    fs.appendFileSync(path.join(outputDir, 'verified-tenant-catalog.jsonl'), `${JSON.stringify(result)}\n`, { encoding: 'utf8', mode: 0o600 })
    try {
      await query(
        'INSERT INTO backup_catalog(company_id, export_id, content_hash, byte_size, destination, status, last_verified_at) VALUES(, , , , , , ) ON CONFLICT (company_id, export_id, destination) DO UPDATE SET content_hash=EXCLUDED.content_hash, byte_size=EXCLUDED.byte_size, status=EXCLUDED.status, last_verified_at=EXCLUDED.last_verified_at',
        [input.tenantId, exportId, sha256, result.byteLength, stored.location, 'verified', verifiedAt]
      )
    } catch {}
    return result
  } catch (error) {
    fs.rmSync(artifact, { force: true })
    throw error
  } finally {
    sink.cleanup()
    fs.rmSync(verifyDownload, { force: true })
  }
}
