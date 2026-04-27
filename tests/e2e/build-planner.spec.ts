import { expect, test, type Page } from '@playwright/test'
import {
  addPerkToBuildFromResults,
  addSelectedPerkToBuild,
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

    const buildPlanner = document.querySelector('.build-planner') as HTMLElement | null
    const plannerBoard = document.querySelector('.planner-board') as HTMLElement | null

    return {
      boardOverflow:
        plannerBoard === null
          ? Number.POSITIVE_INFINITY
          : plannerBoard.scrollHeight - plannerBoard.clientHeight,
      className: buildPlanner?.className ?? '',
      individualRows: getVisualRowCount(
        '[data-testid="build-individual-groups-list"] .planner-group-list',
        '.planner-group-card',
      ),
      perkRows: getVisualRowCount('.planner-track-perks', '.planner-slot-perk'),
      sharedRows: getVisualRowCount(
        '[data-testid="build-shared-groups-list"] .planner-group-list',
        '.planner-group-card',
      ),
    }
  })
}

test('build planner splits shared and individual perk groups without layout drift', async ({
  page,
}) => {
  await gotoPerksBrowser(page, { height: 768, width: 1366 })

  const initialHeaderHeight = await page
    .locator('.build-planner-header')
    .evaluate((element) => element.getBoundingClientRect().height)
  const headerHeightSubpixelTolerance = 2

  await expect(page.getByRole('heading', { name: 'Build planner' })).toBeVisible()
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
    .toBeLessThanOrEqual(initialHeaderHeight + 8)
  await expect
    .poll(async () =>
      page
        .locator('.build-planner-header')
        .evaluate((element) => element.getBoundingClientRect().height),
    )
    .toBeGreaterThanOrEqual(initialHeaderHeight - headerHeightSubpixelTolerance)
  await expect
    .poll(async () =>
      page
        .locator('.planner-board')
        .evaluate((element) => element.scrollHeight - element.clientHeight),
    )
    .toBeLessThanOrEqual(1)
  await expect
    .poll(async () =>
      page.locator('.planner-board').evaluate((element) => element.getBoundingClientRect().height),
    )
    .toBeGreaterThanOrEqual(plannerBoardHeightBeforePicking - 8)
  const plannerRowTopsAfterPicking = await page
    .locator('.planner-row')
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
  await page.mouse.move(1, 1)
  await expect(page.getByRole('tooltip')).toHaveCount(0)

  const resultsRowHeightAfterPicking = await page
    .locator('.results-list .perk-row')
    .evaluate((element) => element.getBoundingClientRect().height)

  expect(
    Math.abs(resultsRowHeightAfterPicking - resultsRowHeightBeforePicking),
  ).toBeLessThanOrEqual(1)

  const pickedPerkTile = getBuildPerksBar(page).locator('.planner-slot-perk').first()
  const activePlannerSurfaceColor = await getResolvedCssBackgroundColor(
    page,
    'var(--surface-result-active)',
  )
  const activePlannerBorderColor = await getResolvedCssBorderColor(page, 'var(--border-strong)')
  const plannerGroupCard = getBuildIndividualGroupsList(page).locator('.planner-group-card').first()

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

  const pickedPerkRemoveControl = pickedPerkTile.locator('.planner-slot-remove-button')
  await expect(pickedPerkRemoveControl).toBeHidden()

  await pickedPerkTile.hover()
  const pickedPerkRemoveButton = pickedPerkTile.getByRole('button', {
    name: 'Remove Clarity from build',
  })

  await expect(page.getByRole('tooltip')).toHaveCount(0)
  await expect(pickedPerkTile).toHaveCSS('transform', 'none')
  await expect(pickedPerkRemoveControl).toBeVisible()
  await expect(pickedPerkRemoveButton).toBeVisible()
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

  expect(hoverMetricsAfter.backgroundColor).not.toBe(hoverMetricsBefore.backgroundColor)
  expect(hoverMetricsAfter.backgroundColor).toBe(activePlannerSurfaceColor)
  expect(hoverMetricsAfter.backgroundColor).toBe(hoveredGroupCardStyle.backgroundColor)
  expectCssRgbColorsToMatch(hoverMetricsAfter.borderColor, hoveredGroupCardStyle.borderColor)
  expect(
    Math.abs(hoverMetricsAfter.tileRectangle.top - hoverMetricsBefore.tileRectangle.top),
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(hoverMetricsAfter.tileRectangle.right - hoverMetricsBefore.tileRectangle.right),
  ).toBeLessThanOrEqual(1)

  await pickedPerkTile.getByRole('button', { name: 'View Clarity from build planner' }).focus()
  await expect(page.getByRole('tooltip')).toBeVisible({ timeout: 200 })
  await expect(page.getByRole('tooltip')).toContainText(
    /An additional \+10% of any damage ignores armor/i,
  )
  await page.keyboard.press('Escape')
  await expect(page.getByRole('tooltip')).toHaveCount(0)

  await page.goto(
    '/?build=Clarity,Peaceable,Perfect+Focus,Berserk,Killing+Frenzy,Fearsome,Colossus',
  )
  await expect(page.getByRole('heading', { level: 1, name: 'Perks browser' })).toBeVisible()
  await expect(getBuildPerksBar(page).locator('.planner-slot-perk')).toHaveCount(7)
  await expect(page.getByRole('region', { name: 'Build planner' })).not.toHaveClass(
    /is-scroll-constrained/,
  )
  expect(
    await getBuildSharedGroupsList(page).locator('.planner-group-card').count(),
  ).toBeGreaterThan(0)
  expect(
    await page.evaluate(() => {
      const plannerBoard = document.querySelector('.planner-board') as HTMLElement | null

      return plannerBoard === null
        ? Number.NEGATIVE_INFINITY
        : plannerBoard.scrollHeight - plannerBoard.clientHeight
    }),
  ).toBeLessThanOrEqual(1)

  await page.setViewportSize({ height: 768, width: 1280 })
  await expect(page.getByRole('region', { name: 'Build planner' })).not.toHaveClass(
    /is-scroll-constrained/,
  )
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const plannerBoard = document.querySelector('.planner-board') as HTMLElement | null

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

test('scrolls the planner below wide desktop only after content wraps past two rows', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto(createBuildUrl(manyPickedPerkNames.slice(0, 7)))
  await expect(page.getByRole('heading', { level: 1, name: 'Perks browser' })).toBeVisible()

  const twoRowPlannerMetrics = await getPlannerWrapMetrics(page)

  expect(twoRowPlannerMetrics.className).not.toContain('is-scroll-constrained')
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
  await expect(page.getByRole('region', { name: 'Build planner' })).toHaveClass(
    /is-scroll-constrained/,
  )

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
  await expect(page.getByRole('region', { name: 'Build planner' })).not.toHaveClass(
    /is-scroll-constrained/,
  )

  const wideDesktopPlannerMetrics = await getPlannerWrapMetrics(page)

  expect(wideDesktopPlannerMetrics.boardOverflow).toBeLessThanOrEqual(1)
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

test('selects build planner perk groups from their group tiles', async ({ page }) => {
  await gotoPerksBrowser(page)

  await page.goto('/?build=Battle+Forged,Immovable+Object,Steadfast')
  await expect(page.getByRole('heading', { level: 1, name: 'Perks browser' })).toBeVisible()
  await searchPerks(page, 'temporary search')

  const heavyArmorGroupCard = getBuildSharedGroupsList(page).locator('.planner-group-card', {
    hasText: 'Heavy Armor',
  })

  await heavyArmorGroupCard.click({
    position: {
      x: 96,
      y: 38,
    },
  })

  await expect(page.getByLabel('Search perks')).toHaveValue('')
  await expect(page.getByRole('button', { name: 'Disable category Defense' })).toBeVisible()
  await expect(getSidebarPerkGroupButton(page, 'Heavy Armor')).toHaveClass(/is-active/)

  const emptyPillListPosition = await heavyArmorGroupCard.evaluate((card) => {
    const pillList = card.querySelector('.planner-pill-list')

    if (!(pillList instanceof HTMLElement)) {
      return null
    }

    const cardRectangle = card.getBoundingClientRect()
    const pillListRectangle = pillList.getBoundingClientRect()
    const pillRectangles = [...pillList.querySelectorAll('.planner-pill')].map((pill) =>
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
  await expect(getSidebarPerkGroupButton(page, 'Heavy Armor')).toHaveClass(/is-active/)

  await searchPerks(page, 'temporary search')
  await heavyArmorGroupCard.getByRole('button', { name: 'Battle Forged' }).click()

  await expect(page.getByLabel('Search perks')).toHaveValue('')
  await expect(page.getByRole('heading', { level: 2, name: 'Battle Forged' })).toBeVisible()
})

test('separates planner group card hover from icon and perk pill hover states', async ({
  page,
}) => {
  await gotoPerksBrowser(page)

  await page.goto('/?build=Battle+Forged,Immovable+Object,Steadfast')
  await expect(page.getByRole('heading', { level: 1, name: 'Perks browser' })).toBeVisible()

  const activePlannerSurfaceColor = await getResolvedCssBackgroundColor(
    page,
    'var(--surface-result-active)',
  )
  const heavyArmorGroupCard = getBuildSharedGroupsList(page).locator('.planner-group-card', {
    hasText: 'Heavy Armor',
  })
  const heavyArmorIconButton = heavyArmorGroupCard.locator('.planner-group-option-button').first()
  const heavyArmorIcon = heavyArmorGroupCard.locator('.planner-group-option-icon').first()
  const battleForgedPill = heavyArmorGroupCard.getByRole('button', { name: 'Battle Forged' })
  const cardBackgroundBeforeHover = await heavyArmorGroupCard.evaluate(
    (element) => window.getComputedStyle(element).backgroundColor,
  )
  const iconBorderBeforeCardHover = await heavyArmorIcon.evaluate(
    (element) => window.getComputedStyle(element).borderTopColor,
  )

  await heavyArmorGroupCard.hover({
    position: {
      x: 96,
      y: 38,
    },
  })
  await expect
    .poll(() =>
      heavyArmorGroupCard.evaluate((element) => window.getComputedStyle(element).backgroundColor),
    )
    .toBe(activePlannerSurfaceColor)
  const iconBorderAfterCardHover = await heavyArmorIcon.evaluate(
    (element) => window.getComputedStyle(element).borderTopColor,
  )

  expectCssRgbColorsToMatch(iconBorderAfterCardHover, iconBorderBeforeCardHover)

  await heavyArmorIconButton.hover()
  const iconBorderAfterDirectHover = await heavyArmorIcon.evaluate(
    (element) => window.getComputedStyle(element).borderTopColor,
  )

  expectCssRgbColorsToMatch(iconBorderAfterDirectHover, iconBorderBeforeCardHover)

  await battleForgedPill.hover()
  await expect(heavyArmorGroupCard).toHaveClass(/has-highlighted-perk/)
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
})

test('truncates long planner group categories without growing the card', async ({ page }) => {
  await gotoPerksBrowser(page)

  await page.goto('/?build=Steadfast')
  await expect(page.getByRole('heading', { level: 1, name: 'Perks browser' })).toBeVisible()

  const plannerGroupCard = getBuildIndividualGroupsList(page).locator('.planner-group-card', {
    hasText: 'Heavy Armor / Sturdy / Swordmasters',
  })

  await expect(plannerGroupCard).toBeVisible()
  await expect(plannerGroupCard.getByText('Steadfast', { exact: true })).toBeVisible()

  const plannerGroupCardMetrics = await plannerGroupCard.evaluate((card) => {
    const category = card.querySelector('.planner-slot-category')

    if (!(category instanceof HTMLElement)) {
      return null
    }

    const cardRectangle = card.getBoundingClientRect()
    const categoryRectangle = category.getBoundingClientRect()
    const categoryStyle = window.getComputedStyle(category)
    const categoryLineHeight = Number.parseFloat(categoryStyle.lineHeight)
    const fallbackCategoryLineHeight = Number.parseFloat(categoryStyle.fontSize) * 1.2
    const cardMinimumHeight = Number.parseFloat(window.getComputedStyle(card).minHeight)

    return {
      cardHeight: cardRectangle.height,
      cardMinimumHeight,
      categoryClientWidth: category.clientWidth,
      categoryHeight: categoryRectangle.height,
      categoryLineHeight: Number.isFinite(categoryLineHeight)
        ? categoryLineHeight
        : fallbackCategoryLineHeight,
      categoryOverflow: category.scrollWidth - category.clientWidth,
      categoryText: category.textContent,
      categoryTextOverflow: categoryStyle.textOverflow,
      categoryWhiteSpace: categoryStyle.whiteSpace,
    }
  })

  expect(plannerGroupCardMetrics).not.toBeNull()
  expect(plannerGroupCardMetrics!.categoryText).toBe('Defense / Traits / Enemy')
  expect(plannerGroupCardMetrics!.categoryWhiteSpace).toBe('nowrap')
  expect(plannerGroupCardMetrics!.categoryTextOverflow).toBe('ellipsis')
  expect(plannerGroupCardMetrics!.categoryOverflow).toBeGreaterThan(0)
  expect(plannerGroupCardMetrics!.categoryHeight).toBeLessThanOrEqual(
    plannerGroupCardMetrics!.categoryLineHeight + 1,
  )
  expect(plannerGroupCardMetrics!.cardHeight).toBeLessThanOrEqual(
    plannerGroupCardMetrics!.cardMinimumHeight + 1,
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
  const perfectFocusResultsRow = page.getByTestId('results-list').locator('.perk-row', {
    hasText: 'Perfect Focus',
  })
  const sharedPerfectFocusButton = getBuildSharedGroupsList(page).getByRole('button', {
    name: 'Perfect Focus',
  })
  const individualPerfectFocusButton = getBuildIndividualGroupsList(page).getByRole('button', {
    name: 'Perfect Focus',
  })
  const pickedPerfectFocusTile = getBuildPerksBar(page).locator('.planner-slot-perk', {
    hasText: 'Perfect Focus',
  })

  await perfectFocusResultsButton.hover()

  await expect(perfectFocusResultsRow).toHaveClass(/is-highlighted/)
  await expect(sharedPerfectFocusButton).toHaveClass(/is-highlighted/)
  await expect(individualPerfectFocusButton).toHaveClass(/is-highlighted/)
  await expect(pickedPerfectFocusTile).toHaveClass(/is-highlighted/)

  await sharedPerfectFocusButton.hover()

  await expect(perfectFocusResultsRow).toHaveClass(/is-highlighted/)
  await expect(sharedPerfectFocusButton).toHaveClass(/is-highlighted/)
  await expect(individualPerfectFocusButton).toHaveClass(/is-highlighted/)
  await expect(pickedPerfectFocusTile).toHaveClass(/is-highlighted/)
  await expect(perfectFocusResultsRow).toHaveCSS('transform', 'none')
  await expect(sharedPerfectFocusButton).toHaveCSS('transform', 'none')
  await expect(individualPerfectFocusButton).toHaveCSS('transform', 'none')
  await expect(pickedPerfectFocusTile).toHaveCSS('transform', 'none')
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
  await expect(getSidebarPerkGroupButton(page, 'Calm')).toHaveClass(/is-active/)
  await expect(page.getByRole('button', { name: 'Inspect Clarity' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Clarity' })).toBeVisible()
  await expect(page.getByText('Build slot 1')).toBeVisible()
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
    getBuildIndividualGroupsList(page).getByText('Individual perk groups will appear here'),
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
