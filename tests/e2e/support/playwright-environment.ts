const configuredPlaywrightBaseUrl = process.env.PLAYWRIGHT_BASE_URL?.trim()

export const hasConfiguredPlaywrightBaseUrl =
  configuredPlaywrightBaseUrl !== undefined && configuredPlaywrightBaseUrl.length > 0
