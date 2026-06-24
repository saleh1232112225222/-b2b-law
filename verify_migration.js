/**
 * B2B-LAW Smart Judgment Analyzer - Verification Script
 * Tests the 3 scenarios from the requirements
 */
const {
  analyzeJudgment,
  classifyOutcome,
  determineDegree
} = require('./cloud-server/dist/services/judgmentAnalyzer.service.js')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`)
    failed++
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed')
}

console.log('\n══════════════════════════════════════════════')
console.log('  B2B-LAW Smart Judgment Analyzer - اختبار')
console.log('══════════════════════════════════════════════\n')

// ──── Scenario 1 ────
console.log('📋 السيناريو 1: حكم ابتدائي لصالح الموكل بمبلغ 100,000 ريال')
console.log('   محكمة ابتدائية مدنية - نتيجة: صدور حكم ابتدائي\n')

const s1 = analyzeJudgment({
  result: 'صدور حكم ابتدائي',
  judgmentType: 'ابتدائي',
  isForClient: true,
  needsExecution: true,
  caseType: 'مدنية',
  judgmentDate: '2026-06-12',
  serviceDate: '2026-06-12'
})

test('نوع النتيجة = حكم', () => assert(s1.outcomeType === 'حكم'))
test('درجة الحكم = ابتدائي', () => assert(s1.degree === 'ابتدائي'))
test('لصالح الموكل', () => assert(s1.favors === 'موكل'))
test('يحتاج تنفيذ', () => assert(s1.needsExecution === true))
test('ليس لديه أسباب اعتراض', () =>
  assert(s1.hasAppealGrounds === false || s1.hasAppealGrounds === undefined))
test('تم إنشاء مهام', () =>
  assert(s1.tasks.length >= 3, `Expected >=3 tasks, got ${s1.tasks.length}`))

const s1Titles = s1.tasks.map((t) => t.title)
test('مهمة: تنفيذ الحكم', () =>
  assert(
    s1Titles.some((t) => t.includes('تنفيذ الحكم')),
    JSON.stringify(s1Titles)
  ))
test('مهمة: تحديد آلية التنفيذ', () =>
  assert(
    s1Titles.some((t) => t.includes('تحديد آلية')),
    JSON.stringify(s1Titles)
  ))
test('مهمة: تبليغ العميل بالنتيجة', () =>
  assert(
    s1Titles.some((t) => t.includes('تبليغ العميل')),
    JSON.stringify(s1Titles)
  ))
test('مهمة: متابعة إجراءات التنفيذ', () =>
  assert(
    s1Titles.some((t) => t.includes('متابعة')),
    JSON.stringify(s1Titles)
  ))
test('مدة الاعتراض غير موجودة (لصالح الموكل)', () => assert(s1.deadlines === undefined))

// ──── Scenario 2 ────
console.log('\n📋 السيناريو 2: حكم نهائي ضد الموكل في محكمة استئناف تجارية')
console.log('   نتيجة: صدور حكم قطعي - يوجد سبب للطعن بالنقض\n')

const s2 = analyzeJudgment({
  result: 'صدور حكم قطعي',
  judgmentType: 'قطعي',
  isForClient: false,
  hasAppealGrounds: true,
  needsExecution: false,
  caseType: 'تجارية',
  judgmentDate: '2026-06-12',
  serviceDate: '2026-06-12'
})

test('نوع النتيجة = حكم', () => assert(s2.outcomeType === 'حكم'))
test('درجة الحكم = قطعي', () => assert(s2.degree === 'قطعي'))
test('ضد الموكل (لصالح الخصم)', () => assert(s2.favors === 'خصم'))
test('لديه أسباب اعتراض', () => assert(s2.hasAppealGrounds === true))
test('نوع الاعتراض = نقض', () => assert(s2.appealType === 'نقض'))
test('تم إنشاء مهام', () =>
  assert(s2.tasks.length >= 2, `Expected >=2 tasks, got ${s2.tasks.length}`))

const s2Titles = s2.tasks.map((t) => t.title)
test('مهمة: تقديم طلب النقض أو ما يشابهها', () =>
  assert(
    s2Titles.some((t) => t.includes('تقديم') || t.includes('نقض')),
    JSON.stringify(s2Titles)
  ))
test('مهمة: دراسة أسباب الاعتراض', () =>
  assert(
    s2Titles.some((t) => t.includes('دراسة')),
    JSON.stringify(s2Titles)
  ))
test('مهمة: تبليغ العميل بالنتيجة والمخاطر', () =>
  assert(
    s2Titles.some((t) => t.includes('المخاطر')),
    JSON.stringify(s2Titles)
  ))
test('مدة الاعتراض = 30 يوم (تجارية)', () =>
  assert(
    s2.deadlines?.appealDeadlineDays === 30,
    `Expected 30, got ${s2.deadlines?.appealDeadlineDays}`
  ))
test('تاريخ نهاية الاعتراض محسوب', () => assert(s2.deadlines?.appealEndDate != null))

// ──── Scenario 3 ────
console.log('\n📋 السيناريو 3: حكم ببراءة الموكل في محكمة جزائية')
console.log('   نتيجة: براءة الموكل - لا يحتاج تنفيذ\n')

const s3 = analyzeJudgment({
  result: 'براءة الموكل',
  isForClient: true,
  needsExecution: false,
  hasAppealGrounds: false,
  judgmentType: 'ابتدائي',
  caseType: 'جنائية',
  judgmentDate: '2026-06-12',
  serviceDate: '2026-06-12'
})

test('نوع النتيجة = حكم (افتراضي)', () => assert(s3.outcomeType === 'حكم'))
test('لصالح الموكل', () => assert(s3.favors === 'موكل'))
test('لا يحتاج تنفيذ', () => assert(s3.needsExecution === false))
test('ليس لديه أسباب اعتراض', () => assert(s3.hasAppealGrounds === false))

const s3Titles = s3.tasks.map((t) => t.title)
test('مهمة: تبليغ العميل بالنتيجة', () =>
  assert(
    s3Titles.some((t) => t.includes('تبليغ العميل')),
    JSON.stringify(s3Titles)
  ))
test('مهمة: أرشفة القضية', () =>
  assert(
    s3Titles.some((t) => t.includes('أرشفة')),
    JSON.stringify(s3Titles)
  ))

// ──── Additional Tests ────
console.log('\n📋 اختبارات إضافية: المدد القانونية\n')

test('مدنية = 30 يوم', () =>
  assert(
    analyzeJudgment({
      result: 'صدور حكم',
      caseType: 'مدنية',
      isForClient: false,
      hasAppealGrounds: true
    }).deadlines?.appealDeadlineDays === 30
  ))
test('تجارية = 30 يوم', () =>
  assert(
    analyzeJudgment({
      result: 'صدور حكم',
      caseType: 'تجارية',
      isForClient: false,
      hasAppealGrounds: true
    }).deadlines?.appealDeadlineDays === 30
  ))
test('جنائية = 30 يوم', () =>
  assert(
    analyzeJudgment({
      result: 'صدور حكم',
      caseType: 'جنائية',
      isForClient: false,
      hasAppealGrounds: true
    }).deadlines?.appealDeadlineDays === 30
  ))
test('عمالية = 30 يوم', () =>
  assert(
    analyzeJudgment({
      result: 'صدور حكم',
      caseType: 'عمالية',
      isForClient: false,
      hasAppealGrounds: true
    }).deadlines?.appealDeadlineDays === 30
  ))
test('إدارية = 60 يوم', () =>
  assert(
    analyzeJudgment({
      result: 'صدور حكم',
      caseType: 'إدارية',
      isForClient: false,
      hasAppealGrounds: true
    }).deadlines?.appealDeadlineDays === 60
  ))

console.log('\n📋 اختبارات: أنواع النتائج\n')

test('تصنيف: حكم', () => assert(classifyOutcome('صدور حكم ابتدائي') === 'حكم'))
test('تصنيف: حجز للحكم', () => assert(classifyOutcome('حجز القضية للحكم') === 'حجز للحكم'))
test('تصنيف: تأجيل', () => assert(classifyOutcome('تأجيل الجلسة لموعد آخر') === 'تأجيل'))
test('تصنيف: تبليغ', () => assert(classifyOutcome('تبليغ / إجراء إداري') === 'تبليغ / إجراء إداري'))
test('تصنيف: أخرى', () => assert(classifyOutcome('أخرى') === 'أخرى'))

console.log('\n📋 اختبارات: مهام حجز للحكم\n')
const h1 = analyzeJudgment({
  result: 'حجز القضية للحكم',
  judgmentType: 'ابتدائي',
  isForClient: true,
  needsExecution: false,
  hasAppealGrounds: false
})
const h1Titles = h1.tasks.map((t) => t.title)
test('مهمة: متابعة تاريخ النطق بالحكم', () =>
  assert(
    h1Titles.some((t) => t.includes('النطق بالحكم')),
    JSON.stringify(h1Titles)
  ))

console.log('\n📋 اختبارات: مهام تأجيل\n')
const a1 = analyzeJudgment({
  result: 'تأجيل الجلسة لموعد آخر',
  judgmentType: 'ابتدائي',
  isForClient: true,
  needsExecution: false,
  hasAppealGrounds: false
})
const a1Titles = a1.tasks.map((t) => t.title)
test('مهمة: متابعة تاريخ الجلسة الجديدة', () =>
  assert(
    a1Titles.some((t) => t.includes('الجلسة الجديدة')),
    JSON.stringify(a1Titles)
  ))

// ──── Files Check ────
console.log('\n📋 التحقق من ملفات النظام\n')
const fs = require('fs')
const path = require('path')

const filesToCheck = [
  'cloud-server/src/services/judgmentAnalyzer.service.ts',
  'cloud-server/src/routes/session-outcomes.ts',
  'cloud-server/src/routes/tasks.ts',
  'cloud-server/src/index.ts',
  'src/renderer/src/api/ApiAdapter.ts',
  'src/renderer/src/views/SessionRoom.vue',
  'src/renderer/src/views/BriefingDashboard.vue'
]

for (const f of filesToCheck) {
  const exists = fs.existsSync(path.resolve(f))
  test(`ملف موجود: ${f}`, () => assert(exists, `${f} not found`))
}

// ──── DB Schema Check ────
console.log('\n📋 التحقق من جداول قاعدة البيانات')
const schema = fs.readFileSync(path.resolve('cloud-server/src/db/schema.sql'), 'utf8')
const tablesToCheck = [
  'session_outcomes',
  'tasks_v2',
  'task_audit_log',
  'task_notifications',
  'activity_logs'
]
for (const t of tablesToCheck) {
  test(`جدول موجود: ${t}`, () =>
    assert(schema.includes(`CREATE TABLE ${t}`), `Table ${t} not found in schema`))
}

// ──── Summary ────
console.log('\n══════════════════════════════════════════════')
console.log(`  النتيجة: ${passed} ✅ نجاح  |  ${failed} ❌ فشل  |  ${passed + failed} المجموع`)
console.log('══════════════════════════════════════════════\n')

process.exit(failed > 0 ? 1 : 0)
