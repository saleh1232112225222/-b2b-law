import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

const errors = [];
p.on('pageerror', err => errors.push('[PAGE_ERR] ' + err.message.substring(0, 200)));
p.on('console', msg => { if (msg.type() === 'error') errors.push('[CONSOLE] ' + msg.text().substring(0, 200)); });

const log = console.log;

log('=== 1. LOAD LOGIN PAGE ===');
await p.goto('https://b2b-law.netlify.app', { waitUntil: 'networkidle', timeout: 30000 });
await p.waitForTimeout(3000);
log('URL: ' + p.url());

// Login
log('\n=== 2. LOGIN ===');
await p.fill('#username-input', 'admin');
await p.evaluate(() => document.getElementById('username-input')?.dispatchEvent(new Event('blur')));
await p.fill('#password-input', 'admin');
await p.evaluate(() => document.getElementById('password-input')?.dispatchEvent(new Event('blur')));
await p.waitForTimeout(500);
await p.locator('#login-submit-btn').click();
await p.waitForTimeout(8000);
log('URL after login: ' + p.url());

// Check all sidebar menus
log('\n=== 3. CHECK SIDEBAR MENUS ===');
const sidebarText = await p.evaluate(() => {
  const items = document.querySelectorAll('.v-list-item-title, .v-list-group__header');
  return Array.from(items).map(el => el.textContent?.trim()).filter(Boolean);
});
log('Sidebar items found: ' + JSON.stringify(sidebarText));

const requiredMenus = [
  'القضايا', 'الجلسات', 'المهام', 'المذكرات واللوائح',
  'التنفيذ والتحصيل', 'الموكلين', 'الخصوم', 'المستندات',
  'المالية', 'العقود', 'شؤون الموظفين',
  'إدارة المستخدمين', 'الإعدادات', 'مركز التقارير', 'خزانة المكتب', 'سجل النشاط'
];
const missingMenus = requiredMenus.filter(m => !sidebarText.some(s => s && s.includes(m)));
const foundMenus = requiredMenus.filter(m => sidebarText.some(s => s && s.includes(m)));
log('Found menus (' + foundMenus.length + '/' + requiredMenus.length + '): ' + JSON.stringify(foundMenus));
if (missingMenus.length > 0) log('MISSING menus: ' + JSON.stringify(missingMenus));

await p.screenshot({ path: 'test-01-sidebar.png', fullPage: true });

// Try navigating to pages
log('\n=== 4. NAVIGATE TO ALL PAGES ===');
const pages = [
  '/clients', '/cases', '/sessions', '/tasks', '/memoranda',
  '/enforcement', '/defendants', '/documents', '/finance',
  '/contracts', '/employees', '/users', '/settings', '/reports',
  '/vault', '/activity'
];
for (const pagePath of pages) {
  const url = 'https://b2b-law.netlify.app/#' + pagePath;
  await p.goto(url, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(2000);
  const currentUrl = p.url();
  const isForbidden = currentUrl.includes('forbidden');
  const isLogin = currentUrl.includes('login');
  log(pagePath + ' -> ' + (isForbidden ? 'FORBIDDEN' : isLogin ? 'LOGIN' : 'OK'));
  await p.screenshot({ path: 'test-page-' + pagePath.replace(/\//g, '_') + '.png', fullPage: true }).catch(() => {});
}

log('\n=== 5. SUMMARY ===');
log('Menus found: ' + foundMenus.length + '/' + requiredMenus.length);
if (missingMenus.length > 0) log('Missing: ' + JSON.stringify(missingMenus));
log('Errors: ' + errors.length);
errors.forEach(e => log('  - ' + e));

await browser.close();
