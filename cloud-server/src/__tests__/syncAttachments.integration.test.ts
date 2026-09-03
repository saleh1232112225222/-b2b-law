import { createHash } from 'crypto'
import fs from 'fs'
import http from 'http'
import os from 'os'
import path from 'path'
import express from 'express'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../middleware/auth', () => ({
  authMiddleware: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.auth = {
      companyId: String(req.header('x-test-tenant') || '11111111-1111-4111-8111-111111111111'),
      userId: '99999999-9999-4999-8999-999999999999', username: 'integration', roleKey: 'admin'
    }
    next()
  }
}))

const roots: string[] = []
afterEach(() => {
  delete process.env.ATTACHMENT_STORAGE_ROOT
  roots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true }))
  vi.resetModules()
})

describe('resumable attachment HTTP integration', () => {
  it('resumes an interrupted upload, publishes by hash, downloads, and hides it from another tenant', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'b2b-attachment-http-')); roots.push(root)
    process.env.ATTACHMENT_STORAGE_ROOT = root
    const { syncAttachmentsRouter } = await import('../routes/syncAttachments')
    const app = express(); app.use(express.json()); app.use('/api/sync/attachments', syncAttachmentsRouter)
    const server = http.createServer(app)
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('TEST_SERVER_ADDRESS_INVALID')
    const base = `http://127.0.0.1:${address.port}/api/sync/attachments`
    const tenant = '11111111-1111-4111-8111-111111111111'
    const attachmentId = '22222222-2222-4222-8222-222222222222'
    const bytes = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(70_000, 4)])
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    try {
      const created = await fetch(`${base}/uploads`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-test-tenant': tenant }, body: JSON.stringify({ attachmentId, sha256, totalBytes: bytes.length }) })
      expect(created.status).toBe(201)
      const { uploadId } = await created.json() as { uploadId: string }
      const first = await fetch(`${base}/uploads/${uploadId}`, { method: 'PATCH', headers: { 'content-type': 'application/octet-stream', 'upload-offset': '0', 'x-test-tenant': tenant }, body: bytes.subarray(0, 40_000) })
      expect(await first.json()).toMatchObject({ offset: 40_000, complete: false })
      const resumed = await fetch(`${base}/uploads/${uploadId}`, { headers: { 'x-test-tenant': tenant } })
      expect(await resumed.json()).toMatchObject({ offset: 40_000, totalBytes: bytes.length })
      const second = await fetch(`${base}/uploads/${uploadId}`, { method: 'PATCH', headers: { 'content-type': 'application/octet-stream', 'upload-offset': '40000', 'x-test-tenant': tenant }, body: bytes.subarray(40_000) })
      expect(await second.json()).toMatchObject({ offset: bytes.length, complete: true })
      const complete = await fetch(`${base}/uploads/${uploadId}/complete`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-test-tenant': tenant }, body: '{}' })
      expect(await complete.json()).toMatchObject({ attachmentId, sha256, byteLength: bytes.length, status: 'complete' })
      const downloaded = await fetch(`${base}/objects/${attachmentId}`, { headers: { 'download-offset': '0', 'x-test-tenant': tenant } })
      expect(downloaded.headers.get('attachment-sha256')).toBe(sha256)
      expect(Buffer.from(await downloaded.arrayBuffer())).toEqual(bytes)
      const denied = await fetch(`${base}/objects/${attachmentId}`, { headers: { 'x-test-tenant': '33333333-3333-4333-8333-333333333333' } })
      expect(denied.status).toBe(404)
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    }
  }, 30_000)
})
