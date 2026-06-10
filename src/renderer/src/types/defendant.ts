export interface Defendant {
  id: string
  name: string
  type: 'فرد' | 'شركة' | 'مؤسسة' | 'جهة حكومية' | 'أخرى'
  id_number?: string
  phone?: string
  nationality?: string
  city?: string
  email?: string
  address?: string
  birth_date?: string
  notes?: string
  is_deleted?: number
  deleted_at?: string
  deleted_by?: string
  created_at?: string
  updated_at?: string
  created_by?: string
  updated_by?: string
}
