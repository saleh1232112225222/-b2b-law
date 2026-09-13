import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 120000,
    include: ['src/**/__tests__/**/*.test.ts'],
    env: {
      DATABASE_URL: 'postgresql://b2b_law:b2b_law_pass@127.0.0.1:5433/b2b_law_db',
      JWT_SECRET: 'test-jwt-secret-for-b2b-law-reports'
    }
  }
})
