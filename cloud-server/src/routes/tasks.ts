import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { query } from '../db/connection'
import { authMiddleware } from '../middleware/auth'

export const tasksRouter = Router()

tasksRouter.use(authMiddleware)

function getCompanyId(req: Request): string {
  return req.auth!.companyId
}

// GET /api/tasks/by-case/:caseId
tasksRouter.get('/by-case/:caseId', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const { caseId } = req.params
    const result = await query(
      'SELECT * FROM tasks_v2 WHERE case_id = $1 AND company_id = $2 AND is_archived = FALSE ORDER BY created_at DESC',
      [caseId, companyId]
    )
    res.json({ data: result.rows })
  } catch (err) {
    console.error('[TASKS] byCase error:', err)
    res.status(500).json({ error: 'Failed to fetch tasks' })
  }
})

// GET /api/tasks/pending
tasksRouter.get('/pending', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const result = await query(
      "SELECT * FROM tasks_v2 WHERE company_id = $1 AND status = 'pending' AND is_archived = FALSE ORDER BY priority DESC, due_date ASC NULLS LAST",
      [companyId]
    )
    res.json({ data: result.rows })
  } catch (err) {
    console.error('[TASKS] pending error:', err)
    res.status(500).json({ error: 'Failed to fetch pending tasks' })
  }
})

// POST /api/tasks/:id/transition
tasksRouter.post('/:id/transition', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const userId = req.auth!.userId
    const { id } = req.params
    const { status, note } = req.body

    if (!status) {
      res.status(400).json({ error: 'status is required' })
      return
    }

    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled', 'closed']
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` })
      return
    }

    const taskRes = await query('SELECT * FROM tasks_v2 WHERE id = $1 AND company_id = $2', [id, companyId])
    if (taskRes.rows.length === 0) {
      res.status(404).json({ error: 'Task not found' })
      return
    }

    const before = taskRes.rows[0]

    const updateFields: string[] = ["status = $1", "status_changed_at = NOW()", "updated_at = NOW()"]
    const updateParams: any[] = [status]

    if (status === 'completed') {
      updateFields.push("completed_at = NOW()")
    }
    if (status === 'cancelled') {
      updateFields.push("cancelled_at = NOW()", "cancelled_by = $2", "cancel_reason = $3")
      updateParams.push(userId, note || null)
    }
    if (status === 'closed') {
      updateFields.push("closed_at = NOW()", "closed_by = $2", "closure_note = $3")
      updateParams.push(userId, note || null)
    }
    if (status === 'in_progress') {
      updateFields.push("started_at = COALESCE(started_at, NOW())")
    }

    const paramIdx = updateParams.length + 1
    await query(
      `UPDATE tasks_v2 SET ${updateFields.join(', ')} WHERE id = $${paramIdx} AND company_id = $${paramIdx + 1}`,
      [...updateParams, id, companyId]
    )

    // Audit log
    await query(
      `INSERT INTO task_audit_log (id, company_id, task_id, action_key, actor_user_id, before_json, after_json, created_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, NOW())`,
      [uuidv4(), companyId, id, `TRANSITION_TO_${status}`, userId,
        JSON.stringify({ status: before.status }), JSON.stringify({ status })]
    )

    res.json({ success: true })
  } catch (err) {
    console.error('[TASKS] transition error:', err)
    res.status(500).json({ error: 'Failed to transition task' })
  }
})

// POST /api/tasks/:id/close
tasksRouter.post('/:id/close', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const userId = req.auth!.userId
    const { id } = req.params
    const { note } = req.body

    const taskRes = await query('SELECT * FROM tasks_v2 WHERE id = $1 AND company_id = $2', [id, companyId])
    if (taskRes.rows.length === 0) {
      res.status(404).json({ error: 'Task not found' })
      return
    }

    const before = taskRes.rows[0]

    await query(
      'UPDATE tasks_v2 SET status = $1, closed_at = NOW(), closed_by = $2, closure_note = $3, updated_at = NOW() WHERE id = $4 AND company_id = $5',
      ['closed', userId, note || null, id, companyId]
    )

    await query(
      `INSERT INTO task_audit_log (id, company_id, task_id, action_key, actor_user_id, before_json, after_json, created_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, NOW())`,
      [uuidv4(), companyId, id, 'CLOSED', userId,
        JSON.stringify({ status: before.status }), JSON.stringify({ status: 'closed' })]
    )

    res.json({ success: true })
  } catch (err) {
    console.error('[TASKS] close error:', err)
    res.status(500).json({ error: 'Failed to close task' })
  }
})

// POST /api/tasks/:id/cancel
tasksRouter.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const userId = req.auth!.userId
    const { id } = req.params
    const { reason } = req.body

    const taskRes = await query('SELECT * FROM tasks_v2 WHERE id = $1 AND company_id = $2', [id, companyId])
    if (taskRes.rows.length === 0) {
      res.status(404).json({ error: 'Task not found' })
      return
    }

    const before = taskRes.rows[0]

    await query(
      'UPDATE tasks_v2 SET status = $1, cancelled_at = NOW(), cancelled_by = $2, cancel_reason = $3, updated_at = NOW() WHERE id = $4 AND company_id = $5',
      ['cancelled', userId, reason || null, id, companyId]
    )

    await query(
      `INSERT INTO task_audit_log (id, company_id, task_id, action_key, actor_user_id, before_json, after_json, created_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, NOW())`,
      [uuidv4(), companyId, id, 'CANCELLED', userId,
        JSON.stringify({ status: before.status }), JSON.stringify({ status: 'cancelled' })]
    )

    res.json({ success: true })
  } catch (err) {
    console.error('[TASKS] cancel error:', err)
    res.status(500).json({ error: 'Failed to cancel task' })
  }
})

// GET /api/tasks/:taskId/audit/count
tasksRouter.get('/:taskId/audit/count', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const { taskId } = req.params
    const result = await query(
      'SELECT COUNT(*) as count FROM task_audit_log WHERE task_id = $1 AND company_id = $2',
      [taskId, companyId]
    )
    res.json({ count: parseInt(result.rows[0].count, 10) })
  } catch (err) {
    console.error('[TASKS] auditCount error:', err)
    res.status(500).json({ error: 'Failed to count audit logs' })
  }
})

// GET /api/tasks/:taskId/audit
tasksRouter.get('/:taskId/audit', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const { taskId } = req.params
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const offset = (page - 1) * pageSize

    const result = await query(
      'SELECT * FROM task_audit_log WHERE task_id = $1 AND company_id = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4',
      [taskId, companyId, pageSize, offset]
    )
    res.json({ data: result.rows })
  } catch (err) {
    console.error('[TASKS] audit error:', err)
    res.status(500).json({ error: 'Failed to fetch audit logs' })
  }
})
