import { describe, expect, it } from 'vitest'
import { Readable } from 'stream'
import { createHash } from 'crypto'
import {
  createEncryptedRecoveryArchive,
  canonicalizeArchiveJson,
  stageEncryptedRecoveryArchive,
  type RecoveryArchiveEntryDescriptor,
  type RecoveryArchiveManifest,
  type RecoveryStagingSink
} from '../../../../src/shared/recoveryArchive'

const passphrase = 'Recovery-Archive-Password-2026!'
const tenantId = 'tenant-a'
const contractHash = createHash('sha256').update('contract').digest('hex')

class MemoryStagingSink implements RecoveryStagingSink {
  readonly entries = new Map<string, Buffer>()
  readonly pending: Buffer[] = []
  current = ''
  committed = false
  aborted = false

  beginEntry(entry: Omit<RecoveryArchiveEntryDescriptor, 'sha256'>): void {
    this.current = `${entry.kind}:${entry.name}`
    this.pending.length = 0
  }
  writeEntryChunk(chunk: Buffer): void {
    this.pending.push(Buffer.from(chunk))
  }
  endEntry(): void {
    this.entries.set(this.current, Buffer.concat(this.pending))
    this.current = ''
    this.pending.length = 0
  }
  commit(_manifest: RecoveryArchiveManifest): void {
    this.committed = true
  }
  abort(): void {
    this.aborted = true
    this.entries.clear()
  }
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks)
}

function manifestBase() {
  return {
    contractId: 'b2b-law-canonical-v3',
    contractHash,
    sourceApp: 'web' as const,
    sourceVersion: '1.0.1',
    tenantId
  }
}

describe('streaming recovery archive', () => {
  it('canonicalizes PostgreSQL Date values as ISO strings instead of empty objects', () => {
    expect(canonicalizeArchiveJson({ created_at: new Date('2026-09-01T12:34:56.789Z') }))
      .toBe('{"created_at":"2026-09-01T12:34:56.789Z"}')
    expect(() => canonicalizeArchiveJson({ created_at: new Date('invalid') })).toThrow('INVALID_ARCHIVE_DATE')
  })
  it('streams records and a multi-chunk attachment through staging before commit', async () => {
    const record = Buffer.from(JSON.stringify({ id: 'c1', company_id: tenantId, name: 'Client' }))
    const attachment = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(256 * 1024, 7)])
    const encrypted = createEncryptedRecoveryArchive(
      [
        { kind: 'record', name: 'clients:000001', source: record, byteLength: record.length },
        { kind: 'attachment', name: 'sha256-document', source: Readable.from([attachment]), byteLength: attachment.length }
      ],
      manifestBase(),
      passphrase
    )
    const sink = new MemoryStagingSink()
    const manifest = await stageEncryptedRecoveryArchive(encrypted, passphrase, tenantId, sink)

    expect(sink.committed).toBe(true)
    expect(sink.aborted).toBe(false)
    expect(sink.entries.get('record:clients:000001')).toEqual(record)
    expect(sink.entries.get('attachment:sha256-document')).toEqual(attachment)
    expect(manifest.entries).toHaveLength(2)
    expect(manifest.schemaHashes).toEqual({
      canonicalContractSha256: contractHash,
      sourceSchemaSha256: contractHash
    })
    expect(manifest.encryption.keySlots[0]).toEqual(
      expect.objectContaining({
        type: 'recovery_passphrase',
        kdf: 'PBKDF2-HMAC-SHA512',
        wrapCipher: 'AES-256-GCM'
      })
    )
    expect(manifest.entitySummaries.clients.count).toBe(1)
    expect(manifest.entitySummaries.clients.sha256).toMatch(/^[a-f0-9]{64}$/)
  })

  it('aborts staging on tenant mismatch without committing', async () => {
    const record = Buffer.from('{}')
    const archive = createEncryptedRecoveryArchive(
      [{ kind: 'record', name: 'clients:1', source: record, byteLength: record.length }],
      manifestBase(),
      passphrase
    )
    const sink = new MemoryStagingSink()
    await expect(stageEncryptedRecoveryArchive(archive, passphrase, 'tenant-b', sink)).rejects.toThrow('TENANT_MISMATCH')
    expect(sink.committed).toBe(false)
    expect(sink.aborted).toBe(true)
    expect(sink.entries.size).toBe(0)
  })

  it('fails closed when a source length or source hash is false', async () => {
    const payload = Buffer.from('record')
    const badLength = createEncryptedRecoveryArchive(
      [{ kind: 'record', name: 'clients:1', source: payload, byteLength: payload.length + 1 }],
      manifestBase(),
      passphrase
    )
    await expect(streamToBuffer(badLength)).rejects.toThrow('ARCHIVE_ENTRY_LENGTH_MISMATCH')

    const badHash = createEncryptedRecoveryArchive(
      [{ kind: 'record', name: 'clients:1', source: payload, byteLength: payload.length, sha256: '0'.repeat(64) }],
      manifestBase(),
      passphrase
    )
    await expect(streamToBuffer(badHash)).rejects.toThrow('ARCHIVE_ENTRY_HASH_MISMATCH')
  })
})
