export interface Client {
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
  created_at?: string
  updated_at?: string
}
