import fs from 'fs'
import os from 'os'
import path from 'path'
import { createHash } from 'crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OneDriveIndependentStorage } from '../recovery/oneDriveIndependentStorage'
import { OAuthTokenManager } from '../recovery/oAuthStorageAuth'

const roots: string[] = []
afterEach(() => {
  roots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true }))
  vi.restoreAllMocks()
})

describe('OneDriveIndependentStorage and OAuth management', () => {
  it('refreshes OAuth token when expired and caches active tokens', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'mock-access-token-123', expires_in: 3600 })
    })
    globalThis.fetch = fetchMock as any

    const manager = OAuthTokenManager.createMicrosoftTokenManager('client-id', 'client-secret', 'refresh-token')
    const token1 = await manager.getAccessToken()
    expect(token1).toBe('mock-access-token-123')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // Second call should return cached token without fetch
    const token2 = await manager.getAccessToken()
    expect(token2).toBe('mock-access-token-123')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('uploads, verifies, and downloads a backup using OneDrive Graph API', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'b2b-onedrive-'))
    roots.push(root)
    const sourceFile = path.join(root, 'backup.dump')
    const content = Buffer.from('TEST-ONEDRIVE-BACKUP-PAYLOAD')
    fs.writeFileSync(sourceFile, content)
    const expectedSha256 = createHash('sha256').update(content).digest('hex')

    const fetchMock = vi.fn().mockImplementation(async (url: string, options?: any) => {
      if (typeof url === 'string' && url.includes('/content') && options?.method === 'PUT') {
        return {
          ok: true,
          json: async () => ({ id: 'od-file-id-456' })
        }
      }
      if (typeof url === 'string' && url.includes('/items/od-file-id-456/content')) {
        return {
          ok: true,
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(content)
              controller.close()
            }
          })
        }
      }
      return { ok: false, status: 404 }
    })
    globalThis.fetch = fetchMock as any

    const storage = new OneDriveIndependentStorage({
      folderPath: 'Offices/DR',
      tokenSupplier: async () => 'mock-onedrive-token'
    })

    const uploaded = await storage.putVerified(sourceFile, 'backup.dump', expectedSha256)
    expect(uploaded.id).toBe('od-file-id-456')
    expect(uploaded.sha256).toBe(expectedSha256)
    expect(uploaded.location).toBe('onedrive://Offices/DR/backup.dump')

    const downloadDest = path.join(root, 'downloaded.dump')
    await storage.download('od-file-id-456', downloadDest)
    expect(fs.readFileSync(downloadDest)).toEqual(content)
  })

  it('uploads large artifacts as bounded resumable chunks instead of one full-file request', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'b2b-onedrive-')); roots.push(root)
    const sourceFile = path.join(root, 'large.b2bdr')
    const content = Buffer.alloc(5 * 1024 * 1024, 7); fs.writeFileSync(sourceFile, content)
    const expectedSha256 = createHash('sha256').update(content).digest('hex')
    const ranges: string[] = []
    const chunks: Buffer[] = []
    const fetchMock = vi.fn().mockImplementation(async (url: string, options?: any) => {
      if (url.includes('createUploadSession')) return { ok: true, json: async () => ({ uploadUrl: 'https://upload.test/session' }) }
      if (url === 'https://upload.test/session') {
        ranges.push(options.headers['Content-Range']); chunks.push(Buffer.from(options.body))
        const final = chunks.reduce((total, item) => total + item.length, 0) === content.length
        return { ok: true, status: final ? 201 : 202, json: async () => final ? ({ id: 'large-file-id' }) : ({ nextExpectedRanges: [String(chunks[0].length)] }) }
      }
      if (url.includes('/items/large-file-id/content')) return { ok: true, body: new ReadableStream({ start(controller) { controller.enqueue(content); controller.close() } }) }
      return { ok: false, status: 404 }
    })
    globalThis.fetch = fetchMock as any
    const storage = new OneDriveIndependentStorage({ tokenSupplier: async () => 'token' })
    await expect(storage.putVerified(sourceFile, 'large.b2bdr', expectedSha256)).resolves.toMatchObject({ id: 'large-file-id' })
    expect(ranges).toEqual([
      `bytes 0-${10 * 320 * 1024 - 1}/${content.length}`,
      `bytes ${10 * 320 * 1024}-${content.length - 1}/${content.length}`
    ])
    expect(Buffer.concat(chunks)).toEqual(content)
  })
})
