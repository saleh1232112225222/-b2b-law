import fs from 'fs'
import os from 'os'
import path from 'path'
import { randomBytes } from 'crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  PostgresDisasterRecovery,
  applyRetentionPolicy,
  decryptDumpFile,
  encryptDumpFile
} from '../recovery/postgresDisasterRecovery'

const roots: string[] = []
afterEach(() => roots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true })))

describe('standalone PostgreSQL disaster recovery tooling', () => {
  it('creates a verified custom-format dump and attachment hash inventory without exposing the password in arguments', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'b2b-pgdr-')); roots.push(root)
    const attachments = path.join(root, 'attachments'); fs.mkdirSync(attachments)
    fs.writeFileSync(path.join(attachments, 'evidence.pdf'), '%PDF-evidence')
    const run = vi.fn(async (command: string, args: string[], options: { env: NodeJS.ProcessEnv }) => {
      expect(args.join(' ')).not.toContain('super-secret')
      expect(options.env.PGPASSWORD).toBe('super-secret')
      if (command === 'pg_dump') fs.writeFileSync(args[args.indexOf('--file') + 1], 'CUSTOM-DUMP')
      return { stdout: command === 'pg_restore' ? 'toc-ok' : '', stderr: '' }
    })
    const dr = new PostgresDisasterRecovery(run)
    const manifest = await dr.backup({ databaseUrl: 'postgresql://law:super-secret@127.0.0.1:5433/b2b', outputDir: path.join(root, 'backup'), attachmentRoot: attachments })
    expect(manifest.dump.format).toBe('postgres-custom')
    expect(manifest.dump.sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(manifest.attachments).toEqual([expect.objectContaining({ relativePath: 'evidence.pdf', byteLength: 13 })])
    expect(fs.readFileSync(path.join(root, 'backup', 'attachments', 'evidence.pdf'), 'utf8')).toBe('%PDF-evidence')
    expect(fs.existsSync(path.join(root, 'backup', 'manifest.json'))).toBe(true)
    expect(run.mock.calls.map(call => call[0])).toEqual(['pg_dump', 'pg_restore'])
  })

  it('refuses restore when the target database is not empty', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'b2b-pgdr-')); roots.push(root)
    const backupDir = path.join(root, 'backup'); fs.mkdirSync(backupDir)
    fs.writeFileSync(path.join(backupDir, 'database.dump'), 'CUSTOM-DUMP')
    const run = vi.fn(async (command: string) => ({ stdout: command === 'psql' ? '1\n' : '', stderr: '' }))
    const dr = new PostgresDisasterRecovery(run)
    await expect(dr.restore({ databaseUrl: 'postgresql://law:secret@127.0.0.1:5433/target', backupDir })).rejects.toThrow('DR_TARGET_DATABASE_NOT_EMPTY')
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('applies retention policy while strictly preserving the latest verified backup', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'b2b-pgdr-')); roots.push(root)
    const backupsRoot = path.join(root, 'backups'); fs.mkdirSync(backupsRoot)
    const createBackup = (name: string, isoDate: string) => {
      const dir = path.join(backupsRoot, name); fs.mkdirSync(dir)
      fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ formatVersion: 1, createdAt: isoDate, verifiedAt: isoDate, dump: { file: 'database.dump', format: 'postgres-custom', byteLength: 10, sha256: 'a'.repeat(64) }, attachments: [] }))
    }
    createBackup('backup-old-1', '2026-01-01T00:00:00Z')
    createBackup('backup-old-2', '2026-01-02T00:00:00Z')
    createBackup('backup-latest', '2026-01-03T00:00:00Z')

    const result = applyRetentionPolicy(backupsRoot, { keepLatest: 2, daily: 0, weekly: 0, monthly: 0 })
    expect(result.retained).toEqual(['backup-latest', 'backup-old-2'])
    expect(result.deleted).toEqual(['backup-old-1'])
    expect(fs.existsSync(path.join(backupsRoot, 'backup-latest'))).toBe(true)
    expect(fs.existsSync(path.join(backupsRoot, 'backup-old-1'))).toBe(false)
  })

  it('keeps 14 daily, 8 weekly, 12 monthly verified generations and never deletes unverified attempts', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'b2b-pgdr-')); roots.push(root)
    const backupsRoot = path.join(root, 'backups'); fs.mkdirSync(backupsRoot)
    for (let day = 0; day < 420; day += 7) {
      const createdAt = new Date(Date.UTC(2026, 7, 1) - day * 86400000).toISOString()
      const dir = path.join(backupsRoot, `verified-${day}`); fs.mkdirSync(dir)
      fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ formatVersion: 1, createdAt, verifiedAt: createdAt, dump: { file: 'database.dump', format: 'postgres-custom', byteLength: 1, sha256: 'a'.repeat(64) }, attachments: [] }))
    }
    const failed = path.join(backupsRoot, 'newer-unverified'); fs.mkdirSync(failed)
    fs.writeFileSync(path.join(failed, 'manifest.json'), JSON.stringify({ formatVersion: 1, createdAt: '2026-08-02T00:00:00Z', dump: { file: 'database.dump' }, attachments: [] }))
    const result = applyRetentionPolicy(backupsRoot, { keepLatest: 1, daily: 14, weekly: 8, monthly: 12 })
    expect(result.retained).toContain('newer-unverified')
    expect(fs.existsSync(failed)).toBe(true)
    expect(result.retained.filter((name) => name.startsWith('verified-')).length).toBeGreaterThanOrEqual(12)
    expect(result.deleted.length).toBeGreaterThan(0)
  })

  it('encrypts and decrypts DR dump with streamingCrypto v3 dual slots', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'b2b-pgdr-')); roots.push(root)
    const sourceDump = path.join(root, 'database.dump')
    const originalContent = Buffer.from('CUSTOM-DUMP-CONTENT-FOR-DR-VERIFICATION')
    fs.writeFileSync(sourceDump, originalContent)

    const encryptedDump = path.join(root, 'database.dump.enc')
    const decryptedDump = path.join(root, 'database.dump.restored')
    const automationKey = randomBytes(32)

    await encryptDumpFile(sourceDump, encryptedDump, {
      recoveryPassphrase: 'Strong recovery passphrase 2026',
      automationKey
    })

    // Decrypt using automationKey
    await decryptDumpFile(encryptedDump, decryptedDump, { automationKey })
    expect(fs.readFileSync(decryptedDump)).toEqual(originalContent)

    // Decrypt using recoveryPassphrase
    const decryptedPassphrase = path.join(root, 'database.dump.restored.pass')
    await decryptDumpFile(encryptedDump, decryptedPassphrase, 'Strong recovery passphrase 2026')
    expect(fs.readFileSync(decryptedPassphrase)).toEqual(originalContent)
  })
})
