import express from 'express'
import cors from 'cors'
import { healthCheck, query } from './db/connection'
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
import { sessionOutcomesRouter } from './routes/session-outcomes'
import { tasksRouter } from './routes/tasks'
import { marketingRouter } from './routes/marketing'
import { subscriptionRouter } from './routes/subscriptions'
import { adminSubscriptionRouter } from './routes/adminSubscriptions'
import { sendMarketingReport } from './services/marketing.service'
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
app.use('/api/session-outcomes', sessionOutcomesRouter)
app.use('/api/tasks', tasksRouter)
app.use('/api/subscriptions', subscriptionRouter)
app.use('/api/admin/subscriptions', adminSubscriptionRouter)
app.use('/api', marketingRouter)



const entityTables = [
  { name: 'clients', table: 'clients', searchFields: ['name', 'id_number', 'phone', 'email'] },
  { name: 'defendants', table: 'defendants', searchFields: ['name', 'id_number', 'phone'] },
  { name: 'cases', table: 'cases', searchFields: ['case_number', 'subject', 'court'] },
  { name: 'sessions', table: 'sessions' },
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

  { name: 'analytics', table: '' }
]

for (const entity of entityTables) {
  if (entity.name === 'analytics') continue
  if (entity.name === 'permissions') continue
  if (entity.name === 'cases') continue
  if (entity.name === 'contracts') continue

  let readPermission = ''
  let writePermission = ''

  if (entity.name === 'clients') {
    readPermission = 'view_clients'
    writePermission = 'create_clients'
  } else if (entity.name === 'defendants') {
    readPermission = 'view_defendants'
    writePermission = 'create_defendants'
  } else if (entity.name === 'employees') {
    readPermission = 'view_employees'
    writePermission = 'view_employees'
  } else if (['finances', 'invoices', 'vouchers', 'receivables', 'credit-notes'].includes(entity.name)) {
    readPermission = 'view_finances'
    writePermission = 'create_finances'
  } else if (['firm', 'accounts'].includes(entity.name)) {
    readPermission = 'manage_settings'
    writePermission = 'manage_settings'
  } else if (entity.name === 'activity-logs') {
    readPermission = 'view_activity_logs'
    writePermission = 'view_activity_logs'
  } else if (entity.name === 'sessions') {
    readPermission = 'view_sessions'
    writePermission = 'edit_sessions'
  } else if (entity.name === 'documents') {
    readPermission = 'view_documents'
    writePermission = 'create_documents'
  } else if (entity.name === 'evidence') {
    readPermission = 'view_cases'
    writePermission = 'edit_cases'
  } else if (entity.name === 'judgments') {
    readPermission = 'view_cases'
    writePermission = 'edit_cases'
  } else if (entity.name === 'memoranda') {
    readPermission = 'view_cases'
    writePermission = 'edit_cases'
  } else if (entity.name === 'experts') {
    readPermission = 'view_cases'
    writePermission = 'edit_cases'
  } else if (entity.name === 'communications') {
    readPermission = 'view_clients'
    writePermission = 'create_cases'
  } else if (entity.name === 'collections') {
    readPermission = 'view_finances'
    writePermission = 'create_finances'
  }

  const entityRouter = createEntityRouter(entity)

  if (readPermission || writePermission) {
    const { requirePermission } = require('./middleware/permission')
    app.use(`/api/${entity.name}`, (req: any, res: any, next: any) => {
      const isRead = req.method === 'GET'
      const perm = isRead ? readPermission : (writePermission || readPermission)
      if (perm) {
        requirePermission(perm)(req, res, next)
      } else {
        next()
      }
    }, entityRouter)
  } else {
    app.use(`/api/${entity.name}`, entityRouter)
  }
}

app.get('/api/permissions', require('./middleware/auth').authMiddleware, async (req: any, res: any) => {
  try {
    const { getCompanyId } = require('./middleware/tenant')
    const companyId = getCompanyId(req)
    const { ensureDefaultPermissions } = require('./middleware/permission')
    
    await ensureDefaultPermissions(companyId)

    const result = await query('SELECT * FROM permissions WHERE company_id = $1', [companyId])
    res.json(result.rows)
  } catch (err: any) {
    console.error('Failed to get permissions:', err)
    res.status(500).json({ error: 'Failed to retrieve permissions' })
  }
})

app.use('/api/reports', reportsRouter)
app.use('/api', systemRouter)

// Briefing summary endpoint for BriefingDashboard
app.get('/api/briefing/summary', require('./middleware/auth').authMiddleware, async (req: any, res: any) => {
  try {
    const { getCompanyId } = require('./middleware/tenant')
    const { query: dbQuery } = require('./db/connection')
    const companyId = getCompanyId(req)
    const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD

    // Today sessions: sessions scheduled for today (regardless of status)
    const todaySessionsRes = await dbQuery(
      `SELECT s.*, c.case_number, c.id as case_id, cl.name as client_name
       FROM sessions s
       LEFT JOIN cases c ON c.id = s.case_id
       LEFT JOIN clients cl ON cl.id = c.client_id
       WHERE s.company_id = $1 AND s.date = $2
       ORDER BY s.time ASC`,
      [companyId, today]
    )

    // Action required: past sessions that are not closed (overdue)
    const actionRequiredRes = await dbQuery(
      `SELECT s.*, c.case_number, c.id as case_id, cl.name as client_name
       FROM sessions s
       LEFT JOIN cases c ON c.id = s.case_id
       LEFT JOIN clients cl ON cl.id = c.client_id
       WHERE s.company_id = $1 AND s.date < $2 AND s.status NOT IN ('منتهية', 'ملغية', 'مؤجلة')
       ORDER BY s.date DESC LIMIT 30`,
      [companyId, today]
    )

    // Urgent tasks: tasks due today or overdue
    const urgentTasksRes = await dbQuery(
      `SELECT t.*, c.case_number
       FROM tasks_v2 t
       LEFT JOIN cases c ON c.id = t.case_id
       WHERE t.company_id = $1 AND t.status NOT IN ('completed', 'closed', 'cancelled')
         AND (t.due_date <= $2 OR t.due_date IS NULL)
       ORDER BY t.due_date ASC LIMIT 20`,
      [companyId, today]
    )

    // Active objections: judgments with appeal deadlines
    const objectionsRes = await dbQuery(
      `SELECT j.*, c.case_number, c.id as case_id
       FROM judgments j
       LEFT JOIN cases c ON c.id = j.case_id
       WHERE j.company_id = $1 AND j.objection_deadline IS NOT NULL AND j.objection_deadline >= $2
       ORDER BY j.objection_deadline ASC LIMIT 20`,
      [companyId, today]
    )

    // Awaiting enforcement: enforcement files with pending status
    const enforcementRes = await dbQuery(
      `SELECT ef.*, c.case_number
       FROM enforcement_files ef
       LEFT JOIN cases c ON c.id = ef.case_id
       WHERE ef.company_id = $1 AND ef.status NOT IN ('completed', 'closed', 'cancelled')
       ORDER BY ef.created_at DESC LIMIT 20`,
      [companyId]
    ).catch(() => ({ rows: [] }))

    res.json({
      todaySessions: todaySessionsRes.rows,
      actionRequired: actionRequiredRes.rows,
      urgentTasks: urgentTasksRes.rows,
      activeObjections: objectionsRes.rows,
      awaitingEnforcement: enforcementRes.rows
    })
  } catch (err) {
    console.error('[BRIEFING] Summary error:', err)
    res.status(500).json({ error: 'Failed to get briefing summary' })
  }
})

// Activity logs DELETE endpoint
app.delete('/api/activity-logs', require('./middleware/auth').authMiddleware, async (req: any, res: any) => {
  try {
    const { getCompanyId } = require('./middleware/tenant')
    const { query: dbQuery } = require('./db/connection')
    const companyId = getCompanyId(req)
    const { before } = req.query
    if (!before) {
      res.status(400).json({ error: 'before date required' })
      return
    }
    await dbQuery(
      'DELETE FROM activity_logs WHERE company_id = $1 AND timestamp < $2',
      [companyId, before]
    )
    res.json({ success: true })
  } catch (err) {
    console.error('[ACTIVITY_LOGS] Delete error:', err)
    res.status(500).json({ error: 'Failed to delete activity logs' })
  }
})

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err)
  res
    .status(500)
    .json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message })
})

import * as fs from 'fs'
import { runMigrations, query as dbQuery } from './db/connection'

async function seedSuperAdmin() {
  try {
    // 1. Ensure the Super Admin company exists
    await dbQuery(
      `INSERT INTO companies (id, name, email, is_verified, trial_expires_at)
       VALUES ('00000000-0000-0000-0000-000000000000', 'الشركة المالكة للنظام', 'owner@b2blaw.local', TRUE, '2099-12-31 23:59:59+03')
       ON CONFLICT (id) DO NOTHING`,
      []
    )

    // 2. Check if admin user exists in the Super Admin company
    const adminCheck = await dbQuery(
      `SELECT id FROM users WHERE username = $1 AND company_id = $2`,
      ['admin', '00000000-0000-0000-0000-000000000000']
    )

    if (adminCheck.rows.length === 0) {
      // Create the seeded owner admin with the configured bootstrap hash.
      // Password hash: '$2a$12$mr2bHXoL1L0ktHjB57xJfu0mXBFKmRoBBEMAmU7xtMmL9JL.YxxYK'
      await dbQuery(
        `INSERT INTO users (id, company_id, username, full_name, password_hash, role_key, is_active, must_change_password, recovery_email, created_at)
         VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'admin', 'مدير النظام العام', '$2a$12$mr2bHXoL1L0ktHjB57xJfu0mXBFKmRoBBEMAmU7xtMmL9JL.YxxYK', 'admin', TRUE, TRUE, 'slaehmap@gmail.com', NOW())`,
        []
      )
      console.log('[SEED] Super Admin user created')
    } else {
      console.log('[SEED] Super Admin user already exists')
    }
  } catch (err) {
    console.error('[SEED] Failed to seed super admin:', err)
  }
}

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
  await seedSuperAdmin()

  // Marketing report once daily at 7 AM Saudi time
  let lastReportDate = ''
  setInterval(() => {
    const saudiHour = new Date().toLocaleString('en-US', { timeZone: 'Asia/Riyadh', hour: 'numeric', hour12: false })
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' })
    if (saudiHour === '7' && lastReportDate !== today) {
      lastReportDate = today
      sendMarketingReport().catch(e => console.error('[MARKETING] Daily report error:', e))
    }
  }, 60_000) // check every minute
  // Also send one on startup (after 30s delay)
  setTimeout(() => {
    lastReportDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' })
    sendMarketingReport().catch(e => console.error('[MARKETING] Startup report error:', e))
  }, 30_000)
})

export default app
