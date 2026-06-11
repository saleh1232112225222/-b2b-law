import { chromium } from '@playwright/test';

(async () => {
  console.log('Launching browser to demonstrate live functionality...');
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  console.log('Navigating to live URL: https://b2b-law.netlify.app');
  await page.goto('https://b2b-law.netlify.app/#/login', { waitUntil: 'networkidle' });
  
  console.log('Clearing old session data to ensure fresh login...');
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });

  console.log('Logging in as admin...');
  await page.fill('#username-input', 'admin');
  await page.fill('#password-input', 'admin');
  await page.click('#login-submit-btn');

  console.log('Waiting for dashboard and sidebar...');
  // Wait for sidebar to be visible
  await page.waitForSelector('.premium-sidebar-modern', { timeout: 15000 });
  await page.waitForTimeout(2000);

  console.log('Expanding all sidebar menus to prove they are visible...');
  // Expand "العمل القانوني"
  const legalWork = page.locator('.v-list-item-title:has-text("العمل القانوني")');
  if (await legalWork.count() > 0) await legalWork.first().click();
  await page.waitForTimeout(1000);

  // Expand "الموكلين والملفات"
  const clientsFiles = page.locator('.v-list-item-title:has-text("الموكلين والملفات")');
  if (await clientsFiles.count() > 0) await clientsFiles.first().click();
  await page.waitForTimeout(1000);

  // Expand "الإدارة والمالية"
  const adminFinance = page.locator('.v-list-item-title:has-text("الإدارة والمالية")');
  if (await adminFinance.count() > 0) await adminFinance.first().click();
  await page.waitForTimeout(1000);

  // Expand "الإعدادات والأدوات"
  const settingsTools = page.locator('.v-list-item-title:has-text("الإعدادات والأدوات")');
  if (await settingsTools.count() > 0) await settingsTools.first().click();
  await page.waitForTimeout(1000);

  await page.screenshot({ path: 'live_test_sidebar_expanded.png' });
  console.log('Screenshot saved: live_test_sidebar_expanded.png');

  console.log('Creating a new client...');
  await page.goto('https://b2b-law.netlify.app/#/clients', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const addClientBtn = page.locator('button:has-text("إضافة موكل"), button:has-text("جديد"), button:has-text("إضافة")').first();
  if (await addClientBtn.count() > 0) {
    await addClientBtn.click();
    await page.waitForTimeout(1000);
    // Try to find the name input (best effort for demonstration)
    const nameInput = page.locator('input[type="text"]').first();
    if (await nameInput.count() > 0) await nameInput.fill('موكل تجريبي من خلال الاختبار الحي');
    const saveBtn = page.locator('button:has-text("حفظ")').first();
    if (await saveBtn.count() > 0) await saveBtn.click();
  }
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'live_test_client_created.png' });

  console.log('Creating a new case...');
  await page.goto('https://b2b-law.netlify.app/#/cases', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const addCaseBtn = page.locator('button:has-text("إضافة قضية"), button:has-text("جديد"), button:has-text("إضافة")').first();
  if (await addCaseBtn.count() > 0) {
    await addCaseBtn.click();
    await page.waitForTimeout(1000);
    const titleInput = page.locator('input[type="text"]').first();
    if (await titleInput.count() > 0) await titleInput.fill('قضية تجريبية للتأكيد المباشر');
    const saveCaseBtn = page.locator('button:has-text("حفظ")').first();
    if (await saveCaseBtn.count() > 0) await saveCaseBtn.click();
  }
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'live_test_case_created.png' });

  console.log('Creating a new session...');
  await page.goto('https://b2b-law.netlify.app/#/sessions', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const addSessionBtn = page.locator('button:has-text("إضافة جلسة"), button:has-text("جديد"), button:has-text("إضافة")').first();
  if (await addSessionBtn.count() > 0) {
    await addSessionBtn.click();
    await page.waitForTimeout(1000);
    // Just click save to see if it triggers validation or creates an empty one
    const saveSessionBtn = page.locator('button:has-text("حفظ")').first();
    if (await saveSessionBtn.count() > 0) await saveSessionBtn.click();
  }
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'live_test_session_created.png' });

  console.log('Demonstration completed. Leaving browser open for 15 seconds for you to verify...');
  await page.waitForTimeout(15000);
  
  await browser.close();
  console.log('Done.');
})();
