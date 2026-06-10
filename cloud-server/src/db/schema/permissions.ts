import { pgTable, uuid, text, boolean } from 'drizzle-orm/pg-core'
import { users } from './core'

export const permissions = pgTable('permissions', {
  permissionKey: text('permission_key'),
  companyId: uuid('company_id').notNull(),
  permissionName: text('permission_name'),
  moduleKey: text('module_key')
}, (table) => ({
  pkPermission: { columns: [table.companyId, table.permissionKey] }
}))

export const rolePermissions = pgTable('role_permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  roleKey: text('role_key'),
  permissionKey: text('permission_key')
}, (table) => ({
  unqRolePerm: { columns: [table.companyId, table.roleKey, table.permissionKey] }
}))

export const userPermissions = pgTable('user_permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  permissionKey: text('permission_key').notNull(),
  isAllowed: boolean('is_allowed')
}, (table) => ({
  unqUserPerm: { columns: [table.companyId, table.userId, table.permissionKey] }
}))
