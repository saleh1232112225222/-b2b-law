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
