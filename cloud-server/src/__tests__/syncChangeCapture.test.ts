import { describe, expect, it } from 'vitest'
import { getSyncChangeCaptureBindings, postgresTriggerOperation } from '../sync/syncChangeCapture'

describe('web CRUD synchronization change capture', () => {
  it('covers registered direct-tenant entities with allowlisted non-secret payloads', () => {
    const bindings = getSyncChangeCaptureBindings()
    const clients = bindings.find(binding => binding.canonicalName === 'clients')
    expect(clients).toMatchObject({ tableName: 'clients', primaryKey: 'id', tenantColumn: 'company_id' })
    expect(clients?.payloadColumns).toContain('name')
    expect(clients?.payloadColumns).not.toContain('created_by')
    expect(clients?.payloadColumns).not.toContain('direct_notes')
    for (const binding of bindings) {
      expect(binding.payloadColumns).not.toContain('password_hash')
      expect(binding.payloadColumns).not.toContain('refresh_token')
      expect(binding.payloadColumns).not.toContain('otp_secret')
    }
  })

  it('maps PostgreSQL INSERT to the canonical create operation', () => {
    expect(postgresTriggerOperation('INSERT')).toBe('create')
    expect(postgresTriggerOperation('UPDATE')).toBe('update')
    expect(postgresTriggerOperation('DELETE')).toBe('delete')
  })
})
