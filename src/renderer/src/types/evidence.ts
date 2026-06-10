export interface Evidence {
  id?: string
  case_id?: string
  title: string
  description?: string
  evidence_date?: string
  status?: 'active' | 'archived'
  created_at?: string
  updated_at?: string
  case_number?: string
}
