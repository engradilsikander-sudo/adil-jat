import { defineConfig, devices } from '@playwright/test'

const localBaseURL = 'http://127.0.0.1:3000'
const externalBaseURL = process.env.E2E_BASE_URL

export default defineConfig({
  testDir: './e2e', timeout: 90000, fullyParallel: false, workers: 1, retries: 0,
  reporter: [['list']],
  use: { baseURL: externalBaseURL || localBaseURL, trace: 'off', screenshot: 'off', video: 'off' },
  // Bundled clients avoid dev-module cold-start races. Never reuse an unidentified
  // process on port 3000; --strictPort fails clearly instead of selecting another port.
  webServer: externalBaseURL ? undefined : {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 3000 --strictPort',
    url: localBaseURL,
    reuseExistingServer: false,
    timeout: 120000,
  },
  projects: [
    { name: 'desktop', testIgnore: '**/mobile-workflow.spec.ts', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', testMatch: ['**/public.spec.ts', '**/mobile-workflow.spec.ts'], use: { ...devices['Pixel 7'] } },
  ],
})
