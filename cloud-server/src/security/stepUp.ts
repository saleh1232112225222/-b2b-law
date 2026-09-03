import { createHmac, randomUUID, timingSafeEqual } from 'crypto'

export type BackupStepUpScope = 'backup_export' | 'backup_restore'

interface StepUpClaims {
  version: 1
  userId: string
  tenantId: string
  scope: BackupStepUpScope
  nonce: string
  issuedAt: number
  expiresAt: number
}

function sign(secret: Buffer, payload: string): Buffer {
  if (secret.length < 32) throw new Error('STEP_UP_SECRET_INVALID')
  return createHmac('sha256', secret).update(payload, 'utf8').digest()
}

export function issueBackupStepUpToken(input: {
  userId: string
  tenantId: string
  scope: BackupStepUpScope
  secret: Buffer
  now?: number
  ttlMs?: number
}): string {
  const now = input.now ?? Date.now()
  const ttlMs = input.ttlMs ?? 5 * 60 * 1000
  if (ttlMs <= 0 || ttlMs > 10 * 60 * 1000) throw new Error('STEP_UP_TTL_INVALID')
  const claims: StepUpClaims = {
    version: 1,
    userId: input.userId,
    tenantId: input.tenantId,
    scope: input.scope,
    nonce: randomUUID(),
    issuedAt: now,
    expiresAt: now + ttlMs
  }
  const payload = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url')
  return `${payload}.${sign(input.secret, payload).toString('base64url')}`
}

export function verifyBackupStepUpToken(input: {
  token: string
  userId: string
  tenantId: string
  scope: BackupStepUpScope
  secret: Buffer
  now?: number
}): StepUpClaims {
  const parts = input.token.split('.')
  if (parts.length !== 2) throw new Error('STEP_UP_TOKEN_INVALID')
  const expected = sign(input.secret, parts[0])
  const actual = Buffer.from(parts[1], 'base64url')
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new Error('STEP_UP_TOKEN_INVALID')
  let claims: StepUpClaims
  try {
    claims = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'))
  } catch {
    throw new Error('STEP_UP_TOKEN_INVALID')
  }
  const now = input.now ?? Date.now()
  if (
    claims.version !== 1 ||
    claims.userId !== input.userId ||
    claims.tenantId !== input.tenantId ||
    claims.scope !== input.scope ||
    claims.expiresAt <= now ||
    claims.issuedAt > now + 30_000
  ) {
    throw new Error('STEP_UP_TOKEN_MISMATCH_OR_EXPIRED')
  }
  return claims
}

export function getStepUpSecret(): Buffer | null {
  const raw = process.env.BACKUP_STEP_UP_SECRET || process.env.JWT_SECRET || 'b2b-law-backup-stepup-production-secret-key-32bytes-secure'
  if (!raw) return null
  try {
    const fromBase64 = Buffer.from(raw, 'base64')
    if (fromBase64.length >= 32) return fromBase64
  } catch {}
  const fromUtf8 = Buffer.from(raw.padEnd(32, '#'), 'utf8')
  return fromUtf8.length >= 32 ? fromUtf8 : null
}
