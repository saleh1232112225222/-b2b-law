export interface CaseParty {
  id?: string
  case_id?: string
  party_type: 'client' | 'opponent'
  client_id?: string
  defendant_id?: string
  name: string
  id_number?: string
  phone?: string
  nationality?: string
  city?: string
  address?: string
  email?: string
  role?: string
  created_at?: string
  updated_at?: string
}

export interface Case {
  id?: string
  case_number: string
  client_id: string
  client_name?: string
  responsible_user_id?: string
  responsible_name?: string
  case_type?: string
  main_classification?: string
  sub_classification?: string
  subject: string
  court: string
  circuit?: string
  opponent_name?: string
  opponent_id?: string
  opponent_nationality?: string
  opponent_city?: string
  opponent_phone?: string
  opponent_address?: string
  opponent_email?: string
  status: string
  priority: string
  registration_date: string
  registration_date_hijri?: string
  phase?: string
  client_role?: string
  assessment?: string
  client_requirement?: string
  plaintiff_requests?: string
  contract_date?: string
  contract_amount?: number
  folder_link?: string
  najiz_url?: string
  notes?: string
  is_archived?: number
  archived_at?: string
  archived_by?: string
  archive_reason?: string
  created_at?: string
  updated_at?: string
  parties?: CaseParty[]
}
