import { Router, Request, Response } from 'express'
import { query } from '../db/connection'
import { authMiddleware } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { getCompanyId } from '../middleware/tenant'

export const reportsRouter = Router()

reportsRouter.use(authMiddleware)

reportsRouter.get(
  '/case',
  requirePermission('export_reports'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { caseId } = req.query
      if (!caseId) {
        res.status(400).json({ error: 'معرف القضية مطلوب' })
        return
      }
      const caseData = await query('SELECT * FROM cases WHERE id = $1 AND company_id = $2', [
        caseId,
        companyId
      ])
      if (caseData.rows.length === 0) {
        res.status(404).json({ error: 'القضية غير موجودة' })
        return
      }
      const caseRow = caseData.rows[0]

      const sessions = await query(
        'SELECT * FROM sessions WHERE case_id = $1 AND company_id = $2 ORDER BY date DESC',
        [caseId, companyId]
      )
      const tasks = await query(
        'SELECT * FROM tasks_v2 WHERE case_id = $1 AND company_id = $2 ORDER BY created_at DESC',
        [caseId, companyId]
      )
      const finances = await query(
        'SELECT * FROM finances WHERE case_id = $1 AND company_id = $2',
        [caseId, companyId]
      )
      const documents = await query(
        'SELECT * FROM documents_v2 WHERE case_id = $1 AND company_id = $2',
        [caseId, companyId]
      )
      const activityLogs = await query(
        `SELECT * FROM activity_logs WHERE company_id = $1 ORDER BY timestamp DESC LIMIT 50`,
        [companyId]
      )

      // Build timeline combining sessions, tasks, documents
      const timelineRows: any[] = []
      for (const s of sessions.rows) {
        timelineRows.push({
          at: s.date,
          type: 'جلسة',
          title: s.type || s.session_type || 'جلسة',
          id: s.id
        })
      }
      for (const t of tasks.rows) {
        timelineRows.push({
          at: t.created_at,
          type: 'مهمة',
          title: t.title || t.task_title || 'مهمة',
          id: t.id
        })
      }
      for (const d of documents.rows) {
        timelineRows.push({
          at: d.created_at,
          type: 'مستند',
          title: d.title || d.file_name || 'مستند',
          id: d.id
        })
      }
      timelineRows.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

      // Calculate KPIs
      const totalIn = finances.rows.reduce(
        (sum: number, f: any) => sum + parseFloat(f.amount_in || f.amount || 0),
        0
      )
      const totalOut = finances.rows.reduce(
        (sum: number, f: any) => sum + parseFloat(f.amount_out || 0),
        0
      )

      // Build parties from clients
      const clientData = await query('SELECT cl.* FROM clients cl WHERE cl.id = $1', [
        caseRow.client_id
      ]).catch(() => ({ rows: [] }))

      res.json({
        case: {
          ...caseRow,
          client_name: clientData.rows[0]?.name || caseRow.client_name || '',
          parties:
            clientData.rows.length > 0
              ? [
                  {
                    id: clientData.rows[0].id,
                    name: clientData.rows[0].name,
                    party_type: 'client'
                  }
                ]
              : []
        },
        kpis: {
          sessionsTotal: sessions.rows.length,
          totalIn,
          balance: totalIn - totalOut
        },
        timeline: {
          rows: timelineRows.slice(0, 20),
          pageInfo: { page: 1, pageSize: 20, totalRows: timelineRows.length }
        },
        sessions: {
          rows: sessions.rows.map((s: any) => ({
            id: s.id,
            date: s.date,
            status: s.status || 'مجدول',
            notes: s.notes || s.result || ''
          }))
        },
        activity: {
          rows: activityLogs.rows.slice(0, 10).map((a: any) => ({
            id: a.id,
            timestamp: a.timestamp,
            actor: a.actor || '',
            details: a.details || ''
          }))
        },
        executive: {
          lastAction: timelineRows[0]?.title || null,
          nextAction: sessions.rows.find((s: any) => new Date(s.date) > new Date())?.type || null,
          alerts: [],
          recommendations: [],
          counts: {
            sessionsNext7: sessions.rows.filter((s: any) => {
              const d = new Date(s.date)
              const n = new Date()
              const w = new Date()
              w.setDate(w.getDate() + 7)
              return d >= n && d <= w
            }).length,
            tasksOverdue: tasks.rows.filter(
              (t: any) =>
                t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
            ).length,
            tasksNext7: tasks.rows.filter((t: any) => {
              const d = new Date(t.due_date)
              const n = new Date()
              const w = new Date()
              w.setDate(w.getDate() + 7)
              return d >= n && d <= w
            }).length,
            unclosedPastSessions: sessions.rows.filter(
              (s: any) => new Date(s.date) < new Date() && s.status !== 'منتهية'
            ).length
          }
        }
      })
    } catch (err) {
      console.error('[REPORTS] Case report error:', err)
      res.status(500).json({ error: 'فشل إنشاء تقرير القضية' })
    }
  }
)

reportsRouter.get(
  '/sessions',
  requirePermission('export_reports'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { from, to, caseId } = req.query
      let sql =
        'SELECT s.*, c.case_number FROM sessions s LEFT JOIN cases c ON c.id = s.case_id WHERE s.company_id = $1'
      const params: any[] = [companyId]
      let idx = 2
      if (from) {
        sql += ` AND s.date >= $${idx++}`
        params.push(from)
      }
      if (to) {
        sql += ` AND s.date <= $${idx++}`
        params.push(to)
      }
      if (caseId) {
        sql += ` AND s.case_id = $${idx++}`
        params.push(caseId)
      }
      sql += ' ORDER BY s.date DESC'
      const result = await query(sql, params)
      res.json(result.rows)
    } catch (err) {
      console.error('[REPORTS] Sessions report error:', err)
      res.status(500).json({ error: 'فشلت العملية' })
    }
  }
)

reportsRouter.get(
  '/financial-summary',
  requirePermission('export_reports'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const invoices = await query(
        'SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count FROM invoices WHERE company_id = $1',
        [companyId]
      )
      const receivables = await query(
        'SELECT COALESCE(SUM(amount_due - amount_paid), 0) as outstanding FROM receivables WHERE company_id = $1 AND status != $2',
        [companyId, 'paid']
      )
      const vouchers = await query(
        'SELECT type, COALESCE(SUM(amount), 0) as total FROM vouchers WHERE company_id = $1 GROUP BY type',
        [companyId]
      )
      res.json({
        invoices: invoices.rows[0],
        outstanding: receivables.rows[0]?.outstanding || 0,
        vouchers: vouchers.rows
      })
    } catch (err) {
      console.error('[REPORTS] Financial summary error:', err)
      res.status(500).json({ error: 'فشلت العملية' })
    }
  }
)

reportsRouter.get(
  '/activity',
  requirePermission('view_activity_logs'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { from, to } = req.query
      let sql = 'SELECT * FROM activity_logs WHERE company_id = $1'
      const params: any[] = [companyId]
      let idx = 2
      if (from) {
        sql += ` AND timestamp >= $${idx++}`
        params.push(from)
      }
      if (to) {
        sql += ` AND timestamp <= $${idx++}`
        params.push(to)
      }
      sql += ' ORDER BY timestamp DESC LIMIT 200'
      const result = await query(sql, params)
      res.json(result.rows)
    } catch (err) {
      console.error('[REPORTS] Activity error:', err)
      res.status(500).json({ error: 'فشلت العملية' })
    }
  }
)

reportsRouter.post(
  '/export/csv',
  requirePermission('export_reports'),
  (req: Request, res: Response) => {
    const { filename, rows } = req.body
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ error: 'لا توجد بيانات للتصدير' })
      return
    }
    const headers = Object.keys(rows[0])
    const csvRows = [
      headers.join(','),
      ...rows.map((r: any) =>
        headers.map((h) => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(',')
      )
    ]
    const csv = csvRows.join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename || 'export'}.csv"`)
    res.send(csv)
  }
)

reportsRouter.post(
  '/export/pdf',
  requirePermission('export_reports'),
  (_req: Request, res: Response) => {
    res.status(501).json({ error: 'تصدير PDF غير مُndoّن بعد على الخادم' })
  }
)

reportsRouter.post(
  '/export/html',
  requirePermission('export_reports'),
  (_req: Request, res: Response) => {
    res.status(501).json({ error: 'تصدير HTML غير مُndoّن بعد على الخادم' })
  }
)

reportsRouter.get(
  '/users',
  requirePermission('manage_users'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const result = await query(
        'SELECT id, username, full_name, role_key, is_active, employee_id FROM users WHERE company_id = $1',
        [companyId]
      )
      res.json(result.rows)
    } catch (err) {
      res.status(500).json({ error: 'فشلت العملية' })
    }
  }
)

reportsRouter.get(
  '/clients',
  requirePermission('view_clients'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const result = await query(
        'SELECT id, name, id_number, phone FROM clients WHERE company_id = $1 ORDER BY name',
        [companyId]
      )
      res.json(result.rows)
    } catch (err) {
      res.status(500).json({ error: 'فشلت العملية' })
    }
  }
)

reportsRouter.get(
  '/operations-summary',
  requirePermission('view_cases'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const [cases, sessions, tasks, clients] = await Promise.all([
        query('SELECT COUNT(*) FROM cases WHERE company_id = $1', [companyId]),
        query('SELECT COUNT(*) FROM sessions WHERE company_id = $1', [companyId]),
        query('SELECT COUNT(*) FROM tasks_v2 WHERE company_id = $1', [companyId]),
        query('SELECT COUNT(*) FROM clients WHERE company_id = $1', [companyId])
      ])
      res.json({
        totalCases: parseInt(cases.rows[0].count),
        totalSessions: parseInt(sessions.rows[0].count),
        totalTasks: parseInt(tasks.rows[0].count),
        totalClients: parseInt(clients.rows[0].count)
      })
    } catch (err) {
      res.status(500).json({ error: 'فشلت العملية' })
    }
  }
)

reportsRouter.get(
  '/users-permissions',
  requirePermission('manage_users'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const users = await query(
        'SELECT id, username, full_name, role_key, is_active FROM users WHERE company_id = $1',
        [companyId]
      )
      res.json(users.rows)
    } catch (err) {
      res.status(500).json({ error: 'فشلت العملية' })
    }
  }
)

reportsRouter.get(
  '/dashboard',
  requirePermission('view_cases'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const [caseCount, sessionCount, taskCount, clientCount, recentCases, todaySessions] =
        await Promise.all([
          query("SELECT COUNT(*) FROM cases WHERE company_id = $1 AND status != 'منتهية'", [
            companyId
          ]),
          query('SELECT COUNT(*) FROM sessions WHERE company_id = $1 AND date >= CURRENT_DATE', [
            companyId
          ]),
          query(
            "SELECT COUNT(*) FROM tasks_v2 WHERE company_id = $1 AND status NOT IN ('completed','closed','cancelled')",
            [companyId]
          ),
          query('SELECT COUNT(*) FROM clients WHERE company_id = $1', [companyId]),
          query('SELECT * FROM cases WHERE company_id = $1 ORDER BY created_at DESC LIMIT 10', [
            companyId
          ]),
          query(
            'SELECT s.*, c.case_number FROM sessions s LEFT JOIN cases c ON c.id = s.case_id WHERE s.company_id = $1 AND s.date = CURRENT_DATE ORDER BY s.time',
            [companyId]
          )
        ])
      res.json({
        openCases: parseInt(caseCount.rows[0].count),
        todaySessionsCount: parseInt(sessionCount.rows[0].count),
        pendingTasks: parseInt(taskCount.rows[0].count),
        totalClients: parseInt(clientCount.rows[0].count),
        recentCases: recentCases.rows,
        todaySessions: todaySessions.rows
      })
    } catch (err) {
      res.status(500).json({ error: 'فشلت العملية' })
    }
  }
)

reportsRouter.get(
  '/cases',
  requirePermission('view_cases'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const result = await query(
        `SELECT c.*, cl.name as client_name 
       FROM cases c 
       LEFT JOIN clients cl ON c.client_id = cl.id 
       WHERE c.company_id = $1 AND c.is_archived = FALSE 
       ORDER BY c.created_at DESC`,
        [companyId]
      )
      res.json(result.rows)
    } catch (err) {
      console.error('[REPORTS] listCases error:', err)
      res.status(500).json({ error: 'فشل عرض القضايا' })
    }
  }
)

reportsRouter.get(
  '/user-activity',
  requirePermission('view_activity_logs'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { from, to, actor, page = '1', pageSize = '500' } = req.query
      const limit = parseInt(pageSize as string)
      const offset = (parseInt(page as string) - 1) * limit

      let countSql = 'SELECT COUNT(*) FROM activity_logs WHERE company_id = $1'
      let sql = 'SELECT * FROM activity_logs WHERE company_id = $1'
      const params: any[] = [companyId]
      let idx = 2
      if (from) {
        countSql += ` AND timestamp >= $${idx}`
        sql += ` AND timestamp >= $${idx}`
        params.push(from)
        idx++
      }
      if (to) {
        countSql += ` AND timestamp <= $${idx}`
        sql += ` AND timestamp <= $${idx}`
        params.push(to)
        idx++
      }
      if (actor) {
        countSql += ` AND (actor = $${idx} OR created_by = $${idx})`
        sql += ` AND (actor = $${idx} OR created_by = $${idx})`
        params.push(actor)
        idx++
      }
      sql += ` ORDER BY timestamp DESC LIMIT $${idx} OFFSET $${idx + 1}`

      const countRes = await query(countSql, params)
      const totalRows = parseInt(countRes.rows[0].count)

      const dataRes = await query(sql, [...params, limit, offset])
      res.json({
        rows: dataRes.rows,
        pageInfo: {
          page: parseInt(page as string),
          pageSize: limit,
          totalRows
        }
      })
    } catch (err) {
      console.error('[REPORTS] user-activity error:', err)
      res.status(500).json({ error: 'فشل جلب نشاط المستخدم' })
    }
  }
)

reportsRouter.get(
  '/evidence',
  requirePermission('view_documents'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { from, to, caseId, page = '1', pageSize = '25' } = req.query
      const limit = parseInt(pageSize as string)
      const offset = (parseInt(page as string) - 1) * limit

      let countSql = 'SELECT COUNT(*) FROM evidence WHERE company_id = $1'
      let sql = 'SELECT * FROM evidence WHERE company_id = $1'
      const params: any[] = [companyId]
      let idx = 2
      if (from) {
        countSql += ` AND evidence_date >= $${idx}`
        sql += ` AND evidence_date >= $${idx}`
        params.push(from)
        idx++
      }
      if (to) {
        countSql += ` AND evidence_date <= $${idx}`
        sql += ` AND evidence_date <= $${idx}`
        params.push(to)
        idx++
      }
      if (caseId) {
        countSql += ` AND case_id = $${idx}`
        sql += ` AND case_id = $${idx}`
        params.push(caseId)
        idx++
      }
      sql += ` ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`

      const countRes = await query(countSql, params)
      const totalRows = parseInt(countRes.rows[0].count)

      const dataRes = await query(sql, [...params, limit, offset])
      res.json({
        rows: dataRes.rows,
        pageInfo: {
          page: parseInt(page as string),
          pageSize: limit,
          totalRows
        }
      })
    } catch (err) {
      console.error('[REPORTS] evidence report error:', err)
      res.status(500).json({ error: 'فشل جلب تقرير الأدلة' })
    }
  }
)

reportsRouter.get(
  '/memoranda',
  requirePermission('view_documents'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { from, to, caseId, q, status = 'active', page = '1', pageSize = '25' } = req.query
      const limit = parseInt(pageSize as string)
      const offset = (parseInt(page as string) - 1) * limit

      const isArchived = status === 'archived'
      let countSql = 'SELECT COUNT(*) FROM memoranda WHERE company_id = $1 AND is_archived = $2'
      let sql = 'SELECT * FROM memoranda WHERE company_id = $1 AND is_archived = $2'
      const params: any[] = [companyId, isArchived]
      let idx = 3
      if (from) {
        countSql += ` AND (memo_date >= $${idx} OR created_at >= $${idx})`
        sql += ` AND (memo_date >= $${idx} OR created_at >= $${idx})`
        params.push(from)
        idx++
      }
      if (to) {
        countSql += ` AND (memo_date <= $${idx} OR created_at <= $${idx})`
        sql += ` AND (memo_date <= $${idx} OR created_at <= $${idx})`
        params.push(to)
        idx++
      }
      if (caseId) {
        countSql += ` AND case_id = $${idx}`
        sql += ` AND case_id = $${idx}`
        params.push(caseId)
        idx++
      }
      if (q) {
        countSql += ` AND (memo_title ILIKE $${idx} OR memo_summary ILIKE $${idx} OR memo_text ILIKE $${idx})`
        sql += ` AND (memo_title ILIKE $${idx} OR memo_summary ILIKE $${idx} OR memo_text ILIKE $${idx})`
        params.push(`%${q}%`)
        idx++
      }
      sql += ` ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`

      const countRes = await query(countSql, params)
      const totalRows = parseInt(countRes.rows[0].count)

      const dataRes = await query(sql, [...params, limit, offset])
      res.json({
        rows: dataRes.rows,
        pageInfo: {
          page: parseInt(page as string),
          pageSize: limit,
          totalRows
        }
      })
    } catch (err) {
      console.error('[REPORTS] memoranda report error:', err)
      res.status(500).json({ error: 'فشل جلب تقريرالمذكرات' })
    }
  }
)

reportsRouter.get(
  '/memoranda/:id',
  requirePermission('view_documents'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const result = await query(
        `SELECT m.*, c.case_number, cl.name as client_name, cl.id as client_id
       FROM memoranda m
       LEFT JOIN cases c ON m.case_id = c.id
       LEFT JOIN clients cl ON c.client_id = cl.id
       WHERE m.id = $1 AND m.company_id = $2`,
        [req.params.id, companyId]
      )
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'المذكرة غير موجودة' })
        return
      }
      res.json(result.rows[0])
    } catch (err) {
      console.error('[REPORTS] memorandum detail error:', err)
      res.status(500).json({ error: 'فشل جلب تفاصيل المذكرة' })
    }
  }
)

reportsRouter.get(
  '/documents',
  requirePermission('view_documents'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { linkType, parentId, from, to, page = '1', pageSize = '25' } = req.query
      const limit = parseInt(pageSize as string)
      const offset = (parseInt(page as string) - 1) * limit

      let countSql = 'SELECT COUNT(*) FROM documents_v2 WHERE company_id = $1'
      let sql = 'SELECT * FROM documents_v2 WHERE company_id = $1'
      const params: any[] = [companyId]
      let idx = 2
      if (linkType) {
        countSql += ` AND link_type = $${idx}`
        sql += ` AND link_type = $${idx}`
        params.push(linkType)
        idx++
      }
      if (parentId) {
        if (linkType === 'case') {
          countSql += ` AND case_id = $${idx}`
          sql += ` AND case_id = $${idx}`
          params.push(parentId)
          idx++
        } else if (linkType === 'task') {
          countSql += ` AND task_id = $${idx}`
          sql += ` AND task_id = $${idx}`
          params.push(parentId)
          idx++
        } else if (linkType === 'session') {
          countSql += ` AND session_id = $${idx}`
          sql += ` AND session_id = $${idx}`
          params.push(parentId)
          idx++
        }
      }
      if (from) {
        countSql += ` AND created_at >= $${idx}`
        sql += ` AND created_at >= $${idx}`
        params.push(from)
        idx++
      }
      if (to) {
        countSql += ` AND created_at <= $${idx}`
        sql += ` AND created_at <= $${idx}`
        params.push(to)
        idx++
      }
      sql += ` ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`

      const countRes = await query(countSql, params)
      const totalRows = parseInt(countRes.rows[0].count)

      const dataRes = await query(sql, [...params, limit, offset])
      res.json({
        rows: dataRes.rows,
        pageInfo: {
          page: parseInt(page as string),
          pageSize: limit,
          totalRows
        }
      })
    } catch (err) {
      console.error('[REPORTS] documents report error:', err)
      res.status(500).json({ error: 'فشل جلب تقرير المستندات' })
    }
  }
)

reportsRouter.get(
  '/sessions-list',
  requirePermission('view_sessions'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { caseId } = req.query
      let sql = 'SELECT * FROM sessions WHERE company_id = $1'
      const params: any[] = [companyId]
      if (caseId) {
        sql += ' AND case_id = $2'
        params.push(caseId)
      }
      sql += ' ORDER BY date DESC, time DESC'
      const result = await query(sql, params)
      res.json(result.rows)
    } catch (err) {
      console.error('[REPORTS] sessions-list error:', err)
      res.status(500).json({ error: 'فشل جلب قائمة الجلسات' })
    }
  }
)

reportsRouter.get(
  '/tasks-list',
  requirePermission('view_tasks'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { caseId } = req.query
      let sql = 'SELECT * FROM tasks_v2 WHERE company_id = $1'
      const params: any[] = [companyId]
      if (caseId) {
        sql += ' AND case_id = $2'
        params.push(caseId)
      }
      sql += ' ORDER BY created_at DESC'
      const result = await query(sql, params)
      res.json(result.rows)
    } catch (err) {
      console.error('[REPORTS] tasks-list error:', err)
      res.status(500).json({ error: 'فشل جلب قائمة المهام' })
    }
  }
)

reportsRouter.get(
  '/legal-services',
  requirePermission('export_reports'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const {
        clientId, caseId, lawyerId, fromDate, toDate, groupBy,
        category_id, status_id, priority_id, q,
        page = '1', pageSize = '500'
      } = req.query

      const limit = parseInt(pageSize as string)
      const offset = (parseInt(page as string) - 1) * limit

      // Build WHERE clause
      let whereSql = ' WHERE e.company_id = $1 AND e.deleted_at IS NULL'
      const params: any[] = [companyId]
      let paramIndex = 2

      if (clientId) {
        whereSql += ` AND e.client_id = $${paramIndex++}`
        params.push(clientId)
      }
      if (caseId) {
        whereSql += ` AND e.case_id = $${paramIndex++}`
        params.push(caseId)
      }
      if (lawyerId) {
        whereSql += ` AND e.responsible_lawyer_id = $${paramIndex++}`
        params.push(lawyerId)
      }
      if (fromDate) {
        whereSql += ` AND e.start_date >= $${paramIndex++}`
        params.push(fromDate)
      }
      if (toDate) {
        whereSql += ` AND e.start_date <= $${paramIndex++}`
        params.push(toDate)
      }
      if (category_id && category_id !== 'الكل') {
        whereSql += ` AND e.category_id = $${paramIndex++}`
        params.push(category_id)
      }
      if (status_id && status_id !== 'الكل') {
        whereSql += ` AND e.status_id = $${paramIndex++}`
        params.push(status_id)
      }
      if (priority_id && priority_id !== 'الكل') {
        whereSql += ` AND e.priority_id = $${paramIndex++}`
        params.push(priority_id)
      }
      if (q) {
        whereSql += ` AND (e.engagement_number ILIKE $${paramIndex} OR e.description ILIKE $${paramIndex} OR e.purpose ILIKE $${paramIndex})`
        params.push(`%${q}%`)
        paramIndex++
      }

      const joinSql = `
        FROM legal_engagements e
        LEFT JOIN legal_service_categories c ON e.category_id = c.id
        LEFT JOIN legal_service_types t ON e.engagement_type_id = t.id
        LEFT JOIN legal_service_statuses s ON e.status_id = s.id
        LEFT JOIN legal_service_priorities p ON e.priority_id = p.id
        LEFT JOIN clients cl ON e.client_id = cl.id
        LEFT JOIN employees emp ON e.responsible_lawyer_id = emp.id
        LEFT JOIN cases ca ON e.case_id = ca.id
        LEFT JOIN invoices inv ON e.invoice_id = inv.id
      `

      // Get total count
      const countResult = await query(`SELECT COUNT(*) ${joinSql} ${whereSql}`, params)
      const totalRows = parseInt(countResult.rows[0].count)

      // Get grouped data if groupBy is specified
      let groupResult = null
      if (groupBy) {
        let groupSelect: string
        let groupField: string
        switch (groupBy) {
          case 'lawyer':
            groupSelect = `COALESCE(emp.name, 'غير معين') as group_name, emp.id as group_id`
            groupField = `emp.name`
            break
          case 'client':
            groupSelect = `cl.name as group_name, cl.id as group_id`
            groupField = `cl.name`
            break
          case 'category':
            groupSelect = `c.name_ar as group_name, c.id as group_id`
            groupField = `c.name_ar`
            break
          case 'case':
            groupSelect = `COALESCE(ca.case_number, 'بدون قضية') as group_name, ca.id as group_id`
            groupField = `ca.case_number`
            break
          case 'month':
            groupSelect = `TO_CHAR(e.start_date, 'YYYY-MM') as group_name, TO_CHAR(e.start_date, 'YYYY-MM') as group_id`
            groupField = `TO_CHAR(e.start_date, 'YYYY-MM')`
            break
          case 'year':
            groupSelect = `TO_CHAR(e.start_date, 'YYYY') as group_name, TO_CHAR(e.start_date, 'YYYY') as group_id`
            groupField = `TO_CHAR(e.start_date, 'YYYY')`
            break
          default:
            groupSelect = 'NULL as group_name, NULL as group_id'
            groupField = 'NULL'
        }

        const groupSql = `
          SELECT ${groupSelect},
            COUNT(*) as service_count,
            COALESCE(SUM(e.financial_compensation), 0) as total_compensation,
            COALESCE(SUM(e.paid_amount), 0) as total_paid,
            COALESCE(SUM(e.remaining_amount), 0) as total_remaining,
            COALESCE(SUM(e.tax), 0) as total_tax
          ${joinSql} ${whereSql}
          GROUP BY ${groupField}
          ORDER BY service_count DESC
        `
        groupResult = await query(groupSql, params)
      }

      // Get paginated detailed data
      const selectSql = `
        SELECT e.*,
          c.name_ar as category_name,
          t.name_ar as service_type_name,
          s.status_name_ar as status_name,
          s.color as status_color,
          p.priority_name_ar as priority_name,
          p.color as priority_color,
          cl.name as client_name,
          COALESCE(emp.name, 'غير معين') as responsible_name,
          ca.case_number as linked_case_number,
          inv.invoice_number
      `

      const dataSql = `${selectSql} ${joinSql} ${whereSql} ORDER BY e.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
      const dataResult = await query(dataSql, [...params, limit, offset])

      // Status distribution for charts
      const statusDistSql = `
        SELECT s.status_name_ar, s.color, COUNT(*) as count
        ${joinSql} ${whereSql}
        GROUP BY s.status_name_ar, s.color
        ORDER BY count DESC
      `
      const statusDist = await query(statusDistSql, params)

      // Category distribution for charts
      const catDistSql = `
        SELECT c.name_ar, COUNT(*) as count,
          COALESCE(SUM(e.financial_compensation), 0) as total_amount
        ${joinSql} ${whereSql}
        GROUP BY c.name_ar
        ORDER BY count DESC
      `
      const catDist = await query(catDistSql, params)

      // Lawyer distribution for charts
      const lawyerDistSql = `
        SELECT COALESCE(emp.name, 'غير معين') as name, COUNT(*) as count,
          COALESCE(SUM(e.financial_compensation), 0) as total_amount,
          COALESCE(SUM(e.paid_amount), 0) as total_paid
        ${joinSql} ${whereSql}
        GROUP BY emp.name
        ORDER BY count DESC
      `
      const lawyerDist = await query(lawyerDistSql, params)

      // Summary stats from ALL matching rows (not just paginated page)
      const summarySql = `
        SELECT
          COUNT(*) as total_services,
          COALESCE(SUM(e.financial_compensation), 0) as total_revenue,
          COALESCE(SUM(e.paid_amount), 0) as total_paid,
          COALESCE(SUM(e.remaining_amount), 0) as total_remaining,
          COUNT(*) FILTER (WHERE e.status_id = 'status_completed') as completed_count,
          COUNT(*) FILTER (WHERE e.status_id = 'status_in_progress') as in_progress_count
        ${joinSql} ${whereSql}
      `
      const summaryResult = await query(summarySql, params)
      const s = summaryResult.rows[0]

      const totalServices = parseInt(s.total_services)
      const totalRevenue = parseFloat(s.total_revenue)
      const totalPaid = parseFloat(s.total_paid)
      const totalRemaining = parseFloat(s.total_remaining)
      const completedCount = parseInt(s.completed_count)
      const inProgressCount = parseInt(s.in_progress_count)

      res.json({
        services: dataResult.rows,
        pageInfo: {
          page: parseInt(page as string),
          pageSize: limit,
          totalRows
        },
        summary: {
          totalServices,
          totalRevenue,
          totalPaid,
          totalRemaining,
          completedCount,
          inProgressCount
        },
        distributions: {
          byStatus: statusDist.rows,
          byCategory: catDist.rows,
          byLawyer: lawyerDist.rows
        },
        groups: groupResult ? groupResult.rows : null
      })
    } catch (err) {
      console.error('[REPORTS] legal-services error:', err)
      res.status(500).json({ error: 'فشل جلب تقرير الخدمات القانونية' })
    }
  }
)

// Export legal services report as CSV
// Quick stats summary for dashboard KPI
reportsRouter.get(
  '/legal-services/stats',
  requirePermission('view_legal_services'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)

      const totalResult = await query(`
        SELECT
          COUNT(*) as total_services,
          COALESCE(SUM(financial_compensation), 0) as total_compensation,
          COALESCE(SUM(paid_amount), 0) as total_paid,
          COALESCE(SUM(remaining_amount), 0) as total_remaining,
          COUNT(*) FILTER (WHERE status_id = 'status_completed') as completed_count,
          COUNT(*) FILTER (WHERE status_id = 'status_in_progress') as in_progress_count,
          COUNT(*) FILTER (WHERE status_id = 'status_pending') as pending_count
        FROM legal_engagements
        WHERE company_id = $1 AND deleted_at IS NULL
      `, [companyId])

      const monthlyResult = await query(`
        SELECT
          TO_CHAR(start_date, 'YYYY-MM') as month,
          COUNT(*) as count,
          COALESCE(SUM(financial_compensation), 0) as total_amount
        FROM legal_engagements
        WHERE company_id = $1 AND deleted_at IS NULL AND start_date IS NOT NULL
        GROUP BY TO_CHAR(start_date, 'YYYY-MM')
        ORDER BY month DESC
        LIMIT 12
      `, [companyId])

      res.json({
        totals: totalResult.rows[0],
        monthly: monthlyResult.rows
      })
    } catch (err) {
      console.error('[REPORTS] legal-services stats error:', err)
      res.status(500).json({ error: 'فشل جلب إحصائيات الخدمات القانونية' })
    }
  }
)

reportsRouter.post(
  '/legal-services/export',
  requirePermission('export_reports'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { format, clientId, caseId, lawyerId, fromDate, toDate, category_id, status_id } = req.body

      let sql = `
        SELECT e.engagement_number, e.description, e.purpose,
          c.name_ar as category_name,
          t.name_ar as service_type_name,
          s.status_name_ar as status_name,
          p.priority_name_ar as priority_name,
          cl.name as client_name,
          COALESCE(emp.name, 'غير معين') as responsible_name,
          ca.case_number as linked_case_number,
          inv.invoice_number,
          e.financial_compensation, e.tax, e.paid_amount, e.remaining_amount,
          e.start_date, e.expected_end_date, e.completion_date,
          e.payment_method
        FROM legal_engagements e
        LEFT JOIN legal_service_categories c ON e.category_id = c.id
        LEFT JOIN legal_service_types t ON e.engagement_type_id = t.id
        LEFT JOIN legal_service_statuses s ON e.status_id = s.id
        LEFT JOIN legal_service_priorities p ON e.priority_id = p.id
        LEFT JOIN clients cl ON e.client_id = cl.id
        LEFT JOIN employees emp ON e.responsible_lawyer_id = emp.id
        LEFT JOIN cases ca ON e.case_id = ca.id
        LEFT JOIN invoices inv ON e.invoice_id = inv.id
        WHERE e.company_id = $1 AND e.deleted_at IS NULL
      `
      const params: any[] = [companyId]
      let paramIndex = 2

      if (clientId) { sql += ` AND e.client_id = $${paramIndex++}`; params.push(clientId) }
      if (caseId) { sql += ` AND e.case_id = $${paramIndex++}`; params.push(caseId) }
      if (lawyerId) { sql += ` AND e.responsible_lawyer_id = $${paramIndex++}`; params.push(lawyerId) }
      if (fromDate) { sql += ` AND e.start_date >= $${paramIndex++}`; params.push(fromDate) }
      if (toDate) { sql += ` AND e.start_date <= $${paramIndex++}`; params.push(toDate) }
      if (category_id && category_id !== 'الكل') { sql += ` AND e.category_id = $${paramIndex++}`; params.push(category_id) }
      if (status_id && status_id !== 'الكل') { sql += ` AND e.status_id = $${paramIndex++}`; params.push(status_id) }

      sql += ' ORDER BY e.created_at DESC'

      const result = await query(sql, params)

      if (format === 'csv') {
        const headers = ['رقم الخدمة', 'الوصف', 'الغرض', 'التصنيف', 'نوع الخدمة', 'الحالة', 'الأولوية',
          'العميل', 'المسؤول', 'رقم القضية', 'رقم الفاتورة', 'المقابل المالي', 'الضريبة', 'المدفوع', 'المتبقي',
          'تاريخ البداية', 'تاريخ الانتهاء المتوقع', 'تاريخ الإنجاز', 'طريقة الدفع']

        const csvRows = [
          headers.join(','),
          ...result.rows.map((r: any) => [
            r.engagement_number, r.description || '', r.purpose || '',
            r.category_name || '', r.service_type_name || '', r.status_name || '', r.priority_name || '',
            r.client_name || '', r.responsible_name || '', r.linked_case_number || '',
            r.invoice_number || '',
            r.financial_compensation || 0, r.tax || 0, r.paid_amount || 0, r.remaining_amount || 0,
            r.start_date || '', r.expected_end_date || '', r.completion_date || '', r.payment_method || ''
          ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
        ]

        const csv = '\uFEFF' + csvRows.join('\n')
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', `attachment; filename="legal-services-report.csv"`)
        res.send(csv)
      } else {
        res.status(400).json({ error: 'الصيغة المطلوبة غير مدعومة. استخدم csv' })
      }
    } catch (err) {
      console.error('[REPORTS] legal-services export error:', err)
      res.status(500).json({ error: 'فشل تصدير تقرير الخدمات القانونية' })
    }
  }
)

reportsRouter.post(
  '/preview',
  requirePermission('export_reports'),
  async (req: Request, res: Response) => {
    try {
      res.send(`
      <html>
        <head>
          <style>
            body { font-family: sans-serif; padding: 20px; direction: rtl; text-align: center; color: #333; }
            .card { border: 1px solid #ccc; padding: 20px; border-radius: 8px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>معاينة التقرير</h2>
            <p>معاينة التقارير عبر الويب غير مدعومة حالياً بشكل كامل. الرجاء استخدام ميزة الطباعة أو تصدير CSV.</p>
          </div>
        </body>
      </html>
    `)
    } catch (err) {
      console.error('[REPORTS] preview error:', err)
      res.status(500).json({ error: 'فشل جلب معاينة التقرير' })
    }
  }
)
