import { describe, expect, it } from 'vitest'
import { issueBackupStepUpToken, verifyBackupStepUpToken } from '../security/stepUp'

describe('backup step-up token', () => {
  const secret = Buffer.alloc(32, 7)
  const base = { userId: 'u1', tenantId: 't1', scope: 'backup_export' as const, secret }

  it('binds token to user, tenant, scope, and expiry', () => {
    const now = 1_800_000_000_000
    const token = issueBackupStepUpToken({ ...base, now, ttlMs: 60_000 })
    expect(verifyBackupStepUpToken({ ...base, token, now: now + 1_000 }).scope).toBe('backup_export')
    expect(() => verifyBackupStepUpToken({ ...base, token, tenantId: 't2', now })).toThrow()
    expect(() => verifyBackupStepUpToken({ ...base, token, scope: 'backup_restore', now })).toThrow()
    expect(() => verifyBackupStepUpToken({ ...base, token, now: now + 60_001 })).toThrow()
  })
})
