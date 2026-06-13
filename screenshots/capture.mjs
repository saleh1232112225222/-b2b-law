import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { join } from 'path';

const BASE = 'http://localhost:5174';
const OUT = 'G:/w2w/screenshots';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // 1. Login page
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.screenshot({ path: join(OUT, '01-login.png'), fullPage: false });

  // 2. Login with admin/admin
  await page.fill('input[type="text"], input[name="username"], input:below(:text("اسم المستخدم"))', 'admin');
  await page.fill('input[type="password"]', 'admin');
  await page.click('button:has-text("دخول")');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: join(OUT, '02-dashboard.png'), fullPage: false });

  // 3. Try navigating to sessions
  await page.goto(BASE + '/sessions', { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.screenshot({ path: join(OUT, '03-sessions.png'), fullPage: false });

  // 4. Navigate to briefing dashboard if it exists
  await page.goto(BASE + '/briefing', { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.screenshot({ path: join(OUT, '04-briefing.png'), fullPage: false });

  // 5. Try opening session room with default params
  await page.goto(BASE + '/session-room/1', { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.screenshot({ path: join(OUT, '05-session-room.png'), fullPage: false });

  // 6. Take a screenshot of console output to show what errors exist
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const logs = [];
  page.on('console', msg => logs.push(msg.text()));
  await page.waitForTimeout(2000);
  writeFileSync(join(OUT, 'console-logs.txt'), logs.join('\n'), 'utf8');

  await browser.close();
  console.log('Screenshots captured in', OUT);
})().catch(e => { console.error(e); process.exit(1); });
