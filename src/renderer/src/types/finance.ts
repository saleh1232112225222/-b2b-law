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
  payments: {
    id: string
    amount: number
    payment_method: string
    payment_date: string
    voucher_id: string | null
    voucher_number: string | null
    notes: string | null
    engagement_number: string
    engagement_id: string
    service_type_name: string
  }[]
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

export interface ClientFullProfile {
  client: {
    id: string
    name: string
    type: string
    id_number: string
    phone: string
    email: string
    city: string
    address: string
    notes: string
    created_at: string
  }
  first_deal_date: string | null
  cases: {
    id: string
    case_number: string
    case_type: string
    status: string
    total_fee: number
    opponent_name: string
    case_type_name: string
    status_name: string
    paid_amount: number
    remaining: number
  }[]
  services: {
    id: string
    engagement_number: string
    financial_compensation: number
    tax: number
    total_amount: number
    paid_amount: number
    remaining_amount: number
    finance_status: string
    start_date: string
    payment_method: string
    description: string
    installment_count: number
    category_name: string
    service_type_name: string
    responsible_name: string
  }[]
  payments: {
    id: string
    amount: number
    payment_method: string
    payment_date: string
    voucher_id: string | null
    voucher_number: string | null
    notes: string | null
    engagement_number: string
    engagement_id: string
    service_type_name: string
  }[]
  invoices: {
    id: string
    invoice_number: string
    date: string
    amount: number
    vat_amount: number
    total_amount: number
    status: string
    description: string
  }[]
  vouchers: {
    id: string
    voucher_number: string
    date: string
    type: string
    amount: number
    description: string
  }[]
  installment_schedules: {
    id: string
    installment_number: number
    title: string
    amount: number
    due_date: string
    paid_amount: number
    status: string
    engagement_number: string
  }[]
  summary: {
    total_cases: number
    total_services: number
    total_services_amount: number
    total_services_paid: number
    total_services_remaining: number
    total_payments: number
    total_invoices: number
    total_vouchers: number
    pending_installments: number
    overdue_installments: number
  }
}
