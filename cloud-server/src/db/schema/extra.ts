import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  numeric,
  date,
  integer
} from 'drizzle-orm/pg-core'
import { cases } from './cases'
import { users, clients } from './core'
import { tasksV2 } from './tasks'

export const evidence = pgTable('evidence', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  caseId: uuid('case_id').references(() => cases.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  evidenceDate: date('evidence_date'),
  status: text('status'),
  isArchived: boolean('is_archived').default(false),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  archivedBy: uuid('archived_by'),
  archiveReason: text('archive_reason'),
  memoType: text('memo_type'),
  memoLabel: text('memo_label'),
  najizNumber: text('najiz_number'),
  najizDate: date('najiz_date'),
  memoStatus: text('memo_status'),
  opponentName: text('opponent_name'),
  memoText: text('memo_text'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

export const experts = pgTable('experts', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  caseId: uuid('case_id').references(() => cases.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  specialty: text('specialty'),
  phone: text('phone'),
  email: text('email'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

export const judgments = pgTable('judgments', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  caseId: uuid('case_id')
    .notNull()
    .references(() => cases.id, { onDelete: 'cascade' }),
  type: text('type'),
  judgmentDate: date('judgment_date'),
  judgmentDateHijri: text('judgment_date_hijri'),
  favor: text('favor'),
  objectionDeadline: date('objection_deadline'),
  notes: text('notes'),
  judgmentNumber: text('judgment_number'),
  judgmentType: text('judgment_type'),
  isExecutable: boolean('is_executable').default(false),
  objectionPeriodDays: integer('objection_period_days'),
  isObjectionHandled: boolean('is_objection_handled').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

export const judgmentAmendments = pgTable('judgment_amendments', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  judgmentId: uuid('judgment_id')
    .notNull()
    .references(() => judgments.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  content: text('content').notNull(),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

export const memoranda = pgTable('memoranda', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  caseId: uuid('case_id').references(() => cases.id, { onDelete: 'cascade' }),
  memoTitle: text('memo_title').notNull(),
  memoSummary: text('memo_summary'),
  memoDate: date('memo_date'),
  memoType: text('memo_type'),
  memoLabel: text('memo_label'),
  najizNumber: text('najiz_number'),
  najizDate: date('najiz_date'),
  memoStatus: text('memo_status').default('مسودة'),
  isArchived: boolean('is_archived').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

export const communications = pgTable('communications', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  caseId: uuid('case_id').references(() => cases.id, { onDelete: 'set null' }),
  expertId: uuid('expert_id'),
  type: text('type'),
  subject: text('subject'),
  date: date('date'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

export const collectionsClaims = pgTable('collections_claims', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  linkedEntityType: text('linked_entity_type'),
  linkedEntityId: uuid('linked_entity_id'),
  title: text('title'),
  amount: numeric('amount', { precision: 12, scale: 2 }),
  paidAmount: numeric('paid_amount', { precision: 12, scale: 2 }).default('0'),
  status: text('status'),
  dueDate: date('due_date'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

export const collectionsPayments = pgTable('collections_payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  claimId: uuid('claim_id').references(() => collectionsClaims.id, { onDelete: 'cascade' }),
  amount: numeric('amount', { precision: 12, scale: 2 }),
  paidAt: date('paid_at'),
  method: text('method'),
  referenceNo: text('reference_no'),
  notes: text('notes'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

export const userCaseAccess = pgTable(
  'user_case_access',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id').notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    caseId: uuid('case_id').references(() => cases.id, { onDelete: 'cascade' }),
    accessLevel: text('access_level'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
  },
  (table) => ({
    unqUserCaseAccess: { columns: [table.companyId, table.userId, table.caseId] }
  })
)

export const userClientAccess = pgTable(
  'user_client_access',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id').notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }),
    accessLevel: text('access_level'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
  },
  (table) => ({
    unqUserClientAccess: { columns: [table.companyId, table.userId, table.clientId] }
  })
)

export const scheduledReports = pgTable('scheduled_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  targetEmail: text('target_email').notNull(),
  reportType: text('report_type').default('users_report'),
  sendAt: timestamp('send_at', { withTimezone: true }).notNull(),
  status: text('status').default('pending'), // 'pending', 'sent', 'failed'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

export const timeLogs = pgTable('time_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  caseId: uuid('case_id').references(() => cases.id, { onDelete: 'set null' }),
  taskId: uuid('task_id').references(() => tasksV2.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }),
  durationMinutes: numeric('duration_minutes').default('0'),
  isBilled: boolean('is_billed').default(false),
  invoiceId: uuid('invoice_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull(), // 'session', 'task', 'payment', 'system'
  isRead: boolean('is_read').default(false),
  actionUrl: text('action_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

export const permissionAuditLogs = pgTable('permission_audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  targetUserId: uuid('target_user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  actionType: text('action_type').notNull(), // 'role_change', 'permission_grant', 'permission_revoke'
  details: text('details').notNull(),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

