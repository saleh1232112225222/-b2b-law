import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  // Also include e2e directory
  testMatch: ['**/tests/**/*.spec.ts', '**/e2e/**/*.spec.ts'],
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'https://b2b-law.netlify.app',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  }
})
