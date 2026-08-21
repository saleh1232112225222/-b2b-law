import { describe, expect, it } from 'vitest'
import {
  normalizeInvoice,
  normalizeOfficeAccountsReport,
  normalizeReceivable
} from './financeContracts'

describe('finance API contracts', () => {
  it('maps stored invoice fields to the renderer contract', () => {
    const invoice = normalizeInvoice({ subtotal: '100.00', tax_amount: '15.00', total: '115.00' })
    expect(invoice.amount).toBe(100)
    expect(invoice.vat_amount).toBe(15)
    expect(invoice.total_amount).toBe(115)
  })

  it('derives a receivable remaining balance', () => {
    expect(normalizeReceivable({ amount_due: '115', amount_paid: '40' }).remaining_amount).toBe(75)
  })

  it('maps the office report envelope for the mobile view', () => {
    const report = normalizeOfficeAccountsReport({
      summary: { total_revenue: '2500', total_collected: '500', total_outstanding: '2000' },
      by_client: [{ client_id: '1' }]
    })
    expect(report.total_revenue).toBe(2500)
    expect(report.total_pending).toBe(2000)
    expect(report.clients).toHaveLength(1)
  })
})
