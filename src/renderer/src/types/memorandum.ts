export interface Memorandum {
  id: string
  case_id: string
  case_number?: string // Join result
  client_name?: string // Join result
  opponent_name?: string
  memo_title: string
  memo_summary: string
  memo_date: string
  memo_type: string
  memo_label: string
  najiz_number?: string
  najiz_date?: string
  memo_status: string
  memo_text: string
  is_archived: number
  archived_at?: string
  archived_by?: string
  archive_reason?: string
  created_at?: string
  updated_at?: string
}
