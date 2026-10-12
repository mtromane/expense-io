import { defineConfig, devices } from '@playwright/test'
import { BASE_URL, FAULTY_URL } from './tests/support/env'

const appDir = process.env.APP_DIR ?? '.'
const isCI = !!process.env.CI

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  globalSetup: './tests/global-setup.ts',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 4 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: BASE_URL,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: 'ops/seed-e2e.spec.ts',
    },
    {
      // Relance seed-e2e (remise à zéro de la hiérarchie) : uniquement après
      // tous les autres tests, pour ne pas perturber ceux qui tournent en parallèle.
      name: 'seed-checks',
      use: { ...devices['Desktop Chrome'] },
      testMatch: 'ops/seed-e2e.spec.ts',
      dependencies: ['chromium'],
    },
  ],
  webServer: [
    {
      command: 'npm run start',
      cwd: appDir,
      url: `${BASE_URL}/login`,
      reuseExistingServer: !isCI,
      timeout: 120_000,
      env: { AUTH_TRUST_HOST: 'true' },
    },
    {
      // Instance de panne : S3 injoignable, secret de session distinct.
      command: 'npm run start -- -p 3001',
      cwd: appDir,
      url: `${FAULTY_URL}/login`,
      reuseExistingServer: !isCI,
      timeout: 120_000,
      env: {
        AUTH_TRUST_HOST: 'true',
        S3_ENDPOINT: 'http://localhost:59999',
        AUTH_SECRET: 'faulty-instance-secret-distinct-from-main-0123456789',
      },
    },
  ],
})
