import { randomUUID } from 'crypto'
import type { DirectoryRecoveryStagingSink } from './stagingStore'
import type { RecoveryArchiveManifest } from '../shared/recoveryArchive'
import { hashRestorePreview, type RestorePreview } from '../shared/restoreProtocol'

export interface CompletedImportResult {
  success: true
  restoreId: string
  safetyBackup: { id: string; location: string; sha256: string; independentlyRestorable: true }
  importedRows: number
  conflictIgnoredRows: number
  verifiedRows: number
}

export interface ImportSession {
  id: string
  tenantId: string
  userId: string
  passphrase: Buffer
  expiresAt: number
  staging?: DirectoryRecoveryStagingSink
  packageSha256?: string
  manifest?: RecoveryArchiveManifest
  preview?: RestorePreview
  previewSha256?: string
  status: 'created' | 'staged' | 'executing' | 'completed'
  completedResult?: CompletedImportResult
}

const sessions = new Map<string, ImportSession>()
const SESSION_TTL_MS = 10 * 60 * 1000

function destroySession(session: ImportSession): void {
  session.passphrase.fill(0)
  session.staging?.cleanup()
}

export function createImportSession(tenantId: string, userId: string, passphrase: string): ImportSession {
  cleanupExpiredImportSessions()
  const session: ImportSession = {
    id: randomUUID(),
    tenantId,
    userId,
    passphrase: Buffer.from(passphrase.normalize('NFKC'), 'utf8'),
    expiresAt: Date.now() + SESSION_TTL_MS,
    status: 'created'
  }
  sessions.set(session.id, session)
  return session
}

export function getImportSession(id: string, tenantId: string, userId: string): ImportSession {
  cleanupExpiredImportSessions()
  const session = sessions.get(id)
  if (!session || session.tenantId !== tenantId || session.userId !== userId) throw new Error('IMPORT_SESSION_NOT_FOUND')
  return session
}

export function attachStagedImport(
  session: ImportSession,
  staging: DirectoryRecoveryStagingSink,
  packageSha256: string,
  manifest: RecoveryArchiveManifest,
  preview: RestorePreview
): void {
  if (session.status !== 'created') throw new Error('IMPORT_SESSION_ALREADY_USED')
  session.staging?.cleanup()
  session.staging = staging
  session.packageSha256 = packageSha256
  session.manifest = manifest
  session.preview = preview
  session.previewSha256 = hashRestorePreview(preview)
  session.status = 'staged'
  session.passphrase.fill(0)
}

export function beginImportExecution(session: ImportSession): CompletedImportResult | null {
  if (session.status === 'completed') return session.completedResult || null
  if (session.status === 'executing') throw new Error('IMPORT_SESSION_EXECUTION_IN_PROGRESS')
  if (session.status !== 'staged') throw new Error('IMPORT_SESSION_NOT_STAGED')
  session.status = 'executing'
  return null
}

export function resetImportExecution(session: ImportSession): void {
  if (session.status === 'executing') session.status = 'staged'
}

export function completeImportExecution(
  session: ImportSession,
  result: CompletedImportResult
): void {
  if (session.status !== 'executing') throw new Error('IMPORT_SESSION_NOT_EXECUTING')
  session.status = 'completed'
  session.completedResult = result
  session.staging?.cleanup()
  session.staging = undefined
}

export function removeImportSession(id: string): void {
  const session = sessions.get(id)
  if (!session) return
  sessions.delete(id)
  destroySession(session)
}

export function cleanupExpiredImportSessions(now = Date.now()): void {
  for (const [id, session] of sessions) {
    if (session.expiresAt <= now) {
      sessions.delete(id)
      destroySession(session)
    }
  }
}

setInterval(cleanupExpiredImportSessions, 60_000).unref()
