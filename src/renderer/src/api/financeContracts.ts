import type { Invoice, Receivable } from '../types/finance'

const money = (value: unknown): number => {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number : 0
}

export function normalizeInvoice(row: any): Invoice {
  const subtotal = money(row?.subtotal ?? row?.amount)
  const vatAmount = money(row?.tax_amount ?? row?.vat_amount)
  const total = money(row?.total ?? row?.total_amount ?? subtotal + vatAmount)
  return {
    ...row,
    amount: subtotal,
    vat_amount: vatAmount,
    total_amount: total,
    description: row?.description ?? row?.notes ?? '',
    subtotal,
    tax_amount: vatAmount,
    total
  } as Invoice
}

export function normalizeReceivable(row: any): Receivable {
  const amountDue = money(row?.amount_due)
  const amountPaid = money(row?.amount_paid)
  return {
    ...row,
    amount_due: amountDue,
    amount_paid: amountPaid,
    remaining_amount: money(row?.remaining_amount ?? amountDue - amountPaid)
  } as Receivable
}

export function normalizeOfficeAccountsReport(report: any): any {
  const summary = report?.summary || {}
  return {
    ...report,
    summary,
    total_revenue: money(summary.total_revenue),
    total_collected: money(summary.total_collected),
    total_pending: money(summary.total_outstanding),
    total_overdue: money(summary.total_overdue),
    clients: Array.isArray(report?.by_client) ? report.by_client : [],
    categories: Array.isArray(report?.by_category) ? report.by_category : []
  }
}
