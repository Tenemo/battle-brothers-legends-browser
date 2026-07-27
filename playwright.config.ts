import { defineConfig, devices, type Project } from '@playwright/test'

const developmentServerCommand =
  process.platform === 'win32' ? 'pnpm.cmd run dev:test' : 'pnpm run dev:test'
const localBaseUrl = 'http://127.0.0.1:4173'
const localPlaywrightBaseUrlHosts = new Set(['127.0.0.1', '::1', '[::1]', 'localhost'])
const supportedPlaywrightBaseUrlProtocols = new Set(['http:', 'https:'])
const configuredPlaywrightBaseUrl = process.env.PLAYWRIGHT_BASE_URL?.trim()
const parsedPlaywrightBaseUrl =
  configuredPlaywrightBaseUrl === undefined || configuredPlaywrightBaseUrl === ''
    ? undefined
    : parsePlaywrightBaseUrl(configuredPlaywrightBaseUrl)
const playwrightBaseUrl = parsedPlaywrightBaseUrl?.href
const baseUrl = playwrightBaseUrl ?? localBaseUrl
const hasConfiguredPlaywrightBaseUrl = playwrightBaseUrl !== undefined
const isLocalPlaywrightBaseUrl =
  parsedPlaywrightBaseUrl === undefined
    ? false
    : localPlaywrightBaseUrlHosts.has(parsedPlaywrightBaseUrl.hostname)
const isProductionE2e = hasConfiguredPlaywrightBaseUrl && !isLocalPlaywrightBaseUrl
const isContinuousIntegration = process.env.CI !== undefined
const playwrightWorkerCount = process.env.CI ? 2 : 6
const shouldStartDevelopmentServer = !hasConfiguredPlaywrightBaseUrl
const productionTestTimeoutMs = 90_000

function parsePlaywrightBaseUrl(rawBaseUrl: string): URL {
  const parsedBaseUrl =
    parseSupportedPlaywrightBaseUrl(rawBaseUrl) ??
    parseSupportedPlaywrightBaseUrl(`http://${rawBaseUrl}`)

  if (parsedBaseUrl === null) {
    throw new Error('PLAYWRIGHT_BASE_URL must be an absolute http(s) URL or a host[:port] value.')
  }

  return parsedBaseUrl
}

function parseSupportedPlaywrightBaseUrl(rawBaseUrl: string): URL | null {
  try {
    const parsedBaseUrl = new URL(rawBaseUrl)

    return supportedPlaywrightBaseUrlProtocols.has(parsedBaseUrl.protocol) ? parsedBaseUrl : null
  } catch {
    return null
  }
}

const productionProjects: Project[] = [
  {
    name: 'chromium-desktop',
    use: {
      ...devices['Desktop Chrome'],
      browserName: 'chromium',
    },
  },
]
const localProjects: Project[] = [
  ...productionProjects,
  {
    name: 'chrome-desktop',
    use: {
      ...devices['Desktop Chrome'],
      channel: 'chrome',
    },
  },
  {
    name: 'firefox-desktop',
    use: {
      ...devices['Desktop Firefox'],
      browserName: 'firefox',
      launchOptions: {
        firefoxUserPrefs: {
          // Avoid Firefox's session-store teardown race when Playwright removes the final context.
          'browser.tabs.closeWindowWithLastTab': false,
        },
      },
    },
  },
  {
    name: 'webkit-desktop',
    use: {
      ...devices['Desktop Safari'],
      browserName: 'webkit',
    },
  },
  {
    name: 'mobile-chrome-pixel',
    use: {
      ...devices['Pixel 5'],
      browserName: 'chromium',
    },
  },
  {
    name: 'mobile-webkit-iphone',
    use: {
      ...devices['iPhone 12'],
      browserName: 'webkit',
    },
  },
]

export default defineConfig({
  testDir: './tests/e2e',
  projects: isProductionE2e ? productionProjects : localProjects,
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
