import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PoolClient } from 'pg'
import { PostgresStagedRestoreAdapter, type PgActivation } from '../recovery/postgresRestoreAdapter'
import { DirectoryRecoveryStagingSink } from '../recovery/stagingStore'
import { LocalIndependentStorage } from '../recovery/independentStorage'

const roots: string[] = []; const sinks: DirectoryRecoveryStagingSink[] = []
afterEach(() => { sinks.splice(0).forEach((sink) => sink.cleanup()); roots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true })) })

function fixture(verifierResult: 'present' | 'absent' | 'error') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'b2b-commit-reconcile-')); roots.push(root)
  const sink = new DirectoryRecoveryStagingSink(); sinks.push(sink)
  const primary = { query: vi.fn(async () => { throw new Error('connection lost') }), release: vi.fn() } as unknown as PoolClient
  const verifier = {
    query: vi.fn(async () => {
      if (verifierResult === 'error') throw new Error('verification unavailable')
      return { rowCount: verifierResult === 'present' ? 1 : 0, rows: verifierResult === 'present' ? [{ '?column?': 1 }] : [] }
    }), release: vi.fn()
  } as unknown as PoolClient
  const adapter = new PostgresStagedRestoreAdapter(sink, () => ({ sql: '', values: [] }), async function* () { yield* [] }, 'a'.repeat(64), 'b'.repeat(64), new LocalIndependentStorage(root), async () => verifier)
  const activation: PgActivation = { client: primary, importedRows: 1, conflictIgnoredRows: 0, checkedRows: 1, commitOutcome: 'open', verificationQueries: [{ sql: 'SELECT 1', values: [] }] }
  return { adapter, activation, verifier }
}

describe('PostgreSQL indeterminate COMMIT reconciliation', () => {
  it('accepts success only when every committed row is visible through a new connection', async () => {
    const { adapter, activation, verifier } = fixture('present')
    await expect(adapter.commit(activation)).resolves.toBeUndefined()
    expect(activation.commitOutcome).toBe('committed'); expect(verifier.release).toHaveBeenCalled()
  })

  it('classifies a fully absent transaction as confirmed rollback', async () => {
    const { adapter, activation } = fixture('absent')
    await expect(adapter.commit(activation)).rejects.toThrow('RESTORE_COMMIT_CONFIRMED_ROLLED_BACK')
    expect(activation.commitOutcome).toBe('rolled_back')
  })

  it('remains fail-closed when reconciliation itself is unavailable', async () => {
    const { adapter, activation } = fixture('error')
    await expect(adapter.commit(activation)).rejects.toThrow('RESTORE_COMMIT_OUTCOME_UNKNOWN')
    expect(activation.commitOutcome).toBe('unknown')
  })
})
