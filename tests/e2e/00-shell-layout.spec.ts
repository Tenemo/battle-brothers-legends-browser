import { expect, test } from '@playwright/test'
import {
  expectViewportLocked,
  getBuildGroupsBar,
  getBuildPerksBar,
  gotoPerksBrowser,
} from './support/perks-browser'

test('keeps the shell pinned to the viewport with always-visible planner rows', async ({ page }) => {
  await gotoPerksBrowser(page)
  await expectViewportLocked(page)
  const buildPlanner = page.getByLabel('Build planner')

  await expect(page.getByText('No perks picked yet.')).toBeVisible()
  await expect(getBuildPerksBar(page).getByText('Pick a perk to start')).toBeVisible()
  await expect(
    getBuildGroupsBar(page).getByText('Required perk groups will appear here'),
  ).toBeVisible()
  await expect(buildPlanner.getByText('Perks', { exact: true })).toBeVisible()
  await expect(buildPlanner.getByText('Perk groups', { exact: true })).toBeVisible()
})
