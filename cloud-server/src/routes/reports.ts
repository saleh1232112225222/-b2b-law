import { Router, Request, Response } from 'express'
import { query } from '../db/connection'
import { authMiddleware } from '../middleware/auth'
import { getCompanyId } from '../middleware/tenant'

export const reportsRouter = Router()

reportsRouter.get('/case', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const { caseId } = req.query
    if (!caseId) {
      res.status(400).json({ error: 'caseId required' })
      return
    }
    const caseData = await query('SELECT * FROM cases WHERE id = $1 AND company_id = $2', [
      caseId,
      companyId
    ])
    if (caseData.rows.length === 0) {
      res.status(404).json({ error: 'Case not found' })
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
    const finances = await query('SELECT * FROM finances WHERE case_id = $1 AND company_id = $2', [
      caseId,
      companyId
    ])
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
      timelineRows.push({ at: s.date, type: 'جلسة', title: s.type || s.session_type || 'جلسة', id: s.id })
    }
    for (const t of tasks.rows) {
      timelineRows.push({ at: t.created_at, type: 'مهمة', title: t.title || t.task_title || 'مهمة', id: t.id })
    }
    for (const d of documents.rows) {
      timelineRows.push({ at: d.created_at, type: 'مستند', title: d.title || d.file_name || 'مستند', id: d.id })
    }
    timelineRows.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

    // Calculate KPIs
    const totalIn = finances.rows.reduce((sum: number, f: any) => sum + (parseFloat(f.amount_in || f.amount || 0)), 0)
    const totalOut = finances.rows.reduce((sum: number, f: any) => sum + (parseFloat(f.amount_out || 0)), 0)

    // Build parties from clients
    const clientData = await query(
      'SELECT cl.* FROM clients cl WHERE cl.id = $1',
      [caseRow.client_id]
    ).catch(() => ({ rows: [] }))

    res.json({
      case: {
        ...caseRow,
        client_name: clientData.rows[0]?.name || caseRow.client_name || '',
        parties: clientData.rows.length > 0 ? [{
          id: clientData.rows[0].id,
          name: clientData.rows[0].name,
          party_type: 'client'
        }] : []
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
            const d = new Date(s.date); const n = new Date(); const w = new Date(); w.setDate(w.getDate()+7);
            return d >= n && d <= w
          }).length,
          tasksOverdue: tasks.rows.filter((t: any) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed').length,
          tasksNext7: tasks.rows.filter((t: any) => { const d = new Date(t.due_date); const n = new Date(); const w = new Date(); w.setDate(w.getDate()+7); return d >= n && d <= w }).length,
          unclosedPastSessions: sessions.rows.filter((s: any) => new Date(s.date) < new Date() && s.status !== 'منتهية').length
        }
      }
    })
  } catch (err) {
    console.error('[REPORTS] Case report error:', err)
    res.status(500).json({ error: 'Failed to generate case report' })
  }
})

reportsRouter.get('/sessions', authMiddleware, async (req: Request, res: Response) => {
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
    res.status(500).json({ error: 'Failed' })
  }
})

reportsRouter.get('/financial-summary', authMiddleware, async (req: Request, res: Response) => {
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
    res.status(500).json({ error: 'Failed' })
  }
})

reportsRouter.get('/activity', authMiddleware, async (req: Request, res: Response) => {
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
    res.status(500).json({ error: 'Failed' })
  }
})

reportsRouter.post('/export/csv', authMiddleware, (req: Request, res: Response) => {
  const { filename, rows } = req.body
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: 'No data to export' })
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
})

reportsRouter.post('/export/pdf', (_req: Request, res: Response) => {
  res.status(501).json({ error: 'PDF export not yet implemented on server' })
})

reportsRouter.post('/export/html', (_req: Request, res: Response) => {
  res.status(501).json({ error: 'HTML export not yet implemented on server' })
})

reportsRouter.get('/users', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const result = await query(
      'SELECT id, username, full_name, role_key, is_active, employee_id FROM users WHERE company_id = $1',
      [companyId]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Failed' })
  }
})

reportsRouter.get('/clients', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const result = await query(
      'SELECT id, name, id_number, phone FROM clients WHERE company_id = $1 ORDER BY name',
      [companyId]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Failed' })
  }
})

reportsRouter.get('/operations-summary', authMiddleware, async (req: Request, res: Response) => {
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
    res.status(500).json({ error: 'Failed' })
  }
})

reportsRouter.get('/users-permissions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const users = await query(
      'SELECT id, username, full_name, role_key, is_active FROM users WHERE company_id = $1',
      [companyId]
    )
    res.json(users.rows)
  } catch (err) {
    res.status(500).json({ error: 'Failed' })
  }
})

reportsRouter.get('/dashboard', authMiddleware, async (req: Request, res: Response) => {
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
    res.status(500).json({ error: 'Failed' })
  }
})

reportsRouter.get('/cases', authMiddleware, async (req: Request, res: Response) => {
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
    res.status(500).json({ error: 'Failed to list cases' })
  }
})

reportsRouter.get('/user-activity', authMiddleware, async (req: Request, res: Response) => {
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
    res.status(500).json({ error: 'Failed to get user activity' })
  }
})

reportsRouter.get('/evidence', authMiddleware, async (req: Request, res: Response) => {
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
    res.status(500).json({ error: 'Failed to get evidence report' })
  }
})

reportsRouter.get('/memoranda', authMiddleware, async (req: Request, res: Response) => {
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
    res.status(500).json({ error: 'Failed to get memoranda report' })
  }
})

reportsRouter.get('/memoranda/:id', authMiddleware, async (req: Request, res: Response) => {
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
      res.status(404).json({ error: 'Memorandum not found' })
      return
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error('[REPORTS] memorandum detail error:', err)
    res.status(500).json({ error: 'Failed to get memorandum details' })
  }
})

reportsRouter.get('/documents', authMiddleware, async (req: Request, res: Response) => {
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
    res.status(500).json({ error: 'Failed to get documents report' })
  }
})

reportsRouter.get('/sessions-list', authMiddleware, async (req: Request, res: Response) => {
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
    res.status(500).json({ error: 'Failed to get sessions list' })
  }
})

reportsRouter.get('/tasks-list', authMiddleware, async (req: Request, res: Response) => {
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
    res.status(500).json({ error: 'Failed to get tasks list' })
  }
})

reportsRouter.post('/preview', authMiddleware, async (req: Request, res: Response) => {
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
    res.status(500).json({ error: 'Failed to get report preview' })
  }
})
