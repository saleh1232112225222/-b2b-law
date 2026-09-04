import { describe, it } from 'vitest'
import { getClient } from '../db/connection'
import { CANONICAL_CONTRACT_REGISTRY } from '../shared/canonicalContract'

describe('Check PK and Unique constraints for every canonical entity', () => {
  it('checks PostgreSQL constraints against primaryKey', async () => {
    const client = await getClient()
    try {
      const mismatches: Array<{ entity: string; table: string; pk: string[]; actual: string[] }> = []

      for (const [entityName, contract] of Object.entries(CANONICAL_CONTRACT_REGISTRY)) {
        if (!contract.pgBinding) continue
        const tableName = contract.pgBinding.tableName
        const pk = contract.pgBinding.primaryKey

        const constraintCheck = await client.query(`
          SELECT conname, contype, pg_get_constraintdef(c.oid) as def
          FROM pg_constraint c
          JOIN pg_class t ON c.conrelid = t.oid
          WHERE t.relname = $1 AND c.contype IN ('p', 'u')
        `, [tableName])

        const defs = constraintCheck.rows.map(r => r.def)
        
        // Also check if index exists with unique constraint
        const indexCheck = await client.query(`
          SELECT indexname, indexdef
          FROM pg_indexes
          WHERE tablename = $1
        `, [tableName])

        const idxDefs = indexCheck.rows.map(r => r.indexdef)

        // To satisfy ON CONFLICT (col1, col2), Postgres requires a UNIQUE constraint or UNIQUE INDEX on exactly (col1, col2)
        const exactMatch = defs.some(d => {
          const match = d.match(/\(([^)]+)\)/)
          if (!match) return false
          const cols = match[1].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
          return cols.length === pk.length && cols.every((c, i) => c === pk[i])
        }) || idxDefs.some(d => {
          if (!d.toUpperCase().includes('UNIQUE INDEX')) return false
          const match = d.match(/\(([^)]+)\)/)
          if (!match) return false
          const cols = match[1].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
          return cols.length === pk.length && cols.every((c, i) => c === pk[i])
        })

        if (!exactMatch) {
          mismatches.push({
            entity: entityName,
            table: tableName,
            pk,
            actual: defs
          })
        }
      }

      console.log('CONSTRAINTS CHECK RESULTS: Found', mismatches.length, 'mismatches:')
      for (const m of mismatches) {
        console.log(`❌ ${m.entity} (table: ${m.table}) - expected PK: [${m.pk.join(', ')}] but DB has:`, m.actual)
      }
    } finally {
      client.release()
    }
  })
})
