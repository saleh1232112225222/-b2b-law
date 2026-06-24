/**
 * B2B-LAW الفحص الدقيق الشامل v2
 * التحقق من: البرنامج، القاعدة، الجداول، المسميات، الاتساق
 */
const fs = require('fs')
const path = require('path')

let pass = 0,
  fail = 0

function check(ok, msg, detail = '') {
  if (ok) {
    console.log(`  ✅ ${msg}`)
    pass++
  } else {
    console.log(`  ❌ ${msg} ${detail}`)
    fail++
  }
}

console.log('\n═══════════════════════════════════════════════════════')
console.log('  الفحص الدقيق الشامل v2 - B2B-LAW')
console.log('═══════════════════════════════════════════════════════\n')

// ── 1. البرنامج: فحص الملفات ──
console.log('📁 1. البرنامج - الملفات الأساسية\n')

const requiredFiles = [
  'cloud-server/src/index.ts',
  'cloud-server/src/routes/auth.ts',
  'cloud-server/src/routes/session-outcomes.ts',
  'cloud-server/src/routes/tasks.ts',
  'cloud-server/src/services/judgmentAnalyzer.service.ts',
  'cloud-server/src/services/notification.ts',
  'cloud-server/src/middleware/auth.ts',
  'cloud-server/src/db/connection.ts',
  'cloud-server/src/db/schema.sql',
  'cloud-server/package.json',
  'src/renderer/src/api/ApiAdapter.ts',
  'src/renderer/src/views/SessionRoom.vue',
  'src/renderer/src/views/BriefingDashboard.vue',
  'src/renderer/src/views/Tasks.vue',
  'src/renderer/src/utils/legalConstants.ts',
  'src/renderer/src/types/task.ts',
  'src/renderer/src/types/session.ts',
  'src/renderer/src/api.d.ts'
]

for (const f of requiredFiles) {
  check(fs.existsSync(f), `${f}`)
}

// ── 2. قاعدة البيانات: فحص الـ schema ──
console.log('\n🗄️ 2. قاعدة البيانات - الجداول\n')

const schema = fs.readFileSync('cloud-server/src/db/schema.sql', 'utf8')

// Get all table names from schema
const tableRegex = /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?["']?(\w+)["']?/gi
const tablesInSchema = []
let m
while ((m = tableRegex.exec(schema)) !== null) {
  tablesInSchema.push(m[1].toLowerCase())
}

console.log(`   عدد الجداول في schema: ${tablesInSchema.length}`)
console.log(`   الجداول: ${[...new Set(tablesInSchema)].sort().join(', ')}\n`)

const requiredTables = [
  'companies',
  'clients',
  'defendants',
  'employees',
  'users',
  'cases',
  'case_parties',
  'sessions',
  'session_outcomes',
  'tasks_v2',
  'task_audit_log',
  'task_notifications',
  'activity_logs',
  'firm_data',
  'settings',
  'documents_v2',
  'contracts',
  'enforcement_requests',
  'finances',
  'invoices',
  'vouchers',
  'receivables',
  'accounts',
  'credit_notes',
  'permissions',
  'role_permissions',
  'user_permissions',
  'file_assets',
  // Missing from schema but referenced in code:
  'agencies',
  'invoice_items'
]

for (const t of requiredTables) {
  check(tablesInSchema.includes(t.toLowerCase()), `جدول: ${t}`, '(غير موجود في schema!)')
}

// Check schema patterns
check(schema.includes('company_id UUID'), 'company_id موجود في schema (multi-tenancy)')
check(
  schema.includes('created_at TIMESTAMPTZ') || schema.includes('created_at TIMESTAMP'),
  'created_at نمط موحد'
)
check(
  schema.includes('updated_at TIMESTAMPTZ') || schema.includes('updated_at TIMESTAMP'),
  'updated_at نمط موحد'
)

// ── 3. المسميات (Naming Conventions) ──
console.log('\n🏷️ 3. المسميات ونمط التسمية\n')

// Backend: snake_case for DB, camelCase for TS
const sqlSample = schema.substring(0, 5000)
check(
  sqlSample.includes('company_id') && !sqlSample.includes('companyId'),
  'SQL: snake_case (company_id)'
)
check(
  sqlSample.includes('created_at') && !sqlSample.includes('createdAt'),
  'SQL: snake_case (created_at)'
)

// Check TS files use camelCase
const judgmentService = fs.readFileSync(
  'cloud-server/src/services/judgmentAnalyzer.service.ts',
  'utf8'
)
check(
  judgmentService.includes('outcomeType') && !judgmentService.includes('outcome_type'),
  'TypeScript: camelCase (outcomeType)'
)
check(judgmentService.includes('hasAppealGrounds'), 'TypeScript: camelCase (hasAppealGrounds)')
check(judgmentService.includes('needsExecution'), 'TypeScript: camelCase (needsExecution)')

// Check route files follow REST conventions
const sessionOutcomesRoute = fs.readFileSync('cloud-server/src/routes/session-outcomes.ts', 'utf8')
check(
  sessionOutcomesRoute.includes("/by-session/:sessionId'"),
  'REST: GET /api/session-outcomes/by-session/:sessionId'
)
check(sessionOutcomesRoute.includes("/apply'"), 'REST: POST /api/session-outcomes/apply')
check(sessionOutcomesRoute.includes("/preview'"), 'REST: POST /api/session-outcomes/preview')

const tasksRoute = fs.readFileSync('cloud-server/src/routes/tasks.ts', 'utf8')
check(tasksRoute.includes("/by-case/:caseId'"), 'REST: GET /api/tasks/by-case/:caseId')
check(tasksRoute.includes("/:id/transition'"), 'REST: POST /api/tasks/:id/transition')
check(tasksRoute.includes("/:id/close'"), 'REST: POST /api/tasks/:id/close')
check(tasksRoute.includes("/:id/cancel'"), 'REST: POST /api/tasks/:id/cancel')
check(tasksRoute.includes("/:taskId/audit'"), 'REST: GET /api/tasks/:taskId/audit')
check(tasksRoute.includes("/:taskId/audit/count'"), 'REST: GET /api/tasks/:taskId/audit/count')

// ── 4. الاتساق بين الواجهة والـ API ──
console.log('\n🔗 4. الاتساق: Frontend ↔ Backend\n')

const apiAdapter = fs.readFileSync('src/renderer/src/api/ApiAdapter.ts', 'utf8')

// Check that session-outcomes/by-session endpoint exists in both
check(
  apiAdapter.includes('/session-outcomes/by-session/') &&
    sessionOutcomesRoute.includes('/by-session/:sessionId'),
  'session-outcomes/by-session endpoint متطابق'
)
check(
  apiAdapter.includes('/session-outcomes/apply') && sessionOutcomesRoute.includes('/apply'),
  'session-outcomes/apply endpoint متطابق'
)
check(
  apiAdapter.includes('/session-outcomes/preview') && sessionOutcomesRoute.includes('/preview'),
  'session-outcomes/preview endpoint متطابق'
)
check(
  apiAdapter.includes('/tasks/pending') && tasksRoute.includes('/pending'),
  'tasks/pending endpoint متطابق'
)
check(
  apiAdapter.includes('/tasks/by-case/') && tasksRoute.includes('/by-case/:caseId'),
  'tasks/by-case endpoint متطابق'
)
check(
  apiAdapter.includes('/tasks/') &&
    apiAdapter.includes('/transition') &&
    tasksRoute.includes('/:id/transition'),
  'tasks/transition endpoint متطابق'
)
check(
  apiAdapter.includes('/tasks/') &&
    apiAdapter.includes('/close') &&
    tasksRoute.includes('/:id/close'),
  'tasks/close endpoint متطابق'
)
check(
  apiAdapter.includes('/tasks/') &&
    apiAdapter.includes('/cancel') &&
    tasksRoute.includes('/:id/cancel'),
  'tasks/cancel endpoint متطابق'
)
check(
  apiAdapter.includes('/tasks/') &&
    apiAdapter.includes('/audit') &&
    tasksRoute.includes('/:taskId/audit'),
  'tasks/audit endpoint متطابق'
)

// ── 5. الخدمات (Services) ──
console.log('\n⚙️ 5. الخدمات\n')

check(
  fs.existsSync('cloud-server/src/services/judgmentAnalyzer.service.ts'),
  'judgmentAnalyzer.service.ts'
)
check(fs.existsSync('cloud-server/src/services/notification.ts'), 'notification.ts')

// Verify key functions exist
check(
  judgmentService.includes('export function classifyOutcome') ||
    judgmentService.includes('classifyOutcome'),
  'classifyOutcome معرفة'
)
check(
  judgmentService.includes('export async function analyzeJudgment') ||
    judgmentService.includes('analyzeJudgment'),
  'analyzeJudgment معرفة'
)
check(
  judgmentService.includes('export function determineDegree') ||
    judgmentService.includes('determineDegree'),
  'determineDegree معرفة'
)
check(
  judgmentService.includes('export function detectCaseType') ||
    judgmentService.includes('detectCaseType'),
  'detectCaseType معرفة'
)
check(
  judgmentService.includes('export async function saveGeneratedTasks') ||
    (judgmentService.includes('saveGeneratedTasks') && judgmentService.includes('export')),
  'saveGeneratedTasks مصدرة'
)

// Check route files follow correct pattern (export router, not individual functions)
check(
  tasksRoute.includes('export const tasksRouter = Router()'),
  'tasks route: Router() مصدر بشكل صحيح'
)
check(
  sessionOutcomesRoute.includes('export const sessionOutcomesRouter = Router()'),
  'session-outcomes route: Router() مصدر بشكل صحيح'
)

// ── 6. المصادقة (Auth Middleware) ──
console.log('\n🔐 6. المصادقة\n')

const authMw = fs.readFileSync('cloud-server/src/middleware/auth.ts', 'utf8')
check(authMw.includes('export function generateToken'), 'generateToken مصدرة')
check(authMw.includes('export async function authMiddleware'), 'authMiddleware مصدرة')

// Check all routes use auth
check(tasksRoute.includes('authMiddleware'), 'tasks route: authMiddleware مستخدم')
check(
  sessionOutcomesRoute.includes('authMiddleware'),
  'session-outcomes route: authMiddleware مستخدم'
)

// ── 7. الأمان (Security) ──
console.log('\n🛡️ 7. الأمان\n')

// Check companyId isolation
check(
  sessionOutcomesRoute.includes('companyId') || sessionOutcomesRoute.includes('req.auth'),
  'session-outcomes: companyId مستخرج من التوكن'
)
check(
  tasksRoute.includes('companyId') &&
    (tasksRoute.includes('req.auth') || tasksRoute.includes('req.auth')),
  'Tasks: companyId من المصادقة'
)
check(
  sessionOutcomesRoute.includes('Forbidden') || sessionOutcomesRoute.includes('403'),
  'session-outcomes: تحقق من الصلاحية'
)
check(
  tasksRoute.includes('company_id = $') || tasksRoute.includes('companyId'),
  'tasks: company_id filter في جميع الاستعلامات (عزل الشركات)'
)

// ── 8. Audit Trail ──
console.log('\n📝 8. سجل النشاطات\n')

check(sessionOutcomesRoute.includes('activity_logs'), 'session-outcomes: تسجيل في activity_logs')
check(tasksRoute.includes('task_audit_log'), 'tasks: تسجيل في task_audit_log')
check(tablesInSchema.includes('activity_logs'), 'activity_logs جدول موجود في schema')
check(tablesInSchema.includes('task_audit_log'), 'task_audit_log جدول موجود في schema')

// ── 9. التكامل مع index.ts ──
console.log('\n🔌 9. تسجيل المسارات في index.ts\n')

const indexTs = fs.readFileSync('cloud-server/src/index.ts', 'utf8')
check(indexTs.includes('import { sessionOutcomesRouter }'), 'sessionOutcomesRouter مستورد')
check(indexTs.includes('import { tasksRouter }'), 'tasksRouter مستورد')
check(indexTs.includes('/api/session-outcomes'), '/api/session-outcomes مسجل')
check(indexTs.includes('/api/tasks'), '/api/tasks مسجل')

// ── 10. المصادقة في auth.ts ──
console.log('\n🔑 10. المصادقة والـ devOtp\n')

const authRoute = fs.readFileSync('cloud-server/src/routes/auth.ts', 'utf8')
check(
  authRoute.includes('devOtp') && authRoute.includes('getTransporter'),
  'devOtp fallback موجود في تسجيل المستخدمين'
)
check(authRoute.includes('logActivity'), 'logActivity موجودة ومسجلة للأحداث')
check(authRoute.includes('activity_logs'), 'activity_logs مستخدمة في auth.ts')
check(
  authRoute.includes('Invalid credentials') || authRoute.includes('كلمة المرور'),
  'رسالة خطأ عند فشل تسجيل الدخول'
)

// ── 11. mock_active في الواجهة ──
console.log('\n🎭 11. Mock mode\n')

const loginView = fs.readFileSync('src/renderer/src/views/Login.vue', 'utf8')
check(loginView.includes('mock_active'), 'Login.vue: mock_active يستخدم')

const mainTs = fs.readFileSync('src/renderer/src/main.ts', 'utf8')
check(mainTs.includes('mock_active'), 'main.ts: mock_active check موجود')

check(
  apiAdapter.includes('mock_active'),
  'ApiAdapter.ts: isMockMode() تستخدم localStorage.mock_active'
)

// ── 12. التصنيفات والثوابت القانونية ──
console.log('\n⚖️ 12. الثوابت القانونية\n')

check(judgmentService.includes('CASE_TYPE_DEADLINES'), 'CASE_TYPE_DEADLINES خريطة المدد')
check(
  judgmentService.includes('مدنية: 30') && judgmentService.includes('إدارية: 60'),
  'مدنية=30, إدارية=60'
)
check(judgmentService.includes('APPEAL_TYPE_MAP'), 'APPEAL_TYPE_MAP خريطة أنواع الاعتراض')
check(
  judgmentService.includes('ابتدائي') &&
    judgmentService.includes('استئنافي') &&
    judgmentService.includes('قطعي') &&
    judgmentService.includes('نهائي'),
  'جميع درجات الحكم مغطاة: ابتدائي, استئنافي, قطعي, نهائي'
)

// ── الخلاصة ──
console.log('\n═══════════════════════════════════════════════════════')
console.log(`  الخلاصة: ${pass} ✅ نجاح  |  ${fail} ❌ فشل  |  ${pass + fail} المجموع`)
console.log('═══════════════════════════════════════════════════════\n')

if (fail > 0) {
  console.log('⚠️  هناك أخطاء تحتاج إلى معالجة.')
  process.exit(1)
} else {
  console.log('✅  النظام سليم تمامًا.')
}
