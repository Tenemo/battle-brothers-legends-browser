import { defineConfig } from '@playwright/test'

const developmentServerCommand =
  process.platform === 'win32' ? 'pnpm.cmd run dev:test' : 'pnpm run dev:test'
const localBaseUrl = 'http://127.0.0.1:4173'
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? localBaseUrl
const playwrightWorkerCount = process.env.CI ? 2 : 6
const shouldStartDevelopmentServer = process.env.PLAYWRIGHT_BASE_URL === undefined

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: baseUrl,
    headless: true,
    trace: 'on-first-retry',
  },
  workers: playwrightWorkerCount,
  ...(shouldStartDevelopmentServer
    ? {
        webServer: {
          command: developmentServerCommand,
          port: 4173,
          reuseExistingServer: false,
          timeout: 120000,
        },
      }
    : {}),
})
