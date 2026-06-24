import { pgTable, uuid, text, boolean, timestamp, date } from 'drizzle-orm/pg-core'
import { clients, users } from './core'
import { cases } from './cases'

export const tasksV2 = pgTable('tasks_v2', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  caseId: uuid('case_id').references(() => cases.id, { onDelete: 'set null' }),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  linkType: text('link_type'),
  externalName: text('external_name'),
  ownerType: text('owner_type'),
  responsibleUserId: uuid('responsible_user_id').references(() => users.id, {
    onDelete: 'set null'
  }),
  title: text('title').notNull(),
  description: text('description'),
  dueDate: date('due_date'),
  status: text('status'),
  priority: text('priority'),
  statusChangedAt: timestamp('status_changed_at', { withTimezone: true }),
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  closedBy: uuid('closed_by'),
  closureNote: text('closure_note'),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  cancelledBy: uuid('cancelled_by'),
  cancelReason: text('cancel_reason'),
  waitingOnType: text('waiting_on_type'),
  waitingOnName: text('waiting_on_name'),
  blockedReason: text('blocked_reason'),
  isArchived: boolean('is_archived').default(false),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  archivedBy: uuid('archived_by'),
  archiveReason: text('archive_reason'),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

export const taskAuditLog = pgTable('task_audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  taskId: uuid('task_id')
    .notNull()
    .references(() => tasksV2.id, { onDelete: 'cascade' }),
  actionKey: text('action_key').notNull(),
  actorUserId: uuid('actor_user_id'),
  beforeJson: text('before_json'),
  afterJson: text('after_json'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

export const taskNotifications = pgTable('task_notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  taskId: uuid('task_id')
    .notNull()
    .references(() => tasksV2.id, { onDelete: 'cascade' }),
  notificationType: text('notification_type').notNull(),
  notifiedOn: text('notified_on').notNull(),
  notifiedAt: timestamp('notified_at', { withTimezone: true }).defaultNow()
})
