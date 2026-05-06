import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  addPerkToBuildFromResults,
  addSelectedPerkToBuild,
  expectCssRgbColorsToMatch,
  getBackgroundFitPanel,
  expectNoDocumentHorizontalOverflow,
  expectRawAncientScrollMarker,
  expectPlannerGroupTilesSettled,
  getBuildIndividualGroupsList,
  getBuildPerksBar,
  getBuildSharedGroupsList,
  getGameIconImageCdnSrcPattern,
  getParsedCssRgbColor,
  getDetailPanel,
  getPlannerBoardVisualVerticalOverflow,
  getResolvedCssBackgroundColor,
  getResolvedCssBorderColor,
  getResultsList,
  getSidebarPerkGroupButton,
  gotoBuildPlanner,
  inspectPerkFromResults,
  mediumBuildPlannerViewport,
  searchPerks,
  waitForCssRgbColor,
} from './support/build-planner-page'

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

async function getPickedPerkNameLayoutMetrics(pickedPerkTile: Locator) {
  return pickedPerkTile.evaluate((tileElement) => {
    const pickedPerkName = tileElement.querySelector('[data-testid="planner-picked-perk-name"]')
    const inspectButton = tileElement.querySelector(
      'button[aria-label$=", view from build planner"]',
    )

    if (!(pickedPerkName instanceof HTMLElement) || !(inspectButton instanceof HTMLElement)) {
      throw new Error('Unable to find picked perk name layout elements.')
    }

    const pickedPerkNameStyle = window.getComputedStyle(pickedPerkName)
    const inspectButtonStyle = window.getComputedStyle(inspectButton)
    const pickedPerkNameRectangle = pickedPerkName.getBoundingClientRect()
    const pickedPerkNameLineHeight = Number.parseFloat(pickedPerkNameStyle.lineHeight)
    const fallbackPickedPerkNameLineHeight = Number.parseFloat(pickedPerkNameStyle.fontSize) * 1.05
    const pickedPerkNameTextNode = pickedPerkName.firstChild

    if (!(pickedPerkNameTextNode instanceof Text)) {
      throw new Error('Unable to find picked perk name text node.')
    }

    const pickedPerkNameRange = document.createRange()
    pickedPerkNameRange.selectNodeContents(pickedPerkName)
    const textFragmentCount = [...pickedPerkNameRange.getClientRects()].filter(
      (rectangle) => rectangle.width > 0 && rectangle.height > 0,
    ).length
    const characterLineTops: number[] = []

    for (const [characterIndex] of [...(pickedPerkName.textContent ?? '')].entries()) {
      const characterRange = document.createRange()
      characterRange.setStart(pickedPerkNameTextNode, characterIndex)
      characterRange.setEnd(pickedPerkNameTextNode, characterIndex + 1)

      for (const characterRectangle of characterRange.getClientRects()) {
        if (characterRectangle.width === 0 || characterRectangle.height === 0) {
          continue
        }

        if (!characterLineTops.some((lineTop) => Math.abs(lineTop - characterRectangle.top) <= 1)) {
          characterLineTops.push(characterRectangle.top)
        }
      }
    }

    return {
      characterLineTopCount: characterLineTops.length,
      inspectPaddingLeft: inspectButtonStyle.paddingLeft,
      inspectPaddingRight: inspectButtonStyle.paddingRight,
      nameHeight: pickedPerkNameRectangle.height,
      nameHorizontalOverflow: pickedPerkName.scrollWidth - pickedPerkName.clientWidth,
      nameHyphens: pickedPerkNameStyle.hyphens,
      nameLineClamp: pickedPerkNameStyle.webkitLineClamp,
      nameLineHeight: Number.isFinite(pickedPerkNameLineHeight)
        ? pickedPerkNameLineHeight
        : fallbackPickedPerkNameLineHeight,
      nameOverflowWrap: pickedPerkNameStyle.overflowWrap,
      nameRectangle: {
        height: pickedPerkNameRectangle.height,
        left: pickedPerkNameRectangle.left,
        right: pickedPerkNameRectangle.right,
        width: pickedPerkNameRectangle.width,
      },
      nameTextOverflow: pickedPerkNameStyle.textOverflow,
      nameVerticalOverflow: pickedPerkName.scrollHeight - pickedPerkName.clientHeight,
      nameWhiteSpace: pickedPerkNameStyle.whiteSpace,
      nameWordBreak: pickedPerkNameStyle.wordBreak,
      textFragmentCount,
    }
  })
}

async function getRequirementChainScaleMetrics(
  page: Page,
  viewport: { height: number; width: number },
) {
  await gotoBuildPlanner(page, viewport)
  await page.goto(createBuildUrl(['Clarity', 'Perfect Focus', 'Student']))
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()

  return page.evaluate(() => {
    function readRequirementChainMetrics(tileSelector: string) {
      const tile = document.querySelector(tileSelector)
      const chain = tile?.querySelector('[data-testid="planner-slot-requirement-chain"]')

      if (!(tile instanceof HTMLElement) || !(chain instanceof HTMLElement)) {
        throw new Error(`Unable to find requirement chain metrics for ${tileSelector}.`)
      }

      const tileRectangle = tile.getBoundingClientRect()
      const chainRectangle = chain.getBoundingClientRect()

      return {
        chainHeight: chainRectangle.height,
        chainHeightRatio: chainRectangle.height / tileRectangle.height,
        chainLeftOffset: chainRectangle.left - tileRectangle.left,
        chainLeftRatio: (chainRectangle.left - tileRectangle.left) / tileRectangle.height,
        chainTopOffset: chainRectangle.top - tileRectangle.top,
        chainTopRatio: (chainRectangle.top - tileRectangle.top) / tileRectangle.height,
        chainWidth: chainRectangle.width,
        chainWidthRatio: chainRectangle.width / tileRectangle.height,
        tileHeight: tileRectangle.height,
      }
    }

    return {
      legend: readRequirementChainMetrics(
        '[data-testid="planner-requirement-legend-tile"][data-requirement="must-have"]',
      ),
      picked: readRequirementChainMetrics(
        '[data-planner-collection="picked-perks"] [data-testid="planner-slot-perk"][data-requirement="must-have"]',
      ),
    }
  })
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

    const buildPlanner = document.querySelector(
      '[aria-label="Build planner"]',
    ) as HTMLElement | null
    const plannerBoard = document.querySelector(
      '[data-testid="planner-board"]',
    ) as HTMLElement | null

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
      perkRows: getVisualRowCount(
        '[data-testid="build-perks-bar"]',
        '[data-testid="planner-slot-perk"]',
      ),
      sharedRows: getVisualRowCount(
        '[data-testid="build-shared-groups-list"]',
        '[data-testid="planner-group-card"]',
      ),
      totalContentRows:
        getVisualRowCount('[data-testid="build-perks-bar"]', '[data-testid="planner-slot-perk"]') +
        getVisualRowCount(
          '[data-testid="build-shared-groups-list"]',
          '[data-testid="planner-group-card"]',
        ) +
        getVisualRowCount(
          '[data-testid="build-individual-groups-list"]',
          '[data-testid="planner-group-card"]',
        ),
    }
  })
}

test('build planner splits shared and individual perk groups without layout drift', async ({
  page,
}) => {
  await gotoBuildPlanner(page, { height: 768, width: 1366 })

  const initialHeaderHeight = await page
    .getByTestId('build-planner-header')
    .evaluate((element) => element.getBoundingClientRect().height)
  const headerHeightSubpixelTolerance = 2

  await expect(
    page.getByTestId('build-planner-header').getByRole('heading', { name: 'Build planner' }),
  ).toHaveCount(0)
  await expect(page.getByTestId('build-planner-summary')).toHaveCount(0)
  expect(initialHeaderHeight).toBeLessThanOrEqual(64)

  await searchPerks(page, 'Clarity')
  await inspectPerkFromResults(page, 'Clarity')

  const resultsRowHeightBeforePicking = await page
    .getByTestId('results-list')
    .getByTestId('perk-row')
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
  await expect.poll(async () => getPlannerBoardVisualVerticalOverflow(page)).toBeLessThanOrEqual(1)
  await expect
    .poll(async () =>
      page
        .getByTestId('planner-board')
        .evaluate((element) => element.getBoundingClientRect().height),
    )
    .toBeGreaterThanOrEqual(plannerBoardHeightBeforePicking - 8)
  const headerHeightAfterPicking = await page
    .getByTestId('build-planner-header')
    .evaluate((element) => element.getBoundingClientRect().height)
  const rootFontSize = await page.evaluate(() =>
    Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize),
  )
  const plannerRowTopTolerance = Math.max(
    Math.ceil(rootFontSize * 0.625),
    Math.ceil(Math.abs(headerHeightAfterPicking - initialHeaderHeight)) + 1,
  )
  const plannerRowTopsAfterPicking = await page
    .getByTestId('planner-row')
    .evaluateAll((rows) => rows.map((row) => Math.round(row.getBoundingClientRect().top)))

  expect(plannerRowTopsAfterPicking).toHaveLength(plannerRowTopsBeforePicking.length)
  for (const [rowIndex, plannerRowTopBeforePicking] of plannerRowTopsBeforePicking.entries()) {
    expect(
      Math.abs(plannerRowTopsAfterPicking[rowIndex] - plannerRowTopBeforePicking),
    ).toBeLessThanOrEqual(plannerRowTopTolerance)
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
  const plannerSectionLabelTypography = await page.evaluate(() => {
    const previousFontSizeProbe = document.createElement('span')
    previousFontSizeProbe.style.fontSize = 'var(--type-section-title-size)'
    document.body.append(previousFontSizeProbe)
    const previousSectionTitleFontSize = Number.parseFloat(
      window.getComputedStyle(previousFontSizeProbe).fontSize,
    )
    previousFontSizeProbe.remove()

    const fontFamilyProbe = document.createElement('span')
    fontFamilyProbe.style.fontFamily = 'var(--heading-font-family)'
    document.body.append(fontFamilyProbe)
    const expectedFontFamily = window.getComputedStyle(fontFamilyProbe).fontFamily
    fontFamilyProbe.remove()

    const rowLabel = [
      ...document.querySelectorAll<HTMLElement>('span[class*="plannerRowLabel"]'),
    ].find((element) => element.textContent?.trim() === 'Perks')
    const toggleLabels = [
      ...document.querySelectorAll<HTMLElement>('[class*="plannerSectionToggleLabel"]'),
    ]

    if (!(rowLabel instanceof HTMLElement)) {
      throw new Error('Missing planner row label.')
    }

    return [rowLabel, ...toggleLabels].map((label) => {
      const computedStyle = window.getComputedStyle(label)

      return {
        expectedFontFamily,
        fontFamily: computedStyle.fontFamily,
        fontSize: Number.parseFloat(computedStyle.fontSize),
        fontWeight: computedStyle.fontWeight,
        previousSectionTitleFontSize,
        text: label.textContent?.trim(),
        textTransform: computedStyle.textTransform,
      }
    })
  })

  expect(plannerSectionLabelTypography.map((typography) => typography.text)).toEqual([
    'Perks',
    'Perk groups for 2+ perks',
    'Perk groups for individual perks',
  ])
  const firstPlannerSectionLabelTypography = plannerSectionLabelTypography[0]

  expect(firstPlannerSectionLabelTypography).toBeDefined()
  for (const labelTypography of plannerSectionLabelTypography) {
    expect(labelTypography.fontFamily).toBe(labelTypography.expectedFontFamily)
    expect(
      Math.abs(labelTypography.fontSize - firstPlannerSectionLabelTypography!.fontSize),
    ).toBeLessThanOrEqual(0.01)
    expect(labelTypography.fontSize).toBeLessThan(labelTypography.previousSectionTitleFontSize)
    expect(labelTypography.fontSize).toBeGreaterThan(
      labelTypography.previousSectionTitleFontSize * 0.85,
    )
    expect(Number(labelTypography.fontWeight)).toBeGreaterThanOrEqual(700)
    expect(labelTypography.textTransform).toBe('none')
  }

  const infoButton = page.getByRole('button', { name: 'Show build planner guidance' })
  const infoButtonText = await infoButton.textContent()
  const infoButtonGlyph = infoButton.getByTestId('build-planner-info-glyph')
  const infoButtonStyle = await infoButton.evaluate((element) => {
    const computedStyle = window.getComputedStyle(element)
    const rootStyle = window.getComputedStyle(document.documentElement)
    const compactTargetSize = Number.parseFloat(rootStyle.getPropertyValue('--target-size-compact'))
    const rootFontSize = Number.parseFloat(rootStyle.fontSize)

    return {
      cursor: computedStyle.cursor,
      expectedSize: compactTargetSize * rootFontSize * 1.5,
      height: Number.parseFloat(computedStyle.height),
      textTransform: computedStyle.textTransform,
      width: Number.parseFloat(computedStyle.width),
    }
  })
  const infoButtonGlyphStyle = await infoButtonGlyph.evaluate((element) => {
    const computedStyle = window.getComputedStyle(element)
    const fontSizeProbe = document.createElement('span')
    fontSizeProbe.style.fontSize = 'calc(var(--type-panel-title-size) * 1.08)'
    document.body.append(fontSizeProbe)

    const expectedFontSize = Number.parseFloat(window.getComputedStyle(fontSizeProbe).fontSize)
    fontSizeProbe.remove()

    const fontFamily = computedStyle.fontFamily
      .split(',')[0]
      .trim()
      .replaceAll('"', '')
      .replaceAll("'", '')
      .toLowerCase()

    return {
      expectedFontSize,
      fontFamily,
      fontSize: Number.parseFloat(computedStyle.fontSize),
      fontStyle: computedStyle.fontStyle,
      textTransform: computedStyle.textTransform,
      transform: computedStyle.transform,
    }
  })

  expect(infoButtonText).toBe('i')
  expect(infoButtonStyle.cursor).toBe('help')
  expect(Math.abs(infoButtonStyle.height - infoButtonStyle.expectedSize)).toBeLessThan(0.5)
  expect(Math.abs(infoButtonStyle.width - infoButtonStyle.expectedSize)).toBeLessThan(0.5)
  expect(infoButtonStyle.textTransform).toBe('none')
  expect(infoButtonGlyphStyle.fontFamily).toBe('georgia')
  expect(
    Math.abs(infoButtonGlyphStyle.fontSize - infoButtonGlyphStyle.expectedFontSize),
  ).toBeLessThan(0.5)
  expect(infoButtonGlyphStyle.fontStyle).toBe('italic')
  expect(infoButtonGlyphStyle.textTransform).toBe('none')
  expect(infoButtonGlyphStyle.transform).not.toBe('none')

  await infoButton.hover()
  const infoTooltip = page.getByTestId('build-planner-info-tooltip')
  const infoTooltipLeft = await infoTooltip.evaluate(
    (element) => element.getBoundingClientRect().left,
  )

  expect(infoTooltipLeft).toBeGreaterThanOrEqual(0)
  await expect(infoTooltip).toContainText(/chain adds must-have perks/i)
  await expect(infoTooltip).toContainText(/split adds optional perks/i)
  await expect(infoTooltip).toContainText(/scored separately from must-have perks/i)
  await page.mouse.move(1, 1)
  await expect(page.getByTestId('build-perk-tooltip')).toHaveCount(0)

  const resultsRowHeightAfterPicking = await page
    .getByTestId('results-list')
    .getByTestId('perk-row')
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
  const plannerGroupCard = getBuildIndividualGroupsList(page)
    .getByTestId('planner-group-card')
    .first()

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
  await expect(pickedPerkTile).toHaveAttribute('data-tooltip-pending', 'false')
  await expect(page.getByTestId('build-perk-tooltip')).toHaveCount(0)

  await pickedPerkTile.hover()
  const pickedPerkRemoveButton = pickedPerkTile.getByRole('button', {
    name: 'Remove Clarity from build',
  })

  await expect(pickedPerkTile).toHaveAttribute('data-tooltip-pending', 'true', {
    timeout: 2500,
  })
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

  const buildPerkTooltip = page.getByTestId('build-perk-tooltip')

  await expect(buildPerkTooltip).toBeVisible({ timeout: 2500 })
  await expect(buildPerkTooltip).toHaveAttribute('role', 'dialog')
  await expect(pickedPerkTile).toHaveAttribute('data-tooltip-pending', 'true')
  await expect(buildPerkTooltip.getByTestId('build-perk-tooltip-title')).toHaveCount(0)
  await expect(buildPerkTooltip).not.toContainText('Clarity')
  await expect(buildPerkTooltip).toContainText(/An additional \+10% of any damage ignores armor/i)
  const tooltipTouchGap = await page.evaluate(() => {
    const tooltip = document.querySelector('[data-testid="build-perk-tooltip"]')
    const activeTrigger = document.querySelector(
      '[data-testid="planner-slot-perk"][data-tooltip-pending="true"]',
    )

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
  await expectPlannerGroupTilesSettled(page)
  await expect(page.getByRole('region', { name: 'Build planner' })).toHaveAttribute(
    'data-scroll-constrained',
    'false',
  )
  expect(
    await getBuildSharedGroupsList(page).getByTestId('planner-group-card').count(),
  ).toBeGreaterThan(0)
  expect(await getPlannerBoardVisualVerticalOverflow(page)).toBeLessThanOrEqual(1)

  await page.setViewportSize({ height: 768, width: 1280 })
  await expect(page.getByRole('region', { name: 'Build planner' })).toHaveAttribute(
    'data-scroll-constrained',
    'false',
  )
  await expect.poll(async () => getPlannerBoardVisualVerticalOverflow(page)).toBeLessThanOrEqual(1)

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

  expect(wrappedPerkRowTops.length).toBeGreaterThanOrEqual(1)

  if (wrappedPerkRowTops.length > 1) {
    expect(
      Math.abs(
        wrappedPerkTilePositions.find((position) => position.top === wrappedPerkRowTops[0])!.left -
          wrappedPerkTilePositions.find((position) => position.top === wrappedPerkRowTops[1])!.left,
      ),
    ).toBeLessThanOrEqual(2)
  }
})

test('scrolls the planner below wide desktop only after compact content exceeds its budget', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto(createBuildUrl(manyPickedPerkNames.slice(0, 7)))
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()
  await expectPlannerGroupTilesSettled(page)

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
  expect(twoRowPlannerMetrics.totalContentRows).toBeLessThanOrEqual(4)

  await page.goto(createBuildUrl(manyPickedPerkNames.slice(0, 18)))
  await expect(page.getByText('18 perks picked.')).toBeVisible()
  await expectPlannerGroupTilesSettled(page)
  await expect(page.getByRole('region', { name: 'Build planner' })).toHaveAttribute(
    'data-scroll-constrained',
    'true',
  )

  const overflowingPlannerMetrics = await getPlannerWrapMetrics(page)

  expect(overflowingPlannerMetrics.boardOverflow).toBeGreaterThan(20)
  expect(overflowingPlannerMetrics.totalContentRows).toBeGreaterThan(4)

  await page.setViewportSize({ width: 2560, height: 900 })
  await page.goto(createBuildUrl(manyPickedPerkNames))
  await expect(page.getByText('27 perks picked.')).toBeVisible()
  await expectPlannerGroupTilesSettled(page)
  await expect(page.getByRole('region', { name: 'Build planner' })).toHaveAttribute(
    'data-scroll-constrained',
    'false',
  )

  const wideDesktopPlannerMetrics = await getPlannerWrapMetrics(page)

  expect(wideDesktopPlannerMetrics.boardOverflow).toBeLessThanOrEqual(1)
})

test('groups perk groups by shared and individual perk coverage', async ({ page }) => {
  await gotoBuildPlanner(page)

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
  await gotoBuildPlanner(page, { height: 768, width: 1366 })
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
  expect(individualCollapsedPlannerBoardHeight).toBeLessThan(expandedPlannerBoardHeight - 1)

  await sharedCollapseToggle.click()

  const collapsedToggleGap = await page.evaluate(() => {
    const collapsedToggleRectangles = [
      ...document.querySelectorAll<HTMLElement>(
        '[data-testid="planner-section-toggle"][aria-expanded="false"]',
      ),
    ]
      .map((toggle) => toggle.getBoundingClientRect())
      .toSorted((leftRectangle, rightRectangle) => leftRectangle.top - rightRectangle.top)

    if (collapsedToggleRectangles.length !== 2) {
      return null
    }

    return collapsedToggleRectangles[1]!.top - collapsedToggleRectangles[0]!.bottom
  })

  expect(collapsedToggleGap).not.toBeNull()
  expect(collapsedToggleGap!).toBeGreaterThanOrEqual(6)
  const collapsedToggleLabelMetrics = await page.evaluate(() =>
    [
      ...document.querySelectorAll<HTMLElement>(
        '[data-testid="planner-section-toggle"][aria-expanded="false"]',
      ),
    ].map((toggle) => {
      const label = toggle.querySelector<HTMLElement>('[class*="plannerSectionToggleLabel"]')

      if (!(label instanceof HTMLElement)) {
        throw new Error('Missing planner section toggle label.')
      }

      const labelStyle = window.getComputedStyle(label)
      const toggleStyle = window.getComputedStyle(toggle)

      return {
        backgroundColor: toggleStyle.backgroundColor,
        borderTopWidth: toggleStyle.borderTopWidth,
        fontFamily: labelStyle.fontFamily,
        fontWeight: labelStyle.fontWeight,
        labelHeight: label.getBoundingClientRect().height,
        labelClientWidth: label.clientWidth,
        lineHeight: Number.parseFloat(labelStyle.lineHeight),
        text: label.textContent,
        textOverflow: labelStyle.textOverflow,
        whiteSpace: labelStyle.whiteSpace,
      }
    }),
  )

  expect(collapsedToggleLabelMetrics.map((metric) => metric.text)).toEqual([
    'Perk groups for 2+ perks',
    'Perk groups for individual perks',
  ])
  for (const collapsedToggleLabelMetric of collapsedToggleLabelMetrics) {
    expect(collapsedToggleLabelMetric.backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(collapsedToggleLabelMetric.borderTopWidth).toBe('0px')
    expect(collapsedToggleLabelMetric.fontFamily.toLowerCase()).toContain('cinzel')
    expect(collapsedToggleLabelMetric.fontWeight).toBe('700')
    expect(collapsedToggleLabelMetric.labelHeight).toBeGreaterThan(
      collapsedToggleLabelMetric.lineHeight * 1.5,
    )
    expect(collapsedToggleLabelMetric.textOverflow).not.toBe('ellipsis')
    expect(collapsedToggleLabelMetric.whiteSpace).not.toBe('nowrap')
  }
  const collapsedToggleTrackBoundaryMetrics = await page.evaluate(() => {
    const firstPickedPerkTile = document.querySelector<HTMLElement>(
      '[data-testid="planner-slot-perk"]',
    )
    const collapsedToggles = [
      ...document.querySelectorAll<HTMLElement>(
        '[data-testid="planner-section-toggle"][aria-expanded="false"]',
      ),
    ]

    if (!(firstPickedPerkTile instanceof HTMLElement) || collapsedToggles.length !== 2) {
      return null
    }

    const firstPickedPerkTileLeft = firstPickedPerkTile.getBoundingClientRect().left

    return collapsedToggles.map((collapsedToggle) => {
      const collapsedToggleRectangle = collapsedToggle.getBoundingClientRect()

      return {
        firstPickedPerkTileLeft,
        right: collapsedToggleRectangle.right,
      }
    })
  })

  expect(collapsedToggleTrackBoundaryMetrics).not.toBeNull()
  for (const collapsedToggleMetrics of collapsedToggleTrackBoundaryMetrics!) {
    expect(collapsedToggleMetrics.right).toBeLessThanOrEqual(
      collapsedToggleMetrics.firstPickedPerkTileLeft,
    )
  }

  await page.getByRole('button', { name: 'Expand perk groups for 2+ perks' }).click()
  await page.getByRole('button', { name: 'Expand perk groups for individual perks' }).click()
  await expect(buildIndividualGroupsList.getByTestId('planner-group-card')).toHaveCount(1)
  await expect(buildIndividualGroupsList).toBeVisible()
})

test('wraps collapsible planner group labels on mobile without hiding text', async ({ page }) => {
  await gotoBuildPlanner(page, { height: 844, width: 390 })
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
    const toggles = [
      ...document.querySelectorAll<HTMLElement>('[data-testid="planner-section-toggle"]'),
    ]

    return toggles.map((toggle) => {
      const toggleRectangle = toggle.getBoundingClientRect()
      const label = toggle.querySelector<HTMLElement>('[class*="plannerSectionToggleLabel"]')

      if (!(label instanceof HTMLElement)) {
        throw new Error('Missing planner section toggle label.')
      }

      const labelStyle = window.getComputedStyle(label)

      return {
        height: toggleRectangle.height,
        labelClientWidth: label.clientWidth,
        labelHeight: label.getBoundingClientRect().height,
        lineHeight: Number.parseFloat(labelStyle.lineHeight),
        textOverflow: labelStyle.textOverflow,
        whiteSpace: labelStyle.whiteSpace,
        width: toggleRectangle.width,
      }
    })
  })

  expect(toggleMetrics).toHaveLength(2)
  for (const toggleMetric of toggleMetrics) {
    expect(toggleMetric.height).toBeGreaterThan(toggleMetric.lineHeight * 1.5)
    expect(toggleMetric.labelHeight).toBeGreaterThan(toggleMetric.lineHeight * 1.5)
    expect(toggleMetric.width).toBeLessThan(260)
    expect(toggleMetric.textOverflow).not.toBe('ellipsis')
    expect(toggleMetric.whiteSpace).not.toBe('nowrap')
  }

  await sharedCollapseToggle.click()
  await individualCollapseToggle.click()
  await expect(buildSharedGroupsList).toBeHidden()
  await expect(buildIndividualGroupsList).toBeHidden()
  await expectNoDocumentHorizontalOverflow(page)
  await expect(page.getByTestId('planner-collapsed-sections')).toHaveCount(0)

  const collapsedToggleMetrics = await page.evaluate(() => {
    const toggles = [
      ...document.querySelectorAll<HTMLElement>('[data-testid="planner-section-toggle"]'),
    ]
      .filter((toggle) => toggle.getAttribute('aria-expanded') === 'false')
      .map((toggle) => {
        const toggleRectangle = toggle.getBoundingClientRect()
        const label = toggle.querySelector<HTMLElement>('[class*="plannerSectionToggleLabel"]')

        if (!(label instanceof HTMLElement)) {
          throw new Error('Missing planner section toggle label.')
        }

        const labelStyle = window.getComputedStyle(label)

        return {
          height: toggleRectangle.height,
          labelClientWidth: label.clientWidth,
          labelHeight: label.getBoundingClientRect().height,
          lineHeight: Number.parseFloat(labelStyle.lineHeight),
          text: label.textContent,
          textOverflow: labelStyle.textOverflow,
          whiteSpace: labelStyle.whiteSpace,
          width: toggleRectangle.width,
        }
      })

    return toggles
  })

  expect(collapsedToggleMetrics).toHaveLength(2)
  expect(collapsedToggleMetrics.map((metric) => metric.text)).toEqual([
    'Perk groups for 2+ perks',
    'Perk groups for individual perks',
  ])
  for (const collapsedToggleMetric of collapsedToggleMetrics) {
    expect(collapsedToggleMetric.height).toBeGreaterThan(collapsedToggleMetric.lineHeight * 1.5)
    expect(collapsedToggleMetric.labelHeight).toBeGreaterThan(
      collapsedToggleMetric.lineHeight * 1.5,
    )
    expect(collapsedToggleMetric.width).toBeLessThan(260)
    expect(collapsedToggleMetric.textOverflow).not.toBe('ellipsis')
    expect(collapsedToggleMetric.whiteSpace).not.toBe('nowrap')
  }

  const firstCollapsedToggleHitZonePoint = await page.evaluate(() => {
    const toggle = [
      ...document.querySelectorAll<HTMLElement>('[data-testid="planner-section-toggle"]'),
    ].find((candidateToggle) => candidateToggle.getAttribute('aria-expanded') === 'false')

    if (toggle === undefined) {
      throw new Error('Missing collapsed planner section toggle.')
    }

    const toggleRectangle = toggle.getBoundingClientRect()

    return {
      x: toggleRectangle.left + toggleRectangle.width / 2,
      y: toggleRectangle.top - 4,
    }
  })

  await page.mouse.click(firstCollapsedToggleHitZonePoint.x, firstCollapsedToggleHitZonePoint.y)
  await expect(buildSharedGroupsList).toBeVisible()
  await sharedCollapseToggle.click()
  await expect(buildSharedGroupsList).toBeHidden()

  await page.getByRole('button', { name: 'Expand perk groups for 2+ perks' }).click()
  await page.getByRole('button', { name: 'Expand perk groups for individual perks' }).click()
  await expect(buildSharedGroupsList.getByTestId('planner-group-card')).toHaveCount(2)
  await expect(buildIndividualGroupsList.getByTestId('planner-group-card')).toHaveCount(1)
  await expectNoDocumentHorizontalOverflow(page)
})

test('selects build planner perk groups from their group tiles', async ({ page }) => {
  await gotoBuildPlanner(page)

  await page.goto('/?build=Battle+Forged,Immovable+Object,Steadfast')
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()
  await searchPerks(page, 'temporary search')

  const heavyArmorGroupCard = getBuildSharedGroupsList(page)
    .getByTestId('planner-group-card')
    .filter({ hasText: 'Heavy Armor' })
  const heavyArmorGroupButton = heavyArmorGroupCard.getByRole('button', {
    name: 'Select perk group Heavy Armor',
  })
  const heavyArmorPillIcons = heavyArmorGroupCard.getByTestId('planner-pill-icon')

  await expect(heavyArmorPillIcons).toHaveCount(3)
  await expect(heavyArmorPillIcons.first()).toHaveAttribute(
    'src',
    getGameIconImageCdnSrcPattern('ui/perks/perk_03.png', 24),
  )
  await heavyArmorGroupButton.click()

  await expect(page.getByLabel('Search perks')).toHaveValue('')
  await expect(page.getByRole('button', { name: 'Disable category Defense' })).toBeVisible()
  await expect(getSidebarPerkGroupButton(page, 'Heavy Armor')).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  await searchPerks(page, 'temporary search')
  await expect(page.getByRole('button', { name: 'Enable category Defense' })).toBeVisible()

  const emptyPillListPosition = await heavyArmorGroupCard.evaluate((card) => {
    const pillList = card.querySelector('[data-testid="planner-pill-list"]')

    if (!(pillList instanceof HTMLElement)) {
      return null
    }

    const cardRectangle = card.getBoundingClientRect()
    const pillListRectangle = pillList.getBoundingClientRect()
    const pillRectangles = [...pillList.querySelectorAll('[data-testid="planner-pill"]')].map(
      (pill) => pill.getBoundingClientRect(),
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
        const pointTarget = document.elementFromPoint(x, y)
        const isInsidePillHitTarget =
          pointTarget instanceof HTMLElement &&
          pointTarget.closest('[data-testid="planner-pill"]') !== null

        if (!isInsidePill && !isInsidePillHitTarget) {
          return {
            absoluteX: x,
            absoluteY: y,
            x: x - cardRectangle.left,
            y: y - cardRectangle.top,
          }
        }
      }
    }

    return null
  })

  expect(emptyPillListPosition).not.toBeNull()
  await page.mouse.click(
    emptyPillListPosition?.absoluteX ?? 0,
    emptyPillListPosition?.absoluteY ?? 0,
  )

  await expect(page.getByLabel('Search perks')).toHaveValue('')
  await expect(getSidebarPerkGroupButton(page, 'Heavy Armor')).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  await searchPerks(page, 'temporary search')
  await heavyArmorGroupCard.getByRole('button', { name: 'Battle Forged' }).click()

  await expect(page.getByLabel('Search perks')).toHaveValue('')
  await expect(page.getByRole('heading', { level: 2, name: 'Battle Forged' })).toBeVisible()
})

test('resets perk result scrolling when selecting the same build planner perk group again', async ({
  page,
}) => {
  await gotoBuildPlanner(page, { height: 560, width: 1366 })
  await searchPerks(page, 'Berserker Rage')
  await addPerkToBuildFromResults(page, 'Berserker Rage')

  const resultsList = getResultsList(page)
  const berserkerGroupCard = getBuildIndividualGroupsList(page)
    .getByTestId('planner-group-card')
    .filter({ hasText: 'Berserker' })
  const exposedGroupCardPosition = {
    x: 16,
    y: 16,
  }

  await berserkerGroupCard.click({ position: exposedGroupCardPosition })
  await expect(page.getByLabel('Search perks')).toHaveValue('')
  await expect(getSidebarPerkGroupButton(page, 'Berserker')).toHaveAttribute('aria-pressed', 'true')
  await expect(resultsList.getByRole('button', { name: 'Inspect Berserker Rage' })).toBeVisible()
  await expect
    .poll(async () =>
      resultsList.evaluate((element) => element.scrollHeight - element.clientHeight),
    )
    .toBeGreaterThan(50)

  await resultsList.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await expect
    .poll(async () => resultsList.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0)

  await berserkerGroupCard.click({ position: exposedGroupCardPosition })

  await expect
    .poll(async () => resultsList.evaluate((element) => element.scrollTop))
    .toBeLessThanOrEqual(1)
})

test('filters multi-option planner group icons individually', async ({ page }) => {
  await gotoBuildPlanner(page)

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
  await expect(getSidebarPerkGroupButton(page, 'Swordmasters')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('separates planner group card hover from icon and perk pill hover states', async ({
  page,
}) => {
  await gotoBuildPlanner(page)

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
  const immovableObjectPill = heavyArmorGroupCard.getByRole('button', { name: 'Immovable Object' })
  const steadfastPill = heavyArmorGroupCard.getByRole('button', { name: 'Steadfast' })
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

  await page.mouse.move(1, 1)
  await expect(heavyArmorGroupCard).toHaveAttribute('data-has-highlighted-perk', 'false')
  await expect(immovableObjectPickedPerkTile).toHaveAttribute('data-highlighted', 'false')
  await expect(steadfastPickedPerkTile).toHaveAttribute('data-highlighted', 'false')
  await expect
    .poll(() =>
      heavyArmorGroupCard.evaluate((element) => window.getComputedStyle(element).backgroundColor),
    )
    .toBe(cardBackgroundBeforeHover)

  await battleForgedPickedPerkTile.hover()
  await expect(heavyArmorGroupCard).toHaveAttribute('data-has-highlighted-perk', 'true')
  await expect(battleForgedPill).toHaveAttribute('data-highlighted', 'true')
  await expect(immovableObjectPill).toHaveAttribute('data-highlighted', 'false')
  await expect(steadfastPill).toHaveAttribute('data-highlighted', 'false')
  await expect
    .poll(() =>
      heavyArmorGroupCard.evaluate((element) => window.getComputedStyle(element).backgroundColor),
    )
    .toBe(activePlannerSurfaceColor)

  await page.mouse.move(1, 1)
  await expect(page.getByTestId('build-perk-tooltip')).toHaveCount(0)
  await expect(battleForgedPill).toHaveAttribute('data-tooltip-pending', 'false')
  await expect(battleForgedPickedPerkTile).toHaveAttribute('data-tooltip-pending', 'false')

  await battleForgedPill.hover()
  await expect(battleForgedPill).toHaveAttribute('data-tooltip-pending', 'true', {
    timeout: 2500,
  })
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
    .toBe(activePlannerSurfaceColor)
  await expect(battleForgedPill).toHaveAttribute('data-highlighted', 'true')
  await expect(immovableObjectPill).toHaveAttribute('data-highlighted', 'false')
  await expect(steadfastPill).toHaveAttribute('data-highlighted', 'false')
  await expect
    .poll(() =>
      battleForgedPill.evaluate((element) => window.getComputedStyle(element).backgroundColor),
    )
    .toBe(activePlannerSurfaceColor)
  const iconBorderAfterPerkHover = await heavyArmorIcon.evaluate(
    (element) => window.getComputedStyle(element).borderTopColor,
  )

  expectCssRgbColorsToMatch(iconBorderAfterPerkHover, iconBorderBeforeCardHover)
  const buildPerkTooltip = page.getByTestId('build-perk-tooltip')

  await expect(buildPerkTooltip).toBeVisible({ timeout: 2500 })
  await expect(battleForgedPill).toHaveAttribute('data-tooltip-pending', 'true')
  await expect(battleForgedPickedPerkTile).toHaveAttribute('data-tooltip-pending', 'false')
  await expect(buildPerkTooltip).not.toContainText('Battle Forged')
  await expect(buildPerkTooltip).toContainText(/Armor damage taken is reduced/i)
  await page.mouse.move(1, 1)
  await expect(page.getByTestId('build-perk-tooltip')).toHaveCount(0)
})

test('opens planner group pill tooltip actions from keyboard focus', async ({ page }) => {
  await gotoBuildPlanner(page)

  await page.goto('/?build=Battle+Forged,Immovable+Object,Steadfast')
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()

  const heavyArmorGroupCard = getBuildSharedGroupsList(page)
    .getByTestId('planner-group-card')
    .filter({ hasText: 'Heavy Armor' })
  const battleForgedPill = heavyArmorGroupCard.getByRole('button', { name: 'Battle Forged' })

  await battleForgedPill.focus()

  const buildPerkTooltip = page.getByTestId('build-perk-tooltip')

  await expect(buildPerkTooltip).toBeVisible()
  await expect(battleForgedPill).toHaveAttribute('aria-expanded', 'true')
  await expect(battleForgedPill).toHaveAttribute('aria-haspopup', 'dialog')
  await expect(battleForgedPill).toHaveAttribute('aria-controls', /build-perk-tooltip-/u)
  await expect(battleForgedPill).not.toHaveAttribute('aria-describedby')
  await expect(buildPerkTooltip).toHaveAttribute('role', 'dialog')

  await page.keyboard.press('ArrowDown')

  const tooltipRemoveButton = buildPerkTooltip.getByRole('button', {
    name: 'Remove Battle Forged from build from tooltip',
  })

  await expect(tooltipRemoveButton).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(buildPerkTooltip).toHaveCount(0)
})

test('keeps picked perk hover from highlighting peer picked perks in the same group', async ({
  page,
}) => {
  await gotoBuildPlanner(page)

  await page.goto(createBuildUrl(['Battle Forged', 'Immovable Object', 'Steadfast', 'Brawny']))
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()

  const buildPerksBar = getBuildPerksBar(page)
  const battleForgedPickedPerkTile = buildPerksBar
    .getByTestId('planner-slot-perk')
    .filter({ hasText: 'Battle Forged' })
  const immovableObjectPickedPerkTile = buildPerksBar
    .getByTestId('planner-slot-perk')
    .filter({ hasText: 'Immovable Object' })
  const steadfastPickedPerkTile = buildPerksBar
    .getByTestId('planner-slot-perk')
    .filter({ hasText: 'Steadfast' })
  const brawnyPickedPerkTile = buildPerksBar
    .getByTestId('planner-slot-perk')
    .filter({ hasText: 'Brawny' })
  const heavyArmorGroupCard = getBuildSharedGroupsList(page)
    .getByTestId('planner-group-card')
    .filter({ hasText: 'Heavy Armor' })

  await battleForgedPickedPerkTile.hover()

  await expect(heavyArmorGroupCard).toHaveAttribute('data-has-highlighted-perk', 'true')
  await expect(battleForgedPickedPerkTile).toHaveAttribute('data-highlighted', 'true')
  await expect(immovableObjectPickedPerkTile).toHaveAttribute('data-highlighted', 'false')
  await expect(steadfastPickedPerkTile).toHaveAttribute('data-highlighted', 'false')
  await expect(brawnyPickedPerkTile).toHaveAttribute('data-highlighted', 'false')
})

test('visually highlights optional picked perks from matching group hover', async ({ page }) => {
  await gotoBuildPlanner(page)

  await page.goto(createBuildUrl(['Battle Forged', 'Immovable Object', 'Steadfast', 'Brawny']))
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()

  const activePlannerSurfaceColor = await getResolvedCssBackgroundColor(
    page,
    'var(--surface-result-active)',
  )
  const activeOptionalPlannerSurfaceColor = await getResolvedCssBackgroundColor(
    page,
    'var(--surface-planner-optional-active)',
  )
  const activeOptionalPlannerBorderColor = await getResolvedCssBorderColor(
    page,
    'var(--border-planner-optional-active)',
  )
  const buildPerksBar = getBuildPerksBar(page)
  const brawnyPickedPerkTile = buildPerksBar
    .getByTestId('planner-slot-perk')
    .filter({ hasText: 'Brawny' })
  const heavyArmorGroupCard = getBuildSharedGroupsList(page)
    .getByTestId('planner-group-card')
    .filter({ hasText: 'Heavy Armor' })

  await brawnyPickedPerkTile.hover()
  await brawnyPickedPerkTile.getByTestId('planner-slot-optional-button').click()
  await page.getByLabel('Search perks').focus()
  await page.mouse.move(1, 1)

  const optionalBrawnyPickedPerkTile = buildPerksBar
    .getByTestId('planner-slot-perk')
    .filter({ hasText: 'Brawny' })
  await expect(optionalBrawnyPickedPerkTile).toHaveAttribute('data-highlighted', 'false')
  const optionalBrawnyBaseBackgroundColor = await optionalBrawnyPickedPerkTile.evaluate(
    (element) => window.getComputedStyle(element).backgroundColor,
  )
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

  await expect(optionalBrawnyPickedPerkTile).toHaveAttribute('data-requirement', 'optional')
  await expect(optionalBrawnyPickedPerkTile).toHaveAttribute('data-highlighted', 'true')
  expect(optionalBrawnyBaseBackgroundColor).not.toBe(activePlannerSurfaceColor)
  expect(activeOptionalPlannerSurfaceColor).not.toBe(activePlannerSurfaceColor)
  await expect
    .poll(() =>
      optionalBrawnyPickedPerkTile.evaluate(
        (element) => window.getComputedStyle(element).backgroundColor,
      ),
    )
    .toBe(activeOptionalPlannerSurfaceColor)
  await waitForCssRgbColor(
    () =>
      optionalBrawnyPickedPerkTile.evaluate(
        (element) => window.getComputedStyle(element).borderTopColor,
      ),
    activeOptionalPlannerBorderColor,
  )
})

test('keeps long planner group names compact without category text', async ({ page }) => {
  await gotoBuildPlanner(page)

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

test('keeps ancient scroll group tile markers from reserving header space', async ({ page }) => {
  await gotoBuildPlanner(page)

  await searchPerks(page, 'Magic Missile Focus')
  await addPerkToBuildFromResults(page, 'Magic Missile Focus')

  const plannerGroupCard = getBuildIndividualGroupsList(page)
    .getByTestId('planner-group-card')
    .filter({ hasText: 'Evocation' })
  const ancientScrollMarker = plannerGroupCard.getByTestId('ancient-scroll-perk-group-marker')

  await expect(plannerGroupCard).toBeVisible()
  await expect(ancientScrollMarker).toBeVisible()
  await expectRawAncientScrollMarker(ancientScrollMarker)

  const plannerGroupCardMetrics = await plannerGroupCard.evaluate((card) => {
    const groupCount = card.querySelector('[data-testid="planner-slot-group-count"]')
    const marker = card.querySelector('[data-testid="ancient-scroll-perk-group-marker"]')

    if (!(groupCount instanceof HTMLElement) || !(marker instanceof HTMLElement)) {
      return null
    }

    const cardRectangle = card.getBoundingClientRect()
    const groupCountRectangle = groupCount.getBoundingClientRect()
    const markerRectangle = marker.getBoundingClientRect()
    const rootFontSize = Number.parseFloat(
      window.getComputedStyle(document.documentElement).fontSize,
    )
    const cardPaddingRight = Number.parseFloat(window.getComputedStyle(card).paddingRight)

    return {
      cardPaddingRight,
      groupCountRightGap: cardRectangle.right - groupCountRectangle.right,
      markerWidth: markerRectangle.width,
      expectedMarkerWidth: rootFontSize * 1.4,
      previousMarkerWidth: rootFontSize * 1.12,
    }
  })

  expect(plannerGroupCardMetrics).not.toBeNull()
  expect(plannerGroupCardMetrics!.groupCountRightGap).toBeLessThanOrEqual(
    plannerGroupCardMetrics!.cardPaddingRight + 1,
  )
  expect(plannerGroupCardMetrics!.markerWidth).toBeGreaterThanOrEqual(
    plannerGroupCardMetrics!.previousMarkerWidth * 1.24,
  )
  expect(
    Math.abs(plannerGroupCardMetrics!.markerWidth - plannerGroupCardMetrics!.expectedMarkerWidth),
  ).toBeLessThanOrEqual(1)
})

test('wraps picked perk names at spaces inside compact fixed tiles', async ({ page }) => {
  await gotoBuildPlanner(page, { height: 768, width: 1366 })
  await page.goto(createBuildUrl(['Ammunition Bundles', 'Clarity']))
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()

  const ammunitionBundlesPickedPerkTile = getBuildPerksBar(page)
    .getByTestId('planner-slot-perk')
    .filter({ hasText: 'Ammunition Bundles' })
  const ammunitionBundlesRemoveButton = ammunitionBundlesPickedPerkTile.getByTestId(
    'planner-slot-remove-button',
  )

  await expect(ammunitionBundlesPickedPerkTile).toBeVisible()
  await expect(ammunitionBundlesRemoveButton).toHaveAttribute(
    'title',
    'Remove Ammunition Bundles from build',
  )

  const pickedPerkMetrics = await ammunitionBundlesPickedPerkTile.evaluate((pickedPerkTile) => {
    const pickedPerkActionPanel = pickedPerkTile.querySelector(
      '[data-testid="planner-slot-action-panel"]',
    )
    const pickedPerkName = pickedPerkTile.querySelector('[data-testid="planner-picked-perk-name"]')
    const pickedPerkOptionalButton = pickedPerkTile.querySelector(
      '[data-testid="planner-slot-optional-button"]',
    )
    const pickedPerkRemoveButton = pickedPerkTile.querySelector(
      '[data-testid="planner-slot-remove-button"]',
    )
    const pickedPerkInspectButton = pickedPerkTile.querySelector(
      'button[aria-label="Ammunition Bundles, view from build planner"]',
    )
    const buildPlanner = pickedPerkTile.closest('[aria-label="Build planner"]')

    if (
      !(pickedPerkActionPanel instanceof HTMLElement) ||
      !(pickedPerkName instanceof HTMLElement) ||
      !(pickedPerkOptionalButton instanceof HTMLElement) ||
      !(pickedPerkRemoveButton instanceof HTMLElement) ||
      !(pickedPerkInspectButton instanceof HTMLElement) ||
      !(buildPlanner instanceof HTMLElement)
    ) {
      return null
    }

    const pickedPerkTileRectangle = pickedPerkTile.getBoundingClientRect()
    const pickedPerkActionPanelRectangle = pickedPerkActionPanel.getBoundingClientRect()
    const pickedPerkActionPanelStyle = window.getComputedStyle(pickedPerkActionPanel)
    const pickedPerkInspectButtonRectangle = pickedPerkInspectButton.getBoundingClientRect()
    const pickedPerkOptionalButtonRectangle = pickedPerkOptionalButton.getBoundingClientRect()
    const pickedPerkOptionalButtonStyle = window.getComputedStyle(pickedPerkOptionalButton)
    const pickedPerkRemoveButtonRectangle = pickedPerkRemoveButton.getBoundingClientRect()
    const pickedPerkRemoveButtonStyle = window.getComputedStyle(pickedPerkRemoveButton)
    const computedStyle = window.getComputedStyle(pickedPerkTile)
    const pickedPerkNameStyle = window.getComputedStyle(pickedPerkName)
    const pickedPerkNameRectangle = pickedPerkName.getBoundingClientRect()
    const pickedPerkNameLineHeight = Number.parseFloat(pickedPerkNameStyle.lineHeight)
    const fallbackPickedPerkNameLineHeight = Number.parseFloat(pickedPerkNameStyle.fontSize) * 1.05
    const plannerPickedPerkSlotWidth = Number.parseFloat(
      window.getComputedStyle(buildPlanner).getPropertyValue('--planner-picked-perk-slot-width'),
    )
    const plannerSlotWidth = Number.parseFloat(
      window.getComputedStyle(buildPlanner).getPropertyValue('--planner-slot-width'),
    )
    const rootFontSize = Number.parseFloat(
      window.getComputedStyle(document.documentElement).fontSize,
    )

    return {
      actionPanelBottomOffset: Math.abs(
        pickedPerkActionPanelRectangle.bottom - pickedPerkTileRectangle.bottom,
      ),
      actionPanelBorderRadius: pickedPerkActionPanelStyle.borderRadius,
      actionPanelBorderBottomRightRadius: pickedPerkActionPanelStyle.borderBottomRightRadius,
      actionPanelBorderTopRightRadius: pickedPerkActionPanelStyle.borderTopRightRadius,
      actionPanelPosition: pickedPerkActionPanelStyle.position,
      actionPanelRightOffset: Math.abs(
        pickedPerkActionPanelRectangle.right - pickedPerkTileRectangle.right,
      ),
      actionPanelTopOffset: Math.abs(
        pickedPerkActionPanelRectangle.top - pickedPerkTileRectangle.top,
      ),
      actionPanelTransitionProperty: pickedPerkActionPanelStyle.transitionProperty,
      actionPanelVisibility: pickedPerkActionPanelStyle.visibility,
      actionPanelWidthRatio: pickedPerkActionPanelRectangle.width / pickedPerkTileRectangle.width,
      nameHeight: pickedPerkNameRectangle.height,
      nameHorizontalOverflow: pickedPerkName.scrollWidth - pickedPerkName.clientWidth,
      nameHyphens: pickedPerkNameStyle.hyphens,
      nameLineClamp: pickedPerkNameStyle.webkitLineClamp,
      nameLineHeight: Number.isFinite(pickedPerkNameLineHeight)
        ? pickedPerkNameLineHeight
        : fallbackPickedPerkNameLineHeight,
      nameOverflowWrap: pickedPerkNameStyle.overflowWrap,
      nameTextOverflow: pickedPerkNameStyle.textOverflow,
      nameVerticalOverflow: pickedPerkName.scrollHeight - pickedPerkName.clientHeight,
      nameWhiteSpace: pickedPerkNameStyle.whiteSpace,
      nameWordBreak: pickedPerkNameStyle.wordBreak,
      optionalBottomOffset: Math.abs(
        pickedPerkOptionalButtonRectangle.bottom -
          (pickedPerkTileRectangle.top + pickedPerkTileRectangle.height / 2),
      ),
      optionalBorderBottomWidth: pickedPerkOptionalButtonStyle.borderBottomWidth,
      optionalBorderRadius: pickedPerkOptionalButtonStyle.borderRadius,
      optionalHeightRatio:
        pickedPerkOptionalButtonRectangle.height / pickedPerkTileRectangle.height,
      optionalTopOffset: Math.abs(
        pickedPerkOptionalButtonRectangle.top - pickedPerkTileRectangle.top,
      ),
      pickedPerkSlotWidth: plannerPickedPerkSlotWidth * rootFontSize,
      removeBottomOffset: Math.abs(
        pickedPerkRemoveButtonRectangle.bottom - pickedPerkTileRectangle.bottom,
      ),
      removeBorderRadius: pickedPerkRemoveButtonStyle.borderRadius,
      removeRightOffset: Math.abs(
        pickedPerkRemoveButtonRectangle.right - pickedPerkTileRectangle.right,
      ),
      removeHeightRatio: pickedPerkRemoveButtonRectangle.height / pickedPerkTileRectangle.height,
      removeTopOffset: Math.abs(
        pickedPerkRemoveButtonRectangle.top -
          (pickedPerkTileRectangle.top + pickedPerkTileRectangle.height / 2),
      ),
      removeWidthRatio: pickedPerkRemoveButtonRectangle.width / pickedPerkTileRectangle.width,
      slotWidth: plannerSlotWidth * rootFontSize,
      inspectButtonWidth: pickedPerkInspectButtonRectangle.width,
      tileWidth: pickedPerkTileRectangle.width,
      widthStyle: computedStyle.width,
    }
  })
  const pickedPerkNameSizeBeforeHover = await ammunitionBundlesPickedPerkTile
    .getByTestId('planner-picked-perk-name')
    .evaluate((pickedPerkName) => {
      const rectangle = pickedPerkName.getBoundingClientRect()

      return {
        height: rectangle.height,
        width: rectangle.width,
      }
    })

  await ammunitionBundlesPickedPerkTile.hover()

  const pickedPerkActionPanelStyleAfterHover = await ammunitionBundlesPickedPerkTile
    .getByTestId('planner-slot-action-panel')
    .evaluate((pickedPerkActionPanel) => {
      const pickedPerkActionPanelStyle = window.getComputedStyle(pickedPerkActionPanel)

      return {
        visibility: pickedPerkActionPanelStyle.visibility,
      }
    })
  const pickedPerkNameSizeAfterHover = await ammunitionBundlesPickedPerkTile
    .getByTestId('planner-picked-perk-name')
    .evaluate((pickedPerkName) => {
      const rectangle = pickedPerkName.getBoundingClientRect()

      return {
        height: rectangle.height,
        width: rectangle.width,
      }
    })
  const plannerGroupCard = getBuildIndividualGroupsList(page)
    .getByTestId('planner-group-card')
    .first()
  const plannerGroupCardMetrics = await plannerGroupCard.evaluate((groupCard) => {
    const groupName = groupCard.querySelector('[data-testid="planner-slot-name"]')
    const buildPlanner = groupCard.closest('[aria-label="Build planner"]')

    if (!(groupName instanceof HTMLElement) || !(buildPlanner instanceof HTMLElement)) {
      return null
    }

    const groupCardRectangle = groupCard.getBoundingClientRect()
    const groupNameRectangle = groupName.getBoundingClientRect()
    const groupNameStyle = window.getComputedStyle(groupName)
    const groupNameLineHeight = Number.parseFloat(groupNameStyle.lineHeight)
    const fallbackGroupNameLineHeight = Number.parseFloat(groupNameStyle.fontSize) * 1.12
    const plannerTileWidth = Number.parseFloat(
      window.getComputedStyle(buildPlanner).getPropertyValue('--planner-tile-width'),
    )
    const rootFontSize = Number.parseFloat(
      window.getComputedStyle(document.documentElement).fontSize,
    )

    return {
      groupNameHeight: groupNameRectangle.height,
      groupNameLineClamp: groupNameStyle.webkitLineClamp,
      groupNameLineHeight: Number.isFinite(groupNameLineHeight)
        ? groupNameLineHeight
        : fallbackGroupNameLineHeight,
      groupTileWidth: plannerTileWidth * rootFontSize,
      tileWidth: groupCardRectangle.width,
    }
  })
  const pickedPerkTileWidths = await getBuildPerksBar(page)
    .getByTestId('planner-slot-perk')
    .evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().width))

  expect(pickedPerkMetrics).not.toBeNull()
  expect(pickedPerkMetrics!.nameHorizontalOverflow).toBeLessThanOrEqual(1)
  expect(pickedPerkMetrics!.nameHyphens).toBe('none')
  expect(pickedPerkMetrics!.nameLineClamp).toBe('2')
  expect(pickedPerkMetrics!.nameOverflowWrap).toBe('normal')
  expect(pickedPerkMetrics!.nameTextOverflow).toBe('ellipsis')
  expect(pickedPerkMetrics!.nameVerticalOverflow).toBeLessThanOrEqual(2)
  expect(pickedPerkMetrics!.nameWhiteSpace).toBe('normal')
  expect(pickedPerkMetrics!.nameWordBreak).toBe('normal')
  expect(pickedPerkMetrics!.nameHeight).toBeGreaterThan(pickedPerkMetrics!.nameLineHeight + 1)
  expect(pickedPerkMetrics!.nameHeight).toBeLessThanOrEqual(
    pickedPerkMetrics!.nameLineHeight * 2 + 1,
  )
  expect(pickedPerkMetrics!.actionPanelPosition).toBe('absolute')
  expect(pickedPerkMetrics!.actionPanelBorderRadius).not.toBe('0px')
  expect(Number.parseFloat(pickedPerkMetrics!.actionPanelBorderTopRightRadius)).toBeGreaterThan(0)
  expect(Number.parseFloat(pickedPerkMetrics!.actionPanelBorderBottomRightRadius)).toBeGreaterThan(
    0,
  )
  expect(pickedPerkMetrics!.actionPanelTransitionProperty).not.toContain('opacity')
  expect(pickedPerkMetrics!.actionPanelVisibility).toBe('hidden')
  expect(pickedPerkActionPanelStyleAfterHover.visibility).toBe('visible')
  expect(pickedPerkMetrics!.actionPanelRightOffset).toBeLessThanOrEqual(1)
  expect(pickedPerkMetrics!.actionPanelTopOffset).toBeLessThanOrEqual(1)
  expect(pickedPerkMetrics!.actionPanelBottomOffset).toBeLessThanOrEqual(1)
  expect(pickedPerkMetrics!.actionPanelWidthRatio).toBeGreaterThanOrEqual(0.31)
  expect(pickedPerkMetrics!.actionPanelWidthRatio).toBeLessThanOrEqual(0.33)
  expect(pickedPerkMetrics!.optionalTopOffset).toBeLessThanOrEqual(1)
  expect(pickedPerkMetrics!.optionalBottomOffset).toBeLessThanOrEqual(1)
  expect(pickedPerkMetrics!.optionalBorderBottomWidth).toBe('1px')
  expect(pickedPerkMetrics!.optionalBorderRadius).toBe('0px')
  expect(pickedPerkMetrics!.optionalHeightRatio).toBeGreaterThanOrEqual(0.46)
  expect(pickedPerkMetrics!.optionalHeightRatio).toBeLessThanOrEqual(0.52)
  expect(pickedPerkMetrics!.removeRightOffset).toBeLessThanOrEqual(1)
  expect(pickedPerkMetrics!.removeTopOffset).toBeLessThanOrEqual(1)
  expect(pickedPerkMetrics!.removeBottomOffset).toBeLessThanOrEqual(1)
  expect(pickedPerkMetrics!.removeBorderRadius).toBe('0px')
  expect(pickedPerkMetrics!.removeHeightRatio).toBeGreaterThanOrEqual(0.46)
  expect(pickedPerkMetrics!.removeHeightRatio).toBeLessThanOrEqual(0.52)
  expect(pickedPerkMetrics!.removeWidthRatio).toBeGreaterThanOrEqual(0.3)
  expect(pickedPerkMetrics!.removeWidthRatio).toBeLessThanOrEqual(0.33)
  expect(pickedPerkMetrics!.inspectButtonWidth).toBeGreaterThan(pickedPerkMetrics!.tileWidth * 0.95)
  expect(
    Math.abs(pickedPerkNameSizeAfterHover.width - pickedPerkNameSizeBeforeHover.width),
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(pickedPerkNameSizeAfterHover.height - pickedPerkNameSizeBeforeHover.height),
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(pickedPerkMetrics!.tileWidth - pickedPerkMetrics!.pickedPerkSlotWidth),
  ).toBeLessThanOrEqual(1)
  expect(pickedPerkMetrics!.tileWidth).toBeLessThan(pickedPerkMetrics!.slotWidth)
  expect(pickedPerkMetrics!.widthStyle).not.toBe('auto')
  expect(Math.max(...pickedPerkTileWidths) - Math.min(...pickedPerkTileWidths)).toBeLessThanOrEqual(
    1,
  )
  expect(plannerGroupCardMetrics).not.toBeNull()
  expect(
    Math.abs(plannerGroupCardMetrics!.tileWidth - plannerGroupCardMetrics!.groupTileWidth),
  ).toBeLessThanOrEqual(1)
  expect(plannerGroupCardMetrics!.tileWidth).toBeGreaterThan(pickedPerkMetrics!.tileWidth)
  expect(plannerGroupCardMetrics!.groupNameLineClamp).toBe('1')
  expect(plannerGroupCardMetrics!.groupNameHeight).toBeLessThanOrEqual(
    plannerGroupCardMetrics!.groupNameLineHeight + 1,
  )
})

test('keeps requirement chains scaled with picked perk tiles on compact desktop', async ({
  page,
}) => {
  const largeDesktopMetrics = await getRequirementChainScaleMetrics(page, {
    height: 1440,
    width: 2560,
  })
  const compactDesktopMetrics = await getRequirementChainScaleMetrics(page, {
    height: 768,
    width: 1366,
  })
  const ratioKeys = [
    'chainHeightRatio',
    'chainLeftRatio',
    'chainTopRatio',
    'chainWidthRatio',
  ] as const

  expect(compactDesktopMetrics.picked.tileHeight).toBeLessThan(
    largeDesktopMetrics.picked.tileHeight,
  )
  expect(compactDesktopMetrics.picked.chainWidth).toBeLessThan(
    largeDesktopMetrics.picked.chainWidth,
  )
  expect(compactDesktopMetrics.legend.tileHeight).toBeLessThan(
    largeDesktopMetrics.legend.tileHeight,
  )
  expect(compactDesktopMetrics.legend.chainWidth).toBeLessThan(
    largeDesktopMetrics.legend.chainWidth,
  )

  for (const ratioKey of ratioKeys) {
    expect(
      Math.abs(compactDesktopMetrics.picked[ratioKey] - largeDesktopMetrics.picked[ratioKey]),
    ).toBeLessThanOrEqual(0.02)
    expect(
      Math.abs(compactDesktopMetrics.legend[ratioKey] - largeDesktopMetrics.legend[ratioKey]),
    ).toBeLessThanOrEqual(0.02)
  }
})

test('marks picked perks as optional and separates them from must-have perks', async ({ page }) => {
  await gotoBuildPlanner(page, { height: 768, width: 1366 })
  await page.goto(createBuildUrl(['Clarity', 'Perfect Focus', 'Student']))
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()

  const buildPerksBar = getBuildPerksBar(page)
  const requirementLegend = page.getByTestId('planner-requirement-legend')
  const mustHaveLegendTile = requirementLegend
    .getByTestId('planner-requirement-legend-tile')
    .filter({ hasText: 'Must-have' })
  const optionalLegendTile = requirementLegend
    .getByTestId('planner-requirement-legend-tile')
    .filter({ hasText: 'Optional' })
  await expect(requirementLegend.getByTestId('planner-requirement-legend-tile')).toHaveText([
    'Must-have',
    'Optional',
  ])
  await expect(mustHaveLegendTile).toHaveAttribute('data-requirement', 'must-have')
  await expect(optionalLegendTile).toHaveAttribute('data-requirement', 'optional')
  await expect(mustHaveLegendTile).toHaveAttribute(
    'title',
    'This is how must-have perks look in the build. Background fit uses must-have perks for the main build chance.',
  )
  await expect(optionalLegendTile).toHaveAttribute(
    'title',
    'This is how optional perks look in the build. Optional perks stay visible for full-build coverage and are scored separately.',
  )
  await expect(mustHaveLegendTile.getByTestId('planner-slot-requirement-chain')).toHaveCount(1)
  await expect(optionalLegendTile.getByTestId('planner-slot-requirement-chain')).toHaveCount(0)
  await expect(mustHaveLegendTile.getByTestId('planner-slot-requirement-optional')).toHaveCount(0)
  await expect(optionalLegendTile.getByTestId('planner-slot-requirement-optional')).toHaveCount(1)
  const requirementLegendPlacementMetrics = await page
    .getByTestId('build-planner-header')
    .evaluate((buildPlannerHeader) => {
      const actionButton = buildPlannerHeader.querySelector('[aria-label="Copy build link"]')
      const infoButton = buildPlannerHeader.querySelector(
        '[aria-label="Show build planner guidance"]',
      )
      const requirementLegend = buildPlannerHeader.querySelector(
        '[data-testid="planner-requirement-legend"]',
      )

      if (
        !(actionButton instanceof HTMLElement) ||
        !(infoButton instanceof HTMLElement) ||
        !(requirementLegend instanceof HTMLElement)
      ) {
        return null
      }

      const actionButtonRectangle = actionButton.getBoundingClientRect()
      const headerRectangle = buildPlannerHeader.getBoundingClientRect()
      const infoButtonRectangle = infoButton.getBoundingClientRect()
      const legendRectangle = requirementLegend.getBoundingClientRect()
      const titleRow = requirementLegend.parentElement
      const getCenterY = (rectangle: DOMRect) => rectangle.top + rectangle.height / 2

      return {
        actionButtonCenterY: getCenterY(actionButtonRectangle),
        headerBottom: headerRectangle.bottom,
        headerTop: headerRectangle.top,
        legendBottom: legendRectangle.bottom,
        legendCenterY: getCenterY(legendRectangle),
        legendGapFromInfo: legendRectangle.left - infoButtonRectangle.right,
        legendLeft: legendRectangle.left,
        legendTop: legendRectangle.top,
        infoButtonCenterY: getCenterY(infoButtonRectangle),
        infoButtonRight: infoButtonRectangle.right,
        titleRowColumnGap:
          titleRow instanceof HTMLElement
            ? Number.parseFloat(window.getComputedStyle(titleRow).columnGap)
            : null,
      }
    })

  expect(requirementLegendPlacementMetrics).not.toBeNull()
  expect(requirementLegendPlacementMetrics!.titleRowColumnGap).not.toBeNull()
  expect(requirementLegendPlacementMetrics!.titleRowColumnGap).toBeLessThan(16)
  expect(
    Math.abs(
      requirementLegendPlacementMetrics!.legendGapFromInfo -
        requirementLegendPlacementMetrics!.titleRowColumnGap!,
    ),
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(
      requirementLegendPlacementMetrics!.legendCenterY -
        requirementLegendPlacementMetrics!.infoButtonCenterY,
    ),
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(
      requirementLegendPlacementMetrics!.legendCenterY -
        requirementLegendPlacementMetrics!.actionButtonCenterY,
    ),
  ).toBeLessThanOrEqual(1)
  expect(requirementLegendPlacementMetrics!.legendTop).toBeGreaterThanOrEqual(
    requirementLegendPlacementMetrics!.headerTop - 1,
  )
  expect(requirementLegendPlacementMetrics!.legendBottom).toBeLessThanOrEqual(
    requirementLegendPlacementMetrics!.headerBottom + 1,
  )
  const requirementLegendTileLayoutMetrics = await requirementLegend.evaluate((legend) => {
    const legendTiles = [
      ...legend.querySelectorAll('[data-testid="planner-requirement-legend-tile"]'),
    ]

    if (legendTiles.length !== 2) {
      return null
    }

    const [mustHaveTile, optionalTile] = legendTiles

    if (!(mustHaveTile instanceof HTMLElement) || !(optionalTile instanceof HTMLElement)) {
      return null
    }

    const mustHaveName = mustHaveTile.querySelector('[data-testid="planner-picked-perk-name"]')
    const optionalName = optionalTile.querySelector('[data-testid="planner-picked-perk-name"]')

    if (!(mustHaveName instanceof HTMLElement) || !(optionalName instanceof HTMLElement)) {
      return null
    }

    const mustHaveRectangle = mustHaveTile.getBoundingClientRect()
    const optionalRectangle = optionalTile.getBoundingClientRect()
    const legendColumnGap = Number.parseFloat(window.getComputedStyle(legend).columnGap)

    return {
      legendColumnGap,
      mustHaveNameTextAlign: window.getComputedStyle(mustHaveName).textAlign,
      mustHaveRight: mustHaveRectangle.right,
      mustHaveTop: mustHaveRectangle.top,
      mustHaveTransform: window.getComputedStyle(mustHaveTile).transform,
      tileGap: optionalRectangle.left - mustHaveRectangle.right,
      optionalLeft: optionalRectangle.left,
      optionalNameTextAlign: window.getComputedStyle(optionalName).textAlign,
      optionalTop: optionalRectangle.top,
      optionalTransform: window.getComputedStyle(optionalTile).transform,
    }
  })

  expect(requirementLegendTileLayoutMetrics).not.toBeNull()
  expect(requirementLegendTileLayoutMetrics!.optionalLeft).toBeGreaterThan(
    requirementLegendTileLayoutMetrics!.mustHaveRight,
  )
  expect(requirementLegendTileLayoutMetrics!.legendColumnGap).toBeGreaterThan(5)
  expect(
    Math.abs(
      requirementLegendTileLayoutMetrics!.tileGap -
        requirementLegendTileLayoutMetrics!.legendColumnGap,
    ),
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(
      requirementLegendTileLayoutMetrics!.optionalTop -
        requirementLegendTileLayoutMetrics!.mustHaveTop,
    ),
  ).toBeLessThan(0.5)
  expect(requirementLegendTileLayoutMetrics!.mustHaveNameTextAlign).toBe('center')
  expect(requirementLegendTileLayoutMetrics!.optionalNameTextAlign).toBe('center')
  expect(requirementLegendTileLayoutMetrics!.mustHaveTransform).toBe('none')
  expect(requirementLegendTileLayoutMetrics!.optionalTransform).toBe('none')
  const clarityPickedPerkTile = buildPerksBar
    .getByTestId('planner-slot-perk')
    .filter({ hasText: 'Clarity' })
  const perfectFocusPickedPerkTile = buildPerksBar
    .getByTestId('planner-slot-perk')
    .filter({ hasText: 'Perfect Focus' })

  await expect(clarityPickedPerkTile).toHaveAttribute('data-requirement', 'must-have')
  await expect(perfectFocusPickedPerkTile).toHaveAttribute('data-requirement', 'must-have')
  await expect(clarityPickedPerkTile.getByTestId('planner-slot-requirement-chain')).toHaveCount(1)
  await expect(clarityPickedPerkTile.getByTestId('planner-slot-requirement-optional')).toHaveCount(
    0,
  )
  await expect(
    perfectFocusPickedPerkTile.getByTestId('planner-slot-requirement-chain'),
  ).toHaveCount(1)
  await expect(buildPerksBar.getByTestId('planner-picked-perk-name')).toHaveText([
    'Clarity',
    'Perfect Focus',
    'Student',
  ])

  const mustHaveBackgroundColor = await perfectFocusPickedPerkTile.evaluate(
    (element) => window.getComputedStyle(element).backgroundColor,
  )
  const mustHaveLegendBackgroundColor = await mustHaveLegendTile.evaluate(
    (element) => window.getComputedStyle(element).backgroundColor,
  )
  expect(mustHaveLegendBackgroundColor).toBe(mustHaveBackgroundColor)
  const mustHaveTileDimensions = await perfectFocusPickedPerkTile.evaluate((element) => {
    const rectangle = element.getBoundingClientRect()
    const perkName = element.querySelector('[data-testid="planner-picked-perk-name"]')

    return {
      fontSize: perkName instanceof HTMLElement ? window.getComputedStyle(perkName).fontSize : null,
      height: rectangle.height,
      width: rectangle.width,
    }
  })
  const mustHaveLegendTileDimensions = await mustHaveLegendTile.evaluate((element) => {
    const rectangle = element.getBoundingClientRect()
    const perkName = element.querySelector('[data-testid="planner-picked-perk-name"]')

    return {
      fontSize: perkName instanceof HTMLElement ? window.getComputedStyle(perkName).fontSize : null,
      height: rectangle.height,
      width: rectangle.width,
    }
  })

  expect(mustHaveLegendTileDimensions.fontSize).toBe(mustHaveTileDimensions.fontSize)
  expect(
    Math.abs(mustHaveLegendTileDimensions.height - mustHaveTileDimensions.height * 0.7),
  ).toBeLessThan(0.75)
  expect(
    Math.abs(mustHaveLegendTileDimensions.width - mustHaveTileDimensions.width * 0.7),
  ).toBeLessThan(0.75)

  await clarityPickedPerkTile.hover()
  await clarityPickedPerkTile.getByTestId('planner-slot-optional-button').click()

  const optionalClarityPickedPerkTile = buildPerksBar
    .getByTestId('planner-slot-perk')
    .filter({ hasText: 'Clarity' })

  await expect(buildPerksBar.getByTestId('planner-picked-perk-name')).toHaveText([
    'Perfect Focus',
    'Student',
    'Clarity',
  ])
  await expect(optionalClarityPickedPerkTile).toHaveAttribute('data-requirement', 'optional')
  await expect(
    optionalClarityPickedPerkTile.getByTestId('planner-slot-requirement-chain'),
  ).toHaveCount(0)
  await expect(
    optionalClarityPickedPerkTile.getByTestId('planner-slot-requirement-optional'),
  ).toHaveCount(1)
  await expect(
    optionalClarityPickedPerkTile.getByTestId('planner-slot-optional-button'),
  ).toHaveAttribute('title', 'Mark Clarity as must-have')
  await expect(page).toHaveURL(/optional=Clarity/u)

  await page.mouse.move(0, 0)

  const optionalBackgroundColor = await optionalClarityPickedPerkTile.evaluate(
    (element) => window.getComputedStyle(element).backgroundColor,
  )

  expect(optionalBackgroundColor).not.toBe(mustHaveBackgroundColor)
  expect(optionalBackgroundColor).toContain('26, 26, 26')
  const optionalLegendBackgroundColor = await optionalLegendTile.evaluate(
    (element) => window.getComputedStyle(element).backgroundColor,
  )
  expect(optionalLegendBackgroundColor).toBe(optionalBackgroundColor)
  const optionalRequirementIconPlacement = await optionalClarityPickedPerkTile.evaluate(
    (pickedPerkTile) => {
      const optionalRequirementIcon = pickedPerkTile.querySelector(
        '[data-testid="planner-slot-requirement-optional"]',
      )

      if (!(optionalRequirementIcon instanceof HTMLElement)) {
        return null
      }

      const iconRectangle = optionalRequirementIcon.getBoundingClientRect()
      const iconSvg = optionalRequirementIcon.querySelector('svg')
      const tileRectangle = pickedPerkTile.getBoundingClientRect()

      return {
        bottomOffset: tileRectangle.bottom - iconRectangle.bottom,
        iconCenterX: iconRectangle.left + iconRectangle.width / 2,
        iconCenterY: iconRectangle.top + iconRectangle.height / 2,
        iconSvgWidth:
          iconSvg instanceof SVGElement
            ? Number.parseFloat(window.getComputedStyle(iconSvg).width)
            : null,
        leftOffset: iconRectangle.left - tileRectangle.left,
        tileCenterX: tileRectangle.left + tileRectangle.width / 2,
        tileCenterY: tileRectangle.top + tileRectangle.height / 2,
        tileHeight: tileRectangle.height,
      }
    },
  )

  expect(optionalRequirementIconPlacement).not.toBeNull()
  expect(optionalRequirementIconPlacement!.iconCenterX).toBeLessThan(
    optionalRequirementIconPlacement!.tileCenterX,
  )
  expect(optionalRequirementIconPlacement!.iconCenterY).toBeGreaterThan(
    optionalRequirementIconPlacement!.tileCenterY,
  )
  expect(optionalRequirementIconPlacement!.leftOffset).toBeLessThan(0)
  expect(optionalRequirementIconPlacement!.leftOffset).toBeGreaterThanOrEqual(-8)
  expect(optionalRequirementIconPlacement!.bottomOffset).toBeLessThan(0)
  expect(optionalRequirementIconPlacement!.bottomOffset).toBeGreaterThanOrEqual(-8)
  expect(optionalRequirementIconPlacement!.iconSvgWidth).not.toBeNull()
  expect(
    optionalRequirementIconPlacement!.iconSvgWidth! / optionalRequirementIconPlacement!.tileHeight,
  ).toBeGreaterThan(0.32)
  expect(
    optionalRequirementIconPlacement!.iconSvgWidth! / optionalRequirementIconPlacement!.tileHeight,
  ).toBeLessThan(0.35)

  const backgroundFitPanel = getBackgroundFitPanel(page)

  await backgroundFitPanel.getByRole('button', { name: 'Expand background fit' }).click()
  await expect(
    backgroundFitPanel
      .getByTestId('background-fit-summary-label')
      .filter({ hasText: 'Full build chance' })
      .first(),
  ).toBeVisible()
  await expect(
    backgroundFitPanel
      .getByTestId('background-fit-summary-label')
      .filter({ hasText: 'Must-have build chance' })
      .first(),
  ).toBeVisible()
  await expect(
    backgroundFitPanel
      .getByTestId('background-fit-summary-table')
      .first()
      .getByTestId('background-fit-summary-label'),
  ).toHaveText([
    'Must-have build chance',
    'Full build chance',
    'Expected must-have perks pickable',
    'Expected optional perks pickable',
    'Guaranteed perks pickable',
  ])
  await expect(
    backgroundFitPanel
      .getByTestId('background-fit-summary-metric')
      .filter({ hasText: /Expected optional perks pickable\s*[\d.]+\/1/i })
      .first(),
  ).toBeVisible()
  await expect(
    backgroundFitPanel
      .getByTestId('background-fit-summary-metric')
      .filter({ hasText: /Guaranteed perks pickable\s*\d+\/3/i })
      .first(),
  ).toBeVisible()
  await expect(
    backgroundFitPanel
      .getByTestId('background-fit-summary-label')
      .filter({ hasText: 'Guaranteed must-have perks pickable' }),
  ).toHaveCount(0)
  await expect(
    backgroundFitPanel
      .getByTestId('background-fit-summary-label')
      .filter({ hasText: 'Guaranteed optional perks pickable' }),
  ).toHaveCount(0)
  await expect(
    backgroundFitPanel
      .getByTestId('background-fit-summary-label')
      .filter({ hasText: 'Best native roll covers total perks' }),
  ).toHaveCount(0)

  await searchPerks(page, 'Berserk')
  await inspectPerkFromResults(page, 'Berserk')
  await addSelectedPerkToBuild(page, 'Berserk')
  await expect(buildPerksBar.getByTestId('planner-picked-perk-name')).toHaveText([
    'Perfect Focus',
    'Student',
    'Berserk',
    'Clarity',
  ])
  await expect(
    buildPerksBar.getByTestId('planner-slot-perk').filter({ hasText: 'Berserk' }),
  ).toHaveAttribute('data-requirement', 'must-have')
})

test('cancels a picked perk tooltip timer before marking the perk optional', async ({ page }) => {
  await gotoBuildPlanner(page, { height: 768, width: 1366 })
  await page.goto(createBuildUrl(['Clarity', 'Perfect Focus', 'Student']))
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()

  const buildPerksBar = getBuildPerksBar(page)
  const clarityPickedPerkTile = buildPerksBar
    .getByTestId('planner-slot-perk')
    .filter({ hasText: 'Clarity' })

  await clarityPickedPerkTile.hover()
  await expect(clarityPickedPerkTile).toHaveAttribute('data-tooltip-pending', 'true', {
    timeout: 2500,
  })
  await clarityPickedPerkTile.getByTestId('planner-slot-optional-button').click()

  const optionalClarityPickedPerkTile = buildPerksBar
    .getByTestId('planner-slot-perk')
    .filter({ hasText: 'Clarity' })

  await expect(optionalClarityPickedPerkTile).toHaveAttribute('data-requirement', 'optional')
  await expect(optionalClarityPickedPerkTile).toHaveAttribute('data-tooltip-pending', 'false')

  await page.waitForTimeout(1700)

  await expect(page.getByTestId('build-perk-tooltip')).toHaveCount(0)
  await expect(optionalClarityPickedPerkTile).toHaveAttribute('data-tooltip-pending', 'false')
})

test('starts a picked perk tooltip timer from mouse movement after marking the perk optional', async ({
  page,
}) => {
  await gotoBuildPlanner(page, { height: 768, width: 1366 })
  await page.goto(createBuildUrl(['Clarity', 'Perfect Focus', 'Student']))
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()

  const buildPerksBar = getBuildPerksBar(page)
  const clarityPickedPerkTile = buildPerksBar
    .getByTestId('planner-slot-perk')
    .filter({ hasText: 'Clarity' })

  await clarityPickedPerkTile.hover()
  await expect(clarityPickedPerkTile).toHaveAttribute('data-tooltip-pending', 'true', {
    timeout: 2500,
  })
  await clarityPickedPerkTile.getByTestId('planner-slot-optional-button').click()

  const optionalClarityPickedPerkTile = buildPerksBar
    .getByTestId('planner-slot-perk')
    .filter({ hasText: 'Clarity' })

  await expect(optionalClarityPickedPerkTile).toHaveAttribute('data-requirement', 'optional')
  await expect(optionalClarityPickedPerkTile).toHaveAttribute('data-tooltip-pending', 'false')
  await optionalClarityPickedPerkTile.dispatchEvent('mousemove', {
    bubbles: true,
    clientX: 32,
    clientY: 32,
  })

  await expect(optionalClarityPickedPerkTile).toHaveAttribute('data-tooltip-pending', 'true', {
    timeout: 2500,
  })
  await expect(page.getByTestId('build-perk-tooltip')).toBeVisible({ timeout: 2500 })
  await expect(page.getByTestId('build-perk-tooltip')).toContainText(
    /An additional \+10% of any damage/i,
  )
})

test('keeps picked perk word layout unchanged on hover', async ({ page }) => {
  await gotoBuildPlanner(page, { height: 768, width: 1366 })
  await page.goto(createBuildUrl(['Anticipation', 'Clarity']))
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()

  const anticipationPickedPerkTile = getBuildPerksBar(page)
    .getByTestId('planner-slot-perk')
    .filter({ hasText: 'Anticipation' })

  await expect(anticipationPickedPerkTile).toBeVisible()

  const globalWordBreakStyles = await page.evaluate(() => {
    return ['body', 'button', '[data-testid="planner-picked-perk-name"]'].map((selector) => {
      const element = document.querySelector(selector)

      if (!(element instanceof HTMLElement)) {
        throw new Error(`Unable to find text breaking style target: ${selector}`)
      }

      const computedStyle = window.getComputedStyle(element)

      return {
        hyphens: computedStyle.hyphens,
        overflowWrap: computedStyle.overflowWrap,
        selector,
        wordBreak: computedStyle.wordBreak,
      }
    })
  })
  const layoutBeforeHover = await getPickedPerkNameLayoutMetrics(anticipationPickedPerkTile)

  for (const style of globalWordBreakStyles) {
    expect(style.hyphens).toBe('none')
    expect(style.overflowWrap).toBe('normal')
    expect(style.wordBreak).toBe('normal')
  }

  expect(layoutBeforeHover.nameHorizontalOverflow).toBeLessThanOrEqual(1)
  expect(layoutBeforeHover.nameHyphens).toBe('none')
  expect(layoutBeforeHover.nameOverflowWrap).toBe('normal')
  expect(layoutBeforeHover.nameWordBreak).toBe('normal')
  expect(layoutBeforeHover.characterLineTopCount).toBe(1)
  expect(layoutBeforeHover.nameHeight).toBeLessThanOrEqual(layoutBeforeHover.nameLineHeight + 1)
  expect(Number.parseFloat(layoutBeforeHover.inspectPaddingRight)).toBeLessThanOrEqual(
    Number.parseFloat(layoutBeforeHover.inspectPaddingLeft) + 1,
  )

  await anticipationPickedPerkTile.hover()
  const removeButton = anticipationPickedPerkTile.getByTestId('planner-slot-remove-button')
  await expect(removeButton).toBeVisible()
  const actionPanelFrameMetrics = await anticipationPickedPerkTile.evaluate((pickedPerkTile) => {
    const actionPanel = pickedPerkTile.querySelector('[data-testid="planner-slot-action-panel"]')

    if (!(actionPanel instanceof HTMLElement)) {
      throw new Error('Unable to find picked perk action panel.')
    }

    const actionPanelRectangle = actionPanel.getBoundingClientRect()
    const pickedPerkTileRectangle = pickedPerkTile.getBoundingClientRect()
    const pickedPerkTileStyle = window.getComputedStyle(pickedPerkTile)

    return {
      bottomBorderWidth: Number.parseFloat(pickedPerkTileStyle.borderBottomWidth),
      bottomInset: pickedPerkTileRectangle.bottom - actionPanelRectangle.bottom,
      rightBorderWidth: Number.parseFloat(pickedPerkTileStyle.borderRightWidth),
      rightInset: pickedPerkTileRectangle.right - actionPanelRectangle.right,
      topBorderWidth: Number.parseFloat(pickedPerkTileStyle.borderTopWidth),
      topInset: actionPanelRectangle.top - pickedPerkTileRectangle.top,
    }
  })

  expect(actionPanelFrameMetrics.topInset).toBeGreaterThanOrEqual(
    actionPanelFrameMetrics.topBorderWidth,
  )
  expect(actionPanelFrameMetrics.topInset).toBeLessThanOrEqual(
    actionPanelFrameMetrics.topBorderWidth + 0.5,
  )
  expect(actionPanelFrameMetrics.rightInset).toBeGreaterThanOrEqual(
    actionPanelFrameMetrics.rightBorderWidth,
  )
  expect(actionPanelFrameMetrics.rightInset).toBeLessThanOrEqual(
    actionPanelFrameMetrics.rightBorderWidth + 0.5,
  )
  expect(actionPanelFrameMetrics.bottomInset).toBeGreaterThanOrEqual(
    actionPanelFrameMetrics.bottomBorderWidth,
  )
  expect(actionPanelFrameMetrics.bottomInset).toBeLessThanOrEqual(
    actionPanelFrameMetrics.bottomBorderWidth + 0.5,
  )
  const removeButtonBackgroundColor = await removeButton.evaluate(
    (element) => window.getComputedStyle(element).backgroundColor,
  )

  expect(getParsedCssRgbColor(removeButtonBackgroundColor).alpha).toBeGreaterThanOrEqual(0.95)

  const layoutAfterHover = await getPickedPerkNameLayoutMetrics(anticipationPickedPerkTile)

  expect(layoutAfterHover.inspectPaddingRight).toBe(layoutBeforeHover.inspectPaddingRight)
  expect(layoutAfterHover.characterLineTopCount).toBe(layoutBeforeHover.characterLineTopCount)
  expect(layoutAfterHover.textFragmentCount).toBe(layoutBeforeHover.textFragmentCount)
  expect(layoutAfterHover.nameHeight).toBe(layoutBeforeHover.nameHeight)
  expect(layoutAfterHover.nameHorizontalOverflow).toBe(layoutBeforeHover.nameHorizontalOverflow)
  expect(layoutAfterHover.nameHyphens).toBe('none')
  expect(layoutAfterHover.nameOverflowWrap).toBe('normal')
  expect(layoutAfterHover.nameWordBreak).toBe('normal')
  expect(layoutAfterHover.nameRectangle.height).toBe(layoutBeforeHover.nameRectangle.height)

  for (const rectangleSide of ['left', 'right', 'width'] as const) {
    expect(
      Math.abs(
        layoutAfterHover.nameRectangle[rectangleSide] -
          layoutBeforeHover.nameRectangle[rectangleSide],
      ),
    ).toBeLessThanOrEqual(1)
  }
})

test('links search result hover highlighting with matching build planner perks', async ({
  page,
}) => {
  await gotoBuildPlanner(page, mediumBuildPlannerViewport)

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
  const expandTraitsCategoryButton = page.getByRole('button', { name: 'Expand category Traits' })

  if (await expandTraitsCategoryButton.isVisible()) {
    await expandTraitsCategoryButton.click()
  }

  const traitsCategoryButton = page.getByRole('button', { name: 'Enable category Traits' })
  const calmSidebarGroupButton = getSidebarPerkGroupButton(page, 'Calm')
  const perfectFocusResultsCalmPlacement = perfectFocusResultsRow.getByRole('button', {
    name: 'Select perk group Calm',
  })

  await perfectFocusResultsButton.hover()

  await expect(perfectFocusResultsRow).toHaveAttribute('data-highlighted', 'true')
  await expect(traitsCategoryButton).toHaveAttribute('data-highlighted', 'true')
  await expect(calmSidebarGroupButton).toHaveAttribute('data-highlighted', 'true')
  await expect(perfectFocusResultsCalmPlacement).toHaveAttribute('data-highlighted', 'true')
  await expect(sharedPerfectFocusButton).toHaveAttribute('data-highlighted', 'true')
  await expect(individualPerfectFocusButton).toHaveAttribute('data-highlighted', 'true')
  await expect(pickedPerfectFocusTile).toHaveAttribute('data-highlighted', 'true')

  await sharedPerfectFocusButton.hover()

  await expect(perfectFocusResultsRow).toHaveAttribute('data-highlighted', 'true')
  await expect(traitsCategoryButton).toHaveAttribute('data-highlighted', 'true')
  await expect(calmSidebarGroupButton).toHaveAttribute('data-highlighted', 'true')
  await expect(perfectFocusResultsCalmPlacement).toHaveAttribute('data-highlighted', 'true')
  await expect(sharedPerfectFocusButton).toHaveAttribute('data-highlighted', 'true')
  await expect(individualPerfectFocusButton).toHaveAttribute('data-highlighted', 'true')
  await expect(pickedPerfectFocusTile).toHaveAttribute('data-highlighted', 'true')
  await expect(perfectFocusResultsRow).toHaveCSS('transform', 'none')
  await expect(sharedPerfectFocusButton).toHaveCSS('transform', 'none')
  await expect(individualPerfectFocusButton).toHaveCSS('transform', 'none')
  await expect(pickedPerfectFocusTile).toHaveCSS('transform', 'none')
})

test('keeps sidebar perk group selection emphasized in the build planner', async ({ page }) => {
  await gotoBuildPlanner(page, mediumBuildPlannerViewport)
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

test('deselects a picked perk group from the build planner when clicked again', async ({
  page,
}) => {
  await gotoBuildPlanner(page, mediumBuildPlannerViewport)
  await page.goto(createBuildUrl(['Clarity', 'Perfect Focus']))
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()

  const traitsCategoryButton = page.getByRole('button', { name: 'Enable category Traits' })
  const calmGroupCard = getBuildSharedGroupsList(page)
    .getByTestId('planner-group-card')
    .filter({ hasText: 'Calm' })
  const calmPlannerGroupButton = calmGroupCard.getByRole('button', {
    name: 'Select perk group Calm',
  })

  await expect(calmGroupCard).toBeVisible()
  await expect(traitsCategoryButton).toHaveAttribute('aria-pressed', 'false')
  await expect(calmGroupCard).toHaveAttribute('data-selected-highlighted', 'false')

  await calmPlannerGroupButton.click()

  await expect(page.getByRole('button', { name: 'Disable category Traits' })).toBeVisible()
  await expect(getSidebarPerkGroupButton(page, 'Calm')).toHaveAttribute('aria-pressed', 'true')
  await expect(calmGroupCard).toHaveAttribute('data-selected-highlighted', 'true')

  await calmPlannerGroupButton.click()

  await expect(page.getByRole('button', { name: 'Enable category Traits' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Disable category Traits' })).toHaveCount(0)
  await expect(calmGroupCard).toHaveAttribute('data-selected-highlighted', 'false')
})

test('links planner perk and category hover highlighting both ways', async ({ page }) => {
  await gotoBuildPlanner(page, mediumBuildPlannerViewport)
  await page.goto(createBuildUrl(['Clarity', 'Perfect Focus']))
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()

  const traitsCategoryButton = page.getByRole('button', { name: 'Enable category Traits' })
  const calmGroupCard = getBuildSharedGroupsList(page)
    .getByTestId('planner-group-card')
    .filter({ hasText: 'Calm' })
  const clarityPickedPerkTile = getBuildPerksBar(page)
    .getByTestId('planner-slot-perk')
    .filter({ hasText: 'Clarity' })
  const clarityPickedPerkButton = getBuildPerksBar(page).getByRole('button', {
    name: 'Clarity, view from build planner',
  })
  const perfectFocusPickedPerkTile = getBuildPerksBar(page)
    .getByTestId('planner-slot-perk')
    .filter({ hasText: 'Perfect Focus' })

  await expect(calmGroupCard).toBeVisible()
  await expect(traitsCategoryButton).toHaveAttribute('data-highlighted', 'false')
  await expect(clarityPickedPerkTile).toHaveAttribute('data-highlighted', 'false')
  await expect(perfectFocusPickedPerkTile).toHaveAttribute('data-highlighted', 'false')

  await clarityPickedPerkTile.hover()

  await expect(traitsCategoryButton).toHaveAttribute('data-highlighted', 'true')
  await expect(calmGroupCard).toHaveAttribute('data-highlighted', 'true')

  await page.mouse.move(1, 1)

  await expect(traitsCategoryButton).toHaveAttribute('data-highlighted', 'false')
  await expect(calmGroupCard).toHaveAttribute('data-highlighted', 'false')

  await calmGroupCard.hover()

  await expect(traitsCategoryButton).toHaveAttribute('data-highlighted', 'true')
  await expect(clarityPickedPerkTile).toHaveAttribute('data-highlighted', 'true')
  await expect(perfectFocusPickedPerkTile).toHaveAttribute('data-highlighted', 'true')

  await page.mouse.move(1, 1)

  await expect(traitsCategoryButton).toHaveAttribute('data-highlighted', 'false')
  await expect(calmGroupCard).toHaveAttribute('data-highlighted', 'false')
  await expect(clarityPickedPerkTile).toHaveAttribute('data-highlighted', 'false')
  await expect(perfectFocusPickedPerkTile).toHaveAttribute('data-highlighted', 'false')

  await traitsCategoryButton.hover()

  await expect(calmGroupCard).toHaveAttribute('data-highlighted', 'true')
  await expect(clarityPickedPerkTile).toHaveAttribute('data-highlighted', 'true')
  await expect(perfectFocusPickedPerkTile).toHaveAttribute('data-highlighted', 'true')

  await page.mouse.move(1, 1)

  await expect(calmGroupCard).toHaveAttribute('data-highlighted', 'false')
  await expect(clarityPickedPerkTile).toHaveAttribute('data-highlighted', 'false')
  await expect(perfectFocusPickedPerkTile).toHaveAttribute('data-highlighted', 'false')

  await traitsCategoryButton.focus()

  await expect(calmGroupCard).toHaveAttribute('data-highlighted', 'true')
  await expect(clarityPickedPerkTile).toHaveAttribute('data-highlighted', 'true')
  await expect(perfectFocusPickedPerkTile).toHaveAttribute('data-highlighted', 'true')

  await traitsCategoryButton.hover()
  await page.mouse.move(1, 1)

  await expect(calmGroupCard).toHaveAttribute('data-highlighted', 'true')
  await expect(clarityPickedPerkTile).toHaveAttribute('data-highlighted', 'true')
  await expect(perfectFocusPickedPerkTile).toHaveAttribute('data-highlighted', 'true')

  await page.getByLabel('Search perks').focus()

  await expect(calmGroupCard).toHaveAttribute('data-highlighted', 'false')
  await expect(clarityPickedPerkTile).toHaveAttribute('data-highlighted', 'false')
  await expect(perfectFocusPickedPerkTile).toHaveAttribute('data-highlighted', 'false')

  await clarityPickedPerkButton.focus()

  await expect(traitsCategoryButton).toHaveAttribute('data-highlighted', 'true')
  await expect(calmGroupCard).toHaveAttribute('data-highlighted', 'true')
})

test('inspects picked perk tiles without removing them', async ({ page }) => {
  await gotoBuildPlanner(page)

  await searchPerks(page, 'Clarity')
  await addPerkToBuildFromResults(page, 'Clarity')

  await searchPerks(page, 'Perfect Focus')
  await page.getByRole('button', { name: 'Enable category Magic' }).click()
  await getSidebarPerkGroupButton(page, 'Deadeye').click()

  await getBuildPerksBar(page)
    .getByRole('button', { name: 'Clarity, view from build planner' })
    .click()

  await expect(page.getByText('1 perk picked.')).toBeVisible()
  await expect(page.getByLabel('Search perks')).toHaveValue('')
  await expect(page.getByRole('button', { name: 'Disable category Traits' })).toBeVisible()
  await expect(getSidebarPerkGroupButton(page, 'Calm')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Inspect Clarity' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Clarity' })).toBeVisible()
  await expect(page.getByText(/Build slot \d+|Not in build/)).toHaveCount(0)
  await expect(page.getByTestId('build-perk-tooltip')).toHaveCount(0)

  await getBuildPerksBar(page)
    .getByRole('button', { name: 'Clarity, view from build planner' })
    .click()

  await expect(page.getByText('1 perk picked.')).toBeVisible()
  await expect(
    getDetailPanel(page).getByRole('heading', {
      level: 2,
      name: 'Select a perk or background',
    }),
  ).toBeVisible()
  await expect(page.locator('[data-testid="perk-row"][data-selected="true"]')).toHaveCount(0)
})

test('clears the build and restores planner placeholders', async ({ page }) => {
  await gotoBuildPlanner(page)

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
      'Use the chain/split control in the detail panel or the search results list.',
    ),
  ).toBeVisible()
  const placeholderMetrics = await getBuildPerksBar(page).evaluate((buildPerksBar) => {
    const placeholder = buildPerksBar.querySelector(
      '[data-placeholder="true"]',
    ) as HTMLElement | null
    const placeholderMeta = buildPerksBar.querySelector(
      '[data-testid="planner-slot-meta"]',
    ) as HTMLElement | null

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
  await gotoBuildPlanner(page, mediumBuildPlannerViewport)
  await page.goto(createBuildUrl(manyPickedPerkNames))

  await expect(page.getByText('27 perks picked.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Clear build' })).toBeEnabled()

  const actionMetrics = await page.evaluate(() => {
    const count = document.querySelector(
      '[data-testid="build-planner-count"]',
    ) as HTMLElement | null
    const clearButton = document.querySelector(
      '[data-testid="clear-build-button"]',
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
