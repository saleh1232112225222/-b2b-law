import fs from 'fs'
import os from 'os'
import path from 'path'
import { createHash, randomUUID } from 'crypto'
import { pipeline } from 'stream/promises'
import type { PoolClient } from 'pg'
import { getClient } from '../db/connection'
import { CANONICAL_CONTRACT_REGISTRY, getTopologicallySortedContracts } from '../shared/canonicalContract'
import { createEncryptedRecoveryArchive, stageEncryptedRecoveryArchive, type RecoveryArchiveInputEntry } from '../shared/recoveryArchive'
import type {
  RestoreAuditEvent,
  RestoreExecutionContext,
  StagedRestoreAdapter,
  VerifiedSafetyBackup
} from '../shared/restoreProtocol'
import { createIndependentBackupStorage, type IndependentBackupStorage } from './independentStorage'
import { DirectoryRecoveryStagingSink, type StagedEntry } from './stagingStore'

type UpsertBuilder = (entityName: string, row: Record<string, unknown>, tenantId: string) => { sql: string; values: unknown[] }
type ExportEntriesFactory = (tenantId: string) => AsyncGenerator<RecoveryArchiveInputEntry>
type RestoreClientFactory = () => Promise<PoolClient>

interface ParsedRecord {
  entityName: string
  row: Record<string, unknown>
}

export interface PgActivation {
  client: PoolClient
  importedRows: number
  conflictIgnoredRows: number
  checkedRows: number
  attachmentDirectory?: string
  missingAttachmentsCount?: number
  commitOutcome: 'open' | 'committed' | 'unknown' | 'rolled_back'
  verificationQueries: Array<{ sql: string; values: unknown[] }>
}

export interface PostgresRestoreStage {
  staging: DirectoryRecoveryStagingSink
  records: ParsedRecord[]
  attachments: Map<string, StagedEntry>
}

async function hashFile(filePath: string): Promise<string> {
  const hash = createHash('sha256')
  const stream = fs.createReadStream(filePath)
  stream.on('data', (chunk) => hash.update(chunk))
  await new Promise<void>((resolve, reject) => {
    stream.once('end', resolve)
    stream.once('error', reject)
  })
  return hash.digest('hex')
}

function safetyPassphrase(): string {
  const passphrase = process.env.TENANT_SAFETY_BACKUP_PASSPHRASE
  if (passphrase && passphrase.normalize('NFKC').length >= 20) return passphrase
  const baseSecret = process.env.RESTORE_CONFIRMATION_SECRET || process.env.JWT_SECRET || 'b2b-law-default-safety-backup-passphrase-secure-key-32b'
  return createHash('sha512').update('B2B_LAW_SAFETY_BACKUP_PASSPHRASE_SALT\0').update(baseSecret).digest('hex')
}

function auditPath(): string {
  const configured = process.env.RESTORE_AUDIT_LOG_PATH
  if (configured) return path.resolve(configured)
  return path.resolve(process.cwd(), 'logs', 'tenant-restore-audit.jsonl')
}

export class PostgresStagedRestoreAdapter implements StagedRestoreAdapter<PostgresRestoreStage, PgActivation> {
  private activation?: PgActivation

  constructor(
    private readonly staged: DirectoryRecoveryStagingSink,
    private readonly buildUpsert: UpsertBuilder,
    private readonly exportEntries: ExportEntriesFactory,
    private readonly contractHash: string,
    private readonly sourceSchemaHash: string,
    private readonly storage: IndependentBackupStorage = createIndependentBackupStorage(),
    private readonly clientFactory: RestoreClientFactory = getClient
  ) {}

  async createVerifiedSafetyBackup(context: RestoreExecutionContext): Promise<VerifiedSafetyBackup> {
    const temporary = path.join(os.tmpdir(), `b2b-safety-${randomUUID()}.b2btenant`)
    const verification = new DirectoryRecoveryStagingSink()
    try {
      await pipeline(
        createEncryptedRecoveryArchive(
          this.exportEntries(context.tenantId),
          {
            contractId: 'b2b-law-canonical-v3',
            contractHash: this.contractHash,
            sourceSchemaHash: this.sourceSchemaHash,
            sourceApp: 'web',
            sourceVersion: '1.0.1',
            tenantId: context.tenantId,
            lineage: { type: 'full' }
          },
          safetyPassphrase()
        ),
        fs.createWriteStream(temporary, { flags: 'wx', mode: 0o600 })
      )
      const sha256 = await hashFile(temporary)
      const objectName = `tenant-${context.tenantId}-${new Date().toISOString().replace(/[:.]/g, '-')}.b2btenant`
      const stored = await this.storage.putVerified(temporary, objectName, sha256)

      const downloaded = `${temporary}.downloaded`
      try {
        await this.storage.download(stored.id, downloaded)
        if (await hashFile(downloaded) !== sha256) throw new Error('SAFETY_BACKUP_DOWNLOAD_HASH_MISMATCH')
        await stageEncryptedRecoveryArchive(fs.createReadStream(downloaded), safetyPassphrase(), context.tenantId, verification)
      } finally {
        fs.rmSync(downloaded, { force: true })
      }
      return { ...stored, independentlyRestorable: true }
    } finally {
      verification.cleanup()
      fs.rmSync(temporary, { force: true })
    }
  }

  async stage(): Promise<PostgresRestoreStage> {
    const records: ParsedRecord[] = []
    const attachments = new Map<string, StagedEntry>()
    for (const entry of this.staged.entries) {
      const stat = fs.statSync(entry.filePath)
      if (stat.size !== entry.byteLength || await hashFile(entry.filePath) !== entry.sha256) {
        throw new Error(`STAGED_ENTRY_INTEGRITY_MISMATCH:${entry.name}`)
      }
      if (entry.kind === 'attachment') {
        attachments.set(entry.name, entry)
        continue
      }
      const entityName = entry.name.split(':', 1)[0]
      const contract = CANONICAL_CONTRACT_REGISTRY[entityName]
      if (!contract?.pgBinding || contract.restorePolicy !== 'tenant_restore') throw new Error(`ENTITY_NOT_RESTORABLE:${entityName}`)
      const value = JSON.parse(fs.readFileSync(entry.filePath, 'utf8'))
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`INVALID_RECORD:${entityName}`)
      const row = value as Record<string, unknown>
      const knownColumns = new Set([
        ...(contract.pgBinding?.allowedExportColumns || []),
        ...(contract.sqliteBinding?.allowedExportColumns || [])
      ])
      for (const key of Object.keys(row)) {
        if (!knownColumns.has(key)) throw new Error('UNKNOWN_FIELD:' + entityName + ':' + key)
      }
      const projected = Object.fromEntries(Object.entries(row).filter(([k]) => contract.pgBinding!.allowedImportColumns.includes(k)))
      records.push({ entityName, row: projected })
    }
    return { staging: this.staged, records, attachments }
  }

  async validate(stage: PostgresRestoreStage, context: RestoreExecutionContext): Promise<void> {
    if (stage.records.length !== stage.staging.summary().recordCount) throw new Error('STAGED_RECORD_COUNT_MISMATCH')
    for (const item of stage.records) {
      const contract = CANONICAL_CONTRACT_REGISTRY[item.entityName]!
      const binding = contract.pgBinding!
      for (const required of binding.requiredColumns) {
        if (required !== 'company_id' && (item.row[required] === undefined || item.row[required] === null)) {
          throw new Error(`MISSING_REQUIRED_FIELD:${item.entityName}:${required}`)
        }
      }
      if (binding.tenantScope.kind === 'column') item.row[binding.tenantScope.column] = context.tenantId
      if (binding.tenantScope.kind === 'root_id' && String(item.row[binding.tenantScope.column]) !== context.tenantId) {
        throw new Error(`TENANT_ROOT_MISMATCH:${item.entityName}`)
      }
    }
  }

  async activate(stage: PostgresRestoreStage, context: RestoreExecutionContext): Promise<PgActivation> {
    const client = await this.clientFactory()
    const activation: PgActivation = { client, importedRows: 0, conflictIgnoredRows: 0, checkedRows: 0, commitOutcome: 'open', verificationQueries: [] }
    this.activation = activation
    try {
      await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE')
      const order = new Map(getTopologicallySortedContracts().map((contract, index) => [contract.canonicalName, index]))
      const ordered = [...stage.records].sort((a, b) => (order.get(a.entityName) ?? 9999) - (order.get(b.entityName) ?? 9999))

      const attachmentDirectory = path.resolve(process.cwd(), 'uploads', 'documents', context.tenantId, `restore-${randomUUID()}`)
      if (stage.attachments.size > 0) {
        fs.mkdirSync(attachmentDirectory, { recursive: true, mode: 0o700 })
        activation.attachmentDirectory = attachmentDirectory
        for (const [name, entry] of stage.attachments) {
          const [entityName, ownerId] = name.split(':', 2)
          const contract = CANONICAL_CONTRACT_REGISTRY[entityName]
          const storage = contract?.attachmentStorage
          if (!ownerId || !contract?.pgBinding || !storage) throw new Error(`UNSUPPORTED_ATTACHMENT_OWNER:${name}`)
          const target = path.join(attachmentDirectory, entry.sha256)
          if (!fs.existsSync(target)) await pipeline(fs.createReadStream(entry.filePath), fs.createWriteStream(target, { flags: 'wx', mode: 0o600 }))
          if (await hashFile(target) !== entry.sha256) throw new Error(`ACTIVATED_ATTACHMENT_HASH_MISMATCH:${name}`)
          const primaryId = contract.pgBinding.primaryKey[0]
          const record = ordered.find((item) => item.entityName === entityName && String(item.row[primaryId]) === ownerId)
          if (!record) throw new Error(`ORPHAN_ATTACHMENT:${name}`)
          record.row[storage.pathColumn] = path.relative(process.cwd(), target).replace(/\\/g, '/')
          if (storage.sizeColumn) record.row[storage.sizeColumn] = entry.byteLength
          if (storage.hashColumn) record.row[storage.hashColumn] = entry.sha256
        }
      }

      let missingAttachmentsCount = 0
      for (const item of ordered) {
        const storage = CANONICAL_CONTRACT_REGISTRY[item.entityName]?.attachmentStorage
        if (!storage || !item.row[storage.pathColumn]) continue
        const primaryId = CANONICAL_CONTRACT_REGISTRY[item.entityName]!.pgBinding!.primaryKey[0]
        if (!stage.attachments.has(`${item.entityName}:${String(item.row[primaryId])}`)) {
          missingAttachmentsCount++
          console.warn(`[RESTORE_ATTACHMENT] Attachment bytes not packaged for ${item.entityName}:${String(item.row[primaryId])}; preserving record metadata`)
        }
      }
      activation.missingAttachmentsCount = missingAttachmentsCount

      for (const item of ordered) {
        const statement = this.buildUpsert(item.entityName, item.row, context.tenantId)
        let result
        try {
          result = await client.query(statement.sql, statement.values)
        } catch (queryErr: any) {
          const table = CANONICAL_CONTRACT_REGISTRY[item.entityName]?.pgBinding?.tableName || item.entityName
          console.error(`[RESTORE_ERROR] Entity "${item.entityName}" (table: "${table}") upsert failed: ${queryErr.message}\nSQL: ${statement.sql}`)
          throw new Error(`RESTORE_QUERY_FAILED:${item.entityName}:${queryErr.message}`)
        }
        if ((result.rowCount || 0) > 0) activation.importedRows++
        else activation.conflictIgnoredRows++
        const contract = CANONICAL_CONTRACT_REGISTRY[item.entityName]!
        const binding = contract.pgBinding!
        const pkStart = 2
        const clauses = binding.primaryKey.map((key, index) => `tenant_row."${key}" = $${index + pkStart}`).join(' AND ')
        const values = [context.tenantId, ...binding.primaryKey.map((key) => item.row[key])]
        const scope = binding.tenantScope
        let fromScope: string
        if (scope.kind === 'column' || scope.kind === 'root_id') {
          fromScope = `FROM "${binding.tableName}" tenant_row WHERE tenant_row."${scope.column}" = $1`
        } else if (scope.kind === 'parent') {
          fromScope = `FROM "${binding.tableName}" tenant_row JOIN "${scope.parentTable}" tenant_parent ON tenant_parent."${scope.parentColumn}" = tenant_row."${scope.localColumn}" WHERE tenant_parent."${scope.parentTenantColumn}" = $1`
        } else {
          throw new Error(`GLOBAL_ENTITY_NOT_RESTORABLE:${item.entityName}`)
        }
        const exists = await client.query(
          `SELECT 1 ${fromScope} AND ${clauses} LIMIT 1`,
          values
        )
        if (exists.rowCount !== 1) throw new Error(`POST_UPSERT_ROW_MISSING:${item.entityName}`)
        activation.verificationQueries.push({ sql: `SELECT 1 ${fromScope} AND ${clauses} LIMIT 1`, values })
        activation.checkedRows++
      }
      return activation
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined)
      client.release()
      this.activation = undefined
      if (activation.attachmentDirectory) fs.rmSync(activation.attachmentDirectory, { recursive: true, force: true })
      throw error
    }
  }

  async verify(activation: PgActivation): Promise<void> {
    if (activation.checkedRows !== activation.importedRows + activation.conflictIgnoredRows) throw new Error('RESTORE_ROW_ACCOUNTING_MISMATCH')
    if (activation.attachmentDirectory) {
      for (const name of fs.readdirSync(activation.attachmentDirectory)) {
        if (!/^[a-f0-9]{64}$/.test(name) || await hashFile(path.join(activation.attachmentDirectory, name)) !== name) {
          throw new Error('RESTORE_ATTACHMENT_POST_VERIFY_FAILED')
        }
      }
    }
  }

  async commit(activation: PgActivation): Promise<void> {
    try {
      await activation.client.query('COMMIT')
      activation.commitOutcome = 'committed'
    } catch (error) {
      activation.commitOutcome = 'unknown'
      let verifier: PoolClient | undefined
      try {
        verifier = await this.clientFactory()
        let present = 0
        for (const probe of activation.verificationQueries) {
          const result = await verifier.query(probe.sql, probe.values)
          if (result.rowCount === 1) present++
        }
        if (activation.verificationQueries.length > 0 && present === activation.verificationQueries.length) {
          activation.commitOutcome = 'committed'
          return
        }
        if (present === 0) {
          activation.commitOutcome = 'rolled_back'
          throw new Error('RESTORE_COMMIT_CONFIRMED_ROLLED_BACK')
        }
      } catch (verificationError) {
        if (verificationError instanceof Error && verificationError.message === 'RESTORE_COMMIT_CONFIRMED_ROLLED_BACK') throw verificationError
      } finally {
        verifier?.release()
      }
      const detail = error instanceof Error ? error.message : 'unknown'
      throw new Error(`RESTORE_COMMIT_OUTCOME_UNKNOWN:${detail}`)
    }
  }

  async rollback(_safetyBackup: VerifiedSafetyBackup): Promise<void> {
    if (!this.activation) return
    if (this.activation.commitOutcome === 'unknown' || this.activation.commitOutcome === 'committed') return
    await this.activation.client.query('ROLLBACK').catch(() => undefined)
    this.activation.commitOutcome = 'rolled_back'
    if (this.activation.attachmentDirectory) fs.rmSync(this.activation.attachmentDirectory, { recursive: true, force: true })
  }

  async appendAudit(event: RestoreAuditEvent): Promise<void> {
    const target = auditPath()
    fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 })
    fs.appendFileSync(target, `${JSON.stringify(event)}\n`, { encoding: 'utf8', mode: 0o600 })
  }

  async cleanup(): Promise<void> {
    if (this.activation) {
      this.activation.client.release()
      this.activation = undefined
    }
  }
}
