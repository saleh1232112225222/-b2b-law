export interface Document {
  id: string
  case_id?: string | null
  task_id?: string | null
  session_id?: string | null
  link_type?: 'none' | 'case' | 'task' | 'session'
  linked_title?: string | null
  name: string
  file_path: string
  file_type?: string
  file_size?: number
  status?: string
  created_at?: string
  updated_at?: string
  context_label?: string
}
