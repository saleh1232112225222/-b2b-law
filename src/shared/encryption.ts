/**
 * B2B-LAW Envelope Encryption Module (Phase 3)
 * Provides cross-machine portable AES-256-GCM encryption with Argon2id / Scrypt Key Derivation.
 * Independent of machine ID, enabling clean-machine disaster recovery via recovery passphrase.
 */

import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from 'crypto'

export interface KeySlot {
  type: 'recovery_passphrase' | 'automation_key'
  kdf: 'scrypt'
  salt: string // hex
  iterations: number
  keyLength: number
  encryptedDek: string // hex (DEK encrypted by KEK)
  iv: string // hex
  tag: string // hex
}

export interface EncryptedEnvelope {
  formatVersion: number
  algorithm: 'AES-256-GCM'
  keySlots: KeySlot[]
  iv: string // hex
  tag: string // hex
  ciphertext: string // hex or base64
}

export const SCRYPT_N = 16384
export const SCRYPT_R = 8
export const SCRYPT_P = 1
export const KEY_LEN = 32 // 256 bits
export const ENVELOPE_SALT_BYTES = 16
export const GCM_IV_BYTES = 12
export const GCM_TAG_BYTES = 16

/**
 * Derives a Key Encryption Key (KEK) from a human recovery passphrase using Scrypt
 */
export function deriveKeyFromPassphrase(passphrase: string, salt: Buffer): Buffer {
  if (typeof passphrase !== 'string' || passphrase.normalize('NFKC').length < 12) {
    throw new Error('كلمة مرور الاسترداد يجب أن لا تقل عن 12 خانة.')
  }
  if (!Buffer.isBuffer(salt) || salt.length !== ENVELOPE_SALT_BYTES) {
    throw new Error('طول ملح اشتقاق المفتاح غير صالح.')
  }
  return scryptSync(passphrase.normalize('NFKC'), salt, KEY_LEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P
  })
}

/**
 * Encrypts arbitrary payload using envelope encryption with a recovery passphrase
 */
export function createEncryptedEnvelope(
  payload: Buffer | string,
  recoveryPassphrase?: string,
  automationMasterKey?: Buffer
): EncryptedEnvelope {
  if (!recoveryPassphrase && !automationMasterKey) {
    throw new Error('يجب توفير منفذ مفتاح واحد على الأقل لتشفير الحزمة.')
  }
  if (automationMasterKey && automationMasterKey.length !== KEY_LEN) {
    throw new Error('طول مفتاح الأتمتة غير صالح.')
  }
  const dataBuffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'utf8')

  // 1. Generate random 256-bit Data Encryption Key (DEK)
  const dek = randomBytes(32)

  // 2. Encrypt payload with DEK using AES-256-GCM
  const payloadIv = randomBytes(GCM_IV_BYTES) // 96-bit nonce for GCM
  const cipher = createCipheriv('aes-256-gcm', dek, payloadIv)
  const ciphertext = Buffer.concat([cipher.update(dataBuffer), cipher.final()])
  const payloadTag = cipher.getAuthTag()

  const keySlots: KeySlot[] = []

  // 3. Slot A: Recovery Passphrase (if provided)
  if (recoveryPassphrase) {
    const salt = randomBytes(ENVELOPE_SALT_BYTES)
    const kek = deriveKeyFromPassphrase(recoveryPassphrase, salt)
    const slotIv = randomBytes(GCM_IV_BYTES)
    const slotCipher = createCipheriv('aes-256-gcm', kek, slotIv)
    const encryptedDek = Buffer.concat([slotCipher.update(dek), slotCipher.final()])
    const slotTag = slotCipher.getAuthTag()

    keySlots.push({
      type: 'recovery_passphrase',
      kdf: 'scrypt',
      salt: salt.toString('hex'),
      iterations: SCRYPT_N,
      keyLength: KEY_LEN,
      encryptedDek: encryptedDek.toString('hex'),
      iv: slotIv.toString('hex'),
      tag: slotTag.toString('hex')
    })
  }

  // 4. Slot B: Automation Master Key (if provided)
  if (automationMasterKey) {
    const slotIv = randomBytes(GCM_IV_BYTES)
    const slotCipher = createCipheriv('aes-256-gcm', automationMasterKey, slotIv)
    const encryptedDek = Buffer.concat([slotCipher.update(dek), slotCipher.final()])
    const slotTag = slotCipher.getAuthTag()

    keySlots.push({
      type: 'automation_key',
      kdf: 'scrypt',
      salt: '',
      iterations: 0,
      keyLength: KEY_LEN,
      encryptedDek: encryptedDek.toString('hex'),
      iv: slotIv.toString('hex'),
      tag: slotTag.toString('hex')
    })
  }

  return {
    formatVersion: 2,
    algorithm: 'AES-256-GCM',
    keySlots,
    iv: payloadIv.toString('hex'),
    tag: payloadTag.toString('hex'),
    ciphertext: ciphertext.toString('base64')
  }
}

/**
 * Decrypts an envelope using the recovery passphrase
 */
export function decryptEnvelopeWithPassphrase(
  envelope: EncryptedEnvelope,
  passphrase: string
): Buffer {
  const slot = envelope.keySlots.find((s) => s.type === 'recovery_passphrase')
  if (!slot) {
    throw new Error('حزمة النسخ الاحتياطي لا تحتوي على منفذ استرداد بكلمة المرور.')
  }

  if (
    slot.kdf !== 'scrypt' ||
    slot.iterations !== SCRYPT_N ||
    slot.keyLength !== KEY_LEN ||
    !/^[a-f0-9]{32}$/.test(slot.salt) ||
    !/^[a-f0-9]{24}$/.test(slot.iv) ||
    !/^[a-f0-9]{32}$/.test(slot.tag) ||
    !/^[a-f0-9]{64}$/.test(slot.encryptedDek)
  ) {
    throw new Error('بيانات منفذ مفتاح الاسترداد غير صالحة أو غير مدعومة.')
  }

  const salt = Buffer.from(slot.salt, 'hex')
  const kek = deriveKeyFromPassphrase(passphrase, salt)

  // Decrypt DEK
  const slotIv = Buffer.from(slot.iv, 'hex')
  const slotTag = Buffer.from(slot.tag, 'hex')
  const encryptedDek = Buffer.from(slot.encryptedDek, 'hex')

  const slotDecipher = createDecipheriv('aes-256-gcm', kek, slotIv)
  slotDecipher.setAuthTag(slotTag)

  let dek: Buffer
  try {
    dek = Buffer.concat([slotDecipher.update(encryptedDek), slotDecipher.final()])
  } catch (err) {
    throw new Error('كلمة مرور الاسترداد غير صحيحة أو تم التلاعب بمفتاح التشفير.')
  }

  // Decrypt Payload
  const payloadIv = Buffer.from(envelope.iv, 'hex')
  const payloadTag = Buffer.from(envelope.tag, 'hex')
  const ciphertext = Buffer.from(envelope.ciphertext, 'base64')

  const decipher = createDecipheriv('aes-256-gcm', dek, payloadIv)
  decipher.setAuthTag(payloadTag)

  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()])
  } catch (err) {
    throw new Error('فشل فك تشفير محتوى الحزمة: الملف تالف أو تم تعديله.')
  } finally {
    dek.fill(0)
  }
}

export function decryptEnvelopeWithAutomationKey(
  envelope: EncryptedEnvelope,
  automationMasterKey: Buffer
): Buffer {
  if (!Buffer.isBuffer(automationMasterKey) || automationMasterKey.length !== KEY_LEN) {
    throw new Error('طول مفتاح الأتمتة غير صالح.')
  }
  const slot = envelope.keySlots.find((candidate) => candidate.type === 'automation_key')
  if (!slot || slot.salt !== '' || slot.iterations !== 0 || slot.keyLength !== KEY_LEN ||
    !/^[a-f0-9]{24}$/.test(slot.iv) || !/^[a-f0-9]{32}$/.test(slot.tag) || !/^[a-f0-9]{64}$/.test(slot.encryptedDek)) {
    throw new Error('بيانات منفذ مفتاح الأتمتة غير صالحة أو غير مدعومة.')
  }
  const unwrapper = createDecipheriv('aes-256-gcm', automationMasterKey, Buffer.from(slot.iv, 'hex'))
  unwrapper.setAuthTag(Buffer.from(slot.tag, 'hex'))
  let dek: Buffer
  try {
    dek = Buffer.concat([unwrapper.update(Buffer.from(slot.encryptedDek, 'hex')), unwrapper.final()])
  } catch {
    throw new Error('مفتاح الأتمتة غير صحيح أو تم التلاعب بمنفذ المفتاح.')
  }
  try {
    const decipher = createDecipheriv('aes-256-gcm', dek, Buffer.from(envelope.iv, 'hex'))
    decipher.setAuthTag(Buffer.from(envelope.tag, 'hex'))
    return Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()])
  } catch {
    throw new Error('فشل فك تشفير محتوى الحزمة: الملف تالف أو تم تعديله.')
  } finally { dek.fill(0) }
}
