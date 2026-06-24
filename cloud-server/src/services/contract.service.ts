import { query, getClient } from '../db/connection'

export async function createContract(companyId: string, userId: string, data: any) {
  const { v4: uuidv4 } = require('uuid')
  const client = await getClient()

  try {
    await client.query('BEGIN')

    const contractId = uuidv4()
    const now = new Date().toISOString()

    const contractSql = `INSERT INTO contracts (id, company_id, contract_type, status, title, case_id, client_id, employee_user_id, contract_date, start_date, end_date, is_fixed_term, term_years, total_amount, salary_amount, salary_due_day, text_content, created_by, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$19)`

    await client.query(contractSql, [
      contractId,
      companyId,
      data.contract_type,
      'draft',
      data.title,
      data.case_id || null,
      data.client_id || null,
      data.employee_user_id || null,
      data.contract_date || null,
      data.start_date || null,
      data.end_date || null,
      data.is_fixed_term || false,
      data.term_years || null,
      data.total_amount || 0,
      data.salary_amount || 0,
      data.salary_due_day || null,
      data.text_content || '',
      userId,
      now
    ])

    if (data.contract_type === 'fee_agreement' || data.contract_type === 'employment') {
      const ensureParty = async (
        partyTypeKey: string,
        displayName: string,
        refFields: Record<string, string>
      ) => {
        const partyId = uuidv4()
        const pk = partyTypeKey
        await client.query(
          `INSERT INTO contract_parties (id, company_id, party_type_key, ${Object.keys(refFields).join(',')}, display_name, created_at, updated_at)
           VALUES ($1,$2,$3,${Object.values(refFields)
             .map((_, i) => `$${i + 4}`)
             .join(',')},$4,$5,$5)`,
          [partyId, companyId, pk, displayName, now, ...Object.values(refFields)]
        )
        const participantId = uuidv4()
        await client.query(
          `INSERT INTO contract_participants (id, company_id, contract_id, party_id, role_key, side_key, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            participantId,
            companyId,
            contractId,
            partyId,
            partyTypeKey === 'office'
              ? 'law_firm'
              : partyTypeKey === 'client'
                ? 'client'
                : 'employee',
            partyTypeKey === 'client' ? 'first' : 'second',
            now
          ]
        )
        return partyId
      }

      await ensureParty('office', 'المكتب', {})
      if (data.client_id) {
        const clientRes = await client.query('SELECT name FROM clients WHERE id = $1', [
          data.client_id
        ])
        if (clientRes.rows[0]) {
          await ensureParty('client', clientRes.rows[0].name, { client_id: data.client_id })
        }
      }
    }

    await client.query('COMMIT')
    return contractId
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
