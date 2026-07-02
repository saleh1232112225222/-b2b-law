import { Router } from 'express'

export const debugRouter = Router()

// Security: debug routes removed — see security-audit.md C-01
debugRouter.all('*', (_req, res) => {
  res.status(404).json({ error: 'Not found' })
})
