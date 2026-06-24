import { pgTable, uuid, text, boolean, timestamp, numeric, date, unique } from 'drizzle-orm/pg-core'
import { clients, users, defendants } from './core'

export const cases = pgTable(
  'cases',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id').notNull(),
    caseNumber: text('case_number').notNull(),
    clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
    responsibleUserId: uuid('responsible_user_id').references(() => users.id, {
      onDelete: 'set null'
    }),
    caseType: text('case_type'),
    mainClassification: text('main_classification'),
    subClassification: text('sub_classification'),
    subject: text('subject'),
    court: text('court'),
    circuit: text('circuit'),
    opponentName: text('opponent_name'),
    opponentId: text('opponent_id'),
    opponentNationality: text('opponent_nationality'),
    opponentCity: text('opponent_city'),
    opponentPhone: text('opponent_phone'),
    opponentAddress: text('opponent_address'),
    opponentEmail: text('opponent_email'),
    registrationDate: date('registration_date'),
    registrationDateHijri: text('registration_date_hijri'),
    contractDate: date('contract_date'),
    contractAmount: numeric('contract_amount', { precision: 12, scale: 2 }),
    clientRole: text('client_role'),
    assessment: text('assessment'),
    clientRequirement: text('client_requirement'),
    plaintiffRequests: text('plaintiff_requests'),
    phase: text('phase'),
    status: text('status').default('قيد النظر'),
    priority: text('priority').default('متوسطة'),
    folderLink: text('folder_link'),
    notes: text('notes'),
    najizUrl: text('najiz_url'),
    isArchived: boolean('is_archived').default(false),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    archivedBy: uuid('archived_by'),
    archiveReason: text('archive_reason'),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
  },
  (table) => ({
    unqCompanyCaseNumber: unique().on(table.companyId, table.caseNumber)
  })
)

export const caseParties = pgTable('case_parties', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  caseId: uuid('case_id')
    .notNull()
    .references(() => cases.id, { onDelete: 'cascade' }),
  partyType: text('party_type').notNull(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  defendantId: uuid('defendant_id').references(() => defendants.id, { onDelete: 'set null' }),
  name: text('name'),
  idNumber: text('id_number'),
  phone: text('phone'),
  nationality: text('nationality'),
  city: text('city'),
  address: text('address'),
  email: text('email'),
  role: text('role'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  caseId: uuid('case_id')
    .notNull()
    .references(() => cases.id, { onDelete: 'cascade' }),
  responsibleUserId: uuid('responsible_user_id').references(() => users.id, {
    onDelete: 'set null'
  }),
  date: date('date').notNull(),
  dateHijri: text('date_hijri'),
  time: text('time'),
  courtRoom: text('court_room'),
  status: text('status').default('قادمة'),
  notes: text('notes'),
  result: text('result'),
  meetingLink: text('meeting_link'),
  isArchived: boolean('is_archived').default(false),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  archivedBy: uuid('archived_by'),
  archiveReason: text('archive_reason'),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

export const sessionOutcomes = pgTable('session_outcomes', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  caseId: uuid('case_id').references(() => cases.id, { onDelete: 'set null' }),
  result: text('result').notNull(),
  notes: text('notes'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})
