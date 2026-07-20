import { Router, Request, Response } from 'express'
import { sendMarketingReport } from '../services/marketing.service'
import { authMiddleware } from '../middleware/auth'

export const marketingRouter = Router()

marketingRouter.post('/marketing/report', authMiddleware, async (_req: Request, res: Response) => {
  // Restricted to platform admin only
  if (_req.auth?.companyId !== (process.env.SUPERADMIN_COMPANY_ID || '00000000-0000-0000-0000-000000000000') || _req.auth?.roleKey !== 'admin') {
    return res.status(403).json({ error: 'الوصول مخصص لمسؤول النظام فقط' })
  }
  try {
    await sendMarketingReport()
    res.json({ success: true, message: 'Marketing report sent to admin email.' })
  } catch (err) {
    console.error('[MARKETING] Report trigger error:', err)
    res.status(500).json({ error: 'فشل في إرسال تقرير التسويق' })
  }
})
