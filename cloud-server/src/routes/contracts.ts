import { Router, Request, Response } from 'express'
import { query, getClient } from '../db/connection'
import { authMiddleware } from '../middleware/auth'
import { getCompanyId } from '../middleware/tenant'
import { v4 as uuidv4 } from 'uuid'

export const contractsRouter = Router()

const normalizeIso = (raw?: string | null) => {
  const s = String(raw || '').trim()
  if (!s) return null
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : s
}

const monthAdd = (iso: string, months: number): string => {
  const d = new Date(iso)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

const addYears = (iso: string, years: number): string => monthAdd(iso, Number(years) * 12)

const compareIso = (a: string, b: string) => new Date(a).getTime() - new Date(b).getTime()

const buildSalarySchedule = (params: {
  start_date: string
  end_date?: string | null
  due_day: number
}) => {
  const out: Array<{ due_date: string; title: string }> = []
  const start = new Date(params.start_date)
  if (isNaN(start.getTime())) return out
  const startIso = params.start_date
  const endIso = normalizeIso(params.end_date) || monthAdd(startIso, 12)
  const end = new Date(endIso)
  if (isNaN(end.getTime())) return out
  const dueDay = Math.min(28, Math.max(1, Number(params.due_day)))

  const cursor = new Date(startIso)
  cursor.setDate(1)
  let i = 0
  while (cursor.getTime() <= end.getTime() && i < 120) {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const d = new Date(year, month, dueDay)
    const due = d.toISOString().slice(0, 10)
    if (
      new Date(due).getTime() >= new Date(startIso).getTime() &&
      new Date(due).getTime() <= end.getTime()
    ) {
      out.push({ due_date: due, title: `راتب شهر ${String(month + 1).padStart(2, '0')}-${year}` })
    }
    cursor.setMonth(cursor.getMonth() + 1)
    i += 1
  }
  return out
}

// Helper: ensure contract party is created in database transaction
async function ensureOfficeParty(client: any, companyId: string, displayName: string): Promise<string> {
  const existing = await client.query(
    `SELECT id FROM contract_parties 
     WHERE party_type_key = 'office' AND company_id = $1 
     ORDER BY created_at ASC LIMIT 1`,
    [companyId]
  )
  if (existing.rows.length > 0) return existing.rows[0].id
  const id = uuidv4()
  await client.query(
    `INSERT INTO contract_parties (id, company_id, party_type_key, user_id, client_id, defendant_id, display_name, metadata_json, is_active)
     VALUES ($1, $2, 'office', NULL, NULL, NULL, $3, NULL, TRUE)`,
    [id, companyId, displayName || 'المكتب']
  )
  return id
}

async function ensureUserParty(client: any, companyId: string, userId: string, displayName: string, role = 'employee'): Promise<string> {
  const existing = await client.query(
    `SELECT id FROM contract_parties 
     WHERE party_type_key = $1 AND user_id = $2 AND company_id = $3 
     ORDER BY created_at ASC LIMIT 1`,
    [role, userId, companyId]
  )
  if (existing.rows.length > 0) return existing.rows[0].id
  const id = uuidv4()
  await client.query(
    `INSERT INTO contract_parties (id, company_id, party_type_key, user_id, client_id, defendant_id, display_name, metadata_json, is_active)
     VALUES ($1, $2, $3, $4, NULL, NULL, $5, NULL, TRUE)`,
    [id, companyId, role, userId, displayName || userId]
  )
  return id
}

async function ensureClientParty(client: any, companyId: string, clientId: string, displayName: string): Promise<string> {
  const existing = await client.query(
    `SELECT id FROM contract_parties 
     WHERE party_type_key = 'client' AND client_id = $1 AND company_id = $2 
     ORDER BY created_at ASC LIMIT 1`,
    [clientId, companyId]
  )
  if (existing.rows.length > 0) return existing.rows[0].id
  const id = uuidv4()
  await client.query(
    `INSERT INTO contract_parties (id, company_id, party_type_key, user_id, client_id, defendant_id, display_name, metadata_json, is_active)
     VALUES ($1, $2, 'client', NULL, $3, NULL, $4, NULL, TRUE)`,
    [id, companyId, clientId, displayName || clientId]
  )
  return id
}

async function ensureDefendantParty(client: any, companyId: string, defendantId: string, displayName: string): Promise<string> {
  const existing = await client.query(
    `SELECT id FROM contract_parties 
     WHERE party_type_key = 'defendant' AND defendant_id = $1 AND company_id = $2 
     ORDER BY created_at ASC LIMIT 1`,
    [defendantId, companyId]
  )
  if (existing.rows.length > 0) return existing.rows[0].id
  const id = uuidv4()
  await client.query(
    `INSERT INTO contract_parties (id, company_id, party_type_key, user_id, client_id, defendant_id, display_name, metadata_json, is_active)
     VALUES ($1, $2, 'defendant', NULL, NULL, $3, $4, NULL, TRUE)`,
    [id, companyId, defendantId, displayName || defendantId]
  )
  return id
}

async function createFreeParty(client: any, companyId: string, partyTypeKey: string, displayName: string, metadata: any): Promise<string> {
  const id = uuidv4()
  const metadata_json = metadata ? JSON.stringify(metadata) : null
  await client.query(
    `INSERT INTO contract_parties (id, company_id, party_type_key, user_id, client_id, defendant_id, display_name, metadata_json, is_active)
     VALUES ($1, $2, $3, NULL, NULL, NULL, $4, $5, TRUE)`,
    [id, companyId, partyTypeKey, displayName, metadata_json]
  )
  return id
}

async function ensureSignature(client: any, companyId: string, contractId: string, participantId: string, partyId: string) {
  const existing = await client.query(
    `SELECT id FROM contract_signatures WHERE participant_id = $1 AND contract_id = $2 AND company_id = $3`,
    [participantId, contractId, companyId]
  )
  if (existing.rows.length > 0) return
  await client.query(
    `INSERT INTO contract_signatures (id, company_id, contract_id, participant_id, party_id, signature_status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), NOW())`,
    [uuidv4(), companyId, contractId, participantId, partyId]
  )
}

// 1. Get Party Types
contractsRouter.get('/party-types', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT * FROM contract_party_types ORDER BY sort_order ASC, party_type_name ASC`
    )
    res.json(result.rows)
  } catch (err) {
    console.error('[Contracts] Party types list error:', err)
    res.status(500).json({ error: 'Failed to get contract party types' })
  }
})

// 2. Get Templates
contractsRouter.get('/templates', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const { contractType } = req.query
    let q = 'SELECT * FROM contract_templates WHERE company_id = $1 AND is_active = TRUE'
    const params = [companyId]
    if (contractType) {
      q += ' AND contract_type = $2'
      params.push(contractType as string)
    }
    q += ' ORDER BY created_at DESC'
    const result = await query(q, params)
    res.json(result.rows)
  } catch (err) {
    console.error('[Contracts] Templates list error:', err)
    res.status(500).json({ error: 'Failed to list templates' })
  }
})

// 3. Create Template
contractsRouter.post('/templates', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const { contract_type, name, body } = req.body
    const id = uuidv4()
    await query(
      `INSERT INTO contract_templates (id, company_id, contract_type, name, body, is_active, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), NOW())`,
      [id, companyId, contract_type, name, body]
    )
    res.status(201).json({ id })
  } catch (err) {
    console.error('[Contracts] Create template error:', err)
    res.status(500).json({ error: 'Failed to create template' })
  }
})

// 4. Update Template
contractsRouter.put('/templates/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const { name, body, is_active } = req.body
    const sets: string[] = []
    const params: any[] = [req.params.id, companyId]
    let paramIndex = 3
    if (name !== undefined) {
      sets.push(`name = $${paramIndex++}`)
      params.push(name)
    }
    if (body !== undefined) {
      sets.push(`body = $${paramIndex++}`)
      params.push(body)
    }
    if (is_active !== undefined) {
      sets.push(`is_active = $${paramIndex++}`)
      params.push(is_active)
    }
    if (sets.length === 0) {
      res.json({ success: true })
      return
    }
    await query(
      `UPDATE contract_templates SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $1 AND company_id = $2`,
      params
    )
    res.json({ success: true })
  } catch (err) {
    console.error('[Contracts] Update template error:', err)
    res.status(500).json({ error: 'Failed to update template' })
  }
})

// 5. Delete Template
contractsRouter.delete('/templates/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    await query(
      `DELETE FROM contract_templates WHERE id = $1 AND company_id = $2`,
      [req.params.id, companyId]
    )
    res.json({ success: true })
  } catch (err) {
    console.error('[Contracts] Delete template error:', err)
    res.status(500).json({ error: 'Failed to delete template' })
  }
})

// 6. Get All Contracts (non-paginated)
contractsRouter.get('/all', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const result = await query(
      'SELECT * FROM contracts WHERE company_id = $1 ORDER BY created_at DESC',
      [companyId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('[Contracts] GetAll error:', err)
    res.status(500).json({ error: 'Failed to get all contracts' })
  }
})

// 6. List Contracts
contractsRouter.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const { contract_type, caseId, clientId, employeeUserId } = req.query
    let q = 'SELECT * FROM contracts WHERE company_id = $1'
    const params: any[] = [companyId]
    let paramIndex = 2
    if (contract_type) {
      q += ` AND contract_type = $${paramIndex++}`
      params.push(contract_type)
    }
    if (caseId) {
      q += ` AND case_id = $${paramIndex++}`
      params.push(caseId)
    }
    if (clientId) {
      q += ` AND client_id = $${paramIndex++}`
      params.push(clientId)
    }
    if (employeeUserId) {
      q += ` AND employee_user_id = $${paramIndex++}`
      params.push(employeeUserId)
    }
    q += ' ORDER BY created_at DESC'
    const result = await query(q, params)
    res.json(result.rows)
  } catch (err) {
    console.error('[Contracts] List error:', err)
    res.status(500).json({ error: 'Failed to list contracts' })
  }
})

// 7. Get Contract by ID (with details)
contractsRouter.get('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const id = req.params.id
    
    const contractRes = await query(
      `SELECT * FROM contracts WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    )
    if (contractRes.rows.length === 0) {
      res.status(404).json({ error: 'Contract not found' })
      return
    }
    const contract = contractRes.rows[0]

    // Fetch schedules
    const schedulesRes = await query(
      `SELECT * FROM contract_schedules WHERE contract_id = $1 AND company_id = $2 ORDER BY due_date ASC`,
      [id, companyId]
    )
    
    // Fetch links
    const linksRes = await query(
      `SELECT * FROM contract_links WHERE contract_id = $1 AND company_id = $2`,
      [id, companyId]
    )

    // Fetch amendments
    const amendmentsRes = await query(
      `SELECT * FROM contract_amendments WHERE contract_id = $1 AND company_id = $2 ORDER BY created_at DESC`,
      [id, companyId]
    )

    // Fetch participants
    const participantsRes = await query(
      `SELECT * FROM contract_participants WHERE contract_id = $1 AND company_id = $2 ORDER BY sort_order ASC`,
      [id, companyId]
    )
    const participants = participantsRes.rows

    // Fetch parties and key them by party_id
    const partiesById: Record<string, any> = {}
    for (const p of participants) {
      if (!partiesById[p.party_id]) {
        const partyRes = await query(
          `SELECT * FROM contract_parties WHERE id = $1 AND company_id = $2`,
          [p.party_id, companyId]
        )
        if (partyRes.rows.length > 0) {
          partiesById[p.party_id] = partyRes.rows[0]
        }
      }
    }

    // Fetch signatures
    const signaturesRes = await query(
      `SELECT * FROM contract_signatures WHERE contract_id = $1 AND company_id = $2`,
      [id, companyId]
    )

    res.json({
      contract,
      schedules: schedulesRes.rows,
      links: linksRes.rows,
      amendments: amendmentsRes.rows,
      participants,
      partiesById,
      signatures: signaturesRes.rows
    })
  } catch (err) {
    console.error('[Contracts] GetById error:', err)
    res.status(500).json({ error: 'Failed to get contract details' })
  }
})

// 8. Create Contract (with Transaction)
contractsRouter.post('/', authMiddleware, async (req: Request, res: Response) => {
  const client = await getClient()
  try {
    const companyId = getCompanyId(req)
    const payload = req.body
    const created_by = req.auth?.userId || null

    const contract_type = String(payload.contract_type || '').trim()
    if (contract_type !== 'employment' && contract_type !== 'fee_agreement') {
      res.status(400).json({ error: 'نوع العقد غير مدعوم' })
      return
    }

    const contract_date = normalizeIso(payload.contract_date)
    const start_date = normalizeIso(payload.start_date)
    let end_date = normalizeIso(payload.end_date)
    const is_fixed_term = payload.is_fixed_term ? true : false
    const term_years = (payload.term_years === null || payload.term_years === undefined) ? null : Number(payload.term_years)

    if (is_fixed_term) {
      if (!start_date) {
        res.status(400).json({ error: 'تاريخ بداية العقد مطلوب' })
        return
      }
      if (!term_years || term_years <= 0) {
        res.status(400).json({ error: 'مدة العقد مطلوبة' })
        return
      }
      if (!end_date) end_date = addYears(start_date, term_years)
      if (compareIso(end_date, start_date) < 0) {
        res.status(400).json({ error: 'تاريخ نهاية العقد يجب أن يكون بعد تاريخ البداية' })
        return
      }
    }

    const total_amount = Number(payload.total_amount || 0)
    const salary_amount = Number(payload.salary_amount || 0)
    const salary_due_day = (payload.salary_due_day === null || payload.salary_due_day === undefined) ? null : Number(payload.salary_due_day)
    const feeSchedules = payload.feeSchedules || []

    if (contract_type === 'fee_agreement') {
      if (!payload.client_id) {
        res.status(400).json({ error: 'الموكل مطلوب في عقد الأتعاب' })
        return
      }
      if (!payload.representative_user_id) {
        res.status(400).json({ error: 'ممثل المكتب مطلوب' })
        return
      }
      if (total_amount <= 0) {
        res.status(400).json({ error: 'قيمة الأتعاب غير صحيحة' })
        return
      }
      if (feeSchedules.length === 0) {
        res.status(400).json({ error: 'دفعات الأتعاب مطلوبة' })
        return
      }
      const sum = feeSchedules.reduce((acc: number, it: any) => acc + Number(it.amount || 0), 0)
      if (Math.abs(sum - total_amount) > 0.001) {
        res.status(400).json({ error: 'مجموع الدفعات لا يساوي قيمة العقد' })
        return
      }
    }

    if (contract_type === 'employment') {
      if (!payload.employee_user_id) {
        res.status(400).json({ error: 'الموظف مطلوب' })
        return
      }
      if (!start_date) {
        res.status(400).json({ error: 'تاريخ بداية العقد مطلوب' })
        return
      }
      if (salary_amount <= 0) {
        res.status(400).json({ error: 'الراتب غير صحيح' })
        return
      }
      if (!salary_due_day || salary_due_day < 1 || salary_due_day > 28) {
        res.status(400).json({ error: 'يوم استحقاق الراتب يجب أن يكون بين 1 و 28' })
        return
      }
    }

    await client.query('BEGIN')

    // Generate contract_no
    const year = new Date().getFullYear()
    const likePattern = `CNT-${year}-%`
    const lastContractRes = await client.query(
      `SELECT contract_no FROM contracts 
       WHERE company_id = $1 AND contract_no LIKE $2 
       ORDER BY contract_no DESC LIMIT 1`,
      [companyId, likePattern]
    )
    let nextSeq = 1
    if (lastContractRes.rows.length > 0) {
      const parts = lastContractRes.rows[0].contract_no.split('-')
      const lastSeq = parseInt(parts[parts.length - 1], 10)
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1
      }
    }
    const contract_no = `CNT-${year}-${String(nextSeq).padStart(6, '0')}`
    const id = uuidv4()

    // Insert Contract
    await client.query(
      `INSERT INTO contracts (
        id, company_id, contract_no, contract_type, status, title, template_id, case_id, client_id, employee_user_id, representative_user_id,
        contract_date, start_date, end_date, is_fixed_term, term_years, total_amount, salary_amount, salary_due_day, text_content, created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, 'draft', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW()
      )`,
      [
        id,
        companyId,
        contract_no,
        contract_type,
        payload.title || null,
        payload.template_id || null,
        payload.case_id || null,
        payload.client_id || null,
        payload.employee_user_id || null,
        payload.representative_user_id || null,
        contract_date,
        start_date,
        end_date,
        is_fixed_term,
        term_years,
        total_amount || 0,
        salary_amount || 0,
        salary_due_day,
        payload.text_content || null,
        created_by
      ]
    )

    // Insert Links
    const links = payload.links || []
    for (const l of links) {
      await client.query(
        `INSERT INTO contract_links (id, company_id, contract_id, entity_type, entity_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [uuidv4(), companyId, id, l.entity_type, l.entity_id]
      )
    }

    // Insert Schedules
    if (contract_type === 'fee_agreement') {
      for (const s of feeSchedules) {
        await client.query(
          `INSERT INTO contract_schedules (id, company_id, contract_id, schedule_type, title, amount, due_date, milestone_key, status, created_at, updated_at)
           VALUES ($1, $2, $3, 'fee_installment', $4, $5, $6, $7, 'open', NOW(), NOW())`,
          [uuidv4(), companyId, id, s.title, s.amount, normalizeIso(s.due_date) || null, s.milestone_key || null]
        )
      }
    }

    if (contract_type === 'employment') {
      const list = buildSalarySchedule({
        start_date: start_date!,
        end_date,
        due_day: salary_due_day as number
      })
      for (const item of list) {
        await client.query(
          `INSERT INTO contract_schedules (id, company_id, contract_id, schedule_type, title, amount, due_date, milestone_key, status, created_at, updated_at)
           VALUES ($1, $2, $3, 'salary', $4, $5, $6, 'salary', 'open', NOW(), NOW())`,
          [uuidv4(), companyId, id, item.title, salary_amount, item.due_date]
        )
      }
    }

    // Ensure default Office party
    const officePartyId = await ensureOfficeParty(client, companyId, 'المكتب')
    
    // Add Office participant
    const officeParticipantId = uuidv4()
    await client.query(
      `INSERT INTO contract_participants (id, company_id, contract_id, party_id, role_key, role_label, side_key, sort_order, created_at)
       VALUES ($1, $2, $3, $4, 'first_party', 'طرف أول', 'office', 1, NOW())`,
      [officeParticipantId, companyId, id, officePartyId]
    )
    await ensureSignature(client, companyId, id, officeParticipantId, officePartyId)

    if (contract_type === 'fee_agreement') {
      // Add Client party & participant
      const clientDetails = await client.query('SELECT name FROM clients WHERE id = $1 AND company_id = $2', [payload.client_id, companyId])
      const clientName = clientDetails.rows[0]?.name || ''
      const clientPartyId = await ensureClientParty(client, companyId, payload.client_id, clientName)
      
      const clientParticipantId = uuidv4()
      await client.query(
        `INSERT INTO contract_participants (id, company_id, contract_id, party_id, role_key, role_label, side_key, sort_order, created_at)
         VALUES ($1, $2, $3, $4, 'second_party', 'طرف ثانٍ', 'client', 2, NOW())`,
        [clientParticipantId, companyId, id, clientPartyId]
      )
      await ensureSignature(client, companyId, id, clientParticipantId, clientPartyId)

      // Add Representative (user) party & participant
      const repDetails = await client.query('SELECT COALESCE(full_name, username) as n FROM users WHERE id = $1 AND company_id = $2', [payload.representative_user_id, companyId])
      const repName = repDetails.rows[0]?.n || ''
      const repPartyId = await ensureUserParty(client, companyId, payload.representative_user_id, repName, 'employee')

      const repParticipantId = uuidv4()
      await client.query(
        `INSERT INTO contract_participants (id, company_id, contract_id, party_id, role_key, role_label, side_key, sort_order, created_at)
         VALUES ($1, $2, $3, $4, 'legal_representative', 'ممثل قانوني', 'office', 3, NOW())`,
        [repParticipantId, companyId, id, repPartyId]
      )
      await ensureSignature(client, companyId, id, repParticipantId, repPartyId)
    }

    if (contract_type === 'employment') {
      // Add Employee (user) party & participant
      const empDetails = await client.query('SELECT COALESCE(full_name, username) as n FROM users WHERE id = $1 AND company_id = $2', [payload.employee_user_id, companyId])
      const empName = empDetails.rows[0]?.n || ''
      const empPartyId = await ensureUserParty(client, companyId, payload.employee_user_id, empName, 'employee')

      const empParticipantId = uuidv4()
      await client.query(
        `INSERT INTO contract_participants (id, company_id, contract_id, party_id, role_key, role_label, side_key, sort_order, created_at)
         VALUES ($1, $2, $3, $4, 'second_party', 'طرف ثانٍ', 'employee', 2, NOW())`,
        [empParticipantId, companyId, id, empPartyId]
      )
      await ensureSignature(client, companyId, id, empParticipantId, empPartyId)
    }

    // Add extra parties if provided
    for (const p of payload.extraParties || []) {
      let partyId = ''
      if (p.kind === 'user') {
        partyId = await ensureUserParty(client, companyId, p.user_id, p.display_name, p.party_type_key || 'employee')
      } else if (p.kind === 'client') {
        partyId = await ensureClientParty(client, companyId, p.client_id, p.display_name)
      } else if (p.kind === 'defendant') {
        partyId = await ensureDefendantParty(client, companyId, p.defendant_id, p.display_name)
      } else {
        partyId = await createFreeParty(client, companyId, p.party_type_key, p.display_name, p.metadata)
      }
      const participantId = uuidv4()
      await client.query(
        `INSERT INTO contract_participants (id, company_id, contract_id, party_id, role_key, role_label, side_key, sort_order, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 10, NOW())`,
        [participantId, companyId, id, partyId, p.role_key, p.role_label || null, p.side_key || null]
      )
      await ensureSignature(client, companyId, id, participantId, partyId)
    }

    await client.query('COMMIT')
    res.status(201).json(id)
  } catch (err: any) {
    await client.query('ROLLBACK')
    console.error('[Contracts] Create error:', err)
    res.status(500).json({ error: err.message || 'Failed to create contract' })
  } finally {
    client.release()
  }
})

// 9. Update Contract
contractsRouter.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const id = req.params.id
    const payload = req.body

    const existingRes = await query(
      `SELECT * FROM contracts WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    )
    if (existingRes.rows.length === 0) {
      res.status(404).json({ error: 'العقد غير موجود' })
      return
    }
    const existing = existingRes.rows[0]
    if (existing.status === 'approved') {
      res.status(400).json({ error: 'لا يجوز تعديل العقد بعد اعتماده. استخدم ملحق عقد.' })
      return
    }

    const allowed = [
      'title', 'template_id', 'case_id', 'client_id', 'employee_user_id', 'representative_user_id',
      'contract_date', 'start_date', 'end_date', 'is_fixed_term', 'term_years', 'total_amount',
      'salary_amount', 'salary_due_day', 'text_content'
    ]

    const sets: string[] = []
    const params: any[] = [id, companyId]
    let paramIndex = 3

    for (const k of allowed) {
      if (payload[k] !== undefined) {
        let v = payload[k]
        if (k.endsWith('_date') || k === 'contract_date') {
          v = normalizeIso(v)
        }
        sets.push(`"${k}" = $${paramIndex++}`)
        params.push(v === '' ? null : v)
      }
    }

    if (sets.length === 0) {
      res.json({ success: true })
      return
    }

    const nextIsFixed = payload.is_fixed_term === undefined ? existing.is_fixed_term : payload.is_fixed_term
    const nextStart = normalizeIso(payload.start_date ?? existing.start_date)
    const nextEnd = normalizeIso(payload.end_date ?? existing.end_date)
    const nextYears = payload.term_years === undefined ? existing.term_years : payload.term_years

    if (nextIsFixed) {
      if (!nextStart) {
        res.status(400).json({ error: 'تاريخ بداية العقد مطلوب' })
        return
      }
      const y = Number(nextYears || 0)
      if (!y || y <= 0) {
        res.status(400).json({ error: 'مدة العقد مطلوبة' })
        return
      }
      if (!nextEnd) {
        res.status(400).json({ error: 'تاريخ نهاية العقد مطلوب' })
        return
      }
      if (compareIso(nextEnd, nextStart) < 0) {
        res.status(400).json({ error: 'تاريخ نهاية العقد يجب أن يكون بعد تاريخ البداية' })
        return
      }
    }

    await query(
      `UPDATE contracts 
       SET ${sets.join(', ')}, updated_at = NOW() 
       WHERE id = $1 AND company_id = $2`,
      params
    )
    res.json({ success: true })
  } catch (err: any) {
    console.error('[Contracts] Update error:', err)
    res.status(500).json({ error: err.message || 'Failed to update contract' })
  }
})

// 10. Approve Contract
contractsRouter.post('/:id/approve', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const userId = req.auth!.userId
    const id = req.params.id

    const existingRes = await query(
      `SELECT * FROM contracts WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    )
    if (existingRes.rows.length === 0) {
      res.status(404).json({ error: 'العقد غير موجود' })
      return
    }

    await query(
      `UPDATE contracts 
       SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW() 
       WHERE id = $2 AND company_id = $3`,
      [userId, id, companyId]
    )
    res.json({ success: true })
  } catch (err) {
    console.error('[Contracts] Approve error:', err)
    res.status(500).json({ error: 'Failed to approve contract' })
  }
})

// 11. Archive Contract
contractsRouter.put('/:id/archive', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const userId = req.auth!.userId
    const id = req.params.id
    const { reason } = req.body

    const existingRes = await query(
      `SELECT * FROM contracts WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    )
    if (existingRes.rows.length === 0) {
      res.status(404).json({ error: 'العقد غير موجود' })
      return
    }

    await query(
      `UPDATE contracts 
       SET is_archived = TRUE, archived_at = NOW(), archived_by = $1, archive_reason = $2, updated_at = NOW() 
       WHERE id = $3 AND company_id = $4`,
      [userId, reason || null, id, companyId]
    )
    res.json({ success: true })
  } catch (err) {
    console.error('[Contracts] Archive error:', err)
    res.status(500).json({ error: 'Failed to archive contract' })
  }
})

// 12. List Party Audits
contractsRouter.get('/:id/party-audits', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const result = await query(
      `SELECT * FROM contract_party_audits 
       WHERE contract_id = $1 AND company_id = $2 
       ORDER BY created_at DESC`,
      [req.params.id, companyId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('[Contracts] Party audits list error:', err)
    res.status(500).json({ error: 'Failed to list party audits' })
  }
})

// 13. Add Participant
contractsRouter.post('/:contractId/participants', authMiddleware, async (req: Request, res: Response) => {
  const client = await getClient()
  try {
    const companyId = getCompanyId(req)
    const contractId = req.params.contractId
    const { party_id, role_key, role_label, side_key, sort_order } = req.body
    const id = uuidv4()

    await client.query('BEGIN')

    await client.query(
      `INSERT INTO contract_participants (id, company_id, contract_id, party_id, role_key, role_label, side_key, sort_order, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [id, companyId, contractId, party_id, role_key, role_label || null, side_key || null, sort_order || 0]
    )

    await ensureSignature(client, companyId, contractId, id, party_id)

    await client.query('COMMIT')
    res.status(201).json({ id })
  } catch (err: any) {
    await client.query('ROLLBACK')
    console.error('[Contracts] Add participant error:', err)
    res.status(500).json({ error: err.message || 'Failed to add participant' })
  } finally {
    client.release()
  }
})

// 14. Update Participant
contractsRouter.put('/:contractId/participants/:participantId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const { role_key, role_label, side_key, sort_order } = req.body
    const sets: string[] = []
    const params: any[] = [req.params.participantId, companyId]
    let paramIndex = 3
    if (role_key !== undefined) {
      sets.push(`role_key = $${paramIndex++}`)
      params.push(role_key)
    }
    if (role_label !== undefined) {
      sets.push(`role_label = $${paramIndex++}`)
      params.push(role_label)
    }
    if (side_key !== undefined) {
      sets.push(`side_key = $${paramIndex++}`)
      params.push(side_key)
    }
    if (sort_order !== undefined) {
      sets.push(`sort_order = $${paramIndex++}`)
      params.push(sort_order)
    }
    if (sets.length === 0) {
      res.json({ success: true })
      return
    }
    await query(
      `UPDATE contract_participants SET ${sets.join(', ')} WHERE id = $1 AND company_id = $2`,
      params
    )
    res.json({ success: true })
  } catch (err) {
    console.error('[Contracts] Update participant error:', err)
    res.status(500).json({ error: 'Failed to update participant' })
  }
})

// 15. Remove Participant
contractsRouter.delete('/:contractId/participants/:participantId', authMiddleware, async (req: Request, res: Response) => {
  const client = await getClient()
  try {
    const companyId = getCompanyId(req)
    const participantId = req.params.participantId

    await client.query('BEGIN')

    // Remove associated signatures
    await client.query(
      `DELETE FROM contract_signatures WHERE participant_id = $1 AND company_id = $2`,
      [participantId, companyId]
    )

    // Delete participant
    await client.query(
      `DELETE FROM contract_participants WHERE id = $1 AND company_id = $2`,
      [participantId, companyId]
    )

    await client.query('COMMIT')
    res.json({ success: true })
  } catch (err: any) {
    await client.query('ROLLBACK')
    console.error('[Contracts] Remove participant error:', err)
    res.status(500).json({ error: err.message || 'Failed to remove participant' })
  } finally {
    client.release()
  }
})

// 16. Update Signature
contractsRouter.put('/:contractId/signatures/:signatureId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const { signature_status, signature_payload_json, signed_at } = req.body
    const sets: string[] = []
    const params: any[] = [req.params.signatureId, companyId]
    let paramIndex = 3
    if (signature_status !== undefined) {
      sets.push(`signature_status = $${paramIndex++}`)
      params.push(signature_status)
    }
    if (signature_payload_json !== undefined) {
      sets.push(`signature_payload_json = $${paramIndex++}`)
      params.push(signature_payload_json ? JSON.stringify(signature_payload_json) : null)
    }
    if (signed_at !== undefined) {
      sets.push(`signed_at = $${paramIndex++}`)
      params.push(signed_at || null)
    }
    if (sets.length === 0) {
      res.json({ success: true })
      return
    }
    await query(
      `UPDATE contract_signatures SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $1 AND company_id = $2`,
      params
    )
    res.json({ success: true })
  } catch (err) {
    console.error('[Contracts] Update signature error:', err)
    res.status(500).json({ error: 'Failed to update signature' })
  }
})

// 17. Update Schedule Status
contractsRouter.put('/schedules/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const { status } = req.body
    await query(
      `UPDATE contract_schedules SET status = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3`,
      [status, req.params.id, companyId]
    )
    res.json({ success: true })
  } catch (err) {
    console.error('[Contracts] Update schedule error:', err)
    res.status(500).json({ error: 'Failed to update schedule' })
  }
})

// 18. Create Amendment
contractsRouter.post('/:contractId/amendments', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const { reason, content } = req.body
    const id = uuidv4()
    await query(
      `INSERT INTO contract_amendments (id, company_id, contract_id, reason, content, created_by, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [id, companyId, req.params.contractId, reason, content, req.auth?.userId || null]
    )
    res.status(201).json({ id })
  } catch (err) {
    console.error('[Contracts] Create amendment error:', err)
    res.status(500).json({ error: 'Failed to create amendment' })
  }
})
