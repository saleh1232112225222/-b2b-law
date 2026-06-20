import { Router, Request, Response } from 'express'
import { query, getClient } from '../db/connection'
import { authMiddleware } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { getCompanyId, getUserId } from '../middleware/tenant'
import { v4 as uuidv4 } from 'uuid'
import * as caseService from '../services/case.service'

export const casesRouter = Router()

casesRouter.get('/analytics/dashboard', authMiddleware, requirePermission('view_cases'), async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const data = await caseService.getDashboardAnalytics(companyId)
    res.json(data)
  } catch (err) {
    console.error('[CASES] Dashboard analytics error:', err)
    res.status(500).json({ error: 'Failed to load analytics' })
  }
})

// 2. Check Case Number Uniqueness
casesRouter.get('/is-unique', authMiddleware, requirePermission('view_cases'), async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const { caseNumber, ignoreId } = req.query
    
    let result
    if (ignoreId) {
      result = await query(
        'SELECT COUNT(*) as count FROM cases WHERE case_number = $1 AND id != $2 AND company_id = $3',
        [caseNumber, ignoreId, companyId]
      )
    } else {
      result = await query(
        'SELECT COUNT(*) as count FROM cases WHERE case_number = $1 AND company_id = $2',
        [caseNumber, companyId]
      )
    }
    
    res.json(parseInt(result.rows[0].count) === 0)
  } catch (err) {
    console.error('[Cases] Check uniqueness error:', err)
    res.status(500).json({ error: 'Failed to check uniqueness' })
  }
})

// 3. Get Cases by Client ID
casesRouter.get('/by-client/:clientId', authMiddleware, requirePermission('view_cases'), async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const result = await query(
      `SELECT c.*, cl.name as client_name, COALESCE(u.full_name, u.username) as responsible_name
       FROM cases c
       LEFT JOIN clients cl ON c.client_id = cl.id
       LEFT JOIN users u ON c.responsible_user_id = u.id
       WHERE c.client_id = $1 AND c.company_id = $2
       ORDER BY c.created_at DESC`,
      [req.params.clientId, companyId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('[Cases] Get by client error:', err)
    res.status(500).json({ error: 'Failed to get cases' })
  }
})

// 4. List Case Assignments
casesRouter.get('/:id/assignments', authMiddleware, requirePermission('view_cases'), async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const result = await query(
      `SELECT al.*, COALESCE(u.full_name, u.username) as employee_name, u.role_key as employee_role
       FROM assignment_logs al
       JOIN users u ON al.employee_id = u.id
       WHERE al.case_id = $1 AND al.company_id = $2
       ORDER BY al.created_at DESC`,
      [req.params.id, companyId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('[Cases] Get assignments error:', err)
    res.status(500).json({ error: 'Failed to get case assignments' })
  }
})

// 5. Assign Employee
casesRouter.post('/:id/assignments', authMiddleware, requirePermission('create_cases'), async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const caseId = req.params.id
    const { employeeId, role, notes } = req.body
    const id = uuidv4()
    
    await query(
      `INSERT INTO assignment_logs (id, company_id, case_id, employee_id, role, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [id, companyId, caseId, employeeId, role, notes || '']
    )
    res.json(id)
  } catch (err) {
    console.error('[Cases] Assign employee error:', err)
    res.status(500).json({ error: 'Failed to assign employee' })
  }
})

// 6. Remove Employee Assignment
casesRouter.delete('/:id/assignments/:employeeId', authMiddleware, requirePermission('edit_cases'), async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    await query(
      `DELETE FROM assignment_logs WHERE case_id = $1 AND employee_id = $2 AND company_id = $3`,
      [req.params.id, req.params.employeeId, companyId]
    )
    res.json({ success: true })
  } catch (err) {
    console.error('[Cases] Remove assignment error:', err)
    res.status(500).json({ error: 'Failed to remove assignment' })
  }
})

// 7. Get Count of Cases
casesRouter.get('/count', authMiddleware, requirePermission('view_cases'), async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const { q, status, priority, responsible_user_id } = req.query
    
    let whereClause = 'WHERE company_id = $1'
    const params: any[] = [companyId]
    let paramIndex = 2
    
    if (status && status !== 'الكل') {
      whereClause += ` AND status = $${paramIndex++}`
      params.push(status)
    }
    if (priority && priority !== 'الكل') {
      whereClause += ` AND priority = $${paramIndex++}`
      params.push(priority)
    }
    if (responsible_user_id) {
      whereClause += ` AND responsible_user_id = $${paramIndex++}`
      params.push(responsible_user_id)
    }
    if (q) {
      whereClause += ` AND (case_number LIKE $${paramIndex} OR subject LIKE $${paramIndex} OR opponent_name LIKE $${paramIndex})`
      params.push(`%${q}%`)
      paramIndex++
    }
    
    const result = await query(`SELECT COUNT(*) FROM cases ${whereClause}`, params)
    res.json({ count: parseInt(result.rows[0].count) })
  } catch (err) {
    console.error('[Cases] Count error:', err)
    res.status(500).json({ error: 'Failed to count cases' })
  }
})

// 8. Search Cases
casesRouter.get('/search', authMiddleware, requirePermission('view_cases'), async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const q = req.query.q as string
    if (!q) {
      res.status(400).json({ error: 'Query required' })
      return
    }
    
    const result = await query(
      `SELECT c.*, cl.name as client_name 
       FROM cases c
       LEFT JOIN clients cl ON c.client_id = cl.id
       WHERE c.company_id = $1 AND (c.case_number ILIKE $2 OR c.subject ILIKE $2 OR cl.name ILIKE $2)
       LIMIT 20`,
      [companyId, `%${q}%`]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('[Cases] Search error:', err)
    res.status(500).json({ error: 'Search failed' })
  }
})

// 9. Get Case by ID (with parties)
casesRouter.get('/:id', authMiddleware, requirePermission('view_cases'), async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const result = await query(
      `SELECT c.*, cl.name as client_name, COALESCE(u.full_name, u.username) as responsible_name
       FROM cases c
       LEFT JOIN clients cl ON c.client_id = cl.id
       LEFT JOIN users u ON c.responsible_user_id = u.id
       WHERE c.id = $1 AND c.company_id = $2`,
      [req.params.id, companyId]
    )
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Case not found' })
      return
    }
    
    const caseData = result.rows[0]
    
    // Fetch parties
    const partiesRes = await query(
      `SELECT cp.*, cl.name as client_linked_name, d.name as defendant_linked_name
       FROM case_parties cp
       LEFT JOIN clients cl ON cp.client_id = cl.id
       LEFT JOIN defendants d ON cp.defendant_id = d.id
       WHERE cp.case_id = $1 AND cp.company_id = $2`,
      [req.params.id, companyId]
    )
    caseData.parties = partiesRes.rows
    
    res.json(caseData)
  } catch (err) {
    console.error('[Cases] GetById error:', err)
    res.status(500).json({ error: 'Failed to get case' })
  }
})

// 10. Get All Cases (non-paginated)
casesRouter.get('/all', authMiddleware, requirePermission('view_cases'), async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const result = await query(
      `SELECT c.*, cl.name as client_name, COALESCE(u.full_name, u.username) as responsible_name
       FROM cases c
       LEFT JOIN clients cl ON c.client_id = cl.id
       LEFT JOIN users u ON c.responsible_user_id = u.id
       WHERE c.company_id = $1 AND c.is_archived = FALSE
       ORDER BY c.created_at DESC`,
      [companyId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('[Cases] GetAll error:', err)
    res.status(500).json({ error: 'Failed to get all cases' })
  }
})

// 10. List Cases (paginated)
casesRouter.get('/', authMiddleware, requirePermission('view_cases'), async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const { page = '1', pageSize = '25', q, status, priority, responsible_user_id } = req.query
    const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string)
    const limit = parseInt(pageSize as string)
    
    let whereClause = 'WHERE c.company_id = $1'
    const params: any[] = [companyId]
    let paramIndex = 2
    
    if (status && status !== 'الكل') {
      whereClause += ` AND c.status = $${paramIndex++}`
      params.push(status)
    }
    if (priority && priority !== 'الكل') {
      whereClause += ` AND c.priority = $${paramIndex++}`
      params.push(priority)
    }
    if (responsible_user_id) {
      whereClause += ` AND c.responsible_user_id = $${paramIndex++}`
      params.push(responsible_user_id)
    }
    if (q) {
      whereClause += ` AND (c.case_number ILIKE $${paramIndex} OR c.subject ILIKE $${paramIndex} OR c.opponent_name ILIKE $${paramIndex})`
      params.push(`%${q}%`)
      paramIndex++
    }
    
    const countRes = await query(
      `SELECT COUNT(*) FROM cases c ${whereClause}`,
      params
    )
    
    const dataRes = await query(
      `SELECT c.*, cl.name as client_name, COALESCE(u.full_name, u.username) as responsible_name
       FROM cases c
       LEFT JOIN clients cl ON c.client_id = cl.id
       LEFT JOIN users u ON c.responsible_user_id = u.id
       ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    )
    
    const caseList = dataRes.rows
    for (const c of caseList) {
      const parties = await query(
        `SELECT cp.*, cl.name as client_linked_name, d.name as defendant_linked_name
         FROM case_parties cp
         LEFT JOIN clients cl ON cp.client_id = cl.id
         LEFT JOIN defendants d ON cp.defendant_id = d.id
         WHERE cp.case_id = $1 AND cp.company_id = $2`,
        [c.id, companyId]
      )
      c.parties = parties.rows
    }
    
    res.json({
      data: caseList,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page as string),
      pageSize: limit
    })
  } catch (err) {
    console.error('[Cases] List error:', err)
    res.status(500).json({ error: 'Failed to list cases' })
  }
})

// 11. Create Case (with Transaction)
casesRouter.post('/', authMiddleware, requirePermission('create_cases'), async (req: Request, res: Response) => {
  const client = await getClient()
  try {
    const companyId = getCompanyId(req)
    const caseData = req.body
    
    const id = uuidv4()
    
    const allowedFields = [
      'case_number', 'client_id', 'responsible_user_id', 'case_type',
      'main_classification', 'sub_classification', 'subject', 'court',
      'circuit', 'opponent_name', 'opponent_id', 'opponent_nationality',
      'opponent_city', 'opponent_phone', 'opponent_address', 'opponent_email',
      'registration_date', 'registration_date_hijri', 'contract_date',
      'contract_amount', 'client_role', 'assessment', 'client_requirement',
      'plaintiff_requests', 'phase', 'status', 'priority', 'folder_link',
      'najiz_url', 'notes'
    ]
    
    const keys = ['id', 'company_id']
    const values: any[] = [id, companyId]
    
    for (const f of allowedFields) {
      if (caseData[f] !== undefined) {
        keys.push(f)
        values.push(caseData[f] === '' ? null : caseData[f])
      }
    }
    
    const columns = keys.join(', ')
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ')
    
    await client.query('BEGIN')
    
    await client.query(
      `INSERT INTO cases (${columns}) VALUES (${placeholders})`,
      values
    )
    
    // Insert parties
    if (caseData.parties && caseData.parties.length > 0) {
      for (const p of caseData.parties) {
        await client.query(
          `INSERT INTO case_parties (
            id, company_id, case_id, party_type, client_id, defendant_id, name, id_number, 
            phone, nationality, city, address, email, role, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())`,
          [
            uuidv4(),
            companyId,
            id,
            p.party_type,
            p.client_id || null,
            p.defendant_id || null,
            p.name || null,
            p.id_number || null,
            p.phone || null,
            p.nationality || null,
            p.city || null,
            p.address || null,
            p.email || null,
            p.role || null
          ]
        )
      }
    }
    
    await client.query('COMMIT')
    res.status(201).json(id)
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[Cases] Create error:', err)
    res.status(500).json({ error: 'Failed to create case' })
  } finally {
    client.release()
  }
})

// 12. Update Case (with Transaction)
casesRouter.put('/:id', authMiddleware, requirePermission('edit_cases'), async (req: Request, res: Response) => {
  const client = await getClient()
  try {
    const companyId = getCompanyId(req)
    const id = req.params.id
    const caseData = req.body
    
    const allowedFields = [
      'case_number', 'client_id', 'responsible_user_id', 'case_type',
      'main_classification', 'sub_classification', 'subject', 'court',
      'circuit', 'opponent_name', 'opponent_id', 'opponent_nationality',
      'opponent_city', 'opponent_phone', 'opponent_address', 'opponent_email',
      'registration_date', 'registration_date_hijri', 'contract_date',
      'contract_amount', 'client_role', 'assessment', 'client_requirement',
      'plaintiff_requests', 'phase', 'status', 'priority', 'folder_link',
      'najiz_url', 'notes', 'is_archived', 'archived_at', 'archived_by', 'archive_reason'
    ]
    
    const sets: string[] = []
    const values: any[] = [id, companyId]
    let valIndex = 3
    
    for (const f of allowedFields) {
      if (caseData[f] !== undefined) {
        sets.push(`${f} = $${valIndex++}`)
        values.push(caseData[f] === '' ? null : caseData[f])
      }
    }
    
    await client.query('BEGIN')
    
    if (sets.length > 0) {
      await client.query(
        `UPDATE cases SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $1 AND company_id = $2`,
        values
      )
    }
    
    // Update parties if provided
    if (caseData.parties !== undefined) {
      await client.query('DELETE FROM case_parties WHERE case_id = $1 AND company_id = $2', [id, companyId])
      for (const p of caseData.parties) {
        await client.query(
          `INSERT INTO case_parties (
            id, company_id, case_id, party_type, client_id, defendant_id, name, id_number, 
            phone, nationality, city, address, email, role, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())`,
          [
            uuidv4(),
            companyId,
            id,
            p.party_type,
            p.client_id || null,
            p.defendant_id || null,
            p.name || null,
            p.id_number || null,
            p.phone || null,
            p.nationality || null,
            p.city || null,
            p.address || null,
            p.email || null,
            p.role || null
          ]
        )
      }
    }
    
    await client.query('COMMIT')
    res.json({ success: true })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[Cases] Update error:', err)
    res.status(500).json({ error: 'Failed to update case' })
  } finally {
    client.release()
  }
})

// 13. Delete Case
casesRouter.delete('/:id', authMiddleware, requirePermission('edit_cases'), async (req: Request, res: Response) => {
  const client = await getClient()
  try {
    const companyId = getCompanyId(req)
    const id = req.params.id
    
    await client.query('BEGIN')
    
    // Manual cascades to replicate SQLite cleanup
    await client.query('DELETE FROM session_outcomes WHERE session_id IN (SELECT id FROM sessions WHERE case_id = $1) AND company_id = $2', [id, companyId])
    await client.query('DELETE FROM sessions WHERE case_id = $1 AND company_id = $2', [id, companyId])
    await client.query('DELETE FROM tasks_v2 WHERE case_id = $1 AND company_id = $2', [id, companyId])
    await client.query('DELETE FROM judgments WHERE case_id = $1 AND company_id = $2', [id, companyId])
    await client.query('DELETE FROM case_parties WHERE case_id = $1 AND company_id = $2', [id, companyId])
    await client.query('DELETE FROM case_actions WHERE case_id = $1 AND company_id = $2', [id, companyId])
    await client.query('DELETE FROM memoranda WHERE case_id = $1 AND company_id = $2', [id, companyId])
    await client.query('DELETE FROM assignment_logs WHERE case_id = $1 AND company_id = $2', [id, companyId])
    
    const result = await client.query('DELETE FROM cases WHERE id = $1 AND company_id = $2', [id, companyId])
    
    if (result.rowCount === 0) {
      await client.query('ROLLBACK')
      res.status(404).json({ error: 'Case not found' })
      return
    }
    
    await client.query('COMMIT')
    res.json({ success: true })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[Cases] Delete error:', err)
    res.status(500).json({ error: 'Failed to delete case' })
  } finally {
    client.release()
  }
})
