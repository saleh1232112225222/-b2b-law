import { query } from '../db/connection'

export async function createEnforcementRequest(companyId: string, userId: string, data: any) {
  const { v4: uuidv4 } = require('uuid')
  const id = uuidv4()

  await query(
    `INSERT INTO enforcement_requests (id, company_id, request_no, case_id, client_id, request_type, instrument_no, najiz_request_no, instrument_type_main, instrument_type_sub, instrument_date, court_name, case_number, request_classification, status, created_by, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'draft',$15,NOW())`,
    [id, companyId, data.request_no, data.case_id || null, data.client_id || null,
     data.request_type, data.instrument_no || null, data.najiz_request_no || null,
     data.instrument_type_main || null, data.instrument_type_sub || null,
     data.instrument_date || null, data.court_name || null, data.case_number || null,
     data.request_classification || null, userId]
  )
  return id
}

export async function updateEnforcementRequest(id: string, companyId: string, data: any) {
  const fields: string[] = []
  const values: any[] = []
  let idx = 1

  for (const [key, val] of Object.entries(data)) {
    if (!['id', 'company_id', 'created_at', 'created_by'].includes(key)) {
      fields.push(`${key} = $${idx++}`)
      values.push(val)
    }
  }

  if (fields.length === 0) return false
  values.push(id, companyId)
  const result = await query(
    `UPDATE enforcement_requests SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} AND company_id = $${idx + 1}`,
    values
  )
  return (result.rowCount || 0) > 0
}
