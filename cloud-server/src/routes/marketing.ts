import { Router } from 'express'
import { sendMarketingReport } from '../services/marketing.service'

export const marketingRouter = Router()

marketingRouter.post('/marketing/report', async (_req, res) => {
  try {
    await sendMarketingReport()
    res.json({ success: true, message: 'Marketing report sent to admin email.' })
  } catch (err) {
    console.error('[MARKETING] Report trigger error:', err)
    res.status(500).json({ error: 'Failed to send marketing report' })
  }
})
