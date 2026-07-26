import { Router, Request, Response } from 'express'
import { query } from '../db/connection'
import { authMiddleware } from '../middleware/auth'
import { getCompanyId, getUserId } from '../middleware/tenant'
import { v4 as uuidv4 } from 'uuid'

export const archiveRouter = Router()

archiveRouter.use(authMiddleware)

// Helper function to log user actions in activity tracking tables
async function logArchiveActivity(
  userId: string,
  companyId: string,
  username: string,
  actionKey: string,
  moduleKey: string,
  details: string,
  metadata?: any
): Promise<void> {
  try {
    // 1. Insert into old activity_logs (silently handle if the table is missing in some envs)
    await query(
      `INSERT INTO activity_logs (id, company_id, action_key, module_key, details, actor, metadata_json, timestamp)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6::jsonb, NOW())`,
      [
        companyId,
        actionKey,
        moduleKey,
        details,
        username,
        metadata ? JSON.stringify(metadata) : null
      ]
    ).catch(() => {})

    // 2. Insert into new user_activity_logs (used on dashboard/subscriber profiles)
    await query(
      `INSERT INTO user_activity_logs (id, user_id, company_id, activity_type, activity_description, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [uuidv4(), userId, companyId, actionKey, details]
    ).catch(() => {})
  } catch (err: any) {
    console.error('[Archive] logArchiveActivity failed:', err.message)
  }
}

// 1. List Archived Items
archiveRouter.get('/:type', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const { type } = req.params
    const { q } = req.query

    let sql = ''
    const params: any[] = [companyId]

    if (type === 'case') {
      sql = `
        SELECT 
          c.id,
          c.case_number,
          cl.name as client_name,
          c.subject,
          c.priority,
          c.archived_at
        FROM cases c
        LEFT JOIN clients cl ON c.client_id = cl.id
        WHERE c.company_id = $1 AND c.is_archived = TRUE
      `
      if (q) {
        params.push(`%${q}%`)
        sql += ` AND (c.case_number ILIKE $2 OR c.subject ILIKE $2 OR cl.name ILIKE $2)`
      }
      sql += ' ORDER BY c.archived_at DESC NULLS LAST, c.created_at DESC'
    } else if (type === 'document') {
      sql = `
        SELECT 
          d.id,
          d.name,
          COALESCE(c.case_number, d.linked_title, d.link_type) as context_label,
          d.file_type,
          d.file_size,
          d.archived_at
        FROM documents_v2 d
        LEFT JOIN cases c ON d.case_id = c.id
        WHERE d.company_id = $1 AND d.is_archived = TRUE
      `
      if (q) {
        params.push(`%${q}%`)
        sql += ` AND (d.name ILIKE $2 OR d.file_type ILIKE $2)`
      }
      sql += ' ORDER BY d.archived_at DESC NULLS LAST, d.created_at DESC'
    } else if (type === 'session') {
      sql = `
        SELECT 
          s.id,
          c.case_number,
          s.date,
          s.time,
          s.court_room,
          s.archived_at
        FROM sessions s
        LEFT JOIN cases c ON s.case_id = c.id
        WHERE s.company_id = $1 AND s.is_archived = TRUE
      `
      if (q) {
        params.push(`%${q}%`)
        sql += ` AND (c.case_number ILIKE $2 OR s.court_room ILIKE $2)`
      }
      sql += ' ORDER BY s.archived_at DESC NULLS LAST, s.created_at DESC'
    } else if (type === 'evidence') {
      sql = `
        SELECT 
          ev.id,
          ev.title,
          c.case_number,
          ev.archived_at
        FROM evidence ev
        LEFT JOIN cases c ON ev.case_id = c.id
        WHERE ev.company_id = $1 AND ev.is_archived = TRUE
      `
      if (q) {
        params.push(`%${q}%`)
        sql += ` AND (ev.title ILIKE $2 OR c.case_number ILIKE $2)`
      }
      sql += ' ORDER BY ev.archived_at DESC NULLS LAST, ev.created_at DESC'
    } else if (type === 'task') {
      sql = `
        SELECT 
          t.id,
          t.title,
          COALESCE(c.case_number, cl.name, t.link_type) as context_label,
          t.due_date,
          t.archived_at
        FROM tasks_v2 t
        LEFT JOIN cases c ON t.case_id = c.id
        LEFT JOIN clients cl ON t.client_id = cl.id
        WHERE t.company_id = $1 AND t.is_archived = TRUE
      `
      if (q) {
        params.push(`%${q}%`)
        sql += ` AND (t.title ILIKE $2)`
      }
      sql += ' ORDER BY t.archived_at DESC NULLS LAST, t.created_at DESC'
    } else if (type === 'legal-service') {
      sql = `
        SELECT 
          e.id,
          e.engagement_number,
          cl.name as client_name,
          t.name_ar as service_type_name,
          emp.name as responsible_name,
          e.deleted_at as archived_at
        FROM legal_engagements e
        LEFT JOIN clients cl ON e.client_id = cl.id
        LEFT JOIN legal_service_types t ON e.engagement_type_id = t.id
        LEFT JOIN employees emp ON e.responsible_lawyer_id = emp.id
        WHERE e.company_id = $1 AND e.deleted_at IS NOT NULL
      `
      if (q) {
        params.push(`%${q}%`)
        sql += ` AND (e.engagement_number ILIKE $2 OR cl.name ILIKE $2 OR t.name_ar ILIKE $2 OR emp.name ILIKE $2)`
      }
      sql += ' ORDER BY e.deleted_at DESC NULLS LAST, e.created_at DESC'
    } else {
      res.status(400).json({ error: 'نوع الأرشيف غير معروف' })
      return
    }

    const result = await query(sql, params)
    res.json(result.rows)
  } catch (err: any) {
    console.error('[Archive] List error:', err)
    res.status(500).json({ error: err.message })
  }
})

// 2. Toggle/Restore Archived Item
archiveRouter.put('/:type/:id', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const userId = getUserId(req)
    const username = (req as any).auth?.username || 'unknown'
    const { type, id } = req.params
    const { isArchived = false } = req.body

    const valIsArchived = isArchived === true || isArchived === 'true'
    const archiveDate = valIsArchived ? new Date() : null
    const archiveUser = valIsArchived ? userId : null

    // 1. Fetch item details before updating (for descriptive activity logging)
    let itemLabel = id
    try {
      if (type === 'case') {
        const itemRes = await query(
          'SELECT case_number FROM cases WHERE id = $1 AND company_id = $2',
          [id, companyId]
        )
        if (itemRes.rows[0]) itemLabel = itemRes.rows[0].case_number
      } else if (type === 'document') {
        const itemRes = await query(
          'SELECT name FROM documents_v2 WHERE id = $1 AND company_id = $2',
          [id, companyId]
        )
        if (itemRes.rows[0]) itemLabel = itemRes.rows[0].name
      } else if (type === 'session') {
        const itemRes = await query(
          'SELECT date, time FROM sessions WHERE id = $1 AND company_id = $2',
          [id, companyId]
        )
        if (itemRes.rows[0]) itemLabel = `${itemRes.rows[0].date} ${itemRes.rows[0].time}`
      } else if (type === 'evidence') {
        const itemRes = await query(
          'SELECT title FROM evidence WHERE id = $1 AND company_id = $2',
          [id, companyId]
        )
        if (itemRes.rows[0]) itemLabel = itemRes.rows[0].title
      } else if (type === 'task') {
        const itemRes = await query(
          'SELECT title FROM tasks_v2 WHERE id = $1 AND company_id = $2',
          [id, companyId]
        )
        if (itemRes.rows[0]) itemLabel = itemRes.rows[0].title
      } else if (type === 'legal-service') {
        const itemRes = await query(
          'SELECT engagement_number FROM legal_engagements WHERE id = $1 AND company_id = $2',
          [id, companyId]
        )
        if (itemRes.rows[0]) itemLabel = itemRes.rows[0].engagement_number
      }
    } catch (err) {
      console.warn('[Archive] Failed to fetch item label for log:', err)
    }

    let sql = ''
    let params: any[] = []

    if (type === 'case') {
      sql =
        'UPDATE cases SET is_archived = $1, archived_at = $2, archived_by = $3 WHERE id = $4 AND company_id = $5'
      params = [valIsArchived, archiveDate, archiveUser, id, companyId]
    } else if (type === 'document') {
      sql =
        'UPDATE documents_v2 SET is_archived = $1, archived_at = $2 WHERE id = $3 AND company_id = $4'
      params = [valIsArchived, archiveDate, id, companyId]
    } else if (type === 'session') {
      sql =
        'UPDATE sessions SET is_archived = $1, archived_at = $2, archived_by = $3 WHERE id = $4 AND company_id = $5'
      params = [valIsArchived, archiveDate, archiveUser, id, companyId]
    } else if (type === 'evidence') {
      sql =
        'UPDATE evidence SET is_archived = $1, archived_at = $2, archived_by = $3 WHERE id = $4 AND company_id = $5'
      params = [valIsArchived, archiveDate, archiveUser, id, companyId]
    } else if (type === 'task') {
      sql =
        'UPDATE tasks_v2 SET is_archived = $1, archived_at = $2, archived_by = $3 WHERE id = $4 AND company_id = $5'
      params = [valIsArchived, archiveDate, archiveUser, id, companyId]
    } else if (type === 'legal-service') {
      sql =
        'UPDATE legal_engagements SET deleted_at = $1, deleted_by = $2 WHERE id = $3 AND company_id = $4'
      params = [archiveDate, archiveUser, id, companyId]
    } else {
      res.status(400).json({ error: 'نوع الأرشيف غير معروف' })
      return
    }

    const result = await query(sql, params)
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'السجل غير موجود' })
      return
    }

    // 2. Log activity in activity tracking tables
    const actionKey = valIsArchived ? 'archive_item' : 'restore_item'
    const typeLabels: Record<string, string> = {
      case: 'قضية',
      document: 'مستند',
      session: 'جلسة',
      evidence: 'دليل',
      task: 'مهمة',
      'legal-service': 'خدمة قانونية'
    }
    const typeLabel = typeLabels[type] || type
    const actionVerb = valIsArchived ? 'أرشفة' : 'استعادة'
    const details = `${actionVerb} ${typeLabel}: ${itemLabel}`

    await logArchiveActivity(userId, companyId, username, actionKey, 'archive', details, {
      type,
      id,
      itemLabel
    })

    res.json({ success: true })
  } catch (err: any) {
    console.error('[Archive] Restore/Archive error:', err)
    res.status(500).json({ error: err.message })
  }
})
