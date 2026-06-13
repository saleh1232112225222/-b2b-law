import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const OUT = 'G:/w2w/screenshots';
const DIST = 'G:/w2w/dist/web';
mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // === 1. Built app - login page ===
  await page.goto('file:///' + DIST.replace(/\\/g,'/') + '/index.html', { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(OUT, '01-index-page.png'), fullPage: false });
  console.log('1. Index page captured');

  // === 2. Git log ===
  const gitLog = execSync('git log --oneline -8', { cwd: 'G:/w2w', encoding: 'utf8' });
  await page.setContent(renderAscii(gitLog, 'Git Log - آخر 8 commits', '#89b4fa'));
  await page.screenshot({ path: join(OUT, '02-git-log.png'), fullPage: true });

  // === 3. Diff stats for smart questions commit ===
  const diffStat = execSync('git diff 3752fbd^..3752fbd --stat', { cwd: 'G:/w2w', encoding: 'utf8' });
  await page.setContent(renderAscii(diffStat, 'Commit 3752fbd - تغييرات الأسئلة الذكية', '#f9e2af'));
  await page.screenshot({ path: join(OUT, '03-commit-files.png'), fullPage: true });

  // === 4. Current commit (emptyOutDir fix) ===
  const currentDiff = execSync('git show --stat HEAD', { cwd: 'G:/w2w', encoding: 'utf8' }).split('\n').slice(0,10).join('\n');
  await page.setContent(renderAscii(currentDiff, 'Commit ac2273c - emptyOutDir: true', '#a6e3a1'));
  await page.screenshot({ path: join(OUT, '04-emptyOutDir-commit.png'), fullPage: true });

  // === 5. Key source: judgmentAnalyzer isInitial/isFinal ===
  const analyzer = readFileSync('G:/w2w/cloud-server/src/services/judgmentAnalyzer.service.ts', 'utf8');
  const aLines = analyzer.split('\n');
  const initLine = aLines.findIndex(l => l.includes('const isInitial') || l.includes('isInitial ='));
  const finalLine = aLines.findIndex(l => l.includes('const isFinal') || l.includes('isFinal ='));
  const relevant = aLines.slice(Math.max(0, Math.min(initLine, finalLine) - 2), Math.max(initLine, finalLine) + 5).join('\n');
  await page.setContent(renderCode(relevant, 'judgmentAnalyzer.service.ts - isInitial / isFinal'));
  await page.screenshot({ path: join(OUT, '05-isInitial-isFinal.png'), fullPage: true });

  // === 6. Smart questions in BriefingDashboard.vue ===
  const briefing = readFileSync('G:/w2w/src/renderer/src/views/BriefingDashboard.vue', 'utf8');
  const bLines = briefing.split('\n');
  const favorsLine = bLines.findIndex(l => l.includes('الحكم لصالح من'));
  if (favorsLine >= 0) {
    const section = bLines.slice(Math.max(0, favorsLine - 5), Math.min(bLines.length, favorsLine + 60)).join('\n');
    await page.setContent(renderCode(section, 'BriefingDashboard.vue - الأسئلة الذكية'));
    await page.screenshot({ path: join(OUT, '06-briefing-smart-questions.png'), fullPage: true });
    console.log('6. Briefing smart questions captured');
  }

  // === 7. Smart questions in SessionRoom.vue ===
  const sessionRoom = readFileSync('G:/w2w/src/renderer/src/views/SessionRoom.vue', 'utf8');
  const sLines = sessionRoom.split('\n');
  const sFavorsLine = sLines.findIndex(l => l.includes('الحكم لصالح من'));
  if (sFavorsLine >= 0) {
    const section = sLines.slice(Math.max(0, sFavorsLine - 5), Math.min(sLines.length, sFavorsLine + 60)).join('\n');
    await page.setContent(renderCode(section, 'SessionRoom.vue - الأسئلة الذكية'));
    await page.screenshot({ path: join(OUT, '07-sessionroom-smart-questions.png'), fullPage: true });
    console.log('7. SessionRoom smart questions captured');
  }

  // === 8. Scenario-specific confirm dialog ===
  const confirmLine = sLines.findIndex(l => l.includes('سيتولى النظام') || l.includes('تنفيذ الحكم'));
  if (confirmLine >= 0) {
    const section = sLines.slice(Math.max(0, confirmLine - 3), Math.min(sLines.length, confirmLine + 25)).join('\n');
    await page.setContent(renderCode(section, 'SessionRoom.vue - رسالة التأكيد حسب السيناريو'));
    await page.screenshot({ path: join(OUT, '08-confirm-dialog.png'), fullPage: true });
    console.log('8. Confirm dialog captured');
  }

  // === 9. submitOutcome payload fix ===
  const submitLine = sLines.findIndex(l => l.includes('is_for_client') || l.includes('is_for_client'));
  if (submitLine >= 0) {
    const section = sLines.slice(Math.max(0, submitLine - 2), Math.min(sLines.length, submitLine + 10)).join('\n');
    await page.setContent(renderCode(section, 'SessionRoom.vue - Payload مع is_for_client'));
    await page.screenshot({ path: join(OUT, '09-payload-fix.png'), fullPage: true });
    console.log('9. Payload fix captured');
  }

  // === 10. verify_migration.js tests summary ===
  const verify = readFileSync('G:/w2w/verify_migration.js', 'utf8');
  const descLines = verify.split('\n').filter(l => l.includes('describe(') || l.includes("it('") || l.includes('it(`') || l.includes('✅') || l.includes('❌'));
  await page.setContent(renderCode(descLines.join('\n'), 'verify_migration.js - هيكل الاختبارات'));
  await page.screenshot({ path: join(OUT, '10-tests-structure.png'), fullPage: true });
  console.log('10. Tests structure captured');

  // === 11. vite.config.ts final state ===
  const viteConfig = readFileSync('G:/w2w/vite.config.ts', 'utf8');
  await page.setContent(renderCode(viteConfig, 'vite.config.ts - الحالة النهائية'));
  await page.screenshot({ path: join(OUT, '11-vite-config.png'), fullPage: true });
  console.log('11. Vite config captured');

  console.log('\n✅ ALL screenshots saved to', OUT);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });

function renderAscii(text, title, color) {
  return `<!DOCTYPE html><html dir="ltr"><head><meta charset="utf-8"></head><body style="margin:0;background:#1e1e2e">
    <div style="padding:16px;font-family:monospace;">
      <h2 style="color:${color};margin:0 0 16px 0;font-size:16px;">${title}</h2>
      <pre style="color:#cdd6f4;font-size:13px;line-height:1.6;margin:0">${esc(text)}</pre>
    </div></body></html>`;
}

function renderCode(text, title) {
  return `<!DOCTYPE html><html dir="ltr"><head><meta charset="utf-8"></head><body style="margin:0;background:#1e1e2e">
    <div style="padding:16px;font-family:monospace;">
      <h2 style="color:#89b4fa;margin:0 0 12px 0;font-size:14px;">${title}</h2>
      <pre style="color:#cdd6f4;font-size:12px;line-height:1.5;margin:0;white-space:pre-wrap;word-break:break-all">${esc(text)}</pre>
    </div></body></html>`;
}

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
