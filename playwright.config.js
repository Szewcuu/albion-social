import { defineConfig, devices } from '@playwright/test'
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173'
const hasAuthCredentials = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL
  && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  && process.env.SUPABASE_SERVICE_ROLE_KEY
  && process.env.E2E_USER_EMAIL
)

if (process.env.E2E_REQUIRE_AUTH === '1' && !hasAuthCredentials) {
  throw new Error('Authenticated E2E requires E2E_USER_EMAIL, SUPABASE_SERVICE_ROLE_KEY and Supabase public variables.')
}

const authenticatedProjects = hasAuthCredentials ? [
  {
    name: 'auth-setup',
    testMatch: /auth\.setup\.js/,
  },
  {
    name: 'authenticated',
    testMatch: /(?:authenticated|visual-authenticated)\.spec\.js/,
    dependencies: ['auth-setup'],
    use: {
      ...devices['Desktop Chrome'],
      storageState: 'playwright/.auth/user.json',
    },
  },
] : []

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'public',
      testMatch: /(?:public|visual-public)\.spec\.js/,
      use: { ...devices['Desktop Chrome'] },
    },
    ...authenticatedProjects,
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: process.env.E2E_SKIP_BUILD === '1'
      ? 'npm run start:e2e'
      : 'npm run build && npm run start:e2e',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
