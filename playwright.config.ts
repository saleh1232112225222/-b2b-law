import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.playwright' })

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/tests/**/*.spec.ts', '**/e2e/**/*.spec.ts'],
  timeout: 30000,
  retries: 1,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'https://b2b-law.netlify.app',
    headless: true,
  },
  projects: [
    // 1. Setup project
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    // 2. Main tests project using chromium
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        trace: 'retain-on-failure',
        // Use saved storage state
        storageState: 'playwright/.auth/admin.json',
      },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    }
  ]
})
