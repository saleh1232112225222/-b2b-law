import express, { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { authMiddleware } from '../middleware/auth'
import { requireSyncIdentity } from '../sync/syncPolicy'
import { MAX_ATTACHMENT_CHUNK_BYTES, ResumableAttachmentStore } from '../attachments/resumableAttachmentStore'

export const syncAttachmentsRouter = Router()
syncAttachmentsRouter.use(authMiddleware)

const storageRoot = path.resolve(process.env.ATTACHMENT_STORAGE_ROOT || path.join(process.cwd(), 'uploads', 'sync-attachments'))
const store = new ResumableAttachmentStore(storageRoot)

function errorStatus(code: string): number {
  if (code === 'ATTACHMENT_UPLOAD_NOT_FOUND') return 404
  if (code === 'ATTACHMENT_OBJECT_NOT_FOUND') return 404
  if (code === 'ATTACHMENT_OFFSET_MISMATCH') return 409
  if (code === 'ATTACHMENT_SIZE_EXCEEDED' || code.endsWith('_INVALID') || code.endsWith('_INCOMPLETE') || code.endsWith('_MISMATCH')) return 400
  return 500
}

syncAttachmentsRouter.get('/objects/:attachmentId', (req, res) => {
  let descriptor: number | undefined
  try {
    const { companyId } = requireSyncIdentity(req)
    const object = store.lookup(req.params.attachmentId, companyId)
    const offset = Number(req.header('download-offset') || 0)
    if (!Number.isSafeInteger(offset) || offset < 0 || offset >= object.byteLength) throw new Error('ATTACHMENT_OFFSET_MISMATCH')
    const length = Math.min(MAX_ATTACHMENT_CHUNK_BYTES, object.byteLength - offset)
    const chunk = Buffer.alloc(length)
    descriptor = fs.openSync(object.path, 'r')
    if (fs.readSync(descriptor, chunk, 0, length, offset) !== length) throw new Error('ATTACHMENT_READ_INCOMPLETE')
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Length', String(length))
    res.setHeader('Download-Offset', String(offset + length))
    res.setHeader('Attachment-Total-Bytes', String(object.byteLength))
    res.setHeader('Attachment-Sha256', object.sha256)
    res.send(chunk)
  } catch (error) {
    const code = (error as Error).message; res.status(errorStatus(code)).json({ error: code })
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor)
  }
})

syncAttachmentsRouter.post('/uploads', (req, res) => {
  try {
    const { companyId } = requireSyncIdentity(req)
    const session = store.create({
      tenantId: companyId,
      attachmentId: req.body?.attachmentId,
      sha256: req.body?.sha256,
      totalBytes: req.body?.totalBytes
    })
    res.status(201).json({ uploadId: session.uploadId, offset: 0, chunkSize: MAX_ATTACHMENT_CHUNK_BYTES })
  } catch (error) {
    const code = (error as Error).message; res.status(errorStatus(code)).json({ error: code })
  }
})

syncAttachmentsRouter.get('/uploads/:uploadId', (req, res) => {
  try {
    const { companyId } = requireSyncIdentity(req)
    const status = store.status(req.params.uploadId, companyId)
    res.json({ uploadId: status.uploadId, attachmentId: status.attachmentId, offset: status.offset, totalBytes: status.totalBytes, complete: status.complete })
  } catch (error) {
    const code = (error as Error).message; res.status(errorStatus(code)).json({ error: code })
  }
})

syncAttachmentsRouter.patch('/uploads/:uploadId', express.raw({ type: 'application/octet-stream', limit: MAX_ATTACHMENT_CHUNK_BYTES }), (req, res) => {
  try {
    const { companyId } = requireSyncIdentity(req)
    const offset = Number(req.header('upload-offset'))
    const result = store.append(req.params.uploadId, offset, Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0), companyId)
    res.setHeader('Upload-Offset', String(result.offset)); res.json(result)
  } catch (error) {
    const code = (error as Error).message; res.status(errorStatus(code)).json({ error: code })
  }
})

syncAttachmentsRouter.post('/uploads/:uploadId/complete', async (req, res) => {
  try {
    const { companyId } = requireSyncIdentity(req)
    const result = await store.complete(req.params.uploadId, companyId)
    res.json({ attachmentId: result.attachmentId, sha256: result.sha256, byteLength: result.byteLength, mime: result.mime, status: 'complete' })
  } catch (error) {
    const code = (error as Error).message; res.status(errorStatus(code)).json({ error: code })
  }
})
