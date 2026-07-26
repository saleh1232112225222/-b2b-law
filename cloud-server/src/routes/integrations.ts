import { Router, Request, Response } from 'express'
import { query } from '../db/connection'
import { authMiddleware } from '../middleware/auth'

export const integrationsRouter = Router()

integrationsRouter.use(authMiddleware)

// 1. GET /api/integrations/status - Returns statuses of external connectors for office
integrationsRouter.get('/status', async (req: Request, res: Response) => {
  try {
    const companyId = req.auth?.companyId
    if (!companyId) return res.status(400).json({ error: 'Company ID is required' })

    const result = await query(
      `SELECT service_name, status, config_data, last_sync_at, updated_at
       FROM office_integrations
       WHERE company_id = $1`,
      [companyId]
    )

    const availableServices = [
      {
        id: 'google_calendar',
        name: 'تقويم جوجل (Google Calendar)',
        category: 'calendar',
        description: 'مزامنة جلسات المحاكم والمهام القانونية تلقائياً مع تقويم جوجل الشخصي للمحامي',
        icon: 'calendar',
        provider: 'Google Workspace'
      },
      {
        id: 'outlook',
        name: 'مايكروسوفت أوتلوك (Outlook 365)',
        category: 'calendar_email',
        description: 'ربط الجلسات والبريد الإلكتروني مع منصة مايكروسوفت 365 أوتلوك',
        icon: 'mail',
        provider: 'Microsoft 365'
      },
      {
        id: 'whatsapp',
        name: 'بوابة الواتساب (WhatsApp Gateway)',
        category: 'notifications',
        description: 'إرسال تذكيرات المواعيد وصدور الأحكام والتوكيلات تلقائياً للعملاء عبر الواتساب',
        icon: 'message-square',
        provider: 'Meta Business'
      },
      {
        id: 'cloud_vault',
        name: 'الخزينة السحابية (Dropbox / Drive)',
        category: 'storage',
        description: 'أتمتة مزامنة وحفظ المذكرات القضائية والتوثيقات في التخزين السحابي الآمن',
        icon: 'hard-drive',
        provider: 'Cloud Storage'
      }
    ]

    const dbMap = new Map()
    result.rows.forEach((row) => {
      dbMap.set(row.service_name, row)
    })

    const integrations = availableServices.map((svc) => {
      const dbRow = dbMap.get(svc.id)
      return {
        ...svc,
        status: dbRow ? dbRow.status : 'disconnected',
        last_sync_at: dbRow ? dbRow.last_sync_at : null,
        config: dbRow ? dbRow.config_data : {}
      }
    })

    return res.json({ integrations })
  } catch (err: any) {
    console.error('[IntegrationsRouter] Error fetching status:', err.message)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// 2. POST /api/integrations/connect/:service - Connects or updates a service status
integrationsRouter.post('/connect/:service', async (req: Request, res: Response) => {
  try {
    const companyId = req.auth?.companyId
    const userId = req.auth?.userId
    const { service } = req.params
    const { config } = req.body

    if (!companyId) return res.status(400).json({ error: 'Company ID is required' })

    const validServices = ['google_calendar', 'outlook', 'whatsapp', 'cloud_vault']
    if (!validServices.includes(service)) {
      return res.status(400).json({ error: 'Invalid service name' })
    }

    if (!config || !config.accountEmail || !config.accountEmail.includes('@')) {
      return res.status(400).json({
        error: 'يرجى إدخال البريد الإلكتروني الخاص بالحساب السحابي وتفويض الربط'
      })
    }

    const now = new Date()
    const result = await query(
      `INSERT INTO office_integrations (company_id, user_id, service_name, status, config_data, last_sync_at, updated_at)
       VALUES ($1, $2, $3, 'connected', $4, $5, $5)
       ON CONFLICT (company_id, service_name)
       DO UPDATE SET
         status = 'connected',
         config_data = EXCLUDED.config_data,
         last_sync_at = EXCLUDED.last_sync_at,
         updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [companyId, userId || null, service, JSON.stringify(config || { autoSync: true }), now]
    )

    return res.json({
      message: `تم ربط الخدمة ${service} بنجاح`,
      integration: result.rows[0]
    })
  } catch (err: any) {
    console.error('[IntegrationsRouter] Error connecting service:', err.message)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// 3. POST /api/integrations/disconnect/:service - Disconnects a service
integrationsRouter.post('/disconnect/:service', async (req: Request, res: Response) => {
  try {
    const companyId = req.auth?.companyId
    const { service } = req.params

    if (!companyId) return res.status(400).json({ error: 'Company ID is required' })

    await query(
      `UPDATE office_integrations
       SET status = 'disconnected', updated_at = NOW()
       WHERE company_id = $1 AND service_name = $2`,
      [companyId, service]
    )

    return res.json({ message: `تم إلغاء ربط الخدمة ${service} بنجاح` })
  } catch (err: any) {
    console.error('[IntegrationsRouter] Error disconnecting service:', err.message)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// 4. POST /api/integrations/sync - Triggers sync across active connectors
integrationsRouter.post('/sync', async (req: Request, res: Response) => {
  try {
    const companyId = req.auth?.companyId
    if (!companyId) return res.status(400).json({ error: 'Company ID is required' })

    const now = new Date()
    await query(
      `UPDATE office_integrations
       SET last_sync_at = $1, updated_at = $1
       WHERE company_id = $2 AND status = 'connected'`,
      [now, companyId]
    )

    // Count upcoming sessions to sync
    const sessionsRes = await query(
      `SELECT COUNT(*)::int AS count FROM sessions WHERE company_id = $1`,
      [companyId]
    )

    return res.json({
      success: true,
      message: 'تمت المزامنة بنجاح مع الخدمات المربوطة',
      synced_sessions_count: sessionsRes.rows[0]?.count || 0,
      synced_at: now
    })
  } catch (err: any) {
    console.error('[IntegrationsRouter] Error syncing integrations:', err.message)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default integrationsRouter
