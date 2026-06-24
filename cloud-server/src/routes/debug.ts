import { Router, Request, Response } from 'express'
import { query } from '../db/connection'

export const debugRouter = Router()

// Extend trial expiration for all companies by 1 year (development helper)
debugRouter.post('/extend-trial', async (req: Request, res: Response) => {
  try {
    await query(
      `
      UPDATE companies
      SET trial_expires_at = NOW() + INTERVAL '365 days'
    `,
      []
    )
    res.json({ success: true, message: 'Trial dates extended by 1 year for all companies.' })
  } catch (err) {
    console.error('[DEBUG] Extend trial error:', err)
    res.status(500).json({ error: 'Failed to extend trial dates' })
  }
})
