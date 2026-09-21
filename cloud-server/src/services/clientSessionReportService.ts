import { query } from '../db/connection'
import { v4 as uuidv4 } from 'uuid'

export interface ClientSessionReportData {
  id: string
  companyId: string
  sessionId: string
  caseId: string
  clientId: string
  clientName: string
  clientPhone: string
  clientEmail: string

  caseInfo: {
    caseNumber: string
    court: string
    circuit: string
    subject: string
    clientRole: string
    opponentName: string
    responsibleLawyer: string
    registrationDate: string
  }

  sessionInfo: {
    sessionDate: string
    sessionDateHijri: string
    sessionTime: string
    courtRoom: string
    sessionNumber: number
    result: string
    isPostponed: boolean
    postponementReason: string
  }

  nextSessionInfo?: {
    date: string
    dateHijri?: string
    time?: string
    courtRoom?: string
    actionRequired?: string
    assignedParty?: string
  }

  lawyerEdits: {
    clientSummary: string
    lawyerNoteAndNextStep: string
  }

  internalOnlyData: {
    internalNotes: string
  }

  dispatch: {
    status: 'draft' | 'reviewed' | 'approved' | 'sent'
    statusLabel: string
    reviewedBy?: string
    reviewedAt?: string
    approvedBy?: string
    approvedAt?: string
    sentAt?: string
    sentBy?: string
    sentVia?: string
    sentViaLabel?: string
  }
}

export const DISPATCH_STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة',
  reviewed: 'تمت المراجعة',
  approved: 'معتمد',
  sent: 'أرسل للعميل'
}

export const SENT_VIA_LABELS: Record<string, string> = {
  whatsapp: 'واتساب',
  email: 'بريد إلكتروني',
  manual_print: 'تسليم يدوي / مطبوع',
  client_portal: 'بوابة الموكل الإلكترونية'
}

export async function ensureClientReportsTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS session_client_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
      client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
      client_summary TEXT,
      lawyer_notes TEXT,
      internal_notes TEXT,
      dispatch_status TEXT NOT NULL DEFAULT 'draft',
      reviewed_by UUID,
      reviewed_at TIMESTAMPTZ,
      approved_by UUID,
      approved_at TIMESTAMPTZ,
      sent_by UUID,
      sent_at TIMESTAMPTZ,
      sent_via TEXT,
      metadata_json JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(company_id, session_id)
    )
  `)
  await query(`
    CREATE INDEX IF NOT EXISTS idx_session_client_reports_session ON session_client_reports(company_id, session_id)
  `)
}

function toIsoDateString(val: unknown): string {
  if (!val) return ''
  if (val instanceof Date) {
    const y = val.getFullYear()
    const m = String(val.getMonth() + 1).padStart(2, '0')
    const d = String(val.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const s = String(val).trim()
  const match = s.match(/^\d{4}-\d{2}-\d{2}/)
  if (match) return match[0]
  const parsed = new Date(s)
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear()
    const m = String(parsed.getMonth() + 1).padStart(2, '0')
    const d = String(parsed.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return s
}

function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Builds the canonical Client Session Report object from database records.
 */
export async function buildClientSessionReport(
  sessionId: string,
  companyId: string
): Promise<ClientSessionReportData> {
  await ensureClientReportsTable()

  // 1. Fetch Session & Linked Case & Client
  const sessionRes = await query(
    `SELECT s.*, 
            c.case_number, c.court, c.circuit, c.subject, c.client_role, 
            c.opponent_name, c.responsible_user_id, c.registration_date,
            u.full_name as lawyer_name,
            cl.id as cl_id, cl.name as client_name, cl.phone as client_phone, cl.email as client_email
     FROM sessions s
     JOIN cases c ON c.id = s.case_id
     LEFT JOIN clients cl ON cl.id = c.client_id
     LEFT JOIN users u ON u.id = c.responsible_user_id
     WHERE s.id = $1 AND s.company_id = $2`,
    [sessionId, companyId]
  )

  if (sessionRes.rows.length === 0) {
    throw new Error('الجلسة غير موجودة أو تابعة لشركة أخرى')
  }

  const sRow = sessionRes.rows[0]
  const caseId = sRow.case_id
  const clientId = sRow.cl_id || ''

  // 2. Determine session sequence/number
  const seqRes = await query(
    `SELECT COUNT(*) as c FROM sessions 
     WHERE case_id = $1 AND company_id = $2 AND (date < $3 OR (date = $3 AND id <= $4))`,
    [caseId, companyId, sRow.date, sessionId]
  )
  const sessionNumber = Number(seqRes.rows[0]?.c) || 1

  // 3. Fetch Session Outcome & Postponement details
  const outcomeRes = await query(
    `SELECT * FROM session_outcomes WHERE session_id = $1 AND company_id = $2 ORDER BY created_at DESC LIMIT 1`,
    [sessionId, companyId]
  )
  const outcomeRow = outcomeRes.rows[0] || null

  const rawResult = String(outcomeRow?.result || sRow.result || 'قيد الإجراء')
  const isPostponed = rawResult.includes('تأجيل') || rawResult.includes('موعد آخر')

  // Extract postponement reason and next session details if available in outcome notes or metadata
  let postponementReason = 'غير مسجل'
  if (isPostponed) {
    if (outcomeRow?.notes && outcomeRow.notes.includes('سبب التأجيل:')) {
      const match = outcomeRow.notes.match(/سبب التأجيل:\s*([^\n\r]+)/)
      if (match) postponementReason = match[1].trim()
    } else if (sRow.notes && sRow.notes.includes('تأجيل')) {
      postponementReason = sRow.notes
    }
  }

  // 4. Fetch Next Session (future session if created)
  const nextSessionRes = await query(
    `SELECT * FROM sessions 
     WHERE case_id = $1 AND company_id = $2 AND date > $3 AND status != 'ملغية'
     ORDER BY date ASC, time ASC LIMIT 1`,
    [caseId, companyId, sRow.date]
  )
  const nextSessionRow = nextSessionRes.rows[0] || null

  let nextSessionInfo: ClientSessionReportData['nextSessionInfo'] | undefined = undefined
  if (nextSessionRow) {
    let actionRequired = 'حضور الجلسة ومتابعة سير الدعوى'
    let assignedParty = 'فريق الترافع بالمكتب'
    if (nextSessionRow.notes) {
      if (nextSessionRow.notes.includes('المطلوب:')) {
        const match = nextSessionRow.notes.match(/المطلوب:\s*([^|\n\r]+)/)
        if (match) actionRequired = match[1].trim()
      }
      if (nextSessionRow.notes.includes('المكلف:')) {
        const match = nextSessionRow.notes.match(/المكلف:\s*([^|\n\r]+)/)
        if (match) assignedParty = match[1].trim()
      }
    }

    nextSessionInfo = {
      date: toIsoDateString(nextSessionRow.date),
      dateHijri: nextSessionRow.date_hijri || '',
      time: nextSessionRow.time ? String(nextSessionRow.time).slice(0, 5) : '',
      courtRoom: nextSessionRow.court_room || '',
      actionRequired,
      assignedParty
    }
  }

  // 5. Fetch existing Client Report record or construct initial default draft
  const reportRes = await query(
    `SELECT * FROM session_client_reports WHERE session_id = $1 AND company_id = $2`,
    [sessionId, companyId]
  )
  const existingReport = reportRes.rows[0] || null

  let clientSummary = existingReport?.client_summary || ''
  let lawyerNoteAndNextStep = existingReport?.lawyer_notes || ''
  const internalNotes = existingReport?.internal_notes || (outcomeRow?.notes ? `سجل الجلسة: ${outcomeRow.notes}` : '')
  const dispatchStatus = (existingReport?.dispatch_status || 'draft') as ClientSessionReportData['dispatch']['status']

  // Auto-generate professional initial drafts if not yet edited
  if (!clientSummary) {
    if (isPostponed) {
      clientSummary = `نحيطكم علماً بأنه قد عُقدت جلسة القضية رقم (${sRow.case_number}) لدى ${sRow.court || 'المحكمة'}، وقد قررت الدائرة القضائية تأجيل نظر الدعوى؛ وذلك ${postponementReason !== 'غير مسجل' ? `بسبب: (${postponementReason})` : 'لاستكمال الإجراءات القضائية وتبادل المذكرات'}.`
    } else if (rawResult.includes('حكم')) {
      clientSummary = `نحيطكم علماً بصدور قرار/حكم من الدائرة القضائية في جلسة اليوم نصه: (${rawResult}). وسيتم تزويدكم بنسخة الصك والمذكرة التفسيرية فور إتاحتها رسمياً.`
    } else if (rawResult.includes('حجز')) {
      clientSummary = `عُقدت الجلسة المحددة لنظر الدعوى، وقررت الدائرة القضائية قفل باب المرافعة وحجز القضية للنطق بالحكم.`
    } else {
      clientSummary = `عُقدت الجلسة القضائية المحددة لنظر الدعوى، وتمت متابعة الإجراءات المقررة بحضور الأطراف، وثبتت نتيجة الجلسة بـ: (${rawResult}).`
    }
  }

  if (!lawyerNoteAndNextStep) {
    if (nextSessionInfo) {
      lawyerNoteAndNextStep = `تحددت الجلسة القادمة بمشيئة الله بتاريخ ${nextSessionInfo.date}${nextSessionInfo.time ? ` في تمام الساعة ${nextSessionInfo.time}` : ''}. والمطلوب في المرحلة الحالية: (${nextSessionInfo.actionRequired})، ويتولى المكتب اتخاذ كافة الإجراءات النظامية اللازمة والمتابعة الدقيقة.`
    } else {
      lawyerNoteAndNextStep = `يقوم فريق الترافع حالياً بدراسة الموقف الإجرائي وإعداد الردود النظامية المطلوبة تمهيداً للجلسة القادمة، وسنوافيكم فور صدور أي قيد أو موعد جديد عبر البوابة.`
    }
  }

  // 6. Assemble and return canonical object
  return {
    id: existingReport?.id || uuidv4(),
    companyId,
    sessionId,
    caseId,
    clientId,
    clientName: sRow.client_name || 'الموكل الكريم',
    clientPhone: sRow.client_phone || '',
    clientEmail: sRow.client_email || '',

    caseInfo: {
      caseNumber: sRow.case_number,
      court: sRow.court || 'غير مسجل',
      circuit: sRow.circuit || 'غير مسجل',
      subject: sRow.subject || 'غير مسجل',
      clientRole: sRow.client_role || 'غير مسجل',
      opponentName: sRow.opponent_name || 'غير مسجل',
      responsibleLawyer: sRow.lawyer_name || 'مكتب المحاماة',
      registrationDate: toIsoDateString(sRow.registration_date) || 'غير مسجل'
    },

    sessionInfo: {
      sessionDate: toIsoDateString(sRow.date),
      sessionDateHijri: sRow.date_hijri || 'غير مسجل',
      sessionTime: sRow.time ? String(sRow.time).slice(0, 5) : 'غير مسجل',
      courtRoom: sRow.court_room || 'غير مسجل',
      sessionNumber,
      result: rawResult,
      isPostponed,
      postponementReason
    },

    nextSessionInfo,

    lawyerEdits: {
      clientSummary,
      lawyerNoteAndNextStep
    },

    internalOnlyData: {
      internalNotes
    },

    dispatch: {
      status: dispatchStatus,
      statusLabel: DISPATCH_STATUS_LABELS[dispatchStatus] || 'مسودة',
      reviewedBy: existingReport?.reviewed_by || undefined,
      reviewedAt: existingReport?.reviewed_at ? String(existingReport.reviewed_at) : undefined,
      approvedBy: existingReport?.approved_by || undefined,
      approvedAt: existingReport?.approved_at ? String(existingReport.approved_at) : undefined,
      sentAt: existingReport?.sent_at ? String(existingReport.sent_at) : undefined,
      sentBy: existingReport?.sent_by || undefined,
      sentVia: existingReport?.sent_via || undefined,
      sentViaLabel: existingReport?.sent_via ? SENT_VIA_LABELS[existingReport.sent_via] || existingReport.sent_via : undefined
    }
  }
}

/**
 * Saves lawyer edited texts and internal notes.
 */
export async function saveClientSessionReportEdits(
  sessionId: string,
  companyId: string,
  data: {
    clientSummary: string
    lawyerNoteAndNextStep: string
    internalNotes?: string
    caseId?: string
    clientId?: string
  }
): Promise<void> {
  await ensureClientReportsTable()

  await query(
    `INSERT INTO session_client_reports (
      id, company_id, session_id, case_id, client_id, 
      client_summary, lawyer_notes, internal_notes, dispatch_status, updated_at
    )
    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'draft', NOW())
    ON CONFLICT (company_id, session_id) DO UPDATE SET
      client_summary = EXCLUDED.client_summary,
      lawyer_notes = EXCLUDED.lawyer_notes,
      internal_notes = COALESCE(EXCLUDED.internal_notes, session_client_reports.internal_notes),
      updated_at = NOW()`,
    [
      companyId,
      sessionId,
      data.caseId || null,
      data.clientId || null,
      data.clientSummary,
      data.lawyerNoteAndNextStep,
      data.internalNotes || null
    ]
  )
}

/**
 * Transitions the report through its formal audit trail states.
 */
export async function transitionReportStatus(
  sessionId: string,
  companyId: string,
  input: {
    toStatus: 'draft' | 'reviewed' | 'approved' | 'sent'
    sentVia?: string
    userId: string
    metadata?: Record<string, unknown>
  }
): Promise<void> {
  await ensureClientReportsTable()

  const now = new Date().toISOString()
  let sql = ''
  const params: unknown[] = [input.toStatus, companyId, sessionId]

  if (input.toStatus === 'reviewed') {
    sql = `UPDATE session_client_reports 
           SET dispatch_status = $1, reviewed_by = $4, reviewed_at = NOW(), updated_at = NOW()
           WHERE company_id = $2 AND session_id = $3`
    params.push(input.userId)
  } else if (input.toStatus === 'approved') {
    sql = `UPDATE session_client_reports 
           SET dispatch_status = $1, approved_by = $4, approved_at = NOW(), updated_at = NOW()
           WHERE company_id = $2 AND session_id = $3`
    params.push(input.userId)
  } else if (input.toStatus === 'sent') {
    sql = `UPDATE session_client_reports 
           SET dispatch_status = $1, sent_by = $4, sent_at = NOW(), sent_via = $5, updated_at = NOW()
           WHERE company_id = $2 AND session_id = $3`
    params.push(input.userId, input.sentVia || 'whatsapp')
  } else {
    sql = `UPDATE session_client_reports 
           SET dispatch_status = $1, updated_at = NOW()
           WHERE company_id = $2 AND session_id = $3`
  }

  const res = await query(sql, params)
  if (res.rowCount === 0) {
    // Row might not exist yet, initialize it
    const rep = await buildClientSessionReport(sessionId, companyId)
    await query(
      `INSERT INTO session_client_reports (
        id, company_id, session_id, case_id, client_id, client_summary, lawyer_notes, 
        dispatch_status, reviewed_by, reviewed_at, approved_by, approved_at, sent_by, sent_at, sent_via
      )
      VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7,
        $8, CASE WHEN $7 IN ('reviewed', 'approved', 'sent') THEN NOW() ELSE NULL END,
        $8, CASE WHEN $7 IN ('approved', 'sent') THEN NOW() ELSE NULL END,
        $8, CASE WHEN $7 = 'sent' THEN NOW() ELSE NULL END,
        $9
      )`,
      [
        companyId,
        sessionId,
        rep.caseId,
        rep.clientId,
        rep.lawyerEdits.clientSummary,
        rep.lawyerEdits.lawyerNoteAndNextStep,
        input.toStatus,
        input.userId,
        input.sentVia || null
      ]
    )
  }
}

/**
 * Generates an executive, client-facing A4 print / PDF HTML report.
 * Strictly redacts internal notes and adheres 100% to the zero-English policy.
 */
export function renderClientSessionReportHtml(
  report: ClientSessionReportData,
  firm: { name?: string; phone?: string; address?: string; logo?: string } = {}
): string {
  const firmName = firm.name || 'مكتب المحاماة والاستشارات القانونية'
  const firmPhone = firm.phone || ''
  const firmAddress = firm.address || 'المملكة العربية السعودية'

  const nextSessionBlock = report.nextSessionInfo
    ? `
    <div class="report-card">
      <div class="card-title">موعد الجلسة القادمة والمطلوب إجرائياً</div>
      <div class="row-2">
        <div><strong>تاريخ الجلسة القادمة:</strong> ${escapeHtml(report.nextSessionInfo.date)} ${report.nextSessionInfo.dateHijri ? `(${escapeHtml(report.nextSessionInfo.dateHijri)})` : ''}</div>
        <div><strong>وقت الجلسة وقاعتها:</strong> ${escapeHtml(report.nextSessionInfo.time || 'غير محدد')} ${report.nextSessionInfo.courtRoom ? `| قاعة: ${escapeHtml(report.nextSessionInfo.courtRoom)}` : ''}</div>
      </div>
      <div class="mt-2"><strong>المطلوب إنجازه:</strong> ${escapeHtml(report.nextSessionInfo.actionRequired || 'متابعة سير الجلسة')}</div>
      <div><strong>الطرف المكلف:</strong> ${escapeHtml(report.nextSessionInfo.assignedParty || 'مكتب المحاماة')}</div>
    </div>`
    : `
    <div class="report-card">
      <div class="card-title">موعد الجلسة القادمة</div>
      <div class="text-muted">لم يُحدد موعد الجلسة القادمة بعد من قِبل الدائرة القضائية، وتتم المتابعة الدورية عبر منصة وزارة العدل.</div>
    </div>`

  const stampClass = report.dispatch.status === 'sent' || report.dispatch.status === 'approved' ? 'stamp-approved' : 'stamp-draft'
  const stampText = report.dispatch.status === 'sent' 
    ? 'نسخة رسمية مرسلة للموكل' 
    : report.dispatch.status === 'approved' 
      ? 'معتمد للإرسال' 
      : 'مسودة قيد المراجعة'

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>تقرير جلسة قضائية - ${escapeHtml(report.caseInfo.caseNumber)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 12mm 14mm 12mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      direction: rtl;
      text-align: right;
      color: #1a1a1a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 13px;
      line-height: 1.6;
    }
    .report-container {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      position: relative;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #b89758;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .header-title {
      font-size: 20px;
      font-weight: bold;
      color: #1a2942;
      margin: 0 0 4px 0;
    }
    .header-subtitle {
      font-size: 14px;
      color: #8c733e;
      font-weight: bold;
      margin: 0;
    }
    .firm-details {
      text-align: left;
      font-size: 11px;
      color: #555;
    }
    .badge-status {
      display: inline-block;
      background: #f4efe4;
      color: #8c733e;
      border: 1px solid #b89758;
      border-radius: 4px;
      padding: 3px 10px;
      font-weight: bold;
      font-size: 12px;
      margin-top: 6px;
    }
    .report-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #fbfbfd;
      padding: 12px 14px;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    .card-title {
      font-size: 14px;
      font-weight: bold;
      color: #1a2942;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 16px;
    }
    .row-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px 16px;
    }
    .field-label {
      color: #64748b;
      font-size: 11px;
      font-weight: bold;
      margin-bottom: 2px;
    }
    .field-value {
      color: #0f172a;
      font-size: 13px;
      font-weight: 600;
    }
    .summary-box {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-right: 4px solid #b89758;
      border-radius: 6px;
      padding: 10px 14px;
      margin-top: 6px;
      font-size: 13.5px;
      line-height: 1.7;
      color: #1e293b;
      white-space: pre-wrap;
    }
    .next-box {
      background: #f0f7ff;
      border: 1px solid #bae6fd;
      border-right: 4px solid #0284c7;
      border-radius: 6px;
      padding: 10px 14px;
      margin-top: 6px;
      font-size: 13.5px;
      line-height: 1.7;
      color: #0369a1;
      white-space: pre-wrap;
    }
    .text-muted { color: #64748b; }
    .mt-2 { margin-top: 8px; }
    
    .footer-stamp {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #64748b;
      page-break-inside: avoid;
    }
    .stamp-approved {
      border: 2px solid #15803d;
      color: #15803d;
      padding: 6px 14px;
      font-size: 13px;
      font-weight: bold;
      border-radius: 6px;
      display: inline-block;
      transform: rotate(-3deg);
    }
    .stamp-draft {
      border: 2px dashed #94a3b8;
      color: #64748b;
      padding: 6px 14px;
      font-size: 13px;
      font-weight: bold;
      border-radius: 6px;
      display: inline-block;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .report-card { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td style="vertical-align: top;">
          <h1 class="header-title">${escapeHtml(firmName)}</h1>
          <p class="header-subtitle">تقرير إحاطة موكل بنتيجة جلسة قضائية</p>
          <div class="badge-status">${escapeHtml(stampText)}</div>
        </td>
        <td class="firm-details" style="vertical-align: top; width: 240px;">
          <div><strong>تاريخ التوليد:</strong> ${new Date().toLocaleDateString('ar-SA')}</div>
          <div><strong>المحامي المسؤول:</strong> ${escapeHtml(report.caseInfo.responsibleLawyer)}</div>
          <div>${escapeHtml(firmAddress)}</div>
          ${firmPhone ? `<div><strong>هاتف:</strong> ${escapeHtml(firmPhone)}</div>` : ''}
        </td>
      </tr>
    </table>

    <!-- 1. Case & Client Particulars -->
    <div class="report-card">
      <div class="card-title">بيانات الدعوى والموكل</div>
      <div class="row-3">
        <div>
          <div class="field-label">رقم القضية</div>
          <div class="field-value">${escapeHtml(report.caseInfo.caseNumber)}</div>
        </div>
        <div>
          <div class="field-label">المحكمة والدائرة</div>
          <div class="field-value">${escapeHtml(report.caseInfo.court)} / ${escapeHtml(report.caseInfo.circuit)}</div>
        </div>
        <div>
          <div class="field-label">الموكل الكريم</div>
          <div class="field-value">${escapeHtml(report.clientName)} (${escapeHtml(report.caseInfo.clientRole)})</div>
        </div>
        <div>
          <div class="field-label">الطرف الخصم</div>
          <div class="field-value">${escapeHtml(report.caseInfo.opponentName)}</div>
        </div>
        <div>
          <div class="field-label">موضوع الدعوى</div>
          <div class="field-value">${escapeHtml(report.caseInfo.subject)}</div>
        </div>
        <div>
          <div class="field-label">تاريخ القيد</div>
          <div class="field-value">${escapeHtml(report.caseInfo.registrationDate)}</div>
        </div>
      </div>
    </div>

    <!-- 2. Session Proceedings & Result -->
    <div class="report-card">
      <div class="card-title">وقائع الجلسة وقرار الدائرة</div>
      <div class="row-3">
        <div>
          <div class="field-label">تاريخ الجلسة</div>
          <div class="field-value">${escapeHtml(report.sessionInfo.sessionDate)} ${report.sessionInfo.sessionDateHijri ? `(${escapeHtml(report.sessionInfo.sessionDateHijri)})` : ''}</div>
        </div>
        <div>
          <div class="field-label">وقت الجلسة والقاعة</div>
          <div class="field-value">${escapeHtml(report.sessionInfo.sessionTime)} | قاعة: ${escapeHtml(report.sessionInfo.courtRoom)}</div>
        </div>
        <div>
          <div class="field-label">رقم تسلسل الجلسة</div>
          <div class="field-value">الجلسة رقم (${escapeHtml(report.sessionInfo.sessionNumber)})</div>
        </div>
      </div>
      <div class="mt-2">
        <div class="field-label">قرار النتيجة الصادر في الجلسة</div>
        <div class="field-value" style="color: #b89758; font-size: 14px;">${escapeHtml(report.sessionInfo.result)}</div>
        ${report.sessionInfo.isPostponed ? `<div style="font-size: 12px; color: #475569; margin-top: 4px;"><strong>سبب التأجيل المعتمد:</strong> ${escapeHtml(report.sessionInfo.postponementReason)}</div>` : ''}
      </div>
    </div>

    <!-- 3. Client Summary (Lawyer Drafted) -->
    <div class="report-card">
      <div class="card-title">إيضاح مجريات الجلسة للموكل</div>
      <div class="summary-box">${escapeHtml(report.lawyerEdits.clientSummary)}</div>
    </div>

    <!-- 4. Next Session & Required Actions -->
    ${nextSessionBlock}

    <!-- 5. Lawyer Recommendation & Next Action -->
    <div class="report-card">
      <div class="card-title">توجيهات المحامي والخطوة التنفيذية القادمة</div>
      <div class="next-box">${escapeHtml(report.lawyerEdits.lawyerNoteAndNextStep)}</div>
    </div>

    <!-- Official Stamp & Delivery Status -->
    <div class="footer-stamp">
      <div>
        <div><strong>حالة المستند:</strong> ${escapeHtml(report.dispatch.statusLabel)}</div>
        ${report.dispatch.sentAt ? `<div><strong>تاريخ الإرسال:</strong> ${escapeHtml(report.dispatch.sentAt)} ${report.dispatch.sentViaLabel ? `(عبر: ${escapeHtml(report.dispatch.sentViaLabel)})` : ''}</div>` : ''}
        <div>تم استخراج هذا التقرير إلكترونياً ليكون إحاطة نظامية معتمدة بما تم في الجلسة.</div>
      </div>
      <div class="${stampClass}">${escapeHtml(stampText)}</div>
    </div>
  </div>
</body>
</html>`
}
