import { expect, test } from '@playwright/test'
import {
  addPerkToBuildFromResults,
  addSelectedPerkToBuild,
  getBuildIndividualGroupsList,
  getBuildPerksBar,
  getBuildSharedGroupsList,
  gotoPerksBrowser,
  inspectPerkFromResults,
  mediumPerksBrowserViewport,
  searchPerks,
} from './support/perks-browser'

const manyPickedPerkNames = [
  'Adaptive',
  'Adrenaline',
  'Albedo',
  'Alcohol Brewing',
  'Alert',
  'Align Joints',
  'Ambidextrous',
  'Ammunition Binding',
  'Ammunition Bundles',
  'Anatomical Studies',
  'Anchor',
  'Anticipation',
  'Arrange Bones',
  'Assassinate',
  'Assured Conquest',
  'Athlete',
  'Axe Mastery',
  'Back to Basics',
  'Backflip',
  'Backstabber',
  'Backswing',
  'Bags And Belts',
  'Balance',
  'Ballistics',
  'Bandage Mastery',
  'Barrage',
  'Battering Ram',
]

function createBuildUrl(perkNames: string[]): string {
  const buildValue = perkNames
    .map((perkName) => encodeURIComponent(perkName).replace(/%20/gu, '+'))
    .join(',')

  return `/?build=${buildValue}`
}

test('build planner splits shared and individual perk groups without internal scrolling', async ({
  page,
}) => {
  await gotoPerksBrowser(page, mediumPerksBrowserViewport)

  const initialHeaderHeight = await page
    .locator('.build-planner-header')
    .evaluate((element) => element.getBoundingClientRect().height)

  await expect(page.getByRole('heading', { name: 'BUILD PLANNER' })).toBeVisible()
  await expect(page.locator('.build-planner-summary')).toHaveCount(0)
  expect(initialHeaderHeight).toBeLessThanOrEqual(40)

  await searchPerks(page, 'Clarity')
  await inspectPerkFromResults(page, 'Clarity')

  const resultsRowHeightBeforePicking = await page
    .locator('.results-list .perk-row')
    .evaluate((element) => element.getBoundingClientRect().height)
  const plannerBoardHeightBeforePicking = await page
    .locator('.planner-board')
    .evaluate((element) => element.getBoundingClientRect().height)
  const plannerRowTopsBeforePicking = await page
    .locator('.planner-row')
    .evaluateAll((rows) => rows.map((row) => Math.round(row.getBoundingClientRect().top)))

  await addPerkToBuildFromResults(page, 'Clarity')
  await expect(getBuildPerksBar(page).getByText('Clarity')).toBeVisible()
  await expect(page.locator('.build-planner-summary')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Show build planner guidance' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Copy build link' })).toBeVisible()
  await expect
    .poll(async () =>
      page
        .locator('.build-planner-header')
        .evaluate((element) => element.getBoundingClientRect().height),
    )
    .toBeLessThanOrEqual(initialHeaderHeight + 1)
  await expect
    .poll(async () =>
      page
        .locator('.build-planner-header')
        .evaluate((element) => element.getBoundingClientRect().height),
    )
    .toBeGreaterThanOrEqual(initialHeaderHeight - 1)
  await expect
    .poll(async () =>
      page.locator('.planner-board').evaluate((element) => element.getBoundingClientRect().height),
    )
    .toBeLessThanOrEqual(plannerBoardHeightBeforePicking + 1)
  await expect
    .poll(async () =>
      page.locator('.planner-board').evaluate((element) => element.getBoundingClientRect().height),
    )
    .toBeGreaterThanOrEqual(plannerBoardHeightBeforePicking - 1)
  const plannerRowTopsAfterPicking = await page
    .locator('.planner-row')
    .evaluateAll((rows) => rows.map((row) => Math.round(row.getBoundingClientRect().top)))

  expect(plannerRowTopsAfterPicking).toHaveLength(plannerRowTopsBeforePicking.length)
  for (const [rowIndex, plannerRowTopBeforePicking] of plannerRowTopsBeforePicking.entries()) {
    expect(
      Math.abs(plannerRowTopsAfterPicking[rowIndex] - plannerRowTopBeforePicking),
    ).toBeLessThanOrEqual(1)
  }
  await expect(
    getBuildSharedGroupsList(page).getByText(
      'Perk groups covering 2 or more picked perks will appear here',
    ),
  ).toBeVisible()
  await expect(getBuildIndividualGroupsList(page).getByText('Calm', { exact: true })).toBeVisible()
  await expect(
    getBuildIndividualGroupsList(page).getByText('Clarity', { exact: true }),
  ).toBeVisible()

  const infoButton = page.getByRole('button', { name: 'Show build planner guidance' })
  const infoButtonText = await infoButton.textContent()
  const infoButtonStyle = await infoButton.evaluate((element) => {
    const computedStyle = window.getComputedStyle(element)

    return {
      fontFamily: computedStyle.fontFamily,
      cursor: computedStyle.cursor,
      textTransform: computedStyle.textTransform,
    }
  })

  expect(infoButtonText).toBe('i')
  expect(infoButtonStyle.cursor).toBe('help')
  expect(infoButtonStyle.textTransform).toBe('none')

  await infoButton.hover()
  const infoTooltipLeft = await page
    .locator('.build-planner-info-tooltip')
    .evaluate((element) => element.getBoundingClientRect().left)

  expect(infoTooltipLeft).toBeGreaterThanOrEqual(0)

  const resultsRowHeightAfterPicking = await page
    .locator('.results-list .perk-row')
    .evaluate((element) => element.getBoundingClientRect().height)

  expect(
    Math.abs(resultsRowHeightAfterPicking - resultsRowHeightBeforePicking),
  ).toBeLessThanOrEqual(1)

  const pickedPerkTile = getBuildPerksBar(page).locator('.planner-slot-perk').first()
  const hoverMetricsBefore = await pickedPerkTile.evaluate((element) => {
    const tileRectangle = element.getBoundingClientRect()
    const computedStyle = window.getComputedStyle(element)

    return {
      backgroundColor: computedStyle.backgroundColor,
      tileRectangle: {
        right: tileRectangle.right,
        top: tileRectangle.top,
      },
    }
  })

  await pickedPerkTile.hover()

  await expect(page.getByRole('tooltip')).toBeVisible({ timeout: 200 })
  await expect(page.getByRole('tooltip')).toContainText(
    /An additional \+10% of any damage ignores armor/i,
  )
  await expect(pickedPerkTile).toHaveCSS('transform', 'none')
  await expect
    .poll(async () =>
      pickedPerkTile.evaluate((element) => window.getComputedStyle(element, '::after').opacity),
    )
    .toBe('1')

  const hoverMetricsAfter = await pickedPerkTile.evaluate((element) => {
    const tileRectangle = element.getBoundingClientRect()
    const computedStyle = window.getComputedStyle(element)

    return {
      backgroundColor: computedStyle.backgroundColor,
      tileRectangle: {
        right: tileRectangle.right,
        top: tileRectangle.top,
      },
    }
  })

  expect(hoverMetricsAfter.backgroundColor).toBe(hoverMetricsBefore.backgroundColor)
  expect(
    Math.abs(hoverMetricsAfter.tileRectangle.top - hoverMetricsBefore.tileRectangle.top),
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(hoverMetricsAfter.tileRectangle.right - hoverMetricsBefore.tileRectangle.right),
  ).toBeLessThanOrEqual(1)

  await page.getByRole('button', { name: 'Clear build' }).click()
  await expect(getBuildPerksBar(page).locator('.planner-slot-perk')).toHaveCount(0)

  await searchPerks(page, 'Perfect Focus')
  await inspectPerkFromResults(page, 'Perfect Focus')
  await addPerkToBuildFromResults(page, 'Perfect Focus')

  await expect(getBuildPerksBar(page).locator('.planner-slot-perk')).toHaveCount(1)
  await expect(
    getBuildSharedGroupsList(page).getByText(
      'Perk groups covering 2 or more picked perks will appear here',
    ),
  ).toBeVisible()
  await expect(getBuildIndividualGroupsList(page).locator('.planner-group-card')).toHaveCount(1)
  await expect(
    getBuildIndividualGroupsList(page).getByText('Calm / Deadeye', { exact: true }),
  ).toBeVisible()
  await expect(
    getBuildIndividualGroupsList(page).getByText('Perfect Focus', { exact: true }),
  ).toBeVisible()

  await searchPerks(page, 'Peaceable')
  await inspectPerkFromResults(page, 'Peaceable')
  await addSelectedPerkToBuild(page, 'Peaceable')

  await searchPerks(page, 'Clarity')
  await inspectPerkFromResults(page, 'Clarity')
  await addPerkToBuildFromResults(page, 'Clarity')

  await expect(getBuildPerksBar(page).locator('.planner-slot-perk')).toHaveCount(3)
  await expect(getBuildSharedGroupsList(page).locator('.planner-group-card')).toHaveCount(1)
  await expect(getBuildSharedGroupsList(page).getByText('Calm', { exact: true })).toBeVisible()
  await expect(
    getBuildSharedGroupsList(page).getByText('Perfect Focus', { exact: true }),
  ).toBeVisible()
  await expect(getBuildSharedGroupsList(page).getByText('Peaceable', { exact: true })).toBeVisible()
  await expect(getBuildSharedGroupsList(page).getByText('Clarity', { exact: true })).toBeVisible()
  const sharedPerfectFocusPill = getBuildSharedGroupsList(page).getByRole('button', {
    name: 'Perfect Focus',
  })

  await sharedPerfectFocusPill.hover()
  await expect(page.getByRole('tooltip')).toContainText(/Unlocks the Perfect Focus skill/i)
  await expect(sharedPerfectFocusPill).toHaveCSS('transform', 'none')
  await expect(
    getBuildSharedGroupsList(page).getByRole('button', { name: 'Perfect Focus' }),
  ).toHaveClass(/is-highlighted/)
  await expect(
    getBuildIndividualGroupsList(page).getByRole('button', { name: 'Perfect Focus' }),
  ).toHaveClass(/is-highlighted/)
  await expect(
    getBuildPerksBar(page).getByRole('button', { name: 'Remove Perfect Focus from build' }),
  ).toHaveClass(/is-highlighted/)
  await expect(
    getBuildSharedGroupsList(page).getByRole('button', { name: 'Clarity' }),
  ).not.toHaveClass(/is-highlighted/)
  await expect(getBuildIndividualGroupsList(page).locator('.planner-group-card')).toHaveCount(1)
  await expect(
    getBuildIndividualGroupsList(page).getByText('Deadeye', { exact: true }),
  ).toBeVisible()
  await expect(
    getBuildIndividualGroupsList(page).getByText('Perfect Focus', { exact: true }),
  ).toBeVisible()
  await expect(page.getByText('Build 3', { exact: true })).toBeVisible()
  const plannerGroupCardWidths = await page
    .locator('.planner-group-card')
    .evaluateAll((elements) =>
      elements.map((element) => Math.round(element.getBoundingClientRect().width)),
    )

  expect(plannerGroupCardWidths.length).toBeGreaterThan(0)
  expect(Math.max(...plannerGroupCardWidths)).toBeLessThanOrEqual(230)

  await page.goto(
    '/?build=Clarity,Peaceable,Perfect+Focus,Berserk,Killing+Frenzy,Fearsome,Colossus',
  )
  await expect(page.getByRole('heading', { level: 1, name: 'Perks browser' })).toBeVisible()
  await expect(getBuildPerksBar(page).locator('.planner-slot-perk')).toHaveCount(7)
  expect(
    await getBuildSharedGroupsList(page).locator('.planner-group-card').count(),
  ).toBeGreaterThan(0)
  expect(
    await page.evaluate(() => {
      const plannerBoard = document.querySelector('.planner-board') as HTMLElement | null

      return plannerBoard === null
        ? Number.POSITIVE_INFINITY
        : plannerBoard.scrollHeight - plannerBoard.clientHeight
    }),
  ).toBeLessThanOrEqual(1)

  const perksBarHorizontalOverflow = await page.evaluate(() => {
    const buildPerksBar = document.querySelector(
      '[data-testid="build-perks-bar"]',
    ) as HTMLElement | null

    return buildPerksBar === null
      ? Number.POSITIVE_INFINITY
      : buildPerksBar.scrollWidth - buildPerksBar.clientWidth
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

test('groups perk groups by shared and individual perk coverage', async ({ page }) => {
  await gotoPerksBrowser(page)

  await page.goto('/?build=Battle+Forged,Immovable+Object,Steadfast')
  await expect(page.getByRole('heading', { level: 1, name: 'Perks browser' })).toBeVisible()

  const buildSharedGroupsList = getBuildSharedGroupsList(page)
  const buildIndividualGroupsList = getBuildIndividualGroupsList(page)

  await expect(buildSharedGroupsList).toContainText('Heavy Armor')
  await expect(buildSharedGroupsList).toContainText('Forceful')
  await expect(buildSharedGroupsList).toContainText('Battle Forged')
  await expect(buildSharedGroupsList).toContainText('Immovable Object')
  await expect(buildSharedGroupsList).toContainText('Steadfast')
  await expect(buildSharedGroupsList.locator('.planner-group-card')).toHaveCount(2)
  await expect(
    buildIndividualGroupsList.getByText('Sturdy / Swordmasters', { exact: true }),
  ).toBeVisible()
  await expect(buildIndividualGroupsList.getByText('Steadfast', { exact: true })).toBeVisible()
  await expect(buildIndividualGroupsList.locator('.planner-group-card')).toHaveCount(1)
})

test('links search result hover highlighting with matching build planner perks', async ({
  page,
}) => {
  await gotoPerksBrowser(page, mediumPerksBrowserViewport)

  await searchPerks(page, 'Clarity')
  await addPerkToBuildFromResults(page, 'Clarity')

  await searchPerks(page, 'Perfect Focus')
  await addPerkToBuildFromResults(page, 'Perfect Focus')

  const perfectFocusResultsButton = page.getByRole('button', { name: 'Inspect Perfect Focus' })
  const perfectFocusResultsRow = page.locator('.perk-row', {
    has: perfectFocusResultsButton,
  })
  const sharedPerfectFocusButton = getBuildSharedGroupsList(page).getByRole('button', {
    name: 'Perfect Focus',
  })
  const individualPerfectFocusButton = getBuildIndividualGroupsList(page).getByRole('button', {
    name: 'Perfect Focus',
  })
  const pickedPerfectFocusButton = getBuildPerksBar(page).getByRole('button', {
    name: 'Remove Perfect Focus from build',
  })

  await perfectFocusResultsButton.hover()

  await expect(perfectFocusResultsRow).toHaveClass(/is-highlighted/)
  await expect(sharedPerfectFocusButton).toHaveClass(/is-highlighted/)
  await expect(individualPerfectFocusButton).toHaveClass(/is-highlighted/)
  await expect(pickedPerfectFocusButton).toHaveClass(/is-highlighted/)

  await sharedPerfectFocusButton.hover()

  await expect(perfectFocusResultsRow).toHaveClass(/is-highlighted/)
  await expect(sharedPerfectFocusButton).toHaveClass(/is-highlighted/)
  await expect(individualPerfectFocusButton).toHaveClass(/is-highlighted/)
  await expect(pickedPerfectFocusButton).toHaveClass(/is-highlighted/)
  await expect(perfectFocusResultsRow).toHaveCSS('transform', 'none')
  await expect(sharedPerfectFocusButton).toHaveCSS('transform', 'none')
  await expect(individualPerfectFocusButton).toHaveCSS('transform', 'none')
  await expect(pickedPerfectFocusButton).toHaveCSS('transform', 'none')
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
  await expect(
    getBuildPerksBar(page).getByText(
      'Use the star in the detail panel or the search results list.',
    ),
  ).toBeVisible()
  const placeholderMetrics = await getBuildPerksBar(page).evaluate((buildPerksBar) => {
    const placeholder = buildPerksBar.querySelector(
      '.planner-slot-placeholder',
    ) as HTMLElement | null
    const placeholderMeta = buildPerksBar.querySelector('.planner-slot-meta') as HTMLElement | null

    if (!placeholder || !placeholderMeta) {
      return null
    }

    return {
      metaOverflow: placeholderMeta.scrollWidth - placeholderMeta.clientWidth,
      placeholderWidth: Math.round(placeholder.getBoundingClientRect().width),
      trackWidth: Math.round(buildPerksBar.getBoundingClientRect().width),
    }
  })

  expect(placeholderMetrics).not.toBeNull()
  expect(placeholderMetrics!.placeholderWidth).toBeGreaterThanOrEqual(
    placeholderMetrics!.trackWidth - 1,
  )
  expect(placeholderMetrics!.metaOverflow).toBeLessThanOrEqual(1)
  await expect(
    getBuildSharedGroupsList(page).getByText(
      'Perk groups covering 2 or more picked perks will appear here',
    ),
  ).toBeVisible()
  await expect(
    getBuildIndividualGroupsList(page).getByText('Single-perk groups will appear here'),
  ).toBeVisible()
})

test('keeps the picked count and clear action aligned for dense builds', async ({ page }) => {
  await gotoPerksBrowser(page, mediumPerksBrowserViewport)
  await page.goto(createBuildUrl(manyPickedPerkNames))

  await expect(page.getByText('27 perks picked.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Clear build' })).toBeEnabled()

  const actionMetrics = await page.evaluate(() => {
    const count = document.querySelector('.build-planner-count') as HTMLElement | null
    const clearButton = document.querySelector(
      '.planner-action-button[aria-label="Clear build"]',
    ) as HTMLElement | null

    if (!count || !clearButton) {
      return null
    }

    const countRectangle = count.getBoundingClientRect()
    const clearButtonRectangle = clearButton.getBoundingClientRect()

    return {
      clearButtonCenter: clearButtonRectangle.top + clearButtonRectangle.height / 2,
      countCenter: countRectangle.top + countRectangle.height / 2,
    }
  })

  expect(actionMetrics).not.toBeNull()
  expect(
    Math.abs(actionMetrics!.clearButtonCenter - actionMetrics!.countCenter),
  ).toBeLessThanOrEqual(1)
})
