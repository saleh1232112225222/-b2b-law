/**
 * Test Suite: Streaming Authenticated Encryption (Phase R3)
 */

import { describe, it, expect } from 'vitest'
import { Readable, Writable } from 'stream'
import {
  EncryptStream,
  DecryptStream,
  encryptFrame,
  decryptFrame,
  deriveStreamKey,
  deriveFrameIv,
  inspectStreamHeader,
  MAX_DECRYPT_BUFFER_BYTES,
  PBKDF2_ITERATIONS,
  STREAM_CHUNK_SIZE,
  STREAM_FORMAT_VERSION,
  STREAM_HEADER_BYTES
} from '../../../../src/shared/streamingCrypto'
import { randomBytes } from 'crypto'

async function streamToBuffer(readable: Readable): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

describe('Streaming Authenticated Encryption (Phase R3)', () => {
  const passphrase = 'Ultra-Secure-Passphrase-B2B-Law-2026!'

  it('1. Successfully encrypts and decrypts a multi-chunk stream with roundtrip equality', async () => {
    // 2.5 chunks (160 KB)
    const testData = randomBytes(STREAM_CHUNK_SIZE * 2.5)

    const sourceStream = Readable.from([testData])
    const encryptStream = new EncryptStream(passphrase)
    const decryptStream = new DecryptStream(passphrase)

    const encryptedBuffer = await streamToBuffer(sourceStream.pipe(encryptStream))
    expect(encryptedBuffer.length).toBeGreaterThan(testData.length)

    const decryptedBuffer = await streamToBuffer(Readable.from([encryptedBuffer]).pipe(decryptStream))
    expect(decryptedBuffer.equals(testData)).toBe(true)
  })

  it('2. Rejects decryption when wrong passphrase is provided', async () => {
    const testData = Buffer.from('Confidential Legal Document Content')
    const encryptStream = new EncryptStream(passphrase)
    const encryptedBuffer = await streamToBuffer(Readable.from([testData]).pipe(encryptStream))

    const badDecryptStream = new DecryptStream('Wrong-Passphrase-999!')
    await expect(
      streamToBuffer(Readable.from([encryptedBuffer]).pipe(badDecryptStream))
    ).rejects.toThrow()
  })

  it('3. Detects bit-flipping / payload tampering and fails closed', () => {
    const salt = randomBytes(32)
    const baseIv = randomBytes(12)
    const key = deriveStreamKey(passphrase, salt)
    const plainChunk = Buffer.from('Vital Transaction Record')

    const encryptedFrame = encryptFrame(plainChunk, key, baseIv, 0, true)

    // Flip a bit in the ciphertext
    const tampered = Buffer.from(encryptedFrame)
    tampered[10] ^= 0xff

    expect(() => {
      decryptFrame(tampered, key, baseIv, 0)
    }).toThrow(/فشل التحقق من أصالة الإطار/)
  })

  it('4. Detects frame reordering attack and fails closed', () => {
    const salt = randomBytes(32)
    const baseIv = randomBytes(12)
    const key = deriveStreamKey(passphrase, salt)

    const frame0 = encryptFrame(Buffer.from('Chunk 0'), key, baseIv, 0, false)
    const frame1 = encryptFrame(Buffer.from('Chunk 1'), key, baseIv, 1, true)

    // Attempt to decrypt frame 1 as frame 0
    expect(() => {
      decryptFrame(frame1, key, baseIv, 0)
    }).toThrow(/فشل التحقق من أصالة الإطار/)
  })

  it('5. Detects truncated frames and fails closed', async () => {
    const testData = randomBytes(STREAM_CHUNK_SIZE * 2)
    const encryptStream = new EncryptStream(passphrase)
    const encryptedBuffer = await streamToBuffer(Readable.from([testData]).pipe(encryptStream))

    // Truncate last 20 bytes (stripping final auth tag)
    const truncatedBuffer = encryptedBuffer.subarray(0, encryptedBuffer.length - 20)

    const decryptStream = new DecryptStream(passphrase)
    await expect(
      streamToBuffer(Readable.from([truncatedBuffer]).pipe(decryptStream))
    ).rejects.toThrow(/تدفق البيانات انتهى بشكل غير متوقع/)
  })

  it('6. Rejects authenticated streams with trailing bytes after the final frame', async () => {
    const encrypted = await streamToBuffer(
      Readable.from([Buffer.from('final legal record')]).pipe(new EncryptStream(passphrase))
    )
    const withTrailingBytes = Buffer.concat([encrypted, Buffer.from('UNAUTHENTICATED')])

    await expect(
      streamToBuffer(Readable.from([withTrailingBytes]).pipe(new DecryptStream(passphrase)))
    ).rejects.toThrow(/بيانات زائدة/)
  })

  it('7. Rejects a frame length larger than the authenticated chunk limit before buffering payload', async () => {
    const encrypted = await streamToBuffer(
      Readable.from([Buffer.from('bounded')]).pipe(new EncryptStream(passphrase))
    )
    const malformed = Buffer.from(encrypted.subarray(0, STREAM_HEADER_BYTES + 5))
    malformed.writeUInt32BE(STREAM_CHUNK_SIZE + 1, STREAM_HEADER_BYTES + 1)

    await expect(
      streamToBuffer(Readable.from([malformed]).pipe(new DecryptStream(passphrase)))
    ).rejects.toThrow(/حجم إطار/)
  })

  it('8. Authenticates stream metadata and rejects header tampering', async () => {
    const encrypted = await streamToBuffer(
      Readable.from([Buffer.from('header protected')]).pipe(new EncryptStream(passphrase))
    )
    const tampered = Buffer.from(encrypted)
    tampered[STREAM_HEADER_BYTES - 1] ^= 0x01

    await expect(
      streamToBuffer(Readable.from([tampered]).pipe(new DecryptStream(passphrase)))
    ).rejects.toThrow()
  })

  it('9. Emits bounded frames when the input source supplies one very large chunk', async () => {
    const input = randomBytes(STREAM_CHUNK_SIZE * 5 + 17)
    const encrypted = await streamToBuffer(Readable.from([input]).pipe(new EncryptStream(passphrase)))
    const decrypt = new DecryptStream(passphrase)
    const decrypted = await streamToBuffer(Readable.from([encrypted]).pipe(decrypt))
    expect(decrypted.equals(input)).toBe(true)
    expect(decrypt.getPeakBufferedBytes()).toBeLessThanOrEqual(MAX_DECRYPT_BUFFER_BYTES)
  })

  it('10. Publishes and authenticates a complete versioned recovery key slot', async () => {
    const encrypted = await streamToBuffer(
      Readable.from([Buffer.from('key-slot-metadata')]).pipe(new EncryptStream(passphrase))
    )
    const metadata = inspectStreamHeader(encrypted.subarray(0, STREAM_HEADER_BYTES))
    expect(metadata.formatVersion).toBe(STREAM_FORMAT_VERSION)
    expect(metadata.contentCipher).toBe('AES-256-GCM')
    expect(metadata.keySlots).toEqual([
      expect.objectContaining({
        type: 'recovery_passphrase',
        wrapCipher: 'AES-256-GCM',
        kdf: 'PBKDF2-HMAC-SHA512',
        iterations: PBKDF2_ITERATIONS,
        wrappedKeyBytes: 32,
        tagBytes: 16
      })
    ])
  })
})
