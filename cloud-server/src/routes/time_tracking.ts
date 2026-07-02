import { Router, Request, Response } from 'express'
import { query } from '../db/connection'
import { authMiddleware } from '../middleware/auth'
import { getCompanyId } from '../middleware/tenant'
import { v4 as uuidv4 } from 'uuid'

export const timeTrackingRouter = Router()

timeTrackingRouter.use(authMiddleware)

// GET /api/time-tracking/list
timeTrackingRouter.get('/list', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const { caseId, taskId, userId, isBilled } = req.query

    let sql = `
      SELECT tl.*, u.full_name as employee_name, c.case_number, t.title as task_title
      FROM time_logs tl
      LEFT JOIN users u ON tl.user_id = u.id
      LEFT JOIN cases c ON tl.case_id = c.id
      LEFT JOIN tasks_v2 t ON tl.task_id = t.id
      WHERE tl.company_id = $1
    `
    const params: any[] = [companyId]
    let index = 2

    if (caseId) {
      sql += ` AND tl.case_id = $${index++}`
      params.push(caseId)
    }
    if (taskId) {
      sql += ` AND tl.task_id = $${index++}`
      params.push(taskId)
    }
    if (userId) {
      sql += ` AND tl.user_id = $${index++}`
      params.push(userId)
    }
    if (isBilled !== undefined) {
      sql += ` AND tl.is_billed = $${index++}`
      params.push(isBilled === 'true')
    }

    sql += ` ORDER BY tl.start_time DESC`

    const result = await query(sql, params)
    res.json(result.rows)
  } catch (err) {
    console.error('[TIME_TRACKING] List error:', err)
    res.status(500).json({ error: 'فشل جلب سجلات الوقت' })
  }
})

// POST /api/time-tracking/start
timeTrackingRouter.post('/start', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const userId = (req as any).user.userId
    const { caseId, taskId, description } = req.body

    // Check if there is an active running timer for this user
    const runningResult = await query(
      `SELECT id FROM time_logs WHERE company_id = $1 AND user_id = $2 AND end_time IS NULL LIMIT 1`,
      [companyId, userId]
    )
    if (runningResult.rows.length > 0) {
      res.status(400).json({ error: 'لديك مؤقت نشط يعمل بالفعل. يرجى إيقافه أولاً.' })
      return
    }

    const id = uuidv4()
    await query(
      `INSERT INTO time_logs (id, company_id, user_id, case_id, task_id, description, start_time, end_time, duration_minutes, is_billed)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NULL, 0, FALSE)`,
      [id, companyId, userId, caseId || null, taskId || null, description || 'عمل عام']
    )

    res.json({ success: true, id, message: 'بدأ المؤقت بنجاح' })
  } catch (err) {
    console.error('[TIME_TRACKING] Start error:', err)
    res.status(500).json({ error: 'فشل بدء المؤقت' })
  }
})

// POST /api/time-tracking/stop
timeTrackingRouter.post('/stop', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const userId = (req as any).user.userId

    // Find the running timer
    const runningResult = await query(
      `SELECT id, start_time FROM time_logs WHERE company_id = $1 AND user_id = $2 AND end_time IS NULL LIMIT 1`,
      [companyId, userId]
    )
    if (runningResult.rows.length === 0) {
      res.status(400).json({ error: 'لا يوجد مؤقت نشط قيد التشغيل حالياً' })
      return
    }

    const { id, start_time } = runningResult.rows[0]
    const endTime = new Date()
    const diffMs = endTime.getTime() - new Date(start_time).getTime()
    const durationMinutes = Math.max(1, Math.round(diffMs / 60000))

    await query(
      `UPDATE time_logs 
       SET end_time = $1, duration_minutes = $2, updated_at = NOW() 
       WHERE id = $3 AND company_id = $4`,
      [endTime, durationMinutes, id, companyId]
    )

    res.json({ success: true, durationMinutes, message: 'تم إيقاف المؤقت وحفظ المدة بنجاح' })
  } catch (err) {
    console.error('[TIME_TRACKING] Stop error:', err)
    res.status(500).json({ error: 'فشل إيقاف المؤقت' })
  }
})

// POST /api/time-tracking/manual
timeTrackingRouter.post('/manual', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const userId = (req as any).user.userId
    const { caseId, taskId, description, startTime, endTime, durationMinutes } = req.body

    if (!description || !startTime || !endTime) {
      res.status(400).json({ error: 'يرجى ملء جميع البيانات المطلوبة' })
      return
    }

    let calculatedMinutes = Number(durationMinutes)
    if (!calculatedMinutes) {
      const diffMs = new Date(endTime).getTime() - new Date(startTime).getTime()
      calculatedMinutes = Math.max(1, Math.round(diffMs / 60000))
    }

    const id = uuidv4()
    await query(
      `INSERT INTO time_logs (id, company_id, user_id, case_id, task_id, description, start_time, end_time, duration_minutes, is_billed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE)`,
      [
        id,
        companyId,
        userId,
        caseId || null,
        taskId || null,
        description,
        new Date(startTime),
        new Date(endTime),
        calculatedMinutes
      ]
    )

    res.json({ success: true, id, message: 'تم حفظ سجل الوقت بنجاح' })
  } catch (err) {
    console.error('[TIME_TRACKING] Manual log error:', err)
    res.status(500).json({ error: 'فشل إضافة السجل اليدوي' })
  }
})

// DELETE /api/time-tracking/:id
timeTrackingRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const { id } = req.params

    await query(
      `DELETE FROM time_logs WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    )

    res.json({ success: true, message: 'تم حذف سجل الوقت بنجاح' })
  } catch (err) {
    console.error('[TIME_TRACKING] Delete error:', err)
    res.status(500).json({ error: 'فشل حذف سجل الوقت' })
  }
})
