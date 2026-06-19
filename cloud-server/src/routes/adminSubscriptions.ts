import { Router, Request, Response } from 'express'
import { query } from '../db/connection'
import { authMiddleware, AuthPayload } from '../middleware/auth'
import { v4 as uuidv4 } from 'uuid'

export const adminSubscriptionRouter = Router()

adminSubscriptionRouter.use(authMiddleware)

/**
 * Middleware للتحقق من صلاحيات الأدمن
 */
const requireAdminRole = async (req: Request, res: Response, next: Function) => {
  const auth = req.auth as AuthPayload
  
  try {
    // Only allow admin of the main company (00000000-0000-0000-0000-000000000000)
    if (auth.companyId !== '00000000-0000-0000-0000-000000000000') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const userResult = await query(
      'SELECT role_key FROM users WHERE id = $1 AND company_id = $2',
      [auth.userId, auth.companyId]
    )
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }
    
    const role = userResult.rows[0].role_key
    
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }
    
    next()
  } catch (err) {
    console.error('[ADMIN] Role check error:', err)
    return res.status(500).json({ error: 'Failed to verify permissions' })
  }
}

/**
 * GET /api/admin/subscriptions
 */
adminSubscriptionRouter.get('/', requireAdminRole, async (_req: Request, res: Response) => {
  try {
    const result = await query(
      `SELECT 
        c.id,
        c.name as company_name,
        c.email,
        c.phone,
        c.is_verified,
        c.trial_expires_at,
        c.created_at as company_created_at,
        s.id as subscription_id,
        s.status as subscription_status,
        s.trial_start,
        s.trial_end,
        s.current_period_start,
        s.current_period_end,
        s.canceled_at,
        p.name_ar as plan_name,
        p.interval as plan_interval,
        p.price as plan_price,
        CASE 
          WHEN s.status = 'active' AND s.current_period_end > NOW() THEN 'active'
          WHEN s.status = 'trial' AND s.trial_end > NOW() THEN 'trial'
          WHEN s.status = 'trial' AND s.trial_end < NOW() THEN 'expired'
          WHEN s.status = 'canceled' THEN 'canceled'
          ELSE 'none'
        END as effective_status,
        CASE 
          WHEN s.current_period_end > NOW() THEN EXTRACT(DAY FROM s.current_period_end - NOW())::int
          WHEN s.trial_end > NOW() THEN EXTRACT(DAY FROM s.trial_end - NOW())::int
          ELSE 0
        END as days_remaining
      FROM companies c
      LEFT JOIN LATERAL (
        SELECT * FROM subscriptions 
        WHERE company_id = c.id 
        ORDER BY created_at DESC 
        LIMIT 1
      ) s ON true
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE c.id != '00000000-0000-0000-0000-000000000000'
      ORDER BY 
        CASE 
          WHEN s.status = 'active' AND s.current_period_end > NOW() THEN 1
          WHEN s.status = 'trial' AND s.trial_end > NOW() THEN 2
          WHEN s.status = 'trial' AND s.trial_end < NOW() THEN 3
          WHEN s.status = 'canceled' THEN 4
          ELSE 5
        END,
        c.created_at DESC`
    )
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    })
  } catch (err) {
    console.error('[ADMIN] Failed to fetch subscriptions:', err)
    res.status(500).json({ error: 'فشل جلب قائمة الاشتراكات' })
  }
})

/**
 * GET /api/admin/subscriptions/:companyId
 */
adminSubscriptionRouter.get('/:companyId', requireAdminRole, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params
    
    const companyResult = await query(
      'SELECT id, name, email, phone, is_verified, trial_expires_at, created_at FROM companies WHERE id = $1',
      [companyId]
    )
    
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'الشركة غير موجودة' })
    }
    
    const subscriptionResult = await query(
      `SELECT s.*, p.name_ar as plan_name, p.name as plan_name_en, p.interval, p.price
       FROM subscriptions s
       LEFT JOIN plans p ON s.plan_id = p.id
       WHERE s.company_id = $1
       ORDER BY s.created_at DESC`,
      [companyId]
    )
    
    const paymentsResult = await query(
      `SELECT p.*, pl.name_ar as plan_name
       FROM payments p
       LEFT JOIN plans pl ON p.plan_id = pl.id
       WHERE p.company_id = $1
       ORDER BY p.created_at DESC`,
      [companyId]
    )
    
    res.json({
      success: true,
      company: companyResult.rows[0],
      subscriptions: subscriptionResult.rows,
      payments: paymentsResult.rows
    })
  } catch (err) {
    console.error('[ADMIN] Failed to fetch company subscription:', err)
    res.status(500).json({ error: 'فشل جلب تفاصيل الاشتراك' })
  }
})

/**
 * POST /api/admin/subscriptions/activate
 */
adminSubscriptionRouter.post('/activate', requireAdminRole, async (req: Request, res: Response) => {
  try {
    const { companyId, planId, durationMonths, durationYears, lifetime } = req.body
    
    if (!companyId || !planId) {
      return res.status(400).json({ error: 'معرف الشركة ومعرف الخطة مطلوبان' })
    }
    
    const companyResult = await query('SELECT id, name FROM companies WHERE id = $1', [companyId])
    if (companyResult.rows.length === 0) {
      return res.status(404).json({ error: 'الشركة غير موجودة' })
    }
    
    const planResult = await query('SELECT id, name_ar, interval FROM plans WHERE id = $1', [planId])
    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: 'الخطة غير موجودة' })
    }
    
    const now = new Date()
    let periodEnd = new Date(now)
    
    if (lifetime) {
      periodEnd.setFullYear(2099, 11, 31)
    } else if (durationYears && durationYears > 0) {
      periodEnd.setFullYear(periodEnd.getFullYear() + durationYears)
    } else if (durationMonths && durationMonths > 0) {
      periodEnd.setMonth(periodEnd.getMonth() + durationMonths)
    } else {
      const planInterval = planResult.rows[0].interval
      if (planInterval === 'month') {
        periodEnd.setMonth(periodEnd.getMonth() + 1)
      } else if (planInterval === 'year') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1)
      }
    }
    
    const existingSub = await query(
      'SELECT id FROM subscriptions WHERE company_id = $1',
      [companyId]
    )
    
    if (existingSub.rows.length > 0) {
      await query(
        `UPDATE subscriptions 
         SET plan_id = $1, status = 'active', 
             current_period_start = $2, current_period_end = $3,
             trial_start = NULL, trial_end = NULL,
             canceled_at = NULL, updated_at = NOW()
         WHERE id = $4`,
        [planId, now, periodEnd, existingSub.rows[0].id]
      )
    } else {
      await query(
        `INSERT INTO subscriptions (id, company_id, plan_id, status, 
          current_period_start, current_period_end)
         VALUES ($1, $2, $3, 'active', $4, $5)`,
        [uuidv4(), companyId, planId, now, periodEnd]
      )
    }
    
    await query(
      'UPDATE companies SET trial_expires_at = $1, updated_at = NOW() WHERE id = $2',
      [periodEnd, companyId]
    )
    
    res.json({
      success: true,
      message: `تم تفعيل الاشتراك بنجاح حتى ${periodEnd.toLocaleDateString('ar-SA')}`,
      periodEnd: periodEnd.toISOString()
    })
  } catch (err) {
    console.error('[ADMIN] Failed to activate subscription:', err)
    res.status(500).json({ error: 'فشل تفعيل الاشتراك' })
  }
})

/**
 * POST /api/admin/subscriptions/extend
 */
adminSubscriptionRouter.post('/extend', requireAdminRole, async (req: Request, res: Response) => {
  try {
    const { companyId, extendMonths, extendYears } = req.body
    
    if (!companyId) {
      return res.status(400).json({ error: 'معرف الشركة مطلوب' })
    }
    
    if (!extendMonths && !extendYears) {
      return res.status(400).json({ error: 'مدة التمديد مطلوبة' })
    }
    
    const subResult = await query(
      `SELECT s.*, s.current_period_end FROM subscriptions s
       WHERE s.company_id = $1
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [companyId]
    )
    
    if (subResult.rows.length === 0) {
      return res.status(404).json({ error: 'لا يوجد اشتراك لهذه الشركة' })
    }
    
    const subscription = subResult.rows[0]
    let newEndDate = subscription.current_period_end 
      ? new Date(subscription.current_period_end) 
      : new Date()
    
    if (newEndDate < new Date()) {
      newEndDate = new Date()
    }
    
    if (extendYears && extendYears > 0) {
      newEndDate.setFullYear(newEndDate.getFullYear() + extendYears)
    }
    if (extendMonths && extendMonths > 0) {
      newEndDate.setMonth(newEndDate.getMonth() + extendMonths)
    }
    
    await query(
      `UPDATE subscriptions 
       SET current_period_end = $1, status = 'active', updated_at = NOW()
       WHERE id = $2`,
      [newEndDate, subscription.id]
    )
    
    await query(
      'UPDATE companies SET trial_expires_at = $1, updated_at = NOW() WHERE id = $2',
      [newEndDate, companyId]
    )
    
    res.json({
      success: true,
      message: `تم تمديد الاشتراك حتى ${newEndDate.toLocaleDateString('ar-SA')}`,
      newEndDate: newEndDate.toISOString()
    })
  } catch (err) {
    console.error('[ADMIN] Failed to extend subscription:', err)
    res.status(500).json({ error: 'فشل تمديد الاشتراك' })
  }
})

/**
 * POST /api/admin/subscriptions/suspend
 */
adminSubscriptionRouter.post('/suspend', requireAdminRole, async (req: Request, res: Response) => {
  try {
    const { companyId, reason } = req.body
    
    if (!companyId) {
      return res.status(400).json({ error: 'معرف الشركة مطلوب' })
    }
    
    const subResult = await query(
      'SELECT id FROM subscriptions WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1',
      [companyId]
    )
    
    if (subResult.rows.length === 0) {
      return res.status(404).json({ error: 'لا يوجد اشتراك لهذه الشركة' })
    }
    
    await query(
      `UPDATE subscriptions 
       SET status = 'past_due', canceled_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [subResult.rows[0].id]
    )
    
    res.json({
      success: true,
      message: 'تم تجميد الاشتراك بنجاح'
    })
  } catch (err) {
    console.error('[ADMIN] Failed to suspend subscription:', err)
    res.status(500).json({ error: 'فشل تجميد الاشتراك' })
  }
})

/**
 * POST /api/admin/subscriptions/cancel
 */
adminSubscriptionRouter.post('/cancel', requireAdminRole, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.body
    
    if (!companyId) {
      return res.status(400).json({ error: 'معرف الشركة مطلوب' })
    }
    
    const subResult = await query(
      'SELECT id FROM subscriptions WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1',
      [companyId]
    )
    
    if (subResult.rows.length > 0) {
      await query(
        `UPDATE subscriptions 
         SET status = 'canceled', canceled_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [subResult.rows[0].id]
      )
    }
    
    res.json({
      success: true,
      message: 'تم إلغاء الاشتراك'
    })
  } catch (err) {
    console.error('[ADMIN] Failed to cancel subscription:', err)
    res.status(500).json({ error: 'فشل إلغاء الاشتراك' })
  }
})

/**
 * DELETE /api/admin/subscriptions/:companyId
 */
adminSubscriptionRouter.delete('/:companyId', requireAdminRole, async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params
    
    const result = await query(
      'DELETE FROM subscriptions WHERE company_id = $1 RETURNING id',
      [companyId]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'لا يوجد اشتراك لهذه الشركة' })
    }
    
    res.json({
      success: true,
      message: 'تم حذف الاشتراك بنجاح'
    })
  } catch (err) {
    console.error('[ADMIN] Failed to delete subscription:', err)
    res.status(500).json({ error: 'فشل حذف الاشتراك' })
  }
})

/**
 * GET /api/admin/subscriptions/stats/overview
 */
adminSubscriptionRouter.get('/stats/overview', requireAdminRole, async (_req: Request, res: Response) => {
  try {
    const statsResult = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE effective_status = 'active') as active_count,
        COUNT(*) FILTER (WHERE effective_status = 'trial') as trial_count,
        COUNT(*) FILTER (WHERE effective_status = 'expired') as expired_count,
        COUNT(*) FILTER (WHERE effective_status = 'canceled') as canceled_count,
        COUNT(*) FILTER (WHERE effective_status = 'none') as no_subscription_count,
        COUNT(*) as total_count
      FROM (
        SELECT 
          CASE 
            WHEN s.status = 'active' AND s.current_period_end > NOW() THEN 'active'
            WHEN s.status = 'trial' AND s.trial_end > NOW() THEN 'trial'
            WHEN s.status = 'trial' AND s.trial_end < NOW() THEN 'expired'
            WHEN s.status = 'canceled' THEN 'canceled'
            ELSE 'none'
          END as effective_status
        FROM companies c
        LEFT JOIN LATERAL (
          SELECT * FROM subscriptions 
          WHERE company_id = c.id 
          ORDER BY created_at DESC 
          LIMIT 1
        ) s ON true
        WHERE c.id != '00000000-0000-0000-0000-000000000000'
      ) sub
    `)
    
    const revenueResult = await query(`
      SELECT 
        COUNT(*) as total_payments,
        SUM(CASE WHEN status = 'completed' THEN amount::numeric ELSE 0 END) as total_revenue,
        SUM(CASE WHEN status = 'pending' THEN amount::numeric ELSE 0 END) as pending_revenue
      FROM payments
    `)
    
    res.json({
      success: true,
      subscriptions: statsResult.rows[0],
      revenue: revenueResult.rows[0]
    })
  } catch (err) {
    console.error('[ADMIN] Failed to fetch subscription stats:', err)
    res.status(500).json({ error: 'فشل جلب الإحصائيات' })
  }
})
