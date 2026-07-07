import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { query } from '../db/connection'
import { authMiddleware } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'

export const tasksRouter = Router()

tasksRouter.use(authMiddleware)

function getCompanyId(req: Request): string {
  return req.auth!.companyId
}

// GET /api/tasks/count
tasksRouter.get('/count', requirePermission('view_tasks'), async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const { q, status, priority, responsible_user_id, is_archived } = req.query

    let whereClause = 'WHERE company_id = $1'
    const params: any[] = [companyId]
    let paramIndex = 2

    if (status && status !== 'all') {
      whereClause += ` AND status = $${paramIndex++}`
      params.push(status)
    }
    if (priority) {
      whereClause += ` AND priority = $${paramIndex++}`
      params.push(priority)
    }
    if (responsible_user_id) {
      whereClause += ` AND responsible_user_id = $${paramIndex++}`
      params.push(responsible_user_id)
    }
    if (is_archived !== undefined) {
      whereClause += ` AND is_archived = $${paramIndex++}`
      const isArchivedStr = String(is_archived)
      params.push(isArchivedStr === '1' || isArchivedStr === 'true')
    } else {
      whereClause += ` AND is_archived = FALSE`
    }
    if (q) {
      whereClause += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`
      params.push(`%${q}%`)
      paramIndex++
    }

    const countResult = await query(`SELECT COUNT(*) FROM tasks_v2 ${whereClause}`, params)
    res.json({ count: parseInt(countResult.rows[0].count, 10) })
  } catch (err) {
    console.error('[TASKS] Count error:', err)
    res.status(500).json({ error: 'فشل عد المهام' })
  }
})

// GET /api/tasks
tasksRouter.get('/', requirePermission('view_tasks'), async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const {
      page = '1',
      pageSize = '50',
      q,
      status,
      priority,
      responsible_user_id,
      is_archived
    } = req.query
    const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string)
    const limit = parseInt(pageSize as string)

    let whereClause = 'WHERE company_id = $1'
    const params: any[] = [companyId]
    let paramIndex = 2

    if (status && status !== 'all') {
      whereClause += ` AND status = $${paramIndex++}`
      params.push(status)
    }
    if (priority) {
      whereClause += ` AND priority = $${paramIndex++}`
      params.push(priority)
    }
    if (responsible_user_id) {
      whereClause += ` AND responsible_user_id = $${paramIndex++}`
      params.push(responsible_user_id)
    }
    if (is_archived !== undefined) {
      whereClause += ` AND is_archived = $${paramIndex++}`
      const isArchivedStr = String(is_archived)
      params.push(isArchivedStr === '1' || isArchivedStr === 'true')
    } else {
      whereClause += ` AND is_archived = FALSE`
    }
    if (q) {
      whereClause += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`
      params.push(`%${q}%`)
      paramIndex++
    }

    const dataResult = await query(
      `SELECT tasks_v2.*, cases.case_number, clients.name as client_name FROM tasks_v2 LEFT JOIN cases ON tasks_v2.case_id = cases.id LEFT JOIN clients ON tasks_v2.client_id = clients.id ${whereClause} ORDER BY tasks_v2.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    )

    res.json({ data: dataResult.rows })
  } catch (err) {
    console.error('[TASKS] List error:', err)
    res.status(500).json({ error: 'فشل عرض المهام' })
  }
})

// POST /api/tasks
tasksRouter.post('/', requirePermission('create_tasks'), async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const userId = req.auth!.userId
    const body = { ...req.body, company_id: companyId }
    delete body.id

    if (!body.created_by) body.created_by = userId
    body.created_at = new Date().toISOString()
    body.updated_at = body.created_at

    const id = uuidv4()
    body.id = id

    // Convert empty strings to null for PostgreSQL compatibility
    for (const key of Object.keys(body)) {
      if (body[key] === '') {
        body[key] = null
      }
    }

    const allowedFields = [
      'id',
      'company_id',
      'case_id',
      'client_id',
      'link_type',
      'external_name',
      'owner_type',
      'responsible_user_id',
      'title',
      'description',
      'due_date',
      'status',
      'priority',
      'is_archived',
      'created_by',
      'updated_by',
      'created_at',
      'updated_at',
      'status_changed_at',
      'scheduled_for',
      'started_at',
      'completed_at',
      'closed_at',
      'closed_by',
      'closure_note',
      'cancelled_at',
      'cancelled_by',
      'cancel_reason'
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

    await query(`INSERT INTO tasks_v2 (${columns}) VALUES (${placeholders})`, values)

    // Audit log
    await query(
      `INSERT INTO task_audit_log (id, company_id, task_id, action_key, actor_user_id, before_json, after_json, created_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, NOW())`,
      [uuidv4(), companyId, id, 'CREATED', userId, null, JSON.stringify(body)]
    )

    res.status(201).json(body)
  } catch (err) {
    console.error('[TASKS] Create error:', err)
    res.status(500).json({ error: 'فشل إنشاء المهمة' })
  }
})

// GET /api/tasks/:id
tasksRouter.get('/:id', requirePermission('view_tasks'), async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const { id } = req.params

    const result = await query('SELECT tasks_v2.*, cases.case_number, clients.name as client_name FROM tasks_v2 LEFT JOIN cases ON tasks_v2.case_id = cases.id LEFT JOIN clients ON tasks_v2.client_id = clients.id WHERE tasks_v2.id = $1 AND tasks_v2.company_id = $2', [
      id,
      companyId
    ])
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'المهمة غير موجودة' })
      return
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error('[TASKS] GetById error:', err)
    res.status(500).json({ error: 'فشل جلب المهمة' })
  }
})

// PUT /api/tasks/:id
tasksRouter.put('/:id', requirePermission('edit_tasks'), async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const userId = req.auth!.userId
    const { id } = req.params
    const body = { ...req.body }
    delete body.id
    delete body.company_id

    body.updated_at = new Date().toISOString()
    if (!body.updated_by) body.updated_by = userId

    // Fetch before state for audit logging
    const beforeRes = await query('SELECT * FROM tasks_v2 WHERE id = $1 AND company_id = $2', [
      id,
      companyId
    ])
    if (beforeRes.rows.length === 0) {
      res.status(404).json({ error: 'المهمة غير موجودة' })
      return
    }
    const before = beforeRes.rows[0]

    // Convert empty strings to null for PostgreSQL compatibility
    for (const key of Object.keys(body)) {
      if (body[key] === '') {
        body[key] = null
      }
    }

    const allowedFields = [
      'case_id',
      'client_id',
      'link_type',
      'external_name',
      'owner_type',
      'responsible_user_id',
      'title',
      'description',
      'due_date',
      'status',
      'priority',
      'is_archived',
      'updated_by',
      'updated_at',
      'status_changed_at',
      'scheduled_for',
      'started_at',
      'completed_at',
      'closed_at',
      'closed_by',
      'closure_note',
      'cancelled_at',
      'cancelled_by',
      'cancel_reason'
    ]

    for (const key of Object.keys(body)) {
      if (!allowedFields.includes(key)) {
        delete body[key]
      }
    }

    const keys = Object.keys(body)
    const values = Object.values(body)
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ')

    await query(
      `UPDATE tasks_v2 SET ${setClause} WHERE id = $${keys.length + 1} AND company_id = $${keys.length + 2}`,
      [...values, id, companyId]
    )

    // Audit log
    await query(
      `INSERT INTO task_audit_log (id, company_id, task_id, action_key, actor_user_id, before_json, after_json, created_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, NOW())`,
      [uuidv4(), companyId, id, 'UPDATED', userId, JSON.stringify(before), JSON.stringify(body)]
    )

    res.json({ success: true })
  } catch (err) {
    console.error('[TASKS] Update error:', err)
    res.status(500).json({ error: 'فشل تحديث المهمة' })
  }
})

// DELETE /api/tasks/:id
tasksRouter.delete('/:id', requirePermission('edit_tasks'), async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const { id } = req.params

    const result = await query('DELETE FROM tasks_v2 WHERE id = $1 AND company_id = $2', [
      id,
      companyId
    ])
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'المهمة غير موجودة' })
      return
    }

    res.json({ success: true })
  } catch (err) {
    console.error('[TASKS] Delete error:', err)
    res.status(500).json({ error: 'فشل حذف المهمة' })
  }
})

// GET /api/tasks/by-case/:caseId
tasksRouter.get(
  '/by-case/:caseId',
  requirePermission('view_tasks'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { caseId } = req.params
      const result = await query(
        'SELECT tasks_v2.*, cases.case_number, clients.name as client_name FROM tasks_v2 LEFT JOIN cases ON tasks_v2.case_id = cases.id LEFT JOIN clients ON tasks_v2.client_id = clients.id WHERE tasks_v2.case_id = $1 AND tasks_v2.company_id = $2 AND tasks_v2.is_archived = FALSE ORDER BY tasks_v2.created_at DESC',
        [caseId, companyId]
      )
      res.json({ data: result.rows })
    } catch (err) {
      console.error('[TASKS] byCase error:', err)
      res.status(500).json({ error: 'فشل جلب المهام' })
    }
  }
)

// GET /api/tasks/pending
tasksRouter.get(
  '/pending',
  requirePermission('view_tasks'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const result = await query(
        "SELECT tasks_v2.*, cases.case_number, clients.name as client_name FROM tasks_v2 LEFT JOIN cases ON tasks_v2.case_id = cases.id LEFT JOIN clients ON tasks_v2.client_id = clients.id WHERE tasks_v2.company_id = $1 AND tasks_v2.status = 'pending' AND tasks_v2.is_archived = FALSE ORDER BY tasks_v2.priority DESC, tasks_v2.due_date ASC NULLS LAST",
        [companyId]
      )
      res.json({ data: result.rows })
    } catch (err) {
      console.error('[TASKS] pending error:', err)
      res.status(500).json({ error: 'فشل جلب المهام المعلقة' })
    }
  }
)

// POST /api/tasks/:id/transition
tasksRouter.post(
  '/:id/transition',
  requirePermission('edit_tasks'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const userId = req.auth!.userId
      const { id } = req.params
      const { status, note } = req.body

      if (!status) {
        res.status(400).json({ error: 'الحالة مطلوبة' })
        return
      }

      const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled', 'closed']
      if (!validStatuses.includes(status)) {
        res
          .status(400)
          .json({ error: `حالة غير صالحة. يجب أن تكون أحد: ${validStatuses.join(', ')}` })
        return
      }

      const taskRes = await query('SELECT * FROM tasks_v2 WHERE id = $1 AND company_id = $2', [
        id,
        companyId
      ])
      if (taskRes.rows.length === 0) {
        res.status(404).json({ error: 'المهمة غير موجودة' })
        return
      }

      const before = taskRes.rows[0]

      const updateFields: string[] = [
        'status = $1',
        'status_changed_at = NOW()',
        'updated_at = NOW()'
      ]
      const updateParams: any[] = [status]

      if (status === 'completed') {
        updateFields.push('completed_at = NOW()')
      }
      if (status === 'cancelled') {
        updateFields.push('cancelled_at = NOW()', 'cancelled_by = $2', 'cancel_reason = $3')
        updateParams.push(userId, note || null)
      }
      if (status === 'closed') {
        updateFields.push('closed_at = NOW()', 'closed_by = $2', 'closure_note = $3')
        updateParams.push(userId, note || null)
      }
      if (status === 'in_progress') {
        updateFields.push('started_at = COALESCE(started_at, NOW())')
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
        [
          uuidv4(),
          companyId,
          id,
          `TRANSITION_TO_${status}`,
          userId,
          JSON.stringify({ status: before.status }),
          JSON.stringify({ status })
        ]
      )

      res.json({ success: true })
    } catch (err) {
      console.error('[TASKS] transition error:', err)
      res.status(500).json({ error: 'فشل تغيير حالة المهمة' })
    }
  }
)

// POST /api/tasks/:id/close
tasksRouter.post(
  '/:id/close',
  requirePermission('close_tasks'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const userId = req.auth!.userId
      const { id } = req.params
      const { note } = req.body

      const taskRes = await query('SELECT * FROM tasks_v2 WHERE id = $1 AND company_id = $2', [
        id,
        companyId
      ])
      if (taskRes.rows.length === 0) {
        res.status(404).json({ error: 'المهمة غير موجودة' })
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
        [
          uuidv4(),
          companyId,
          id,
          'CLOSED',
          userId,
          JSON.stringify({ status: before.status }),
          JSON.stringify({ status: 'closed' })
        ]
      )

      res.json({ success: true })
    } catch (err) {
      console.error('[TASKS] close error:', err)
      res.status(500).json({ error: 'فشل إغلاق المهمة' })
    }
  }
)

// POST /api/tasks/:id/cancel
tasksRouter.post(
  '/:id/cancel',
  requirePermission('cancel_tasks'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const userId = req.auth!.userId
      const { id } = req.params
      const { reason } = req.body

      const taskRes = await query('SELECT * FROM tasks_v2 WHERE id = $1 AND company_id = $2', [
        id,
        companyId
      ])
      if (taskRes.rows.length === 0) {
        res.status(404).json({ error: 'المهمة غير موجودة' })
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
        [
          uuidv4(),
          companyId,
          id,
          'CANCELLED',
          userId,
          JSON.stringify({ status: before.status }),
          JSON.stringify({ status: 'cancelled' })
        ]
      )

      res.json({ success: true })
    } catch (err) {
      console.error('[TASKS] cancel error:', err)
      res.status(500).json({ error: 'فشل إلغاء المهمة' })
    }
  }
)

// GET /api/tasks/:taskId/audit/count
tasksRouter.get(
  '/:taskId/audit/count',
  requirePermission('view_task_audit'),
  async (req: Request, res: Response) => {
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
      res.status(500).json({ error: 'فشل عد سجلات التدقيق' })
    }
  }
)

// GET /api/tasks/:taskId/audit
tasksRouter.get(
  '/:taskId/audit',
  requirePermission('view_task_audit'),
  async (req: Request, res: Response) => {
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
      res.status(500).json({ error: 'فشل جلب سجلات التدقيق' })
    }
  }
)
