import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Pool } from 'pg'
import express from 'express'
import http from 'http'
import { generateToken } from '../middleware/auth'
import { reportsRouter } from '../routes/reports'

describe('Reports Integration Against Real Docker PostgreSQL Database', () => {
  let pool: Pool
  let server: http.Server
  let baseUrl: string

  const testCompanyId = 'baaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa'
  const otherCompanyId = 'bbbbbbbb-2222-4bbb-8bbb-bbbbbbbbbbbb'
  const adminUserId = 'caaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa'
  const lawyerCasesUserId = 'daaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa'
  const lawyerEmployeeId = 'eaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa'
  const partnerId = 'faaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa'
  const clientId = '1aaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa'
  const caseId = '2aaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa'
  const engagementId = '3aaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa'
  const paymentHistoryId = '4aaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa'
  const financeIncomeId = '5aaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa'
  const financeExpenseId = '6aaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa'
  const officeExpenseId = '7aaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa'
  const budgetId = '8aaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa'
  const contribId = '9aaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa'

  let adminToken: string
  let lawyerCasesOnlyToken: string
  let otherTenantToken: string

  beforeAll(async () => {
    pool = new Pool({
      connectionString: 'postgresql://b2b_law:b2b_law_pass@127.0.0.1:5433/b2b_law_db'
    })

    // Clean up any leftovers
    const cleanAll = async () => {
      await pool
        .query(`DELETE FROM partner_contributions WHERE company_id IN ($1, $2)`, [
          testCompanyId,
          otherCompanyId
        ])
        .catch(() => {})
      await pool
        .query(`DELETE FROM payment_history WHERE company_id IN ($1, $2)`, [
          testCompanyId,
          otherCompanyId
        ])
        .catch(() => {})
      await pool
        .query(`DELETE FROM finances WHERE company_id IN ($1, $2)`, [testCompanyId, otherCompanyId])
        .catch(() => {})
      await pool
        .query(`DELETE FROM office_expenses WHERE company_id IN ($1, $2)`, [
          testCompanyId,
          otherCompanyId
        ])
        .catch(() => {})
      await pool
        .query(`DELETE FROM office_budgets WHERE company_id IN ($1, $2)`, [
          testCompanyId,
          otherCompanyId
        ])
        .catch(() => {})
      await pool
        .query(`DELETE FROM legal_engagements WHERE company_id IN ($1, $2)`, [
          testCompanyId,
          otherCompanyId
        ])
        .catch(() => {})
      await pool
        .query(`DELETE FROM cases WHERE company_id IN ($1, $2)`, [testCompanyId, otherCompanyId])
        .catch(() => {})
      await pool
        .query(`DELETE FROM clients WHERE company_id IN ($1, $2)`, [testCompanyId, otherCompanyId])
        .catch(() => {})
      await pool
        .query(`DELETE FROM partners WHERE company_id IN ($1, $2)`, [testCompanyId, otherCompanyId])
        .catch(() => {})
      await pool
        .query(`DELETE FROM employees WHERE company_id IN ($1, $2)`, [
          testCompanyId,
          otherCompanyId
        ])
        .catch(() => {})
      await pool
        .query(`DELETE FROM role_permissions WHERE company_id IN ($1, $2)`, [
          testCompanyId,
          otherCompanyId
        ])
        .catch(() => {})
      await pool
        .query(`DELETE FROM permissions WHERE company_id IN ($1, $2)`, [
          testCompanyId,
          otherCompanyId
        ])
        .catch(() => {})
      await pool
        .query(`DELETE FROM users WHERE company_id IN ($1, $2)`, [testCompanyId, otherCompanyId])
        .catch(() => {})
      await pool
        .query(`DELETE FROM companies WHERE id IN ($1, $2)`, [testCompanyId, otherCompanyId])
        .catch(() => {})
    }

    await cleanAll()

    // Seed companies
    await pool.query(
      `INSERT INTO companies (id, name, trial_expires_at) VALUES
       ($1, 'Test Law Firm Real PG', NOW() + INTERVAL '30 days'),
       ($2, 'Other Law Firm Real PG', NOW() + INTERVAL '30 days')`,
      [testCompanyId, otherCompanyId]
    )

    // Seed permissions for test company
    await pool.query(
      `INSERT INTO permissions (company_id, permission_key, permission_name, module_key) VALUES
       ($1, 'view_cases', 'عرض القضايا', 'cases'),
       ($1, 'view_finances', 'عرض المالية', 'finances'),
       ($1, 'export_reports', 'تصدير التقارير', 'reports')
       ON CONFLICT DO NOTHING`,
      [testCompanyId]
    )

    // Seed role_permissions
    await pool.query(
      `INSERT INTO role_permissions (id, company_id, role_key, permission_key) VALUES
       (gen_random_uuid(), $1, 'lawyer', 'view_cases')
       ON CONFLICT DO NOTHING`,
      [testCompanyId]
    )

    // Seed users
    await pool.query(
      `INSERT INTO users (id, company_id, username, full_name, role_key) VALUES
       ($1, $2, 'realAdmin', 'المدير العام', 'admin'),
       ($3, $2, 'realLawyer', 'محامي قضايا فقط', 'lawyer')`,
      [adminUserId, testCompanyId, lawyerCasesUserId]
    )

    // Seed explicit user_permission so lawyer has view_cases permission
    await pool.query(
      `INSERT INTO user_permissions (id, company_id, user_id, permission_key, is_allowed) VALUES
       (gen_random_uuid(), $1, $2, 'view_cases', true)`,
      [testCompanyId, lawyerCasesUserId]
    )

    adminToken = generateToken({
      companyId: testCompanyId,
      userId: adminUserId,
      username: 'realAdmin',
      roleKey: 'admin'
    })

    lawyerCasesOnlyToken = generateToken({
      companyId: testCompanyId,
      userId: lawyerCasesUserId,
      username: 'realLawyer',
      roleKey: 'lawyer'
    })

    otherTenantToken = generateToken({
      companyId: otherCompanyId,
      userId: '33333333-9999-4999-8999-999999999999',
      username: 'otherTenant',
      roleKey: 'admin'
    })

    // Seed employee
    await pool.query(
      `INSERT INTO employees (id, company_id, name, job_title, role_type) VALUES
       ($1, $2, 'الأستاذ الشريك المؤسس', 'Partner', 'lawyer')`,
      [lawyerEmployeeId, testCompanyId]
    )

    // Seed partner
    await pool.query(
      `INSERT INTO partners (id, company_id, employee_id, name, share_percentage, role, is_active) VALUES
       ($1, $2, $3, 'الأستاذ الشريك المؤسس', 50.00, 'Senior Partner', true)`,
      [partnerId, testCompanyId, lawyerEmployeeId]
    )

    // Seed client
    await pool.query(
      `INSERT INTO clients (id, company_id, name, phone, id_number) VALUES
       ($1, $2, 'شركة التطوير العقاري الكبرى', '0501112233', '7001234567')`,
      [clientId, testCompanyId]
    )

    // Seed case
    await pool.query(
      `INSERT INTO cases (id, company_id, client_id, case_number, subject, contract_amount, status) VALUES
       ($1, $2, $3, 'CASE-PG-101', 'دعوى استرداد حيازة', 20000.00, 'قيد النظر')`,
      [caseId, testCompanyId, clientId]
    )

    // Fetch actual foreign key IDs for engagement
    const typeRow = (await pool.query('SELECT id FROM legal_service_types LIMIT 1')).rows[0]
    const catRow = (await pool.query('SELECT id FROM legal_service_categories LIMIT 1')).rows[0]
    const statusRow = (await pool.query('SELECT id FROM legal_service_statuses LIMIT 1')).rows[0]
    const priorityRow = (await pool.query('SELECT id FROM legal_service_priorities LIMIT 1'))
      .rows[0]

    // Seed legal engagement
    await pool.query(
      `INSERT INTO legal_engagements (
        id, company_id, client_id, case_id, engagement_number, engagement_type_id, category_id,
        status_id, priority_id, responsible_lawyer_id, financial_compensation, tax, paid_amount, start_date
       ) VALUES (
        $1, $2, $3, $4, 'ENG-PG-2026-001', $5, $6,
        $7, $8, $9, 20000.00, 3000.00, 10000.00, '2026-06-01'
       )`,
      [
        engagementId,
        testCompanyId,
        clientId,
        caseId,
        typeRow?.id || 'type_8y4q48nl',
        catRow?.id || 'cat_6ped9gu4',
        statusRow?.id || 'status_pending',
        priorityRow?.id || 'priority_high',
        lawyerEmployeeId
      ]
    )

    // Seed payment_history
    await pool.query(
      `INSERT INTO payment_history (id, company_id, legal_engagement_id, amount, payment_method, received_at, notes) VALUES
       ($1, $2, $3, 10000.00, 'bank_transfer', '2026-06-05', 'الدفعة الأولى بحساب المؤسسة')`,
      [paymentHistoryId, testCompanyId, engagementId]
    )

    // Seed finances income for the case
    await pool.query(
      `INSERT INTO finances (id, company_id, client_id, case_id, type, amount, total, date, description) VALUES
       ($1, $2, $3, $4, 'قبض أتعاب إضافية', 5000.00, 5000.00, '2026-06-10', 'سند إضافي')`,
      [financeIncomeId, testCompanyId, clientId, caseId]
    )

    // Seed partner direct contribution
    await pool.query(
      `INSERT INTO partner_contributions (id, company_id, partner_id, engagement_id, case_id, contribution_type, amount, contribution_date) VALUES
       ($1, $2, $3, $4, $5, 'استقطاب صفقة عقارية', 7000.00, '2026-06-15')`,
      [contribId, testCompanyId, partnerId, engagementId, caseId]
    )

    // Seed office expenses and finances expenses
    await pool.query(
      `INSERT INTO office_expenses (id, company_id, category, description, amount, expense_date) VALUES
       ($1, $2, 'إيجار المقر', 'إيجار شهر يونيو', 10000.00, '2026-06-01')`,
      [officeExpenseId, testCompanyId]
    )

    await pool.query(
      `INSERT INTO finances (id, company_id, category, type, amount, total, date, description) VALUES
       ($1, $2, 'مصروفات تشغيلية', 'صرف رسوم نشر وإعلان', 2500.00, 2500.00, '2026-06-03', 'رسوم نشر')`,
      [financeExpenseId, testCompanyId]
    )

    // Seed office budgets
    await pool.query(
      `INSERT INTO office_budgets (id, company_id, month, year, category, budgeted_amount) VALUES
       ($1, $2, 6, 2026, 'إيجار المقر', 12000.00)`,
      [budgetId, testCompanyId]
    )

    // Start Express server
    const app = express()
    app.use(express.json())
    app.use('/reports', reportsRouter)

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any
        baseUrl = `http://127.0.0.1:${addr.port}`
        resolve()
      })
    })
  })

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
    if (pool) {
      await pool
        .query('DELETE FROM companies WHERE id IN ($1, $2)', [testCompanyId, otherCompanyId])
        .catch(() => {})
      await pool.end()
    }
  })

  it('1. /reports/case: Redacts financial metrics from view_cases-only users against real PostgreSQL', async () => {
    const res = await fetch(`${baseUrl}/reports/case?caseId=${caseId}`, {
      headers: { Authorization: `Bearer ${lawyerCasesOnlyToken}` }
    })
    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data.case.id).toBe(caseId)
    expect(data.case.case_number).toBe('CASE-PG-101')
    expect(data.kpis.hasFinancialAccess).toBe(false)
    expect(data.kpis.totalIn).toBeNull()
    expect(data.kpis.balance).toBeNull()
  })

  it('2. /reports/case: Returns accurate financial metrics to admin users against real PostgreSQL', async () => {
    const res = await fetch(`${baseUrl}/reports/case?caseId=${caseId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    })
    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data.kpis.hasFinancialAccess).toBe(true)
    expect(data.kpis.totalIn).toBe(5000)
    expect(data.kpis.balance).toBe(5000)
  })

  it('3. /reports/client-financial/:clientId: Merges sources and calculates case balances in real PostgreSQL', async () => {
    const res = await fetch(`${baseUrl}/reports/client-financial/${clientId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    })
    expect(res.status).toBe(200)
    const data = await res.json()

    expect(data.client.id).toBe(clientId)
    expect(data.client.name).toBe('شركة التطوير العقاري الكبرى')

    // Merged payments (10000 from payment_history + 5000 from finances) = 2 records
    expect(data.payments).toHaveLength(2)
    const totalPayments = data.payments.reduce((s: number, p: any) => s + Number(p.amount), 0)
    expect(totalPayments).toBe(15000)

    // Case balance: contract 20000 - collected 15000 = remaining 5000
    const c = data.cases[0]
    expect(c.paid_amount).toBe(15000)
    expect(c.remaining).toBe(5000)
  })

  it('4. /reports/partner-budget: Strictly uses partners table and matches category sum to expense in real PostgreSQL', async () => {
    const res = await fetch(`${baseUrl}/reports/partner-budget?month=6&year=2026`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    })
    expect(res.status).toBe(200)
    const data = await res.json()

    // Total expense = 10000 (office_expenses) + 2500 (finances) = 12500
    expect(data.expense).toBe(12500)
    const catSum = data.categoriesStats.reduce(
      (s: number, cat: any) => s + Number(cat.actual_amount),
      0
    )
    expect(catSum).toBe(data.expense)
    expect(catSum).toBe(12500)

    // Partner contributions: only partner appears
    expect(data.lawyer_contributions).toHaveLength(1)
    const p = data.lawyer_contributions[0]
    expect(p.lawyer_name).toBe('الأستاذ الشريك المؤسس')
    // Collected = 10000 (engagement) + 7000 (partner_contributions) = 17000
    expect(p.collected_amount).toBe(17000)
  })

  it('5. Tenant isolation: Other company receives 0 data and 404 for another tenant client', async () => {
    const res = await fetch(`${baseUrl}/reports/client-financial/${clientId}`, {
      headers: { Authorization: `Bearer ${otherTenantToken}` }
    })
    expect(res.status).toBe(404)
  })
})
