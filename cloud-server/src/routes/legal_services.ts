import { Router } from 'express'
import { query } from '../db/connection'
import { authMiddleware } from '../middleware/auth'

const router = Router()
router.use(authMiddleware)

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
    const { companyId } = req.auth
    const { q, category_id, status_id } = req.query
    
    let sql = 'SELECT COUNT(*) as total FROM legal_engagements WHERE company_id = $1 AND deleted_at IS NULL'
    const params: any[] = [companyId]

    if (q && q !== 'null') {
      params.push(`%${q}%`)
      sql += ` AND (engagement_number ILIKE $${params.length} OR description ILIKE $${params.length} OR service_type ILIKE $${params.length})`
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
    const { companyId } = req.auth
    const { page = 1, pageSize = 25, q, category_id, status_id } = req.query
    
      let sql = `
        SELECT 
          e.*,
          c.name_ar as category_name,
          t.name_ar as service_type_name,
          s.status_name_ar as status_name,
          p.priority_name_ar as priority_name,
          cl.name as client_name,
          emp.name as responsible_name
        FROM legal_engagements e
        LEFT JOIN legal_service_categories c ON e.category_id = c.id
        LEFT JOIN legal_service_types t ON e.engagement_type_id = t.id
        LEFT JOIN legal_service_statuses s ON e.status_id = s.id
        LEFT JOIN legal_service_priorities p ON e.priority_id = p.id
        LEFT JOIN clients cl ON e.client_id = cl.id
        LEFT JOIN employees emp ON e.responsible_lawyer_id = emp.id
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
    if (req.query.case_id) {
      params.push(req.query.case_id)
      sql += ` AND e.case_id = $${params.length}`
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

// Helper: resolve responsible_lawyer_id - accepts employee_id or user_id
async function resolveLawyerId(value: string | null | undefined, companyId: string): Promise<string | null> {
  if (!value || value === '') return null
  
  // Check if it's a valid employee_id
  const empRes = await query('SELECT id FROM employees WHERE id = $1 AND company_id = $2', [value, companyId])
  if (empRes.rows.length > 0) return empRes.rows[0].id
  
  // Check if it's a user_id and get the employee_id
  const userRes = await query('SELECT employee_id FROM users WHERE id = $1 AND company_id = $2', [value, companyId])
  if (userRes.rows.length > 0 && userRes.rows[0].employee_id) return userRes.rows[0].employee_id
  
  // If neither found, return null
  return null
}

router.post('/engagements', async (req: any, res) => {
  try {
    const { companyId, userId } = req.auth
    const data = req.body
    
    // Generate engagement number
    const countRes = await query('SELECT COUNT(*) FROM legal_engagements WHERE company_id = $1', [companyId])
    const count = parseInt(countRes.rows[0].count) + 1
    const engagement_number = `LEG-${new Date().getFullYear()}-${count.toString().padStart(4, '0')}`

    const id = data.id || undefined

    // Resolve responsible_lawyer_id
    const resolvedLawyerId = await resolveLawyerId(data.responsible_lawyer_id, companyId)

    // Calculate remaining_amount
    const financial_compensation = Number(data.financial_compensation || 0)
    const tax = Number(data.tax || 0)
    const paid_amount = Number(data.paid_amount || 0)
    const remaining_amount = (financial_compensation + tax) - paid_amount

    // Handle linked_parties - accept both string and array
    let linkedPartiesValue: string
    if (Array.isArray(data.linked_parties)) {
      linkedPartiesValue = JSON.stringify(data.linked_parties)
    } else if (data.linked_parties && typeof data.linked_parties === 'string') {
      linkedPartiesValue = data.linked_parties
    } else {
      linkedPartiesValue = '[]'
    }

    // Handle assistant_team - accept both string and array
    let assistantTeamValue: string
    if (Array.isArray(data.assistant_team)) {
      assistantTeamValue = JSON.stringify(data.assistant_team)
    } else if (data.assistant_team && typeof data.assistant_team === 'string') {
      assistantTeamValue = data.assistant_team
    } else {
      assistantTeamValue = '[]'
    }

    const result = await query(`
      INSERT INTO legal_engagements (
        company_id, engagement_number, engagement_type_id, category_id,
        client_id, beneficiary, linked_parties, responsible_lawyer_id,
        assistant_team, description, purpose, start_date, expected_end_date,
        completion_date, status_id, priority_id, financial_compensation,
        tax, paid_amount, remaining_amount, payment_method, contract_id, case_id, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
      ) RETURNING id
    `, [
      companyId, engagement_number, data.engagement_type_id, data.category_id,
      data.client_id || null, data.beneficiary || null, linkedPartiesValue, resolvedLawyerId,
      assistantTeamValue, data.description || null, data.purpose || null, data.start_date || null, data.expected_end_date || null,
      data.completion_date || null, data.status_id, data.priority_id, financial_compensation,
      tax, paid_amount, remaining_amount, data.payment_method || null,
      data.contract_id || null, data.case_id || null,
      userId, userId
    ])

    const newId = result.rows[0].id

    // Auto-create finance entry if financial_compensation > 0
    if (financial_compensation > 0) {
      const finId = await query('SELECT gen_random_uuid() as id')
      const financeId = finId.rows[0].id
      const total = financial_compensation + tax
      await query(`
        INSERT INTO finances (id, company_id, type, category, amount, vat_amount, total,
          description, date, legal_engagement_id, client_id, case_id, status, payment_method, paid_amount, remaining_amount, created_by)
        VALUES ($1, $2, 'receivable', 'legal_service', $3, $4, $5, $6, CURRENT_DATE, $7, $8, $9, 'pending', $10, $11, $12, $13)
      `, [
        financeId, companyId, financial_compensation, tax, total,
        `خدمة قانونية رقم ${engagement_number}`, newId,
        data.client_id || null, data.case_id || null, data.payment_method || null,
        paid_amount, remaining_amount, userId
      ])
    }

    res.json({ id: newId })
  } catch (err: any) {
    console.error('[legal_services] POST /engagements error:', err.message, err.stack)
    res.status(500).json({ error: err.message })
  }
})

router.put('/engagements/:id', async (req: any, res) => {
  try {
    const { companyId, userId } = req.auth
    const { id } = req.params
    const data = req.body

    // Resolve responsible_lawyer_id
    const resolvedLawyerId = await resolveLawyerId(data.responsible_lawyer_id, companyId)

    // Calculate remaining_amount
    const financial_compensation = Number(data.financial_compensation || 0)
    const tax = Number(data.tax || 0)
    const paid_amount = Number(data.paid_amount || 0)
    const remaining_amount = (financial_compensation + tax) - paid_amount

    // Handle linked_parties - accept both string and array
    let linkedPartiesValue: string | null
    if (data.linked_parties === undefined || data.linked_parties === null) {
      linkedPartiesValue = null
    } else if (Array.isArray(data.linked_parties)) {
      linkedPartiesValue = JSON.stringify(data.linked_parties)
    } else {
      linkedPartiesValue = String(data.linked_parties)
    }

    // Handle assistant_team - accept both string and array
    let assistantTeamValue: string | null
    if (data.assistant_team === undefined || data.assistant_team === null) {
      assistantTeamValue = null
    } else if (Array.isArray(data.assistant_team)) {
      assistantTeamValue = JSON.stringify(data.assistant_team)
    } else {
      assistantTeamValue = String(data.assistant_team)
    }

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
        remaining_amount = $18,
        payment_method = COALESCE($19, payment_method),
        contract_id = COALESCE($20, contract_id),
        case_id = COALESCE($21, case_id),
        updated_by = $22,
        updated_at = NOW()
      WHERE id = $23 AND company_id = $24
    `, [
      data.engagement_type_id, data.category_id, data.client_id || null, data.beneficiary || null,
      linkedPartiesValue, resolvedLawyerId, 
      assistantTeamValue, data.description || null,
      data.purpose || null, data.start_date || null, data.expected_end_date || null, data.completion_date || null,
      data.status_id, data.priority_id, financial_compensation, tax,
      paid_amount, remaining_amount, data.payment_method || null,
      data.contract_id || null, data.case_id || null,
      userId, id, companyId
    ])

    // Update finance entry if exists
    if (financial_compensation > 0) {
      const total = financial_compensation + tax
      let financeStatus = 'pending'
      if (paid_amount >= total) financeStatus = 'paid'
      else if (paid_amount > 0) financeStatus = 'partially_paid'

      const updateResult = await query(`
        UPDATE finances SET
          amount = $1, vat_amount = $2, total = $3, paid_amount = $4,
          remaining_amount = $5, payment_method = COALESCE($6, payment_method),
          status = $7
        WHERE legal_engagement_id = $8 AND company_id = $9
        RETURNING id
      `, [financial_compensation, tax, total, paid_amount, remaining_amount, data.payment_method || null, financeStatus, id, companyId])

      // If no finance record exists yet, create one
      if (updateResult.rows.length === 0) {
        const finId = await query('SELECT gen_random_uuid() as id')
        const financeId = finId.rows[0].id
        await query(`
          INSERT INTO finances (id, company_id, type, category, amount, vat_amount, total,
            description, date, legal_engagement_id, client_id, case_id, status, payment_method, paid_amount, remaining_amount, created_by)
          VALUES ($1, $2, 'receivable', 'legal_service', $3, $4, $5, $6, CURRENT_DATE, $7, $8, $9, 'pending', $10, $11, $12, $13)
        `, [
          financeId, companyId, financial_compensation, tax, total,
          `خدمة قانونية رقم ${id}`, id,
          data.client_id || null, data.case_id || null, data.payment_method || null,
          paid_amount, remaining_amount, userId
        ])
      }
    }

    res.json({ success: true })
  } catch (err: any) {
    console.error('[legal_services] PUT /engagements/:id error:', err.message, err.stack)
    res.status(500).json({ error: err.message })
  }
})

router.delete('/engagements/:id', async (req: any, res) => {
  try {
    const { companyId, userId } = req.auth
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

// Get Engagement by ID
router.get('/engagements/:id', async (req: any, res) => {
  try {
    const { companyId } = req.auth
    const { id } = req.params
    const result = await query(`
      SELECT 
        e.*,
        c.name_ar as category_name,
        t.name_ar as service_type_name,
        s.status_name_ar as status_name,
        p.priority_name_ar as priority_name,
        cl.name as client_name,
        emp.name as responsible_name
      FROM legal_engagements e
      LEFT JOIN legal_service_categories c ON e.category_id = c.id
      LEFT JOIN legal_service_types t ON e.engagement_type_id = t.id
      LEFT JOIN legal_service_statuses s ON e.status_id = s.id
      LEFT JOIN legal_service_priorities p ON e.priority_id = p.id
      LEFT JOIN clients cl ON e.client_id = cl.id
      LEFT JOIN employees emp ON e.responsible_lawyer_id = emp.id
      WHERE e.id = $1 AND e.company_id = $2 AND e.deleted_at IS NULL
    `, [id, companyId])
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'الارتباط القانوني غير موجود' })
      return
    }
    res.json(result.rows[0])
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Get Finance Record for Engagement
router.get('/engagements/:id/finance', async (req: any, res) => {
  try {
    const { companyId } = req.auth
    const { id } = req.params
    const result = await query(`
      SELECT *
      FROM finances
      WHERE legal_engagement_id = $1 AND company_id = $2
      LIMIT 1
    `, [id, companyId])
    res.json(result.rows[0] || null)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Get Engagement Notes
router.get('/engagements/:id/notes', async (req: any, res) => {
  try {
    const { id } = req.params
    const result = await query(`
      SELECT n.*, u.full_name as created_by 
      FROM legal_service_notes n
      LEFT JOIN users u ON n.created_by = u.id
      WHERE n.engagement_id = $1
      ORDER BY n.created_at DESC
    `, [id])
    res.json(result.rows)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Add Note
router.post('/engagements/:id/notes', async (req: any, res) => {
  try {
    const { userId } = req.auth
    const { id } = req.params
    const { noteText } = req.body
    
    const noteResult = await query(`
      INSERT INTO legal_service_notes (engagement_id, note_text, created_by)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [id, noteText, userId])

    // Add event to timeline
    await query(`
      INSERT INTO legal_service_timeline (engagement_id, event_title, event_description, created_by)
      VALUES ($1, 'إضافة ملاحظة', $2, $3)
    `, [id, noteText.substring(0, 100), userId])

    res.json(noteResult.rows[0])
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Get Engagement Attachments
router.get('/engagements/:id/attachments', async (req: any, res) => {
  try {
    const { id } = req.params
    const result = await query(`
      SELECT a.*, u.full_name as uploaded_by
      FROM legal_service_attachments a
      LEFT JOIN users u ON a.uploaded_by = u.id
      WHERE a.engagement_id = $1
      ORDER BY a.uploaded_at DESC
    `, [id])
    res.json(result.rows)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Add Attachment
router.post('/engagements/:id/attachments', async (req: any, res) => {
  try {
    const { userId } = req.auth
    const { id } = req.params
    const { fileName, filePath } = req.body
    
    const attachmentResult = await query(`
      INSERT INTO legal_service_attachments (engagement_id, file_name, file_path, uploaded_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [id, fileName, filePath, userId])

    // Add event to timeline
    await query(`
      INSERT INTO legal_service_timeline (engagement_id, event_title, event_description, created_by)
      VALUES ($1, 'إضافة مرفق', $2, $3)
    `, [id, fileName, userId])

    res.json(attachmentResult.rows[0])
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Get Timeline
router.get('/engagements/:id/timeline', async (req: any, res) => {
  try {
    const { id } = req.params
    const result = await query(`
      SELECT t.*, u.full_name as actor
      FROM legal_service_timeline t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.engagement_id = $1
      ORDER BY t.event_date DESC
    `, [id])
    res.json(result.rows)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Generate Invoice
router.post('/engagements/:id/invoice', async (req: any, res) => {
  try {
    const { companyId, userId } = req.auth
    const { id } = req.params

    // Fetch engagement info
    const engResult = await query(`
      SELECT e.*, c.name_ar as category_name, t.name_ar as service_type_name
      FROM legal_engagements e
      LEFT JOIN legal_service_categories c ON e.category_id = c.id
      LEFT JOIN legal_service_types t ON e.engagement_type_id = t.id
      WHERE e.id = $1 AND e.company_id = $2 AND e.deleted_at IS NULL
    `, [id, companyId])

    if (engResult.rows.length === 0) {
      res.status(404).json({ error: 'الارتباط القانوني غير موجود' })
      return
    }

    const eng = engResult.rows[0]
    if (eng.invoice_id) {
      res.status(400).json({ error: 'تم بالفعل إصدار فاتورة لهذا الارتباط' })
      return
    }

    // Generate invoice number
    const countRes = await query('SELECT COUNT(*) FROM invoices WHERE company_id = $1', [companyId])
    const count = parseInt(countRes.rows[0].count) + 1
    const invoice_number = `INV-${new Date().getFullYear()}-${count.toString().padStart(4, '0')}`

    const subtotal = Number(eng.financial_compensation || 0)
    const tax = Number(eng.tax || 0)
    const total = subtotal + tax
    const vat_rate = subtotal > 0 ? Number((tax / subtotal * 100).toFixed(2)) : 15.00

    const paid = Number(eng.paid_amount || 0)
    let status = 'unpaid'
    if (paid >= total) {
      status = 'paid'
    } else if (paid > 0) {
      status = 'partially_paid'
    }

    // Insert invoice
    const invInsert = await query(`
      INSERT INTO invoices (
        company_id, client_id, case_id, invoice_number, date,
        subtotal, tax_amount, vat_rate, total, status, notes, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `, [
      companyId, eng.client_id || null, eng.case_id || null, invoice_number,
      subtotal, tax, vat_rate, total, status,
      `فاتورة صادرة تلقائياً عن الخدمة القانونية رقم: ${eng.engagement_number}`,
      userId, userId
    ])

    const invoiceId = invInsert.rows[0].id

    // Insert invoice item
    await query(`
      INSERT INTO invoice_items (company_id, invoice_id, description, amount)
      VALUES ($1, $2, $3, $4)
    `, [
      companyId, invoiceId,
      `تقديم خدمة قانونية: ${eng.service_type_name} (تصنيف: ${eng.category_name})`,
      subtotal
    ])

    // Update engagement with invoice_id
    await query(`
      UPDATE legal_engagements
      SET invoice_id = $1
      WHERE id = $2
    `, [invoiceId, id])

    // Sync finance record status with invoice
    await query(`
      UPDATE finances
      SET status = $1, updated_at = NOW()
      WHERE legal_engagement_id = $2
    `, [status, id])

    // Add event to timeline
    await query(`
      INSERT INTO legal_service_timeline (engagement_id, event_title, event_description, created_by)
      VALUES ($1, 'إصدار فاتورة', $2, $3)
    `, [id, `تم إصدار الفاتورة رقم ${invoice_number}`, userId])

    res.json({ success: true, invoiceId })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Get Legal Services Summary for a Client
router.get('/client/:clientId/summary', async (req: any, res) => {
  try {
    const { companyId } = req.auth
    const { clientId } = req.params

    const result = await query(`
      SELECT 
        COUNT(*) as total_services,
        COUNT(*) FILTER (WHERE e.status_id = 'status_completed') as completed_count,
        COUNT(*) FILTER (WHERE e.status_id = 'status_in_progress') as in_progress_count,
        COUNT(*) FILTER (WHERE e.status_id = 'status_pending') as pending_count,
        COALESCE(SUM(e.financial_compensation), 0) as total_compensation,
        COALESCE(SUM(e.tax), 0) as total_tax,
        COALESCE(SUM(e.financial_compensation + e.tax), 0) as total_with_tax,
        COALESCE(SUM(e.paid_amount), 0) as total_paid,
        COALESCE(SUM(e.remaining_amount), 0) as total_remaining
      FROM legal_engagements e
      WHERE e.client_id = $1 AND e.company_id = $2 AND e.deleted_at IS NULL
    `, [clientId, companyId])

    const servicesResult = await query(`
      SELECT 
        e.id, e.engagement_number, e.financial_compensation, e.tax, 
        e.paid_amount, e.remaining_amount, e.status_id, e.start_date,
        c.name_ar as category_name,
        t.name_ar as service_type_name,
        s.status_name_ar as status_name,
        emp.name as responsible_name
      FROM legal_engagements e
      LEFT JOIN legal_service_categories c ON e.category_id = c.id
      LEFT JOIN legal_service_types t ON e.engagement_type_id = t.id
      LEFT JOIN legal_service_statuses s ON e.status_id = s.id
      LEFT JOIN employees emp ON e.responsible_lawyer_id = emp.id
      WHERE e.client_id = $1 AND e.company_id = $2 AND e.deleted_at IS NULL
      ORDER BY e.created_at DESC
    `, [clientId, companyId])

    res.json({
      summary: result.rows[0],
      services: servicesResult.rows
    })
  } catch (err: any) {
    console.error('[legal_services] GET /client/:clientId/summary error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

export default router
