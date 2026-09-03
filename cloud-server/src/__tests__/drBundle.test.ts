import fs from 'fs'
import os from 'os'
import path from 'path'
import { createHash, randomBytes } from 'crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { createEncryptedDrBundle, extractEncryptedDrBundle } from '../recovery/drBundle'

const roots: string[] = []
afterEach(() => roots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true })))

describe('encrypted complete disaster-recovery bundle', () => {
  it('wraps dump, manifest, and attachment bytes in streamingCrypto v3 dual slots', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'b2b-dr-bundle-')); roots.push(root)
    const backup = path.join(root, 'backup'); fs.mkdirSync(path.join(backup, 'attachments'), { recursive: true })
    const dump = Buffer.from('CUSTOM-POSTGRES-DUMP')
    const attachment = Buffer.from('%PDF-independent-evidence')
    fs.writeFileSync(path.join(backup, 'database.dump'), dump)
    fs.writeFileSync(path.join(backup, 'attachments', 'evidence.pdf'), attachment)
    fs.writeFileSync(path.join(backup, 'manifest.json'), JSON.stringify({
      formatVersion: 1, createdAt: new Date().toISOString(), verifiedAt: new Date().toISOString(),
      dump: { file: 'database.dump', format: 'postgres-custom', byteLength: dump.length, sha256: createHash('sha256').update(dump).digest('hex') },
      attachments: [{ relativePath: 'evidence.pdf', byteLength: attachment.length, sha256: createHash('sha256').update(attachment).digest('hex') }]
    }))
    const bundle = path.join(root, 'complete.b2bdr')
    const automationKey = randomBytes(32)
    const result = await createEncryptedDrBundle(backup, bundle, { recoveryPassphrase: 'Independent recovery passphrase 2026', automationKey })
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(fs.readFileSync(bundle).includes(dump)).toBe(false)
    const extracted = path.join(root, 'extracted')
    await extractEncryptedDrBundle(bundle, extracted, { automationKey })
    expect(fs.readFileSync(path.join(extracted, 'database.dump'))).toEqual(dump)
    expect(fs.readFileSync(path.join(extracted, 'attachments', 'evidence.pdf'))).toEqual(attachment)
  })
})
