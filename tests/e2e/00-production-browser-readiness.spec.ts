import { test } from '@playwright/test'

import { gotoBuildPlanner } from './support/build-planner-page'

test.skip(
  process.env.PLAYWRIGHT_BASE_URL === undefined,
  'Production browser readiness only runs against the deployed site.',
)

test('browser can render the production build planner', async ({ page }) => {
  await gotoBuildPlanner(page)
})
