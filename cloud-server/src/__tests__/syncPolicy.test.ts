import { describe, expect, it } from 'vitest'
import { assertSyncOperationAllowed, getSyncEntityAdapter, requireSyncIdentity, validateSyncPayload } from '../sync/syncPolicy'

describe('hardened sync policy', () => {
  it('fails closed without authenticated tenant and user identities', () => {
    expect(() => requireSyncIdentity({ auth: undefined } as any)).toThrow('SYNC_AUTH_CONTEXT_REQUIRED')
    expect(() => requireSyncIdentity({ auth: { companyId: 'tenant', userId: '' } } as any)).toThrow('SYNC_AUTH_CONTEXT_REQUIRED')
  })

  it('resolves only server-registered tenant entities', () => {
    expect(getSyncEntityAdapter('clients').tableName).toBe('clients')
    expect(() => getSyncEntityAdapter('clients; DROP TABLE users')).toThrow('SYNC_ENTITY_NOT_ALLOWED')
    expect(() => getSyncEntityAdapter('subscriptions')).toThrow('SYNC_ENTITY_NOT_ALLOWED')
  })

  it('rejects unknown fields and oversized payloads', () => {
    const adapter = getSyncEntityAdapter('clients')
    expect(() => validateSyncPayload(adapter, { id: '1', injected_column: true })).toThrow('SYNC_FIELD_NOT_ALLOWED')
    expect(() => validateSyncPayload(adapter, { created_by: 'server-only-column' })).toThrow('SYNC_FIELD_NOT_ALLOWED')
    expect(() => validateSyncPayload(adapter, { name: 'x'.repeat(600_000) })).toThrow('SYNC_PAYLOAD_TOO_LARGE')
  })

  it('never updates or deletes append-only financial entities', () => {
    const adapter = getSyncEntityAdapter('accounts')
    expect(() => assertSyncOperationAllowed(adapter, 'update')).toThrow('SYNC_APPEND_ONLY_ENTITY')
    expect(() => assertSyncOperationAllowed(adapter, 'delete')).toThrow('SYNC_APPEND_ONLY_ENTITY')
  })
})
