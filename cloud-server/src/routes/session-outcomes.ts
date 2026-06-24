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
      res.status(500).json({ error: 'Failed to fetch session outcomes' })
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
      const { sessionId, result, notes, judgmentData, dismissalDecision, serviceData, caseType } =
        req.body

      if (!sessionId || !result) {
        res.status(400).json({ error: 'sessionId and result are required' })
        return
      }

      await client.query('BEGIN')

      // 1. Get case_id from session
      const sessionRes = await client.query(
        'SELECT case_id, company_id FROM sessions WHERE id = $1',
        [sessionId]
      )
      if (sessionRes.rows.length === 0) {
        await client.query('ROLLBACK')
        res.status(404).json({ error: 'Session not found' })
        return
      }
      if (sessionRes.rows[0].company_id !== companyId) {
        await client.query('ROLLBACK')
        res.status(403).json({ error: 'Forbidden' })
        return
      }
      const caseId = sessionRes.rows[0].case_id

      // 2. Create the outcome record
      const outcomeId = uuidv4()
      await client.query(
        `INSERT INTO session_outcomes (id, company_id, session_id, case_id, result, notes, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [outcomeId, companyId, sessionId, caseId, result, notes || null, userId]
      )

      // 3. Update the session status
      await client.query(
        "UPDATE sessions SET status = 'منتهية', notes = COALESCE($1, notes), updated_at = NOW() WHERE id = $2",
        [notes || null, sessionId]
      )

      // 4. Run smart analysis
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

      // 5. Save generated tasks
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
        [notes || '', analysis.summary, outcomeId]
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
          JSON.stringify({ outcomeId, sessionId, caseId, result, analysis: analysis.summary })
        ]
      )

      await client.query('COMMIT')

      res.status(201).json({
        success: true,
        outcomeId,
        sessionId,
        caseId,
        analysis
      })
    } catch (err) {
      await client.query('ROLLBACK')
      console.error('[SESSION_OUTCOMES] apply error:', err)
      res.status(500).json({ error: 'Failed to apply session outcome' })
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
        res.status(400).json({ error: 'result is required' })
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
      res.status(500).json({ error: 'Failed to preview session outcome' })
    }
  }
)
