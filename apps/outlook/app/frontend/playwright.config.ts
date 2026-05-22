import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

// The outlook.clone.test cert is signed by the shared test-only CA, not a
// public root. Disabling TLS verification here is scoped to the test process
// so Node's native fetch (used by global.setup.ts + ApiClient) doesn't
// reject the local chain.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const CLONE_DOMAIN = process.env.CLONE_DOMAIN ?? 'outlook.clone.test'
const CADDY_HOST_PORT = process.env.CADDY_HOST_PORT ?? '443'
const PORT_SUFFIX = CADDY_HOST_PORT === '443' ? '' : `:${CADDY_HOST_PORT}`
const BASE_URL = process.env.FRONTEND_URL ?? `https://${CLONE_DOMAIN}${PORT_SUFFIX}`

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-results.json' }],
  ],
  outputDir: 'test-results',
  use: {
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    testIdAttribute: 'data-testid',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'setup',
      testDir: './e2e',
      testMatch: /global\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Default to admin's pre-generated session — global.setup.ts writes this.
        // Auth-flow specs that need a logged-out start override with
        // `test.use({ storageState: { cookies: [], origins: [] } })`.
        storageState: 'e2e/.auth/frank.miller.json',
      },
      dependencies: ['setup'],
    },
  ],
})
