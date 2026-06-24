export {}

import type {
  Case,
  Client,
  Defendant,
  Session,
  Judgment,
  Task,
  Document,
  Evidence,
  Memorandum,
  CaseJourneyEvent,
  Transaction,
  Account,
  FinanceStats,
  Alert,
  Invoice,
  Receivable,
  Agency,
  CreditNote
} from './types'

import type {
  AuthSession,
  ActivityLogFilters,
  ReportExportCsvResult,
  ReportExportPdfResult,
  UserListRow,
  UserScopePayload
} from '../../shared/ipc-types'

type EmployeeRow = {
  id: string
  name: string
  national_id?: string | null
  nationality?: string | null
  phone?: string | null
  email?: string | null
  job_title?: string | null
  role_type?: string | null
  qualification?: string | null
  license_number?: string | null
  contract_number?: string | null
  salary?: number | null
  hourly_rate?: number | null
  status?: 'active' | 'inactive' | 'on_leave' | string | null
  user_id?: string | null
  created_at?: string
  updated_at?: string
}

type DashboardCaseAnalytics = {
  total: number
  buckets: { new: number; review: number; court: number; done: number }
  trend: Record<string, number>
  perf: {
    completionRate: number
    avgDaysToClose: number | null
    newCasesThisMonth: number
    customerSatisfactionRate: number | null
  }
}

declare global {
  interface Window {
    api: {
      auth: {
        login: (username: string, password: string) => Promise<AuthSession>
        devForceLogin: (username?: string) => Promise<AuthSession>
        logout: () => Promise<boolean>
        getSession: () => Promise<AuthSession | null>
        changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>
        touch: () => Promise<void>
        lock: () => Promise<boolean>
        unlock: (password: string) => Promise<boolean>
        checkAvailability: (field: string, value: string) => Promise<{ available: boolean }>
        onLockTriggered: (cb: () => void) => () => void
        register: (
          companyName: string,
          username: string,
          email: string,
          phone: string,
          password: string
        ) => Promise<{ success: boolean; companyId: string; username: string }>
        verifyAccount: (
          username: string,
          code: string
        ) => Promise<{ success: boolean; message: string }>
      }
      clients: {
        getAll: () => Promise<Client[]>
        count: (params?: { q?: string }) => Promise<number>
        list: (params: { page: number; pageSize: number; q?: string }) => Promise<Client[]>
        getById: (id: string) => Promise<Client>
        create: (client: Omit<Client, 'id'>) => Promise<string>
        update: (id: string, client: Partial<Client>) => Promise<boolean>
        delete: (id: string) => Promise<boolean>
      }
      defendants: {
        getAll: () => Promise<Defendant[]>
        count: (params?: { q?: string; includeDeleted?: boolean }) => Promise<number>
        list: (params: {
          page: number
          pageSize: number
          q?: string
          includeDeleted?: boolean
        }) => Promise<Defendant[]>
        getById: (id: string) => Promise<Defendant>
        create: (defendant: Omit<Defendant, 'id'>) => Promise<string>
        update: (id: string, defendant: Partial<Defendant>) => Promise<boolean>
        delete: (id: string) => Promise<boolean>
        restore: (id: string) => Promise<boolean>
      }
      agencies: {
        getAll: () => Promise<Agency[]>
        getByClientId: (id: string) => Promise<Agency[]>
        create: (r: Partial<Agency>) => Promise<string>
        update: (id: string, r: Partial<Agency>) => Promise<boolean>
        delete: (id: string) => Promise<boolean>
      }
      cases: {
        getAll: () => Promise<Case[]>
        getDashboardAnalytics: () => Promise<DashboardCaseAnalytics>
        count: (params?: {
          q?: string
          client_id?: string
          status?: string
          priority?: string
          responsible_user_id?: string
        }) => Promise<number>
        list: (params: {
          page: number
          pageSize: number
          q?: string
          client_id?: string
          status?: string
          priority?: string
          responsible_user_id?: string
        }) => Promise<Case[]>
        getById: (id: string) => Promise<Case>
        getByClientId: (clientId: string) => Promise<Case[]>
        create: (caseData: Partial<Case>) => Promise<string>
        update: (id: string, caseData: Partial<Case>) => Promise<boolean>
        delete: (id: string) => Promise<boolean>
        isUnique: (caseNumber: string, ignoreId?: string) => Promise<boolean>
        openFolder: (folderLink: string) => Promise<boolean>
        chooseRoot: () => Promise<string>
        createCaseFolder: (payload: {
          caseNumber: string
          clientName?: string
          opponentName?: string
        }) => Promise<{ path: string; name: string }>
        openNajizUrl: (najizUrl: string) => Promise<boolean>
        getAssignments: (caseId: string) => Promise<any[]>
        assignEmployee: (
          caseId: string,
          employeeId: string,
          role: string,
          notes?: string
        ) => Promise<string>
        removeEmployee: (caseId: string, employeeId: string) => Promise<void>
      }
      sessions: {
        getAll: () => Promise<Session[]>
        getUpcoming: () => Promise<Session[]>
        getByCaseId: (caseId: string) => Promise<Session[]>
        count: (params?: {
          q?: string
          case_id?: string
          status?: string
          client_id?: string
          from?: string
          to?: string
        }) => Promise<number>
        list: (params?: {
          q?: string
          page?: number
          pageSize?: number
          case_id?: string
          status?: string
          client_id?: string
          from?: string
          to?: string
          sortField?: string
          sortDir?: 'asc' | 'desc'
        }) => Promise<Session[]>
        create: (session: Partial<Session>) => Promise<string>
        update: (id: string, session: Partial<Session>) => Promise<boolean>
        delete: (id: string) => Promise<boolean>
        checkBlock: (caseId: string) => Promise<{ blocked: boolean; reason?: string }>
        getPendingClosure: () => Promise<Session[]>
      }
      tasks: {
        getAll: () => Promise<Task[]>
        getPending: () => Promise<Task[]>
        getByCaseId: (caseId: string) => Promise<Task[]>
        count: (params?: {
          q?: string
          status?: string
          responsible_user_id?: string
          priority?: string
          link_type?: string
          owner_type?: string
          due_from?: string
          due_to?: string
          is_archived?: number | boolean
        }) => Promise<number>
        list: (params: {
          page: number
          pageSize: number
          q?: string
          status?: string
          responsible_user_id?: string
          priority?: string
          link_type?: string
          owner_type?: string
          due_from?: string
          due_to?: string
          is_archived?: number | boolean
        }) => Promise<Task[]>
        create: (task: Partial<Task>) => Promise<string>
        update: (id: string, task: Partial<Task>) => Promise<boolean>
        delete: (id: string) => Promise<boolean>
        transition: (payload: {
          id: string
          to_status: string
          note?: string
          reason?: string
          waiting_on_type?: string
          waiting_on_name?: string
          blocked_reason?: string
        }) => Promise<any>
        close: (id: string, note: string) => Promise<any>
        cancel: (id: string, reason: string) => Promise<any>
        auditCount: (taskId: string) => Promise<number>
        auditList: (taskId: string, params: { page: number; pageSize: number }) => Promise<any[]>
      }
      judgments: {
        getAll: () => Promise<Judgment[]>
        getByCaseId: (id: string) => Promise<Judgment[]>
        create: (d: Partial<Judgment>) => Promise<string>
        update: (id: string, d: Partial<Judgment>) => Promise<boolean>
        delete: (id: string) => Promise<boolean>
        amendments: {
          list: (judgmentId: string) => Promise<
            Array<{
              id: string
              judgment_id: string
              reason: string
              content: string
              created_by: string | null
              created_at: string
            }>
          >
          create: (payload: {
            judgment_id: string
            reason: string
            content: string
          }) => Promise<string>
        }
      }
      contracts: {
        list: (params?: {
          contract_type?: 'employment' | 'fee_agreement'
          caseId?: string
          clientId?: string
          employeeUserId?: string
        }) => Promise<any[]>
        getById: (id: string) => Promise<{
          contract: any
          schedules: any[]
          links: any[]
          amendments: any[]
          participants: any[]
          partiesById: Record<string, any>
          signatures: any[]
        }>
        create: (payload: any) => Promise<string>
        update: (id: string, payload: any) => Promise<boolean>
        approve: (id: string) => Promise<boolean>
        archive: (id: string, reason?: string) => Promise<boolean>
        partyTypes: {
          list: () => Promise<any[]>
        }
        partyAudits: {
          list: (contractId: string) => Promise<any[]>
        }
        participants: {
          add: (contractId: string, payload: any) => Promise<string>
          update: (contractId: string, participantId: string, payload: any) => Promise<boolean>
          remove: (contractId: string, participantId: string) => Promise<boolean>
        }
        signatures: {
          update: (contractId: string, signatureId: string, payload: any) => Promise<boolean>
        }
        schedules: {
          update: (id: string, payload: any) => Promise<boolean>
        }
        amendments: {
          create: (payload: {
            contract_id: string
            reason: string
            content: string
          }) => Promise<string>
        }
        templates: {
          list: (contractType?: string) => Promise<any[]>
          create: (payload: any) => Promise<string>
          update: (id: string, payload: any) => Promise<boolean>
          delete: (id: string) => Promise<boolean>
        }
      }
      evidence: {
        getAll: () => Promise<Evidence[]>
        getByCaseId: (caseId: string) => Promise<Evidence[]>
        getById: (id: string) => Promise<Evidence>
        create: (evidence: Evidence) => Promise<string>
        update: (id: string, evidence: Partial<Evidence>) => Promise<boolean>
        delete: (id: string) => Promise<boolean>
      }
      memoranda: {
        getAll: () => Promise<Memorandum[]>
        getByCaseId: (caseId: string) => Promise<Memorandum[]>
        getById: (id: string) => Promise<Memorandum>
        create: (memo: Partial<Memorandum>) => Promise<string>
        update: (id: string, memo: Partial<Memorandum>) => Promise<boolean>
        delete: (id: string) => Promise<boolean>
        list: (params: {
          page: number
          pageSize: number
          q?: string
          status?: string
        }) => Promise<Memorandum[]>
        toggleArchive: (id: string, isArchived: boolean) => Promise<boolean>
      }
      documents: {
        getAll: () => Promise<Document[]>
        getByCaseId: (caseId: string) => Promise<Document[]>
        getByTaskId: (taskId: string) => Promise<Document[]>
        getBySessionId: (sessionId: string) => Promise<Document[]>
        create: (doc: Partial<Document>) => Promise<string>
        upload: (info: {
          linkType: 'none' | 'case' | 'task' | 'session'
          parentId?: string
          linkedTitle?: string
        }) => Promise<Document[]>
        open: (filePath: string) => Promise<void>
        delete: (id: string) => Promise<boolean>
      }
      finances: {
        getAll: () => Promise<Transaction[]>
        getStats: () => Promise<FinanceStats>
        create: (record: Partial<Transaction>) => Promise<string>
        delete: (id: string) => Promise<boolean>
      }
      invoices: {
        getAll: () => Promise<Invoice[]>
        getById: (id: string) => Promise<Invoice>
        create: (data: Partial<Invoice>) => Promise<string>
        delete: (id: string) => Promise<void>
      }
      vouchers: {
        getAll: () => Promise<Voucher[]>
        getById: (id: string) => Promise<Voucher>
        create: (data: Partial<Voucher>) => Promise<string>
        delete: (id: string) => Promise<void>
      }
      creditNotes: {
        getAll: () => Promise<CreditNote[]>
        getById: (id: string) => Promise<CreditNote>
        create: (data: Partial<CreditNote>) => Promise<string>
        markAsUsed: (id: string) => Promise<boolean>
        approve: (id: string) => Promise<boolean>
        delete: (id: string) => Promise<boolean>
      }
      enforcement: {
        count: (params: any) => Promise<number>
        list: (params: any) => Promise<any[]>
        get: (id: string) => Promise<any>
        create: (payload: any) => Promise<string>
        update: (id: string, payload: any) => Promise<boolean>
        listParties: (enforcementId: string) => Promise<any[]>
        setParties: (enforcementId: string, parties: any[]) => Promise<boolean>
        listActions: (enforcementId: string) => Promise<any[]>
        addAction: (enforcementId: string, action: any) => Promise<string>
        request: {
          list: (params: any) => Promise<any>
          get: (id: string) => Promise<any>
          create: (payload: any) => Promise<string>
          update: (id: string, payload: any) => Promise<boolean>
          addAttachments: (requestId: string, assetIds: string[], label: string) => Promise<boolean>
          getAttachments: (requestId: string) => Promise<any[]>
          delete: (id: string) => Promise<boolean>
        }
      }
      collections: {
        summary: (params: any) => Promise<any>
        countClaims: (params: any) => Promise<number>
        listClaims: (params: any) => Promise<any[]>
        getClaim: (id: string) => Promise<any>
        createClaim: (payload: any) => Promise<string>
        updateClaim: (id: string, payload: any) => Promise<boolean>
        listPayments: (claimId: string) => Promise<any[]>
        addPayment: (claimId: string, payload: any) => Promise<string>
      }
      search: {
        query: (q: string) => Promise<unknown[]>
      }
      system: {
        getAlerts: (today: string) => Promise<Alert[]>
        getDatabaseInventory: () => Promise<Array<{ name: string; count: number }>>
        getVersions: () => Promise<{ electron: string; chrome: string; node: string }>
        tailLog: (maxBytes?: number) => Promise<string>
        openExternal: (url: string) => Promise<boolean>
        openSessionWindow: (sessionId: string) => Promise<boolean>
        exportSupportBundle: () => Promise<{ saved: boolean; path?: string }>
        exportPerformanceReport: () => Promise<{ saved: boolean; path?: string }>
        getPerformanceData: () => Promise<any>
        saveJsonToFile: (data: any, filename: string) => Promise<{ saved: boolean; path?: string }>
        captureScreenshot: () => Promise<{ saved: boolean; path?: string }>
        captureScreenshotAuto: (tag?: string) => Promise<{ saved: boolean; path?: string }>
        clearAllData: () => Promise<boolean>
        clear: () => Promise<boolean>
        seed: (data: unknown[]) => Promise<boolean>
        importExcel: (filePath?: string) => Promise<unknown>
        importEmbeddedData: () => Promise<unknown>
        generateStressData: () => Promise<unknown>
        exportManualSnapshot: () => Promise<{
          success: boolean
          message?: string
          filePath?: string
          counts?: Record<string, number>
        }>
        exportAutoSnapshotToVault: () => Promise<{
          success: boolean
          message?: string
          filePath?: string
          fileName?: string
          counts?: Record<string, number>
        }>
        injectManualSnapshot: () => Promise<{
          success: boolean
          message?: string
          filePath?: string
          inserted?: Record<string, number>
        }>
        runDiagnostics: () => Promise<any>
      }
      backup: {
        export: () => Promise<boolean>
        import: () => Promise<{
          success: boolean
          requiresRestart: boolean
          manifest?: any
          warnings?: string[]
          errors?: string[]
          restored?: { dbBytes: number; vaultFiles: number }
        }>
        onRestoreProgress: (cb: (p: any) => void) => () => void
      }
      settings: {
        get: () => Promise<unknown>
        update: (settings: unknown) => Promise<boolean>
      }
      cloudRestore: {
        prepare: () => Promise<any>
        approve: () => Promise<any>
        showInFolder: () => Promise<void>
        exportFile: () => Promise<void>
      }
      cloudSync: {
        getUrl: () => Promise<{ url: string }>
        setUrl: (url: string) => Promise<boolean>
        test: () => Promise<boolean>
        exchangeCode: (code: string) => Promise<boolean>
        sync: () => Promise<boolean>
        uploadAll: (payload: any) => Promise<boolean>
        openSpreadsheet: () => Promise<void>
        getStats: () => Promise<unknown>
      }
      activity: {
        getAll: () => Promise<unknown[]>
        create: (payload: unknown) => Promise<string>
      }
      caseJourney: {
        getByCaseId: (caseId: string) => Promise<CaseJourneyEvent[]>
        create: (event: Omit<CaseJourneyEvent, 'id' | 'created_at'>) => Promise<string>
        update: (id: string, event: Partial<CaseJourneyEvent>) => Promise<boolean>
        delete: (id: string) => Promise<boolean>
        summary: (params: any) => Promise<any>
      }
      import: {
        importEmbeddedData: () => Promise<{
          success: boolean
          totalRows: number
          casesCreated: number
          sessionsCreated: number
          clientsCreated: number
          message: string
        }>
        clear: () => Promise<boolean>
        seed: (data: any[]) => Promise<boolean>
      }
      agencies: {
        getAll: () => Promise<unknown[]>
        getExpiryAlerts: (params?: { today?: string; days?: number }) => Promise<unknown[]>
        getByClientId: (id: string) => Promise<unknown[]>
        create: (r: unknown) => Promise<string>
        update: (id: string, r: unknown) => Promise<boolean>
        delete: (id: string) => Promise<boolean>
      }
      experts: {
        getAll: () => Promise<unknown[]>
        create: (r: unknown) => Promise<string>
        update: (id: string, r: unknown) => Promise<boolean>
        delete: (id: string) => Promise<boolean>
      }
      communications: {
        getAll: () => Promise<unknown[]>
        create: (r: unknown) => Promise<string>
        update: (id: string, r: unknown) => Promise<boolean>
        delete: (id: string) => Promise<boolean>
      }
      firm: {
        get: () => Promise<unknown>
        update: (d: unknown) => Promise<boolean>
        pickLogo: () => Promise<string | null>
        resolveLogoSrc: (logoPath: string) => Promise<string>
      }
      accounts: {
        getAll: () => Promise<Account[]>
        getById: (id: string) => Promise<Account>
        getByCode: (code: string) => Promise<Account>
        create: (acc: Partial<Account>) => Promise<string>
        updateBalance: (id: string, amt: number) => Promise<void>
      }
      receivables: {
        getAll: () => Promise<Receivable[]>
        getById: (id: string) => Promise<Receivable>
        getByClientId: (cid: string) => Promise<Receivable[]>
        getOpen: () => Promise<Receivable[]>
        createFromInvoice: (invoice: Invoice, dueDate?: string) => Promise<string>
        applyPayment: (id: string, amount: number) => Promise<void>
        delete: (id: string) => Promise<void>
      }
      activityLogs: {
        getAll: (filters?: ActivityLogFilters) => Promise<any[]>
        count: (filters?: ActivityLogFilters) => Promise<number>
        list: (params: {
          page: number
          pageSize: number
          filters?: ActivityLogFilters
        }) => Promise<any[]>
        clearBeforeDate: (date: string) => Promise<any>
      }
      activity: {
        getAll: (filters?: ActivityLogFilters) => Promise<any[]>
        count: (filters?: ActivityLogFilters) => Promise<number>
        list: (params: {
          page: number
          pageSize: number
          filters?: ActivityLogFilters
        }) => Promise<any[]>
        clearBeforeDate: (date: string) => Promise<any>
      }
      permissions: {
        getAll: () => Promise<
          Array<{ permission_key: string; permission_name: string; module_key: string }>
        >
      }
      employees: {
        list: () => Promise<EmployeeRow[]>
        get: (id: string) => Promise<EmployeeRow | null>
        create: (employee: Partial<EmployeeRow>) => Promise<string>
        update: (id: string, employee: Partial<EmployeeRow>) => Promise<void>
        delete: (id: string) => Promise<void>
        getPerformanceReport: (employeeId: string) => Promise<{
          totalCases: number
          totalTasks: number
          completedTasks: number
          totalMemoranda: number
          completionRate: number
        }>
        getAssignments: (employeeId: string) => Promise<any[]>
      }
      users: {
        getAll: () => Promise<UserListRow[]>
        listAssignable: () => Promise<
          Array<{ id: string; username: string; full_name?: string; role_key: string }>
        >
        listActiveStaff: () => Promise<
          Array<{ id: string; username: string; full_name?: string; role_key: string }>
        >
        create: (user: {
          username: string
          full_name?: string
          role_key: string
          password: string
          employee_id?: string
        }) => Promise<string>
        toggleActive: (userId: string, isActive: boolean) => Promise<boolean>
        delete: (userId: string) => Promise<boolean>
        setRole: (userId: string, roleKey: string) => Promise<boolean>
        setPermissionOverride: (
          userId: string,
          permissionKey: string,
          isAllowed: boolean
        ) => Promise<boolean>
        getScope: (userId: string) => Promise<{
          caseScopes: Array<{ case_id: string; access_level: 'view' | 'edit' }>
          clientScopes: Array<{ client_id: string; access_level: 'view' | 'edit' }>
        }>
        setScope: (payload: UserScopePayload) => Promise<boolean>
        getOverrides: (
          userId: string
        ) => Promise<Array<{ permission_key: string; is_allowed: boolean }>>
        setBulkPermissionOverrides: (
          userId: string,
          isAllowed: boolean,
          permissionKeys: string[]
        ) => Promise<boolean>
      }
      reports: {
        getCaseReport: (params: any) => Promise<any>
        listCases: () => Promise<any[]>
        getSessionsReport: (params: any) => Promise<any>
        getFinancialSummary: (params: any) => Promise<any>
        getActivityReport: (params: any) => Promise<any>
        exportCsv: (filename: string, rows: any[]) => Promise<ReportExportCsvResult>
        getUserActivityReport: (params: any) => Promise<any>
        getEvidenceReport: (params: any) => Promise<any>
        getMemorandaReport: (params: any) => Promise<any>
        getMemorandumFullData: (id: string) => Promise<any>
        getDocumentsReport: (params: any) => Promise<any>
        getOperationsSummary: () => Promise<any>
        getUsersPermissionsReport: () => Promise<any>
        exportPdf: (payload: { type: string; params: any }) => Promise<ReportExportPdfResult>
        exportHtml: (payload: { type: string; params: any }) => Promise<ReportExportPdfResult>
        printReport: (payload: { type: string; params: any }) => Promise<any>
        getPreviewHtml: (payload: { type: string; params: any }) => Promise<any>
        listUsers: () => Promise<any[]>
        listClients: () => Promise<any[]>
        listSessions: (caseId?: string) => Promise<any[]>
        listTasks: (caseId?: string) => Promise<any[]>
      }
      vault: {
        getRoot: () => Promise<{ path: string }>
        chooseRoot: () => Promise<any>
        needsSetup: () => Promise<{ needsSetup: boolean }>
        markSetupDone: () => Promise<boolean>
      }
      files: {
        upload: (params: any) => Promise<any>
        listByEntity: (params: any) => Promise<any[]>
        delete: (id: string) => Promise<boolean>
        open: (id: string) => Promise<boolean>
      }
      archive: {
        list: (
          type: string,
          params: { page: number; pageSize: number; q?: string; status?: string }
        ) => Promise<any[]>
        toggle: (type: string, id: string, isArchived: boolean) => Promise<boolean>
      }
      briefing: {
        getSummary: () => Promise<any>
      }
      sessionOutcome: {
        create: (outcome: any) => Promise<string>
        getBySession: (sessionId: string) => Promise<any>
      }
      workflow: {
        previewDecision: (payload: {
          sessionId: string
          resultLabel: string
          inputs?: any
        }) => Promise<{
          preview: any
          missing: Array<{ key: string; label: string; type: string; required: boolean }>
        }>
        applyDecision: (payload: {
          sessionId: string
          resultLabel: string
          inputs?: any
        }) => Promise<{
          outcomeId: string
          next: any
          decision: any
          createdTaskIds: string[]
        }>
      }
      admin: {
        maintenance: {
          bulkClosePreview: (days: number) => Promise<{
            thresholdDays: number
            sessions: {
              totalOverdue: number
              overdueGEThreshold: number
              overdueLTThreshold: number
            }
            tasks: {
              totalOverdue: number
              overdueGEThreshold: number
              overdueLTThreshold: number
              staleNoDueDateGEThreshold: number
            }
            totalOverdue: number
          }>
          bulkClose: (days: number) => Promise<{
            success: boolean
            closedSessions: number
            closedTasks: number
            total: number
          }>
        }
      }
    }
  }
}
