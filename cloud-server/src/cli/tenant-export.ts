import { createIndependentBackupStorage } from '../recovery/independentStorage'
import { createStandaloneTenantExport } from '../recovery/standaloneTenantExport'
import { canonicalContractHash, postgresRecoverySchemaHash, streamTenantArchiveEntries } from '../routes/tenantBackup'
import { closePool, query } from '../db/connection'

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

async function main(): Promise<void> {
  const tenantId = argument('--tenant')
  const outputDir = argument('--output')
  const recoveryPassphrase = process.env.DR_RECOVERY_PASSPHRASE || ''
  const automationKey = Buffer.from(process.env.DR_AUTOMATION_KEY_BASE64 || '', 'base64')
  if (!tenantId || !outputDir || !process.env.DATABASE_URL) throw new Error('Usage: tenant-export --tenant <uuid> --output <catalog-directory>; DATABASE_URL is required')
  const result = await createStandaloneTenantExport({
    tenantId,
    outputDir,
    recoveryPassphrase,
    automationKey,
    entries: streamTenantArchiveEntries(tenantId),
    contractHash: canonicalContractHash(),
    sourceSchemaHash: postgresRecoverySchemaHash(),
    storage: createIndependentBackupStorage()
  })
  await query(`INSERT INTO backup_catalog(company_id,export_id,content_hash,byte_size,destination,status,last_verified_at)
    VALUES($1,$2,$3,$4,$5,'verified',$6)
    ON CONFLICT(company_id,export_id,destination) DO UPDATE SET content_hash=EXCLUDED.content_hash,byte_size=EXCLUDED.byte_size,status='verified',last_verified_at=EXCLUDED.last_verified_at`,
    [tenantId, result.exportId, result.sha256, result.byteLength, `independent://${result.independentObjectId}`, result.verifiedAt])
  process.stdout.write(`Verified independently stored tenant export created: ${result.sha256}\n`)
}

main().catch(error => { process.stderr.write(`${(error as Error).message}\n`); process.exitCode = 1 }).finally(closePool)
