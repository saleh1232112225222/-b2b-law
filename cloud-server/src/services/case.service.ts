import { query, getClient } from '../db/connection'

export async function getDashboardAnalytics(companyId: string) {
  const countRes = await query(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN status IN ('مغلقة', 'مؤرشفة') OR is_archived = TRUE THEN 1 ELSE 0 END) AS done,
            SUM(CASE WHEN status = 'تحت الدراسة' THEN 1 ELSE 0 END) AS review,
            SUM(CASE WHEN registration_date IS NOT NULL AND registration_date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 ELSE 0 END) AS new,
            SUM(CASE WHEN registration_date IS NOT NULL AND registration_date < CURRENT_DATE - INTERVAL '30 days' AND (status NOT IN ('مغلقة', 'مؤرشفة') OR is_archived = FALSE) THEN 1 ELSE 0 END) AS court
     FROM cases WHERE company_id = $1`,
    [companyId]
  )

  const trendRes = await query(
    `SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*) AS count
     FROM cases WHERE company_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '6 months'
     GROUP BY month ORDER BY month`,
    [companyId]
  )

  const avgRes = await query(
    `SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) AS avg_days
     FROM cases WHERE company_id = $1 AND status IN ('مغلقة', 'مؤرشفة') AND created_at IS NOT NULL`,
    [companyId]
  )

  const { total, done, review, new: newCases, court } = countRes.rows[0]
  return {
    total: parseInt(total) || 0,
    buckets: {
      new: parseInt(newCases) || 0,
      review: parseInt(review) || 0,
      court: parseInt(court) || 0,
      done: parseInt(done) || 0
    },
    trend: trendRes.rows,
    avgCloseDays: Math.round(parseFloat(avgRes.rows[0]?.avg_days) || 0)
  }
}

export async function getCaseCount(companyId: string, filters: Record<string, any> = {}) {
  const conditions = ['company_id = $1']
  const params: any[] = [companyId]
  let idx = 2

  if (filters.status && filters.status !== 'الكل') {
    conditions.push(`status = $${idx++}`)
    params.push(filters.status)
  }
  if (filters.priority && filters.priority !== 'الكل') {
    conditions.push(`priority = $${idx++}`)
    params.push(filters.priority)
  }
  if (filters.responsible_user_id) {
    conditions.push(`responsible_user_id = $${idx++}`)
    params.push(filters.responsible_user_id)
  }
  if (filters.q) {
    params.push(`%${filters.q}%`)
    params.push(`%${filters.q}%`)
    params.push(`%${filters.q}%`)
    conditions.push(
      `(LOWER(case_number) LIKE LOWER($${idx++}) OR LOWER(subject) LIKE LOWER($${idx++}) OR LOWER(client_name) LIKE LOWER($${idx++}))`
    )
  }

  const result = await query(`SELECT COUNT(*) FROM cases WHERE ${conditions.join(' AND ')}`, params)
  return parseInt(result.rows[0].count) || 0
}

export async function checkUniqueCaseNumber(
  companyId: string,
  caseNumber: string,
  excludeId?: string
) {
  const params: any[] = [companyId, caseNumber]
  let sql = 'SELECT COUNT(*) FROM cases WHERE company_id = $1 AND case_number = $2'
  if (excludeId) {
    sql += ' AND id != $3'
    params.push(excludeId)
  }
  const result = await query(sql, params)
  return parseInt(result.rows[0].count) === 0
}

export async function searchCases(companyId: string, searchQuery: string) {
  const result = await query(
    `SELECT * FROM cases WHERE company_id = $1 AND (LOWER(case_number) LIKE LOWER($2) OR LOWER(subject) LIKE LOWER($2) OR LOWER(opponent_name) LIKE LOWER($2)) ORDER BY created_at DESC LIMIT 20`,
    [companyId, `%${searchQuery}%`]
  )
  return result.rows
}

export async function createCase(companyId: string, userId: string, data: any) {
  const { v4: uuidv4 } = require('uuid')
  const { parties, ...caseData } = data
  caseData.id = uuidv4()
  caseData.company_id = companyId
  caseData.created_by = userId
  caseData.created_at = new Date().toISOString()

  const keys = Object.keys(caseData)
  const values = Object.values(caseData)
  const placeholders = values.map((_, i) => `$${i + 1}`).join(', ')
  const columns = keys.join(', ')

  await query(`INSERT INTO cases (${columns}) VALUES (${placeholders})`, values)

  if (parties?.length > 0) {
    for (const party of parties) {
      const partyId = uuidv4()
      await query(
        `INSERT INTO case_parties (id, company_id, case_id, party_type, client_id, defendant_id, name, phone, role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          partyId,
          companyId,
          caseData.id,
          party.party_type,
          party.client_id || null,
          party.defendant_id || null,
          party.name || '',
          party.phone || '',
          party.role || ''
        ]
      )
    }
  }

  return data.id
}
