export type CaseJourneyEventType =
  | 'FILING'
  | 'SESSION'
  | 'MEMO'
  | 'JUDGMENT'
  | 'APPEAL'
  | 'EXECUTION'
  | 'ATTACHMENT'
  | 'TASK'

export type CaseJourneyStage =
  | 'قيد القضية'
  | 'الجلسات'
  | 'المذكرات'
  | 'الأحكام'
  | 'الاستئناف'
  | 'التنفيذ'

export type CaseJourneyStatus = 'مجدولة' | 'تمت' | 'مؤجلة' | 'مشطوبة' | 'مكتملة' | 'بانتظار'

export interface CaseJourneyEvent {
  id: string
  type: CaseJourneyEventType
  stage: CaseJourneyStage
  title: string
  date: string
  status: CaseJourneyStatus
  summary: string
  details: {
    court?: string
    circuit?: string
    participants?: string[]
    notes?: string
    attachments?: Array<{ name: string; url: string }>
  }
  links: {
    entityType: 'case' | 'session' | 'memo' | 'judgment' | 'task' | 'document'
    entityId: string
  }
}
