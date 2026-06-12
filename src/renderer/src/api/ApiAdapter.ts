import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'

type ApiMode = 'desktop' | 'cloud'

let mode: ApiMode = 'desktop'
let cloudClient: AxiosInstance | null = null
let restoreProgressCallback: ((p: any) => void) | null = null

export function setApiMode(m: ApiMode) {
  mode = m
}

export function setCloudBaseUrl(url: string) {
  cloudClient = axios.create({
    baseURL: url,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' }
  })
  cloudClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('b2b_cloud_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })
  cloudClient.interceptors.response.use(
    (res) => res,
    async (error) => {
      if (error.response?.status === 401 && mode === 'cloud') {
        if (isMockMode()) {
          return Promise.reject(error)
        }
        localStorage.removeItem('b2b_cloud_token')
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }
  )
}

export function getApiMode(): ApiMode {
  return mode
}

export function isMockMode(): boolean {
  // Mock mode activates ONLY when explicitly enabled via admin/admin login
  // This prevents unauthenticated users from accessing admin features
  return localStorage.getItem('mock_active') === 'true'
}

function mockCrudResponse(entity: string, method: string, params?: any): any {
  switch (method) {
    case 'list':
    case 'getAll':
      return { data: [] }
    case 'count':
      return { count: 0 }
    case 'getById':
      return null
    case 'create':
      return { ...params, id: crypto.randomUUID?.() || Date.now().toString() }
    case 'update':
    case 'delete':
      return { success: true }
    case 'search':
      return { data: [] }
    default:
      return null
  }
}

function mockDashboardData(): any {
  return {
    totalCases: 24,
    activeCases: 15,
    pendingSessions: 8,
    totalClients: 12,
    totalEmployees: 6,
    openTasks: 11,
    overdueTasks: 3,
    recentCases: [
      { id: '1', case_number: '1446/1', case_type: 'مدني', status: 'نشط', client_name: 'شركة الأمل', next_session: null },
      { id: '2', case_number: '1446/2', case_type: 'تجاري', status: 'نشط', client_name: 'مؤسسة النور', next_session: new Date(Date.now() + 86400000).toISOString() },
    ],
    upcomingSessions: [
      { id: '1', case_number: '1446/1', session_date: new Date(Date.now() + 86400000).toISOString(), session_type: 'جلسة مرافعة', court: 'المحكمة العامة', client_name: 'شركة الأمل' },
      { id: '2', case_number: '1446/3', session_date: new Date(Date.now() + 172800000).toISOString(), session_type: 'جلسة تحضيرية', court: 'المحكمة التجارية', client_name: 'شركة البركة' },
    ]
  }
}

function mockSession(date: Date, id: string): any {
  const caseNum = Math.floor(Math.random() * 50) + 1
  const clients = ['شركة الأمل', 'مؤسسة النور', 'شركة البركة', 'مكتب المحامي']
  const types = ['جلسة مرافعة', 'جلسة تحضيرية', 'حكم', 'مذاكرة']
  const statuses = ['مجدول', 'منعقد', 'مؤجل', 'منتهي']
  return {
    id,
    case_id: `case-${caseNum}`,
    case_number: `1446/${caseNum}`,
    client_name: clients[Math.floor(Math.random() * clients.length)],
    date: date.toISOString(),
    time: `${8 + Math.floor(Math.random() * 10)}:00`,
    type: types[Math.floor(Math.random() * types.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    court_room: ['القاعة الأولى', 'القاعة الثانية', 'القاعة الثالثة'][Math.floor(Math.random() * 3)],
    notes: null,
    result: null,
  }
}

function mockOperationsSummary(): any {
  return {
    thisMonthCases: 3,
    thisMonthSessions: 7,
    thisMonthTasks: 12,
    thisMonthContracts: 2,
    pendingEnforcements: 1,
  }
}

function cloudRequest<T = any>(config: AxiosRequestConfig): Promise<T> {
  if (!cloudClient) throw new Error('Cloud base URL not configured')
  // Only use mock when there's no real JWT token (Google login provides a real token)
  const token = localStorage.getItem('b2b_cloud_token')
  const hasRealToken = token && !token.startsWith('mock-')
  if (isMockMode() && !hasRealToken) {
    const url = config.url || ''
    return Promise.resolve(mockCloudRequest(url, config.method || 'GET', config.data, config.params) as T)
  }
  return cloudClient(config).then((r) => r.data)
}

function mockCloudRequest(url: string, method: string, data?: any, params?: any): any {
  if (url.startsWith('/auth/login')) {
  const token = import.meta.env.VITE_USE_MOCK_OTP === 'true' ? 'mock-token' : localStorage.getItem('b2b_cloud_token')
  return { token, user: { id: '1', username: 'admin', name: 'المدير', roleKey: 'admin', role_key: 'admin', is_active: true, permissions: [] } }
}
  if (url.startsWith('/auth/session')) return { user: { id: '1', username: 'admin', name: 'المدير', roleKey: 'admin', role_key: 'admin', is_active: true, isLocked: false, permissions: [] } }
  if (url.startsWith('/analytics/dashboard')) return mockDashboardData()
  if (url.startsWith('/operations-summary') || url.startsWith('/reports/operations-summary')) return mockOperationsSummary()
  if (url.startsWith('/briefing/summary')) return mockOperationsSummary()
  if (url.startsWith('/cases/analytics/dashboard')) return {
    total: 24,
    buckets: [
      { key: 'نشط', doc_count: 15 },
      { key: 'معلق', doc_count: 5 },
      { key: 'منتهي', doc_count: 4 },
    ],
    trend: { '2024': 10, '2025': 18, '2026': 24 },
    recentCases: [
      { id: '1', case_number: '1446/1', case_type: 'مدني', status: 'نشط', client_name: 'شركة الأمل' },
      { id: '2', case_number: '1446/2', case_type: 'تجاري', status: 'نشط', client_name: 'مؤسسة النور' },
    ],
    upcomingSessions: [
      { id: '1', case_number: '1446/1', date: new Date(Date.now() + 86400000).toISOString(), type: 'جلسة مرافعة', client_name: 'شركة الأمل' },
    ]
  }
  if (url.startsWith('/sessions/today') || (url.startsWith('/sessions') && method === 'GET' && params?.from)) {
    const sessions = []
    for (let i = 0; i < 3; i++) {
      sessions.push(mockSession(new Date(), `mock-session-t-${i}`))
    }
    return { data: sessions }
  }
  if (url.startsWith('/sessions/tomorrow')) {
    const sessions = []
    const tomorrow = new Date(Date.now() + 86400000)
    for (let i = 0; i < 2; i++) {
      sessions.push(mockSession(tomorrow, `mock-session-tm-${i}`))
    }
    return { data: sessions }
  }
  if (url.startsWith('/sessions') && method === 'GET' && params?.from && params?.to) {
    const sessions = []
    for (let i = 0; i < 5; i++) {
      const d = new Date(params.from)
      d.setDate(d.getDate() + i)
      sessions.push(mockSession(d, `mock-session-m-${i}`))
    }
    return { data: sessions }
  }
  if (url.startsWith('/tasks/pending')) return { data: [] }
  if (url.startsWith('/employees') && url.endsWith('/performance')) return { data: [] }
  if (url.startsWith('/agencies/expiry-alerts')) return { data: [] }
  if (url.startsWith('/system/settings')) return { data: {} }
  if (url.startsWith('/firm')) return { data: { name: 'مكتب المحاماة', logo: null } }
  if (url.startsWith('/permissions')) return { data: [] }
  if (url.startsWith('/users/active-staff') || url.startsWith('/users/assignable')) return { data: [] }
  if (url.startsWith('/enforcement/count')) return { count: 0 }
  if (url.startsWith('/enforcement/requests')) return { data: [], total: 0 }
  if (url.startsWith('/enforcement')) return { data: [], total: 0 }
  if (url.startsWith('/archive')) return { data: [] }
  if (url.startsWith('/search')) return { data: [] }
  if (url.startsWith('/collections')) return { data: [], count: 0 }

  // Generic entity CRUD
  const entityMatch = url.match(/^\/(\w+)(?:\/(\w+))?(?:\/(\w+))?/)
  if (entityMatch) {
    const entity = entityMatch[1]
    const action = entityMatch[2]
    const subId = entityMatch[3]
    // count
    if (action === 'count') return { count: 0 }
    // all
    if (action === 'all') return { data: [] }
    // search
    if (action === 'search') return { data: [] }
    // analytics/dashboard or similar sub-entity
    if (action && subId) return { data: [], success: true, total: 0 }
    // get by id: GET /entity/:id
    if (action && method === 'GET') return { data: null, id: action }
    // update: PUT /entity/:id
    if (action && method === 'PUT') return { success: true }
    // delete: DELETE /entity/:id
    if (action && method === 'DELETE') return { success: true }
    // list with params: GET /entity
    if (method === 'GET' && params) return { data: [] }
    // create: POST /entity
    if (method === 'POST') return { success: true, id: crypto.randomUUID?.() || Date.now().toString() }
    // create sub-entity: POST /entity/:action
    if (method === 'POST' && action) return { success: true, id: crypto.randomUUID?.() || Date.now().toString() }
    // default
    return { data: [] }
  }

  return { data: [] }
}

function buildCrudApi(entity: string) {
  return {
    getAll: (params?: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke(`${entity}:getAll`, params)
        : cloudRequest({ method: 'GET', url: `/${entity}/all`, params }),
    list: (params: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke(`${entity}:list`, params)
        : cloudRequest<any>({ method: 'GET', url: `/${entity}`, params }).then((r) => r.data),
    count: (params?: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke(`${entity}:count`, params)
        : cloudRequest<any>({ method: 'GET', url: `/${entity}/count`, params }).then(
            (r) => r.count
          ),
    getById: (id: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke(`${entity}:getById`, id)
        : cloudRequest({ method: 'GET', url: `/${entity}/${id}` }),
    create: (data: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke(`${entity}:create`, data)
        : cloudRequest({ method: 'POST', url: `/${entity}`, data }),
    update: (id: string, data: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke(`${entity}:update`, id, data)
        : cloudRequest({ method: 'PUT', url: `/${entity}/${id}`, data }),
    delete: (id: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke(`${entity}:delete`, id)
        : cloudRequest({ method: 'DELETE', url: `/${entity}/${id}` }),
    search: (query: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke(`${entity}:search`, query)
        : cloudRequest({ method: 'GET', url: `/${entity}/search`, params: { q: query } })
  }
}

const api = {
  auth: {
    login: (username: string, password: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('auth:login', username, password)
        : cloudRequest<any>({
            method: 'POST',
            url: '/auth/login',
            data: { username, password }
          }).then((r) => {
            return { ...r.user, isLocked: false }
          }),
    logout: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('auth:logout')
        : cloudRequest({ method: 'POST', url: '/auth/logout' }),
    getSession: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('auth:getSession')
        : cloudRequest<any>({ method: 'GET', url: '/auth/session' }).then((r) => ({
            ...(r.user || r),
            isLocked: false
          })),
    changePassword: (oldPassword: string, newPassword: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('auth:changePassword', oldPassword, newPassword)
        : cloudRequest({
            method: 'PUT',
            url: '/auth/password',
            data: { oldPassword, newPassword }
          }),
    lock: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('auth:lock')
        : cloudRequest({ method: 'POST', url: '/auth/lock' }),
    unlock: (password: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('auth:unlock', password)
        : cloudRequest({ method: 'POST', url: '/auth/unlock', data: { password } }),
    register: (companyName: string, username: string, email: string, phone: string, password: string) =>
      mode === 'desktop'
        ? Promise.reject(new Error('Direct registration is not supported in desktop mode'))
        : cloudRequest<any>({
            method: 'POST',
            url: '/auth/register',
            data: { companyName, username, email, phone, password }
          }),
    verifyAccount: (username: string, code: string) =>
      mode === 'desktop'
        ? Promise.reject(new Error('Account verification is not supported in desktop mode'))
        : cloudRequest<any>({
            method: 'POST',
            url: '/auth/verify',
            data: { username, code }
          }),
    onLockTriggered: (_cb: () => void) => () => {} // handled differently in cloud
  },
  clients: buildCrudApi('clients'),
  defendants: {
    ...buildCrudApi('defendants'),
    restore: (id: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('defendants:restore', id)
        : cloudRequest({ method: 'POST', url: `/defendants/${id}/restore` })
  },
  cases: {
    ...buildCrudApi('cases'),
    getDashboardAnalytics: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('cases:getDashboardAnalytics')
        : cloudRequest({ method: 'GET', url: '/cases/analytics/dashboard' }),
    getByClientId: (clientId: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('cases:getByClientId', clientId)
        : cloudRequest({ method: 'GET', url: `/cases/by-client/${clientId}` }),
    isUnique: (caseNumber: string, ignoreId?: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('cases:isUnique', caseNumber, ignoreId)
        : cloudRequest({
            method: 'GET',
            url: '/cases/is-unique',
            params: { caseNumber, ignoreId }
          }),
    openFolder: (_folderPath: string) => {
      throw new Error('Not available in cloud mode')
    },
    chooseRoot: () => {
      throw new Error('Not available in cloud mode')
    },
    createCaseFolder: (_payload: any) => {
      throw new Error('Not available in cloud mode')
    },
    openNajizUrl: (url: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('cases:openNajizUrl', url)
        : cloudRequest({ method: 'POST', url: '/cases/open-najiz-url', data: { url } }),
    getAssignments: (caseId: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('cases:getAssignments', caseId)
        : cloudRequest({ method: 'GET', url: `/cases/${caseId}/assignments` }),
    assignEmployee: (caseId: string, employeeId: string, role: string, notes?: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('cases:assignEmployee', caseId, employeeId, role, notes)
        : cloudRequest({
            method: 'POST',
            url: `/cases/${caseId}/assignments`,
            data: { employeeId, role, notes }
          }),
    removeEmployee: (caseId: string, employeeId: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('cases:removeEmployee', caseId, employeeId)
        : cloudRequest({ method: 'DELETE', url: `/cases/${caseId}/assignments/${employeeId}` })
  },
  sessions: {
    ...buildCrudApi('sessions'),
    getToday: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('sessions:getToday')
        : cloudRequest({ method: 'GET', url: '/sessions/today' }),
    getTomorrow: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('sessions:getTomorrow')
        : cloudRequest({ method: 'GET', url: '/sessions/tomorrow' }),
    getByCaseId: (caseId: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('sessions:getByCaseId', caseId)
        : cloudRequest({ method: 'GET', url: `/sessions/by-case/${caseId}` }),
    checkBlock: (caseId: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('sessions:checkBlock', caseId)
        : cloudRequest({ method: 'GET', url: `/sessions/check-block/${caseId}` }),
    getPendingClosure: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('sessions:getPendingClosure')
        : cloudRequest({ method: 'GET', url: '/sessions/pending-closure' })
  },
  tasks: {
    ...buildCrudApi('tasks'),
    getPending: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('tasks:getPending')
        : cloudRequest({ method: 'GET', url: '/tasks/pending' }),
    getByCaseId: (caseId: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('tasks:getByCaseId', caseId)
        : cloudRequest({ method: 'GET', url: `/tasks/by-case/${caseId}` }),
    transition: (payload: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('tasks:transition', payload)
        : cloudRequest({
            method: 'POST',
            url: `/tasks/${payload.id}/transition`,
            data: payload
          }),
    close: (id: string, note: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('tasks:close', id, note)
        : cloudRequest({ method: 'POST', url: `/tasks/${id}/close`, data: { note } }),
    cancel: (id: string, reason: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('tasks:cancel', id, reason)
        : cloudRequest({ method: 'POST', url: `/tasks/${id}/cancel`, data: { reason } }),
    auditCount: (taskId: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('tasks:audit:count', taskId)
        : cloudRequest({ method: 'GET', url: `/tasks/${taskId}/audit/count` }),
    auditList: (taskId: string, params: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('tasks:audit:list', taskId, params)
        : cloudRequest({ method: 'GET', url: `/tasks/${taskId}/audit`, params })
  },
  evidence: buildCrudApi('evidence'),
  judgments: {
    ...buildCrudApi('judgments'),
    getByCaseId: (caseId: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('judgments:getByCaseId', caseId)
        : cloudRequest({ method: 'GET', url: `/judgments/by-case/${caseId}` }),
    amendments: {
      list: (judgmentId: string) =>
        mode === 'desktop'
          ? window.ipcRenderer?.invoke('judgments:amendments:list', judgmentId)
          : cloudRequest({ method: 'GET', url: `/judgments/${judgmentId}/amendments` }),
      create: (payload: any) =>
        mode === 'desktop'
          ? window.ipcRenderer?.invoke('judgments:amendments:create', payload)
          : cloudRequest({
              method: 'POST',
              url: `/judgments/${payload.judgment_id}/amendments`,
              data: payload
            })
    }
  },
  memoranda: {
    ...buildCrudApi('memoranda'),
    getByCaseId: (caseId: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('memoranda:getByCaseId', caseId)
        : cloudRequest({ method: 'GET', url: `/memoranda/by-case/${caseId}` }),
    toggleArchive: (id: string, isArchived: boolean) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('memoranda:toggleArchive', id, isArchived)
        : cloudRequest({ method: 'PUT', url: `/memoranda/${id}/archive`, data: { isArchived } })
  },
  contracts: {
    ...buildCrudApi('contracts'),
    approve: (id: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('contracts:approve', id)
        : cloudRequest({ method: 'POST', url: `/contracts/${id}/approve` }),
    archive: (id: string, reason?: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('contracts:archive', id, reason)
        : cloudRequest({ method: 'PUT', url: `/contracts/${id}/archive`, data: { reason } }),
    partyTypes: {
      list: () =>
        mode === 'desktop'
          ? window.ipcRenderer?.invoke('contracts:partyTypes:list')
          : cloudRequest({ method: 'GET', url: '/contracts/party-types' })
    },
    participants: {
      add: (contractId: string, payload: any) =>
        mode === 'desktop'
          ? window.ipcRenderer?.invoke('contracts:participants:add', contractId, payload)
          : cloudRequest({
              method: 'POST',
              url: `/contracts/${contractId}/participants`,
              data: payload
            }),
      update: (contractId: string, participantId: string, payload: any) =>
        mode === 'desktop'
          ? window.ipcRenderer?.invoke(
              'contracts:participants:update',
              contractId,
              participantId,
              payload
            )
          : cloudRequest({
              method: 'PUT',
              url: `/contracts/${contractId}/participants/${participantId}`,
              data: payload
            }),
      remove: (contractId: string, participantId: string) =>
        mode === 'desktop'
          ? window.ipcRenderer?.invoke('contracts:participants:remove', contractId, participantId)
          : cloudRequest({
              method: 'DELETE',
              url: `/contracts/${contractId}/participants/${participantId}`
            })
    },
    signatures: {
      update: (contractId: string, signatureId: string, payload: any) =>
        mode === 'desktop'
          ? window.ipcRenderer?.invoke(
              'contracts:signatures:update',
              contractId,
              signatureId,
              payload
            )
          : cloudRequest({
              method: 'PUT',
              url: `/contracts/${contractId}/signatures/${signatureId}`,
              data: payload
            })
    },
    schedules: {
      update: (id: string, payload: any) =>
        mode === 'desktop'
          ? window.ipcRenderer?.invoke('contracts:schedules:update', id, payload)
          : cloudRequest({ method: 'PUT', url: `/contracts/schedules/${id}`, data: payload })
    },
    amendments: {
      create: (payload: any) =>
        mode === 'desktop'
          ? window.ipcRenderer?.invoke('contracts:amendments:create', payload)
          : cloudRequest({
              method: 'POST',
              url: `/contracts/${payload.contract_id}/amendments`,
              data: payload
            })
    },
    templates: {
      list: (contractType?: string) =>
        mode === 'desktop'
          ? window.ipcRenderer?.invoke('contracts:templates:list', contractType)
          : cloudRequest({
              method: 'GET',
              url: '/contracts/templates',
              params: { contractType }
            }),
      create: (payload: any) =>
        mode === 'desktop'
          ? window.ipcRenderer?.invoke('contracts:templates:create', payload)
          : cloudRequest({ method: 'POST', url: '/contracts/templates', data: payload }),
      update: (id: string, payload: any) =>
        mode === 'desktop'
          ? window.ipcRenderer?.invoke('contracts:templates:update', id, payload)
          : cloudRequest({ method: 'PUT', url: `/contracts/templates/${id}`, data: payload }),
      delete: (id: string) =>
        mode === 'desktop'
          ? window.ipcRenderer?.invoke('contracts:templates:delete', id)
          : cloudRequest({ method: 'DELETE', url: `/contracts/templates/${id}` })
    },
    partyAudits: {
      list: (contractId: string) =>
        mode === 'desktop'
          ? window.ipcRenderer?.invoke('contracts:partyAudits:list', contractId)
          : cloudRequest({ method: 'GET', url: `/contracts/${contractId}/party-audits` })
    }
  },
  documents: {
    ...buildCrudApi('documents'),
    getByCaseId: (caseId: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('documents:getByCaseId', caseId)
        : cloudRequest({ method: 'GET', url: `/documents/by-case/${caseId}` }),
    getByTaskId: (taskId: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('documents:getByTaskId', taskId)
        : cloudRequest({ method: 'GET', url: `/documents/by-task/${taskId}` }),
    getBySessionId: (sessionId: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('documents:getBySessionId', sessionId)
        : cloudRequest({ method: 'GET', url: `/documents/by-session/${sessionId}` }),
    upload: (_info: any) => {
      throw new Error('File upload not available in cloud mode')
    },
    open: (_path: string) => {
      throw new Error('File open not available in cloud mode')
    }
  },
  finances: buildCrudApi('finances'),
  employees: {
    ...buildCrudApi('employees'),
    getPerformanceReport: (employeeId: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('employees:getPerformanceReport', employeeId)
        : cloudRequest({ method: 'GET', url: `/employees/${employeeId}/performance` }),
    getAssignments: (employeeId: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('employees:getAssignments', employeeId)
        : cloudRequest({ method: 'GET', url: `/employees/${employeeId}/assignments` })
  },
  users: {
    ...buildCrudApi('users'),
    listAssignable: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('users:listAssignable')
        : cloudRequest({ method: 'GET', url: '/users/assignable' }),
    listActiveStaff: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('users:listActiveStaff')
        : cloudRequest({ method: 'GET', url: '/users/active-staff' }),
    toggleActive: (userId: string, isActive: boolean) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('users:toggleActive', userId, isActive)
        : cloudRequest({
            method: 'PUT',
            url: `/users/${userId}/toggle-active`,
            data: { isActive }
          }),
    setRole: (userId: string, roleKey: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('users:setRole', userId, roleKey)
        : cloudRequest({ method: 'PUT', url: `/users/${userId}/role`, data: { roleKey } }),
    setPermissionOverride: (userId: string, permissionKey: string, isAllowed: boolean) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke(
            'users:setPermissionOverride',
            userId,
            permissionKey,
            isAllowed
          )
        : cloudRequest({
            method: 'PUT',
            url: `/users/${userId}/permissions/${permissionKey}`,
            data: { isAllowed }
          }),
    getScope: (userId: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('users:getScope', userId)
        : cloudRequest({ method: 'GET', url: `/users/${userId}/scope` }),
    setScope: (payload: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('users:setScope', payload)
        : cloudRequest({ method: 'PUT', url: `/users/${payload.userId}/scope`, data: payload }),
    getOverrides: (userId: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('users:getOverrides', userId)
        : cloudRequest({ method: 'GET', url: `/users/${userId}/permission-overrides` }),
    setBulkPermissionOverrides: (userId: string, isAllowed: boolean, permissionKeys: string[]) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke(
            'users:setBulkPermissionOverrides',
            userId,
            isAllowed,
            permissionKeys
          )
        : cloudRequest({
            method: 'PUT',
            url: `/users/${userId}/permissions/bulk`,
            data: { isAllowed, permissionKeys }
          }),
    updateUsername: (userId: string, newUsername: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('users:updateUsername', userId, newUsername)
        : cloudRequest({
            method: 'PUT',
            url: `/users/${userId}/username`,
            data: { newUsername }
          }),
    updateRecoveryInfo: (email: string | null, question: string | null, answer: string | null) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('users:updateRecoveryInfo', email, question, answer)
        : cloudRequest({
            method: 'PUT',
            url: '/users/recovery-info',
            data: { email, question, answer }
          }),
    adminUpdateRecoveryInfo: (
      userId: string,
      email: string | null,
      question: string | null,
      answer: string | null
    ) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke(
            'users:adminUpdateRecoveryInfo',
            userId,
            email,
            question,
            answer
          )
        : cloudRequest({
            method: 'PUT',
            url: `/users/${userId}/recovery-info`,
            data: { email, question, answer }
          }),
    getSelfRecoveryInfo: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('users:getSelfRecoveryInfo')
        : cloudRequest({ method: 'GET', url: '/users/recovery-info' })
  },
  agencies: {
    ...buildCrudApi('agencies'),
    getByClientId: (clientId: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('agencies:getByClientId', clientId)
        : cloudRequest({ method: 'GET', url: `/agencies/by-client/${clientId}` }),
    getExpiryAlerts: (params?: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('agencies:getExpiryAlerts', params)
        : cloudRequest({ method: 'GET', url: '/agencies/expiry-alerts', params })
  },
  invoices: buildCrudApi('invoices'),
  vouchers: buildCrudApi('vouchers'),
  creditNotes: {
    ...buildCrudApi('creditNotes'),
    markAsUsed: (id: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('creditNotes:markAsUsed', id)
        : cloudRequest({ method: 'PUT', url: `/credit-notes/${id}/mark-used` }),
    approve: (id: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('creditNotes:approve', id)
        : cloudRequest({ method: 'PUT', url: `/credit-notes/${id}/approve` })
  },
  experts: buildCrudApi('experts'),
  communications: buildCrudApi('communications'),
  firm: {
    get: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('firm:get')
        : cloudRequest({ method: 'GET', url: '/firm' }),
    update: (data: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('firm:update', data)
        : cloudRequest({ method: 'PUT', url: '/firm', data }),
    pickLogo: () => {
      throw new Error('Not available in cloud mode')
    },
    resolveLogoSrc: (logoPath: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('firm:resolveLogoSrc', logoPath)
        : cloudRequest({ method: 'POST', url: '/firm/resolve-logo', data: { logoPath } })
  },
  accounts: buildCrudApi('accounts'),
  receivables: {
    ...buildCrudApi('receivables'),
    getByClientId: (clientId: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('receivables:getByClientId', clientId)
        : cloudRequest({ method: 'GET', url: `/receivables/by-client/${clientId}` }),
    getOpen: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('receivables:getOpen')
        : cloudRequest({ method: 'GET', url: '/receivables/open' }),
    createFromInvoice: (invoice: any, dueDate?: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('receivables:createFromInvoice', invoice, dueDate)
        : cloudRequest({
            method: 'POST',
            url: '/receivables/from-invoice',
            data: { invoice, dueDate }
          }),
    applyPayment: (id: string, amount: number) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('receivables:applyPayment', id, amount)
        : cloudRequest({
            method: 'POST',
            url: `/receivables/${id}/apply-payment`,
            data: { amount }
          })
  },
  activityLogs: {
    getAll: (filters?: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('activityLogs:getAll', filters)
        : cloudRequest({ method: 'GET', url: '/activity-logs', params: filters }),
    count: (filters?: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('activityLogs:count', filters)
        : cloudRequest({ method: 'GET', url: '/activity-logs/count', params: filters }),
    list: (params: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('activityLogs:list', params)
        : cloudRequest({ method: 'GET', url: '/activity-logs/list', params }),
    clearBeforeDate: (date: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('activityLogs:clearBeforeDate', date)
        : cloudRequest({ method: 'DELETE', url: '/activity-logs', params: { before: date } })
  },
  permissions: {
    getAll: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('permissions:getAll')
        : cloudRequest({ method: 'GET', url: '/permissions' })
  },
  reports: {
    getCaseReport: (params: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('reports:getCaseReport', params)
        : cloudRequest({ method: 'GET', url: '/reports/case', params }),
    listCases: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('reports:listCases')
        : cloudRequest({ method: 'GET', url: '/reports/cases' }),
    getSessionsReport: (params: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('reports:getSessionsReport', params)
        : cloudRequest({ method: 'GET', url: '/reports/sessions', params }),
    getFinancialSummary: (params: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('reports:getFinancialSummary', params)
        : cloudRequest({ method: 'GET', url: '/reports/financial-summary', params }),
    getActivityReport: (params: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('reports:getActivityReport', params)
        : cloudRequest({ method: 'GET', url: '/reports/activity', params }),
    exportCsv: (filename: string, rows: any[]) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('reports:exportCsv', { filename, rows })
        : cloudRequest({
            method: 'POST',
            url: '/reports/export/csv',
            data: { filename, rows },
            responseType: 'blob'
          }),
    getUserActivityReport: (params: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('reports:getUserActivityReport', params)
        : cloudRequest({ method: 'GET', url: '/reports/user-activity', params }),
    getEvidenceReport: (params: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('reports:getEvidenceReport', params)
        : cloudRequest({ method: 'GET', url: '/reports/evidence', params }),
    getMemorandaReport: (params: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('reports:getMemorandaReport', params)
        : cloudRequest({ method: 'GET', url: '/reports/memoranda', params }),
    getMemorandumFullData: (id: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('reports:getMemorandumFullData', id)
        : cloudRequest({ method: 'GET', url: `/reports/memoranda/${id}` }),
    getDocumentsReport: (params: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('reports:getDocumentsReport', params)
        : cloudRequest({ method: 'GET', url: '/reports/documents', params }),
    getOperationsSummary: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('reports:getOperationsSummary')
        : cloudRequest({ method: 'GET', url: '/reports/operations-summary' }),
    getUsersPermissionsReport: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('reports:getUsersPermissionsReport')
        : cloudRequest({ method: 'GET', url: '/reports/users-permissions' }),
    listUsers: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('reports:listUsers')
        : cloudRequest({ method: 'GET', url: '/reports/users' }),
    listClients: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('reports:listClients')
        : cloudRequest({ method: 'GET', url: '/reports/clients' }),
    listSessions: (caseId?: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('reports:listSessions', caseId)
        : cloudRequest({ method: 'GET', url: '/reports/sessions-list', params: { caseId } }),
    listTasks: (caseId?: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('reports:listTasks', caseId)
        : cloudRequest({ method: 'GET', url: '/reports/tasks-list', params: { caseId } }),
    exportPdf: (payload: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('reports:exportPdf', payload)
        : cloudRequest({
            method: 'POST',
            url: '/reports/export/pdf',
            data: payload,
            responseType: 'blob'
          }),
    exportHtml: (payload: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('reports:exportHtml', payload)
        : cloudRequest({ method: 'POST', url: '/reports/export/html', data: payload }),
    printReport: (_payload: any) => {
      throw new Error('Print not available in cloud mode')
    },
    getPreviewHtml: (payload: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('reports:getPreviewHtml', payload)
        : cloudRequest({ method: 'POST', url: '/reports/preview', data: payload })
  },
  enforcement: {
    count: (params: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('enforcement:count', params)
        : cloudRequest({ method: 'GET', url: '/enforcement/count', params }),
    list: (params: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('enforcement:list', params)
        : cloudRequest({ method: 'GET', url: '/enforcement', params }),
    get: (id: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('enforcement:get', id)
        : cloudRequest({ method: 'GET', url: `/enforcement/${id}` }),
    create: (payload: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('enforcement:create', payload)
        : cloudRequest({ method: 'POST', url: '/enforcement', data: payload }),
    update: (id: string, payload: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('enforcement:update', id, payload)
        : cloudRequest({ method: 'PUT', url: `/enforcement/${id}`, data: payload }),
    listParties: (enforcementId: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('enforcement:parties:list', enforcementId)
        : cloudRequest({ method: 'GET', url: `/enforcement/${enforcementId}/parties` }),
    setParties: (enforcementId: string, parties: any[]) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('enforcement:parties:set', enforcementId, parties)
        : cloudRequest({
            method: 'PUT',
            url: `/enforcement/${enforcementId}/parties`,
            data: { parties }
          }),
    listActions: (enforcementId: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('enforcement:actions:list', enforcementId)
        : cloudRequest({ method: 'GET', url: `/enforcement/${enforcementId}/actions` }),
    addAction: (enforcementId: string, action: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('enforcement:actions:add', enforcementId, action)
        : cloudRequest({
            method: 'POST',
            url: `/enforcement/${enforcementId}/actions`,
            data: action
          }),
    request: {
      list: (params: any) =>
        mode === 'desktop'
          ? window.ipcRenderer?.invoke('enforcement:request:list', params)
          : cloudRequest({ method: 'GET', url: '/enforcement/requests', params }),
      get: (id: string) =>
        mode === 'desktop'
          ? window.ipcRenderer?.invoke('enforcement:request:get', id)
          : cloudRequest({ method: 'GET', url: `/enforcement/requests/${id}` }),
      create: (payload: any) =>
        mode === 'desktop'
          ? window.ipcRenderer?.invoke('enforcement:request:create', payload)
          : cloudRequest({ method: 'POST', url: '/enforcement/requests', data: payload }),
      update: (id: string, payload: any) =>
        mode === 'desktop'
          ? window.ipcRenderer?.invoke('enforcement:request:update', id, payload)
          : cloudRequest({ method: 'PUT', url: `/enforcement/requests/${id}`, data: payload }),
      delete: (id: string) =>
        mode === 'desktop'
          ? window.ipcRenderer?.invoke('enforcement:request:delete', id)
          : cloudRequest({ method: 'DELETE', url: `/enforcement/requests/${id}` }),
      addAttachments: (requestId: string, assetIds: string[], label: string) =>
        mode === 'desktop'
          ? window.ipcRenderer?.invoke(
              'enforcement:request:addAttachments',
              requestId,
              assetIds,
              label
            )
          : cloudRequest({
              method: 'POST',
              url: `/enforcement/requests/${requestId}/attachments`,
              data: { assetIds, label }
            }),
      getAttachments: (requestId: string) =>
        mode === 'desktop'
          ? window.ipcRenderer?.invoke('enforcement:request:getAttachments', requestId)
          : cloudRequest({
              method: 'GET',
              url: `/enforcement/requests/${requestId}/attachments`
            })
    }
  },
  collections: {
    summary: (params: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('collections:summary', params)
        : cloudRequest({ method: 'GET', url: '/collections/summary', params }),
    claims: {
      count: (params: any) =>
        mode === 'desktop'
          ? window.ipcRenderer?.invoke('collections:claims:count', params)
          : cloudRequest({ method: 'GET', url: '/collections/claims/count', params }),
      list: (params: any) =>
        mode === 'desktop'
          ? window.ipcRenderer?.invoke('collections:claims:list', params)
          : cloudRequest({ method: 'GET', url: '/collections/claims', params }),
      get: (id: string) =>
        mode === 'desktop'
          ? window.ipcRenderer?.invoke('collections:claims:get', id)
          : cloudRequest({ method: 'GET', url: `/collections/claims/${id}` }),
      create: (payload: any) =>
        mode === 'desktop'
          ? window.ipcRenderer?.invoke('collections:claims:create', payload)
          : cloudRequest({ method: 'POST', url: '/collections/claims', data: payload }),
      update: (id: string, payload: any) =>
        mode === 'desktop'
          ? window.ipcRenderer?.invoke('collections:claims:update', id, payload)
          : cloudRequest({ method: 'PUT', url: `/collections/claims/${id}`, data: payload })
    },
    payments: {
      list: (claimId: string) =>
        mode === 'desktop'
          ? window.ipcRenderer?.invoke('collections:payments:list', claimId)
          : cloudRequest({ method: 'GET', url: `/collections/claims/${claimId}/payments` }),
      add: (claimId: string, payload: any) =>
        mode === 'desktop'
          ? window.ipcRenderer?.invoke('collections:payments:add', claimId, payload)
          : cloudRequest({
              method: 'POST',
              url: `/collections/claims/${claimId}/payments`,
              data: payload
            })
    }
  },
  sessionOutcome: {
    create: (outcome: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('sessionOutcome:create', outcome)
        : cloudRequest({ method: 'POST', url: '/session-outcomes', data: outcome }),
    getBySession: (sessionId: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('sessionOutcome:getBySession', sessionId)
        : cloudRequest({ method: 'GET', url: `/session-outcomes/by-session/${sessionId}` }),
    apply: (payload: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('sessionOutcome:apply', payload)
        : cloudRequest({ method: 'POST', url: '/session-outcomes/apply', data: payload }),
    preview: (payload: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('sessionOutcome:preview', payload)
        : cloudRequest({ method: 'POST', url: '/session-outcomes/preview', data: payload })
  },
  analytics: {
    getDashboard: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('analytics:getDashboard')
        : cloudRequest({ method: 'GET', url: '/analytics/dashboard' })
  },
  vault: {
    getRoot: () => {
      throw new Error('Not available in cloud mode')
    },
    chooseRoot: () => {
      throw new Error('Not available in cloud mode')
    },
    needsSetup: () => {
      throw new Error('Not available in cloud mode')
    },
    markSetupDone: () => {
      throw new Error('Not available in cloud mode')
    }
  },
  files: {
    upload: (_params: any) => {
      throw new Error('Not available in cloud mode')
    },
    listByEntity: (_params: any) => {
      throw new Error('Not available in cloud mode')
    },
    delete: (_id: string) => {
      throw new Error('Not available in cloud mode')
    },
    getById: (_id: string) => {
      throw new Error('Not available in cloud mode')
    },
    open: (_id: string) => {
      throw new Error('Not available in cloud mode')
    }
  },
  search: {
    query: (q: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('search:query', q)
        : cloudRequest({ method: 'GET', url: '/search', params: { q } })
  },
  settings: {
    get: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('settings:get')
        : cloudRequest({ method: 'GET', url: '/system/settings' }),
    update: (s: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('settings:update', s)
        : cloudRequest({ method: 'PUT', url: '/system/settings', data: s })
  },
  system: {
    getVersions: () => Promise.resolve({ app: 'cloud', node: process.version }),
    isDev: false,
    getAlerts: (_today: string) => Promise.resolve([]),
    openExternal: (_url: string) => {
      throw new Error('Not available in cloud mode')
    },
    tailLog: (_maxBytes?: number) => Promise.resolve(''),
    clearAllData: () => {
      return mode === 'desktop'
        ? window.ipcRenderer?.invoke('system:clearAllData')
        : cloudRequest({ method: 'POST', url: '/system/clear-all-data' }).then((r) => r.success)
    },
    clear: () => {
      return mode === 'desktop'
        ? window.ipcRenderer?.invoke('system:clearAllData')
        : cloudRequest({ method: 'POST', url: '/system/clear-all-data' }).then((r) => r.success)
    },
    seed: (_data: any[]) => {
      throw new Error('Not available in cloud mode')
    },
    importExcel: (_filePath?: string) => {
      throw new Error('Not available in cloud mode')
    },
    importEmbeddedData: () => {
      throw new Error('Not available in cloud mode')
    },
    generateStressData: () => {
      throw new Error('Not available in cloud mode')
    },
    getGoogleScriptContent: () => {
      throw new Error('Not available in cloud mode')
    },
    getDeveloperInfo: () => Promise.resolve({}),
    exportManualSnapshot: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('system:exportManualSnapshot')
        : cloudRequest({ method: 'POST', url: '/system/export-snapshot' }).then((r) => {
            const blob = new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `b2b-snapshot-${new Date().toISOString().slice(0, 10)}.json`
            a.click()
            URL.revokeObjectURL(url)
            return true
          }),
    injectManualSnapshot: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('system:injectManualSnapshot')
        : new Promise((resolve, reject) => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = '.json'
            input.onchange = async () => {
              const file = input.files?.[0]
              if (!file) {
                resolve(false)
                return
              }
              try {
                const text = await file.text()
                const data = JSON.parse(text)
                if (!data.tables) {
                  reject(new Error('Invalid snapshot file'))
                  return
                }
                const result = await cloudRequest({
                  method: 'POST',
                  url: '/system/import-snapshot',
                  data: { tables: data.tables, mode: 'merge' }
                })
                resolve(result)
              } catch (e) {
                reject(e)
              }
            }
            input.click()
          }),
    getDatabaseInventory: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('system:getDatabaseInventory')
        : cloudRequest({ method: 'GET', url: '/system/database-inventory' }),
    exportSupportBundle: () => {
      throw new Error('Not available in cloud mode')
    },
    exportPerformanceReport: () => {
      throw new Error('Not available in cloud mode')
    },
    getPerformanceData: () => Promise.resolve({}),
    saveJsonToFile: (_data: any, _filename: string) => {
      throw new Error('Not available in cloud mode')
    },
    captureScreenshot: () => {
      throw new Error('Not available in cloud mode')
    },
    captureScreenshotAuto: (_tag?: string) => {
      throw new Error('Not available in cloud mode')
    },
    exportAutoSnapshotToVault: () => {
      throw new Error('Not available in cloud mode')
    },
    runDiagnostics: () => Promise.resolve({ status: 'cloud-mode' })
  },
  backup: {
    export: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('backup:export')
        : cloudRequest({ method: 'POST', url: '/system/export-snapshot' }).then((r) => {
            const blob = new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `b2b-backup-${new Date().toISOString().slice(0, 10)}.json`
            a.click()
            URL.revokeObjectURL(url)
            return true
          }),
    import: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('backup:import')
        : new Promise((resolve) => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = '.json'
            input.onchange = async () => {
              const file = input.files?.[0]
              if (!file) {
                resolve({ success: false, errors: ['تم إلغاء اختيار الملف.'] })
                return
              }
              try {
                if (restoreProgressCallback) {
                  restoreProgressCallback({ stage: 'parse', percent: 10, message: 'قراءة ملف النسخة الاحتياطية...' })
                }
                const text = await file.text()
                const data = JSON.parse(text)
                if (!data.tables) {
                  resolve({ success: false, errors: ['ملف النسخة الاحتياطية غير صالح'] })
                  return
                }
                if (restoreProgressCallback) {
                  restoreProgressCallback({ stage: 'verify', percent: 30, message: 'التحقق من سلامة البيانات...' })
                }
                if (restoreProgressCallback) {
                  restoreProgressCallback({ stage: 'inject', percent: 50, message: 'جاري استيراد البيانات إلى الخادم السحابي...' })
                }
                const result = await cloudRequest({
                  method: 'POST',
                  url: '/system/import-snapshot',
                  data: { tables: data.tables, mode: 'replace' }
                })
                if (restoreProgressCallback) {
                  restoreProgressCallback({ stage: 'done', percent: 100, message: 'تمت الاستعادة بنجاح.' })
                }
                resolve({ success: true, ...result })
              } catch (e) {
                resolve({ success: false, errors: [(e as Error).message] })
              }
            }
            input.click()
          }),
    onRestoreProgress: (cb: any) => {
      restoreProgressCallback = cb
      return () => {
        restoreProgressCallback = null
      }
    }
  },
  cloudSync: {
    getUrl: () => '',
    setUrl: (_url: string) => {},
    test: () => Promise.resolve(false),
    uploadAll: (_payload: any) => Promise.resolve(false),
    openSpreadsheet: () => {}
  },
  cloudRestore: {
    prepare: () => {
      throw new Error('Not available in cloud mode')
    },
    approve: () => {
      throw new Error('Not available in cloud mode')
    },
    showInFolder: () => {
      throw new Error('Not available in cloud mode')
    },
    exportFile: () => {
      throw new Error('Not available in cloud mode')
    }
  },
  workflow: {
    previewDecision: (payload: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('workflow:previewDecision', payload)
        : cloudRequest({ method: 'POST', url: '/workflow/preview-decision', data: payload }),
    applyDecision: (payload: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('workflow:applyDecision', payload)
        : cloudRequest({ method: 'POST', url: '/workflow/apply-decision', data: payload })
  },
  archive: {
    list: (type: string, params: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('archive:list', type, params)
        : cloudRequest({ method: 'GET', url: `/archive/${type}`, params }),
    toggle: (type: string, id: string, isArchived: boolean) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('archive:toggle', type, id, isArchived)
        : cloudRequest({ method: 'PUT', url: `/archive/${type}/${id}`, data: { isArchived } })
  },
  briefing: {
    getSummary: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('briefing:getSummary')
        : cloudRequest({ method: 'GET', url: '/briefing/summary' })
  },
  admin: {
    maintenance: {
      bulkClosePreview: (days: number) =>
        mode === 'desktop'
          ? window.ipcRenderer?.invoke('admin:maintenance:bulk-close-preview', days)
          : cloudRequest({
              method: 'GET',
              url: '/admin/maintenance/bulk-close-preview',
              params: { days }
            }),
      bulkClose: (days: number) =>
        mode === 'desktop'
          ? window.ipcRenderer?.invoke('admin:maintenance:bulk-close', days)
          : cloudRequest({
              method: 'POST',
              url: '/admin/maintenance/bulk-close',
              data: { days }
            })
    }
  },
  licensing: {
    getRequestCode: () => {
      throw new Error('Not available in cloud mode')
    },
    activate: (_key: string) => {
      throw new Error('Not available in cloud mode')
    },
    checkTrial: async () => {
      try {
        const isLoggedIn = localStorage.getItem('web_isLoggedIn') === 'true'
        if (!isLoggedIn) {
          return { isValid: true, daysLeft: 7, message: 'Cloud mode', isActivated: true }
        }
        const session = await api.auth.getSession()
        if (session) {
          const trialExpired = session.trialExpired || false
          const expiresAt = session.trialExpiresAt
          const daysLeft = expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0
          return {
            isValid: !trialExpired,
            daysLeft: daysLeft,
            message: 'Cloud mode',
            isActivated: !trialExpired
          }
        }
      } catch (e) {
        console.error('Failed to check cloud trial:', e)
      }
      return { isValid: true, daysLeft: 7, message: 'Cloud mode', isActivated: true }
    },
    resetActivation: () => {
      throw new Error('Not available in cloud mode')
    }
  },
  najiz: {
    syncStart: () => {
      throw new Error('Not available in cloud mode')
    },
    importLocal: () => {
      throw new Error('Not available in cloud mode')
    },
    exportLatest: () => {
      throw new Error('Not available in cloud mode')
    },
    openDataFolder: () => {
      throw new Error('Not available in cloud mode')
    },
    getStatus: () => Promise.resolve({}),
    onStatus: (_cb: any) => () => {},
    commandFeedback: (_payload: any) => {},
    dataExtracted: (_data: any[]) => {}
  }
}

export default api
