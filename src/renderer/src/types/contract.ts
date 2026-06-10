export type ContractType = 'employment' | 'fee_agreement'

export type ContractStatus = 'draft' | 'approved'

export interface Contract {
  id: string
  contract_type: ContractType
  status: ContractStatus
  title?: string | null
  template_id?: string | null
  case_id?: string | null
  client_id?: string | null
  employee_user_id?: string | null
  representative_user_id?: string | null
  contract_date?: string | null
  start_date?: string | null
  end_date?: string | null
  is_fixed_term?: number
  term_years?: number | null
  total_amount?: number
  salary_amount?: number
  salary_due_day?: number | null
  text_content?: string | null
  created_by?: string | null
  approved_by?: string | null
  approved_at?: string | null
  is_archived?: number
  archived_at?: string | null
  archived_by?: string | null
  archive_reason?: string | null
  created_at?: string
  updated_at?: string
}

export interface ContractSchedule {
  id: string
  contract_id: string
  schedule_type: string
  title: string
  amount: number
  due_date?: string | null
  milestone_key?: string | null
  status: 'open' | 'paid' | 'cancelled'
  linked_receivable_id?: string | null
  linked_invoice_id?: string | null
  linked_claim_id?: string | null
  created_at?: string
  updated_at?: string
}

export interface ContractAmendment {
  id: string
  contract_id: string
  reason: string
  content: string
  created_by?: string | null
  created_at?: string
}
