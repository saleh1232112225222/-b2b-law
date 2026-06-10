export interface Judgment {
  id: string
  case_id: string
  type: string
  judgment_date: string
  judgment_date_hijri?: string
  favor: string
  objection_deadline?: string
  judgment_number?: string
  judgment_type?: string
  is_executable?: number
  objection_period_days?: number
  is_objection_handled?: number
  notes?: string
  created_at?: string
  updated_at?: string
}
