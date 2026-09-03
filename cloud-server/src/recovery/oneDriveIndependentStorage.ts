import fs from 'fs'
import path from 'path'
import { createHash, randomUUID } from 'crypto'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import type { IndependentBackupObject, IndependentBackupStorage } from './independentStorage'

export interface OneDriveStorageOptions {
  folderPath?: string
  driveId?: string
  tokenSupplier: () => Promise<string>
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256')
  const input = fs.createReadStream(filePath)
  input.on('data', (chunk) => hash.update(chunk))
  await new Promise<void>((resolve, reject) => {
    input.once('end', resolve)
    input.once('error', reject)
  })
  return hash.digest('hex')
}

export class OneDriveIndependentStorage implements IndependentBackupStorage {
  private readonly folderPath: string
  private readonly driveId?: string
  private readonly tokenSupplier: () => Promise<string>

  constructor(options: OneDriveStorageOptions) {
    this.folderPath = (options.folderPath || 'B2B-Backups').replace(/^\/+|\/+$/g, '')
    this.driveId = options.driveId
    this.tokenSupplier = options.tokenSupplier
  }

  private async token(): Promise<string> {
    const token = await this.tokenSupplier()
    if (!token) throw new Error('ONEDRIVE_AUTH_FAILED')
    return token
  }

  private baseUrl(): string {
    return this.driveId
      ? `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(this.driveId)}`
      : 'https://graph.microsoft.com/v1.0/me/drive'
  }

  async putVerified(sourcePath: string, objectName: string, expectedSha256: string): Promise<IndependentBackupObject> {
    const token = await this.token()
    const safeName = path.basename(objectName).replace(/[^A-Za-z0-9._-]/g, '_')
    const fileSize = fs.statSync(sourcePath).size
    let fileId: string

    if (fileSize <= 4 * 1024 * 1024) {
      // Direct upload for smaller artifacts
      const uploadUrl = `${this.baseUrl()}/root:/${encodeURIComponent(this.folderPath)}/${encodeURIComponent(safeName)}:/content`
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream'
        },
        body: fs.readFileSync(sourcePath)
      })
      if (!res.ok) throw new Error(`ONEDRIVE_UPLOAD_FAILED:${res.status}`)
      const data = (await res.json()) as { id?: string }
      if (!data.id) throw new Error('ONEDRIVE_FILE_ID_MISSING')
      fileId = data.id
    } else {
      // Resumable upload session for large backups
      const sessionUrl = `${this.baseUrl()}/root:/${encodeURIComponent(this.folderPath)}/${encodeURIComponent(safeName)}:/createUploadSession`
      const sessionRes = await fetch(sessionUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          item: { '@microsoft.graph.conflictBehavior': 'replace', name: safeName }
        })
      })
      if (!sessionRes.ok) throw new Error(`ONEDRIVE_UPLOAD_SESSION_FAILED:${sessionRes.status}`)
      const sessionData = (await sessionRes.json()) as { uploadUrl?: string }
      if (!sessionData.uploadUrl) throw new Error('ONEDRIVE_SESSION_URL_MISSING')

      const chunkBytes = 10 * 320 * 1024
      const descriptor = fs.openSync(sourcePath, 'r')
      let offset = 0
      let uploadedId: string | undefined
      try {
        while (offset < fileSize) {
          const length = Math.min(chunkBytes, fileSize - offset)
          const chunk = Buffer.alloc(length)
          if (fs.readSync(descriptor, chunk, 0, length, offset) !== length) throw new Error('ONEDRIVE_LOCAL_READ_INCOMPLETE')
          const end = offset + length - 1
          const uploadRes = await fetch(sessionData.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Length': String(length), 'Content-Range': `bytes ${offset}-${end}/${fileSize}` },
            body: chunk
          })
          if (!uploadRes.ok) throw new Error(`ONEDRIVE_CHUNK_UPLOAD_FAILED:${uploadRes.status}`)
          const data = (await uploadRes.json()) as { id?: string }
          offset += length
          if (data.id) uploadedId = data.id
          if (offset < fileSize && uploadRes.status !== 202) throw new Error('ONEDRIVE_UPLOAD_SESSION_ENDED_EARLY')
        }
      } finally { fs.closeSync(descriptor) }
      if (!uploadedId) throw new Error('ONEDRIVE_FILE_ID_MISSING')
      fileId = uploadedId
    }

    // Verify by downloading and hashing
    const verificationPath = `${sourcePath}.onedrive-verify-${randomUUID()}`
    try {
      await this.download(fileId, verificationPath)
      const downloadedHash = await sha256File(verificationPath)
      if (downloadedHash !== expectedSha256) throw new Error('INDEPENDENT_BACKUP_HASH_MISMATCH')
    } finally {
      fs.rmSync(verificationPath, { force: true })
    }

    return {
      id: fileId,
      location: `onedrive://${this.folderPath}/${safeName}`,
      sha256: expectedSha256
    }
  }

  async download(id: string, destinationPath: string): Promise<void> {
    if (!/^[A-Za-z0-9!_=-]+$/.test(id)) throw new Error('INVALID_BACKUP_OBJECT_ID')
    const token = await this.token()
    const downloadUrl = `${this.baseUrl()}/items/${encodeURIComponent(id)}/content`
    const response = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!response.ok || !response.body) throw new Error(`ONEDRIVE_DOWNLOAD_FAILED:${response.status}`)
    await pipeline(
      Readable.fromWeb(response.body as any),
      fs.createWriteStream(destinationPath, { flags: 'wx', mode: 0o600 })
    )
  }
}
