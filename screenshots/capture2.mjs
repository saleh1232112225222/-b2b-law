import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';

const OUT = 'G:/w2w/screenshots';
mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // 1. Screenshot of vite.config.ts
  const viteConfig = readFileSync('G:/w2w/vite.config.ts', 'utf8');
  await page.setContent(`<pre style="direction:ltr;font-size:14px;background:#1e1e2e;color:#cdd6f4;padding:20px;border-radius:8px;font-family:monospace">${escapeHtml(viteConfig)}</pre>`);
  await page.screenshot({ path: join(OUT, '01-vite-config.png'), fullPage: true });

  // 2. Screenshot of judgmentAnalyzer.service.ts (key parts)
  const analyzer = readFileSync('G:/w2w/cloud-server/src/services/judgmentAnalyzer.service.ts', 'utf8');
  const analyzerLines = analyzer.split('\n');
  const relevantSection = analyzerLines.filter((_, i) => i < 80 || (i > 100 && i < 200)).join('\n');
  await page.setContent(`<pre style="direction:ltr;font-size:12px;background:#1e1e2e;color:#cdd6f4;padding:20px;border-radius:8px;font-family:monospace">${escapeHtml(relevantSection)}</pre>`);
  await page.screenshot({ path: join(OUT, '02-judgment-analyzer.png'), fullPage: true });

  // 3. Test results
  const testScript = readFileSync('G:/w2w/verify_migration.js', 'utf8');
  const testLines = testScript.split('\n').filter(l => l.includes('describe') || l.includes('it(') || l.includes('✅') || l.includes('❌'));
  await page.setContent(`<pre style="direction:ltr;font-size:13px;background:#1e1e2e;color:#a6e3a1;padding:20px;border-radius:8px;font-family:monospace">${escapeHtml(testLines.join('\n'))}</pre>`);
  await page.screenshot({ path: join(OUT, '03-test-structure.png'), fullPage: true });

  // 4. Source file: BriefingDashboard.vue (smart questions section)
  const briefing = readFileSync('G:/w2w/src/renderer/src/views/BriefingDashboard.vue', 'utf8');
  const briefingLines = briefing.split('\n');
  // Find smart questions section (around line 380-500)
  const smartStart = briefingLines.findIndex(l => l.includes('الحكم لصالح من'));
  if (smartStart >= 0) {
    const smartSection = briefingLines.slice(Math.max(0, smartStart - 20), Math.min(briefingLines.length, smartStart + 120)).join('\n');
    await page.setContent(`<pre style="direction:ltr;font-size:11px;background:#1e1e2e;color:#cdd6f4;padding:20px;border-radius:8px;font-family:monospace">${escapeHtml(smartSection)}</pre>`);
    await page.screenshot({ path: join(OUT, '04-briefing-smart-questions.png'), fullPage: true });
  }

  // 5. Git log screenshot
  const { execSync } = await import('child_process');
  const gitLog = execSync('git log --oneline -10', { cwd: 'G:/w2w', encoding: 'utf8' });
  await page.setContent(`<pre style="direction:ltr;font-size:14px;background:#1e1e2e;color:#89b4fa;padding:20px;border-radius:8px;font-family:monospace">${escapeHtml(gitLog)}</pre>`);
  await page.screenshot({ path: join(OUT, '05-git-log.png'), fullPage: true });

  // 6. Diff for the commit
  const diff = execSync('git diff 3752fbd^..3752fbd --stat', { cwd: 'G:/w2w', encoding: 'utf8' });
  await page.setContent(`<pre style="direction:ltr;font-size:14px;background:#1e1e2e;color:#f9e2af;padding:20px;border-radius:8px;font-family:monospace">${escapeHtml(diff)}</pre>`);
  await page.screenshot({ path: join(OUT, '06-commit-diffstat.png'), fullPage: true });

  await browser.close();
  console.log('All screenshots captured in', OUT);
})().catch(e => { console.error(e); process.exit(1); });

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
