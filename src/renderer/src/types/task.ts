export interface Task {
  id?: string
  case_id?: string | null
  client_id?: string | null
  responsible_user_id?: string | null
  responsible_name?: string
  link_type?: 'none' | 'case' | 'client'
  external_name?: string | null
  owner_type?: 'office' | 'external' | 'client'
  title: string
  description?: string
  due_date?: string
  status: string
  priority: string
  context_label?: string
  case_number?: string
  created_at?: string
  updated_at?: string
  is_archived?: number
  archived_at?: string | null
  archived_by?: string | null
  archive_reason?: string | null
  status_changed_at?: string | null
  scheduled_for?: string | null
  started_at?: string | null
  completed_at?: string | null
  closed_at?: string | null
  closed_by?: string | null
  closure_note?: string | null
  cancelled_at?: string | null
  cancelled_by?: string | null
  cancel_reason?: string | null
  waiting_on_type?: string | null
  waiting_on_name?: string | null
  blocked_reason?: string | null
  done?: boolean
}
