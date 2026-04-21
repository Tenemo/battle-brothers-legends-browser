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

  const pickedPerkTile = getBuildPerksBar(page).locator('.planner-slot-perk').first()
  const hoverMetricsBefore = await pickedPerkTile.evaluate((element) => {
    const tileRectangle = element.getBoundingClientRect()

    return {
      tileRectangle: {
        bottom: tileRectangle.bottom,
        right: tileRectangle.right,
        top: tileRectangle.top,
        width: tileRectangle.width,
      },
    }
  })

  await pickedPerkTile.hover()

  await expect(pickedPerkTile.locator('.planner-picked-perk-remove-indicator')).toBeHidden()
  await expect(page.getByRole('tooltip')).toBeVisible({ timeout: 200 })
  await expect(page.getByRole('tooltip')).toContainText(/An additional \+10% of any damage ignores armor/i)

  const hoverMetricsAfter = await pickedPerkTile.evaluate((element) => {
    const tileRectangle = element.getBoundingClientRect()

    return {
      tileRectangle: {
        bottom: tileRectangle.bottom,
        right: tileRectangle.right,
        top: tileRectangle.top,
        width: tileRectangle.width,
      },
    }
  })

  expect(Math.abs(hoverMetricsAfter.tileRectangle.top - hoverMetricsBefore.tileRectangle.top)).toBeLessThanOrEqual(1)

  await page.getByRole('button', { name: 'Clear build' }).click()
  await expect(getBuildPerksBar(page).locator('.planner-slot-perk')).toHaveCount(0)

  await searchPerks(page, 'Perfect Focus')
  await inspectPerkFromResults(page, 'Perfect Focus')
  await addPerkToBuildFromResults(page, 'Perfect Focus')

  await expect(getBuildPerksBar(page).locator('.planner-slot-perk')).toHaveCount(1)
  await expect(getBuildGroupsBar(page).locator('.planner-slot-group')).toHaveCount(1)
  await expect(getBuildGroupsBar(page).getByText('Calm / Deadeye', { exact: true })).toBeVisible()
  await expect(
    getBuildGroupsBar(page).getByRole('img', { name: 'Calm perk group icon' }),
  ).toBeVisible()
  await expect(
    getBuildGroupsBar(page).getByRole('img', { name: 'Deadeye perk group icon' }),
  ).toBeVisible()
  await expect(getBuildGroupsBar(page).getByText('Perfect Focus', { exact: true })).toBeVisible()

  await searchPerks(page, 'Peaceable')
  await inspectPerkFromResults(page, 'Peaceable')
  await addSelectedPerkToBuild(page, 'Peaceable')

  await searchPerks(page, 'Clarity')
  await inspectPerkFromResults(page, 'Clarity')
  await addPerkToBuildFromResults(page, 'Clarity')

  await expect(getBuildPerksBar(page).locator('.planner-slot-perk')).toHaveCount(3)
  await expect(getBuildPerksBar(page).getByText('Perfect Focus')).toBeVisible()
  await expect(getBuildGroupsBar(page).locator('.planner-slot-group')).toHaveCount(2)
  await expect(getBuildGroupsBar(page).getByText('Calm', { exact: true })).toHaveCount(1)
  await expect(getBuildGroupsBar(page).getByText('Calm / Deadeye', { exact: true })).toHaveCount(1)
  await expect(getBuildGroupsBar(page).getByRole('img', { name: 'Calm perk group icon' })).toHaveCount(2)
  await expect(getBuildGroupsBar(page).getByRole('img', { name: 'Deadeye perk group icon' })).toHaveCount(1)
  await expect(getBuildGroupsBar(page).getByText('Peaceable, Clarity')).toBeVisible()
  await expect(getBuildGroupsBar(page).getByText('Perfect Focus')).toBeVisible()

  const plannerTileWidths = await page.evaluate(() => {
    const perkTile = document.querySelector('.planner-slot-perk') as HTMLElement | null
    const buildGroupsBar = document.querySelector('[data-testid="build-groups-bar"]') as HTMLElement | null
    const plannerGroupTiles = [...document.querySelectorAll('.planner-slot-group')] as HTMLElement[]
    const groupGap =
      buildGroupsBar === null ? Number.NaN : Number.parseFloat(getComputedStyle(buildGroupsBar).columnGap)
    const singleGroupTile = plannerGroupTiles.find(
      (plannerGroupTile) =>
        plannerGroupTile.querySelector('.planner-slot-name')?.textContent?.trim() === 'Calm',
    )
    const mergedGroupTile = plannerGroupTiles.find(
      (plannerGroupTile) =>
        plannerGroupTile.querySelector('.planner-slot-name')?.textContent?.trim() === 'Calm / Deadeye',
    )

    return {
      groupGap: Math.round(groupGap),
      mergedGroupTileWidth:
        mergedGroupTile === undefined ? Number.NaN : Math.round(mergedGroupTile.getBoundingClientRect().width),
      perkTileWidth: perkTile === null ? Number.NaN : Math.round(perkTile.getBoundingClientRect().width),
      singleGroupTileWidth:
        singleGroupTile === undefined ? Number.NaN : Math.round(singleGroupTile.getBoundingClientRect().width),
    }
  })

  expect(plannerTileWidths.singleGroupTileWidth).toBe(plannerTileWidths.perkTileWidth)
  expect(
    Math.abs(
      plannerTileWidths.mergedGroupTileWidth -
        (plannerTileWidths.singleGroupTileWidth * 2 + plannerTileWidths.groupGap),
    ),
  ).toBeLessThanOrEqual(1)

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

  await page.goto(
    '/?build=Clarity&build=Peaceable&build=Perfect+Focus&build=Berserk&build=Killing+Frenzy&build=Fearsome&build=Colossus',
  )
  await expect(page.getByRole('heading', { level: 1, name: 'Perks browser' })).toBeVisible()
  await expect(getBuildPerksBar(page).locator('.planner-slot-perk')).toHaveCount(7)

  const plannerBarOverflow = await page.evaluate(() => {
    const buildPerksBar = document.querySelector('[data-testid="build-perks-bar"]') as HTMLElement | null
    const buildGroupsBar = document.querySelector('[data-testid="build-groups-bar"]') as HTMLElement | null

    return {
      buildGroupsBarHorizontalOverflow:
        buildGroupsBar === null ? Number.POSITIVE_INFINITY : buildGroupsBar.scrollWidth - buildGroupsBar.clientWidth,
      buildPerksBarHorizontalOverflow:
        buildPerksBar === null ? Number.POSITIVE_INFINITY : buildPerksBar.scrollWidth - buildPerksBar.clientWidth,
    }
  })

  expect(plannerBarOverflow.buildPerksBarHorizontalOverflow).toBeLessThanOrEqual(1)
  expect(plannerBarOverflow.buildGroupsBarHorizontalOverflow).toBeLessThanOrEqual(1)

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
