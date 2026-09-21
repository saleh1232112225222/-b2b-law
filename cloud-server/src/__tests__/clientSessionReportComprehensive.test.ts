import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { PGlite } from '@electric-sql/pglite'

const pg = new PGlite()

async function pgliteQuery(sql: string, params?: any[]) {
  const res = await pg.query(sql, params)
  return {
    rows: res.rows,
    rowCount: (res as any).affectedRows !== undefined ? (res as any).affectedRows : res.rows.length,
    command: '',
    oid: 0,
    fields: res.fields as any
  }
}

vi.mock('../db/connection', () => ({
  query: (sql: string, params?: any[]) => pgliteQuery(sql, params),
  getClient: async () => ({
    query: (sql: string, params?: any[]) => pgliteQuery(sql, params),
    release: () => {}
  })
}))

import {
  ensureClientReportsTable,
  buildClientSessionReport,
  saveClientSessionReportEdits,
  transitionReportStatus,
  renderClientSessionReportHtml
} from '../services/clientSessionReportService'

describe('Client Session Brief Report - Comprehensive Integration Test Suite', () => {
  const companyId = 'aaaaaaaa-1111-4111-8111-111111111111'
  const userId = 'bbbbbbbb-1111-4111-8111-111111111111'
  const clientId = 'cccccccc-1111-4111-8111-111111111111'
  const caseId = 'dddddddd-1111-4111-8111-111111111111'
  const sessionId = 'eeeeeeee-1111-4111-8111-111111111111'

  beforeAll(async () => {
    // Setup base tables
    await pg.exec(`

      CREATE TABLE companies (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL
      );

      CREATE TABLE clients (
        id UUID PRIMARY KEY,
        company_id UUID NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT
      );

      CREATE TABLE users (
        id UUID PRIMARY KEY,
        company_id UUID NOT NULL,
        full_name TEXT NOT NULL,
        username TEXT NOT NULL
      );

      CREATE TABLE cases (
        id UUID PRIMARY KEY,
        company_id UUID NOT NULL,
        case_number TEXT NOT NULL,
        client_id UUID REFERENCES clients(id),
        responsible_user_id UUID REFERENCES users(id),
        court TEXT,
        circuit TEXT,
        subject TEXT,
        client_role TEXT,
        opponent_name TEXT,
        registration_date DATE
      );

      CREATE TABLE sessions (
        id UUID PRIMARY KEY,
        company_id UUID NOT NULL,
        case_id UUID REFERENCES cases(id),
        date DATE NOT NULL,
        date_hijri TEXT,
        time TIME,
        court_room TEXT,
        status TEXT DEFAULT 'قادمة',
        result TEXT,
        notes TEXT,
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE session_outcomes (
        id UUID PRIMARY KEY,
        company_id UUID NOT NULL,
        session_id UUID REFERENCES sessions(id),
        case_id UUID REFERENCES cases(id),
        result TEXT NOT NULL,
        notes TEXT,
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE tasks_v2 (
        id UUID PRIMARY KEY,
        company_id UUID NOT NULL,
        case_id UUID REFERENCES cases(id),
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT,
        status TEXT,
        due_date DATE,
        scheduled_for TIMESTAMPTZ,
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE firm_data (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        company_id UUID NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL
      );
    `)

    await ensureClientReportsTable()

    // Seed mock data
    await pg.exec(`
      INSERT INTO companies (id, name) VALUES ('${companyId}', 'شركة المحاماة النموذجية');
      INSERT INTO users (id, company_id, full_name, username) VALUES ('${userId}', '${companyId}', 'المستشار فهد المحامي', 'fahad');
      INSERT INTO clients (id, company_id, name, phone, email) VALUES ('${clientId}', '${companyId}', 'شركة النور للمقاولات', '0501234567', 'contact@alnoor.sa');
      INSERT INTO cases (id, company_id, case_number, client_id, responsible_user_id, court, circuit, subject, client_role, opponent_name, registration_date)
      VALUES ('${caseId}', '${companyId}', 'CASE-44901', '${clientId}', '${userId}', 'المحكمة العامة بالرياض', 'الدائرة الحقوقية الخامسة', 'مطالبة بمستحقات مقاولة', 'مدعي', 'شركة البناء المتقدم', '2026-01-10');
      INSERT INTO sessions (id, company_id, case_id, date, date_hijri, time, court_room, status, result, notes, created_by)
      VALUES ('${sessionId}', '${companyId}', '${caseId}', '2026-03-15', '26 شعبان 1447', '10:30:00', 'القاعة رقم 4', 'منتهية', 'تأجيل الجلسة لموعد آخر', 'سبب التأجيل: لتبادل المذكرات والردود', '${userId}');
      INSERT INTO session_outcomes (id, company_id, session_id, case_id, result, notes, created_by)
      VALUES ('${sessionId}', '${companyId}', '${sessionId}', '${caseId}', 'تأجيل الجلسة لموعد آخر', 'سبب التأجيل: لتبادل المذكرات والردود', '${userId}');
    `)
  })

  afterAll(async () => {
    if (pg) await pg.close()
  })

  it('1. [Auto-Assembly] Correctly builds ClientSessionReport from database records with zero missing fields', async () => {
    const report = await buildClientSessionReport(sessionId, companyId)
    expect(report.caseInfo.caseNumber).toBe('CASE-44901')
    expect(report.clientName).toBe('شركة النور للمقاولات')
    expect(report.sessionInfo.result).toBe('تأجيل الجلسة لموعد آخر')
    expect(report.sessionInfo.isPostponed).toBe(true)
    expect(report.sessionInfo.postponementReason).toBe('لتبادل المذكرات والردود')
    expect(report.dispatch.status).toBe('draft')
    expect(report.dispatch.statusLabel).toBe('مسودة')
    expect(report.lawyerEdits.clientSummary).toContain('CASE-44901')
    expect(report.lawyerEdits.lawyerNoteAndNextStep).toBeDefined()
  })

  it('2. [Postponement Next Session] Recognizes future session and binds it to client report', async () => {
    const nextSessionId = 'ffffffff-1111-4111-8111-111111111111'
    await pg.query(`
      INSERT INTO sessions (id, company_id, case_id, date, date_hijri, time, court_room, status, notes, created_by)
      VALUES ('${nextSessionId}', '${companyId}', '${caseId}', '2026-04-20', '3 ذو القعدة 1447', '09:00:00', 'القاعة 4', 'قادمة', 'المطلوب: تقديم المذكرة الجوابية | المكلف: مكتب المحاماة', '${userId}');
    `)

    const report = await buildClientSessionReport(sessionId, companyId)
    expect(report.nextSessionInfo).toBeDefined()
    expect(report.nextSessionInfo?.date).toBe('2026-04-20')
    expect(report.nextSessionInfo?.time).toBe('09:00')
    expect(report.nextSessionInfo?.actionRequired).toBe('تقديم المذكرة الجوابية')
    expect(report.nextSessionInfo?.assignedParty).toBe('مكتب المحاماة')
  })

  it('3. [Lawyer Edits] Successfully saves edits to client summary, lawyer notes, and internal notes', async () => {
    await saveClientSessionReportEdits(sessionId, companyId, {
      clientSummary: 'حضر محامي المكتب وتم طلب مهلة لتقديم بينات تفصيلية، وأمهلتنا الدائرة حتى الجلسة القادمة.',
      lawyerNoteAndNextStep: 'نقوم حالياً بصياغة المذكرة الجوابية وسنطلب توقيع الموكل على مسودة الرد الأسبوع القادم.',
      internalNotes: 'نقطة ضعف في إثبات استلام الدفعة الثالثة، يلزم استجواب الشاهد داخلياً قبل المذكرة.'
    })

    const report = await buildClientSessionReport(sessionId, companyId)
    expect(report.lawyerEdits.clientSummary).toBe('حضر محامي المكتب وتم طلب مهلة لتقديم بينات تفصيلية، وأمهلتنا الدائرة حتى الجلسة القادمة.')
    expect(report.lawyerEdits.lawyerNoteAndNextStep).toBe('نقوم حالياً بصياغة المذكرة الجوابية وسنطلب توقيع الموكل على مسودة الرد الأسبوع القادم.')
    expect(report.internalOnlyData.internalNotes).toContain('نقطة ضعف في إثبات استلام الدفعة الثالثة')
  })

  it('4. [Strict Redaction] Internal notes are strictly redacted from client print HTML output', async () => {
    const report = await buildClientSessionReport(sessionId, companyId)
    const html = renderClientSessionReportHtml(report, { name: 'مكتب العدل للمحاماة' })

    // Must contain client-facing facts
    expect(html).toContain('CASE-44901')
    expect(html).toContain('حضر محامي المكتب وتم طلب مهلة')
    expect(html).toContain('تقديم المذكرة الجوابية')

    // MUST NEVER CONTAIN internal notes
    expect(html).not.toContain('نقطة ضعف')
    expect(html).not.toContain('استجواب الشاهد')

    // Zero English check: Ensure no English letters in text (excluding standard HTML markup tags)
    const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/i)
    expect(bodyMatch).toBeTruthy()
    const bodyText = bodyMatch![1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    const englishWords = bodyText.match(/[a-zA-Z]{3,}/g)
    // Only case number code or null allowed
    const nonCaseEnglish = (englishWords || []).filter(w => !['CASE'].includes(w.toUpperCase()))
    expect(nonCaseEnglish.length).toBe(0)
  })

  it('5. [Workflow Audit Trail] Progresses from draft -> reviewed -> approved -> sent with timestamps & channels', async () => {
    // 5.1 Review
    await transitionReportStatus(sessionId, companyId, {
      toStatus: 'reviewed',
      userId
    })
    let report = await buildClientSessionReport(sessionId, companyId)
    expect(report.dispatch.status).toBe('reviewed')
    expect(report.dispatch.statusLabel).toBe('تمت المراجعة')
    expect(report.dispatch.reviewedBy).toBe(userId)
    expect(report.dispatch.reviewedAt).toBeDefined()

    // 5.2 Approve
    await transitionReportStatus(sessionId, companyId, {
      toStatus: 'approved',
      userId
    })
    report = await buildClientSessionReport(sessionId, companyId)
    expect(report.dispatch.status).toBe('approved')
    expect(report.dispatch.statusLabel).toBe('معتمد')
    expect(report.dispatch.approvedBy).toBe(userId)
    expect(report.dispatch.approvedAt).toBeDefined()

    // 5.3 Send via WhatsApp
    await transitionReportStatus(sessionId, companyId, {
      toStatus: 'sent',
      sentVia: 'whatsapp',
      userId
    })
    report = await buildClientSessionReport(sessionId, companyId)
    expect(report.dispatch.status).toBe('sent')
    expect(report.dispatch.statusLabel).toBe('أرسل للعميل')
    expect(report.dispatch.sentVia).toBe('whatsapp')
    expect(report.dispatch.sentViaLabel).toBe('واتساب')
    expect(report.dispatch.sentAt).toBeDefined()

    // 5.4 Check stamp in rendered HTML
    const html = renderClientSessionReportHtml(report)
    expect(html).toContain('نسخة رسمية مرسلة للموكل')
    expect(html).toContain('واتساب')
  })
})
