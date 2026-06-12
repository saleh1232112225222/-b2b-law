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
  default: 30,
}

const APPEAL_TYPE_MAP: Record<string, { type: 'اعتراض' | 'استئناف' | 'نقض'; label: string }> = {
  ابتدائي: { type: 'استئناف', label: 'استئناف الحكم الابتدائي' },
  استئنافي: { type: 'نقض', label: 'الطعن بالنقض' },
  قطعي: { type: 'نقض', label: 'الطعن بالنقض (حالات استثنائية)' },
  نهائي: { type: 'نقض', label: 'الطعن بالنقض (حالات استثنائية)' },
}

export function classifyOutcome(result: string): JudgmentAnalysis['outcomeType'] {
  if (result.includes('حجز') || result.includes('الحكم')) return 'حجز للحكم'
  if (result.includes('حكم') || result.includes('صدور حكم') || result.includes('براءة')) return 'حكم'
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
  const outcomeType = classifyOutcome(input.result)

  const degree = input.judgmentType && (input.judgmentType.includes('قطعي') || input.judgmentType.includes('نهائي'))
    ? 'قطعي' as const
    : input.judgmentType?.includes('استئناف')
      ? 'استئنافي' as const
      : input.judgmentType?.includes('ابتدائي')
        ? 'ابتدائي' as const
        : determineDegree(input.result)

  const isFinal = degree === 'قطعي' || degree === 'نهائي'
  const caseType = input.caseType || 'default'
  const appealDays = CASE_TYPE_DEADLINES[caseType] || CASE_TYPE_DEADLINES.default
  const serviceDate = input.serviceDate || todayStr()
  const judgmentDate = input.judgmentDate || todayStr()
  const favors = input.isForClient === undefined ? undefined : input.isForClient ? 'موكل' : 'خصم'
  const needsExecution = input.needsExecution === undefined
    ? (favors === 'موكل' ? false : false)
    : input.needsExecution
  const hasAppealGrounds = input.hasAppealGrounds === undefined
    ? (favors === 'خصم' && !isFinal)
    : input.hasAppealGrounds

  const appealType = hasAppealGrounds && outcomeType === 'حكم'
    ? (APPEAL_TYPE_MAP[degree] || APPEAL_TYPE_MAP.ابتدائي)
    : undefined

  const tasks: GeneratedTask[] = []
  const deadlines: {
    appealDeadlineDays?: number
    appealStartDate?: string | null
    appealEndDate?: string | null
    executionStartDate?: string | null
  } = {}

  // ──────────────────────────────────────────────
  //  المنطق الهرمي لتحليل النتائج
  // ──────────────────────────────────────────────

  // ── المسار: نتيجة من نوع حكم ──
  if (outcomeType === 'حكم') {
    // ── [الممر أ] الحكم لصالح الموكل ──
    if (favors === 'موكل') {
      // تبليغ العميل بالنتيجة
      tasks.push({
        title: 'تبليغ العميل بالنتيجة',
        description: 'إبلاغ العميل بالحكم الصادر لصالحه.',
        priority: 'مهمة',
        dueDate: todayStr(),
        scheduledFor: todayStr(),
      })

      if (needsExecution) {
        // مهمة عاجلة: تنفيذ الحكم
        deadlines.executionStartDate = todayStr()
        tasks.push({
          title: 'تنفيذ الحكم',
          description: `بدء إجراءات تنفيذ الحكم (حجز أموال الخصم، تحصيل المبلغ، إخلاء، إلخ). تاريخ بداية التنفيذ: ${todayStr()}.`,
          priority: 'عاجلة',
          dueDate: todayStr(),
          scheduledFor: todayStr(),
        })
        tasks.push({
          title: 'تحديد آلية التنفيذ',
          description: 'تحديد آلية التنفيذ المناسبة (حجز، إخلاء، تحصيل، إلخ) ومتابعة الإجراءات القانونية.',
          priority: 'مهمة',
          dueDate: daysFromNow(3),
          scheduledFor: daysFromNow(1),
        })
        tasks.push({
          title: 'متابعة إجراءات التنفيذ',
          description: 'متابعة سير إجراءات التنفيذ وتحديث حالة القضية بعد 7 أيام من تاريخ البدء.',
          priority: 'عادية',
          dueDate: daysFromNow(7),
          scheduledFor: daysFromNow(7),
        })
      } else {
        // الحكم لا يحتاج تنفيذ (براءة، حكم لصالح بدون تنفيذ)
        tasks.push({
          title: 'أرشفة القضية',
          description: 'أرشفة القضية بعد الانتهاء منها.',
          priority: 'عادية',
          dueDate: daysFromNow(3),
          scheduledFor: daysFromNow(3),
        })
      }
    }

    // ── [الممر ب] الحكم ضد الموكل (لصالح الخصم) ──
    if (favors === 'خصم') {
      if (hasAppealGrounds) {
        deadlines.appealDeadlineDays = appealDays
        deadlines.appealStartDate = serviceDate
        deadlines.appealEndDate = addDaysToDate(serviceDate, appealDays)

        // المدة المتبقية المقترحة (5 أيام قبل انتهاء المهلة)
        const bufferEndDate = addDaysToDate(serviceDate, appealDays - 5)

        tasks.push({
          title: `تقديم ${appealType!.label}`,
          description: `مطلوب تقديم ${appealType!.label} قبل ${deadlines.appealEndDate} (خلال ${appealDays} يوماً من تاريخ التبليغ ${serviceDate}).`,
          priority: 'عاجلة',
          dueDate: bufferEndDate,
          scheduledFor: todayStr(),
        })
        tasks.push({
          title: 'دراسة أسباب الاعتراض',
          description: 'تحليل الأسباب القانونية للاعتراض على الحكم وإعداد مذكرة الاعتراض.',
          priority: 'مهمة',
          dueDate: daysFromNow(appealDays > 30 ? 10 : 5),
          scheduledFor: todayStr(),
        })
      } else {
        // لا يوجد سبب للاعتراض
        if (isFinal) {
          tasks.push({
            title: 'تنفيذ الحكم (لصالح الخصم)',
            description: 'الحكم نهائي لصالح الخصم - يجب اتخاذ الإجراءات اللازمة.',
            priority: 'عاجلة',
            dueDate: todayStr(),
            scheduledFor: todayStr(),
          })
        }
      }

      // تبليغ العميل - في جميع حالات الحكم ضد الموكل
      tasks.push({
        title: 'تبليغ العميل بالنتيجة والمخاطر',
        description: `إبلاغ العميل بالحكم الصادر ضد مصلحته${hasAppealGrounds ? ' وإبلاغه بخيارات الاعتراض المتاحة' : ''} والخطوات القادمة.`,
        priority: 'عاجلة',
        dueDate: todayStr(),
        scheduledFor: todayStr(),
      })
    }
  }

  // ── المسار: نتيجة من نوع قرار ──
  if (outcomeType === 'قرار') {
    tasks.push({
      title: 'تحليل القرار الصادر',
      description: 'مراجعة القرار الصادر من المحكمة وتحليل آثاره على القضية.',
      priority: 'مهمة',
      dueDate: todayStr(),
      scheduledFor: todayStr(),
    })
    tasks.push({
      title: 'تبليغ العميل بالقرار',
      description: 'إبلاغ العميل بالقرار الصادر وتوضيح الخطوات التالية.',
      priority: 'مهمة',
      dueDate: todayStr(),
      scheduledFor: todayStr(),
    })
  }

  // ── المسار: نتيجة من نوع حجز للحكم ──
  if (outcomeType === 'حجز للحكم') {
    tasks.push({
      title: 'متابعة تاريخ النطق بالحكم',
      description: 'متابعة الجلسة المحددة للنطق بالحكم وتذكير المحكمة عند الحاجة.',
      priority: 'عاجلة',
      scheduledFor: todayStr(),
    })
  }

  // ── المسار: نتيجة من نوع تأجيل ──
  if (outcomeType === 'تأجيل') {
    tasks.push({
      title: 'متابعة تاريخ الجلسة الجديدة',
      description: 'متابعة الجلسة الجديدة المحددة من المحكمة والتحضير لها.',
      priority: 'مهمة',
      scheduledFor: todayStr(),
    })
  }

  // ── المسار: نتيجة من نوع تبليغ / إجراء إداري ──
  if (outcomeType === 'تبليغ / إجراء إداري') {
    tasks.push({
      title: 'متابعة إجراءات التبليغ',
      description: 'متابعة إجراءات التبليغ والتأكد من اكتمالها.',
      priority: 'مهمة',
      scheduledFor: todayStr(),
    })
  }

  // ── المسار: نتيجة أخرى ──
  if (outcomeType === 'أخرى') {
    tasks.push({
      title: 'مراجعة النتيجة وتحليلها',
      description: 'مراجعة النتيجة غير المصنفة وتحليل آثارها على القضية.',
      priority: 'مهمة',
      dueDate: daysFromNow(1),
      scheduledFor: todayStr(),
    })
    tasks.push({
      title: 'تبليغ العميل بنتيجة الجلسة',
      description: 'إبلاغ العميل بنتيجة الجلسة.',
      priority: 'عادية',
      dueDate: todayStr(),
      scheduledFor: todayStr(),
    })
  }

  // summary
  let summary = `نوع النتيجة: ${outcomeType}`
  if (degree) summary += ` | درجة الحكم: ${degree}`
  if (favors) summary += ` | لصالح: ${favors}`
  if (outcomeType === 'حكم' && favors === 'موكل') {
    summary += needsExecution ? ' | يحتاج تنفيذ' : ' | لا يحتاج تنفيذ'
  }
  if (outcomeType === 'حكم' && favors === 'خصم') {
    summary += hasAppealGrounds ? ' | يوجد سبب اعتراض' : ' | لا يوجد سبب اعتراض'
  }
  if (deadlines.appealEndDate) summary += ` | موعد الاعتراض: ${deadlines.appealEndDate}`
  summary += ` | عدد المهام: ${tasks.length}`

  const hasDeadlines = deadlines.appealDeadlineDays !== undefined

  return {
    outcomeType,
    degree,
    favors,
    needsExecution,
    hasAppealGrounds,
    appealType: appealType?.type,
    deadlines: hasDeadlines ? deadlines as JudgmentAnalysis['deadlines'] : undefined,
    tasks,
    summary,
  }
}

export function detectCaseType(notes?: string): string {
  if (!notes) return 'default'
  const noteLower = notes
  if (noteLower.includes('عمال') || noteLower.includes('موظف')) return 'عمالية'
  if (noteLower.includes('تجاري') || noteLower.includes('شركة')) return 'تجارية'
  if (noteLower.includes('جنائي') || noteLower.includes('جزائي')) return 'جنائية'
  if (noteLower.includes('إداري') || noteLower.includes('ديوان')) return 'إدارية'
  if (noteLower.includes('أحوال') || noteLower.includes('زواج') || noteLower.includes('طلاق')) return 'أحوال_شخصية'
  if (noteLower.includes('مدني')) return 'مدنية'
  return 'default'
}

export async function saveGeneratedTasks(
  companyId: string,
  caseId: string | undefined,
  tasks: GeneratedTask[],
  createdBy: string,
): Promise<string[]> {
  const ids: string[] = []
  for (const t of tasks) {
    const id = crypto.randomUUID()
    await query(
      `INSERT INTO tasks_v2 (id, company_id, case_id, title, description, priority, status, due_date, scheduled_for, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7::date, $8::timestamptz, $9, NOW())`,
      [id, companyId, caseId || null, t.title, t.description, t.priority === 'عاجلة' ? 'high' : t.priority === 'مهمة' ? 'medium' : 'low', t.dueDate || null, t.scheduledFor ? `${t.scheduledFor}T00:00:00Z` : null, createdBy]
    )
    ids.push(id)
  }
  return ids
}
