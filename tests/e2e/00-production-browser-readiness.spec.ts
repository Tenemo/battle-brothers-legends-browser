import { test } from '@playwright/test'

import { gotoBuildPlanner } from './support/build-planner-page'
import { hasConfiguredPlaywrightBaseUrl } from './support/playwright-environment'

test.skip(
  !hasConfiguredPlaywrightBaseUrl,
  'Production browser readiness only runs against the deployed site.',
)

test('browser can render the production build planner', async ({ page }) => {
  await gotoBuildPlanner(page)
})
