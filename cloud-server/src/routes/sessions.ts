import { handleBusinessEvent } from '../services/taskWorkflow.service'
import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { query } from '../db/connection'
import { authMiddleware } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { GoogleCalendarService } from '../services/googleCalendarService'

export const sessionsRouter = Router()

sessionsRouter.use(authMiddleware)

function getCompanyId(req: Request): string {
  return req.auth!.companyId
}

function parseTimeTo24h(timeStr: string | null | undefined): string | null {
  if (!timeStr) return null
  let cleaned = timeStr.trim()
  if (!cleaned) return null

  const time24hRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/
  if (time24hRegex.test(cleaned)) {
    return cleaned
  }

  const isPM = cleaned.includes('م') || cleaned.toLowerCase().includes('pm')
  const isAM = cleaned.includes('ص') || cleaned.toLowerCase().includes('am')

  cleaned = cleaned.replace(/[صم]/g, '').replace(/am|pm/gi, '').trim()

  const match = cleaned.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return null

  let hour = parseInt(match[1], 10)
  const minute = match[2]

  if (isPM) {
    if (hour !== 12) {
      hour += 12
    }
  } else if (isAM) {
    if (hour === 12) {
      hour = 0
    }
  }

  const hourStr = String(hour).padStart(2, '0')
  return `${hourStr}:${minute}`
}

// 1. GET /api/sessions/count
sessionsRouter.get(
  '/count',
  requirePermission('view_sessions'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { q, case_id, status, from, to } = req.query

      let whereClause = 'WHERE s.company_id = $1'
      const params: any[] = [companyId]
      let paramIndex = 2

      if (case_id) {
        whereClause += ` AND s.case_id = $${paramIndex++}`
        params.push(case_id)
      }

      if (status && status !== 'الكل') {
        whereClause += ` AND s.status = $${paramIndex++}`
        params.push(status)
      }

      if (from) {
        whereClause += ` AND s.date >= $${paramIndex++}`
        params.push(from)
      }

      if (to) {
        whereClause += ` AND s.date <= $${paramIndex++}`
        params.push(to)
      }

      if (q) {
        whereClause += ` AND (c.case_number ILIKE $${paramIndex} OR cl.name ILIKE $${paramIndex} OR s.court_room ILIKE $${paramIndex})`
        params.push(`%${q}%`)
        paramIndex++
      }

      const countResult = await query(
        `SELECT COUNT(*) 
       FROM sessions s
       LEFT JOIN cases c ON c.id = s.case_id
       LEFT JOIN clients cl ON cl.id = c.client_id
       ${whereClause}`,
        params
      )
      res.json({ count: parseInt(countResult.rows[0].count, 10) })
    } catch (err) {
      console.error('[SESSIONS] Count error:', err)
      res.status(500).json({ error: 'فشل عد الجلسات' })
    }
  }
)

// 2. GET /api/sessions
sessionsRouter.get('/', requirePermission('view_sessions'), async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const { page = '1', pageSize = '50', q, case_id, status, from, to, sortDir } = req.query
    const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string)
    const limit = parseInt(pageSize as string)

    let whereClause = 'WHERE s.company_id = $1'
    const params: any[] = [companyId]
    let paramIndex = 2

    if (case_id) {
      whereClause += ` AND s.case_id = $${paramIndex++}`
      params.push(case_id)
    }

    if (status && status !== 'الكل') {
      whereClause += ` AND s.status = $${paramIndex++}`
      params.push(status)
    }

    if (from) {
      whereClause += ` AND s.date >= $${paramIndex++}`
      params.push(from)
    }

    if (to) {
      whereClause += ` AND s.date <= $${paramIndex++}`
      params.push(to)
    }

    if (q) {
      whereClause += ` AND (c.case_number ILIKE $${paramIndex} OR cl.name ILIKE $${paramIndex} OR s.court_room ILIKE $${paramIndex})`
      params.push(`%${q}%`)
      paramIndex++
    }

    const direction = sortDir === 'desc' ? 'DESC' : 'ASC'

    const dataResult = await query(
      `SELECT s.*, c.case_number, cl.name as client_name, cl.id as client_id
       FROM sessions s
       LEFT JOIN cases c ON c.id = s.case_id
       LEFT JOIN clients cl ON cl.id = c.client_id
       ${whereClause} 
       ORDER BY s.date ${direction}, s.time ${direction}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    )

    res.json({ data: dataResult.rows })
  } catch (err) {
    console.error('[SESSIONS] List error:', err)
    res.status(500).json({ error: 'فشل عرض الجلسات' })
  }
})

// 3. GET /api/sessions/all
sessionsRouter.get(
  '/all',
  requirePermission('view_sessions'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const result = await query(
        `SELECT s.*, c.case_number, cl.name as client_name, cl.id as client_id
       FROM sessions s
       LEFT JOIN cases c ON c.id = s.case_id
       LEFT JOIN clients cl ON cl.id = c.client_id
       WHERE s.company_id = $1 AND s.is_archived = FALSE
       ORDER BY s.date DESC, s.time DESC`,
        [companyId]
      )
      res.json(result.rows)
    } catch (err) {
      console.error('[SESSIONS] GetAll error:', err)
      res.status(500).json({ error: 'فشل جلب جميع الجلسات' })
    }
  }
)

// 4. GET /api/sessions/today
sessionsRouter.get(
  '/today',
  requirePermission('view_sessions'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const result = await query(
        `SELECT s.*, c.case_number, cl.name as client_name, cl.id as client_id
       FROM sessions s
       LEFT JOIN cases c ON c.id = s.case_id
       LEFT JOIN clients cl ON cl.id = c.client_id
       WHERE s.company_id = $1 AND s.date = CURRENT_DATE AND s.is_archived = FALSE
       ORDER BY s.time ASC`,
        [companyId]
      )
      res.json(result.rows)
    } catch (err) {
      console.error('[SESSIONS] GetToday error:', err)
      res.status(500).json({ error: 'فشل جلب جلسات اليوم' })
    }
  }
)

// 5. GET /api/sessions/tomorrow
sessionsRouter.get(
  '/tomorrow',
  requirePermission('view_sessions'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const result = await query(
        `SELECT s.*, c.case_number, cl.name as client_name, cl.id as client_id
       FROM sessions s
       LEFT JOIN cases c ON c.id = s.case_id
       LEFT JOIN clients cl ON cl.id = c.client_id
       WHERE s.company_id = $1 AND s.date = CURRENT_DATE + INTERVAL '1 day' AND s.is_archived = FALSE
       ORDER BY s.time ASC`,
        [companyId]
      )
      res.json(result.rows)
    } catch (err) {
      console.error('[SESSIONS] GetTomorrow error:', err)
      res.status(500).json({ error: 'فشل جلب جلسات الغد' })
    }
  }
)

// 6. GET /api/sessions/by-case/:caseId
sessionsRouter.get(
  '/by-case/:caseId',
  requirePermission('view_sessions'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { caseId } = req.params
      const result = await query(
        `SELECT s.*, c.case_number, cl.name as client_name, cl.id as client_id
       FROM sessions s
       LEFT JOIN cases c ON c.id = s.case_id
       LEFT JOIN clients cl ON cl.id = c.client_id
       WHERE s.case_id = $1 AND s.company_id = $2 AND s.is_archived = FALSE
       ORDER BY s.date DESC, s.time DESC`,
        [caseId, companyId]
      )
      res.json(result.rows)
    } catch (err) {
      console.error('[SESSIONS] GetByCase error:', err)
      res.status(500).json({ error: 'فشل جلب جلسات القضية' })
    }
  }
)

// 7. GET /api/sessions/check-block/:caseId
sessionsRouter.get(
  '/check-block/:caseId',
  requirePermission('view_sessions'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { caseId } = req.params
      const result = await query(
        `SELECT id FROM sessions
       WHERE case_id = $1 AND company_id = $2 AND date < CURRENT_DATE AND status = 'قادمة'
       LIMIT 1`,
        [caseId, companyId]
      )
      if (result.rows.length > 0) {
        res.json({
          is_blocked: true,
          blocked: true,
          reason: 'يوجد جلسات سابقة معلقة لم يتم رصد نتائجها بعد'
        })
      } else {
        res.json({
          is_blocked: false,
          blocked: false
        })
      }
    } catch (err) {
      console.error('[SESSIONS] CheckBlock error:', err)
      res.status(500).json({ error: 'فشل التحقق من حالة الحظر' })
    }
  }
)

// 8. GET /api/sessions/pending-closure
sessionsRouter.get(
  '/pending-closure',
  requirePermission('view_sessions'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const result = await query(
        `SELECT s.*, c.case_number, cl.name as client_name, cl.id as client_id
       FROM sessions s
       LEFT JOIN cases c ON c.id = s.case_id
       LEFT JOIN clients cl ON cl.id = c.client_id
       WHERE s.company_id = $1 AND s.date < CURRENT_DATE AND s.status = 'قادمة' AND s.is_archived = FALSE
       ORDER BY s.date DESC`,
        [companyId]
      )
      res.json(result.rows)
    } catch (err) {
      console.error('[SESSIONS] GetPendingClosure error:', err)
      res.status(500).json({ error: 'فشل جلب الجلسات المعلقة الإغلاق' })
    }
  }
)

// 9. GET /api/sessions/:id
sessionsRouter.get(
  '/:id',
  requirePermission('view_sessions'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { id } = req.params
      const result = await query(
        `SELECT s.*, c.case_number, cl.name as client_name, cl.id as client_id
       FROM sessions s
       LEFT JOIN cases c ON c.id = s.case_id
       LEFT JOIN clients cl ON cl.id = c.client_id
       WHERE s.id = $1 AND s.company_id = $2`,
        [id, companyId]
      )
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'الجلسة غير موجودة' })
        return
      }
      res.json(result.rows[0])
    } catch (err) {
      console.error('[SESSIONS] GetById error:', err)
      res.status(500).json({ error: 'فشل جلب الجلسة' })
    }
  }
)

// 10. POST /api/sessions
sessionsRouter.post(
  '/',
  requirePermission('edit_sessions'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const body = { ...req.body, company_id: companyId }
      delete body.id

      if (!body.created_by) body.created_by = req.auth!.userId
      body.created_at = new Date().toISOString()
      body.updated_at = body.created_at

      const id = uuidv4()
      body.id = id

      // Convert empty strings to null for PostgreSQL compatibility
      for (const key of Object.keys(body)) {
        if (body[key] === '') {
          body[key] = null
        } else if (key.toLowerCase() === 'time' && typeof body[key] === 'string') {
          body[key] = parseTimeTo24h(body[key])
        }
      }

      const allowedFields = [
        'id',
        'company_id',
        'case_id',
        'responsible_user_id',
        'date',
        'date_hijri',
        'time',
        'court_room',
        'status',
        'notes',
        'result',
        'meeting_link',
        'google_event_id',
        'is_archived',
        'archived_at',
        'archived_by',
        'archive_reason',
        'created_by',
        'updated_by',
        'created_at',
        'updated_at'
      ]

      for (const key of Object.keys(body)) {
        if (!allowedFields.includes(key)) {
          delete body[key]
        }
      }

      const keys = Object.keys(body)
      const values = Object.values(body)
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ')
      const columns = keys.join(', ')

      await query(`INSERT INTO sessions (${columns}) VALUES (${placeholders})`, values)

      // Auto-complete pending schedule_next_session tasks
      if (body.case_id) {
        handleBusinessEvent({ event: 'session_created', companyId, caseId: body.case_id, sourceId: id, userId: req.auth!.userId }).catch(() => {})
      }

      // PHASE 2-A: Async Google Calendar Event Creation (Graceful Fallback)
      try {
        let caseNumber = ''
        let caseTitle = ''
        if (body.case_id) {
          const caseRes = await query(
            `SELECT case_number, title FROM cases WHERE id = $1 AND company_id = $2`,
            [body.case_id, companyId]
          )
          if (caseRes.rows.length > 0) {
            caseNumber = caseRes.rows[0].case_number || ''
            caseTitle = caseRes.rows[0].title || ''
          }
        }

        const sessionDate = body.date
        const sessionTime = body.time || '09:00'
        if (sessionDate) {
          const timeClean = sessionTime.length === 5 ? `${sessionTime}:00` : sessionTime
          const startTimeStr = `${sessionDate}T${timeClean}`
          const summary = `جلسة قضائية: ${caseTitle || caseNumber || body.court_room || 'جلسة محكمة'}`
          const description = `جلسة قضائية محليّة\nرقم القضية: ${caseNumber || 'غير محدد'}\nعنوان القضية: ${caseTitle || 'غير محدد'}\nالقاعة/المحكمة: ${body.court_room || 'غير محدد'}\nملاحظات: ${body.notes || 'لا يوجد'}`
          const location = body.court_room || ''

          const calRes = await GoogleCalendarService.createCalendarEvent(
            companyId,
            {
              summary,
              description,
              location,
              startTime: startTimeStr,
              existingGoogleEventId: body.google_event_id
            },
            req.auth?.userId
          )

          if (calRes.success && calRes.googleEventId) {
            body.google_event_id = calRes.googleEventId
            body.google_sync_status = 'synced'
            await query(
              `UPDATE sessions SET google_event_id = $1 WHERE id = $2 AND company_id = $3`,
              [calRes.googleEventId, id, companyId]
            )
          } else {
            body.google_sync_status = calRes.reason === 'not_connected' ? 'not_connected' : 'failed'
          }
        }
      } catch (calErr: any) {
        console.error('[SESSIONS] Google Calendar event creation fallback:', calErr?.message || calErr)
        body.google_sync_status = 'failed'
      }

      res.status(201).json(body)
    } catch (err) {
      console.error('[SESSIONS] Create error:', err)
      res.status(500).json({ error: 'فشل إنشاء الجلسة' })
    }
  }
)

// 11. PUT /api/sessions/:id
sessionsRouter.put(
  '/:id',
  requirePermission('edit_sessions'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { id } = req.params
      const body = { ...req.body }
      delete body.id
      delete body.company_id

      body.updated_at = new Date().toISOString()
      if (!body.updated_by) body.updated_by = req.auth!.userId

      // Convert empty strings to null for PostgreSQL compatibility
      for (const key of Object.keys(body)) {
        if (body[key] === '') {
          body[key] = null
        } else if (key.toLowerCase() === 'time' && typeof body[key] === 'string') {
          body[key] = parseTimeTo24h(body[key])
        }
      }

      const allowedFields = [
        'case_id',
        'responsible_user_id',
        'date',
        'date_hijri',
        'time',
        'court_room',
        'status',
        'notes',
        'result',
        'meeting_link',
        'is_archived',
        'archived_at',
        'archived_by',
        'archive_reason',
        'updated_by',
        'updated_at'
      ]

      for (const key of Object.keys(body)) {
        if (!allowedFields.includes(key)) {
          delete body[key]
        }
      }

      const keys = Object.keys(body)
      const values = Object.values(body)
      const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ')

      const result = await query(
        `UPDATE sessions SET ${setClause} WHERE id = $${keys.length + 1} AND company_id = $${keys.length + 2}`,
        [...values, id, companyId]
      )
      if (result.rowCount === 0) {
        res.status(404).json({ error: 'الجلسة غير موجودة' })
        return
      }

      // Google Calendar Async Update Hook
      try {
        const sessRes = await query(
          `SELECT google_event_id, date, time, court_room, notes, case_id FROM sessions WHERE id = $1 AND company_id = $2`,
          [id, companyId]
        )
        if (sessRes.rows.length > 0 && sessRes.rows[0].google_event_id) {
          const sess = sessRes.rows[0]
          let caseNumber = ''
          if (sess.case_id) {
            const cRes = await query(
              `SELECT case_number FROM cases WHERE id = $1 AND company_id = $2`,
              [sess.case_id, companyId]
            )
            if (cRes.rows.length > 0) caseNumber = cRes.rows[0].case_number || ''
          }
          const sessionDate = sess.date
          const sessionTime = sess.time || '09:00'
          const timeClean = sessionTime.length === 5 ? `${sessionTime}:00` : sessionTime
          const startTimeStr = `${sessionDate}T${timeClean}`

          await GoogleCalendarService.updateCalendarEvent(
            companyId,
            sess.google_event_id,
            {
              summary: `جلسة قضائية: ${caseNumber || sess.court_room || 'جلسة محكمة'}`,
              description: `جلسة قضائية\nرقم القضية: ${caseNumber || 'غير محدد'}\nالقاعة/المحكمة: ${sess.court_room || 'غير محدد'}\nملاحظات: ${sess.notes || 'لا يوجد'}`,
              location: sess.court_room || '',
              startTime: startTimeStr
            },
            req.auth?.userId
          )
        }
      } catch (calErr: any) {
        console.error('[SESSIONS] Google Calendar update fallback:', calErr?.message || calErr)
      }

      res.json({ success: true })
    } catch (err) {
      console.error('[SESSIONS] Update error:', err)
      res.status(500).json({ error: 'فشل تحديث الجلسة' })
    }
  }
)

// 12. DELETE /api/sessions/:id
sessionsRouter.delete(
  '/:id',
  requirePermission('edit_sessions'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { id } = req.params

      const checkRes = await query(
        `SELECT google_event_id FROM sessions WHERE id = $1 AND company_id = $2`,
        [id, companyId]
      )
      const googleEventId = checkRes.rows.length > 0 ? checkRes.rows[0].google_event_id : null

      const result = await query(`DELETE FROM sessions WHERE id = $1 AND company_id = $2`, [
        id,
        companyId
      ])
      if (result.rowCount === 0) {
        res.status(404).json({ error: 'الجلسة غير موجودة' })
        return
      }

      if (googleEventId) {
        try {
          await GoogleCalendarService.deleteCalendarEvent(companyId, googleEventId, req.auth?.userId)
        } catch (calErr: any) {
          console.error('[SESSIONS] Google Calendar delete fallback:', calErr?.message || calErr)
        }
      }

      res.json({ success: true })
    } catch (err) {
      console.error('[SESSIONS] Delete error:', err)
      res.status(500).json({ error: 'فشل حذف الجلسة' })
    }
  }
)
