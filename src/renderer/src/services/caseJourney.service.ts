import { CaseJourneyEvent, CaseJourneyStatus } from '../types/caseJourney'

export class CaseJourneyService {
  private api = (window as any).api

  private toIsoDate = (v: any): string => {
    const s = String(v || '').trim()
    if (!s) return ''
    const d = new Date(s)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
    return s
  }

  private safeTime = (v: any): string => String(v || '')

  private safeDateForSort = (v: any): number => {
    const s = String(v || '').trim()
    if (!s) return Number.MAX_SAFE_INTEGER
    const t = new Date(s).getTime()
    return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER
  }

  async buildCaseJourney(caseId: string): Promise<CaseJourneyEvent[]> {
    try {
      const [caseData, sessions, judgments, tasks, documents, memoranda] = await Promise.all([
        this.api.cases.getById(caseId),
        this.api.sessions.getByCaseId(caseId),
        this.api.judgments.getByCaseId(caseId),
        this.api.tasks.getByCaseId(caseId),
        this.api.documents.getByCaseId(caseId),
        this.api.memoranda.getByCaseId(caseId)
      ])

      if (!caseData) return []

      return this.buildJourneyFromData(caseData, sessions, judgments, tasks, documents, memoranda)
    } catch (error) {
      console.error('Error fetching data for case journey:', error)
      return []
    }
  }

  buildJourneyFromData(
    caseData: any,
    sessions: any[],
    judgments: any[],
    tasks: any[],
    documents: any[],
    memoranda?: any[]
  ): CaseJourneyEvent[] {
    const events: CaseJourneyEvent[] = []

    // 1. Add Filing Event
    if (caseData?.registration_date) {
      events.push({
        id: `filing_${caseData.id}`,
        type: 'FILING',
        stage: 'قيد القضية',
        title: 'قيد القضية والافتتاح',
        date: caseData.registration_date,
        status: 'مكتملة',
        summary: `تم قيد القضية برقم ${caseData.case_number} في ${caseData.court}`,
        details: {
          court: caseData.court,
          circuit: caseData.circuit,
          notes: `حالة القضية الحالية: ${caseData.status}`
        },
        links: { entityType: 'case', entityId: caseData.id }
      })
    }

    // 2. Add Sessions (Sorted chronologically for correct labeling)
    ;[...(sessions || [])]
      .sort((a, b) => {
        const dateA = this.safeDateForSort(a?.date)
        const dateB = this.safeDateForSort(b?.date)
        if (dateA !== dateB) return dateA - dateB
        return this.safeTime(a?.time).localeCompare(this.safeTime(b?.time))
      })
      .forEach((s: any, index: number) => {
        events.push({
          id: `session_${s.id}`,
          type: 'SESSION',
          stage: 'الجلسات',
          title: `الجلسة ${this.getArabicOrdinal(index + 1)}`,
          date: this.toIsoDate(s.date),
          status: this.mapSessionStatus(s),
          summary: s.result || 'جلسة مجدولة للنظر في الدعوى',
          details: {
            court: s.court_room || caseData?.court,
            notes: s.result
          },
          links: { entityType: 'session', entityId: s.id }
        })
      })

    // 3. Add Judgments
    ;(judgments || []).forEach((j: any) => {
      const jt = String(j?.type || j?.judgment_type || '').trim()
      const favor = String(j?.favor || '').trim()
      const date = this.toIsoDate(j?.judgment_date || j?.date || j?.created_at)
      const title = jt ? `حكم ${jt}` : 'حكم'
      const summary = favor ? `صدر ${title} بوضعية: ${favor}` : `صدر ${title}`
      events.push({
        id: `judgment_${j.id}`,
        type: 'JUDGMENT',
        stage: 'الأحكام',
        title,
        date,
        status: 'مكتملة',
        summary,
        details: {
          notes: j.notes || ''
        },
        links: { entityType: 'judgment', entityId: j.id }
      })
    })

    // 4. Add Important Tasks as milestones
    ;(tasks || [])
      .filter((t: any) => t.priority === 'عالية')
      .forEach((t: any) => {
        events.push({
          id: `task_${t.id}`,
          type: 'TASK',
          stage: 'المذكرات',
          title: t.title || 'مهمة',
          date: this.toIsoDate(t.due_date || t.created_at),
          status: t.completed ? 'مكتملة' : 'بانتظار',
          summary: 'مهمة قانونية مرتبطة بمسار القضية',
          details: {
            notes: t.description
          },
          links: { entityType: 'task', entityId: t.id }
        })
      })

    // 5. Add Documents
    ;(documents || []).forEach((d: any) => {
      events.push({
        id: `doc_${d.id}`,
        type: 'ATTACHMENT',
        stage: 'المذكرات',
        title: d.name || 'مستند',
        date: this.toIsoDate(d.created_at?.split(' ')[0] || d.date),
        status: 'تمت',
        summary: 'مستند قانوني أو مذكرة مرفقة',
        details: {
          attachments: [{ name: d.name, url: d.file_path }]
        },
        links: { entityType: 'document', entityId: d.id }
      })
    })

    // 6. Add Memoranda
    ;(memoranda || []).forEach((m: any) => {
      events.push({
        id: `memo_${m.id}`,
        type: 'MEMO',
        stage: 'المذكرات',
        title: m.memo_title || 'مذكرة قضائية',
        date: this.toIsoDate(m.memo_date || m.created_at),
        status: 'مكتملة',
        summary: `${m.memo_type || 'مذكرة'}: ${m.memo_summary || ''}`,
        details: {
          notes: m.memo_text
        },
        links: { entityType: 'memo', entityId: m.id }
      })
    })

    // Final sort for the diagram
    return events.sort((a, b) => this.safeDateForSort(a.date) - this.safeDateForSort(b.date))
  }

  private getArabicOrdinal(num: number): string {
    const ordinals = [
      'الأولى',
      'الثانية',
      'الثالثة',
      'الرابعة',
      'الخامسة',
      'السادسة',
      'السابعة',
      'الثامنة',
      'التاسعة',
      'العاشرة'
    ]
    return ordinals[num - 1] || `${num}`
  }

  private mapSessionStatus(session: any): CaseJourneyStatus {
    if (session.result) return 'تمت'
    const sessionDate = new Date(session.date)
    const today = new Date()
    if (sessionDate < today) return 'مؤجلة'
    return 'مجدولة'
  }
}

export const caseJourneyService = new CaseJourneyService()
