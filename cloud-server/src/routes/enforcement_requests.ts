import { Router, Request, Response } from 'express'
import { query, getClient } from '../db/connection'
import { authMiddleware } from '../middleware/auth'
import { getCompanyId } from '../middleware/tenant'
import { v4 as uuidv4 } from 'uuid'

export const enforcementRequestsRouter = Router()

enforcementRequestsRouter.use(authMiddleware)

.use((req, res, next) => {
  const { requirePermission } = require('../middleware/permission')
  const perm = req.method === 'GET' ? 'view_enforcement' : 'create_enforcement'
  requirePermission(perm)(req, res, next)
})

// 1. List Requests
enforcementRequestsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const { page = '1', pageSize = '25', q, status, type } = req.query
    const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string)
    const limit = parseInt(pageSize as string)

    let whereClause = 'WHERE company_id = $1'
    const params: any[] = [companyId]
    let paramIndex = 2

    if (status && status !== 'الكل') {
      whereClause += ` AND status = $${paramIndex++}`
      params.push(status)
    }
    if (type && type !== 'الكل') {
      whereClause += ` AND request_type = $${paramIndex++}`
      params.push(type)
    }
    if (q) {
      whereClause += ` AND (request_no LIKE $${paramIndex} OR instrument_no LIKE $${paramIndex} OR case_number LIKE $${paramIndex} OR najiz_request_no LIKE $${paramIndex})`
      params.push(`%${q}%`)
      paramIndex++
    }

    const countRes = await query(`SELECT COUNT(*) FROM enforcement_requests ${whereClause}`, params)
    const dataRes = await query(
      `SELECT * FROM enforcement_requests ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    )

    res.json({
      data: dataRes.rows,
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page as string),
      pageSize: limit
    })
  } catch (err) {
    console.error('[EnforcementRequests] List error:', err)
    res.status(500).json({ error: 'Failed to list enforcement requests' })
  }
})

// 2. Get Single Request (with details, decisions, parties)
enforcementRequestsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const requestId = req.params.id

    const baseRes = await query(
      'SELECT * FROM enforcement_requests WHERE id = $1 AND company_id = $2',
      [requestId, companyId]
    )
    if (baseRes.rows.length === 0) {
      res.status(404).json({ error: 'Enforcement request not found' })
      return
    }

    const base = baseRes.rows[0]
    let details: any = null

    if (base.request_type === 'financial') {
      const detRes = await query('SELECT * FROM enf_financial_details WHERE request_id = $1', [requestId])
      details = detRes.rows[0] || null
    } else if (base.request_type === 'personal') {
      const detRes = await query('SELECT * FROM enf_personal_details WHERE request_id = $1', [requestId])
      details = detRes.rows[0] || null
    } else if (base.request_type === 'direct') {
      const detRes = await query('SELECT * FROM enf_direct_details WHERE request_id = $1', [requestId])
      details = detRes.rows[0] || null
    }

    const decisionsRes = await query(
      'SELECT * FROM enf_decisions WHERE request_id = $1 ORDER BY decision_date DESC',
      [requestId]
    )
    const partiesRes = await query('SELECT * FROM enf_request_parties WHERE request_id = $1', [requestId])

    res.json({
      ...base,
      details,
      decisions: decisionsRes.rows,
      parties: partiesRes.rows
    })
  } catch (err) {
    console.error('[EnforcementRequests] GetById error:', err)
    res.status(500).json({ error: 'Failed to get enforcement request' })
  }
})

// 3. Create Request (Transaction)
enforcementRequestsRouter.post('/', async (req: Request, res: Response) => {
  const client = await getClient()
  try {
    const companyId = getCompanyId(req)
    const { base, details, parties = [], decisions = [] } = req.body
    if (!base || !base.request_type || !base.instrument_no) {
      res.status(400).json({ error: 'Invalid payload: base fields missing' })
      return
    }

    const id = uuidv4()
    const requestNo = base.request_no || `ENF-${Date.now()}`

    await client.query('BEGIN')

    // 1. Insert Base
    await client.query(
      `INSERT INTO enforcement_requests (
        id, company_id, request_no, case_id, is_office_case, client_id, request_type, instrument_no,
        najiz_request_no, instrument_type_main, instrument_type_sub, instrument_date,
        court_name, case_number, request_classification, other_explanation,
        status, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())`,
      [
        id,
        companyId,
        requestNo,
        base.case_id || null,
        base.is_office_case || 0,
        base.client_id || null,
        base.request_type,
        base.instrument_no,
        base.najiz_request_no || null,
        base.instrument_type_main,
        base.instrument_type_sub,
        base.instrument_date || null,
        base.court_name || null,
        base.case_number || null,
        base.request_classification || null,
        base.other_explanation || null,
        base.status || 'draft',
        base.created_by || null
      ]
    )

    // 2. Insert Details
    if (base.request_type === 'financial') {
      await client.query(
        `INSERT INTO enf_financial_details (request_id, company_id, amount_instrument, amount_collected_for_client, currency)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          id,
          companyId,
          details?.amount_instrument || 0,
          details?.amount_collected_for_client || 0,
          details?.currency || 'SAR'
        ]
      )
    } else if (base.request_type === 'personal') {
      await client.query(
        `INSERT INTO enf_personal_details (request_id, company_id, alimony_amount, execution_frequency, beneficiary_name, visit_custody_details)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          id,
          companyId,
          details?.alimony_amount || null,
          details?.execution_frequency || null,
          details?.beneficiary_name || null,
          details?.visit_custody_details || null
        ]
      )
    } else if (base.request_type === 'direct') {
      await client.query(
        `INSERT INTO enf_direct_details (request_id, company_id, execution_location, action_type, work_description)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          id,
          companyId,
          details?.execution_location || null,
          details?.action_type || null,
          details?.work_description || null
        ]
      )
    }

    // 3. Insert Parties
    for (const p of parties) {
      await client.query(
        `INSERT INTO enf_request_parties (id, company_id, request_id, party_name, party_role, is_client, linked_entity_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          uuidv4(),
          companyId,
          id,
          p.party_name,
          p.party_role,
          p.is_client || 0,
          p.linked_entity_id || null
        ]
      )
    }

    // 4. Insert Decisions
    for (const d of decisions) {
      await client.query(
        `INSERT INTO enf_decisions (id, company_id, request_id, decision_type, decision_date, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [uuidv4(), companyId, id, d.decision_type, d.decision_date, d.notes || null]
      )
    }

    await client.query('COMMIT')
    res.status(201).json({ id, success: true })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[EnforcementRequests] Create error:', err)
    res.status(500).json({ error: 'Failed to create enforcement request' })
  } finally {
    client.release()
  }
})

// 4. Update Request (Transaction)
enforcementRequestsRouter.put('/:id', async (req: Request, res: Response) => {
  const client = await getClient()
  try {
    const companyId = getCompanyId(req)
    const id = req.params.id
    const { base, details, parties, decisions } = req.body

    await client.query('BEGIN')

    // 1. Update Base
    if (base) {
      const allowed = [
        'request_no',
        'case_id',
        'is_office_case',
        'client_id',
        'request_type',
        'instrument_no',
        'najiz_request_no',
        'instrument_type_main',
        'instrument_type_sub',
        'instrument_date',
        'court_name',
        'case_number',
        'request_classification',
        'other_explanation',
        'status'
      ]
      const sets: string[] = []
      const values: any[] = [id, companyId]
      let valIndex = 3

      for (const k of allowed) {
        if (base[k] !== undefined) {
          sets.push(`${k} = $${valIndex++}`)
          values.push(base[k])
        }
      }

      if (sets.length > 0) {
        await client.query(
          `UPDATE enforcement_requests SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $1 AND company_id = $2`,
          values
        )
      }
    }

    // 2. Fetch request_type
    const typeRes = await client.query(
      'SELECT request_type FROM enforcement_requests WHERE id = $1 AND company_id = $2',
      [id, companyId]
    )
    if (typeRes.rows.length > 0 && details) {
      const type = typeRes.rows[0].request_type
      if (type === 'financial') {
        await client.query(
          `UPDATE enf_financial_details 
           SET amount_instrument = $3, amount_collected_for_client = $4, currency = $5 
           WHERE request_id = $1 AND company_id = $2`,
          [
            id,
            companyId,
            details.amount_instrument || 0,
            details.amount_collected_for_client || 0,
            details.currency || 'SAR'
          ]
        )
      } else if (type === 'personal') {
        await client.query(
          `UPDATE enf_personal_details 
           SET alimony_amount = $3, execution_frequency = $4, beneficiary_name = $5, visit_custody_details = $6 
           WHERE request_id = $1 AND company_id = $2`,
          [
            id,
            companyId,
            details.alimony_amount || null,
            details.execution_frequency || null,
            details.beneficiary_name || null,
            details.visit_custody_details || null
          ]
        )
      } else if (type === 'direct') {
        await client.query(
          `UPDATE enf_direct_details 
           SET execution_location = $3, action_type = $4, work_description = $5 
           WHERE request_id = $1 AND company_id = $2`,
          [
            id,
            companyId,
            details.execution_location || null,
            details.action_type || null,
            details.work_description || null
          ]
        )
      }
    }

    // 3. Sync Parties
    if (parties !== undefined) {
      await client.query('DELETE FROM enf_request_parties WHERE request_id = $1 AND company_id = $2', [id, companyId])
      for (const p of parties) {
        await client.query(
          `INSERT INTO enf_request_parties (id, company_id, request_id, party_name, party_role, is_client, linked_entity_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            uuidv4(),
            companyId,
            id,
            p.party_name,
            p.party_role,
            p.is_client || 0,
            p.linked_entity_id || null
          ]
        )
      }
    }

    // 4. Sync Decisions
    if (decisions !== undefined) {
      await client.query('DELETE FROM enf_decisions WHERE request_id = $1 AND company_id = $2', [id, companyId])
      for (const d of decisions) {
        await client.query(
          `INSERT INTO enf_decisions (id, company_id, request_id, decision_type, decision_date, notes, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [uuidv4(), companyId, id, d.decision_type, d.decision_date, d.notes || null]
        )
      }
    }

    await client.query('COMMIT')
    res.json({ success: true })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[EnforcementRequests] Update error:', err)
    res.status(500).json({ error: 'Failed to update enforcement request' })
  } finally {
    client.release()
  }
})

// 5. Delete Request
enforcementRequestsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const id = req.params.id

    const result = await query(
      'DELETE FROM enforcement_requests WHERE id = $1 AND company_id = $2',
      [id, companyId]
    )
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Enforcement request not found' })
      return
    }
    res.json({ success: true })
  } catch (err) {
    console.error('[EnforcementRequests] Delete error:', err)
    res.status(500).json({ error: 'Failed to delete enforcement request' })
  }
})

// 6. Get Attachments
enforcementRequestsRouter.get('/:id/attachments', async (req: Request, res: Response) => {
  try {
    const companyId = getCompanyId(req)
    const requestId = req.params.id

    const result = await query(
      `SELECT ea.*, fa.original_name, fa.mime_type, fa.size_bytes, fa.stored_path
       FROM enf_attachments ea
       JOIN file_assets fa ON ea.asset_id = fa.id
       WHERE ea.request_id = $1 AND ea.company_id = $2
       ORDER BY ea.created_at DESC`,
      [requestId, companyId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('[EnforcementRequests] GetAttachments error:', err)
    res.status(500).json({ error: 'Failed to get attachments' })
  }
})

// 7. Add Attachments (Transaction)
enforcementRequestsRouter.post('/:id/attachments', async (req: Request, res: Response) => {
  const client = await getClient()
  try {
    const companyId = getCompanyId(req)
    const requestId = req.params.id
    const { assetIds = [], label } = req.body

    await client.query('BEGIN')

    for (const aid of assetIds) {
      await client.query(
        `INSERT INTO enf_attachments (id, company_id, request_id, asset_id, label, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [uuidv4(), companyId, requestId, aid, label || '']
      )
      await client.query(
        `UPDATE file_assets SET linked_entity_id = $1 WHERE id = $2 AND company_id = $3`,
        [requestId, aid, companyId]
      )
    }

    await client.query('COMMIT')
    res.json({ success: true })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('[EnforcementRequests] AddAttachments error:', err)
    res.status(500).json({ error: 'Failed to add attachments' })
  } finally {
    client.release()
  }
})
