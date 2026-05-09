import { defineConfig, devices, type Project } from '@playwright/test'

const developmentServerCommand =
  process.platform === 'win32' ? 'pnpm.cmd run dev:test' : 'pnpm run dev:test'
const localBaseUrl = 'http://127.0.0.1:4173'
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? localBaseUrl
const isProductionE2e = process.env.PLAYWRIGHT_BASE_URL !== undefined
const isContinuousIntegration = process.env.CI !== undefined
const playwrightWorkerCount = process.env.CI ? 2 : 6
const shouldStartDevelopmentServer = process.env.PLAYWRIGHT_BASE_URL === undefined
const productionTestTimeoutMs = 90_000
const productionProjects: Project[] = [
  {
    name: 'chromium-desktop',
    use: {
      ...devices['Desktop Chrome'],
      browserName: 'chromium',
    },
  },
]

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: baseUrl,
    headless: true,
    screenshot: 'only-on-failure',
    trace: isProductionE2e ? 'retain-on-failure' : 'on-first-retry',
    video: isProductionE2e && isContinuousIntegration ? 'retain-on-failure' : 'off',
  },
  workers: playwrightWorkerCount,
  ...(isProductionE2e
    ? {
        projects: productionProjects,
        timeout: productionTestTimeoutMs,
      }
    : {}),
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
