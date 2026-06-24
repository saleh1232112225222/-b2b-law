import { pgTable, uuid, text, boolean, timestamp, unique } from 'drizzle-orm/pg-core'
import { users } from './core'

export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  actionKey: text('action_key'),
  moduleKey: text('module_key'),
  details: text('details'),
  entityId: text('entity_id'),
  entityName: text('entity_name'),
  actor: text('actor'),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  metadataJson: text('metadata_json'),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow()
})

export const settings = pgTable(
  'settings',
  {
    key: text('key'),
    companyId: uuid('company_id').notNull(),
    value: text('value'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
  },
  (table) => ({
    pkSettings: { columns: [table.companyId, table.key] }
  })
)

export const firmData = pgTable(
  'firm_data',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    companyId: uuid('company_id').notNull(),
    key: text('key').notNull(),
    value: text('value'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
  },
  (table) => ({
    unqFirmData: { columns: [table.companyId, table.key] }
  })
)
