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
