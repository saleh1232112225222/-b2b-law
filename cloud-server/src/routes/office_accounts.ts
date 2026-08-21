import { Router } from 'express'
import { getClient, query } from '../db/connection'
import { authMiddleware } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { applyAccountMovement } from '../services/accounting.service'

const router = Router()
router.use(authMiddleware)

// ═══════════════════════════════════════════════════
// الدالة المساعدة: upsertClientAccount
// ═══════════════════════════════════════════════════
async function upsertClientAccount(companyId: string, clientId: string, db: any = { query }) {
  if (!clientId) return

  const result = await db.query(
    `
    SELECT
      COALESCE(SUM(e.financial_compensation + e.tax + COALESCE(e.late_fee_amount, 0)), 0) as total_due,
      COALESCE(SUM(e.paid_amount), 0) as total_paid,
      COALESCE(SUM(GREATEST(e.financial_compensation + e.tax + COALESCE(e.late_fee_amount, 0) - e.paid_amount, 0)), 0) as balance
    FROM legal_engagements e
    WHERE e.client_id = $1 AND e.company_id = $2 AND e.deleted_at IS NULL
  `,
    [clientId, companyId]
  )

  const { total_due, total_paid, balance } = result.rows[0]

  const overdueResult = await db.query(
    `
    SELECT COALESCE(SUM(ps.amount - ps.paid_amount), 0) as overdue_amount
    FROM payment_schedules ps
    JOIN legal_engagements e ON ps.legal_engagement_id = e.id
    WHERE e.client_id = $1 AND ps.company_id = $2
      AND ps.status <> 'cancelled' AND ps.due_date < CURRENT_DATE
  `,
    [clientId, companyId]
  )
  const overdue_amount = Number(overdueResult.rows[0].overdue_amount)

  const totalDueNum = Number(total_due)
  const totalPaidNum = Number(total_paid)
  const balanceNum = Number(balance)

  const status = balanceNum <= 0 ? 'settled' : overdue_amount > 0 ? 'overdue' : 'active'

  const lastPaymentResult = await db.query(
    `SELECT MAX(ph.received_at)::date AS last_payment_date
     FROM payment_history ph
     JOIN legal_engagements e ON e.id = ph.legal_engagement_id
     WHERE e.client_id = $1 AND ph.company_id = $2`,
    [clientId, companyId]
  )

  await db.query(
    `
    INSERT INTO client_accounts (company_id, client_id, total_due, total_paid, balance, overdue_amount, last_payment_date, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (company_id, client_id) DO UPDATE SET
      total_due = $3, total_paid = $4, balance = $5, overdue_amount = $6,
      last_payment_date = $7, status = $8, updated_at = NOW()
  `,
    [
      companyId, clientId, totalDueNum, totalPaidNum, balanceNum, overdue_amount,
      lastPaymentResult.rows[0]?.last_payment_date || null, status
    ]
  )
}

// ═══════════════════════════════════════════════════
// 1. POST /engagements/:id/payments — تسجيل دفعة
// ═══════════════════════════════════════════════════
router.post(
  '/engagements/:id/payments',
  requirePermission('create_finances'),
  async (req: any, res) => {
    const client = await getClient()
    try {
      await client.query('BEGIN')
      const { companyId, userId } = req.auth
      const { id } = req.params
      const { amount, payment_method, payment_schedule_id, notes } = req.body

      const paidAmount = Number(amount)
      if (isNaN(paidAmount) || paidAmount <= 0) {
        await client.query('ROLLBACK')
        return res.status(400).json({ error: 'مبلغ غير صحيح' })
      }

      // 1. جلب بيانات الـ engagement
      const engResult = await client.query(
        `
        SELECT * FROM legal_engagements
        WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL FOR UPDATE
      `,
        [id, companyId]
      )
      if (!engResult.rows.length) {
        await client.query('ROLLBACK')
        return res.status(404).json({ error: 'الخدمة القانونية غير موجودة' })
      }

      const eng = engResult.rows[0]
      const totalDue = Number(eng.financial_compensation || 0) + Number(eng.tax || 0) + Number(eng.late_fee_amount || 0)
      const currentPaid = Number(eng.paid_amount || 0)
      const remaining = Math.max(0, totalDue - currentPaid)
      if (paidAmount > remaining + 0.001) {
        await client.query('ROLLBACK')
        return res.status(400).json({ error: 'مبلغ الدفعة يتجاوز المبلغ المتبقي' })
      }
      const newPaidAmount = Math.round((currentPaid + paidAmount) * 100) / 100
      const newRemaining = Math.max(0, Math.round((totalDue - newPaidAmount) * 100) / 100)
      const newStatus =
        newPaidAmount >= totalDue ? 'paid' : newPaidAmount > 0 ? 'partial' : 'pending'

      // 2. تحديث legal_engagements
      await client.query(
        `
        UPDATE legal_engagements
        SET paid_amount = $1, remaining_amount = $2, finance_status = $3, updated_at = NOW()
        WHERE id = $4 AND company_id = $5
      `,
        [newPaidAmount, newRemaining, newStatus, id, companyId]
      )

      // 3. تحديث finances المرتبطة
      await client.query(
        `
        UPDATE finances
        SET paid_amount = $1, remaining_amount = $2, status = $3, updated_at = NOW()
        WHERE legal_engagement_id = $4 AND company_id = $5
      `,
        [newPaidAmount, newRemaining, newStatus, id, companyId]
      )

      // 4. إنشاء سند قبض (voucher)
      const voucherNumber = `VCH-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`

      const voucherResult = await client.query(
        `
        INSERT INTO vouchers (company_id, client_id, case_id, account_id, voucher_number,
          type, amount, date, payment_method, notes, reference_type, reference_id, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, 'receipt', $6, CURRENT_DATE, $7, $8, 'legal_engagement', $9, $10)
        RETURNING id
      `,
        [
          companyId,
          eng.client_id,
          eng.case_id,
          req.body.account_id,
          voucherNumber,
          paidAmount,
          payment_method || 'cash',
          notes || `دفعة للخدمة القانونية ${eng.engagement_number}`,
          id,
          userId
        ]
      )
      const voucherId = voucherResult.rows[0].id
      await applyAccountMovement(client, companyId, req.body.account_id, 'receipt', paidAmount)

      // 5. تسجيل في payment_history
      await client.query(
        `
        INSERT INTO payment_history (company_id, legal_engagement_id, payment_schedule_id,
          amount, payment_method, voucher_id, notes, received_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
        [
          companyId,
          id,
          payment_schedule_id || null,
          paidAmount,
          payment_method || 'cash',
          voucherId,
          notes || null,
          userId
        ]
      )

      // 6. تحديث payment_schedule إذا كان الدفع مرتبطاً بقسط
      if (payment_schedule_id) {
        const schedResult = await client.query(
          `SELECT paid_amount, amount FROM payment_schedules
           WHERE id = $1 AND company_id = $2 AND legal_engagement_id = $3 FOR UPDATE`,
          [payment_schedule_id, companyId, id]
        )
        if (!schedResult.rows.length) {
          throw Object.assign(new Error('القسط المحدد لا يتبع هذه الخدمة'), { status: 400 })
        }
        const sched = schedResult.rows[0]
        const schedRemaining = Number(sched.amount) - Number(sched.paid_amount || 0)
        if (paidAmount > schedRemaining + 0.001) {
          throw Object.assign(new Error('مبلغ الدفعة يتجاوز المتبقي في القسط'), { status: 400 })
        }
        const newSchedPaid = Math.round((Number(sched.paid_amount || 0) + paidAmount) * 100) / 100
        const schedStatus = newSchedPaid >= Number(sched.amount) - 0.001 ? 'paid' : 'pending'
        await client.query(
            `
            UPDATE payment_schedules
            SET paid_amount = $1, paid_date = CASE WHEN $2 = 'paid' THEN CURRENT_DATE ELSE NULL END,
              status = $2, voucher_id = $3, updated_at = NOW()
            WHERE id = $4 AND company_id = $5
          `,
            [newSchedPaid, schedStatus, voucherId, payment_schedule_id, companyId]
          )
      }

      // 7. تحديث client_accounts
      await upsertClientAccount(companyId, eng.client_id, client)
      await client.query('COMMIT')

      res.json({
        success: true,
        paid_amount: newPaidAmount,
        remaining_amount: newRemaining,
        finance_status: newStatus,
        voucher_id: voucherId,
        voucher_number: voucherNumber
      })
    } catch (err: any) {
      await client.query('ROLLBACK')
      console.error('[office-accounts] POST /payments error:', err.message)
      res.status(err.status || 500).json({ error: err.status ? err.message : 'حدث خطأ في تسجيل الدفعة' })
    } finally {
      client.release()
    }
  }
)

// ═══════════════════════════════════════════════════
// 2. GET /engagements/:id/payments — سجل الدفعات
// ═══════════════════════════════════════════════════
router.get(
  '/engagements/:id/payments',
  requirePermission('view_finances'),
  async (req: any, res) => {
    try {
      const { companyId } = req.auth
      const { id } = req.params
      const result = await query(
        `
        SELECT ph.*, v.voucher_number
        FROM payment_history ph
        LEFT JOIN vouchers v ON ph.voucher_id = v.id
        WHERE ph.legal_engagement_id = $1 AND ph.company_id = $2
        ORDER BY ph.received_at DESC
      `,
        [id, companyId]
      )
      res.json(result.rows)
    } catch (err: any) {
      console.error('[office-accounts] GET /payments error:', err.message)
      res.status(500).json({ error: 'حدث خطأ في جلب سجل الدفعات' })
    }
  }
)

// ═══════════════════════════════════════════════════
// 3. POST /engagements/:id/installments — إنشاء جدول أقساط
// ═══════════════════════════════════════════════════
router.post(
  '/engagements/:id/installments',
  requirePermission('create_finances'),
  async (req: any, res) => {
    const client = await getClient()
    try {
      await client.query('BEGIN')
      const { companyId } = req.auth
      const { id } = req.params
      const { installments, frequency } = req.body

      if (!Array.isArray(installments) || installments.length === 0) {
        await client.query('ROLLBACK')
        return res.status(400).json({ error: 'يجب تحديد الأقساط' })
      }

      const normalized = installments.map((inst: any) => ({
        title: String(inst.title || '').trim(),
        amount: Number(inst.amount),
        due_date: inst.due_date
      }))
      if (normalized.some((inst: any) => !inst.title || !Number.isFinite(inst.amount) || inst.amount <= 0 || !inst.due_date)) {
        await client.query('ROLLBACK')
        return res.status(400).json({ error: 'بيانات الأقساط غير مكتملة أو غير صحيحة' })
      }

      // التحقق من وجود الـ engagement
      const engCheck = await client.query(
        `SELECT id, financial_compensation, tax, late_fee_amount, paid_amount
         FROM legal_engagements WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL FOR UPDATE`,
        [id, companyId]
      )
      if (!engCheck.rows.length) {
        await client.query('ROLLBACK')
        return res.status(404).json({ error: 'الخدمة القانونية غير موجودة' })
      }
      const engagement = engCheck.rows[0]
      const remaining = Math.max(
        0,
        Number(engagement.financial_compensation || 0) + Number(engagement.tax || 0) +
          Number(engagement.late_fee_amount || 0) - Number(engagement.paid_amount || 0)
      )
      const scheduleTotal = normalized.reduce((sum: number, inst: any) => sum + inst.amount, 0)
      if (Math.abs(scheduleTotal - remaining) > 0.01) {
        await client.query('ROLLBACK')
        return res.status(400).json({ error: `مجموع الأقساط يجب أن يساوي المتبقي (${remaining.toFixed(2)})` })
      }

      // حذف الأقساط القديمة
      await client.query(
        'DELETE FROM payment_schedules WHERE legal_engagement_id = $1 AND company_id = $2',
        [id, companyId]
      )

      // إنشاء أقساط جديدة
      for (let i = 0; i < normalized.length; i++) {
        const inst = normalized[i]
        await client.query(
          `
          INSERT INTO payment_schedules (company_id, legal_engagement_id,
            installment_number, title, amount, due_date)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
          [companyId, id, i + 1, inst.title, Number(inst.amount), inst.due_date]
        )
      }

      // تحديث legal_engagements
      await client.query(
        `
        UPDATE legal_engagements
        SET installment_count = $1, installment_frequency = $2, updated_at = NOW()
        WHERE id = $3
      `,
        [normalized.length, frequency || 'monthly', id]
      )

      // تحديث finances
      await client.query(
        `
        UPDATE finances SET payment_schedules_count = $1, updated_at = NOW()
        WHERE legal_engagement_id = $2 AND company_id = $3
      `,
        [normalized.length, id, companyId]
      )

      await client.query('COMMIT')
      res.json({ success: true, count: normalized.length })
    } catch (err: any) {
      await client.query('ROLLBACK')
      console.error('[office-accounts] POST /installments error:', err.message)
      res.status(500).json({ error: 'حدث خطأ في إنشاء جدول الأقساط' })
    } finally {
      client.release()
    }
  }
)

// ═══════════════════════════════════════════════════
// 4. GET /engagements/:id/installments — عرض الأقساط
// ═══════════════════════════════════════════════════
router.get(
  '/engagements/:id/installments',
  requirePermission('view_finances'),
  async (req: any, res) => {
    try {
      const { companyId } = req.auth
      const { id } = req.params
      const result = await query(
        `
        SELECT ps.*, v.voucher_number
        FROM payment_schedules ps
        LEFT JOIN vouchers v ON ps.voucher_id = v.id
        WHERE ps.legal_engagement_id = $1 AND ps.company_id = $2
        ORDER BY ps.installment_number
      `,
        [id, companyId]
      )
      res.json(result.rows)
    } catch (err: any) {
      console.error('[office-accounts] GET /installments error:', err.message)
      res.status(500).json({ error: 'حدث خطأ في جلب الأقساط' })
    }
  }
)

// ═══════════════════════════════════════════════════
// 5. PUT /engagements/:id/adjust-fee — تعديل الأتعاب
// ═══════════════════════════════════════════════════
router.put(
  '/engagements/:id/adjust-fee',
  requirePermission('create_finances'),
  async (req: any, res) => {
    const client = await getClient()
    try {
      await client.query('BEGIN')
      const { companyId, userId } = req.auth
      const { id } = req.params
      const { new_compensation, reason, adjustment_type } = req.body

      const newComp = Number(new_compensation)
      if (isNaN(newComp) || newComp < 0) {
        await client.query('ROLLBACK')
        return res.status(400).json({ error: 'قيمة الأتعاب غير صحيحة' })
      }

      const engResult = await client.query(
        `
        SELECT * FROM legal_engagements WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL FOR UPDATE
      `,
        [id, companyId]
      )
      if (!engResult.rows.length) {
        await client.query('ROLLBACK')
        return res.status(404).json({ error: 'غير موجود' })
      }

      const eng = engResult.rows[0]
      const oldCompensation = Number(eng.financial_compensation || 0)
      const oldTax = Number(eng.tax || 0)
      const effectiveTaxRate = oldCompensation > 0 ? oldTax / oldCompensation : 0
      const tax = Math.round(newComp * effectiveTaxRate * 100) / 100
      const paidAmount = Number(eng.paid_amount || 0)
      const originalCompensation = eng.original_compensation || oldCompensation
      if (newComp + tax < paidAmount - 0.001) {
        await client.query('ROLLBACK')
        return res.status(400).json({ error: 'لا يمكن خفض إجمالي الأتعاب إلى أقل من المبلغ المحصل' })
      }
      const newRemaining = Math.max(0, newComp + tax + Number(eng.late_fee_amount || 0) - paidAmount)

      await client.query(
        `
        UPDATE legal_engagements SET
          financial_compensation = $1,
          tax = $2,
          remaining_amount = $3,
          original_compensation = $4,
          discount_amount = $5,
          discount_reason = $6,
          updated_by = $7,
          updated_at = NOW()
        WHERE id = $8 AND company_id = $9
      `,
        [
          newComp,
          tax,
          newRemaining,
          originalCompensation,
          adjustment_type === 'decrease' ? oldCompensation - newComp : 0,
          reason || null,
          userId,
          id,
          companyId
        ]
      )

      // تحديث finances
      await client.query(
        `
        UPDATE finances SET
          amount = $1, total = $2, remaining_amount = $3, updated_at = NOW()
        WHERE legal_engagement_id = $4 AND company_id = $5
      `,
        [newComp, newComp + tax, newRemaining, id, companyId]
      )

      // تحديث client_accounts
      if (eng.client_id) await upsertClientAccount(companyId, eng.client_id, client)
      await client.query('COMMIT')

      res.json({ success: true, old_compensation: oldCompensation, new_compensation: newComp })
    } catch (err: any) {
      await client.query('ROLLBACK')
      console.error('[office-accounts] PUT /adjust-fee error:', err.message)
      res.status(500).json({ error: 'حدث خطأ في تعديل الأتعاب' })
    } finally {
      client.release()
    }
  }
)

// ═══════════════════════════════════════════════════
// 6. POST /engagements/:id/close-finance — إغلاق الحساب
// ═══════════════════════════════════════════════════
router.post(
  '/engagements/:id/close-finance',
  requirePermission('create_finances'),
  async (req: any, res) => {
    const client = await getClient()
    try {
      await client.query('BEGIN')
      const { companyId } = req.auth
      const { id } = req.params

      const engResult = await client.query(
        `
        SELECT remaining_amount, client_id FROM legal_engagements
        WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL FOR UPDATE
      `,
        [id, companyId]
      )
      if (!engResult.rows.length) {
        await client.query('ROLLBACK')
        return res.status(404).json({ error: 'غير موجود' })
      }

      const remaining = Number(engResult.rows[0].remaining_amount || 0)
      if (Math.abs(remaining) > 0.01) {
        await client.query('ROLLBACK')
        return res.status(400).json({ error: 'لا يمكن إغلاق الحساب — لا تزال هناك مبالغ مستحقة' })
      }

      await client.query(
        `
        UPDATE legal_engagements SET finance_status = 'closed', updated_at = NOW()
        WHERE id = $1 AND company_id = $2
      `,
        [id, companyId]
      )

      await client.query(
        `
        UPDATE finances SET finance_status = 'closed', updated_at = NOW()
        WHERE legal_engagement_id = $1 AND company_id = $2
      `,
        [id, companyId]
      )

      // تحديث client_accounts
      const clientId = engResult.rows[0].client_id
      if (clientId) await upsertClientAccount(companyId, clientId, client)
      await client.query('COMMIT')

      res.json({ success: true })
    } catch (err: any) {
      await client.query('ROLLBACK')
      console.error('[office-accounts] POST /close-finance error:', err.message)
      res.status(500).json({ error: 'حدث خطأ في إغلاق الحساب' })
    } finally {
      client.release()
    }
  }
)

// ═══════════════════════════════════════════════════
// 7. GET /clients/:clientId/financial-summary — ملخص مالي للعميل
// ═══════════════════════════════════════════════════
router.get(
  '/clients/:clientId/financial-summary',
  requirePermission('view_finances'),
  async (req: any, res) => {
    try {
      const { companyId } = req.auth
      const { clientId } = req.params

      // 1. الملخص الإجمالي
      const summaryResult = await query(
        `
        SELECT
          COUNT(*) as total_services,
          COALESCE(SUM(e.financial_compensation + e.tax + COALESCE(e.late_fee_amount, 0)), 0) as total_due,
          COALESCE(SUM(e.paid_amount), 0) as total_paid,
          COALESCE(SUM(GREATEST(e.financial_compensation + e.tax + COALESCE(e.late_fee_amount, 0) - e.paid_amount, 0)), 0) as balance,
          COALESCE(SUM(CASE WHEN e.finance_status = 'overdue' THEN GREATEST(e.financial_compensation + e.tax + COALESCE(e.late_fee_amount, 0) - e.paid_amount, 0) ELSE 0 END), 0) as overdue_amount
        FROM legal_engagements e
        WHERE e.client_id = $1 AND e.company_id = $2 AND e.deleted_at IS NULL
      `,
        [clientId, companyId]
      )

      // 2. كل الخدمات القانونية (من البداية)
      const servicesResult = await query(
        `
        SELECT e.id, e.engagement_number, e.financial_compensation, e.tax,
          (e.financial_compensation + e.tax + COALESCE(e.late_fee_amount, 0)) as total_amount,
          e.paid_amount,
          GREATEST(e.financial_compensation + e.tax + COALESCE(e.late_fee_amount, 0) - e.paid_amount, 0) AS remaining_amount,
          e.finance_status, e.start_date,
          e.payment_method, e.description,
          c.name_ar as category_name, t.name_ar as service_type_name
        FROM legal_engagements e
        LEFT JOIN legal_service_categories c ON e.category_id = c.id
        LEFT JOIN legal_service_types t ON e.engagement_type_id = t.id
        WHERE e.client_id = $1 AND e.company_id = $2 AND e.deleted_at IS NULL
        ORDER BY e.created_at DESC
      `,
        [clientId, companyId]
      )

      // 3. سجل الدفعات الكامل
      const paymentsResult = await query(
        `
        SELECT ph.id, ph.amount, ph.payment_method, ph.received_at,
          ph.voucher_id, ph.notes,
          e.engagement_number, e.id as engagement_id,
          t.name_ar as service_type_name,
          v.voucher_number
        FROM payment_history ph
        JOIN legal_engagements e ON ph.legal_engagement_id = e.id
        LEFT JOIN legal_service_types t ON e.engagement_type_id = t.id
        LEFT JOIN vouchers v ON ph.voucher_id = v.id
        WHERE e.client_id = $1 AND e.company_id = $2
        ORDER BY ph.received_at DESC
      `,
        [clientId, companyId]
      )

      // 4. الأقساط المتأخرة
      const overdueItems = await query(
        `
        SELECT ps.*, e.engagement_number
        FROM payment_schedules ps
        JOIN legal_engagements e ON ps.legal_engagement_id = e.id
        WHERE e.client_id = $1 AND ps.company_id = $2 AND ps.status = 'overdue'
        ORDER BY ps.due_date
      `,
        [clientId, companyId]
      )

      // 5. الأقساط القادمة
      const upcomingItems = await query(
        `
        SELECT ps.*, e.engagement_number
        FROM payment_schedules ps
        JOIN legal_engagements e ON ps.legal_engagement_id = e.id
        WHERE e.client_id = $1 AND ps.company_id = $2 AND ps.status = 'pending'
          AND ps.due_date >= CURRENT_DATE
        ORDER BY ps.due_date LIMIT 10
      `,
        [clientId, companyId]
      )

      res.json({
        summary: summaryResult.rows[0],
        services: servicesResult.rows,
        payments: paymentsResult.rows,
        overdue_items: overdueItems.rows,
        upcoming_items: upcomingItems.rows
      })
    } catch (err: any) {
      console.error('[office-accounts] GET /financial-summary error:', err.message)
      res.status(500).json({ error: 'حدث خطأ في جلب الملخص المالي' })
    }
  }
)

// ═══════════════════════════════════════════════════
// 8. GET /office-accounts — تقرير حسابات المكتب
// ═══════════════════════════════════════════════════
router.get('/report', requirePermission('view_finances'), async (req: any, res) => {
  try {
    const { companyId } = req.auth
    const { client_id, category_id, from_date, to_date, status } = req.query

    let whereClause = 'WHERE e.company_id = $1 AND e.deleted_at IS NULL'
    const params: any[] = [companyId]
    let paramIndex = 2

    if (client_id) {
      whereClause += ` AND e.client_id = $${paramIndex++}`
      params.push(client_id)
    }
    if (category_id && category_id !== 'الكل') {
      whereClause += ` AND e.category_id = $${paramIndex++}`
      params.push(category_id)
    }
    if (from_date) {
      whereClause += ` AND e.start_date >= $${paramIndex++}`
      params.push(from_date)
    }
    if (to_date) {
      whereClause += ` AND e.start_date <= $${paramIndex++}`
      params.push(to_date)
    }
    if (status && status !== 'all') {
      whereClause += ` AND e.finance_status = $${paramIndex++}`
      params.push(status)
    }

    // Summary
    const summaryResult = await query(
      `
        SELECT
          COALESCE(SUM(e.financial_compensation + e.tax + COALESCE(e.late_fee_amount, 0)), 0) as total_revenue,
          COALESCE(SUM(e.paid_amount), 0) as total_collected,
          COALESCE(SUM(GREATEST(e.financial_compensation + e.tax + COALESCE(e.late_fee_amount, 0) - e.paid_amount, 0)), 0) as total_outstanding,
          COALESCE(SUM(CASE WHEN e.finance_status = 'overdue' THEN GREATEST(e.financial_compensation + e.tax + COALESCE(e.late_fee_amount, 0) - e.paid_amount, 0) ELSE 0 END), 0) as total_overdue
        FROM legal_engagements e ${whereClause}
      `,
      params
    )

    // By category
    const byCategory = await query(
      `
        SELECT c.name_ar as category,
          COALESCE(SUM(e.financial_compensation + e.tax + COALESCE(e.late_fee_amount, 0)), 0) as total,
          COALESCE(SUM(e.paid_amount), 0) as collected
        FROM legal_engagements e
        LEFT JOIN legal_service_categories c ON e.category_id = c.id
        ${whereClause}
        GROUP BY c.name_ar ORDER BY total DESC
      `,
      params
    )

    // By client
    const byClient = await query(
      `
        SELECT cl.id as client_id, cl.name as client_name,
          COALESCE(SUM(e.financial_compensation + e.tax + COALESCE(e.late_fee_amount, 0)), 0) as total,
          COALESCE(SUM(e.paid_amount), 0) as collected
        FROM legal_engagements e
        LEFT JOIN clients cl ON e.client_id = cl.id
        ${whereClause}
        GROUP BY cl.id, cl.name ORDER BY total DESC
      `,
      params
    )

    // Overdue items
    const overdueItems = await query(
      `
        SELECT ps.*, e.engagement_number, cl.name as client_name
        FROM payment_schedules ps
        JOIN legal_engagements e ON ps.legal_engagement_id = e.id
        LEFT JOIN clients cl ON e.client_id = cl.id
        ${whereClause} AND ps.status <> 'cancelled' AND ps.due_date < CURRENT_DATE
        ORDER BY ps.due_date
      `,
      params
    )

    const summaryRow = summaryResult.rows[0]
    const totalRevenue = Number(summaryRow.total_revenue)
    const totalCollected = Number(summaryRow.total_collected)

    res.json({
      summary: {
        ...summaryRow,
        collection_rate: totalRevenue > 0 ? Number(((totalCollected / totalRevenue) * 100).toFixed(1)) : 0
      },
      by_category: byCategory.rows,
      by_client: byClient.rows,
      overdue_items: overdueItems.rows
    })
  } catch (err: any) {
    console.error('[office-accounts] GET /report error:', err.message)
    res.status(500).json({ error: 'حدث خطأ في جلب التقرير' })
  }
})

// ═══════════════════════════════════════════════════
// 9. POST /engagements/:id/late-fee — غرامة تأخير
// ═══════════════════════════════════════════════════
router.post(
  '/engagements/:id/late-fee',
  requirePermission('create_finances'),
  async (req: any, res) => {
    const client = await getClient()
    try {
      await client.query('BEGIN')
      const { companyId } = req.auth
      const { id } = req.params
      const { rate } = req.body

      const feeRate = Number(rate)
      if (isNaN(feeRate) || feeRate < 0 || feeRate > 100) {
        await client.query('ROLLBACK')
        return res.status(400).json({ error: 'نسبة الغرامة غير صحيحة' })
      }

      const engResult = await client.query(
        `
        SELECT remaining_amount, late_fee_amount, client_id FROM legal_engagements
        WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL FOR UPDATE
      `,
        [id, companyId]
      )
      if (!engResult.rows.length) {
        await client.query('ROLLBACK')
        return res.status(404).json({ error: 'غير موجود' })
      }

      const remaining = Number(engResult.rows[0].remaining_amount || 0)
      const existingFee = Number(engResult.rows[0].late_fee_amount || 0)
      const newFee = (remaining * feeRate) / 100

      const totalLateFee = Math.round((existingFee + newFee) * 100) / 100
      const newRemaining = Math.round((remaining + newFee) * 100) / 100
      await client.query(
        `
        UPDATE legal_engagements
        SET late_fee_rate = $1, late_fee_amount = $2, remaining_amount = $3, updated_at = NOW()
        WHERE id = $4 AND company_id = $5
      `,
        [feeRate, totalLateFee, newRemaining, id, companyId]
      )
      await client.query(
        `UPDATE finances SET remaining_amount = $1, updated_at = NOW()
         WHERE legal_engagement_id = $2 AND company_id = $3`,
        [newRemaining, id, companyId]
      )
      await upsertClientAccount(companyId, engResult.rows[0].client_id, client)
      await client.query('COMMIT')

      res.json({ success: true, late_fee_added: newFee, total_late_fee: totalLateFee })
    } catch (err: any) {
      await client.query('ROLLBACK')
      console.error('[office-accounts] POST /late-fee error:', err.message)
      res.status(500).json({ error: 'حدث خطأ في تطبيق غرامة التأخير' })
    } finally {
      client.release()
    }
  }
)

// ═══════════════════════════════════════════════════
// 10. GET /clients/:clientId/full-profile — الملف المالي الشامل
// ═══════════════════════════════════════════════════
router.get(
  '/clients/:clientId/full-profile',
  requirePermission('view_finances'),
  async (req: any, res) => {
    try {
      const { companyId } = req.auth
      const { clientId } = req.params

      // 1. بيانات العميل الأساسية
      const clientResult = await query(
        `
        SELECT id, name, type, id_number, phone, email, city, address, notes, created_at
        FROM clients WHERE id = $1 AND company_id = $2
      `,
        [clientId, companyId]
      )
      if (!clientResult.rows.length) {
        return res.status(404).json({ error: 'العميل غير موجود' })
      }
      const client = clientResult.rows[0]

      // 2. أول تاريخ تعامل
      const firstEngagement = await query(
        `
        SELECT MIN(created_at) as first_deal_date
        FROM legal_engagements
        WHERE client_id = $1 AND company_id = $2 AND deleted_at IS NULL
      `,
        [clientId, companyId]
      )

      // 3. جميع القضايا المرتبطة
      const casesResult = await query(
        `
        SELECT c.id, c.case_number, c.case_type, c.status,
          c.contract_amount as total_fee, c.opponent_name
        FROM cases c
        WHERE c.client_id = $1 AND c.company_id = $2
        ORDER BY c.created_at DESC
      `,
        [clientId, companyId]
      )

      // 4. جميع الخدمات القانونية
      const servicesResult = await query(
        `
        SELECT e.id, e.engagement_number, e.financial_compensation, e.tax,
          (e.financial_compensation + e.tax + COALESCE(e.late_fee_amount, 0)) as total_amount,
          e.paid_amount,
          GREATEST(e.financial_compensation + e.tax + COALESCE(e.late_fee_amount, 0) - e.paid_amount, 0) AS remaining_amount,
          e.finance_status,
          e.start_date, e.payment_method, e.description, e.installment_count,
          c.name_ar as category_name, t.name_ar as service_type_name,
          em.name as responsible_name
        FROM legal_engagements e
        LEFT JOIN legal_service_categories c ON e.category_id = c.id
        LEFT JOIN legal_service_types t ON e.engagement_type_id = t.id
        LEFT JOIN employees em ON e.responsible_lawyer_id = em.id
        WHERE e.client_id = $1 AND e.company_id = $2 AND e.deleted_at IS NULL
        ORDER BY e.created_at DESC
      `,
        [clientId, companyId]
      )

      // 5. سجل الدفعات الكامل (من services + cases)
      const paymentsResult = await query(
        `
        SELECT ph.id, ph.amount, ph.payment_method, ph.received_at,
          ph.voucher_id, ph.notes,
          e.engagement_number, e.id as engagement_id,
          t.name_ar as service_type_name,
          v.voucher_number
        FROM payment_history ph
        JOIN legal_engagements e ON ph.legal_engagement_id = e.id
        LEFT JOIN legal_service_types t ON e.engagement_type_id = t.id
        LEFT JOIN vouchers v ON ph.voucher_id = v.id
        WHERE e.client_id = $1 AND e.company_id = $2
        ORDER BY ph.received_at DESC
      `,
        [clientId, companyId]
      )

      // 6. جميع الفواتير
      const invoicesResult = await query(
        `
        SELECT i.id, i.invoice_number, i.date, i.subtotal,
          i.subtotal AS amount, i.tax_amount, i.tax_amount AS vat_amount,
          i.total, i.total AS total_amount, i.status, i.notes, i.notes AS description
        FROM invoices i
        WHERE i.client_id = $1 AND i.company_id = $2
        ORDER BY i.date DESC
      `,
        [clientId, companyId]
      )

      // 7. جميع سندات القبض
      const vouchersResult = await query(
        `
        SELECT v.id, v.voucher_number, v.date, v.type, v.amount, v.notes
        FROM vouchers v
        WHERE v.client_id = $1 AND v.company_id = $2
        ORDER BY v.date DESC
      `,
        [clientId, companyId]
      )

      // 8. الأقساط المعلقة والمتأخرة
      const schedulesResult = await query(
        `
        SELECT ps.id, ps.installment_number, ps.title, ps.amount, ps.due_date,
          ps.paid_amount, ps.status, e.engagement_number
        FROM payment_schedules ps
        JOIN legal_engagements e ON ps.legal_engagement_id = e.id
        WHERE e.client_id = $1 AND e.company_id = $2 AND ps.status IN ('pending', 'overdue')
        ORDER BY ps.due_date
      `,
        [clientId, companyId]
      )

      // 9. ملخص الأرقام
      const summaryResult = await query(
        `
        SELECT
          COUNT(*) as total_services,
          COALESCE(SUM(e.financial_compensation + e.tax + COALESCE(e.late_fee_amount, 0)), 0) as total_services_amount,
          COALESCE(SUM(e.paid_amount), 0) as total_services_paid,
          COALESCE(SUM(GREATEST(e.financial_compensation + e.tax + COALESCE(e.late_fee_amount, 0) - e.paid_amount, 0)), 0) as total_services_remaining
        FROM legal_engagements e
        WHERE e.client_id = $1 AND e.company_id = $2 AND e.deleted_at IS NULL
      `,
        [clientId, companyId]
      )

      // 10. عدد القضايا منجدول القضايا
      const casesCountResult = await query(
        `
        SELECT COUNT(*) as count FROM cases
        WHERE client_id = $1 AND company_id = $2
      `,
        [clientId, companyId]
      )

      res.json({
        client,
        first_deal_date: firstEngagement.rows[0]?.first_deal_date || null,
        cases: casesResult.rows,
        services: servicesResult.rows,
        payments: paymentsResult.rows,
        invoices: invoicesResult.rows,
        vouchers: vouchersResult.rows,
        installment_schedules: schedulesResult.rows,
        summary: {
          total_cases: Number(casesCountResult.rows[0]?.count || 0),
          total_services: Number(summaryResult.rows[0]?.total_services || 0),
          total_services_amount: Number(summaryResult.rows[0]?.total_services_amount || 0),
          total_services_paid: Number(summaryResult.rows[0]?.total_services_paid || 0),
          total_services_remaining: Number(summaryResult.rows[0]?.total_services_remaining || 0),
          total_payments: paymentsResult.rows.reduce(
            (sum: number, p: any) => sum + Number(p.amount || 0),
            0
          ),
          total_invoices: invoicesResult.rows.length,
          total_vouchers: vouchersResult.rows.length,
          pending_installments: schedulesResult.rows.filter((s: any) => s.status === 'pending')
            .length,
          overdue_installments: schedulesResult.rows.filter((s: any) => s.status === 'overdue')
            .length
        }
      })
    } catch (err: any) {
      console.error('[office-accounts] GET /full-profile error:', err.message)
      res.status(500).json({ error: 'حدث خطأ في جلب الملف المالي' })
    }
  }
)

export default router
