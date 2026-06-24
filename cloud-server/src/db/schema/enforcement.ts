import { pgTable, uuid, text, boolean, timestamp, numeric, date, unique } from 'drizzle-orm/pg-core'
import { cases } from './cases'
import { users, clients } from './core'

export const enforcementRequests = pgTable(
  'enforcement_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id').notNull(),
    requestNo: text('request_no').notNull(),
    caseId: uuid('case_id').references(() => cases.id, { onDelete: 'set null' }),
    isOfficeCase: boolean('is_office_case').default(false),
    clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
    requestType: text('request_type'),
    instrumentNo: text('instrument_no'),
    najizRequestNo: text('najiz_request_no'),
    instrumentTypeMain: text('instrument_type_main'),
    instrumentTypeSub: text('instrument_type_sub'),
    instrumentDate: date('instrument_date'),
    courtName: text('court_name'),
    caseNumber: text('case_number'),
    requestClassification: text('request_classification'),
    otherExplanation: text('other_explanation'),
    status: text('status').default('draft'),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
  },
  (table) => ({
    unqCompanyRequest: unique().on(table.companyId, table.requestNo)
  })
)

export const enforcementFiles = pgTable('enforcement_files', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  executionFileNo: text('execution_file_no'),
  instrumentNo: text('instrument_no'),
  instrumentType: text('instrument_type'),
  instrumentSource: text('instrument_source'),
  linkedJudgmentId: uuid('linked_judgment_id'),
  courtName: text('court_name'),
  courtCircuit: text('court_circuit'),
  claimAmount: numeric('claim_amount', { precision: 12, scale: 2 }),
  collectedAmount: numeric('collected_amount', { precision: 12, scale: 2 }),
  status: text('status'),
  openedAt: date('opened_at'),
  lastActionAt: date('last_action_at'),
  ownerUserId: uuid('owner_user_id').references(() => users.id, { onDelete: 'set null' }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

export const enforcementParties = pgTable('enforcement_parties', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  enforcementId: uuid('enforcement_id').references(() => enforcementFiles.id, {
    onDelete: 'cascade'
  }),
  linkedEntityType: text('linked_entity_type'),
  linkedEntityId: uuid('linked_entity_id'),
  displayName: text('display_name'),
  role: text('role'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

export const enforcementActions = pgTable('enforcement_actions', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  enforcementId: uuid('enforcement_id').references(() => enforcementFiles.id, {
    onDelete: 'cascade'
  }),
  actionType: text('action_type'),
  actionDate: date('action_date'),
  notes: text('notes'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})
