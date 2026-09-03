import fs from 'fs'
import os from 'os'
import path from 'path'
import { createHash } from 'crypto'
import type { RestoreNonceStore } from '../shared/restoreProtocol'

export class FileRestoreNonceStore implements RestoreNonceStore {
  constructor(private readonly directory = process.env.RESTORE_NONCE_DIRECTORY || path.join(os.tmpdir(), 'b2b-restore-nonces')) {
    fs.mkdirSync(this.directory, { recursive: true, mode: 0o700 })
  }

  async consume(nonce: string, expiresAt: number): Promise<boolean> {
    if (!nonce || !Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) return false
    const file = path.join(this.directory, createHash('sha256').update(nonce, 'utf8').digest('hex'))
    try {
      const handle = fs.openSync(file, 'wx', 0o600)
      try { fs.writeFileSync(handle, String(expiresAt), 'utf8') } finally { fs.closeSync(handle) }
      this.cleanupExpired()
      return true
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false
      throw error
    }
  }

  private cleanupExpired(): void {
    const now = Date.now()
    for (const name of fs.readdirSync(this.directory).slice(0, 1000)) {
      const target = path.join(this.directory, name)
      try {
        const expiry = Number(fs.readFileSync(target, 'utf8'))
        if (!Number.isSafeInteger(expiry) || expiry <= now) fs.rmSync(target, { force: true })
      } catch { /* another process may have cleaned it */ }
    }
  }
}
