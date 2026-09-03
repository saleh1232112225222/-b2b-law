import { randomUUID } from 'crypto'
import fs from 'fs'
import path from 'path'
import {
  buildContentAddressedPath,
  MAX_SINGLE_ATTACHMENT_BYTES,
  validateAttachmentStream
} from '../shared/attachmentEngine'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SHA256 = /^[a-f0-9]{64}$/
export const MAX_ATTACHMENT_CHUNK_BYTES = 1024 * 1024

export interface AttachmentUploadSession {
  uploadId: string
  tenantId: string
  attachmentId: string
  sha256: string
  totalBytes: number
  createdAt: string
}

export interface PublishedAttachment {
  attachmentId: string
  tenantId: string
  sha256: string
  byteLength: number
  mime: string
  path: string
  publishedAt: string
}

export class ResumableAttachmentStore {
  private readonly sessionsRoot: string
  private readonly objectsRoot: string
  private readonly catalogRoot: string

  constructor(private readonly root: string) {
    this.sessionsRoot = path.join(root, 'sessions')
    this.objectsRoot = path.join(root, 'objects')
    this.catalogRoot = path.join(root, 'catalog')
    fs.mkdirSync(this.sessionsRoot, { recursive: true, mode: 0o700 })
    fs.mkdirSync(this.objectsRoot, { recursive: true, mode: 0o700 })
    fs.mkdirSync(this.catalogRoot, { recursive: true, mode: 0o700 })
  }

  create(input: Omit<AttachmentUploadSession, 'uploadId' | 'createdAt'>): AttachmentUploadSession {
    if (!UUID.test(input.tenantId) || !UUID.test(input.attachmentId)) throw new Error('ATTACHMENT_IDENTITY_INVALID')
    if (!SHA256.test(input.sha256)) throw new Error('ATTACHMENT_HASH_INVALID')
    if (!Number.isSafeInteger(input.totalBytes) || input.totalBytes < 1 || input.totalBytes > MAX_SINGLE_ATTACHMENT_BYTES) throw new Error('ATTACHMENT_SIZE_EXCEEDED')
    const session = { ...input, uploadId: randomUUID(), createdAt: new Date().toISOString() }
    fs.writeFileSync(this.metadataPath(session.uploadId), JSON.stringify(session), { flag: 'wx', mode: 0o600 })
    const descriptor = fs.openSync(this.partPath(session.uploadId), 'wx', 0o600); fs.closeSync(descriptor)
    return session
  }

  status(uploadId: string, tenantId: string): AttachmentUploadSession & { offset: number; complete: boolean } {
    const session = this.read(uploadId)
    if (session.tenantId !== tenantId) throw new Error('ATTACHMENT_UPLOAD_NOT_FOUND')
    const offset = fs.statSync(this.partPath(uploadId)).size
    return { ...session, offset, complete: offset === session.totalBytes }
  }

  append(uploadId: string, expectedOffset: number, chunk: Buffer, tenantId?: string): { offset: number; complete: boolean } {
    const session = this.read(uploadId)
    if (tenantId && session.tenantId !== tenantId) throw new Error('ATTACHMENT_UPLOAD_NOT_FOUND')
    if (!Buffer.isBuffer(chunk) || chunk.length < 1 || chunk.length > MAX_ATTACHMENT_CHUNK_BYTES) throw new Error('ATTACHMENT_CHUNK_INVALID')
    const part = this.partPath(uploadId)
    const current = fs.statSync(part).size
    if (!Number.isSafeInteger(expectedOffset) || expectedOffset !== current) throw new Error('ATTACHMENT_OFFSET_MISMATCH')
    if (current + chunk.length > session.totalBytes) throw new Error('ATTACHMENT_SIZE_MISMATCH')
    const descriptor = fs.openSync(part, 'r+')
    try { fs.writeSync(descriptor, chunk, 0, chunk.length, current); fs.fsyncSync(descriptor) } finally { fs.closeSync(descriptor) }
    const offset = current + chunk.length
    return { offset, complete: offset === session.totalBytes }
  }

  async complete(uploadId: string, tenantId: string): Promise<{ attachmentId: string; sha256: string; byteLength: number; mime: string; path: string }> {
    const session = this.status(uploadId, tenantId)
    if (!session.complete) throw new Error('ATTACHMENT_UPLOAD_INCOMPLETE')
    const part = this.partPath(uploadId)
    const validation = await validateAttachmentStream(fs.createReadStream(part))
    if (!validation.valid || validation.sha256 !== session.sha256 || validation.byteLength !== session.totalBytes || !validation.detectedMime) throw new Error('ATTACHMENT_INTEGRITY_MISMATCH')
    const finalPath = buildContentAddressedPath(path.join(this.objectsRoot, session.tenantId), session.sha256)
    fs.mkdirSync(path.dirname(finalPath), { recursive: true, mode: 0o700 })
    if (fs.existsSync(finalPath)) {
      if (fs.statSync(finalPath).size !== session.totalBytes) throw new Error('CONTENT_ADDRESS_COLLISION')
      fs.rmSync(part, { force: true })
    } else {
      fs.renameSync(part, finalPath)
    }
    const published: PublishedAttachment = {
      attachmentId: session.attachmentId,
      tenantId: session.tenantId,
      sha256: session.sha256,
      byteLength: session.totalBytes,
      mime: validation.detectedMime,
      path: finalPath,
      publishedAt: new Date().toISOString()
    }
    this.publishCatalog(published)
    fs.rmSync(this.metadataPath(uploadId), { force: true })
    return published
  }

  lookup(attachmentId: string, tenantId: string): PublishedAttachment {
    if (!UUID.test(attachmentId) || !UUID.test(tenantId)) throw new Error('ATTACHMENT_OBJECT_NOT_FOUND')
    try {
      const value = JSON.parse(fs.readFileSync(this.catalogPath(tenantId, attachmentId), 'utf8')) as PublishedAttachment
      if (value.attachmentId !== attachmentId || value.tenantId !== tenantId || !SHA256.test(value.sha256) ||
          !Number.isSafeInteger(value.byteLength) || value.byteLength < 1 || !path.isAbsolute(value.path)) throw new Error()
      const objectRoot = fs.realpathSync.native(this.objectsRoot)
      const realPath = fs.realpathSync.native(value.path)
      const relation = path.relative(objectRoot, realPath)
      if (!relation || relation.startsWith('..') || path.isAbsolute(relation) || fs.statSync(realPath).size !== value.byteLength) throw new Error()
      return { ...value, path: realPath }
    } catch {
      throw new Error('ATTACHMENT_OBJECT_NOT_FOUND')
    }
  }

  private publishCatalog(value: PublishedAttachment): void {
    const directory = path.join(this.catalogRoot, value.tenantId)
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 })
    const target = this.catalogPath(value.tenantId, value.attachmentId)
    const temp = `${target}.${randomUUID()}.tmp`
    const descriptor = fs.openSync(temp, 'wx', 0o600)
    try {
      fs.writeFileSync(descriptor, JSON.stringify(value), 'utf8')
      fs.fsyncSync(descriptor)
    } finally {
      fs.closeSync(descriptor)
    }
    fs.renameSync(temp, target)
  }

  private read(uploadId: string): AttachmentUploadSession {
    if (!UUID.test(uploadId)) throw new Error('ATTACHMENT_UPLOAD_NOT_FOUND')
    try {
      const value = JSON.parse(fs.readFileSync(this.metadataPath(uploadId), 'utf8')) as AttachmentUploadSession
      if (value.uploadId !== uploadId || !UUID.test(value.tenantId) || !UUID.test(value.attachmentId) || !SHA256.test(value.sha256)) throw new Error()
      return value
    } catch { throw new Error('ATTACHMENT_UPLOAD_NOT_FOUND') }
  }

  private metadataPath(id: string): string { return path.join(this.sessionsRoot, `${id}.json`) }
  private partPath(id: string): string { return path.join(this.sessionsRoot, `${id}.part`) }
  private catalogPath(tenantId: string, attachmentId: string): string { return path.join(this.catalogRoot, tenantId, `${attachmentId}.json`) }
}
