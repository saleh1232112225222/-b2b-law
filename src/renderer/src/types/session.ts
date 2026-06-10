export interface Session {
  id: string
  case_id: string
  responsible_user_id?: string | null
  responsible_name?: string
  date: string
  date_hijri?: string
  time?: string
  court_room?: string
  status: string
  notes?: string
  result?: string
  type?: string
  created_at?: string
  updated_at?: string
  case_number?: string
  client_name?: string
  meeting_link?: string
}
