import type { Request } from 'express'
import { CANONICAL_CONTRACT_REGISTRY, type PlatformTableBinding } from '../shared/canonicalContract'

export const MAX_SYNC_BATCH = 100
export const MAX_SYNC_PAGE = 500
export const MAX_SYNC_PAYLOAD_BYTES = 512 * 1024

export interface SyncIdentity { companyId: string; userId: string }
export interface SyncEntityAdapter {
  canonicalName: string
  tableName: string
  primaryKey: string
  tenantColumn: string
  allowedFields: ReadonlySet<string>
  binding: PlatformTableBinding
  immutableFields: ReadonlySet<string>
  appendOnly: boolean
}

export function requireSyncIdentity(req: Request): SyncIdentity {
  const companyId = req.auth?.companyId?.trim()
  const userId = req.auth?.userId?.trim()
  if (!companyId || !userId) throw new Error('SYNC_AUTH_CONTEXT_REQUIRED')
  return { companyId, userId }
}

export function getSyncEntityAdapter(entityType: unknown): SyncEntityAdapter {
  if (typeof entityType !== 'string') throw new Error('SYNC_ENTITY_REQUIRED')
  const contract = CANONICAL_CONTRACT_REGISTRY[entityType]
  const binding = contract?.pgBinding
  const desktopBinding = contract?.sqliteBinding
  if (
    !contract || !binding || !desktopBinding || contract.syncPolicy !== 'bidirectional' ||
    contract.exportPolicy !== 'tenant_export' ||
    binding.primaryKey.length !== 1 ||
    binding.tenantScope.kind !== 'column'
  ) throw new Error('SYNC_ENTITY_NOT_ALLOWED')
  return {
    canonicalName: contract.canonicalName,
    tableName: binding.tableName,
    primaryKey: binding.primaryKey[0],
    tenantColumn: binding.tenantScope.column,
    allowedFields: new Set(binding.allowedImportColumns.filter(field => desktopBinding.allowedExportColumns.includes(field))),
    binding,
    immutableFields: new Set(contract.immutableColumns),
    appendOnly: contract.isAppendOnly
  }
}

export function validateSyncPayload(adapter: SyncEntityAdapter, payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('SYNC_PAYLOAD_INVALID')
  if (Buffer.byteLength(JSON.stringify(payload), 'utf8') > MAX_SYNC_PAYLOAD_BYTES) throw new Error('SYNC_PAYLOAD_TOO_LARGE')
  for (const field of Object.keys(payload)) {
    if (!adapter.allowedFields.has(field)) throw new Error(`SYNC_FIELD_NOT_ALLOWED:${field}`)
  }
  return payload as Record<string, unknown>
}

export function assertSyncOperationAllowed(adapter: SyncEntityAdapter, operation: unknown): asserts operation is 'create' | 'update' | 'delete' {
  if (!['create', 'update', 'delete'].includes(String(operation))) throw new Error('SYNC_OPERATION_INVALID')
  if (adapter.appendOnly && operation !== 'create') throw new Error('SYNC_APPEND_ONLY_ENTITY')
}

export function quoteRegisteredIdentifier(identifier: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(identifier)) throw new Error('UNSAFE_REGISTERED_IDENTIFIER')
  return `"${identifier}"`
}
