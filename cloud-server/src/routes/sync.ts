import { Router, type Request, type Response } from 'express'
import { createHash, randomUUID } from 'crypto'
import { authMiddleware } from '../middleware/auth'
import { getClient, query } from '../db/connection'
import { assertSyncOperationAllowed, getSyncEntityAdapter, MAX_SYNC_BATCH, MAX_SYNC_PAGE, quoteRegisteredIdentifier as q, requireSyncIdentity, validateSyncPayload } from '../sync/syncPolicy'
import { getSyncChangeCaptureBindings } from '../sync/syncChangeCapture'

export const syncRouter = Router()
syncRouter.use(authMiddleware)
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const OPS = new Set(['create', 'update', 'delete'])

export function calculateContentHash(data: Record<string, unknown>): string {
  const ignored = new Set(['created_at', 'updated_at', 'revision', 'version', 'company_id'])
  const clean = Object.fromEntries(Object.keys(data).sort().filter(k => !ignored.has(k)).map(k => [k, data[k] ?? null]))
  return createHash('sha256').update(JSON.stringify(clean)).digest('hex')
}

export async function initSyncTables(): Promise<void> {
  await query(`CREATE TABLE IF NOT EXISTS registered_sync_devices(id TEXT NOT NULL,company_id UUID NOT NULL,name TEXT NOT NULL,paired_by UUID NOT NULL,paired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),last_seen_at TIMESTAMPTZ,revoked_at TIMESTAMPTZ,PRIMARY KEY(company_id,id))`)
  await query(`CREATE TABLE IF NOT EXISTS tenant_change_log(sequence BIGSERIAL PRIMARY KEY,company_id UUID NOT NULL,entity_type TEXT NOT NULL,entity_id UUID NOT NULL,operation TEXT NOT NULL,revision INTEGER NOT NULL,payload JSONB,device_id TEXT,user_id UUID,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(company_id,entity_type,entity_id,revision))`)
  await query(`CREATE INDEX IF NOT EXISTS idx_tenant_change_cursor ON tenant_change_log(company_id,sequence)`)
  await query(`CREATE TABLE IF NOT EXISTS sync_operations(company_id UUID NOT NULL,operation_id TEXT NOT NULL,device_id TEXT NOT NULL,entity_type TEXT NOT NULL,entity_id UUID NOT NULL,operation TEXT NOT NULL,base_revision INTEGER NOT NULL,authoritative_revision INTEGER,content_hash TEXT NOT NULL,status TEXT NOT NULL,error_code TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),processed_at TIMESTAMPTZ,PRIMARY KEY(company_id,operation_id))`)
  await query(`CREATE TABLE IF NOT EXISTS sync_conflicts(id UUID DEFAULT gen_random_uuid() PRIMARY KEY,company_id UUID NOT NULL,entity_type TEXT NOT NULL,entity_id UUID NOT NULL,local_value JSONB NOT NULL,remote_value JSONB NOT NULL,local_revision INTEGER,remote_revision INTEGER,local_user_id UUID,remote_user_id UUID,local_device_id TEXT,remote_device_id TEXT,status TEXT NOT NULL DEFAULT 'unresolved',resolved_by UUID,resolution_strategy TEXT,resolved_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`)
  await query(`CREATE INDEX IF NOT EXISTS idx_sync_conflicts_comp_status ON sync_conflicts(company_id,status)`)
  await query(`CREATE TABLE IF NOT EXISTS sync_cursors(company_id UUID NOT NULL,device_id TEXT NOT NULL,last_cursor BIGINT NOT NULL DEFAULT 0,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(company_id,device_id))`)
  await query(`CREATE TABLE IF NOT EXISTS backup_catalog(id UUID DEFAULT gen_random_uuid() PRIMARY KEY,company_id UUID NOT NULL,export_id UUID NOT NULL,content_hash TEXT NOT NULL,byte_size BIGINT NOT NULL,destination TEXT NOT NULL,status TEXT NOT NULL,last_verified_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(company_id,export_id,destination))`)
  await query(`CREATE TABLE IF NOT EXISTS attachment_transfer_state(company_id UUID NOT NULL,attachment_id UUID NOT NULL,device_id TEXT NOT NULL,content_hash TEXT NOT NULL,byte_offset BIGINT NOT NULL DEFAULT 0,status TEXT NOT NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(company_id,attachment_id,device_id))`)
  await query(`CREATE TABLE IF NOT EXISTS restore_runs(id UUID PRIMARY KEY,company_id UUID NOT NULL,status TEXT NOT NULL,safety_backup_id UUID,started_by UUID NOT NULL,started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),completed_at TIMESTAMPTZ,error_code TEXT)`)
  await query(`CREATE TABLE IF NOT EXISTS sync_tombstones(company_id UUID NOT NULL,entity_type TEXT NOT NULL,entity_id UUID NOT NULL,revision INTEGER NOT NULL,deleted_by UUID NOT NULL,device_id TEXT NOT NULL,deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(company_id,entity_type,entity_id))`)
  await query(`CREATE OR REPLACE FUNCTION b2b_capture_tenant_change() RETURNS trigger AS $$
    DECLARE row_data JSONB; tenant UUID; entity UUID; next_revision INTEGER; filtered JSONB;
    BEGIN
      IF current_setting('b2b.sync_capture', true) = 'off' THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
      END IF;
      row_data := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
      tenant := (row_data ->> TG_ARGV[1])::uuid;
      entity := (row_data ->> TG_ARGV[2])::uuid;
      IF tenant IS NULL OR entity IS NULL THEN RAISE EXCEPTION 'SYNC_CAPTURE_IDENTITY_MISSING'; END IF;
      PERFORM pg_advisory_xact_lock(hashtextextended(tenant::text || ':' || TG_ARGV[0] || ':' || entity::text, 0));
      SELECT COALESCE(MAX(revision), 0) + 1 INTO next_revision FROM tenant_change_log WHERE company_id=tenant AND entity_type=TG_ARGV[0] AND entity_id=entity;
      IF TG_OP <> 'DELETE' THEN
        SELECT COALESCE(jsonb_object_agg(item.key, item.value), '{}'::jsonb) INTO filtered
        FROM jsonb_each(row_data) item WHERE item.key = ANY(string_to_array(TG_ARGV[3], ','));
      END IF;
      INSERT INTO tenant_change_log(company_id,entity_type,entity_id,operation,revision,payload,device_id)
      VALUES(tenant,TG_ARGV[0],entity,CASE WHEN TG_OP='INSERT' THEN 'create' WHEN TG_OP='UPDATE' THEN 'update' WHEN TG_OP='DELETE' THEN 'delete' ELSE NULL END,next_revision,CASE WHEN TG_OP='DELETE' THEN NULL ELSE filtered END,'web');
      IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
    END; $$ LANGUAGE plpgsql`)
  for (const binding of getSyncChangeCaptureBindings()) {
    const triggerName = `b2b_sync_capture_${binding.tableName}`
    const args = [binding.canonicalName, binding.tenantColumn, binding.primaryKey, binding.payloadColumns.join(',')]
      .map(value => `'${value.replaceAll("'", "''")}'`).join(',')
    await query(`DROP TRIGGER IF EXISTS ${q(triggerName)} ON ${q(binding.tableName)}`)
    await query(`CREATE TRIGGER ${q(triggerName)} AFTER INSERT OR UPDATE OR DELETE ON ${q(binding.tableName)} FOR EACH ROW EXECUTE FUNCTION b2b_capture_tenant_change(${args})`)
  }
}

async function activeDevice(companyId: string, input: unknown): Promise<string> {
  if (typeof input !== 'string' || !input.trim()) throw new Error('SYNC_DEVICE_REQUIRED')
  const result = await query('SELECT revoked_at FROM registered_sync_devices WHERE company_id=$1 AND id=$2', [companyId, input])
  if (!result.rowCount) throw new Error('SYNC_DEVICE_NOT_REGISTERED')
  if (result.rows[0].revoked_at) throw new Error('SYNC_DEVICE_REVOKED')
  return input
}
const isAdmin = (req: Request) => ['admin', 'super_admin', 'owner'].includes(req.auth?.roleKey || '')

syncRouter.post('/devices/pair', async (req, res) => {
  try {
    const { companyId, userId } = requireSyncIdentity(req)
    if (!isAdmin(req)) return void res.status(403).json({ error: 'SYNC_ADMIN_REQUIRED' })
    const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 100) : ''
    if (!name) return void res.status(400).json({ error: 'SYNC_DEVICE_NAME_REQUIRED' })
    const deviceId = randomUUID()
    await query('INSERT INTO registered_sync_devices(id,company_id,name,paired_by) VALUES($1,$2,$3,$4)', [deviceId, companyId, name, userId])
    res.status(201).json({ deviceId, name })
  } catch (e) { res.status(401).json({ error: (e as Error).message }) }
})

syncRouter.get('/devices', async (req, res) => {
  try {
    const { companyId } = requireSyncIdentity(req)
    if (!isAdmin(req)) return void res.status(403).json({ error: 'SYNC_ADMIN_REQUIRED' })
    const result = await query(
      `SELECT id,name,paired_at,last_seen_at,revoked_at
       FROM registered_sync_devices
       WHERE company_id=$1
       ORDER BY paired_at DESC,id`,
      [companyId]
    )
    res.json({ devices: result.rows })
  } catch (e) { res.status(401).json({ error: (e as Error).message }) }
})

syncRouter.get('/pairing-info', async (req, res) => {
  try {
    const { companyId } = requireSyncIdentity(req)
    if (!isAdmin(req)) return void res.status(403).json({ error: 'SYNC_ADMIN_REQUIRED' })
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || ''
    res.json({
      baseUrl: 'https://b2b-law-g2qr.onrender.com/api',
      tenantId: companyId,
      accessToken: token,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    })
  } catch (e) { res.status(401).json({ error: (e as Error).message }) }
})

syncRouter.post('/devices/:id/revoke', async (req, res) => {
  try {
    const { companyId } = requireSyncIdentity(req)
    if (!isAdmin(req)) return void res.status(403).json({ error: 'SYNC_ADMIN_REQUIRED' })
    if (!UUID.test(req.params.id)) return void res.status(400).json({ error: 'SYNC_DEVICE_ID_INVALID' })
    const result = await query('UPDATE registered_sync_devices SET revoked_at=NOW() WHERE company_id=$1 AND id=$2 AND revoked_at IS NULL', [companyId, req.params.id])
    if (!result.rowCount) return void res.status(404).json({ error: 'SYNC_DEVICE_NOT_FOUND' })
    res.json({ success: true })
  } catch (e) { res.status(401).json({ error: (e as Error).message }) }
})

syncRouter.post('/pull', async (req, res) => {
  try {
    const { companyId } = requireSyncIdentity(req)
    const deviceId = await activeDevice(companyId, req.body?.deviceId)
    const afterCursor = Number(req.body?.afterCursor ?? 0)
    const pageSize = Math.min(Number(req.body?.pageSize ?? 100), MAX_SYNC_PAGE)
    if (!Number.isSafeInteger(afterCursor) || afterCursor < 0 || !Number.isSafeInteger(pageSize) || pageSize < 1) return void res.status(400).json({ error: 'SYNC_CURSOR_INVALID' })
    const result = await query(`SELECT sequence,entity_type,entity_id,operation,revision,payload,created_at FROM tenant_change_log WHERE company_id=$1 AND sequence>$2 ORDER BY sequence LIMIT $3`, [companyId, afterCursor, pageSize + 1])
    const changes = result.rows.slice(0, pageSize).map(row => ({
      ...row,
      sequence: Number(row.sequence),
      revision: Number(row.revision)
    }))
    if (changes.some(change => !Number.isSafeInteger(change.sequence) || change.sequence < 1 || !Number.isSafeInteger(change.revision) || change.revision < 1)) {
      throw new Error('SYNC_SERVER_CURSOR_INVALID')
    }
    const hasMore = result.rows.length > pageSize
    const nextCursor = changes.length ? changes.at(-1)!.sequence : afterCursor
    await query(`INSERT INTO sync_cursors(company_id,device_id,last_cursor) VALUES($1,$2,$3) ON CONFLICT(company_id,device_id) DO UPDATE SET last_cursor=GREATEST(sync_cursors.last_cursor,EXCLUDED.last_cursor),updated_at=NOW()`, [companyId, deviceId, nextCursor])
    res.json({ changes, nextCursor, hasMore })
  } catch (e) { const code = (e as Error).message; res.status(code.includes('DEVICE') ? 403 : 500).json({ error: code }) }
})

syncRouter.post('/push', async (req: Request, res: Response) => {
  let client
  try {
    const { companyId, userId } = requireSyncIdentity(req)
    const deviceId = await activeDevice(companyId, req.body?.deviceId)
    const operations = req.body?.operations
    if (!Array.isArray(operations) || !operations.length || operations.length > MAX_SYNC_BATCH) return void res.status(400).json({ error: 'SYNC_BATCH_INVALID' })
    client = await getClient(); await client.query('BEGIN'); await client.query("SET LOCAL b2b.sync_capture = 'off'")
    const results: Record<string, unknown>[] = []
    for (const raw of operations) {
      const { operationId, entityId, operation, baseRevision } = raw || {}
      if (typeof operationId !== 'string' || operationId.length > 100 || !UUID.test(entityId) || !OPS.has(operation) || !Number.isSafeInteger(baseRevision) || baseRevision < 0) throw new Error('SYNC_OPERATION_INVALID')
      const prior = await client.query('SELECT status,authoritative_revision FROM sync_operations WHERE company_id=$1 AND operation_id=$2', [companyId, operationId])
      if (prior.rowCount) { results.push({ operationId, status: prior.rows[0].status, authoritativeRevision: prior.rows[0].authoritative_revision, replay: true }); continue }
      const adapter = getSyncEntityAdapter(raw.entityType)
      assertSyncOperationAllowed(adapter, operation)
      const payload = operation === 'delete' ? {} : validateSyncPayload(adapter, raw.payload)
      const rev = await client.query('SELECT COALESCE(MAX(revision),0)::integer revision FROM tenant_change_log WHERE company_id=$1 AND entity_type=$2 AND entity_id=$3', [companyId, adapter.canonicalName, entityId])
      const remoteRevision = rev.rows[0].revision as number
      if (baseRevision !== remoteRevision) {
        const remote = await client.query(`SELECT * FROM ${q(adapter.tableName)} WHERE ${q(adapter.primaryKey)}=$1 AND ${q(adapter.tenantColumn)}=$2`, [entityId, companyId])
        const conflict = await client.query(`INSERT INTO sync_conflicts(company_id,entity_type,entity_id,local_value,remote_value,local_revision,remote_revision,local_user_id,local_device_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`, [companyId, adapter.canonicalName, entityId, payload, remote.rows[0] ?? {}, baseRevision, remoteRevision, userId, deviceId])
        await client.query(`INSERT INTO sync_operations(company_id,operation_id,device_id,entity_type,entity_id,operation,base_revision,authoritative_revision,content_hash,status,processed_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'conflict',NOW())`, [companyId, operationId, deviceId, adapter.canonicalName, entityId, operation, baseRevision, remoteRevision, calculateContentHash(payload)])
        results.push({ operationId, status: 'conflict', conflictId: conflict.rows[0].id, authoritativeRevision: remoteRevision }); continue
      }
      if (operation === 'delete') {
        const authoritativeRevision = remoteRevision + 1
        await client.query(`DELETE FROM ${q(adapter.tableName)} WHERE ${q(adapter.primaryKey)}=$1 AND ${q(adapter.tenantColumn)}=$2`, [entityId, companyId])
        await client.query(`INSERT INTO sync_tombstones(company_id,entity_type,entity_id,revision,deleted_by,device_id) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(company_id,entity_type,entity_id) DO UPDATE SET revision=EXCLUDED.revision,deleted_by=EXCLUDED.deleted_by,device_id=EXCLUDED.device_id,deleted_at=NOW()`, [companyId, adapter.canonicalName, entityId, authoritativeRevision, userId, deviceId])
      }
      else if (operation === 'create') {
        const fields = [...new Set([adapter.primaryKey, adapter.tenantColumn, ...Object.keys(payload).filter(k => k !== adapter.tenantColumn)])]
        const values = fields.map(k => k === adapter.primaryKey ? entityId : k === adapter.tenantColumn ? companyId : payload[k])
        await client.query(`INSERT INTO ${q(adapter.tableName)}(${fields.map(q).join(',')}) VALUES(${fields.map((_, i) => `$${i + 1}`).join(',')})`, values)
      } else {
        if (adapter.appendOnly) throw new Error('SYNC_APPEND_ONLY_ENTITY')
        const fields = Object.keys(payload).filter(k => k !== adapter.primaryKey && k !== adapter.tenantColumn && !adapter.immutableFields.has(k))
        if (!fields.length) throw new Error('SYNC_NO_MUTABLE_FIELDS')
        await client.query(`UPDATE ${q(adapter.tableName)} SET ${fields.map((k, i) => `${q(k)}=$${i + 3}`).join(',')} WHERE ${q(adapter.primaryKey)}=$1 AND ${q(adapter.tenantColumn)}=$2`, [entityId, companyId, ...fields.map(k => payload[k])])
      }
      const authoritativeRevision = remoteRevision + 1
      await client.query(`INSERT INTO tenant_change_log(company_id,entity_type,entity_id,operation,revision,payload,device_id,user_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [companyId, adapter.canonicalName, entityId, operation, authoritativeRevision, operation === 'delete' ? null : payload, deviceId, userId])
      await client.query(`INSERT INTO sync_operations(company_id,operation_id,device_id,entity_type,entity_id,operation,base_revision,authoritative_revision,content_hash,status,processed_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'synced',NOW())`, [companyId, operationId, deviceId, adapter.canonicalName, entityId, operation, baseRevision, authoritativeRevision, calculateContentHash(payload)])
      results.push({ operationId, status: 'synced', authoritativeRevision })
    }
    await client.query('COMMIT'); res.json({ success: true, results })
  } catch (e) {
    if (client) try { await client.query('ROLLBACK') } catch {}
    const code = (e as Error).message; res.status(code.includes('DEVICE') ? 403 : code.startsWith('SYNC_') ? 400 : 500).json({ error: code })
  } finally { client?.release() }
})

syncRouter.get('/status', async (req, res) => {
  try { const { companyId } = requireSyncIdentity(req); const c = await query(`SELECT COUNT(*) count FROM sync_conflicts WHERE company_id=$1 AND status='unresolved'`, [companyId]); const s = await query('SELECT MAX(sequence) cursor,MAX(created_at) last_sync_at FROM tenant_change_log WHERE company_id=$1', [companyId]); res.json({ unresolvedConflicts: Number(c.rows[0].count), serverCursor: Number(s.rows[0].cursor ?? 0), lastSyncAt: s.rows[0].last_sync_at ?? null }) }
  catch (e) { res.status(401).json({ error: (e as Error).message }) }
})

syncRouter.get('/backups/latest', async (req, res) => {
  try {
    const { companyId } = requireSyncIdentity(req)
    const result = await query(`SELECT export_id,content_hash,byte_size,destination,status,last_verified_at,created_at
      FROM backup_catalog WHERE company_id=$1 AND status='verified' AND last_verified_at IS NOT NULL
      ORDER BY last_verified_at DESC,created_at DESC LIMIT 1`, [companyId])
    res.json({ backup: result.rows[0] ?? null })
  } catch (e) { res.status(401).json({ error: (e as Error).message }) }
})
syncRouter.get('/conflicts', async (req, res) => {
  try { const { companyId } = requireSyncIdentity(req); const result = await query(`SELECT * FROM sync_conflicts WHERE company_id=$1 AND status='unresolved' ORDER BY created_at DESC`, [companyId]); res.json(result.rows) }
  catch (e) { res.status(401).json({ error: (e as Error).message }) }
})

syncRouter.post('/resolve-conflict', async (req, res) => {
  const client = await getClient()
  try {
    const { companyId, userId } = requireSyncIdentity(req)
    const deviceId = await activeDevice(companyId, req.body?.deviceId)
    const strategy = req.body?.strategy
    if (!['accept_remote', 'accept_local', 'manual_merge'].includes(strategy)) return void res.status(400).json({ error: 'SYNC_RESOLUTION_INVALID' })
    await client.query('BEGIN')
    await client.query("SET LOCAL b2b.sync_capture = 'off'")
    const found = await client.query(`SELECT * FROM sync_conflicts WHERE id=$1 AND company_id=$2 AND status='unresolved' FOR UPDATE`, [req.body?.conflictId, companyId])
    if (!found.rowCount) { await client.query('ROLLBACK'); return void res.status(404).json({ error: 'SYNC_CONFLICT_NOT_FOUND' }) }
    const conflict = found.rows[0]
    const adapter = getSyncEntityAdapter(conflict.entity_type)
    let applied: Record<string, unknown> | undefined
    if (strategy !== 'accept_remote') {
      applied = validateSyncPayload(adapter, strategy === 'accept_local' ? conflict.local_value : req.body?.mergedPayload)
      assertSyncOperationAllowed(adapter, 'update')
      const fields = Object.keys(applied).filter(key => key !== adapter.primaryKey && key !== adapter.tenantColumn && !adapter.immutableFields.has(key))
      if (!fields.length) throw new Error('SYNC_NO_MUTABLE_FIELDS')
      await client.query(`UPDATE ${q(adapter.tableName)} SET ${fields.map((key, index) => `${q(key)}=$${index + 3}`).join(',')} WHERE ${q(adapter.primaryKey)}=$1 AND ${q(adapter.tenantColumn)}=$2`, [conflict.entity_id, companyId, ...fields.map(key => applied![key])])
      const revision = Number(conflict.remote_revision) + 1
      await client.query(`INSERT INTO tenant_change_log(company_id,entity_type,entity_id,operation,revision,payload,device_id,user_id) VALUES($1,$2,$3,'update',$4,$5,$6,$7)`, [companyId, adapter.canonicalName, conflict.entity_id, revision, applied, deviceId, userId])
    }
    await client.query(`UPDATE sync_conflicts SET status='resolved',resolved_by=$1,resolution_strategy=$2,resolved_at=NOW() WHERE id=$3 AND company_id=$4`, [userId, strategy, conflict.id, companyId])
    await client.query('COMMIT')
    res.json({ success: true, strategy })
  } catch (error) {
    try { await client.query('ROLLBACK') } catch {}
    const code = (error as Error).message
    res.status(code.startsWith('SYNC_') ? 400 : 500).json({ error: code })
  } finally { client.release() }
})

syncRouter.post('/resolve-all-conflicts', async (req, res) => {
  const client = await getClient()
  try {
    const { companyId, userId } = requireSyncIdentity(req)
    const deviceId = await activeDevice(companyId, req.body?.deviceId)
    const strategy = req.body?.strategy
    if (!['accept_remote', 'accept_local'].includes(strategy)) return void res.status(400).json({ error: 'SYNC_RESOLUTION_INVALID' })
    await client.query('BEGIN')
    await client.query("SET LOCAL b2b.sync_capture = 'off'")
    const conflicts = await client.query(`SELECT * FROM sync_conflicts WHERE company_id=$1 AND status='unresolved' FOR UPDATE`, [companyId])
    for (const conflict of conflicts.rows) {
      const adapter = getSyncEntityAdapter(conflict.entity_type)
      if (strategy === 'accept_local') {
        const applied = validateSyncPayload(adapter, conflict.local_value)
        assertSyncOperationAllowed(adapter, 'update')
        const fields = Object.keys(applied).filter(key => key !== adapter.primaryKey && key !== adapter.tenantColumn && !adapter.immutableFields.has(key))
        if (fields.length) {
          await client.query(`UPDATE ${q(adapter.tableName)} SET ${fields.map((key, index) => `${q(key)}=$${index + 3}`).join(',')} WHERE ${q(adapter.primaryKey)}=$1 AND ${q(adapter.tenantColumn)}=$2`, [conflict.entity_id, companyId, ...fields.map(key => applied[key])])
          const revision = Number(conflict.remote_revision) + 1
          await client.query(`INSERT INTO tenant_change_log(company_id,entity_type,entity_id,operation,revision,payload,device_id,user_id) VALUES($1,$2,$3,'update',$4,$5,$6,$7)`, [companyId, adapter.canonicalName, conflict.entity_id, revision, applied, deviceId, userId])
        }
      }
      await client.query(`UPDATE sync_conflicts SET status='resolved',resolved_by=$1,resolution_strategy=$2,resolved_at=NOW() WHERE id=$3 AND company_id=$4`, [userId, strategy, conflict.id, companyId])
    }
    await client.query('COMMIT')
    res.json({ success: true, resolvedCount: conflicts.rowCount, strategy })
  } catch (error) {
    try { await client.query('ROLLBACK') } catch {}
    const code = (error as Error).message
    res.status(code.startsWith('SYNC_') ? 400 : 500).json({ error: code })
  } finally { client.release() }
})
