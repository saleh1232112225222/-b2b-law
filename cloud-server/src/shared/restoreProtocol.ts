import { createHmac, randomUUID, timingSafeEqual } from 'crypto'

export interface RestorePreview {
  tenantId: string
  userId: string
  packageSha256: string
  contractHash: string
  totalRows: number
  entities: Record<string, number>
  attachmentCount: number
  attachmentTotalBytes: number
  warnings: string[]
}

export interface RestoreConfirmationClaims {
  version: 1
  tenantId: string
  userId: string
  packageSha256: string
  previewSha256: string
  nonce: string
  issuedAt: number
  expiresAt: number
}

export interface RestoreNonceStore {
  consume(nonce: string, expiresAt: number): Promise<boolean>
}

export class InMemoryRestoreNonceStore implements RestoreNonceStore {
  private readonly consumed = new Map<string, number>()
  async consume(nonce: string, expiresAt: number): Promise<boolean> {
    const now = Date.now()
    for (const [key, expiry] of this.consumed) if (expiry <= now) this.consumed.delete(key)
    if (this.consumed.has(nonce)) return false
    this.consumed.set(nonce, expiresAt)
    return true
  }
}

export interface VerifiedSafetyBackup {
  id: string
  location: string
  sha256: string
  independentlyRestorable: true
}

export interface RestoreExecutionContext {
  tenantId: string
  userId: string
  packageSha256: string
  previewSha256: string
  confirmationToken: string
  signal?: AbortSignal
}

export interface StagedRestoreAdapter<TStage = unknown, TActivation = unknown> {
  createVerifiedSafetyBackup(context: RestoreExecutionContext): Promise<VerifiedSafetyBackup>
  stage(context: RestoreExecutionContext): Promise<TStage>
  validate(stage: TStage, context: RestoreExecutionContext): Promise<void>
  activate(stage: TStage, context: RestoreExecutionContext): Promise<TActivation>
  verify(activation: TActivation, context: RestoreExecutionContext): Promise<void>
  commit(activation: TActivation, context: RestoreExecutionContext): Promise<void>
  rollback(safetyBackup: VerifiedSafetyBackup, context: RestoreExecutionContext): Promise<void>
  appendAudit(event: RestoreAuditEvent): Promise<void>
  cleanup(stage: TStage | undefined): Promise<void>
}

export interface RestoreAuditEvent {
  restoreId: string
  tenantId: string
  userId: string
  packageSha256: string
  safetyBackupId?: string
  status: 'completed' | 'rolled_back' | 'failed_before_activation' | 'commit_unknown'
  occurredAt: string
  errorCode?: string
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`
  const obj = value as Record<string, unknown>
  return `{${Object.keys(obj).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(obj[key])}`).join(',')}}`
}

function sha256Hmac(secret: Buffer, data: string): Buffer {
  return createHmac('sha256', secret).update(data, 'utf8').digest()
}

function assertSecret(secret: Buffer): void {
  if (!Buffer.isBuffer(secret) || secret.length < 32) throw new Error('RESTORE_CONFIRMATION_SECRET_INVALID')
}

export function hashRestorePreview(preview: RestorePreview): string {
  return createHmac('sha256', Buffer.from('B2B-LAW-RESTORE-PREVIEW-V1', 'utf8'))
    .update(canonicalize(preview), 'utf8')
    .digest('hex')
}

export function createRestoreConfirmationToken(
  preview: RestorePreview,
  secret: Buffer,
  now = Date.now(),
  ttlMs = 5 * 60 * 1000
): string {
  assertSecret(secret)
  if (ttlMs <= 0 || ttlMs > 10 * 60 * 1000) throw new Error('RESTORE_CONFIRMATION_TTL_INVALID')
  const claims: RestoreConfirmationClaims = {
    version: 1,
    tenantId: preview.tenantId,
    userId: preview.userId,
    packageSha256: preview.packageSha256,
    previewSha256: hashRestorePreview(preview),
    nonce: randomUUID(),
    issuedAt: now,
    expiresAt: now + ttlMs
  }
  const encoded = Buffer.from(canonicalize(claims), 'utf8').toString('base64url')
  return `${encoded}.${sha256Hmac(secret, encoded).toString('base64url')}`
}

export function verifyRestoreConfirmationToken(
  token: string,
  expected: { tenantId: string; userId: string; packageSha256: string; previewSha256: string },
  secret: Buffer,
  now = Date.now()
): RestoreConfirmationClaims {
  assertSecret(secret)
  const parts = token.split('.')
  if (parts.length !== 2) throw new Error('RESTORE_CONFIRMATION_TOKEN_INVALID')
  const [encoded, signature] = parts
  const actual = Buffer.from(signature, 'base64url')
  const calculated = sha256Hmac(secret, encoded)
  if (actual.length !== calculated.length || !timingSafeEqual(actual, calculated)) throw new Error('RESTORE_CONFIRMATION_TOKEN_INVALID')
  let claims: RestoreConfirmationClaims
  try {
    claims = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
  } catch {
    throw new Error('RESTORE_CONFIRMATION_TOKEN_INVALID')
  }
  if (
    claims.version !== 1 ||
    claims.tenantId !== expected.tenantId ||
    claims.userId !== expected.userId ||
    claims.packageSha256 !== expected.packageSha256 ||
    claims.previewSha256 !== expected.previewSha256 ||
    !claims.nonce ||
    !Number.isSafeInteger(claims.issuedAt) ||
    !Number.isSafeInteger(claims.expiresAt) ||
    claims.expiresAt <= claims.issuedAt ||
    claims.expiresAt - claims.issuedAt > 10 * 60 * 1000 ||
    claims.expiresAt <= now ||
    claims.issuedAt > now + 30_000
  ) {
    throw new Error('RESTORE_CONFIRMATION_TOKEN_MISMATCH_OR_EXPIRED')
  }
  return claims
}

function abortIfRequested(signal?: AbortSignal): void {
  if (signal?.aborted) throw new Error('RESTORE_CANCELLED')
}

export async function executeStagedRestore<TStage, TActivation>(options: {
  context: RestoreExecutionContext
  secret: Buffer
  nonceStore: RestoreNonceStore
  adapter: StagedRestoreAdapter<TStage, TActivation>
}): Promise<{ restoreId: string; safetyBackup: VerifiedSafetyBackup; activation: TActivation }> {
  const { context, secret, nonceStore, adapter } = options
  const restoreId = randomUUID()
  const claims = verifyRestoreConfirmationToken(context.confirmationToken, context, secret)
  if (!(await nonceStore.consume(claims.nonce, claims.expiresAt))) throw new Error('RESTORE_CONFIRMATION_TOKEN_REPLAYED')
  let stage: TStage | undefined
  let safetyBackup: VerifiedSafetyBackup | undefined
  let activated = false
  let committed = false
  try {
    abortIfRequested(context.signal)
    safetyBackup = await adapter.createVerifiedSafetyBackup(context)
    if (!safetyBackup.independentlyRestorable || !/^[a-f0-9]{64}$/.test(safetyBackup.sha256)) {
      throw new Error('SAFETY_BACKUP_NOT_VERIFIED')
    }
    abortIfRequested(context.signal)
    stage = await adapter.stage(context)
    await adapter.validate(stage, context)
    abortIfRequested(context.signal)
    const activation = await adapter.activate(stage, context)
    activated = true
    await adapter.verify(activation, context)
    await adapter.commit(activation, context)
    committed = true
    await adapter.appendAudit({
      restoreId,
      tenantId: context.tenantId,
      userId: context.userId,
      packageSha256: context.packageSha256,
      safetyBackupId: safetyBackup.id,
      status: 'completed',
      occurredAt: new Date().toISOString()
    })
    return { restoreId, safetyBackup, activation }
  } catch (error) {
    let failure: unknown = error
    const commitUnknown = error instanceof Error && error.message.startsWith('RESTORE_COMMIT_OUTCOME_UNKNOWN')
    if (activated && !committed && safetyBackup && !commitUnknown) {
      try {
        await adapter.rollback(safetyBackup, context)
      } catch (rollbackError) {
        const original = error instanceof Error ? error.message : 'RESTORE_UNKNOWN_ERROR'
        const rollback = rollbackError instanceof Error ? rollbackError.message : 'ROLLBACK_UNKNOWN_ERROR'
        failure = new Error(`${original};ROLLBACK_FAILED:${rollback}`)
      }
    }
    try {
      await adapter.appendAudit({
        restoreId,
        tenantId: context.tenantId,
        userId: context.userId,
        packageSha256: context.packageSha256,
        safetyBackupId: safetyBackup?.id,
        status: commitUnknown
          ? 'commit_unknown'
          : activated && !committed
            ? 'rolled_back'
            : 'failed_before_activation',
        occurredAt: new Date().toISOString(),
        errorCode: failure instanceof Error ? failure.message : 'RESTORE_UNKNOWN_ERROR'
      })
    } catch {
      // Preserve the original restore failure. The adapter must surface audit health separately.
    }
    throw failure
  } finally {
    await adapter.cleanup(stage)
  }
}
