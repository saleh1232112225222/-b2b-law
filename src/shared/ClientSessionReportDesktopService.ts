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
