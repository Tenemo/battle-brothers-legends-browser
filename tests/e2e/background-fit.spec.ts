import { expect, test, type Locator } from '@playwright/test'
import {
  addPerkToBuildFromResults,
  enableCategory,
  expectViewportLocked,
  getBackgroundFitPanel,
  getBuildPerksBar,
  getBuildIndividualGroupsList,
  getDetailPanel,
  getResultsList,
  getSidebarPerkGroupButton,
  gotoBuildPlanner,
  mediumBuildPlannerViewport,
  searchPerks,
  selectPerkGroup,
} from './support/build-planner-page'

const denseSharedBuildUrl =
  '/?build=Student,Muscularity,Battle+Forged,Immovable+Object,Brawny,Steadfast,Steel+Brow,Perfect+Fit,Axe+Mastery,Battle+Flow,Balance,Mind+over+Body,Lone+Wolf,Last+Stand,Berserk,Killing+Frenzy,Swagger,Rebound,Fortified+Mind,Hold+Out,Underdog,Assured+Conquest'
const denseSharedBuildSearchBackgroundName = 'Disowned Noble'
const denseSharedBuildSearchBackgroundQuery = 'disowned'
const backgroundFitCalculationTimeoutMs = 30_000

async function expectBackgroundFitCalculationComplete(
  backgroundFitPanel: Locator,
  options: { shouldObserveProgress?: boolean } = {},
) {
  const backgroundFitProgressBar = backgroundFitPanel.getByRole('progressbar', {
    name: 'Background fit progress',
  })
  const backgroundFitRankingSummary = backgroundFitPanel.getByTestId(
    'background-fit-ranking-summary',
  )

  if (options.shouldObserveProgress) {
    await expect(backgroundFitProgressBar).toBeVisible()
    await expect
      .poll(
        async () => {
          const checkedBackgroundCount =
            await backgroundFitProgressBar.getAttribute('aria-valuenow')
          const totalBackgroundCount = await backgroundFitProgressBar.getAttribute('aria-valuemax')

          return checkedBackgroundCount === totalBackgroundCount
            ? 'complete'
            : `${checkedBackgroundCount}/${totalBackgroundCount}`
        },
        { timeout: backgroundFitCalculationTimeoutMs },
      )
      .toBe('complete')
  }

  await expect(backgroundFitProgressBar).toHaveCount(0)
  await expect(backgroundFitRankingSummary).toBeVisible({
    timeout: backgroundFitCalculationTimeoutMs,
  })
  await expect(backgroundFitRankingSummary).toHaveAttribute('aria-hidden', 'false')
}

test('shows the background fit panel for a picked build and keeps the shell viewport-locked', async ({
  page,
}) => {
  await gotoBuildPlanner(page, { height: 768, width: 1366 })
  await searchPerks(page, 'Axe Mastery')
  await addPerkToBuildFromResults(page, 'Axe Mastery')

  const backgroundFitPanel = getBackgroundFitPanel(page)
  const detailPanel = getDetailPanel(page)
  const backgroundFitResultsScroll = backgroundFitPanel.getByTestId('background-fit-panel-body')
  const backgroundSearchInput = backgroundFitPanel.getByLabel('Search backgrounds')
  const apprenticeCard = backgroundFitPanel
    .getByTestId('background-fit-card')
    .filter({ hasText: 'Apprentice' })
    .first()

  await expect(backgroundFitPanel).toBeVisible()
  const backgroundFitRailButton = backgroundFitPanel.getByRole('button', {
    name: 'Expand background fit',
  })
  const categoryFiltersRailButton = page.getByRole('button', { name: 'Collapse category filters' })

  await expect(backgroundFitRailButton).toHaveAttribute('aria-expanded', 'false')
  await expect(backgroundFitRailButton).toHaveCSS('cursor', 'pointer')
  await expect(categoryFiltersRailButton).toHaveCSS('cursor', 'pointer')
  await backgroundFitRailButton.click()
  await expect(
    backgroundFitPanel.getByRole('button', { name: 'Collapse background fit' }),
  ).toHaveAttribute('aria-expanded', 'true')
  const backgroundFitProgressBar = backgroundFitPanel.getByRole('progressbar', {
    name: 'Background fit progress',
  })

  await expect(backgroundFitProgressBar).toBeVisible()
  await expect
    .poll(
      async () => {
        const checkedBackgroundCount = await backgroundFitProgressBar.getAttribute('aria-valuenow')
        const totalBackgroundCount = await backgroundFitProgressBar.getAttribute('aria-valuemax')

        return checkedBackgroundCount === totalBackgroundCount
          ? 'complete'
          : `${checkedBackgroundCount}/${totalBackgroundCount}`
      },
      { timeout: backgroundFitCalculationTimeoutMs },
    )
    .toBe('complete')
  await expect(backgroundFitProgressBar).toBeVisible()
  const backgroundFitRankingSummary = backgroundFitPanel.getByTestId(
    'background-fit-ranking-summary',
  )

  await expect(backgroundFitRankingSummary).toBeVisible()
  await expect(
    backgroundFitPanel.getByRole('button', { name: 'Inspect background Apprentice' }),
  ).toBeVisible()
  const loadingLayout = await backgroundFitPanel.evaluate((backgroundFitPanelElement) => {
    const rankingSummary = backgroundFitPanelElement.querySelector(
      '[data-testid="background-fit-ranking-summary"]',
    )
    const loadingState = backgroundFitPanelElement.querySelector(
      '[data-testid="background-fit-loading-slot"]',
    )
    const firstBackgroundCard = backgroundFitPanelElement.querySelector(
      '[data-testid="background-fit-card"]',
    )

    if (
      !(rankingSummary instanceof HTMLElement) ||
      !(loadingState instanceof HTMLElement) ||
      !(firstBackgroundCard instanceof HTMLElement)
    ) {
      return null
    }

    const rankingSummaryRectangle = rankingSummary.getBoundingClientRect()
    const loadingStateRectangle = loadingState.getBoundingClientRect()
    const firstBackgroundCardRectangle = firstBackgroundCard.getBoundingClientRect()

    return {
      firstBackgroundCardTop: firstBackgroundCardRectangle.top,
      loadingStateBottom: loadingStateRectangle.bottom,
      loadingStateTop: loadingStateRectangle.top,
      rankingSummaryTop: rankingSummaryRectangle.top,
    }
  })

  expect(loadingLayout).not.toBeNull()
  expect(
    Math.abs(loadingLayout!.loadingStateTop - loadingLayout!.rankingSummaryTop),
  ).toBeLessThanOrEqual(1)
  expect(loadingLayout!.loadingStateBottom).toBeLessThanOrEqual(
    loadingLayout!.firstBackgroundCardTop,
  )
  const apprenticeBackgroundIcon = apprenticeCard.getByRole('img', {
    name: 'Apprentice background icon',
  })

  await expect(apprenticeBackgroundIcon).toBeVisible()
  await expect(apprenticeBackgroundIcon).toHaveAttribute(
    'src',
    '/game-icons/ui/backgrounds/background_40.png',
  )
  await expect
    .poll(async () =>
      apprenticeBackgroundIcon.evaluate((element) =>
        element instanceof HTMLImageElement ? element.naturalWidth : 0,
      ),
    )
    .toBeGreaterThan(0)
  const apprenticeSummaryMetrics = apprenticeCard.getByTestId('background-fit-summary-metric')

  await expect(apprenticeCard.getByTestId('background-fit-summary-value')).toHaveText([
    '100%',
    '1/1',
    '1/1',
  ])
  await expect(apprenticeCard.getByTestId('background-fit-summary-label')).toHaveText([
    'Must-have build chance',
    'Expected must-have perks pickable',
    'Guaranteed perks pickable',
  ])
  await expect(apprenticeCard.getByTestId('background-fit-accordion-summary-row')).toHaveCount(1)
  await expect(apprenticeCard).not.toHaveAttribute('title', /.+/)
  const metricTableGeometry = await apprenticeCard
    .getByTestId('background-fit-summary-table')
    .evaluate((metricTable) => {
      const metricRows = [
        ...metricTable.querySelectorAll('[data-testid="background-fit-summary-metric"]'),
      ]
      const metricLabels = [
        ...metricTable.querySelectorAll('[data-testid="background-fit-summary-label"]'),
      ]
      const metricValues = [
        ...metricTable.querySelectorAll('[data-testid="background-fit-summary-value"]'),
      ]
      const metricIconCells = [
        ...metricTable.querySelectorAll('[data-testid="background-fit-summary-icon-cell"]'),
      ]
      const metricMustHaveIcons = [
        ...metricTable.querySelectorAll('[data-testid="background-fit-summary-must-have-icon"]'),
      ]
      const metricTableRectangle = metricTable.getBoundingClientRect()
      const iconCellLeftOffsets = metricIconCells.map((metricIconCell) =>
        Math.round(metricIconCell.getBoundingClientRect().left - metricTableRectangle.left),
      )
      const iconCellWidths = metricIconCells.map((metricIconCell) =>
        Math.round(metricIconCell.getBoundingClientRect().width),
      )
      const mustHaveIconCenterDeltas = metricMustHaveIcons.map((metricMustHaveIcon) => {
        const metricMustHaveIconRectangle = metricMustHaveIcon.getBoundingClientRect()
        const metricIconCellRectangle = metricMustHaveIcon
          .closest('[data-testid="background-fit-summary-icon-cell"]')
          ?.getBoundingClientRect()

        return metricIconCellRectangle
          ? Math.abs(
              metricMustHaveIconRectangle.top +
                metricMustHaveIconRectangle.height / 2 -
                (metricIconCellRectangle.top + metricIconCellRectangle.height / 2),
            )
          : Number.POSITIVE_INFINITY
      })
      const mustHaveIconWidths = metricMustHaveIcons.map((metricMustHaveIcon) =>
        Math.round(metricMustHaveIcon.getBoundingClientRect().width),
      )
      const labelLeftOffsets = metricLabels.map((metricLabel) =>
        Math.round(metricLabel.getBoundingClientRect().left - metricTableRectangle.left),
      )
      const valueLeftOffsets = metricValues.map((metricValue) =>
        Math.round(metricValue.getBoundingClientRect().left - metricTableRectangle.left),
      )

      return {
        headerCount: metricTable.querySelectorAll('th, thead').length,
        mustHaveIconLabels: metricMustHaveIcons.map(
          (metricMustHaveIcon) =>
            metricMustHaveIcon
              .closest('[data-testid="background-fit-summary-metric"]')
              ?.querySelector('[data-testid="background-fit-summary-label"]')?.textContent ?? '',
        ),
        iconCellLeftOffsets,
        iconCellWidths,
        isLabelBeforeValue: metricRows.every((metricRow) => {
          const metricLabel = metricRow.querySelector(
            '[data-testid="background-fit-summary-label"]',
          )
          const metricValue = metricRow.querySelector(
            '[data-testid="background-fit-summary-value"]',
          )

          return (
            metricLabel !== null &&
            metricValue !== null &&
            (metricLabel.compareDocumentPosition(metricValue) &
              Node.DOCUMENT_POSITION_FOLLOWING) !==
              0
          )
        }),
        labelTextAligns: metricLabels.map(
          (metricLabel) => window.getComputedStyle(metricLabel).textAlign,
        ),
        labelLeftOffsets,
        mustHaveIconCenterDeltas,
        rowBorderTopWidths: metricRows.map(
          (metricRow) => window.getComputedStyle(metricRow).borderTopWidth,
        ),
        valueFontWeights: metricValues.map(
          (metricValue) => window.getComputedStyle(metricValue).fontWeight,
        ),
        valueLeftOffsets,
        mustHaveIconWidths,
        valueTextAligns: metricValues.map(
          (metricValue) => window.getComputedStyle(metricValue).textAlign,
        ),
      }
    })
  const expectedBuildPerksBadge = apprenticeSummaryMetrics.filter({
    hasText: /Expected must-have perks pickable\s*1\/1/i,
  })
  const guaranteedBuildPerksBadge = apprenticeSummaryMetrics.filter({
    hasText: /Guaranteed perks pickable\s*1\/1/i,
  })
  const fullBuildBadges = apprenticeSummaryMetrics.filter({ hasText: /Full build chance/i })
  const mustHaveBuildBadge = apprenticeSummaryMetrics
    .filter({ hasText: /Must-have build chance\s*100%/i })
    .first()

  expect(metricTableGeometry.headerCount).toBe(0)
  expect(metricTableGeometry.mustHaveIconLabels).toEqual([
    'Must-have build chance',
    'Expected must-have perks pickable',
  ])
  expect(metricTableGeometry.iconCellLeftOffsets).toEqual([
    metricTableGeometry.iconCellLeftOffsets[0],
    metricTableGeometry.iconCellLeftOffsets[0],
    metricTableGeometry.iconCellLeftOffsets[0],
  ])
  expect(metricTableGeometry.iconCellWidths.every((iconCellWidth) => iconCellWidth > 0)).toBe(true)
  expect(
    metricTableGeometry.mustHaveIconWidths.every(
      (mustHaveIconWidth) =>
        mustHaveIconWidth > 0 && mustHaveIconWidth < metricTableGeometry.iconCellWidths[0],
    ),
  ).toBe(true)
  expect(
    metricTableGeometry.mustHaveIconCenterDeltas.every(
      (mustHaveIconCenterDelta) => mustHaveIconCenterDelta <= 1,
    ),
  ).toBe(true)
  expect(metricTableGeometry.isLabelBeforeValue).toBe(true)
  expect(metricTableGeometry.labelTextAligns).toEqual(['left', 'left', 'left'])
  expect(metricTableGeometry.labelLeftOffsets).toEqual([
    metricTableGeometry.labelLeftOffsets[0],
    metricTableGeometry.labelLeftOffsets[0],
    metricTableGeometry.labelLeftOffsets[0],
  ])
  expect(metricTableGeometry.rowBorderTopWidths).toEqual(['0px', '1px', '1px'])
  expect(metricTableGeometry.valueFontWeights.every((fontWeight) => Number(fontWeight) < 600)).toBe(
    true,
  )
  expect(metricTableGeometry.valueLeftOffsets).toEqual([
    metricTableGeometry.valueLeftOffsets[0],
    metricTableGeometry.valueLeftOffsets[0],
    metricTableGeometry.valueLeftOffsets[0],
  ])
  expect(metricTableGeometry.valueTextAligns).toEqual(['left', 'left', 'left'])
  await expect(fullBuildBadges).toHaveCount(0)
  await expect(mustHaveBuildBadge).toHaveAttribute('title', /one legal native background roll/i)
  await expect(mustHaveBuildBadge).toHaveAttribute(
    'title',
    /up to one skill book and up to one ancient scroll/i,
  )
  await expect(mustHaveBuildBadge).not.toHaveAttribute('title', /Must-have build chance:/i)
  await expect(expectedBuildPerksBadge).toHaveAttribute(
    'title',
    /average of 1 of 1 must-have picked perks/i,
  )
  await expect(expectedBuildPerksBadge).toHaveAttribute('title', /Alternate perk-group placements/i)
  await expect(expectedBuildPerksBadge).not.toHaveAttribute(
    'title',
    /Expected 1\/1 must-have perks pickable/i,
  )
  await expect(expectedBuildPerksBadge).toHaveAttribute(
    'aria-label',
    /Expected 1\/1 must-have perks pickable/i,
  )
  await expect(expectedBuildPerksBadge).toHaveAttribute(
    'aria-label',
    /average of 1 of 1 must-have picked perks/i,
  )
  await expect(guaranteedBuildPerksBadge).toHaveAttribute('title', /always has/i)
  await expect(guaranteedBuildPerksBadge).toHaveAttribute(
    'title',
    /1 of 1 picked perks in the full build/i,
  )
  await expect(guaranteedBuildPerksBadge).not.toHaveAttribute('title', /Guaranteed 1\/1/i)
  await expect(guaranteedBuildPerksBadge).toHaveAttribute(
    'aria-label',
    /Guaranteed 1\/1 perks pickable/i,
  )
  await expect(
    apprenticeSummaryMetrics.filter({ hasText: /Best native roll covers total perks/i }),
  ).toHaveCount(0)
  await expect(
    apprenticeCard.getByRole('button', { name: /Inspect background Apprentice/ }),
  ).toHaveAttribute('aria-pressed', 'false')
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const backgroundFitPanelBody = document.querySelector(
          '[data-testid="background-fit-panel-body"]',
        ) as HTMLElement | null

        return backgroundFitPanelBody === null
          ? Number.POSITIVE_INFINITY
          : backgroundFitPanelBody.scrollWidth - backgroundFitPanelBody.clientWidth
      }),
    )
    .toBeLessThanOrEqual(1)
  const searchInputTopBeforeBackgroundScroll = await backgroundSearchInput.evaluate(
    (element) => element.getBoundingClientRect().top,
  )

  await backgroundFitResultsScroll.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await expect
    .poll(async () =>
      backgroundSearchInput.evaluate(
        (element, searchInputTopBeforeScroll) =>
          Math.abs(element.getBoundingClientRect().top - searchInputTopBeforeScroll),
        searchInputTopBeforeBackgroundScroll,
      ),
    )
    .toBeLessThanOrEqual(1)
  await expect(backgroundSearchInput).toBeVisible()
  await backgroundFitResultsScroll.evaluate((element) => {
    element.scrollTop = 0
  })

  await backgroundFitPanel.getByRole('button', { name: 'Inspect background Apprentice' }).click()
  await expect(
    apprenticeCard.getByRole('button', { name: /Inspect background Apprentice/ }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(detailPanel.getByRole('heading', { level: 2, name: 'Apprentice' })).toBeVisible()
  await expect(
    detailPanel.getByRole('heading', { level: 3, name: 'Matched perk groups' }),
  ).toBeVisible()
  await expect(
    detailPanel.getByRole('heading', { exact: true, level: 4, name: 'Must-have' }),
  ).toBeVisible()
  await expect(detailPanel.getByRole('img', { name: 'Must-have perk groups' })).toBeVisible()
  await expect(
    detailPanel.getByRole('heading', { exact: true, level: 4, name: 'Optional' }),
  ).toBeVisible()
  await expect(detailPanel.getByRole('img', { name: 'Optional perk groups' })).toBeVisible()
  await expect(detailPanel.getByText('Must-have study route')).toHaveCount(0)
  await expect(detailPanel.getByText('Additional optional-only study route')).toHaveCount(0)
  await expect(detailPanel.getByTestId('detail-background-veteran-perk-badge')).toHaveCSS(
    'cursor',
    'help',
  )

  const axeMatchButton = detailPanel.getByRole('button', { name: 'Select perk group Axe' })
  const axeMatchRow = axeMatchButton.locator(
    'xpath=ancestor::*[@data-testid="planner-group-card"][1]',
  )
  const axePerkPill = detailPanel.getByRole('button', { name: 'Axe Mastery' })
  const axeResultRow = getResultsList(page)
    .getByRole('button', { name: 'Inspect Axe Mastery' })
    .locator('xpath=ancestor::*[@data-testid="perk-row"][1]')
  const axeResultGroupButton = axeResultRow.getByRole('button', {
    name: 'Select perk group Axe',
  })
  const plannerAxeGroupCard = getBuildIndividualGroupsList(page)
    .getByText('Axe', { exact: true })
    .locator('xpath=ancestor::*[@data-testid="planner-group-card"][1]')
  const pickedAxePerkTile = getBuildPerksBar(page)
    .getByTestId('planner-slot-perk')
    .filter({ hasText: 'Axe Mastery' })

  await expect(axeMatchRow).toHaveAttribute('data-testid', 'planner-group-card')
  await expect(axeMatchRow.getByRole('img', { name: 'Axe perk group icon' })).toBeVisible()
  const backgroundMatchIconSize = await axeMatchRow
    .getByRole('img', { name: 'Axe perk group icon' })
    .evaluate((element) => {
      const rectangle = element.getBoundingClientRect()

      return {
        height: rectangle.height,
        width: rectangle.width,
      }
    })
  const resultsPerkGroupIconSize = await axeResultGroupButton
    .getByRole('img', { name: 'Axe perk group icon' })
    .evaluate((element) => {
      const rectangle = element.getBoundingClientRect()

      return {
        height: rectangle.height,
        width: rectangle.width,
      }
    })

  expect(backgroundMatchIconSize).toEqual(resultsPerkGroupIconSize)
  await expect(axeMatchRow.getByTestId('background-fit-category-badge')).toHaveCount(0)
  await expect(axeMatchRow.getByTestId('planner-slot-category')).toHaveCount(0)
  await expect(axeMatchRow.getByTestId('background-fit-match-probability-badge')).toHaveText(
    'Guaranteed',
  )
  const backgroundMatchTileStyle = await axeMatchRow.evaluate((element) => {
    const computedStyle = window.getComputedStyle(element)

    return {
      backgroundColor: computedStyle.backgroundColor,
      borderColor: computedStyle.borderTopColor,
      borderRadius: computedStyle.borderTopLeftRadius,
    }
  })
  const plannerGroupTileStyle = await plannerAxeGroupCard.evaluate((element) => {
    const computedStyle = window.getComputedStyle(element)

    return {
      backgroundColor: computedStyle.backgroundColor,
      borderColor: computedStyle.borderTopColor,
      borderRadius: computedStyle.borderTopLeftRadius,
    }
  })

  expect(backgroundMatchTileStyle).toEqual(plannerGroupTileStyle)
  await expect(axeMatchRow).not.toContainText(/\/\s*\d+\s+perks?\s*\//)
  await expect(axePerkPill).toBeVisible()
  await expect(axePerkPill).toHaveAttribute('data-tooltip-pending', 'false')
  await axePerkPill.hover()
  await expect(axePerkPill).toHaveAttribute('data-tooltip-pending', 'true', { timeout: 2500 })
  await expect(pickedAxePerkTile).toHaveAttribute('data-highlighted', 'true')
  await expect(pickedAxePerkTile).toHaveAttribute('data-tooltip-pending', 'false')
  await expect(page.getByRole('tooltip')).toBeVisible({ timeout: 2500 })
  await expect(axePerkPill).toHaveAttribute('data-tooltip-pending', 'true')
  await expect(pickedAxePerkTile).toHaveAttribute('data-tooltip-pending', 'false')
  await expect(page.getByRole('tooltip')).not.toContainText('Axe Mastery')
  await expect(page.getByRole('tooltip')).toContainText(/Skills build up 25% less Fatigue/i)
  await expect(axeResultGroupButton).toBeVisible()
  await axeResultGroupButton.hover()
  await expect(axeResultGroupButton).toHaveAttribute('data-highlighted', 'true')
  await expect(axeMatchRow).toHaveAttribute('data-highlighted', 'true')
  await expect(plannerAxeGroupCard).toHaveAttribute('data-highlighted', 'true')

  await enableCategory(page, 'Traits')
  await selectPerkGroup(page, 'Calm')
  await searchPerks(page, 'Berserk')

  await axeMatchButton.click()
  await expect(page.getByLabel('Search perks')).toHaveValue('')
  await expect(page.getByRole('button', { name: 'Disable category Weapon' })).toBeVisible()
  await expect(getSidebarPerkGroupButton(page, 'Axe')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Enable category Traits' })).toBeVisible()

  await backgroundFitPanel.getByRole('button', { name: 'Collapse background fit' }).click()
  await expect(
    backgroundFitPanel.getByRole('button', { name: 'Expand background fit' }),
  ).toHaveAttribute('aria-expanded', 'false')
  await expect(backgroundFitPanel.getByText('Background fit')).toBeVisible()

  await backgroundFitPanel.getByRole('button', { name: 'Expand background fit' }).click()
  await expect(
    backgroundFitPanel.getByRole('button', { name: 'Collapse background fit' }),
  ).toHaveAttribute('aria-expanded', 'true')
  await page.getByRole('button', { name: 'Inspect Axe Mastery' }).click()
  await expect(detailPanel.getByRole('heading', { level: 2, name: 'Axe Mastery' })).toBeVisible()

  await expectViewportLocked(page)
})

test('restores build and detail state with browser back and forward', async ({ page }) => {
  await gotoBuildPlanner(page, mediumBuildPlannerViewport)
  await searchPerks(page, 'Axe Mastery')
  await addPerkToBuildFromResults(page, 'Axe Mastery')

  const backgroundFitPanel = getBackgroundFitPanel(page)
  const detailPanel = getDetailPanel(page)

  await expect(page.getByText('1 perk picked.')).toBeVisible()
  await expect.poll(() => new URL(page.url()).searchParams.get('build')).toBe('Axe Mastery')

  await page.goBack()
  await expect(page.getByText('No perks picked yet.')).toBeVisible()
  await expect.poll(() => new URL(page.url()).searchParams.get('build')).toBeNull()

  await page.goForward()
  await expect(page.getByText('1 perk picked.')).toBeVisible()
  await expect.poll(() => new URL(page.url()).searchParams.get('build')).toBe('Axe Mastery')

  const expandBackgroundFitButton = backgroundFitPanel.getByRole('button', {
    name: 'Expand background fit',
  })

  if (await expandBackgroundFitButton.isVisible()) {
    await expandBackgroundFitButton.click()
  }

  await expect(
    backgroundFitPanel.getByRole('button', { name: 'Collapse background fit' }),
  ).toBeVisible()
  await expectBackgroundFitCalculationComplete(backgroundFitPanel)
  await backgroundFitPanel.getByRole('button', { name: 'Inspect background Apprentice' }).click()
  await expect(detailPanel.getByRole('heading', { level: 2, name: 'Apprentice' })).toBeVisible()
  await expect.poll(() => new URL(page.url()).searchParams.get('detail')).toBe('background')

  await detailPanel.getByRole('button', { name: 'Axe Mastery' }).click()
  await expect(detailPanel.getByRole('heading', { level: 2, name: 'Axe Mastery' })).toBeVisible()
  await expect.poll(() => new URL(page.url()).searchParams.get('detail')).toBe('perk')

  await page.goBack()
  await expect(detailPanel.getByRole('heading', { level: 2, name: 'Apprentice' })).toBeVisible()
  await expect.poll(() => new URL(page.url()).searchParams.get('detail')).toBe('background')
  const restoredBackgroundDetailUrl = page.url()

  await page.goForward()
  await expect(detailPanel.getByRole('heading', { level: 2, name: 'Axe Mastery' })).toBeVisible()
  await expect.poll(() => new URL(page.url()).searchParams.get('detail')).toBe('perk')

  const sharedPage = await page.context().newPage()

  try {
    await sharedPage.setViewportSize(mediumBuildPlannerViewport)
    await sharedPage.goto(restoredBackgroundDetailUrl)
    await expect(
      getDetailPanel(sharedPage).getByRole('heading', {
        level: 2,
        name: 'Apprentice',
      }),
    ).toBeVisible()
  } finally {
    await sharedPage.close()
  }
})

test('filters the background fit list with the background search field', async ({ page }) => {
  await gotoBuildPlanner(page, mediumBuildPlannerViewport)
  await searchPerks(page, 'Axe Mastery')
  await addPerkToBuildFromResults(page, 'Axe Mastery')

  const backgroundFitPanel = getBackgroundFitPanel(page)
  const backgroundSearchInput = backgroundFitPanel.getByLabel('Search backgrounds')
  const backgroundFitPanelBody = backgroundFitPanel.getByTestId('background-fit-panel-body')
  const oathtakerCard = backgroundFitPanel
    .getByTestId('background-fit-card')
    .filter({ hasText: 'Oathtaker' })
    .first()

  await expect(backgroundSearchInput).toBeVisible()
  await expectBackgroundFitCalculationComplete(backgroundFitPanel, {
    shouldObserveProgress: true,
  })
  await expect(
    oathtakerCard.getByTestId('background-fit-summary-value').filter({ hasText: '0.3/1' }),
  ).toBeVisible()
  await expect(
    oathtakerCard
      .getByTestId('background-fit-summary-label')
      .filter({ hasText: 'Expected must-have perks pickable' }),
  ).toBeVisible()
  const oathtakerExpectedBuildPerksBadge = oathtakerCard
    .getByTestId('background-fit-summary-metric')
    .filter({ hasText: /Expected must-have perks pickable\s*0\.3\/1/i })

  await expect(oathtakerExpectedBuildPerksBadge).toHaveAttribute(
    'title',
    /average of 0\.3 of 1 must-have picked perks/i,
  )
  await expect(oathtakerExpectedBuildPerksBadge).toHaveAttribute(
    'title',
    /Alternate perk-group placements count once per picked perk/i,
  )
  await expect(oathtakerExpectedBuildPerksBadge).not.toHaveAttribute(
    'title',
    /Expected 0\.3\/1 must-have perks pickable/i,
  )
  await expect(oathtakerExpectedBuildPerksBadge).toHaveAttribute(
    'aria-label',
    /Expected 0\.3\/1 must-have perks pickable/i,
  )
  const oathtakerRankBeforeFiltering = await page.evaluate(() => {
    const oathtakerCard = [
      ...document.querySelectorAll('[data-testid="background-fit-card"]'),
    ].find(
      (backgroundFitCard) =>
        backgroundFitCard.querySelector('h3')?.textContent?.trim() === 'Oathtaker',
    )

    return oathtakerCard?.querySelector('[data-testid="background-fit-rank"]')?.textContent ?? null
  })

  expect(oathtakerRankBeforeFiltering).toMatch(/^\d+$/)
  await backgroundFitPanelBody.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await expect
    .poll(async () => backgroundFitPanelBody.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0)
  const backgroundSearchWidthWithScrollbar = await backgroundSearchInput.evaluate(
    (element) => element.getBoundingClientRect().width,
  )

  await backgroundSearchInput.fill('Oath')
  await expect(
    backgroundFitPanel.getByRole('button', { name: 'Clear background search' }),
  ).toBeVisible()
  await expect
    .poll(async () => backgroundFitPanelBody.evaluate((element) => element.scrollTop))
    .toBeLessThanOrEqual(1)
  const oathtakerHeading = backgroundFitPanel.getByRole('heading', {
    level: 3,
    name: 'Oathtaker',
  })
  const oathtakerToggle = backgroundFitPanel.getByRole('button', {
    name: 'Inspect background Oathtaker',
  })

  await expect(oathtakerHeading).toBeVisible()
  await expect(oathtakerToggle).toBeVisible()
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const oathtakerCard = [
          ...document.querySelectorAll('[data-testid="background-fit-card"]'),
        ].find(
          (backgroundFitCard) =>
            backgroundFitCard.querySelector('h3')?.textContent?.trim() === 'Oathtaker',
        )

        return (
          oathtakerCard?.querySelector('[data-testid="background-fit-rank"]')?.textContent ?? null
        )
      }),
    )
    .toBe(oathtakerRankBeforeFiltering)
  await expect(backgroundFitPanel.locator('[data-search-highlight="true"]')).toContainText(['Oath'])
  await expect
    .poll(async () => {
      return page.evaluate(() => {
        const backgroundFitPanelBody = document.querySelector(
          '[data-testid="background-fit-panel-body"]',
        )
        const oathtakerHeading = [
          ...document.querySelectorAll('[data-testid="background-fit-card"] h3'),
        ].find((heading) => heading.textContent?.trim() === 'Oathtaker')

        if (
          !(backgroundFitPanelBody instanceof HTMLElement) ||
          !(oathtakerHeading instanceof HTMLElement)
        ) {
          return false
        }

        const backgroundFitPanelBodyBox = backgroundFitPanelBody.getBoundingClientRect()
        const oathtakerHeadingBox = oathtakerHeading.getBoundingClientRect()

        return (
          oathtakerHeadingBox.top >= backgroundFitPanelBodyBox.top &&
          oathtakerHeadingBox.bottom <= backgroundFitPanelBodyBox.bottom
        )
      })
    })
    .toBe(true)
  await expect
    .poll(async () =>
      backgroundFitPanelBody.evaluate((element) => element.scrollHeight - element.clientHeight),
    )
    .toBeLessThanOrEqual(1)
  await expect(
    backgroundFitPanel.getByRole('button', {
      name: 'Inspect background Apprentice',
    }),
  ).toHaveCount(0)

  await backgroundSearchInput.fill('zzzz impossible background')
  await expect(
    backgroundFitPanel.getByText('No backgrounds match "zzzz impossible background".'),
  ).toBeVisible()
  await expect
    .poll(async () =>
      backgroundFitPanelBody.evaluate((element) => element.scrollHeight - element.clientHeight),
    )
    .toBeLessThanOrEqual(1)
  const backgroundSearchWidthWithoutScrollbar = await backgroundSearchInput.evaluate(
    (element) => element.getBoundingClientRect().width,
  )

  expect(
    Math.abs(backgroundSearchWidthWithoutScrollbar - backgroundSearchWidthWithScrollbar),
  ).toBeLessThanOrEqual(1)
})

test('positions veteran interval pills at the bottom right without reserving table space', async ({
  page,
}) => {
  await gotoBuildPlanner(page, mediumBuildPlannerViewport)
  await searchPerks(page, 'Axe Mastery')
  await addPerkToBuildFromResults(page, 'Axe Mastery')

  const backgroundFitPanel = getBackgroundFitPanel(page)
  const oathtakerCard = backgroundFitPanel
    .getByTestId('background-fit-card')
    .filter({ hasText: 'Oathtaker' })
    .first()

  await expectBackgroundFitCalculationComplete(backgroundFitPanel, {
    shouldObserveProgress: true,
  })
  await expect(oathtakerCard).toBeVisible()

  const veteranBadgeMetrics = await oathtakerCard.evaluate((card) => {
    const trigger = card.querySelector('button')
    const headerMain = card.querySelector('[class*="backgroundFitCardHeaderMain"]')
    const metricTable = card.querySelector('[data-testid="background-fit-summary-table"]')
    const metricValues = [...card.querySelectorAll('[data-testid="background-fit-summary-value"]')]
    const rankBadge = card.querySelector('[data-testid="background-fit-rank"]')
    const veteranBadge = card.querySelector('[data-testid="background-fit-veteran-perk-badge"]')

    if (
      !(trigger instanceof HTMLElement) ||
      !(headerMain instanceof HTMLElement) ||
      !(metricTable instanceof HTMLElement) ||
      !(rankBadge instanceof HTMLElement) ||
      !(veteranBadge instanceof HTMLElement) ||
      metricValues.some((metricValue) => !(metricValue instanceof HTMLElement))
    ) {
      return null
    }

    const triggerRectangle = trigger.getBoundingClientRect()
    const triggerStyle = window.getComputedStyle(trigger)
    const headerMainRectangle = headerMain.getBoundingClientRect()
    const metricTableRectangle = metricTable.getBoundingClientRect()
    const veteranBadgeRectangle = veteranBadge.getBoundingClientRect()
    const metricValueRight = Math.max(
      ...metricValues.map((metricValue) => metricValue.getBoundingClientRect().right),
    )

    return {
      badgeBottomGap: triggerRectangle.bottom - veteranBadgeRectangle.bottom,
      badgeLeft: veteranBadgeRectangle.left,
      badgeRightGap: triggerRectangle.right - veteranBadgeRectangle.right,
      badgeTop: veteranBadgeRectangle.top,
      headerMainBottom: headerMainRectangle.bottom,
      metricTableRightGap: triggerRectangle.right - metricTableRectangle.right,
      metricValueRight,
      paddingBottom: Number.parseFloat(triggerStyle.paddingBottom),
      paddingRight: Number.parseFloat(triggerStyle.paddingRight),
      rankCursor: window.getComputedStyle(rankBadge).cursor,
      veteranCursor: window.getComputedStyle(veteranBadge).cursor,
    }
  })

  expect(veteranBadgeMetrics).not.toBeNull()
  expect(
    Math.abs(veteranBadgeMetrics!.badgeRightGap - veteranBadgeMetrics!.paddingRight),
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(veteranBadgeMetrics!.badgeBottomGap - veteranBadgeMetrics!.paddingBottom),
  ).toBeLessThanOrEqual(1)
  expect(veteranBadgeMetrics!.metricTableRightGap).toBeLessThanOrEqual(
    veteranBadgeMetrics!.paddingRight + 1,
  )
  expect(veteranBadgeMetrics!.badgeLeft).toBeGreaterThan(veteranBadgeMetrics!.metricValueRight + 4)
  expect(veteranBadgeMetrics!.badgeTop).toBeGreaterThanOrEqual(
    veteranBadgeMetrics!.headerMainBottom,
  )
  expect(veteranBadgeMetrics!.rankCursor).toBe('help')
  expect(veteranBadgeMetrics!.veteranCursor).toBe('help')
})

test('filters origin backgrounds from the background search menu', async ({ page }) => {
  await gotoBuildPlanner(page, mediumBuildPlannerViewport)

  const backgroundFitPanel = getBackgroundFitPanel(page)
  const backgroundSearchInput = backgroundFitPanel.getByLabel('Search backgrounds')
  const filterBackgroundsButton = backgroundFitPanel.getByRole('button', {
    name: 'Filter backgrounds',
  })

  await expect(filterBackgroundsButton).toBeVisible()
  await expect(filterBackgroundsButton).toHaveAttribute('data-active-filter', 'true')
  await expect(filterBackgroundsButton.getByTestId('background-fit-filter-icon')).toHaveAttribute(
    'fill',
    'currentColor',
  )
  await expect.poll(() => new URL(page.url()).searchParams.get('origin-backgrounds')).toBeNull()
  await backgroundSearchInput.fill('origin: crusader')

  const clearBackgroundSearchButton = backgroundFitPanel.getByRole('button', {
    name: 'Clear background search',
  })
  const [clearButtonBox, filterButtonBox] = await Promise.all([
    clearBackgroundSearchButton.boundingBox(),
    filterBackgroundsButton.boundingBox(),
  ])

  expect(clearButtonBox).not.toBeNull()
  expect(filterButtonBox).not.toBeNull()
  expect(clearButtonBox!.x).toBeLessThan(filterButtonBox!.x)
  await expect(
    backgroundFitPanel.getByText('No backgrounds match "origin: crusader".'),
  ).toBeVisible()

  await filterBackgroundsButton.click()

  const originBackgroundsCheckbox = backgroundFitPanel.getByRole('checkbox', {
    name: 'Origin backgrounds',
  })
  const backgroundFiltersGroup = backgroundFitPanel.getByRole('group', {
    name: 'Background filters',
  })
  const originBackgroundsCheckboxControl = backgroundFiltersGroup.locator(
    'input[data-testid="origin-backgrounds-checkbox"]',
  )
  const originBackgroundsLabel = backgroundFiltersGroup.getByText('Origin backgrounds')
  const backgroundFilterOptions = [
    {
      labelText: 'Origin backgrounds',
      title: 'Shows origin-only backgrounds hidden from the default results.',
    },
    {
      labelText: 'Allow a book',
      title:
        'Counts one eligible skill book when checking whether a background can reach the picked build.',
    },
    {
      labelText: 'Allow a scroll',
      title:
        'Counts one eligible ancient scroll when checking whether a background can reach the picked build.',
    },
    {
      labelText: 'Allow two scrolls',
      title:
        'Counts a second ancient scroll when Bright is available and the first scroll is allowed.',
    },
    {
      labelText: 'Perk every 2 veteran levels',
      title: 'Shows backgrounds that gain 1 perk point every 2 veteran levels after level 12.',
    },
    {
      labelText: 'Perk every 3 veteran levels',
      title: 'Shows backgrounds that gain 1 perk point every 3 veteran levels after level 12.',
    },
    {
      labelText: 'Perk every 4 veteran levels',
      title: 'Shows backgrounds that gain 1 perk point every 4 veteran levels after level 12.',
    },
  ] as const

  await expect(originBackgroundsCheckbox).not.toBeChecked()
  await expect(
    backgroundFitPanel.getByRole('checkbox', {
      name: 'Allow a book',
    }),
  ).toBeChecked()
  await expect(
    backgroundFitPanel.getByRole('checkbox', {
      name: 'Allow a scroll',
    }),
  ).toBeChecked()

  for (const { labelText, title } of backgroundFilterOptions) {
    const labelRow = backgroundFiltersGroup.locator('label').filter({ hasText: labelText })

    await expect(labelRow).toHaveAttribute('title', title)
    await expect
      .poll(() => labelRow.evaluate((element) => getComputedStyle(element).cursor))
      .toBe('help')
  }

  await expect
    .poll(async () => {
      const checkboxBox = await originBackgroundsCheckboxControl.boundingBox()

      return checkboxBox === null
        ? null
        : {
            height: Math.round(checkboxBox.height),
            width: Math.round(checkboxBox.width),
          }
    })
    .toEqual({
      height: 16,
      width: 16,
    })
  await backgroundFiltersGroup.click({ position: { x: 2, y: 2 } })
  await expect(filterBackgroundsButton).toHaveAttribute('aria-expanded', 'true')
  await expect(originBackgroundsCheckbox).not.toBeChecked()

  await originBackgroundsLabel.click()
  await expect(filterBackgroundsButton).toHaveAttribute('aria-expanded', 'true')
  await expect(
    backgroundFitPanel.getByRole('heading', {
      level: 3,
      name: 'Holy Crusader',
    }),
  ).toBeVisible()
  await expect(originBackgroundsCheckbox).toBeChecked()
  await expect.poll(() => new URL(page.url()).searchParams.get('origin-backgrounds')).toBe('true')
  await expect(backgroundFitPanel.getByText('Origin: Crusader').first()).toBeVisible()
  await expect(filterBackgroundsButton).toHaveAttribute('data-active-filter', 'true')
  await expect(filterBackgroundsButton.getByTestId('background-fit-filter-icon')).toHaveAttribute(
    'fill',
    'currentColor',
  )

  const savedUrl = page.url()
  const sharedPage = await page.context().newPage()

  try {
    await sharedPage.setViewportSize(mediumBuildPlannerViewport)
    await sharedPage.goto(savedUrl)

    const sharedBackgroundFitPanel = getBackgroundFitPanel(sharedPage)
    const sharedFilterBackgroundsButton = sharedBackgroundFitPanel.getByRole('button', {
      name: 'Filter backgrounds',
    })

    await expect(sharedBackgroundFitPanel.getByText('Origin: Crusader').first()).toBeVisible()
    await sharedFilterBackgroundsButton.click()
    await expect(
      sharedBackgroundFitPanel.getByRole('checkbox', {
        name: 'Origin backgrounds',
      }),
    ).toBeChecked()
  } finally {
    await sharedPage.close()
  }

  await originBackgroundsLabel.click()
  await expect(filterBackgroundsButton).toHaveAttribute('aria-expanded', 'true')
  await expect(originBackgroundsCheckbox).not.toBeChecked()
  await expect.poll(() => new URL(page.url()).searchParams.get('origin-backgrounds')).toBeNull()
  await expect(
    backgroundFitPanel.getByText('No backgrounds match "origin: crusader".'),
  ).toBeVisible()
  await expect(filterBackgroundsButton).toHaveAttribute('data-active-filter', 'true')
  await expect(filterBackgroundsButton.getByTestId('background-fit-filter-icon')).toHaveAttribute(
    'fill',
    'currentColor',
  )

  await backgroundFitPanel.getByRole('checkbox', { name: 'Perk every 3 veteran levels' }).uncheck()
  await expect(filterBackgroundsButton).toHaveAttribute('data-active-filter', 'true')
  await expect(filterBackgroundsButton.getByTestId('background-fit-filter-icon')).toHaveAttribute(
    'fill',
    'currentColor',
  )
  await backgroundFitPanel.getByRole('checkbox', { name: 'Perk every 3 veteran levels' }).check()
  await expect(filterBackgroundsButton).toHaveAttribute('data-active-filter', 'true')
  await expect(filterBackgroundsButton.getByTestId('background-fit-filter-icon')).toHaveAttribute(
    'fill',
    'currentColor',
  )
  await backgroundFitPanel.getByRole('checkbox', { name: 'Allow a book' }).uncheck()
  await expect(filterBackgroundsButton).toHaveAttribute('data-active-filter', 'true')
  await backgroundFitPanel.getByRole('checkbox', { name: 'Allow a book' }).check()
  await expect(filterBackgroundsButton).toHaveAttribute('data-active-filter', 'true')
  await backgroundFitPanel.getByRole('checkbox', { name: 'Allow a scroll' }).uncheck()
  await expect(filterBackgroundsButton).toHaveAttribute('data-active-filter', 'true')
  await backgroundFitPanel.getByRole('checkbox', { name: 'Allow a scroll' }).check()
  await expect(filterBackgroundsButton).toHaveAttribute('data-active-filter', 'true')
  await backgroundFitPanel.getByRole('checkbox', { name: 'Allow two scrolls' }).check()
  await expect(filterBackgroundsButton).toHaveAttribute('data-active-filter', 'true')
  await backgroundFitPanel.getByRole('checkbox', { name: 'Allow two scrolls' }).uncheck()
  await expect(filterBackgroundsButton).toHaveAttribute('data-active-filter', 'true')

  await backgroundFitPanel.getByRole('checkbox', { name: 'Allow a book' }).uncheck()
  await backgroundFitPanel.getByRole('checkbox', { name: 'Allow a scroll' }).uncheck()
  await backgroundFitPanel.getByRole('checkbox', { name: 'Perk every 2 veteran levels' }).uncheck()
  await backgroundFitPanel.getByRole('checkbox', { name: 'Perk every 3 veteran levels' }).uncheck()
  await backgroundFitPanel.getByRole('checkbox', { name: 'Perk every 4 veteran levels' }).uncheck()
  await expect(filterBackgroundsButton).toHaveAttribute('data-active-filter', 'false')
  await expect(filterBackgroundsButton.getByTestId('background-fit-filter-icon')).toHaveAttribute(
    'fill',
    'none',
  )

  await page.getByLabel('Search perks').click()
  await expect(filterBackgroundsButton).toHaveAttribute('aria-expanded', 'false')
  await expect(
    backgroundFitPanel.getByRole('group', {
      name: 'Background filters',
    }),
  ).toHaveCount(0)
})

test('keeps the background filter dropdown above background fit cards', async ({ page }) => {
  await page.setViewportSize({ height: 980, width: 390 })
  await page.goto(denseSharedBuildUrl)

  const backgroundFitPanel = getBackgroundFitPanel(page)
  const expandBackgroundFitButton = backgroundFitPanel.getByRole('button', {
    name: 'Expand background fit',
  })

  if ((await expandBackgroundFitButton.count()) > 0) {
    await expandBackgroundFitButton.click()
  }

  await expectBackgroundFitCalculationComplete(backgroundFitPanel)
  await expect(
    backgroundFitPanel.getByTestId('background-fit-card').filter({ hasText: 'Bastard' }).first(),
  ).toBeVisible()

  await backgroundFitPanel.getByRole('button', { name: 'Filter backgrounds' }).click()

  const backgroundFiltersGroup = backgroundFitPanel.getByRole('group', {
    name: 'Background filters',
  })

  await expect(backgroundFiltersGroup).toBeVisible()

  const stackingProbe = await backgroundFiltersGroup.evaluate((filterPopover) => {
    const filterPopoverRectangle = filterPopover.getBoundingClientRect()
    const overlappingVeteranPerkBadge = [
      ...document.querySelectorAll<HTMLElement>(
        '[data-testid="background-fit-veteran-perk-badge"]',
      ),
    ]
      .map((veteranPerkBadge) => {
        const veteranPerkBadgeRectangle = veteranPerkBadge.getBoundingClientRect()

        return {
          element: veteranPerkBadge,
          x: veteranPerkBadgeRectangle.left + veteranPerkBadgeRectangle.width / 2,
          y: veteranPerkBadgeRectangle.top + veteranPerkBadgeRectangle.height / 2,
        }
      })
      .find(
        ({ x, y }) =>
          x >= filterPopoverRectangle.left &&
          x <= filterPopoverRectangle.right &&
          y >= filterPopoverRectangle.top &&
          y <= filterPopoverRectangle.bottom,
      )

    if (!overlappingVeteranPerkBadge) {
      return {
        filterPopoverOwnsTopElement: false,
        filterPopoverStackIndex: -1,
        overlappingVeteranPerkBadgeFound: false,
        topElementTestId: null,
        veteranPerkBadgeStackIndex: -1,
      }
    }

    const elementsAtBadgeCenter = document.elementsFromPoint(
      overlappingVeteranPerkBadge.x,
      overlappingVeteranPerkBadge.y,
    )
    const topElement = elementsAtBadgeCenter[0] ?? null
    const filterPopoverStackIndex = elementsAtBadgeCenter.findIndex(
      (element) => element === filterPopover || filterPopover.contains(element),
    )
    const veteranPerkBadgeStackIndex = elementsAtBadgeCenter.findIndex(
      (element) =>
        element === overlappingVeteranPerkBadge.element ||
        overlappingVeteranPerkBadge.element.contains(element),
    )

    return {
      filterPopoverOwnsTopElement:
        topElement !== null && (topElement === filterPopover || filterPopover.contains(topElement)),
      filterPopoverStackIndex,
      overlappingVeteranPerkBadgeFound: true,
      topElementTestId:
        topElement instanceof HTMLElement ? (topElement.dataset.testid ?? null) : null,
      veteranPerkBadgeStackIndex,
    }
  })

  expect(stackingProbe).toMatchObject({
    filterPopoverOwnsTopElement: true,
    overlappingVeteranPerkBadgeFound: true,
  })
  expect(stackingProbe.filterPopoverStackIndex).toBeGreaterThanOrEqual(0)
  expect(stackingProbe.veteranPerkBadgeStackIndex).toBeGreaterThan(
    stackingProbe.filterPopoverStackIndex,
  )
})

test('shows probabilistic background fit matches with percentage badges', async ({ page }) => {
  await gotoBuildPlanner(page, mediumBuildPlannerViewport)
  await searchPerks(page, 'Danger Pay')
  await addPerkToBuildFromResults(page, 'Danger Pay')

  const backgroundFitPanel = getBackgroundFitPanel(page)
  const detailPanel = getDetailPanel(page)
  const apprenticeCard = backgroundFitPanel
    .getByTestId('background-fit-card')
    .filter({ hasText: 'Apprentice' })
    .first()
  const apprenticeToggle = apprenticeCard.getByRole('button', {
    name: 'Inspect background Apprentice',
  })

  await apprenticeCard.scrollIntoViewIfNeeded()
  await apprenticeToggle.click()
  await expectBackgroundFitCalculationComplete(backgroundFitPanel)
  await expect(detailPanel.getByRole('heading', { level: 2, name: 'Apprentice' })).toBeVisible()

  const otherNativePerkGroupsToggle = detailPanel.getByTestId('detail-other-perk-groups-toggle')

  await expect(otherNativePerkGroupsToggle).toHaveAttribute('aria-expanded', 'false')
  await expect(detailPanel.getByTestId('detail-other-perk-groups-section')).toHaveCount(0)

  await otherNativePerkGroupsToggle.click()

  const otherNativePerkGroupsSection = detailPanel.getByTestId('detail-other-perk-groups-section')

  await expect(otherNativePerkGroupsToggle).toHaveAttribute('aria-expanded', 'true')
  await expect(otherNativePerkGroupsSection).toBeVisible()
  await expect(otherNativePerkGroupsSection.getByTestId('planner-group-card').first()).toBeVisible()
  await expect(
    otherNativePerkGroupsSection
      .getByTestId('planner-group-card')
      .first()
      .getByTestId('planner-pill')
      .first(),
  ).toBeVisible()
  const otherNativeGroupLayout = await otherNativePerkGroupsSection.evaluate((section) => {
    const list = section.querySelector('ul')
    const firstCard = section.querySelector('[data-testid="planner-group-card"]')

    if (!(list instanceof HTMLElement) || !(firstCard instanceof HTMLElement)) {
      return null
    }

    const listStyle = window.getComputedStyle(list)
    const listRect = list.getBoundingClientRect()
    const firstCardRect = firstCard.getBoundingClientRect()

    return {
      firstCardWidth: firstCardRect.width,
      gridColumnCount: listStyle.gridTemplateColumns.split(' ').filter(Boolean).length,
      listDisplay: listStyle.display,
      listWidth: listRect.width,
    }
  })

  expect(otherNativeGroupLayout).toEqual(
    expect.objectContaining({
      gridColumnCount: 3,
      listDisplay: 'grid',
    }),
  )
  expect(otherNativeGroupLayout?.firstCardWidth ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
    (otherNativeGroupLayout?.listWidth ?? 0) / 3 + 4,
  )
  await expect(
    otherNativePerkGroupsSection.getByRole('button', { name: 'Select perk group Barter' }),
  ).toHaveCount(0)

  const barterMatchButton = detailPanel.getByRole('button', {
    name: 'Select perk group Barter',
  })
  const barterMatchRow = barterMatchButton.locator(
    'xpath=ancestor::*[@data-testid="planner-group-card"][1]',
  )

  await expect(detailPanel.getByText('Possible', { exact: true }).first()).toBeVisible()
  await expect(barterMatchButton).toBeVisible()
  await expect(barterMatchRow).toHaveAttribute('data-testid', 'planner-group-card')
  await expect(barterMatchRow.getByTestId('background-fit-category-badge')).toHaveCount(0)
  await expect(barterMatchRow.getByTestId('planner-slot-category')).toHaveCount(0)
  await expect(barterMatchRow.getByTestId('background-fit-match-probability-badge')).toHaveText(
    /\d+(\.\d)?%/,
  )
  await expect(barterMatchRow).not.toContainText(/\/\s*\d+\s+perks?\s*\//)
  await barterMatchButton.click()
  await expect(page.getByLabel('Search perks')).toHaveValue('')
  await expect(page.getByRole('button', { name: 'Disable category Profession' })).toBeVisible()
  await expect(getSidebarPerkGroupButton(page, 'Barter')).toHaveAttribute('aria-pressed', 'true')
})

test('keeps the background search enabled without any picked perks', async ({ page }) => {
  await gotoBuildPlanner(page, mediumBuildPlannerViewport)

  const backgroundFitPanel = getBackgroundFitPanel(page)
  const backgroundSearchInput = backgroundFitPanel.getByLabel('Search backgrounds')

  await expect(backgroundSearchInput).toBeEnabled()
  await expect(backgroundFitPanel.getByText(/Showing all backgrounds/i)).toHaveCount(0)
  await expect(backgroundFitPanel.getByText(/Exact probabilities/i)).toHaveCount(0)

  await backgroundSearchInput.fill('Oath')

  await expect(
    backgroundFitPanel.getByRole('heading', {
      level: 3,
      name: 'Oathtaker',
    }),
  ).toBeVisible()
  await expect(backgroundFitPanel.locator('[data-search-highlight="true"]')).toContainText(['Oath'])
  await expect(backgroundFitPanel.getByText(/Ranked by expected perks pickable./i)).toHaveCount(0)
})

test('hides redundant background disambiguator pills when they only repeat the name', async ({
  page,
}) => {
  await gotoBuildPlanner(page, mediumBuildPlannerViewport)

  const backgroundFitPanel = getBackgroundFitPanel(page)
  const backgroundSearchInput = backgroundFitPanel.getByLabel('Search backgrounds')

  await backgroundSearchInput.fill('Gladiator')

  await expect
    .poll(async () =>
      page.evaluate(() =>
        [...document.querySelectorAll('[data-testid="background-fit-card"]')]
          .map((backgroundFitCard) => {
            const heading = backgroundFitCard.querySelector('h3')?.textContent?.trim() ?? ''
            const disambiguator =
              backgroundFitCard
                .querySelector('[data-testid="background-fit-disambiguator"]')
                ?.textContent?.trim() ?? null

            return { disambiguator, heading }
          })
          .filter((backgroundFitCard) => backgroundFitCard.heading === 'Gladiator'),
      ),
    )
    .toContainEqual({
      disambiguator: null,
      heading: 'Gladiator',
    })
})

test('keeps zero-match backgrounds after matching backgrounds in the full ranked list', async ({
  page,
}) => {
  await gotoBuildPlanner(page, mediumBuildPlannerViewport)
  await searchPerks(page, 'Axe Mastery')
  await addPerkToBuildFromResults(page, 'Axe Mastery')

  const backgroundFitPanel = getBackgroundFitPanel(page)

  await expect(
    backgroundFitPanel.getByRole('button', { name: 'Inspect background Apprentice' }),
  ).toBeVisible()
  await expectBackgroundFitCalculationComplete(backgroundFitPanel)

  const backgroundNameOrder = await page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="background-fit-card"] h3')].map((heading) =>
      heading.textContent?.trim(),
    ),
  )

  expect(backgroundNameOrder).toContain('Apprentice')
  expect(backgroundNameOrder).toContain('Oathtaker')
  expect(backgroundNameOrder.indexOf('Apprentice')).toBeLessThan(
    backgroundNameOrder.indexOf('Oathtaker'),
  )
})

test('keeps dense background names readable from a shared build url and starts collapsed', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto(denseSharedBuildUrl)

  const backgroundFitPanel = getBackgroundFitPanel(page)

  await expect(
    backgroundFitPanel.getByRole('button', { name: 'Expand background fit' }),
  ).toHaveAttribute('aria-expanded', 'false')
  await backgroundFitPanel.getByRole('button', { name: 'Expand background fit' }).click()
  await expect(
    backgroundFitPanel.getByRole('button', { name: 'Collapse background fit' }),
  ).toHaveAttribute('aria-expanded', 'true')
  await expectBackgroundFitCalculationComplete(backgroundFitPanel)
  await expect(backgroundFitPanel.getByText(/Ranked by must-have build chance./i)).toBeVisible()

  const denseBuildBackgroundCard = backgroundFitPanel
    .getByTestId('background-fit-card')
    .filter({ hasText: denseSharedBuildSearchBackgroundName })
    .first()
  const denseBuildBackgroundHeading = denseBuildBackgroundCard.locator('h3')

  await denseBuildBackgroundHeading.scrollIntoViewIfNeeded()
  await expect(denseBuildBackgroundHeading).toBeVisible()
  await expect(
    denseBuildBackgroundCard.getByRole('button', {
      name: new RegExp(`Inspect background ${denseSharedBuildSearchBackgroundName}`),
    }),
  ).toHaveAttribute('aria-pressed', 'false')
  await expect
    .poll(async () => {
      const denseBuildBackgroundBoundingBox = await denseBuildBackgroundHeading.boundingBox()

      return denseBuildBackgroundBoundingBox === null
        ? null
        : {
            height: denseBuildBackgroundBoundingBox.height,
            width: denseBuildBackgroundBoundingBox.width,
          }
    })
    .toMatchObject({
      height: expect.any(Number),
      width: expect.any(Number),
    })
  const denseBuildBackgroundBoundingBox = await denseBuildBackgroundHeading.boundingBox()

  expect(denseBuildBackgroundBoundingBox).not.toBeNull()
  expect(denseBuildBackgroundBoundingBox!.width).toBeGreaterThan(90)
  expect(denseBuildBackgroundBoundingBox!.width).toBeGreaterThan(
    denseBuildBackgroundBoundingBox!.height * 2,
  )
})

test('keeps the dense build workspace visible while filtering backgrounds on desktop', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1365, height: 900 })
  await page.goto(denseSharedBuildUrl)

  const backgroundFitPanel = getBackgroundFitPanel(page)
  const backgroundFitPanelBody = backgroundFitPanel.getByTestId('background-fit-panel-content')
  const backgroundFitResultsScroll = backgroundFitPanel.getByTestId('background-fit-panel-body')
  const backgroundSearchInput = backgroundFitPanel.getByLabel('Search backgrounds')

  await backgroundFitPanel.getByRole('button', { name: 'Expand background fit' }).click()
  await backgroundSearchInput.fill(denseSharedBuildSearchBackgroundQuery)

  const denseBuildBackgroundHeading = backgroundFitPanel.getByRole('heading', {
    level: 3,
    name: denseSharedBuildSearchBackgroundName,
  })

  await expect(denseBuildBackgroundHeading).toBeVisible()
  await expect
    .poll(async () =>
      page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight),
    )
    .toBeLessThanOrEqual(1)
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const workspace = document.querySelector('[data-testid="workspace"]') as HTMLElement | null

        return workspace?.getBoundingClientRect().height ?? 0
      }),
    )
    .toBeGreaterThanOrEqual(280)
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const plannerBoard = document.querySelector(
          '[data-testid="planner-board"]',
        ) as HTMLElement | null

        return plannerBoard === null ? 0 : plannerBoard.scrollHeight - plannerBoard.clientHeight
      }),
    )
    .toBeGreaterThan(200)
  await expect
    .poll(async () => backgroundFitPanelBody.evaluate((element) => element.clientHeight))
    .toBeGreaterThanOrEqual(280)
  await expect
    .poll(async () =>
      backgroundFitResultsScroll.evaluate((element) => element.scrollHeight - element.clientHeight),
    )
    .toBeLessThanOrEqual(1)
  await expect
    .poll(async () =>
      page.evaluate((expectedBackgroundName) => {
        const backgroundFitPanelBody = document.querySelector(
          '[data-testid="background-fit-panel-body"]',
        )
        const denseBuildBackgroundHeading = [
          ...document.querySelectorAll('[data-testid="background-fit-card"] h3'),
        ].find((heading) => heading.textContent?.trim() === expectedBackgroundName)

        if (
          !(backgroundFitPanelBody instanceof HTMLElement) ||
          !(denseBuildBackgroundHeading instanceof HTMLElement)
        ) {
          return false
        }

        const backgroundFitPanelBodyBox = backgroundFitPanelBody.getBoundingClientRect()
        const denseBuildBackgroundHeadingBox = denseBuildBackgroundHeading.getBoundingClientRect()

        return (
          denseBuildBackgroundHeadingBox.top >= backgroundFitPanelBodyBox.top &&
          denseBuildBackgroundHeadingBox.bottom <= backgroundFitPanelBodyBox.bottom
        )
      }, denseSharedBuildSearchBackgroundName),
    )
    .toBe(true)
})

test('does not stretch the background search field on tall desktop screens', async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 1300 })
  await page.goto(denseSharedBuildUrl)

  const backgroundFitPanel = getBackgroundFitPanel(page)
  const backgroundFitPanelBody = backgroundFitPanel.getByTestId('background-fit-panel-body')
  const backgroundSearchInput = backgroundFitPanel.getByLabel('Search backgrounds')

  await backgroundFitPanel.getByRole('button', { name: 'Expand background fit' }).click()
  await backgroundSearchInput.fill(denseSharedBuildSearchBackgroundQuery)
  await expect(
    backgroundFitPanel.getByRole('heading', {
      level: 3,
      name: denseSharedBuildSearchBackgroundName,
    }),
  ).toBeVisible()
  await expect
    .poll(async () =>
      backgroundFitPanelBody.evaluate((element) => element.scrollHeight - element.clientHeight),
    )
    .toBeLessThanOrEqual(1)
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const searchField = document.querySelector(
          '[data-testid="background-fit-search-field"]',
        ) as HTMLElement | null

        return searchField?.getBoundingClientRect().height ?? Number.POSITIVE_INFINITY
      }),
    )
    .toBeLessThanOrEqual(60)
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const rankingSummary = document.querySelector(
          '[data-testid="background-fit-ranking-summary"]',
        ) as HTMLElement | null

        if (rankingSummary === null) {
          return 'missing'
        }

        return window.getComputedStyle(rankingSummary).display
      }),
    )
    .toBe('block')
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const backgroundFitStatus = document.querySelector(
          '[data-testid="background-fit-status"]',
        ) as HTMLElement | null
        const firstCard = document.querySelector(
          '[data-testid="background-fit-card"]',
        ) as HTMLElement | null

        if (backgroundFitStatus === null || firstCard === null) {
          return Number.POSITIVE_INFINITY
        }

        return (
          firstCard.getBoundingClientRect().top - backgroundFitStatus.getBoundingClientRect().bottom
        )
      }),
    )
    .toBeLessThanOrEqual(24)
})
