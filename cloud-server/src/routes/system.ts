import { Router, Request, Response } from 'express'
import { query, getClient } from '../db/connection'
import { authMiddleware } from '../middleware/auth'
import { getCompanyId } from '../middleware/tenant'

export const systemRouter = Router()

systemRouter.use(authMiddleware)

const requireAdminRole = (req: Request, res: Response, next: Function) => {
  if (req.auth?.roleKey !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

systemRouter.get('/system/diagnostic', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const username = req.auth?.username || 'unknown'
    const roleKey = req.auth?.roleKey || 'unknown'

    const tablesResult = await query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
      []
    )
    const inventory: { name: string; count: number }[] = []
    for (const row of tablesResult.rows) {
      const table = row.table_name as string
      try {
        const result = await query(
          `SELECT COUNT(*) as count FROM ${table} WHERE company_id = $1`,
          [companyId]
        )
        inventory.push({ name: table, count: parseInt(result.rows[0].count) })
      } catch {
        inventory.push({ name: table, count: -1 })
      }
    }

    const totalRecords = inventory.reduce((s, t) => s + (t.count > 0 ? t.count : 0), 0)
    const tablesWithData = inventory.filter((t) => t.count > 0).length

    res.json({
      companyId,
      username,
      roleKey,
      totalTables: inventory.length,
      tablesWithData,
      totalRecords,
      tables: inventory.filter((t) => t.count > 0),
      emptyTables: inventory.filter((t) => t.count === 0).map((t) => t.name),
      missingTables: inventory.filter((t) => t.count === -1).map((t) => t.name)
    })
  } catch (err) {
    console.error('[Diagnostic] Error:', err)
    res.status(500).json({ error: 'Diagnostic failed' })
  }
})

systemRouter.get('/system/settings', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const result = await query('SELECT key, value FROM firm_data WHERE company_id = $1', [
      companyId
    ])
    const settings: Record<string, any> = {
      officeName: '',
      firmAddress: '',
      firmPhone: '',
      firmEmail: '',
      theme: 'light',
      activityLogRetentionDays: 365,
      casesRootPath: '',
      taskNotificationsEnabled: true,
      taskNotificationLeadDays: 1
    }
    for (const row of result.rows) {
      try {
        settings[row.key] = JSON.parse(row.value)
      } catch {
        settings[row.key] = row.value
      }
    }
    res.json(settings)
  } catch (err) {
    console.error('[Settings] Get error:', err)
    res.status(500).json({ error: 'Failed to get settings' })
  }
})

systemRouter.put('/system/settings', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const body = req.body
    for (const [key, value] of Object.entries(body)) {
      const val = typeof value === 'string' ? value : JSON.stringify(value)
      await query(
        `INSERT INTO firm_data (company_id, key, value, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (company_id, key)
         DO UPDATE SET value = $3, updated_at = NOW()`,
        [companyId, key, val]
      )
    }
    res.json({ success: true })
  } catch (err) {
    console.error('[Settings] Update error:', err)
    res.status(500).json({ error: 'Failed to update settings' })
  }
})

systemRouter.get(
  '/system/database-inventory',

  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const tablesResult = await query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
        []
      )
      const inventory: { name: string; count: number }[] = []
      for (const row of tablesResult.rows) {
        const table = row.table_name as string
        try {
          const result = await query(
            `SELECT COUNT(*) as count FROM ${table} WHERE company_id = $1`,
            [companyId]
          )
          inventory.push({ name: table, count: parseInt(result.rows[0].count) })
        } catch {
          inventory.push({ name: table, count: 0 })
        }
      }
      res.json(inventory)
    } catch (err) {
      console.error('[Inventory] Error:', err)
      res.status(500).json({ error: 'Failed to get inventory' })
    }
  }
)

systemRouter.post(
  '/system/export-snapshot',

  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const tablesResult = await query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
        []
      )
      const snapshot: Record<string, any[]> = {}
      for (const row of tablesResult.rows) {
        const table = row.table_name as string
        try {
          const result = await query(`SELECT * FROM ${table} WHERE company_id = $1`, [companyId])
          snapshot[table] = result.rows
        } catch {
          snapshot[table] = []
        }
      }
      res.json({
        exportedAt: new Date().toISOString(),
        companyId,
        tables: snapshot
      })
    } catch (err) {
      console.error('[ExportSnapshot] Error:', err)
      res.status(500).json({ error: 'Failed to export snapshot' })
    }
  }
)

systemRouter.post(
  '/system/import-snapshot',

  requireAdminRole,
  async (req: Request, res: Response) => {
    const client = await getClient()
    try {
      const companyId = getCompanyId(req)
      const { tables, mode } = req.body
      if (!tables || typeof tables !== 'object') {
        res.status(400).json({ error: 'Invalid snapshot data' })
        return
      }

      const importMode = mode === 'replace' ? 'replace' : 'merge'
      const counts: Record<string, { received: number; imported: number }> = {}
      const importErrors: string[] = []

      // Build ID lookup from snapshot data for cross-referencing FKs within the file
      const snapshotRefIds: Record<string, Set<string>> = {}
      for (const [tableName, rows] of Object.entries(tables)) {
        const idSet = new Set<string>()
        if (Array.isArray(rows)) {
          for (const row of rows) {
            if (row.id) idSet.add(String(row.id))
          }
        }
        snapshotRefIds[tableName] = idSet
      }

      const fkResult = await client.query(`
        SELECT
            tc.table_name AS source_table,
            kcu.column_name AS source_column,
            ccu.table_name AS referenced_table,
            ccu.column_name AS referenced_column
        FROM
            information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
      `)

      // Map: source_table -> Array of { source_column, referenced_table, referenced_column }
      const fkMap: Record<
        string,
        Array<{ source_column: string; referenced_table: string; referenced_column: string }>
      > = {}
      for (const row of fkResult.rows) {
        const t = row.source_table
        if (!fkMap[t]) fkMap[t] = []
        fkMap[t].push({
          source_column: row.source_column,
          referenced_table: row.referenced_table,
          referenced_column: row.referenced_column
        })
      }

      // Local cache of existing IDs to avoid querying DB per row/column
      const existingIds: Record<string, Set<string>> = {}

      const getOrLoadIds = async (table: string): Promise<Set<string>> => {
        if (existingIds[table]) return existingIds[table]
        const set = new Set<string>()
        try {
          const hasCompanyCol = await client.query(
            `
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'company_id'
          `,
            [table]
          )

          let rows: any[] = []
          if (hasCompanyCol.rows.length > 0) {
            const res = await client.query(`SELECT id FROM ${table} WHERE company_id = $1`, [
              companyId
            ])
            rows = res.rows
          } else {
            const idColRes = await client.query(
              `
              SELECT column_name
              FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'id'
            `,
              [table]
            )

            if (idColRes.rows.length > 0) {
              const res = await client.query(`SELECT id FROM ${table}`)
              rows = res.rows
            } else {
              const pkRes = await client.query(
                `
                SELECT kcu.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
                WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = $1 AND tc.table_schema = 'public'
              `,
                [table]
              )
              if (pkRes.rows.length > 0) {
                const pkCol = pkRes.rows[0].column_name
                const res = await client.query(`SELECT ${pkCol} AS id FROM ${table}`)
                rows = res.rows
              }
            }
          }
          for (const r of rows) {
            if (r.id !== undefined && r.id !== null) {
              set.add(String(r.id))
            }
          }
        } catch (err) {
          console.error(`Failed to load existing IDs for table ${table}:`, (err as Error).message)
        }
        existingIds[table] = set
        return set
      }

      // Start transaction
      await client.query('BEGIN')

      const existingResult = await client.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
        []
      )
      const existingTables = new Set(existingResult.rows.map((r: any) => r.table_name))

      const tableOrder = [
        'companies',
        'employees',
        'accounts',
        'users',
        'clients',
        'defendants',
        'cases',
        'case_parties',
        'sessions',
        'session_outcomes',
        'tasks_v2',
        'tasks',
        'evidence',
        'judgments',
        'memoranda',
        'documents_v2',
        'documents',
        'finances',
        'invoices',
        'invoice_items',
        'receivables',
        'vouchers',
        'contracts',
        'agencies'
      ]

      const allSnapshotTables = Object.keys(tables).sort((a, b) => {
        let idxA = tableOrder.indexOf(a)
        let idxB = tableOrder.indexOf(b)
        if (idxA === -1) idxA = 999
        if (idxB === -1) idxB = 999
        return idxA - idxB
      })

      for (const table of allSnapshotTables) {
        if (!existingTables.has(table)) {
          counts[table] = { received: (tables[table] || []).length, imported: 0 }
          continue
        }
        const rows = tables[table]
        if (!Array.isArray(rows) || rows.length === 0) {
          counts[table] = { received: 0, imported: 0 }
          continue
        }
        counts[table] = { received: rows.length, imported: 0 }

        const colResult = await client.query(
          "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1",
          [table]
        )
        const colMap: Record<string, { type: string; nullable: boolean }> = {}
        const hasCompanyId = colResult.rows.some((r: any) => r.column_name === 'company_id')
        const hasCreatedAt = colResult.rows.some((r: any) => r.column_name === 'created_at')
        const hasUpdatedAt = colResult.rows.some((r: any) => r.column_name === 'updated_at')
        for (const r of colResult.rows) {
          colMap[r.column_name] = { type: r.data_type, nullable: r.is_nullable === 'YES' }
        }

        // If mode is replace, truncate all records for this company in this table
        if (importMode === 'replace') {
          await client.query(`DELETE FROM ${table} WHERE company_id = $1`, [companyId])
          existingIds[table] = new Set() // Clear cache since it's truncated
        }

        // Cache all referenced table IDs
        const fks = fkMap[table] || []
        for (const fk of fks) {
          await getOrLoadIds(fk.referenced_table)
        }
        await getOrLoadIds(table)

        for (const row of rows) {
          if (hasCompanyId) row.company_id = companyId
          if (!row.created_at && hasCreatedAt) row.created_at = new Date().toISOString()
          if (hasUpdatedAt) row.updated_at = new Date().toISOString()

          const keys = Object.keys(row).filter((k) => k in colMap)
          const sanitized = keys.map((k) => {
            const val = row[k]
            const dtype = colMap[k].type
            if (val === '' || val === null || val === undefined) {
              if (
                dtype.startsWith('date') ||
                dtype.startsWith('timestamp') ||
                dtype === 'uuid' ||
                dtype.startsWith('numeric') ||
                dtype === 'boolean' ||
                dtype === 'integer' ||
                dtype === 'bigint'
              ) {
                return null
              }
              return val
            }
            if (
              dtype === 'uuid' &&
              typeof val === 'string' &&
              !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
            ) {
              return null
            }
            if (dtype === 'boolean') {
              if (val === 0 || val === '0' || val === false || val === 'false') return false
              if (val === 1 || val === '1' || val === true || val === 'true') return true
              return null
            }
            return val
          })

          // Validate foreign keys using local caches + snapshot cross-reference
          let skipRow = false
          for (const fk of fks) {
            const colIndex = keys.indexOf(fk.source_column)
            if (colIndex >= 0) {
              const val = sanitized[colIndex]
              if (val !== null && val !== undefined && val !== '') {
                const refSet = await getOrLoadIds(fk.referenced_table)
                const refExistsInDb = refSet.has(String(val))
                // Also check if the referenced ID exists within the snapshot file itself
                const refExistsInSnapshot =
                  snapshotRefIds[fk.referenced_table]?.has(String(val)) ?? false
                if (!refExistsInDb && !refExistsInSnapshot) {
                  // Referenced ID doesn't exist anywhere
                  const isNullable = colMap[fk.source_column]?.nullable ?? true
                  if (isNullable) {
                    const msg = `[ImportSnapshot] Nullifying FK ${table}.${fk.source_column} = ${val} because referenced row in ${fk.referenced_table} is missing`
                    console.log(msg)
                    importErrors.push(msg)
                    sanitized[colIndex] = null
                  } else {
                    const msg = `[ImportSnapshot] Skipping row in ${table} because non-nullable FK ${fk.source_column} = ${val} references missing row in ${fk.referenced_table}`
                    console.log(msg)
                    importErrors.push(msg)
                    skipRow = true
                    break
                  }
                }
              }
            }
          }

          if (skipRow) continue

          const placeholders = sanitized.map((_, i) => `$${i + 1}`).join(', ')
          const columns = keys.join(', ')

          // Use Postgres Savepoints to prevent single-row insertion failures from aborting the entire transaction
          await client.query('SAVEPOINT row_insert')

          const idField = 'id'
          const idIndex = keys.indexOf(idField)

          try {
            if (importMode === 'merge' && idIndex >= 0 && sanitized[idIndex]) {
              const tableCache = await getOrLoadIds(table)
              const exists = tableCache.has(String(sanitized[idIndex]))

              if (exists) {
                const nonIdKeys = keys.filter((k) => k !== 'id')
                if (nonIdKeys.length > 0) {
                  const setClauses = nonIdKeys.map((k, i) => `${k} = $${i + 1}`).join(', ')
                  const setValues = nonIdKeys.map((k) => sanitized[keys.indexOf(k)])
                  await client.query(
                    `UPDATE ${table} SET ${setClauses} WHERE id = $${nonIdKeys.length + 1}`,
                    [...setValues, sanitized[idIndex]]
                  )
                }
              } else {
                await client.query(
                  `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`,
                  sanitized
                )
                tableCache.add(String(sanitized[idIndex]))
              }
            } else {
              await client.query(
                `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`,
                sanitized
              )
              if (idIndex >= 0 && sanitized[idIndex]) {
                const tableCache = await getOrLoadIds(table)
                tableCache.add(String(sanitized[idIndex]))
              }
            }
            await client.query('RELEASE SAVEPOINT row_insert')
            counts[table].imported++
          } catch (err) {
            // Always rollback to savepoint FIRST to clear the aborted transaction state
            try {
              await client.query('ROLLBACK TO SAVEPOINT row_insert')
            } catch {
              // Savepoint might not exist if error happened before it was created
            }

            const errMsg: string = (err as Error).message || ''
            if (
              errMsg.includes('duplicate key') &&
              importMode === 'merge' &&
              idIndex >= 0 &&
              sanitized[idIndex]
            ) {
              try {
                const nonIdKeys = keys.filter((k) => k !== 'id')
                if (nonIdKeys.length > 0) {
                  await client.query('SAVEPOINT row_update')
                  const setClauses = nonIdKeys.map((k, i) => `${k} = $${i + 1}`).join(', ')
                  const setValues = nonIdKeys.map((k) => sanitized[keys.indexOf(k)])
                  await client.query(
                    `UPDATE ${table} SET ${setClauses} WHERE id = $${nonIdKeys.length + 1}`,
                    [...setValues, sanitized[idIndex]]
                  )
                  await client.query('RELEASE SAVEPOINT row_update')
                  counts[table].imported++
                  continue
                }
              } catch (updateErr) {
                try {
                  await client.query('ROLLBACK TO SAVEPOINT row_update')
                } catch {}
                const fallbackMsg = `[ImportSnapshot] FAILED row in ${table} (UPDATE fallback also failed): ${(updateErr as Error).message}`
                console.error(fallbackMsg)
                importErrors.push(fallbackMsg)
              }
            } else {
              console.error(`[ImportSnapshot] SKIP row in ${table}: ${errMsg}`)
              importErrors.push(errMsg)
            }
          }
        }
      }

      await client.query('COMMIT')
      res.json({ success: true, counts, errors: importErrors })
    } catch (err) {
      try {
        await client.query('ROLLBACK')
      } catch (e) {
        console.error('Error during rollback/reset origin:', e)
      }
      console.error('[ImportSnapshot] Error:', err)
      res.status(500).json({ error: 'Failed to import snapshot' })
    } finally {
      client.release()
    }
  }
)

systemRouter.post(
  '/system/clear-all-data',
  requireAdminRole,
  async (req: Request, res: Response) => {
    const client = await getClient()
    try {
      const companyId = getCompanyId(req)
      const tablesToClear = [
        'invoice_items',
        'invoices',
        'vouchers',
        'receivables',
        'finances',
        'finances_new',
        'collections_payments',
        'collections_claims',
        'enf_attachments',
        'enf_decisions',
        'enf_request_parties',
        'enf_financial_details',
        'enf_personal_details',
        'enf_direct_details',
        'enforcement_requests',
        'enforcement_actions',
        'enforcement_parties',
        'enforcement_files',
        'session_outcomes',
        'sessions',
        'judgments',
        'tasks_v2',
        'tasks',
        'documents_v2',
        'documents',
        'file_assets',
        'communications',
        'evidence',
        'experts',
        'agencies',
        'user_case_access',
        'user_client_access',
        'user_permissions',
        'cases',
        'case_parties',
        'clients',
        'defendants',
        'case_actions',
        'assignment_logs',
        'professional_liability_logs',
        'judgment_amendments',
        'contract_signatures',
        'contract_participants',
        'contract_parties',
        'contract_party_types',
        'contract_party_audits',
        'contract_links',
        'contract_schedules',
        'contract_amendments',
        'contracts',
        'contract_templates',
        'activity_logs',
        'accounts'
      ]

      await client.query('BEGIN')

      const tablesResult = await client.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
        []
      )
      const existingTables = new Set(tablesResult.rows.map((r: any) => r.table_name))

      for (const table of tablesToClear) {
        if (!existingTables.has(table)) {
          continue
        }
        const colResult = await client.query(
          "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'company_id'",
          [table]
        )
        if (colResult.rows.length > 0) {
          await client.query(`DELETE FROM ${table} WHERE company_id = $1`, [companyId])
        }
      }

      await client.query('COMMIT')

      res.json({ success: true })
    } catch (err) {
      try {
        await client.query('ROLLBACK')
      } catch (e) {
        console.error('Error during rollback/reset origin:', e)
      }
      console.error('[ClearAllData] Error:', err)
      res.status(500).json({ error: 'Failed to clear all data' })
    } finally {
      client.release()
    }
  }
)
