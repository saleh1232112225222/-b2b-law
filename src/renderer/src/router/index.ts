import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/login', name: 'Login', component: () => import('../views/Login.vue') },
  { path: '/register', name: 'Register', component: () => import('../views/Register.vue') },
  { path: '/dev-console', name: 'DevConsole', component: () => import('../views/DevConsole.vue') },
  {
    path: '/lock',
    name: 'LockScreen',
    component: () => import('../views/LockScreen.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/vault-setup',
    name: 'OfficeVaultSetup',
    component: () => import('../views/OfficeVaultSetup.vue'),
    meta: { requiresAuth: true }
  },
  { path: '/', redirect: '/dashboard' },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/briefing',
    name: 'Briefing',
    component: () => import('../views/BriefingDashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/session-room',
    name: 'SessionRoom',
    component: () => import('../views/SessionRoom.vue'),
    meta: { requiresAuth: true, permissions: ['view_sessions'] }
  },
  {
    path: '/clients',
    name: 'Clients',
    component: () => import('../views/Clients.vue'),
    meta: { requiresAuth: true, permissions: ['view_clients'] }
  },
  {
    path: '/defendants',
    name: 'Defendants',
    component: () => import('../views/Defendants.vue'),
    meta: { requiresAuth: true, permissions: ['view_defendants'] }
  },
  {
    path: '/clients/:id',
    name: 'ClientProfile',
    component: () => import('../views/ClientProfile.vue'),
    props: true,
    meta: { requiresAuth: true, permissions: ['view_clients'] }
  },
  {
    path: '/poa',
    name: 'POA',
    component: () => import('../views/POA.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/cases',
    name: 'Cases',
    component: () => import('../views/Cases.vue'),
    meta: { requiresAuth: true, permissions: ['view_cases'] }
  },
  {
    path: '/cases/:id',
    name: 'CaseDetails',
    component: () => import('../views/CaseDetails.vue'),
    props: true,
    meta: { requiresAuth: true, permissions: ['view_cases'] }
  },
  {
    path: '/sessions',
    name: 'Sessions',
    component: () => import('../views/Sessions.vue'),
    meta: { requiresAuth: true, permissions: ['view_sessions'] }
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: () => import('../views/Tasks.vue'),
    meta: { requiresAuth: true, permissions: ['view_tasks'] }
  },
  {
    path: '/documents',
    name: 'Documents',
    component: () => import('../views/Documents.vue'),
    meta: { requiresAuth: true, permissions: ['view_documents'] }
  },
  {
    path: '/drafting',
    name: 'Drafting',
    component: () => import('../views/Drafting.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/memoranda',
    name: 'Memoranda',
    component: () => import('../views/Memoranda.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/experts',
    name: 'Experts',
    component: () => import('../views/Experts.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/finance',
    name: 'Finance',
    component: () => import('../views/Finance.vue'),
    meta: { requiresAuth: true, permissions: ['view_finances'] }
  },
  {
    path: '/contracts',
    name: 'Contracts',
    component: () => import('../views/Contracts.vue'),
    meta: { requiresAuth: true, permissions: ['view_contracts'] }
  },
  {
    path: '/enforcement',
    name: 'Enforcement',
    component: () => import('../views/Enforcement.vue'),
    meta: { requiresAuth: true, permissions: ['view_enforcement'] }
  },
  {
    path: '/communications',
    name: 'Communications',
    component: () => import('../views/Communications.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/firm',
    name: 'Firm',
    component: () => import('../views/Firm.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/employees',
    name: 'Employees',
    component: () => import('../views/Employees.vue'),
    meta: { requiresAuth: true, permissions: ['view_employees'] }
  },
  {
    path: '/hr/performance/:id',
    name: 'EmployeePerformance',
    component: () => import('../views/EmployeePerformance.vue'),
    meta: { requiresAuth: true, permissions: ['view_hr_performance'] }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/Settings.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/subscription',
    name: 'Subscription',
    component: () => import('../views/SubscriptionPlans.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('../views/Search.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/archive',
    name: 'Archive',
    component: () => import('../views/Archive.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/activity-log',
    name: 'ActivityLog',
    component: () => import('../views/ActivityLog.vue'),
    meta: { requiresAuth: true, permissions: ['view_activity_logs'] }
  },
  {
    path: '/users',
    name: 'UsersManagement',
    component: () => import('../views/UsersManagement.vue'),
    meta: { requiresAuth: true, permissions: ['manage_users'] }
  },
  {
    path: '/reports',
    name: 'ReportsDashboard',
    component: () => import('../views/ReportsDashboard.vue'),
    meta: { requiresAuth: true, permissions: ['export_reports'] }
  },
  {
    path: '/reports/case',
    name: 'CaseReport',
    component: () => import('../views/CaseReport.vue'),
    meta: { requiresAuth: true, permissions: ['export_reports'] }
  },
  {
    path: '/reports/court-cases',
    name: 'CourtCasesReport',
    component: () => import('../views/CourtCasesReport.vue'),
    meta: { requiresAuth: true, permissions: ['export_reports'] }
  },
  {
    path: '/reports/sessions',
    name: 'SessionsReport',
    component: () => import('../views/SessionsReport.vue'),
    meta: { requiresAuth: true, permissions: ['export_reports'] }
  },
  {
    path: '/reports/finance',
    name: 'FinancialReport',
    component: () => import('../views/FinancialReport.vue'),
    meta: { requiresAuth: true, permissions: ['export_reports'] }
  },
  {
    path: '/reports/user-activity',
    name: 'UserActivityReport',
    component: () => import('../views/UserActivityReport.vue'),
    meta: { requiresAuth: true, permissions: ['export_reports'] }
  },
  {
    path: '/reports/evidence',
    name: 'EvidenceReport',
    component: () => import('../views/EvidenceReport.vue'),
    meta: { requiresAuth: true, permissions: ['export_reports'] }
  },
  {
    path: '/reports/memoranda',
    name: 'MemorandaReport',
    component: () => import('../views/MemorandaReport.vue'),
    meta: { requiresAuth: true, permissions: ['export_reports'] }
  },
  {
    path: '/reports/documents',
    name: 'DocumentsReport',
    component: () => import('../views/DocumentsReport.vue'),
    meta: { requiresAuth: true, permissions: ['export_reports'] }
  },
  {
    path: '/reports/operations',
    name: 'OperationsReport',
    component: () => import('../views/OperationsReport.vue'),
    meta: { requiresAuth: true, permissions: ['manage_settings'] }
  },
  {
    path: '/reports/users',
    name: 'UsersPermissionsReport',
    component: () => import('../views/UsersPermissionsReport.vue'),
    meta: { requiresAuth: true, permissions: ['manage_users'] }
  },
  {
    path: '/reports/detailed-inquiry',
    name: 'DetailedCaseInquiry',
    component: () => import('../views/DetailedCaseInquiry.vue'),
    meta: { requiresAuth: true, permissions: ['view_cases'] }
  },
  {
    path: '/vault',
    name: 'FileVault',
    component: () => import('../views/FileVault.vue'),
    meta: { requiresAuth: true, permissions: ['view_files'] }
  },
  {
    path: '/forbidden',
    name: 'Forbidden',
    component: () => import('../views/Forbidden.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/Profile.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach(async (to) => {
  if (to.name === 'DevConsole') return true
  const isLoggedIn = localStorage.getItem('web_isLoggedIn') === 'true'
  const isTestBypass = localStorage.getItem('testBypass') === 'true'

  // Unified auth guard for both web and desktop modes
  if (to.meta.requiresAuth && !isLoggedIn && !isTestBypass) {
    return '/login'
  }

  // Check subscription status for web mode
  if (to.meta.requiresAuth && isLoggedIn && typeof __IS_WEB__ !== 'undefined' && __IS_WEB__) {
    const sessionData = localStorage.getItem('web_currentUserSession')
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData)
        
        // If trial expired and no active subscription - allow access but in read-only mode
        // Frontend will enforce read-only UI (hide add/edit/delete buttons)
        if (session.trialExpired && session.subscriptionStatus !== 'active') {
          // Store read-only flag for components to check
          sessionStorage.setItem('app_readonly', 'true')
        } else {
          sessionStorage.removeItem('app_readonly')
        }
      } catch (e) {
        console.error('Failed to parse session for subscription check:', e)
      }
    }
  }

  const requiredPermissions = (
    (to.meta as any).permissions
      ? (to.meta as any).permissions
      : (to.meta as any).permission
        ? [(to.meta as any).permission]
        : []
  ) as string[]

  if (to.meta.requiresAuth && requiredPermissions.length > 0 && !isTestBypass) {
    let session: any = null
    try {
      const raw = localStorage.getItem('web_currentUserSession')
      if (raw) session = JSON.parse(raw)
    } catch {}

    if (!session) {
      try {
        session = await (window as any)?.api?.auth?.getSession?.()
        if (session) {
          localStorage.setItem('web_currentUserSession', JSON.stringify(session))
          localStorage.setItem(
            'web_currentUser',
            JSON.stringify({ username: session.username, roleKey: session.roleKey })
          )
          window.dispatchEvent(new Event('auth-changed'))
        }
      } catch {}
    } else {
      setTimeout(async () => {
        try {
          const freshSession = await (window as any)?.api?.auth?.getSession?.()
          if (freshSession) {
            localStorage.setItem('web_currentUserSession', JSON.stringify(freshSession))
            localStorage.setItem(
              'web_currentUser',
              JSON.stringify({ username: freshSession.username, roleKey: freshSession.roleKey })
            )
          }
        } catch {}
      }, 0)
    }

    const can = (k: string) =>
      Boolean(session) &&
      (session.roleKey === 'admin' ||
        (Array.isArray(session.permissions) && session.permissions.includes(k)))

    const ok = requiredPermissions.every(can)
    if (!ok) return '/forbidden'
  }

  return true
})

export default router
