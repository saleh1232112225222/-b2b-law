import * as crypto from 'crypto'

// Base32 Alphabet
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Decode(str: string): Buffer {
  const cleaned = str.replace(/=+$/, '').toUpperCase()
  let bits = ''
  for (let i = 0; i < cleaned.length; i++) {
    const val = ALPHABET.indexOf(cleaned[i])
    if (val === -1) throw new Error('Invalid base32 character')
    bits += val.toString(2).padStart(5, '0')
  }
  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2))
  }
  return Buffer.from(bytes)
}

export function generateSecret(length = 16): string {
  const bytes = crypto.randomBytes(length)
  let result = ''
  for (let i = 0; i < bytes.length; i++) {
    result += ALPHABET[bytes[i] % 32]
  }
  return result
}

export function getQrCodeUrl(username: string, secret: string): string {
  const label = encodeURIComponent(`B2B-LAW:${username}`)
  const issuer = encodeURIComponent('B2B-LAW')
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}`
}

export function verifyToken(secret: string, token: string, window = 1): boolean {
  try {
    const key = base32Decode(secret)
    const epoch = Math.floor(Date.now() / 1000)
    const currentStep = Math.floor(epoch / 30)

    for (let i = -window; i <= window; i++) {
      const step = currentStep + i
      const stepBuffer = Buffer.alloc(8)
      // Write 64-bit integer
      let temp = step
      for (let j = 7; j >= 0; j--) {
        stepBuffer[j] = temp & 0xff
        temp = temp >> 8
      }

      const hmac = crypto.createHmac('sha1', key).update(stepBuffer).digest()
      const offset = hmac[hmac.length - 1] & 0xf
      const binary =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff)

      const code = (binary % 1000000).toString().padStart(6, '0')
      if (code === token.trim()) {
        return true
      }
    }
  } catch (err) {
    console.error('[TOTP] Verification error:', err)
  }
  return false
}
