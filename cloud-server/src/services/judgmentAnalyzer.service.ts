import { query } from '../db/connection'

export interface GeneratedTask {
  title: string
  description: string
  priority: 'عاجلة' | 'مهمة' | 'عادية'
  dueDate?: string
  scheduledFor?: string
}

export interface JudgmentAnalysis {
  outcomeType: 'حكم' | 'قرار' | 'حجز للحكم' | 'تأجيل' | 'تبليغ / إجراء إداري' | 'أخرى'
  degree?: 'ابتدائي' | 'استئنافي' | 'نهائي' | 'قطعي'
  favors?: 'موكل' | 'خصم'
  needsExecution?: boolean
  hasAppealGrounds?: boolean
  appealType?: 'اعتراض' | 'استئناف' | 'نقض'
  deadlines?: {
    appealDeadlineDays: number
    appealStartDate: string | null
    appealEndDate: string | null
    executionStartDate?: string | null
  }
  tasks: GeneratedTask[]
  summary: string
}

const CASE_TYPE_DEADLINES: Record<string, number> = {
  مدنية: 30,
  تجارية: 30,
  جنائية: 30,
  إدارية: 60,
  عمالية: 30,
  أحوال_شخصية: 30,
  default: 30
}

const APPEAL_TYPE_MAP: Record<string, { type: 'اعتراض' | 'استئناف' | 'نقض'; label: string }> = {
  ابتدائي: { type: 'استئناف', label: 'استئناف الحكم الابتدائي' },
  استئنافي: { type: 'نقض', label: 'الطعن بالنقض' },
  قطعي: { type: 'نقض', label: 'الطعن بالنقض (حالات استثنائية)' },
  نهائي: { type: 'نقض', label: 'الطعن بالنقض (حالات استثنائية)' }
}

export function classifyOutcome(result: string): JudgmentAnalysis['outcomeType'] {
  if (result.includes('حجز') || result.includes('الحكم')) return 'حجز للحكم'
  if (result.includes('حكم') || result.includes('صدور حكم') || result.includes('براءة'))
    return 'حكم'
  if (result.includes('تأجيل')) return 'تأجيل'
  if (result.includes('تبليغ') || result.includes('إجراء')) return 'تبليغ / إجراء إداري'
  if (result.includes('قرار') || result.includes('شطب') || result.includes('قطع')) return 'قرار'
  return 'أخرى'
}

export function determineDegree(result: string): 'ابتدائي' | 'استئنافي' | 'نهائي' | 'قطعي' {
  if (result.includes('قطعي') || result.includes('نهائي') || result.includes('قطع')) return 'قطعي'
  if (result.includes('استئناف')) return 'استئنافي'
  if (result.includes('ابتدائي')) return 'ابتدائي'
  return 'ابتدائي'
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function daysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export interface AnalyzeJudgmentInput {
  result: string
  judgmentType?: string
  judgmentNumber?: string
  judgmentDate?: string
  serviceDate?: string
  caseType?: string
  courtType?: string
  isForClient?: boolean
  hasAppealGrounds?: boolean
  needsExecution?: boolean
  notes?: string
}

export function analyzeJudgment(input: AnalyzeJudgmentInput): JudgmentAnalysis {
  // ──────── المرحلة 1: تصنيف النتيجة ────────
  const outcomeType = classifyOutcome(input.result)
  const caseType = input.caseType || 'default'
  const serviceDate = input.serviceDate || todayStr()
  const judgmentDate = input.judgmentDate || todayStr()

  // ──────── المسار: نتيجة غير حكم ────────
  if (outcomeType !== 'حكم') return analyzeNonJudgmentOutcome(outcomeType)

  // ──────── المسار: نتيجة من نوع حكم ────────
  // المرحلة 2.1: تحديد درجة الحكم
  const rawDegree = determineDegree(input.result)
  const degree: JudgmentAnalysis['degree'] =
    input.judgmentType && input.judgmentType.includes('قطعي')
      ? 'قطعي'
      : input.judgmentType?.includes('نهائي')
        ? 'نهائي'
        : input.judgmentType?.includes('استئناف')
          ? 'استئنافي'
          : input.judgmentType?.includes('ابتدائي')
            ? 'ابتدائي'
            : rawDegree

  // قابلية الطعن: ابتدائي ← استئناف، استئنافي ← نقض، قطعي ← نقض (استثناء)، نهائي ← لا طعن
  const isInitial = degree === 'ابتدائي' || degree === 'استئنافي' || degree === 'قطعي'
  const isFinal = degree === 'نهائي'

  // المرحلة 2.2: تحديد صاحب الحكم
  const favors: 'موكل' | 'خصم' | undefined =
    input.isForClient === undefined ? undefined : input.isForClient ? 'موكل' : 'خصم'

  const tasks: GeneratedTask[] = []
  const deadlines: Record<string, any> = {}
  let needsExecution: boolean | undefined
  let hasAppealGrounds: boolean | undefined
  let appealType: { type: 'اعتراض' | 'استئناف' | 'نقض'; label: string } | undefined

  // ──────── المسار أ: حكم ابتدائي ────────
  if (isInitial) {
    if (favors === 'موكل') {
      // سؤال ذكي: هل يحتاج تنفيذ؟
      needsExecution = input.needsExecution === undefined ? false : input.needsExecution
      hasAppealGrounds = false
      if (needsExecution) {
        tasks.push({
          title: 'تنفيذ الحكم',
          description: `بدء إجراءات تنفيذ الحكم. تاريخ البدء: ${todayStr()}.`,
          priority: 'عاجلة',
          dueDate: todayStr(),
          scheduledFor: todayStr()
        })
        tasks.push({
          title: 'تحديد آلية التنفيذ',
          description: 'تحديد آلية التنفيذ المناسبة (حجز، إخلاء، تحصيل، إلخ).',
          priority: 'مهمة',
          dueDate: daysFromNow(3),
          scheduledFor: daysFromNow(1)
        })
        tasks.push({
          title: 'متابعة إجراءات التنفيذ',
          description: 'متابعة سير إجراءات التنفيذ بعد 7 أيام.',
          priority: 'عادية',
          dueDate: daysFromNow(7),
          scheduledFor: daysFromNow(7)
        })
      } else {
        tasks.push({
          title: 'أرشفة القضية',
          description: 'أرشفة القضية بعد الانتهاء منها.',
          priority: 'عادية',
          dueDate: daysFromNow(3),
          scheduledFor: daysFromNow(3)
        })
      }
      tasks.push({
        title: 'تبليغ العميل بالنتيجة',
        description: 'إبلاغ العميل بالحكم الصادر لصالحه.',
        priority: 'مهمة',
        dueDate: todayStr(),
        scheduledFor: todayStr()
      })
    } else if (favors === 'خصم') {
      // سؤال ذكي: هل يوجد سبب مشروع للاعتراض؟
      hasAppealGrounds = input.hasAppealGrounds === undefined ? false : input.hasAppealGrounds
      if (hasAppealGrounds) {
        appealType = APPEAL_TYPE_MAP[degree]
        const appealDays = CASE_TYPE_DEADLINES[caseType] || CASE_TYPE_DEADLINES.default
        deadlines.appealDeadlineDays = appealDays
        deadlines.appealStartDate = serviceDate
        deadlines.appealEndDate = addDaysToDate(serviceDate, appealDays)
        tasks.push({
          title: `تقديم ${appealType!.label}`,
          description: `مطلوب تقديم ${appealType!.label} قبل ${deadlines.appealEndDate}.`,
          priority: 'عاجلة',
          dueDate: addDaysToDate(serviceDate, appealDays - 5),
          scheduledFor: todayStr()
        })
        tasks.push({
          title: 'دراسة أسباب الاعتراض',
          description: 'تحليل الأسباب القانونية للاعتراض.',
          priority: 'مهمة',
          dueDate: daysFromNow(appealDays > 30 ? 10 : 5),
          scheduledFor: todayStr()
        })
      }
      tasks.push({
        title: 'تبليغ العميل بالنتيجة والمخاطر',
        description: `إبلاغ العميل بالحكم ضد مصلحته${hasAppealGrounds ? ' وخيارات الاعتراض' : ''}.`,
        priority: 'عاجلة',
        dueDate: todayStr(),
        scheduledFor: todayStr()
      })
    }
  }

  // ──────── المسار ب: حكم نهائي ────────
  if (isFinal) {
    if (favors === 'موكل') {
      needsExecution = input.needsExecution === undefined ? false : input.needsExecution
      if (needsExecution) {
        tasks.push({
          title: 'تنفيذ الحكم',
          description: `بدء إجراءات تنفيذ الحكم النهائي.`,
          priority: 'عاجلة',
          dueDate: todayStr(),
          scheduledFor: todayStr()
        })
        tasks.push({
          title: 'تحديد آلية التنفيذ',
          description: 'تحديد آلية التنفيذ المناسبة.',
          priority: 'مهمة',
          dueDate: daysFromNow(3),
          scheduledFor: daysFromNow(1)
        })
        tasks.push({
          title: 'متابعة إجراءات التنفيذ',
          description: 'متابعة سير إجراءات التنفيذ.',
          priority: 'عادية',
          dueDate: daysFromNow(7),
          scheduledFor: daysFromNow(7)
        })
      }
      tasks.push({
        title: 'تبليغ العميل بالنتيجة',
        description: 'إبلاغ العميل بالحكم النهائي.',
        priority: 'مهمة',
        dueDate: todayStr(),
        scheduledFor: todayStr()
      })
    } else if (favors === 'خصم') {
      // لا يقبل الطعن — مهمة أرشفة
      tasks.push({
        title: 'أرشفة القضية',
        description: 'الحكم نهائي لصالح الخصم ولا يقبل الطعن — أرشفة القضية.',
        priority: 'عادية',
        dueDate: daysFromNow(3),
        scheduledFor: daysFromNow(3)
      })
      tasks.push({
        title: 'تبليغ العميل بالنتيجة والمخاطر',
        description: 'إبلاغ العميل بالحكم النهائي ضد مصلحته.',
        priority: 'عاجلة',
        dueDate: todayStr(),
        scheduledFor: todayStr()
      })
    }
  }

  // ──────── بناء الملخص ────────
  let summary = `نوع النتيجة: ${outcomeType} | درجة الحكم: ${degree}`
  if (favors) summary += ` | لصالح: ${favors}`
  if (isInitial) {
    if (favors === 'موكل') summary += needsExecution ? ' | يحتاج تنفيذ' : ' | لا يحتاج تنفيذ'
    if (favors === 'خصم')
      summary += hasAppealGrounds ? ' | يوجد سبب اعتراض' : ' | لا يوجد سبب اعتراض'
  }
  if (isFinal && favors === 'موكل')
    summary += needsExecution ? ' | يحتاج تنفيذ' : ' | لا يحتاج تنفيذ'
  if (isFinal && favors === 'خصم') summary += ' | لا يقبل الطعن'
  if (deadlines.appealEndDate) summary += ` | آخر موعد للاعتراض: ${deadlines.appealEndDate}`
  summary += ` | عدد المهام: ${tasks.length}`

  return {
    outcomeType,
    degree,
    favors,
    needsExecution,
    hasAppealGrounds,
    appealType: appealType?.type,
    deadlines: deadlines.appealDeadlineDays
      ? (deadlines as JudgmentAnalysis['deadlines'])
      : undefined,
    tasks,
    summary
  }
}

function analyzeNonJudgmentOutcome(outcomeType: JudgmentAnalysis['outcomeType']): JudgmentAnalysis {
  const tasks: GeneratedTask[] = []
  if (outcomeType === 'قرار') {
    tasks.push({
      title: 'تحليل القرار الصادر',
      description: 'مراجعة القرار الصادر وتحليل آثاره.',
      priority: 'مهمة',
      dueDate: todayStr(),
      scheduledFor: todayStr()
    })
    tasks.push({
      title: 'تبليغ العميل بالقرار',
      description: 'إبلاغ العميل بالقرار.',
      priority: 'مهمة',
      dueDate: todayStr(),
      scheduledFor: todayStr()
    })
  } else if (outcomeType === 'حجز للحكم') {
    tasks.push({
      title: 'متابعة تاريخ النطق بالحكم',
      description: 'متابعة الجلسة المحددة للنطق بالحكم.',
      priority: 'عاجلة',
      scheduledFor: todayStr()
    })
  } else if (outcomeType === 'تأجيل') {
    tasks.push({
      title: 'متابعة تاريخ الجلسة الجديدة',
      description: 'متابعة الجلسة الجديدة المحددة.',
      priority: 'مهمة',
      scheduledFor: todayStr()
    })
  } else if (outcomeType === 'تبليغ / إجراء إداري') {
    tasks.push({
      title: 'متابعة إجراءات التبليغ',
      description: 'متابعة إجراءات التبليغ.',
      priority: 'مهمة',
      scheduledFor: todayStr()
    })
  } else {
    tasks.push({
      title: 'مراجعة النتيجة وتحليلها',
      description: 'مراجعة النتيجة غير المصنفة.',
      priority: 'مهمة',
      dueDate: daysFromNow(1),
      scheduledFor: todayStr()
    })
    tasks.push({
      title: 'تبليغ العميل بنتيجة الجلسة',
      description: 'إبلاغ العميل بنتيجة الجلسة.',
      priority: 'عادية',
      dueDate: todayStr(),
      scheduledFor: todayStr()
    })
  }
  return {
    outcomeType,
    tasks,
    summary: `نوع النتيجة: ${outcomeType} | عدد المهام: ${tasks.length}`
  }
}

export function detectCaseType(notes?: string): string {
  if (!notes) return 'default'
  const n = notes
  if (n.includes('عمال') || n.includes('موظف')) return 'عمالية'
  if (n.includes('تجاري') || n.includes('شركة')) return 'تجارية'
  if (n.includes('جنائي') || n.includes('جزائي')) return 'جنائية'
  if (n.includes('إداري') || n.includes('ديوان')) return 'إدارية'
  if (n.includes('أحوال') || n.includes('زواج') || n.includes('طلاق')) return 'أحوال_شخصية'
  if (n.includes('مدني')) return 'مدنية'
  return 'default'
}

export async function saveGeneratedTasks(
  companyId: string,
  caseId: string | undefined,
  tasks: GeneratedTask[],
  createdBy: string
): Promise<string[]> {
  const ids: string[] = []
  for (const t of tasks) {
    const id = crypto.randomUUID()
    await query(
      `INSERT INTO tasks_v2 (id, company_id, case_id, title, description, priority, status, due_date, scheduled_for, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7::date, $8::timestamptz, $9, NOW())`,
      [
        id,
        companyId,
        caseId || null,
        t.title,
        t.description,
        t.priority === 'عاجلة' ? 'high' : t.priority === 'مهمة' ? 'medium' : 'low',
        t.dueDate || null,
        t.scheduledFor ? `${t.scheduledFor}T00:00:00Z` : null,
        createdBy
      ]
    )
    ids.push(id)
  }
  return ids
}
