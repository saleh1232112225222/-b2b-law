import { defineConfig } from '@playwright/test'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.playwright' })

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/tests/**/*.spec.ts', '**/e2e/**/*.spec.ts'],
  timeout: 30000,
  retries: 1,
  workers: 1,
  use: {
    baseURL: 'https://b2b-law.netlify.app',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  }
})
