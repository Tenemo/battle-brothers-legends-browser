import { expect, test, type Page } from '@playwright/test'
import {
  addPerkToBuildFromResults,
  expectNoDocumentHorizontalOverflow,
  expectNoWorkspaceHorizontalClip,
  expectViewportLocked,
  getBackgroundFitPanel,
  getBuildIndividualGroupsList,
  getBuildPerksBar,
  getBuildSharedGroupsList,
  gotoBuildPlanner,
  searchPerks,
} from './support/build-planner-page'

const denseDesktopBuildUrl =
  '/?build=Axe+Mastery,Mace+Mastery,Sword+Mastery,Recover,Berserk,Nimble,Dodge,Underdog,Battle+Flow,Killing+Frenzy,Rotation,Colossus'

type DenseDesktopViewportExpectation = {
  isBackgroundFitExpandedByDefault: boolean
  maximumBackgroundFitPanelWidth: number
  maximumDetailPanelBodyGap: number
  maximumDetailPanelBodyPaddingTop: number
  maximumDetailParagraphMarginTop: number
  maximumPerkPlacementIconWidth: number
  maximumPerkRowIconWidth: number
  maximumPerkRowPaddingBlock: number
  maximumPlannerHeight: number
  maximumResultsListGap: number
  minimumCategorySidebarWidth: number
  minimumPlannerBoardOverflow: number
  minimumResultsListHeight: number
  minimumWorkspaceHeight: number
  viewportSize: { height: number; width: number }
}

const compactDesktopDensityExpectation = {
  maximumDetailPanelBodyGap: 8,
  maximumDetailPanelBodyPaddingTop: 8,
  maximumDetailParagraphMarginTop: 4.5,
  maximumPerkPlacementIconWidth: 22,
  maximumPerkRowIconWidth: 38,
  maximumPerkRowPaddingBlock: 36,
  maximumResultsListGap: 6,
}

const denseDesktopViewportExpectations: DenseDesktopViewportExpectation[] = [
  {
    ...compactDesktopDensityExpectation,
    isBackgroundFitExpandedByDefault: true,
    maximumBackgroundFitPanelWidth: 430,
    maximumPlannerHeight: 280,
    minimumCategorySidebarWidth: 340,
    minimumPlannerBoardOverflow: 0,
    minimumResultsListHeight: 600,
    minimumWorkspaceHeight: 720,
    viewportSize: { height: 1080, width: 1920 },
  },
  {
    ...compactDesktopDensityExpectation,
    isBackgroundFitExpandedByDefault: true,
    maximumBackgroundFitPanelWidth: 430,
    maximumPlannerHeight: 300,
    minimumCategorySidebarWidth: 250,
    minimumPlannerBoardOverflow: 40,
    minimumResultsListHeight: 380,
    minimumWorkspaceHeight: 520,
    viewportSize: { height: 900, width: 1440 },
  },
  {
    ...compactDesktopDensityExpectation,
    isBackgroundFitExpandedByDefault: false,
    maximumBackgroundFitPanelWidth: 40,
    maximumPlannerHeight: 250,
    minimumCategorySidebarWidth: 230,
    minimumPlannerBoardOverflow: 80,
    minimumResultsListHeight: 320,
    minimumWorkspaceHeight: 430,
    viewportSize: { height: 768, width: 1366 },
  },
  {
    ...compactDesktopDensityExpectation,
    isBackgroundFitExpandedByDefault: false,
    maximumBackgroundFitPanelWidth: 40,
    maximumPlannerHeight: 235,
    minimumCategorySidebarWidth: 230,
    minimumPlannerBoardOverflow: 100,
    minimumResultsListHeight: 300,
    minimumWorkspaceHeight: 400,
    viewportSize: { height: 720, width: 1280 },
  },
]

const desktopScrollbarTargets = [
  '[data-testid="background-fit-panel-body"]',
  '[data-testid="category-sidebar-body"]',
  '[data-testid="results-list"]',
  '[data-testid="detail-panel-body"]',
  '[data-testid="planner-board"]',
]

async function readDenseDesktopLayoutMetrics(page: Page) {
  return page.evaluate(() => {
    function parsePixelValue(value: string) {
      const parsedValue = Number.parseFloat(value)

      return Number.isFinite(parsedValue) ? parsedValue : Number.POSITIVE_INFINITY
    }

    const planner = document.querySelector('[aria-label="Build planner"]') as HTMLElement | null
    const plannerBoard = document.querySelector(
      '[data-testid="planner-board"]',
    ) as HTMLElement | null
    const backgroundFitPanel = document.querySelector(
      '[data-testid="background-fit-panel"]',
    ) as HTMLElement | null
    const categorySidebar = document.querySelector(
      '[data-testid="category-sidebar"]',
    ) as HTMLElement | null
    const detailPanel = document.querySelector(
      '[data-testid="detail-panel"]',
    ) as HTMLElement | null
    const detailPanelBody = document.querySelector(
      '[data-testid="detail-panel-body"]',
    ) as HTMLElement | null
    const detailParagraph = document.querySelector(
      '[data-testid="detail-section"] p',
    ) as HTMLElement | null
    const firstPerkPlacementIcon = document.querySelector(
      '[data-testid="perk-placement-icon"]',
    ) as HTMLElement | null
    const firstPerkRow = document.querySelector('[data-testid="perk-row"]') as HTMLElement | null
    const firstPerkRowIcon = document.querySelector(
      '[data-testid="perk-row-icon"]',
    ) as HTMLElement | null
    const resultsList = document.querySelector('[data-testid="results-list"]') as HTMLElement | null
    const resultsPanel = document.querySelector(
      '[data-testid="results-panel"]',
    ) as HTMLElement | null
    const workspace = document.querySelector('[data-testid="workspace"]') as HTMLElement | null
    const detailPanelBodyStyle =
      detailPanelBody === null ? null : window.getComputedStyle(detailPanelBody)
    const detailParagraphStyle =
      detailParagraph === null ? null : window.getComputedStyle(detailParagraph)
    const firstPerkRowStyle = firstPerkRow === null ? null : window.getComputedStyle(firstPerkRow)
    const resultsListStyle = resultsList === null ? null : window.getComputedStyle(resultsList)

    return {
      backgroundFitPanelLeft:
        backgroundFitPanel?.getBoundingClientRect().left ?? Number.POSITIVE_INFINITY,
      backgroundFitPanelWidth: backgroundFitPanel?.getBoundingClientRect().width ?? 0,
      categorySidebarLeft:
        categorySidebar?.getBoundingClientRect().left ?? Number.POSITIVE_INFINITY,
      categorySidebarWidth: categorySidebar?.getBoundingClientRect().width ?? 0,
      detailPanelLeft: detailPanel?.getBoundingClientRect().left ?? Number.POSITIVE_INFINITY,
      detailPanelWidth: detailPanel?.getBoundingClientRect().width ?? 0,
      detailPanelBodyGap:
        detailPanelBodyStyle === null
          ? Number.POSITIVE_INFINITY
          : parsePixelValue(detailPanelBodyStyle.rowGap),
      detailPanelBodyPaddingTop:
        detailPanelBodyStyle === null
          ? Number.POSITIVE_INFINITY
          : parsePixelValue(detailPanelBodyStyle.paddingTop),
      detailParagraphMarginTop:
        detailParagraphStyle === null
          ? Number.POSITIVE_INFINITY
          : parsePixelValue(detailParagraphStyle.marginTop),
      perkPlacementIconWidth: firstPerkPlacementIcon?.getBoundingClientRect().width ?? 0,
      perkRowIconWidth: firstPerkRowIcon?.getBoundingClientRect().width ?? 0,
      perkRowPaddingBlock:
        firstPerkRowStyle === null
          ? Number.POSITIVE_INFINITY
          : parsePixelValue(firstPerkRowStyle.paddingTop) +
            parsePixelValue(firstPerkRowStyle.paddingBottom),
      plannerBoardOverflow:
        plannerBoard === null
          ? Number.POSITIVE_INFINITY
          : plannerBoard.scrollHeight - plannerBoard.clientHeight,
      plannerHeight: planner?.getBoundingClientRect().height ?? Number.POSITIVE_INFINITY,
      resultsPanelLeft: resultsPanel?.getBoundingClientRect().left ?? Number.POSITIVE_INFINITY,
      resultsPanelWidth: resultsPanel?.getBoundingClientRect().width ?? 0,
      resultsListHeight: resultsList?.clientHeight ?? 0,
      resultsListGap:
        resultsListStyle === null
          ? Number.POSITIVE_INFINITY
          : parsePixelValue(resultsListStyle.rowGap),
      workspaceHeight: workspace?.clientHeight ?? 0,
    }
  })
}

async function readRailControlMetrics(page: Page) {
  return page.evaluate(() => {
    function readInheritedLengthInPixels(element: HTMLElement, customPropertyName: string) {
      const probe = document.createElement('div')
      probe.style.position = 'fixed'
      probe.style.visibility = 'hidden'
      probe.style.pointerEvents = 'none'
      probe.style.width = `var(${customPropertyName})`
      probe.style.height = '0'
      element.append(probe)

      const lengthInPixels = probe.getBoundingClientRect().width
      probe.remove()

      return lengthInPixels
    }

    function readButtonMetric(accessibleNameText: string) {
      const button = Array.from(document.querySelectorAll('button')).find((candidateButton) =>
        candidateButton.getAttribute('aria-label')?.includes(accessibleNameText),
      )

      if (!(button instanceof HTMLButtonElement)) {
        throw new Error(`Missing rail button containing "${accessibleNameText}".`)
      }

      const chevron = button.querySelector('svg')

      if (!(chevron instanceof SVGElement)) {
        throw new Error(`Missing rail chevron for "${accessibleNameText}".`)
      }

      const buttonBounds = button.getBoundingClientRect()
      const chevronBounds = chevron.getBoundingClientRect()

      return {
        buttonHeight: buttonBounds.height,
        buttonWidth: buttonBounds.width,
        chevronStrokeWidth: Number(chevron.getAttribute('stroke-width')),
        chevronWidth: chevronBounds.width,
        originalDesktopRailThickness: readInheritedLengthInPixels(button, '--control-height-lg'),
        originalMobileRailHeight: readInheritedLengthInPixels(button, '--primitive-length-3-25rem'),
      }
    }

    return {
      backgroundFit: readButtonMetric('background fit'),
      categoryFilters: readButtonMetric('category filters'),
    }
  })
}

async function readBelowDesktopSectionTops(page: Page) {
  return page.evaluate(() => {
    function getElementTop(selector: string) {
      const element = document.querySelector(selector)

      if (!(element instanceof HTMLElement)) {
        throw new Error(`Missing section for selector ${selector}.`)
      }

      return element.getBoundingClientRect().top
    }

    return {
      backgroundFit: getElementTop('[data-testid="background-fit-panel"]'),
      buildPlanner: getElementTop('[aria-label="Build planner"]'),
      filters: getElementTop('[data-testid="category-sidebar"]'),
      details: getElementTop('[data-testid="detail-panel"]'),
      results: getElementTop('[data-testid="results-panel"]'),
    }
  })
}

async function readMobileTouchTargetMetrics(page: Page) {
  return page.evaluate(() => {
    const targetSelectors = [
      {
        name: 'repository link',
        selector: 'a[aria-label="Open the build planner repository on GitHub"]',
      },
      { name: 'perk filter', selector: '[data-testid="perk-filter-button"]' },
      {
        name: 'result build toggle',
        selector: 'button[aria-label="Add Blacksmiths Technique to build from results"]',
      },
      {
        name: 'planner section toggle',
        selector: '[data-testid="planner-section-toggle"]',
      },
      { name: 'category filter', selector: 'button[aria-label="Enable category Weapon"]' },
      { name: 'category filters rail', selector: 'button[aria-label="Collapse category filters"]' },
      { name: 'background fit rail', selector: 'button[aria-label="Collapse background fit"]' },
    ]

    return targetSelectors.map(({ name, selector }) => {
      const element = document.querySelector(selector)

      if (!(element instanceof HTMLElement)) {
        throw new Error(`Missing touch target "${name}" for selector ${selector}.`)
      }

      const rectangle = element.getBoundingClientRect()

      return {
        height: rectangle.height,
        name,
        width: rectangle.width,
      }
    })
  })
}

test('keeps the shell pinned to the viewport with always-visible planner rows', async ({
  page,
}) => {
  await gotoBuildPlanner(page, { height: 768, width: 1366 })
  await page.getByRole('button', { name: 'Show all categories' }).click()
  await expectViewportLocked(page)
  const buildPlanner = page.getByLabel('Build planner')

  await expect(page.getByText('No perks picked yet.')).toBeVisible()
  await expect(getBuildPerksBar(page).getByText('Pick a perk to start')).toBeVisible()
  await expect(
    getBuildSharedGroupsList(page).getByText(
      'Perk groups covering 2 or more picked perks will appear here',
    ),
  ).toBeVisible()
  await expect(
    getBuildIndividualGroupsList(page).getByText('Individual perk groups will appear here'),
  ).toBeVisible()
  await expect(buildPlanner.getByText('Perks', { exact: true })).toBeVisible()
  await expect(buildPlanner.getByText('Perk groups for 2+ perks', { exact: true })).toBeVisible()
  await expect(
    buildPlanner.getByText('Perk groups for individual perks', { exact: true }),
  ).toBeVisible()
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const plannerBoard = document.querySelector(
          '[data-testid="planner-board"]',
        ) as HTMLElement | null

        return plannerBoard === null
          ? Number.POSITIVE_INFINITY
          : plannerBoard.scrollHeight - plannerBoard.clientHeight
      }),
    )
    .toBeLessThanOrEqual(1)
})

test('uses normal page scrolling on tablet widths instead of cramped viewport rows', async ({
  page,
}) => {
  await gotoBuildPlanner(page, { height: 720, width: 900 })
  await expectNoDocumentHorizontalOverflow(page)

  await expect
    .poll(async () =>
      page.evaluate(() => ({
        documentOverflow: window.getComputedStyle(document.documentElement).overflowY,
        documentScrollHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight,
      })),
    )
    .toMatchObject({
      documentOverflow: 'auto',
    })

  const scrollableDocumentHeight = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  )
  expect(scrollableDocumentHeight).toBeGreaterThan(200)
})

test('keeps the below-desktop section order consistent across the mobile boundary', async ({
  page,
}) => {
  for (const viewportSize of [
    { height: 740, width: 760 },
    { height: 740, width: 761 },
    { height: 720, width: 900 },
    { height: 720, width: 1279 },
  ]) {
    await gotoBuildPlanner(page, viewportSize)
    await expectNoDocumentHorizontalOverflow(page)

    const sectionTops = await readBelowDesktopSectionTops(page)

    expect(sectionTops.buildPlanner).toBeLessThan(sectionTops.results)
    expect(sectionTops.results).toBeLessThan(sectionTops.details)
    expect(sectionTops.details).toBeLessThan(sectionTops.filters)
    expect(sectionTops.filters).toBeLessThan(sectionTops.backgroundFit)
  }
})

test('keeps dense picked builds compact across desktop viewport sizes', async ({ page }) => {
  for (const expectation of denseDesktopViewportExpectations) {
    await page.setViewportSize(expectation.viewportSize)
    await page.goto(denseDesktopBuildUrl)

    await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()
    await expect(page.getByLabel('Search perks')).toBeVisible()
    await getBuildPerksBar(page)
      .getByRole('button', { name: 'View Axe Mastery from build planner' })
      .click()
    await expect(page.getByRole('heading', { level: 2, name: 'Axe Mastery' })).toBeVisible()
    await expectViewportLocked(page)
    await expectNoDocumentHorizontalOverflow(page)
    await expectNoWorkspaceHorizontalClip(page)

    await expect(
      getBackgroundFitPanel(page).getByRole('button', {
        name: `${expectation.isBackgroundFitExpandedByDefault ? 'Collapse' : 'Expand'} background fit`,
      }),
    ).toHaveAttribute('aria-expanded', String(expectation.isBackgroundFitExpandedByDefault))

    const desktopMetrics = await readDenseDesktopLayoutMetrics(page)

    expect(desktopMetrics.backgroundFitPanelLeft).toBeLessThan(desktopMetrics.detailPanelLeft)
    expect(desktopMetrics.detailPanelLeft).toBeLessThan(desktopMetrics.resultsPanelLeft)
    expect(desktopMetrics.resultsPanelLeft).toBeLessThan(desktopMetrics.categorySidebarLeft)
    expect(desktopMetrics.resultsPanelWidth).toBeLessThanOrEqual(
      desktopMetrics.detailPanelWidth * 0.72,
    )
    expect(desktopMetrics.backgroundFitPanelWidth).toBeLessThanOrEqual(
      expectation.maximumBackgroundFitPanelWidth,
    )
    expect(desktopMetrics.categorySidebarWidth).toBeGreaterThanOrEqual(
      expectation.minimumCategorySidebarWidth,
    )
    expect(desktopMetrics.resultsListGap).toBeLessThanOrEqual(expectation.maximumResultsListGap)
    expect(desktopMetrics.perkRowPaddingBlock).toBeLessThanOrEqual(
      expectation.maximumPerkRowPaddingBlock,
    )
    expect(desktopMetrics.perkRowIconWidth).toBeLessThanOrEqual(expectation.maximumPerkRowIconWidth)
    expect(desktopMetrics.perkPlacementIconWidth).toBeLessThanOrEqual(
      expectation.maximumPerkPlacementIconWidth,
    )
    expect(desktopMetrics.detailPanelBodyGap).toBeLessThanOrEqual(
      expectation.maximumDetailPanelBodyGap,
    )
    expect(desktopMetrics.detailPanelBodyPaddingTop).toBeLessThanOrEqual(
      expectation.maximumDetailPanelBodyPaddingTop,
    )
    expect(desktopMetrics.detailParagraphMarginTop).toBeLessThanOrEqual(
      expectation.maximumDetailParagraphMarginTop,
    )
    expect(desktopMetrics.plannerHeight).toBeLessThanOrEqual(expectation.maximumPlannerHeight)
    expect(desktopMetrics.plannerBoardOverflow).toBeGreaterThanOrEqual(
      expectation.minimumPlannerBoardOverflow,
    )
    expect(desktopMetrics.resultsListHeight).toBeGreaterThanOrEqual(
      expectation.minimumResultsListHeight,
    )
    expect(desktopMetrics.workspaceHeight).toBeGreaterThanOrEqual(
      expectation.minimumWorkspaceHeight,
    )
  }
})

test('keeps desktop side rails thin and mobile rails touchable', async ({ page }) => {
  await gotoBuildPlanner(page, { height: 768, width: 1366 })
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()

  const desktopRailMetrics = await readRailControlMetrics(page)

  expect(desktopRailMetrics.backgroundFit.buttonWidth).toBeLessThanOrEqual(
    desktopRailMetrics.backgroundFit.originalDesktopRailThickness * 0.72,
  )
  expect(desktopRailMetrics.categoryFilters.buttonWidth).toBeLessThanOrEqual(
    desktopRailMetrics.categoryFilters.originalDesktopRailThickness * 0.72,
  )
  expect(desktopRailMetrics.backgroundFit.chevronWidth).toBeGreaterThanOrEqual(16)
  expect(desktopRailMetrics.categoryFilters.chevronWidth).toBeGreaterThanOrEqual(16)
  expect(desktopRailMetrics.backgroundFit.chevronStrokeWidth).toBeGreaterThanOrEqual(2.5)
  expect(desktopRailMetrics.categoryFilters.chevronStrokeWidth).toBeGreaterThanOrEqual(2.5)

  await gotoBuildPlanner(page, { height: 844, width: 390 })

  const mobileRailMetrics = await readRailControlMetrics(page)

  expect(mobileRailMetrics.backgroundFit.buttonHeight).toBeGreaterThanOrEqual(40)
  expect(mobileRailMetrics.categoryFilters.buttonHeight).toBeGreaterThanOrEqual(40)
  expect(mobileRailMetrics.backgroundFit.buttonHeight).toBeLessThanOrEqual(48)
  expect(mobileRailMetrics.categoryFilters.buttonHeight).toBeLessThanOrEqual(48)
  expect(mobileRailMetrics.backgroundFit.chevronWidth).toBeGreaterThanOrEqual(16)
  expect(mobileRailMetrics.categoryFilters.chevronWidth).toBeGreaterThanOrEqual(16)
  expect(mobileRailMetrics.backgroundFit.chevronStrokeWidth).toBeGreaterThanOrEqual(2.5)
  expect(mobileRailMetrics.categoryFilters.chevronStrokeWidth).toBeGreaterThanOrEqual(2.5)
})

test('uses one app scrollbar style across desktop viewport sizes', async ({ page }) => {
  const scrollbarMeasurements = []

  for (const viewportSize of [
    { height: 1080, width: 1920 },
    { height: 1440, width: 2560 },
  ]) {
    await page.setViewportSize(viewportSize)
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()

    scrollbarMeasurements.push(
      await page.evaluate((selectors) => {
        const supportsWebKitScrollbars = CSS.supports('selector(::-webkit-scrollbar)')

        return selectors.map((selector) => {
          const element = document.querySelector(selector)

          if (!(element instanceof HTMLElement)) {
            return null
          }

          const computedStyle = window.getComputedStyle(element)
          const scrollbarStyle = window.getComputedStyle(element, '::-webkit-scrollbar')
          const thumbStyle = window.getComputedStyle(element, '::-webkit-scrollbar-thumb')

          return {
            hasScrollContainerAttribute: element.dataset.scrollContainer === 'true',
            standardScrollbarColor: computedStyle.scrollbarColor,
            scrollbarGutter: computedStyle.scrollbarGutter,
            scrollbarWidth: supportsWebKitScrollbars
              ? scrollbarStyle.width
              : computedStyle.scrollbarWidth,
            selector,
            supportsWebKitScrollbars,
            thumbBackground: supportsWebKitScrollbars
              ? thumbStyle.backgroundColor
              : computedStyle.scrollbarColor,
          }
        })
      }, desktopScrollbarTargets),
    )
  }

  const [standardDesktopMeasurements, largeDesktopMeasurements] = scrollbarMeasurements

  expect(standardDesktopMeasurements).toEqual(largeDesktopMeasurements)
  for (const scrollbarMeasurement of standardDesktopMeasurements) {
    expect(scrollbarMeasurement).not.toBeNull()
    expect(scrollbarMeasurement!.hasScrollContainerAttribute).toBe(true)
    expect(scrollbarMeasurement!.scrollbarGutter).toBe('auto')
    expect(scrollbarMeasurement!.scrollbarWidth).not.toBe('auto')
    expect(scrollbarMeasurement!.thumbBackground).not.toBe('rgba(0, 0, 0, 0)')
    if (scrollbarMeasurement!.supportsWebKitScrollbars) {
      expect(scrollbarMeasurement!.standardScrollbarColor).toBe('auto')
    } else {
      expect(scrollbarMeasurement!.standardScrollbarColor).not.toBe('auto')
    }
  }
})

test('uses normal page scrolling on mobile while keeping core controls usable', async ({
  page,
}) => {
  await gotoBuildPlanner(page, { height: 740, width: 360 })
  await expectNoDocumentHorizontalOverflow(page)

  await expect
    .poll(async () =>
      page.evaluate(() => ({
        documentOverflow: window.getComputedStyle(document.documentElement).overflowY,
        documentScrollHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight,
      })),
    )
    .toMatchObject({
      documentOverflow: 'auto',
    })

  const scrollableDocumentHeight = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  )
  expect(scrollableDocumentHeight).toBeGreaterThan(600)

  const mobileSectionTops = await page.evaluate(() => {
    function getElementTop(selector: string) {
      const element = document.querySelector(selector)

      if (!(element instanceof HTMLElement)) {
        throw new Error(`Missing mobile section for selector ${selector}.`)
      }

      return element.getBoundingClientRect().top
    }

    return {
      backgroundFit: getElementTop('[data-testid="background-fit-panel"]'),
      buildPlanner: getElementTop('[aria-label="Build planner"]'),
      filters: getElementTop('[data-testid="category-sidebar"]'),
      details: getElementTop('[data-testid="detail-panel"]'),
      results: getElementTop('[data-testid="results-panel"]'),
    }
  })

  expect(mobileSectionTops.buildPlanner).toBeLessThan(mobileSectionTops.results)
  expect(mobileSectionTops.results).toBeLessThan(mobileSectionTops.details)
  expect(mobileSectionTops.details).toBeLessThan(mobileSectionTops.filters)
  expect(mobileSectionTops.filters).toBeLessThan(mobileSectionTops.backgroundFit)
  expect(mobileSectionTops.buildPlanner).toBeLessThan(300)

  await page.evaluate(() => window.scrollTo(0, 640))
  await expect.poll(async () => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)

  await page.getByLabel('Search perks').fill('student')
  await expect(page.getByRole('button', { name: 'Inspect Student' })).toBeVisible()
  await page.getByRole('button', { name: 'Add Student to build from results' }).click()
  await expect(
    getBuildPerksBar(page).getByRole('button', {
      name: 'View Student from build planner',
    }),
  ).toBeVisible()
})

test('limits unfiltered phone results without restoring the nested scroll trap', async ({
  page,
}) => {
  await gotoBuildPlanner(page, { height: 844, width: 390 })
  await page.getByRole('button', { name: 'Show all categories' }).click()
  await expectNoDocumentHorizontalOverflow(page)

  await expect(page.getByRole('button', { name: 'Show 12 more perks' })).toBeVisible()

  const initialPhoneResultsMetrics = await page.evaluate(() => {
    const resultsList = document.querySelector('[data-testid="results-list"]') as HTMLElement | null
    const showMoreButton = document.querySelector(
      '[data-testid="show-more-results-button"]',
    ) as HTMLElement | null

    if (resultsList === null || showMoreButton === null) {
      throw new Error('Missing phone result limiter target.')
    }

    return {
      documentScrollHeight: document.documentElement.scrollHeight,
      resultsListOverflowY: window.getComputedStyle(resultsList).overflowY,
      resultRowCount: resultsList.querySelectorAll('[data-testid="perk-row"]').length,
      showMoreButtonHeight: showMoreButton.getBoundingClientRect().height,
    }
  })

  expect(initialPhoneResultsMetrics.resultRowCount).toBe(12)
  expect(initialPhoneResultsMetrics.resultsListOverflowY).toBe('visible')
  expect(initialPhoneResultsMetrics.documentScrollHeight).toBeLessThan(10000)
  expect(initialPhoneResultsMetrics.showMoreButtonHeight).toBeGreaterThanOrEqual(40)

  await page.getByRole('button', { name: 'Show 12 more perks' }).click()
  await expect
    .poll(async () =>
      page
        .getByTestId('results-list')
        .getByTestId('perk-row')
        .evaluateAll((rows) => rows.length),
    )
    .toBe(24)

  await page.getByLabel('Search perks').fill('Student')
  await expect(page.getByRole('button', { name: 'Inspect Student' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Show 12 more perks' })).toHaveCount(0)
  await expect(page.getByTestId('results-list').getByTestId('perk-row')).toHaveCount(1)

  await gotoBuildPlanner(page, { height: 740, width: 761 })
  await page.getByRole('button', { name: 'Show all categories' }).click()
  await expect(page.getByRole('button', { name: 'Show 12 more perks' })).toHaveCount(0)
  await expect
    .poll(async () =>
      page
        .getByTestId('results-list')
        .getByTestId('perk-row')
        .evaluateAll((rows) => rows.length),
    )
    .toBeGreaterThan(12)
})

test('keeps dense mobile builds compact without pushing search multiple screens down', async ({
  page,
}) => {
  for (const expectation of [
    {
      maximumSearchTop: 760,
      minimumPlannerBoardOverflow: 80,
      viewportSize: { height: 844, width: 390 },
    },
    {
      maximumSearchTop: 700,
      minimumPlannerBoardOverflow: 80,
      viewportSize: { height: 568, width: 320 },
    },
  ]) {
    await page.setViewportSize(expectation.viewportSize)
    await page.goto(denseDesktopBuildUrl)
    await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()
    await expectNoDocumentHorizontalOverflow(page)
    await expect(page.getByText('12 perks picked.')).toBeVisible()

    const denseMobileMetrics = await page.evaluate(() => {
      const planner = document.querySelector('[aria-label="Build planner"]') as HTMLElement | null
      const plannerBoard = document.querySelector(
        '[data-testid="planner-board"]',
      ) as HTMLElement | null
      const searchInput = document.querySelector(
        '[aria-label="Search perks"]',
      ) as HTMLElement | null
      const saveButton = document.querySelector(
        'button[aria-label="Save / Load build"]',
      ) as HTMLElement | null

      if (
        planner === null ||
        plannerBoard === null ||
        searchInput === null ||
        saveButton === null
      ) {
        throw new Error('Missing dense mobile layout metric target.')
      }

      return {
        plannerBoardOverflow: plannerBoard.scrollHeight - plannerBoard.clientHeight,
        plannerBoardOverflowY: window.getComputedStyle(plannerBoard).overflowY,
        plannerHeight: planner.getBoundingClientRect().height,
        saveButtonHeight: saveButton.getBoundingClientRect().height,
        searchTop: searchInput.getBoundingClientRect().top,
      }
    })

    expect(denseMobileMetrics.plannerBoardOverflow).toBeGreaterThanOrEqual(
      expectation.minimumPlannerBoardOverflow,
    )
    expect(denseMobileMetrics.plannerBoardOverflowY).toBe('auto')
    expect(denseMobileMetrics.searchTop).toBeLessThanOrEqual(expectation.maximumSearchTop)
    expect(denseMobileMetrics.saveButtonHeight).toBeGreaterThanOrEqual(40)
    expect(denseMobileMetrics.plannerHeight).toBeLessThanOrEqual(
      expectation.viewportSize.height * 0.9,
    )
  }
})

test('lets the mobile document scroll when the pointer is over results', async ({ page }) => {
  await gotoBuildPlanner(page, { height: 844, width: 390 })
  await expectNoDocumentHorizontalOverflow(page)

  const wheelTarget = await page.evaluate(() => {
    const resultsList = document.querySelector('[data-testid="results-list"]') as HTMLElement | null

    if (resultsList === null) {
      throw new Error('Missing results list.')
    }

    const rectangle = resultsList.getBoundingClientRect()

    return {
      x: rectangle.left + rectangle.width / 2,
      y: Math.min(rectangle.top + 60, window.innerHeight - 24),
    }
  })

  await page.mouse.move(wheelTarget.x, wheelTarget.y)
  await page.mouse.wheel(0, 900)

  await expect.poll(async () => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const resultsList = document.querySelector(
          '[data-testid="results-list"]',
        ) as HTMLElement | null

        if (resultsList === null) {
          throw new Error('Missing results list.')
        }

        return resultsList.scrollTop
      }),
    )
    .toBe(0)
})

test('keeps key mobile touch targets large enough', async ({ page }) => {
  await gotoBuildPlanner(page, { height: 844, width: 390 })
  await searchPerks(page, 'Blacksmiths Technique')

  const touchTargetMetrics = await readMobileTouchTargetMetrics(page)

  for (const touchTargetMetric of touchTargetMetrics) {
    expect(touchTargetMetric.width, `${touchTargetMetric.name} width`).toBeGreaterThanOrEqual(40)
    expect(touchTargetMetric.height, `${touchTargetMetric.name} height`).toBeGreaterThanOrEqual(40)
  }
})

test('keeps mobile background fit cards compact while preserving tap targets', async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 })
  await page.goto(denseDesktopBuildUrl)
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()
  await expectNoDocumentHorizontalOverflow(page)
  await expect(page.getByTestId('background-fit-card').nth(4)).toBeAttached()

  const backgroundFitCardMetrics = await page.evaluate(() => {
    const cards = [...document.querySelectorAll<HTMLElement>('[data-testid="background-fit-card"]')]
      .slice(0, 5)
      .map((card) => {
        const header = card.querySelector<HTMLElement>('[class*="backgroundFitCardHeaderMain"]')
        const inspectButton = card.querySelector<HTMLElement>('button')
        const cardRectangle = card.getBoundingClientRect()
        const inspectButtonRectangle = inspectButton?.getBoundingClientRect()

        return {
          inspectButtonHeight: inspectButtonRectangle?.height ?? 0,
          inspectButtonWidth: inspectButtonRectangle?.width ?? 0,
          headerDirection: header === null ? '' : window.getComputedStyle(header).flexDirection,
          height: cardRectangle.height,
        }
      })

    const backgroundFitResults = document.querySelector(
      '[data-testid="background-fit-panel-body"]',
    ) as HTMLElement | null

    return {
      cards,
      scrollHeight: backgroundFitResults?.scrollHeight ?? Number.POSITIVE_INFINITY,
    }
  })

  expect(backgroundFitCardMetrics.cards).toHaveLength(5)
  expect(backgroundFitCardMetrics.scrollHeight).toBeLessThan(20000)

  for (const cardMetric of backgroundFitCardMetrics.cards) {
    expect(cardMetric.height).toBeLessThanOrEqual(130)
    expect(cardMetric.headerDirection).toBe('row')
    expect(cardMetric.inspectButtonHeight).toBeGreaterThanOrEqual(40)
    expect(cardMetric.inspectButtonWidth).toBeGreaterThanOrEqual(40)
  }
})

test('keeps collapsed background fit content out of the keyboard order', async ({ page }) => {
  await gotoBuildPlanner(page, { height: 844, width: 390 })
  await searchPerks(page, 'Axe Mastery')
  await addPerkToBuildFromResults(page, 'Axe Mastery')
  await page.getByRole('button', { name: 'Collapse background fit' }).click()

  const hiddenFocusHits: string[] = []

  for (let tabIndex = 0; tabIndex < 70; tabIndex += 1) {
    await page.keyboard.press('Tab')
    const activeElementHiddenAncestor = await page.evaluate(() => {
      const activeElement = document.activeElement

      if (!(activeElement instanceof HTMLElement)) {
        return null
      }

      return (
        activeElement.closest('[hidden]')?.getAttribute('class') ??
        activeElement.closest('[aria-hidden="true"]')?.getAttribute('class') ??
        null
      )
    })

    if (activeElementHiddenAncestor !== null) {
      hiddenFocusHits.push(activeElementHiddenAncestor)
    }
  }

  expect(hiddenFocusHits).toEqual([])
})

test('keeps desktop rail bodies mounted and anchored for open and close animation', async ({
  page,
}) => {
  await gotoBuildPlanner(page, { height: 900, width: 1440 })
  await searchPerks(page, 'Axe Mastery')
  await addPerkToBuildFromResults(page, 'Axe Mastery')

  const backgroundFitPanel = getBackgroundFitPanel(page)
  const backgroundFitRailButton = backgroundFitPanel.getByRole('button', {
    name: 'Collapse background fit',
  })
  const backgroundFitPanelBody = backgroundFitPanel.getByTestId('background-fit-panel-content')
  const categorySidebar = page.getByTestId('category-sidebar')
  const categorySidebarBody = page.getByTestId('category-sidebar-body')
  const categorySidebarRailButton = page.getByRole('button', {
    name: 'Collapse category filters',
  })

  await expect
    .poll(async () =>
      categorySidebar.evaluate((element) => {
        const sidebarBox = element.getBoundingClientRect()
        const bodyBox = element
          .querySelector('[data-testid="category-sidebar-body"]')
          ?.getBoundingClientRect()
        const buttonBox = element
          .querySelector('button[aria-label="Collapse category filters"]')
          ?.getBoundingClientRect()

        if (!bodyBox || !buttonBox) {
          return false
        }

        return (
          Math.abs(buttonBox.right - sidebarBox.right) <= 1 && bodyBox.right <= buttonBox.left + 1
        )
      }),
    )
    .toBe(true)
  await expect
    .poll(async () =>
      backgroundFitPanel.evaluate((element) => {
        const bodyBox = element
          .querySelector('[data-testid="background-fit-panel-content"]')
          ?.getBoundingClientRect()
        const buttonBox = element
          .querySelector('button[aria-label="Collapse background fit"]')
          ?.getBoundingClientRect()

        return bodyBox && buttonBox ? bodyBox.right <= buttonBox.left + 1 : false
      }),
    )
    .toBe(true)

  await categorySidebarRailButton.click()
  await backgroundFitRailButton.click()

  await expect(categorySidebarBody).toHaveAttribute('aria-hidden', 'true')
  await expect(categorySidebarBody).toHaveAttribute('inert', '')
  await expect(categorySidebarBody).not.toHaveAttribute('hidden')
  await expect(backgroundFitPanelBody).toHaveAttribute('aria-hidden', 'true')
  await expect(backgroundFitPanelBody).toHaveAttribute('inert', '')
  await expect(backgroundFitPanelBody).not.toHaveAttribute('hidden')
})
