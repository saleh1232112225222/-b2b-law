import { CANONICAL_CONTRACT_REGISTRY } from '../shared/canonicalContract'

export interface SyncChangeCaptureBinding {
  canonicalName: string
  tableName: string
  primaryKey: string
  tenantColumn: string
  payloadColumns: string[]
}

const forbiddenSecrets = new Set(['password_hash', 'refresh_token', 'otp_secret', 'reset_token', 'session_token'])

export function postgresTriggerOperation(operation: string): 'create' | 'update' | 'delete' {
  if (operation === 'INSERT') return 'create'
  if (operation === 'UPDATE') return 'update'
  if (operation === 'DELETE') return 'delete'
  throw new Error('SYNC_TRIGGER_OPERATION_INVALID')
}

export function getSyncChangeCaptureBindings(): SyncChangeCaptureBinding[] {
  return Object.values(CANONICAL_CONTRACT_REGISTRY)
    .filter(contract => contract.syncPolicy === 'bidirectional' && contract.exportPolicy === 'tenant_export' && contract.pgBinding?.tenantScope.kind === 'column' && contract.pgBinding.primaryKey.length === 1 && contract.sqliteBinding)
    .map(contract => {
      const binding = contract.pgBinding!
      const desktopFields = new Set(contract.sqliteBinding!.allowedImportColumns)
      return {
        canonicalName: contract.canonicalName,
        tableName: binding.tableName,
        primaryKey: binding.primaryKey[0],
        tenantColumn: binding.tenantScope.kind === 'column' ? binding.tenantScope.column : '',
        payloadColumns: binding.allowedExportColumns.filter(column => desktopFields.has(column) && !binding.sensitiveColumns.includes(column) && !forbiddenSecrets.has(column))
      }
    })
    .sort((left, right) => left.canonicalName.localeCompare(right.canonicalName))
}
