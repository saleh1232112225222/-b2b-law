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
    judgeName?: string
    subject: string
    shortSubject?: string
    showSubject?: boolean
    claimAmount?: string | number
    phase?: string
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
    sessionType?: string
    attendance?: string
    result: string
    isPostponed: boolean
    postponementReason: string
    hearingTimeLimit?: string
  }

  nextSessionInfo?: {
    date: string
    dateHijri?: string
    time?: string
    courtRoom?: string
    actionRequired?: string
    assignedParty?: string
    daysRemaining?: number
  }

  proceedings?: {
    ourSubmissions?: string
    opponentSubmissions?: string
    ourReply?: string
    courtDirectives?: string
  }

  casePosition?: {
    statusAfterSession?: string
    effectOnCase?: string
  }

  actionItems?: {
    clientAction?: string
    clientHasAction?: boolean
    officeAction?: string
    officeResponsible?: string
    officeDeadline?: string
  }

  lawyerEdits: {
    clientSummary: string
    lawyerNoteAndNextStep: string
    proceedingsSummary?: string
    casePositionSummary?: string
    showSubjectInReport?: boolean
  }

  internalOnlyData: {
    internalNotes: string
    risksAndNotes?: string
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
            c.claim_amount, c.phase,
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

  // Extract postponement reason
  let postponementReason = 'لم يثبت سبب التأجيل في بيانات الجلسة المتاحة'
  if (isPostponed) {
    if (outcomeRow?.notes && outcomeRow.notes.includes('سبب التأجيل:')) {
      const match = outcomeRow.notes.match(/سبب التأجيل:\s*([^\n\r]+)/)
      if (match && match[1].trim() && match[1].trim() !== 'غير مسجل') {
        postponementReason = match[1].trim()
      }
    } else if (sRow.notes && sRow.notes.includes('تأجيل')) {
      const cleaned = sRow.notes.replace(/^تأجيل\s*[:\-\.]?\s*/, '').trim()
      if (cleaned && cleaned !== 'غير مسجل') postponementReason = cleaned
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

    let daysRemaining: number | undefined = undefined
    if (nextSessionRow.date) {
      const nextD = new Date(nextSessionRow.date).getTime()
      const currD = new Date(sRow.date || Date.now()).getTime()
      const diff = Math.ceil((nextD - currD) / (1000 * 60 * 60 * 24))
      daysRemaining = diff > 0 ? diff : 0
    }

    nextSessionInfo = {
      date: toIsoDateString(nextSessionRow.date),
      dateHijri: nextSessionRow.date_hijri || '',
      time: nextSessionRow.time ? String(nextSessionRow.time).slice(0, 5) : '',
      courtRoom: nextSessionRow.court_room || '',
      actionRequired,
      assignedParty,
      daysRemaining
    }
  }

  // 5. Fetch existing Client Report record or construct initial default draft
  const reportRes = await query(
    `SELECT * FROM session_client_reports WHERE session_id = $1 AND company_id = $2`,
    [sessionId, companyId]
  )
  const existingReport = reportRes.rows[0] || null

  // Parse metadata_json if exists
  let meta: any = {}
  try {
    if (existingReport?.metadata_json) {
      meta = typeof existingReport.metadata_json === 'string'
        ? JSON.parse(existingReport.metadata_json)
        : existingReport.metadata_json
    }
  } catch {}

  let clientSummary = existingReport?.client_summary || meta.clientSummary || ''
  let lawyerNoteAndNextStep = existingReport?.lawyer_notes || meta.lawyerNoteAndNextStep || ''
  const internalNotes = existingReport?.internal_notes || (outcomeRow?.notes ? `سجل الجلسة: ${outcomeRow.notes}` : '')
  const dispatchStatus = (existingReport?.dispatch_status || 'draft') as ClientSessionReportData['dispatch']['status']

  // Auto-generate concise subject
  const fullSubject = String(sRow.subject || 'مطالبة قضائية')
  let shortSubject = meta.shortSubject || fullSubject
  if (!meta.shortSubject && fullSubject.length > 130) {
    const firstSent = fullSubject.split(/[\n\.\؛]/)[0].trim()
    shortSubject = firstSent.length >= 20 && firstSent.length <= 130 ? firstSent : fullSubject.slice(0, 120).trim() + '...'
  }

  // Auto-generate professional initial drafts if not yet edited
  if (!clientSummary) {
    if (isPostponed) {
      clientSummary = `نحيطكم علماً بأنه قد عُقدت جلسة القضية رقم (${sRow.case_number}) لدى ${sRow.court || 'المحكمة'}، وقررت الدائرة القضائية تأجيل نظر الدعوى؛ لاستكمال تبادل المذكرات وتقديم الردود النظامية المقررة.`
    } else if (rawResult.includes('حكم')) {
      clientSummary = `نحيطكم علماً بصدور قرار/حكم من الدائرة القضائية في جلسة اليوم نصه: (${rawResult}). وسيتم تزويدكم بنسخة الصك فور إيداعه رسمياً.`
    } else if (rawResult.includes('حجز')) {
      clientSummary = `عُقدت الجلسة المحددة لنظر الدعوى، وقررت الدائرة القضائية قفل باب المرافعة وحجز القضية للنطق بالحكم.`
    } else {
      clientSummary = `عُقدت الجلسة القضائية المحددة لنظر الدعوى، وتمت متابعة الإجراءات المقررة بحضور الأطراف، وثبتت نتيجة الجلسة بـ: (${rawResult}).`
    }
  }

  if (!lawyerNoteAndNextStep) {
    if (nextSessionInfo) {
      lawyerNoteAndNextStep = `المطلوب في المرحلة الحالية: ${nextSessionInfo.actionRequired}. ويتولى المكتب إعداد المذكرة والمستندات قبل موعد الجلسة القادمة.`
    } else {
      lawyerNoteAndNextStep = `يقوم فريق الترافع بدراسة الموقف الإجرائي ومتابعة قيد المواعيد والقرارات عبر منصة القضاء.`
    }
  }

  const showSubject = meta.showSubjectInReport !== undefined ? Boolean(meta.showSubjectInReport) : true
  const attendance = meta.attendance || 'حضر وكيل موكلنا وحضر وكيل الخصم'
  const sessionType = meta.sessionType || (isPostponed ? 'مرافعة وتبادل مذكرات' : 'جلسة مرافعة')
  const judgeName = meta.judgeName || sRow.circuit || 'الدائرة المختصة'
  const claimAmount = sRow.claim_amount || meta.claimAmount || 'محدد في ملف الدعوى'
  const phase = sRow.phase || meta.phase || 'المرحلة الابتدائية'

  const proceedings = {
    ourSubmissions: meta.proceedings?.ourSubmissions || 'تقديم المذكرة ومتابعة الطلبات المعتمدة من الدائرة.',
    opponentSubmissions: meta.proceedings?.opponentSubmissions || 'حضور وكيل الخصم والتمسك بما ورد في مذكراته السابقة.',
    ourReply: meta.proceedings?.ourReply || 'التمسك بالدفوع النظامية والمطالبة بالفصل وفق الأصول.',
    courtDirectives: meta.proceedings?.courtDirectives || (isPostponed ? 'إمهال الأطراف لتبادل المذكرات وتقديم المستندات.' : 'متابعة سير المرافعة.')
  }

  const casePosition = {
    statusAfterSession: meta.casePosition?.statusAfterSession || 'لا يوجد تغير جوهري في المركز القضائي للموكل',
    effectOnCase: meta.casePosition?.effectOnCase || 'لم يصدر في الجلسة قرار فاصل في الموضوع، واقتصر الإجراء على تأجيل نظر الدعوى لاستكمال تبادل المذكرات؛ ومن ثم لا يترتب على الجلسة الحالية تغير نهائي في المركز القضائي للموكل.'
  }

  const clientHasAction = meta.actionItems?.clientHasAction !== undefined ? Boolean(meta.actionItems.clientHasAction) : false
  const clientAction = meta.actionItems?.clientAction || (clientHasAction ? 'تزويد المكتب بالمستندات الإضافية المطلوبة' : 'لا يوجد إجراء مطلوب من الموكل حالياً')
  const officeAction = meta.actionItems?.officeAction || (nextSessionInfo?.actionRequired || 'إعداد المذكرة وحضور الجلسة القادمة')
  const officeResponsible = meta.actionItems?.officeResponsible || (sRow.lawyer_name || nextSessionInfo?.assignedParty || 'فريق الترافع بالمكتب')
  const officeDeadline = meta.actionItems?.officeDeadline || (nextSessionInfo?.date || 'قبل موعد الجلسة القادمة')

  const actionItems = {
    clientAction,
    clientHasAction,
    officeAction,
    officeResponsible,
    officeDeadline
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
      court: sRow.court || 'المحكمة المختصة',
      circuit: sRow.circuit || 'الدائرة المختصة',
      judgeName,
      subject: sRow.subject || 'غير مسجل',
      shortSubject,
      showSubject,
      claimAmount,
      phase,
      clientRole: sRow.client_role || 'الموكل',
      opponentName: sRow.opponent_name || 'الطرف الخصم',
      responsibleLawyer: sRow.lawyer_name || 'مكتب المحاماة',
      registrationDate: toIsoDateString(sRow.registration_date) || 'غير مسجل'
    },

    sessionInfo: {
      sessionDate: toIsoDateString(sRow.date),
      sessionDateHijri: sRow.date_hijri || '',
      sessionTime: sRow.time ? String(sRow.time).slice(0, 5) : '',
      courtRoom: sRow.court_room || '',
      sessionNumber,
      sessionType,
      attendance,
      result: rawResult,
      isPostponed,
      postponementReason,
      hearingTimeLimit: meta.hearingTimeLimit || (isPostponed ? 'موعد الجلسة القادمة' : undefined)
    },

    nextSessionInfo,
    proceedings,
    casePosition,
    actionItems,

    lawyerEdits: {
      clientSummary,
      lawyerNoteAndNextStep,
      proceedingsSummary: meta.proceedingsSummary || '',
      casePositionSummary: meta.casePositionSummary || '',
      showSubjectInReport: showSubject
    },

    internalOnlyData: {
      internalNotes,
      risksAndNotes: meta.risksAndNotes || ''
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
 * Saves lawyer edited texts, 7-block metadata, and internal notes.
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
    showSubjectInReport?: boolean
    shortSubject?: string
    attendance?: string
    sessionType?: string
    proceedings?: any
    casePosition?: any
    actionItems?: any
    metadataJson?: any
  }
): Promise<void> {
  await ensureClientReportsTable()

  const metaToSave: any = data.metadataJson || {}
  if (data.showSubjectInReport !== undefined) metaToSave.showSubjectInReport = data.showSubjectInReport
  if (data.shortSubject !== undefined) metaToSave.shortSubject = data.shortSubject
  if (data.attendance !== undefined) metaToSave.attendance = data.attendance
  if (data.sessionType !== undefined) metaToSave.sessionType = data.sessionType
  if (data.proceedings !== undefined) metaToSave.proceedings = data.proceedings
  if (data.casePosition !== undefined) metaToSave.casePosition = data.casePosition
  if (data.actionItems !== undefined) metaToSave.actionItems = data.actionItems

  await query(
    `INSERT INTO session_client_reports (
      id, company_id, session_id, case_id, client_id, 
      client_summary, lawyer_notes, internal_notes, metadata_json, dispatch_status, updated_at
    )
    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, 'draft', NOW())
    ON CONFLICT (company_id, session_id) DO UPDATE SET
      client_summary = EXCLUDED.client_summary,
      lawyer_notes = EXCLUDED.lawyer_notes,
      internal_notes = COALESCE(EXCLUDED.internal_notes, session_client_reports.internal_notes),
      metadata_json = COALESCE($8, session_client_reports.metadata_json),
      updated_at = NOW()`,
    [
      companyId,
      sessionId,
      data.caseId || null,
      data.clientId || null,
      data.clientSummary,
      data.lawyerNoteAndNextStep,
      data.internalNotes || null,
      JSON.stringify(metaToSave)
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

  const stampClass = report.dispatch.status === 'sent' || report.dispatch.status === 'approved' ? 'stamp-approved' : 'stamp-draft'
  const stampText = report.dispatch.status === 'sent' 
    ? 'نسخة رسمية معتمدة مرسلة للموكل' 
    : report.dispatch.status === 'approved' 
      ? 'معتمد للإرسال' 
      : 'مسودة قيد المراجعة'

  // Determine client requirement text & alert
  const clientHasAction = report.actionItems?.clientHasAction === true
  const clientActionText = clientHasAction
    ? (report.actionItems?.clientAction || 'تزويد المكتب بالمستندات والمعلومات المطلوبة')
    : 'لا يوجد إجراء مطلوب من الموكل حالياً'

  // Next session text
  let nextSessionSummaryText = 'لم تحدد بعد'
  if (report.nextSessionInfo?.date) {
    nextSessionSummaryText = report.nextSessionInfo.date
    if (report.nextSessionInfo.time) {
      nextSessionSummaryText += ' – ' + report.nextSessionInfo.time
    }
    if (report.nextSessionInfo.daysRemaining !== undefined && report.nextSessionInfo.daysRemaining !== null) {
      nextSessionSummaryText += ' (خلال ' + report.nextSessionInfo.daysRemaining + ' يوم)'
    }
  }

  // Format claim amount
  let claimAmountDisplay = 'غير محدد'
  if (report.caseInfo.claimAmount !== undefined && report.caseInfo.claimAmount !== null && report.caseInfo.claimAmount !== '') {
    const num = Number(report.caseInfo.claimAmount)
    claimAmountDisplay = !isNaN(num) && num > 0 ? num.toLocaleString('ar-SA') + ' ريال' : String(report.caseInfo.claimAmount)
  }

  // Attendance string
  const attendanceDisplay = report.sessionInfo.attendance || 'حضر وكيل موكلنا / حضر الخصم'
  const sessionTypeDisplay = report.sessionInfo.sessionType || 'جلسة مرافعة'

  // Optional subject block (if showSubject !== false)
  const showSubject = report.caseInfo.showSubject !== false
  const subjectDisplay = report.caseInfo.shortSubject || report.caseInfo.subject || 'غير مسجل'

  // Proceedings details
  const proc = report.proceedings
  const hasProcDetails = proc && (proc.ourSubmissions || proc.opponentSubmissions || proc.ourReply || proc.courtDirectives)
  const proceedingsSummary = report.lawyerEdits.proceedingsSummary || report.lawyerEdits.clientSummary || ''

  // Case position details
  const casePos = report.casePosition
  const positionStatus = casePos?.statusAfterSession || 'لا يوجد تغير جوهري في المركز القضائي'
  const positionEffect = casePos?.effectOnCase || (report.sessionInfo.isPostponed 
    ? 'لم يصدر في الجلسة قرار فاصل في الموضوع، واقتصر الإجراء على تأجيل نظر الدعوى؛ ومن ثم لا يترتب على الجلسة الحالية تغير نهائي في المركز القضائي للموكل.'
    : 'متابعة مسار الدعوى وفق المستجدات القضائية المقررة.')

  // Action items details
  const officeAction = report.actionItems?.officeAction || report.lawyerEdits.lawyerNoteAndNextStep || 'متابعة سير الدعوى وإعداد المذكرات'
  const officeResponsible = report.actionItems?.officeResponsible || report.caseInfo.responsibleLawyer || 'فريق الترافع بالمكتب'
  const officeDeadline = report.actionItems?.officeDeadline || (report.nextSessionInfo?.date ? ('قبل جلسة ' + report.nextSessionInfo.date) : 'المتابعة الدورية المستمرة')

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>تقرير جلسة قضائية معتمد - ${escapeHtml(report.caseInfo.caseNumber)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      direction: rtl;
      text-align: right;
      color: #000000;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 12px;
      line-height: 1.5;
      font-weight: 500;
    }
    .report-container {
      width: 100%;
      max-width: 820px;
      margin: 0 auto;
      position: relative;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #735c00;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .header-title {
      font-size: 18px;
      font-weight: 900;
      color: #000000;
      margin: 0 0 3px 0;
    }
    .header-subtitle {
      font-size: 13px;
      color: #735c00;
      font-weight: 800;
      margin: 0;
    }
    .firm-details {
      text-align: left;
      font-size: 11px;
      color: #000000;
      font-weight: 600;
    }

    /* Executive Quick Summary Strip */
    .quick-summary-strip {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #faf7ed;
      border: 1.5px solid #735c00;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 10px;
      font-size: 12px;
      page-break-inside: avoid;
    }
    .summary-item {
      display: flex;
      align-items: center;
      gap: 5px;
      color: #000000;
    }
    .summary-item .lbl {
      font-weight: 900;
      color: #735c00;
    }
    .summary-item .val {
      font-weight: 800;
      color: #000000;
    }
    .summary-item .val.action-needed {
      color: #b91c1c;
      font-weight: 900;
    }
    .summary-item .val.action-none {
      color: #15803d;
      font-weight: 800;
    }
    .summary-item-divider {
      color: #d4af37;
      font-weight: bold;
      margin: 0 4px;
    }

    /* Block Card Styling */
    .block-card {
      border: 1px solid #dcdfe4;
      border-radius: 6px;
      background: #ffffff;
      padding: 8px 12px;
      margin-bottom: 8px;
      page-break-inside: avoid;
    }
    .block-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1.5px solid #735c00;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }
    .block-title {
      font-size: 13px;
      font-weight: 900;
      color: #000000;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .block-title::before {
      content: '';
      display: inline-block;
      width: 4px;
      height: 12px;
      background: #735c00;
      border-radius: 2px;
    }
    .block-badge {
      font-size: 10.5px;
      font-weight: 800;
      color: #735c00;
      background: #fbf8ee;
      border: 1px solid #735c00;
      border-radius: 4px;
      padding: 1px 6px;
    }

    /* Grids */
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 5px 10px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 5px 10px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 5px 10px;
    }

    .field-item {
      display: flex;
      flex-direction: column;
    }
    .field-label {
      color: #735c00;
      font-size: 10.5px;
      font-weight: 800;
      margin-bottom: 1px;
    }
    .field-value {
      color: #000000;
      font-size: 12px;
      font-weight: 800;
      word-break: break-word;
    }

    /* Text & Highlight Boxes */
    .text-box {
      background: #fafafa;
      border: 1px solid #e2e8f0;
      border-right: 3.5px solid #735c00;
      border-radius: 4px;
      padding: 6px 10px;
      font-size: 12px;
      line-height: 1.55;
      color: #000000;
      font-weight: 600;
      white-space: pre-wrap;
    }

    .proceedings-subgrid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5px 8px;
      margin-top: 5px;
    }
    .proc-subitem {
      background: #fdfdfd;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 5px 7px;
    }
    .proc-subitem-title {
      font-size: 10.5px;
      font-weight: 900;
      color: #735c00;
      margin-bottom: 2px;
    }
    .proc-subitem-content {
      font-size: 11.5px;
      color: #000000;
      font-weight: 700;
      line-height: 1.4;
    }

    /* Block 7: Client Alert Banner */
    .client-alert-box {
      border: 1.5px solid #735c00;
      background: #faf7ed;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .client-alert-main {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .alert-tag {
      background: #735c00;
      color: #ffffff;
      font-size: 11px;
      font-weight: 900;
      padding: 2px 7px;
      border-radius: 4px;
    }
    .alert-text {
      font-size: 12.5px;
      font-weight: 800;
      color: #000000;
    }

    /* Footer Stamp */
    .footer-stamp {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 10px;
      padding-top: 6px;
      border-top: 1px solid #735c00;
      font-size: 10.5px;
      color: #000000;
      font-weight: 600;
      page-break-inside: avoid;
    }
    .stamp-approved {
      border: 2px solid #15803d;
      color: #15803d;
      padding: 3px 10px;
      font-size: 11.5px;
      font-weight: 900;
      border-radius: 6px;
      display: inline-block;
      transform: rotate(-2deg);
    }
    .stamp-draft {
      border: 2px dashed #735c00;
      color: #735c00;
      padding: 3px 10px;
      font-size: 11.5px;
      font-weight: 900;
      border-radius: 6px;
      display: inline-block;
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .block-card, .quick-summary-strip, .client-alert-box { break-inside: avoid; }
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
          <p class="header-subtitle">تقرير جلسة قضائية معتمد ─ إحاطة الموكل</p>
        </td>
        <td class="firm-details" style="vertical-align: top; width: 260px;">
          <div><strong>تاريخ التقرير:</strong> ${new Date().toLocaleDateString('ar-SA')}</div>
          <div><strong>المحامي المسؤول:</strong> ${escapeHtml(report.caseInfo.responsibleLawyer)}</div>
          <div>${escapeHtml(firmAddress)}</div>
          ${firmPhone ? ('<div><strong>هاتف / تواصل:</strong> ' + escapeHtml(firmPhone) + '</div>') : ''}
        </td>
      </tr>
    </table>

    <!-- Quick Summary Strip -->
    <div class="quick-summary-strip">
      <div class="summary-item">
        <span class="lbl">نتيجة الجلسة:</span>
        <span class="val">${escapeHtml(report.sessionInfo.result)}</span>
      </div>
      <div class="summary-item-divider">│</div>
      <div class="summary-item">
        <span class="lbl">الجلسة القادمة:</span>
        <span class="val">${escapeHtml(nextSessionSummaryText)}</span>
      </div>
      <div class="summary-item-divider">│</div>
      <div class="summary-item">
        <span class="lbl">المطلوب من الموكل:</span>
        <span class="val ${clientHasAction ? 'action-needed' : 'action-none'}">${escapeHtml(clientActionText)}</span>
      </div>
    </div>

    <!-- Block 1: Case Particulars -->
    <div class="block-card">
      <div class="block-header">
        <div class="block-title">1. بيانات القضية</div>
        <div class="block-badge">${escapeHtml(report.caseInfo.phase || 'المرحلة الابتدائية')}</div>
      </div>
      <div class="grid-4">
        <div class="field-item">
          <div class="field-label">رقم القضية</div>
          <div class="field-value">${escapeHtml(report.caseInfo.caseNumber)}</div>
        </div>
        <div class="field-item">
          <div class="field-label">المحكمة والدائرة</div>
          <div class="field-value">${escapeHtml(report.caseInfo.court)} / ${escapeHtml(report.caseInfo.circuit)}</div>
        </div>
        <div class="field-item">
          <div class="field-label">الموكل وصفته</div>
          <div class="field-value">${escapeHtml(report.clientName)} (${escapeHtml(report.caseInfo.clientRole)})</div>
        </div>
        <div class="field-item">
          <div class="field-label">الطرف الخصم</div>
          <div class="field-value">${escapeHtml(report.caseInfo.opponentName)}</div>
        </div>
      </div>
      <div class="grid-3" style="margin-top: 6px;">
        <div class="field-item">
          <div class="field-label">قيمة المطالبة</div>
          <div class="field-value">${escapeHtml(claimAmountDisplay)}</div>
        </div>
        ${report.caseInfo.judgeName ? ('<div class="field-item"><div class="field-label">ناظر الدعوى / الدائرة</div><div class="field-value">' + escapeHtml(report.caseInfo.judgeName) + '</div></div>') : ''}
        <div class="field-item">
          <div class="field-label">تاريخ القيد</div>
          <div class="field-value">${escapeHtml(report.caseInfo.registrationDate)}</div>
        </div>
      </div>
      ${showSubject ? ('<div style="margin-top: 6px; padding-top: 5px; border-top: 1px dashed #e2e8f0;"><div class="field-label">ملخص موضوع الدعوى</div><div class="field-value" style="font-weight: 700; color: #1e293b;">' + escapeHtml(subjectDisplay) + '</div></div>') : ''}
    </div>

    <!-- Block 2: Session Info & Attendance -->
    <div class="block-card">
      <div class="block-header">
        <div class="block-title">2. بيانات الجلسة المنعقدة وتوثيق الحضور</div>
        <div class="block-badge">الجلسة رقم (${escapeHtml(report.sessionInfo.sessionNumber)})</div>
      </div>
      <div class="grid-4">
        <div class="field-item">
          <div class="field-label">تاريخ الجلسة</div>
          <div class="field-value">${escapeHtml(report.sessionInfo.sessionDate)} ${report.sessionInfo.sessionDateHijri ? ('(' + escapeHtml(report.sessionInfo.sessionDateHijri) + ')') : ''}</div>
        </div>
        <div class="field-item">
          <div class="field-label">وقت الجلسة والقاعة</div>
          <div class="field-value">${escapeHtml(report.sessionInfo.sessionTime || 'غير محدد')} ${report.sessionInfo.courtRoom ? ('| قاعة: ' + escapeHtml(report.sessionInfo.courtRoom)) : ''}</div>
        </div>
        <div class="field-item">
          <div class="field-label">نوع الجلسة</div>
          <div class="field-value">${escapeHtml(sessionTypeDisplay)}</div>
        </div>
        <div class="field-item">
          <div class="field-label">حضور الأطراف</div>
          <div class="field-value">${escapeHtml(attendanceDisplay)}</div>
        </div>
      </div>
    </div>

    <!-- Block 3: Proceedings (Heart of Report) -->
    <div class="block-card">
      <div class="block-header">
        <div class="block-title">3. ملخص مجريات ووقائع الجلسة</div>
      </div>
      <div class="text-box">${escapeHtml(proceedingsSummary)}</div>
      ${hasProcDetails ? ('<div class="proceedings-subgrid">' +
        (proc.ourSubmissions ? ('<div class="proc-subitem"><div class="proc-subitem-title">ما قدمه وكيل موكلنا:</div><div class="proc-subitem-content">' + escapeHtml(proc.ourSubmissions) + '</div></div>') : '') +
        (proc.opponentSubmissions ? ('<div class="proc-subitem"><div class="proc-subitem-title">ما قدمه الخصم:</div><div class="proc-subitem-content">' + escapeHtml(proc.opponentSubmissions) + '</div></div>') : '') +
        (proc.ourReply ? ('<div class="proc-subitem"><div class="proc-subitem-title">أبرز ما أثير وردنا عليه:</div><div class="proc-subitem-content">' + escapeHtml(proc.ourReply) + '</div></div>') : '') +
        (proc.courtDirectives ? ('<div class="proc-subitem"><div class="proc-subitem-title">توجيه وأسئلة الدائرة القضائية:</div><div class="proc-subitem-content">' + escapeHtml(proc.courtDirectives) + '</div></div>') : '') +
      '</div>') : ''}
    </div>

    <!-- Block 4: Court Decision & Next Session -->
    <div class="block-card">
      <div class="block-header">
        <div class="block-title">4. قرار الدائرة القضائية ومواعيد المتابعة</div>
      </div>
      <div class="grid-2">
        <div class="field-item">
          <div class="field-label">القرار الصادر بالجلسة</div>
          <div class="field-value" style="color: #735c00; font-size: 13.5px; font-weight: 900;">${escapeHtml(report.sessionInfo.result)}</div>
        </div>
        <div class="field-item">
          <div class="field-label">سبب التأجيل المعتمد</div>
          <div class="field-value">${escapeHtml(report.sessionInfo.postponementReason)}</div>
        </div>
      </div>
      ${report.nextSessionInfo ? ('<div class="grid-3" style="margin-top: 6px; padding-top: 5px; border-top: 1px dashed #e2e8f0;"><div class="field-item"><div class="field-label">تاريخ الجلسة القادمة</div><div class="field-value">' + escapeHtml(report.nextSessionInfo.date) + (report.nextSessionInfo.time ? (' – ' + escapeHtml(report.nextSessionInfo.time)) : '') + '</div></div><div class="field-item"><div class="field-label">المدة المتبقية</div><div class="field-value">' + (report.nextSessionInfo.daysRemaining !== undefined && report.nextSessionInfo.daysRemaining !== null ? ('باقٍ ' + report.nextSessionInfo.daysRemaining + ' يوماً') : 'محددة بالنظام') + '</div></div><div class="field-item"><div class="field-label">قاعة الانعقاد / الرابط</div><div class="field-value">' + escapeHtml(report.nextSessionInfo.courtRoom || 'جلسة مرئية / إلكترونية') + '</div></div></div>') : '<div style="margin-top: 6px; font-size: 12px; color: #64748b;">لم يُحدد موعد الجلسة القادمة بعد من قِبل الدائرة القضائية، وتتم المتابعة اليومية الدورية عبر منصة وزارة العدل.</div>'}
    </div>

    <!-- Block 5: Case Position After Session -->
    <div class="block-card">
      <div class="block-header">
        <div class="block-title">5. موقف القضية بعد الجلسة</div>
      </div>
      <div class="field-item">
        <div class="field-label">المركز القضائي الحالي</div>
        <div class="field-value" style="font-weight: 800; color: #000000; margin-bottom: 4px;">${escapeHtml(positionStatus)}</div>
      </div>
      <div class="field-item">
        <div class="field-label">أثر الجلسة الإجرائي على مسار القضية</div>
        <div class="text-box" style="margin-top: 2px;">${escapeHtml(positionEffect)}</div>
      </div>
    </div>

    <!-- Block 6: Next Actions (Office & Client) -->
    <div class="block-card">
      <div class="block-header">
        <div class="block-title">6. الإجراءات القادمة ومسؤوليات المتابعة</div>
      </div>
      <div class="grid-3">
        <div class="field-item">
          <div class="field-label">المهمة المطلوبة من المكتب</div>
          <div class="field-value">${escapeHtml(officeAction)}</div>
        </div>
        <div class="field-item">
          <div class="field-label">المسؤول بالمكتب</div>
          <div class="field-value">${escapeHtml(officeResponsible)}</div>
        </div>
        <div class="field-item">
          <div class="field-label">الموعد النهائي للتنفيذ</div>
          <div class="field-value">${escapeHtml(officeDeadline)}</div>
        </div>
      </div>
    </div>

    <!-- Block 7: Client Alert -->
    <div class="client-alert-box">
      <div class="client-alert-main">
        <span class="alert-tag">7. تنبيه الموكل</span>
        <span class="alert-text">
          ${clientHasAction 
            ? ('المطلوب منكم: ' + escapeHtml(report.actionItems?.clientAction || ''))
            : 'لا يوجد إجراء مطلوب من الموكل حالياً، ويتولى المكتب المتابعة القضائية والدفاع.'}
        </span>
      </div>
      <div style="font-size: 11px; font-weight: 800; color: #735c00;">
        ${clientHasAction ? 'مطلوب اتخاذ إجراء' : 'تحت المتابعة المهنية'}
      </div>
    </div>

    <!-- Official Stamp & Verification -->
    <div class="footer-stamp">
      <div>
        <div><strong>حالة التقرير:</strong> ${escapeHtml(report.dispatch.statusLabel)}</div>
        ${report.dispatch.sentAt ? ('<div><strong>تاريخ الإرسال:</strong> ' + escapeHtml(report.dispatch.sentAt) + (report.dispatch.sentViaLabel ? (' (عبر: ' + escapeHtml(report.dispatch.sentViaLabel) + ')') : '') + '</div>') : ''}
        <div>تم اعتماد هذا التقرير نظامياً ومطابقته لضبط الجلسة القضائية لحفظ حقوق الموكل وإحاطته بدقة.</div>
      </div>
      <div class="${stampClass}">${escapeHtml(stampText)}</div>
    </div>
  </div>
</body>
</html>`
}
