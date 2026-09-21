import { query } from '../db/connection'

export interface ClientCaseReportSessionItem {
  id: string
  sessionNumber: number
  date: string
  dateHijri?: string
  time?: string
  courtRoom?: string
  sessionType?: string
  attendance?: string
  result: string
  isPostponed: boolean
  postponementReason: string
}

export interface ClientCaseReportJudgmentItem {
  id: string
  type: string
  judgmentDate: string
  favor: string
  notes?: string
}

export interface ClientCaseReportData {
  id: string
  companyId: string
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
    status?: string
    priority?: string
    clientRole: string
    opponentName: string
    responsibleLawyer: string
    registrationDate: string
  }

  sessions: ClientCaseReportSessionItem[]

  nextSessionInfo?: {
    date: string
    dateHijri?: string
    time?: string
    courtRoom?: string
    actionRequired?: string
    assignedParty?: string
    daysRemaining?: number
  }

  judgments?: ClientCaseReportJudgmentItem[]

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

export const CASE_DISPATCH_STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة',
  reviewed: 'تمت المراجعة',
  approved: 'معتمد',
  sent: 'أرسل للعميل'
}

export const CASE_SENT_VIA_LABELS: Record<string, string> = {
  whatsapp: 'واتساب',
  email: 'بريد إلكتروني',
  manual_print: 'تسليم يدوي / مطبوع',
  client_portal: 'بوابة الموكل الإلكترونية'
}

export async function ensureCaseClientReportsTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS case_client_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      case_id UUID NOT NULL,
      client_id UUID,
      client_summary TEXT,
      lawyer_notes TEXT,
      internal_notes TEXT,
      dispatch_status VARCHAR(32) NOT NULL DEFAULT 'draft',
      reviewed_by VARCHAR(255),
      reviewed_at TIMESTAMPTZ,
      approved_by VARCHAR(255),
      approved_at TIMESTAMPTZ,
      sent_by VARCHAR(255),
      sent_at TIMESTAMPTZ,
      sent_via VARCHAR(64),
      metadata_json JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(company_id, case_id)
    );
    CREATE INDEX IF NOT EXISTS idx_case_client_reports_case ON case_client_reports(company_id, case_id);
  `)
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

export async function buildClientCaseReport(
  caseId: string,
  companyId: string
): Promise<ClientCaseReportData> {
  await ensureCaseClientReportsTable()

  // 1. Fetch Case and linked Client
  const caseRes = await query(
    `SELECT c.*, 
            COALESCE(u.full_name, u.username, 'مكتب المحاماة') as lawyer_name,
            cl.id as cl_id, cl.name as client_name, cl.phone as client_phone, cl.email as client_email
     FROM cases c
     LEFT JOIN clients cl ON cl.id = c.client_id
     LEFT JOIN users u ON u.id = c.responsible_user_id
     WHERE (c.id::text = $1 OR c.case_number = $1) AND c.company_id = $2`,
    [caseId, companyId]
  )

  const cRow = caseRes.rows[0]
  if (!cRow) {
    throw new Error('القضية غير موجودة أو تم حذفها')
  }

  const realCaseId = cRow.id

  // 2. Fetch all linked sessions ordered by date ASC
  const sessionsRes = await query(
    `SELECT s.*, 
            so.result as outcome_result, so.notes as outcome_notes
     FROM sessions s
     LEFT JOIN session_outcomes so ON so.session_id = s.id
     WHERE (s.case_id = $1 OR s.case_id::text = $1::text) AND s.company_id = $2
     ORDER BY s.date ASC, s.time ASC, s.created_at ASC`,
    [realCaseId, companyId]
  )

  const now = new Date()
  const todayStr = toIsoDateString(now)

  const sessionsList: ClientCaseReportSessionItem[] = []
  let nextSessionItem: any = null

  sessionsRes.rows.forEach((sRow: any, idx: number) => {
    const sessionDateStr = toIsoDateString(sRow.date)
    const rawResult = String(sRow.outcome_result || sRow.result || 'قيد الإجراء')
    const isPostponed = rawResult.includes('تأجيل') || rawResult.includes('موعد آخر')

    let postponementReason = 'لم يثبت سبب التأجيل في بيانات الجلسة المتاحة'
    if (isPostponed) {
      if (sRow.outcome_notes && sRow.outcome_notes.includes('سبب التأجيل:')) {
        const match = sRow.outcome_notes.match(/سبب التأجيل:\s*([^|\n\r]+)/)
        if (match && match[1].trim()) postponementReason = match[1].trim()
      } else if (sRow.notes && sRow.notes.includes('تأجيل')) {
        postponementReason = sRow.notes
      }
    }

    sessionsList.push({
      id: sRow.id,
      sessionNumber: idx + 1,
      date: sessionDateStr,
      dateHijri: sRow.date_hijri || '',
      time: sRow.time ? String(sRow.time).slice(0, 5) : '',
      courtRoom: sRow.court_room || '',
      sessionType: isPostponed ? 'مرافعة وتبادل مذكرات' : 'جلسة مرافعة',
      attendance: 'حضر وكيل موكلنا وحضر وكيل الخصم',
      result: rawResult,
      isPostponed,
      postponementReason
    })

    if (sessionDateStr >= todayStr && sRow.status !== 'ملغية' && !nextSessionItem) {
      nextSessionItem = sRow
    }
  })

  // Next session calculation
  let nextSessionInfo: ClientCaseReportData['nextSessionInfo'] | undefined = undefined
  if (nextSessionItem) {
    let actionRequired = 'حضور الجلسة ومتابعة إجراءات الدعوى'
    let assignedParty = 'فريق الترافع بالمكتب'
    if (nextSessionItem.notes) {
      if (nextSessionItem.notes.includes('المطلوب:')) {
        const m = nextSessionItem.notes.match(/المطلوب:\s*([^|\n\r]+)/)
        if (m) actionRequired = m[1].trim()
      }
      if (nextSessionItem.notes.includes('المكلف:')) {
        const m = nextSessionItem.notes.match(/المكلف:\s*([^|\n\r]+)/)
        if (m) assignedParty = m[1].trim()
      }
    }

    let daysRemaining: number | undefined = undefined
    if (nextSessionItem.date) {
      const nextD = new Date(nextSessionItem.date).getTime()
      const currD = new Date().getTime()
      const diff = Math.ceil((nextD - currD) / (1000 * 60 * 60 * 24))
      daysRemaining = diff > 0 ? diff : 0
    }

    nextSessionInfo = {
      date: toIsoDateString(nextSessionItem.date),
      dateHijri: nextSessionItem.date_hijri || '',
      time: nextSessionItem.time ? String(nextSessionItem.time).slice(0, 5) : '',
      courtRoom: nextSessionItem.court_room || '',
      actionRequired,
      assignedParty,
      daysRemaining
    }
  }

  // 3. Fetch Judgments if table exists
  let judgmentsList: ClientCaseReportJudgmentItem[] = []
  try {
    const judgRes = await query(
      `SELECT * FROM judgments WHERE (case_id = $1 OR case_id::text = $1::text) AND company_id = $2 ORDER BY judgment_date DESC`,
      [realCaseId, companyId]
    )
    judgmentsList = judgRes.rows.map((j: any) => ({
      id: j.id,
      type: j.type || 'حكم قضائي',
      judgmentDate: toIsoDateString(j.judgment_date),
      favor: j.favor || 'قيد التدقيق',
      notes: j.notes || j.text || ''
    }))
  } catch {}

  // 4. Fetch existing case client report
  const repRes = await query(
    `SELECT * FROM case_client_reports WHERE (case_id = $1 OR case_id::text = $1::text) AND company_id = $2`,
    [realCaseId, companyId]
  )
  const existingReport = repRes.rows[0] || null

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
  const internalNotes = existingReport?.internal_notes || (cRow.notes ? `سجل القضية الداخلي: ${cRow.notes}` : '')
  const dispatchStatus = (existingReport?.dispatch_status || 'draft') as ClientCaseReportData['dispatch']['status']

  // Auto-generate concise subject
  const fullSubject = String(cRow.subject || 'دعوى ومطالبة قضائية')
  let shortSubject = meta.shortSubject || fullSubject
  if (!meta.shortSubject && fullSubject.length > 130) {
    const firstSent = fullSubject.split(/[\n.؛]/)[0].trim()
    shortSubject = firstSent.length >= 20 && firstSent.length <= 130 ? firstSent : fullSubject.slice(0, 120).trim() + '...'
  }

  if (!clientSummary) {
    const totalSessions = sessionsList.length
    clientSummary = `نحيطكم علماً بأن القضية رقم (${cRow.case_number}) المقيدة لدى ${cRow.court || 'المحكمة'} تسير وفق الخطة القانونية المعتمدة؛ حيث عُقدت حتى تاريخه (${totalSessions}) جلسات قضائية، وقام فريق الترافع بتقديم المذكرات والدفوع النظامية اللازمة لحفظ حقوقكم ومتابعة كافة القرارات الصادرة.`
  }

  if (!lawyerNoteAndNextStep) {
    if (nextSessionInfo) {
      lawyerNoteAndNextStep = `المطلوب في المرحلة الحالية: (${nextSessionInfo.actionRequired})، ويتولى المكتب إعداد المذكرة واستكمال المتطلبات قبل الجلسة القادمة المحددة بتاريخ ${nextSessionInfo.date}.`
    } else {
      lawyerNoteAndNextStep = `يقوم المكتب بمتابعة قرارات الدائرة القضائية وقيد المواعيد الجديدة فور صدورها عبر البوابة الرسمية.`
    }
  }

  const showSubject = meta.showSubjectInReport !== undefined ? Boolean(meta.showSubjectInReport) : true
  const claimAmount = cRow.contract_amount || cRow.claim_amount || meta.claimAmount || 'محدد في ملف الدعوى'
  const phase = cRow.phase || meta.phase || 'المرحلة الابتدائية'

  const proceedings = {
    ourSubmissions: meta.proceedings?.ourSubmissions || 'تقديم لوائح الدعوى والمذكرات الجوابية والمستندات الداعمة وفق الأصول.',
    opponentSubmissions: meta.proceedings?.opponentSubmissions || 'حضور الخصم أو وكيله وتقديم إجاباته ومذكراته.',
    ourReply: meta.proceedings?.ourReply || 'تفنيـد دفوع الخصم وتقديم الأدلة والبينات النظامية المؤيدة لطلبات موكلنا.',
    courtDirectives: meta.proceedings?.courtDirectives || 'سير الدعوى وفق التوجيهات القضائية المقررة وقواعد المرافعات.'
  }

  const casePosition = {
    statusAfterSession: meta.casePosition?.statusAfterSession || (cRow.status === 'منتهية' ? 'صدر قرار فاصل ومنهي للدعوى' : 'الدعوى قيد التداول والمرافعة المنتظمة'),
    effectOnCase: meta.casePosition?.effectOnCase || 'تسير الدعوى بشكل إيجابي ومنتظم طبقاً للإجراءات القضائية المتبعة لحفظ حقوق الموكل.'
  }

  const clientHasAction = meta.actionItems?.clientHasAction !== undefined ? Boolean(meta.actionItems.clientHasAction) : false
  const clientAction = meta.actionItems?.clientAction || (clientHasAction ? 'تزويد المكتب بالمستندات الإضافية المطلوبة' : 'لا يوجد إجراء مطلوب من الموكل حالياً')
  const officeAction = meta.actionItems?.officeAction || (nextSessionInfo?.actionRequired || 'متابعة سير الدعوى وإعداد المذكرات')
  const officeResponsible = meta.actionItems?.officeResponsible || (cRow.lawyer_name || 'فريق الترافع بالمكتب')
  const officeDeadline = meta.actionItems?.officeDeadline || (nextSessionInfo?.date || 'المتابعة الدورية المستمرة')

  const actionItems = {
    clientAction,
    clientHasAction,
    officeAction,
    officeResponsible,
    officeDeadline
  }

  return {
    id: existingReport?.id || caseId,
    companyId,
    caseId,
    clientId: cRow.cl_id || '',
    clientName: cRow.client_name || 'الموكل الكريم',
    clientPhone: cRow.client_phone || '',
    clientEmail: cRow.client_email || '',

    caseInfo: {
      caseNumber: cRow.case_number,
      court: cRow.court || 'المحكمة المختصة',
      circuit: cRow.circuit || 'الدائرة المختصة',
      judgeName: cRow.judge_name || cRow.circuit || 'الدائرة القضائية',
      subject: cRow.subject || 'غير مسجل',
      shortSubject,
      showSubject,
      claimAmount,
      phase,
      status: cRow.status || 'قيد النظر',
      priority: cRow.priority || 'متوسطة',
      clientRole: cRow.client_role || 'الموكل',
      opponentName: cRow.opponent_name || 'الطرف الخصم',
      responsibleLawyer: cRow.lawyer_name || 'مكتب المحاماة',
      registrationDate: toIsoDateString(cRow.registration_date) || 'غير مسجل'
    },

    sessions: sessionsList,
    nextSessionInfo,
    judgments: judgmentsList,
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
      statusLabel: CASE_DISPATCH_STATUS_LABELS[dispatchStatus] || 'مسودة',
      reviewedBy: existingReport?.reviewed_by || undefined,
      reviewedAt: existingReport?.reviewed_at ? String(existingReport.reviewed_at) : undefined,
      approvedBy: existingReport?.approved_by || undefined,
      approvedAt: existingReport?.approved_at ? String(existingReport.approved_at) : undefined,
      sentAt: existingReport?.sent_at ? String(existingReport.sent_at) : undefined,
      sentBy: existingReport?.sent_by || undefined,
      sentVia: existingReport?.sent_via || undefined,
      sentViaLabel: existingReport?.sent_via ? CASE_SENT_VIA_LABELS[existingReport.sent_via] || existingReport.sent_via : undefined
    }
  }
}

export async function saveClientCaseReportEdits(
  caseId: string,
  companyId: string,
  data: {
    clientSummary: string
    lawyerNoteAndNextStep: string
    internalNotes?: string
    clientId?: string
    showSubjectInReport?: boolean
    shortSubject?: string
    proceedings?: any
    casePosition?: any
    actionItems?: any
    metadataJson?: any
  }
): Promise<void> {
  await ensureCaseClientReportsTable()

  const caseCheck = await query(
    `SELECT id FROM cases WHERE (id::text = $1 OR case_number = $1) AND company_id = $2`,
    [caseId, companyId]
  )
  const targetCaseId = caseCheck.rows[0]?.id || caseId

  const metaToSave: any = data.metadataJson || {}
  if (data.showSubjectInReport !== undefined) metaToSave.showSubjectInReport = data.showSubjectInReport
  if (data.shortSubject !== undefined) metaToSave.shortSubject = data.shortSubject
  if (data.proceedings !== undefined) metaToSave.proceedings = data.proceedings
  if (data.casePosition !== undefined) metaToSave.casePosition = data.casePosition
  if (data.actionItems !== undefined) metaToSave.actionItems = data.actionItems

  await query(
    `INSERT INTO case_client_reports (
      id, company_id, case_id, client_id, 
      client_summary, lawyer_notes, internal_notes, metadata_json, dispatch_status, updated_at
    )
    VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'draft', NOW())
    ON CONFLICT (company_id, case_id) DO UPDATE SET
      client_summary = EXCLUDED.client_summary,
      lawyer_notes = EXCLUDED.lawyer_notes,
      internal_notes = COALESCE(EXCLUDED.internal_notes, case_client_reports.internal_notes),
      metadata_json = EXCLUDED.metadata_json,
      updated_at = NOW()`,
    [
      companyId,
      targetCaseId,
      data.clientId || null,
      data.clientSummary,
      data.lawyerNoteAndNextStep,
      data.internalNotes || null,
      JSON.stringify(metaToSave)
    ]
  )
}

export async function transitionClientCaseReportStatus(
  caseId: string,
  companyId: string,
  input: {
    toStatus: 'draft' | 'reviewed' | 'approved' | 'sent'
    sentVia?: string
    userId: string
  }
): Promise<void> {
  await ensureCaseClientReportsTable()

  const caseCheck = await query(
    `SELECT id FROM cases WHERE (id::text = $1 OR case_number = $1) AND company_id = $2`,
    [caseId, companyId]
  )
  const targetCaseId = caseCheck.rows[0]?.id || caseId

  let sql = ''
  const params: any[] = [input.toStatus, companyId, targetCaseId]

  if (input.toStatus === 'reviewed') {
    sql = `UPDATE case_client_reports 
           SET dispatch_status = $1, reviewed_by = $4, reviewed_at = NOW(), updated_at = NOW()
           WHERE company_id = $2 AND (case_id = $3 OR case_id::text = $3::text)`
    params.push(input.userId)
  } else if (input.toStatus === 'approved') {
    sql = `UPDATE case_client_reports 
           SET dispatch_status = $1, approved_by = $4, approved_at = NOW(), updated_at = NOW()
           WHERE company_id = $2 AND (case_id = $3 OR case_id::text = $3::text)`
    params.push(input.userId)
  } else if (input.toStatus === 'sent') {
    sql = `UPDATE case_client_reports 
           SET dispatch_status = $1, sent_by = $4, sent_at = NOW(), sent_via = $5, updated_at = NOW()
           WHERE company_id = $2 AND (case_id = $3 OR case_id::text = $3::text)`
    params.push(input.userId, input.sentVia || 'whatsapp')
  } else {
    sql = `UPDATE case_client_reports 
           SET dispatch_status = $1, updated_at = NOW()
           WHERE company_id = $2 AND (case_id = $3 OR case_id::text = $3::text)`
  }

  const res = await query(sql, params)
  if (res.rowCount === 0) {
    const rep = await buildClientCaseReport(caseId, companyId)
    await query(
      `INSERT INTO case_client_reports (
        id, company_id, case_id, client_id, client_summary, lawyer_notes, 
        dispatch_status, reviewed_by, reviewed_at, approved_by, approved_at, sent_by, sent_at, sent_via
      )
      VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6,
        $7, CASE WHEN $6 IN ('reviewed', 'approved', 'sent') THEN NOW() ELSE NULL END,
        $7, CASE WHEN $6 IN ('approved', 'sent') THEN NOW() ELSE NULL END,
        $7, CASE WHEN $6 = 'sent' THEN NOW() ELSE NULL END,
        $8
      )`,
      [
        companyId,
        caseId,
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

export function renderClientCaseReportHtml(
  report: ClientCaseReportData,
  firm: { name?: string; phone?: string; address?: string; logo?: string } = {}
): string {
  const caseInfo = report.caseInfo || ({} as any)
  const dispatch = report.dispatch || ({} as any)
  const lawyerEdits = report.lawyerEdits || ({} as any)
  const nextSessionInfo = report.nextSessionInfo || null
  const actionItems = report.actionItems || ({} as any)
  const casePosition = report.casePosition || ({} as any)
  const sessions = report.sessions || []
  const judgments = report.judgments || []

  const firmName = firm.name || 'مكتب المحاماة والاستشارات القانونية'
  const firmPhone = firm.phone || ''
  const firmAddress = firm.address || 'المملكة العربية السعودية'

  const stampClass = dispatch.status === 'sent' || dispatch.status === 'approved' ? 'stamp-approved' : 'stamp-draft'
  const stampText = dispatch.status === 'sent' 
    ? 'نسخة رسمية معتمدة مرسلة للموكل' 
    : dispatch.status === 'approved' 
      ? 'معتمد للإرسال' 
      : 'مسودة قيد المراجعة'

  const clientHasAction = actionItems.clientHasAction === true
  const clientActionText = clientHasAction
    ? (actionItems.clientAction || 'تزويد المكتب بالمستندات والمعلومات المطلوبة')
    : 'لا يوجد إجراء مطلوب من الموكل حالياً'

  let nextSessionSummaryText = 'لا توجد جلسات قادمة محددة'
  if (nextSessionInfo?.date) {
    nextSessionSummaryText = nextSessionInfo.date
    if (nextSessionInfo.time) nextSessionSummaryText += ' – ' + nextSessionInfo.time
    if (nextSessionInfo.daysRemaining !== undefined && nextSessionInfo.daysRemaining !== null) {
      nextSessionSummaryText += ` (خلال ${nextSessionInfo.daysRemaining} يوم)`
    }
  }

  let claimAmountDisplay = 'غير محدد'
  if (caseInfo.claimAmount !== undefined && caseInfo.claimAmount !== null && caseInfo.claimAmount !== '') {
    const num = Number(caseInfo.claimAmount)
    claimAmountDisplay = !isNaN(num) && num > 0 ? num.toLocaleString('ar-SA') + ' ريال' : String(caseInfo.claimAmount)
  }

  const showSubject = caseInfo.showSubject !== false
  const subjectDisplay = caseInfo.shortSubject || caseInfo.subject || 'غير مسجل'

  // Sessions Table rows
  const sessionsRows = sessions.map(s => `
    <tr>
      <td style="text-align: center; font-weight: 800;">${s.sessionNumber || '─'}</td>
      <td style="font-weight: 800;">${escapeHtml(s.date || '')} ${s.dateHijri ? `<br><small style="color: #64748b;">(${escapeHtml(s.dateHijri)})</small>` : ''}</td>
      <td style="font-weight: 700;">${escapeHtml(s.sessionType || 'مرافعة')}</td>
      <td style="font-weight: 700;">${escapeHtml(s.attendance || 'حضر الطرفان')}</td>
      <td style="font-weight: 800; color: #735c00;">${escapeHtml(s.result || '')}</td>
      <td style="font-size: 11px; color: #334155;">${escapeHtml(s.postponementReason || '')}</td>
    </tr>
  `).join('')

  // Judgments block
  const hasJudgments = judgments.length > 0
  const judgmentsHtml = hasJudgments ? `
    <table class="report-table">
      <thead>
        <tr>
          <th>درجة الحكم</th>
          <th>تاريخ الحكم</th>
          <th>المنطوق / الإفادة</th>
          <th>ملاحظات الدائرة</th>
        </tr>
      </thead>
      <tbody>
        ${judgments.map(j => `
          <tr>
            <td style="font-weight: 800;">${escapeHtml(j.type || '')}</td>
            <td style="font-weight: 800;">${escapeHtml(j.judgmentDate || '')}</td>
            <td style="font-weight: 900; color: #735c00;">${escapeHtml(j.favor || '')}</td>
            <td>${escapeHtml(j.notes || '---')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : `<div style="font-size: 12px; color: #475569; padding: 6px 0;">لا يوجد حكم منهي للخصومة حتى تاريخ هذا التقرير، والدعوى قيد التداول والمرافعة المنتظمة.</div>`

  const positionStatus = casePosition.statusAfterSession || 'الدعوى قيد التداول والمرافعة المنتظمة'
  const positionEffect = casePosition.effectOnCase || 'تسير الدعوى بشكل إيجابي ومنتظم طبقاً للإجراءات القضائية المتبعة لحفظ حقوق الموكل.'

  const officeAction = actionItems.officeAction || lawyerEdits.lawyerNoteAndNextStep || 'متابعة سير الدعوى وإعداد اللوائح'
  const officeResponsible = actionItems.officeResponsible || caseInfo.responsibleLawyer || 'فريق الترافع بالمكتب'
  const officeDeadline = actionItems.officeDeadline || (nextSessionInfo?.date ? `قبل جلسة ${nextSessionInfo.date}` : 'المتابعة الدورية المستمرة')

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>تقرير القضية الشامل للموكل - ${escapeHtml(caseInfo.caseNumber || '')}</title>
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

    /* Executive Quick Summary Bar */
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

    /* Block Cards */
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

    /* Table */
    .report-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 5px;
      font-size: 11.5px;
    }
    .report-table th {
      background: #faf7ed;
      color: #735c00;
      font-weight: 900;
      border: 1px solid #dcdfe4;
      padding: 5px 8px;
      text-align: right;
    }
    .report-table td {
      border: 1px solid #e2e8f0;
      padding: 5px 8px;
      color: #000000;
      vertical-align: middle;
    }

    /* Client Alert */
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
          <p class="header-subtitle">تقرير القضية الشامل ─ إحاطة الموكل بسير الدعوى والجلسات</p>
        </td>
        <td class="firm-details" style="vertical-align: top; width: 260px;">
          <div><strong>تاريخ التقرير:</strong> ${new Date().toLocaleDateString('ar-SA')}</div>
          <div><strong>المحامي المسؤول:</strong> ${escapeHtml(caseInfo.responsibleLawyer || '')}</div>
          <div>${escapeHtml(firmAddress)}</div>
          ${firmPhone ? `<div><strong>هاتف / تواصل:</strong> ${escapeHtml(firmPhone)}</div>` : ''}
        </td>
      </tr>
    </table>

    <!-- Quick Summary Strip -->
    <div class="quick-summary-strip">
      <div class="summary-item">
        <span class="lbl">حالة القضية:</span>
        <span class="val">${escapeHtml(caseInfo.status || 'قيد النظر')} (${escapeHtml(caseInfo.phase || 'ابتدائية')})</span>
      </div>
      <div class="summary-item-divider">│</div>
      <div class="summary-item">
        <span class="lbl">الجلسة القادمة:</span>
        <span class="val">${escapeHtml(nextSessionSummaryText)}</span>
      </div>
      <div class="summary-item-divider">│</div>
      <div class="summary-item">
        <span class="lbl">إجمالي الجلسات:</span>
        <span class="val">${sessions.length} جلسة</span>
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
        <div class="block-title">١. بيانات القضية والموكل</div>
        <div class="block-badge">${escapeHtml(caseInfo.phase || 'المرحلة الابتدائية')}</div>
      </div>
      <div class="grid-4">
        <div class="field-item">
          <div class="field-label">رقم القضية</div>
          <div class="field-value">${escapeHtml(caseInfo.caseNumber || '')}</div>
        </div>
        <div class="field-item">
          <div class="field-label">المحكمة والدائرة</div>
          <div class="field-value">${escapeHtml(caseInfo.court || '')} / ${escapeHtml(caseInfo.circuit || '')}</div>
        </div>
        <div class="field-item">
          <div class="field-label">الموكل وصفته</div>
          <div class="field-value">${escapeHtml(report.clientName || caseInfo.clientRole || '')} (صفته: ${escapeHtml(caseInfo.clientRole || '')})</div>
        </div>
        <div class="field-item">
          <div class="field-label">الطرف الخصم</div>
          <div class="field-value">${escapeHtml(caseInfo.opponentName || '')}</div>
        </div>
      </div>
      <div class="grid-3" style="margin-top: 6px;">
        <div class="field-item">
          <div class="field-label">قيمة المطالبة</div>
          <div class="field-value">${escapeHtml(claimAmountDisplay)}</div>
        </div>
        <div class="field-item">
          <div class="field-label">ناظر الدعوى / الدائرة</div>
          <div class="field-value">${escapeHtml(caseInfo.judgeName || caseInfo.circuit || 'الدائرة المختصة')}</div>
        </div>
        <div class="field-item">
          <div class="field-label">تاريخ القيد</div>
          <div class="field-value">${escapeHtml(caseInfo.registrationDate || '')}</div>
        </div>
      </div>
      ${showSubject ? `
      <div style="margin-top: 6px; padding-top: 5px; border-top: 1px dashed #e2e8f0;">
        <div class="field-label">ملخص موضوع الدعوى</div>
        <div class="field-value" style="font-weight: 700; color: #1e293b;">${escapeHtml(subjectDisplay)}</div>
      </div>` : ''}
    </div>

    <!-- Block 2: Chronological Sessions Log -->
    <div class="block-card">
      <div class="block-header">
        <div class="block-title">٢. السجل الزمني لجلسات القضية (${sessions.length} جلسة منعقدة)</div>
      </div>
      ${sessions.length > 0 ? `
      <table class="report-table">
        <thead>
          <tr>
            <th width="8%">#</th>
            <th width="18%">التاريخ</th>
            <th width="18%">نوع الجلسة</th>
            <th width="20%">توثيق الحضور</th>
            <th width="18%">القرار الصادر</th>
            <th width="18%">سبب التأجيل</th>
          </tr>
        </thead>
        <tbody>
          ${sessionsRows}
        </tbody>
      </table>` : `
      <div style="font-size: 12px; color: #64748b; padding: 6px 0;">لا توجد جلسات مسجلة في هذا الملف حتى تاريخ التقرير.</div>`}
    </div>

    <!-- Block 3: Proceedings & Journey Summary -->
    <div class="block-card">
      <div class="block-header">
        <div class="block-title">٣. ملخص مسار القضية ومجرياتها للموكل</div>
      </div>
      <div class="text-box">${escapeHtml(lawyerEdits.clientSummary || 'تسير الدعوى وفق خطة العمل المهنية لحماية مصالح الموكل.')}</div>
    </div>

    <!-- Block 4: Judgments & Decisions -->
    <div class="block-card">
      <div class="block-header">
        <div class="block-title">٤. الأحكام والقرارات القضائية</div>
      </div>
      ${judgmentsHtml}
    </div>

    <!-- Block 5: Current Position -->
    <div class="block-card">
      <div class="block-header">
        <div class="block-title">٥. موقف القضية الراهن والأثر الإجرائي</div>
      </div>
      <div class="field-item">
        <div class="field-label">المركز القضائي الحالي</div>
        <div class="field-value" style="font-weight: 800; color: #000000; margin-bottom: 4px;">${escapeHtml(positionStatus)}</div>
      </div>
      <div class="field-item">
        <div class="field-label">أثر مسار التقاضي</div>
        <div class="text-box" style="margin-top: 2px;">${escapeHtml(positionEffect)}</div>
      </div>
    </div>

    <!-- Block 6: Next Actions -->
    <div class="block-card">
      <div class="block-header">
        <div class="block-title">٦. الإجراءات القادمة ومسؤوليات المتابعة</div>
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
      ${nextSessionInfo ? `
      <div style="margin-top: 6px; padding-top: 4px; border-top: 1px dashed #e2e8f0;" class="grid-2">
        <div class="field-item">
          <div class="field-label">موعد الجلسة القادمة</div>
          <div class="field-value">${escapeHtml(nextSessionInfo.date || '')} ${nextSessionInfo.time ? `– الساعة ${escapeHtml(nextSessionInfo.time)}` : ''}</div>
        </div>
        <div class="field-item">
          <div class="field-label">المدة المتبقية</div>
          <div class="field-value">${nextSessionInfo.daysRemaining !== undefined && nextSessionInfo.daysRemaining !== null ? `باقٍ ${nextSessionInfo.daysRemaining} يوماً` : 'محددة بالنظام'}</div>
        </div>
      </div>` : ''}
    </div>

    <!-- Block 7: Client Alert -->
    <div class="client-alert-box">
      <div class="client-alert-main">
        <span class="alert-tag">٧. تنبيه الموكل</span>
        <span class="alert-text">
          ${clientHasAction 
            ? `المطلوب منكم: ${escapeHtml(actionItems.clientAction || '')}`
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
        <div><strong>حالة التقرير:</strong> ${escapeHtml(dispatch.statusLabel || 'مسودة')}</div>
        ${dispatch.sentAt ? `<div><strong>تاريخ الإرسال:</strong> ${escapeHtml(dispatch.sentAt)} ${dispatch.sentViaLabel ? `(عبر: ${escapeHtml(dispatch.sentViaLabel)})` : ''}</div>` : ''}
        <div>تم اعتماد هذا التقرير نظامياً ومطابقته لملف القضية لحفظ حقوق الموكل وإحاطته بسير الدعوى كاملاً.</div>
      </div>
      <div class="${stampClass}">${escapeHtml(stampText)}</div>
    </div>
  </div>
</body>
</html>`
}
