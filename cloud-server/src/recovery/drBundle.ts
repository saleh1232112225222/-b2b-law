import { createHash, randomUUID } from 'crypto'
import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { DecryptStream, EncryptStream, type StreamDecryptSecret } from '../shared/streamingCrypto'
import type { DisasterRecoveryManifest } from './postgresDisasterRecovery'

const MAGIC = Buffer.from('B2BDR1\0', 'ascii')
const MAX_FILES = 100_000
const MAX_PATH_BYTES = 1024

function safeRelative(value: string): string {
  const normalized = value.replaceAll('\\', '/')
  if (!normalized || normalized.startsWith('/') || normalized.includes('\0') || normalized.split('/').some((part) => !part || part === '.' || part === '..')) throw new Error('DR_BUNDLE_PATH_INVALID')
  return normalized
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256')
  for await (const chunk of fs.createReadStream(filePath)) hash.update(chunk as Buffer)
  return hash.digest('hex')
}

function declaredFiles(root: string): Array<{ relativePath: string; fullPath: string; byteLength: number }> {
  const manifestPath = path.join(root, 'manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as DisasterRecoveryManifest
  if (manifest.formatVersion !== 1 || manifest.dump.file !== 'database.dump') throw new Error('DR_MANIFEST_INVALID')
  const relative = ['manifest.json', manifest.dump.file, ...manifest.attachments.map((item) => `attachments/${safeRelative(item.relativePath)}`)]
  if (new Set(relative).size !== relative.length || relative.length > MAX_FILES) throw new Error('DR_BUNDLE_ENTRY_SET_INVALID')
  return relative.map((relativePath) => {
    const fullPath = path.resolve(root, ...safeRelative(relativePath).split('/'))
    if (!fullPath.startsWith(`${root}${path.sep}`) || !fs.statSync(fullPath).isFile()) throw new Error('DR_BUNDLE_SOURCE_INVALID')
    return { relativePath, fullPath, byteLength: fs.statSync(fullPath).size }
  })
}

async function* plainBundle(root: string): AsyncGenerator<Buffer> {
  yield MAGIC
  for (const file of declaredFiles(root)) {
    const pathBytes = Buffer.from(file.relativePath, 'utf8')
    if (pathBytes.length < 1 || pathBytes.length > MAX_PATH_BYTES) throw new Error('DR_BUNDLE_PATH_INVALID')
    const header = Buffer.alloc(12)
    header.writeUInt32BE(pathBytes.length, 0)
    header.writeBigUInt64BE(BigInt(file.byteLength), 4)
    yield header; yield pathBytes
    for await (const chunk of fs.createReadStream(file.fullPath)) yield chunk as Buffer
  }
  yield Buffer.alloc(4)
}

export async function createEncryptedDrBundle(
  backupDirectory: string,
  destination: string,
  secret: string | { recoveryPassphrase: string; automationKey: Buffer }
): Promise<{ sha256: string; byteLength: number }> {
  const root = fs.realpathSync.native(path.resolve(backupDirectory))
  const temp = `${destination}.${randomUUID()}.tmp`
  try {
    await pipeline(Readable.from(plainBundle(root)), new EncryptStream(secret), fs.createWriteStream(temp, { flags: 'wx', mode: 0o600 }))
    const descriptor = fs.openSync(temp, 'r+'); try { fs.fsyncSync(descriptor) } finally { fs.closeSync(descriptor) }
    fs.renameSync(temp, destination)
    return { sha256: await sha256File(destination), byteLength: fs.statSync(destination).size }
  } catch (error) {
    fs.rmSync(temp, { force: true })
    throw error
  }
}

function readExact(fd: number, length: number, position: number): Buffer {
  const value = Buffer.alloc(length)
  if (fs.readSync(fd, value, 0, length, position) !== length) throw new Error('DR_BUNDLE_TRUNCATED')
  return value
}

export async function extractEncryptedDrBundle(
  encryptedBundle: string,
  destinationDirectory: string,
  secret: StreamDecryptSecret
): Promise<DisasterRecoveryManifest> {
  const destination = path.resolve(destinationDirectory)
  if (fs.existsSync(destination) && fs.readdirSync(destination).length) throw new Error('DR_BUNDLE_DESTINATION_NOT_EMPTY')
  fs.mkdirSync(destination, { recursive: true, mode: 0o700 })
  const plain = path.join(path.dirname(destination), `.dr-plain-${randomUUID()}.tmp`)
  try {
    await pipeline(fs.createReadStream(encryptedBundle), new DecryptStream(secret), fs.createWriteStream(plain, { flags: 'wx', mode: 0o600 }))
    const fd = fs.openSync(plain, 'r')
    const seen = new Set<string>()
    let position = 0
    try {
      if (!readExact(fd, MAGIC.length, position).equals(MAGIC)) throw new Error('DR_BUNDLE_MAGIC_INVALID')
      position += MAGIC.length
      for (let count = 0; count <= MAX_FILES; count++) {
        const pathLength = readExact(fd, 4, position).readUInt32BE(0); position += 4
        if (pathLength === 0) break
        if (count === MAX_FILES || pathLength > MAX_PATH_BYTES) throw new Error('DR_BUNDLE_LIMIT_EXCEEDED')
        const byteLength = Number(readExact(fd, 8, position).readBigUInt64BE(0)); position += 8
        if (!Number.isSafeInteger(byteLength) || byteLength < 0) throw new Error('DR_BUNDLE_SIZE_INVALID')
        const relativePath = safeRelative(readExact(fd, pathLength, position).toString('utf8')); position += pathLength
        if (seen.has(relativePath)) throw new Error('DR_BUNDLE_DUPLICATE_ENTRY')
        seen.add(relativePath)
        const target = path.resolve(destination, ...relativePath.split('/'))
        if (!target.startsWith(`${destination}${path.sep}`)) throw new Error('DR_BUNDLE_PATH_INVALID')
        fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 })
        const output = fs.openSync(target, 'wx', 0o600)
        try {
          let remaining = byteLength
          while (remaining > 0) {
            const length = Math.min(1024 * 1024, remaining)
            const chunk = readExact(fd, length, position)
            if (fs.writeSync(output, chunk) !== length) throw new Error('DR_BUNDLE_WRITE_INCOMPLETE')
            position += length; remaining -= length
          }
          fs.fsyncSync(output)
        } finally { fs.closeSync(output) }
      }
    } finally { fs.closeSync(fd) }
    const manifest = JSON.parse(fs.readFileSync(path.join(destination, 'manifest.json'), 'utf8')) as DisasterRecoveryManifest
    if (manifest.formatVersion !== 1 || await sha256File(path.join(destination, manifest.dump.file)) !== manifest.dump.sha256) throw new Error('DR_BUNDLE_DUMP_INTEGRITY_FAILED')
    for (const item of manifest.attachments) {
      const target = path.resolve(destination, 'attachments', ...safeRelative(item.relativePath).split('/'))
      if (fs.statSync(target).size !== item.byteLength || await sha256File(target) !== item.sha256) throw new Error('DR_BUNDLE_ATTACHMENT_INTEGRITY_FAILED')
    }
    return manifest
  } catch (error) {
    fs.rmSync(destination, { recursive: true, force: true })
    throw error
  } finally {
    fs.rmSync(plain, { force: true })
  }
}
