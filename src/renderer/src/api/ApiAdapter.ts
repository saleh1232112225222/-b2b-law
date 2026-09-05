import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import {
  normalizeInvoice,
  normalizeOfficeAccountsReport,
  normalizeReceivable
} from './financeContracts'

type ApiMode = 'desktop' | 'cloud'

let mode: ApiMode = 'desktop'
let cloudClient: AxiosInstance | null = null
let restoreProgressCallback: ((p: any) => void) | null = null

export function setApiMode(m: ApiMode) {
  mode = m
}

function getXsrfToken(): string | null {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/)
  if (match) return decodeURIComponent(match[1])
  return localStorage.getItem('csrfToken')
}

export function setCloudBaseUrl(url: string) {
  cloudClient = axios.create({
    baseURL: url,
    timeout: 60000,
    headers: { 'Content-Type': 'application/json' }
  })
  cloudClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('b2b_cloud_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    const method = (config.method || 'get').toLowerCase()
    if (['post', 'put', 'patch', 'delete'].includes(method)) {
      const xsrfToken = getXsrfToken()
      if (xsrfToken) {
        config.headers['X-XSRF-TOKEN'] = xsrfToken
      }
    }
    return config
  })
  cloudClient.interceptors.response.use(
    (res) => res,
    async (error) => {
      if (error.response?.data?.error) {
        const code = error.response.data.code
        error.message = code && !error.response.data.error.includes(code)
          ? `${error.response.data.error} (${code})`
          : error.response.data.error
      }
      if (error.response?.status === 401 && mode === 'cloud') {
        if (isMockMode()) {
          return Promise.reject(error)
        }
        localStorage.removeItem('b2b_cloud_token')
        localStorage.removeItem('csrfToken')
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
      {
        id: '1',
        case_number: '1446/1',
        case_type: 'مدني',
        status: 'نشط',
        client_name: 'شركة الأمل',
        next_session: null
      },
      {
        id: '2',
        case_number: '1446/2',
        case_type: 'تجاري',
        status: 'نشط',
        client_name: 'مؤسسة النور',
        next_session: new Date(Date.now() + 86400000).toISOString()
      }
    ],
    upcomingSessions: [
      {
        id: '1',
        case_number: '1446/1',
        session_date: new Date(Date.now() + 86400000).toISOString(),
        session_type: 'جلسة مرافعة',
        court: 'المحكمة العامة',
        client_name: 'شركة الأمل'
      },
      {
        id: '2',
        case_number: '1446/3',
        session_date: new Date(Date.now() + 172800000).toISOString(),
        session_type: 'جلسة تحضيرية',
        court: 'المحكمة التجارية',
        client_name: 'شركة البركة'
      }
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
    court_room: ['القاعة الأولى', 'القاعة الثانية', 'القاعة الثالثة'][
      Math.floor(Math.random() * 3)
    ],
    notes: null,
    result: null
  }
}

function mockOperationsSummary(): any {
  return {
    thisMonthCases: 3,
    thisMonthSessions: 7,
    thisMonthTasks: 12,
    thisMonthContracts: 2,
    pendingEnforcements: 1
  }
}

function mockOperationsReportData(): any {
  return {
    cases: {
      winRate: 75,
      won: 6,
      lost: 2
    },
    tasks: {
      completionRate: 85,
      completed: 17,
      pending: 3
    },
    finances: {
      collectionRate: 90,
      income: 250000
    },
    enforcement: {
      total: 5,
      collected: 120000
    },
    employees: [
      {
        name: 'أحمد المحامي',
        casesCount: 8,
        sessionsCount: 12,
        tasksCount: 15,
        memosCount: 5,
        score: 9.2,
        level: 'عالي الأداء'
      },
      {
        name: 'سارة المستشارة',
        casesCount: 5,
        sessionsCount: 9,
        tasksCount: 10,
        memosCount: 4,
        score: 7.8,
        level: 'متوسط'
      },
      {
        name: 'خالد المتدرب',
        casesCount: 2,
        sessionsCount: 4,
        tasksCount: 5,
        memosCount: 1,
        score: 4.5,
        level: 'منخفض'
      }
    ]
  }
}

function cloudRequest<T = any>(config: AxiosRequestConfig): Promise<T> {
  if (!cloudClient) throw new Error('Cloud base URL not configured')
  // Only use mock when there's no real JWT token (Google login provides a real token)
  const token = localStorage.getItem('b2b_cloud_token')
  const hasRealToken = token && !token.startsWith('mock-')
  if (isMockMode() && !hasRealToken) {
    const url = config.url || ''
    return Promise.resolve(
      mockCloudRequest(url, config.method || 'GET', config.data, config.params) as T
    )
  }
  return cloudClient(config).then((r) => r.data)
}

function mockCloudRequest(url: string, method: string, data?: any, params?: any): any {
  if (url.startsWith('/auth/login')) {
    const token =
      import.meta.env.VITE_USE_MOCK_OTP === 'true'
        ? 'mock-token'
        : localStorage.getItem('b2b_cloud_token')
    return {
      token,
      user: {
        id: '1',
        username: 'admin',
        name: 'المدير',
        roleKey: 'admin',
        role_key: 'admin',
        is_active: true,
        permissions: []
      }
    }
  }
  if (url.startsWith('/auth/session'))
    return {
      user: {
        id: '1',
        username: 'admin',
        name: 'المدير',
        roleKey: 'admin',
        role_key: 'admin',
        is_active: true,
        isLocked: false,
        permissions: []
      }
    }
  if (url.startsWith('/auth/recovery/question')) return 'ما هو اسم أول حيوان أليف لديك؟'
  if (url.startsWith('/auth/recovery/reset')) return { success: true }
  if (url.startsWith('/analytics/dashboard')) return mockDashboardData()
  if (url.startsWith('/reports/operations')) return mockOperationsReportData()
  if (url.startsWith('/operations-summary') || url.startsWith('/reports/operations-summary'))
    return mockOperationsSummary()
  if (url.startsWith('/briefing/summary')) return mockOperationsSummary()
  if (url.startsWith('/cases/analytics/dashboard'))
    return {
      total: 24,
      buckets: [
        { key: 'نشط', doc_count: 15 },
        { key: 'معلق', doc_count: 5 },
        { key: 'منتهي', doc_count: 4 }
      ],
      trend: { '2024': 10, '2025': 18, '2026': 24 },
      recentCases: [
        {
          id: '1',
          case_number: '1446/1',
          case_type: 'مدني',
          status: 'نشط',
          client_name: 'شركة الأمل'
        },
        {
          id: '2',
          case_number: '1446/2',
          case_type: 'تجاري',
          status: 'نشط',
          client_name: 'مؤسسة النور'
        }
      ],
      upcomingSessions: [
        {
          id: '1',
          case_number: '1446/1',
          date: new Date(Date.now() + 86400000).toISOString(),
          type: 'جلسة مرافعة',
          client_name: 'شركة الأمل'
        }
      ]
    }
  if (
    url.startsWith('/sessions/today') ||
    (url.startsWith('/sessions') && method === 'GET' && params?.from)
  ) {
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
  if (url.startsWith('/system/database-inventory'))
    return [
      { name: 'clients', count: 12 },
      { name: 'cases', count: 24 },
      { name: 'sessions', count: 8 }
    ]
  if (url.startsWith('/system/export-snapshot'))
    return { success: true, companyId: 'mock-company', tables: {} }
  if (url.startsWith('/system/import-snapshot'))
    return { success: true, counts: { clients: { received: 10, imported: 10 } } }
  if (url.startsWith('/system/clear-all-data')) return { success: true }
  if (url.startsWith('/firm')) return { data: { name: 'مكتب المحاماة', logo: null } }
  if (url.startsWith('/permissions')) return { data: [] }
  if (url.startsWith('/users/active-staff') || url.startsWith('/users/assignable'))
    return { data: [] }
  if (url.startsWith('/enforcement/count')) return { count: 0 }
  if (url.startsWith('/enforcement/requests')) return { data: [], total: 0 }
  if (url.startsWith('/enforcement')) return { data: [], total: 0 }
  if (url.startsWith('/archive')) return { data: [] }
  if (url.startsWith('/search')) return { data: [] }
  // Mock report endpoints
  if (url.startsWith('/reports/users-permissions')) return { users: [], permissions: [] }
  if (url.startsWith('/reports/user-activity')) return { data: [] }
  if (url.startsWith('/reports/sessions'))
    return { rows: [], pageInfo: { page: 1, pageSize: 25, totalRows: 0 } }
  if (url.startsWith('/reports/case')) return { data: {} }
  if (url.startsWith('/reports/financial-summary'))
    return {
      totals: { totalIn: 0, totalOut: 0, balance: 0 },
      rows: [],
      pageInfo: { page: 1, pageSize: 25, totalRows: 0 }
    }
  if (url.startsWith('/reports/activity')) return { data: [] }
  if (url.startsWith('/reports/evidence')) return { data: [] }
  if (url.startsWith('/reports/memoranda')) return { data: [] }
  if (url.startsWith('/reports/documents')) return { data: [] }
  if (url.startsWith('/reports/operations-summary')) return { data: {} }
  if (url.startsWith('/reports/export/csv')) return createCsvBlob(data?.rows || [])
  if (url.startsWith('/reports/export/pdf') || url.startsWith('/reports/export/html')) {
    return new Blob([createMockReportHtml(data?.type)], { type: 'text/html;charset=utf-8' })
  }
  if (url.startsWith('/reports/preview')) return createMockReportHtml(data?.type)
  // Mock sync endpoints
  if (url.startsWith('/sync/status'))
    return {
      status: 'synced',
      unresolvedConflicts: 0,
      pendingQueue: 0,
      lastSyncAt: new Date().toISOString(),
      serverTime: new Date().toISOString()
    }
  if (url.startsWith('/sync/pull')) return { pulledAt: new Date().toISOString(), changes: {} }
  if (url.startsWith('/sync/push')) return { success: true, processed: 0, results: [] }
  if (url.startsWith('/sync/conflicts')) return []
  if (url.startsWith('/sync/resolve-conflict')) return { success: true }
  if (url.startsWith('/sync/logs')) return []

  // Mock subscription endpoints
  if (url.startsWith('/subscriptions/plans'))
    return {
      success: true,
      data: [
        {
          id: 'plan-monthly',
          name_ar: 'شهري',
          interval: 'month',
          price: 99,
          description: 'خطة شهرية مرنة'
        },
        {
          id: 'plan-yearly',
          name_ar: 'سنوي',
          interval: 'year',
          price: 999,
          description: 'خطة سنوية اقتصادية'
        },
        {
          id: 'plan-lifetime',
          name_ar: 'مدى الحياة',
          interval: 'lifetime',
          price: 2499,
          description: 'اشتراك لمرة واحدة'
        }
      ]
    }
  if (url.startsWith('/subscriptions/status'))
    return {
      isActive: true,
      status: 'active',
      daysLeft: 365,
      planNameAr: 'سنوي',
      currentPeriodEnd: new Date(Date.now() + 365 * 86400000).toISOString()
    }
  if (url.startsWith('/subscriptions/create-payment-intent'))
    return { paymentId: 'mock-payment-' + Date.now() }
  if (url.startsWith('/subscriptions/confirm-payment'))
    return { success: true, message: 'تم تأكيد الدفع بنجاح' }
  if (url.startsWith('/subscriptions/cancel')) return { success: true }
  if (url.startsWith('/subscriptions/start-trial'))
    return {
      success: true,
      message: 'تم بدء الفترة التجريبية',
      trialEnd: new Date(Date.now() + 7 * 86400000).toISOString()
    }

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
    if (method === 'POST')
      return { success: true, id: crypto.randomUUID?.() || Date.now().toString() }
    // create sub-entity: POST /entity/:action
    if (method === 'POST' && action)
      return { success: true, id: crypto.randomUUID?.() || Date.now().toString() }
    // default
    return { data: [] }
  }

  return { data: [] }
}

function desktopInvoke<T>(channel: string, ...args: any[]): Promise<T> {
  return window.ipcRenderer
    ? window.ipcRenderer.invoke(channel, ...args)
    : Promise.resolve([] as any)
}

type ReportSaveResult = {
  saved: boolean
  filename?: string
  path?: string
  opened?: boolean
}

function ensureFileExtension(filename: string | undefined, extension: string): string {
  const base = String(filename || 'report').trim() || 'report'
  return base.toLowerCase().endsWith(extension) ? base : `${base}${extension}`
}

function createCsvBlob(rows: any[]): Blob {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('لا توجد بيانات للتصدير')
  }

  const headers = Object.keys(rows[0] || {})
  const escapeCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const csv = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => headers.map((header) => escapeCell(row?.[header])).join(','))
  ].join('\r\n')

  return new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
}

function createMockReportHtml(type: string | undefined): string {
  const titles: Record<string, string> = {
    sessions: 'تقرير الجلسات',
    financial: 'التقرير المالي',
    activity: 'تقرير نشاط المستخدم',
    evidence: 'تقرير الأدلة',
    memoranda: 'تقرير المذكرات',
    memoranda_list: 'تقرير المذكرات',
    documents: 'تقرير المستندات',
    users_permissions: 'تقرير المستخدمين والصلاحيات',
    operations: 'تقرير العمليات',
    operations_advanced: 'تقرير الأداء التشغيلي',
    'case-a4': 'تقرير القضية'
  }
  const title = titles[String(type || '')] || 'تقرير النظام'
  return `<!doctype html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          @page { size: A4; margin: 18mm; }
          body { font-family: Arial, sans-serif; color: #172033; direction: rtl; }
          header { text-align: center; border-bottom: 2px solid #b58b19; padding-bottom: 12px; }
          h1 { color: #8a6b18; }
          main { margin-top: 24px; border: 1px solid #ddd; padding: 24px; }
        </style>
      </head>
      <body>
        <header><h1>مكتب المحاماة</h1><strong>${title}</strong></header>
        <main>هذه معاينة تجريبية للتقرير. لا توجد بيانات فعلية في وضع العرض التجريبي.</main>
        <script>window.addEventListener('load', () => setTimeout(() => window.print(), 250))</script>
      </body>
    </html>`
}

function saveBlobToBrowser(blob: Blob, filename: string): ReportSaveResult {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return { saved: true, filename }
}

async function normalizeReportBlob(response: any, fallbackMime: string): Promise<Blob> {
  if (response instanceof Blob) return response
  if (typeof response === 'string') return new Blob([response], { type: fallbackMime })

  const dataUrl = typeof response?.url === 'string' ? response.url : ''
  if (dataUrl.startsWith('data:')) {
    const fetched = await fetch(dataUrl)
    return fetched.blob()
  }
  if (dataUrl) {
    const fetched = await fetch(dataUrl)
    if (!fetched.ok) throw new Error('تعذر تنزيل ملف التقرير')
    return fetched.blob()
  }

  throw new Error('لم يُرجع الخادم ملفًا صالحًا للتصدير')
}

async function openPrintableReport(
  response: any,
  filename: string,
  previewWindow: Window | null
): Promise<ReportSaveResult> {
  const blob = await normalizeReportBlob(response, 'text/html;charset=utf-8')
  if (blob.type.toLowerCase().includes('pdf')) {
    previewWindow?.close()
    return saveBlobToBrowser(blob, ensureFileExtension(filename, '.pdf'))
  }

  const html = await blob.text()
  if (previewWindow) {
    previewWindow.document.open()
    previewWindow.document.write(html)
    previewWindow.document.close()
    return { saved: true, opened: true, filename }
  }

  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.target = '_blank'
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60000)
  return { saved: true, opened: true, filename }
}

/**
 * Keep the renderer contract stable across the desktop API, the cloud API and
 * development mocks.  Older endpoints return arrays directly while some
 * adapters wrap them in `{ data }` (and reports occasionally use `{ rows }`).
 */
export function unwrapArrayResponse<T = any>(response: unknown): T[] {
  if (Array.isArray(response)) return response as T[]
  if (response && typeof response === 'object') {
    const value = response as { data?: unknown; rows?: unknown; items?: unknown }
    if (Array.isArray(value.data)) return value.data as T[]
    if (Array.isArray(value.rows)) return value.rows as T[]
    if (Array.isArray(value.items)) return value.items as T[]
  }
  return []
}

function buildCrudApi(entity: string, desktopEntity = entity) {
  return {
    getAll: (params?: any) =>
      mode === 'desktop'
        ? desktopInvoke(`${desktopEntity}:getAll`, params)
        : cloudRequest({ method: 'GET', url: `/${entity}/all`, params }).then(unwrapArrayResponse),
    list: (params: any) =>
      mode === 'desktop'
        ? desktopInvoke(`${desktopEntity}:list`, params)
        : cloudRequest<any>({ method: 'GET', url: `/${entity}`, params }).then(unwrapArrayResponse),
    count: (params?: any) =>
      mode === 'desktop'
        ? desktopInvoke(`${desktopEntity}:count`, params)
        : cloudRequest<any>({ method: 'GET', url: `/${entity}/count`, params }).then(
            (r) => r.count
          ),
    getById: (id: string) =>
      mode === 'desktop'
        ? window.ipcRenderer
          ? window.ipcRenderer.invoke(`${desktopEntity}:getById`, id)
          : Promise.resolve(null)
        : cloudRequest({ method: 'GET', url: `/${entity}/${id}` }),
    create: (data: any) =>
      mode === 'desktop'
        ? window.ipcRenderer
          ? window.ipcRenderer.invoke(`${desktopEntity}:create`, data)
          : Promise.resolve({})
        : cloudRequest({ method: 'POST', url: `/${entity}`, data }),
    update: (id: string, data: any) =>
      mode === 'desktop'
        ? window.ipcRenderer
          ? window.ipcRenderer.invoke(`${desktopEntity}:update`, id, data)
          : Promise.resolve({})
        : cloudRequest({ method: 'PUT', url: `/${entity}/${id}`, data }),
    delete: (id: string) =>
      mode === 'desktop'
        ? window.ipcRenderer
          ? window.ipcRenderer.invoke(`${desktopEntity}:delete`, id)
          : Promise.resolve(undefined)
        : cloudRequest({ method: 'DELETE', url: `/${entity}/${id}` }),
    search: (query: string) =>
      mode === 'desktop'
        ? desktopInvoke(`${desktopEntity}:search`, query)
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
            // r is the full response: { token, user: {...} }
            if (r.token) {
              localStorage.setItem('b2b_cloud_token', r.token)
            }
            if (r.csrfToken) {
              localStorage.setItem('csrfToken', r.csrfToken)
            }
            return { ...(r.user || r), isLocked: false }
          }),
    logout: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('auth:logout')
        : cloudRequest({ method: 'POST', url: '/auth/logout' }).then((r) => {
            localStorage.removeItem('csrfToken')
            return r
          }),
    exchangeOAuthCode: (code: string) =>
      cloudRequest<any>({ method: 'POST', url: '/auth/exchange', data: { code } }).then((r) => {
        if (r.token) {
          localStorage.setItem('b2b_cloud_token', r.token)
        }
        if (r.csrfToken) {
          localStorage.setItem('csrfToken', r.csrfToken)
        }
        return r
      }),
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
    checkAvailability: (field: string, value: string) =>
      mode === 'desktop'
        ? Promise.resolve({ available: true }) // In desktop, uniqueness relies on DB error or sync
        : cloudRequest<any>({
            method: 'POST',
            url: '/auth/check-availability',
            data: { field, value }
          }),
    register: (
      companyName: string,
      username: string,
      email: string,
      phone: string,
      password: string
    ) =>
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
    getRecoveryQuestion: (username: string, email: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('auth:getRecoveryQuestion', username, email)
        : cloudRequest<any>({
            method: 'POST',
            url: '/auth/recovery/question',
            data: { username, email }
          }),
    verifyAndReset: (username: string, answer: string, newPassword: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('auth:verifyAndReset', username, answer, newPassword)
        : cloudRequest<any>({
            method: 'POST',
            url: '/auth/recovery/reset',
            data: { username, answer, newPassword }
          }),
    onLockTriggered: (_cb: () => void) => () => {}, // handled differently in cloud
    verifyMfa: (userId: string, code: string) =>
      mode === 'desktop'
        ? Promise.reject(new Error('MFA is not supported in desktop mode'))
        : cloudRequest<any>({
            method: 'POST',
            url: '/auth/verify-mfa',
            data: { userId, code }
          }).then((r) => {
            if (r.token) {
              localStorage.setItem('b2b_cloud_token', r.token)
            }
            if (r.csrfToken) {
              localStorage.setItem('csrfToken', r.csrfToken)
            }
            return { ...(r.user || r), permissions: r.permissions || [] }
          }),
    mfaSetup: () =>
      mode === 'desktop'
        ? Promise.reject(new Error('MFA is not supported in desktop mode'))
        : cloudRequest<any>({ method: 'POST', url: '/auth/mfa/setup' }),
    mfaEnable: (secret: string, code: string) =>
      mode === 'desktop'
        ? Promise.reject(new Error('MFA is not supported in desktop mode'))
        : cloudRequest<any>({
            method: 'POST',
            url: '/auth/mfa/enable',
            data: { secret, code }
          }),
    mfaDisable: (code: string) =>
      mode === 'desktop'
        ? Promise.reject(new Error('MFA is not supported in desktop mode'))
        : cloudRequest<any>({
            method: 'POST',
            url: '/auth/mfa/disable',
            data: { code }
          })
  },
  clients: buildCrudApi('clients'),
  legalServices: {
    getCategories: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('legalServices:getCategories')
        : cloudRequest({ method: 'GET', url: '/legal-services/categories' }),
    getTypes: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('legalServices:getTypes')
        : cloudRequest({ method: 'GET', url: '/legal-services/types' }),
    getStatuses: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('legalServices:getStatuses')
        : cloudRequest({ method: 'GET', url: '/legal-services/statuses' }),
    getPriorities: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('legalServices:getPriorities')
        : cloudRequest({ method: 'GET', url: '/legal-services/priorities' }),
    count: (params: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('legalServices:count', params)
        : cloudRequest({ method: 'GET', url: '/legal-services/engagements/count', params }),
    list: (params: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('legalServices:list', params)
        : cloudRequest({ method: 'GET', url: '/legal-services/engagements', params }),
    create: (data: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('legalServices:create', data)
        : cloudRequest({ method: 'POST', url: '/legal-services/engagements', data }).then(
            (r: any) => r.id
          ),
    update: (id: string, data: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('legalServices:update', id, data)
        : cloudRequest({ method: 'PUT', url: `/legal-services/engagements/${id}`, data }),
    delete: (id: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('legalServices:delete', id)
        : cloudRequest({ method: 'DELETE', url: `/legal-services/engagements/${id}` }),
    getById: (id: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('legalServices:getById', id)
        : cloudRequest({ method: 'GET', url: `/legal-services/engagements/${id}` }),
    getNotes: (id: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('legalServices:getNotes', id)
        : cloudRequest({ method: 'GET', url: `/legal-services/engagements/${id}/notes` }),
    addNote: (id: string, noteText: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('legalServices:addNote', id, noteText)
        : cloudRequest({
            method: 'POST',
            url: `/legal-services/engagements/${id}/notes`,
            data: { noteText }
          }),
    getAttachments: (id: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('legalServices:getAttachments', id)
        : cloudRequest({ method: 'GET', url: `/legal-services/engagements/${id}/attachments` }),
    addAttachment: (id: string, fileName: string, filePath: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('legalServices:addAttachment', id, fileName, filePath)
        : cloudRequest({
            method: 'POST',
            url: `/legal-services/engagements/${id}/attachments`,
            data: { fileName, filePath }
          }),
    getTimeline: (id: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('legalServices:getTimeline', id)
        : cloudRequest({ method: 'GET', url: `/legal-services/engagements/${id}/timeline` }),
    generateInvoice: (id: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('legalServices:generateInvoice', id)
        : cloudRequest({ method: 'POST', url: `/legal-services/engagements/${id}/invoice` }),
    getFinance: (id: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('legalServices:getFinance', id)
        : cloudRequest({ method: 'GET', url: `/legal-services/engagements/${id}/finance` }),
    getByCaseId: (caseId: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('legalServices:list', { case_id: caseId, pageSize: 100 })
        : cloudRequest({
            method: 'GET',
            url: '/legal-services/engagements',
            params: { case_id: caseId, pageSize: 100 }
          }),
    getClientSummary: (clientId: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('legalServices:getClientSummary', clientId)
        : cloudRequest({ method: 'GET', url: `/legal-services/client/${clientId}/summary` }),
    // ═══════════════════════════════════════════════════
    // Office Accounts APIs
    // ═══════════════════════════════════════════════════
    recordPayment: (engagementId: string, data: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('legalServices:recordPayment', engagementId, data)
        : cloudRequest({
            method: 'POST',
            url: `/office-accounts/engagements/${engagementId}/payments`,
            data
          }),
    getPayments: (engagementId: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('legalServices:getPayments', engagementId)
        : cloudRequest({
            method: 'GET',
            url: `/office-accounts/engagements/${engagementId}/payments`
          }),
    createInstallments: (engagementId: string, data: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('legalServices:createInstallments', engagementId, data)
        : cloudRequest({
            method: 'POST',
            url: `/office-accounts/engagements/${engagementId}/installments`,
            data
          }),
    getInstallments: (engagementId: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('legalServices:getInstallments', engagementId)
        : cloudRequest({
            method: 'GET',
            url: `/office-accounts/engagements/${engagementId}/installments`
          }),
    adjustFee: (engagementId: string, data: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('legalServices:adjustFee', engagementId, data)
        : cloudRequest({
            method: 'PUT',
            url: `/office-accounts/engagements/${engagementId}/adjust-fee`,
            data
          }),
    closeFinance: (engagementId: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('legalServices:closeFinance', engagementId)
        : cloudRequest({
            method: 'POST',
            url: `/office-accounts/engagements/${engagementId}/close-finance`
          }),
    getClientFinancialSummary: (clientId: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('legalServices:getClientFinancialSummary', clientId)
        : cloudRequest({
            method: 'GET',
            url: `/office-accounts/clients/${clientId}/financial-summary`
          }),
    getOfficeAccountsReport: (params: any) =>
      Promise.resolve(mode === 'desktop'
        ? window.ipcRenderer?.invoke('legalServices:getOfficeAccountsReport', params)
        : cloudRequest({ method: 'GET', url: '/office-accounts/report', params })
      ).then(normalizeOfficeAccountsReport),
    applyLateFee: (engagementId: string, data: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('legalServices:applyLateFee', engagementId, data)
        : cloudRequest({
            method: 'POST',
            url: `/office-accounts/engagements/${engagementId}/late-fee`,
            data
          }),
    getClientFullProfile: (clientId: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('legalServices:getClientFullProfile', clientId)
        : cloudRequest({ method: 'GET', url: `/office-accounts/clients/${clientId}/full-profile` })
  },
  officeManagement: {
    getDashboard: (params?: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('officeManagement:getDashboard', params)
        : cloudRequest({ method: 'GET', url: '/office-management/dashboard', params }),
    getExpenses: (params?: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('officeManagement:getExpenses', params)
        : cloudRequest({ method: 'GET', url: '/office-management/expenses', params }),
    addExpense: (data: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('officeManagement:addExpense', data)
        : cloudRequest({ method: 'POST', url: '/office-management/expenses', data }),
    deleteExpense: (id: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('officeManagement:deleteExpense', id)
        : cloudRequest({ method: 'DELETE', url: `/office-management/expenses/${id}` }),
    getPartners: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('officeManagement:getPartners')
        : cloudRequest({ method: 'GET', url: '/office-management/partners' }),
    addPartner: (data: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('officeManagement:addPartner', data)
        : cloudRequest({ method: 'POST', url: '/office-management/partners', data }),
    updatePartner: (id: string, data: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('officeManagement:updatePartner', id, data)
        : cloudRequest({ method: 'PUT', url: `/office-management/partners/${id}`, data }),
    getContributions: (params?: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('officeManagement:getContributions', params)
        : cloudRequest({ method: 'GET', url: '/office-management/contributions', params }),
    addContribution: (data: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('officeManagement:addContribution', data)
        : cloudRequest({ method: 'POST', url: '/office-management/contributions', data }),
    getBudgets: (params?: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('officeManagement:getBudgets', params)
        : cloudRequest({ method: 'GET', url: '/office-management/budgets', params }),
    updateBudget: (data: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('officeManagement:updateBudget', data)
        : cloudRequest({ method: 'POST', url: '/office-management/budgets', data }),
    getDistributions: (params?: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('officeManagement:getDistributions', params)
        : cloudRequest({ method: 'GET', url: '/office-management/distributions', params }),
    distributeProfits: (data: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('officeManagement:distributeProfits', data)
        : cloudRequest({ method: 'POST', url: '/office-management/distributions', data })
  },
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
        : cloudRequest({ method: 'GET', url: `/documents/by-case/${caseId}` }).then(unwrapArrayResponse),
    getByTaskId: (taskId: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('documents:getByTaskId', taskId)
        : cloudRequest({ method: 'GET', url: `/documents/by-task/${taskId}` }).then(unwrapArrayResponse),
    getBySessionId: (sessionId: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('documents:getBySessionId', sessionId)
        : cloudRequest({ method: 'GET', url: `/documents/by-session/${sessionId}` }).then(unwrapArrayResponse),
    upload: async (info: any) => {
      if (mode === 'desktop' && window.ipcRenderer) {
        return window.ipcRenderer.invoke('documents:upload', info)
      }
      return new Promise((resolve, reject) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.onchange = async () => {
          if (!input.files || input.files.length === 0) {
            resolve(null)
            return
          }
          const file = input.files[0]
          const reader = new FileReader()
          reader.onload = async () => {
            try {
              const res = await cloudRequest({
                method: 'POST',
                url: '/documents/upload',
                data: {
                  name: file.name,
                  fileType: file.name.includes('.') ? '.' + file.name.split('.').pop() : '',
                  fileSize: file.size,
                  fileData: reader.result,
                  linkType: info.linkType || 'none',
                  parentId: info.parentId,
                  linkedTitle: info.linkedTitle
                }
              })
              resolve(res)
            } catch (err) {
              reject(err)
            }
          }
          reader.onerror = () => reject(new Error('فشل قراءة الملف المختار'))
          reader.readAsDataURL(file)
        }
        input.oncancel = () => resolve(null)
        window.addEventListener(
          'focus',
          () => {
            setTimeout(() => {
              if (!input.files || input.files.length === 0) {
                resolve(null)
              }
            }, 600)
          },
          { once: true }
        )
        input.click()
      })
    },
    open: async (docOrPath: any) => {
      if (mode === 'desktop' && window.ipcRenderer) {
        const p = typeof docOrPath === 'string' ? docOrPath : docOrPath?.file_path
        if (p) return window.ipcRenderer.invoke('documents:open', p)
      }
      const p = typeof docOrPath === 'string' ? docOrPath : docOrPath?.file_path || ''
      if (p.startsWith('http') || p.startsWith('data:') || p.startsWith('blob:')) {
        window.open(p, '_blank')
      } else if (typeof docOrPath === 'object' && docOrPath?.id) {
        window.open(`/api/documents/${docOrPath.id}`, '_blank')
      }
    }
  },
  finances: {
    ...buildCrudApi('finances'),
    getStats: () =>
      mode === 'desktop'
        ? window.ipcRenderer
          ? window.ipcRenderer.invoke('finances:getStats')
          : Promise.resolve({ income: 0, expense: 0, balance: 0 })
        : cloudRequest({ method: 'GET', url: '/finances/stats' })
  },
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
        ? window.ipcRenderer
          ? window.ipcRenderer.invoke('users:listAssignable')
          : Promise.resolve([])
        : cloudRequest({ method: 'GET', url: '/users/assignable' }).then(unwrapArrayResponse),
    listActiveStaff: () =>
      mode === 'desktop'
        ? window.ipcRenderer
          ? window.ipcRenderer.invoke('users:listActiveStaff')
          : Promise.resolve([])
        : cloudRequest({ method: 'GET', url: '/users/active-staff' }).then(unwrapArrayResponse),
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
  invoices: {
    ...buildCrudApi('invoices'),
    getAll: (params?: any) =>
      (mode === 'desktop'
        ? desktopInvoke('invoices:getAll', params)
        : cloudRequest({ method: 'GET', url: '/invoices/all', params })
      ).then((rows) => unwrapArrayResponse(rows).map(normalizeInvoice)),
    createWithReceivable: (data: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('invoices:create', data).then(async (invoiceId: string) => {
            const invoice = { ...data, id: invoiceId }
            const receivable = await window.ipcRenderer?.invoke(
              'receivables:createFromInvoice', invoice, data.due_date
            )
            return { invoice, receivable }
          })
        : cloudRequest({ method: 'POST', url: '/financial-operations/invoices', data })
  },
  vouchers: {
    ...buildCrudApi('vouchers'),
    createLinked: (data: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('vouchers:create', data)
        : cloudRequest({ method: 'POST', url: '/financial-operations/vouchers', data })
  },
  creditNotes: {
    ...buildCrudApi('credit-notes', 'creditNotes'),
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
    getAll: (params?: any) =>
      (mode === 'desktop'
        ? desktopInvoke('receivables:getAll', params)
        : cloudRequest({ method: 'GET', url: '/receivables/all', params })
      ).then((rows) => unwrapArrayResponse(rows).map(normalizeReceivable)),
    getByClientId: (clientId: string) =>
      Promise.resolve(mode === 'desktop'
        ? window.ipcRenderer?.invoke('receivables:getByClientId', clientId)
        : cloudRequest({ method: 'GET', url: `/receivables/by-client/${clientId}` })
      ).then((rows) => unwrapArrayResponse(rows).map(normalizeReceivable)),
    getOpen: () =>
      Promise.resolve(mode === 'desktop'
        ? window.ipcRenderer?.invoke('receivables:getOpen')
        : cloudRequest({ method: 'GET', url: '/receivables/open' })
      ).then((rows) => unwrapArrayResponse(rows).map(normalizeReceivable)),
    createFromInvoice: (invoice: any, dueDate?: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('receivables:createFromInvoice', invoice, dueDate)
        : cloudRequest({
            method: 'POST',
            url: '/receivables/from-invoice',
            data: { invoice, dueDate }
          }),
    applyPayment: (id: string, amount: number, accountId?: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('receivables:applyPayment', id, amount)
        : cloudRequest({
            method: 'POST',
            url: `/receivables/${id}/apply-payment`,
            data: { amount, account_id: accountId }
          })
  },
  activityLogs: {
    getAll: (filters?: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('activityLogs:getAll', filters)
        : cloudRequest<any>({ method: 'GET', url: '/activity-logs/all', params: filters }),
    count: (filters?: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('activityLogs:count', filters)
        : cloudRequest<any>({ method: 'GET', url: '/activity-logs/count', params: filters }).then(
            (r) => r?.count ?? 0
          ),
    list: (params: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('activityLogs:list', params)
        : cloudRequest<any>({
            method: 'GET',
            url: '/activity-logs',
            params: {
              page: params?.page || 1,
              pageSize: params?.pageSize || 25,
              ...(params?.filters || {})
            }
          }).then((r) => r?.data ?? r ?? []),
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
    getLegalServicesReport: (params: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('reports:getLegalServicesReport', params)
        : cloudRequest({ method: 'GET', url: '/reports/legal-services', params }),
    getLegalServicesStats: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('reports:getLegalServicesStats')
        : cloudRequest({ method: 'GET', url: '/reports/legal-services/stats' }),
    exportLegalServices: (params: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('reports:exportLegalServices', params)
        : cloudRequest({
            method: 'POST',
            url: '/reports/legal-services/export',
            data: params,
            responseType: 'blob'
          }),
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
    exportCsv: async (
      filenameOrPayload: string | { filename: string; rows: any[] },
      suppliedRows?: any[]
    ) => {
      const payload =
        typeof filenameOrPayload === 'string'
          ? { filename: filenameOrPayload, rows: suppliedRows || [] }
          : filenameOrPayload
      const filename = ensureFileExtension(payload.filename || 'export', '.csv')
      if (!Array.isArray(payload.rows) || payload.rows.length === 0) {
        throw new Error('لا توجد بيانات للتصدير')
      }

      const response =
        mode === 'desktop'
          ? await window.ipcRenderer?.invoke('reports:exportCsv', {
              filename,
              rows: payload.rows
            })
          : await cloudRequest({
              method: 'POST',
              url: '/reports/export/csv',
              data: { filename, rows: payload.rows },
              responseType: 'blob'
            })

      if (response?.saved && !response?.csv && !(response instanceof Blob)) return response
      const blob =
        response instanceof Blob
          ? response
          : typeof response?.csv === 'string'
            ? new Blob([response.csv], { type: 'text/csv;charset=utf-8' })
            : null
      if (!blob) throw new Error('لم يُرجع الخادم ملف CSV صالحًا')
      return {
        ...saveBlobToBrowser(blob, ensureFileExtension(response?.filename || filename, '.csv')),
        csv: typeof response?.csv === 'string' ? response.csv : undefined
      }
    },
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
    exportPdf: async (payload: any) => {
      if (mode === 'desktop') return window.ipcRenderer?.invoke('reports:exportPdf', payload)

      const previewWindow = typeof window !== 'undefined' ? window.open('', '_blank') : null
      try {
        const response = await cloudRequest({
          method: 'POST',
          url: '/reports/export/pdf',
          data: payload,
          responseType: 'blob'
        })
        return await openPrintableReport(
          response,
          ensureFileExtension(payload.filename || payload.type || 'report', '.pdf'),
          previewWindow
        )
      } catch (error) {
        previewWindow?.close()
        throw error
      }
    },
    exportHtml: async (payload: any) => {
      if (mode === 'desktop') return window.ipcRenderer?.invoke('reports:exportHtml', payload)
      const response = await cloudRequest({
        method: 'POST',
        url: '/reports/export/html',
        data: payload,
        responseType: 'blob'
      })
      const blob = await normalizeReportBlob(response, 'text/html;charset=utf-8')
      return saveBlobToBrowser(
        blob,
        ensureFileExtension(payload.filename || payload.type || 'report', '.html')
      )
    },
    printReport: async (payload: any) => {
      if (mode === 'desktop') return window.ipcRenderer?.invoke('reports:printReport', payload)

      const previewWindow = typeof window !== 'undefined' ? window.open('', '_blank') : null
      try {
        const response = await cloudRequest({
          method: 'POST',
          url: '/reports/export/pdf',
          data: payload,
          responseType: 'blob'
        })
        await openPrintableReport(response, payload.type || 'report', previewWindow)
        return true
      } catch (error) {
        previewWindow?.close()
        throw error
      }
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
        : cloudRequest({ method: 'GET', url: '/reports/operations' })
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
        : cloudRequest({ method: 'POST', url: '/system/export-snapshot' }).then(async (r) => {
            const fileName = `manual-snapshot-${new Date().toISOString().replace(/[:.]/g, '-')}.json`

            // Check if modern browser File System Access API is supported
            if ('showSaveFilePicker' in window) {
              try {
                const handle = await (window as any).showSaveFilePicker({
                  suggestedName: fileName,
                  types: [
                    {
                      description: 'JSON Backup Files',
                      accept: { 'application/json': ['.json'] }
                    }
                  ]
                })
                const writable = await handle.createWritable()
                await writable.write(JSON.stringify(r, null, 2))
                await writable.close()
                return { success: true }
              } catch (err: any) {
                if (err.name === 'AbortError') {
                  return { success: false, message: 'تم الإلغاء' }
                }
                console.warn(
                  '[ExportSnapshot] showSaveFilePicker failed, falling back to standard download:',
                  err
                )
              }
            }

            const blob = new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = fileName
            a.click()
            URL.revokeObjectURL(url)
            return { success: true }
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
                  data: { tables: data.tables, mode: 'merge' },
                  timeout: 120000
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
    getDiagnostic: () =>
      mode === 'desktop'
        ? Promise.resolve(null)
        : cloudRequest({ method: 'GET', url: '/system/diagnostic' }),
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
                  restoreProgressCallback({
                    stage: 'parse',
                    percent: 10,
                    message: 'قراءة ملف النسخة الاحتياطية...'
                  })
                }
                const text = await file.text()
                const data = JSON.parse(text)
                if (!data.tables) {
                  resolve({ success: false, errors: ['ملف النسخة الاحتياطية غير صالح'] })
                  return
                }
                if (restoreProgressCallback) {
                  restoreProgressCallback({
                    stage: 'verify',
                    percent: 30,
                    message: 'التحقق من سلامة البيانات...'
                  })
                }
                if (restoreProgressCallback) {
                  restoreProgressCallback({
                    stage: 'inject',
                    percent: 50,
                    message: 'جاري استيراد البيانات إلى الخادم السحابي...'
                  })
                }
                const result = await cloudRequest({
                  method: 'POST',
                  url: '/system/import-snapshot',
                  data: { tables: data.tables, mode: 'replace' }
                })
                if (restoreProgressCallback) {
                  restoreProgressCallback({
                    stage: 'done',
                    percent: 100,
                    message: 'تمت الاستعادة بنجاح.'
                  })
                }
                resolve({ success: true, ...result })
              } catch (e) {
                resolve({ success: false, errors: [(e as Error).message] })
              }
            }
            input.click()
          }),
    exportDisasterRecovery: async (mfaCode: string, recoveryPassphrase: string) => {
      if (mode === 'desktop') {
        const result = await window.ipcRenderer?.invoke('backup:tenantExport', mfaCode, recoveryPassphrase)
        return result?.success === true
      }
      if (!cloudClient) throw new Error('Cloud base URL not configured')
      const step = await cloudRequest<{ stepUpToken: string }>({
        method: 'POST',
        url: '/tenant/step-up',
        data: { scope: 'backup_export', code: mfaCode }
      })
      const response = await cloudClient.request<Blob>({
        method: 'POST',
        url: '/tenant/export-v3',
        data: { recoveryPassphrase },
        responseType: 'blob',
        timeout: 0,
        headers: { 'X-Backup-Step-Up-Token': step.stepUpToken }
      })
      const url = URL.createObjectURL(response.data)
      try {
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `b2b-disaster-recovery-${new Date().toISOString().slice(0, 10)}.b2btenant`
        anchor.click()
      } finally {
        URL.revokeObjectURL(url)
      }
      return true
    },
    prepareDisasterRecovery: async (
      file: File,
      mfaCode: string,
      recoveryPassphrase: string,
      onProgress?: (percent: number) => void
    ) => {
      if (mode === 'desktop') {
        onProgress?.(5)
        const result = await window.ipcRenderer?.invoke('backup:tenantPrepare', mfaCode, recoveryPassphrase)
        onProgress?.(100)
        return result
      }
      if (!cloudClient) throw new Error('Cloud base URL not configured')
      const step = await cloudRequest<{ stepUpToken: string }>({
        method: 'POST',
        url: '/tenant/step-up',
        data: { scope: 'backup_restore', code: mfaCode }
      })
      const session = await cloudRequest<{ sessionId: string; uploadUrl: string }>({
        method: 'POST',
        url: '/tenant/import-v3/session',
        data: { recoveryPassphrase },
        headers: { 'X-Backup-Step-Up-Token': step.stepUpToken }
      })
      const preview = await cloudClient.request({
        method: 'PUT',
        url: session.uploadUrl.replace(/^\/api/, ''),
        data: file,
        timeout: 0,
        headers: { 'Content-Type': 'application/octet-stream' },
        onUploadProgress: (event) => {
          if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100))
        }
      })
      const rawPreview = (preview.data as any)?.preview || preview.data
      return {
        ...rawPreview,
        ...preview.data,
        totalRows: rawPreview?.totalRows ?? (preview.data as any)?.totalRows ?? 0,
        attachmentCount: rawPreview?.attachmentCount ?? (preview.data as any)?.attachmentCount ?? 0,
        confirmationToken: (preview.data as any)?.confirmationToken || rawPreview?.confirmationToken,
        sessionId: session.sessionId,
        stepUpToken: step.stepUpToken
      }
    },
    executeDisasterRecovery: async (sessionId: string, confirmationToken: string, stepUpToken: string) => {
      if (mode === 'desktop') {
        return window.ipcRenderer?.invoke('backup:tenantExecute', sessionId, confirmationToken, stepUpToken)
      }
      try {
        return await cloudRequest({
          method: 'POST',
          url: '/tenant/import-execute-v3',
          data: { sessionId, confirmationToken },
          headers: { 'X-Backup-Step-Up-Token': stepUpToken }
        })
      } catch (err: any) {
        if (err?.message?.includes('RESTORE_CONFIRMATION_TOKEN_REPLAYED')) {
          const fresh = await cloudRequest<{ confirmationToken: string }>({
            method: 'POST',
            url: '/tenant/import-confirm-v3',
            data: { sessionId },
            headers: { 'X-Backup-Step-Up-Token': stepUpToken }
          })
          if (fresh?.confirmationToken) {
            return cloudRequest({
              method: 'POST',
              url: '/tenant/import-execute-v3',
              data: { sessionId, confirmationToken: fresh.confirmationToken },
              headers: { 'X-Backup-Step-Up-Token': stepUpToken }
            })
          }
        }
        throw err
      }
    },
    cancelDisasterRecovery: (sessionId: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('backup:tenantCancel', sessionId)
        : cloudRequest({ method: 'DELETE', url: `/tenant-stream/import-preview/${encodeURIComponent(sessionId)}` }),
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
      if (mode !== 'desktop') return Promise.resolve('')
      return window.ipcRenderer?.invoke('licensing:get-request-code')
    },
    activate: (_key: string) => {
      if (mode !== 'desktop')
        return Promise.resolve({ success: true, message: 'نشط في وضع السحابة' })
      return window.ipcRenderer?.invoke('licensing:activate', _key)
    },
    checkTrial: async () => {
      if (mode !== 'desktop') {
        try {
          const res = await cloudRequest({ method: 'GET', url: '/subscriptions/status' })
          const data = res.subscriptionStatus || res
          return {
            isValid: data.isActive || data.status === 'active',
            daysLeft: data.daysLeft || 999,
            message: data.planNameAr || 'سحابة',
            isActivated: data.status === 'active' || data.status === 'lifetime'
          }
        } catch {
          return { isValid: true, daysLeft: 999, message: 'Cloud mode', isActivated: true }
        }
      }
      try {
        return await window.ipcRenderer?.invoke('licensing:check-trial')
      } catch {
        return { isValid: true, daysLeft: 999, isActivated: true }
      }
    },
    resetActivation: () => {
      if (mode !== 'desktop') return Promise.resolve({ success: true, requiresRestart: false })
      return window.ipcRenderer?.invoke('licensing:reset-activation')
    }
  },
  subscriptions: {
    getPlans: () =>
      mode === 'desktop'
        ? Promise.reject(new Error('Not in cloud mode'))
        : cloudRequest({ method: 'GET', url: '/subscriptions/plans' }),
    getStatus: () =>
      mode === 'desktop'
        ? Promise.reject(new Error('Not in cloud mode'))
        : cloudRequest({ method: 'GET', url: '/subscriptions/status' }),
    createPaymentIntent: (planId: string) =>
      mode === 'desktop'
        ? Promise.reject(new Error('Not in cloud mode'))
        : cloudRequest({
            method: 'POST',
            url: '/subscriptions/create-payment-intent',
            data: { planId }
          }),
    confirmPayment: (paymentId: string) =>
      mode === 'desktop'
        ? Promise.reject(new Error('Not in cloud mode'))
        : cloudRequest({ method: 'POST', url: `/subscriptions/confirm-payment/${paymentId}` }),
    cancel: () =>
      mode === 'desktop'
        ? Promise.reject(new Error('Not in cloud mode'))
        : cloudRequest({ method: 'POST', url: '/subscriptions/cancel' }),
    startTrial: () =>
      mode === 'desktop'
        ? Promise.reject(new Error('Not in cloud mode'))
        : cloudRequest({ method: 'POST', url: '/subscriptions/start-trial' })
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
  },
  timeTracking: {
    list: (params: any) =>
      mode === 'desktop'
        ? Promise.resolve([])
        : cloudRequest({ method: 'GET', url: '/time-tracking/list', params }),
    start: (payload: any) =>
      mode === 'desktop'
        ? Promise.resolve({ success: true, id: 'mock-timer' })
        : cloudRequest({ method: 'POST', url: '/time-tracking/start', data: payload }),
    stop: () =>
      mode === 'desktop'
        ? Promise.resolve({ success: true, durationMinutes: 10 })
        : cloudRequest({ method: 'POST', url: '/time-tracking/stop' }),
    manual: (payload: any) =>
      mode === 'desktop'
        ? Promise.resolve({ success: true, id: 'mock-timer-manual' })
        : cloudRequest({ method: 'POST', url: '/time-tracking/manual', data: payload }),
    delete: (id: string) =>
      mode === 'desktop'
        ? Promise.resolve({ success: true })
        : cloudRequest({ method: 'DELETE', url: `/time-tracking/${id}` })
  },
  sync: {
    getStatus: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('sync:status') ||
          Promise.reject(new Error('خدمة المزامنة غير متاحة على هذا الجهاز'))
        : !localStorage.getItem('b2b_cloud_token')
          ? Promise.reject(new Error('يجب تسجيل الدخول قبل استخدام المزامنة'))
          : cloudRequest({ method: 'GET', url: '/sync/status' }),
    pull: (data: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('sync:pull', data) ||
          Promise.reject(new Error('خدمة المزامنة غير متاحة على هذا الجهاز'))
        : cloudRequest({ method: 'POST', url: '/sync/pull', data }),
    push: (data: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('sync:push', data) ||
          Promise.reject(new Error('خدمة المزامنة غير متاحة على هذا الجهاز'))
        : cloudRequest({ method: 'POST', url: '/sync/push', data }),
    getConflicts: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('sync:conflicts') ||
          Promise.reject(new Error('خدمة المزامنة غير متاحة على هذا الجهاز'))
        : cloudRequest({ method: 'GET', url: '/sync/conflicts' }),
    resolveConflict: (data: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('sync:resolve-conflict', data) ||
          Promise.reject(new Error('خدمة المزامنة غير متاحة على هذا الجهاز'))
        : cloudRequest({ method: 'POST', url: '/sync/resolve-conflict', data }),
    getLogs: (params?: any) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('sync:logs', params) ||
          Promise.reject(new Error('خدمة المزامنة غير متاحة على هذا الجهاز'))
        : cloudRequest({ method: 'GET', url: '/sync/logs', params }),
    getRegisteredDevices: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('sync:get-devices') ||
          Promise.reject(new Error('خدمة المزامنة غير متاحة على هذا الجهاز'))
        : cloudRequest({ method: 'GET', url: '/sync/devices' }),
    getLatestVerifiedBackup: () =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('sync:latest-backup') ||
          Promise.reject(new Error('خدمة الكتالوج الموثق غير متاحة على هذا الجهاز'))
        : cloudRequest({ method: 'GET', url: '/sync/backups/latest' }),
    revokeDevice: (deviceId: string) =>
      mode === 'desktop'
        ? window.ipcRenderer?.invoke('sync:revoke-device', deviceId) ||
          Promise.reject(new Error('خدمة المزامنة غير متاحة على هذا الجهاز'))
        : cloudRequest({ method: 'POST', url: `/sync/devices/${deviceId}/revoke` }),
    getPairingInfo: () =>
      mode === 'desktop'
        ? Promise.reject(new Error('هذه الميزة متاحة في تطبيق الويب'))
        : cloudRequest({ method: 'GET', url: '/sync/pairing-info' })
  }
}

export default api
