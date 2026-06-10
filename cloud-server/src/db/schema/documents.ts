import { pgTable, uuid, text, boolean, timestamp, bigint } from 'drizzle-orm/pg-core'
import { cases, sessions } from './cases'
import { tasksV2 } from './tasks'

export const documentsV2 = pgTable('documents_v2', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  caseId: uuid('case_id').references(() => cases.id, { onDelete: 'set null' }),
  taskId: uuid('task_id').references(() => tasksV2.id, { onDelete: 'set null' }),
  sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'set null' }),
  linkType: text('link_type'),
  linkedTitle: text('linked_title'),
  name: text('name').notNull(),
  filePath: text('file_path').notNull(),
  fileType: text('file_type'),
  fileSize: bigint('file_size', { mode: 'number' }).default(0),
  status: text('status').default('active'),
  isArchived: boolean('is_archived').default(false),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})

export const fileAssets = pgTable('file_assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  originalName: text('original_name'),
  storedPath: text('stored_path'),
  sizeBytes: bigint('size_bytes', { mode: 'number' }),
  mimeType: text('mime_type'),
  checksumSha256: text('checksum_sha256'),
  docType: text('doc_type'),
  linkedEntityType: text('linked_entity_type'),
  linkedEntityId: text('linked_entity_id'),
  tagsJson: text('tags_json'),
  uploadedBy: uuid('uploaded_by'),
  isDeleted: boolean('is_deleted').default(false),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  deletedBy: uuid('deleted_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
})
