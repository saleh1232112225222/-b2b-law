import { createHash } from 'crypto'
import { Router, Request, Response } from 'express'
import { Transform } from 'stream'
import { authMiddleware } from '../middleware/auth'
import { canonicalContractHash, getAuthenticatedContext, sendSanitizedError } from './tenantBackup'
import { DirectoryRecoveryStagingSink } from '../recovery/stagingStore'
import { attachStagedImport, getImportSession, removeImportSession } from '../recovery/importSessions'
import { stageEncryptedRecoveryArchive } from '../shared/recoveryArchive'
import { createRestoreConfirmationToken, type RestorePreview } from '../shared/restoreProtocol'

const MAX_ENCRYPTED_ARCHIVE_BYTES = 525 * 1024 * 1024

export const tenantStreamRouter = Router()
tenantStreamRouter.use(authMiddleware)

function getRestoreConfirmationSecret(): Buffer {
  const raw = process.env.RESTORE_CONFIRMATION_SECRET || process.env.JWT_SECRET || 'b2b-law-restore-confirmation-secret-key-32bytes-secure'
  try {
    const fromBase64 = Buffer.from(raw, 'base64')
    if (fromBase64.length >= 32) return fromBase64
  } catch {}
  const fromUtf8 = Buffer.from(raw.padEnd(32, '@'), 'utf8')
  return fromUtf8
}

class HashAndLimitTransform extends Transform {
  private readonly hash = createHash('sha256')
  private observed = 0

  _transform(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null, data?: Buffer) => void): void {
    this.observed += chunk.length
    if (this.observed > MAX_ENCRYPTED_ARCHIVE_BYTES) {
      callback(new Error('PACKAGE_SIZE_LIMIT_EXCEEDED'))
      return
    }
    this.hash.update(chunk)
    callback(null, chunk)
  }

  digest(): string {
    return this.hash.digest('hex')
  }
}

tenantStreamRouter.put('/import-preview/:sessionId', async (req: Request, res: Response) => {
  let staging: DirectoryRecoveryStagingSink | undefined
  try {
    const rawContentType = req.header('content-type')?.split(';', 1)[0]?.toLowerCase() || ''
    const allowedTypes = ['application/octet-stream', 'application/vnd.b2b-law.tenant-backup', 'application/x-b2btenant', 'application/binary', 'binary/octet-stream', '']
    if (rawContentType && !allowedTypes.includes(rawContentType)) {
      return sendSanitizedError(res, 415, 'نوع محتوى حزمة الاستعادة غير صالح.', 'UNSUPPORTED_MEDIA_TYPE')
    }
    const rawLength = req.header('content-length')
    if (rawLength !== undefined) {
      const declaredLength = Number(rawLength)
      if (Number.isSafeInteger(declaredLength) && (declaredLength <= 0 || declaredLength > MAX_ENCRYPTED_ARCHIVE_BYTES)) {
        return sendSanitizedError(res, 413, 'حجم حزمة الاستعادة غير صالح أو يتجاوز الحد.', 'PACKAGE_SIZE_LIMIT_EXCEEDED')
      }
    }
    const { companyId, userId } = getAuthenticatedContext(req)
    const session = getImportSession(req.params.sessionId, companyId, userId)
    if (session.staging) {
      return sendSanitizedError(res, 409, 'استُخدمت جلسة الرفع مسبقاً.', 'IMPORT_SESSION_ALREADY_USED')
    }
    staging = new DirectoryRecoveryStagingSink()
    const meter = new HashAndLimitTransform()
    req.once('aborted', () => meter.destroy(new Error('UPLOAD_ABORTED')))
    const passphrase = session.passphrase.toString('utf8')
    const manifest = await stageEncryptedRecoveryArchive(req.pipe(meter), passphrase, companyId, staging)
    const packageSha256 = meter.digest()
    if (manifest.contractHash !== canonicalContractHash()) throw new Error('CANONICAL_CONTRACT_MISMATCH')

    const entities: Record<string, number> = {}
    for (const entry of staging.readRecordEntries()) {
      entities[entry.entityName] = (entities[entry.entityName] || 0) + 1
    }
    const summary = staging.summary()
    const preview: RestorePreview = {
      tenantId: companyId,
      userId,
      packageSha256,
      contractHash: manifest.contractHash,
      totalRows: summary.recordCount,
      entities,
      attachmentCount: summary.attachmentCount,
      attachmentTotalBytes: summary.attachmentTotalBytes,
      warnings: []
    }
    const confirmationToken = createRestoreConfirmationToken(preview, getRestoreConfirmationSecret())
    attachStagedImport(session, staging, packageSha256, manifest, preview)
    staging = undefined
    return res.json({ preview, confirmationToken, expiresInSeconds: 300 })
  } catch (error) {
    await staging?.abort()
    const code = error instanceof Error ? error.message : 'STREAM_IMPORT_PREVIEW_FAILED'
    if (code === 'IMPORT_SESSION_NOT_FOUND') {
      return sendSanitizedError(res, 404, 'جلسة الاستعادة غير موجودة أو انتهت.', code)
    }
    if (code === 'DECRYPTION_FAILED' || code.includes('AUTH_TAG') || code.includes('HMAC') || code.includes('FRAME_TAG_MISMATCH')) {
      return sendSanitizedError(res, 400, 'كلمة مرور التعافي غير صحيحة أو الحزمة تالفة.', 'INVALID_RECOVERY_PASSPHRASE', error)
    }
    if (code === 'TENANT_MISMATCH') {
      return sendSanitizedError(res, 400, 'معرف المكتب في حزمة التعافي لا يطابق حساب المكتب الحالي.', 'TENANT_MISMATCH', error)
    }
    if (req.params.sessionId) removeImportSession(req.params.sessionId)
    return sendSanitizedError(res, 400, `فشل التحقق من حزمة الاستعادة (${code})؛ لم تُمس البيانات الحالية.`, code, error)
  }
})

tenantStreamRouter.delete('/import-preview/:sessionId', (req: Request, res: Response) => {
  try {
    const { companyId, userId } = getAuthenticatedContext(req)
    const session = getImportSession(req.params.sessionId, companyId, userId)
    if (session.status === 'executing') return sendSanitizedError(res, 409, 'لا يمكن إلغاء استعادة قيد التنفيذ.', 'IMPORT_SESSION_EXECUTION_IN_PROGRESS')
    removeImportSession(session.id)
    return res.status(204).end()
  } catch (error) {
    return sendSanitizedError(res, 404, 'جلسة الاستعادة غير موجودة أو انتهت.', 'IMPORT_SESSION_NOT_FOUND', error)
  }
})
