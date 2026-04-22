import { expect, test } from '@playwright/test'
import {
  expectViewportLocked,
  getBuildAlternativeGroupsList,
  getBuildPerksBar,
  getBuildPlanList,
  gotoPerksBrowser,
} from './support/perks-browser'

test('keeps the shell pinned to the viewport with always-visible planner rows', async ({ page }) => {
  await gotoPerksBrowser(page)
  await expectViewportLocked(page)
  const buildPlanner = page.getByLabel('Build planner')

  await expect(page.getByText('No perks picked yet.')).toBeVisible()
  await expect(getBuildPerksBar(page).getByText('Pick a perk to start')).toBeVisible()
  await expect(getBuildPlanList(page).getByText('Recommended perk groups will appear here')).toBeVisible()
  await expect(getBuildAlternativeGroupsList(page).getByText('Alternative perk groups will appear here')).toBeVisible()
  await expect(buildPlanner.getByText('Perks', { exact: true })).toBeVisible()
  await expect(buildPlanner.getByText('Plan', { exact: true })).toBeVisible()
  await expect(buildPlanner.getByText('Alternatives', { exact: true })).toBeVisible()
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
