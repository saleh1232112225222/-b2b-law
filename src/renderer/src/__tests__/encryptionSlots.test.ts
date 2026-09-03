import { describe, expect, it } from 'vitest'
import { randomBytes } from 'crypto'
import { createEncryptedEnvelope, decryptEnvelopeWithAutomationKey, decryptEnvelopeWithPassphrase } from '../../../../src/shared/encryption'

describe('portable package dual key slots', () => {
  it('wraps the same DEK for independent recovery and automation credentials', () => {
    const automationKey = randomBytes(32)
    const envelope = createEncryptedEnvelope('office-backup', 'recovery-passphrase-123', automationKey)
    expect(envelope.keySlots.map(slot => slot.type).sort()).toEqual(['automation_key', 'recovery_passphrase'])
    expect(decryptEnvelopeWithPassphrase(envelope, 'recovery-passphrase-123').toString()).toBe('office-backup')
    expect(decryptEnvelopeWithAutomationKey(envelope, automationKey).toString()).toBe('office-backup')
    expect(() => decryptEnvelopeWithAutomationKey(envelope, randomBytes(32))).toThrow()
  })
})
