import { pgTable, uuid, text, boolean, timestamp, numeric, date, unique } from 'drizzle-orm/pg-core'

export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  isVerified: boolean('is_verified').default(false),
  verificationCode: text('verification_code'),
  trialExpiresAt: timestamp('trial_expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

export const clients = pgTable('clients', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  name: text('name').notNull(),
  type: text('type'),
  idNumber: text('id_number'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  nationality: text('nationality').default('سعودي'),
  city: text('city'),
  birthDate: date('birth_date'),
  notes: text('notes'),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

export const defendants = pgTable('defendants', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  name: text('name').notNull(),
  type: text('type'),
  idNumber: text('id_number'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  nationality: text('nationality').default('سعودي'),
  city: text('city'),
  birthDate: date('birth_date'),
  notes: text('notes'),
  isDeleted: boolean('is_deleted').default(false),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: uuid('deleted_by'),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

export const employees = pgTable('employees', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  name: text('name').notNull(),
  nationalId: text('national_id'),
  nationality: text('nationality').default('سعودي'),
  phone: text('phone'),
  email: text('email'),
  jobTitle: text('job_title'),
  roleType: text('role_type'),
  qualification: text('qualification'),
  licenseNumber: text('license_number'),
  contractNumber: text('contract_number'),
  salary: numeric('salary', { precision: 12, scale: 2 }),
  hourlyRate: numeric('hourly_rate', { precision: 8, scale: 2 }),
  status: text('status').default('active'),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id').notNull(),
    username: text('username').notNull(),
    fullName: text('full_name'),
    passwordHash: text('password_hash'),
    roleKey: text('role_key'),
    employeeId: uuid('employee_id').references(() => employees.id, { onDelete: 'set null' }),
    isActive: boolean('is_active').default(true),
    mustChangePassword: boolean('must_change_password').default(true),
    recoveryEmail: text('recovery_email'),
    securityQuestion: text('security_question'),
    securityAnswerHash: text('security_answer_hash'),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
  },
  (table) => ({
    unqCompanyUsername: unique().on(table.companyId, table.username)
  })
)
