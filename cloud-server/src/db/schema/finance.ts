import { pgTable, uuid, text, boolean, timestamp, numeric, date, unique } from 'drizzle-orm/pg-core'
import { clients, users } from './core'
import { cases } from './cases'

export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  name: text('name').notNull(),
  code: text('code').default(''),
  parentId: uuid('parent_id'),
  balance: numeric('balance', { precision: 12, scale: 2 }).default('0'),
  type: text('type'),
  isActive: boolean('is_active').default(true),
  isRefundable: boolean('is_refundable').default(false),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})

export const finances = pgTable('finances', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  caseId: uuid('case_id').references(() => cases.id, { onDelete: 'set null' }),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  type: text('type').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  category: text('category'),
  description: text('description'),
  date: date('date').notNull(),
  vatRate: numeric('vat_rate', { precision: 4, scale: 2 }).default('0.15'),
  vatAmount: numeric('vat_amount', { precision: 12, scale: 2 }).default('0'),
  total: numeric('total', { precision: 12, scale: 2 }),
  isRefundable: boolean('is_refundable').default(false),
  expenseOwnerType: text('expense_owner_type').default('office'),
  accountId: uuid('account_id'),
  referenceId: text('reference_id'),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id').notNull(),
    clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
    caseId: uuid('case_id').references(() => cases.id, { onDelete: 'set null' }),
    invoiceNumber: text('invoice_number').notNull(),
    date: date('date'),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }),
    taxAmount: numeric('tax_amount', { precision: 12, scale: 2 }),
    vatRate: numeric('vat_rate', { precision: 4, scale: 2 }),
    total: numeric('total', { precision: 12, scale: 2 }),
    status: text('status'),
    notes: text('notes'),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
  },
  (table) => ({
    unqCompanyInvoice: unique().on(table.companyId, table.invoiceNumber)
  })
)

export const invoiceItems = pgTable('invoice_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  invoiceId: uuid('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  description: text('description'),
  amount: numeric('amount', { precision: 12, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

export const vouchers = pgTable(
  'vouchers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id').notNull(),
    clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
    caseId: uuid('case_id').references(() => cases.id, { onDelete: 'set null' }),
    accountId: uuid('account_id'),
    voucherNumber: text('voucher_number').notNull(),
    type: text('type'),
    amount: numeric('amount', { precision: 12, scale: 2 }),
    date: date('date'),
    paymentMethod: text('payment_method'),
    notes: text('notes'),
    referenceType: text('reference_type'),
    referenceId: text('reference_id'),
    linkedTransactionId: text('linked_transaction_id'),
    createdBy: uuid('created_by'),
    updatedBy: uuid('updated_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
  },
  (table) => ({
    unqCompanyVoucher: unique().on(table.companyId, table.voucherNumber)
  })
)

export const receivables = pgTable('receivables', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  clientId: uuid('client_id')
    .notNull()
    .references(() => clients.id, { onDelete: 'cascade' }),
  caseId: uuid('case_id').references(() => cases.id, { onDelete: 'set null' }),
  invoiceId: uuid('invoice_id'),
  amountDue: numeric('amount_due', { precision: 12, scale: 2 }),
  amountPaid: numeric('amount_paid', { precision: 12, scale: 2 }).default('0'),
  dueDate: date('due_date'),
  status: text('status'),
  description: text('description'),
  linkedCreditNoteId: uuid('linked_credit_note_id'),
  lastVoucherId: uuid('last_voucher_id'),
  version: numeric('version').default('1'),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

export const creditNotes = pgTable('credit_notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  clientId: uuid('client_id')
    .notNull()
    .references(() => clients.id, { onDelete: 'cascade' }),
  invoiceId: uuid('invoice_id'),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  reason: text('reason').notNull(),
  date: date('date').notNull(),
  status: text('status').default('pending'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})
