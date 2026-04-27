import { expect, test, type Page } from '@playwright/test'
import {
  addPerkToBuildFromResults,
  addSelectedPerkToBuild,
  expectNoDocumentHorizontalOverflow,
  getBuildIndividualGroupsList,
  getBuildPerksBar,
  getBuildSharedGroupsList,
  getSidebarPerkGroupButton,
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

function getParsedCssRgbColor(cssColor: string) {
  const colorMatch = cssColor.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(0|1|0?\.\d+))?\)$/u)

  if (!colorMatch) {
    throw new Error(`Unable to parse CSS rgb color: ${cssColor}`)
  }

  return {
    alpha: colorMatch[4] === undefined ? 1 : Number(colorMatch[4]),
    blue: Number(colorMatch[3]),
    green: Number(colorMatch[2]),
    red: Number(colorMatch[1]),
  }
}

function doCssRgbColorsMatch(actualColor: string, expectedColor: string) {
  const actual = getParsedCssRgbColor(actualColor)
  const expectedColorParts = getParsedCssRgbColor(expectedColor)

  return (
    actual.red === expectedColorParts.red &&
    actual.green === expectedColorParts.green &&
    actual.blue === expectedColorParts.blue &&
    Math.abs(actual.alpha - expectedColorParts.alpha) <= 0.001
  )
}

function expectCssRgbColorsToMatch(actualColor: string, expectedColor: string) {
  expect(doCssRgbColorsMatch(actualColor, expectedColor)).toBe(true)
}

async function waitForCssRgbColor(
  getCssColor: () => Promise<string>,
  expectedColor: string,
): Promise<void> {
  await expect.poll(async () => doCssRgbColorsMatch(await getCssColor(), expectedColor)).toBe(true)
}

async function getResolvedCssBackgroundColor(page: Page, cssBackgroundValue: string) {
  return page.evaluate((backgroundValue) => {
    const colorProbe = document.createElement('div')
    colorProbe.style.background = backgroundValue
    document.body.append(colorProbe)
    const resolvedColor = window.getComputedStyle(colorProbe).backgroundColor

    colorProbe.remove()

    return resolvedColor
  }, cssBackgroundValue)
}

async function getResolvedCssBorderColor(page: Page, cssBorderColorValue: string) {
  return page.evaluate((borderColorValue) => {
    const colorProbe = document.createElement('div')
    colorProbe.style.borderTopColor = borderColorValue
    document.body.append(colorProbe)
    const resolvedColor = window.getComputedStyle(colorProbe).borderTopColor

    colorProbe.remove()

    return resolvedColor
  }, cssBorderColorValue)
}

async function getPlannerWrapMetrics(page: Page) {
  return page.evaluate(() => {
    function getVisualRowCount(listSelector: string, itemSelector: string) {
      const listElement = document.querySelector(listSelector)

      if (!(listElement instanceof HTMLElement)) {
        return 0
      }

      const visualRowTops: number[] = []
      const itemElements = [...listElement.querySelectorAll(itemSelector)].filter(
        (element): element is HTMLElement => element instanceof HTMLElement,
      )

      for (const itemElement of itemElements) {
        const itemElementBox = itemElement.getBoundingClientRect()

        if (itemElementBox.width === 0 || itemElementBox.height === 0) {
          continue
        }

        if (
          !visualRowTops.some((visualRowTop) => Math.abs(visualRowTop - itemElementBox.top) <= 2)
        ) {
          visualRowTops.push(itemElementBox.top)
        }
      }

      return visualRowTops.length
    }

    const buildPlanner = document.querySelector('[aria-label="Build planner"]') as HTMLElement | null
    const plannerBoard = document.querySelector('[data-testid="planner-board"]') as HTMLElement | null

    return {
      boardOverflow:
        plannerBoard === null
          ? Number.POSITIVE_INFINITY
          : plannerBoard.scrollHeight - plannerBoard.clientHeight,
      isScrollConstrained: buildPlanner?.dataset.scrollConstrained === 'true',
      individualRows: getVisualRowCount(
        '[data-testid="build-individual-groups-list"]',
        '[data-testid="planner-group-card"]',
      ),
      perkRows: getVisualRowCount('[data-testid="build-perks-bar"]', '[data-testid="planner-slot-perk"]'),
      sharedRows: getVisualRowCount(
        '[data-testid="build-shared-groups-list"]',
        '[data-testid="planner-group-card"]',
      ),
    }
  })
}

test('build planner splits shared and individual perk groups without layout drift', async ({
  page,
}) => {
  await gotoPerksBrowser(page, { height: 768, width: 1366 })

  const initialHeaderHeight = await page
    .getByTestId('build-planner-header')
    .evaluate((element) => element.getBoundingClientRect().height)
  const headerHeightSubpixelTolerance = 2

  await expect(page.getByRole('heading', { level: 2, name: 'Build planner' })).toBeVisible()
  await expect(page.getByTestId('build-planner-summary')).toHaveCount(0)
  expect(initialHeaderHeight).toBeLessThanOrEqual(40)

  await searchPerks(page, 'Clarity')
  await inspectPerkFromResults(page, 'Clarity')

  const resultsRowHeightBeforePicking = await page
    .getByTestId('results-list').getByTestId('perk-row')
    .evaluate((element) => element.getBoundingClientRect().height)
  const plannerBoardHeightBeforePicking = await page
    .getByTestId('planner-board')
    .evaluate((element) => element.getBoundingClientRect().height)
  const plannerRowTopsBeforePicking = await page
    .getByTestId('planner-row')
    .evaluateAll((rows) => rows.map((row) => Math.round(row.getBoundingClientRect().top)))

  await addPerkToBuildFromResults(page, 'Clarity')
  await expect(getBuildPerksBar(page).getByText('Clarity')).toBeVisible()
  await expect(page.getByTestId('build-planner-summary')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Show build planner guidance' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Copy build link' })).toBeVisible()
  await expect
    .poll(async () =>
      page
        .getByTestId('build-planner-header')
        .evaluate((element) => element.getBoundingClientRect().height),
    )
    .toBeLessThanOrEqual(initialHeaderHeight + 8)
  await expect
    .poll(async () =>
      page
        .getByTestId('build-planner-header')
        .evaluate((element) => element.getBoundingClientRect().height),
    )
    .toBeGreaterThanOrEqual(initialHeaderHeight - headerHeightSubpixelTolerance)
  await expect
    .poll(async () =>
      page
        .getByTestId('planner-board')
        .evaluate((element) => element.scrollHeight - element.clientHeight),
    )
    .toBeLessThanOrEqual(1)
  await expect
    .poll(async () =>
      page.getByTestId('planner-board').evaluate((element) => element.getBoundingClientRect().height),
    )
    .toBeGreaterThanOrEqual(plannerBoardHeightBeforePicking - 8)
  const plannerRowTopsAfterPicking = await page
    .getByTestId('planner-row')
    .evaluateAll((rows) => rows.map((row) => Math.round(row.getBoundingClientRect().top)))

  expect(plannerRowTopsAfterPicking).toHaveLength(plannerRowTopsBeforePicking.length)
  for (const [rowIndex, plannerRowTopBeforePicking] of plannerRowTopsBeforePicking.entries()) {
    expect(
      Math.abs(plannerRowTopsAfterPicking[rowIndex] - plannerRowTopBeforePicking),
    ).toBeLessThanOrEqual(8)
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
  const plannerSectionToggleTypography = await page
    .getByTestId('planner-section-toggle')
    .evaluateAll((toggles) => {
      const fontSizeProbe = document.createElement('span')
      fontSizeProbe.style.fontSize = 'var(--font-size-xs)'
      document.body.append(fontSizeProbe)
      const bodyFontFamily = window.getComputedStyle(document.body).fontFamily
      const expectedFontSize = window.getComputedStyle(fontSizeProbe).fontSize
      fontSizeProbe.remove()

      return toggles.map((toggle) => {
        const computedStyle = window.getComputedStyle(toggle)

        return {
          bodyFontFamily,
          expectedFontSize,
          fontFamily: computedStyle.fontFamily,
          fontSize: computedStyle.fontSize,
          fontWeight: computedStyle.fontWeight,
          textTransform: computedStyle.textTransform,
        }
      })
    })

  expect(plannerSectionToggleTypography).toHaveLength(2)
  for (const toggleTypography of plannerSectionToggleTypography) {
    expect(toggleTypography.fontFamily).toBe(toggleTypography.bodyFontFamily)
    expect(toggleTypography.fontSize).toBe(toggleTypography.expectedFontSize)
    expect(Number(toggleTypography.fontWeight)).toBeGreaterThanOrEqual(600)
    expect(toggleTypography.textTransform).toBe('uppercase')
  }

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
    .getByTestId('build-planner-info-tooltip')
    .evaluate((element) => element.getBoundingClientRect().left)

  expect(infoTooltipLeft).toBeGreaterThanOrEqual(0)
  await page.mouse.move(1, 1)
  await expect(page.getByRole('tooltip')).toHaveCount(0)

  const resultsRowHeightAfterPicking = await page
    .getByTestId('results-list').getByTestId('perk-row')
    .evaluate((element) => element.getBoundingClientRect().height)

  expect(
    Math.abs(resultsRowHeightAfterPicking - resultsRowHeightBeforePicking),
  ).toBeLessThanOrEqual(1)

  const pickedPerkTile = getBuildPerksBar(page).getByTestId('planner-slot-perk').first()
  const activePlannerSurfaceColor = await getResolvedCssBackgroundColor(
    page,
    'var(--surface-result-active)',
  )
  const activePlannerBorderColor = await getResolvedCssBorderColor(page, 'var(--border-strong)')
  const plannerGroupCard = getBuildIndividualGroupsList(page).getByTestId('planner-group-card').first()

  await plannerGroupCard.hover()
  await expect
    .poll(() =>
      plannerGroupCard.evaluate((element) => window.getComputedStyle(element).backgroundColor),
    )
    .toBe(activePlannerSurfaceColor)
  await waitForCssRgbColor(
    () => plannerGroupCard.evaluate((element) => window.getComputedStyle(element).borderTopColor),
    activePlannerBorderColor,
  )
  const hoveredGroupCardStyle = await plannerGroupCard.evaluate((element) => {
    const computedStyle = window.getComputedStyle(element)

    return {
      backgroundColor: computedStyle.backgroundColor,
      borderColor: computedStyle.borderTopColor,
    }
  })
  await page.mouse.move(1, 1)
  await expect(pickedPerkTile).toHaveAttribute('data-highlighted', 'false')

  const hoverMetricsBefore = await pickedPerkTile.evaluate((element) => {
    const tileRectangle = element.getBoundingClientRect()
    const computedStyle = window.getComputedStyle(element)

    return {
      backgroundColor: computedStyle.backgroundColor,
      borderColor: computedStyle.borderTopColor,
      tileRectangle: {
        right: tileRectangle.right,
        top: tileRectangle.top,
      },
    }
  })

  const pickedPerkRemoveControl = pickedPerkTile.getByTestId('planner-slot-remove-button')
  await expect(pickedPerkRemoveControl).toBeHidden()

  await pickedPerkTile.hover()
  const pickedPerkRemoveButton = pickedPerkTile.getByRole('button', {
    name: 'Remove Clarity from build',
  })

  await expect(pickedPerkTile).toHaveAttribute('data-tooltip-pending', 'false')
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  await expect(pickedPerkTile).toHaveAttribute('data-tooltip-pending', 'true', { timeout: 500 })
  const tooltipTimerStyle = await pickedPerkTile.evaluate((element) => {
    const computedStyle = window.getComputedStyle(element, '::after')

    return {
      animationDuration: computedStyle.animationDuration,
      height: computedStyle.height,
      opacity: computedStyle.opacity,
    }
  })

  expect(tooltipTimerStyle).toEqual({
    animationDuration: '0.5s',
    height: '2px',
    opacity: '1',
  })
  await expect(pickedPerkTile).toHaveCSS('transform', 'none')
  await expect(pickedPerkRemoveControl).toBeVisible()
  await expect(pickedPerkRemoveButton).toBeVisible()
  await pickedPerkRemoveButton.hover()
  await expect
    .poll(() =>
      pickedPerkTile.evaluate((element) => window.getComputedStyle(element).backgroundColor),
    )
    .toBe(activePlannerSurfaceColor)
  await waitForCssRgbColor(
    () => pickedPerkTile.evaluate((element) => window.getComputedStyle(element).borderTopColor),
    activePlannerBorderColor,
  )

  const hoverMetricsAfter = await pickedPerkTile.evaluate((element) => {
    const tileRectangle = element.getBoundingClientRect()
    const computedStyle = window.getComputedStyle(element)

    return {
      backgroundColor: computedStyle.backgroundColor,
      borderColor: computedStyle.borderTopColor,
      tileRectangle: {
        right: tileRectangle.right,
        top: tileRectangle.top,
      },
    }
  })

  expect(hoverMetricsAfter.backgroundColor).toBe(activePlannerSurfaceColor)
  expect(hoverMetricsAfter.backgroundColor).toBe(hoveredGroupCardStyle.backgroundColor)
  expectCssRgbColorsToMatch(hoverMetricsAfter.borderColor, hoveredGroupCardStyle.borderColor)
  expect(
    Math.abs(hoverMetricsAfter.tileRectangle.top - hoverMetricsBefore.tileRectangle.top),
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(hoverMetricsAfter.tileRectangle.right - hoverMetricsBefore.tileRectangle.right),
  ).toBeLessThanOrEqual(1)

  const buildPerkTooltip = page.getByRole('tooltip')

  await expect(buildPerkTooltip).toBeVisible({ timeout: 1200 })
  await expect(pickedPerkTile).toHaveAttribute('data-tooltip-pending', 'true')
  await expect(buildPerkTooltip.getByTestId('build-perk-tooltip-title')).toHaveCount(0)
  await expect(buildPerkTooltip).not.toContainText('Clarity')
  await expect(buildPerkTooltip).toContainText(/An additional \+10% of any damage ignores armor/i)
  const tooltipTouchGap = await page.evaluate(() => {
    const tooltip = document.querySelector('[data-testid="build-perk-tooltip"]')
    const activeTrigger = document.querySelector('[data-testid="planner-slot-perk"][data-tooltip-pending="true"]')

    if (!(tooltip instanceof HTMLElement) || !(activeTrigger instanceof HTMLElement)) {
      return Number.POSITIVE_INFINITY
    }

    return tooltip.getBoundingClientRect().top - activeTrigger.getBoundingClientRect().bottom
  })

  expect(Math.abs(tooltipTouchGap)).toBeLessThanOrEqual(1)
  await buildPerkTooltip.hover()
  await expect(buildPerkTooltip).toBeVisible()
  await expect(pickedPerkTile).toHaveAttribute('data-tooltip-pending', 'true')
  await page.mouse.move(1, 1)
  await expect(buildPerkTooltip).toHaveCount(0)

  await page.goto(
    '/?build=Clarity,Peaceable,Perfect+Focus,Berserk,Killing+Frenzy,Fearsome,Colossus',
  )
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()
  await expect(getBuildPerksBar(page).getByTestId('planner-slot-perk')).toHaveCount(7)
  await expect(page.getByRole('region', { name: 'Build planner' })).toHaveAttribute('data-scroll-constrained', 'false')
  expect(
    await getBuildSharedGroupsList(page).getByTestId('planner-group-card').count(),
  ).toBeGreaterThan(0)
  expect(
    await page.evaluate(() => {
      const plannerBoard = document.querySelector('[data-testid="planner-board"]') as HTMLElement | null

      return plannerBoard === null
        ? Number.NEGATIVE_INFINITY
        : plannerBoard.scrollHeight - plannerBoard.clientHeight
    }),
  ).toBeLessThanOrEqual(1)

  await page.setViewportSize({ height: 768, width: 1280 })
  await expect(page.getByRole('region', { name: 'Build planner' })).toHaveAttribute('data-scroll-constrained', 'false')
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const plannerBoard = document.querySelector('[data-testid="planner-board"]') as HTMLElement | null

        return plannerBoard === null
          ? Number.NEGATIVE_INFINITY
          : plannerBoard.scrollHeight - plannerBoard.clientHeight
      }),
    )
    .toBeLessThanOrEqual(1)

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
    .getByTestId('planner-slot-perk')
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

test('scrolls the planner below wide desktop only after content wraps past two rows', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto(createBuildUrl(manyPickedPerkNames.slice(0, 7)))
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()

  const twoRowPlannerMetrics = await getPlannerWrapMetrics(page)

  expect(twoRowPlannerMetrics.isScrollConstrained).toBe(false)
  expect(twoRowPlannerMetrics.boardOverflow).toBeLessThanOrEqual(1)
  expect(
    Math.max(
      twoRowPlannerMetrics.perkRows,
      twoRowPlannerMetrics.sharedRows,
      twoRowPlannerMetrics.individualRows,
    ),
  ).toBeLessThanOrEqual(2)

  await page.goto(createBuildUrl(manyPickedPerkNames.slice(0, 12)))
  await expect(page.getByText('12 perks picked.')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Build planner' })).toHaveAttribute('data-scroll-constrained', 'true')

  const overflowingPlannerMetrics = await getPlannerWrapMetrics(page)

  expect(overflowingPlannerMetrics.boardOverflow).toBeGreaterThan(20)
  expect(
    Math.max(
      overflowingPlannerMetrics.perkRows,
      overflowingPlannerMetrics.sharedRows,
      overflowingPlannerMetrics.individualRows,
    ),
  ).toBeGreaterThan(2)

  await page.setViewportSize({ width: 2560, height: 900 })
  await page.goto(createBuildUrl(manyPickedPerkNames))
  await expect(page.getByText('27 perks picked.')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Build planner' })).toHaveAttribute('data-scroll-constrained', 'false')

  const wideDesktopPlannerMetrics = await getPlannerWrapMetrics(page)

  expect(wideDesktopPlannerMetrics.boardOverflow).toBeLessThanOrEqual(1)
})

test('groups perk groups by shared and individual perk coverage', async ({ page }) => {
  await gotoPerksBrowser(page)

  await page.goto('/?build=Battle+Forged,Immovable+Object,Steadfast')
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()

  const buildSharedGroupsList = getBuildSharedGroupsList(page)
  const buildIndividualGroupsList = getBuildIndividualGroupsList(page)

  await expect(buildSharedGroupsList).toContainText('Heavy Armor')
  await expect(buildSharedGroupsList).toContainText('Forceful')
  await expect(buildSharedGroupsList).toContainText('Battle Forged')
  await expect(buildSharedGroupsList).toContainText('Immovable Object')
  await expect(buildSharedGroupsList).toContainText('Steadfast')
  await expect(buildSharedGroupsList.getByTestId('planner-group-card')).toHaveCount(2)
  await expect(
    buildIndividualGroupsList.getByText('Sturdy / Swordmasters', { exact: true }),
  ).toBeVisible()
  await expect(buildIndividualGroupsList.getByText('Steadfast', { exact: true })).toBeVisible()
  await expect(buildIndividualGroupsList.getByTestId('planner-group-card')).toHaveCount(1)
})

test('collapses and restores build planner perk group sections independently', async ({ page }) => {
  await gotoPerksBrowser(page, { height: 768, width: 1366 })
  await page.goto('/?build=Battle+Forged,Immovable+Object,Steadfast')
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()

  const buildSharedGroupsList = getBuildSharedGroupsList(page)
  const buildIndividualGroupsList = getBuildIndividualGroupsList(page)
  const sharedCollapseToggle = page.getByRole('button', {
    name: 'Collapse perk groups for 2+ perks',
  })
  const individualCollapseToggle = page.getByRole('button', {
    name: 'Collapse perk groups for individual perks',
  })

  await expect(sharedCollapseToggle).toBeVisible()
  await expect(sharedCollapseToggle).toHaveAttribute('aria-expanded', 'true')
  await expect(individualCollapseToggle).toBeVisible()
  await expect(individualCollapseToggle).toHaveAttribute('aria-expanded', 'true')
  await expect(buildSharedGroupsList.getByTestId('planner-group-card')).toHaveCount(2)
  await expect(buildIndividualGroupsList.getByTestId('planner-group-card')).toHaveCount(1)

  const sharedControlsId = await sharedCollapseToggle.getAttribute('aria-controls')
  const individualControlsId = await individualCollapseToggle.getAttribute('aria-controls')

  if (sharedControlsId === null || individualControlsId === null) {
    throw new Error('Planner group section toggles must control their section bodies.')
  }

  await expect(buildSharedGroupsList).toHaveAttribute('id', sharedControlsId)
  await expect(buildIndividualGroupsList).toHaveAttribute('id', individualControlsId)

  const expandedPlannerBoardHeight = await page
    .getByTestId('planner-board')
    .evaluate((plannerBoard) => plannerBoard.getBoundingClientRect().height)
  const expandedSharedSectionHeight = await buildSharedGroupsList.evaluate(
    (plannerSection) => plannerSection.getBoundingClientRect().height,
  )
  const expandedIndividualSectionHeight = await buildIndividualGroupsList.evaluate(
    (plannerSection) => plannerSection.getBoundingClientRect().height,
  )

  expect(expandedSharedSectionHeight).toBeGreaterThan(40)
  expect(expandedIndividualSectionHeight).toBeGreaterThan(40)

  const expandedSharedToggleTop = await sharedCollapseToggle.evaluate(
    (toggle) => toggle.getBoundingClientRect().top,
  )
  await sharedCollapseToggle.click()
  const sharedExpandToggle = page.getByRole('button', { name: 'Expand perk groups for 2+ perks' })
  await expect(sharedExpandToggle).toHaveAttribute('aria-expanded', 'false')
  await expect(buildSharedGroupsList).toBeHidden()
  await expect(buildIndividualGroupsList).toBeVisible()
  await expect(page.getByTestId('planner-collapsed-sections')).toHaveCount(0)

  const sharedCollapsedPlannerBoardHeight = await page
    .getByTestId('planner-board')
    .evaluate((plannerBoard) => plannerBoard.getBoundingClientRect().height)
  const sharedCollapsedSectionHeight = await buildSharedGroupsList.evaluate(
    (plannerSection) => plannerSection.getBoundingClientRect().height,
  )
  const sharedCollapsedToggleMetrics = await sharedExpandToggle.evaluate((toggle) => {
    const toggleRectangle = toggle.getBoundingClientRect()

    return {
      bottom: toggleRectangle.bottom,
      height: toggleRectangle.height,
      top: toggleRectangle.top,
    }
  })
  const sharedCollapsedToggleRow = sharedExpandToggle.locator(
    'xpath=ancestor::*[@data-testid="planner-row"][1]',
  )
  const sharedCollapsedToggleRowBottom = await sharedCollapsedToggleRow.evaluate(
    (row) => row.getBoundingClientRect().bottom,
  )

  expect(sharedCollapsedSectionHeight).toBeLessThanOrEqual(1)
  await expect(sharedCollapsedToggleRow).toContainText('Perks')
  expect(await page.getByTestId('planner-row').count()).toBe(2)
  expect(sharedCollapsedToggleMetrics.top).toBeLessThan(expandedSharedToggleTop - 1)
  expect(
    Math.abs(sharedCollapsedToggleRowBottom - sharedCollapsedToggleMetrics.bottom),
  ).toBeLessThanOrEqual(1)
  expect(sharedCollapsedToggleMetrics.height).toBeLessThan(36)
  expect(sharedCollapsedPlannerBoardHeight).toBeLessThan(expandedPlannerBoardHeight - 1)

  await page.getByRole('button', { name: 'Expand perk groups for 2+ perks' }).click()
  await expect(buildSharedGroupsList.getByTestId('planner-group-card')).toHaveCount(2)
  await expect(buildSharedGroupsList).toBeVisible()

  const expandedIndividualToggleTop = await individualCollapseToggle.evaluate(
    (toggle) => toggle.getBoundingClientRect().top,
  )
  await individualCollapseToggle.click()
  const individualExpandToggle = page.getByRole('button', {
    name: 'Expand perk groups for individual perks',
  })
  await expect(individualExpandToggle).toHaveAttribute('aria-expanded', 'false')
  await expect(buildSharedGroupsList).toBeVisible()
  await expect(buildIndividualGroupsList).toBeHidden()

  const individualCollapsedPlannerBoardHeight = await page
    .getByTestId('planner-board')
    .evaluate((plannerBoard) => plannerBoard.getBoundingClientRect().height)
  const individualCollapsedSectionHeight = await buildIndividualGroupsList.evaluate(
    (plannerSection) => plannerSection.getBoundingClientRect().height,
  )
  const individualCollapsedToggleMetrics = await individualExpandToggle.evaluate((toggle) => {
    const toggleRectangle = toggle.getBoundingClientRect()

    return {
      bottom: toggleRectangle.bottom,
      height: toggleRectangle.height,
      top: toggleRectangle.top,
    }
  })
  const individualCollapsedToggleRow = individualExpandToggle.locator(
    'xpath=ancestor::*[@data-testid="planner-row"][1]',
  )
  const individualCollapsedToggleRowBottom = await individualCollapsedToggleRow.evaluate(
    (row) => row.getBoundingClientRect().bottom,
  )

  expect(individualCollapsedSectionHeight).toBeLessThanOrEqual(1)
  await expect(individualCollapsedToggleRow).toContainText('Perk groups for 2+ perks')
  expect(await page.getByTestId('planner-row').count()).toBe(2)
  expect(individualCollapsedToggleMetrics.top).toBeLessThan(expandedIndividualToggleTop - 1)
  expect(
    Math.abs(individualCollapsedToggleRowBottom - individualCollapsedToggleMetrics.bottom),
  ).toBeLessThanOrEqual(1)
  expect(individualCollapsedToggleMetrics.height).toBeLessThan(36)
  expect(individualCollapsedPlannerBoardHeight).toBeLessThan(expandedPlannerBoardHeight - 1)

  await page.getByRole('button', { name: 'Expand perk groups for individual perks' }).click()
  await expect(buildIndividualGroupsList.getByTestId('planner-group-card')).toHaveCount(1)
  await expect(buildIndividualGroupsList).toBeVisible()
})

test('keeps collapsible planner group labels compact on mobile', async ({ page }) => {
  await gotoPerksBrowser(page, { height: 844, width: 390 })
  await page.goto('/?build=Battle+Forged,Immovable+Object,Steadfast')
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()
  await expectNoDocumentHorizontalOverflow(page)

  const buildSharedGroupsList = getBuildSharedGroupsList(page)
  const buildIndividualGroupsList = getBuildIndividualGroupsList(page)
  const sharedCollapseToggle = page.getByRole('button', {
    name: 'Collapse perk groups for 2+ perks',
  })
  const individualCollapseToggle = page.getByRole('button', {
    name: 'Collapse perk groups for individual perks',
  })

  await expect(sharedCollapseToggle).toHaveAttribute('aria-expanded', 'true')
  await expect(individualCollapseToggle).toHaveAttribute('aria-expanded', 'true')
  await expect(buildSharedGroupsList).toBeVisible()
  await expect(buildIndividualGroupsList).toBeVisible()

  const toggleMetrics = await page.evaluate(() => {
    const toggles = [...document.querySelectorAll<HTMLElement>('[data-testid="planner-section-toggle"]')]
      .map((toggle) => toggle.getBoundingClientRect())

    return toggles.map((toggleRectangle) => ({
      height: toggleRectangle.height,
      width: toggleRectangle.width,
    }))
  })

  expect(toggleMetrics).toHaveLength(2)
  for (const toggleMetric of toggleMetrics) {
    expect(toggleMetric.height).toBeLessThanOrEqual(48)
    expect(toggleMetric.width).toBeLessThan(260)
  }

  await sharedCollapseToggle.click()
  await individualCollapseToggle.click()
  await expect(buildSharedGroupsList).toBeHidden()
  await expect(buildIndividualGroupsList).toBeHidden()
  await expectNoDocumentHorizontalOverflow(page)
  await expect(page.getByTestId('planner-collapsed-sections')).toHaveCount(0)

  const collapsedToggleMetrics = await page.evaluate(() => {
    const toggles = [...document.querySelectorAll<HTMLElement>('[data-testid="planner-section-toggle"]')]
      .filter((toggle) => toggle.getAttribute('aria-expanded') === 'false')
      .map((toggle) => toggle.getBoundingClientRect())

    return toggles.map((toggleRectangle) => ({
      height: toggleRectangle.height,
      width: toggleRectangle.width,
    }))
  })

  expect(collapsedToggleMetrics).toHaveLength(2)
  for (const collapsedToggleMetric of collapsedToggleMetrics) {
    expect(collapsedToggleMetric.height).toBeLessThan(36)
    expect(collapsedToggleMetric.width).toBeLessThan(260)
  }

  await page.getByRole('button', { name: 'Expand perk groups for 2+ perks' }).click()
  await page.getByRole('button', { name: 'Expand perk groups for individual perks' }).click()
  await expect(buildSharedGroupsList.getByTestId('planner-group-card')).toHaveCount(2)
  await expect(buildIndividualGroupsList.getByTestId('planner-group-card')).toHaveCount(1)
  await expectNoDocumentHorizontalOverflow(page)
})

test('selects build planner perk groups from their group tiles', async ({ page }) => {
  await gotoPerksBrowser(page)

  await page.goto('/?build=Battle+Forged,Immovable+Object,Steadfast')
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()
  await searchPerks(page, 'temporary search')

  const heavyArmorGroupCard = getBuildSharedGroupsList(page)
    .getByTestId('planner-group-card')
    .filter({ hasText: 'Heavy Armor' })

  await heavyArmorGroupCard.click({
    position: {
      x: 96,
      y: 38,
    },
  })

  await expect(page.getByLabel('Search perks')).toHaveValue('')
  await expect(page.getByRole('button', { name: 'Disable category Defense' })).toBeVisible()
  await expect(getSidebarPerkGroupButton(page, 'Heavy Armor')).toHaveAttribute('aria-pressed', 'true')

  const emptyPillListPosition = await heavyArmorGroupCard.evaluate((card) => {
    const pillList = card.querySelector('[data-testid="planner-pill-list"]')

    if (!(pillList instanceof HTMLElement)) {
      return null
    }

    const cardRectangle = card.getBoundingClientRect()
    const pillListRectangle = pillList.getBoundingClientRect()
    const pillRectangles = [...pillList.querySelectorAll('[data-testid="planner-pill"]')].map((pill) =>
      pill.getBoundingClientRect(),
    )
    const sampleStep = 8

    for (
      let y = pillListRectangle.top + sampleStep;
      y < pillListRectangle.bottom - sampleStep;
      y += sampleStep
    ) {
      for (
        let x = pillListRectangle.left + sampleStep;
        x < pillListRectangle.right - sampleStep;
        x += sampleStep
      ) {
        const isInsidePill = pillRectangles.some(
          (pillRectangle) =>
            x >= pillRectangle.left &&
            x <= pillRectangle.right &&
            y >= pillRectangle.top &&
            y <= pillRectangle.bottom,
        )

        if (!isInsidePill) {
          return {
            x: x - cardRectangle.left,
            y: y - cardRectangle.top,
          }
        }
      }
    }

    return null
  })

  expect(emptyPillListPosition).not.toBeNull()
  await searchPerks(page, 'temporary search')
  await heavyArmorGroupCard.click({
    position: emptyPillListPosition ?? {
      x: 0,
      y: 0,
    },
  })

  await expect(page.getByLabel('Search perks')).toHaveValue('')
  await expect(getSidebarPerkGroupButton(page, 'Heavy Armor')).toHaveAttribute('aria-pressed', 'true')

  await searchPerks(page, 'temporary search')
  await heavyArmorGroupCard.getByRole('button', { name: 'Battle Forged' }).click()

  await expect(page.getByLabel('Search perks')).toHaveValue('')
  await expect(page.getByRole('heading', { level: 2, name: 'Battle Forged' })).toBeVisible()
})

test('filters multi-option planner group icons individually', async ({ page }) => {
  await gotoPerksBrowser(page)

  await page.goto('/?build=Steadfast')
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()

  const activePlannerBorderColor = await getResolvedCssBorderColor(page, 'var(--border-strong)')
  const multiOptionGroupCard = getBuildIndividualGroupsList(page)
    .getByTestId('planner-group-card')
    .filter({ hasText: 'Heavy Armor / Sturdy / Swordmasters' })
  const iconButtons = multiOptionGroupCard.getByTestId('planner-group-option-button')
  const sturdyIconButton = multiOptionGroupCard.getByRole('button', {
    name: 'Select perk group Sturdy',
  })
  const sturdyIcon = sturdyIconButton.getByTestId('planner-group-option-icon')
  const swordmastersIconButton = multiOptionGroupCard.getByRole('button', {
    name: 'Select perk group Swordmasters',
  })

  await expect(multiOptionGroupCard).toBeVisible()
  await expect(iconButtons).toHaveCount(3)

  const sturdyIconBorderBeforeHover = await sturdyIcon.evaluate(
    (element) => window.getComputedStyle(element).borderTopColor,
  )

  await sturdyIconButton.hover()
  await waitForCssRgbColor(
    () => sturdyIcon.evaluate((element) => window.getComputedStyle(element).borderTopColor),
    activePlannerBorderColor,
  )
  await page.mouse.move(1, 1)
  await waitForCssRgbColor(
    () => sturdyIcon.evaluate((element) => window.getComputedStyle(element).borderTopColor),
    sturdyIconBorderBeforeHover,
  )

  await searchPerks(page, 'temporary search')
  await sturdyIconButton.click()

  await expect(page.getByLabel('Search perks')).toHaveValue('')
  await expect(page.getByRole('button', { name: 'Disable category Traits' })).toBeVisible()
  await expect(getSidebarPerkGroupButton(page, 'Sturdy')).toHaveAttribute('aria-pressed', 'true')

  await searchPerks(page, 'temporary search')
  await swordmastersIconButton.click()

  await expect(page.getByLabel('Search perks')).toHaveValue('')
  await expect(page.getByRole('button', { name: 'Disable category Enemy' })).toBeVisible()
  await expect(getSidebarPerkGroupButton(page, 'Swordmasters')).toHaveAttribute('aria-pressed', 'true')
})

test('separates planner group card hover from icon and perk pill hover states', async ({
  page,
}) => {
  await gotoPerksBrowser(page)

  await page.goto('/?build=Battle+Forged,Immovable+Object,Steadfast')
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()

  const activePlannerSurfaceColor = await getResolvedCssBackgroundColor(
    page,
    'var(--surface-result-active)',
  )
  const heavyArmorGroupCard = getBuildSharedGroupsList(page)
    .getByTestId('planner-group-card')
    .filter({ hasText: 'Heavy Armor' })
  const heavyArmorIcon = heavyArmorGroupCard.getByTestId('planner-group-option-icon').first()
  const battleForgedPill = heavyArmorGroupCard.getByRole('button', { name: 'Battle Forged' })
  const battleForgedPickedPerkTile = getBuildPerksBar(page)
    .getByTestId('planner-slot-perk')
    .filter({ hasText: 'Battle Forged' })
  const immovableObjectPickedPerkTile = getBuildPerksBar(page)
    .getByTestId('planner-slot-perk')
    .filter({ hasText: 'Immovable Object' })
  const steadfastPickedPerkTile = getBuildPerksBar(page)
    .getByTestId('planner-slot-perk')
    .filter({ hasText: 'Steadfast' })
  const cardBackgroundBeforeHover = await heavyArmorGroupCard.evaluate(
    (element) => window.getComputedStyle(element).backgroundColor,
  )
  const iconBorderBeforeCardHover = await heavyArmorIcon.evaluate(
    (element) => window.getComputedStyle(element).borderTopColor,
  )
  const groupNameIconCenterOffset = await heavyArmorGroupCard.evaluate((card) => {
    const icon = card.querySelector('[data-testid="planner-group-option-icon"]')
    const groupName = card.querySelector('[data-testid="planner-slot-name"]')

    if (!(icon instanceof HTMLElement) || !(groupName instanceof HTMLElement)) {
      return Number.POSITIVE_INFINITY
    }

    const iconRectangle = icon.getBoundingClientRect()
    const groupNameRectangle = groupName.getBoundingClientRect()

    return Math.abs(
      iconRectangle.top +
        iconRectangle.height / 2 -
        (groupNameRectangle.top + groupNameRectangle.height / 2),
    )
  })

  expect(groupNameIconCenterOffset).toBeLessThanOrEqual(2)
  await expect(heavyArmorGroupCard.getByTestId('planner-group-option-button')).toHaveCount(0)
  await expect(heavyArmorGroupCard.getByTestId('planner-card-icon-stack-item')).toHaveCount(1)

  const cardHeaderHoverPoint = await heavyArmorGroupCard.evaluate((card) => {
    const groupName = card.querySelector('[data-testid="planner-slot-name"]')

    if (!(groupName instanceof HTMLElement)) {
      return null
    }

    const groupNameRectangle = groupName.getBoundingClientRect()

    return {
      x: groupNameRectangle.left + groupNameRectangle.width / 2,
      y: groupNameRectangle.top + groupNameRectangle.height / 2,
    }
  })

  expect(cardHeaderHoverPoint).not.toBeNull()
  await page.mouse.move(cardHeaderHoverPoint!.x, cardHeaderHoverPoint!.y)
  await expect
    .poll(() =>
      heavyArmorGroupCard.evaluate((element) => window.getComputedStyle(element).backgroundColor),
    )
    .toBe(activePlannerSurfaceColor)
  await expect(battleForgedPickedPerkTile).toHaveAttribute('data-highlighted', 'true')
  await expect(immovableObjectPickedPerkTile).toHaveAttribute('data-highlighted', 'true')
  await expect(steadfastPickedPerkTile).toHaveAttribute('data-highlighted', 'true')
  const iconBorderAfterCardHover = await heavyArmorIcon.evaluate(
    (element) => window.getComputedStyle(element).borderTopColor,
  )

  expectCssRgbColorsToMatch(iconBorderAfterCardHover, iconBorderBeforeCardHover)

  await battleForgedPill.hover()
  await expect(battleForgedPill).toHaveAttribute('data-tooltip-pending', 'false')
  await expect(battleForgedPill).toHaveAttribute('data-tooltip-pending', 'true', { timeout: 500 })
  const pillTooltipTimerStyle = await battleForgedPill.evaluate((element) => {
    const computedStyle = window.getComputedStyle(element, '::after')

    return {
      animationDuration: computedStyle.animationDuration,
      height: computedStyle.height,
      opacity: computedStyle.opacity,
    }
  })

  expect(pillTooltipTimerStyle).toEqual({
    animationDuration: '0.5s',
    height: '2px',
    opacity: '1',
  })
  await expect(heavyArmorGroupCard).toHaveAttribute('data-has-highlighted-perk', 'true')
  await expect(battleForgedPickedPerkTile).toHaveAttribute('data-highlighted', 'true')
  await expect(immovableObjectPickedPerkTile).toHaveAttribute('data-highlighted', 'false')
  await expect(steadfastPickedPerkTile).toHaveAttribute('data-highlighted', 'false')
  await expect
    .poll(() =>
      heavyArmorGroupCard.evaluate((element) => window.getComputedStyle(element).backgroundColor),
    )
    .toBe(cardBackgroundBeforeHover)
  await expect
    .poll(() =>
      battleForgedPill.evaluate((element) => window.getComputedStyle(element).backgroundColor),
    )
    .toBe(activePlannerSurfaceColor)
  const iconBorderAfterPerkHover = await heavyArmorIcon.evaluate(
    (element) => window.getComputedStyle(element).borderTopColor,
  )

  expectCssRgbColorsToMatch(iconBorderAfterPerkHover, iconBorderBeforeCardHover)
  await expect(page.getByRole('tooltip')).toBeVisible({ timeout: 1200 })
  await expect(battleForgedPill).toHaveAttribute('data-tooltip-pending', 'true')
  await expect(battleForgedPickedPerkTile).toHaveAttribute('data-tooltip-pending', 'false')
  await expect(page.getByRole('tooltip')).not.toContainText('Battle Forged')
  await expect(page.getByRole('tooltip')).toContainText(/Armor damage taken is reduced/i)
  await page.mouse.move(1, 1)
  await expect(page.getByRole('tooltip')).toHaveCount(0)
})

test('keeps long planner group names compact without category text', async ({ page }) => {
  await gotoPerksBrowser(page)

  await page.goto('/?build=Steadfast')
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()

  const plannerGroupCard = getBuildIndividualGroupsList(page)
    .getByTestId('planner-group-card')
    .filter({ hasText: 'Heavy Armor / Sturdy / Swordmasters' })

  await expect(plannerGroupCard).toBeVisible()
  await expect(plannerGroupCard.getByText('Steadfast', { exact: true })).toBeVisible()
  await expect(plannerGroupCard.getByTestId('planner-slot-category')).toHaveCount(0)

  const plannerGroupCardMetrics = await plannerGroupCard.evaluate((card) => {
    const groupName = card.querySelector('[data-testid="planner-slot-name"]')

    if (!(groupName instanceof HTMLElement)) {
      return null
    }

    const cardRectangle = card.getBoundingClientRect()
    const groupNameRectangle = groupName.getBoundingClientRect()
    const groupNameStyle = window.getComputedStyle(groupName)
    const groupNameLineHeight = Number.parseFloat(groupNameStyle.lineHeight)
    const fallbackGroupNameLineHeight = Number.parseFloat(groupNameStyle.fontSize) * 1.2
    const cardMinimumHeight = Number.parseFloat(window.getComputedStyle(card).minHeight)

    return {
      cardHeight: cardRectangle.height,
      cardMinimumHeight,
      groupNameHeight: groupNameRectangle.height,
      groupNameLineClamp: groupNameStyle.webkitLineClamp,
      groupNameLineHeight: Number.isFinite(groupNameLineHeight)
        ? groupNameLineHeight
        : fallbackGroupNameLineHeight,
      groupNameText: groupName.textContent,
    }
  })

  expect(plannerGroupCardMetrics).not.toBeNull()
  expect(plannerGroupCardMetrics!.groupNameText).toBe('Heavy Armor / Sturdy / Swordmasters')
  expect(plannerGroupCardMetrics!.groupNameLineClamp).toBe('1')
  expect(plannerGroupCardMetrics!.groupNameHeight).toBeLessThanOrEqual(
    plannerGroupCardMetrics!.groupNameLineHeight + 1,
  )
  expect(plannerGroupCardMetrics!.cardHeight).toBeLessThanOrEqual(
    plannerGroupCardMetrics!.cardMinimumHeight + 1,
  )
})

test('keeps picked perk tiles fixed while avoiding default early truncation', async ({ page }) => {
  await gotoPerksBrowser(page, { height: 768, width: 1366 })
  await page.goto(createBuildUrl(['Immovable Object', 'Clarity']))
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()

  const immovableObjectPickedPerkTile = getBuildPerksBar(page)
    .getByTestId('planner-slot-perk')
    .filter({ hasText: 'Immovable Object' })

  await expect(immovableObjectPickedPerkTile).toBeVisible()

  const pickedPerkMetrics = await immovableObjectPickedPerkTile.evaluate((pickedPerkTile) => {
    const pickedPerkName = pickedPerkTile.querySelector('[data-testid="planner-picked-perk-name"]')
    const buildPlanner = pickedPerkTile.closest('[aria-label="Build planner"]')

    if (!(pickedPerkName instanceof HTMLElement) || !(buildPlanner instanceof HTMLElement)) {
      return null
    }

    const pickedPerkTileRectangle = pickedPerkTile.getBoundingClientRect()
    const computedStyle = window.getComputedStyle(pickedPerkTile)
    const plannerSlotWidth = Number.parseFloat(
      window.getComputedStyle(buildPlanner).getPropertyValue('--planner-slot-width'),
    )
    const rootFontSize = Number.parseFloat(
      window.getComputedStyle(document.documentElement).fontSize,
    )

    return {
      nameOverflow: pickedPerkName.scrollWidth - pickedPerkName.clientWidth,
      slotWidth: plannerSlotWidth * rootFontSize,
      tileWidth: pickedPerkTileRectangle.width,
      widthStyle: computedStyle.width,
    }
  })
  const pickedPerkTileWidths = await getBuildPerksBar(page)
    .getByTestId('planner-slot-perk')
    .evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().width))

  expect(pickedPerkMetrics).not.toBeNull()
  expect(pickedPerkMetrics!.nameOverflow).toBeLessThanOrEqual(1)
  expect(Math.abs(pickedPerkMetrics!.tileWidth - pickedPerkMetrics!.slotWidth)).toBeLessThanOrEqual(
    1,
  )
  expect(pickedPerkMetrics!.widthStyle).not.toBe('auto')
  expect(Math.max(...pickedPerkTileWidths) - Math.min(...pickedPerkTileWidths)).toBeLessThanOrEqual(
    1,
  )
})

test('links search result hover highlighting with matching build planner perks', async ({
  page,
}) => {
  await gotoPerksBrowser(page, mediumPerksBrowserViewport)

  await searchPerks(page, 'Clarity')
  await addPerkToBuildFromResults(page, 'Clarity')

  await searchPerks(page, 'Perfect Focus')
  await addPerkToBuildFromResults(page, 'Perfect Focus')

  const perfectFocusResultsButton = page
    .getByTestId('results-list')
    .getByRole('button', { name: 'Inspect Perfect Focus' })
  const perfectFocusResultsRow = page
    .getByTestId('results-list')
    .getByTestId('perk-row')
    .filter({ hasText: 'Perfect Focus' })
  const sharedPerfectFocusButton = getBuildSharedGroupsList(page).getByRole('button', {
    name: 'Perfect Focus',
  })
  const individualPerfectFocusButton = getBuildIndividualGroupsList(page).getByRole('button', {
    name: 'Perfect Focus',
  })
  const pickedPerfectFocusTile = getBuildPerksBar(page)
    .getByTestId('planner-slot-perk')
    .filter({ hasText: 'Perfect Focus' })

  await perfectFocusResultsButton.hover()

  await expect(perfectFocusResultsRow).toHaveAttribute('data-highlighted', 'true')
  await expect(sharedPerfectFocusButton).toHaveAttribute('data-highlighted', 'true')
  await expect(individualPerfectFocusButton).toHaveAttribute('data-highlighted', 'true')
  await expect(pickedPerfectFocusTile).toHaveAttribute('data-highlighted', 'true')

  await sharedPerfectFocusButton.hover()

  await expect(perfectFocusResultsRow).toHaveAttribute('data-highlighted', 'true')
  await expect(sharedPerfectFocusButton).toHaveAttribute('data-highlighted', 'true')
  await expect(individualPerfectFocusButton).toHaveAttribute('data-highlighted', 'true')
  await expect(pickedPerfectFocusTile).toHaveAttribute('data-highlighted', 'true')
  await expect(perfectFocusResultsRow).toHaveCSS('transform', 'none')
  await expect(sharedPerfectFocusButton).toHaveCSS('transform', 'none')
  await expect(individualPerfectFocusButton).toHaveCSS('transform', 'none')
  await expect(pickedPerfectFocusTile).toHaveCSS('transform', 'none')
})

test('keeps sidebar perk group selection emphasized in the build planner', async ({ page }) => {
  await gotoPerksBrowser(page, mediumPerksBrowserViewport)
  await page.goto(createBuildUrl(['Colossus', 'Muscularity']))
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()

  const sharedLargeGroupCard = getBuildSharedGroupsList(page)
    .getByTestId('planner-group-card')
    .filter({ hasText: 'Large' })
  const colossusPickedPerkTile = getBuildPerksBar(page)
    .getByTestId('planner-slot-perk')
    .filter({ hasText: 'Colossus' })
  const muscularityPickedPerkTile = getBuildPerksBar(page)
    .getByTestId('planner-slot-perk')
    .filter({ hasText: 'Muscularity' })

  await expect(sharedLargeGroupCard).toBeVisible()
  await expect(colossusPickedPerkTile).toHaveAttribute('data-highlighted', 'false')
  await expect(muscularityPickedPerkTile).toHaveAttribute('data-highlighted', 'false')

  await page.getByRole('button', { name: 'Enable category Traits' }).click()
  await getSidebarPerkGroupButton(page, 'Large').click()

  await expect(getSidebarPerkGroupButton(page, 'Large')).toHaveAttribute('aria-pressed', 'true')
  await expect(sharedLargeGroupCard).toHaveAttribute('data-highlighted', 'true')
  await expect(colossusPickedPerkTile).toHaveAttribute('data-highlighted', 'true')
  await expect(muscularityPickedPerkTile).toHaveAttribute('data-highlighted', 'true')
})

test('inspects picked perk tiles without removing them', async ({ page }) => {
  await gotoPerksBrowser(page)

  await searchPerks(page, 'Clarity')
  await addPerkToBuildFromResults(page, 'Clarity')

  await searchPerks(page, 'Perfect Focus')
  await page.getByRole('button', { name: 'Enable category Magic' }).click()
  await getSidebarPerkGroupButton(page, 'Deadeye').click()

  await getBuildPerksBar(page)
    .getByRole('button', { name: 'View Clarity from build planner' })
    .click()

  await expect(page.getByText('1 perk picked.')).toBeVisible()
  await expect(page.getByLabel('Search perks')).toHaveValue('')
  await expect(page.getByRole('button', { name: 'Disable category Traits' })).toBeVisible()
  await expect(getSidebarPerkGroupButton(page, 'Calm')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Inspect Clarity' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Clarity' })).toBeVisible()
  await expect(page.getByText(/Build slot \d+|Not in build/)).toHaveCount(0)
  await expect(page.getByRole('tooltip')).toHaveCount(0)
})

test('clears the build and restores planner placeholders', async ({ page }) => {
  await gotoPerksBrowser(page)

  await searchPerks(page, 'Clarity')
  await inspectPerkFromResults(page, 'Clarity')
  await addSelectedPerkToBuild(page, 'Clarity')
  await expect(page.getByText('1 perk picked.')).toBeVisible()

  await page.getByRole('button', { name: 'Clear build' }).click()

  const clearBuildDialog = page.getByRole('alertdialog', { name: 'Clear this build?' })

  await expect(clearBuildDialog).toBeVisible()
  await expect(clearBuildDialog).toContainText('This removes 1 picked perk')
  await expect(clearBuildDialog).toContainText('Saved builds are not affected.')
  await expect(page.getByText('1 perk picked.')).toBeVisible()

  const confirmClearButton = clearBuildDialog.getByRole('button', { name: 'Clear build' })
  const confirmClearButtonBackgroundBeforeHover = await confirmClearButton.evaluate(
    (element) => window.getComputedStyle(element).backgroundColor,
  )

  await confirmClearButton.hover()
  await expect
    .poll(() =>
      confirmClearButton.evaluate((element) => window.getComputedStyle(element).backgroundColor),
    )
    .not.toBe(confirmClearButtonBackgroundBeforeHover)

  await clearBuildDialog.getByRole('button', { name: 'Keep build' }).click()

  await expect(clearBuildDialog).toHaveCount(0)
  await expect(page.getByText('1 perk picked.')).toBeVisible()

  await page.getByRole('button', { name: 'Clear build' }).click()
  await page
    .getByRole('alertdialog', { name: 'Clear this build?' })
    .getByRole('button', { name: 'Clear build' })
    .click()

  await expect(page.getByText('No perks picked yet.')).toBeVisible()
  await expect(getBuildPerksBar(page).getByText('Pick a perk to start')).toBeVisible()
  await expect(
    getBuildPerksBar(page).getByText(
      'Use the star in the detail panel or the search results list.',
    ),
  ).toBeVisible()
  const placeholderMetrics = await getBuildPerksBar(page).evaluate((buildPerksBar) => {
    const placeholder = buildPerksBar.querySelector('[data-placeholder="true"]') as HTMLElement | null
    const placeholderMeta = buildPerksBar.querySelector('[data-testid="planner-slot-meta"]') as HTMLElement | null

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
    getBuildIndividualGroupsList(page).getByText('Individual perk groups will appear here'),
  ).toBeVisible()
})

test('keeps the picked count and clear action aligned for dense builds', async ({ page }) => {
  await gotoPerksBrowser(page, mediumPerksBrowserViewport)
  await page.goto(createBuildUrl(manyPickedPerkNames))

  await expect(page.getByText('27 perks picked.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Clear build' })).toBeEnabled()

  const actionMetrics = await page.evaluate(() => {
    const count = document.querySelector('[data-testid="build-planner-count"]') as HTMLElement | null
    const clearButton = document.querySelector('[data-testid="clear-build-button"]') as HTMLElement | null

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
