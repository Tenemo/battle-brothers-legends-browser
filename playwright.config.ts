import { defineConfig } from '@playwright/test'

const developmentServerCommand =
  process.platform === 'win32' ? 'pnpm.cmd run dev:test' : 'pnpm run dev:test'

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: developmentServerCommand,
    port: 4173,
    reuseExistingServer: true,
    timeout: 120000,
  },
})
