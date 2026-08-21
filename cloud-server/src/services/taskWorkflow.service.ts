import { query } from '../db/connection'
import { v4 as uuidv4 } from 'uuid'

export type TaskValidationResult = {
  isValid: boolean
  message?: string
  outputType?: string
  outputId?: string
}

export function resolveLegacyTaskType(title?: string | null, description?: string | null): string {
  const text = `${title || ''} ${description || ''}`.trim()
  if (!text) return 'general'

  if (text.includes('تحديد موعد الجلسة') || text.includes('إنشاء جلسة') || text.includes('موعد الجلسة القادمة')) {
    return 'schedule_next_session'
  }
  if (
    text.includes('اعتراض') ||
    text.includes('استئناف') ||
    text.includes('لائحة اعتراضية') ||
    text.includes('مذكرة اعتراض') ||
    text.includes('مذكرة استئناف')
  ) {
    return 'appeal_objection'
  }
  if (text.includes('التماس') || text.includes('التماس إعادة النظر')) {
    return 'petition_review'
  }
  if (text.includes('متابعة اكتساب الحكم') || text.includes('الصفة القطعية')) {
    return 'followup_judgment'
  }
  if (text.includes('تنفيذ الحكم') || text.includes('طلب تنفيذ')) {
    return 'execution_judgment'
  }
  if (text.includes('صياغة') || text.includes('إعداد مذكرة') || text.includes('إعداد عقد')) {
    return 'document_drafting'
  }
  return 'general'
}

export function resolveTaskType(task: any): string {
  if (task?.task_type && String(task.task_type).trim()) {
    return String(task.task_type).trim()
  }
  return resolveLegacyTaskType(task?.title, task?.description)
}

export async function validateTaskCompletion(task: any, companyId: string): Promise<TaskValidationResult> {
  const taskType = resolveTaskType(task)
  const caseId = task.case_id ? String(task.case_id).trim() : null
  const effectiveSince = task.status_changed_at || task.updated_at || task.created_at || new Date().toISOString()

  // 1. مهام تحديد مواعيد الجلسات: تشترط وجود جلسة مسجلة فعلياً في جدول sessions
  if (taskType === 'schedule_next_session') {
    if (!caseId) {
      return { isValid: false, message: 'لا يمكن إكمال المهمة: المهمة غير مرتبطة بقضية محددة' }
    }
    const sessionRes = await query(
      `SELECT id FROM sessions 
       WHERE case_id = $1 AND company_id = $2 AND is_archived = FALSE 
       AND (created_at >= $3 OR date >= CURRENT_DATE) 
       ORDER BY created_at DESC LIMIT 1`,
      [caseId, companyId, effectiveSince]
    )

    if (sessionRes.rows.length === 0) {
      return {
        isValid: false,
        message: 'لا يمكن إكمال المهمة: لم يتم تسجيل موعد جلسة جديدة لهذه القضية في شاشة الجلسات بعد'
      }
    }
    return { isValid: true, outputType: 'session', outputId: sessionRes.rows[0].id }
  }

  // 2. مهام إعداد وتقديم الاعتراض / الاستئناف: تشترط وجود مذكرة مودعة أو صك اعتراض مرفوع
  if (taskType === 'appeal_objection') {
    if (!caseId) {
      return { isValid: false, message: 'لا يمكن إكمال المهمة: المهمة غير مرتبطة بقضية محددة' }
    }
    const memoRes = await query(
      `SELECT id FROM memoranda 
       WHERE case_id = $1 AND company_id = $2 AND is_archived = FALSE 
       AND (memo_type ILIKE '%استئناف%' OR memo_type ILIKE '%اعتراض%' OR memo_title ILIKE '%اعتراض%' OR memo_title ILIKE '%استئناف%') 
       ORDER BY created_at DESC LIMIT 1`,
      [caseId, companyId]
    )

    if (memoRes.rows.length > 0) {
      return { isValid: true, outputType: 'memorandum', outputId: memoRes.rows[0].id }
    }

    const docRes = await query(
      `SELECT id FROM documents_v2 
       WHERE (task_id = $1 OR case_id = $2) AND company_id = $3 AND is_archived = FALSE 
       ORDER BY created_at DESC LIMIT 1`,
      [task.id, caseId, companyId]
    )

    if (docRes.rows.length > 0) {
      return { isValid: true, outputType: 'document', outputId: docRes.rows[0].id }
    }

    return {
      isValid: false,
      message: 'لا يمكن إكمال المهمة: لم يتم إيداع مذكرة اعتراض/استئناف في قسم المذكرات أو رفع لائحته بعد'
    }
  }

  // 3. مهام صياغة العقود والمستندات: تشترط وجود مستند أو مسودة مسجلة
  if (taskType === 'document_drafting') {
    const docRes = await query(
      `SELECT id FROM documents_v2 
       WHERE (task_id = $1 OR (case_id = $2 AND case_id IS NOT NULL)) AND company_id = $3 AND is_archived = FALSE 
       ORDER BY created_at DESC LIMIT 1`,
      [task.id, caseId, companyId]
    )

    if (docRes.rows.length > 0) {
      return { isValid: true, outputType: 'document', outputId: docRes.rows[0].id }
    }

    if (caseId) {
      const memoRes = await query(
        `SELECT id FROM memoranda 
         WHERE case_id = $1 AND company_id = $2 AND is_archived = FALSE 
         ORDER BY created_at DESC LIMIT 1`,
        [caseId, companyId]
      )
      if (memoRes.rows.length > 0) {
        return { isValid: true, outputType: 'memorandum', outputId: memoRes.rows[0].id }
      }
    }

    return {
      isValid: false,
      message: 'لا يمكن إكمال المهمة: يجب أولاً صياغة أو رفع المستند/المذكرة المطلوبة'
    }
  }

  // 4. المهام الإدارية والمتابعات العامة: تكتمل بعد التحقق من أنها ليست مهمة ذات مخرج إلزامي
  return { isValid: true }
}

export async function handleBusinessEvent(params: {
  event: 'session_created' | 'memorandum_created' | 'document_uploaded'
  companyId: string
  caseId?: string | null
  sourceId: string
  userId?: string | null
}): Promise<{ completedTaskIds: string[] }> {
  const { event, companyId, caseId, sourceId, userId } = params
  if (!caseId) return { completedTaskIds: [] }

  const completedTaskIds: string[] = []

  try {
    const targetType = event === 'session_created' ? 'schedule_next_session' : event === 'memorandum_created' ? 'appeal_objection' : 'document_drafting'
    const outputType = event === 'session_created' ? 'session' : event === 'memorandum_created' ? 'memorandum' : 'document'

    const openTasksRes = await query(
      `SELECT * FROM tasks_v2 
       WHERE case_id = $1 AND company_id = $2 AND is_archived = FALSE 
       AND status IN ('draft', 'scheduled', 'in_progress', 'waiting', 'blocked', 'pending')
       ORDER BY due_date ASC NULLS LAST, created_at ASC`,
      [caseId, companyId]
    )

    const candidates = openTasksRes.rows.filter((t: any) => resolveTaskType(t) === targetType)
    if (candidates.length === 0) return { completedTaskIds: [] }

    // Pick the earliest candidate to avoid accidental bulk completions
    const targetTask = candidates[0]

    await query(
      `UPDATE tasks_v2 
       SET status = 'completed', completed_at = NOW(), status_changed_at = NOW(), updated_at = NOW(),
           output_type = $1, output_id = $2
       WHERE id = $3 AND company_id = $4`,
      [outputType, sourceId, targetTask.id, companyId]
    )

    await query(
      `INSERT INTO task_audit_log (id, company_id, task_id, action_key, actor_user_id, before_json, after_json, created_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, NOW())`,
      [
        uuidv4(),
        companyId,
        targetTask.id,
        'auto_complete',
        userId || null,
        JSON.stringify({ status: targetTask.status }),
        JSON.stringify({ status: 'completed', output_type: outputType, output_id: sourceId })
      ]
    )

    completedTaskIds.push(targetTask.id)
    console.log(`[TASK_WORKFLOW] Auto-completed task ${targetTask.id} via event ${event}`)
  } catch (err: any) {
    console.error('[TASK_WORKFLOW] handleBusinessEvent error:', err.message)
  }

  return { completedTaskIds }
}
