export interface Expert {
  id: string
  name: string
  specialty: string
  phone: string
  email: string
  case_number?: string | null
  notes?: string | null
  created_at?: string | null
  updated_at?: string | null
}
