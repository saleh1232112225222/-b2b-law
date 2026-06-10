export interface Communication {
  id: string
  type: string
  date: string
  subject: string
  content: string
  client_id?: string | null
  case_id?: string | null
  created_at?: string | null
  updated_at?: string | null
}
