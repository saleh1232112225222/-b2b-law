import { createHash } from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { PGlite } from '@electric-sql/pglite'
import { afterEach, describe, expect, it } from 'vitest'
import type { PoolClient } from 'pg'
import { PostgresStagedRestoreAdapter } from '../recovery/postgresRestoreAdapter'
import { DirectoryRecoveryStagingSink } from '../recovery/stagingStore'
import { LocalIndependentStorage } from '../recovery/independentStorage'

const sinks: DirectoryRecoveryStagingSink[] = []
const directories: string[] = []
afterEach(() => {
  sinks.splice(0).forEach((sink) => sink.cleanup())
  directories.splice(0).forEach((directory) => fs.rmSync(directory, { recursive: true, force: true }))
})

async function stagedCompany(tenantId: string): Promise<DirectoryRecoveryStagingSink> {
  const sink = new DirectoryRecoveryStagingSink()
  sinks.push(sink)
  const bytes = Buffer.from(JSON.stringify({ id: tenantId, name: 'Tenant', trial_expires_at: '2030-01-01' }))
  const descriptor = { kind: 'record' as const, name: 'companies:000000', byteLength: bytes.length }
  await sink.beginEntry(descriptor)
  await sink.writeEntryChunk(bytes)
  await sink.endEntry({ ...descriptor, sha256: createHash('sha256').update(bytes).digest('hex') })
  return sink
}

describe('Postgres staged activation against a PostgreSQL-compatible engine', () => {
  it('keeps verification inside the transaction until explicit commit', async () => {
    const db = new PGlite()
    await db.exec('CREATE TABLE companies (id text PRIMARY KEY, name text NOT NULL, trial_expires_at text NOT NULL)')
    const sink = await stagedCompany('tenant-a')
    const client = {
      query: async (sql: string, values?: unknown[]) => {
        const result = await db.query(sql, values)
        return { ...result, rowCount: result.rows.length || result.affectedRows || 0 }
      },
      release: () => undefined
    } as unknown as PoolClient
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
      async () => client
    )
    const context = { tenantId: 'tenant-a', userId: 'user-a', packageSha256: 'c'.repeat(64), previewSha256: 'd'.repeat(64), confirmationToken: 'unused' }
    const stage = await adapter.stage()
    await adapter.validate(stage, context)
    const activation = await adapter.activate(stage, context)
    await adapter.verify(activation)
    expect(activation.commitOutcome).toBe('open')
    await adapter.commit(activation)
    expect(activation.commitOutcome).toBe('committed')
    expect((await db.query<{ id: string }>('SELECT id FROM companies')).rows).toEqual([{ id: 'tenant-a' }])
    await adapter.cleanup()
    await db.close()
  })
})
    const backupDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'restore-backup-test-'))
    directories.push(backupDirectory)
