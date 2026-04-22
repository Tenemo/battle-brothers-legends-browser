import { expect, test } from '@playwright/test'
import {
  expectViewportLocked,
  getBuildIndividualGroupsList,
  getBuildPerksBar,
  getBuildSharedGroupsList,
  gotoPerksBrowser,
} from './support/perks-browser'

test('keeps the shell pinned to the viewport with always-visible planner rows', async ({ page }) => {
  await gotoPerksBrowser(page)
  await expectViewportLocked(page)
  const buildPlanner = page.getByLabel('Build planner')

  await expect(page.getByText('No perks picked yet.')).toBeVisible()
  await expect(getBuildPerksBar(page).getByText('Pick a perk to start')).toBeVisible()
  await expect(
    getBuildSharedGroupsList(page).getByText('Perk groups covering 2 or more picked perks will appear here'),
  ).toBeVisible()
  await expect(
    getBuildIndividualGroupsList(page).getByText('Single-perk groups will appear here'),
  ).toBeVisible()
  await expect(buildPlanner.getByText('Perks', { exact: true })).toBeVisible()
  await expect(buildPlanner.getByText('Perk groups for 2+ perks', { exact: true })).toBeVisible()
  await expect(buildPlanner.getByText('Perk groups for individual perks', { exact: true })).toBeVisible()
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const plannerBoard = document.querySelector('.planner-board') as HTMLElement | null

        return plannerBoard === null
          ? Number.POSITIVE_INFINITY
          : plannerBoard.scrollHeight - plannerBoard.clientHeight
      }),
    )
    .toBeLessThanOrEqual(1)
})
