import { defineConfig, devices, type Project } from '@playwright/test'

const developmentServerCommand =
  process.platform === 'win32' ? 'pnpm.cmd run dev:test' : 'pnpm run dev:test'
const localBaseUrl = 'http://127.0.0.1:4173'
const configuredPlaywrightBaseUrl = process.env.PLAYWRIGHT_BASE_URL?.trim()
const playwrightBaseUrl = configuredPlaywrightBaseUrl ? configuredPlaywrightBaseUrl : undefined
const baseUrl = playwrightBaseUrl ?? localBaseUrl
const isProductionE2e = playwrightBaseUrl !== undefined
const isContinuousIntegration = process.env.CI !== undefined
const playwrightWorkerCount = process.env.CI ? 2 : 6
const shouldStartDevelopmentServer = playwrightBaseUrl === undefined
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
