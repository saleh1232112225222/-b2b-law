import { createHash } from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { ResumableAttachmentStore } from '../attachments/resumableAttachmentStore'

const roots: string[] = []
afterEach(() => roots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true })))

describe('resumable attachment storage', () => {
  it('resumes after process recreation and atomically publishes only a verified file', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'b2b-resumable-')); roots.push(root)
    const bytes = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(100_000, 7)])
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    const first = new ResumableAttachmentStore(root)
    const session = first.create({
      tenantId: '11111111-1111-4111-8111-111111111111',
      attachmentId: '22222222-2222-4222-8222-222222222222',
      sha256, totalBytes: bytes.length
    })
    expect(first.append(session.uploadId, 0, bytes.subarray(0, 40_000))).toMatchObject({ offset: 40_000, complete: false })

    const afterRestart = new ResumableAttachmentStore(root)
    expect(afterRestart.status(session.uploadId, session.tenantId).offset).toBe(40_000)
    afterRestart.append(session.uploadId, 40_000, bytes.subarray(40_000))
    const completed = await afterRestart.complete(session.uploadId, session.tenantId)
    expect(completed.sha256).toBe(sha256)
    expect(fs.readFileSync(completed.path)).toEqual(bytes)
    expect(fs.existsSync(path.join(root, 'sessions', `${session.uploadId}.part`))).toBe(false)
    const published = new ResumableAttachmentStore(root).lookup(session.attachmentId, session.tenantId)
    expect(published).toMatchObject({ sha256, byteLength: bytes.length, attachmentId: session.attachmentId })
    expect(fs.readFileSync(published.path)).toEqual(bytes)
  })

  it('rejects offset mismatch and cross-tenant status access', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'b2b-resumable-')); roots.push(root)
    const bytes = Buffer.from('%PDF-test')
    const store = new ResumableAttachmentStore(root)
    const session = store.create({ tenantId: '11111111-1111-4111-8111-111111111111', attachmentId: '22222222-2222-4222-8222-222222222222', sha256: createHash('sha256').update(bytes).digest('hex'), totalBytes: bytes.length })
    expect(() => store.append(session.uploadId, 1, bytes)).toThrow('ATTACHMENT_OFFSET_MISMATCH')
    expect(() => store.status(session.uploadId, '33333333-3333-4333-8333-333333333333')).toThrow('ATTACHMENT_UPLOAD_NOT_FOUND')
    expect(() => store.lookup(session.attachmentId, '33333333-3333-4333-8333-333333333333')).toThrow('ATTACHMENT_OBJECT_NOT_FOUND')
  })
})
