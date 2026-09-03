/**
 * Test Suite: Content-Addressed Attachment Engine (Phase R3)
 */

import { describe, it, expect } from 'vitest'
import { Readable } from 'stream'
import {
  detectMimeFromMagicBytes,
  validateAttachmentBuffer,
  validateAttachmentStream,
  buildContentAddressedPath,
  AttachmentQuotaTracker,
  MAX_SINGLE_ATTACHMENT_BYTES,
  MAX_TOTAL_ATTACHMENTS_BYTES,
  MAX_ATTACHMENT_COUNT
  ,storeVerifiedAttachmentStream
} from '../../../../src/shared/attachmentEngine'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import { createHash } from 'crypto'

describe('Content-Addressed Attachment Engine (Phase R3)', () => {
  it('1. Correctly detects magic bytes for PDF, PNG, and JPEG', () => {
    const pdfBuf = Buffer.from('%PDF-1.7 standard document', 'utf8')
    const pngBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])
    const jpgBuf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])

    expect(detectMimeFromMagicBytes(pdfBuf)?.mime).toBe('application/pdf')
    expect(detectMimeFromMagicBytes(pngBuf)?.mime).toBe('image/png')
    expect(detectMimeFromMagicBytes(jpgBuf)?.mime).toBe('image/jpeg')
  })

  it('2. Rejects executable payload disguised as PDF or document', () => {
    // Windows PE EXE magic bytes MZ (\x4D\x5A)
    const exeBuf = Buffer.from('MZ\x90\x00\x03\x00\x00\x00', 'binary')
    const result = validateAttachmentBuffer(exeBuf)

    expect(result.valid).toBe(false)
    expect(result.code).toBe('UNSUPPORTED_ATTACHMENT_TYPE')
  })

  it('3. Rejects empty attachments (0 bytes)', () => {
    const emptyBuf = Buffer.alloc(0)
    const result = validateAttachmentBuffer(emptyBuf)

    expect(result.valid).toBe(false)
    expect(result.code).toBe('EMPTY_ATTACHMENT_REJECTED')
  })

  it('4. Rejects attachments exceeding single file size quota', () => {
    const fakeLargeBuf = Buffer.alloc(MAX_SINGLE_ATTACHMENT_BYTES + 1024)
    // Put valid PDF magic bytes at the start
    fakeLargeBuf.write('%PDF-1.5', 0)

    const result = validateAttachmentBuffer(fakeLargeBuf)
    expect(result.valid).toBe(false)
    expect(result.code).toBe('ATTACHMENT_SIZE_EXCEEDED')
  })

  it('5. Validates attachment stream and computes accurate SHA-256 hash', async () => {
    const content = Buffer.from('%PDF-1.4 Legal Contract Document Data', 'utf8')
    const stream = Readable.from([content])

    const result = await validateAttachmentStream(stream)
    expect(result.valid).toBe(true)
    expect(result.detectedMime).toBe('application/pdf')
    expect(result.sha256).toBeDefined()
    expect(result.sha256?.length).toBe(64)
  })

  it('6. Strictly prevents path traversal attacks and builds sharded path', () => {
    const baseDir = path.resolve('/var/data/b2b/attachments')
    const validSha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'

    const targetPath = buildContentAddressedPath(baseDir, validSha256)
    expect(targetPath).toContain(path.join(baseDir, 'e3', 'b0', validSha256))

    // Reject path traversal via invalid sha
    expect(() => {
      buildContentAddressedPath(baseDir, '../../etc/passwd')
    }).toThrow(/بصمة المحتوى SHA-256 غير صالحة/)

    expect(() => {
      buildContentAddressedPath(baseDir, 'invalid-hex-characters-here!')
    }).toThrow(/بصمة المحتوى SHA-256 غير صالحة/)
  })

  it('7. Does not classify an arbitrary ZIP header as DOCX or XLSX', () => {
    const genericZip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0, 0, 0])
    expect(validateAttachmentBuffer(genericZip).valid).toBe(false)
  })

  it('8. Enforces attachment count, total bytes, and duplicate-id limits cumulatively', () => {
    const tracker = new AttachmentQuotaTracker({ maxCount: 2, maxTotalBytes: 10 })
    expect(tracker.reserve('a', 4).valid).toBe(true)
    expect(tracker.reserve('a', 1).code).toBe('DUPLICATE_ATTACHMENT_ID')
    expect(tracker.reserve('b', 6).valid).toBe(true)
    expect(tracker.reserve('c', 1).code).toBe('ATTACHMENT_COUNT_EXCEEDED')

    const totalTracker = new AttachmentQuotaTracker({ maxCount: 3, maxTotalBytes: 5 })
    expect(totalTracker.reserve('a', 5).valid).toBe(true)
    expect(totalTracker.reserve('b', 1).code).toBe('TOTAL_ATTACHMENT_SIZE_EXCEEDED')
    expect(MAX_TOTAL_ATTACHMENTS_BYTES).toBeGreaterThan(MAX_SINGLE_ATTACHMENT_BYTES)
    expect(MAX_ATTACHMENT_COUNT).toBeGreaterThan(0)
  })

  it('9. publishes verified bytes atomically and removes a corrupt temporary download', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'attachment-store-'))
    try {
      const content = Buffer.from('%PDF verified attachment')
      const hash = createHash('sha256').update(content).digest('hex')
      const stored = await storeVerifiedAttachmentStream(root, Readable.from(content), hash, content.length)
      expect(fs.readFileSync(stored.path)).toEqual(content)
      await expect(storeVerifiedAttachmentStream(root, Readable.from(Buffer.from('wrong')), '0'.repeat(64), 5)).rejects.toThrow('ATTACHMENT_INTEGRITY_MISMATCH')
      expect(fs.readdirSync(path.join(root, '00', '00'))).toEqual([])
    } finally { fs.rmSync(root, { recursive: true, force: true }) }
  })
})
