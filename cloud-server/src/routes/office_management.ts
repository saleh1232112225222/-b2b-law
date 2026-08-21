import { Router } from 'express'
import { getClient, query } from '../db/connection'
import { authMiddleware } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'

const router = Router()
router.use(authMiddleware)

// ═══════════════════════════════════════════════════
// 1. POST /expenses — إضافة مصروف
// ═══════════════════════════════════════════════════
router.post('/expenses', requirePermission('create_finances'), async (req: any, res) => {
  try {
    const { companyId, userId } = req.auth
    const { category, description, amount, expense_date, paid_by, receipt_number, notes } = req.body
    const expenseAmount = Number(amount)
    if (!category || !description || !Number.isFinite(expenseAmount) || expenseAmount <= 0) {
      return res.status(400).json({ error: 'التصنيف والوصف والمبلغ مطلوبة' })
    }
    const result = await query(
      `
        INSERT INTO office_expenses (company_id, category, description, amount, expense_date, paid_by, receipt_number, notes, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
      `,
      [
        companyId,
        category,
        description,
        expenseAmount,
        expense_date || new Date().toISOString().split('T')[0],
        paid_by,
        receipt_number,
        notes,
        userId
      ]
    )
    res.json(result.rows[0])
  } catch (err: any) {
    console.error('[office-management] POST /expenses error:', err.message)
    res.status(500).json({ error: 'حدث خطأ في إضافة المصروف' })
  }
})

// ═══════════════════════════════════════════════════
// 2. GET /expenses — قائمة المصروفات
// ═══════════════════════════════════════════════════
router.get('/expenses', requirePermission('view_finances'), async (req: any, res) => {
  try {
    const { companyId } = req.auth
    const { month, year, category } = req.query
    let sql = `SELECT * FROM office_expenses WHERE company_id = $1`
    const params: any[] = [companyId]
    if (month && year) {
      sql += ` AND EXTRACT(MONTH FROM expense_date) = $${params.length + 1} AND EXTRACT(YEAR FROM expense_date) = $${params.length + 2}`
      params.push(month, year)
    }
    if (category) {
      sql += ` AND category = $${params.length + 1}`
      params.push(category)
    }
    sql += ` ORDER BY expense_date DESC`
    const result = await query(sql, params)
    res.json(result.rows)
  } catch (err: any) {
    console.error('[office-management] GET /expenses error:', err.message)
    res.status(500).json({ error: 'حدث خطأ في جلب المصروفات' })
  }
})

// ═══════════════════════════════════════════════════
// 3. DELETE /expenses/:id — حذف مصروف
// ═══════════════════════════════════════════════════
router.delete('/expenses/:id', requirePermission('delete_finances'), async (req: any, res) => {
  try {
    const { companyId } = req.auth
    const { id } = req.params
    await query(`DELETE FROM office_expenses WHERE id = $1 AND company_id = $2`, [id, companyId])
    res.json({ success: true })
  } catch (err: any) {
    console.error('[office-management] DELETE /expenses error:', err.message)
    res.status(500).json({ error: 'حدث خطأ في حذف المصروف' })
  }
})

// ═══════════════════════════════════════════════════
// 4. POST /partners — إضافة شريك
// ═══════════════════════════════════════════════════
router.post('/partners', requirePermission('manage_office'), async (req: any, res) => {
  try {
    const { companyId } = req.auth
    const { employee_id, name, share_percentage, role } = req.body
    const share = Number(share_percentage)
    if (!name || !Number.isFinite(share) || share <= 0 || share > 100) {
      return res.status(400).json({ error: 'الاسم ونسبة الربح مطلوبة' })
    }
    const shareTotal = await query(
      'SELECT COALESCE(SUM(share_percentage), 0) AS total FROM partners WHERE company_id = $1 AND is_active = TRUE',
      [companyId]
    )
    if (Number(shareTotal.rows[0].total) + share > 100.001) {
      return res.status(400).json({ error: 'مجموع نسب الشركاء لا يمكن أن يتجاوز 100%' })
    }
    const result = await query(
      `
        INSERT INTO partners (company_id, employee_id, name, share_percentage, role)
        VALUES ($1, $2, $3, $4, $5) RETURNING *
      `,
      [companyId, employee_id, name, share, role]
    )
    res.json(result.rows[0])
  } catch (err: any) {
    console.error('[office-management] POST /partners error:', err.message)
    res.status(500).json({ error: 'حدث خطأ في إضافة الشريك' })
  }
})

// ═══════════════════════════════════════════════════
// 5. GET /partners — قائمة الشركاء
// ═══════════════════════════════════════════════════
router.get('/partners', requirePermission('view_finances'), async (req: any, res) => {
  try {
    const { companyId } = req.auth
    const result = await query(
      `
        SELECT p.*, e.name as employee_name, e.job_title
        FROM partners p
        LEFT JOIN employees e ON p.employee_id = e.id
        WHERE p.company_id = $1 AND p.is_active = TRUE
        ORDER BY p.share_percentage DESC
      `,
      [companyId]
    )
    res.json(result.rows)
  } catch (err: any) {
    console.error('[office-management] GET /partners error:', err.message)
    res.status(500).json({ error: 'حدث خطأ في جلب الشركاء' })
  }
})

// ═══════════════════════════════════════════════════
// 6. PUT /partners/:id — تعديل شريك
// ═══════════════════════════════════════════════════
router.put('/partners/:id', requirePermission('manage_office'), async (req: any, res) => {
  try {
    const { companyId } = req.auth
    const { id } = req.params
    const { name, share_percentage, role, is_active } = req.body
    if (share_percentage !== undefined) {
      const share = Number(share_percentage)
      if (!Number.isFinite(share) || share <= 0 || share > 100) {
        return res.status(400).json({ error: 'نسبة الشريك يجب أن تكون أكبر من صفر ولا تتجاوز 100%' })
      }
      const shareTotal = await query(
        `SELECT COALESCE(SUM(share_percentage), 0) AS total FROM partners
         WHERE company_id = $1 AND is_active = TRUE AND id <> $2`,
        [companyId, id]
      )
      if (Number(shareTotal.rows[0].total) + share > 100.001) {
        return res.status(400).json({ error: 'مجموع نسب الشركاء لا يمكن أن يتجاوز 100%' })
      }
    }
    await query(
      `
        UPDATE partners SET name = COALESCE($1, name), share_percentage = COALESCE($2, share_percentage),
          role = COALESCE($3, role), is_active = COALESCE($4, is_active), updated_at = NOW()
        WHERE id = $5 AND company_id = $6
      `,
      [name, share_percentage, role, is_active, id, companyId]
    )
    res.json({ success: true })
  } catch (err: any) {
    console.error('[office-management] PUT /partners error:', err.message)
    res.status(500).json({ error: 'حدث خطأ في تعديل الشريك' })
  }
})

// ═══════════════════════════════════════════════════
// 7. POST /contributions — إضافة مساهمة شريك
// ═══════════════════════════════════════════════════
router.post('/contributions', requirePermission('create_finances'), async (req: any, res) => {
  try {
    const { companyId } = req.auth
    const { partner_id, engagement_id, case_id, contribution_type, description, amount } = req.body
    if (!partner_id || !contribution_type) {
      return res.status(400).json({ error: 'الشريك ونوع المساهمة مطلوبة' })
    }
    const result = await query(
      `
        INSERT INTO partner_contributions (company_id, partner_id, engagement_id, case_id, contribution_type, description, amount)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
      `,
      [companyId, partner_id, engagement_id, case_id, contribution_type, description, amount || 0]
    )
    res.json(result.rows[0])
  } catch (err: any) {
    console.error('[office-management] POST /contributions error:', err.message)
    res.status(500).json({ error: 'حدث خطأ في إضافة المساهمة' })
  }
})

// ═══════════════════════════════════════════════════
// 8. GET /contributions — قائمة المساهمات
// ═══════════════════════════════════════════════════
router.get('/contributions', requirePermission('view_finances'), async (req: any, res) => {
  try {
    const { companyId } = req.auth
    const { partner_id, month, year } = req.query
    let sql = `
        SELECT pc.*, p.name as partner_name, e.engagement_number, c.case_number
        FROM partner_contributions pc
        LEFT JOIN partners p ON pc.partner_id = p.id
        LEFT JOIN legal_engagements e ON pc.engagement_id = e.id
        LEFT JOIN cases c ON pc.case_id = c.id
        WHERE pc.company_id = $1
      `
    const params: any[] = [companyId]
    if (partner_id) {
      sql += ` AND pc.partner_id = $${params.length + 1}`
      params.push(partner_id)
    }
    if (month && year) {
      sql += ` AND EXTRACT(MONTH FROM pc.contribution_date) = $${params.length + 1} AND EXTRACT(YEAR FROM pc.contribution_date) = $${params.length + 2}`
      params.push(month, year)
    }
    sql += ` ORDER BY pc.contribution_date DESC`
    const result = await query(sql, params)
    res.json(result.rows)
  } catch (err: any) {
    console.error('[office-management] GET /contributions error:', err.message)
    res.status(500).json({ error: 'حدث خطأ في جلب المساهمات' })
  }
})

// ═══════════════════════════════════════════════════
// 9. POST /budgets — تحديث الميزانية الشهرية
// ═══════════════════════════════════════════════════
router.post('/budgets', requirePermission('manage_office'), async (req: any, res) => {
  try {
    const { companyId } = req.auth
    const { month, year, category, budgeted_amount } = req.body
    if (!month || !year || !category) {
      return res.status(400).json({ error: 'الشهر والسنة والتصنيف مطلوبة' })
    }
    const result = await query(
      `
        INSERT INTO office_budgets (company_id, month, year, category, budgeted_amount)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (company_id, month, year, category) DO UPDATE SET budgeted_amount = $5, updated_at = NOW()
        RETURNING *
      `,
      [companyId, month, year, category, budgeted_amount || 0]
    )
    res.json(result.rows[0])
  } catch (err: any) {
    console.error('[office-management] POST /budgets error:', err.message)
    res.status(500).json({ error: 'حدث خطأ في تحديث الميزانية' })
  }
})

// ═══════════════════════════════════════════════════
// 10. GET /budgets — جلب الميزانية الشهرية
// ═══════════════════════════════════════════════════
router.get('/budgets', requirePermission('view_finances'), async (req: any, res) => {
  try {
    const { companyId } = req.auth
    const { month, year } = req.query
    let sql = `SELECT * FROM office_budgets WHERE company_id = $1`
    const params: any[] = [companyId]
    if (month && year) {
      sql += ` AND month = $2 AND year = $3`
      params.push(month, year)
    }
    sql += ` ORDER BY category`
    const result = await query(sql, params)
    res.json(result.rows)
  } catch (err: any) {
    console.error('[office-management] GET /budgets error:', err.message)
    res.status(500).json({ error: 'حدث خطأ في جلب الميزانية' })
  }
})

// ═══════════════════════════════════════════════════
// 11. GET /dashboard — لوحة الإحصائيات الرئيسية
// ═══════════════════════════════════════════════════
router.get('/dashboard', requirePermission('view_finances'), async (req: any, res) => {
  try {
    const { companyId } = req.auth
    const { month, year } = req.query
    const m = Number(month) || new Date().getMonth() + 1
    const y = Number(year) || new Date().getFullYear()

    // 1. إجمالي الإيرادات (خدمات قانونية + قضايا)
    const revenueResult = await query(
      `
        SELECT COALESCE(SUM(amount), 0) as total_revenue
        FROM payment_history
        WHERE company_id = $1
          AND EXTRACT(MONTH FROM received_at) = $2 AND EXTRACT(YEAR FROM received_at) = $3
      `,
      [companyId, m, y]
    )

    // 2. إجمالي المصروفات
    const expensesResult = await query(
      `
        SELECT COALESCE(SUM(amount), 0) as total_expenses
        FROM office_expenses
        WHERE company_id = $1
          AND EXTRACT(MONTH FROM expense_date) = $2 AND EXTRACT(YEAR FROM expense_date) = $3
      `,
      [companyId, m, y]
    )

    // 3. المصروفات حسب التصنيف
    const expensesByCategory = await query(
      `
        SELECT category, COALESCE(SUM(amount), 0) as total
        FROM office_expenses
        WHERE company_id = $1
          AND EXTRACT(MONTH FROM expense_date) = $2 AND EXTRACT(YEAR FROM expense_date) = $3
        GROUP BY category
      `,
      [companyId, m, y]
    )

    // 4. الشركاء ونسبهم
    const partnersResult = await query(
      `
        SELECT p.id, p.name, p.share_percentage, p.role, e.name as employee_name
        FROM partners p
        LEFT JOIN employees e ON p.employee_id = e.id
        WHERE p.company_id = $1 AND p.is_active = TRUE
        ORDER BY p.share_percentage DESC
      `,
      [companyId]
    )

    // 5. مساهمات الشركاء هذا الشهر
    const contributionsResult = await query(
      `
        SELECT pc.partner_id, p.name as partner_name, pc.contribution_type,
          COUNT(*) as count, COALESCE(SUM(pc.amount), 0) as total_amount
        FROM partner_contributions pc
        LEFT JOIN partners p ON pc.partner_id = p.id
        WHERE pc.company_id = $1
          AND EXTRACT(MONTH FROM pc.contribution_date) = $2 AND EXTRACT(YEAR FROM pc.contribution_date) = $3
        GROUP BY pc.partner_id, p.name, pc.contribution_type
      `,
      [companyId, m, y]
    )

    // 6. الميزانية التشغيلية
    const budgetResult = await query(
      `
        SELECT b.category, b.budgeted_amount,
          COALESCE(SUM(e.amount), 0) AS actual_amount
        FROM office_budgets b
        LEFT JOIN office_expenses e ON e.company_id = b.company_id AND e.category = b.category
          AND EXTRACT(MONTH FROM e.expense_date) = b.month
          AND EXTRACT(YEAR FROM e.expense_date) = b.year
        WHERE b.company_id = $1 AND b.month = $2 AND b.year = $3
        GROUP BY b.category, b.budgeted_amount
      `,
      [companyId, m, y]
    )

    // 7. إجمالي التحصيلات (السنة الحالية)
    const yearlyRevenue = await query(
      `
        SELECT COALESCE(SUM(amount), 0) as total
        FROM payment_history
        WHERE company_id = $1 AND EXTRACT(YEAR FROM received_at) = $2
      `,
      [companyId, y]
    )

    // 8. إجمالي التحصيلات (الشهر الحالي)
    const monthlyRevenue = Number(revenueResult.rows[0]?.total_revenue || 0)
    const monthlyExpenses = Number(expensesResult.rows[0]?.total_expenses || 0)
    const netProfit = monthlyRevenue - monthlyExpenses

    // 9. توزيع الأرباح على الشركاء
    const partnerDistributions = partnersResult.rows.map((p: any) => ({
      partner_id: p.id,
      name: p.name,
      employee_name: p.employee_name,
      share_percentage: Number(p.share_percentage),
      role: p.role,
      distributable_amount: Math.round((netProfit * Number(p.share_percentage)) / 100)
    }))

    // 10. حساب نسبة التحصيل من الخدمات
    const totalServicesDue = await query(
      `
        SELECT COALESCE(SUM(financial_compensation + tax + COALESCE(late_fee_amount, 0)), 0) as total
        FROM legal_engagements WHERE company_id = $1 AND deleted_at IS NULL
      `,
      [companyId]
    )
    const totalServicesPaid = await query(
      `
        SELECT COALESCE(SUM(paid_amount), 0) as total
        FROM legal_engagements WHERE company_id = $1 AND deleted_at IS NULL
      `,
      [companyId]
    )

    res.json({
      period: { month: m, year: y },
      summary: {
        total_revenue: monthlyRevenue,
        total_expenses: monthlyExpenses,
        net_profit: netProfit,
        yearly_revenue: Number(yearlyRevenue.rows[0]?.total || 0),
        total_services_due: Number(totalServicesDue.rows[0]?.total || 0),
        total_services_paid: Number(totalServicesPaid.rows[0]?.total || 0),
        collection_rate:
          Number(totalServicesDue.rows[0]?.total || 0) > 0
            ? Math.round(
                (Number(totalServicesPaid.rows[0]?.total || 0) /
                  Number(totalServicesDue.rows[0]?.total || 0)) *
                  100
              )
            : 0
      },
      expenses_by_category: expensesByCategory.rows,
      partners: partnerDistributions,
      partner_contributions: contributionsResult.rows,
      budget: budgetResult.rows
    })
  } catch (err: any) {
    console.error('[office-management] GET /dashboard error:', err.message)
    res.status(500).json({ error: 'حدث خطأ في جلب لوحة الإحصائيات' })
  }
})

// ═══════════════════════════════════════════════════
// 12. POST /distributions — توزيع الأرباح
// ═══════════════════════════════════════════════════
router.post('/distributions', requirePermission('manage_office'), async (req: any, res) => {
  const client = await getClient()
  try {
    await client.query('BEGIN')
    const { companyId } = req.auth
    const { month, year } = req.body
    if (!month || !year) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'الشهر والسنة مطلوبة' })
    }

    // جلب إيرادات الشهر
    const rev = await client.query(
      `
        SELECT COALESCE(SUM(amount), 0) as total
        FROM payment_history
        WHERE company_id = $1
          AND EXTRACT(MONTH FROM received_at) = $2 AND EXTRACT(YEAR FROM received_at) = $3
      `,
      [companyId, month, year]
    )

    // جلب مصروفات الشهر
    const exp = await client.query(
      `
        SELECT COALESCE(SUM(amount), 0) as total
        FROM office_expenses
        WHERE company_id = $1
          AND EXTRACT(MONTH FROM expense_date) = $2 AND EXTRACT(YEAR FROM expense_date) = $3
      `,
      [companyId, month, year]
    )

    const totalRevenue = Number(rev.rows[0]?.total || 0)
    const totalExpenses = Number(exp.rows[0]?.total || 0)
    const netProfit = totalRevenue - totalExpenses
    if (netProfit <= 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'لا توجد أرباح موجبة قابلة للتوزيع لهذه الفترة' })
    }

    // جلب الشركاء
    const partners = await client.query(
      `
        SELECT * FROM partners WHERE company_id = $1 AND is_active = TRUE
      `,
      [companyId]
    )
    const totalShares = partners.rows.reduce(
      (sum: number, partner: any) => sum + Number(partner.share_percentage || 0), 0
    )
    if (!partners.rows.length || Math.abs(totalShares - 100) > 0.01) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'يجب أن يساوي مجموع نسب الشركاء النشطين 100% قبل التوزيع' })
    }

    // توزيع الأرباح
    for (const partner of partners.rows) {
      const share = Math.round((netProfit * Number(partner.share_percentage)) / 100)
      await client.query(
        `
          INSERT INTO profit_distributions (company_id, partner_id, month, year, total_revenue, total_expenses, net_profit, partner_share)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (company_id, partner_id, month, year) DO UPDATE SET
            total_revenue = $5, total_expenses = $6, net_profit = $7, partner_share = $8
        `,
        [companyId, partner.id, month, year, totalRevenue, totalExpenses, netProfit, share]
      )
    }

    await client.query('COMMIT')

    res.json({
      success: true,
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_profit: netProfit
    })
  } catch (err: any) {
    await client.query('ROLLBACK')
    console.error('[office-management] POST /distributions error:', err.message)
    res.status(500).json({ error: 'حدث خطأ في توزيع الأرباح' })
  } finally {
    client.release()
  }
})

// ═══════════════════════════════════════════════════
// 13. GET /distributions — جلب توزيعات الأرباح
// ═══════════════════════════════════════════════════
router.get('/distributions', requirePermission('view_finances'), async (req: any, res) => {
  try {
    const { companyId } = req.auth
    const { month, year } = req.query
    let sql = `
        SELECT pd.*, p.name as partner_name, p.share_percentage, p.role
        FROM profit_distributions pd
        LEFT JOIN partners p ON pd.partner_id = p.id
        WHERE pd.company_id = $1
      `
    const params: any[] = [companyId]
    if (month && year) {
      sql += ` AND pd.month = $2 AND pd.year = $3`
      params.push(month, year)
    }
    sql += ` ORDER BY pd.partner_share DESC`
    const result = await query(sql, params)
    res.json(result.rows)
  } catch (err: any) {
    console.error('[office-management] GET /distributions error:', err.message)
    res.status(500).json({ error: 'حدث خطأ في جلب التوزيعات' })
  }
})

export default router
