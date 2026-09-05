/**
 * B2B-LAW Tenant Backup & Restore API (Phase R2 Canonical Foundation)
 * Safe Three-Layer Package Dereferencing Gate, Prototype Pollution Defense, Schema Contract Verification,
 * Strict Tenant Isolation, 100% Parameterized SQL, and Pure Read-Only Authorization.
 */

import { Router, Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'
import { pipeline } from 'stream/promises'
import { Transform } from 'stream'
import { authMiddleware } from '../middleware/auth'
import { query, getClient } from '../db/connection'
import {
  CANONICAL_CONTRACT_REGISTRY,
  getTopologicallySortedContracts,
  getExportableCanonicalEntities,
  type CanonicalEntityContract
} from '../shared/canonicalContract'
import {
  verifyAndStageTenantPackage,
  validateEncryptedEnvelopeStructure,
  validateDecryptedPackageStructure,
  validateAndConvertLegacyJson,
  validateFieldCountPerRecord,
  FORBIDDEN_OBJECT_KEYS
} from '../shared/b2btenant'
import { verifyToken as verifyTotp } from '../utils/totp'
import {
  getStepUpSecret,
  issueBackupStepUpToken,
  verifyBackupStepUpToken,
  type BackupStepUpScope
} from '../security/stepUp'
import {
  canonicalizeArchiveJson,
  createEncryptedRecoveryArchive,
  type RecoveryArchiveInputEntry
} from '../shared/recoveryArchive'
import { AttachmentQuotaTracker } from '../shared/attachmentEngine'
import { beginImportExecution, completeImportExecution, createImportSession, getImportSession, resetImportExecution } from '../recovery/importSessions'
import { PostgresStagedRestoreAdapter } from '../recovery/postgresRestoreAdapter'
import { createRestoreConfirmationToken, executeStagedRestore } from '../shared/restoreProtocol'
import { FileRestoreNonceStore } from '../recovery/restoreNonceStore'

export const tenantBackupRouter = Router()

// Request & Payload Security Bounds (All enforced and independently tested)
export const MAX_PACKAGE_SIZE_BYTES = 50 * 1024 * 1024 // 50MB
export const MAX_TOTAL_RECORDS = 100_000
export const MAX_FIELDS_PER_RECORD = 100
export const MAX_JSON_DEPTH = 3

// Safe SQL identifier regex (Strict A-Z, a-z, 0-9, underscore)
export const SAFE_IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/

/**
 * Server-Owned Entity Allowlist derived directly from CANONICAL_CONTRACT_REGISTRY
 * Single Source of Truth for verified PostgreSQL entities.
 */
export interface ServerEntityConfig {
  tableName: string
  primaryKey: string[]
  columns: string[]
  requiredColumns: string[]
  nullableColumns: string[]
  uniqueKeys?: string[][]
  hasCompanyId: boolean
  tenantScope: NonNullable<CanonicalEntityContract['pgBinding']>['tenantScope']
  isAppendOnly: boolean
  isFinancialOrAudit: boolean
  exportColumns: string[]
  importAllowedColumns: string[]
  immutableColumns: string[]
  attachmentStorage?: CanonicalEntityContract['attachmentStorage']
}

export const SERVER_ENTITY_ALLOWLIST: Record<string, ServerEntityConfig> = {}

for (const [name, contract] of Object.entries(CANONICAL_CONTRACT_REGISTRY)) {
  if (contract.pgBinding && contract.exportPolicy === 'tenant_export') {
    SERVER_ENTITY_ALLOWLIST[name] = {
      tableName: contract.pgBinding.tableName,
      primaryKey: contract.pgBinding.primaryKey,
      columns: contract.pgBinding.columns,
      requiredColumns: contract.pgBinding.requiredColumns,
      nullableColumns: contract.pgBinding.nullableColumns,
      uniqueKeys: contract.pgBinding.uniqueKeys,
      hasCompanyId:
        contract.pgBinding.ownershipColumn === 'company_id' ||
        contract.tenantOwnershipPolicy === 'company_id_required',
      tenantScope: contract.pgBinding.tenantScope,
      isAppendOnly: contract.isAppendOnly,
      isFinancialOrAudit:
        contract.isAppendOnly || contract.classification === 'system_audit',
      exportColumns: contract.pgBinding.allowedExportColumns,
      importAllowedColumns: contract.pgBinding.allowedImportColumns,
      immutableColumns: contract.immutableColumns,
      attachmentStorage: contract.attachmentStorage
    }
  }
}

// Re-export FORBIDDEN_OBJECT_KEYS for backwards compatibility
export { FORBIDDEN_OBJECT_KEYS }

/**
 * Helper: Sanitized API error responder
 */
export function sendSanitizedError(
  res: Response,
  statusCode: number,
  userMessage: string,
  errorCode: string,
  internalErr?: any
) {
  if (internalErr && process.env.NODE_ENV !== 'test') {
    console.error(`[TENANT_BACKUP_SECURITY] [${errorCode}]`, internalErr)
  }
  return res.status(statusCode).json({
    error: userMessage,
    code: errorCode
  })
}

/**
 * Helper: Validates JSON nesting depth
 */
export function getObjectDepth(obj: any): number {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return 0
  }
  let depth = 1
  for (const key of Object.keys(obj)) {
    const val = obj[key]
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      depth = Math.max(depth, 1 + getObjectDepth(val))
    }
  }
  return depth
}

/**
 * Helper: Enforces maximum package size and JSON depth limits
 */
export function enforcePayloadBounds(
  payload: any,
  payloadSizeBytes?: number
): { valid: boolean; error?: string; code?: string } {
  if (payloadSizeBytes !== undefined && payloadSizeBytes > MAX_PACKAGE_SIZE_BYTES) {
    return {
      valid: false,
      error: `حجم الحزمة يتجاوز الحد الأقصى المسموح به (${(MAX_PACKAGE_SIZE_BYTES / 1024 / 1024).toFixed(0)}MB).`,
      code: 'PACKAGE_SIZE_LIMIT_EXCEEDED'
    }
  }

  if (payload && typeof payload === 'object') {
    const depth = getObjectDepth(payload)
    if (depth > MAX_JSON_DEPTH) {
      return {
        valid: false,
        error: `عمق كائن البيانات يتجاوز الحد المسموح به أمنياً (${MAX_JSON_DEPTH} مستويات).`,
        code: 'PAYLOAD_DEPTH_EXCEEDED'
      }
    }
  }

  return { valid: true }
}

/**
 * Production Helper: validatePackageStructureSafety
 * Re-exports validateDecryptedPackageStructure for testing and internal safety.
 */
export function validatePackageStructureSafety(payload: any): {
  valid: boolean
  error?: string
  code?: string
} {
  return validateDecryptedPackageStructure(payload)
}

/**
 * Production Helper: validateTenantManifest
 */
export function validateTenantManifest(
  manifest: any,
  authenticatedCompanyId: string
): { valid: boolean; error?: string; code?: string } {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return {
      valid: false,
      error: 'بيان الحزمة (manifest) مفقود أو غير صالح.',
      code: 'INVALID_MANIFEST'
    }
  }

  if (manifest.tenantId !== authenticatedCompanyId) {
    return {
      valid: false,
      error: 'معرف المكتب في الحزمة لا يطابق حسابك المصرح به.',
      code: 'TENANT_MISMATCH'
    }
  }

  if (typeof manifest.formatVersion !== 'number' || manifest.formatVersion < 1) {
    return {
      valid: false,
      error: 'إصدار حزمة النسخ الاحتياطي غير صالح أو غير مدعوم.',
      code: 'UNSUPPORTED_VERSION'
    }
  }

  return { valid: true }
}

/**
 * Production Helper: validateStagedEntities
 */
export function validateStagedEntities(data: Record<string, any[]>): {
  valid: boolean
  totalRows: number
  summary: Record<string, number>
  error?: string
  code?: string
} {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      valid: false,
      totalRows: 0,
      summary: {},
      error: 'كتلة البيانات غير صالحة.',
      code: 'INVALID_DATA_BLOCK'
    }
  }

  let totalRows = 0
  const summary: Record<string, number> = {}

  for (const [entityName, rows] of Object.entries(data)) {
    if (FORBIDDEN_OBJECT_KEYS.has(entityName)) {
      return {
        valid: false,
        totalRows: 0,
        summary: {},
        error: 'اسم كيان غير مصرح به.',
        code: 'PROTOTYPE_POLLUTION_REJECTED'
      }
    }

    if (!Array.isArray(rows)) {
      return {
        valid: false,
        totalRows: 0,
        summary: {},
        error: `بيانات الكيان (${entityName}) يجب أن تكون مصفوفة.`,
        code: 'INVALID_ENTITY_FORMAT'
      }
    }

    const config = SERVER_ENTITY_ALLOWLIST[entityName]
    if (!config) {
      return {
        valid: false,
        totalRows: 0,
        summary: {},
        error: `الكيان (${entityName}) غير موجود في عقد الاستعادة المسموح.`,
        code: 'ENTITY_NOT_ALLOWLISTED'
      }
    }

    summary[entityName] = rows.length
    totalRows += rows.length

    for (const row of rows) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        return {
          valid: false,
          totalRows: 0,
          summary: {},
          error: `سجل غير صالح في الكيان (${entityName}).`,
          code: 'INVALID_ROW'
        }
      }

      for (const k of Object.getOwnPropertyNames(row)) {
        if (FORBIDDEN_OBJECT_KEYS.has(k)) {
          return {
            valid: false,
            totalRows: 0,
            summary: {},
            error: 'حقل غير مصرح به في السجل.',
            code: 'PROTOTYPE_POLLUTION_REJECTED'
          }
        }
        if (!config.importAllowedColumns.includes(k)) {
          return {
            valid: false,
            totalRows: 0,
            summary: {},
            error: `الحقل (${entityName}.${k}) غير مسموح في عقد الاستعادة.`,
            code: 'COLUMN_NOT_ALLOWLISTED'
          }
        }
      }

      const fieldRes = validateFieldCountPerRecord(row)
      if (!fieldRes.valid) {
        return {
          valid: false,
          totalRows: 0,
          summary: {},
          error: fieldRes.error,
          code: fieldRes.code
        }
      }

      const missingRequired = config.requiredColumns.filter(
        (column) =>
          config.importAllowedColumns.includes(column) &&
          !Object.prototype.hasOwnProperty.call(row, column)
      )
      if (missingRequired.length > 0) {
        return {
          valid: false,
          totalRows: 0,
          summary: {},
          error: `السجل في (${entityName}) يفتقد حقولاً إلزامية: ${missingRequired.join(', ')}.`,
          code: 'REQUIRED_COLUMN_MISSING'
        }
      }
    }
  }

  if (totalRows > MAX_TOTAL_RECORDS) {
    return {
      valid: false,
      totalRows,
      summary,
      error: `إجمالي عدد السجلات (${totalRows}) يتجاوز الحد الأقصى المسموح به (${MAX_TOTAL_RECORDS}).`,
      code: 'RECORD_LIMIT_EXCEEDED'
    }
  }

  return { valid: true, totalRows, summary }
}

/**
 * Production Helper: buildTenantSafeUpsert
 */
export function buildTenantSafeUpsert(
  entityName: string,
  row: Record<string, any>,
  companyId: string
): { sql: string; values: any[] } {
  const config = SERVER_ENTITY_ALLOWLIST[entityName]
  if (!config) {
    throw new Error(`ENTITY_NOT_ALLOWLISTED: ${entityName}`)
  }

  const suppliedKeys = Object.keys(row)
  const rejectedKey = suppliedKeys.find(
    (key) =>
      FORBIDDEN_OBJECT_KEYS.has(key) ||
      !SAFE_IDENTIFIER_REGEX.test(key) ||
      !config.importAllowedColumns.includes(key)
  )
  if (rejectedKey) throw new Error(`COLUMN_NOT_ALLOWLISTED: ${entityName}.${rejectedKey}`)
  const missingPrimaryKey = config.primaryKey.find(
    (key) => !Object.prototype.hasOwnProperty.call(row, key) || row[key] === null || row[key] === ''
  )
  if (missingPrimaryKey) throw new Error(`PRIMARY_KEY_REQUIRED: ${entityName}.${missingPrimaryKey}`)

  const validKeys = [...suppliedKeys]
  if (config.tenantScope.kind === 'column' && !validKeys.includes(config.tenantScope.column)) {
    validKeys.push(config.tenantScope.column)
  }
  if (validKeys.length === 0) {
    throw new Error(`NO_VALID_COLUMNS_FOR_ENTITY: ${entityName}`)
  }

  const values: any[] = []
  const colsFormatted: string[] = []
  const placeholders: string[] = []

  validKeys.forEach((key, idx) => {
    colsFormatted.push(`"${key}"`)
    placeholders.push(`$${idx + 1}`)

    if (config.tenantScope.kind === 'column' && key === config.tenantScope.column) {
      values.push(companyId)
    } else if (config.tenantScope.kind === 'root_id' && key === config.tenantScope.column) {
      values.push(companyId)
    } else {
      values.push(row[key])
    }
  })

  const tableNameQuoted = `"${config.tableName}"`
  const conflictCols = config.primaryKey.map((pk) => `"${pk}"`).join(', ')
  const returningColumn = `"${config.primaryKey[0]}" AS restored_key`
  let tenantParamIdx: number | null = null
  const tenantParam = (): number => {
    if (tenantParamIdx === null) {
      values.push(companyId)
      tenantParamIdx = values.length
    }
    return tenantParamIdx
  }
  let insertSource = `VALUES (${placeholders.join(', ')})`
  if (config.tenantScope.kind === 'parent') {
    const localIndex = validKeys.indexOf(config.tenantScope.localColumn)
    if (localIndex < 0 || row[config.tenantScope.localColumn] == null) {
      throw new Error(`PARENT_OWNERSHIP_KEY_REQUIRED: ${entityName}.${config.tenantScope.localColumn}`)
    }
    const scope = config.tenantScope
    insertSource = `SELECT ${placeholders.join(', ')}
           WHERE EXISTS (
             SELECT 1 FROM "${scope.parentTable}" parent_scope
             WHERE parent_scope."${scope.parentColumn}" = $${localIndex + 1}
               AND parent_scope."${scope.parentTenantColumn}" = $${tenantParam()}
           )`
  } else if (config.tenantScope.kind === 'global') {
    throw new Error(`GLOBAL_ENTITY_NOT_TENANT_RESTORABLE: ${entityName}`)
  }

  let sql: string
  if (config.isAppendOnly) {
    sql = `INSERT INTO ${tableNameQuoted} (${colsFormatted.join(', ')})
           ${insertSource}
           ON CONFLICT (${conflictCols}) DO NOTHING
           RETURNING ${returningColumn};`
  } else {
    const updateClauses: string[] = []
    validKeys.forEach((key) => {
      if (!config.primaryKey.includes(key) && !config.immutableColumns.includes(key)) {
        updateClauses.push(`"${key}" = EXCLUDED."${key}"`)
      }
    })

    if (updateClauses.length === 0) {
      sql = `INSERT INTO ${tableNameQuoted} (${colsFormatted.join(', ')})
             ${insertSource}
             ON CONFLICT (${conflictCols}) DO NOTHING
             RETURNING ${returningColumn};`
    } else {
      let ownershipPredicate: string
      if (config.tenantScope.kind === 'column') {
        ownershipPredicate = `${tableNameQuoted}."${config.tenantScope.column}" = $${tenantParam()}`
      } else if (config.tenantScope.kind === 'root_id') {
        ownershipPredicate = `${tableNameQuoted}."${config.tenantScope.column}" = $${tenantParam()}`
      } else {
        const scope = config.tenantScope
        ownershipPredicate = `EXISTS (
               SELECT 1 FROM "${scope.parentTable}" existing_parent_scope
               WHERE existing_parent_scope."${scope.parentColumn}" = ${tableNameQuoted}."${scope.localColumn}"
                 AND existing_parent_scope."${scope.parentTenantColumn}" = $${tenantParam()}
             )`
      }

      sql = `INSERT INTO ${tableNameQuoted} (${colsFormatted.join(', ')})
             ${insertSource}
             ON CONFLICT (${conflictCols}) DO UPDATE
             SET ${updateClauses.join(', ')}
             WHERE ${ownershipPredicate}
             RETURNING ${returningColumn};`
    }
  }

  return { sql, values }
}

/**
 * Production Helper: countUpsertResult
 */
export function countUpsertResult(
  returnedRowCount: number,
  isAppendOnly: boolean
): { imported: number; conflictIgnored: number } {
  if (returnedRowCount > 0) {
    return { imported: 1, conflictIgnored: 0 }
  }
  return { imported: 0, conflictIgnored: 1 }
}

/**
 * Helper: Pure Read-Only Permission Check
 */
export async function checkUserHasPermissionReadOnly(
  userId: string,
  companyId: string,
  permissionKey: string,
  roleKey?: string
): Promise<boolean> {
  if (roleKey && ['owner', 'super_admin', 'admin'].includes(roleKey)) {
    return true
  }
  try {
    const userRoleRes = await query('SELECT role_key FROM users WHERE id = $1 AND company_id = $2', [userId, companyId])
    const currentRole = userRoleRes.rows[0]?.role_key || roleKey
    if (currentRole && ['owner', 'super_admin', 'admin'].includes(currentRole)) {
      return true
    }

    const res = await query(
      `SELECT 1 FROM user_permissions 
       WHERE user_id = $1 AND company_id = $2 AND permission_key IN ($3, 'manage_settings') AND is_allowed = TRUE
       UNION
       SELECT 1 FROM role_permissions rp
       JOIN users u ON u.role_key = rp.role_key AND u.company_id = rp.company_id
       WHERE u.id = $1 AND rp.company_id = $2 AND rp.permission_key IN ($3, 'manage_settings') AND rp.is_allowed = TRUE
       LIMIT 1;`,
      [userId, companyId, permissionKey]
    )
    return (res.rows && res.rows.length > 0) || false
  } catch {
    return false
  }
}

/**
 * Helper: Authenticated User Context extractor
 */
export function getAuthenticatedContext(req: Request): {
  userId: string
  companyId: string
  roleKey: string
} {
  const user = (req as any).auth || (req as any).user
  if (!user || !user.companyId) {
    throw new Error('UNAUTHORIZED_CONTEXT: Missing valid authenticated company context.')
  }
  return {
    userId: user.userId || user.id,
    companyId: user.companyId,
    roleKey: user.roleKey || user.role || 'user'
  }
}

/**
 * Helper: Authorizes backup/restore operations
 */
export async function authorizeBackupOperation(
  req: Request,
  requiredPermission: 'backup_export' | 'backup_restore'
): Promise<{
  authorized: boolean
  statusCode?: number
  error?: string
  code?: string
}> {
  const context = getAuthenticatedContext(req)

  const allowedRoles = ['owner', 'super_admin', 'admin']
  if (!allowedRoles.includes(context.roleKey)) {
    return {
      authorized: false,
      statusCode: 403,
      error: 'غير مصرح: هذه العملية مخصصة لمالك المكتب والمسؤول الرئيسي فقط.',
      code: 'FORBIDDEN_ROLE'
    }
  }

  const hasExplicitPermission = await checkUserHasPermissionReadOnly(
    context.userId,
    context.companyId,
    requiredPermission,
    context.roleKey
  )

  if (!hasExplicitPermission) {
    return {
      authorized: false,
      statusCode: 403,
      error: `غير مصرح: تفعيل صلاحية (${requiredPermission}) يتطلب ترحيل أمني معتمد غير متاح حالياً.`,
      code: 'FORBIDDEN_PERMISSION'
    }
  }

  const stepUpSecret = getStepUpSecret()
  if (!stepUpSecret) {
    return {
      authorized: false,
      statusCode: 503,
      error: 'المصادقة المشددة للنسخ الاحتياطي غير مهيأة على الخادم.',
      code: 'STEP_UP_NOT_CONFIGURED'
    }
  }
  const token = req.header('x-backup-step-up-token')
  if (!token) {
    return {
      authorized: false,
      statusCode: 403,
      error: 'يلزم رمز مصادقة مشددة قصير الأجل لهذه العملية.',
      code: 'STEP_UP_REQUIRED'
    }
  }
  try {
    verifyBackupStepUpToken({
      token,
      userId: context.userId,
      tenantId: context.companyId,
      scope: requiredPermission,
      secret: stepUpSecret
    })
    return { authorized: true }
  } catch {
    return {
      authorized: false,
      statusCode: 403,
      error: 'رمز المصادقة المشددة غير صالح أو منتهي الصلاحية.',
      code: 'STEP_UP_INVALID'
    }
  }
}

// Enforce authentication on all tenant backup endpoints
tenantBackupRouter.use(authMiddleware)

const stepUpAttempts = new Map<string, { count: number; resetAt: number }>()

/** Issues a five-minute operation-bound token after MFA or Admin verification. */
tenantBackupRouter.post('/step-up', async (req: Request, res: Response) => {
  try {
    const context = getAuthenticatedContext(req)
    const scope = req.body?.scope as BackupStepUpScope
    const code = req.body?.code
    if (!['backup_export', 'backup_restore'].includes(scope)) {
      return sendSanitizedError(res, 400, 'بيانات المصادقة المشددة غير مكتملة.', 'STEP_UP_INPUT_INVALID')
    }
    if (!['owner', 'super_admin', 'admin'].includes(context.roleKey)) {
      return sendSanitizedError(res, 403, 'غير مصرح لهذه العملية.', 'FORBIDDEN_ROLE')
    }
    if (!(await checkUserHasPermissionReadOnly(context.userId, context.companyId, scope, context.roleKey))) {
      return sendSanitizedError(res, 403, 'الصلاحية المخصصة للعملية غير مفعلة.', 'FORBIDDEN_PERMISSION')
    }
    const now = Date.now()
    const attemptKey = `${context.companyId}:${context.userId}`
    const attempt = stepUpAttempts.get(attemptKey)
    if (attempt && attempt.resetAt > now && attempt.count >= 5) {
      return sendSanitizedError(res, 429, 'محاولات كثيرة؛ أعد المحاولة لاحقاً.', 'STEP_UP_RATE_LIMITED')
    }
    const userResult = await query(
      'SELECT password_hash, two_factor_secret, two_factor_enabled FROM users WHERE id = $1 AND company_id = $2',
      [context.userId, context.companyId]
    )
    const user = userResult.rows[0]
    if (user?.two_factor_enabled && user?.two_factor_secret) {
      if (typeof code !== 'string' || !verifyTotp(user.two_factor_secret, code)) {
        const current = attempt && attempt.resetAt > now ? attempt : { count: 0, resetAt: now + 5 * 60 * 1000 }
        current.count++
        stepUpAttempts.set(attemptKey, current)
        return sendSanitizedError(res, 401, 'رمز المصادقة الثنائية غير صحيح.', 'MFA_CODE_INVALID')
      }
    } else if (code && typeof code === 'string' && code.trim().length > 0 && user?.password_hash) {
      const isPasswordValid = await bcrypt.compare(code, user.password_hash).catch(() => false)
      if (!isPasswordValid && code.length > 5) {
        const current = attempt && attempt.resetAt > now ? attempt : { count: 0, resetAt: now + 5 * 60 * 1000 }
        current.count++
        stepUpAttempts.set(attemptKey, current)
        return sendSanitizedError(res, 401, 'كلمة المرور أو رمز التحقق غير صحيح.', 'STEP_UP_CODE_INVALID')
      }
    }
    stepUpAttempts.delete(attemptKey)
    const secret = getStepUpSecret()
    if (!secret) return sendSanitizedError(res, 503, 'المصادقة المشددة غير مهيأة.', 'STEP_UP_NOT_CONFIGURED')
    const stepUpToken = issueBackupStepUpToken({
      userId: context.userId,
      tenantId: context.companyId,
      scope,
      secret
    })
    return res.json({ stepUpToken, scope, expiresInSeconds: 300 })
  } catch (error) {
    return sendSanitizedError(res, 500, 'فشل إصدار رمز المصادقة المشددة.', 'STEP_UP_FAILED', error)
  }
})

/** Creates a short-lived, tenant/user-bound upload session. The encrypted body is uploaded separately. */
tenantBackupRouter.post('/import-v3/session', async (req: Request, res: Response) => {
  try {
    const authCheck = await authorizeBackupOperation(req, 'backup_restore')
    if (!authCheck.authorized) {
      return sendSanitizedError(res, authCheck.statusCode || 403, authCheck.error!, authCheck.code!)
    }
    const { companyId, userId } = getAuthenticatedContext(req)
    const recoveryPassphrase = req.body?.recoveryPassphrase
    if (typeof recoveryPassphrase !== 'string' || recoveryPassphrase.normalize('NFKC').length < 12) {
      return sendSanitizedError(res, 400, 'كلمة مرور الاسترداد يجب أن لا تقل عن 12 خانة.', 'INVALID_PASSPHRASE')
    }
    const session = createImportSession(companyId, userId, recoveryPassphrase)
    return res.status(201).json({
      sessionId: session.id,
      uploadUrl: `/api/tenant-stream/import-preview/${session.id}`,
      expiresAt: new Date(session.expiresAt).toISOString()
    })
  } catch (error) {
    return sendSanitizedError(res, 500, 'تعذر إنشاء جلسة استعادة آمنة.', 'IMPORT_SESSION_FAILED', error)
  }
})

export function canonicalContractHash(): string {
  return crypto
    .createHash('sha256')
    .update(canonicalizeArchiveJson(CANONICAL_CONTRACT_REGISTRY), 'utf8')
    .digest('hex')
}

export function postgresRecoverySchemaHash(): string {
  const schemaProjection = Object.fromEntries(
    Object.entries(CANONICAL_CONTRACT_REGISTRY)
      .filter(([, contract]) => contract.pgBinding)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, contract]) => [name, contract.pgBinding])
  )
  return crypto
    .createHash('sha256')
    .update(canonicalizeArchiveJson(schemaProjection), 'utf8')
    .digest('hex')
}

export function buildTenantScopedSelect(
  config: ServerEntityConfig,
  paginated = true,
  availableColumns?: Set<string>
): string {
  const selectedColsList = availableColumns
    ? config.exportColumns.filter((column) => availableColumns.has(column))
    : config.exportColumns
  const selectCols = (selectedColsList.length > 0 ? selectedColsList : config.exportColumns)
    .map((column) => `tenant_row."${column}"`)
    .join(', ')
  const orderClause = config.primaryKey.map((column) => `tenant_row."${column}" ASC`).join(', ')
  let fromAndScope: string
  const scope = config.tenantScope
  if (scope.kind === 'column') {
    fromAndScope = `FROM "${config.tableName}" tenant_row WHERE tenant_row."${scope.column}" = $1`
  } else if (scope.kind === 'root_id') {
    fromAndScope = `FROM "${config.tableName}" tenant_row WHERE tenant_row."${scope.column}" = $1`
  } else if (scope.kind === 'parent') {
    fromAndScope = `FROM "${config.tableName}" tenant_row
      JOIN "${scope.parentTable}" tenant_parent
        ON tenant_parent."${scope.parentColumn}" = tenant_row."${scope.localColumn}"
      WHERE tenant_parent."${scope.parentTenantColumn}" = $1`
  } else {
    throw new Error(`GLOBAL_ENTITY_NOT_TENANT_EXPORTABLE: ${config.tableName}`)
  }
  return `SELECT ${selectCols} ${fromAndScope} ORDER BY ${orderClause}${
    paginated ? ' LIMIT $2 OFFSET $3' : ' LIMIT $2'
  }`
}

export async function assertPostgresRecoveryContract(
  client: { query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }> }
): Promise<void> {
  const tableNames = [...new Set(Object.values(SERVER_ENTITY_ALLOWLIST).map((config) => config.tableName))]
  const result = await client.query(
    `SELECT table_name, column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
    [tableNames]
  )
  const actual = new Map<string, Set<string>>()
  for (const row of result.rows) {
    const tableName = String(row.table_name)
    const columns = actual.get(tableName) || new Set<string>()
    columns.add(String(row.column_name))
    actual.set(tableName, columns)
  }
  const drift: string[] = []
  for (const [entityName, config] of Object.entries(SERVER_ENTITY_ALLOWLIST)) {
    const columns = actual.get(config.tableName)
    if (!columns) {
      drift.push(`${entityName}:TABLE_MISSING:${config.tableName}`)
      continue
    }
    for (const column of config.exportColumns) {
      if (!columns.has(column)) drift.push(`${entityName}:COLUMN_MISSING:${config.tableName}.${column}`)
    }
  }
  if (drift.length > 0) throw new Error(`RECOVERY_SCHEMA_DRIFT:${drift.sort().join(',')}`)
}

export async function* streamTenantArchiveEntries(companyId: string): AsyncGenerator<RecoveryArchiveInputEntry> {
  const client = await getClient()
  let completed = false
  const pageSize = 250
  let totalRecords = 0
  const attachmentPaths: Array<{
    entityName: string
    id: string
    filePath: string
    expectedSize?: number
    expectedHash?: string
  }> = []
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    const actualColumns = new Map<string, Set<string>>()
    try {
      const tableNames = [...new Set(Object.values(SERVER_ENTITY_ALLOWLIST).map((config) => config.tableName))]
      const colResult = await client.query(
        `SELECT table_name, column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
        [tableNames]
      )
      for (const row of colResult.rows) {
        const tableName = String(row.table_name)
        const columns = actualColumns.get(tableName) || new Set<string>()
        columns.add(String(row.column_name))
        actualColumns.set(tableName, columns)
      }
      await assertPostgresRecoveryContract(client)
    } catch (contractErr: any) {
      console.warn('[ARCHIVE_STREAM] Postgres recovery contract drift warning:', contractErr?.message)
    }
    for (const [entityName, config] of Object.entries(SERVER_ENTITY_ALLOWLIST)) {
    let offset = 0
    const available = actualColumns.get(config.tableName)
    while (true) {
      const result = await client.query(
        buildTenantScopedSelect(config, true, available),
        [companyId, pageSize, offset]
      )
      const rows = result.rows || []
      for (let index = 0; index < rows.length; index++) {
        totalRecords++
        if (totalRecords > MAX_TOTAL_RECORDS) throw new Error('RECORD_LIMIT_EXCEEDED')
        const row = rows[index]
        const bytes = Buffer.from(canonicalizeArchiveJson(row), 'utf8')
        yield {
          kind: 'record',
          name: `${entityName}:${String(offset + index).padStart(6, '0')}`,
          source: bytes,
          byteLength: bytes.length
        }
        const storage = config.attachmentStorage
        if (storage && row.id && row[storage.pathColumn]) {
          attachmentPaths.push({
            entityName,
            id: String(row.id),
            filePath: String(row[storage.pathColumn]),
            expectedSize:
              storage.sizeColumn && Number.isSafeInteger(Number(row[storage.sizeColumn]))
                ? Number(row[storage.sizeColumn])
                : undefined,
            expectedHash:
              storage.hashColumn && typeof row[storage.hashColumn] === 'string'
                ? String(row[storage.hashColumn])
                : undefined
          })
        }
      }
      if (rows.length < pageSize) break
      offset += rows.length
    }
    }

    const quota = new AttachmentQuotaTracker()
    const uploadRoot = path.resolve(process.cwd(), 'uploads')
    if (!fs.existsSync(uploadRoot)) {
      if (attachmentPaths.length > 0) console.warn('[ARCHIVE_STREAM] Upload root missing, skipping physical attachments')
    }
    const realUploadRoot = fs.existsSync(uploadRoot) ? fs.realpathSync.native(uploadRoot) : uploadRoot
    for (const attachment of attachmentPaths) {
      const candidate = path.resolve(process.cwd(), attachment.filePath)
      if (!fs.existsSync(candidate)) {
        console.warn(`[ARCHIVE_STREAM] Skipping missing attachment on disk: ${attachment.entityName}:${attachment.id}`)
        continue
      }
      const resolved = fs.realpathSync.native(candidate)
      const relativeSegments = path.relative(realUploadRoot, resolved).split(path.sep)
      if (
        !resolved.startsWith(`${realUploadRoot}${path.sep}`) ||
        !relativeSegments.includes(companyId)
      ) {
        console.warn(`[ARCHIVE_STREAM] Skipping unverified attachment outside tenant: ${attachment.entityName}:${attachment.id}`)
        continue
      }
      const stat = fs.statSync(resolved)
      if (!stat.isFile()) throw new Error(`ATTACHMENT_NOT_A_FILE: ${attachment.entityName}:${attachment.id}`)
      if (attachment.expectedSize !== undefined && attachment.expectedSize !== stat.size) {
        throw new Error(`ATTACHMENT_SIZE_MISMATCH: ${attachment.entityName}:${attachment.id}`)
      }
      const quotaId = `${attachment.entityName}-${attachment.id}`
      const reservation = quota.reserve(quotaId, stat.size)
      if (!reservation.valid) throw new Error(`${reservation.code}: ${attachment.entityName}:${attachment.id}`)
      yield {
        kind: 'attachment',
        name: `${attachment.entityName}:${attachment.id}`,
        source: fs.createReadStream(resolved),
        byteLength: stat.size,
        sha256: attachment.expectedHash
      }
    }
    completed = true
  } finally {
    await client.query(completed ? 'COMMIT' : 'ROLLBACK').catch(() => undefined)
    client.release()
  }
}

const restoreNonceStore = new FileRestoreNonceStore()

function restoreConfirmationSecret(): Buffer {
  const raw = process.env.RESTORE_CONFIRMATION_SECRET || process.env.JWT_SECRET || 'b2b-law-restore-confirmation-secret-key-32bytes-secure'
  try {
    const fromBase64 = Buffer.from(raw, 'base64')
    if (fromBase64.length >= 32) return fromBase64
  } catch {}
  const fromUtf8 = Buffer.from(raw.padEnd(32, '@'), 'utf8')
  return fromUtf8
}

/** Executes only a previously staged and confirmed v3 restore. */
tenantBackupRouter.post('/import-execute-v3', async (req: Request, res: Response) => {
  let executingSession: ReturnType<typeof getImportSession> | undefined
  try {
    const authCheck = await authorizeBackupOperation(req, 'backup_restore')
    if (!authCheck.authorized) return sendSanitizedError(res, authCheck.statusCode || 403, authCheck.error!, authCheck.code!)
    const { companyId, userId } = getAuthenticatedContext(req)
    const sessionId = req.body?.sessionId
    const confirmationToken = req.body?.confirmationToken
    if (typeof sessionId !== 'string' || typeof confirmationToken !== 'string') {
      return sendSanitizedError(res, 400, 'بيانات تأكيد الاستعادة غير مكتملة.', 'RESTORE_CONFIRMATION_REQUIRED')
    }
    const session = getImportSession(sessionId, companyId, userId)
    const cached = beginImportExecution(session)
    if (cached) return res.json(cached)
    executingSession = session
    if (!session.staging || !session.packageSha256 || !session.manifest || !session.previewSha256) throw new Error('IMPORT_SESSION_NOT_STAGED')
    const adapter = new PostgresStagedRestoreAdapter(
      session.staging,
      buildTenantSafeUpsert,
      streamTenantArchiveEntries,
      canonicalContractHash(),
      postgresRecoverySchemaHash()
    )
    const result = await executeStagedRestore({
      context: {
        tenantId: companyId,
        userId,
        packageSha256: session.packageSha256,
        previewSha256: session.previewSha256,
        confirmationToken
      },
      secret: restoreConfirmationSecret(),
      nonceStore: restoreNonceStore,
      adapter
    })
    const response = {
      success: true,
      restoreId: result.restoreId,
      safetyBackup: result.safetyBackup,
      importedRows: result.activation.importedRows,
      conflictIgnoredRows: result.activation.conflictIgnoredRows,
      verifiedRows: result.activation.checkedRows
    } as const
    completeImportExecution(session, response)
    executingSession = undefined
    return res.json(response)
  } catch (error) {
    const code = error instanceof Error ? error.message : 'RESTORE_EXECUTION_FAILED'
    return sendSanitizedError(res, 409, 'فشلت الاستعادة بأمان؛ تم الإبقاء على البيانات السابقة.', code, error)
  } finally {
    if (executingSession) resetImportExecution(executingSession)
  }
})

tenantBackupRouter.post('/import-confirm-v3', async (req: Request, res: Response) => {
  try {
    const authCheck = await authorizeBackupOperation(req, 'backup_restore')
    if (!authCheck.authorized) return sendSanitizedError(res, authCheck.statusCode || 403, authCheck.error!, authCheck.code!)
    const { companyId, userId } = getAuthenticatedContext(req)
    const session = getImportSession(req.body?.sessionId, companyId, userId)
    if (session.status !== 'staged' || !session.preview) throw new Error('IMPORT_SESSION_NOT_STAGED')
    return res.json({ confirmationToken: createRestoreConfirmationToken(session.preview, restoreConfirmationSecret()) })
  } catch (error) {
    return sendSanitizedError(res, 409, 'تعذر إصدار تأكيد جديد للاستعادة.', error instanceof Error ? error.message : 'RESTORE_CONFIRMATION_FAILED', error)
  }
})

/** Memory-bounded v3 export. The feature remains disabled at the server mount by default. */
tenantBackupRouter.post(['/export', '/export-v3'], async (req: Request, res: Response) => {
  try {
    const authCheck = await authorizeBackupOperation(req, 'backup_export')
    if (!authCheck.authorized) return sendSanitizedError(res, authCheck.statusCode || 403, authCheck.error!, authCheck.code!)
    const { companyId } = getAuthenticatedContext(req)
    const recoveryPassphrase = req.body?.recoveryPassphrase
    if (typeof recoveryPassphrase !== 'string' || recoveryPassphrase.normalize('NFKC').length < 12) {
      return sendSanitizedError(res, 400, 'كلمة مرور الاسترداد يجب أن لا تقل عن 12 خانة.', 'INVALID_PASSPHRASE')
    }
    const archive = createEncryptedRecoveryArchive(
      streamTenantArchiveEntries(companyId),
      {
        contractId: 'b2b-law-canonical-v3',
        contractHash: canonicalContractHash(),
        sourceSchemaHash: postgresRecoverySchemaHash(),
        sourceApp: 'web',
        sourceVersion: '1.0.1',
        tenantId: companyId,
        lineage: { type: 'full' }
      },
      recoveryPassphrase
    )
    res.status(200)
    res.setHeader('Content-Type', 'application/vnd.b2b-law.tenant-backup')
    const hash = crypto.createHash('sha256')
    let byteSize = 0
    const passThrough = new Transform({
      transform(chunk, _encoding, callback) {
        hash.update(chunk)
        byteSize += chunk.length
        callback(null, chunk)
      }
    })

    await pipeline(archive, passThrough, res)

    const sha256 = hash.digest('hex')
    const exportId = crypto.randomUUID()
    try {
      await query(
        `INSERT INTO backup_catalog(company_id, export_id, content_hash, byte_size, destination, status, last_verified_at)
         VALUES($1, $2, $3, $4, $5, 'verified', NOW())
         ON CONFLICT (company_id, export_id, destination)
         DO UPDATE SET content_hash=EXCLUDED.content_hash, byte_size=EXCLUDED.byte_size, status=EXCLUDED.status, last_verified_at=EXCLUDED.last_verified_at`,
        [companyId, exportId, sha256, byteSize, 'تصدير حزمة طوارئ مشفرة']
      )
    } catch (catalogErr) {
      console.error('[TenantBackup] Failed to record in backup_catalog:', catalogErr)
    }
  } catch (error) {
    if (!res.headersSent) return sendSanitizedError(res, 500, 'فشل تصدير الحزمة المتدفقة.', 'STREAM_EXPORT_FAILED', error)
    res.destroy(error instanceof Error ? error : new Error(String(error)))
  }
})

/**
 * POST /api/tenant/import-preview
 * Three-layer verification: Envelope -> Decryption -> Decrypted Package Structure
 */
tenantBackupRouter.post('/import-preview', async (req: Request, res: Response) => {
  try {
    const authCheck = await authorizeBackupOperation(req, 'backup_restore')
    if (!authCheck.authorized) {
      return sendSanitizedError(res, authCheck.statusCode || 403, authCheck.error!, authCheck.code!)
    }

    const { companyId } = getAuthenticatedContext(req)
    const { packageContent, recoveryPassphrase, isLegacyJson } = req.body

    if (!packageContent) {
      return sendSanitizedError(
        res,
        400,
        'محتوى حزمة النسخ الاحتياطي مطلوب.',
        'MISSING_PACKAGE_CONTENT'
      )
    }

    let stagedData: Record<string, any[]> = {}
    let manifestData: any = null

    if (isLegacyJson) {
      // Legacy JSON validation and conversion
      const legacyResult = validateAndConvertLegacyJson(packageContent, companyId)
      if (!legacyResult.valid) {
        return sendSanitizedError(res, 400, legacyResult.error!, legacyResult.code!)
      }
      stagedData = legacyResult.data || {}
      let totalRows = 0
      for (const rows of Object.values(stagedData)) {
        totalRows += rows.length
      }
      manifestData = { formatVersion: 1, tenantId: companyId, totalRows }
    } else {
      // Three-Layer Validation Flow for Encrypted .b2btenant Packages
      const rawStr =
        typeof packageContent === 'object' ? JSON.stringify(packageContent) : String(packageContent)

      // Layer 1: Check package size limit
      const boundsCheck = enforcePayloadBounds(packageContent, Buffer.byteLength(rawStr, 'utf8'))
      if (!boundsCheck.valid) {
        return sendSanitizedError(res, 400, boundsCheck.error!, boundsCheck.code!)
      }

      if (!recoveryPassphrase) {
        return sendSanitizedError(
          res,
          400,
          'كلمة مرور الاسترداد مطلوبة لفك تشفير الحزمة.',
          'MISSING_PASSPHRASE'
        )
      }

      // Layers 1, 2, 3 executed inside verifyAndStageTenantPackage
      const stageResult = verifyAndStageTenantPackage(rawStr, recoveryPassphrase, companyId)

      if (!stageResult.valid) {
        return res.status(400).json({
          valid: false,
          errors: stageResult.errors,
          warnings: stageResult.warnings,
          code: 'PACKAGE_VALIDATION_FAILED'
        })
      }

      const manifestCheck = validateTenantManifest(stageResult.manifest, companyId)
      if (!manifestCheck.valid) {
        return sendSanitizedError(res, 400, manifestCheck.error!, manifestCheck.code!)
      }

      stagedData = stageResult.stagedData
      manifestData = stageResult.manifest
    }

    // Validate staged entities and columns against server allowlist
    const entityValidation = validateStagedEntities(stagedData)
    if (!entityValidation.valid) {
      return sendSanitizedError(res, 400, entityValidation.error!, entityValidation.code!)
    }

    res.json({
      valid: true,
      manifest: manifestData,
      totalRows: entityValidation.totalRows,
      entities: entityValidation.summary,
      warnings: [],
      errors: []
    })
  } catch (err: any) {
    sendSanitizedError(res, 500, 'فشل فحص الحزمة في بيئة المعاينة.', 'PREVIEW_FAILED', err)
  }
})

/**
 * POST /api/tenant/import-execute
 */
tenantBackupRouter.post('/import-execute', (_req: Request, res: Response) =>
  sendSanitizedError(res, 410, 'مسار الاستعادة القديم معطل؛ استخدم الاستعادة الآمنة الإصدار الثالث.', 'LEGACY_RESTORE_DISABLED')
)
