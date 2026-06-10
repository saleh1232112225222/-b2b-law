import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { clients } from './core'

export const agencies = pgTable('agencies', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }),
  agencyNumber: text('agency_number').notNull(),
  date: timestamp('date', { withTimezone: true }),
  expiryDate: timestamp('expiry_date', { withTimezone: true }),
  court: text('court'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
})
