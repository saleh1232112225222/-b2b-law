import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { query, getClient } from '../db/connection'
import { authMiddleware } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import {
  analyzeJudgment,
  saveGeneratedTasks,
  detectCaseType
} from '../services/judgmentAnalyzer.service'
import {
  ensureClientReportsTable,
  buildClientSessionReport,
  saveClientSessionReportEdits,
  transitionReportStatus,
  renderClientSessionReportHtml
} from '../services/clientSessionReportService'

export const sessionOutcomesRouter = Router()

sessionOutcomesRouter.use(authMiddleware)

function getCompanyId(req: Request): string {
  return req.auth!.companyId
}

// GET /api/session-outcomes/by-session/:sessionId
sessionOutcomesRouter.get(
  '/by-session/:sessionId',
  requirePermission('view_sessions'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { sessionId } = req.params
      const result = await query(
        'SELECT * FROM session_outcomes WHERE session_id = $1 AND company_id = $2 ORDER BY created_at DESC',
        [sessionId, companyId]
      )
      res.json({ data: result.rows })
    } catch (err) {
      console.error('[SESSION_OUTCOMES] getBySession error:', err)
      res.status(500).json({ error: 'فشل في جلب نتائج الجلسة' })
    }
  }
)

// POST /api/session-outcomes/apply — full workflow with smart analysis
sessionOutcomesRouter.post(
  '/apply',
  requirePermission('edit_sessions'),
  async (req: Request, res: Response) => {
    const client = await getClient()
    try {
      const companyId = getCompanyId(req)
      const userId = req.auth!.userId
      const {
        sessionId,
        result,
        notes,
        judgmentData,
        dismissalDecision,
        serviceData,
        caseType,
        postponementReason,
        nextSession,
        actionRequired,
        assignedParty,
        clientSummary,
        lawyerNoteAndNextStep,
        internalNotes
      } = req.body

      if (!sessionId || !result) {
        res.status(400).json({ error: 'معرف الجلسة والنتيجة مطلوبان' })
        return
      }

      await client.query('BEGIN')

      // 1. Get case_id and client_role from session & case
      const sessionRes = await client.query(
        'SELECT s.case_id, s.company_id, c.client_role, c.client_id FROM sessions s LEFT JOIN cases c ON c.id = s.case_id WHERE s.id = $1',
        [sessionId]
      )
      if (sessionRes.rows.length === 0) {
        await client.query('ROLLBACK')
        res.status(404).json({ error: 'الجلسة غير موجودة' })
        return
      }
      if (sessionRes.rows[0].company_id !== companyId) {
        await client.query('ROLLBACK')
        res.status(403).json({ error: 'ممنوع' })
        return
      }
      const caseId = sessionRes.rows[0].case_id
      const clientRole = sessionRes.rows[0].client_role || null
      const clientId = sessionRes.rows[0].client_id || null

      // 2. Create the outcome record
      const outcomeId = uuidv4()
      let outcomeNotes = notes || null
      if (postponementReason && (!outcomeNotes || !outcomeNotes.includes('سبب التأجيل:'))) {
        outcomeNotes = outcomeNotes ? `${outcomeNotes}\nسبب التأجيل: ${postponementReason}` : `سبب التأجيل: ${postponementReason}`
      }
      await client.query(
        `INSERT INTO session_outcomes (id, company_id, session_id, case_id, result, notes, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [outcomeId, companyId, sessionId, caseId, result, outcomeNotes, userId]
      )

      // 3. Update the session status
      await client.query(
        "UPDATE sessions SET status = 'منتهية', result = $1, notes = COALESCE($2, notes), updated_at = NOW() WHERE id = $3",
        [result, outcomeNotes, sessionId]
      )

      // 3.5 Handle Postponement (Next Session creation)
      let nextSessionId: string | null = null
      if (nextSession && nextSession.date) {
        nextSessionId = uuidv4()
        const nextNotes = [
          postponementReason ? `سبب التأجيل: ${postponementReason}` : '',
          actionRequired ? `المطلوب: ${actionRequired}` : '',
          assignedParty ? `المكلف: ${assignedParty}` : '',
          nextSession.notes || ''
        ]
          .filter(Boolean)
          .join(' | ')

        await client.query(
          `INSERT INTO sessions (id, company_id, case_id, date, date_hijri, time, court_room, status, notes, created_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'قادمة', $8, $9, NOW())`,
          [
            nextSessionId,
            companyId,
            caseId,
            nextSession.date,
            nextSession.date_hijri || null,
            nextSession.time || null,
            nextSession.court_room || null,
            nextNotes || 'جلسة مجدولة بناءً على تأجيل سابق',
            userId
          ]
        )
      }

      // 3.6 Handle Postponement Required Action (Smart Task creation)
      if (actionRequired) {
        const taskId = uuidv4()
        await client.query(
          `INSERT INTO tasks_v2 (id, company_id, case_id, title, description, priority, status, due_date, scheduled_for, created_by, created_at)
           VALUES ($1, $2, $3, $4, $5, 'high', 'pending', $6::date, NOW(), $7, NOW())`,
          [
            taskId,
            companyId,
            caseId,
            `مطلوب للجلسة: ${actionRequired}`,
            `المكلف: ${assignedParty || 'المكتب'}${postponementReason ? ` | سبب التأجيل: ${postponementReason}` : ''}`,
            nextSession?.date || null,
            userId
          ]
        )
      }

      // 4. Run smart analysis
      const analysisInput: any = { result, clientRole }
      if (judgmentData) {
        analysisInput.judgmentType = judgmentData.judgment_type
        analysisInput.judgmentNumber = judgmentData.judgment_number
        analysisInput.judgmentDate = judgmentData.judgment_date
        analysisInput.serviceDate = judgmentData.service_date
        analysisInput.isForClient = judgmentData.is_for_client
        analysisInput.isPartialWin = judgmentData.is_partial_win
        analysisInput.isSettlement = judgmentData.is_settlement
        analysisInput.hasAppealGrounds = judgmentData.has_appeal_grounds
        analysisInput.needsExecution = judgmentData.needs_execution
      }
      analysisInput.caseType = caseType || detectCaseType(notes)
      analysisInput.notes = notes

      const analysis = analyzeJudgment(analysisInput)

      // 4.5 Save judgment record if judgmentData provided
      if (caseId && judgmentData) {
        const judgmentId = uuidv4()
        await client.query(
          `INSERT INTO judgments (id, company_id, case_id, type, judgment_date, judgment_number, judgment_type, favor, notes, is_executable, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
          [
            judgmentId,
            companyId,
            caseId,
            judgmentData.judgment_type || 'حكم',
            judgmentData.judgment_date || new Date().toISOString().slice(0, 10),
            judgmentData.judgment_number || null,
            judgmentData.judgment_type || 'ابتدائي',
            analysis.favors || (judgmentData.is_for_client ? 'موكل' : 'خصم'),
            notes || null,
            Boolean(judgmentData.needs_execution)
          ]
        )
      }

      // 4.6 Update case final_outcome, claimed_amount, awarded_amount, failure_reason
      if (caseId && analysis.finalOutcome && analysis.finalOutcome !== 'pending') {
        await client.query(
          `UPDATE cases 
           SET final_outcome = $1,
               claimed_amount = COALESCE($2, claimed_amount),
               awarded_amount = COALESCE($3, awarded_amount),
               failure_reason = COALESCE($4, failure_reason),
               status = CASE WHEN $1 IN ('full_win', 'dismissed', 'settled', 'lost') THEN 'محكومة بحكم نهائي' ELSE status END,
               updated_at = NOW()
           WHERE id = $5 AND company_id = $6`,
          [
            analysis.finalOutcome,
            judgmentData?.claimed_amount !== undefined && judgmentData?.claimed_amount !== null
              ? Number(judgmentData.claimed_amount)
              : null,
            judgmentData?.awarded_amount !== undefined && judgmentData?.awarded_amount !== null
              ? Number(judgmentData.awarded_amount)
              : null,
            judgmentData?.failure_reason || null,
            caseId,
            companyId
          ]
        )
      }

      // 5. Save generated tasks from analysis
      if (analysis.tasks.length > 0) {
        for (const t of analysis.tasks) {
          const taskId = uuidv4()
          await client.query(
            `INSERT INTO tasks_v2 (id, company_id, case_id, title, description, priority, status, due_date, scheduled_for, created_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7::date, $8::timestamptz, $9, NOW())`,
            [
              taskId,
              companyId,
              caseId || null,
              t.title,
              t.description,
              t.priority === 'عاجلة' ? 'high' : t.priority === 'مهمة' ? 'medium' : 'low',
              t.dueDate || null,
              t.scheduledFor ? `${t.scheduledFor}T00:00:00Z` : null,
              userId
            ]
          )
        }
      }

      // 6. Save analysis metadata to outcome
      await client.query(
        "UPDATE session_outcomes SET notes = COALESCE($1, notes) || E'\n\n[تحليل ذكي] ' || $2 WHERE id = $3",
        [outcomeNotes || '', analysis.summary, outcomeId]
      )

      // 6.5 Initialize / update session_client_reports draft
      await client.query(
        `CREATE TABLE IF NOT EXISTS session_client_reports (
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
         )`
      )

      const isPostponed = result.includes('تأجيل') || result.includes('موعد آخر')
      const initialClientSummary = clientSummary || (
        isPostponed
          ? `نحيطكم علماً بأنه قد عُقدت جلسة القضية، وقررت الدائرة القضائية تأجيل نظر الدعوى${postponementReason ? `؛ وذلك لسبب: (${postponementReason})` : ' لاستكمال الإجراءات'}.`
          : `عُقدت الجلسة القضائية المحددة لنظر الدعوى، وثبتت نتيجة الجلسة بـ: (${result}).`
      )
      const initialLawyerNote = lawyerNoteAndNextStep || (
        nextSession?.date
          ? `تحددت الجلسة القادمة بتاريخ ${nextSession.date}${nextSession.time ? ` الساعة ${nextSession.time}` : ''}، والمطلوب: (${actionRequired || 'المتابعة المباشرة'})، ويتولى المكتب الإجراءات اللازمة.`
          : `يقوم فريق الترافع بدراسة الموقف الإجرائي، وسنوافيكم فور صدور أي قيد أو موعد جديد.`
      )

      await client.query(
        `INSERT INTO session_client_reports (
           id, company_id, session_id, case_id, client_id, client_summary, lawyer_notes, internal_notes, dispatch_status, updated_at
         )
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, 'draft', NOW())
         ON CONFLICT (company_id, session_id) DO UPDATE SET
           client_summary = EXCLUDED.client_summary,
           lawyer_notes = EXCLUDED.lawyer_notes,
           internal_notes = COALESCE(EXCLUDED.internal_notes, session_client_reports.internal_notes),
           updated_at = NOW()`,
        [
          companyId,
          sessionId,
          caseId,
          clientId,
          initialClientSummary,
          initialLawyerNote,
          internalNotes || null
        ]
      )

      // 7. Log activity
      await client.query(
        `INSERT INTO activity_logs (id, company_id, action_key, module_key, details, actor, actor_user_id, metadata_json, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW())`,
        [
          uuidv4(),
          companyId,
          'SESSION_OUTCOME_APPLIED',
          'sessions',
          `تسجيل نتيجة الجلسة: ${result}`,
          req.auth!.username,
          userId,
          JSON.stringify({ outcomeId, sessionId, caseId, result, analysis: analysis.summary, nextSessionId })
        ]
      )

      await client.query('COMMIT')

      res.status(201).json({
        success: true,
        outcomeId,
        sessionId,
        caseId,
        nextSessionId,
        analysis
      })
    } catch (err) {
      await client.query('ROLLBACK')
      console.error('[SESSION_OUTCOMES] apply error:', err)
      res.status(500).json({ error: 'فشل في تطبيق نتيجة الجلسة' })
    } finally {
      client.release()
    }
  }
)

// POST /api/session-outcomes/preview — preview analysis without saving
sessionOutcomesRouter.post(
  '/preview',
  requirePermission('edit_sessions'),
  async (req: Request, res: Response) => {
    try {
      const { result, judgmentData, caseType, notes } = req.body
      if (!result) {
        res.status(400).json({ error: 'النتيجة مطلوبة' })
        return
      }

      const analysisInput: any = { result }
      if (judgmentData) {
        analysisInput.judgmentType = judgmentData.judgment_type
        analysisInput.judgmentNumber = judgmentData.judgment_number
        analysisInput.judgmentDate = judgmentData.judgment_date
        analysisInput.serviceDate = judgmentData.service_date
        analysisInput.isForClient = judgmentData.is_for_client
        analysisInput.hasAppealGrounds = judgmentData.has_appeal_grounds
        analysisInput.needsExecution = judgmentData.needs_execution
      }
      analysisInput.caseType = caseType || detectCaseType(notes)
      analysisInput.notes = notes

      const analysis = analyzeJudgment(analysisInput)
      res.json({ analysis })
    } catch (err) {
      console.error('[SESSION_OUTCOMES] preview error:', err)
      res.status(500).json({ error: 'فشل في معاينة نتيجة الجلسة' })
    }
  }
)

// GET /api/session-outcomes/client-report/:sessionId — fetch canonical client session report
sessionOutcomesRouter.get(
  '/client-report/:sessionId',
  requirePermission('view_sessions'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { sessionId } = req.params
      const report = await buildClientSessionReport(sessionId, companyId)
      res.json({ data: report })
    } catch (err: any) {
      console.error('[SESSION_OUTCOMES] getClientReport error:', err)
      res.status(500).json({ error: err.message || 'فشل في جلب تقرير جلسة العميل' })
    }
  }
)

// PUT /api/session-outcomes/client-report/:sessionId — save lawyer edits
sessionOutcomesRouter.put(
  '/client-report/:sessionId',
  requirePermission('edit_sessions'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { sessionId } = req.params
      const { clientSummary, lawyerNoteAndNextStep, internalNotes, caseId, clientId } = req.body

      await saveClientSessionReportEdits(sessionId, companyId, {
        clientSummary,
        lawyerNoteAndNextStep,
        internalNotes,
        caseId,
        clientId
      })

      const report = await buildClientSessionReport(sessionId, companyId)
      res.json({ success: true, data: report })
    } catch (err: any) {
      console.error('[SESSION_OUTCOMES] updateClientReport error:', err)
      res.status(500).json({ error: err.message || 'فشل في حفظ تعديلات التقرير' })
    }
  }
)

// POST /api/session-outcomes/client-report/:sessionId/transition — transition report state
sessionOutcomesRouter.post(
  '/client-report/:sessionId/transition',
  requirePermission('edit_sessions'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const userId = req.auth!.userId
      const { sessionId } = req.params
      const { toStatus, sentVia } = req.body

      if (!['draft', 'reviewed', 'approved', 'sent'].includes(toStatus)) {
        res.status(400).json({ error: 'حالة الاعتماد غير صالحة' })
        return
      }

      await transitionReportStatus(sessionId, companyId, {
        toStatus,
        sentVia,
        userId
      })

      const report = await buildClientSessionReport(sessionId, companyId)
      res.json({ success: true, data: report })
    } catch (err: any) {
      console.error('[SESSION_OUTCOMES] transitionReportStatus error:', err)
      res.status(500).json({ error: err.message || 'فشل في تحديث حالة اعتماد التقرير' })
    }
  }
)

// GET /api/session-outcomes/client-report/:sessionId/html — render executive A4 HTML
sessionOutcomesRouter.get(
  '/client-report/:sessionId/html',
  requirePermission('view_sessions'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { sessionId } = req.params
      const report = await buildClientSessionReport(sessionId, companyId)

      // Fetch firm data
      const firmRows = await query('SELECT key, value FROM firm_data WHERE company_id = $1', [companyId])
      const firmData: Record<string, string> = {}
      for (const r of firmRows.rows) {
        firmData[r.key] = r.value
      }

      const html = renderClientSessionReportHtml(report, {
        name: firmData.firm_name || firmData.name,
        phone: firmData.firm_phone || firmData.phone,
        address: firmData.firm_address || firmData.address
      })

      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.send(html)
    } catch (err: any) {
      console.error('[SESSION_OUTCOMES] renderClientReportHtml error:', err)
      res.status(500).send(`<h3>تعذر توليد تقرير الجلسة: ${escape(err.message)}</h3>`)
    }
  }
)

