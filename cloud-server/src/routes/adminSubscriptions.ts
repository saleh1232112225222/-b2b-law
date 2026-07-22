import { Router, Request, Response } from 'express'
import { query } from '../db/connection'
import { authMiddleware, AuthPayload } from '../middleware/auth'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'

export const adminSubscriptionRouter = Router()

/**
 * Rate limiter for report sending — 5 per hour per admin user
 */
const reportSendAttempts = new Map<string, { count: number; resetTime: number }>()

const reportSendRateLimiter = (req: Request, res: Response, next: Function) => {
  const auth = req.auth as AuthPayload
  const key = auth.userId
  const now = Date.now()
  const windowMs = 60 * 60 * 1000 // 1 hour
  const maxAttempts = 5

  const attempt = reportSendAttempts.get(key)
  if (!attempt) {
    reportSendAttempts.set(key, { count: 1, resetTime: now + windowMs })
    return next()
  }

  if (now > attempt.resetTime) {
    reportSendAttempts.set(key, { count: 1, resetTime: now + windowMs })
    return next()
  }

  attempt.count++
  if (attempt.count > maxAttempts) {
    const minutesLeft = Math.ceil((attempt.resetTime - now) / 60000)
    return res.status(429).json({
      error: 'TooManyReportRequests',
      message: `لقد تجاوزت الحد الأقصى لطلبات التقرير. يرجى المحاولة بعد ${minutesLeft} دقيقة.`
    })
  }

  next()
}

/**
 * Helper to escape HTML entities to prevent XSS in email templates
 */
function escapeHtml(str: string | null | undefined): string {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

adminSubscriptionRouter.use(authMiddleware)

// Check if soft-delete columns exist on companies table
let softDeleteReady = false
async function ensureSoftDeleteColumns() {
  if (softDeleteReady) return true
  try {
    const check = await query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'companies' AND column_name = 'is_deleted'
      ) as exists`
    )
    if (check.rows[0]?.exists) {
      softDeleteReady = true
    } else {
      // Create columns now
      await query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE')
      await query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ')
      await query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS deleted_by UUID')
      softDeleteReady = true
      console.log('[ADMIN] Soft delete columns created on companies table')
    }
  } catch (err: any) {
    console.warn('[ADMIN] Could not ensure soft delete columns:', err.message)
    softDeleteReady = false
  }
  return softDeleteReady
}

/**
 * Middleware للتحقق من صلاحيات الأدمن
 */
const requireAdminRole = async (req: Request, res: Response, next: Function) => {
  const auth = req.auth as AuthPayload

  try {
    // Only allow admin of the main company (00000000-0000-0000-0000-000000000000)
    if (auth.companyId !== (process.env.SUPERADMIN_COMPANY_ID || '00000000-0000-0000-0000-000000000000')) {
      return res.status(403).json({ error: 'الوصول مخصص للمسؤولين' })
    }

    const userResult = await query('SELECT role_key FROM users WHERE id = $1 AND company_id = $2', [
      auth.userId,
      auth.companyId
    ])

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'المستخدم غير موجود' })
    }

    const role = userResult.rows[0].role_key

    if (role !== 'admin') {
      return res.status(403).json({ error: 'الوصول مخصص للمسؤولين' })
    }

    next()
  } catch (err) {
    console.error('[ADMIN] Role check error:', err)
    return res.status(500).json({ error: 'فشل في التحقق من الصلاحيات' })
  }
}

/**
 * GET /api/admin/subscriptions
 */
adminSubscriptionRouter.get('/', requireAdminRole, async (_req: Request, res: Response) => {
  try {
    const hasSoftDelete = await ensureSoftDeleteColumns()

    const deletedFilter = hasSoftDelete
      ? `AND (c.is_deleted IS NULL OR c.is_deleted = FALSE)`
      : ''

    const result = await query(
      `SELECT 
        c.id,
        c.name as company_name,
        c.email,
        c.phone,
        c.is_verified,
        c.trial_expires_at,
        c.created_at as company_created_at,
        u.id as user_id,
        u.username as user_username,
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
          WHEN s.status = 'past_due' THEN 'suspended'
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
      LEFT JOIN users u ON u.company_id = c.id AND u.role_key = 'admin'
      WHERE c.id != '00000000-0000-0000-0000-000000000000'
        ${deletedFilter}
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

    const mappedRows = result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      username: row.user_username,
      companyName: row.company_name,
      email: row.email,
      phone: row.phone,
      isVerified: row.is_verified,
      trialExpiresAt: row.trial_expires_at,
      companyCreatedAt: row.company_created_at,
      subscriptionId: row.subscription_id,
      subscriptionStatus: row.subscription_status,
      trialStart: row.trial_start,
      trialEnd: row.trial_end,
      currentPeriodStart: row.current_period_start,
      currentPeriodEnd: row.current_period_end,
      canceledAt: row.canceled_at,
      planName: row.plan_name,
      planInterval: row.plan_interval,
      planPrice: row.plan_price,
      effectiveStatus: row.effective_status,
      daysRemaining: row.days_remaining,
      expiryDate: row.current_period_end || row.trial_end || row.trial_expires_at || null
    }))

    res.json({
      success: true,
      data: mappedRows,
      count: mappedRows.length
    })
  } catch (err) {
    console.error('[ADMIN] Failed to fetch subscriptions:', err)
    res.status(500).json({ error: 'فشل جلب قائمة الاشتراكات' })
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

    const planResult = await query('SELECT id, name_ar, interval FROM plans WHERE id = $1', [
      planId
    ])
    if (planResult.rows.length === 0) {
      return res.status(404).json({ error: 'الخطة غير موجودة' })
    }

    const now = new Date()
    let periodEnd = new Date(now)

    if (lifetime) {
      periodEnd.setFullYear(2099, 11, 31)
    } else if (durationYears && durationYears > 0) {
      const limitedYears = Math.min(Number(durationYears), 100)
      periodEnd.setFullYear(periodEnd.getFullYear() + limitedYears)
    } else if (durationMonths && durationMonths > 0) {
      const limitedMonths = Math.min(Number(durationMonths), 1200)
      periodEnd.setMonth(periodEnd.getMonth() + limitedMonths)
    } else {
      const planInterval = planResult.rows[0].interval
      if (planInterval === 'month') {
        periodEnd.setMonth(periodEnd.getMonth() + 1)
      } else if (planInterval === 'year') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1)
      }
    }

    const existingSub = await query('SELECT id FROM subscriptions WHERE company_id = $1', [
      companyId
    ])

    if (existingSub.rows.length > 0) {
      await query(
        `UPDATE subscriptions 
         SET plan_id = $1, status = 'active',
             current_period_start = $2, current_period_end = $3,
             canceled_at = NULL, suspended_at = NULL, suspend_reason = NULL, updated_at = NOW()
         WHERE id = $4`,
        [planId, now, periodEnd, existingSub.rows[0].id]
      )
    } else {
      await query(
        `INSERT INTO subscriptions (id, company_id, plan_id, status, 
          current_period_start, current_period_end, trial_start, trial_end)
         VALUES ($1, $2, $3, 'active', $4, $5, $4, $5)`,
        [uuidv4(), companyId, planId, now, periodEnd]
      )
    }

    await query(
      `UPDATE companies 
       SET is_verified = TRUE, verification_code = NULL, trial_expires_at = $1, updated_at = NOW() 
       WHERE id = $2`,
      [periodEnd, companyId]
    )

    // Reactivate all users in this company when subscription is activated
    await query(
      `UPDATE users SET is_active = TRUE, is_suspended = FALSE, updated_at = NOW() WHERE company_id = $1`,
      [companyId]
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
    const { companyId, extendMonths, extendYears, durationMonths } = req.body

    if (!companyId) {
      return res.status(400).json({ error: 'معرف الشركة مطلوب' })
    }

    const actualMonths = extendMonths || durationMonths

    if (!actualMonths && !extendYears) {
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
      const limitedYears = Math.min(Number(extendYears), 100)
      newEndDate.setFullYear(newEndDate.getFullYear() + limitedYears)
    }
    if (actualMonths && actualMonths > 0) {
      const limitedMonths = Math.min(Number(actualMonths), 1200)
      newEndDate.setMonth(newEndDate.getMonth() + limitedMonths)
    }

    await query(
      `UPDATE subscriptions
       SET current_period_end = $1, status = 'active', suspended_at = NULL, suspend_reason = NULL, canceled_at = NULL, updated_at = NOW()
       WHERE id = $2`,
      [newEndDate, subscription.id]
    )

    await query(
      `UPDATE companies 
       SET is_verified = TRUE, verification_code = NULL, trial_expires_at = $1, updated_at = NOW() 
       WHERE id = $2`,
      [newEndDate, companyId]
    )

    // Reactivate all users when subscription is extended
    await query(
      `UPDATE users SET is_active = TRUE, is_suspended = FALSE, updated_at = NOW() WHERE company_id = $1`,
      [companyId]
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
       SET status = 'past_due', suspended_at = NOW(), suspend_reason = $2, canceled_at = NULL, updated_at = NOW()
       WHERE id = $1`,
      [subResult.rows[0].id, reason || null]
    )

    // Deactivate all users in this company so they cannot log in
    await query(
      `UPDATE users SET is_active = FALSE, is_suspended = TRUE, updated_at = NOW() WHERE company_id = $1`,
      [companyId]
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
 * GET /api/admin/subscriptions/deleted
 * جلب جميع المشتركين المحذوفين (سلة المحذوفات)
 */
adminSubscriptionRouter.get('/deleted', requireAdminRole, async (_req: Request, res: Response) => {
  try {
    const hasSoftDelete = await ensureSoftDeleteColumns()
    if (!hasSoftDelete) {
      return res.json({ success: true, data: [], count: 0 })
    }

    const result = await query(
      `SELECT 
        c.id,
        c.name as company_name,
        c.email,
        c.phone,
        c.is_verified,
        c.trial_expires_at,
        c.created_at as company_created_at,
        c.deleted_at,
        c.deleted_by,
        u.id as user_id,
        u.username as user_username,
        u.full_name as user_full_name,
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
        del_user.full_name as deleted_by_name
      FROM companies c
      LEFT JOIN LATERAL (
        SELECT * FROM subscriptions 
        WHERE company_id = c.id 
        ORDER BY created_at DESC 
        LIMIT 1
      ) s ON true
      LEFT JOIN plans p ON s.plan_id = p.id
      LEFT JOIN users u ON u.company_id = c.id AND u.role_key = 'admin'
      LEFT JOIN users del_user ON c.deleted_by = del_user.id
      WHERE c.is_deleted = TRUE
      ORDER BY c.deleted_at DESC`
    )

    const mappedRows = result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      username: row.user_username,
      userFullName: row.user_full_name,
      companyName: row.company_name,
      email: row.email,
      phone: row.phone,
      isVerified: row.is_verified,
      trialExpiresAt: row.trial_expires_at,
      companyCreatedAt: row.company_created_at,
      deletedAt: row.deleted_at,
      deletedBy: row.deleted_by_name || 'غير معروف',
      subscriptionId: row.subscription_id,
      subscriptionStatus: row.subscription_status,
      trialStart: row.trial_start,
      trialEnd: row.trial_end,
      currentPeriodStart: row.current_period_start,
      currentPeriodEnd: row.current_period_end,
      canceledAt: row.canceled_at,
      planName: row.plan_name,
      planInterval: row.plan_interval,
      planPrice: row.plan_price
    }))

    res.json({
      success: true,
      data: mappedRows,
      count: mappedRows.length
    })
  } catch (err) {
    console.error('[ADMIN] Failed to fetch deleted subscriptions:', err)
    res.status(500).json({ error: 'فشل جلب المشتركين المحذوفين' })
  }
})

/**
 * POST /api/admin/subscriptions/restore/:companyId
 * استعادة مشترك من سلة المحذوفات
 */
adminSubscriptionRouter.post(
  '/restore/:companyId',
  requireAdminRole,
  async (req: Request, res: Response) => {
    try {
      const { companyId } = req.params

      const companyCheck = await query(
        'SELECT id, name, is_deleted FROM companies WHERE id = $1',
        [companyId]
      )
      if (companyCheck.rows.length === 0) {
        return res.status(404).json({ error: 'المشترك غير موجود' })
      }

      if (!companyCheck.rows[0].is_deleted) {
        return res.status(400).json({ error: 'المشترك غير محذوف' })
      }

      // Restore - clear soft delete flags
      await query(
        `UPDATE companies 
         SET is_deleted = FALSE, deleted_at = NULL, deleted_by = NULL, updated_at = NOW()
         WHERE id = $1`,
        [companyId]
      )

      // Reactivate all users in this company
      await query(
        `UPDATE users SET is_active = TRUE, is_suspended = FALSE, updated_at = NOW() WHERE company_id = $1`,
        [companyId]
      )

      res.json({
        success: true,
        message: `تم استعادة المشترك "${companyCheck.rows[0].name}" بنجاح`
      })
    } catch (err) {
      console.error('[ADMIN] Failed to restore company/subscriber:', err)
      res.status(500).json({ error: 'فشل استعادة المشترك' })
    }
  }
)

/**
 * DELETE /api/admin/subscriptions/permanent/:companyId
 * حذف دائم لا رجعة فيه - يحذف جميع البيانات فعلياً
 */
adminSubscriptionRouter.delete(
  '/permanent/:companyId',
  requireAdminRole,
  async (req: Request, res: Response) => {
    try {
      const { companyId } = req.params

      const companyCheck = await query(
        'SELECT id, name, is_deleted FROM companies WHERE id = $1',
        [companyId]
      )
      if (companyCheck.rows.length === 0) {
        return res.status(404).json({ error: 'المشترك غير موجود' })
      }

      await query('BEGIN')

      const tablesToClear = [
        'invoice_items',
        'invoices',
        'vouchers',
        'receivables',
        'finances',
        'collections_payments',
        'collections_claims',
        'enf_attachments',
        'enf_decisions',
        'enf_request_parties',
        'enf_financial_details',
        'enf_personal_details',
        'enf_direct_details',
        'enforcement_requests',
        'enforcement_actions',
        'enforcement_parties',
        'enforcement_files',
        'session_outcomes',
        'sessions',
        'judgments',
        'tasks_v2',
        'tasks',
        'documents_v2',
        'documents',
        'file_assets',
        'communications',
        'evidence',
        'experts',
        'agencies',
        'user_case_access',
        'user_client_access',
        'user_permissions',
        'cases',
        'case_parties',
        'clients',
        'defendants',
        'case_actions',
        'assignment_logs',
        'professional_liability_logs',
        'judgment_amendments',
        'contract_signatures',
        'contract_participants',
        'contract_parties',
        'contract_party_types',
        'contract_party_audits',
        'contract_links',
        'contract_schedules',
        'contract_amendments',
        'contracts',
        'contract_templates',
        'activity_logs',
        'accounts',
        'firm_data'
      ]

      for (const table of tablesToClear) {
        await query(`DELETE FROM ${table} WHERE company_id = $1`, [companyId]).catch(() => {})
      }

      await query('DELETE FROM subscriptions WHERE company_id = $1', [companyId])
      await query('DELETE FROM users WHERE company_id = $1', [companyId])
      await query('DELETE FROM companies WHERE id = $1', [companyId])

      await query('COMMIT')

      res.json({
        success: true,
        message: `تم حذف المشترك "${companyCheck.rows[0].name}" نهائياً ولا يمكن استعادته`
      })
    } catch (err) {
      await query('ROLLBACK').catch(() => {})
      console.error('[ADMIN] Failed to permanently delete company/subscriber:', err)
      res.status(500).json({ error: 'فشل الحذف الدائم' })
    }
  }
)

/**
 * DELETE /api/admin/subscriptions/:companyId
 * Soft delete - hides subscriber without removing data
 * MUST be after /permanent/:companyId to avoid route conflict
 */
adminSubscriptionRouter.delete(
  '/:companyId',
  requireAdminRole,
  async (req: Request, res: Response) => {
    try {
      const { companyId } = req.params
      const auth = req.auth as AuthPayload

      const hasSoftDelete = await ensureSoftDeleteColumns()

      const companyCheck = await query('SELECT id, name FROM companies WHERE id = $1', [companyId])
      if (companyCheck.rows.length === 0) {
        return res.status(404).json({ error: 'المشترك غير موجود' })
      }

      if (!hasSoftDelete) {
        return res.status(500).json({ error: 'لم تُجهز أعمدة الحذف الناعم بعد. يرجى إعادة تشغيل الخادم.' })
      }

      await query(
        `UPDATE companies 
         SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = $1, updated_at = NOW()
         WHERE id = $2`,
        [auth.userId, companyId]
      )

      // Deactivate all users in this company so they cannot log in
      await query(
        `UPDATE users SET is_active = FALSE, is_suspended = TRUE, updated_at = NOW() WHERE company_id = $1`,
        [companyId]
      )

      const subResult = await query(
        `SELECT s.status FROM subscriptions s 
         WHERE s.company_id = $1 
         ORDER BY s.created_at DESC LIMIT 1`,
        [companyId]
      )
      const subscriptionStatus = subResult.rows[0]?.status || 'none'

      res.json({
        success: true,
        message: 'تم نشر المشترك إلى سلة المحذوفات بنجاح',
        deletedCompany: {
          id: companyId,
          name: companyCheck.rows[0].name,
          subscriptionStatus,
          deletedAt: new Date().toISOString(),
          deletedBy: auth.userId
        }
      })
    } catch (err) {
      console.error('[ADMIN] Failed to soft delete company/subscriber:', err)
      res.status(500).json({ error: 'فشل حذف المشترك' })
    }
  }
)

/**
 * POST /api/admin/subscriptions/activate-company/:companyId
 * تفعيل اشتراك شركة يدوياً (للدفع النقدي أو التفعيل اليدوي)
 * Body: { planId?: string, trialMonths?: number, extendMonths?: number }
 */
adminSubscriptionRouter.post(
  '/activate-company/:companyId',
  requireAdminRole,
  async (req: Request, res: Response) => {
    try {
      const { companyId } = req.params
      const { trialMonths, extendMonths, planId } = req.body

      const existingSub = await query(
        `SELECT * FROM subscriptions WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [companyId]
      )

      const existing = existingSub.rows[0]

      // تحديد تاريخ الانتهاء الجديد
      let newEndDate: Date | null = null

      if (existing && existing.status === 'lifetime') {
        return res.status(400).json({ error: 'الاشتراك مدى الحياة بالفعل' })
      }

      if (extendMonths) {
        // تمديد من التاريخ الحالي أو من الآن
        const baseDate = existing?.current_period_end
          ? new Date(existing.current_period_end)
          : new Date()

        if (baseDate < new Date()) {
          newEndDate = new Date()
        } else {
          newEndDate = baseDate
        }

        newEndDate.setMonth(newEndDate.getMonth() + Number(extendMonths))
      } else if (trialMonths) {
        // منح فترة تجريبية إضافية
        newEndDate = new Date()
        newEndDate.setDate(newEndDate.getDate() + Number(trialMonths) * 30)
      } else {
        return res.status(400).json({ error: 'يجب تحديد trialMonths أو extendMonths' })
      }

      if (existing) {
        await query(
          `UPDATE subscriptions 
         SET status = 'active', 
             trial_start = COALESCE(trial_start, NOW()),
             trial_end = $2,
             current_period_start = COALESCE(current_period_start, NOW()),
             current_period_end = $2,
             plan_id = COALESCE($3, plan_id),
             updated_at = NOW()
         WHERE id = $1`,
          [existing.id, newEndDate, planId || null]
        )
      } else {
        const subId = require('crypto').randomUUID()
        await query(
          `INSERT INTO subscriptions (id, company_id, plan_id, status, trial_start, trial_end, current_period_start, current_period_end)
         VALUES ($1, $2, $3, 'active', NOW(), $4, NOW(), $4)`,
          [subId, companyId, planId || null, newEndDate]
        )
      }

      // Also update company trial expiration and verification status
      await query(
        `UPDATE companies 
         SET is_verified = TRUE, verification_code = NULL, trial_expires_at = $1, updated_at = NOW() 
         WHERE id = $2`,
        [newEndDate, companyId]
      )

      // Reactivate all users when subscription is activated
      await query(
        `UPDATE users SET is_active = TRUE, is_suspended = FALSE, updated_at = NOW() WHERE company_id = $1`,
        [companyId]
      )

      res.json({ success: true, message: 'تم تفعيل الاشتراك', endDate: newEndDate.toISOString() })
    } catch (err) {
      console.error('[ADMIN] Failed to activate company subscription:', err)
      res.status(500).json({ error: 'فشل تفعيل الاشتراك' })
    }
  }
)

/**
 * POST /api/admin/subscriptions/cancel-company/:companyId
 * إلغاء اشتراك شركة يدوياً (تحويل لـ canceled)
 * Body: { reason?: string }
 */
adminSubscriptionRouter.post(
  '/cancel-company/:companyId',
  requireAdminRole,
  async (req: Request, res: Response) => {
    try {
      const { companyId } = req.params
      const { reason } = req.body

      const existingSub = await query(
        `SELECT id FROM subscriptions WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [companyId]
      )

      if (existingSub.rows.length > 0) {
        await query(
          `UPDATE subscriptions SET status = 'canceled', canceled_at = NOW(), updated_at = NOW() WHERE id = $1`,
          [existingSub.rows[0].id]
        )
      }

      // Deactivate all users in this company
      await query(
        `UPDATE users SET is_active = FALSE, is_suspended = TRUE, updated_at = NOW() WHERE company_id = $1`,
        [companyId]
      )

      res.json({ success: true, message: 'تم إلغاء الاشتراك' })
    } catch (err) {
      console.error('[ADMIN] Failed to cancel company subscription:', err)
      res.status(500).json({ error: 'فشل إلغاء الاشتراك' })
    }
  }
)

/**
 * POST /api/admin/subscriptions/lifetime/:companyId
 * منح اشتراك مدى الحياة لشركة
 */
adminSubscriptionRouter.post(
  '/lifetime/:companyId',
  requireAdminRole,
  async (req: Request, res: Response) => {
    try {
      const { companyId } = req.params

      const existingSub = await query(
        `SELECT id FROM subscriptions WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [companyId]
      )

      const lifetimeEnd = new Date('2099-12-31')

      if (existingSub.rows.length > 0) {
        await query(
          `UPDATE subscriptions 
         SET status = 'lifetime', current_period_end = $2, trial_end = $2, updated_at = NOW()
         WHERE id = $1`,
          [existingSub.rows[0].id, lifetimeEnd]
        )
      } else {
        const subId = require('crypto').randomUUID()
        await query(
          `INSERT INTO subscriptions (id, company_id, status, current_period_start, current_period_end, trial_start, trial_end)
         VALUES ($1, $2, 'lifetime', NOW(), $3, NOW(), $3)`,
          [subId, companyId, lifetimeEnd]
        )
      }

      res.json({
        success: true,
        message: 'تم منح اشتراك مدى الحياة',
        endDate: lifetimeEnd.toISOString()
      })
    } catch (err) {
      console.error('[ADMIN] Failed to grant lifetime subscription:', err)
      res.status(500).json({ error: 'فشل منح اشتراك مدى الحياة' })
    }
  }
)

/**
 * GET /api/admin/subscriptions/stats/overview
 */
adminSubscriptionRouter.get(
  '/stats/overview',
  requireAdminRole,
  async (_req: Request, res: Response) => {
    try {
      const hasSoftDelete = await ensureSoftDeleteColumns()
      const deletedFilter = hasSoftDelete
        ? `AND (c.is_deleted IS NULL OR c.is_deleted = FALSE)`
        : ''

      const statsResult = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE effective_status = 'active') as active_count,
        COUNT(*) FILTER (WHERE effective_status = 'trial') as trial_count,
        COUNT(*) FILTER (WHERE effective_status = 'expired') as expired_count,
        COUNT(*) FILTER (WHERE effective_status = 'canceled') as canceled_count,
        COUNT(*) FILTER (WHERE effective_status = 'suspended') as suspended_count,
        COUNT(*) FILTER (WHERE effective_status = 'none') as no_subscription_count,
        COUNT(*) as total_count
      FROM (
        SELECT 
          CASE 
            WHEN s.status = 'active' AND s.current_period_end > NOW() THEN 'active'
            WHEN s.status = 'trial' AND s.trial_end > NOW() THEN 'trial'
            WHEN s.status = 'trial' AND s.trial_end < NOW() THEN 'expired'
            WHEN s.status = 'past_due' THEN 'suspended'
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
          ${deletedFilter}
      ) sub
    `)

      const revenueResult = await query(`
      SELECT 
        COUNT(*) as total_payments,
        SUM(CASE WHEN status = 'completed' THEN amount::numeric ELSE 0 END) as total_revenue,
        SUM(CASE WHEN status = 'pending' THEN amount::numeric ELSE 0 END) as pending_revenue
      FROM payments
    `)

      const stats = statsResult.rows[0]
      const revenue = revenueResult.rows[0]

      res.json({
        success: true,
        subscriptions: {
          activeCount: parseInt(stats.active_count || '0', 10),
          trialCount: parseInt(stats.trial_count || '0', 10),
          expiredCount: parseInt(stats.expired_count || '0', 10),
          canceledCount: parseInt(stats.canceled_count || '0', 10),
          noSubscriptionCount: parseInt(stats.no_subscription_count || '0', 10),
          totalCount: parseInt(stats.total_count || '0', 10)
        },
        revenue: {
          totalPayments: parseInt(revenue.total_payments || '0', 10),
          totalRevenue: parseFloat(revenue.total_revenue || '0'),
          pendingRevenue: parseFloat(revenue.pending_revenue || '0')
        }
      })
    } catch (err) {
      console.error('[ADMIN] Failed to fetch subscription stats:', err)
      res.status(500).json({ error: 'فشل جلب الإحصائيات' })
    }
  }
)

/**
 * دالة مساعدة لتوليد تقرير HTML
 */
async function generateUsersReportHTML(): Promise<string> {
  const hasSoftDelete = await ensureSoftDeleteColumns()
  const deletedFilter = hasSoftDelete
    ? `AND (c.is_deleted IS NULL OR c.is_deleted = FALSE)`
    : ''

  const res = await query(`
    SELECT 
      c.name AS company_name,
      c.email AS company_email,
      c.phone AS company_phone,
      c.is_verified,
      c.created_at,
      u.username,
      u.full_name,
      u.recovery_email
    FROM companies c
    LEFT JOIN users u ON c.id = u.company_id
    WHERE c.id != '00000000-0000-0000-0000-000000000000'
    ${deletedFilter}
    ORDER BY c.created_at DESC
  `)

  let tableRows = ''
  res.rows.forEach((row, i) => {
    const method = row.company_phone ? 'تسجيل يدوي (OTP)' : 'تسجيل عبر Google'
    const status = row.is_verified
      ? '<span style="color: #2e7d32; font-weight: bold;">مفعل ✅</span>'
      : '<span style="color: #c62828;">غير مفعل ⏳</span>'
    const date = new Date(row.created_at).toLocaleString('ar-EG', { timeZone: 'Asia/Riyadh' })

    tableRows += `
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 12px; text-align: right;">${i + 1}</td>
        <td style="padding: 12px; text-align: right; font-weight: bold;">${escapeHtml(row.company_name)}</td>
        <td style="padding: 12px; text-align: right;"><a href="mailto:${escapeHtml(row.company_email)}">${escapeHtml(row.company_email)}</a></td>
        <td style="padding: 12px; text-align: right;">${escapeHtml(row.company_phone || 'غير متوفر')}</td>
        <td style="padding: 12px; text-align: right;">${escapeHtml(method)}</td>
        <td style="padding: 12px; text-align: right;">${status}</td>
        <td style="padding: 12px; text-align: right; font-size: 13px;">${escapeHtml(date)}</td>
      </tr>
    `
  })

  return `
    <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px;">
      <div style="background: #0c0e14; padding: 30px; border-radius: 12px; text-align: center; border: 2px solid #e9c349; margin-bottom: 20px;">
        <h1 style="color: #e9c349; margin: 0; font-size: 26px;">📊 تقرير المستخدمين المسجلين في B2B Lawyer</h1>
        <p style="color: #fff; margin-top: 10px; font-size: 15px;">تم توليد هذا التقرير تلقائياً بناءً على طلبك.</p>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; background: #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #e9c349; color: #000; font-weight: bold;">
            <th style="padding: 12px; text-align: right;">#</th>
            <th style="padding: 12px; text-align: right;">اسم المكتب/المشترك</th>
            <th style="padding: 12px; text-align: right;">البريد الإلكتروني</th>
            <th style="padding: 12px; text-align: right;">رقم الهاتف</th>
            <th style="padding: 12px; text-align: right;">طريقة التسجيل</th>
            <th style="padding: 12px; text-align: right;">حالة الحساب</th>
            <th style="padding: 12px; text-align: right;">تاريخ ووقت التسجيل</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      
      <p style="text-align: center; color: #777; font-size: 12px; margin-top: 30px;">
        تاريخ استخراج التقرير: ${new Date().toLocaleString('ar-EG', { timeZone: 'Asia/Riyadh' })}
      </p>
    </div>
  `
}

/**
 * مساعدة لإرسال البريد
 */
export async function sendUsersReportEmail(targetEmail: string, htmlContent: string) {
  const nodemailer = require('nodemailer')
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || 'slaehmap@gmail.com',
      pass: process.env.SMTP_PASS
    }
  })

  await transporter.sendMail({
    from: `"B2B Lawyer Reports" <${process.env.SMTP_USER || 'slaehmap@gmail.com'}>`,
    to: targetEmail,
    subject: `📊 تقرير المشتركين المسجلين في B2B Lawyer - ${new Date().toLocaleDateString('ar-EG')}`,
    html: htmlContent
  })
}

/**
 * GET /api/admin/subscriptions/report/html
 * للحصول على التقرير كـ HTML للطباعة
 */
adminSubscriptionRouter.get(
  '/report/html',
  requireAdminRole,
  async (_req: Request, res: Response) => {
    try {
      const html = await generateUsersReportHTML()
      res.send(html)
    } catch (err) {
      console.error('[ADMIN] Failed to generate HTML report:', err)
      res.status(500).send('فشل توليد التقرير')
    }
  }
)

/**
 * GET /api/admin/subscriptions/:companyId
 * MUST be after all named GET routes to avoid route conflicts
 */
adminSubscriptionRouter.get(
  '/:companyId',
  requireAdminRole,
  async (req: Request, res: Response) => {
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

      const company = companyResult.rows[0]
      const subscriptions = subscriptionResult.rows
      const payments = paymentsResult.rows

      const mappedCompany = {
        id: company.id,
        name: company.name,
        email: company.email,
        phone: company.phone,
        isVerified: company.is_verified,
        trialExpiresAt: company.trial_expires_at,
        createdAt: company.created_at
      }

      const mappedSubscriptions = subscriptions.map((s: any) => ({
        id: s.id,
        companyId: s.company_id,
        planId: s.plan_id,
        status: s.status,
        trialStart: s.trial_start,
        trialEnd: s.trial_end,
        currentPeriodStart: s.current_period_start,
        currentPeriodEnd: s.current_period_end,
        canceledAt: s.canceled_at,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        planName: s.plan_name,
        planNameEn: s.plan_name_en,
        interval: s.interval,
        price: s.price
      }))

      const mappedPayments = payments.map((p: any) => ({
        id: p.id,
        companyId: p.company_id,
        subscriptionId: p.subscription_id,
        planId: p.plan_id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        paymentMethod: p.payment_method,
        paymentProvider: p.payment_provider,
        providerPaymentId: p.provider_payment_id,
        invoiceUrl: p.invoice_url,
        paidAt: p.paid_at,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        planName: p.plan_name
      }))

      res.json({
        success: true,
        company: mappedCompany,
        subscriptions: mappedSubscriptions,
        payments: mappedPayments
      })
    } catch (err) {
      console.error('[ADMIN] Failed to fetch company subscription:', err)
      res.status(500).json({ error: 'فشل جلب تفاصيل الاشتراك' })
    }
  }
)

/**
 * POST /api/admin/subscriptions/report/send
 * طلب إرسال التقرير (فوراً أو مجدولاً)
 */
adminSubscriptionRouter.post(
  '/report/send',
  requireAdminRole,
  reportSendRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const { email, scheduleDate } = req.body
      const targetEmail = email || 'slaehmap@gmail.com'

      if (scheduleDate && new Date(scheduleDate) > new Date()) {
        // حفظ في الجدولة
        await query(
          `INSERT INTO scheduled_reports (target_email, report_type, send_at, status) VALUES ($1, 'users_report', $2, 'pending')`,
          [targetEmail, new Date(scheduleDate)]
        )
        return res.json({ success: true, message: 'تمت جدولة إرسال التقرير بنجاح' })
      } else {
        // إرسال فوري
        const html = await generateUsersReportHTML()
        await sendUsersReportEmail(targetEmail, html)
        return res.json({ success: true, message: 'تم إرسال التقرير بنجاح' })
      }
    } catch (err) {
      console.error('[ADMIN] Failed to send/schedule report:', err)
      res.status(500).json({ error: 'فشل إرسال التقرير' })
    }
  }
)

/**
 * POST /api/admin/subscriptions/create-direct
 * Create a subscriber directly without email verification (for direct sales)
 */
adminSubscriptionRouter.post('/create-direct', requireAdminRole, async (req: Request, res: Response) => {
  try {
    const { username, password, fullName, email, phone, planId, durationMonths, durationYears, lifetime } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' })
    }

    if (!/^[a-zA-Z0-9_]{4,20}$/.test(username)) {
      return res.status(400).json({ error: 'اسم المستخدم يجب أن يكون إنجليزي فقط (4-20 حرف)' })
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' })
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل' })
    }
    if (!/[a-z]/.test(password)) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل' })
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل' })
    }

    const companyId = uuidv4()
    const passwordHash = await bcrypt.hash(password, 12)
    const trialExpiresAt = new Date()
    trialExpiresAt.setFullYear(trialExpiresAt.getFullYear() + 10)

    // 1. Create company (auto-verified)
    await query(
      'INSERT INTO companies (id, name, email, phone, is_verified, trial_expires_at) VALUES ($1, $2, $3, $4, TRUE, $5)',
      [companyId, fullName || username, email || null, phone || null, trialExpiresAt]
    )

    // 2. Create user (must_change_password=TRUE, created_by_admin)
    await query(
      `INSERT INTO users (id, company_id, username, full_name, password_hash, role_key, is_active, must_change_password, recovery_email, created_by)
       VALUES ($1, $2, $3, $4, $5, 'admin', TRUE, TRUE, $6, $7)`,
      [uuidv4(), companyId, username, fullName || username, passwordHash, email || null, req.auth!.userId]
    )

    // 3. Seed firm_data defaults
    const firmDefaults: [string, any][] = [
      ['officeName', fullName || username],
      ['theme', 'light'],
      ['activityLogRetentionDays', 365],
      ['taskNotificationsEnabled', true],
      ['taskNotificationLeadDays', 1]
    ]
    for (const [key, value] of firmDefaults) {
      await query('INSERT INTO firm_data (id, company_id, key, value) VALUES ($1, $2, $3, $4)', [
        uuidv4(), companyId, key, JSON.stringify(value)
      ])
    }

    // 4. Create subscription
    if (planId) {
      const planResult = await query('SELECT id, interval FROM plans WHERE id = $1', [planId])
      if (planResult.rows.length > 0) {
        const now = new Date()
        let periodEnd = new Date(now)
        if (lifetime) {
          periodEnd.setFullYear(2099, 11, 31)
        } else if (durationYears && durationYears > 0) {
          periodEnd.setFullYear(periodEnd.getFullYear() + Math.min(Number(durationYears), 100))
        } else if (durationMonths && durationMonths > 0) {
          periodEnd.setMonth(periodEnd.getMonth() + Math.min(Number(durationMonths), 1200))
        } else {
          const interval = planResult.rows[0].interval
          if (interval === 'year') periodEnd.setFullYear(periodEnd.getFullYear() + 1)
          else periodEnd.setMonth(periodEnd.getMonth() + 1)
        }

        await query(
          `INSERT INTO subscriptions (id, company_id, plan_id, status, current_period_start, current_period_end, trial_start, trial_end)
           VALUES ($1, $2, $3, 'active', $4, $5, $4, $5)`,
          [uuidv4(), companyId, planId, now, periodEnd]
        )

        await query('UPDATE companies SET trial_expires_at = $1, updated_at = NOW() WHERE id = $2', [
          periodEnd, companyId
        ])
      }
    } else {
      // Create trial subscription
      const planResult = await query('SELECT id FROM plans LIMIT 1')
      const fallbackPlanId = planResult.rows.length > 0 ? planResult.rows[0].id : null
      const trialEnd = new Date()
      trialEnd.setDate(trialEnd.getDate() + 30)
      await query(
        `INSERT INTO subscriptions (id, company_id, plan_id, status, trial_start, trial_end, current_period_start, current_period_end)
         VALUES ($1, $2, $3, 'trial', NOW(), $4, NOW(), $4)`,
        [uuidv4(), companyId, fallbackPlanId, trialEnd]
      )
    }

    res.json({
      success: true,
      message: 'تم إنشاء المشترك بنجاح',
      companyId,
      username,
      mustChangePassword: true
    })
  } catch (err: any) {
    console.error('[ADMIN] Failed to create direct subscriber:', err)
    if (err.code === '23505') {
      return res.status(400).json({ error: 'اسم المستخدم أو البريد الإلكتروني مسجل مسبقاً' })
    }
    res.status(500).json({ error: 'فشل إنشاء المشترك' })
  }
})

// Background worker to process scheduled reports every minute
setInterval(async () => {
  try {
    const pendingReports = await query(`
      SELECT id, target_email 
      FROM scheduled_reports 
      WHERE status = 'pending' AND send_at <= NOW()
    `)

    for (const report of pendingReports.rows) {
      try {
        const html = await generateUsersReportHTML()
        await sendUsersReportEmail(report.target_email, html)

        await query(`UPDATE scheduled_reports SET status = 'sent' WHERE id = $1`, [report.id])
        console.log(`[SCHEDULED_REPORTS] Sent report to ${report.target_email}`)
      } catch (err) {
        console.error(`[SCHEDULED_REPORTS] Failed to send report id ${report.id}:`, err)
        await query(`UPDATE scheduled_reports SET status = 'failed' WHERE id = $1`, [report.id])
      }
    }
  } catch (err) {
    console.error('[SCHEDULED_REPORTS] Error in background worker:', err)
  }
}, 60000)
