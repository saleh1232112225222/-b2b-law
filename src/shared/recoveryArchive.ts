import { createHash, randomUUID } from 'crypto'
import { Readable } from 'stream'
import {
  DecryptStream,
  EncryptStream,
  type StreamCryptoHeader
} from './streamingCrypto'

const ARCHIVE_MAGIC = Buffer.from('B2BPKG3\0', 'ascii')
const ENTRY_HEADER_BYTES = 11
const ENTRY_RECORD = 1
const ENTRY_ATTACHMENT = 2
const ENTRY_MANIFEST = 3
const ENTRY_END = 255
export const MAX_ARCHIVE_RECORD_BYTES = 4 * 1024 * 1024
export const MAX_ARCHIVE_MANIFEST_BYTES = 2 * 1024 * 1024
export const MAX_ARCHIVE_ENTRIES = 101_000
const SAFE_ENTRY_NAME = /^[A-Za-z0-9._:-]{1,200}$/

export interface RecoveryArchiveInputEntry {
  kind: 'record' | 'attachment'
  name: string
  source: Readable | Buffer
  byteLength: number
  sha256?: string
}

export interface RecoveryArchiveEntryDescriptor {
  kind: 'record' | 'attachment'
  name: string
  byteLength: number
  sha256: string
}

export interface RecoveryArchiveManifest {
  formatVersion: 3
  contractId: string
  contractHash: string
  schemaHashes: { canonicalContractSha256: string; sourceSchemaSha256: string }
  sourceApp: 'web' | 'desktop'
  sourceVersion: string
  tenantId: string
  exportId: string
  createdAt: string
  lineage: { type: 'full' | 'incremental'; parentExportId?: string }
  encryption: StreamCryptoHeader
  authentication: {
    scheme: 'AES-256-GCM-FRAMED'
    mode: 'passphrase_authenticated_encryption'
    coverage: 'header+entries+manifest'
  }
  entitySummaries: Record<string, { count: number; sha256: string }>
  entries: RecoveryArchiveEntryDescriptor[]
}

export interface RecoveryArchiveManifestBase {
  contractId: string
  contractHash: string
  sourceSchemaHash?: string
  sourceApp: 'web' | 'desktop'
  sourceVersion: string
  tenantId: string
  exportId?: string
  createdAt?: string
  lineage?: { type: 'full' | 'incremental'; parentExportId?: string }
}

export interface RecoveryStagingSink {
  beginEntry(entry: Omit<RecoveryArchiveEntryDescriptor, 'sha256'>): Promise<void> | void
  writeEntryChunk(chunk: Buffer): Promise<void> | void
  endEntry(entry: RecoveryArchiveEntryDescriptor): Promise<void> | void
  commit(manifest: RecoveryArchiveManifest): Promise<void> | void
  abort(error: Error): Promise<void> | void
}

export function canonicalizeArchiveJson(value: unknown): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new Error('INVALID_ARCHIVE_DATE')
    return JSON.stringify(value.toISOString())
  }
  if (value === null || typeof value !== 'object') {
    const encoded = JSON.stringify(value)
    if (encoded === undefined) throw new Error('UNSUPPORTED_ARCHIVE_JSON_VALUE')
    return encoded
  }
  if (Array.isArray(value)) return `[${value.map(canonicalizeArchiveJson).join(',')}]`
  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) throw new Error('UNSUPPORTED_ARCHIVE_JSON_OBJECT')
  const obj = value as Record<string, unknown>
  return `{${Object.keys(obj)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalizeArchiveJson(obj[key])}`)
    .join(',')}}`
}

function encodeEntryHeader(type: number, name: string, byteLength: number): Buffer {
  if (!SAFE_ENTRY_NAME.test(name)) throw new Error(`INVALID_ARCHIVE_ENTRY_NAME: ${name}`)
  if (!Number.isSafeInteger(byteLength) || byteLength < 0) throw new Error('INVALID_ARCHIVE_ENTRY_SIZE')
  const nameBuffer = Buffer.from(name, 'utf8')
  const header = Buffer.alloc(ENTRY_HEADER_BYTES)
  header.writeUInt8(type, 0)
  header.writeUInt16BE(nameBuffer.length, 1)
  header.writeBigUInt64BE(BigInt(byteLength), 3)
  return Buffer.concat([header, nameBuffer])
}

async function* plaintextArchive(
  entries: AsyncIterable<RecoveryArchiveInputEntry> | Iterable<RecoveryArchiveInputEntry>,
  base: RecoveryArchiveManifestBase,
  encryption: StreamCryptoHeader
): AsyncGenerator<Buffer> {
  yield ARCHIVE_MAGIC
  const descriptors: RecoveryArchiveEntryDescriptor[] = []
  const seen = new Set<string>()
  const entityHashes = new Map<string, string[]>()

  for await (const entry of entries) {
    if (descriptors.length >= MAX_ARCHIVE_ENTRIES) throw new Error('ARCHIVE_ENTRY_COUNT_EXCEEDED')
    const identity = `${entry.kind}:${entry.name}`
    if (seen.has(identity)) throw new Error(`DUPLICATE_ARCHIVE_ENTRY: ${identity}`)
    seen.add(identity)
    const maxBytes = entry.kind === 'record' ? MAX_ARCHIVE_RECORD_BYTES : 50 * 1024 * 1024
    if (!Number.isSafeInteger(entry.byteLength) || entry.byteLength <= 0 || entry.byteLength > maxBytes) {
      throw new Error(`ARCHIVE_ENTRY_SIZE_EXCEEDED: ${identity}`)
    }
    yield encodeEntryHeader(entry.kind === 'record' ? ENTRY_RECORD : ENTRY_ATTACHMENT, entry.name, entry.byteLength)
    const hash = createHash('sha256')
    let observed = 0
    const source = Buffer.isBuffer(entry.source) ? Readable.from([entry.source]) : entry.source
    for await (const rawChunk of source) {
      const chunk = Buffer.isBuffer(rawChunk) ? rawChunk : Buffer.from(rawChunk)
      observed += chunk.length
      if (observed > entry.byteLength) throw new Error(`ARCHIVE_ENTRY_LONGER_THAN_DECLARED: ${identity}`)
      hash.update(chunk)
      yield chunk
    }
    if (observed !== entry.byteLength) throw new Error(`ARCHIVE_ENTRY_LENGTH_MISMATCH: ${identity}`)
    const digest = hash.digest('hex')
    if (entry.sha256 && entry.sha256 !== digest) throw new Error(`ARCHIVE_ENTRY_HASH_MISMATCH: ${identity}`)
    descriptors.push({ kind: entry.kind, name: entry.name, byteLength: observed, sha256: digest })
    if (entry.kind === 'record') {
      const separator = entry.name.indexOf(':')
      const entityName = separator > 0 ? entry.name.slice(0, separator) : ''
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(entityName)) {
        throw new Error(`INVALID_RECORD_ENTITY_NAME: ${entry.name}`)
      }
      const hashes = entityHashes.get(entityName) || []
      hashes.push(digest)
      entityHashes.set(entityName, hashes)
    }
  }

  const entitySummaries: Record<string, { count: number; sha256: string }> = {}
  for (const entityName of [...entityHashes.keys()].sort()) {
    const hashes = entityHashes.get(entityName)!.sort()
    entitySummaries[entityName] = {
      count: hashes.length,
      sha256: createHash('sha256').update(canonicalizeArchiveJson(hashes), 'utf8').digest('hex')
    }
  }

  const manifest: RecoveryArchiveManifest = {
    formatVersion: 3,
    contractId: base.contractId,
    contractHash: base.contractHash,
    schemaHashes: {
      canonicalContractSha256: base.contractHash,
      sourceSchemaSha256: base.sourceSchemaHash ?? base.contractHash
    },
    sourceApp: base.sourceApp,
    sourceVersion: base.sourceVersion,
    tenantId: base.tenantId,
    exportId: base.exportId ?? randomUUID(),
    createdAt: base.createdAt ?? new Date().toISOString(),
    lineage: base.lineage ?? { type: 'full' },
    encryption,
    authentication: {
      scheme: 'AES-256-GCM-FRAMED',
      mode: 'passphrase_authenticated_encryption',
      coverage: 'header+entries+manifest'
    },
    entitySummaries,
    entries: descriptors
  }
  const manifestBytes = Buffer.from(canonicalizeArchiveJson(manifest), 'utf8')
  if (manifestBytes.length > MAX_ARCHIVE_MANIFEST_BYTES) throw new Error('ARCHIVE_MANIFEST_SIZE_EXCEEDED')
  yield encodeEntryHeader(ENTRY_MANIFEST, 'manifest.json', manifestBytes.length)
  yield manifestBytes
  const end = Buffer.alloc(ENTRY_HEADER_BYTES)
  end.writeUInt8(ENTRY_END, 0)
  yield end
}

export function createEncryptedRecoveryArchive(
  entries: AsyncIterable<RecoveryArchiveInputEntry> | Iterable<RecoveryArchiveInputEntry>,
  manifest: RecoveryArchiveManifestBase,
  passphrase: string,
  automationKey?: Buffer
): Readable {
  const encrypt = new EncryptStream(automationKey ? { recoveryPassphrase: passphrase, automationKey } : passphrase)
  const source = Readable.from(plaintextArchive(entries, manifest, encrypt.getHeaderMetadata()))
  source.once('error', (error) => encrypt.destroy(error))
  return source.pipe(encrypt)
}

class AsyncByteReader {
  private readonly iterator: AsyncIterator<unknown>
  private buffered: Buffer<ArrayBufferLike> = Buffer.alloc(0)
  private ended = false

  constructor(source: AsyncIterable<unknown>) {
    this.iterator = source[Symbol.asyncIterator]()
  }

  private async fill(minimum: number): Promise<void> {
    while (this.buffered.length < minimum && !this.ended) {
      const next = await this.iterator.next()
      if (next.done) {
        this.ended = true
        break
      }
      const chunk = Buffer.from(next.value as Uint8Array)
      this.buffered = this.buffered.length === 0 ? chunk : Buffer.concat([this.buffered, chunk])
    }
  }

  async readExact(length: number): Promise<Buffer> {
    await this.fill(length)
    if (this.buffered.length < length) throw new Error('ARCHIVE_TRUNCATED')
    const result = Buffer.from(this.buffered.subarray(0, length))
    this.buffered = this.buffered.subarray(length)
    return result
  }

  async consume(length: number, onChunk: (chunk: Buffer) => Promise<void>): Promise<string> {
    const hash = createHash('sha256')
    let remaining = length
    while (remaining > 0) {
      await this.fill(1)
      if (this.buffered.length === 0) throw new Error('ARCHIVE_TRUNCATED')
      const take = Math.min(remaining, this.buffered.length, 64 * 1024)
      const chunk = Buffer.from(this.buffered.subarray(0, take))
      this.buffered = this.buffered.subarray(take)
      remaining -= take
      hash.update(chunk)
      await onChunk(chunk)
    }
    return hash.digest('hex')
  }

  async assertEof(): Promise<void> {
    await this.fill(1)
    if (this.buffered.length !== 0 || !this.ended) throw new Error('ARCHIVE_TRAILING_DATA')
  }
}

function validateManifest(value: unknown): RecoveryArchiveManifest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_ARCHIVE_MANIFEST')
  const manifest = value as RecoveryArchiveManifest
  if (
    manifest.formatVersion !== 3 ||
    !manifest.tenantId ||
    !manifest.contractId ||
    !/^[a-f0-9]{64}$/.test(manifest.contractHash) ||
    manifest.schemaHashes?.canonicalContractSha256 !== manifest.contractHash ||
    !/^[a-f0-9]{64}$/.test(manifest.schemaHashes?.sourceSchemaSha256 || '') ||
    !Array.isArray(manifest.entries) ||
    !manifest.entitySummaries ||
    typeof manifest.entitySummaries !== 'object' ||
    manifest.authentication?.scheme !== 'AES-256-GCM-FRAMED' ||
    manifest.authentication?.mode !== 'passphrase_authenticated_encryption' ||
    manifest.authentication?.coverage !== 'header+entries+manifest' ||
    ![2, 3].includes(manifest.encryption?.formatVersion) ||
    manifest.encryption?.contentCipher !== 'AES-256-GCM' ||
    ![1, 2].includes(manifest.encryption?.keySlots?.length)
  ) {
    throw new Error('INVALID_ARCHIVE_MANIFEST')
  }
  return manifest
}

export async function stageEncryptedRecoveryArchive(
  encrypted: Readable,
  passphrase: string | { automationKey: Buffer },
  expectedTenantId: string,
  sink: RecoveryStagingSink
): Promise<RecoveryArchiveManifest> {
  const decrypted = encrypted.pipe(new DecryptStream(passphrase))
  const reader = new AsyncByteReader(decrypted)
  const observed: RecoveryArchiveEntryDescriptor[] = []
  const observedEntityHashes = new Map<string, string[]>()
  let manifest: RecoveryArchiveManifest | null = null
  try {
    if (!(await reader.readExact(ARCHIVE_MAGIC.length)).equals(ARCHIVE_MAGIC)) throw new Error('INVALID_ARCHIVE_MAGIC')
    for (let index = 0; index <= MAX_ARCHIVE_ENTRIES + 1; index++) {
      const header = await reader.readExact(ENTRY_HEADER_BYTES)
      const type = header.readUInt8(0)
      const nameLength = header.readUInt16BE(1)
      const lengthBig = header.readBigUInt64BE(3)
      if (lengthBig > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('ARCHIVE_ENTRY_SIZE_EXCEEDED')
      const byteLength = Number(lengthBig)
      if (type === ENTRY_END) {
        if (nameLength !== 0 || byteLength !== 0 || !manifest) throw new Error('INVALID_ARCHIVE_END')
        await reader.assertEof()
        if (manifest.tenantId !== expectedTenantId) throw new Error('TENANT_MISMATCH')
        if (canonicalizeArchiveJson(manifest.entries) !== canonicalizeArchiveJson(observed)) throw new Error('ARCHIVE_MANIFEST_ENTRY_MISMATCH')
        const observedSummaries: Record<string, { count: number; sha256: string }> = {}
        for (const entityName of [...observedEntityHashes.keys()].sort()) {
          const hashes = observedEntityHashes.get(entityName)!.sort()
          observedSummaries[entityName] = {
            count: hashes.length,
            sha256: createHash('sha256')
              .update(canonicalizeArchiveJson(hashes), 'utf8')
              .digest('hex')
          }
        }
        if (canonicalizeArchiveJson(manifest.entitySummaries) !== canonicalizeArchiveJson(observedSummaries)) {
          throw new Error('ARCHIVE_ENTITY_SUMMARY_MISMATCH')
        }
        if (canonicalizeArchiveJson(manifest.encryption) !== canonicalizeArchiveJson(decrypted.getHeaderMetadata())) {
          throw new Error('ARCHIVE_ENCRYPTION_METADATA_MISMATCH')
        }
        await sink.commit(manifest)
        return manifest
      }
      if (![ENTRY_RECORD, ENTRY_ATTACHMENT, ENTRY_MANIFEST].includes(type)) throw new Error('UNKNOWN_ARCHIVE_ENTRY_TYPE')
      if (nameLength === 0 || nameLength > 200) throw new Error('INVALID_ARCHIVE_ENTRY_NAME')
      const name = (await reader.readExact(nameLength)).toString('utf8')
      if (!SAFE_ENTRY_NAME.test(name)) throw new Error('INVALID_ARCHIVE_ENTRY_NAME')
      if (type === ENTRY_MANIFEST) {
        if (manifest || byteLength <= 0 || byteLength > MAX_ARCHIVE_MANIFEST_BYTES) throw new Error('INVALID_ARCHIVE_MANIFEST_SIZE')
        const chunks: Buffer[] = []
        await reader.consume(byteLength, async (chunk) => { chunks.push(chunk) })
        manifest = validateManifest(JSON.parse(Buffer.concat(chunks).toString('utf8')))
        continue
      }
      if (manifest) throw new Error('ARCHIVE_ENTRY_AFTER_MANIFEST')
      const kind = type === ENTRY_RECORD ? 'record' : 'attachment'
      const limit = kind === 'record' ? MAX_ARCHIVE_RECORD_BYTES : 50 * 1024 * 1024
      if (byteLength <= 0 || byteLength > limit) throw new Error('ARCHIVE_ENTRY_SIZE_EXCEEDED')
      const partial = { kind, name, byteLength } as const
      await sink.beginEntry(partial)
      const sha256 = await reader.consume(byteLength, async (chunk) => sink.writeEntryChunk(chunk))
      const descriptor = { ...partial, sha256 }
      await sink.endEntry(descriptor)
      observed.push(descriptor)
      if (kind === 'record') {
        const separator = name.indexOf(':')
        const entityName = separator > 0 ? name.slice(0, separator) : ''
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(entityName)) throw new Error('INVALID_RECORD_ENTITY_NAME')
        const hashes = observedEntityHashes.get(entityName) || []
        hashes.push(sha256)
        observedEntityHashes.set(entityName, hashes)
      }
    }
    throw new Error('ARCHIVE_ENTRY_COUNT_EXCEEDED')
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error(String(error))
    await sink.abort(normalized)
    throw normalized
  }
}

