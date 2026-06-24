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
import { users, clients, defendants } from './core'

export const contracts = pgTable('contracts', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  contractNo: text('contract_no'),
  contractType: text('contract_type').notNull(),
  status: text('status').default('draft'),
  title: text('title'),
  templateId: uuid('template_id'),
  caseId: uuid('case_id').references(() => cases.id, { onDelete: 'set null' }),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  employeeUserId: uuid('employee_user_id').references(() => users.id, { onDelete: 'set null' }),
  representativeUserId: uuid('representative_user_id').references(() => users.id, {
    onDelete: 'set null'
  }),
  contractDate: date('contract_date'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  isFixedTerm: boolean('is_fixed_term').default(false),
  termYears: integer('term_years'),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).default('0'),
  salaryAmount: numeric('salary_amount', { precision: 12, scale: 2 }).default('0'),
  salaryDueDay: integer('salary_due_day'),
  textContent: text('text_content'),
  createdBy: uuid('created_by'),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  isArchived: boolean('is_archived').default(false),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  archivedBy: uuid('archived_by'),
  archiveReason: text('archive_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

export const contractPartyTypes = pgTable('contract_party_types', {
  partyTypeKey: text('party_type_key').primaryKey(),
  partyTypeName: text('party_type_name').notNull(),
  sortOrder: integer('sort_order').default(0)
})

export const contractParties = pgTable('contract_parties', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  partyTypeKey: text('party_type_key')
    .notNull()
    .references(() => contractPartyTypes.partyTypeKey),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  defendantId: uuid('defendant_id').references(() => defendants.id, { onDelete: 'set null' }),
  displayName: text('display_name').notNull(),
  metadataJson: text('metadata_json'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

export const contractParticipants = pgTable('contract_participants', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  contractId: uuid('contract_id')
    .notNull()
    .references(() => contracts.id, { onDelete: 'cascade' }),
  partyId: uuid('party_id')
    .notNull()
    .references(() => contractParties.id, { onDelete: 'cascade' }),
  roleKey: text('role_key').notNull(),
  roleLabel: text('role_label'),
  sideKey: text('side_key'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

export const contractSignatures = pgTable('contract_signatures', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  contractId: uuid('contract_id')
    .notNull()
    .references(() => contracts.id, { onDelete: 'cascade' }),
  participantId: uuid('participant_id')
    .notNull()
    .references(() => contractParticipants.id, { onDelete: 'cascade' }),
  partyId: uuid('party_id')
    .notNull()
    .references(() => contractParties.id, { onDelete: 'cascade' }),
  signatureStatus: text('signature_status').default('pending'),
  signaturePayloadJson: text('signature_payload_json'),
  signedAt: timestamp('signed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

export const contractSchedules = pgTable('contract_schedules', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  contractId: uuid('contract_id')
    .notNull()
    .references(() => contracts.id, { onDelete: 'cascade' }),
  scheduleType: text('schedule_type').notNull(),
  title: text('title').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  dueDate: date('due_date'),
  milestoneKey: text('milestone_key'),
  status: text('status').default('open'),
  linkedReceivableId: uuid('linked_receivable_id'),
  linkedInvoiceId: uuid('linked_invoice_id'),
  linkedClaimId: uuid('linked_claim_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

export const contractLinks = pgTable('contract_links', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  contractId: uuid('contract_id')
    .notNull()
    .references(() => contracts.id, { onDelete: 'cascade' }),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

export const contractAmendments = pgTable('contract_amendments', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  contractId: uuid('contract_id')
    .notNull()
    .references(() => contracts.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  content: text('content').notNull(),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

export const contractTemplates = pgTable('contract_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  contractType: text('contract_type').notNull(),
  name: text('name').notNull(),
  body: text('body').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})
