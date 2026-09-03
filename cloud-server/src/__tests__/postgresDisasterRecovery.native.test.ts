import { randomBytes, randomUUID } from 'crypto'
import { Client } from 'pg'
import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { PostgresDisasterRecovery, spawnCommand, type CommandRunner } from '../recovery/postgresDisasterRecovery'
import { createEncryptedDrBundle, extractEncryptedDrBundle } from '../recovery/drBundle'
import { LocalIndependentStorage } from '../recovery/independentStorage'

const adminUrl = process.env.TEST_POSTGRES_ADMIN_URL
const dockerContainer = process.env.TEST_POSTGRES_DOCKER_CONTAINER
const execFileAsync = promisify(execFile)

const dockerCommand: CommandRunner = async (command, originalArgs, options) => {
  if (!dockerContainer) return spawnCommand(command, originalArgs, options)
  const args: string[] = []
  for (let index = 0; index < originalArgs.length; index++) {
    if (originalArgs[index] === '--host' || originalArgs[index] === '--port') { index++; continue }
    args.push(originalArgs[index])
  }
  const containerDump = `/tmp/b2b-dr-${randomUUID()}.dump`
  let hostDump: string | undefined
  const fileIndex = args.indexOf('--file')
  if (fileIndex >= 0) { hostDump = args[fileIndex + 1]; args[fileIndex + 1] = containerDump }
  const listIndex = command === 'pg_restore' && args.includes('--list') ? args.length - 1 : -1
  const restoreIndex = command === 'pg_restore' && !args.includes('--list') ? args.length - 1 : -1
  const inputIndex = listIndex >= 0 ? listIndex : restoreIndex
  if (inputIndex >= 0 && fs.existsSync(args[inputIndex])) {
    hostDump = args[inputIndex]
    await execFileAsync('docker', ['cp', hostDump, `${dockerContainer}:${containerDump}`])
    args[inputIndex] = containerDump
  }
  try {
    const result = await execFileAsync('docker', ['exec', dockerContainer, command, ...args], { encoding: 'utf8' })
    if (command === 'pg_dump' && hostDump) await execFileAsync('docker', ['cp', `${dockerContainer}:${containerDump}`, hostDump])
    return { stdout: result.stdout, stderr: result.stderr }
  } finally {
    if (command === 'pg_dump' || inputIndex >= 0) await execFileAsync('docker', ['exec', dockerContainer, 'rm', '-f', containerDump]).catch(() => undefined)
  }
}

function databaseUrl(base: string, database: string): string { const value = new URL(base); value.pathname = `/${database}`; return value.toString() }

describe.skipIf(!adminUrl)('live PostgreSQL disaster recovery drill', () => {
  it('backs up data and attachments, restores into a new empty database, and verifies structural parity', async () => {
    const suffix = randomUUID().replaceAll('-', '').slice(0, 16)
    const sourceName = `dr_src_${suffix}`; const targetName = `dr_dst_${suffix}`
    const admin = new Client({ connectionString: adminUrl }); await admin.connect()
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'b2b-live-dr-'))
    try {
      await admin.query(`CREATE DATABASE ${sourceName}`); await admin.query(`CREATE DATABASE ${targetName}`)
      const source = new Client({ connectionString: databaseUrl(adminUrl!, sourceName) }); await source.connect()
      await source.query(`CREATE TABLE companies(id uuid PRIMARY KEY,name text NOT NULL UNIQUE);
        CREATE TABLE clients(id uuid PRIMARY KEY,company_id uuid NOT NULL REFERENCES companies(id),name text NOT NULL);
        INSERT INTO companies VALUES('11111111-1111-4111-8111-111111111111','DR Tenant');
        INSERT INTO clients VALUES('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','Client A'),('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','Client B');`)
      await source.end()
      const attachments = path.join(root, 'source-attachments'); fs.mkdirSync(attachments); fs.writeFileSync(path.join(attachments, 'evidence.pdf'), '%PDF-live-dr')
      const backupDir = path.join(root, 'backup'); const restoredAttachments = path.join(root, 'restored-attachments')
      const dr = new PostgresDisasterRecovery(dockerContainer ? dockerCommand : spawnCommand)
      const manifest = await dr.backup({ databaseUrl: databaseUrl(adminUrl!, sourceName), outputDir: backupDir, attachmentRoot: attachments })
      const artifact = path.join(root, 'complete.b2bdr'); const automationKey = randomBytes(32)
      const encrypted = await createEncryptedDrBundle(backupDir, artifact, { recoveryPassphrase: 'Live independent recovery passphrase 2026', automationKey })
      const storage = new LocalIndependentStorage(path.join(root, 'independent-account'))
      const stored = await storage.putVerified(artifact, 'complete.b2bdr', encrypted.sha256)
      const downloaded = path.join(root, 'downloaded.b2bdr'); await storage.download(stored.id, downloaded)
      const extracted = path.join(root, 'extracted'); await extractEncryptedDrBundle(downloaded, extracted, { automationKey })
      await dr.restore({ databaseUrl: databaseUrl(adminUrl!, targetName), backupDir: extracted, attachmentTargetRoot: restoredAttachments })
      const restored = new Client({ connectionString: databaseUrl(adminUrl!, targetName) }); await restored.connect()
      const tables = (await restored.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(row => row.tablename)
      const constraints = (await restored.query("SELECT contype,count(*)::int count FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' GROUP BY contype ORDER BY contype")).rows
      const counts = { companies: Number((await restored.query('SELECT count(*) count FROM companies')).rows[0].count), clients: Number((await restored.query('SELECT count(*) count FROM clients')).rows[0].count) }
      await restored.end()
      expect(tables).toEqual(['clients', 'companies'])
      expect(constraints).toEqual(expect.arrayContaining([expect.objectContaining({ contype: 'f', count: 1 }), expect.objectContaining({ contype: 'p', count: 2 }), expect.objectContaining({ contype: 'u', count: 1 })]))
      expect(counts).toEqual({ companies: 1, clients: 2 })
      expect(fs.readFileSync(path.join(restoredAttachments, 'evidence.pdf'), 'utf8')).toBe('%PDF-live-dr')
      expect(manifest.attachments).toHaveLength(1)
    } finally {
      for (const name of [sourceName, targetName]) {
        await admin.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1', [name])
        await admin.query(`DROP DATABASE IF EXISTS ${name}`)
      }
      await admin.end(); fs.rmSync(root, { recursive: true, force: true })
    }
  }, 120_000)
})
