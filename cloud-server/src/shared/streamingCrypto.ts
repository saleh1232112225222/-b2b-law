/** B2B-LAW bounded authenticated stream format. */
import { createCipheriv, createDecipheriv, createHash, pbkdf2Sync, randomBytes } from 'crypto'
import { Transform, type TransformCallback } from 'stream'

export const STREAM_CHUNK_SIZE = 64 * 1024
export const MAX_STREAM_CHUNK_SIZE = 1024 * 1024
export const STREAM_SALT_BYTES = 32
export const STREAM_IV_BYTES = 12
export const STREAM_TAG_BYTES = 16
export const STREAM_MAGIC_HEADER = Buffer.from('B2BLAW_STREAM_V3\0', 'utf8')
export const STREAM_FORMAT_VERSION = 2
export const STREAM_CIPHER_AES_256_GCM = 1
export const STREAM_KEY_SLOT_RECOVERY_PASSPHRASE = 1
export const STREAM_KEY_SLOT_AUTOMATION_KEY = 2
export const STREAM_KEY_WRAP_AES_256_GCM = 1
export const STREAM_KDF_PBKDF2_SHA512 = 1
export const PBKDF2_ITERATIONS = 600_000
export const MIN_PBKDF2_ITERATIONS = 100_000
export const MAX_PBKDF2_ITERATIONS = 2_000_000
export const STREAM_DEK_BYTES = 32
export const STREAM_KEY_SLOT_COUNT = 1
const STREAM_FIXED_METADATA_BYTES = 14
export const STREAM_HEADER_BYTES =
  STREAM_MAGIC_HEADER.length +
  STREAM_FIXED_METADATA_BYTES +
  STREAM_SALT_BYTES +
  STREAM_IV_BYTES +
  STREAM_IV_BYTES +
  STREAM_DEK_BYTES +
  STREAM_TAG_BYTES
const STREAM_V3_METADATA_BYTES = 7
const STREAM_V3_SLOT_DESCRIPTOR_BYTES = 50
export const STREAM_V3_HEADER_BYTES = STREAM_MAGIC_HEADER.length + STREAM_V3_METADATA_BYTES + STREAM_IV_BYTES +
  2 * STREAM_V3_SLOT_DESCRIPTOR_BYTES + 2 * (STREAM_DEK_BYTES + STREAM_TAG_BYTES)
const FRAME_HEADER_BYTES = 5
const MAX_FRAME_INDEX = 0xffffffff
export const MAX_DECRYPT_BUFFER_BYTES =
  STREAM_HEADER_BYTES + FRAME_HEADER_BYTES + MAX_STREAM_CHUNK_SIZE + STREAM_TAG_BYTES + STREAM_CHUNK_SIZE

export interface StreamCryptoHeader {
  formatVersion: number
  contentCipher: 'AES-256-GCM'
  chunkSize: number
  baseIv: string
  keySlots: Array<{
    type: 'recovery_passphrase' | 'automation_key'
    wrapCipher: 'AES-256-GCM'
    kdf: 'PBKDF2-HMAC-SHA512' | 'NONE'
    iterations: number
    salt: string
    wrapIv: string
    wrappedKeyBytes: number
    tagBytes: number
  }>
}

export type StreamDecryptSecret = string | { automationKey: Buffer }

export function getStreamHeaderBytes(prefix: Buffer): number {
  if (prefix.length < STREAM_MAGIC_HEADER.length + 3) throw new Error('ترويسة التدفق غير مكتملة.')
  if (!prefix.subarray(0, STREAM_MAGIC_HEADER.length).equals(STREAM_MAGIC_HEADER)) throw new Error('ترويسة التدفق المشفر غير صالحة أو غير مدعومة.')
  const version = prefix.readUInt8(STREAM_MAGIC_HEADER.length)
  if (version === 2) return STREAM_HEADER_BYTES
  if (version === 3 && prefix.readUInt8(STREAM_MAGIC_HEADER.length + 2) === 2) return STREAM_V3_HEADER_BYTES
  throw new Error('إصدار أو عدد منافذ مفاتيح التدفق غير مدعوم.')
}

export function deriveStreamKey(passphrase: string, salt: Buffer, iterations = PBKDF2_ITERATIONS): Buffer {
  if (typeof passphrase !== 'string' || passphrase.normalize('NFKC').length < 12) {
    throw new Error('كلمة مرور الاسترداد يجب أن لا تقل عن 12 خانة.')
  }
  if (salt.length !== STREAM_SALT_BYTES) throw new Error('طول ملح التشفير غير صالح.')
  if (iterations < MIN_PBKDF2_ITERATIONS || iterations > MAX_PBKDF2_ITERATIONS) {
    throw new Error('إعداد تكرارات اشتقاق المفتاح خارج الحدود الآمنة.')
  }
  return pbkdf2Sync(passphrase.normalize('NFKC'), salt, iterations, 32, 'sha512')
}

export function deriveFrameIv(baseIv: Buffer, frameIndex: number): Buffer {
  if (baseIv.length !== STREAM_IV_BYTES) throw new Error('طول IV الأساسي غير صالح.')
  if (!Number.isSafeInteger(frameIndex) || frameIndex < 0 || frameIndex > MAX_FRAME_INDEX) {
    throw new Error('عداد إطار التشفير تجاوز الحد الآمن.')
  }
  const frameIv = Buffer.from(baseIv)
  frameIv.writeUInt32BE((frameIv.readUInt32BE(8) ^ frameIndex) >>> 0, 8)
  return frameIv
}

function encodeStreamHeader(
  passphrase: string,
  salt: Buffer,
  baseIv: Buffer,
  wrapIv: Buffer,
  dek: Buffer,
  chunkSize: number
): Buffer {
  if (
    salt.length !== STREAM_SALT_BYTES ||
    baseIv.length !== STREAM_IV_BYTES ||
    wrapIv.length !== STREAM_IV_BYTES ||
    dek.length !== STREAM_DEK_BYTES
  ) {
    throw new Error('بيانات ترويسة التشفير غير صالحة.')
  }
  if (chunkSize <= 0 || chunkSize > MAX_STREAM_CHUNK_SIZE) {
    throw new Error('حجم جزء التدفق خارج الحدود الآمنة.')
  }
  const metadata = Buffer.alloc(STREAM_FIXED_METADATA_BYTES)
  metadata.writeUInt8(STREAM_FORMAT_VERSION, 0)
  metadata.writeUInt8(STREAM_CIPHER_AES_256_GCM, 1)
  metadata.writeUInt8(STREAM_KEY_SLOT_COUNT, 2)
  metadata.writeUInt8(STREAM_KEY_SLOT_RECOVERY_PASSPHRASE, 3)
  metadata.writeUInt8(STREAM_KEY_WRAP_AES_256_GCM, 4)
  metadata.writeUInt8(STREAM_KDF_PBKDF2_SHA512, 5)
  metadata.writeUInt32BE(PBKDF2_ITERATIONS, 6)
  metadata.writeUInt32BE(chunkSize, 10)
  const authenticatedPrefix = Buffer.concat([STREAM_MAGIC_HEADER, metadata, salt, baseIv, wrapIv])
  const kek = deriveStreamKey(passphrase, salt)
  try {
    const wrapper = createCipheriv('aes-256-gcm', kek, wrapIv)
    wrapper.setAAD(authenticatedPrefix)
    const wrappedDek = Buffer.concat([wrapper.update(dek), wrapper.final()])
    return Buffer.concat([authenticatedPrefix, wrappedDek, wrapper.getAuthTag()])
  } finally {
    kek.fill(0)
  }
}

function automationKek(key: Buffer): Buffer {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('AUTOMATION_KEY_INVALID')
  return createHash('sha256').update('B2BLAW_STREAM_AUTOMATION_V3\0').update(key).digest()
}

function encodeV3StreamHeader(passphrase: string, automationKey: Buffer, dek: Buffer, chunkSize: number): Buffer {
  const baseIv = randomBytes(STREAM_IV_BYTES)
  const recoverySalt = randomBytes(STREAM_SALT_BYTES)
  const recoveryWrapIv = randomBytes(STREAM_IV_BYTES)
  const automationSalt = Buffer.alloc(STREAM_SALT_BYTES)
  const automationWrapIv = randomBytes(STREAM_IV_BYTES)
  const metadata = Buffer.alloc(STREAM_V3_METADATA_BYTES)
  metadata.writeUInt8(3, 0); metadata.writeUInt8(STREAM_CIPHER_AES_256_GCM, 1); metadata.writeUInt8(2, 2); metadata.writeUInt32BE(chunkSize, 3)
  const descriptor = (type: number, kdf: number, iterations: number, salt: Buffer, iv: Buffer) => {
    const value = Buffer.alloc(STREAM_V3_SLOT_DESCRIPTOR_BYTES)
    value.writeUInt8(type, 0); value.writeUInt8(kdf, 1); value.writeUInt32BE(iterations, 2); salt.copy(value, 6); iv.copy(value, 38)
    return value
  }
  const descriptors = [
    descriptor(STREAM_KEY_SLOT_RECOVERY_PASSPHRASE, STREAM_KDF_PBKDF2_SHA512, PBKDF2_ITERATIONS, recoverySalt, recoveryWrapIv),
    descriptor(STREAM_KEY_SLOT_AUTOMATION_KEY, 0, 0, automationSalt, automationWrapIv)
  ]
  const prefix = Buffer.concat([STREAM_MAGIC_HEADER, metadata, baseIv, ...descriptors])
  const wrap = (kek: Buffer, iv: Buffer): Buffer => {
    try {
      const cipher = createCipheriv('aes-256-gcm', kek, iv); cipher.setAAD(prefix)
      return Buffer.concat([cipher.update(dek), cipher.final(), cipher.getAuthTag()])
    } finally { kek.fill(0) }
  }
  return Buffer.concat([
    prefix,
    wrap(deriveStreamKey(passphrase, recoverySalt), recoveryWrapIv),
    wrap(automationKek(automationKey), automationWrapIv)
  ])
}

export function inspectStreamHeader(header: Buffer): StreamCryptoHeader {
  const expectedBytes = getStreamHeaderBytes(header)
  if (header.length !== expectedBytes) throw new Error('ترويسة التدفق غير مكتملة.')
  if (!header.subarray(0, STREAM_MAGIC_HEADER.length).equals(STREAM_MAGIC_HEADER)) {
    throw new Error('ترويسة التدفق المشفر غير صالحة أو غير مدعومة.')
  }
  let offset = STREAM_MAGIC_HEADER.length
  const version = header.readUInt8(offset++)
  if (version === 3) {
    const contentCipher = header.readUInt8(offset++)
    const count = header.readUInt8(offset++)
    const chunkSize = header.readUInt32BE(offset); offset += 4
    if (contentCipher !== STREAM_CIPHER_AES_256_GCM || count !== 2 || chunkSize <= 0 || chunkSize > MAX_STREAM_CHUNK_SIZE) throw new Error('إصدار أو خوارزمية أو منفذ مفتاح التدفق غير مدعوم.')
    const baseIv = header.subarray(offset, offset + STREAM_IV_BYTES); offset += STREAM_IV_BYTES
    const slots: StreamCryptoHeader['keySlots'] = []
    for (let index = 0; index < count; index++) {
      const type = header.readUInt8(offset); const kdf = header.readUInt8(offset + 1); const iterations = header.readUInt32BE(offset + 2)
      const salt = header.subarray(offset + 6, offset + 38); const wrapIv = header.subarray(offset + 38, offset + 50); offset += 50
      if ((index === 0 && (type !== 1 || kdf !== 1 || iterations < MIN_PBKDF2_ITERATIONS || iterations > MAX_PBKDF2_ITERATIONS)) || (index === 1 && (type !== 2 || kdf !== 0 || iterations !== 0))) throw new Error('إصدار أو خوارزمية أو منفذ مفتاح التدفق غير مدعوم.')
      slots.push({ type: type === 1 ? 'recovery_passphrase' : 'automation_key', wrapCipher: 'AES-256-GCM', kdf: type === 1 ? 'PBKDF2-HMAC-SHA512' : 'NONE', iterations, salt: salt.toString('hex'), wrapIv: wrapIv.toString('hex'), wrappedKeyBytes: 32, tagBytes: 16 })
    }
    return { formatVersion: 3, contentCipher: 'AES-256-GCM', chunkSize, baseIv: baseIv.toString('hex'), keySlots: slots }
  }
  const contentCipher = header.readUInt8(offset++)
  const keySlotCount = header.readUInt8(offset++)
  const keySlotType = header.readUInt8(offset++)
  const wrapCipher = header.readUInt8(offset++)
  const kdf = header.readUInt8(offset++)
  const iterations = header.readUInt32BE(offset)
  offset += 4
  const chunkSize = header.readUInt32BE(offset)
  offset += 4
  if (
    version !== STREAM_FORMAT_VERSION ||
    contentCipher !== STREAM_CIPHER_AES_256_GCM ||
    keySlotCount !== STREAM_KEY_SLOT_COUNT ||
    keySlotType !== STREAM_KEY_SLOT_RECOVERY_PASSPHRASE ||
    wrapCipher !== STREAM_KEY_WRAP_AES_256_GCM ||
    kdf !== STREAM_KDF_PBKDF2_SHA512
  ) {
    throw new Error('إصدار أو خوارزمية أو منفذ مفتاح التدفق غير مدعوم.')
  }
  if (iterations < MIN_PBKDF2_ITERATIONS || iterations > MAX_PBKDF2_ITERATIONS) {
    throw new Error('إعداد تكرارات اشتقاق المفتاح خارج الحدود الآمنة.')
  }
  if (chunkSize <= 0 || chunkSize > MAX_STREAM_CHUNK_SIZE) {
    throw new Error('حجم جزء التدفق خارج الحدود الآمنة.')
  }
  const salt = Buffer.from(header.subarray(offset, offset + STREAM_SALT_BYTES))
  offset += STREAM_SALT_BYTES
  const baseIv = Buffer.from(header.subarray(offset, offset + STREAM_IV_BYTES))
  offset += STREAM_IV_BYTES
  const wrapIv = Buffer.from(header.subarray(offset, offset + STREAM_IV_BYTES))
  return {
    formatVersion: version,
    contentCipher: 'AES-256-GCM',
    chunkSize,
    baseIv: baseIv.toString('hex'),
    keySlots: [
      {
        type: 'recovery_passphrase',
        wrapCipher: 'AES-256-GCM',
        kdf: 'PBKDF2-HMAC-SHA512',
        iterations,
        salt: salt.toString('hex'),
        wrapIv: wrapIv.toString('hex'),
        wrappedKeyBytes: STREAM_DEK_BYTES,
        tagBytes: STREAM_TAG_BYTES
      }
    ]
  }
}

function parseStreamHeader(
  header: Buffer,
  secret: StreamDecryptSecret
): { baseIv: Buffer; chunkSize: number; key: Buffer; metadata: StreamCryptoHeader } {
  const metadata = inspectStreamHeader(header)
  if (metadata.formatVersion === 3) {
    const descriptorStart = STREAM_MAGIC_HEADER.length + STREAM_V3_METADATA_BYTES + STREAM_IV_BYTES
    const blobsStart = descriptorStart + 2 * STREAM_V3_SLOT_DESCRIPTOR_BYTES
    const slotIndex = typeof secret === 'string' ? 0 : 1
    const descriptorOffset = descriptorStart + slotIndex * STREAM_V3_SLOT_DESCRIPTOR_BYTES
    const salt = Buffer.from(header.subarray(descriptorOffset + 6, descriptorOffset + 38))
    const wrapIv = Buffer.from(header.subarray(descriptorOffset + 38, descriptorOffset + 50))
    const blobOffset = blobsStart + slotIndex * (STREAM_DEK_BYTES + STREAM_TAG_BYTES)
    const wrappedDek = Buffer.from(header.subarray(blobOffset, blobOffset + STREAM_DEK_BYTES))
    const tag = Buffer.from(header.subarray(blobOffset + STREAM_DEK_BYTES, blobOffset + STREAM_DEK_BYTES + STREAM_TAG_BYTES))
    const prefix = header.subarray(0, blobsStart)
    const kek = typeof secret === 'string' ? deriveStreamKey(secret, salt, metadata.keySlots[0].iterations) : automationKek(secret.automationKey)
    try {
      const decipher = createDecipheriv('aes-256-gcm', kek, wrapIv); decipher.setAAD(prefix); decipher.setAuthTag(tag)
      const key = Buffer.concat([decipher.update(wrappedDek), decipher.final()])
      return { baseIv: Buffer.from(metadata.baseIv, 'hex'), chunkSize: metadata.chunkSize, key, metadata }
    } catch { throw new Error('مفتاح الاسترداد أو الأتمتة غير صحيح أو تم التلاعب بمنفذ المفتاح.') }
    finally { kek.fill(0) }
  }
  if (typeof secret !== 'string') throw new Error('حزمة v2 تتطلب كلمة مرور الاسترداد.')
  let offset = STREAM_MAGIC_HEADER.length + STREAM_FIXED_METADATA_BYTES
  const salt = Buffer.from(header.subarray(offset, offset + STREAM_SALT_BYTES))
  offset += STREAM_SALT_BYTES
  const baseIv = Buffer.from(header.subarray(offset, offset + STREAM_IV_BYTES))
  offset += STREAM_IV_BYTES
  const wrapIv = Buffer.from(header.subarray(offset, offset + STREAM_IV_BYTES))
  offset += STREAM_IV_BYTES
  const wrappedDek = Buffer.from(header.subarray(offset, offset + STREAM_DEK_BYTES))
  offset += STREAM_DEK_BYTES
  const wrapTag = Buffer.from(header.subarray(offset, offset + STREAM_TAG_BYTES))
  const authenticatedPrefix = header.subarray(0, STREAM_HEADER_BYTES - STREAM_DEK_BYTES - STREAM_TAG_BYTES)
  const kek = deriveStreamKey(secret, salt, metadata.keySlots[0].iterations)
  try {
    const unwrapper = createDecipheriv('aes-256-gcm', kek, wrapIv)
    unwrapper.setAAD(authenticatedPrefix)
    unwrapper.setAuthTag(wrapTag)
    const key = Buffer.concat([unwrapper.update(wrappedDek), unwrapper.final()])
    if (key.length !== STREAM_DEK_BYTES) throw new Error('INVALID_STREAM_DEK_LENGTH')
    return { baseIv, chunkSize: metadata.chunkSize, key, metadata }
  } catch {
    throw new Error('كلمة مرور الاسترداد غير صحيحة أو تم التلاعب بمنفذ المفتاح.')
  } finally {
    kek.fill(0)
  }
}

function frameAad(header: Buffer, frameIndex: number, isFinal: boolean, cipherLength: number): Buffer {
  const metadata = Buffer.alloc(9)
  metadata.writeUInt32BE(frameIndex, 0)
  metadata.writeUInt8(isFinal ? 1 : 0, 4)
  metadata.writeUInt32BE(cipherLength, 5)
  return Buffer.concat([header, metadata])
}

export function encryptFrame(
  plainChunk: Buffer,
  key: Buffer,
  baseIv: Buffer,
  frameIndex: number,
  isFinal: boolean,
  authenticatedHeader: Buffer = Buffer.alloc(0),
  chunkSize = STREAM_CHUNK_SIZE
): Buffer {
  if (plainChunk.length > chunkSize) throw new Error('حجم إطار النص الصريح يتجاوز الحد المسموح.')
  if (!isFinal && plainChunk.length === 0) throw new Error('الإطار غير النهائي لا يمكن أن يكون فارغاً.')
  const cipher = createCipheriv('aes-256-gcm', key, deriveFrameIv(baseIv, frameIndex))
  cipher.setAAD(frameAad(authenticatedHeader, frameIndex, isFinal, plainChunk.length))
  const ciphertext = Buffer.concat([cipher.update(plainChunk), cipher.final()])
  const frameHeader = Buffer.alloc(FRAME_HEADER_BYTES)
  frameHeader.writeUInt8(isFinal ? 1 : 0, 0)
  frameHeader.writeUInt32BE(ciphertext.length, 1)
  return Buffer.concat([frameHeader, ciphertext, cipher.getAuthTag()])
}

export function decryptFrame(
  frameBuffer: Buffer,
  key: Buffer,
  baseIv: Buffer,
  frameIndex: number,
  authenticatedHeader: Buffer = Buffer.alloc(0),
  chunkSize = STREAM_CHUNK_SIZE
): { plainText: Buffer; isFinal: boolean; consumedBytes: number } {
  if (frameBuffer.length < FRAME_HEADER_BYTES + STREAM_TAG_BYTES) throw new Error('إطار البيانات المشفرة غير مكتمل أو تالف.')
  const flag = frameBuffer.readUInt8(0)
  if (flag !== 0 && flag !== 1) throw new Error('علامة نهاية إطار التشفير غير صالحة.')
  const isFinal = flag === 1
  const cipherLength = frameBuffer.readUInt32BE(1)
  if (cipherLength > chunkSize || (!isFinal && cipherLength === 0)) throw new Error('حجم إطار البيانات المعلن خارج الحدود الآمنة.')
  const totalFrameSize = FRAME_HEADER_BYTES + cipherLength + STREAM_TAG_BYTES
  if (frameBuffer.length < totalFrameSize) throw new Error('حجم الإطار الفعلي أقل من الحجم المعلن عنه في الترويسة.')
  const ciphertext = frameBuffer.subarray(FRAME_HEADER_BYTES, FRAME_HEADER_BYTES + cipherLength)
  const tag = frameBuffer.subarray(FRAME_HEADER_BYTES + cipherLength, totalFrameSize)
  const decipher = createDecipheriv('aes-256-gcm', key, deriveFrameIv(baseIv, frameIndex))
  decipher.setAAD(frameAad(authenticatedHeader, frameIndex, isFinal, cipherLength))
  decipher.setAuthTag(tag)
  try {
    return { plainText: Buffer.concat([decipher.update(ciphertext), decipher.final()]), isFinal, consumedBytes: totalFrameSize }
  } catch {
    throw new Error(`فشل التحقق من أصالة الإطار رقم ${frameIndex}.`)
  }
}

export class EncryptStream extends Transform {
  private readonly key: Buffer
  private readonly baseIv: Buffer
  private readonly header: Buffer
  private frameIndex = 0
  private remainder = Buffer.alloc(0)
  private headerEmitted = false

  constructor(
    passphrase: string | { recoveryPassphrase: string; automationKey: Buffer },
    salt = randomBytes(STREAM_SALT_BYTES),
    baseIv = randomBytes(STREAM_IV_BYTES),
    wrapIv = randomBytes(STREAM_IV_BYTES),
    dek = randomBytes(STREAM_DEK_BYTES)
  ) {
    super()
    this.key = Buffer.from(dek)
    this.header = typeof passphrase === 'string'
      ? encodeStreamHeader(passphrase, salt, baseIv, wrapIv, this.key, STREAM_CHUNK_SIZE)
      : encodeV3StreamHeader(passphrase.recoveryPassphrase, passphrase.automationKey, this.key, STREAM_CHUNK_SIZE)
    this.baseIv = Buffer.from(inspectStreamHeader(this.header).baseIv, 'hex')
  }

  private emitHeader(): void {
    if (!this.headerEmitted) {
      this.push(this.header)
      this.headerEmitted = true
    }
  }

  private emitFrame(chunk: Buffer, isFinal: boolean): void {
    if (this.frameIndex > MAX_FRAME_INDEX) throw new Error('عدد إطارات التدفق تجاوز الحد الآمن.')
    this.push(encryptFrame(chunk, this.key, this.baseIv, this.frameIndex++, isFinal, this.header, STREAM_CHUNK_SIZE))
  }

  getHeaderMetadata(): StreamCryptoHeader {
    return inspectStreamHeader(this.header)
  }

  _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback): void {
    try {
      this.emitHeader()
      let input = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      if (this.remainder.length > 0) {
        const needed = STREAM_CHUNK_SIZE - this.remainder.length
        if (input.length < needed) {
          this.remainder = Buffer.concat([this.remainder, input])
          callback()
          return
        }
        this.emitFrame(Buffer.concat([this.remainder, input.subarray(0, needed)]), false)
        this.remainder = Buffer.alloc(0)
        input = input.subarray(needed)
      }
      while (input.length >= STREAM_CHUNK_SIZE) {
        this.emitFrame(input.subarray(0, STREAM_CHUNK_SIZE), false)
        input = input.subarray(STREAM_CHUNK_SIZE)
      }
      this.remainder = Buffer.from(input)
      callback()
    } catch (error) {
      callback(error as Error)
    }
  }

  _flush(callback: TransformCallback): void {
    try {
      this.emitHeader()
      this.emitFrame(this.remainder, true)
      this.key.fill(0)
      this.remainder = Buffer.alloc(0)
      callback()
    } catch (error) {
      callback(error as Error)
    }
  }

  _destroy(error: Error | null, callback: (error?: Error | null) => void): void {
    this.key.fill(0)
    this.remainder.fill(0)
    this.remainder = Buffer.alloc(0)
    callback(error)
  }
}

export class DecryptStream extends Transform {
  private readonly secret: StreamDecryptSecret
  private key: Buffer | null = null
  private baseIv: Buffer | null = null
  private header: Buffer | null = null
  private chunkSize = 0
  private frameIndex = 0
  private accumulator = Buffer.alloc(0)
  private finalSeen = false
  private peakBufferedBytes = 0
  private metadata: StreamCryptoHeader | null = null

  constructor(secret: StreamDecryptSecret) {
    super()
    this.secret = secret
  }

  private consumeAvailable(): void {
    if (!this.header) {
      if (this.accumulator.length < STREAM_MAGIC_HEADER.length + 3) return
      const headerBytes = getStreamHeaderBytes(this.accumulator)
      if (this.accumulator.length < headerBytes) return
      this.header = Buffer.from(this.accumulator.subarray(0, headerBytes))
      const parsed = parseStreamHeader(this.header, this.secret)
      this.key = parsed.key
      this.baseIv = parsed.baseIv
      this.chunkSize = parsed.chunkSize
      this.metadata = parsed.metadata
      this.accumulator = this.accumulator.subarray(headerBytes)
    }
    while (!this.finalSeen && this.accumulator.length >= FRAME_HEADER_BYTES) {
      const flag = this.accumulator.readUInt8(0)
      if (flag !== 0 && flag !== 1) throw new Error('علامة نهاية إطار التشفير غير صالحة.')
      const cipherLength = this.accumulator.readUInt32BE(1)
      if (cipherLength > this.chunkSize || (flag === 0 && cipherLength === 0)) throw new Error('حجم إطار البيانات المعلن خارج الحدود الآمنة.')
      const total = FRAME_HEADER_BYTES + cipherLength + STREAM_TAG_BYTES
      if (this.accumulator.length < total) return
      const decoded = decryptFrame(this.accumulator.subarray(0, total), this.key!, this.baseIv!, this.frameIndex++, this.header, this.chunkSize)
      this.accumulator = this.accumulator.subarray(decoded.consumedBytes)
      this.push(decoded.plainText)
      this.finalSeen = decoded.isFinal
      if (this.finalSeen && this.accumulator.length > 0) throw new Error('تم العثور على بيانات زائدة غير موثقة بعد إطار النهاية.')
    }
  }

  _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback): void {
    try {
      if (this.finalSeen) throw new Error('تم العثور على بيانات زائدة بعد إطار النهاية.')
      const input = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      for (let offset = 0; offset < input.length; offset += STREAM_CHUNK_SIZE) {
        const slice = input.subarray(offset, Math.min(offset + STREAM_CHUNK_SIZE, input.length))
        this.accumulator = Buffer.concat([this.accumulator, slice])
        this.peakBufferedBytes = Math.max(this.peakBufferedBytes, this.accumulator.length)
        if (this.accumulator.length > MAX_DECRYPT_BUFFER_BYTES) {
          throw new Error('تجاوز مخزن فك التشفير الحد الأقصى المسموح.')
        }
        this.consumeAvailable()
      }
      callback()
    } catch (error) {
      callback(error as Error)
    }
  }

  _flush(callback: TransformCallback): void {
    try {
      this.consumeAvailable()
      if (!this.header || !this.finalSeen) throw new Error('تدفق البيانات انتهى بشكل غير متوقع قبل إطار النهاية الموثوق.')
      if (this.accumulator.length !== 0) throw new Error('تم العثور على بيانات زائدة أو إطار غير مكتمل بعد النهاية.')
      this.key?.fill(0)
      callback()
    } catch (error) {
      callback(error as Error)
    }
  }

  getHeaderMetadata(): StreamCryptoHeader | null {
    return this.metadata
  }

  getPeakBufferedBytes(): number {
    return this.peakBufferedBytes
  }

  _destroy(error: Error | null, callback: (error?: Error | null) => void): void {
    this.key?.fill(0)
    this.accumulator.fill(0)
    this.accumulator = Buffer.alloc(0)
    callback(error)
  }
}


