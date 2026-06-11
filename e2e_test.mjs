import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false, slowMo: 300 }); // visible browser
const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

const step = async (num, desc) => {
  console.log(`\n=== ${num}. ${desc} ===`);
  await p.screenshot({ path: `e2e-${String(num).padStart(2,'0')}-${desc.slice(0,30)}.png`, fullPage: true });
};

const log = console.log;

// ============================================================
// 1. OPEN LIVE SITE
// ============================================================
log('فتح الموقع المباشر على الويب...');
await p.goto('https://b2b-law.netlify.app', { waitUntil: 'networkidle', timeout: 30000 });
await p.waitForTimeout(2000);
await step(1, 'الموقع المباشر - صفحة الدخول');

log('الرابط: ' + p.url());

// ============================================================
// 2. CHECK REGISTRATION PAGE
// ============================================================
log('التوجه لصفحة التسجيل...');
await p.goto('https://b2b-law.netlify.app/#/register', { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
await p.waitForTimeout(3000);
await step(2, 'صفحة التسجيل - إنشاء حساب جديد');
log('رابط التسجيل: ' + p.url());

// Check registration form
const registerForm = await p.locator('input[placeholder*="اسم مكتب"]').isVisible({ timeout: 3000 }).catch(() => false);
log('نموذج التسجيل ظاهر: ' + registerForm);

// ============================================================
// 3. GO BACK TO LOGIN
// ============================================================
log('العودة لصفحة الدخول...');
await p.goto('https://b2b-law.netlify.app/#/login', { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
await p.waitForTimeout(2000);
await step(3, 'صفحة الدخول - تسجيل الدخول');

// ============================================================
// 4. LOGIN WITH ADMIN/ADMIN
// ============================================================
log('تسجيل الدخول بحساب admin...');
await p.fill('#username-input', 'admin');
await p.evaluate(() => document.getElementById('username-input')?.dispatchEvent(new Event('blur')));
await p.fill('#password-input', 'admin');
await p.evaluate(() => document.getElementById('password-input')?.dispatchEvent(new Event('blur')));
await p.waitForTimeout(500);
await p.locator('#login-submit-btn').click();
await p.waitForTimeout(8000);
await step(4, 'بعد تسجيل الدخول - لوحة التحكم');
log('الرابط بعد الدخول: ' + p.url());

// ============================================================
// 5. VERIFY ALL SIDEBAR MENUS
// ============================================================
log('التحقق من جميع القوائم الجانبية...');
const sidebarItems = await p.evaluate(() => {
  const items = document.querySelectorAll('.v-list-item-title, .v-list-group__header');
  return Array.from(items).map(el => el.textContent?.trim()).filter(Boolean);
});
log('عدد القوائم: ' + sidebarItems.length);
log('القوائم: ' + JSON.stringify(sidebarItems, null, 2));

const required = [
  'لوحة التحكم', 'القضايا', 'الجلسات', 'المهام', 'المذكرات واللوائح',
  'التنفيذ والتحصيل', 'الموكلين', 'الخصوم', 'المستندات',
  'المالية', 'العقود', 'شؤون الموظفين',
  'إدارة المستخدمين', 'الإعدادات', 'مركز التقارير', 'خزانة المكتب', 'سجل النشاط'
];
const found = required.filter(r => sidebarItems.some(s => s.includes(r)));
const missing = required.filter(r => !sidebarItems.some(s => s.includes(r)));
log('الموجود: ' + found.length + '/' + required.length);
if (missing.length > 0) log('المفقود: ' + JSON.stringify(missing));

// ============================================================
// 6. VERIFY ALL PAGES ACCESSIBLE
// ============================================================
const pages = [
  { name: 'الموكلين', path: '/clients' },
  { name: 'القضايا', path: '/cases' },
  { name: 'الجلسات', path: '/sessions' },
  { name: 'المهام', path: '/tasks' },
  { name: 'المذكرات واللوائح', path: '/memoranda' },
  { name: 'التنفيذ والتحصيل', path: '/enforcement' },
  { name: 'الخصوم', path: '/defendants' },
  { name: 'المستندات', path: '/documents' },
  { name: 'المالية', path: '/finance' },
  { name: 'العقود', path: '/contracts' },
  { name: 'شؤون الموظفين', path: '/employees' },
  { name: 'إدارة المستخدمين', path: '/users' },
  { name: 'الإعدادات', path: '/settings' },
  { name: 'مركز التقارير', path: '/reports' },
  { name: 'خزانة المكتب', path: '/vault' },
  { name: 'سجل النشاط', path: '/activity' },
];

let allPagesOk = true;
for (const page of pages) {
  const url = 'https://b2b-law.netlify.app/#' + page.path;
  await p.goto(url, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(1500);
  const currentUrl = p.url();
  const ok = !currentUrl.includes('forbidden') && !currentUrl.includes('login');
  log(page.name + ' (' + page.path + '): ' + (ok ? 'OK' : 'FAIL - ' + currentUrl));
  if (!ok) allPagesOk = false;
}
await step(5, 'التنقل بين جميع الصفحات');

// ============================================================  
// 7. CREATE A CLIENT
// ============================================================
log('\nمحاولة إنشاء موكل جديد...');
await p.goto('https://b2b-law.netlify.app/#/clients', { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
await p.waitForTimeout(3000);

const addClient = p.locator('button:has-text("إضافة"), button:has-text("موكل جديد"), button:has-text("إضافة موكل"), .v-btn .v-icon--start').first();
const addClientVisible = await addClient.isVisible({ timeout: 3000 }).catch(() => false);
log('زر إضافة موكل: ' + addClientVisible);

if (addClientVisible) {
  await addClient.click();
  await p.waitForTimeout(2000);
  await step(6, 'إنشاء موكل جديد');
}

// ============================================================
// 8. CREATE A CASE
// ============================================================
log('\nمحاولة إنشاء قضية جديدة...');
await p.goto('https://b2b-law.netlify.app/#/cases', { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
await p.waitForTimeout(3000);

const addCase = p.locator('button:has-text("إضافة"), button:has-text("قضية جديدة"), button:has-text("إضافة قضية")').first();
const addCaseVisible = await addCase.isVisible({ timeout: 3000 }).catch(() => false);
log('زر إضافة قضية: ' + addCaseVisible);

if (addCaseVisible) {
  await addCase.click();
  await p.waitForTimeout(2000);
  await step(7, 'إنشاء قضية جديدة');
}

// ============================================================
// 9. CREATE A SESSION  
// ============================================================
log('\nمحاولة إنشاء جلسة...');
await p.goto('https://b2b-law.netlify.app/#/sessions', { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
await p.waitForTimeout(3000);

const addSession = p.locator('button:has-text("إضافة"), button:has-text("جلسة جديدة"), button:has-text("إضافة جلسة")').first();
const addSessionVisible = await addSession.isVisible({ timeout: 3000 }).catch(() => false);
log('زر إضافة جلسة: ' + addSessionVisible);

if (addSessionVisible) {
  await addSession.click();
  await p.waitForTimeout(2000);
  await step(8, 'إنشاء جلسة جديدة');
}

// ============================================================
// 10. FINAL SUMMARY
// ============================================================
log('\n========== النتيجة النهائية ==========');
log('جميع القوائم ('+found.length+'/'+required.length+'): ' + (missing.length === 0 ? '✅' : '❌'));
log('جميع الصفحات: ' + (allPagesOk ? '✅' : '❌'));
log('إنشاء موكل: ' + (addClientVisible ? '✅ الزر ظاهر' : '⚠ لم يظهر'));
log('إنشاء قضية: ' + (addCaseVisible ? '✅ الزر ظاهر' : '⚠ لم يظهر'));
log('إنشاء جلسة: ' + (addSessionVisible ? '✅ الزر ظاهر' : '⚠ لم يظهر'));
log('====================================');

await step(9, 'الشاشة النهائية');

await p.waitForTimeout(5000);
await browser.close();
