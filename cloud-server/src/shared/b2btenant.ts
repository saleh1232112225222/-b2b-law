/**
 * B2B-LAW Portable .b2btenant Package Specification (Phase R2)
 * Provides unified cross-machine export, three-layer staging verification, and disaster recovery.
 */

import { createHash } from 'crypto'
import {
  CANONICAL_CONTRACT_REGISTRY,
  getTopologicallySortedContracts,
  getExportableCanonicalEntities
} from './canonicalContract'
import {
  createEncryptedEnvelope,
  decryptEnvelopeWithPassphrase,
  ENVELOPE_SALT_BYTES,
  GCM_IV_BYTES,
  GCM_TAG_BYTES,
  KEY_LEN,
  SCRYPT_N,
  type EncryptedEnvelope
} from './encryption'

export interface TenantPackageManifest {
  formatVersion: number // 2
  contractId: string // 'b2b-law-canonical-v2'
  sourceApp: 'desktop' | 'web'
  sourceVersion: string
  tenantId: string
  exportId: string
  createdAt: string
  entityCounts: Record<string, number>
  entityHashes: Record<string, string> // SHA-256 of JSON canonical records per entity
  attachmentCount: number
  attachmentTotalBytes: number
  attachmentHashes: Record<string, string> // attachmentId -> SHA-256
}

export interface TenantRawPackage {
  manifest: TenantPackageManifest
  data: Record<string, any[]>
  attachments?: Record<string, string> // attachmentId -> base64 payload
}

export interface StagingVerificationResult {
  valid: boolean
  manifest: TenantPackageManifest
  verifiedEntities: string[]
  totalRows: number
  errors: string[]
  warnings: string[]
  stagedData: Record<string, any[]>
}

export const MAX_TOTAL_RECORDS = 100_000
export const MAX_PACKAGE_SIZE_BYTES = 50 * 1024 * 1024
export const MAX_JSON_DEPTH = 3
export const FORBIDDEN_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/** RFC-8785-style deterministic JSON for the JSON value subset used by recovery records. */
export function canonicalizeJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    const encoded = JSON.stringify(value)
    if (encoded === undefined) throw new Error('UNSUPPORTED_CANONICAL_JSON_VALUE')
    return encoded
  }
  if (Array.isArray(value)) return `[${value.map(canonicalizeJson).join(',')}]`
  const objectValue = value as Record<string, unknown>
  return `{${Object.keys(objectValue)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalizeJson(objectValue[key])}`)
    .join(',')}}`
}

export function hasForbiddenKeys(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false
  for (const k of Object.getOwnPropertyNames(obj)) {
    if (FORBIDDEN_OBJECT_KEYS.has(k)) return true
  }
  return false
}

/**
 * Validates maximum number of allowed fields per row
 */
export function validateFieldCountPerRecord(
  row: Record<string, any>,
  maxFields = 100
): { valid: boolean; count: number; error?: string; code?: string } {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    return {
      valid: false,
      count: 0,
      error: 'السجل غير صالح (ليس كائناً).',
      code: 'INVALID_ROW_OBJECT'
    }
  }
  const keys = Object.getOwnPropertyNames(row)
  if (keys.length > maxFields) {
    return {
      valid: false,
      count: keys.length,
      error: `تجاوز الحد الأقصى للحقول المسموحة في السجل الواحد (${keys.length} > ${maxFields}).`,
      code: 'FIELD_COUNT_EXCEEDED'
    }
  }
  return { valid: true, count: keys.length }
}

/**
 * Calculates SHA-256 canonical hash of entity records
 */
export function hashEntityRecords(records: any[]): string {
  const normalized = canonicalizeJson(records)
  return createHash('sha256').update(normalized, 'utf8').digest('hex')
}

/**
 * Layer 1: Validates Encrypted Envelope Structure
 */
export function validateEncryptedEnvelopeStructure(envelope: any): {
  valid: boolean
  error?: string
  code?: string
} {
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    return {
      valid: false,
      error: 'تنسيق الملف غير صالح: الملف ليس كائناً مشفراً.',
      code: 'INVALID_ENVELOPE_ROOT'
    }
  }

  for (const k of Object.getOwnPropertyNames(envelope)) {
    if (FORBIDDEN_OBJECT_KEYS.has(k)) {
      return {
        valid: false,
        error: 'محاولة غير مصرح بها لتلويث الغلاف.',
        code: 'PROTOTYPE_POLLUTION_REJECTED'
      }
    }
  }

  if (typeof envelope.formatVersion !== 'number' || envelope.formatVersion !== 2) {
    return { valid: false, error: 'إصدار التشفير غير مدعوم.', code: 'INVALID_ENVELOPE_VERSION' }
  }

  if (typeof envelope.algorithm !== 'string' || envelope.algorithm !== 'AES-256-GCM') {
    return { valid: false, error: 'خوارزمية التشفير غير معتمدة.', code: 'INVALID_ALGORITHM' }
  }

  if (
    typeof envelope.iv !== 'string' ||
    typeof envelope.tag !== 'string' ||
    typeof envelope.ciphertext !== 'string'
  ) {
    return {
      valid: false,
      error: 'حقول التشفير الأساسية مفقودة (iv, tag, ciphertext).',
      code: 'INVALID_ENVELOPE_FIELDS'
    }
  }

  if (
    !new RegExp(`^[a-f0-9]{${GCM_IV_BYTES * 2}}$`).test(envelope.iv) ||
    !new RegExp(`^[a-f0-9]{${GCM_TAG_BYTES * 2}}$`).test(envelope.tag) ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(envelope.ciphertext)
  ) {
    return {
      valid: false,
      error: 'ترميز حقول التشفير أو أطوالها غير صالح.',
      code: 'INVALID_ENVELOPE_ENCODING'
    }
  }

  if (!envelope.keySlots || !Array.isArray(envelope.keySlots) || envelope.keySlots.length === 0) {
    return {
      valid: false,
      error: 'منافذ مفاتيح التشفير (keySlots) مفقودة أو غير صالحة.',
      code: 'INVALID_KEY_SLOTS'
    }
  }


  if (envelope.keySlots.length < 1 || envelope.keySlots.length > 2) {
    return {
      valid: false,
      error: 'يجب أن تحتوي الحزمة المحمولة على منفذ استرداد، وبحد أقصى منفذ أتمتة إضافي.',
      code: 'INVALID_KEY_SLOT_COUNT'
    }
  }
  const slot = envelope.keySlots.find((candidate: { type?: string }) => candidate.type === 'recovery_passphrase')
  if (!slot) return { valid: false, error: 'منفذ الاسترداد الإلزامي مفقود.', code: 'MISSING_RECOVERY_SLOT' }
  if (
    !slot ||
    slot.type !== 'recovery_passphrase' ||
    slot.kdf !== 'scrypt' ||
    slot.iterations !== SCRYPT_N ||
    slot.keyLength !== KEY_LEN ||
    typeof slot.salt !== 'string' ||
    !new RegExp(`^[a-f0-9]{${ENVELOPE_SALT_BYTES * 2}}$`).test(slot.salt) ||
    typeof slot.iv !== 'string' ||
    !new RegExp(`^[a-f0-9]{${GCM_IV_BYTES * 2}}$`).test(slot.iv) ||
    typeof slot.tag !== 'string' ||
    !new RegExp(`^[a-f0-9]{${GCM_TAG_BYTES * 2}}$`).test(slot.tag) ||
    typeof slot.encryptedDek !== 'string' ||
    !new RegExp(`^[a-f0-9]{${KEY_LEN * 2}}$`).test(slot.encryptedDek)
  ) {
    return {
      valid: false,
      error: 'بيانات منفذ مفتاح الاسترداد غير صالحة أو غير مدعومة.',
      code: 'INVALID_RECOVERY_KEY_SLOT'
    }
  }

  return { valid: true }
}

/**
 * Layer 3: Validates Decrypted Package Structure before dereferencing
 */
export function validateDecryptedPackageStructure(payload: any): {
  valid: boolean
  error?: string
  code?: string
} {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      valid: false,
      error: 'محتوى الحزمة المفكوكة غير صالح (ليس كائناً).',
      code: 'INVALID_PACKAGE_ROOT'
    }
  }

  for (const k of Object.getOwnPropertyNames(payload)) {
    if (FORBIDDEN_OBJECT_KEYS.has(k)) {
      return {
        valid: false,
        error: 'محاولة غير مصرح بها لتلويث الكائن الأساسي.',
        code: 'PROTOTYPE_POLLUTION_REJECTED'
      }
    }
  }

  if (
    !payload.manifest ||
    typeof payload.manifest !== 'object' ||
    Array.isArray(payload.manifest)
  ) {
    return {
      valid: false,
      error: 'بيان الحزمة (manifest) مفقود أو غير صالح.',
      code: 'INVALID_MANIFEST_STRUCTURE'
    }
  }

  for (const k of Object.getOwnPropertyNames(payload.manifest)) {
    if (FORBIDDEN_OBJECT_KEYS.has(k)) {
      return {
        valid: false,
        error: 'حقل غير مصرح به في البيان.',
        code: 'PROTOTYPE_POLLUTION_REJECTED'
      }
    }
  }

  if (typeof payload.manifest.tenantId !== 'string' || !payload.manifest.tenantId.trim()) {
    return {
      valid: false,
      error: 'معرف المكتب (tenantId) مفقود في البيان.',
      code: 'MISSING_TENANT_ID'
    }
  }

  if (!payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) {
    return {
      valid: false,
      error: 'كتلة البيانات (data) مفقودة أو غير صالحة.',
      code: 'INVALID_DATA_BLOCK'
    }
  }

  for (const [entityName, rows] of Object.entries(payload.data)) {
    if (FORBIDDEN_OBJECT_KEYS.has(entityName)) {
      return { valid: false, error: 'اسم كيان غير مصرح به.', code: 'PROTOTYPE_POLLUTION_REJECTED' }
    }

    if (!Array.isArray(rows)) {
      return {
        valid: false,
        error: `بيانات الكيان [${entityName}] يجب أن تكون مصفوفة سجلات.`,
        code: 'INVALID_ENTITY_ARRAY'
      }
    }

    for (const row of rows) {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        return {
          valid: false,
          error: `سجل غير صالح في الكيان [${entityName}] (يجب أن يكون كائناً).`,
          code: 'INVALID_ROW_OBJECT'
        }
      }

      for (const rk of Object.getOwnPropertyNames(row)) {
        if (FORBIDDEN_OBJECT_KEYS.has(rk)) {
          return {
            valid: false,
            error: 'حقل غير مصرح به في السجل.',
            code: 'PROTOTYPE_POLLUTION_REJECTED'
          }
        }
      }

      const fieldRes = validateFieldCountPerRecord(row)
      if (!fieldRes.valid) {
        return fieldRes
      }
    }
  }

  // Reject non-empty attachments in R2
  if (payload.attachments !== undefined && payload.attachments !== null) {
    if (typeof payload.attachments !== 'object' || Array.isArray(payload.attachments)) {
      return { valid: false, error: 'هيكل المرفقات غير صالح.', code: 'INVALID_ATTACHMENTS_BLOCK' }
    }
    if (Object.keys(payload.attachments).length > 0) {
      return {
        valid: false,
        error:
          'استعادة المرفقات معطلة أمنياً في المرحلة الحالية R2 لحين تطبيق نظام التدفق المقيد R3.',
        code: 'ATTACHMENTS_UNSUPPORTED_IN_R2'
      }
    }
  }

  return { valid: true }
}

/**
 * Builds and encrypts a complete .b2btenant package
 */
export function createTenantPackage(
  tenantId: string,
  data: Record<string, any[]>,
  sourceApp: 'desktop' | 'web',
  recoveryPassphrase: string,
  attachments: Record<string, Buffer | string> = {},
  automationMasterKey?: Buffer
): string {
  if (sourceApp !== 'desktop' && sourceApp !== 'web') {
    throw new Error(
      `UNSUPPORTED_SOURCE_APP: Source platform "${sourceApp}" is unknown or unsupported.`
    )
  }

  const sortedContracts = getTopologicallySortedContracts()
  const exportable = getExportableCanonicalEntities().map((e) => e.canonicalName)

  const entityCounts: Record<string, number> = {}
  const entityHashes: Record<string, string> = {}
  const sanitizedData: Record<string, any[]> = {}

  for (const contract of sortedContracts) {
    const name = contract.canonicalName
    if (!exportable.includes(name)) continue

    const binding = sourceApp === 'web' ? contract.pgBinding : contract.sqliteBinding
    if (!binding) continue

    const rows = (data[name] || []).filter((r) => {
      if (name === 'companies') return r.id === tenantId
      return contract.tenantOwnershipPolicy !== 'company_id_required' || r.company_id === tenantId
    })

    // Strict positive projection: only include columns explicitly in binding.allowedExportColumns
    const allowedSet = new Set(binding.allowedExportColumns)
    const filteredRows = rows.map((row) => {
      const cleanRow: Record<string, any> = {}
      for (const [k, v] of Object.entries(row)) {
        if (allowedSet.has(k) && !FORBIDDEN_OBJECT_KEYS.has(k)) {
          cleanRow[k] = v
        }
      }
      return cleanRow
    })

    sanitizedData[name] = filteredRows
    entityCounts[name] = filteredRows.length
    entityHashes[name] = hashEntityRecords(filteredRows)
  }

  // Process attachments
  const attachmentHashes: Record<string, string> = {}
  const attachmentPayloads: Record<string, string> = {}
  let totalBytes = 0

  for (const [attId, blob] of Object.entries(attachments)) {
    const buf = Buffer.isBuffer(blob) ? blob : Buffer.from(blob, 'base64')
    const hash = createHash('sha256').update(buf).digest('hex')
    attachmentHashes[attId] = hash
    attachmentPayloads[attId] = buf.toString('base64')
    totalBytes += buf.length
  }

  const manifest: TenantPackageManifest = {
    formatVersion: 2,
    contractId: 'b2b-law-canonical-v2',
    sourceApp,
    sourceVersion: '1.0.1',
    tenantId,
    exportId: `EXP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    entityCounts,
    entityHashes,
    attachmentCount: Object.keys(attachments).length,
    attachmentTotalBytes: totalBytes,
    attachmentHashes
  }

  const rawPackage: TenantRawPackage = {
    manifest,
    data: sanitizedData,
    attachments: attachmentPayloads
  }

  const packageJson = JSON.stringify(rawPackage)
  const envelope = createEncryptedEnvelope(packageJson, recoveryPassphrase, automationMasterKey)
  return JSON.stringify(envelope, null, 2)
}

/**
 * Decrypts and performs three-layer Staging Verification on a .b2btenant package
 */
export function verifyAndStageTenantPackage(
  packageFileContent: string,
  recoveryPassphrase: string,
  targetTenantId?: string
): StagingVerificationResult {
  const errors: string[] = []
  const warnings: string[] = []

  let envelope: EncryptedEnvelope
  try {
    envelope = JSON.parse(packageFileContent)
  } catch (err) {
    return {
      valid: false,
      manifest: {} as any,
      verifiedEntities: [],
      totalRows: 0,
      errors: ['تنسيق الملف غير صالح: الملف ليس كائناً مشفراً بصيغة JSON.'],
      warnings: [],
      stagedData: {}
    }
  }

  // Layer 1: Validate Encrypted Envelope Structure
  const envelopeValidation = validateEncryptedEnvelopeStructure(envelope)
  if (!envelopeValidation.valid) {
    return {
      valid: false,
      manifest: {} as any,
      verifiedEntities: [],
      totalRows: 0,
      errors: [envelopeValidation.error || 'غلاف التشفير غير صالح.'],
      warnings: [],
      stagedData: {}
    }
  }

  // Layer 2: Authenticated Decryption
  let decryptedBuffer: Buffer
  try {
    decryptedBuffer = decryptEnvelopeWithPassphrase(envelope, recoveryPassphrase)
  } catch (err: any) {
    return {
      valid: false,
      manifest: {} as any,
      verifiedEntities: [],
      totalRows: 0,
      errors: [
        err.message || 'فشل فك تشفير حزمة الاسترداد (كلمة المرور غير صحيحة أو البيانات تالفة).'
      ],
      warnings: [],
      stagedData: {}
    }
  }

  // Layer 3: Parse and Validate Decrypted Package Structure
  let rawPackage: TenantRawPackage
  try {
    rawPackage = JSON.parse(decryptedBuffer.toString('utf8'))
  } catch (err) {
    return {
      valid: false,
      manifest: {} as any,
      verifiedEntities: [],
      totalRows: 0,
      errors: ['فشل قراءة محتوى الحزمة المفكوكة (JSON تالف).'],
      warnings: [],
      stagedData: {}
    }
  }

  const structureValidation = validateDecryptedPackageStructure(rawPackage)
  if (!structureValidation.valid) {
    return {
      valid: false,
      manifest: {} as any,
      verifiedEntities: [],
      totalRows: 0,
      errors: [structureValidation.error || 'هيكل الحزمة المفكوكة غير صالح.'],
      warnings: [],
      stagedData: {}
    }
  }

  const { manifest, data, attachments = {} } = rawPackage

  if (manifest.formatVersion !== 2 || manifest.contractId !== 'b2b-law-canonical-v2') {
    errors.push('إصدار الحزمة أو معرف العقد (Contract ID) غير متوافق مع هذا النظام.')
  }

  if (targetTenantId && manifest.tenantId !== targetTenantId) {
    errors.push('معرف المكتب في الحزمة لا يطابق المكتب المصادق عليه.')
  }

  let totalRows = 0
  const verifiedEntities: string[] = []

  // Verify Entity Counts & Hashes
  for (const [entityName, expectedHash] of Object.entries(manifest.entityHashes || {})) {
    const rows = data[entityName] || []
    const actualHash = hashEntityRecords(rows)

    if (actualHash !== expectedHash) {
      errors.push(
        `فشل فحص سلامة البيانات للجدول [${entityName}]: البصمة المحسوبة لا تطابق بصمة البيان الأصلي.`
      )
    }

    if (rows.length !== (manifest.entityCounts[entityName] ?? 0)) {
      errors.push(
        `تفاوت في عدد السجلات للجدول [${entityName}]: المتوقع ${manifest.entityCounts[entityName]}، والموجود ${rows.length}.`
      )
    }

    totalRows += rows.length
    verifiedEntities.push(entityName)
  }

  const manifestEntities = Object.keys(manifest.entityHashes || {}).sort()
  const countEntities = Object.keys(manifest.entityCounts || {}).sort()
  const dataEntities = Object.keys(data).sort()
  if (canonicalizeJson(manifestEntities) !== canonicalizeJson(countEntities)) {
    errors.push('قائمة الكيانات في بصمات البيان لا تطابق قائمة أعداد السجلات.')
  }
  if (canonicalizeJson(manifestEntities) !== canonicalizeJson(dataEntities)) {
    errors.push('قائمة الكيانات في البيان لا تطابق كيانات البيانات الفعلية.')
  }

  return {
    valid: errors.length === 0,
    manifest,
    verifiedEntities,
    totalRows,
    errors,
    warnings,
    stagedData: data
  }
}

/**
 * Dedicated Validator & Adapter for Legacy Plaintext JSON Backups.
 * Fails closed on malformed entity structures or invalid rows.
 */
export function validateAndConvertLegacyJson(
  input: any,
  tenantId: string
): {
  valid: boolean
  data?: Record<string, any[]>
  error?: string
  code?: string
  warnings?: string[]
} {
  let rawJson = input
  if (typeof input === 'string') {
    if (
      input.includes('__proto__') ||
      input.includes('constructor') ||
      input.includes('prototype')
    ) {
      return {
        valid: false,
        error: 'تم رفض النسخة لاحتوائها على مفاتيح غير آمنة (__proto__ / constructor).',
        code: 'PROTOTYPE_POLLUTION_REJECTED'
      }
    }
    try {
      rawJson = JSON.parse(input)
    } catch {
      return {
        valid: false,
        error: 'ملف النسخة الاحتياطية القديمة ليس بصيغة JSON صالحة.',
        code: 'INVALID_LEGACY_JSON_SYNTAX'
      }
    }
  }

  if (!rawJson || typeof rawJson !== 'object' || Array.isArray(rawJson)) {
    return {
      valid: false,
      error: 'هيكل ملف النسخة الاحتياطية القديمة غير صالح (يجب أن يكون كائناً).',
      code: 'INVALID_LEGACY_JSON_ROOT'
    }
  }

  // Reject prototype pollution
  if (hasForbiddenKeys(rawJson)) {
    return {
      valid: false,
      error: 'تم رفض النسخة لاحتوائها على مفاتيح غير آمنة (__proto__ / constructor).',
      code: 'PROTOTYPE_POLLUTION_REJECTED'
    }
  }

  const rawTables = rawJson.tables || rawJson.data || rawJson
  if (!rawTables || typeof rawTables !== 'object' || Array.isArray(rawTables)) {
    return {
      valid: false,
      error: 'لا يحتوي ملف النسخة القديمة على كتلة بيانات الجداول (tables أو data).',
      code: 'INVALID_LEGACY_DATA_BLOCK'
    }
  }

  const canonicalData: Record<string, any[]> = {}
  const warnings: string[] = []
  let totalRows = 0

  for (const [name, rows] of Object.entries(rawTables)) {
    if (name === 'version' || name === 'manifest' || name === 'meta') continue

    if (!Array.isArray(rows)) {
      return {
        valid: false,
        error: `الكيان "${name}" في النسخة القديمة ليس مصفوفة سجلات صالحة.`,
        code: 'INVALID_LEGACY_ENTITY_ARRAY'
      }
    }

    const contract = CANONICAL_CONTRACT_REGISTRY[name]
    if (!contract) {
      warnings.push(`الكيان القديم "${name}" غير مسجل في العقد القياسي وسيتم استبعاده.`)
      continue
    }

    if (contract.restorePolicy === 'no_restore') {
      warnings.push(`الكيان "${name}" مستبعد من الاستعادة لأسباب أمنية.`)
      continue
    }

    const binding = contract.sqliteBinding || contract.pgBinding
    const allowedSet = new Set(binding ? binding.allowedExportColumns : [])
    const cleanRows: any[] = []

    for (let idx = 0; idx < rows.length; idx++) {
      const row = rows[idx]
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        return {
          valid: false,
          error: `السجل رقم ${idx + 1} في الكيان "${name}" ليس كائناً صالحاً.`,
          code: 'INVALID_LEGACY_ROW_STRUCTURE'
        }
      }

      if (hasForbiddenKeys(row)) {
        return {
          valid: false,
          error: `السجل رقم ${idx + 1} في الكيان "${name}" يحتوي على مفاتيح غير آمنة.`,
          code: 'PROTOTYPE_POLLUTION_REJECTED'
        }
      }

      const fieldBound = validateFieldCountPerRecord(row)
      if (!fieldBound.valid) {
        return {
          valid: false,
          error: `السجل رقم ${idx + 1} في الكيان "${name}" يتجاوز الحد الأقصى للحقول (${fieldBound.count}/100).`,
          code: 'FIELD_COUNT_EXCEEDED'
        }
      }

      // Positive projection
      const cleanRow: Record<string, any> = {}
      for (const col of Object.keys(row)) {
        if (allowedSet.has(col)) {
          cleanRow[col] = row[col]
        }
      }

      // Ensure tenant ownership
      if (contract.tenantOwnershipPolicy === 'company_id_required') {
        cleanRow.company_id = tenantId
      }

      cleanRows.push(cleanRow)
      totalRows++
      if (totalRows > MAX_TOTAL_RECORDS) {
        return {
          valid: false,
          error: `إجمالي عدد السجلات في النسخة القديمة يتجاوز الحد المسموح به (${MAX_TOTAL_RECORDS.toLocaleString()}).`,
          code: 'RECORD_LIMIT_EXCEEDED'
        }
      }
    }

    if (cleanRows.length > 0) {
      canonicalData[name] = cleanRows
    }
  }

  return { valid: true, data: canonicalData, warnings }
}

/**
 * Legacy Adapter backward compatibility wrapper
 */
export function convertLegacyV1JsonToCanonical(
  v1Json: any,
  tenantId: string
): Record<string, any[]> {
  const res = validateAndConvertLegacyJson(v1Json, tenantId)
  return res.data || {}
}
