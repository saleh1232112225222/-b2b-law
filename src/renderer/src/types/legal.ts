export interface LegalEngagement {
  id?: string
  engagement_number: string
  engagement_type_id: string
  category_id: string
  service_type?: string
  client_id?: string
  beneficiary?: string
  linked_parties?: string
  responsible_lawyer_id?: string | null
  assistant_team?: string
  description?: string
  purpose?: string
  start_date?: string
  expected_end_date?: string
  completion_date?: string
  status_id: string
  priority_id: string
  financial_compensation?: number
  tax?: number
  paid_amount?: number
  remaining_amount?: number
  payment_method?: string
  contract_id?: string
  case_id?: string
  invoice_id?: string
  notes?: string
  created_at?: string
  created_by?: string
  updated_at?: string
  updated_by?: string
  deleted_at?: string
  deleted_by?: string

  // Joined fields for tables/views
  client_name?: string
  category_name?: string
  service_type_name?: string
  status_name?: string
  status_color?: string
  priority_name?: string
  priority_color?: string
  responsible_name?: string
  contract_number?: string
  case_number?: string
  invoice_number?: string
  finance_status?: string
  installment_count?: number
}
