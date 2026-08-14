import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import { query, getClient } from '../db/connection'
import * as crypto from 'crypto'

export const syncRouter = Router()
syncRouter.use(authMiddleware)

const getCompanyId = (req: Request): string => {
  return req.auth?.companyId || '00000000-0000-0000-0000-000000000001'
}

const getUserId = (req: Request): string => {
  return req.auth?.userId || '00000000-0000-0000-0000-000000000001'
}

/**
 * Calculates deterministic SHA-256 content hash of an entity payload
 */
export function calculateContentHash(data: Record<string, any>): string {
  if (!data || typeof data !== 'object') return ''
  // Strip metadata fields before hashing
  const clean: Record<string, any> = {}
  const ignoredKeys = new Set(['created_at', 'updated_at', 'revision', 'version', 'company_id'])
  const sortedKeys = Object.keys(data).sort()
  for (const k of sortedKeys) {
    if (!ignoredKeys.has(k)) {
      clean[k] = data[k] === undefined ? null : data[k]
    }
  }
  return crypto.createHash('sha256').update(JSON.stringify(clean)).digest('hex')
}

// Auto-initialize Sync Tables
export async function initSyncTables() {
  try {
    await query(`CREATE TABLE IF NOT EXISTS sync_queue (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      company_id UUID NOT NULL,
      operation_id TEXT UNIQUE NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id UUID NOT NULL,
      operation TEXT NOT NULL,
      base_revision INT DEFAULT 1,
      local_revision INT DEFAULT 1,
      payload JSONB NOT NULL,
      content_hash TEXT NOT NULL,
      device_id TEXT,
      user_id UUID,
      status TEXT DEFAULT 'pending',
      error TEXT,
      retry_count INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      processed_at TIMESTAMPTZ
    )`)
    await query(`CREATE INDEX IF NOT EXISTS idx_sync_queue_comp_status ON sync_queue(company_id, status)`)

    await query(`CREATE TABLE IF NOT EXISTS sync_log (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      company_id UUID NOT NULL,
      operation_id TEXT,
      device_id TEXT,
      user_id UUID,
      entity_type TEXT NOT NULL,
      entity_id UUID NOT NULL,
      operation TEXT NOT NULL,
      old_revision INT,
      new_revision INT,
      result TEXT NOT NULL,
      conflict_id UUID,
      timestamp TIMESTAMPTZ DEFAULT NOW()
    )`)
    await query(`CREATE INDEX IF NOT EXISTS idx_sync_log_comp_time ON sync_log(company_id, timestamp DESC)`)

    await query(`CREATE TABLE IF NOT EXISTS sync_conflicts (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      company_id UUID NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id UUID NOT NULL,
      local_value JSONB NOT NULL,
      remote_value JSONB NOT NULL,
      local_revision INT,
      remote_revision INT,
      local_user_id UUID,
      remote_user_id UUID,
      local_device_id TEXT,
      remote_device_id TEXT,
      status TEXT DEFAULT 'unresolved',
      resolved_by UUID,
      resolution_strategy TEXT,
      resolved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`)
    await query(`CREATE INDEX IF NOT EXISTS idx_sync_conflicts_comp_status ON sync_conflicts(company_id, status)`)
    console.log('[SYNC] Database synchronization tables initialized successfully')
  } catch (err) {
    console.error('[SYNC] Failed to initialize sync tables:', err)
  }
}
initSyncTables()

/**
 * GET /api/sync/status
 * Returns current sync status, pending conflicts, and counts
 */
syncRouter.get('/status', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const conflictsResult = await query(
      `SELECT COUNT(*) as count FROM sync_conflicts WHERE company_id = $1 AND status = 'unresolved'`,
      [companyId]
    )
    const queueResult = await query(
      `SELECT COUNT(*) as count FROM sync_queue WHERE company_id = $1 AND status = 'pending'`,
      [companyId]
    )
    const lastLogResult = await query(
      `SELECT timestamp, result FROM sync_log WHERE company_id = $1 ORDER BY timestamp DESC LIMIT 1`,
      [companyId]
    )

    const unresolvedConflicts = parseInt(conflictsResult.rows[0]?.count || '0', 10)
    const pendingQueue = parseInt(queueResult.rows[0]?.count || '0', 10)
    const lastSyncAt = lastLogResult.rows[0]?.timestamp || null

    let overallStatus = 'synced'
    if (unresolvedConflicts > 0) overallStatus = 'conflict'
    else if (pendingQueue > 0) overallStatus = 'push_required'

    res.json({
      status: overallStatus,
      lastSyncAt,
      unresolvedConflicts,
      pendingQueue,
      serverTime: new Date().toISOString()
    })
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch sync status', details: err.message })
  }
})

/**
 * POST /api/sync/pull
 * Pulls changes across entities modified after a given timestamp
 */
syncRouter.post('/pull', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const { since, entities } = req.body
    const targetEntities = Array.isArray(entities) && entities.length > 0
      ? entities
      : ['clients', 'defendants', 'cases', 'case_parties', 'sessions', 'agencies', 'judgments', 'memoranda', 'tasks_v2', 'finances', 'invoices', 'receivables', 'vouchers']

    const sinceDate = since ? new Date(since).toISOString() : new Date(0).toISOString()
    const changes: Record<string, any[]> = {}

    for (const table of targetEntities) {
      try {
        const result = await query(
          `SELECT * FROM ${table} WHERE company_id = $1 AND (updated_at > $2 OR created_at > $2) ORDER BY updated_at ASC`,
          [companyId, sinceDate]
        )
        changes[table] = result.rows
      } catch (err: any) {
        // Table might not have company_id or might not exist
        changes[table] = []
      }
    }

    res.json({
      pulledAt: new Date().toISOString(),
      changes
    })
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to pull changes', details: err.message })
  }
})

/**
 * POST /api/sync/push
 * Batch push local operations with optimistic concurrency control & idempotency
 */
syncRouter.post('/push', async (req: Request, res: Response) => {
  const client = await getClient()
  try {
    const companyId = getCompanyId(req)
    const userId = getUserId(req)
    const { operations, device_id } = req.body

    if (!Array.isArray(operations) || operations.length === 0) {
      res.json({ success: true, processed: 0, results: [] })
      return
    }

    const results: any[] = []

    for (const op of operations) {
      const {
        operation_id,
        entity_type,
        entity_id,
        operation,
        base_revision,
        payload
      } = op

      if (!operation_id || !entity_type || !entity_id) {
        results.push({ operation_id, status: 'error', message: 'Missing required sync operation keys' })
        continue
      }

      // 1. Idempotency Check: Was this operation already executed?
      const existingOp = await client.query(
        `SELECT id, status, error FROM sync_queue WHERE operation_id = $1`,
        [operation_id]
      )
      if (existingOp.rows.length > 0) {
        results.push({
          operation_id,
          status: existingOp.rows[0].status,
          message: 'Already processed (Idempotent response)',
          error: existingOp.rows[0].error
        })
        continue
      }

      const contentHash = calculateContentHash(payload || {})

      // 2. Fetch Remote Entity State
      let remoteEntity: any = null
      try {
        const remoteRes = await client.query(
          `SELECT * FROM ${entity_type} WHERE id = $1 AND company_id = $2`,
          [entity_id, companyId]
        )
        remoteEntity = remoteRes.rows[0] || null
      } catch (err) {
        // Table lookup issue
      }

      // 3. Concurrency & Conflict Detection
      let hasConflict = false
      if (remoteEntity && operation === 'update') {
        const remoteHash = calculateContentHash(remoteEntity)
        const remoteUpdated = new Date(remoteEntity.updated_at || remoteEntity.created_at || 0).getTime()
        const localBaseUpdated = base_revision ? new Date(base_revision).getTime() : 0

        // If remote has changed and contents differ -> CONFLICT
        if (remoteHash !== contentHash && remoteUpdated > localBaseUpdated && localBaseUpdated > 0) {
          hasConflict = true
          // Register conflict
          const conflictRes = await client.query(
            `INSERT INTO sync_conflicts (
              company_id, entity_type, entity_id, local_value, remote_value,
              local_revision, remote_revision, local_user_id, remote_user_id,
              local_device_id, remote_device_id, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'unresolved') RETURNING id`,
            [
              companyId, entity_type, entity_id, JSON.stringify(payload), JSON.stringify(remoteEntity),
              1, 2, userId, remoteEntity.updated_by || null,
              device_id || 'unknown', 'remote-server'
            ]
          )

          const conflictId = conflictRes.rows[0]?.id
          await client.query(
            `INSERT INTO sync_queue (
              company_id, operation_id, entity_type, entity_id, operation,
              payload, content_hash, device_id, user_id, status, error, processed_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'conflict', 'Optimistic lock conflict detected', NOW())`,
            [companyId, operation_id, entity_type, entity_id, operation, JSON.stringify(payload), contentHash, device_id, userId]
          )

          await client.query(
            `INSERT INTO sync_log (
              company_id, operation_id, device_id, user_id, entity_type, entity_id,
              operation, result, conflict_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'conflict', $8)`,
            [companyId, operation_id, device_id, userId, entity_type, entity_id, operation, conflictId]
          )

          results.push({
            operation_id,
            status: 'conflict',
            conflictId,
            message: 'Conflict detected: Remote version is newer. Please resolve before overwrite.',
            remoteEntity
          })
          continue
        }
      }

      // 4. Safe Apply Operation
      try {
        if (operation === 'create' || (operation === 'update' && !remoteEntity)) {
          const keys = Object.keys(payload).filter(k => k !== 'company_id')
          const cols = ['company_id', ...keys]
          const vals = [companyId, ...keys.map(k => payload[k])]
          const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ')
          
          await client.query(
            `INSERT INTO ${entity_type} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET updated_at = NOW()`,
            vals
          )
        } else if (operation === 'update' && remoteEntity) {
          const keys = Object.keys(payload).filter(k => k !== 'id' && k !== 'company_id')
          if (keys.length > 0) {
            const setClauses = keys.map((k, i) => `${k} = $${i + 3}`).join(', ')
            const vals = [entity_id, companyId, ...keys.map(k => payload[k])]
            await client.query(
              `UPDATE ${entity_type} SET ${setClauses}, updated_at = NOW() WHERE id = $1 AND company_id = $2`,
              vals
            )
          }
        } else if (operation === 'delete') {
          // Soft delete if column exists, else hard delete
          try {
            await client.query(
              `UPDATE ${entity_type} SET is_archived = true, archived_at = NOW() WHERE id = $1 AND company_id = $2`,
              [entity_id, companyId]
            )
          } catch {
            await client.query(
              `DELETE FROM ${entity_type} WHERE id = $1 AND company_id = $2`,
              [entity_id, companyId]
            )
          }
        }

        // Record successful sync
        await client.query(
          `INSERT INTO sync_queue (
            company_id, operation_id, entity_type, entity_id, operation,
            payload, content_hash, device_id, user_id, status, processed_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'synced', NOW())`,
          [companyId, operation_id, entity_type, entity_id, operation, JSON.stringify(payload), contentHash, device_id, userId]
        )

        await client.query(
          `INSERT INTO sync_log (
            company_id, operation_id, device_id, user_id, entity_type, entity_id,
            operation, result
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'success')`,
          [companyId, operation_id, device_id, userId, entity_type, entity_id, operation]
        )

        results.push({ operation_id, status: 'synced', message: 'Successfully synchronized' })
      } catch (applyErr: any) {
        console.error(`[SYNC PUSH ERROR] ${entity_type}:`, applyErr.message)
        results.push({ operation_id, status: 'failed', error: applyErr.message })
      }
    }

    res.json({
      success: true,
      processed: results.length,
      results
    })
  } catch (err: any) {
    console.error('[SYNC PUSH] Fatal Error:', err)
    res.status(500).json({ error: 'Failed to push operations', details: err.message })
  } finally {
    client.release()
  }
})

/**
 * GET /api/sync/conflicts
 * List all unresolved conflicts
 */
syncRouter.get('/conflicts', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const result = await query(
      `SELECT * FROM sync_conflicts WHERE company_id = $1 AND status = 'unresolved' ORDER BY created_at DESC`,
      [companyId]
    )
    res.json(result.rows)
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch conflicts', details: err.message })
  }
})

/**
 * POST /api/sync/resolve-conflict
 * Apply conflict resolution strategy (accept_remote, accept_local, manual_merge)
 */
syncRouter.post('/resolve-conflict', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const userId = getUserId(req)
    const { conflict_id, strategy, merged_payload } = req.body

    const conflictRes = await query(
      `SELECT * FROM sync_conflicts WHERE id = $1 AND company_id = $2`,
      [conflict_id, companyId]
    )
    if (conflictRes.rows.length === 0) {
      res.status(404).json({ error: 'Conflict not found' })
      return
    }

    const conflict = conflictRes.rows[0]
    let finalPayload: any = null

    if (strategy === 'accept_local') {
      finalPayload = conflict.local_value
    } else if (strategy === 'accept_remote') {
      finalPayload = conflict.remote_value
    } else if (strategy === 'manual_merge' && merged_payload) {
      finalPayload = merged_payload
    }

    if (finalPayload && (strategy === 'accept_local' || strategy === 'manual_merge')) {
      const keys = Object.keys(finalPayload).filter(k => k !== 'id' && k !== 'company_id')
      if (keys.length > 0) {
        const setClauses = keys.map((k, i) => `${k} = $${i + 3}`).join(', ')
        const vals = [conflict.entity_id, companyId, ...keys.map(k => finalPayload[k])]
        await query(
          `UPDATE ${conflict.entity_type} SET ${setClauses}, updated_at = NOW() WHERE id = $1 AND company_id = $2`,
          vals
        )
      }
    }

    await query(
      `UPDATE sync_conflicts SET status = 'resolved', resolution_strategy = $1, resolved_by = $2, resolved_at = NOW() WHERE id = $3`,
      [strategy, userId, conflict_id]
    )

    await query(
      `INSERT INTO sync_log (
        company_id, user_id, entity_type, entity_id, operation, result
      ) VALUES ($1, $2, $3, $4, 'resolve_conflict', $5)`,
      [companyId, userId, conflict.entity_type, conflict.entity_id, `resolved_${strategy}`]
    )

    res.json({ success: true, message: 'Conflict resolved successfully' })
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to resolve conflict', details: err.message })
  }
})

/**
 * GET /api/sync/logs
 * Audit trail of sync operations
 */
syncRouter.get('/logs', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const limit = Math.min(100, parseInt((req.query.limit as string) || '50', 10))
    const result = await query(
      `SELECT * FROM sync_log WHERE company_id = $1 ORDER BY timestamp DESC LIMIT $2`,
      [companyId, limit]
    )
    res.json(result.rows)
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch sync logs', details: err.message })
  }
})
