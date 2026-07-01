export interface Transaction {
  id: string
  type: 'income' | 'expense'
  client_id?: string
  case_id?: string | null
  is_related_to_case: boolean
  amount: number
  vat_rate: number
  vat_amount: number
  account_id: string
  expense_owner_type: 'office' | 'case' | 'client'
  is_refundable: number | boolean
  date: string
  category: string
  description?: string
  account_name?: string
  // Joined fields
  client_name?: string
  case_number?: string
  opponent_name?: string
  deleteType?: 'transaction' | 'invoice' | 'voucher'
}

export interface Account {
  id: string
  code: string
  name: string
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  balance: number
}

export interface FinanceStats {
  income: number
  expense: number
  balance: number
}

export interface Invoice {
  id: string
  invoice_number: string
  date: string
  client_id: string
  client_name?: string
  amount: number
  vat_amount: number
  total_amount: number
  status: 'draft' | 'sent' | 'paid' | 'cancelled'
  case_id?: string
  description?: string
}

export interface Voucher {
  id: string
  voucher_number: string
  date: string
  type: 'receipt' | 'payment'
  amount: number
  client_id?: string
  client_name?: string
  case_id?: string
  account_id: string
  account_name?: string
  description?: string
}

export interface Receivable {
  id: string
  client_id: string
  client_name?: string
  case_id?: string
  invoice_id?: string
  amount_due: number
  amount_paid: number
  remaining_amount: number
  due_date: string
  status: 'pending' | 'partially_paid' | 'paid' | 'overdue'
}

export interface CreditNote {
  id?: string
  client_id: string
  client_name?: string
  invoice_id?: string
  invoice_number?: string
  amount: number
  reason: string
  date: string
  created_by: string
  status: 'pending' | 'approved' | 'used'
}

export interface PaymentSchedule {
  id: string
  legal_engagement_id: string
  installment_number: number
  title: string
  amount: number
  due_date: string
  paid_amount: number
  paid_date: string | null
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  payment_method: string | null
  voucher_id: string | null
  voucher_number?: string
  notes: string | null
}

export interface PaymentRecord {
  id: string
  legal_engagement_id: string
  payment_schedule_id: string | null
  amount: number
  payment_method: string
  voucher_id: string | null
  voucher_number?: string
  notes: string | null
  received_by: string
  received_at: string
}

export interface ClientAccount {
  id: string
  client_id: string
  client_name?: string
  total_due: number
  total_paid: number
  balance: number
  overdue_amount: number
  last_payment_date: string | null
  status: 'active' | 'settled' | 'overdue'
}

export interface ClientFinancialSummary {
  summary: {
    total_services: number
    total_due: number
    total_paid: number
    balance: number
    overdue_amount: number
  }
  services: any[]
  overdue_items: PaymentSchedule[]
  upcoming_items: PaymentSchedule[]
}

export interface OfficeAccountsReport {
  summary: {
    total_revenue: number
    total_collected: number
    total_outstanding: number
    total_overdue: number
    collection_rate: number
  }
  by_category: { category: string; total: number; collected: number }[]
  by_client: { client_id: string; client_name: string; total: number; collected: number }[]
  overdue_items: any[]
}
