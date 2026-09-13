import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import express from 'express'
import http from 'http'

// 1. Initialize in-memory PostgreSQL engine
const db = new PGlite()

// Helper query function routed to PGlite
async function pgliteQuery(sql: string, params?: any[]) {
  const res = await db.query(sql, params)
  return {
    rows: res.rows,
    rowCount: res.rows.length,
    command: '',
    oid: 0,
    fields: res.fields as any
  }
}

// 2. Setup DDL Schema in PGlite with production entities
async function setupSchema() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      trial_expires_at TEXT DEFAULT '2030-01-01'
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      username TEXT NOT NULL,
      full_name TEXT,
      role_key TEXT,
      employee_id TEXT
    );

    CREATE TABLE IF NOT EXISTS permissions (
      company_id TEXT NOT NULL,
      permission_key TEXT NOT NULL,
      permission_name TEXT NOT NULL,
      module_key TEXT NOT NULL,
      PRIMARY KEY (company_id, permission_key)
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      role_key TEXT NOT NULL,
      permission_key TEXT NOT NULL,
      UNIQUE (company_id, role_key, permission_key)
    );

    CREATE TABLE IF NOT EXISTS user_permissions (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      permission_key TEXT NOT NULL,
      is_allowed BOOLEAN NOT NULL DEFAULT TRUE,
      UNIQUE (company_id, user_id, permission_key)
    );

    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT
    );

    CREATE TABLE IF NOT EXISTS partners (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      employee_id TEXT,
      name TEXT NOT NULL,
      share_percentage NUMERIC(5,2) DEFAULT 0,
      role TEXT,
      is_active BOOLEAN DEFAULT true
    );

    CREATE TABLE IF NOT EXISTS partner_contributions (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      partner_id TEXT NOT NULL,
      engagement_id TEXT,
      case_id TEXT,
      contribution_type TEXT NOT NULL,
      description TEXT,
      amount NUMERIC(15,2) DEFAULT 0,
      contribution_date DATE DEFAULT CURRENT_DATE
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      id_number TEXT,
      nationality TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      case_number TEXT NOT NULL,
      subject TEXT,
      case_type TEXT,
      status TEXT,
      contract_amount NUMERIC(12,2) DEFAULT 0,
      client_id TEXT,
      client_name TEXT,
      responsible_user_id TEXT,
      client_role TEXT,
      opponent_name TEXT,
      court TEXT,
      registration_date DATE,
      is_archived BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS case_parties (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      case_id TEXT NOT NULL,
      name TEXT NOT NULL,
      party_type TEXT DEFAULT 'opponent',
      role TEXT,
      id_number TEXT,
      phone TEXT,
      nationality TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      case_id TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT,
      court_room TEXT,
      status TEXT DEFAULT 'مجدول',
      notes TEXT,
      result TEXT
    );

    CREATE TABLE IF NOT EXISTS tasks_v2 (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      case_id TEXT NOT NULL,
      title TEXT NOT NULL,
      due_date TEXT,
      priority TEXT DEFAULT 'متوسطة',
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS documents_v2 (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      case_id TEXT NOT NULL,
      title TEXT,
      name TEXT,
      file_name TEXT,
      file_path TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      entity_id TEXT,
      metadata_json TEXT,
      actor TEXT,
      details TEXT,
      timestamp TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS judgments (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      case_id TEXT NOT NULL,
      type TEXT,
      judgment_type TEXT,
      judgment_number TEXT,
      judgment_date TEXT,
      judgment_date_hijri TEXT,
      favor TEXT,
      objection_deadline TEXT,
      notes TEXT,
      is_executable BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS memoranda (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      case_id TEXT NOT NULL,
      memo_title TEXT NOT NULL,
      memo_date TEXT,
      memo_type TEXT,
      memo_status TEXT DEFAULT 'مسودة'
    );

    CREATE TABLE IF NOT EXISTS legal_service_types (
      id TEXT PRIMARY KEY,
      name_ar TEXT NOT NULL,
      name_en TEXT
    );

    CREATE TABLE IF NOT EXISTS legal_service_categories (
      id TEXT PRIMARY KEY,
      name_ar TEXT NOT NULL,
      name_en TEXT
    );

    CREATE TABLE IF NOT EXISTS legal_engagements (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      engagement_number TEXT NOT NULL,
      engagement_type_id TEXT,
      category_id TEXT,
      client_id TEXT,
      case_id TEXT,
      responsible_lawyer_id TEXT,
      start_date DATE,
      financial_compensation NUMERIC(12,2) DEFAULT 0,
      tax NUMERIC(12,2) DEFAULT 0,
      paid_amount NUMERIC(12,2) DEFAULT 0,
      late_fee_amount NUMERIC(12,2) DEFAULT 0,
      finance_status TEXT DEFAULT 'pending',
      payment_method TEXT,
      description TEXT,
      installment_count INTEGER DEFAULT 1,
      deleted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payment_schedules (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      legal_engagement_id TEXT NOT NULL,
      installment_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      due_date TEXT,
      paid_amount NUMERIC(12,2) DEFAULT 0,
      status TEXT DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS payment_history (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      legal_engagement_id TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      payment_method TEXT,
      received_at TIMESTAMPTZ DEFAULT NOW(),
      voucher_id TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      client_id TEXT,
      invoice_number TEXT NOT NULL,
      date TEXT,
      subtotal NUMERIC(12,2),
      tax_amount NUMERIC(12,2),
      total NUMERIC(12,2),
      status TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS vouchers (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      client_id TEXT,
      voucher_number TEXT NOT NULL,
      type TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      date DATE NOT NULL,
      notes TEXT,
      linked_transaction_id TEXT
    );

    CREATE TABLE IF NOT EXISTS finances (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      case_id TEXT,
      client_id TEXT,
      legal_engagement_id TEXT,
      type TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      total NUMERIC(12,2),
      amount_in NUMERIC(12,2),
      amount_out NUMERIC(12,2),
      date DATE NOT NULL,
      category TEXT,
      description TEXT,
      notes TEXT,
      payment_method TEXT,
      reference_id TEXT
    );

    CREATE TABLE IF NOT EXISTS office_expenses (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      expense_date DATE NOT NULL,
      paid_by TEXT,
      receipt_number TEXT
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      current_period_end TIMESTAMPTZ,
      trial_end TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS office_budgets (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      category TEXT NOT NULL,
      budgeted_amount NUMERIC(12,2) NOT NULL,
      actual_amount NUMERIC(12,2) DEFAULT 0
    );
  `)
}

// 3. Setup Express Server with mock DB connection
import { generateToken } from '../middleware/auth'
import * as dbConn from '../db/connection'
vi.spyOn(dbConn, 'query').mockImplementation(
  (sql: string, params?: any[]) => pgliteQuery(sql, params) as any
)

import { reportsRouter } from '../routes/reports'

describe('Reports Integration & Acceptance Blocker Verifications', () => {
  let server: http.Server
  let baseUrl: string

  const tenantA = '11111111-1111-4111-8111-111111111111'
  const tenantB = '22222222-2222-4222-8222-222222222222'

  let adminTokenA: string
  let lawyerCasesOnlyTokenA: string
  let lawyerFinancialTokenA: string
  let noPermTokenA: string
  let adminTokenB: string

  beforeAll(async () => {
    await setupSchema()

    adminTokenA = generateToken({
      companyId: tenantA,
      userId: 'user-admin-a',
      username: 'adminA',
      roleKey: 'admin'
    })
    lawyerCasesOnlyTokenA = generateToken({
      companyId: tenantA,
      userId: 'user-lawyer-a',
      username: 'lawyerA',
      roleKey: 'lawyer'
    })
    lawyerFinancialTokenA = generateToken({
      companyId: tenantA,
      userId: 'user-finance-a',
      username: 'finLawyerA',
      roleKey: 'lawyer'
    })
    noPermTokenA = generateToken({
      companyId: tenantA,
      userId: 'user-guest-a',
      username: 'guestA',
      roleKey: 'guest'
    })
    adminTokenB = generateToken({
      companyId: tenantB,
      userId: 'user-admin-b',
      username: 'adminB',
      roleKey: 'admin'
    })

    // User permissions:
    // lawyerA has ONLY view_cases
    await db.query(
      `INSERT INTO user_permissions (id, company_id, user_id, permission_key, is_allowed) VALUES
       ('p1', $1, 'user-lawyer-a', 'view_cases', true)`,
      [tenantA]
    )

    // finLawyerA has view_cases AND view_finances
    await db.query(
      `INSERT INTO user_permissions (id, company_id, user_id, permission_key, is_allowed) VALUES
       ('p2', $1, 'user-finance-a', 'view_cases', true),
       ('p3', $1, 'user-finance-a', 'view_finances', true)`,
      [tenantA]
    )

    // Seed companies
    await db.query(`INSERT INTO companies (id, name) VALUES ($1, 'Tenant A'), ($2, 'Tenant B')`, [
      tenantA,
      tenantB
    ])

    // Seed users
    await db.query(
      `INSERT INTO users (id, company_id, username, full_name, role_key) VALUES
       ('user-admin-a', $1, 'adminA', 'Admin Tenant A', 'admin'),
       ('user-lawyer-a', $1, 'lawyerA', 'محامي قضايا فقط', 'lawyer'),
       ('user-finance-a', $1, 'finLawyerA', 'محامي مع صلاحية مالية', 'lawyer'),
       ('user-admin-b', $2, 'adminB', 'محامي شركة باء', 'admin')`,
      [tenantA, tenantB]
    )

    // Start Express app on ephemeral port
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
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  // ═══════════════════════════════════════════════════════════════
  // BLOCKER 1 & 6: صلاحيات تقرير القضية والتحقق من المعرف
  // ═══════════════════════════════════════════════════════════════
  describe('Blocker 1 & 6: Case Report Permissions and UUID Validation (/reports/case)', () => {
    const caseId = '33333333-3333-4333-8333-333333333333'

    beforeAll(async () => {
      await db.query(
        `INSERT INTO cases (id, company_id, case_number, subject, status) VALUES
         ($1, $2, 'CASE-100', 'موضوع الدعوى', 'قيد النظر')`,
        [caseId, tenantA]
      )
      await db.query(
        `INSERT INTO case_parties (id, company_id, case_id, name, role) VALUES
         ('cp-1', $1, $2, 'الموكل الرئيسي', 'مدعي')`,
        [tenantA, caseId]
      )
      await db.query(
        `INSERT INTO finances (id, company_id, case_id, type, amount, total, date) VALUES
         ('fin-1', $1, $2, 'قبض أتعاب', 8000, 8000, '2026-04-01'),
         ('fin-2', $1, $2, 'صرف رسوم محكمة', 3000, 3000, '2026-04-02')`,
        [tenantA, caseId]
      )
    })

    it('returns 400 Bad Request for missing caseId or invalid non-UUID', async () => {
      const resMissing = await fetch(`${baseUrl}/reports/case`, {
        headers: { Authorization: `Bearer ${adminTokenA}` }
      })
      expect(resMissing.status).toBe(400)

      const resInvalid = await fetch(`${baseUrl}/reports/case?caseId=invalid-not-uuid`, {
        headers: { Authorization: `Bearer ${adminTokenA}` }
      })
      expect(resInvalid.status).toBe(400)
      const data = await resInvalid.json()
      expect(data.error).toContain('معرف القضية غير صالح')
    })

    it('allows user with view_cases only to view case but REDACTS financial KPIs and movements', async () => {
      const res = await fetch(`${baseUrl}/reports/case?caseId=${caseId}`, {
        headers: { Authorization: `Bearer ${lawyerCasesOnlyTokenA}` }
      })
      expect(res.status).toBe(200)
      const data = await res.json()

      // Case info and parties are visible
      expect(data.case.case_number).toBe('CASE-100')
      expect(data.case.parties).toHaveLength(1)

      // Financial KPIs must be strictly REDACTED: hasFinancialAccess = false, numbers = null
      expect(data.kpis.hasFinancialAccess).toBe(false)
      expect(data.kpis.totalIn).toBeNull()
      expect(data.kpis.totalOut).toBeNull()
      expect(data.kpis.totalExpenses).toBeNull()
      expect(data.kpis.balance).toBeNull()
    })

    it('reveals financial calculations to users with view_finances or export_reports', async () => {
      const res = await fetch(`${baseUrl}/reports/case?caseId=${caseId}`, {
        headers: { Authorization: `Bearer ${lawyerFinancialTokenA}` }
      })
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.kpis.hasFinancialAccess).toBe(true)
      expect(data.kpis.totalIn).toBe(8000)
      expect(data.kpis.totalOut).toBe(3000)
      expect(data.kpis.balance).toBe(5000)
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // BLOCKER 2, 3 & 5: كشف حساب الموكل، دمج المصادر، حساب القضايا، وعزل المستأجر
  // ═══════════════════════════════════════════════════════════════
  describe('Blocker 2 & 3: Client Financial Report Row-Level Merge & Case Balances (/reports/client-financial/:clientId)', () => {
    const clientId = '44444444-4444-4444-8444-444444444444'
    const caseId = '55555555-5555-4555-8555-555555555555'
    const engId = '66666666-6666-4666-8666-666666666666'

    beforeAll(async () => {
      await db.query(
        `INSERT INTO clients (id, company_id, name, phone) VALUES ($1, $2, 'مؤسسة النور', '0555555555')`,
        [clientId, tenantA]
      )
      // Case with 10,000 contract fee
      await db.query(
        `INSERT INTO cases (id, company_id, client_id, case_number, contract_amount) VALUES
         ($1, $2, $3, 'CASE-FEE-1', 10000)`,
        [caseId, tenantA, clientId]
      )
      // Legal engagement linked to case
      await db.query(
        `INSERT INTO legal_engagements (id, company_id, client_id, case_id, engagement_number, financial_compensation) VALUES
         ($1, $2, $3, $4, 'ENG-LINKED', 10000)`,
        [engId, tenantA, clientId, caseId]
      )

      // Payment in payment_history linked to engagement & case (amount: 4000)
      await db.query(
        `INSERT INTO payment_history (id, company_id, legal_engagement_id, amount, voucher_id, received_at) VALUES
         ('ph-1', $1, $2, 4000, 'v-100', '2026-05-01')`,
        [tenantA, engId]
      )

      // Duplicate payment in finances with same voucher reference (should be deduplicated)
      await db.query(
        `INSERT INTO finances (id, company_id, legal_engagement_id, case_id, type, amount, total, reference_id, date) VALUES
         ('fin-dup', $1, $2, $3, 'قبض أتعاب', 4000, 4000, 'v-100', '2026-05-01')`,
        [tenantA, engId, caseId]
      )

      // Distinct independent payment in finances for the case (amount: 3000, non-overlapping)
      await db.query(
        `INSERT INTO finances (id, company_id, client_id, case_id, type, amount, total, date) VALUES
         ('fin-unique', $1, $2, $3, 'قبض إيراد استشارة قضية', 3000, 3000, '2026-05-15')`,
        [tenantA, clientId, caseId]
      )
    })

    it('returns 400 Bad Request for invalid non-UUID clientId', async () => {
      const res = await fetch(`${baseUrl}/reports/client-financial/invalid-client-uuid`, {
        headers: { Authorization: `Bearer ${adminTokenA}` }
      })
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toContain('معرف العميل غير صالح')
    })

    it('merges payment_history and finances without dropping either, prevents duplicates, and calculates true case balances', async () => {
      const res = await fetch(`${baseUrl}/reports/client-financial/${clientId}`, {
        headers: { Authorization: `Bearer ${adminTokenA}` }
      })
      expect(res.status).toBe(200)
      const data = await res.json()

      // Merged payments: ph-1 (4000) and fin-unique (3000). fin-dup is deduplicated!
      expect(data.payments).toHaveLength(2)
      const amounts = data.payments.map((p: any) => p.amount).sort((a: number, b: number) => a - b)
      expect(amounts).toEqual([3000, 4000])

      // Case paid_amount and remaining calculation:
      // Total collected for this case = 4000 + 3000 = 7000.
      // Contract amount = 10000. Remaining = 3000 (NOT paid_amount: 0 and remaining: 10000!)
      const targetCase = data.cases.find((c: any) => c.id === caseId)
      expect(targetCase).toBeDefined()
      expect(targetCase.paid_amount).toBe(7000)
      expect(targetCase.remaining).toBe(3000)
    })

    it('enforces tenant isolation: Tenant B cannot access Tenant A client statement', async () => {
      const res = await fetch(`${baseUrl}/reports/client-financial/${clientId}`, {
        headers: { Authorization: `Bearer ${adminTokenB}` }
      })
      expect(res.status).toBe(404)
    })
  })

  // ═══════════════════════════════════════════════════════════════
  // BLOCKER 4 & 6 & 8: ميزانية وأعمال الشركاء، اتساق المصروفات، والتحقق من month/year
  // ═══════════════════════════════════════════════════════════════
  describe('Blocker 4 & 6: Partners Budget & Expense Consistency (/reports/partner-budget)', () => {
    const partnerId = '77777777-7777-4777-8777-777777777777'
    const empPartnerId = '88888888-8888-4888-8888-888888888888'
    const empNonPartnerId = '99999999-9999-4999-8999-999999999999'

    beforeAll(async () => {
      const month = 6
      const year = 2026

      // Employees
      await db.query(
        `INSERT INTO employees (id, company_id, name, role) VALUES
         ($1, $3, 'المحامي الشريك', 'partner'),
         ($2, $3, 'محامي موظف عادي', 'lawyer')`,
        [empPartnerId, empNonPartnerId, tenantA]
      )

      // Actual Partner record
      await db.query(
        `INSERT INTO partners (id, company_id, employee_id, name, share_percentage, role, is_active) VALUES
         ($1, $2, $3, 'المحامي الشريك', 40, 'Managing Partner', true)`,
        [partnerId, tenantA, empPartnerId]
      )

      // Engagement handled by the partner employee (paid_amount: 15000)
      await db.query(
        `INSERT INTO legal_engagements (id, company_id, engagement_number, responsible_lawyer_id, start_date, financial_compensation, paid_amount) VALUES
         ('eng-p1', $1, 'ENG-P1', $2, '2026-06-05', 20000, 15000)`,
        [tenantA, empPartnerId]
      )

      // Engagement handled by non-partner employee (paid_amount: 5000)
      await db.query(
        `INSERT INTO legal_engagements (id, company_id, engagement_number, responsible_lawyer_id, start_date, financial_compensation, paid_amount) VALUES
         ('eng-np1', $1, 'ENG-NP1', $2, '2026-06-08', 10000, 5000)`,
        [tenantA, empNonPartnerId]
      )

      // Direct contribution for the partner
      await db.query(
        `INSERT INTO partner_contributions (id, company_id, partner_id, contribution_type, amount, contribution_date) VALUES
         ('pc-1', $1, $2, 'مساهمة استقطاب عميل', 5000, '2026-06-12')`,
        [tenantA, partnerId]
      )

      // Expenses from office_expenses (Category A: 6000)
      await db.query(
        `INSERT INTO office_expenses (id, company_id, category, description, amount, expense_date) VALUES
         ('oe-1', $1, 'إيجار وضيافة', 'إيجار شهر 6', 6000, '2026-06-01')`,
        [tenantA]
      )

      // Expenses from finances (Category B: 4000 non-overlapping)
      await db.query(
        `INSERT INTO finances (id, company_id, category, type, amount, total, date) VALUES
         ('fin-exp-1', $1, 'رسوم حكومية', 'صرف رسوم توثيق', 4000, 4000, '2026-06-03')`,
        [tenantA]
      )

      // Budget for Category A (8000) and Category C with 0 actual expenses (3000)
      await db.query(
        `INSERT INTO office_budgets (id, company_id, month, year, category, budgeted_amount) VALUES
         ('ob-1', $1, $2, $3, 'إيجار وضيافة', 8000),
         ('ob-2', $1, $2, $3, 'تسويق وإعلان', 3000)`,
        [tenantA, month, year]
      )
    })

    it('returns 400 Bad Request for invalid month (0, 13, text) or invalid year', async () => {
      const r0 = await fetch(`${baseUrl}/reports/partner-budget?month=0&year=2026`, {
        headers: { Authorization: `Bearer ${adminTokenA}` }
      })
      expect(r0.status).toBe(400)

      const r13 = await fetch(`${baseUrl}/reports/partner-budget?month=13&year=2026`, {
        headers: { Authorization: `Bearer ${adminTokenA}` }
      })
      expect(r13.status).toBe(400)

      const rText = await fetch(`${baseUrl}/reports/partner-budget?month=abc&year=2026`, {
        headers: { Authorization: `Bearer ${adminTokenA}` }
      })
      expect(rText.status).toBe(400)

      const rYear = await fetch(`${baseUrl}/reports/partner-budget?month=6&year=1800`, {
        headers: { Authorization: `Bearer ${adminTokenA}` }
      })
      expect(rYear.status).toBe(400)
    })

    it('strictly guarantees that sum of categoriesStats actual_amount EQUALS total expense', async () => {
      const res = await fetch(`${baseUrl}/reports/partner-budget?month=6&year=2026`, {
        headers: { Authorization: `Bearer ${adminTokenA}` }
      })
      expect(res.status).toBe(200)
      const data = await res.json()

      // Total expense must be 6000 (office_expenses) + 4000 (finances) = 10000
      expect(data.expense).toBe(10000)

      // Sum of categoriesStats must match data.expense exactly
      const sumCategories = data.categoriesStats.reduce(
        (sum: number, c: any) => sum + c.actual_amount,
        0
      )
      expect(sumCategories).toBe(data.expense)
      expect(sumCategories).toBe(10000)

      // Category with 0 expense ('تسويق وإعلان') must be present with actual_amount = 0 and its budget_limit
      const emptyCat = data.categoriesStats.find((c: any) => c.category_name === 'تسويق وإعلان')
      expect(emptyCat).toBeDefined()
      expect(emptyCat.actual_amount).toBe(0)
      expect(emptyCat.budget_limit).toBe(3000)
    })

    it('strictly uses partners table and excludes non-partner lawyers and admins from lawyer_contributions', async () => {
      const res = await fetch(`${baseUrl}/reports/partner-budget?month=6&year=2026`, {
        headers: { Authorization: `Bearer ${adminTokenA}` }
      })
      expect(res.status).toBe(200)
      const data = await res.json()

      // Only the real partner must appear! Non-partner lawyer and admin are NOT partners!
      expect(data.lawyer_contributions).toHaveLength(1)
      const partnerEntry = data.lawyer_contributions[0]
      expect(partnerEntry.lawyer_name).toBe('المحامي الشريك')
      // Collected: 15000 from engagement + 5000 from partner_contributions = 20000
      expect(partnerEntry.collected_amount).toBe(20000)
      expect(partnerEntry.works_count).toBe(2) // 1 engagement + 1 contribution
    })
  })
})
