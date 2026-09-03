import { Client, type PoolClient } from 'pg'
import { Readable } from 'stream'
import { afterEach, describe, expect, it } from 'vitest'
import { PostgresStagedRestoreAdapter } from '../recovery/postgresRestoreAdapter'
import { DirectoryRecoveryStagingSink } from '../recovery/stagingStore'
import { LocalIndependentStorage } from '../recovery/independentStorage'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { canonicalizeArchiveJson, createEncryptedRecoveryArchive, stageEncryptedRecoveryArchive } from '../shared/recoveryArchive'

const nativeUrl = process.env.TEST_POSTGRES_URL
const sinks: DirectoryRecoveryStagingSink[] = []
const directories: string[] = []
afterEach(() => {
  sinks.splice(0).forEach((sink) => sink.cleanup())
  directories.splice(0).forEach((directory) => fs.rmSync(directory, { recursive: true, force: true }))
})

describe.skipIf(!nativeUrl)('Postgres staged restore on native temporary PostgreSQL', () => {
  it('activates and verifies inside a transaction, then explicitly commits', async () => {
    const setup = new Client({ connectionString: nativeUrl })
    await setup.connect()
    await setup.query('DROP TABLE IF EXISTS companies CASCADE')
    await setup.query('CREATE TABLE companies (id text PRIMARY KEY, name text NOT NULL, trial_expires_at text NOT NULL)')
    await setup.end()

    const sink = new DirectoryRecoveryStagingSink()
    sinks.push(sink)
    const bytes = Buffer.from(canonicalizeArchiveJson({ id: 'tenant-native', name: 'Native Tenant', trial_expires_at: '2030-01-01' }))
    const archive = createEncryptedRecoveryArchive([{ kind: 'record', name: 'companies:000000', source: bytes, byteLength: bytes.length }], {
      contractId: 'b2b-law-canonical-v3', contractHash: 'a'.repeat(64), sourceSchemaHash: 'b'.repeat(64),
      sourceApp: 'desktop', sourceVersion: '1.0.1', tenantId: 'tenant-native', lineage: { type: 'full' }
    }, 'R5-desktop-to-web-passphrase')
    const chunks: Buffer[] = []
    for await (const chunk of archive) chunks.push(Buffer.from(chunk))
    await stageEncryptedRecoveryArchive(Readable.from(chunks), 'R5-desktop-to-web-passphrase', 'tenant-native', sink)

    const backupDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'native-restore-backup-'))
    directories.push(backupDirectory)
    let activeClient: Client | undefined
    const adapter = new PostgresStagedRestoreAdapter(
      sink,
      (_entity, row) => ({
        sql: 'INSERT INTO companies (id, name, trial_expires_at) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name RETURNING id',
        values: [row.id, row.name, row.trial_expires_at]
      }),
      async function* () { yield* [] },
      'a'.repeat(64),
      'b'.repeat(64),
      new LocalIndependentStorage(backupDirectory),
      async () => {
        activeClient = new Client({ connectionString: nativeUrl })
        await activeClient.connect()
        return Object.assign(activeClient, { release: () => void activeClient?.end() }) as unknown as PoolClient
      }
    )
    const context = { tenantId: 'tenant-native', userId: 'user-native', packageSha256: 'c'.repeat(64), previewSha256: 'd'.repeat(64), confirmationToken: 'unused' }
    const stage = await adapter.stage()
    await adapter.validate(stage, context)
    const activation = await adapter.activate(stage, context)
    await adapter.verify(activation)
    const observer = new Client({ connectionString: nativeUrl })
    await observer.connect()
    expect((await observer.query('SELECT count(*)::int AS count FROM companies')).rows[0].count).toBe(0)
    await adapter.commit(activation)
    expect((await observer.query('SELECT id FROM companies')).rows).toEqual([{ id: 'tenant-native' }])
    await observer.end()
    await adapter.cleanup()
  })
})
