import { Router } from 'express'
import { PoolClient } from 'pg'
import { v4 as uuidv4 } from 'uuid'
import { getClient, query } from '../db/connection'
import { authMiddleware } from '../middleware/auth'
import { requirePermission } from '../middleware/permission'
import { applyAccountMovement } from '../services/accounting.service'

export const financialOperationsRouter = Router()
financialOperationsRouter.use(authMiddleware)

async function inTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getClient()
  try {
    await client.query('BEGIN')
    const result = await work(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

function asPositiveMoney(value: unknown, field = 'المبلغ'): number {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) {
    const error: any = new Error(`${field} يجب أن يكون أكبر من صفر`)
    error.status = 400
    throw error
  }
  return Math.round(amount * 100) / 100
}

function normalizeVatRate(value: unknown): number {
  const rate = Number(value ?? 0.15)
  if (!Number.isFinite(rate) || rate < 0) return 0
  return rate > 1 ? rate / 100 : rate
}

function voucherNumber(): string {
  return `VCH-${new Date().getFullYear()}-${uuidv4().slice(0, 8).toUpperCase()}`
}

function sendError(res: any, error: any, fallback: string): void {
  const duplicate = error?.code === '23505'
  const status = Number(error?.status) || (duplicate ? 409 : 500)
  if (status >= 500) console.error(`[financial-operations] ${fallback}:`, error?.message)
  res.status(status).json({ error: duplicate ? 'رقم السجل مستخدم مسبقاً' : error?.message || fallback })
}

const receivableSelect = `
  SELECT r.*, (COALESCE(r.amount_due, 0) - COALESCE(r.amount_paid, 0)) AS remaining_amount,
    c.name AS client_name, i.invoice_number
  FROM receivables r
  LEFT JOIN clients c ON c.id = r.client_id AND c.company_id = r.company_id
  LEFT JOIN invoices i ON i.id = r.invoice_id AND i.company_id = r.company_id
`

async function validateAndResolveFinanceLinks(
  client: PoolClient,
  companyId: string,
  input: {
    type: string
    expense_owner_type?: string | null
    case_id?: string | null
    client_id?: string | null
  }
): Promise<{ caseId: string | null; clientId: string | null; ownerType: string }> {
  const type = String(input.type || '').trim().toLowerCase()
  if (type !== 'income' && type !== 'expense') {
    throw Object.assign(new Error('نوع الحركة المالية غير صحيح'), { status: 400 })
  }

  const caseId =
    input.case_id && String(input.case_id).trim() !== '' ? String(input.case_id).trim() : null
  let clientId =
    input.client_id && String(input.client_id).trim() !== '' ? String(input.client_id).trim() : null

  const ownerType =
    type === 'income'
      ? 'case'
      : input.expense_owner_type || (caseId ? 'case' : clientId ? 'client' : 'office')

  if (type === 'expense' && ownerType === 'office') {
    return { caseId: null, clientId: null, ownerType: 'office' }
  }

  if (type === 'expense' && ownerType === 'client') {
    if (!clientId) {
      throw Object.assign(
        new Error('خطأ في النزاهة المحاسبية: يجب ربط مصروفات/ذمم الموكل بعميل مسجل (Client ID).'),
        { status: 400 }
      )
    }
    const cli = await client.query('SELECT id FROM clients WHERE id = $1 AND company_id = $2', [
      clientId,
      companyId
    ])
    if (!cli.rows.length) {
      throw Object.assign(new Error('معرف الموكل المحدد غير موجود في قاعدة البيانات.'), { status: 400 })
    }
    return { caseId: null, clientId, ownerType: 'client' }
  }

  if (!caseId) {
    throw Object.assign(
      new Error('خطأ في النزاهة المحاسبية: يجب ربط الإيرادات والمصروفات القضائية برقم قضية صالح (Case ID).'),
      { status: 400 }
    )
  }

  const caseRes = await client.query(
    'SELECT id, client_id FROM cases WHERE id = $1 AND company_id = $2',
    [caseId, companyId]
  )
  if (!caseRes.rows.length) {
    throw Object.assign(new Error('القضية المحددة غير موجودة في قاعدة البيانات (Case ID غير صالح).'), {
      status: 400
    })
  }

  if (!clientId && caseRes.rows[0].client_id) {
    clientId = String(caseRes.rows[0].client_id)
  }

  if (!clientId) {
    throw Object.assign(
      new Error('خطأ في النزاهة المحاسبية: يجب ربط العملية بموكل صالح مسجل في النظام (Client ID).'),
      { status: 400 }
    )
  }

  const cli = await client.query('SELECT id FROM clients WHERE id = $1 AND company_id = $2', [
    clientId,
    companyId
  ])
  if (!cli.rows.length) {
    throw Object.assign(new Error('معرف الموكل المحدد غير موجود في قاعدة البيانات (Client ID غير صالح).'), {
      status: 400
    })
  }

  return { caseId, clientId, ownerType: 'case' }
}

function buildFinanceWhere(companyId: string, qParams: Record<string, any>): { whereSql: string; values: any[] } {
  let whereSql = ' WHERE f.company_id = $1'
  const values: any[] = [companyId]
  let idx = 2

  if (qParams.caseId) {
    whereSql += ` AND f.case_id = $${idx++}`
    values.push(qParams.caseId)
  }
  if (qParams.clientId) {
    whereSql += ` AND COALESCE(f.client_id, c.client_id) = $${idx++}`
    values.push(qParams.clientId)
  }
  if (qParams.type && qParams.type !== 'all') {
    whereSql += ` AND f.type = $${idx++}`
    values.push(qParams.type)
  }
  if (qParams.category && qParams.category !== 'all') {
    whereSql += ` AND f.category = $${idx++}`
    values.push(qParams.category)
  }
  if (qParams.from) {
    whereSql += ` AND f.date >= $${idx++}`
    values.push(qParams.from)
  }
  if (qParams.to) {
    whereSql += ` AND f.date <= $${idx++}`
    values.push(qParams.to)
  }
  if (qParams.q && String(qParams.q).trim() !== '') {
    const like = `%${String(qParams.q).trim()}%`
    whereSql += ` AND (c.case_number ILIKE $${idx} OR COALESCE(cl.name, ccl.name) ILIKE $${idx} OR f.description ILIKE $${idx} OR f.category ILIKE $${idx})`
    values.push(like)
    idx++
  }

  return { whereSql, values }
}

financialOperationsRouter.get(
  '/finances/list',
  requirePermission('view_finances'),
  async (req: any, res) => {
    try {
      const companyId = req.auth.companyId
      const page = Math.max(1, Number(req.query.page) || 1)
      const pageSize = Math.max(1, Math.min(500, Number(req.query.pageSize) || 100))
      const offset = (page - 1) * pageSize
      const sortDir = req.query.sortDir === 'asc' ? 'ASC' : 'DESC'
      const { whereSql, values } = buildFinanceWhere(companyId, req.query)

      const limitIdx = values.length + 1
      const offsetIdx = values.length + 2

      const result = await query(
        `
        SELECT
          f.*,
          COALESCE(f.client_id, c.client_id) AS client_id,
          COALESCE(cl.name, ccl.name) AS client_name,
          c.case_number,
          c.subject AS case_subject,
          acc.name AS account_name,
          inv.id AS linked_invoice_id,
          inv.invoice_number AS linked_invoice_number
        FROM finances f
        LEFT JOIN cases c ON f.case_id = c.id AND c.company_id = f.company_id
        LEFT JOIN clients cl ON f.client_id = cl.id AND cl.company_id = f.company_id
        LEFT JOIN clients ccl ON c.client_id = ccl.id AND ccl.company_id = f.company_id
        LEFT JOIN accounts acc ON f.account_id = acc.id AND acc.company_id = f.company_id
        LEFT JOIN invoices inv ON f.reference_id = inv.id AND inv.company_id = f.company_id
        ${whereSql}
        ORDER BY f.date ${sortDir}, f.created_at ${sortDir}
        LIMIT $${limitIdx} OFFSET $${offsetIdx}
        `,
        [...values, pageSize, offset]
      )
      res.json(result.rows)
    } catch (error) {
      sendError(res, error, 'فشل جلب سجل العمليات المالية')
    }
  }
)

financialOperationsRouter.get(
  '/finances/count',
  requirePermission('view_finances'),
  async (req: any, res) => {
    try {
      const { whereSql, values } = buildFinanceWhere(req.auth.companyId, req.query)
      const result = await query(
        `
        SELECT COUNT(*) AS count
        FROM finances f
        LEFT JOIN cases c ON f.case_id = c.id AND c.company_id = f.company_id
        LEFT JOIN clients cl ON f.client_id = cl.id AND cl.company_id = f.company_id
        LEFT JOIN clients ccl ON c.client_id = ccl.id AND ccl.company_id = f.company_id
        ${whereSql}
        `,
        values
      )
      res.json({ count: Number(result.rows[0]?.count || 0) })
    } catch (error) {
      sendError(res, error, 'فشل عد العمليات المالية')
    }
  }
)

financialOperationsRouter.get(
  '/finances/stats',
  requirePermission('view_finances'),
  async (req: any, res) => {
    try {
      const companyId = req.auth.companyId
      const [finRes, officeExpRes, casesContractedRes, servicesRes, standaloneRes, pendingInvRes, openRecRes] =
        await Promise.all([
          query(
            `SELECT
               COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
               COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
             FROM finances WHERE company_id = $1`,
            [companyId]
          ),
          query(
            `SELECT COALESCE(SUM(oe.amount), 0) AS total
             FROM office_expenses oe
             WHERE oe.company_id = $1
               AND NOT EXISTS (
                 SELECT 1 FROM finances f WHERE f.company_id = $1 AND (f.reference_id = oe.id OR f.id = oe.id)
               )`,
            [companyId]
          ).catch(() => ({ rows: [{ total: 0 }] })),
          query(
            `SELECT COALESCE(SUM(
               COALESCE(
                 NULLIF(c.contract_amount, 0),
                 (SELECT SUM(ct.total_amount) FROM contracts ct WHERE ct.case_id = c.id AND ct.company_id = $1 AND COALESCE(ct.is_archived, false) = false),
                 0
               )
             ), 0) AS total
             FROM cases c
             WHERE c.company_id = $1 AND COALESCE(c.is_archived, false) = false`,
            [companyId]
          ).catch(() => ({ rows: [{ total: 0 }] })),
          query(
            `SELECT COALESCE(SUM(COALESCE(financial_compensation, 0) + COALESCE(tax, 0)), 0) AS total
             FROM legal_engagements WHERE company_id = $1 AND deleted_at IS NULL`,
            [companyId]
          ).catch(() => ({ rows: [{ total: 0 }] })),
          query(
            `SELECT COALESCE(SUM(total_amount), 0) AS total
             FROM contracts WHERE company_id = $1 AND case_id IS NULL AND COALESCE(is_archived, false) = false`,
            [companyId]
          ).catch(() => ({ rows: [{ total: 0 }] })),
          query(
            `SELECT COUNT(*) AS count, COALESCE(SUM(COALESCE(total, subtotal, 0)), 0) AS total
             FROM invoices
             WHERE company_id = $1
               AND LOWER(COALESCE(status, '')) NOT IN ('paid', 'cancelled', 'canceled', 'void', 'draft')`,
            [companyId]
          ).catch(() => ({ rows: [{ count: 0, total: 0 }] })),
          query(
            `SELECT COALESCE(SUM(GREATEST(0, COALESCE(amount_due, 0) - COALESCE(amount_paid, 0))), 0) AS total
             FROM receivables
             WHERE company_id = $1 AND LOWER(COALESCE(status, '')) != 'paid'`,
            [companyId]
          ).catch(() => ({ rows: [{ total: 0 }] }))
        ])

      const totalIncome = Number(finRes.rows[0]?.income || 0)
      const totalExpense =
        Number(finRes.rows[0]?.expense || 0) + Number(officeExpRes.rows[0]?.total || 0)
      const totalContracted =
        Number(casesContractedRes.rows[0]?.total || 0) +
        Number(servicesRes.rows[0]?.total || 0) +
        Number(standaloneRes.rows[0]?.total || 0)
      const totalRemaining = Math.max(0, totalContracted - totalIncome)

      res.json({
        income: totalIncome,
        expense: totalExpense,
        balance: totalIncome - totalExpense,
        total_contracted: totalContracted,
        total_remaining: totalRemaining,
        pending_invoices_count: Number(pendingInvRes.rows[0]?.count || 0),
        pending_invoices_total: Number(pendingInvRes.rows[0]?.total || 0),
        open_receivables_total: Number(openRecRes.rows[0]?.total || 0)
      })
    } catch (error) {
      sendError(res, error, 'فشل في جلب إحصائيات المالية')
    }
  }
)

financialOperationsRouter.get(
  '/finances/cashflow',
  requirePermission('view_finances'),
  async (req: any, res) => {
    try {
      const companyId = req.auth.companyId
      const months = Math.max(1, Math.min(24, Number(req.query.months) || 6))
      const monthKeys: string[] = []
      const now = new Date()
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
      }
      const startMonth = monthKeys[0]

      const finRows = await query(
        `SELECT
           TO_CHAR(date::date, 'YYYY-MM') AS month,
           COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
           COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
         FROM finances
         WHERE company_id = $1 AND date IS NOT NULL AND TO_CHAR(date::date, 'YYYY-MM') >= $2
         GROUP BY TO_CHAR(date::date, 'YYYY-MM')
         ORDER BY month ASC`,
        [companyId, startMonth]
      )

      const map = new Map<string, { income: number; expense: number }>()
      for (const m of monthKeys) map.set(m, { income: 0, expense: 0 })
      for (const r of finRows.rows) {
        if (r.month && map.has(r.month)) {
          const cur = map.get(r.month)!
          cur.income += Number(r.income || 0)
          cur.expense += Number(r.expense || 0)
        }
      }

      res.json(
        monthKeys.map((month) => {
          const entry = map.get(month) || { income: 0, expense: 0 }
          return {
            month,
            income: Math.round(entry.income * 100) / 100,
            expense: Math.round(entry.expense * 100) / 100,
            net: Math.round((entry.income - entry.expense) * 100) / 100
          }
        })
      )
    } catch (error) {
      sendError(res, error, 'فشل في جلب بيانات التدفق النقدي')
    }
  }
)

financialOperationsRouter.post(
  '/finances',
  requirePermission('create_finances'),
  async (req: any, res) => {
    try {
      const result = await inTransaction(async (client) => {
        const data = req.body || {}
        const { caseId, clientId, ownerType } = await validateAndResolveFinanceLinks(
          client,
          req.auth.companyId,
          {
            type: data.type,
            expense_owner_type: data.expense_owner_type,
            case_id: data.case_id,
            client_id: data.client_id
          }
        )
        const amount = asPositiveMoney(data.amount)
        const vatRate = normalizeVatRate(data.vat_rate ?? 0)
        const vatAmount = Math.round(amount * vatRate * 100) / 100
        const total = Math.round((amount + vatAmount) * 100) / 100
        if (data.account_id) {
          await applyAccountMovement(
            client,
            req.auth.companyId,
            data.account_id,
            data.type === 'income' ? 'receipt' : 'payment',
            total
          )
        }
        const inserted = await client.query(
          `INSERT INTO finances (
            id, company_id, case_id, client_id, type, amount, category, description, date,
            vat_rate, vat_amount, total, is_refundable, expense_owner_type, account_id,
            created_by, updated_by, status
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$16,'posted'
          ) RETURNING *`,
          [
            data.id || uuidv4(),
            req.auth.companyId,
            caseId,
            clientId,
            data.type,
            amount,
            data.category || null,
            data.description || null,
            data.date || new Date().toISOString().slice(0, 10),
            vatRate,
            vatAmount,
            total,
            data.is_refundable === true || data.is_refundable === 1 || data.is_refundable === '1',
            ownerType,
            data.account_id || null,
            req.auth.userId
          ]
        )
        return inserted.rows[0]
      })
      res.status(201).json(result)
    } catch (error) {
      sendError(res, error, 'فشل حفظ الحركة المالية')
    }
  }
)

financialOperationsRouter.put(
  '/finances/:id',
  requirePermission('create_finances'),
  async (req: any, res) => {
    try {
      const updated = await inTransaction(async (client) => {
        const existingRes = await client.query(
          'SELECT * FROM finances WHERE id = $1 AND company_id = $2 FOR UPDATE',
          [req.params.id, req.auth.companyId]
        )
        if (!existingRes.rows.length) {
          throw Object.assign(new Error('الحركة المالية غير موجودة'), { status: 404 })
        }
        const existing = existingRes.rows[0]
        const data = req.body || {}
        const type = data.type || existing.type
        const { caseId, clientId, ownerType } = await validateAndResolveFinanceLinks(
          client,
          req.auth.companyId,
          {
            type,
            expense_owner_type:
              data.expense_owner_type !== undefined
                ? data.expense_owner_type
                : existing.expense_owner_type,
            case_id: data.case_id !== undefined ? data.case_id : existing.case_id,
            client_id: data.client_id !== undefined ? data.client_id : existing.client_id
          }
        )
        const amount = asPositiveMoney(data.amount !== undefined ? data.amount : existing.amount)
        const vatRate = normalizeVatRate(
          data.vat_rate !== undefined ? data.vat_rate : existing.vat_rate ?? 0
        )
        const vatAmount = Math.round(amount * vatRate * 100) / 100
        const total = Math.round((amount + vatAmount) * 100) / 100
        const accountId =
          data.account_id !== undefined ? data.account_id || null : existing.account_id

        if (existing.account_id) {
          await applyAccountMovement(
            client,
            req.auth.companyId,
            existing.account_id,
            existing.type === 'income' ? 'payment' : 'receipt',
            Number(existing.total ?? existing.amount ?? 0)
          )
        }
        if (accountId) {
          await applyAccountMovement(
            client,
            req.auth.companyId,
            accountId,
            type === 'income' ? 'receipt' : 'payment',
            total
          )
        }

        const resRow = await client.query(
          `UPDATE finances
           SET case_id = $1, client_id = $2, type = $3, amount = $4, category = $5,
               description = $6, date = $7, vat_rate = $8, vat_amount = $9, total = $10,
               expense_owner_type = $11, account_id = $12, updated_by = $13, updated_at = NOW()
           WHERE id = $14 AND company_id = $15
           RETURNING *`,
          [
            caseId,
            clientId,
            type,
            amount,
            data.category !== undefined ? data.category : existing.category,
            data.description !== undefined ? data.description : existing.description,
            data.date || existing.date,
            vatRate,
            vatAmount,
            total,
            ownerType,
            accountId,
            req.auth.userId,
            req.params.id,
            req.auth.companyId
          ]
        )
        return resRow.rows[0]
      })
      res.json(updated)
    } catch (error) {
      sendError(res, error, 'فشل تعديل الحركة المالية')
    }
  }
)

financialOperationsRouter.patch(
  '/invoices/:id/status',
  requirePermission('create_finances'),
  async (req: any, res) => {
    try {
      const status = String(req.body?.status || '').trim()
      if (!status) throw Object.assign(new Error('الحالة مطلوبة'), { status: 400 })
      await inTransaction(async (client) => {
        const inv = await client.query(
          'UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3 RETURNING *',
          [status, req.params.id, req.auth.companyId]
        )
        if (!inv.rows.length) {
          throw Object.assign(new Error('الفاتورة غير موجودة'), { status: 404 })
        }
        if (status === 'paid') {
          await client.query(
            `UPDATE receivables SET status = 'paid', amount_paid = amount_due, updated_at = NOW()
             WHERE invoice_id = $1 AND company_id = $2`,
            [req.params.id, req.auth.companyId]
          )
        }
      })
      res.json({ success: true })
    } catch (error) {
      sendError(res, error, 'فشل تحديث حالة الفاتورة')
    }
  }
)

financialOperationsRouter.get(
  '/receivables/open',
  requirePermission('view_finances'),
  async (req: any, res) => {
    try {
      const result = await query(
        `${receivableSelect}
         WHERE r.company_id = $1
           AND COALESCE(r.status, 'pending') NOT IN ('paid', 'cancelled')
           AND COALESCE(r.amount_due, 0) > COALESCE(r.amount_paid, 0)
         ORDER BY r.due_date NULLS LAST, r.created_at DESC`,
        [req.auth.companyId]
      )
      res.json(result.rows)
    } catch (error) {
      sendError(res, error, 'فشل جلب الذمم المفتوحة')
    }
  }
)

financialOperationsRouter.delete(
  '/finances/:id',
  requirePermission('delete_finances'),
  async (req: any, res) => {
    try {
      await inTransaction(async (client) => {
        const existing = await client.query(
          'SELECT * FROM finances WHERE id = $1 AND company_id = $2 FOR UPDATE',
          [req.params.id, req.auth.companyId]
        )
        if (!existing.rows.length) throw Object.assign(new Error('الحركة المالية غير موجودة'), { status: 404 })
        const finance = existing.rows[0]
        if (finance.legal_engagement_id) {
          throw Object.assign(
            new Error('لا يمكن حذف قيد مرتبط بخدمة قانونية؛ عدّل الخدمة للحفاظ على اتزان السجل المالي'),
            { status: 409 }
          )
        }
        if (finance.account_id) {
          await applyAccountMovement(
            client,
            req.auth.companyId,
            finance.account_id,
            finance.type === 'income' ? 'payment' : 'receipt',
            Number(finance.total ?? finance.amount ?? 0)
          )
        }
        await client.query('DELETE FROM finances WHERE id = $1 AND company_id = $2', [
          req.params.id,
          req.auth.companyId
        ])
      })
      res.json({ success: true })
    } catch (error) {
      sendError(res, error, 'فشل حذف الحركة المالية')
    }
  }
)

financialOperationsRouter.delete(
  '/vouchers/:id',
  requirePermission('delete_finances'),
  async (req: any, res) => {
    try {
      await inTransaction(async (client) => {
        const result = await client.query(
          'SELECT * FROM vouchers WHERE id = $1 AND company_id = $2 FOR UPDATE',
          [req.params.id, req.auth.companyId]
        )
        if (!result.rows.length) throw Object.assign(new Error('السند غير موجود'), { status: 404 })
        const voucher = result.rows[0]
        if (voucher.reference_type || voucher.reference_id || voucher.linked_transaction_id) {
          throw Object.assign(
            new Error('لا يمكن حذف سند مرتبط؛ أنشئ قيداً عكسياً للحفاظ على سجل التحصيل'),
            { status: 409 }
          )
        }
        await applyAccountMovement(
          client,
          req.auth.companyId,
          voucher.account_id,
          voucher.type === 'receipt' ? 'payment' : 'receipt',
          Number(voucher.amount || 0)
        )
        await client.query('DELETE FROM vouchers WHERE id = $1 AND company_id = $2', [
          req.params.id,
          req.auth.companyId
        ])
      })
      res.json({ success: true })
    } catch (error) {
      sendError(res, error, 'فشل حذف السند')
    }
  }
)

financialOperationsRouter.delete(
  '/invoices/:id',
  requirePermission('delete_finances'),
  async (req: any, res) => {
    try {
      await inTransaction(async (client) => {
        const invoiceResult = await client.query(
          'SELECT * FROM invoices WHERE id = $1 AND company_id = $2 FOR UPDATE',
          [req.params.id, req.auth.companyId]
        )
        if (!invoiceResult.rows.length) throw Object.assign(new Error('الفاتورة غير موجودة'), { status: 404 })
        const receivable = await client.query(
          'SELECT id, amount_paid FROM receivables WHERE invoice_id = $1 AND company_id = $2 FOR UPDATE',
          [req.params.id, req.auth.companyId]
        )
        if (receivable.rows.some((row) => Number(row.amount_paid || 0) > 0)) {
          throw Object.assign(new Error('لا يمكن حذف فاتورة عليها تحصيلات'), { status: 409 })
        }
        await client.query('DELETE FROM receivables WHERE invoice_id = $1 AND company_id = $2', [
          req.params.id,
          req.auth.companyId
        ])
        await client.query('DELETE FROM invoices WHERE id = $1 AND company_id = $2', [
          req.params.id,
          req.auth.companyId
        ])
      })
      res.json({ success: true })
    } catch (error) {
      sendError(res, error, 'فشل حذف الفاتورة')
    }
  }
)

financialOperationsRouter.delete(
  '/credit-notes/:id',
  requirePermission('delete_finances'),
  async (req: any, res) => {
    try {
      const result = await query(
        `DELETE FROM credit_notes
         WHERE id = $1 AND company_id = $2 AND status = 'pending' RETURNING id`,
        [req.params.id, req.auth.companyId]
      )
      if (!result.rows.length) {
        return res.status(409).json({ error: 'لا يمكن حذف إشعار معتمد أو مستخدم' })
      }
      res.json({ success: true })
    } catch (error) {
      sendError(res, error, 'فشل حذف الإشعار الدائن')
    }
  }
)

financialOperationsRouter.get(
  '/receivables/by-client/:clientId',
  requirePermission('view_finances'),
  async (req: any, res) => {
    try {
      const result = await query(
        `${receivableSelect}
         WHERE r.company_id = $1 AND r.client_id = $2
         ORDER BY r.created_at DESC`,
        [req.auth.companyId, req.params.clientId]
      )
      res.json(result.rows)
    } catch (error) {
      sendError(res, error, 'فشل جلب ذمم العميل')
    }
  }
)

financialOperationsRouter.post(
  '/receivables/from-invoice',
  requirePermission('create_finances'),
  async (req: any, res) => {
    try {
      const row = await inTransaction(async (client) => {
        const companyId = req.auth.companyId
        const invoiceId = req.body.invoice_id || req.body.invoice?.id
        if (!invoiceId || typeof invoiceId !== 'string') {
          const error: any = new Error('معرّف الفاتورة مطلوب')
          error.status = 400
          throw error
        }
        const invoiceResult = await client.query(
          'SELECT * FROM invoices WHERE id = $1 AND company_id = $2 FOR UPDATE',
          [invoiceId, companyId]
        )
        if (!invoiceResult.rows.length) {
          const error: any = new Error('الفاتورة غير موجودة')
          error.status = 404
          throw error
        }
        const existing = await client.query(
          'SELECT * FROM receivables WHERE invoice_id = $1 AND company_id = $2',
          [invoiceId, companyId]
        )
        if (existing.rows.length) return existing.rows[0]
        const invoice = invoiceResult.rows[0]
        if (!invoice.client_id) {
          const error: any = new Error('لا يمكن إنشاء ذمة لفاتورة بلا عميل')
          error.status = 400
          throw error
        }
        const total = asPositiveMoney(invoice.total, 'إجمالي الفاتورة')
        const dueDate = req.body.dueDate || req.body.due_date || invoice.date || new Date().toISOString().slice(0, 10)
        const result = await client.query(
          `INSERT INTO receivables
            (id, company_id, client_id, case_id, invoice_id, amount_due, amount_paid,
             due_date, status, description, version, created_by, updated_by)
           VALUES ($1,$2,$3,$4,$5,$6,0,$7,'pending',$8,1,$9,$9)
           RETURNING *`,
          [
            uuidv4(), companyId, invoice.client_id, invoice.case_id || null, invoice.id, total,
            dueDate, invoice.notes || `ذمة الفاتورة ${invoice.invoice_number}`, req.auth.userId
          ]
        )
        return result.rows[0]
      })
      res.status(201).json(row)
    } catch (error) {
      sendError(res, error, 'فشل إنشاء الذمة من الفاتورة')
    }
  }
)

async function applyReceivablePayment(
  client: PoolClient,
  companyId: string,
  receivableId: string,
  amount: number,
  voucherId: string,
  userId: string
): Promise<any> {
  const result = await client.query(
    'SELECT * FROM receivables WHERE id = $1 AND company_id = $2 FOR UPDATE',
    [receivableId, companyId]
  )
  if (!result.rows.length) {
    const error: any = new Error('الذمة غير موجودة')
    error.status = 404
    throw error
  }
  const receivable = result.rows[0]
  const remaining = Number(receivable.amount_due || 0) - Number(receivable.amount_paid || 0)
  if (amount > remaining + 0.001) {
    const error: any = new Error('مبلغ الدفعة يتجاوز المتبقي')
    error.status = 400
    throw error
  }
  const paid = Math.round((Number(receivable.amount_paid || 0) + amount) * 100) / 100
  const status = paid >= Number(receivable.amount_due || 0) - 0.001 ? 'paid' : 'partial'
  const updated = await client.query(
    `UPDATE receivables SET amount_paid = $1, status = $2, last_voucher_id = $3,
       version = COALESCE(version, 1) + 1, updated_by = $4
     WHERE id = $5 AND company_id = $6 RETURNING *`,
    [paid, status, voucherId, userId, receivableId, companyId]
  )
  if (receivable.invoice_id) {
    await client.query(
      'UPDATE invoices SET status = $1 WHERE id = $2 AND company_id = $3',
      [status === 'paid' ? 'paid' : 'partially_paid', receivable.invoice_id, companyId]
    )
  }
  return updated.rows[0]
}

financialOperationsRouter.post(
  '/receivables/:id/apply-payment',
  requirePermission('create_finances'),
  async (req: any, res) => {
    try {
      const amount = asPositiveMoney(req.body.amount)
      const result = await inTransaction(async (client) => {
        const companyId = req.auth.companyId
        const receivable = await client.query(
          'SELECT * FROM receivables WHERE id = $1 AND company_id = $2 FOR UPDATE',
          [req.params.id, companyId]
        )
        if (!receivable.rows.length) {
          const error: any = new Error('الذمة غير موجودة')
          error.status = 404
          throw error
        }
        const item = receivable.rows[0]
        const number = voucherNumber()
        const voucher = await client.query(
          `INSERT INTO vouchers
            (id, company_id, client_id, case_id, account_id, voucher_number, type, amount,
             date, payment_method, notes, reference_type, reference_id, created_by, updated_by)
           VALUES ($1,$2,$3,$4,$5,$6,'receipt',$7,CURRENT_DATE,$8,$9,'invoice',$10,$11,$11)
           RETURNING *`,
          [
            uuidv4(), companyId, item.client_id, item.case_id || null, req.body.account_id || null,
            number, amount, req.body.payment_method || 'cash', req.body.notes || 'تحصيل ذمة مالية',
            item.id, req.auth.userId
          ]
        )
        await applyAccountMovement(client, companyId, req.body.account_id, 'receipt', amount)
        const updated = await applyReceivablePayment(
          client, companyId, item.id, amount, voucher.rows[0].id, req.auth.userId
        )
        return { receivable: updated, voucher: voucher.rows[0] }
      })
      res.json(result)
    } catch (error) {
      sendError(res, error, 'فشل تطبيق الدفعة')
    }
  }
)

financialOperationsRouter.post(
  '/financial-operations/invoices',
  requirePermission('create_finances'),
  async (req: any, res) => {
    try {
      const result = await inTransaction(async (client) => {
        const data = req.body || {}
        if (!data.invoice_number || !data.client_id) {
          const error: any = new Error('رقم الفاتورة والعميل مطلوبان')
          error.status = 400
          throw error
        }
        const items = Array.isArray(data.items) && data.items.length
          ? data.items
          : [{ description: data.description || 'أتعاب مهنية', amount: data.amount }]
        const cleanItems = items.map((item: any) => ({
          description: String(item.description || '').trim() || 'بند مالي',
          amount: asPositiveMoney(item.amount, 'قيمة بند الفاتورة')
        }))
        const subtotal = Math.round(cleanItems.reduce((sum: number, item: any) => sum + item.amount, 0) * 100) / 100
        const vatRate = normalizeVatRate(data.vat_rate)
        const tax = Math.round(subtotal * vatRate * 100) / 100
        const total = Math.round((subtotal + tax) * 100) / 100
        const invoice = await client.query(
          `INSERT INTO invoices
            (id, company_id, client_id, case_id, invoice_number, date, subtotal, tax_amount,
             vat_rate, total, status, notes, created_by, updated_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)
           RETURNING *`,
          [
            uuidv4(), req.auth.companyId, data.client_id, data.case_id || null,
            String(data.invoice_number).trim(), data.date || new Date().toISOString().slice(0, 10),
            subtotal, tax, vatRate, total, data.status || 'draft', data.description || null,
            req.auth.userId
          ]
        )
        for (const item of cleanItems) {
          await client.query(
            'INSERT INTO invoice_items (id, company_id, invoice_id, description, amount) VALUES ($1,$2,$3,$4,$5)',
            [uuidv4(), req.auth.companyId, invoice.rows[0].id, item.description, item.amount]
          )
        }
        const receivable = await client.query(
          `INSERT INTO receivables
            (id, company_id, client_id, case_id, invoice_id, amount_due, amount_paid,
             due_date, status, description, version, created_by, updated_by)
           VALUES ($1,$2,$3,$4,$5,$6,0,$7,'pending',$8,1,$9,$9)
           RETURNING *`,
          [
            uuidv4(), req.auth.companyId, data.client_id, data.case_id || null,
            invoice.rows[0].id, total, data.due_date || data.date || new Date().toISOString().slice(0, 10),
            data.description || `ذمة الفاتورة ${data.invoice_number}`, req.auth.userId
          ]
        )
        return { invoice: invoice.rows[0], receivable: receivable.rows[0] }
      })
      res.status(201).json(result)
    } catch (error) {
      sendError(res, error, 'فشل إصدار الفاتورة')
    }
  }
)

financialOperationsRouter.post(
  '/financial-operations/vouchers',
  requirePermission('create_finances'),
  async (req: any, res) => {
    try {
      const amount = asPositiveMoney(req.body.amount)
      const result = await inTransaction(async (client) => {
        const companyId = req.auth.companyId
        const data = req.body
        let linked: any = null
        if (data.reference_type === 'invoice' && data.reference_id) {
          const receivable = await client.query(
            'SELECT * FROM receivables WHERE id = $1 AND company_id = $2 FOR UPDATE',
            [data.reference_id, companyId]
          )
          if (!receivable.rows.length) {
            const error: any = new Error('مرجع الذمة غير موجود')
            error.status = 404
            throw error
          }
          const remaining = Number(receivable.rows[0].amount_due || 0) - Number(receivable.rows[0].amount_paid || 0)
          if (amount > remaining + 0.001) {
            const error: any = new Error('مبلغ السند يتجاوز المتبقي في الفاتورة')
            error.status = 400
            throw error
          }
        } else if (data.reference_type === 'credit_note' && data.reference_id) {
          const note = await client.query(
            'SELECT * FROM credit_notes WHERE id = $1 AND company_id = $2 FOR UPDATE',
            [data.reference_id, companyId]
          )
          if (!note.rows.length || note.rows[0].status !== 'approved') {
            const error: any = new Error('الإشعار الدائن غير موجود أو غير معتمد')
            error.status = 400
            throw error
          }
          if (amount > Number(note.rows[0].amount) + 0.001) {
            const error: any = new Error('مبلغ السند يتجاوز قيمة الإشعار الدائن')
            error.status = 400
            throw error
          }
          linked = note.rows[0]
        }
        const voucher = await client.query(
          `INSERT INTO vouchers
            (id, company_id, client_id, account_id, voucher_number, type, amount, date,
             payment_method, notes, reference_type, reference_id, created_by, updated_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$13)
           RETURNING *`,
          [
            uuidv4(), companyId, data.client_id || linked?.client_id || null, data.account_id || null,
            data.voucher_number || voucherNumber(), data.type || 'receipt', amount,
            data.date || new Date().toISOString().slice(0, 10), data.payment_method || 'cash',
            data.description || data.notes || null, data.reference_type || null,
            data.reference_id || null, req.auth.userId
          ]
        )
        await applyAccountMovement(
          client, companyId, data.account_id, data.type || 'receipt', amount
        )
        if (data.reference_type === 'invoice' && data.reference_id) {
          await applyReceivablePayment(
            client, companyId, data.reference_id, amount, voucher.rows[0].id, req.auth.userId
          )
        } else if (linked) {
          await client.query(
            "UPDATE credit_notes SET status = 'used' WHERE id = $1 AND company_id = $2",
            [linked.id, companyId]
          )
          if (linked.invoice_id) {
            const rec = await client.query(
              'SELECT * FROM receivables WHERE invoice_id = $1 AND company_id = $2 FOR UPDATE',
              [linked.invoice_id, companyId]
            )
            if (rec.rows.length) {
              const newDue = Math.max(0, Number(rec.rows[0].amount_due || 0) - amount)
              const paid = Number(rec.rows[0].amount_paid || 0)
              const status = paid >= newDue - 0.001 ? 'paid' : paid > 0 ? 'partial' : 'pending'
              await client.query(
                `UPDATE receivables SET amount_due = $1, status = $2,
                   linked_credit_note_id = $3, version = COALESCE(version,1)+1, updated_by = $4
                 WHERE id = $5 AND company_id = $6`,
                [newDue, status, linked.id, req.auth.userId, rec.rows[0].id, companyId]
              )
            }
          }
        }
        return voucher.rows[0]
      })
      res.status(201).json(result)
    } catch (error) {
      sendError(res, error, 'فشل حفظ السند')
    }
  }
)

financialOperationsRouter.put(
  '/credit-notes/:id/approve',
  requirePermission('create_finances'),
  async (req: any, res) => {
    try {
      const result = await query(
        `UPDATE credit_notes SET status = 'approved'
         WHERE id = $1 AND company_id = $2 AND status = 'pending' RETURNING *`,
        [req.params.id, req.auth.companyId]
      )
      if (!result.rows.length) return res.status(404).json({ error: 'الإشعار غير موجود أو غير قابل للاعتماد' })
      res.json(result.rows[0])
    } catch (error) {
      sendError(res, error, 'فشل اعتماد الإشعار الدائن')
    }
  }
)

financialOperationsRouter.put(
  '/credit-notes/:id/mark-used',
  requirePermission('create_finances'),
  async (req: any, res) => {
    try {
      const result = await query(
        `UPDATE credit_notes SET status = 'used'
         WHERE id = $1 AND company_id = $2 AND status = 'approved' RETURNING *`,
        [req.params.id, req.auth.companyId]
      )
      if (!result.rows.length) return res.status(404).json({ error: 'الإشعار غير موجود أو غير معتمد' })
      res.json(result.rows[0])
    } catch (error) {
      sendError(res, error, 'فشل استخدام الإشعار الدائن')
    }
  }
)
