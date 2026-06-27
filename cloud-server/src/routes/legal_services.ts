import { Router } from 'express'
import { query } from '../db/connection'

const router = Router()

// Metadata Routes
router.get('/categories', async (req: any, res) => {
  try {
    const result = await query('SELECT * FROM legal_service_categories ORDER BY name_ar')
    res.json(result.rows)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/types', async (req: any, res) => {
  try {
    const result = await query('SELECT * FROM legal_service_types ORDER BY name_ar')
    res.json(result.rows)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/statuses', async (req: any, res) => {
  try {
    const result = await query('SELECT * FROM legal_service_statuses')
    res.json(result.rows)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/priorities', async (req: any, res) => {
  try {
    const result = await query('SELECT * FROM legal_service_priorities')
    res.json(result.rows)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Main Engagements Routes
router.get('/engagements/count', async (req: any, res) => {
  try {
    const { companyId } = req.user
    const { q, category_id, status_id } = req.query
    
    let sql = 'SELECT COUNT(*) as total FROM legal_engagements WHERE company_id = $1 AND deleted_at IS NULL'
    const params: any[] = [companyId]

    if (q && q !== 'null') {
      params.push(`%${q}%`)
      sql += ` AND (engagement_number ILIKE $${params.length} OR description ILIKE $${params.length} OR title ILIKE $${params.length})`
    }
    if (category_id && category_id !== 'الكل') {
      params.push(category_id)
      sql += ` AND category_id = $${params.length}`
    }
    if (status_id && status_id !== 'الكل') {
      params.push(status_id)
      sql += ` AND status_id = $${params.length}`
    }

    const result = await query(sql, params)
    res.json(parseInt(result.rows[0].total))
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/engagements', async (req: any, res) => {
  try {
    const { companyId } = req.user
    const { page = 1, pageSize = 25, q, category_id, status_id } = req.query
    
    let sql = `
      SELECT 
        e.*,
        c.name_ar as category_name,
        t.name_ar as service_type_name,
        s.status_name_ar as status_name,
        p.priority_name_ar as priority_name,
        cl.name as client_name,
        u.full_name as responsible_name
      FROM legal_engagements e
      LEFT JOIN legal_service_categories c ON e.category_id = c.id
      LEFT JOIN legal_service_types t ON e.engagement_type_id = t.id
      LEFT JOIN legal_service_statuses s ON e.status_id = s.id
      LEFT JOIN legal_service_priorities p ON e.priority_id = p.id
      LEFT JOIN clients cl ON e.client_id = cl.id
      LEFT JOIN users u ON e.responsible_lawyer_id = u.id
      WHERE e.company_id = $1 AND e.deleted_at IS NULL
    `
    const params: any[] = [companyId]

    if (q && q !== 'null') {
      params.push(`%${q}%`)
      sql += ` AND (e.engagement_number ILIKE $${params.length} OR e.description ILIKE $${params.length})`
    }
    if (category_id && category_id !== 'الكل') {
      params.push(category_id)
      sql += ` AND e.category_id = $${params.length}`
    }
    if (status_id && status_id !== 'الكل') {
      params.push(status_id)
      sql += ` AND e.status_id = $${params.length}`
    }

    sql += ' ORDER BY e.created_at DESC'
    
    const offset = (Number(page) - 1) * Number(pageSize)
    params.push(Number(pageSize), offset)
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`

    const result = await query(sql, params)
    res.json(result.rows)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/engagements', async (req: any, res) => {
  try {
    const { companyId, userId } = req.user
    const data = req.body
    
    // Generate engagement number
    const countRes = await query('SELECT COUNT(*) FROM legal_engagements WHERE company_id = $1', [companyId])
    const count = parseInt(countRes.rows[0].count) + 1
    const engagement_number = `LEG-${new Date().getFullYear()}-${count.toString().padStart(4, '0')}`

    const id = data.id || undefined

    const result = await query(`
      INSERT INTO legal_engagements (
        company_id, engagement_number, engagement_type_id, category_id,
        client_id, beneficiary, linked_parties, responsible_lawyer_id,
        assistant_team, description, purpose, start_date, expected_end_date,
        completion_date, status_id, priority_id, financial_compensation,
        tax, paid_amount, remaining_amount, payment_method, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
      ) RETURNING id
    `, [
      companyId, engagement_number, data.engagement_type_id, data.category_id,
      data.client_id || null, data.beneficiary || null, JSON.stringify(data.linked_parties || []), data.responsible_lawyer_id || null,
      JSON.stringify(data.assistant_team || []), data.description || null, data.purpose || null, data.start_date || null, data.expected_end_date || null,
      data.completion_date || null, data.status_id, data.priority_id, data.financial_compensation || 0,
      data.tax || 0, data.paid_amount || 0, data.remaining_amount || 0, data.payment_method || null,
      userId, userId
    ])

    res.json({ id: result.rows[0].id })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/engagements/:id', async (req: any, res) => {
  try {
    const { companyId, userId } = req.user
    const { id } = req.params
    const data = req.body

    await query(`
      UPDATE legal_engagements SET
        engagement_type_id = COALESCE($1, engagement_type_id),
        category_id = COALESCE($2, category_id),
        client_id = COALESCE($3, client_id),
        beneficiary = COALESCE($4, beneficiary),
        linked_parties = COALESCE($5, linked_parties),
        responsible_lawyer_id = COALESCE($6, responsible_lawyer_id),
        assistant_team = COALESCE($7, assistant_team),
        description = COALESCE($8, description),
        purpose = COALESCE($9, purpose),
        start_date = COALESCE($10, start_date),
        expected_end_date = COALESCE($11, expected_end_date),
        completion_date = COALESCE($12, completion_date),
        status_id = COALESCE($13, status_id),
        priority_id = COALESCE($14, priority_id),
        financial_compensation = COALESCE($15, financial_compensation),
        tax = COALESCE($16, tax),
        paid_amount = COALESCE($17, paid_amount),
        remaining_amount = COALESCE($18, remaining_amount),
        payment_method = COALESCE($19, payment_method),
        updated_by = $20,
        updated_at = NOW()
      WHERE id = $21 AND company_id = $22
    `, [
      data.engagement_type_id, data.category_id, data.client_id || null, data.beneficiary || null,
      data.linked_parties ? JSON.stringify(data.linked_parties) : null, data.responsible_lawyer_id || null, 
      data.assistant_team ? JSON.stringify(data.assistant_team) : null, data.description || null,
      data.purpose || null, data.start_date || null, data.expected_end_date || null, data.completion_date || null,
      data.status_id, data.priority_id, data.financial_compensation || 0, data.tax || 0,
      data.paid_amount || 0, data.remaining_amount || 0, data.payment_method || null, userId, id, companyId
    ])

    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/engagements/:id', async (req: any, res) => {
  try {
    const { companyId, userId } = req.user
    const { id } = req.params
    
    await query(`
      UPDATE legal_engagements 
      SET deleted_at = NOW(), deleted_by = $1 
      WHERE id = $2 AND company_id = $3
    `, [userId, id, companyId])

    res.json({ success: true })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

export default router
