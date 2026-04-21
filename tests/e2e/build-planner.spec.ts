import { expect, test } from '@playwright/test'
import {
  addPerkToBuildFromResults,
  addSelectedPerkToBuild,
  getBuildGroupsBar,
  getBuildPerksBar,
  gotoPerksBrowser,
  inspectPerkFromResults,
  mediumPerksBrowserViewport,
  searchPerks,
} from './support/perks-browser'

test('build planner uses left-aligned perk tiles and grouped perk-group tiles without layout jumps', async ({
  page,
}) => {
  await gotoPerksBrowser(page, mediumPerksBrowserViewport)

  await searchPerks(page, 'Clarity')
  await inspectPerkFromResults(page, 'Clarity')

  const buildPlannerHeightBeforePicking = await page
    .locator('.build-planner')
    .evaluate((element) => element.getBoundingClientRect().height)
  const resultsRowHeightBeforePicking = await page
    .locator('.results-list .perk-row')
    .evaluate((element) => element.getBoundingClientRect().height)

  await addPerkToBuildFromResults(page, 'Clarity')
  await expect(getBuildPerksBar(page).getByText('Clarity')).toBeVisible()

  const buildPlannerHeightAfterPicking = await page
    .locator('.build-planner')
    .evaluate((element) => element.getBoundingClientRect().height)
  const resultsRowHeightAfterPicking = await page
    .locator('.results-list .perk-row')
    .evaluate((element) => element.getBoundingClientRect().height)

  expect(Math.abs(buildPlannerHeightAfterPicking - buildPlannerHeightBeforePicking)).toBeLessThanOrEqual(1)
  expect(Math.abs(resultsRowHeightAfterPicking - resultsRowHeightBeforePicking)).toBeLessThanOrEqual(1)

  await searchPerks(page, 'Peaceable')
  await inspectPerkFromResults(page, 'Peaceable')
  await addSelectedPerkToBuild(page, 'Peaceable')

  await searchPerks(page, 'Perfect Focus')
  await inspectPerkFromResults(page, 'Perfect Focus')
  await addPerkToBuildFromResults(page, 'Perfect Focus')

  await expect(getBuildPerksBar(page).locator('.planner-slot-perk')).toHaveCount(3)
  await expect(getBuildPerksBar(page).getByText('Perfect Focus')).toBeVisible()
  await expect(getBuildGroupsBar(page).locator('.planner-slot-group')).toHaveCount(2)
  await expect(getBuildGroupsBar(page).getByText('Calm', { exact: true })).toHaveCount(1)
  await expect(getBuildGroupsBar(page).getByText('Deadeye', { exact: true })).toHaveCount(1)
  await expect(getBuildGroupsBar(page).getByText('Clarity, Peaceable, Perfect Focus')).toBeVisible()

  const perkTilePositions = await getBuildPerksBar(page)
    .locator('.planner-slot-perk')
    .evaluateAll((elements) =>
      elements.map((element) => {
        const rectangle = element.getBoundingClientRect()

        return {
          left: rectangle.left,
          top: rectangle.top,
        }
      }),
    )

  expect(perkTilePositions[0].left).toBeLessThan(perkTilePositions[1].left)
  expect(perkTilePositions[1].left).toBeLessThan(perkTilePositions[2].left)
  expect(perkTilePositions[0].top).toBe(perkTilePositions[1].top)
  expect(perkTilePositions[1].top).toBe(perkTilePositions[2].top)
  await expect(page.getByText('Build 3', { exact: true })).toBeVisible()
})

test('clears the build and restores grouped planner placeholders', async ({ page }) => {
  await gotoPerksBrowser(page)

  await searchPerks(page, 'Clarity')
  await inspectPerkFromResults(page, 'Clarity')
  await addSelectedPerkToBuild(page, 'Clarity')
  await expect(page.getByText('1 perk picked.')).toBeVisible()

  await page.getByRole('button', { name: 'Clear build' }).click()

  await expect(page.getByText('No perks picked yet.')).toBeVisible()
  await expect(getBuildPerksBar(page).getByText('Pick a perk to start')).toBeVisible()
  await expect(
    getBuildGroupsBar(page).getByText('Required perk groups will appear here'),
  ).toBeVisible()
})
