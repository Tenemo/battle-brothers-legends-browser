import { expect, test } from '@playwright/test'
import {
  addPerkToBuildFromResults,
  addSelectedPerkToBuild,
  getBuildAlternativeGroupsList,
  getBuildPerksBar,
  getBuildPlanList,
  gotoPerksBrowser,
  inspectPerkFromResults,
  mediumPerksBrowserViewport,
  searchPerks,
} from './support/perks-browser'

test('build planner shows a recommended unlock plan and grouped alternatives without internal scrolling', async ({
  page,
}) => {
  await gotoPerksBrowser(page, mediumPerksBrowserViewport)

  await searchPerks(page, 'Clarity')
  await inspectPerkFromResults(page, 'Clarity')

  const resultsRowHeightBeforePicking = await page
    .locator('.results-list .perk-row')
    .evaluate((element) => element.getBoundingClientRect().height)

  await addPerkToBuildFromResults(page, 'Clarity')
  await expect(getBuildPerksBar(page).getByText('Clarity')).toBeVisible()
  await expect(getBuildPlanList(page).getByText('Calm', { exact: true })).toBeVisible()
  await expect(getBuildPlanList(page).getByText('Clarity', { exact: true })).toBeVisible()
  await expect(getBuildAlternativeGroupsList(page).getByText('This build has no alternative groups')).toBeVisible()

  const resultsRowHeightAfterPicking = await page
    .locator('.results-list .perk-row')
    .evaluate((element) => element.getBoundingClientRect().height)

  expect(Math.abs(resultsRowHeightAfterPicking - resultsRowHeightBeforePicking)).toBeLessThanOrEqual(1)

  const pickedPerkTile = getBuildPerksBar(page).locator('.planner-slot-perk').first()
  const hoverMetricsBefore = await pickedPerkTile.evaluate((element) => {
    const tileRectangle = element.getBoundingClientRect()

    return {
      tileRectangle: {
        right: tileRectangle.right,
        top: tileRectangle.top,
      },
    }
  })

  await pickedPerkTile.hover()

  await expect(page.getByRole('tooltip')).toBeVisible({ timeout: 200 })
  await expect(page.getByRole('tooltip')).toContainText(/An additional \+10% of any damage ignores armor/i)

  const hoverMetricsAfter = await pickedPerkTile.evaluate((element) => {
    const tileRectangle = element.getBoundingClientRect()

    return {
      tileRectangle: {
        right: tileRectangle.right,
        top: tileRectangle.top,
      },
    }
  })

  expect(Math.abs(hoverMetricsAfter.tileRectangle.top - hoverMetricsBefore.tileRectangle.top)).toBeLessThanOrEqual(1)
  expect(Math.abs(hoverMetricsAfter.tileRectangle.right - hoverMetricsBefore.tileRectangle.right)).toBeLessThanOrEqual(1)

  await page.getByRole('button', { name: 'Clear build' }).click()
  await expect(getBuildPerksBar(page).locator('.planner-slot-perk')).toHaveCount(0)

  await searchPerks(page, 'Perfect Focus')
  await inspectPerkFromResults(page, 'Perfect Focus')
  await addPerkToBuildFromResults(page, 'Perfect Focus')

  await expect(getBuildPerksBar(page).locator('.planner-slot-perk')).toHaveCount(1)
  await expect(getBuildPlanList(page).locator('.planner-plan-card')).toHaveCount(1)
  await expect(getBuildPlanList(page).getByText('Calm', { exact: true })).toBeVisible()
  await expect(getBuildPlanList(page).getByText('Perfect Focus', { exact: true })).toBeVisible()
  await expect(getBuildAlternativeGroupsList(page).locator('.planner-alternative-card')).toHaveCount(1)
  await expect(getBuildAlternativeGroupsList(page).getByText('Deadeye', { exact: true })).toBeVisible()
  await expect(getBuildAlternativeGroupsList(page).getByText('Perfect Focus', { exact: true })).toBeVisible()

  await searchPerks(page, 'Peaceable')
  await inspectPerkFromResults(page, 'Peaceable')
  await addSelectedPerkToBuild(page, 'Peaceable')

  await searchPerks(page, 'Clarity')
  await inspectPerkFromResults(page, 'Clarity')
  await addPerkToBuildFromResults(page, 'Clarity')

  await expect(getBuildPerksBar(page).locator('.planner-slot-perk')).toHaveCount(3)
  await expect(getBuildPlanList(page).locator('.planner-plan-card')).toHaveCount(1)
  await expect(getBuildPlanList(page).getByText('Calm', { exact: true })).toBeVisible()
  await expect(getBuildPlanList(page).getByText('Perfect Focus', { exact: true })).toBeVisible()
  await expect(getBuildPlanList(page).getByText('Peaceable', { exact: true })).toBeVisible()
  await expect(getBuildPlanList(page).getByText('Clarity', { exact: true })).toBeVisible()
  await expect(getBuildAlternativeGroupsList(page).locator('.planner-alternative-card')).toHaveCount(1)
  await expect(getBuildAlternativeGroupsList(page).getByText('Deadeye', { exact: true })).toBeVisible()
  await expect(getBuildAlternativeGroupsList(page).getByText('Perfect Focus', { exact: true })).toBeVisible()
  await expect(page.getByText('Build 3', { exact: true })).toBeVisible()

  await page.goto(
    '/?build=Clarity&build=Peaceable&build=Perfect+Focus&build=Berserk&build=Killing+Frenzy&build=Fearsome&build=Colossus',
  )
  await expect(page.getByRole('heading', { level: 1, name: 'Perks browser' })).toBeVisible()
  await expect(getBuildPerksBar(page).locator('.planner-slot-perk')).toHaveCount(7)
  expect(await getBuildPlanList(page).locator('.planner-plan-card').count()).toBeGreaterThan(0)
  expect(
    await page.evaluate(() => {
      const plannerBoard = document.querySelector('.planner-board') as HTMLElement | null

      return plannerBoard === null ? Number.POSITIVE_INFINITY : plannerBoard.scrollHeight - plannerBoard.clientHeight
    }),
  ).toBeLessThanOrEqual(1)

  const perksBarHorizontalOverflow = await page.evaluate(() => {
    const buildPerksBar = document.querySelector('[data-testid="build-perks-bar"]') as HTMLElement | null

    return buildPerksBar === null ? Number.POSITIVE_INFINITY : buildPerksBar.scrollWidth - buildPerksBar.clientWidth
  })

  expect(perksBarHorizontalOverflow).toBeLessThanOrEqual(1)

  const wrappedPerkTilePositions = await getBuildPerksBar(page)
    .locator('.planner-slot-perk')
    .evaluateAll((elements) =>
      elements.map((element) => {
        const rectangle = element.getBoundingClientRect()

        return {
          left: Math.round(rectangle.left),
          top: Math.round(rectangle.top),
        }
      }),
    )

  const wrappedPerkRowTops = [...new Set(wrappedPerkTilePositions.map((position) => position.top))]

  expect(wrappedPerkRowTops.length).toBeGreaterThan(1)
  expect(
    Math.abs(
      wrappedPerkTilePositions.find((position) => position.top === wrappedPerkRowTops[0])!.left -
        wrappedPerkTilePositions.find((position) => position.top === wrappedPerkRowTops[1])!.left,
    ),
  ).toBeLessThanOrEqual(2)
})

test('groups alternative perk groups by the picked perks they unlock', async ({ page }) => {
  await gotoPerksBrowser(page)

  await page.goto('/?build=Battle+Forged&build=Immovable+Object&build=Steadfast')
  await expect(page.getByRole('heading', { level: 1, name: 'Perks browser' })).toBeVisible()

  const buildAlternativeGroupsList = getBuildAlternativeGroupsList(page)

  await expect(buildAlternativeGroupsList.getByText('Forceful', { exact: true })).toBeVisible()
  await expect(buildAlternativeGroupsList.getByText('Battle Forged', { exact: true })).toBeVisible()
  await expect(buildAlternativeGroupsList.getByText('Immovable Object', { exact: true })).toBeVisible()
  await expect(buildAlternativeGroupsList.getByText('Sturdy / Swordmasters', { exact: true })).toBeVisible()
  await expect(buildAlternativeGroupsList.getByText('Steadfast', { exact: true })).toBeVisible()
  await expect(buildAlternativeGroupsList.locator('.planner-alternative-card')).toHaveCount(2)
})

test('clears the build and restores planner placeholders', async ({ page }) => {
  await gotoPerksBrowser(page)

  await searchPerks(page, 'Clarity')
  await inspectPerkFromResults(page, 'Clarity')
  await addSelectedPerkToBuild(page, 'Clarity')
  await expect(page.getByText('1 perk picked.')).toBeVisible()

  await page.getByRole('button', { name: 'Clear build' }).click()

  await expect(page.getByText('No perks picked yet.')).toBeVisible()
  await expect(getBuildPerksBar(page).getByText('Pick a perk to start')).toBeVisible()
  await expect(getBuildPlanList(page).getByText('Recommended perk groups will appear here')).toBeVisible()
  await expect(getBuildAlternativeGroupsList(page).getByText('Alternative perk groups will appear here')).toBeVisible()
})
