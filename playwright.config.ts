import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  // Also include e2e directory
  testMatch: ['**/tests/**/*.spec.ts', '**/e2e/**/*.spec.ts'],
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30000
  }
})
