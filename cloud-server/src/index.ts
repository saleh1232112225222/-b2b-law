import express from 'express'
import cors from 'cors'
import { healthCheck } from './db/connection'
import { authRouter } from './routes/auth'

// Patch Express 4 to catch async errors — acts like express-async-errors
try {
  const Layer = require('express/lib/router').Layer
  const originalHandle = Layer.prototype.handle_request
  if (originalHandle) {
    Layer.prototype.handle_request = function (this: any, req: any, res: any, next: any) {
      const result = originalHandle.call(this, req, res, next)
      if (result && typeof result.catch === 'function') {
        result.catch(next)
      }
      return result
    }
  }
} catch (e) {
  console.warn('[Express async error patch] Failed to apply:', e)
}
import { createEntityRouter } from './routes/entity'
import { reportsRouter } from './routes/reports'
import { systemRouter } from './routes/system'
import { agenciesRouter } from './routes/agencies'
import { enforcementRequestsRouter } from './routes/enforcement_requests'
import { usersRouter } from './routes/users'
import { casesRouter } from './routes/cases'
import { contractsRouter } from './routes/contracts'
import { runExtraMigrations } from './db/migrate_extra'

const app = express()
const PORT = parseInt(process.env.PORT || '8080', 10)

app.use(cors({ origin: '*', credentials: true }))
app.use(express.json({ limit: '10mb' }))
// Catch JSON parse errors so they don't bubble to the generic handler
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    console.error('[JSON_PARSE_ERROR]', err.message)
    res.status(400).json({ error: 'Invalid JSON in request body' })
    return
  }
  next(err)
})

app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    const statusSymbol = res.statusCode >= 200 && res.statusCode < 400 ? '✅' : '❌'
    console.log(
      `[USER_ACTION] ${statusSymbol} ${req.method} ${req.originalUrl} - Status: ${res.statusCode} (${duration}ms)`
    )
  })
  next()
})

app.get('/health', async (_req, res) => {
  const dbOk = await healthCheck()
  res.json({ status: dbOk ? 'ok' : 'degraded', database: dbOk ? 'connected' : 'error' })
})

app.use('/api/auth', authRouter)
app.use('/api/enforcement/requests', enforcementRequestsRouter)
app.use('/api/agencies', agenciesRouter)
app.use('/api/users', usersRouter)
app.use('/api/cases', casesRouter)
app.use('/api/contracts', contractsRouter)

const entityTables = [
  { name: 'clients', table: 'clients', searchFields: ['name', 'id_number', 'phone', 'email'] },
  { name: 'defendants', table: 'defendants', searchFields: ['name', 'id_number', 'phone'] },
  { name: 'cases', table: 'cases', searchFields: ['case_number', 'subject', 'court'] },
  { name: 'sessions', table: 'sessions' },
  { name: 'tasks', table: 'tasks_v2' },
  { name: 'evidence', table: 'evidence' },
  { name: 'judgments', table: 'judgments' },
  { name: 'memoranda', table: 'memoranda' },
  { name: 'contracts', table: 'contracts' },
  { name: 'documents', table: 'documents_v2' },
  { name: 'finances', table: 'finances' },
  { name: 'employees', table: 'employees' },
  { name: 'users', table: 'users' },
  { name: 'agencies', table: 'agencies' },
  { name: 'invoices', table: 'invoices' },
  { name: 'vouchers', table: 'vouchers' },
  { name: 'credit-notes', table: 'credit_notes' },
  { name: 'experts', table: 'experts' },
  { name: 'communications', table: 'communications' },
  { name: 'firm', table: 'firm_data' },
  { name: 'accounts', table: 'accounts' },
  { name: 'receivables', table: 'receivables' },
  { name: 'activity-logs', table: 'activity_logs' },
  { name: 'permissions', table: 'permissions' },
  { name: 'enforcement', table: 'enforcement_files' },
  { name: 'collections', table: 'collections_claims' },
  { name: 'session-outcomes', table: 'session_outcomes' },
  { name: 'analytics', table: '' }
]

for (const entity of entityTables) {
  if (entity.name === 'analytics') continue
  if (entity.name === 'permissions') continue
  if (entity.name === 'cases') continue
  if (entity.name === 'contracts') continue
  app.use(`/api/${entity.name}`, createEntityRouter(entity))
}

app.use('/api/reports', reportsRouter)
app.use('/api', systemRouter)

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err)
  res
    .status(500)
    .json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message })
})

import * as fs from 'fs'
import { runMigrations } from './db/connection'

async function autoMigrate() {
  try {
    await runMigrations()
  } catch {
    console.warn('[DB] Migration skipped (tables likely already exist)')
  }
}

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`B2B-LAW Cloud Server running on port ${PORT}`)
  console.log(`Health check: http://0.0.0.0:${PORT}/health`)
  await autoMigrate()
})

export default app
