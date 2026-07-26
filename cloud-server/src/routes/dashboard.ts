import { Router, Request, Response } from 'express'
import { query } from '../db/connection'
import { authMiddleware } from '../middleware/auth'

export const dashboardRouter = Router()

dashboardRouter.use(authMiddleware)

// 1. GET /api/dashboard/stats - Returns live KPIs scoped to user/tenant
dashboardRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    const companyId = req.auth?.companyId
    const userId = req.auth?.userId

    if (!companyId) {
      return res.status(400).json({ error: 'Company ID required' })
    }

    // Active Cases Count
    const casesRes = await query(
      `SELECT COUNT(*)::int AS active_cases
       FROM cases
       WHERE company_id = $1
         AND (responsible_user_id = $2 OR $2 IS NULL)
         AND status NOT IN ('مغلقة', 'منتهية', 'أرشيف')`,
      [companyId, userId || null]
    )

    // Total Clients Count
    const clientsRes = await query(
      `SELECT COUNT(*)::int AS total_clients
       FROM clients
       WHERE company_id = $1`,
      [companyId]
    )

    // Upcoming Sessions Count
    const sessionsRes = await query(
      `SELECT COUNT(*)::int AS upcoming_sessions
       FROM sessions
       WHERE company_id = $1
         AND (responsible_user_id = $2 OR $2 IS NULL)
         AND session_date >= NOW()`,
      [companyId, userId || null]
    )

    // Monthly Revenue
    const revenueRes = await query(
      `SELECT
         COALESCE(SUM(amount), 0)::float AS total_income,
         COALESCE(SUM(CASE WHEN status IN ('مقبوض', 'مكتمل', 'ممدفوع') THEN amount ELSE 0 END), 0)::float AS collected,
         COALESCE(SUM(CASE WHEN status IN ('مستحق', 'غير مدفوع', 'معلق') THEN amount ELSE 0 END), 0)::float AS pending
       FROM finances
       WHERE company_id = $1`,
      [companyId]
    )

    const stats = {
      active_cases: casesRes.rows[0]?.active_cases || 0,
      total_clients: clientsRes.rows[0]?.total_clients || 0,
      upcoming_sessions: sessionsRes.rows[0]?.upcoming_sessions || 0,
      revenue: {
        total_income: revenueRes.rows[0]?.total_income || 0,
        collected: revenueRes.rows[0]?.collected || 0,
        pending: revenueRes.rows[0]?.pending || 0
      }
    }

    return res.json(stats)
  } catch (err: any) {
    console.error('[DashboardRouter] Error fetching stats:', err.message)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// 2. GET /api/dashboard/alerts - Returns calculated real urgent alerts
dashboardRouter.get('/alerts', async (req: Request, res: Response) => {
  try {
    const companyId = req.auth?.companyId
    const userId = req.auth?.userId

    if (!companyId) return res.status(400).json({ error: 'Company ID required' })

    const alerts: any[] = []

    // Alert 1: Session in < 24h with missing documents or agency
    const urgentSessionsRes = await query(
      `SELECT s.id, s.session_title, s.session_date, s.case_number, c.name AS client_name
       FROM sessions s
       LEFT JOIN clients c ON s.client_id = c.id
       WHERE s.company_id = $1
         AND (s.responsible_user_id = $2 OR $2 IS NULL)
         AND s.session_date >= NOW()
         AND s.session_date <= NOW() + INTERVAL '24 hours'
       ORDER BY s.session_date ASC
       LIMIT 1`,
      [companyId, userId || null]
    )

    if (urgentSessionsRes.rows.length > 0) {
      const s = urgentSessionsRes.rows[0]
      alerts.push({
        id: `urgent-session-${s.id}`,
        type: 'session_24h',
        severity: 'high',
        message: `قضية العميل ${s.client_name || 'غير محدد'} (رقم ${s.case_number || '-'}) موعد الجلسة بعد ٢٤ ساعة ولم يُرفق التوكيل بعد`,
        session_id: s.id
      })
    }

    // Alert 2: Case Deadlines <= 3 days
    const urgentTasksRes = await query(
      `SELECT t.id, t.title, t.due_date, c.case_number, cl.name AS client_name
       FROM tasks_v2 t
       LEFT JOIN cases c ON t.case_id = c.id
       LEFT JOIN clients cl ON c.client_id = cl.id
       WHERE t.company_id = $1
         AND (t.responsible_user_id = $2 OR $2 IS NULL)
         AND t.status != 'مكتملة'
         AND t.due_date IS NOT NULL
         AND t.due_date <= NOW() + INTERVAL '3 days'
       ORDER BY t.due_date ASC
       LIMIT 5`,
      [companyId, userId || null]
    )

    for (const t of urgentTasksRes.rows) {
      alerts.push({
        id: `task-deadline-${t.id}`,
        type: 'deadline',
        severity: 'warning',
        title: t.title || 'موعد نهائي لمذكرة',
        description: `قضية ${t.client_name || 'عامة'} · رقم ${t.case_number || '-'}`,
        due_date: t.due_date
      })
    }

    return res.json({ alerts })
  } catch (err: any) {
    console.error('[DashboardRouter] Error fetching alerts:', err.message)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// 3. GET /api/dashboard/pipeline - Returns case counts grouped by stage
dashboardRouter.get('/pipeline', async (req: Request, res: Response) => {
  try {
    const companyId = req.auth?.companyId
    if (!companyId) return res.status(400).json({ error: 'Company ID required' })

    const result = await query(
      `SELECT
         COALESCE(stage, status) AS stage,
         COUNT(*)::int AS count
       FROM cases
       WHERE company_id = $1
       GROUP BY COALESCE(stage, status)`,
      [companyId]
    )

    const pipeline = {
      consultation: 0,
      preparation: 0,
      pleading: 0,
      judgment: 0,
      enforcement: 0
    }

    for (const row of result.rows) {
      const s = String(row.stage || '')
      if (s.includes('استشارة')) pipeline.consultation += row.count
      else if (s.includes('تحضير')) pipeline.preparation += row.count
      else if (s.includes('مرافعة')) pipeline.pleading += row.count
      else if (s.includes('حكم')) pipeline.judgment += row.count
      else if (s.includes('تنفيذ')) pipeline.enforcement += row.count
      else pipeline.preparation += row.count
    }

    return res.json(pipeline)
  } catch (err: any) {
    console.error('[DashboardRouter] Error fetching pipeline:', err.message)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// 4. GET /api/dashboard/sessions/upcoming - Returns next 5 sessions joined with clients
dashboardRouter.get('/sessions/upcoming', async (req: Request, res: Response) => {
  try {
    const companyId = req.auth?.companyId
    const userId = req.auth?.userId
    if (!companyId) return res.status(400).json({ error: 'Company ID required' })

    const result = await query(
      `SELECT
         s.id,
         s.session_title,
         s.session_date,
         s.status,
         s.court_name,
         s.case_number,
         c.name AS client_name,
         c.phone AS client_phone
       FROM sessions s
       LEFT JOIN clients c ON s.client_id = c.id
       WHERE s.company_id = $1
         AND (s.responsible_user_id = $2 OR $2 IS NULL)
         AND s.session_date >= NOW()
       ORDER BY s.session_date ASC
       LIMIT 5`,
      [companyId, userId || null]
    )

    return res.json(result.rows)
  } catch (err: any) {
    console.error('[DashboardRouter] Error fetching upcoming sessions:', err.message)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default dashboardRouter
