import { Router, Request, Response } from 'express'
import { query } from '../db/connection'
import { authMiddleware, AuthPayload } from '../middleware/auth'

export const subscriberTrackingRouter = Router()
subscriberTrackingRouter.use(authMiddleware)

// REMOVED: Debug endpoint was exposing raw login logs and internal table structure

/**
 * Middleware to require admin role of the main company
 */
const requireAdminRole = async (req: Request, res: Response, next: Function) => {
  const auth = req.auth as AuthPayload
  if (
    auth.companyId !== (process.env.SUPERADMIN_COMPANY_ID || '00000000-0000-0000-0000-000000000000')
  ) {
    return res.status(403).json({ error: 'الوصول مخصص للمسؤولين' })
  }
  const userResult = await query('SELECT role_key FROM users WHERE id = $1 AND company_id = $2', [
    auth.userId,
    auth.companyId
  ])
  if (userResult.rows.length === 0 || userResult.rows[0].role_key !== 'admin') {
    return res.status(403).json({ error: 'الوصول مخصص للمسؤولين' })
  }
  next()
}

/**
 * GET /api/admin/subscriber-tracking/:userId/overview
 * Get subscriber overview stats
 */
subscriberTrackingRouter.get(
  '/:userId/overview',
  requireAdminRole,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params

      const userResult = await query(
        `SELECT u.id, u.username, u.full_name, u.is_active, u.must_change_password,
              u.created_by, u.created_at, u.updated_at,
              c.id as company_id, c.name as company_name, c.email as company_email, c.phone as company_phone,
              c.is_verified, c.trial_expires_at
       FROM users u
       JOIN companies c ON u.company_id = c.id
       WHERE u.id = $1`,
        [userId]
      )

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'المشترك غير موجود' })
      }

      const user = userResult.rows[0]

      // Subscription info
      const subResult = await query(
        `SELECT s.*, p.name_ar as plan_name, p.name as plan_name_en, p.interval, p.price
       FROM subscriptions s
       LEFT JOIN plans p ON s.plan_id = p.id
       WHERE s.company_id = $1
       ORDER BY s.created_at DESC LIMIT 1`,
        [user.company_id]
      )

      // Tracking queries - wrapped in try/catch since tables may not exist yet
      let lastLogin = null
      let totalLogins = 0
      let firstLogin = null
      let totalFailedAttempts = 0
      let distinctDevices = 0
      let totalActivities = 0

      try {
        const r = await query(
          `SELECT login_time, ip_address, device_info, browser_info
         FROM user_login_logs WHERE user_id = $1 AND is_successful = TRUE
         ORDER BY login_time DESC LIMIT 1`,
          [userId]
        )
        lastLogin = r.rows[0] || null
      } catch (e: any) {
        console.error('[TRACKING] lastLogin query failed:', e?.message || e)
      }

      try {
        const r = await query(
          `SELECT COUNT(*) as count FROM user_login_logs WHERE user_id = $1 AND is_successful = TRUE`,
          [userId]
        )
        totalLogins = parseInt(r.rows[0]?.count || '0')
      } catch (e: any) {
        console.error('[TRACKING] totalLogins query failed:', e?.message || e)
      }

      try {
        const r = await query(
          `SELECT login_time FROM user_login_logs WHERE user_id = $1 AND is_successful = TRUE
         ORDER BY login_time ASC LIMIT 1`,
          [userId]
        )
        firstLogin = r.rows[0]?.login_time || null
      } catch (e: any) {
        console.error('[TRACKING] firstLogin query failed:', e?.message || e)
      }

      try {
        const r = await query(
          `SELECT COUNT(*) as count FROM user_login_logs WHERE user_id = $1 AND is_successful = FALSE`,
          [userId]
        )
        totalFailedAttempts = parseInt(r.rows[0]?.count || '0')
      } catch (e: any) {
        console.error('[TRACKING] totalFailedAttempts query failed:', e?.message || e)
      }

      try {
        const r = await query(
          `SELECT DISTINCT device_info, browser_info, ip_address
         FROM user_login_logs WHERE user_id = $1 AND is_successful = TRUE
         ORDER BY login_time DESC`,
          [userId]
        )
        distinctDevices = r.rows.length
      } catch (e: any) {
        console.error('[TRACKING] distinctDevices query failed:', e?.message || e)
      }

      try {
        const r = await query(
          `SELECT COUNT(*) as count FROM user_activity_logs WHERE user_id = $1`,
          [userId]
        )
        totalActivities = parseInt(r.rows[0]?.count || '0')
      } catch (e: any) {
        console.error('[TRACKING] totalActivities query failed:', e?.message || e)
      }

      const subscription = subResult.rows[0] || null
      let daysLeft = 0
      let isExpired = true
      if (subscription) {
        const endDate = subscription.current_period_end || subscription.trial_end
        if (endDate) {
          const diff = new Date(endDate).getTime() - Date.now()
          daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
          isExpired = diff < 0
        }
      }

      res.json({
        user: {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          isActive: user.is_active,
          mustChangePassword: user.must_change_password,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        },
        company: {
          id: user.company_id,
          name: user.company_name,
          email: user.company_email,
          phone: user.company_phone,
          isVerified: user.is_verified,
          trialExpiresAt: user.trial_expires_at
        },
        subscription: subscription
          ? {
              id: subscription.id,
              status: subscription.status,
              planName: subscription.plan_name || subscription.plan_name_en,
              interval: subscription.interval,
              price: subscription.price,
              trialStart: subscription.trial_start,
              trialEnd: subscription.trial_end,
              currentPeriodStart: subscription.current_period_start,
              currentPeriodEnd: subscription.current_period_end,
              daysLeft,
              isExpired
            }
          : null,
        stats: {
          totalLogins,
          totalFailedAttempts,
          totalActivities,
          distinctDevices,
          lastLogin,
          firstLogin
        }
      })
    } catch (err) {
      console.error('[SUBSCRIBER_TRACKING] Failed to fetch overview:', err)
      res.status(500).json({ error: 'فشل في جلب نظرة عامة على المشترك' })
    }
  }
)

/**
 * GET /api/admin/subscriber-tracking/:userId/login-logs
 * Get login history for a user
 */
subscriberTrackingRouter.get(
  '/:userId/login-logs',
  requireAdminRole,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200)
      const offset = parseInt(req.query.offset as string) || 0

      try {
        const result = await query(
          `SELECT id, login_time, logout_time, ip_address, device_info, browser_info,
                is_successful, failure_reason
         FROM user_login_logs
         WHERE user_id = $1
         ORDER BY login_time DESC
         LIMIT $2 OFFSET $3`,
          [userId, limit, offset]
        )

        const countResult = await query(
          `SELECT COUNT(*) as count FROM user_login_logs WHERE user_id = $1`,
          [userId]
        )

        res.json({
          data: result.rows,
          total: parseInt(countResult.rows[0]?.count || '0'),
          limit,
          offset
        })
      } catch (e: any) {
        console.error('[TRACKING] login-logs query failed:', e?.message || e)
        res.json({ data: [], total: 0, limit, offset })
      }
    } catch (err) {
      console.error('[SUBSCRIBER_TRACKING] Failed to fetch login logs:', err)
      res.status(500).json({ error: 'فشل في جلب سجلات تسجيل الدخول' })
    }
  }
)

/**
 * GET /api/admin/subscriber-tracking/:userId/activity-logs
 * Get activity history for a user
 */
subscriberTrackingRouter.get(
  '/:userId/activity-logs',
  requireAdminRole,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200)
      const offset = parseInt(req.query.offset as string) || 0

      try {
        const result = await query(
          `SELECT id, activity_type, activity_description, entity_type, entity_id, ip_address, created_at
         FROM user_activity_logs
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
          [userId, limit, offset]
        )

        const countResult = await query(
          `SELECT COUNT(*) as count FROM user_activity_logs WHERE user_id = $1`,
          [userId]
        )

        res.json({
          data: result.rows,
          total: parseInt(countResult.rows[0]?.count || '0'),
          limit,
          offset
        })
      } catch (e: any) {
        console.error('[TRACKING] activity-logs query failed:', e?.message || e)
        res.json({ data: [], total: 0, limit, offset })
      }
    } catch (err) {
      console.error('[SUBSCRIBER_TRACKING] Failed to fetch activity logs:', err)
      res.status(500).json({ error: 'فشل في جلب سجلات النشاط' })
    }
  }
)
