/**
 * B2B-LAW Content-Addressed Attachment Engine (Phase R3)
 * Provides cryptographically verified, magic-byte validated, quota-bounded attachment storage.
 * Strictly prevents path traversal attacks, executable payload injection, and storage exhaustion.
 */

import { createHash } from 'crypto'
import * as path from 'path'
import * as fs from 'fs'
import { Readable } from 'stream'
import { once } from 'events'
import { randomUUID } from 'crypto'

export const MAX_SINGLE_ATTACHMENT_BYTES = 50 * 1024 * 1024 // 50 MB
export const MAX_TOTAL_ATTACHMENTS_BYTES = 500 * 1024 * 1024 // 500 MB
export const MAX_ATTACHMENT_COUNT = 1000

export interface AttachmentValidationResult {
  valid: boolean
  sha256?: string
  detectedMime?: string
  byteLength?: number
  error?: string
  code?: string
}

export interface AttachmentQuotaOptions {
  maxCount?: number
  maxTotalBytes?: number
}

/** Tracks package-wide attachment limits; callers must reserve before accepting bytes. */
export class AttachmentQuotaTracker {
  private readonly ids = new Set<string>()
  private totalBytes = 0
  private readonly maxCount: number
  private readonly maxTotalBytes: number

  constructor(options: AttachmentQuotaOptions = {}) {
    this.maxCount = options.maxCount ?? MAX_ATTACHMENT_COUNT
    this.maxTotalBytes = options.maxTotalBytes ?? MAX_TOTAL_ATTACHMENTS_BYTES
  }

  reserve(id: string, byteLength: number): AttachmentValidationResult {
    if (!/^[A-Za-z0-9._-]{1,200}$/.test(id)) {
      return { valid: false, code: 'INVALID_ATTACHMENT_ID', error: 'معرف المرفق غير صالح.' }
    }
    if (!Number.isSafeInteger(byteLength) || byteLength <= 0 || byteLength > MAX_SINGLE_ATTACHMENT_BYTES) {
      return { valid: false, code: 'ATTACHMENT_SIZE_EXCEEDED', error: 'حجم المرفق خارج الحدود الآمنة.' }
    }
    if (this.ids.has(id)) {
      return { valid: false, code: 'DUPLICATE_ATTACHMENT_ID', error: 'معرف المرفق مكرر داخل الحزمة.' }
    }
    if (this.ids.size + 1 > this.maxCount) {
      return { valid: false, code: 'ATTACHMENT_COUNT_EXCEEDED', error: 'عدد المرفقات يتجاوز الحد المسموح.' }
    }
    if (this.totalBytes + byteLength > this.maxTotalBytes) {
      return { valid: false, code: 'TOTAL_ATTACHMENT_SIZE_EXCEEDED', error: 'إجمالي حجم المرفقات يتجاوز الحد المسموح.' }
    }
    this.ids.add(id)
    this.totalBytes += byteLength
    return { valid: true, byteLength }
  }

  snapshot(): { count: number; totalBytes: number } {
    return { count: this.ids.size, totalBytes: this.totalBytes }
  }
}

export interface MagicByteDefinition {
  mime: string
  extension: string
  magicBytes: number[]
  offset?: number
}

// Authoritative allowlist of legal attachment types with magic bytes
export const ALLOWED_ATTACHMENT_TYPES: MagicByteDefinition[] = [
  {
    mime: 'application/pdf',
    extension: '.pdf',
    magicBytes: [0x25, 0x50, 0x44, 0x46] // %PDF
  },
  {
    mime: 'image/png',
    extension: '.png',
    magicBytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] // \x89PNG\r\n\x1a\n
  },
  {
    mime: 'image/jpeg',
    extension: '.jpg',
    magicBytes: [0xff, 0xd8, 0xff] // JPEG SOI marker
  },
  // ZIP-based Office documents are deliberately not classified from the generic
  // PK header. They require a bounded archive inspector before being enabled.
]

/**
 * Sniffs the MIME type of a buffer using strict magic byte checking
 */
export function detectMimeFromMagicBytes(buffer: Buffer): { mime: string; extension: string } | null {
  if (!buffer || buffer.length < 4) return null

  for (const def of ALLOWED_ATTACHMENT_TYPES) {
    const offset = def.offset || 0
    if (buffer.length < offset + def.magicBytes.length) continue

    let match = true
    for (let i = 0; i < def.magicBytes.length; i++) {
      if (buffer[offset + i] !== def.magicBytes[i]) {
        match = false
        break
      }
    }

    if (match) {
      return { mime: def.mime, extension: def.extension }
    }
  }

  return null
}

/**
 * Validates an attachment buffer against quotas, magic bytes, and compute SHA-256
 */
export function validateAttachmentBuffer(buffer: Buffer): AttachmentValidationResult {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    return {
      valid: false,
      error: 'محتوى المرفق غير صالح.',
      code: 'INVALID_ATTACHMENT_BUFFER'
    }
  }

  if (buffer.length === 0) {
    return {
      valid: false,
      error: 'لا يمكن قبول ملف مرفق فارغ (0 بايت).',
      code: 'EMPTY_ATTACHMENT_REJECTED'
    }
  }

  if (buffer.length > MAX_SINGLE_ATTACHMENT_BYTES) {
    return {
      valid: false,
      error: `حجم المرفق (${(buffer.length / (1024 * 1024)).toFixed(1)} ميجابايت) يتجاوز الحد الأقصى المسموح (${MAX_SINGLE_ATTACHMENT_BYTES / (1024 * 1024)} ميجابايت).`,
      code: 'ATTACHMENT_SIZE_EXCEEDED'
    }
  }

  const detected = detectMimeFromMagicBytes(buffer)
  if (!detected) {
    return {
      valid: false,
      error: 'نوع الملف غير مدعوم أو تالف. يسمح حالياً فقط بملفات PDF وصور PNG/JPEG.',
      code: 'UNSUPPORTED_ATTACHMENT_TYPE'
    }
  }

  const sha256 = createHash('sha256').update(buffer).digest('hex')

  return {
    valid: true,
    sha256,
    detectedMime: detected.mime,
    byteLength: buffer.length
  }
}

/**
 * Validates an attachment stream while computing hash and checking quotas
 */
export async function validateAttachmentStream(
  stream: Readable
): Promise<AttachmentValidationResult> {
  return new Promise((resolve) => {
    const hash = createHash('sha256')
    let totalBytes = 0
    let headBuffer = Buffer.alloc(0)
    let errorEmitted = false

    stream.on('data', (chunk: Buffer) => {
      if (errorEmitted) return
      totalBytes += chunk.length

      if (totalBytes > MAX_SINGLE_ATTACHMENT_BYTES) {
        errorEmitted = true
        stream.destroy()
        return resolve({
          valid: false,
          error: `حجم المرفق يتجاوز الحد الأقصى المسموح (${MAX_SINGLE_ATTACHMENT_BYTES / (1024 * 1024)} ميجابايت).`,
          code: 'ATTACHMENT_SIZE_EXCEEDED'
        })
      }

      hash.update(chunk)

      if (headBuffer.length < 32) {
        headBuffer = Buffer.concat([headBuffer, chunk]).subarray(0, 32)
      }
    })

    stream.on('error', (err) => {
      if (!errorEmitted) {
        resolve({
          valid: false,
          error: `خطأ أثناء قراءة المرفق: ${err.message}`,
          code: 'ATTACHMENT_READ_ERROR'
        })
      }
    })

    stream.on('end', () => {
      if (errorEmitted) return

      if (totalBytes === 0) {
        return resolve({
          valid: false,
          error: 'لا يمكن قبول ملف مرفق فارغ (0 بايت).',
          code: 'EMPTY_ATTACHMENT_REJECTED'
        })
      }

      const detected = detectMimeFromMagicBytes(headBuffer)
      if (!detected) {
        return resolve({
          valid: false,
          error: 'نوع الملف غير مدعوم أو تالف.',
          code: 'UNSUPPORTED_ATTACHMENT_TYPE'
        })
      }

      const sha256 = hash.digest('hex')
      resolve({
        valid: true,
        sha256,
        detectedMime: detected.mime,
        byteLength: totalBytes
      })
    })
  })
}

/**
 * Builds a strictly sanitized, content-addressed file path.
 * Guaranteed to prevent path traversal outside storage directory.
 */
export function buildContentAddressedPath(baseDir: string, sha256Hex: string): string {
  // Enforce strictly 64 lowercase hex chars
  if (!/^[a-f0-9]{64}$/.test(sha256Hex)) {
    throw new Error('بصمة المحتوى SHA-256 غير صالحة.')
  }

  // Use 2-level hierarchical sharding (e.g., baseDir/ab/cd/abcdef1234...)
  const shard1 = sha256Hex.slice(0, 2)
  const shard2 = sha256Hex.slice(2, 4)
  const resolvedBase = path.resolve(baseDir)
  const targetPath = path.resolve(resolvedBase, shard1, shard2, sha256Hex)

  // Strict containment verification
  if (!targetPath.startsWith(resolvedBase + path.sep)) {
    throw new Error('تم اكتشاف محاولة اجتياز مسار غير مشروعة (Path Traversal Rejected).')
  }

  return targetPath
}

/** Streams an attachment to a temporary file, verifies size/hash, then atomically publishes it. */
export async function storeVerifiedAttachmentStream(
  baseDir: string,
  stream: Readable,
  expectedSha256: string,
  expectedBytes: number
): Promise<{ path: string; alreadyPresent: boolean }> {
  const finalPath = buildContentAddressedPath(baseDir, expectedSha256)
  if (!Number.isSafeInteger(expectedBytes) || expectedBytes < 1 || expectedBytes > MAX_SINGLE_ATTACHMENT_BYTES) throw new Error('ATTACHMENT_SIZE_EXCEEDED')
  if (fs.existsSync(finalPath)) {
    const existing = fs.statSync(finalPath)
    if (existing.size === expectedBytes && createHash('sha256').update(fs.readFileSync(finalPath)).digest('hex') === expectedSha256) return { path: finalPath, alreadyPresent: true }
    throw new Error('CONTENT_ADDRESS_COLLISION')
  }
  fs.mkdirSync(path.dirname(finalPath), { recursive: true, mode: 0o700 })
  const temporary = `${finalPath}.tmp-${randomUUID()}`
  const output = fs.createWriteStream(temporary, { flags: 'wx', mode: 0o600 })
  const hash = createHash('sha256')
  let bytes = 0
  try {
    for await (const raw of stream) {
      const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw)
      bytes += chunk.length
      if (bytes > expectedBytes || bytes > MAX_SINGLE_ATTACHMENT_BYTES) throw new Error('ATTACHMENT_SIZE_MISMATCH')
      hash.update(chunk)
      if (!output.write(chunk)) await once(output, 'drain')
    }
    output.end(); await once(output, 'close')
    if (bytes !== expectedBytes || hash.digest('hex') !== expectedSha256) throw new Error('ATTACHMENT_INTEGRITY_MISMATCH')
    const handle = fs.openSync(temporary, 'r+'); try { fs.fsyncSync(handle) } finally { fs.closeSync(handle) }
    fs.renameSync(temporary, finalPath)
    return { path: finalPath, alreadyPresent: false }
  } catch (error) {
    output.destroy(); fs.rmSync(temporary, { force: true }); throw error
  }
}
