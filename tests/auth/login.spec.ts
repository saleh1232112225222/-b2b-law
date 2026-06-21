import { test, expect } from '@playwright/test';

test('تسجيل دخول admin', async ({ page }) => {
  await page.goto('https://b2b-law.netlify.app/login');

  // إدخال اسم المستخدم
  await page.fill('input[name="username"]', 'admin');

  // إدخال كلمة المرور
  await page.fill('input[name="password"]', 'admin1390');

  // الضغط على زر الدخول
  await page.click('button[type="submit"]');

  // التأكد أنه دخل للوحة التحكم
  await expect(page).toHaveURL(/dashboard/);
});
