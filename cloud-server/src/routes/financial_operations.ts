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

financialOperationsRouter.post(
  '/finances',
  requirePermission('create_finances'),
  async (req: any, res) => {
    try {
      const result = await inTransaction(async (client) => {
        const data = req.body || {}
        if (!['income', 'expense'].includes(data.type)) {
          throw Object.assign(new Error('نوع الحركة المالية غير صحيح'), { status: 400 })
        }
        const amount = asPositiveMoney(data.amount)
        const vatRate = normalizeVatRate(data.vat_rate ?? 0)
        const vatAmount = Math.round(amount * vatRate * 100) / 100
        const total = Math.round((amount + vatAmount) * 100) / 100
        await applyAccountMovement(
          client,
          req.auth.companyId,
          data.account_id,
          data.type === 'income' ? 'receipt' : 'payment',
          total
        )
        const inserted = await client.query(
          `INSERT INTO finances (
            id, company_id, case_id, client_id, type, amount, category, description, date,
            vat_rate, vat_amount, total, is_refundable, expense_owner_type, account_id,
            created_by, updated_by, status
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$16,'posted'
          ) RETURNING *`,
          [
            data.id || uuidv4(), req.auth.companyId, data.case_id || null, data.client_id || null,
            data.type, amount, data.category || null, data.description || null,
            data.date || new Date().toISOString().slice(0, 10), vatRate, vatAmount, total,
            data.is_refundable === true || data.is_refundable === 1 || data.is_refundable === '1',
            data.expense_owner_type || 'office', data.account_id,
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
