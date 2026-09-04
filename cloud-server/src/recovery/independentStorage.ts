import fs from 'fs'
import path from 'path'
import { createHash, randomUUID } from 'crypto'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import { GoogleAuth } from 'google-auth-library'
import { OneDriveIndependentStorage } from './oneDriveIndependentStorage'
import { OAuthTokenManager } from './oAuthStorageAuth'

export interface IndependentBackupObject {
  id: string
  location: string
  sha256: string
}

export interface IndependentBackupStorage {
  putVerified(sourcePath: string, objectName: string, expectedSha256: string): Promise<IndependentBackupObject>
  download(id: string, destinationPath: string): Promise<void>
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

export class LocalIndependentStorage implements IndependentBackupStorage {
  constructor(private readonly root: string) {
    fs.mkdirSync(root, { recursive: true, mode: 0o700 })
  }

  async putVerified(sourcePath: string, objectName: string, expectedSha256: string): Promise<IndependentBackupObject> {
    const id = randomUUID()
    const safeName = `${id}-${path.basename(objectName).replace(/[^A-Za-z0-9._-]/g, '_')}`
    const destination = path.join(path.resolve(this.root), safeName)
    await pipeline(fs.createReadStream(sourcePath), fs.createWriteStream(destination, { flags: 'wx', mode: 0o600 }))
    const actual = await sha256File(destination)
    if (actual !== expectedSha256) {
      fs.rmSync(destination, { force: true })
      throw new Error('INDEPENDENT_BACKUP_HASH_MISMATCH')
    }
    return { id: safeName, location: destination, sha256: actual }
  }

  async download(id: string, destinationPath: string): Promise<void> {
    if (path.basename(id) !== id) throw new Error('INVALID_BACKUP_OBJECT_ID')
    await pipeline(
      fs.createReadStream(path.join(path.resolve(this.root), id)),
      fs.createWriteStream(destinationPath, { flags: 'wx', mode: 0o600 })
    )
  }
}

export class GoogleDriveIndependentStorage implements IndependentBackupStorage {
  private readonly auth: GoogleAuth
  constructor(private readonly folderId: string, credentials: object) {
    this.auth = new GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive.file'] })
  }

  private async token(): Promise<string> {
    const client = await this.auth.getClient()
    const token = await client.getAccessToken()
    if (!token.token) throw new Error('GOOGLE_DRIVE_AUTH_FAILED')
    return token.token
  }

  async putVerified(sourcePath: string, objectName: string, expectedSha256: string): Promise<IndependentBackupObject> {
    const token = await this.token()
    const start = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,size', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'application/vnd.b2b-law.tenant-backup',
        'X-Upload-Content-Length': String(fs.statSync(sourcePath).size)
      },
      body: JSON.stringify({ name: objectName, parents: [this.folderId], appProperties: { sha256: expectedSha256 } })
    })
    const uploadUrl = start.headers.get('location')
    if (!start.ok || !uploadUrl) throw new Error('GOOGLE_DRIVE_UPLOAD_SESSION_FAILED')
    const uploaded = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/vnd.b2b-law.tenant-backup' },
      body: fs.createReadStream(sourcePath) as any,
      duplex: 'half'
    } as any)
    if (!uploaded.ok) throw new Error('GOOGLE_DRIVE_UPLOAD_FAILED')
    const metadata = await uploaded.json() as { id?: string }
    if (!metadata.id) throw new Error('GOOGLE_DRIVE_FILE_ID_MISSING')

    const verificationPath = `${sourcePath}.drive-verify-${randomUUID()}`
    try {
      await this.download(metadata.id, verificationPath)
      const downloadedHash = await sha256File(verificationPath)
      if (downloadedHash !== expectedSha256) throw new Error('INDEPENDENT_BACKUP_HASH_MISMATCH')
    } finally {
      fs.rmSync(verificationPath, { force: true })
    }
    return { id: metadata.id, location: `gdrive://${this.folderId}/${metadata.id}`, sha256: expectedSha256 }
  }

  async download(id: string, destinationPath: string): Promise<void> {
    if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error('INVALID_BACKUP_OBJECT_ID')
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`, {
      headers: { Authorization: `Bearer ${await this.token()}` }
    })
    if (!response.ok || !response.body) throw new Error('GOOGLE_DRIVE_DOWNLOAD_FAILED')
    await pipeline(
      Readable.fromWeb(response.body as any),
      fs.createWriteStream(destinationPath, { flags: 'wx', mode: 0o600 })
    )
  }
}

export function createIndependentBackupStorage(): IndependentBackupStorage {
  const provider = (process.env.INDEPENDENT_BACKUP_PROVIDER || '').toLowerCase()
  if (provider === 'onedrive') {
    const clientId = process.env.ONEDRIVE_CLIENT_ID
    const clientSecret = process.env.ONEDRIVE_CLIENT_SECRET
    const refreshToken = process.env.ONEDRIVE_REFRESH_TOKEN
    if (clientId && clientSecret && refreshToken) {
      const manager = OAuthTokenManager.createMicrosoftTokenManager(clientId, clientSecret, refreshToken, process.env.ONEDRIVE_TENANT || 'common')
      return new OneDriveIndependentStorage({ folderPath: process.env.ONEDRIVE_BACKUP_FOLDER || 'B2B-Backups', driveId: process.env.ONEDRIVE_DRIVE_ID, tokenSupplier: () => manager.getAccessToken() })
    }
  }
  const folderId = process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID
  const credentialsBase64 = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON_BASE64
  if ((provider === 'google' || !provider) && folderId && credentialsBase64) {
    try {
      const credentials = JSON.parse(Buffer.from(credentialsBase64, 'base64').toString('utf8'))
      return new GoogleDriveIndependentStorage(folderId, credentials)
    } catch {}
  }
  const root = process.env.INDEPENDENT_BACKUP_DIR || path.resolve(process.cwd(), 'backups', 'independent-safety')
  return new LocalIndependentStorage(root)
}
