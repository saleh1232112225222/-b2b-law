export type RoleKey = 'admin' | 'secretary' | 'licensed_lawyer' | 'trainee_lawyer'

export type AccessLevel = 'view' | 'edit'

export type AuthSession = {
  userId: string
  username: string
  fullName: string
  roleKey: RoleKey
  permissions: string[]
  mustChangePassword: boolean
  isLocked: boolean
  lastActivityAt: number
}

export type ActivityLogFilters = {
  module_key?: string
  action_key?: string
  fromDate?: string
  toDate?: string
  q?: string
}

export type ReportExportPdfPayload = {
  url: string
  filename?: string
}

export type ReportExportPdfResult = {
  saved: boolean
  path?: string
  filename?: string
  opened?: boolean
}

export type ReportExportCsvPayload = {
  filename: string
  rows: any[]
}

export type ReportExportCsvResult = {
  filename: string
  csv?: string
  saved?: boolean
  path?: string
}

export type UserListRow = {
  id: string
  username: string
  full_name?: string | null
  role_key: string
  is_active: number
  must_change_password: number
}

export type UserScopePayload = {
  userId: string
  type: 'case' | 'client'
  entityId: string
  accessLevel: AccessLevel
  action: 'set' | 'remove'
}
