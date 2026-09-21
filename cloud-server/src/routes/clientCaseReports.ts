import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import {
  buildClientCaseReport,
  saveClientCaseReportEdits,
  transitionClientCaseReportStatus,
  renderClientCaseReportHtml
} from '../services/clientCaseReportService'
import { query } from '../db/connection'

function getCompanyId(req: Request): string {
  return req.auth!.companyId
}

export const clientCaseReportsRouter = Router()
clientCaseReportsRouter.use(authMiddleware)

// GET /api/client-case-reports/:caseId — fetch canonical client case report
clientCaseReportsRouter.get(
  '/:caseId',
  requirePermission('view_cases'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { caseId } = req.params
      const report = await buildClientCaseReport(caseId, companyId)
      res.json({ data: report })
    } catch (err: any) {
      console.error('[CLIENT_CASE_REPORTS] getClientCaseReport error:', err)
      res.status(500).json({ error: err.message || 'فشل في جلب تقرير العميل للقضية' })
    }
  }
)

// PUT /api/client-case-reports/:caseId — save lawyer edits & metadata
clientCaseReportsRouter.put(
  '/:caseId',
  requirePermission('edit_cases'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { caseId } = req.params
      const {
        clientSummary,
        lawyerNoteAndNextStep,
        internalNotes,
        clientId,
        showSubjectInReport,
        shortSubject,
        proceedings,
        casePosition,
        actionItems,
        metadataJson
      } = req.body

      await saveClientCaseReportEdits(caseId, companyId, {
        clientSummary,
        lawyerNoteAndNextStep,
        internalNotes,
        clientId,
        showSubjectInReport,
        shortSubject,
        proceedings,
        casePosition,
        actionItems,
        metadataJson
      })

      const report = await buildClientCaseReport(caseId, companyId)
      res.json({ success: true, data: report })
    } catch (err: any) {
      console.error('[CLIENT_CASE_REPORTS] updateClientCaseReport error:', err)
      res.status(500).json({ error: err.message || 'فشل في حفظ تعديلات تقرير العميل' })
    }
  }
)

// POST /api/client-case-reports/:caseId/transition — transition dispatch status
clientCaseReportsRouter.post(
  '/:caseId/transition',
  requirePermission('edit_cases'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const userId = req.auth!.userId
      const { caseId } = req.params
      const { toStatus, sentVia } = req.body

      if (!['draft', 'reviewed', 'approved', 'sent'].includes(toStatus)) {
        res.status(400).json({ error: 'حالة الاعتماد غير صالحة' })
        return
      }

      await transitionClientCaseReportStatus(caseId, companyId, {
        toStatus,
        sentVia,
        userId
      })

      const report = await buildClientCaseReport(caseId, companyId)
      res.json({ success: true, data: report })
    } catch (err: any) {
      console.error('[CLIENT_CASE_REPORTS] transition error:', err)
      res.status(500).json({ error: err.message || 'فشل في تحديث حالة اعتماد تقرير العميل' })
    }
  }
)

// GET /api/client-case-reports/:caseId/html — render executive A4 HTML
clientCaseReportsRouter.get(
  '/:caseId/html',
  requirePermission('view_cases'),
  async (req: Request, res: Response) => {
    try {
      const companyId = getCompanyId(req)
      const { caseId } = req.params
      const report = await buildClientCaseReport(caseId, companyId)

      const firmRows = await query('SELECT key, value FROM firm_data WHERE company_id = $1', [companyId])
      const firmData: Record<string, string> = {}
      for (const r of firmRows.rows) {
        firmData[r.key] = r.value
      }

      const html = renderClientCaseReportHtml(report, {
        name: firmData.firm_name || firmData.name,
        phone: firmData.phone,
        address: firmData.address,
        logo: firmData.logo
      })

      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.send(html)
    } catch (err: any) {
      console.error('[CLIENT_CASE_REPORTS] getHtml error:', err)
      res.status(500).json({ error: err.message || 'فشل في توليد صفحة الطباعة لتقرير العميل' })
    }
  }
)
