import fs from 'fs'
import os from 'os'
import path from 'path'
import { createHash, randomUUID } from 'crypto'
import type {
  RecoveryArchiveEntryDescriptor,
  RecoveryArchiveManifest,
  RecoveryStagingSink
} from '../shared/recoveryArchive'
import { AttachmentQuotaTracker, validateAttachmentStream } from '../shared/attachmentEngine'

const MAX_STAGED_RECORDS = 100_000

export interface StagedEntry extends RecoveryArchiveEntryDescriptor {
  filePath: string
}

export class DirectoryRecoveryStagingSink implements RecoveryStagingSink {
  readonly directory: string
  readonly entries: StagedEntry[] = []
  private current: { descriptor: Omit<RecoveryArchiveEntryDescriptor, 'sha256'>; stream: fs.WriteStream; filePath: string } | null = null
  private committedManifest: RecoveryArchiveManifest | null = null
  private readonly attachmentQuota = new AttachmentQuotaTracker()
  private recordCount = 0

  constructor(root = process.env.TENANT_STAGING_DIR || path.join(os.tmpdir(), 'b2b-law-restore-staging')) {
    const resolvedRoot = path.resolve(root)
    fs.mkdirSync(resolvedRoot, { recursive: true, mode: 0o700 })
    this.directory = path.join(resolvedRoot, randomUUID())
    fs.mkdirSync(this.directory, { recursive: false, mode: 0o700 })
  }

  async beginEntry(entry: Omit<RecoveryArchiveEntryDescriptor, 'sha256'>): Promise<void> {
    if (this.current) throw new Error('STAGING_ENTRY_ALREADY_OPEN')
    if (entry.kind === 'record') {
      this.recordCount++
      if (this.recordCount > MAX_STAGED_RECORDS) throw new Error('RECORD_LIMIT_EXCEEDED')
    } else {
      const reservation = this.attachmentQuota.reserve(
        createHash('sha256').update(entry.name, 'utf8').digest('hex'),
        entry.byteLength
      )
      if (!reservation.valid) throw new Error(reservation.code || 'ATTACHMENT_QUOTA_EXCEEDED')
    }
    const filePath = path.join(this.directory, `entry-${String(this.entries.length).padStart(6, '0')}.bin`)
    const stream = fs.createWriteStream(filePath, { flags: 'wx', mode: 0o600 })
    this.current = { descriptor: entry, stream, filePath }
  }

  async writeEntryChunk(chunk: Buffer): Promise<void> {
    if (!this.current) throw new Error('STAGING_ENTRY_NOT_OPEN')
    if (!this.current.stream.write(chunk)) {
      await new Promise<void>((resolve, reject) => {
        this.current!.stream.once('drain', resolve)
        this.current!.stream.once('error', reject)
      })
    }
  }

  async endEntry(entry: RecoveryArchiveEntryDescriptor): Promise<void> {
    if (!this.current) throw new Error('STAGING_ENTRY_NOT_OPEN')
    const open = this.current
    this.current = null
    await new Promise<void>((resolve, reject) => {
      open.stream.once('error', reject)
      open.stream.end(resolve)
    })
    if (entry.kind === 'attachment') {
      const validation = await validateAttachmentStream(fs.createReadStream(open.filePath))
      if (!validation.valid) throw new Error(validation.code || 'ATTACHMENT_VALIDATION_FAILED')
      if (validation.sha256 !== entry.sha256 || validation.byteLength !== entry.byteLength) {
        throw new Error('STAGED_ATTACHMENT_INTEGRITY_MISMATCH')
      }
    }
    this.entries.push({ ...entry, filePath: open.filePath })
  }

  async commit(manifest: RecoveryArchiveManifest): Promise<void> {
    if (this.current) throw new Error('STAGING_ENTRY_STILL_OPEN')
    this.committedManifest = manifest
    const metadataPath = path.join(this.directory, 'manifest.json')
    fs.writeFileSync(metadataPath, JSON.stringify(manifest), { encoding: 'utf8', mode: 0o600, flag: 'wx' })
    fs.writeFileSync(path.join(this.directory, 'COMPLETE'), manifest.exportId, { encoding: 'utf8', mode: 0o600, flag: 'wx' })
  }

  async abort(): Promise<void> {
    if (this.current) {
      this.current.stream.destroy()
      this.current = null
    }
    fs.rmSync(this.directory, { recursive: true, force: true })
  }

  get manifest(): RecoveryArchiveManifest {
    if (!this.committedManifest) throw new Error('STAGING_NOT_COMMITTED')
    return this.committedManifest
  }

  summary(): { recordCount: number; attachmentCount: number; attachmentTotalBytes: number } {
    const attachments = this.attachmentQuota.snapshot()
    return {
      recordCount: this.recordCount,
      attachmentCount: attachments.count,
      attachmentTotalBytes: attachments.totalBytes
    }
  }

  readRecordEntries(): Array<StagedEntry & { entityName: string }> {
    return this.entries
      .filter((entry) => entry.kind === 'record')
      .map((entry) => ({ ...entry, entityName: entry.name.split(':', 1)[0] }))
  }

  cleanup(): void {
    fs.rmSync(this.directory, { recursive: true, force: true })
  }
}
