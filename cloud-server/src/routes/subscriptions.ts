import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { query } from '../db/connection'
import { authMiddleware, AuthPayload } from '../middleware/auth'

export const subscriptionRouter = Router()

subscriptionRouter.use(authMiddleware)

// GET /api/subscriptions/plans - List all active plans
subscriptionRouter.get('/plans', async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM plans WHERE is_active = true ORDER BY sort_order ASC')
    res.json(result.rows)
  } catch (err) {
    console.error('[SUBSCRIPTIONS] Failed to fetch plans:', err)
    res.status(500).json({ error: 'فشل في جلب الباقات' })
  }
})

// GET /api/subscriptions/status - Get current subscription status
subscriptionRouter.get('/status', async (req: Request, res: Response) => {
  try {
    const auth = req.auth as AuthPayload
    const result = await query(
      `SELECT s.*, p.name as plan_name, p.name_ar as plan_name_ar, p.price, p.interval as plan_interval
       FROM subscriptions s
       LEFT JOIN plans p ON s.plan_id = p.id
       WHERE s.company_id = $1
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [auth.companyId]
    )

    if (result.rows.length === 0) {
      // No subscription found - check trial from companies table
      const companyResult = await query(
        'SELECT trial_expires_at, is_verified FROM companies WHERE id = $1',
        [auth.companyId]
      )
      if (companyResult.rows.length === 0) {
        res.status(404).json({ error: 'الشركة غير موجودة' })
        return
      }
      const company = companyResult.rows[0]
      const trialEnd = new Date(company.trial_expires_at)
      const now = new Date()
      const daysLeft = Math.max(
        0,
        Math.floor((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      )

      res.json({
        status: 'trial',
        trialEnd: trialEnd.toISOString(),
        daysLeft,
        isExpired: trialEnd < now,
        planName: 'تجربة مجانية',
        planNameAr: 'تجربة مجانية',
        isActive: !(trialEnd < now)
      })
      return
    }

    const sub = result.rows[0]
    const now = new Date()
    let isExpired = false
    let daysLeft = 0

    if (sub.status === 'trial' || sub.status === 'active') {
      const endDate = sub.current_period_end
        ? new Date(sub.current_period_end)
        : new Date(sub.trial_end)
      daysLeft = Math.max(
        0,
        Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      )
      isExpired = endDate < now
    }

    res.json({
      id: sub.id,
      status: sub.status,
      trialStart: sub.trial_start,
      trialEnd: sub.trial_end,
      currentPeriodStart: sub.current_period_start,
      currentPeriodEnd: sub.current_period_end,
      canceledAt: sub.canceled_at,
      daysLeft,
      isExpired,
      planName: sub.plan_name,
      planNameAr: sub.plan_name_ar,
      planPrice: sub.price,
      planInterval: sub.plan_interval,
      isActive: sub.status === 'active' || (sub.status === 'trial' && !isExpired)
    })
  } catch (err) {
    console.error('[SUBSCRIPTIONS] Failed to get status:', err)
    res.status(500).json({ error: 'فشل في جلب حالة الاشتراك' })
  }
})

// POST /api/subscriptions/create-payment-intent - Create payment for a plan
subscriptionRouter.post('/create-payment-intent', async (req: Request, res: Response) => {
  try {
    const auth = req.auth as AuthPayload
    const { planId } = req.body

    if (!planId) {
      res.status(400).json({ error: 'معرف الباقة مطلوب' })
      return
    }

    // Get plan details
    const planResult = await query('SELECT * FROM plans WHERE id = $1 AND is_active = true', [
      planId
    ])
    if (planResult.rows.length === 0) {
      res.status(404).json({ error: 'الباقة غير موجودة' })
      return
    }

    const plan = planResult.rows[0]

    // Check if company already has an active subscription
    const existingSub = await query(
      `SELECT * FROM subscriptions
       WHERE company_id = $1 AND status IN ('active', 'trial')
       AND (current_period_end IS NULL OR current_period_end > NOW())
       ORDER BY created_at DESC LIMIT 1`,
      [auth.companyId]
    )

    if (existingSub.rows.length > 0) {
      const sub = existingSub.rows[0]
      if (plan.interval === 'lifetime' || sub.status === 'active') {
        // Upgrade to lifetime or extend existing active sub
      } else {
        // Already has active subscription
        res.json({
          requiresConfirmation: true,
          message: 'لديك اشتراك نشط حالياً. هل تريد الترقية؟',
          currentPlan: plan.name
        })
        return
      }
    }

    // Create a payment record
    const paymentId = uuidv4()
    await query(
      `INSERT INTO payments (id, company_id, plan_id, amount, currency, status, payment_method)
       VALUES ($1, $2, $3, $4, 'SAR', 'pending', 'card')`,
      [paymentId, auth.companyId, planId, plan.price]
    )

    // In production: integrate with Stripe/Moyasar/Tabby here
    // For now, simulate payment approval
    const simulatedPaymentUrl = `/api/subscriptions/confirm-payment/${paymentId}`

    res.json({
      paymentId,
      amount: plan.price,
      currency: 'SAR',
      plan: {
        id: plan.id,
        name: plan.name,
        nameAr: plan.name_ar,
        interval: plan.interval,
        price: plan.price
      },
      paymentUrl: simulatedPaymentUrl,
      // Simulated - in production, return Stripe client_secret or payment gateway URL
      clientSecret: `sim_${paymentId}_${Date.now()}`
    })
  } catch (err) {
    console.error('[SUBSCRIPTIONS] Failed to create payment intent:', err)
    res.status(500).json({ error: 'فشل إنشاء عملية الدفع' })
  }
})

// POST /api/subscriptions/confirm-payment/:paymentId - Confirm payment and activate subscription
subscriptionRouter.post('/confirm-payment/:paymentId', async (req: Request, res: Response) => {
  try {
    const auth = req.auth as AuthPayload
    const { paymentId } = req.params

    // Get payment record
    const paymentResult = await query('SELECT * FROM payments WHERE id = $1 AND company_id = $2', [
      paymentId,
      auth.companyId
    ])
    if (paymentResult.rows.length === 0) {
      res.status(404).json({ error: 'الدفعة غير موجودة' })
      return
    }

    const payment = paymentResult.rows[0]
    if (payment.status !== 'pending') {
      res.status(400).json({ error: 'تم معالجة الدفعة بالفعل' })
      return
    }

    // Get plan details
    const planResult = await query('SELECT * FROM plans WHERE id = $1', [payment.plan_id])
    if (planResult.rows.length === 0) {
      res.status(404).json({ error: 'الباقة غير موجودة' })
      return
    }

    const plan = planResult.rows[0]
    const now = new Date()

    // Calculate subscription period
    let periodEnd = new Date(now)
    if (plan.interval === 'month') {
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    } else if (plan.interval === 'year') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    } else if (plan.interval === 'lifetime') {
      periodEnd.setFullYear(2099, 11, 31) // Far future for lifetime
    }

    // Update payment status
    await query(
      `UPDATE payments SET status = 'completed', paid_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [paymentId]
    )

    // Create or update subscription
    const existingSub = await query(
      `SELECT id FROM subscriptions WHERE company_id = $1 AND status IN ('trial', 'active')
       ORDER BY created_at DESC LIMIT 1`,
      [auth.companyId]
    )

    if (existingSub.rows.length > 0) {
      // Update existing subscription
      await query(
        `UPDATE subscriptions
         SET plan_id = $1, status = 'active', current_period_start = $2,
             current_period_end = $3, updated_at = NOW()
         WHERE id = $4`,
        [plan.id, now, periodEnd, existingSub.rows[0].id]
      )
    } else {
      // Create new subscription
      const subId = uuidv4()
      await query(
        `INSERT INTO subscriptions (id, company_id, plan_id, status, trial_start, trial_end,
          current_period_start, current_period_end)
         VALUES ($1, $2, $3, 'active', NOW(), NOW(), $4, $5)`,
        [subId, auth.companyId, plan.id, now, periodEnd]
      )
    }

    // Link payment to subscription
    const subResult = await query(
      `SELECT id FROM subscriptions WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [auth.companyId]
    )
    if (subResult.rows.length > 0) {
      await query('UPDATE payments SET subscription_id = $1 WHERE id = $2', [
        subResult.rows[0].id,
        paymentId
      ])
    }

    // Extend trial_expires_at in companies table to prevent write blocking
    await query('UPDATE companies SET trial_expires_at = $1, updated_at = NOW() WHERE id = $2', [
      periodEnd,
      auth.companyId
    ])

    res.json({
      success: true,
      message: 'تم تفعيل الاشتراك بنجاح',
      subscription: {
        status: 'active',
        currentPeriodEnd: periodEnd.toISOString(),
        planName: plan.name,
        planNameAr: plan.name_ar
      }
    })
  } catch (err) {
    console.error('[SUBSCRIPTIONS] Failed to confirm payment:', err)
    res.status(500).json({ error: 'فشل تأكيد الدفع' })
  }
})

// POST /api/subscriptions/cancel - Cancel subscription
subscriptionRouter.post('/cancel', async (req: Request, res: Response) => {
  try {
    const auth = req.auth as AuthPayload

    const result = await query(
      `UPDATE subscriptions
       SET status = 'canceled', canceled_at = NOW(), updated_at = NOW()
       WHERE company_id = $1 AND status = 'active'
       RETURNING *`,
      [auth.companyId]
    )

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'لا يوجد اشتراك نشط' })
      return
    }

    res.json({
      success: true,
      message: 'تم إلغاء الاشتراك. سيبقى نشطاً حتى نهاية الفترة المدفوعة.'
    })
  } catch (err) {
    console.error('[SUBSCRIPTIONS] Failed to cancel:', err)
    res.status(500).json({ error: 'فشل إلغاء الاشتراك' })
  }
})

// POST /api/subscriptions/start-trial - Manually start trial (for Google OAuth auto-created accounts)
subscriptionRouter.post('/start-trial', async (req: Request, res: Response) => {
  try {
    const auth = req.auth as AuthPayload
    const now = new Date()
    const trialEnd = new Date(now)
    trialEnd.setDate(trialEnd.getDate() + 30)

    // Check if subscription already exists
    const existing = await query('SELECT id FROM subscriptions WHERE company_id = $1', [
      auth.companyId
    ])

    if (existing.rows.length === 0) {
      await query(
        `INSERT INTO subscriptions (id, company_id, status, trial_start, trial_end)
         VALUES ($1, $2, 'trial', $3, $4)`,
        [uuidv4(), auth.companyId, now, trialEnd]
      )
    }

    res.json({
      success: true,
      message: 'بدأت الفترة التجريبية',
      trialEnd: trialEnd.toISOString()
    })
  } catch (err) {
    console.error('[SUBSCRIPTIONS] Failed to start trial:', err)
    res.status(500).json({ error: 'فشل بدء الفترة التجريبية' })
  }
})
