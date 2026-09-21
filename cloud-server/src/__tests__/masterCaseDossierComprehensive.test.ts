import { describe, it, expect, beforeAll, vi } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { buildCanonicalCaseDossier, renderMasterCaseDossierHtml } from '../services/caseDossierService'

const db = new PGlite()

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

vi.mock('../db/connection', () => ({
  query: (sql: string, params?: any[]) => pgliteQuery(sql, params)
}))

describe('Master Case Executive Dossier - Comprehensive End-to-End Verification (All 10 Scenarios)', () => {
  const companyId = 'baaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa'
  const richCaseId = '2aaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa'
  const partialCaseId = '2bbbbbbb-1111-4aaa-8aaa-aaaaaaaaaaaa'
  const noJudgmentCaseId = '2ccccccc-1111-4aaa-8aaa-aaaaaaaaaaaa'
  const judgmentObjectionCaseId = '2ddddddd-1111-4aaa-8aaa-aaaaaaaaaaaa'
  const enforcementCaseId = '2eeeeeee-1111-4aaa-8aaa-aaaaaaaaaaaa'
  const clientId = '1aaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa'

  beforeAll(async () => {
    // 1. Create all necessary tables
    await db.exec(`
      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT,
        phone TEXT
      );

      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        name TEXT NOT NULL,
        id_number TEXT,
        nationality TEXT,
        phone TEXT
      );

      CREATE TABLE IF NOT EXISTS cases (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        case_number TEXT NOT NULL,
        client_id TEXT,
        court TEXT,
        circuit TEXT,
        status TEXT,
        phase TEXT,
        subject TEXT,
        case_type TEXT,
        main_classification TEXT,
        sub_classification TEXT,
        client_role TEXT,
        registration_date TEXT,
        registration_date_hijri TEXT,
        najiz_url TEXT,
        assessment TEXT,
        client_requirement TEXT,
        plaintiff_requests TEXT,
        claimed_amount NUMERIC(14,2) DEFAULT 0,
        awarded_amount NUMERIC(14,2) DEFAULT 0,
        contract_amount NUMERIC(14,2) DEFAULT 0,
        responsible_name TEXT,
        responsible_user_id TEXT,
        created_at TEXT DEFAULT '2026-01-01 10:00:00',
        updated_at TEXT DEFAULT '2026-03-01 12:00:00'
      );

      CREATE TABLE IF NOT EXISTS case_parties (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        case_id TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT,
        party_type TEXT,
        id_number TEXT,
        nationality TEXT,
        phone TEXT,
        created_at TEXT DEFAULT '2026-01-01'
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        case_id TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT,
        court_room TEXT,
        status TEXT,
        notes TEXT,
        result TEXT,
        meeting_link TEXT,
        session_type TEXT
      );

      CREATE TABLE IF NOT EXISTS judgments (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        case_id TEXT NOT NULL,
        judgment_number TEXT,
        judgment_date TEXT,
        judgment_date_hijri TEXT,
        favor TEXT,
        notes TEXT,
        objection_period_days INTEGER,
        objection_deadline TEXT,
        is_objection_handled BOOLEAN DEFAULT FALSE,
        is_executable BOOLEAN DEFAULT FALSE,
        created_at TEXT DEFAULT '2026-02-01'
      );

      CREATE TABLE IF NOT EXISTS enforcement_requests (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        case_id TEXT NOT NULL,
        request_no TEXT,
        court_name TEXT,
        status TEXT,
        instrument_no TEXT,
        instrument_date TEXT,
        created_at TEXT DEFAULT '2026-02-15'
      );

      CREATE TABLE IF NOT EXISTS enf_financial_details (
        request_id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        amount_instrument NUMERIC(14,2) DEFAULT 0,
        amount_collected_for_client NUMERIC(14,2) DEFAULT 0,
        currency TEXT DEFAULT 'ريال سعودي'
      );

      CREATE TABLE IF NOT EXISTS memoranda (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        case_id TEXT NOT NULL,
        memo_title TEXT,
        memo_type TEXT,
        memo_date TEXT,
        najiz_number TEXT,
        memo_status TEXT,
        memo_summary TEXT,
        created_at TEXT DEFAULT '2026-01-15'
      );

      CREATE TABLE IF NOT EXISTS experts (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        case_id TEXT NOT NULL,
        name TEXT,
        specialty TEXT,
        phone TEXT,
        notes TEXT,
        created_at TEXT DEFAULT '2026-01-20'
      );

      CREATE TABLE IF NOT EXISTS evidence (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        case_id TEXT NOT NULL,
        title TEXT,
        description TEXT,
        status TEXT,
        evidence_date TEXT,
        created_at TEXT DEFAULT '2026-01-10'
      );

      CREATE TABLE IF NOT EXISTS documents_v2 (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        case_id TEXT NOT NULL,
        name TEXT,
        file_type TEXT,
        file_size INTEGER,
        created_at TEXT DEFAULT '2026-01-05'
      );

      CREATE TABLE IF NOT EXISTS tasks_v2 (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        case_id TEXT NOT NULL,
        title TEXT,
        responsible_user_id TEXT,
        due_date TEXT,
        status TEXT,
        priority TEXT,
        created_at TEXT DEFAULT '2026-01-02'
      );

      CREATE TABLE IF NOT EXISTS finances (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        case_id TEXT,
        amount NUMERIC(14,2),
        total NUMERIC(14,2),
        type TEXT,
        date TEXT DEFAULT '2026-01-10'
      );

      CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        entity_id TEXT,
        actor TEXT,
        details TEXT,
        timestamp TEXT DEFAULT '2026-09-20 18:00:00',
        metadata_json TEXT
      );
    `)

    // Insert Company
    await db.exec(`
      INSERT INTO companies (id, name, address, phone)
      VALUES ('${companyId}', 'شركة العدل والإنصاف للمحاماة', 'الرياض - طريق الملك فهد', '0112345678');

      INSERT INTO clients (id, company_id, name, id_number, nationality, phone)
      VALUES ('${clientId}', '${companyId}', 'شركة النور للاستثمار', '7001234567', 'سعودي', '0555555555');
    `)

    // Insert 1. Rich Case
    await db.exec(`
      INSERT INTO cases (
        id, company_id, case_number, client_id, court, circuit, status, phase,
        subject, case_type, main_classification, sub_classification, client_role,
        registration_date, registration_date_hijri, najiz_url, assessment,
        client_requirement, plaintiff_requests, claimed_amount, awarded_amount,
        contract_amount, responsible_name, created_at, updated_at
      ) VALUES (
        '${richCaseId}', '${companyId}', 'CASE-2026-001', '${clientId}',
        'المحكمة التجارية بالرياض', 'الدائرة الثالثة عشرة', 'قيد النظر', 'المرافعة والتدقيق',
        'نزاع توريد برمجيات وعقود تقنية معلومات', 'تجارية', 'عقود تجارية', 'عقود برمجيات', 'مدعى عليه',
        '2026-01-10', '1447-07-21', 'https://najiz.sa/case/101', 'موقف الموكل قوي استناداً للمادة 54 من نظام الإثبات',
        'رد الدعوى وإلزام الخصم بأتعاب المحاماة', 'إلزام موكلنا بدفع مليون ريال والتعويض',
        1000000.00, 300000.00, 150000.00, 'أ. عبدالعزيز التميمي',
        '2026-01-10 09:00:00', '2026-03-01 14:30:00'
      );

      INSERT INTO case_parties (id, company_id, case_id, name, role, party_type, id_number, nationality, phone)
      VALUES
        ('p1', '${companyId}', '${richCaseId}', 'شركة النور للاستثمار', 'مدعى عليه', 'client', '7001234567', 'سعودية', '0555555555'),
        ('p2', '${companyId}', '${richCaseId}', 'مؤسسة الأفق البرمجية', 'مدعي', 'opponent', '7009876543', 'سعودية', '0500000000');

      INSERT INTO sessions (id, company_id, case_id, date, time, court_room, status, notes, result)
      VALUES
        ('s1', '${companyId}', '${richCaseId}', '2026-02-10', '10:00', 'القاعة 4', 'منتهية', 'تقديم مذكرة الدفاع', 'تأجيل لرد المدعي'),
        ('s2', '${companyId}', '${richCaseId}', '2026-10-15', '11:30', 'القاعة 2', 'قادمة', 'جلسة استجواب الخبير', 'حضور الجلسة');

      INSERT INTO judgments (id, company_id, case_id, judgment_number, judgment_date, judgment_date_hijri, favor, notes, objection_period_days, objection_deadline, is_objection_handled, is_executable)
      VALUES
        ('j1', '${companyId}', '${richCaseId}', 'JUDG-445-01', '2026-02-25', '1447-08-07', 'لصالح الموكل جزئياً', 'حكمت الدائرة برفض معظم مطالبات المدعي وإلزام موكلنا بـ 300 ألف ريال فقط', 30, '2026-10-30', FALSE, TRUE);

      INSERT INTO enforcement_requests (id, company_id, case_id, request_no, court_name, status, instrument_no, instrument_date)
      VALUES
        ('er1', '${companyId}', '${richCaseId}', 'ENF-9901', 'محكمة التنفيذ بالرياض', 'قيد التنفيذ', 'JUDG-445-01', '2026-02-25');

      INSERT INTO enf_financial_details (request_id, company_id, amount_instrument, amount_collected_for_client)
      VALUES
        ('er1', '${companyId}', 300000.00, 120000.00);

      INSERT INTO memoranda (id, company_id, case_id, memo_title, memo_type, memo_date, najiz_number, memo_status, memo_summary)
      VALUES
        ('m1', '${companyId}', '${richCaseId}', 'مذكرة الدفاع الجوابية الأولى', 'مذكرة دفاع', '2026-02-08', 'NAJ-77112', 'مقدمة', 'تفنيد ادعاءات الخصم بموجب البينة الخطية');

      INSERT INTO experts (id, company_id, case_id, name, specialty, phone, notes)
      VALUES
        ('ex1', '${companyId}', '${richCaseId}', 'م. فهد القحطاني', 'خبرة محاسبية وتقنية', '0544444444', 'تم إيداع مسودة التقرير المبدئي ولم يتم قفل الملاحظات');

      INSERT INTO evidence (id, company_id, case_id, title, description, status, evidence_date)
      VALUES
        ('ev1', '${companyId}', '${richCaseId}', 'محضر الفحص الفني', 'محضر استلام المرحلة الأولى بدون عيوب', 'مقبول', '2025-11-20');

      INSERT INTO documents_v2 (id, company_id, case_id, name, file_type, file_size)
      VALUES
        ('doc1', '${companyId}', '${richCaseId}', 'العقد_الموقع.pdf', 'application/pdf', 204800);

      INSERT INTO tasks_v2 (id, company_id, case_id, title, responsible_user_id, due_date, status, priority)
      VALUES
        ('tsk1', '${companyId}', '${richCaseId}', 'إيداع لائحة الاستئناف', 'أ. عبدالعزيز', '2026-10-25', 'pending', 'عاجلة');

      INSERT INTO finances (id, company_id, case_id, amount, total, type)
      VALUES
        ('f1', '${companyId}', '${richCaseId}', 75000.00, 75000.00, 'income');

      INSERT INTO activity_logs (id, company_id, entity_id, actor, details, timestamp)
      VALUES
        ('act1', '${companyId}', '${richCaseId}', 'سالم السكرتير', 'تعديل تاريخ الموعد بالتقويم', '2026-09-20 22:00:00');
    `)

    // Insert 2. Partial Case (Missing fields)
    await db.exec(`
      INSERT INTO cases (
        id, company_id, case_number, status, court, created_at
      ) VALUES (
        '${partialCaseId}', '${companyId}', 'CASE-PARTIAL-002', 'جديدة', 'المحكمة العامة', '2026-02-01'
      );
    `)

    // Insert 3. Case Without Judgment
    await db.exec(`
      INSERT INTO cases (
        id, company_id, case_number, status, court, created_at
      ) VALUES (
        '${noJudgmentCaseId}', '${companyId}', 'CASE-NOJUDG-003', 'قيد النظر', 'المحكمة العمالية', '2026-02-05'
      );
    `)

    // Insert 4. Case with Judgment & Objection
    await db.exec(`
      INSERT INTO cases (
        id, company_id, case_number, status, court, created_at
      ) VALUES (
        '${judgmentObjectionCaseId}', '${companyId}', 'CASE-OBJ-004', 'محكومة ابتدائياً', 'المحكمة العامة', '2026-01-15'
      );

      INSERT INTO judgments (id, company_id, case_id, judgment_number, judgment_date, favor, notes, objection_period_days, objection_deadline, is_objection_handled)
      VALUES
        ('j_obj', '${companyId}', '${judgmentObjectionCaseId}', 'JUDG-OBJ-99', '2026-09-10', 'لغير صالح الموكل', 'منطوق الحكم بإلزام الموكل بالمبلغ', 30, '2026-10-10', FALSE);
    `)

    // Insert 5. Case with Enforcement and Collected Funds
    await db.exec(`
      INSERT INTO cases (
        id, company_id, case_number, status, court, created_at
      ) VALUES (
        '${enforcementCaseId}', '${companyId}', 'CASE-ENF-005', 'قيد التنفيذ', 'محكمة التنفيذ', '2026-01-01'
      );

      INSERT INTO enforcement_requests (id, company_id, case_id, request_no, court_name, status)
      VALUES
        ('er_col', '${companyId}', '${enforcementCaseId}', 'REQ-ENF-777', 'محكمة التنفيذ بجدة', 'محصل كلياً');

      INSERT INTO enf_financial_details (request_id, company_id, amount_instrument, amount_collected_for_client)
      VALUES
        ('er_col', '${companyId}', 500000.00, 500000.00);
    `)
  })

  it('Scenario 1: Rich Case renders all 12 Canonical Sections correctly with exact DB values', async () => {
    const dossier = await buildCanonicalCaseDossier(companyId, richCaseId, true)

    // Section 1: Executive Status Ribbon
    expect(dossier.executiveHeader.caseNumber).toBe('CASE-2026-001')
    expect(dossier.executiveHeader.phase).toBe('المرافعة والتدقيق')
    expect(dossier.executiveHeader.status).toBe('قيد النظر')
    expect(dossier.executiveHeader.responsibleLawyer).toBe('أ. عبدالعزيز التميمي')
    expect(dossier.executiveHeader.nextSession?.date).toBe('2026-10-15')
    expect(dossier.executiveHeader.nextSession?.daysRemaining).toBeGreaterThan(0)

    // Section 2: Case Identity & Parties
    expect(dossier.caseInfo.court).toBe('المحكمة التجارية بالرياض')
    expect(dossier.caseInfo.circuit).toBe('الدائرة الثالثة عشرة')
    expect(dossier.caseInfo.clientRole).toBe('مدعى عليه')
    expect(dossier.caseInfo.parties).toHaveLength(2)
    expect(dossier.caseInfo.parties[0].partyType).toBe('client')
    expect(dossier.caseInfo.parties[1].partyType).toBe('opponent')

    // Section 3: Dispute Summary
    expect(dossier.disputeSummary.subject).toContain('نزاع توريد برمجيات')
    expect(dossier.disputeSummary.assessment).toContain('نظام الإثبات')
    expect(dossier.disputeSummary.clientRequirement).toContain('رد الدعوى')
    expect(dossier.disputeSummary.plaintiffRequests).toContain('مليون ريال')

    // Section 4: Litigation Financials
    expect(dossier.litigationFinancials.claimedAmount).toBe(1000000)
    expect(dossier.litigationFinancials.awardedAmount).toBe(300000)
    expect(dossier.litigationFinancials.differenceAmount).toBe(700000)
    expect(dossier.litigationFinancials.collectedForClient).toBe(120000)

    // Section 4: Office Financials (Separated)
    expect(dossier.officeFinancials.contractAmount).toBe(150000)
    expect(dossier.officeFinancials.totalPaidToOffice).toBe(75000)
    expect(dossier.officeFinancials.remainingOfficeFee).toBe(75000)

    // Section 5: Timeline (Descending)
    expect(dossier.timeline.length).toBeGreaterThan(0)
    expect(new Date(dossier.timeline[0].date).getTime()).toBeGreaterThanOrEqual(
      new Date(dossier.timeline[dossier.timeline.length - 1].date).getTime()
    )

    // Section 6: Judgments & Enforcement
    expect(dossier.judgmentsAndEnforcement.judgments).toHaveLength(1)
    expect(dossier.judgmentsAndEnforcement.judgments[0].notes).toContain('300 ألف')
    expect(dossier.judgmentsAndEnforcement.enforcementRequests).toHaveLength(1)
    expect(dossier.judgmentsAndEnforcement.enforcementRequests[0].amountCollected).toBe(120000)

    // Section 7: Sessions
    expect(dossier.sessionsSummary.sessionsList).toHaveLength(2)
    expect(dossier.sessionsSummary.lastSession?.result).toBe('تأجيل لرد المدعي')

    // Section 8: Memoranda
    expect(dossier.memoranda).toHaveLength(1)
    expect(dossier.memoranda[0].title).toContain('مذكرة الدفاع الجوابية')

    // Section 9: Experts
    expect(dossier.experts).toHaveLength(1)
    expect(dossier.experts[0].name).toBe('م. فهد القحطاني')

    // Section 10: Evidence & Documents
    expect(dossier.evidenceAndDocuments.evidence).toHaveLength(1)
    expect(dossier.evidenceAndDocuments.documents).toHaveLength(1)

    // Section 11: Tasks
    expect(dossier.tasksAndNextSteps).toHaveLength(1)
    expect(dossier.tasksAndNextSteps[0].title).toBe('إيداع لائحة الاستئناف')

    // Section 12: Admin Audit
    expect(dossier.adminAudit.recordLastUpdated).toBe('2026-03-01 14:30:00')
    expect(dossier.adminAudit.lastTechnicalActivity?.actor).toBe('سالم السكرتير')
  })

  it('Scenario 2: Partial/Missing Case Data handles [D] fields gracefully without crashing', async () => {
    const dossier = await buildCanonicalCaseDossier(companyId, partialCaseId, true)

    expect(dossier.caseInfo.caseNumber).toBe('CASE-PARTIAL-002')
    expect(dossier.caseInfo.circuit).toBe('غير مسجل')
    expect(dossier.caseInfo.najizUrl).toBe('غير مسجل')
    expect(dossier.disputeSummary.clientRequirement).toBe('غير مسجل')
    expect(dossier.disputeSummary.assessment).toBe('غير مسجل')
    expect(dossier.judgmentsAndEnforcement.judgments).toHaveLength(0)
    expect(dossier.judgmentsAndEnforcement.enforcementRequests).toHaveLength(0)
    expect(dossier.sessionsSummary.sessionsList).toHaveLength(0)
    expect(dossier.experts).toHaveLength(0)
    expect(dossier.evidenceAndDocuments.evidence).toHaveLength(0)
  })

  it('Scenario 3: Case without judgments handles empty judgment list cleanly', async () => {
    const dossier = await buildCanonicalCaseDossier(companyId, noJudgmentCaseId, true)
    expect(dossier.judgmentsAndEnforcement.judgments).toEqual([])
  })

  it('Scenario 4: Case with Judgment and Appeal Deadline computes countdown correctly', async () => {
    const dossier = await buildCanonicalCaseDossier(companyId, judgmentObjectionCaseId, true)
    expect(dossier.judgmentsAndEnforcement.judgments).toHaveLength(1)
    const j = dossier.judgmentsAndEnforcement.judgments[0]
    expect(j.objectionDeadline).toBe('2026-10-10')
    expect(j.daysUntilDeadline).toBeGreaterThan(0)
    expect(j.isObjectionHandled).toBe(false)
  })

  it('Scenario 5: Case with Enforcement and Collected Funds extracts from enf_financial_details', async () => {
    const dossier = await buildCanonicalCaseDossier(companyId, enforcementCaseId, true)
    expect(dossier.litigationFinancials.collectedForClient).toBe(500000)
    expect(dossier.judgmentsAndEnforcement.enforcementRequests[0].amountCollected).toBe(500000)
  })

  it('Scenario 6: Strict Naming - Difference between Claimed and Awarded is strictly differenceAmount, never "مرفوض"', async () => {
    const dossier = await buildCanonicalCaseDossier(companyId, richCaseId, true)
    expect(dossier.litigationFinancials.differenceAmount).toBe(700000)
    expect((dossier.litigationFinancials as any).rejectedAmount).toBeUndefined()
  })

  it('Scenario 7: Strict Judicial Action - activity_logs is NOT the source of lastJudicialAction', async () => {
    const dossier = await buildCanonicalCaseDossier(companyId, richCaseId, true)
    // activity_logs contains "تعديل تاريخ الموعد بالتقويم" by "سالم السكرتير" at 2026-09-20
    // But lastJudicialAction must be a judicial event (like the upcoming session or judgment), NOT the activity_log!
    expect(dossier.executiveHeader.lastJudicialAction?.title).not.toContain('تعديل تاريخ الموعد')
    expect(dossier.executiveHeader.lastJudicialAction?.type).toMatch(/جلسة قضائية|حكم قضائي|مذكرة قضائية|طلب تنفيذ/)

    // However, activity_logs is recorded in Section 12 (Admin Audit)
    expect(dossier.adminAudit.lastTechnicalActivity?.action).toContain('تعديل تاريخ الموعد')
  })

  it('Scenario 8: Financial Separation - Office fee finances are strictly isolated from litigation subject matter', async () => {
    const dossier = await buildCanonicalCaseDossier(companyId, richCaseId, true)
    expect(dossier.officeFinancials.contractAmount).toBe(150000)
    expect(dossier.officeFinancials.totalPaidToOffice).toBe(75000)
    expect(dossier.officeFinancials.remainingOfficeFee).toBe(75000)

    // Litigated amounts are totally separate
    expect(dossier.litigationFinancials.claimedAmount).toBe(1000000)
    expect(dossier.litigationFinancials.awardedAmount).toBe(300000)
    expect(dossier.litigationFinancials.collectedForClient).toBe(120000)
  })

  it('Scenario 9: Multi-page A4 HTML contains all 12 sections, running headers, and avoid-break classes', async () => {
    const dossier = await buildCanonicalCaseDossier(companyId, richCaseId, true)
    const html = renderMasterCaseDossierHtml(dossier, false, {
      name: 'شركة العدل والإنصاف للمحاماة',
      address: 'الرياض',
      phone: '0112345678'
    })

    // Contains all 12 section titles
    expect(html).toContain('أولاً: شريط الحالة التنفيذي الموحد')
    expect(html).toContain('ثانياً: بيانات القضية الأساسية وأطراف النزاع')
    expect(html).toContain('ثالثاً: ملخص النزاع والطلبات القضائية')
    expect(html).toContain('رابعاً: المبالغ القضائية وموضوع النزاع والتنفيذ')
    expect(html).toContain('خامساً: التسلسل الزمني القضائي')
    expect(html).toContain('سادساً: الأحكام الصادرة وإجراءات الطعن والتنفيذ')
    expect(html).toContain('سابعاً: سجل الجلسات القضائية والقرارات')
    expect(html).toContain('ثامناً: المذكرات واللوائح القضائية المتبادلة')
    expect(html).toContain('تاسعاً: أعمال الخبرة القضائية')
    expect(html).toContain('عاشراً: الأدلة والبينات والمستندات المرفوعة')
    expect(html).toContain('الحادي عشر: خطة العمل والمهام المعلقة')
    expect(html).toContain('الثاني عشر: بيانات الإدارة وتدقيق السجل')

    // Check Print and Avoid-break styling
    expect(html).toContain('@page')
    expect(html).toContain('page-break-inside: avoid')
    expect(html).toContain('avoid-break')
    expect(html).toContain('CASE-2026-001')
    expect(html).toContain('شركة العدل والإنصاف للمحاماة')
  })

  it('Scenario 10: Financial redaction - Users without financial permissions have fees hidden', async () => {
    const dossier = await buildCanonicalCaseDossier(companyId, richCaseId, false)
    expect(dossier.officeFinancials.totalPaidToOffice).toBe(0)
  })
})
