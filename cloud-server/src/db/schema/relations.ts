import { relations } from 'drizzle-orm'
import { companies, clients, defendants, employees, users } from './core'
import { agencies } from './clients'
import { cases, caseParties, sessions, sessionOutcomes } from './cases'
import { tasksV2, taskAuditLog, taskNotifications } from './tasks'
import {
  accounts,
  finances,
  invoices,
  invoiceItems,
  vouchers,
  receivables,
  creditNotes
} from './finance'
import { documentsV2, fileAssets } from './documents'
import {
  enforcementRequests,
  enforcementFiles,
  enforcementParties,
  enforcementActions
} from './enforcement'
import {
  contracts,
  contractParties,
  contractParticipants,
  contractSignatures,
  contractSchedules,
  contractLinks,
  contractAmendments,
  contractTemplates
} from './contracts'
import {
  evidence,
  experts,
  judgments,
  judgmentAmendments,
  memoranda,
  communications,
  collectionsClaims,
  collectionsPayments,
  userCaseAccess,
  userClientAccess
} from './extra'
import { permissions, rolePermissions, userPermissions } from './permissions'
import { activityLogs, settings, firmData } from './activity'

export const casesRelations = relations(cases, ({ one, many }) => ({
  client: one(clients, { fields: [cases.clientId], references: [clients.id] }),
  responsibleUser: one(users, { fields: [cases.responsibleUserId], references: [users.id] }),
  parties: many(caseParties),
  sessions: many(sessions)
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  case: one(cases, { fields: [sessions.caseId], references: [cases.id] }),
  responsibleUser: one(users, { fields: [sessions.responsibleUserId], references: [users.id] })
}))

export const casePartiesRelations = relations(caseParties, ({ one }) => ({
  case: one(cases, { fields: [caseParties.caseId], references: [cases.id] }),
  client: one(clients, { fields: [caseParties.clientId], references: [clients.id] })
}))

export const tasksRelations = relations(tasksV2, ({ one, many }) => ({
  case: one(cases, { fields: [tasksV2.caseId], references: [cases.id] }),
  client: one(clients, { fields: [tasksV2.clientId], references: [clients.id] }),
  responsibleUser: one(users, { fields: [tasksV2.responsibleUserId], references: [users.id] }),
  auditLogs: many(taskAuditLog)
}))

export const invoicesRelations = relations(invoices, ({ many }) => ({
  items: many(invoiceItems)
}))

export const enforcementRequestsRelations = relations(enforcementRequests, ({ one }) => ({
  case: one(cases, { fields: [enforcementRequests.caseId], references: [cases.id] }),
  client: one(clients, { fields: [enforcementRequests.clientId], references: [clients.id] })
}))

export const enforcementFilesRelations = relations(enforcementFiles, ({ many }) => ({
  parties: many(enforcementParties),
  actions: many(enforcementActions)
}))

export const contractRelations = relations(contracts, ({ one, many }) => ({
  case: one(cases, { fields: [contracts.caseId], references: [cases.id] }),
  client: one(clients, { fields: [contracts.clientId], references: [clients.id] }),
  participants: many(contractParticipants),
  schedules: many(contractSchedules),
  links: many(contractLinks),
  amendments: many(contractAmendments)
}))

export const contractParticipantsRelations = relations(contractParticipants, ({ one }) => ({
  contract: one(contracts, {
    fields: [contractParticipants.contractId],
    references: [contracts.id]
  }),
  party: one(contractParties, {
    fields: [contractParticipants.partyId],
    references: [contractParties.id]
  })
}))

export const collectionsClaimsRelations = relations(collectionsClaims, ({ many }) => ({
  payments: many(collectionsPayments)
}))

export const judgmentsRelations = relations(judgments, ({ many }) => ({
  amendments: many(judgmentAmendments)
}))

export const agenciesRelations = relations(agencies, ({ one }) => ({
  client: one(clients, { fields: [agencies.clientId], references: [clients.id] })
}))
