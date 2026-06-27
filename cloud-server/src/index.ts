// Load .env FIRST before any imports that depend on process.env
import * as _fs from 'fs'
import * as _path from 'path'
try {
  const envPath = _path.resolve(process.cwd(), '.env')
  if (_fs.existsSync(envPath)) {
    _fs
      .readFileSync(envPath, 'utf8')
      .split('\n')
      .forEach((line: string) => {
        const parts = line.split('=')
        if (parts.length >= 2) {
          const key = parts[0].trim()
          const value = parts
            .slice(1)
            .join('=')
            .trim()
            .replace(/^['"]|['"]$/g, '')
          if (key && value && !process.env[key]) {
            process.env[key] = value
          }
        }
      })
    console.log('[ENV] Loaded .env file')
  }
} catch (e) {
  console.warn('[ENV] Failed to load .env:', e)
}

import express from 'express'
import cors from 'cors'
import { healthCheck, query } from './db/connection'
import { authRouter } from './routes/auth'
import { debugRouter } from './routes/debug'

// Patch Express Router Layer to catch async errors
try {
  const Layer = require('express/lib/router/layer')
  if (Layer && Layer.prototype && typeof Layer.prototype.handle_request === 'function') {
    const originalHandle = Layer.prototype.handle_request
    Layer.prototype.handle_request = function (this: any, req: any, res: any, next: any) {
      const result = originalHandle.call(this, req, res, next)
      if (result && typeof result.catch === 'function') {
        result.catch(next)
      }
      return result
    }
    console.log('[Express async error patch] Applied successfully')
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
import { subscriberTrackingRouter } from './routes/subscriberTracking'
import { sessionsRouter } from './routes/sessions'
import legalServicesRouter from './routes/legal_services'
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
    if (res.statusCode >= 400 || duration > 2000) {
      console.log(`[REQUEST] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`)
    }
  })
  next()
})

app.get('/health', async (_req, res) => {
  const dbOk = await healthCheck()
  res.json({ status: dbOk ? 'ok' : 'degraded', database: dbOk ? 'connected' : 'error' })
})

// Auto-create user tracking tables on startup
async function initTrackingTables() {
  try {
    await query(`CREATE TABLE IF NOT EXISTS user_login_logs (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      login_time TIMESTAMPTZ DEFAULT NOW(),
      logout_time TIMESTAMPTZ,
      ip_address TEXT,
      user_agent TEXT,
      device_info TEXT,
      browser_info TEXT,
      is_successful BOOLEAN DEFAULT TRUE,
      failure_reason TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`)
    await query(`CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON user_login_logs(user_id)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_login_logs_company_id ON user_login_logs(company_id)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_login_logs_created_at ON user_login_logs(created_at DESC)`)

    await query(`CREATE TABLE IF NOT EXISTS user_activity_logs (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      activity_type TEXT NOT NULL,
      activity_description TEXT,
      entity_type TEXT,
      entity_id UUID,
      ip_address TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`)
    await query(`CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON user_activity_logs(user_id)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_activity_logs_company_id ON user_activity_logs(company_id)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON user_activity_logs(created_at DESC)`)
    await query(`CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON user_activity_logs(activity_type)`)
    console.log('[TRACKING] User tracking tables ready')
  } catch (err) {
    console.error('[TRACKING] Failed to create tracking tables:', err)
  }
}
initTrackingTables()

app.use('/api/auth', authRouter)
app.use('/api/enforcement/requests', enforcementRequestsRouter)
app.use('/api/agencies', agenciesRouter)
app.use('/api/users', usersRouter)
app.use('/api/cases', casesRouter)
app.use('/api/contracts', contractsRouter)
app.use('/api/session-outcomes', sessionOutcomesRouter)
app.use('/api/tasks', tasksRouter)
app.use('/api/sessions', sessionsRouter)
app.use('/api/subscriptions', subscriptionRouter)
app.use('/api/admin/subscriptions', adminSubscriptionRouter)
app.use('/api/admin/subscriber-tracking', subscriberTrackingRouter)
app.use('/api', marketingRouter)
app.use('/api/debug', debugRouter)
app.use('/api/legal-services', legalServicesRouter)

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
  if (entity.name === 'sessions') continue

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
  } else if (
    ['finances', 'invoices', 'vouchers', 'receivables', 'credit-notes'].includes(entity.name)
  ) {
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
  } else if (entity.name === 'legal-services') {
    readPermission = 'view_legal_services'
    writePermission = 'manage_legal_services'
  } else if (entity.name === 'legal-engagements') {
    readPermission = 'view_legal_services'
    writePermission = 'create_legal_engagements'
  }

  const entityRouter = createEntityRouter(entity)

  if (readPermission || writePermission) {
    const { requirePermission } = require('./middleware/permission')
    const { authMiddleware } = require('./middleware/auth')
    app.use(
      `/api/${entity.name}`,
      authMiddleware,
      (req: any, res: any, next: any) => {
        const isRead = req.method === 'GET'
        const perm = isRead ? readPermission : writePermission || readPermission
        if (perm) {
          requirePermission(perm)(req, res, next)
        } else {
          next()
        }
      },
      entityRouter
    )
  } else {
    const { authMiddleware } = require('./middleware/auth')
    app.use(`/api/${entity.name}`, authMiddleware, entityRouter)
  }
}

app.get(
  '/api/permissions',
  require('./middleware/auth').authMiddleware,
  async (req: any, res: any) => {
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
  }
)

app.use('/api/reports', reportsRouter)
app.use('/api', systemRouter)

// Briefing summary endpoint for BriefingDashboard
app.get(
  '/api/briefing/summary',
  require('./middleware/auth').authMiddleware,
  async (req: any, res: any) => {
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
  }
)

// Activity logs DELETE endpoint
app.delete(
  '/api/activity-logs',
  require('./middleware/auth').authMiddleware,
  async (req: any, res: any) => {
    try {
      const { getCompanyId } = require('./middleware/tenant')
      const { query: dbQuery } = require('./db/connection')
      const companyId = getCompanyId(req)
      const { before } = req.query
      if (!before) {
        res.status(400).json({ error: 'before date required' })
        return
      }
      await dbQuery('DELETE FROM activity_logs WHERE company_id = $1 AND timestamp < $2', [
        companyId,
        before
      ])
      res.json({ success: true })
    } catch (err) {
      console.error('[ACTIVITY_LOGS] Delete error:', err)
      res.status(500).json({ error: 'Failed to delete activity logs' })
    }
  }
)

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

    const ADMIN_HASH = '$2a$12$phlOfNeLBHtvuP0rt.sTl.uVGOLP2LAEENAvE64HEyCklPyV4gXjm'

    if (adminCheck.rows.length === 0) {
      // Create the seeded owner admin with the configured bootstrap hash.
      await dbQuery(
        `INSERT INTO users (id, company_id, username, full_name, password_hash, role_key, is_active, must_change_password, recovery_email, created_at)
         VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'admin', 'مدير النظام العام', '${ADMIN_HASH}', 'admin', TRUE, FALSE, 'slaehmap@gmail.com', NOW())`,
        []
      )
      console.log('[SEED] Super Admin user created in owner company')
    }

    // Always sync/re-sync the super admin's password hash
    await dbQuery(
      `UPDATE users SET password_hash = '${ADMIN_HASH}', recovery_email = 'slaehmap@gmail.com', is_active = TRUE, must_change_password = FALSE WHERE username = 'admin' AND company_id = '00000000-0000-0000-0000-000000000000'`,
      []
    )
    console.log('[SEED] Super Admin password hash synced')
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
  try {
    await runExtraMigrations()
  } catch {
    console.warn('[DB] Extra migrations skipped')
  }
}

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`B2B-LAW Cloud Server running on port ${PORT}`)
  console.log(`Health check: http://0.0.0.0:${PORT}/health`)

  // Run migrations BEFORE accepting traffic
  try {
    await autoMigrate()
    await seedSuperAdmin()
    console.log('[DB] Startup tasks completed')
  } catch (err) {
    console.error('[DB] Startup tasks failed:', err)
  }

  // Marketing report once daily at 7 AM Saudi time
  let lastReportDate = ''
  setInterval(() => {
    const saudiHour = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Riyadh',
      hour: 'numeric',
      hour12: false
    })
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' })
    if (saudiHour === '7' && lastReportDate !== today) {
      lastReportDate = today
      sendMarketingReport().catch((e) => console.error('[MARKETING] Daily report error:', e))
    }
  }, 60_000)
  setTimeout(() => {
    lastReportDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' })
    sendMarketingReport().catch((e) => console.error('[MARKETING] Startup report error:', e))
  }, 30_000)
})

export default app
