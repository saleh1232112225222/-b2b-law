import { describe, expect, it } from 'vitest'
import { createHash } from 'crypto'
import {
  createRestoreConfirmationToken,
  executeStagedRestore,
  hashRestorePreview,
  InMemoryRestoreNonceStore,
  verifyRestoreConfirmationToken,
  type RestoreAuditEvent,
  type RestorePreview,
  type StagedRestoreAdapter
} from '../../../../src/shared/restoreProtocol'

const secret = Buffer.alloc(32, 19)
const packageSha256 = createHash('sha256').update('package').digest('hex')
const preview: RestorePreview = {
  tenantId: 'tenant-a',
  userId: 'user-a',
  packageSha256,
  contractHash: createHash('sha256').update('contract').digest('hex'),
  totalRows: 2,
  entities: { clients: 2 },
  attachmentCount: 0,
  attachmentTotalBytes: 0,
  warnings: []
}

function context(token: string) {
  return { tenantId: preview.tenantId, userId: preview.userId, packageSha256, previewSha256: hashRestorePreview(preview), confirmationToken: token }
}

class FakeAdapter implements StagedRestoreAdapter<{ valid: boolean }, { rowCount: number }> {
  calls: string[] = []
  audits: RestoreAuditEvent[] = []
  failVerify = false
  failAt?: string
  private check(point: string) { if (this.failAt === point) throw new Error(`FAIL_${point.toUpperCase()}`) }
  async createVerifiedSafetyBackup() {
    this.calls.push('safety')
    this.check('safety')
    return { id: 'safety-1', location: 'independent://backup', sha256: 'a'.repeat(64), independentlyRestorable: true as const }
  }
  async stage() { this.calls.push('stage'); this.check('stage'); return { valid: true } }
  async validate() { this.calls.push('validate'); this.check('validate') }
  async activate() { this.calls.push('activate'); this.check('activate'); return { rowCount: 2 } }
  async verify() { this.calls.push('verify'); this.check('verify'); if (this.failVerify) throw new Error('POST_VERIFY_FAILED') }
  async commit() { this.calls.push('commit'); this.check('commit') }
  async rollback() { this.calls.push('rollback'); this.check('rollback') }
  async appendAudit(event: RestoreAuditEvent) { this.audits.push(event) }
  async cleanup() { this.calls.push('cleanup') }
}

describe('restore confirmation and staged activation protocol', () => {
  it('binds a short-lived token to tenant, user, package, and rejects tampering/expiry', () => {
    const now = 1_800_000_000_000
    const token = createRestoreConfirmationToken(preview, secret, now, 60_000)
    expect(verifyRestoreConfirmationToken(token, context(token), secret, now + 1_000).tenantId).toBe('tenant-a')
    expect(() => verifyRestoreConfirmationToken(`${token}x`, context(token), secret, now)).toThrow()
    expect(() => verifyRestoreConfirmationToken(token, { ...context(token), tenantId: 'tenant-b' }, secret, now)).toThrow()
    expect(() => verifyRestoreConfirmationToken(token, context(token), secret, now + 60_001)).toThrow()
  })

  it('creates and verifies an independent safety backup before staging and activation', async () => {
    const token = createRestoreConfirmationToken(preview, secret)
    const adapter = new FakeAdapter()
    const result = await executeStagedRestore({ context: context(token), secret, nonceStore: new InMemoryRestoreNonceStore(), adapter })
    expect(result.activation.rowCount).toBe(2)
    expect(adapter.calls).toEqual(['safety', 'stage', 'validate', 'activate', 'verify', 'commit', 'cleanup'])
    expect(adapter.audits.at(-1)?.status).toBe('completed')
  })

  it('rejects a confirmation if the staged preview changed', async () => {
    const token = createRestoreConfirmationToken(preview, secret)
    await expect(executeStagedRestore({
      context: { ...context(token), previewSha256: '0'.repeat(64) },
      secret,
      nonceStore: new InMemoryRestoreNonceStore(),
      adapter: new FakeAdapter()
    })).rejects.toThrow('RESTORE_CONFIRMATION_TOKEN_MISMATCH_OR_EXPIRED')
  })

  it('rolls back after activation when post-restore verification fails', async () => {
    const token = createRestoreConfirmationToken(preview, secret)
    const adapter = new FakeAdapter()
    adapter.failVerify = true
    await expect(executeStagedRestore({ context: context(token), secret, nonceStore: new InMemoryRestoreNonceStore(), adapter })).rejects.toThrow('POST_VERIFY_FAILED')
    expect(adapter.calls).toEqual(['safety', 'stage', 'validate', 'activate', 'verify', 'rollback', 'cleanup'])
    expect(adapter.audits.at(-1)?.status).toBe('rolled_back')
  })

  it('consumes confirmation tokens once and prevents replay', async () => {
    const token = createRestoreConfirmationToken(preview, secret)
    const store = new InMemoryRestoreNonceStore()
    await executeStagedRestore({ context: context(token), secret, nonceStore: store, adapter: new FakeAdapter() })
    await expect(executeStagedRestore({ context: context(token), secret, nonceStore: store, adapter: new FakeAdapter() })).rejects.toThrow('RESTORE_CONFIRMATION_TOKEN_REPLAYED')
  })

  it.each(['safety', 'stage', 'validate', 'activate', 'verify', 'commit'])('cleans up and records a failure injected at %s', async (point) => {
    const adapter = new FakeAdapter()
    adapter.failAt = point
    const token = createRestoreConfirmationToken(preview, secret)
    await expect(executeStagedRestore({ context: context(token), secret, nonceStore: new InMemoryRestoreNonceStore(), adapter })).rejects.toThrow()
    expect(adapter.calls.at(-1)).toBe('cleanup')
    expect(adapter.audits.at(-1)?.status).toBe(['verify', 'commit'].includes(point) ? 'rolled_back' : 'failed_before_activation')
  })

  it('surfaces rollback failure and still appends the terminal audit event', async () => {
    const adapter = new FakeAdapter()
    adapter.failVerify = true
    adapter.failAt = 'rollback'
    const token = createRestoreConfirmationToken(preview, secret)
    await expect(executeStagedRestore({ context: context(token), secret, nonceStore: new InMemoryRestoreNonceStore(), adapter }))
      .rejects.toThrow('ROLLBACK_FAILED:FAIL_ROLLBACK')
    expect(adapter.audits.at(-1)?.errorCode).toContain('ROLLBACK_FAILED')
    expect(adapter.calls.at(-1)).toBe('cleanup')
  })
})
