import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './e2e', timeout: 90000, fullyParallel: false, workers: 1, retries: 0,
  reporter: [['list']],
  use: { baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:3000', trace: 'off', screenshot: 'off', video: 'off' },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }, { name: 'mobile', testMatch: '**/public.spec.ts', use: { ...devices['Pixel 7'] } }],
})
