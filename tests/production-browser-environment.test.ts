import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { expect, test } from 'vitest'

test('production browser image matches the installed Playwright version', () => {
  const require = createRequire(import.meta.url)
  const playwrightPackage = JSON.parse(
    readFileSync(require.resolve('@playwright/test/package.json'), 'utf8'),
  ) as { version: string }
  const workflow = readFileSync(require.resolve('../.github/workflows/production-e2e.yml'), 'utf8')
  const imageVersion = workflow.match(
    /image:\s*mcr\.microsoft\.com\/playwright:v(\d+\.\d+\.\d+)-noble/u,
  )?.[1]

  expect(imageVersion, 'Keep the production browser image aligned with the lockfile').toBe(
    playwrightPackage.version,
  )
})
