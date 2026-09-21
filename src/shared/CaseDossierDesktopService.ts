import getDb from '../db/database'

export interface MasterCaseExecutiveDossier {
  executiveHeader: {
    caseNumber: string
    phase: string
    status: string
    lastJudicialAction: {
      date: string
      type: string
      title: string
      resultOrStatus?: string
    } | null
    nextSession: {
      date: string
      time: string
      daysRemaining: number
      courtRoom?: string
      meetingLink?: string
      notes?: string
      requiredAction?: string
    } | null
    closestDeadline: {
      type: string
      deadlineDate: string
      daysRemaining: number
      handled: boolean
    } | null
    responsibleLawyer: string
  }
  caseInfo: {
    caseId: string
    caseNumber: string
    court: string
    circuit: string
    registrationDate: string
    registrationDateHijri: string
    clientRole: string
    mainClassification: string
    subClassification: string
    caseType: string
    najizUrl: string
    parties: Array<{
      name: string
      role: string
      idNumber: string
      nationality: string
      partyType: string
      phone?: string
    }>
  }
  disputeSummary: {
    subject: string
    clientRequirement: string
    plaintiffRequests: string
    assessment: string // [C] نص مسجل تحليلي
  }
  litigationFinancials: {
    claimedAmount: number
    awardedAmount: number
    differenceAmount: number // claimed - awarded (الفرق بين المطالب به والمحكوم به)
    collectedForClient: number // from enf_financial_details.amount_collected_for_client
    currency: string
    hasFinancialAccess: boolean
  }
  officeFinancials: {
    contractAmount: number
    totalPaidToOffice: number
    remainingOfficeFee: number
    currency: string
    hasFinancialAccess: boolean
  }
  timeline: Array<{
    date: string
    type: 'جلسة قضائية' | 'مذكرة قضائية' | 'حكم قضائي' | 'طلب تنفيذ'
    title: string
    resultOrStatus: string
  }>
  judgmentsAndEnforcement: {
    judgments: Array<{
      id: string
      judgmentNumber: string
      date: string
      dateHijri: string
      favor: string
      notes: string // منطوق الحكم المسجل [C]
      objectionPeriodDays: number | null
      objectionDeadline: string | null
      daysUntilDeadline: number | null
      isObjectionHandled: boolean
      isExecutable: boolean
    }>
    enforcementRequests: Array<{
      id: string
      requestNo: string
      courtName: string
      status: string
      instrumentNo: string
      instrumentDate: string
      amountInstrument: number
      amountCollected: number
    }>
  }
  sessionsSummary: {
    lastSession: {
      date: string
      courtRoom: string
      result: string
      status: string
      notes?: string
    } | null
    nextSession: {
      date: string
      time: string
      courtRoom?: string
      meetingLink?: string
      requiredAction?: string
      notes?: string
      daysRemaining: number
    } | null
    sessionsList: Array<{
      id: string
      date: string
      time: string
      courtRoom: string
      status: string
      result: string
      notes: string
    }>
  }
  memoranda: Array<{
    id: string
    title: string
    type: string
    date: string
    najizNumber: string
    status: string
    summaryText: string
  }>
  experts: Array<{
    id: string
    name: string
    specialty: string
    phone: string
    notes: string // [C] نص مسجل
  }>
  evidenceAndDocuments: {
    evidence: Array<{
      id: string
      title: string
      description: string
      status: string
      date: string
    }>
    documents: Array<{
      id: string
      name: string
      fileType: string
      sizeFormatted: string
      uploadedAt: string
    }>
  }
  tasksAndNextSteps: Array<{
    id: string
    title: string
    responsible: string
    priority: string
    dueDate: string
    isOverdue: boolean
    status: string
  }>
  adminAudit: {
    recordLastUpdated: string
    recordCreatedAt: string
    lastTechnicalActivity: {
      actor: string
      timestamp: string
      action: string
    } | null
  }
}

const HIJRI_MONTHS = [
  'محرم',
  'صفر',
  'ربيع الأول',
  'ربيع الثاني',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذو القعدة',
  'ذو الحجة'
]

export function formatHijriDate(dateStr?: string | Date | null): string {
  if (!dateStr) return 'غير مسجل'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return String(dateStr)
  try {
    const formatter = new Intl.DateTimeFormat('ar-u-ca-islamic-umalqura-nu-latn', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    })
    const parts = formatter.formatToParts(d)
    const day = parts.find((p) => p.type === 'day')?.value
    const monthIndex = parseInt(parts.find((p) => p.type === 'month')?.value || '1') - 1
    const year = parts.find((p) => p.type === 'year')?.value
    const monthName = HIJRI_MONTHS[monthIndex] || ''
    return `${day} ${monthName} ${year} هـ`
  } catch {
    return 'غير مسجل'
  }
}

export function escapeHtml(unsafe: unknown): string {
  if (unsafe === null || unsafe === undefined) return ''
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function formatMoney(amount: number | string | null | undefined): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0)) || 0
  return num.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ر.س'
}

export function buildDesktopCaseDossier(caseId: string): MasterCaseExecutiveDossier {
  const db = getDb()

  const caseRow = db.prepare('SELECT * FROM cases WHERE id = ?').get(caseId) as any
  if (!caseRow) {
    throw new Error('القضية غير موجودة')
  }

  // Client info
  const clientRow = caseRow.client_id
    ? (db.prepare('SELECT * FROM clients WHERE id = ?').get(caseRow.client_id) as any)
    : null

  // Case parties
  const partiesRows = db
    .prepare('SELECT * FROM case_parties WHERE case_id = ? ORDER BY created_at ASC')
    .all(caseId) as any[]

  let parties = partiesRows.map((p: any) => ({
    name: p.name || 'غير مسجل',
    role: p.role || (p.party_type === 'client' ? 'موكل' : 'خصم'),
    idNumber: p.id_number || 'غير مسجل',
    nationality: p.nationality || 'غير مسجل',
    partyType: p.party_type || 'party',
    phone: p.phone || ''
  }))

  if (parties.length === 0 && clientRow) {
    parties = [
      {
        name: clientRow.name || caseRow.client_name || 'غير مسجل',
        role: caseRow.client_role || 'موكل',
        idNumber: clientRow.id_number || 'غير مسجل',
        nationality: clientRow.nationality || 'غير مسجل',
        partyType: 'client',
        phone: clientRow.phone || ''
      }
    ]
  }

  // Sessions
  const sessionsRows = db
    .prepare(
      'SELECT * FROM sessions WHERE case_id = ? AND is_archived = 0 ORDER BY date DESC, time DESC'
    )
    .all(caseId) as any[]

  // Judgments
  const judgmentsRows = db
    .prepare('SELECT * FROM judgments WHERE case_id = ? ORDER BY judgment_date DESC, created_at DESC')
    .all(caseId) as any[]

  // Enforcement requests + financial details
  let enforcementRows: any[] = []
  try {
    enforcementRows = db
      .prepare(
        `SELECT er.*, efd.amount_instrument, efd.amount_collected_for_client, efd.currency AS enf_currency
         FROM enforcement_requests er
         LEFT JOIN enf_financial_details efd ON efd.request_id = er.id
         WHERE er.case_id = ?
         ORDER BY er.created_at DESC`
      )
      .all(caseId) as any[]
  } catch {
    enforcementRows = []
  }

  // Memoranda
  let memorandaRows: any[] = []
  try {
    memorandaRows = db
      .prepare('SELECT * FROM memoranda WHERE case_id = ? ORDER BY memo_date DESC, created_at DESC')
      .all(caseId) as any[]
  } catch {
    memorandaRows = []
  }

  // Experts
  let expertsRows: any[] = []
  try {
    expertsRows = db
      .prepare('SELECT * FROM experts WHERE case_id = ? ORDER BY created_at DESC')
      .all(caseId) as any[]
  } catch {
    expertsRows = []
  }

  // Evidence
  let evidenceRows: any[] = []
  try {
    evidenceRows = db
      .prepare('SELECT * FROM evidence WHERE case_id = ? ORDER BY created_at DESC')
      .all(caseId) as any[]
  } catch {
    evidenceRows = []
  }

  // Documents
  let documentsRows: any[] = []
  try {
    documentsRows = db
      .prepare('SELECT * FROM documents WHERE case_id = ? ORDER BY created_at DESC')
      .all(caseId) as any[]
  } catch {
    documentsRows = []
  }

  // Tasks
  let tasksRows: any[] = []
  try {
    tasksRows = db
      .prepare('SELECT * FROM tasks WHERE case_id = ? ORDER BY due_date ASC, created_at DESC')
      .all(caseId) as any[]
  } catch {
    tasksRows = []
  }

  // Finances (Office fee payments only)
  let officePaidTotal = 0
  try {
    const finRows = db
      .prepare('SELECT * FROM finances WHERE case_id = ?')
      .all(caseId) as any[]
    for (const f of finRows) {
      const type = String(f.type || '').toLowerCase()
      const isIncome =
        type.includes('income') ||
        type.includes('قبض') ||
        type.includes('إيراد') ||
        type.includes('revenue')
      const isExpense = type.includes('expense') || type.includes('صرف') || type.includes('مصروف')
      const val = parseFloat(f.total || f.amount || 0) || 0
      if (isIncome && !isExpense) {
        officePaidTotal += val
      } else if (f.amount_in) {
        officePaidTotal += parseFloat(f.amount_in || 0) || 0
      }
    }
  } catch {
    officePaidTotal = 0
  }

  // Technical Activity Logs (Admin audit only)
  let actRows: any[] = []
  try {
    actRows = db
      .prepare('SELECT * FROM activity_logs WHERE entity_id = ? ORDER BY timestamp DESC LIMIT 5')
      .all(caseId) as any[]
  } catch {
    actRows = []
  }

  const todayStr = new Date().toISOString().split('T')[0]

  // 1. Build Judicial Timeline (Strictly from judicial events: sessions, memoranda, judgments, enforcement)
  const timeline: Array<{
    date: string
    type: 'جلسة قضائية' | 'مذكرة قضائية' | 'حكم قضائي' | 'طلب تنفيذ'
    title: string
    resultOrStatus: string
  }> = []

  for (const s of sessionsRows) {
    if (s.date) {
      timeline.push({
        date: s.date,
        type: 'جلسة قضائية',
        title: s.notes || s.result || s.court_room || 'جلسة قضائية',
        resultOrStatus: s.result || s.status || 'مجدولة'
      })
    }
  }

  for (const m of memorandaRows) {
    const mDate = m.memo_date || (m.created_at ? String(m.created_at).split('T')[0] : '')
    if (mDate) {
      timeline.push({
        date: mDate,
        type: 'مذكرة قضائية',
        title: `${m.memo_type ? `[${m.memo_type}] ` : ''}${m.memo_title || 'مذكرة قضائية'}`,
        resultOrStatus: m.memo_status || 'مسجلة'
      })
    }
  }

  for (const j of judgmentsRows) {
    const jDate = j.judgment_date || (j.created_at ? String(j.created_at).split('T')[0] : '')
    if (jDate) {
      timeline.push({
        date: jDate,
        type: 'حكم قضائي',
        title: `حكم رقم ${j.judgment_number || '-'}: ${j.favor || 'صادر'}`,
        resultOrStatus: j.notes
          ? j.notes.length > 80
            ? j.notes.substring(0, 80) + '...'
            : j.notes
          : j.favor || 'صادر'
      })
    }
  }

  for (const er of enforcementRows) {
    const erDate = er.instrument_date || (er.created_at ? String(er.created_at).split('T')[0] : '')
    if (erDate) {
      timeline.push({
        date: erDate,
        type: 'طلب تنفيذ',
        title: `طلب تنفيذ رقم ${er.request_no || '-'} - ${er.court_name || ''}`,
        resultOrStatus: er.status || 'قيد الإجراء'
      })
    }
  }

  // Sort descending by date
  timeline.sort((a, b) => b.date.localeCompare(a.date))

  // Last judicial action is the most recent event in the judicial timeline
  const lastJudicialAction = timeline.length > 0 ? timeline[0] : null

  // 2. Next session and calendar countdown
  const upcomingSessions = sessionsRows
    .filter((s: any) => s.date && s.date >= todayStr)
    .sort((a: any, b: any) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`))

  let nextSessionData: MasterCaseExecutiveDossier['executiveHeader']['nextSession'] = null
  if (upcomingSessions.length > 0) {
    const n = upcomingSessions[0]
    const dDiff = Math.ceil(
      (new Date(n.date).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)
    )
    nextSessionData = {
      date: n.date,
      time: n.time || '',
      daysRemaining: dDiff,
      courtRoom: n.court_room || '',
      meetingLink: n.meeting_link || '',
      notes: n.notes || '',
      requiredAction: n.notes || n.result || 'حضور الجلسة القضائية في الموعد المحدد'
    }
  }

  // Past sessions
  const pastSessions = sessionsRows
    .filter((s: any) => s.date && s.date < todayStr)
    .sort((a: any, b: any) => `${b.date} ${b.time || ''}`.localeCompare(`${a.date} ${a.time || ''}`))

  const lastSessionItem =
    pastSessions.length > 0
      ? {
          date: pastSessions[0].date,
          courtRoom: pastSessions[0].court_room || '',
          result: pastSessions[0].result || 'غير مسجل',
          status: pastSessions[0].status || 'منتهية',
          notes: pastSessions[0].notes || ''
        }
      : null

  // 3. Closest statutory deadline
  let closestDeadlineData: MasterCaseExecutiveDossier['executiveHeader']['closestDeadline'] = null
  const deadlineCandidates: Array<{
    type: string
    deadlineDate: string
    daysRemaining: number
    handled: boolean
  }> = []

  for (const j of judgmentsRows) {
    if (j.objection_deadline) {
      const dDiff = Math.ceil(
        (new Date(j.objection_deadline).getTime() - new Date(todayStr).getTime()) /
          (1000 * 60 * 60 * 24)
      )
      deadlineCandidates.push({
        type: `مهلة الاعتراض على الحكم (${j.judgment_number || 'صادر'})`,
        deadlineDate: j.objection_deadline,
        daysRemaining: dDiff,
        handled: Boolean(j.is_objection_handled)
      })
    }
  }

  for (const t of tasksRows) {
    if (t.due_date && t.status !== 'completed' && t.status !== 'done') {
      const dDiff = Math.ceil(
        (new Date(t.due_date).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24)
      )
      deadlineCandidates.push({
        type: `استحقاق نظامي لمهمة: ${t.title || 'مهمة قضائية'}`,
        deadlineDate: t.due_date,
        daysRemaining: dDiff,
        handled: false
      })
    }
  }

  const unhandledDeadlines = deadlineCandidates
    .filter((c) => !c.handled)
    .sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate))

  if (unhandledDeadlines.length > 0) {
    closestDeadlineData = unhandledDeadlines[0]
  }

  // 4. Financial separation
  const claimedAmount = parseFloat(caseRow.claimed_amount || 0) || 0
  const awardedAmount = parseFloat(caseRow.awarded_amount || 0) || 0
  const differenceAmount = claimedAmount - awardedAmount
  let collectedForClientTotal = 0
  for (const er of enforcementRows) {
    collectedForClientTotal += parseFloat(er.amount_collected_for_client || 0) || 0
  }

  const contractAmount = parseFloat(caseRow.contract_amount || 0) || 0
  const remainingOfficeFee = Math.max(0, contractAmount - officePaidTotal)

  // 5. Judgments list
  const judgmentsList = judgmentsRows.map((j: any) => {
    const dDiff = j.objection_deadline
      ? Math.ceil(
          (new Date(j.objection_deadline).getTime() - new Date(todayStr).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null
    return {
      id: j.id,
      judgmentNumber: j.judgment_number || 'غير مسجل',
      date: j.judgment_date || '',
      dateHijri: j.judgment_date_hijri || formatHijriDate(j.judgment_date),
      favor: j.favor || 'غير محدد',
      notes: j.notes || 'غير مسجل', // [C] منطوق الحكم المسجل
      objectionPeriodDays:
        j.objection_period_days !== null && j.objection_period_days !== undefined
          ? Number(j.objection_period_days)
          : null,
      objectionDeadline: j.objection_deadline || null,
      daysUntilDeadline: dDiff,
      isObjectionHandled: Boolean(j.is_objection_handled),
      isExecutable: Boolean(j.is_executable)
    }
  })

  // 6. Enforcement requests list
  const enforcementList = enforcementRows.map((er: any) => ({
    id: er.id,
    requestNo: er.request_no || 'غير مسجل',
    courtName: er.court_name || 'غير مسجل',
    status: er.status || 'draft',
    instrumentNo: er.instrument_no || 'غير مسجل',
    instrumentDate: er.instrument_date || '',
    amountInstrument: parseFloat(er.amount_instrument || 0) || 0,
    amountCollected: parseFloat(er.amount_collected_for_client || 0) || 0
  }))

  // 7. Memoranda list
  const memorandaList = memorandaRows.map((m: any) => ({
    id: m.id,
    title: m.memo_title || 'مذكرة قضائية',
    type: m.memo_type || 'غير محدد',
    date: m.memo_date || '',
    najizNumber: m.najiz_number || 'غير مسجل',
    status: m.memo_status || 'مسودة',
    summaryText: m.memo_summary || 'غير مسجل'
  }))

  // 8. Experts list
  const expertsList = expertsRows.map((ex: any) => ({
    id: ex.id,
    name: ex.name || 'غير مسجل',
    specialty: ex.specialty || 'غير مسجل',
    phone: ex.phone || 'غير مسجل',
    notes: ex.notes || 'لا توجد ملاحظات مسجلة' // [C] بيان نصي
  }))

  // 9. Evidence & Documents
  const evidenceList = evidenceRows.map((e: any) => ({
    id: e.id,
    title: e.title || 'دليل',
    description: e.description || 'غير مسجل',
    status: e.status || 'مقدم',
    date: e.evidence_date || ''
  }))

  const documentsList = documentsRows.map((d: any) => ({
    id: d.id,
    name: d.name || 'مستند',
    fileType: d.file_type || '-',
    sizeFormatted: d.file_size ? `${Math.round(d.file_size / 1024)} KB` : 'غير متوفر',
    uploadedAt: d.created_at ? new Date(d.created_at).toLocaleDateString('ar-SA') : '-'
  }))

  // 10. Tasks list
  const tasksList = tasksRows.map((t: any) => {
    const isOverdue = Boolean(
      t.due_date && t.due_date < todayStr && t.status !== 'completed' && t.status !== 'done'
    )
    return {
      id: t.id,
      title: t.title || 'مهمة متابعة',
      responsible: t.responsible_user_id || caseRow.responsible_name || 'المحامي المسؤول',
      priority: t.priority || 'متوسطة',
      dueDate: t.due_date || 'غير محدد',
      isOverdue,
      status: t.status || 'pending'
    }
  })

  // 11. Technical Admin Audit (Distinct from judicial activity)
  const lastTechAct =
    actRows.length > 0
      ? {
          actor: actRows[0].actor || 'مستخدم النظام',
          timestamp: actRows[0].timestamp || '',
          action: actRows[0].details || actRows[0].action || 'تحديث تقني'
        }
      : null

  const adminAuditData = {
    recordLastUpdated: caseRow.updated_at || caseRow.created_at || 'غير مسجل',
    recordCreatedAt: caseRow.created_at || 'غير مسجل',
    lastTechnicalActivity: lastTechAct
  }

  // 12. Sessions summary
  const sessionsSummaryData = {
    lastSession: lastSessionItem,
    nextSession: nextSessionData,
    sessionsList: sessionsRows.map((s: any) => ({
      id: s.id,
      date: s.date || '',
      time: s.time || '',
      courtRoom: s.court_room || '',
      status: s.status || 'مجدولة',
      result: s.result || '',
      notes: s.notes || ''
    }))
  }

  return {
    executiveHeader: {
      caseNumber: caseRow.case_number || caseRow.id,
      phase: caseRow.phase || 'المحاكمة الابتدائية',
      status: caseRow.status || 'قيد النظر',
      lastJudicialAction,
      nextSession: nextSessionData,
      closestDeadline: closestDeadlineData,
      responsibleLawyer: caseRow.responsible_name || 'غير محدد'
    },
    caseInfo: {
      caseId: caseRow.id,
      caseNumber: caseRow.case_number || caseRow.id,
      court: caseRow.court || 'غير مسجل',
      circuit: caseRow.circuit || 'غير مسجل',
      registrationDate: caseRow.registration_date || 'غير مسجل',
      registrationDateHijri:
        caseRow.registration_date_hijri || formatHijriDate(caseRow.registration_date),
      clientRole: caseRow.client_role || 'موكل',
      mainClassification: caseRow.main_classification || caseRow.case_type || 'عام',
      subClassification: caseRow.sub_classification || 'غير محدد',
      caseType: caseRow.case_type || 'حقوقية',
      najizUrl: caseRow.najiz_url || 'غير مسجل',
      parties
    },
    disputeSummary: {
      subject: caseRow.subject || 'غير مسجل',
      clientRequirement: caseRow.client_requirement || 'غير مسجل',
      plaintiffRequests: caseRow.plaintiff_requests || 'غير مسجل',
      assessment: caseRow.assessment || 'غير مسجل' // [C] بيان تحليلي مسجل
    },
    litigationFinancials: {
      claimedAmount,
      awardedAmount,
      differenceAmount,
      collectedForClient: collectedForClientTotal,
      currency: 'ريال سعودي',
      hasFinancialAccess: true
    },
    officeFinancials: {
      contractAmount,
      totalPaidToOffice: officePaidTotal,
      remainingOfficeFee,
      currency: 'ريال سعودي',
      hasFinancialAccess: true
    },
    timeline,
    judgmentsAndEnforcement: {
      judgments: judgmentsList,
      enforcementRequests: enforcementList
    },
    sessionsSummary: sessionsSummaryData,
    memoranda: memorandaList,
    experts: expertsList,
    evidenceAndDocuments: {
      evidence: evidenceList,
      documents: documentsList
    },
    tasksAndNextSteps: tasksList,
    adminAudit: adminAuditData
  }
}

export function renderDesktopMasterCaseDossierHtml(
  d: MasterCaseExecutiveDossier,
  firm?: any,
  preparedBy: string = 'المحامي المسؤول'
): string {
  const firmName = firm?.name || 'شركة المحاماة والاستشارات القانونية'
  const firmAddress = firm?.address || 'المملكة العربية السعودية'
  const firmPhone = firm?.phone || ''
  const generatedDate = new Date().toLocaleDateString('ar-SA')
  const generatedTime = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })

  const nextSessionHtml = d.executiveHeader.nextSession
    ? `<div class="dossier-card accent-card">
        <div class="card-label">الجلسة القادمة</div>
        <div class="card-val">${escapeHtml(d.executiveHeader.nextSession.date)} (${escapeHtml(d.executiveHeader.nextSession.time || 'صباحاً')})</div>
        <div class="card-sub ${d.executiveHeader.nextSession.daysRemaining <= 3 ? 'text-danger' : 'text-accent'}">
          ${d.executiveHeader.nextSession.daysRemaining === 0 ? 'اليوم موعد الجلسة' : d.executiveHeader.nextSession.daysRemaining > 0 ? `متبقي ${d.executiveHeader.nextSession.daysRemaining} يوم على موعدها` : `انقضت`}
        </div>
      </div>`
    : `<div class="dossier-card muted-card">
        <div class="card-label">الجلسة القادمة</div>
        <div class="card-val">لا توجد جلسات مجدولة</div>
        <div class="card-sub text-muted">بانتظار تحديد موعد</div>
      </div>`

  const closestDeadlineHtml = d.executiveHeader.closestDeadline
    ? `<div class="dossier-card warn-card">
        <div class="card-label">أقرب مهلة نظامية</div>
        <div class="card-val">${escapeHtml(d.executiveHeader.closestDeadline.type)}</div>
        <div class="card-sub text-danger font-bold">
          تاريخ الاستحقاق: ${escapeHtml(d.executiveHeader.closestDeadline.deadlineDate)} (متبقي ${d.executiveHeader.closestDeadline.daysRemaining} يوم)
        </div>
      </div>`
    : `<div class="dossier-card muted-card">
        <div class="card-label">أقرب مهلة نظامية</div>
        <div class="card-val">لا توجد مهلة نظامية سارية</div>
        <div class="card-sub text-muted">جميع المهل معالجة أو غير محددة [D]</div>
      </div>`

  const lastJudicialHtml = d.executiveHeader.lastJudicialAction
    ? `<div class="dossier-card">
        <div class="card-label">آخر إجراء قضائي (${escapeHtml(d.executiveHeader.lastJudicialAction.type)})</div>
        <div class="card-val">${escapeHtml(d.executiveHeader.lastJudicialAction.title)}</div>
        <div class="card-sub text-muted">بتاريخ: ${escapeHtml(d.executiveHeader.lastJudicialAction.date)} | النتيجة: ${escapeHtml(d.executiveHeader.lastJudicialAction.resultOrStatus || 'مسجل')}</div>
      </div>`
    : `<div class="dossier-card muted-card">
        <div class="card-label">آخر إجراء قضائي</div>
        <div class="card-val">لا توجد إجراءات قضائية مسجلة</div>
        <div class="card-sub text-muted">الملف قيد التأسيس</div>
      </div>`

  // Parties table
  const partiesRows = d.caseInfo.parties
    .map(
      (p) => `
      <tr>
        <td><strong>${escapeHtml(p.name)}</strong></td>
        <td><span class="badge ${p.partyType === 'client' ? 'badge-client' : 'badge-opponent'}">${escapeHtml(p.role)}</span></td>
        <td>${escapeHtml(p.idNumber || 'غير مسجل')}</td>
        <td>${escapeHtml(p.nationality || 'غير مسجل')}</td>
        <td>${escapeHtml(p.phone || '-')}</td>
      </tr>`
    )
    .join('')

  // Timeline rows
  const timelineRows = d.timeline.length
    ? d.timeline
        .slice(0, 15)
        .map(
          (t) => `
        <tr>
          <td style="width: 15%; white-space: nowrap;"><strong>${escapeHtml(t.date)}</strong></td>
          <td style="width: 18%;"><span class="badge badge-event">${escapeHtml(t.type)}</span></td>
          <td>${escapeHtml(t.title)}</td>
          <td style="width: 20%; color: #475569;">${escapeHtml(t.resultOrStatus)}</td>
        </tr>`
        )
        .join('')
    : `<tr><td colspan="4" class="text-center text-muted">لا توجد وقائع قضائية مسجلة في الجدول الزمني</td></tr>`

  // Judgments rows
  const judgmentsRows = d.judgmentsAndEnforcement.judgments.length
    ? d.judgmentsAndEnforcement.judgments
        .map(
          (j) => `
        <tr class="avoid-break">
          <td><strong>${escapeHtml(j.judgmentNumber)}</strong></td>
          <td>${escapeHtml(j.date)}<br/><small class="text-muted">${escapeHtml(j.dateHijri)}</small></td>
          <td><span class="badge ${j.favor.includes('لصالح') ? 'badge-success' : 'badge-warn'}">${escapeHtml(j.favor)}</span></td>
          <td style="font-size: 10pt; line-height: 1.5;"><span class="text-tag">[منطوق مسجل]</span> ${escapeHtml(j.notes)}</td>
          <td>${j.objectionDeadline ? `${escapeHtml(j.objectionDeadline)} (${j.daysUntilDeadline !== null && j.daysUntilDeadline >= 0 ? `متبقي ${j.daysUntilDeadline} يوم` : 'منتهية'})` : 'غير محدد'}</td>
          <td>${j.isObjectionHandled ? '<span class="badge badge-success">تم التعامل</span>' : '<span class="badge badge-warn">قيد المهلة</span>'}</td>
          <td>${j.isExecutable ? '<span class="badge badge-success">صالح للتنفيذ</span>' : '<span class="badge badge-muted">غير مشمول بالنفاذ</span>'}</td>
        </tr>`
        )
        .join('')
    : `<tr><td colspan="7" class="text-center text-muted">لم تصدر أحكام قضائية مسجلة في هذا الملف بعد</td></tr>`

  // Enforcement rows
  const enforcementRows = d.judgmentsAndEnforcement.enforcementRequests.length
    ? d.judgmentsAndEnforcement.enforcementRequests
        .map(
          (er) => `
        <tr>
          <td><strong>${escapeHtml(er.requestNo)}</strong></td>
          <td>${escapeHtml(er.courtName)}</td>
          <td>${escapeHtml(er.instrumentNo)} (${escapeHtml(er.instrumentDate || '-')})</td>
          <td><span class="badge badge-event">${escapeHtml(er.status)}</span></td>
          <td>${formatMoney(er.amountInstrument)}</td>
          <td class="text-success font-bold">${formatMoney(er.amountCollected)}</td>
        </tr>`
        )
        .join('')
    : `<tr><td colspan="6" class="text-center text-muted">لا توجد طلبات تنفيذ مرتبطة مسجلة</td></tr>`

  // Sessions rows
  const sessionsRows = d.sessionsSummary.sessionsList.length
    ? d.sessionsSummary.sessionsList
        .slice(0, 10)
        .map(
          (s) => `
        <tr>
          <td><strong>${escapeHtml(s.date)}</strong></td>
          <td>${escapeHtml(s.time || '-')}</td>
          <td>${escapeHtml(s.courtRoom || '-')}</td>
          <td><span class="badge ${s.status.includes('منتهية') ? 'badge-success' : 'badge-client'}">${escapeHtml(s.status)}</span></td>
          <td>${escapeHtml(s.result || s.notes || '-')}</td>
        </tr>`
        )
        .join('')
    : `<tr><td colspan="5" class="text-center text-muted">لا توجد جلسات مسجلة</td></tr>`

  // Memoranda rows
  const memorandaRows = d.memoranda.length
    ? d.memoranda
        .map(
          (m) => `
        <tr>
          <td><strong>${escapeHtml(m.title)}</strong></td>
          <td>${escapeHtml(m.type)}</td>
          <td>${escapeHtml(m.date)}</td>
          <td>${escapeHtml(m.najizNumber || 'غير مسجل [D]')}</td>
          <td><span class="badge badge-event">${escapeHtml(m.status)}</span></td>
          <td style="font-size: 10pt;">${escapeHtml(m.summaryText)}</td>
        </tr>`
        )
        .join('')
    : `<tr><td colspan="6" class="text-center text-muted">لا توجد مذكرات أو لوائح مسجلة</td></tr>`

  // Experts rows
  const expertsRows = d.experts.length
    ? d.experts
        .map(
          (ex) => `
        <tr>
          <td><strong>${escapeHtml(ex.name)}</strong></td>
          <td>${escapeHtml(ex.specialty)}</td>
          <td>${escapeHtml(ex.phone)}</td>
          <td style="font-size: 10pt;"><span class="text-tag">[بيان نصي مسجل]</span> ${escapeHtml(ex.notes)}</td>
        </tr>`
        )
        .join('')
    : `<tr><td colspan="4" class="text-center text-muted">لم يتم ندب خبير أو لا توجد بيانات خبرة مسجلة في القضية</td></tr>`

  // Evidence rows
  const evidenceRows = d.evidenceAndDocuments.evidence.length
    ? d.evidenceAndDocuments.evidence
        .map(
          (e) => `
        <tr>
          <td><strong>${escapeHtml(e.title)}</strong></td>
          <td>${escapeHtml(e.description)}</td>
          <td>${escapeHtml(e.date || '-')}</td>
          <td><span class="badge badge-client">${escapeHtml(e.status)}</span></td>
        </tr>`
        )
        .join('')
    : `<tr><td colspan="4" class="text-center text-muted">لا توجد أدلة أو بينات مقيدة بالنظام</td></tr>`

  // Documents list
  const documentsHtml = d.evidenceAndDocuments.documents.length
    ? `<ul class="doc-list">
        ${d.evidenceAndDocuments.documents
          .map(
            (doc) => `
          <li>
            <span class="doc-name">📄 ${escapeHtml(doc.name)}</span>
            <span class="doc-meta">${escapeHtml(doc.fileType)} | الحجم: ${escapeHtml(doc.sizeFormatted)} | المرفوع: ${escapeHtml(doc.uploadedAt)}</span>
          </li>`
          )
          .join('')}
       </ul>`
    : `<div class="text-muted text-center" style="padding: 10px;">لا توجد مستندات رقمية مرفوعة للملف (لا توجد سجلات نواقص مسجلة [D])</div>`

  // Tasks rows
  const tasksRows = d.tasksAndNextSteps.length
    ? d.tasksAndNextSteps
        .map(
          (t) => `
        <tr>
          <td><strong>${escapeHtml(t.title)}</strong></td>
          <td>${escapeHtml(t.responsible)}</td>
          <td><span class="badge ${t.priority.includes('عاجل') || t.priority.includes('عالية') ? 'badge-warn' : 'badge-muted'}">${escapeHtml(t.priority)}</span></td>
          <td>${escapeHtml(t.dueDate)}</td>
          <td>${t.isOverdue ? '<span class="badge badge-danger">متأخرة</span>' : '<span class="badge badge-success">سارية</span>'}</td>
        </tr>`
        )
        .join('')
    : `<tr><td colspan="5" class="text-center text-muted">لا توجد مهام معلقة على القضية</td></tr>`

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>تقرير القضية التنفيذي الشامل - ${escapeHtml(d.executiveHeader.caseNumber)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 12mm 16mm 12mm;
    }
    *, *:before, *:after {
      box-sizing: border-box;
    }
    body {
      font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Kufi Arabic', Tahoma, sans-serif;
      direction: rtl;
      margin: 0;
      padding: 0;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.5;
      font-size: 10.5pt;
    }
    .dossier-header {
      border-bottom: 2px solid #b45309;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .dossier-brand h1 {
      margin: 0 0 4px 0;
      font-size: 17pt;
      color: #0f172a;
      font-weight: 800;
    }
    .dossier-brand h2 {
      margin: 0;
      font-size: 11pt;
      color: #b45309;
      font-weight: 700;
    }
    .dossier-meta {
      text-align: left;
      font-size: 9pt;
      color: #475569;
      line-height: 1.4;
    }
    .section-title {
      background: #f1f5f9;
      border-right: 4px solid #b45309;
      padding: 6px 12px;
      font-size: 11pt;
      font-weight: 800;
      color: #0f172a;
      margin: 18px 0 10px 0;
      page-break-after: avoid;
      break-after: avoid;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .section-title .sec-badge {
      font-size: 8.5pt;
      font-weight: 600;
      color: #64748b;
    }
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 12px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 12px;
    }
    .dossier-card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 10px;
      background: #f8fafc;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .accent-card {
      border-color: #fde68a;
      background: #fefce8;
    }
    .warn-card {
      border-color: #fed7aa;
      background: #fff7ed;
    }
    .muted-card {
      background: #f1f5f9;
    }
    .card-label {
      font-size: 8pt;
      color: #64748b;
      font-weight: 700;
      margin-bottom: 3px;
    }
    .card-val {
      font-size: 10.5pt;
      font-weight: 800;
      color: #0f172a;
    }
    .card-sub {
      font-size: 8pt;
      margin-top: 3px;
    }
    .financial-strip {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 12px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .fin-box {
      text-align: center;
      padding: 6px;
      border-radius: 4px;
    }
    .fin-title {
      font-size: 8pt;
      color: #475569;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .fin-amount {
      font-size: 12pt;
      font-weight: 900;
      color: #0f172a;
    }
    .fin-diff {
      color: #b45309;
    }
    .fin-success {
      color: #15803d;
    }
    .office-fin-box {
      border-top: 1px dashed #cbd5e1;
      margin-top: 10px;
      padding-top: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 9.5pt;
      page-break-inside: auto;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      text-align: right;
      vertical-align: middle;
    }
    th {
      background: #f1f5f9;
      color: #1e293b;
      font-weight: 800;
      font-size: 9pt;
    }
    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    tr:nth-child(even) {
      background: #f8fafc;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 8pt;
      font-weight: 700;
    }
    .badge-client { background: #e0f2fe; color: #0369a1; }
    .badge-opponent { background: #fee2e2; color: #b91c1c; }
    .badge-event { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; }
    .badge-success { background: #dcfce7; color: #15803d; }
    .badge-warn { background: #ffedd5; color: #c2410c; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
    .badge-muted { background: #f1f5f9; color: #64748b; }
    .text-tag {
      font-size: 7.5pt;
      background: #e2e8f0;
      color: #334155;
      padding: 1px 4px;
      border-radius: 3px;
      margin-left: 4px;
      font-weight: 700;
    }
    .narrative-box {
      background: #fafafa;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 8px 10px;
      font-size: 9.5pt;
      line-height: 1.5;
      margin-bottom: 8px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .narrative-title {
      font-weight: 800;
      color: #334155;
      font-size: 8.5pt;
      margin-bottom: 4px;
    }
    .doc-list {
      list-style: none;
      padding: 0;
      margin: 0;
      font-size: 9pt;
    }
    .doc-list li {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #f1f5f9;
      padding: 4px 0;
    }
    .doc-name { font-weight: 600; color: #0f172a; }
    .doc-meta { color: #64748b; font-size: 8pt; }
    .audit-bar {
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      padding: 6px 10px;
      font-size: 8pt;
      color: #475569;
      display: flex;
      justify-content: space-between;
      border-radius: 4px;
      margin-top: 14px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sign-row {
      display: flex;
      justify-content: space-between;
      margin-top: 24px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sign-block {
      width: 45%;
      border-top: 1px solid #0f172a;
      text-align: center;
      padding-top: 6px;
      font-size: 9pt;
      font-weight: 700;
    }
    .text-center { text-align: center; }
    .text-muted { color: #64748b; }
    .text-danger { color: #dc2626; }
    .text-accent { color: #b45309; }
    .font-bold { font-weight: 700; }
    .avoid-break { page-break-inside: avoid !important; break-inside: avoid !important; }
    @media print {
      body { margin: 0; font-size: 9.5pt; }
      .no-print { display: none !important; }
      .dossier-card, tr, .financial-strip, .narrative-box, .audit-bar, .sign-row {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .section-title {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
    }
  </style>
</head>
<body>
  <!-- Formal Header -->
  <div class="dossier-header">
    <div class="dossier-brand">
      <h1>${escapeHtml(firmName)}</h1>
      <h2>تقرير القضية التنفيذي الشامل</h2>
    </div>
    <div class="dossier-meta">
      <div><strong>رقم القضية:</strong> ${escapeHtml(d.executiveHeader.caseNumber)}</div>
      <div><strong>المحكمة / الدائرة:</strong> ${escapeHtml(d.caseInfo.court)} / ${escapeHtml(d.caseInfo.circuit)}</div>
      <div><strong>تاريخ الطباعة:</strong> ${escapeHtml(generatedDate)} - ${escapeHtml(generatedTime)}</div>
      <div>${escapeHtml(firmAddress)} ${firmPhone ? `| هاتف: ${escapeHtml(firmPhone)}` : ''}</div>
    </div>
  </div>

  <!-- 1. Executive Status Bar -->
  <div class="section-title">
    <span>أولاً: شريط الحالة التنفيذي الموحد</span>
    <span class="sec-badge">الملف القضائي النشط</span>
  </div>
  <div class="grid-4">
    <div class="dossier-card">
      <div class="card-label">رقم القضية والمرحلة</div>
      <div class="card-val">${escapeHtml(d.executiveHeader.caseNumber)}</div>
      <div class="card-sub text-accent font-bold">${escapeHtml(d.executiveHeader.phase)}</div>
    </div>
    <div class="dossier-card">
      <div class="card-label">الحالة القضائية الراهنة</div>
      <div class="card-val">${escapeHtml(d.executiveHeader.status)}</div>
      <div class="card-sub text-muted">المحامي المسؤول: ${escapeHtml(d.executiveHeader.responsibleLawyer)}</div>
    </div>
    ${nextSessionHtml}
    ${closestDeadlineHtml}
  </div>
  <div class="grid-2">
    ${lastJudicialHtml}
    <div class="dossier-card">
      <div class="card-label">صفة موكلنا وتصنيف الدعوى</div>
      <div class="card-val">${escapeHtml(d.caseInfo.clientRole)} | ${escapeHtml(d.caseInfo.mainClassification)}</div>
      <div class="card-sub text-muted">التصنيف الفرعي: ${escapeHtml(d.caseInfo.subClassification)} | نوع القضية: ${escapeHtml(d.caseInfo.caseType)}</div>
    </div>
  </div>

  <!-- 2. Case Identity and Parties -->
  <div class="section-title">
    <span>ثانياً: بيانات القضية الأساسية وأطراف النزاع</span>
    <span class="sec-badge">البيانات المقيدة رسمياً</span>
  </div>
  <table style="margin-bottom: 8px;">
    <tr>
      <th style="width: 15%;">المحكمة</th>
      <td style="width: 35%;">${escapeHtml(d.caseInfo.court)}</td>
      <th style="width: 15%;">الدائرة القضائية</th>
      <td style="width: 35%;">${escapeHtml(d.caseInfo.circuit)}</td>
    </tr>
    <tr>
      <th>تاريخ القيد الميلادي</th>
      <td>${escapeHtml(d.caseInfo.registrationDate)}</td>
      <th>تاريخ القيد الهجري</th>
      <td>${escapeHtml(d.caseInfo.registrationDateHijri)}</td>
    </tr>
    <tr>
      <th>رابط بوابة ناجز</th>
      <td colspan="3">${d.caseInfo.najizUrl && d.caseInfo.najizUrl !== 'غير مسجل' ? `<a href="${escapeHtml(d.caseInfo.najizUrl)}" target="_blank" style="color: #0369a1; text-decoration: none;">${escapeHtml(d.caseInfo.najizUrl)}</a>` : '<span class="text-muted">غير مسجل [D]</span>'}</td>
    </tr>
  </table>
  <table style="margin-bottom: 12px;">
    <thead>
      <tr>
        <th>اسم الطرف</th>
        <th>صفته في الدعوى</th>
        <th>رقم الهوية / السجل</th>
        <th>الجنسية</th>
        <th>رقم التواصل</th>
      </tr>
    </thead>
    <tbody>
      ${partiesRows}
    </tbody>
  </table>

  <!-- 3. Dispute Summary -->
  <div class="section-title">
    <span>ثالثاً: ملخص النزاع والطلبات القضائية</span>
    <span class="sec-badge">موضوع المخاصمة</span>
  </div>
  <div class="grid-2">
    <div class="narrative-box">
      <div class="narrative-title">موضوع الدعوى وسياقها:</div>
      <div>${escapeHtml(d.disputeSummary.subject)}</div>
    </div>
    <div class="narrative-box">
      <div class="narrative-title">التقييم القانوني للملف <span class="text-tag">[C] بيان تحليلي مسجل</span>:</div>
      <div>${escapeHtml(d.disputeSummary.assessment)}</div>
    </div>
  </div>
  <div class="grid-2">
    <div class="narrative-box">
      <div class="narrative-title">طلبات موكلنا:</div>
      <div>${escapeHtml(d.disputeSummary.clientRequirement)}</div>
    </div>
    <div class="narrative-box">
      <div class="narrative-title">طلبات المدعي / الخصم:</div>
      <div>${escapeHtml(d.disputeSummary.plaintiffRequests)}</div>
    </div>
  </div>

  <!-- 4. Litigation & Execution Financials -->
  <div class="section-title">
    <span>رابعاً: المبالغ القضائية وموضوع النزاع والتنفيذ</span>
    <span class="sec-badge">فصل قطعي عن مالية المكتب</span>
  </div>
  <div class="financial-strip">
    <div class="grid-4" style="margin-bottom: 0;">
      <div class="fin-box">
        <div class="fin-title">المبلغ المطالب به في الدعوى</div>
        <div class="fin-amount">${formatMoney(d.litigationFinancials.claimedAmount)}</div>
      </div>
      <div class="fin-box">
        <div class="fin-title">المبلغ المحكوم به رسمياً</div>
        <div class="fin-amount fin-diff">${formatMoney(d.litigationFinancials.awardedAmount)}</div>
      </div>
      <div class="fin-box">
        <div class="fin-title">الفرق بين المطالب به والمحكوم به</div>
        <div class="fin-amount">${formatMoney(d.litigationFinancials.differenceAmount)}</div>
      </div>
      <div class="fin-box" style="background: #ecfdf5;">
        <div class="fin-title" style="color: #166534;">المحصل من الخصم لصالح الموكل (تنفيذ)</div>
        <div class="fin-amount fin-success">${formatMoney(d.litigationFinancials.collectedForClient)}</div>
      </div>
    </div>
    <div class="office-fin-box">
      <div class="grid-3" style="margin-bottom: 0;">
        <div><strong>أتعاب الوكالة المتفق عليها مع المكتب:</strong> ${formatMoney(d.officeFinancials.contractAmount)}</div>
        <div><strong>المسدد للمكتب حتى تاريخه:</strong> <span class="text-success font-bold">${formatMoney(d.officeFinancials.totalPaidToOffice)}</span></div>
        <div><strong>المتبقي بذمة الموكل للمكتب:</strong> <span class="text-accent font-bold">${formatMoney(d.officeFinancials.remainingOfficeFee)}</span></div>
      </div>
      <div style="font-size: 7.5pt; color: #64748b; margin-top: 4px;">* تنويه نظامي: تم الفصل التام بين مطالبات موضوع النزاع ومبالغ التنفيذ المستردة للعميل وبين أتعاب الوكالة والمصروفات الإدارية للمكتب.</div>
    </div>
  </div>

  <!-- 5. Chronological Judicial Timeline -->
  <div class="section-title">
    <span>خامساً: التسلسل الزمني القضائي الموحد (Timeline)</span>
    <span class="sec-badge">مرتب تنازلياً</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>التاريخ</th>
        <th>نوع الإجراء</th>
        <th>البيان والوقائع القضائية</th>
        <th>النتيجة / الموقف</th>
      </tr>
    </thead>
    <tbody>
      ${timelineRows}
    </tbody>
  </table>

  <!-- 6. Judgments, Appeals & Enforcement -->
  <div class="section-title">
    <span>سادساً: الأحكام الصادرة وإجراءات الطعن والتنفيذ</span>
    <span class="sec-badge">القرارات القضائية وسندات التنفيذ</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>رقم الحكم</th>
        <th>تاريخ الحكم</th>
        <th>النتيجة</th>
        <th>منطوق الحكم المسجل</th>
        <th>مهلة الاعتراض</th>
        <th>حالة الاعتراض</th>
        <th>النفاذ</th>
      </tr>
    </thead>
    <tbody>
      ${judgmentsRows}
    </tbody>
  </table>
  <div style="font-weight: 700; font-size: 9pt; margin: 10px 0 4px 0; color: #334155;">طلبات التنفيذ المرتبطة الصادرة في القضية:</div>
  <table>
    <thead>
      <tr>
        <th>رقم الطلب</th>
        <th>محكمة التنفيذ</th>
        <th>رقم وتاريخ السند</th>
        <th>الحالة</th>
        <th>المبلغ المنفذ</th>
        <th>المحصل لصالح الموكل</th>
      </tr>
    </thead>
    <tbody>
      ${enforcementRows}
    </tbody>
  </table>

  <!-- 7. Sessions Log -->
  <div class="section-title">
    <span>سابعاً: سجل الجلسات القضائية والقرارات</span>
    <span class="sec-badge">المواعيد والقرارات الصادرة</span>
  </div>
  <div class="grid-2" style="margin-bottom: 8px;">
    <div class="dossier-card">
      <div class="card-label">آخر جلسة وقرارها</div>
      ${d.sessionsSummary.lastSession ? `<div class="card-val">${escapeHtml(d.sessionsSummary.lastSession.date)} - القاعة: ${escapeHtml(d.sessionsSummary.lastSession.courtRoom || 'غير محدد')}</div><div class="card-sub text-muted"><strong>القرار المسجل:</strong> ${escapeHtml(d.sessionsSummary.lastSession.result)}</div>` : `<div class="card-val">لا توجد جلسات سابقة مسجلة</div>`}
    </div>
    <div class="dossier-card accent-card">
      <div class="card-label">الجلسة القادمة والمطلوب قبلها</div>
      ${d.sessionsSummary.nextSession ? `<div class="card-val">${escapeHtml(d.sessionsSummary.nextSession.date)} (${escapeHtml(d.sessionsSummary.nextSession.time || 'صباحاً')})</div><div class="card-sub text-accent font-bold"><strong>المطلوب إجراؤه:</strong> ${escapeHtml(d.sessionsSummary.nextSession.requiredAction)}</div>` : `<div class="card-val">لا توجد جلسة قادمة مجدولة</div>`}
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>تاريخ الجلسة</th>
        <th>الوقت</th>
        <th>القاعة</th>
        <th>الحالة</th>
        <th>القرار / الملاحظات المسجلة</th>
      </tr>
    </thead>
    <tbody>
      ${sessionsRows}
    </tbody>
  </table>

  <!-- 8. Memoranda -->
  <div class="section-title">
    <span>ثامناً: المذكرات واللوائح القضائية المتبادلة</span>
    <span class="sec-badge">الدفوع واللوائح</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>عنوان المذكرة</th>
        <th>النوع</th>
        <th>تاريخ الإيداع</th>
        <th>رقم قيد ناجز</th>
        <th>الحالة</th>
        <th>الملخص المسجل</th>
      </tr>
    </thead>
    <tbody>
      ${memorandaRows}
    </tbody>
  </table>
  <div style="font-size: 7.5pt; color: #64748b; margin-top: -6px; margin-bottom: 8px;">* موقف الرد على المذكرات غير مهيكل في النظام ويُعرض كنص مسجل حال توفره [C/D].</div>

  <!-- 9. Expert Tracking -->
  <div class="section-title">
    <span>تاسعاً: أعمال الخبرة القضائية</span>
    <span class="sec-badge">الخبراء والمحكمون</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>اسم الخبير</th>
        <th>التخصص</th>
        <th>بيانات الاتصال</th>
        <th>الملاحظات وموقف التقرير</th>
      </tr>
    </thead>
    <tbody>
      ${expertsRows}
    </tbody>
  </table>
  <div style="font-size: 7.5pt; color: #64748b; margin-top: -6px; margin-bottom: 8px;">* بيانات تقرير الخبرة والاعتراض عليه هي نصوص مسجلة بالملف [C].</div>

  <!-- 10. Evidence & Uploaded Documents -->
  <div class="section-title">
    <span>عاشراً: الأدلة والبينات والمستندات المرفوعة</span>
    <span class="sec-badge">أدلة الإثبات والملفات</span>
  </div>
  <div class="grid-2">
    <div>
      <div style="font-weight: 700; font-size: 9pt; margin-bottom: 4px; color: #334155;">الأدلة والبينات المسجلة:</div>
      <table>
        <thead>
          <tr>
            <th>عنوان الدليل</th>
            <th>الوصف</th>
            <th>التاريخ</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${evidenceRows}
        </tbody>
      </table>
    </div>
    <div>
      <div style="font-weight: 700; font-size: 9pt; margin-bottom: 4px; color: #334155;">المستندات والوثائق المرفوعة:</div>
      <div class="dossier-card">
        ${documentsHtml}
      </div>
    </div>
  </div>

  <!-- 11. Tasks & Next Steps -->
  <div class="section-title">
    <span>الحادي عشر: خطة العمل والمهام المعلقة</span>
    <span class="sec-badge">الإجراءات والالتزامات</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>عنوان المهمة</th>
        <th>المسؤول عن التنفيذ</th>
        <th>الأولوية</th>
        <th>تاريخ الاستحقاق</th>
        <th>حالة التأخير</th>
      </tr>
    </thead>
    <tbody>
      ${tasksRows}
    </tbody>
  </table>

  <!-- 12. Administrative Audit -->
  <div class="section-title">
    <span>الثاني عشر: بيانات الإدارة وتدقيق السجل</span>
    <span class="sec-badge">سجل النظام التقني</span>
  </div>
  <div class="audit-bar">
    <div><strong>تاريخ إنشاء السجل:</strong> ${escapeHtml(d.adminAudit.recordCreatedAt)}</div>
    <div><strong>آخر تحديث للسجل:</strong> ${escapeHtml(d.adminAudit.recordLastUpdated)}</div>
    <div>
      <strong>آخر نشاط تقني للمستخدم:</strong>
      ${d.adminAudit.lastTechnicalActivity ? `${escapeHtml(d.adminAudit.lastTechnicalActivity.action)} بواسطة ${escapeHtml(d.adminAudit.lastTechnicalActivity.actor)} (${escapeHtml(d.adminAudit.lastTechnicalActivity.timestamp)})` : 'لا يوجد نشاط تقني مسجل'}
    </div>
  </div>
  <div style="font-size: 7.5pt; color: #64748b; margin-top: 4px;">* فصل دلالي: النشاط التقني أعلاه يوثق حركة البيانات على النظام ومفصول تماماً عن "آخر إجراء قضائي".</div>

  <!-- Formal Signatures -->
  <div class="sign-row">
    <div class="sign-block">
      <div>المحامي المسؤول عن القضية</div>
      <div style="margin-top: 24px;">الاسم: ${escapeHtml(d.executiveHeader.responsibleLawyer || preparedBy)}</div>
      <div style="color: #64748b; font-size: 8pt;">التوقيع: .......................................</div>
    </div>
    <div class="sign-block">
      <div>اعتماد الإدارة القانونية / الشريك المشرف</div>
      <div style="margin-top: 24px;">التاريخ: ${escapeHtml(generatedDate)}</div>
      <div style="color: #64748b; font-size: 8pt;">الختم والاعتماد: ..............................</div>
    </div>
  </div>
</body>
</html>`
}
