import { z } from 'zod'
import { Request, Response, NextFunction } from 'express'

// Entity creation/update schema (entity.ts)
const ALLOWED_ENTITY_FIELDS: Record<string, string[]> = {
  clients: [
    'id',
    'company_id',
    'name',
    'type',
    'id_number',
    'national_id',
    'phone',
    'email',
    'address',
    'nationality',
    'city',
    'birth_date',
    'notes',
    'created_by',
    'updated_by',
    'created_at',
    'updated_at'
  ],
  defendants: [
    'id',
    'company_id',
    'name',
    'type',
    'id_number',
    'national_id',
    'phone',
    'email',
    'address',
    'nationality',
    'city',
    'birth_date',
    'notes',
    'is_deleted',
    'deleted_at',
    'deleted_by',
    'created_by',
    'updated_by',
    'created_at',
    'updated_at'
  ],
  cases: [
    'id',
    'company_id',
    'case_number',
    'subject',
    'court',
    'circuit',
    'judge',
    'status',
    'priority',
    'client_id',
    'responsible_user_id',
    'case_type',
    'main_classification',
    'sub_classification',
    'opponent_name',
    'opponent_id',
    'opponent_nationality',
    'opponent_city',
    'opponent_phone',
    'opponent_address',
    'opponent_email',
    'opposing_party',
    'registration_date',
    'registration_date_hijri',
    'contract_date',
    'contract_amount',
    'client_role',
    'assessment',
    'client_requirement',
    'plaintiff_requests',
    'phase',
    'folder_link',
    'filing_date',
    'next_session_date',
    'notes',
    'najiz_url',
    'is_archived',
    'archived_at',
    'archived_by',
    'archive_reason',
    'final_outcome',
    'claimed_amount',
    'awarded_amount',
    'failure_reason',
    'created_by',
    'updated_by',
    'created_at',
    'updated_at'
  ],
  contracts: [
    'id',
    'company_id',
    'contract_number',
    'title',
    'type',
    'status',
    'client_id',
    'start_date',
    'end_date',
    'value',
    'notes',
    'created_by',
    'updated_by',
    'created_at',
    'updated_at'
  ],
  sessions: [
    'id',
    'company_id',
    'session_number',
    'case_id',
    'date',
    'time',
    'court',
    'circuit',
    'judge',
    'status',
    'notes',
    'result',
    'created_by',
    'updated_by',
    'created_at',
    'updated_at'
  ],
  tasks: [
    'id',
    'company_id',
    'title',
    'description',
    'status',
    'priority',
    'due_date',
    'assigned_to',
    'case_id',
    'created_by',
    'updated_by',
    'created_at',
    'updated_at'
  ]
}

const MAX_STRING_LENGTH = 5000

function sanitizeString(value: string): string {
  if (typeof value !== 'string') return value
  return value.slice(0, MAX_STRING_LENGTH).replace(/[<>]/g, '')
}

export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      const val = req.body[key]
      if (typeof val === 'string') {
        req.body[key] = sanitizeString(val)
      }
    }
  }
  next()
}

export function validateEntityBody(req: Request, res: Response, next: NextFunction): void {
  const table = req.baseUrl.split('/').pop()
  const allowedFields = ALLOWED_ENTITY_FIELDS[table || '']

  if (!allowedFields) {
    return next()
  }

  if (req.body && typeof req.body === 'object') {
    const invalidFields = Object.keys(req.body).filter((key) => !allowedFields.includes(key))
    if (invalidFields.length > 0) {
      res.status(400).json({
        error: 'حقول غير مسموح بها',
        invalidFields
      })
      return
    }

    // Validate string lengths
    for (const key of Object.keys(req.body)) {
      const val = req.body[key]
      if (typeof val === 'string' && val.length > MAX_STRING_LENGTH) {
        res.status(400).json({
          error: `الحقل "${key}" يتجاوز الطول الأقصى (${MAX_STRING_LENGTH} حرف)`
        })
        return
      }
    }
  }

  next()
}

// Registration schema
export const registerSchema = z.object({
  companyName: z.string().min(1, 'اسم المكتب مطلوب').max(200),
  username: z
    .string()
    .min(3, 'اسم المستخدم قصير جداً')
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/, 'اسم المستخدم يجب أن يحتوي على أحرف وأرقام فقط'),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل').max(128),
  email: z.string().email('بريد إلكتروني غير صالح').max(200),
  phone: z.string().min(10, 'رقم الهاتف غير صالح').max(20),
  recoveryEmail: z.string().email().max(200).optional()
})

// Login schema
export const loginSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1).max(128),
  companyId: z.string().uuid().optional()
})

// Case form schema
export const caseSchema = z.object({
  case_number: z.string().min(1, 'رقم القضية مطلوب').max(50),
  subject: z.string().min(1, 'موضوع القضية مطلوب').max(500),
  court: z.string().max(200).optional(),
  judge: z.string().max(200).optional(),
  status: z.string().max(50).optional(),
  priority: z.enum(['عالية', 'متوسطة', 'منخفضة', 'حرجة']).optional(),
  client_id: z.string().uuid().optional(),
  filing_date: z.string().optional(),
  next_session_date: z.string().optional(),
  opposing_party: z.string().max(200).optional(),
  notes: z.string().max(5000).optional()
})

// Task form schema
export const taskSchema = z.object({
  title: z.string().min(1, 'عنوان المهمة مطلوب').max(200),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  priority: z.enum(['عالية', 'متوسطة', 'منخفضة', 'حرجة']).optional(),
  due_date: z.string().optional(),
  assigned_to: z.string().uuid().optional(),
  case_id: z.string().uuid().optional()
})

// Session form schema
export const sessionSchema = z.object({
  session_number: z.number().int().positive().optional(),
  case_id: z.string().uuid().optional(),
  date: z.string().min(1, 'تاريخ الجلسة مطلوب'),
  time: z.string().optional(),
  court: z.string().max(200).optional(),
  judge: z.string().max(200).optional(),
  status: z.string().max(50).optional(),
  notes: z.string().max(5000).optional(),
  result: z.string().max(2000).optional()
})

// Contract form schema
export const contractSchema = z.object({
  contract_number: z.string().min(1, 'رقم العقد مطلوب').max(50),
  title: z.string().min(1, 'عنوان العقد مطلوب').max(300),
  type: z.string().max(50).optional(),
  status: z.string().max(50).optional(),
  client_id: z.string().uuid().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  value: z.number().min(0).optional(),
  notes: z.string().max(5000).optional()
})

// Generic validation middleware factory
export function validateSchema(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const errors = result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message
      }))
      res.status(400).json({ error: 'بيانات غير صالحة', details: errors })
      return
    }
    req.body = result.data
    next()
  }
}
