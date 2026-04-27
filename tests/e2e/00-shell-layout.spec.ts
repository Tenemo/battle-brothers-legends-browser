import { expect, test } from '@playwright/test'
import {
  addPerkToBuildFromResults,
  expectNoDocumentHorizontalOverflow,
  expectNoWorkspaceHorizontalClip,
  expectViewportLocked,
  getBackgroundFitPanel,
  getBuildIndividualGroupsList,
  getBuildPerksBar,
  getBuildSharedGroupsList,
  gotoPerksBrowser,
  searchPerks,
} from './support/perks-browser'

const denseSmallDesktopBuildUrl =
  '/?build=Axe+Mastery,Mace+Mastery,Sword+Mastery,Recover,Berserk,Nimble,Dodge,Underdog,Battle+Flow,Killing+Frenzy,Rotation,Colossus'

const desktopScrollbarTargets = [
  '[data-testid="background-fit-panel-body"]',
  '[data-testid="category-sidebar"]',
  '[data-testid="results-list"]',
  '[data-testid="perk-detail-panel-body"]',
  '[data-testid="planner-board"]',
]

test('keeps the shell pinned to the viewport with always-visible planner rows', async ({
  page,
}) => {
  await gotoPerksBrowser(page, { height: 768, width: 1366 })
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
        const plannerBoard = document.querySelector('[data-testid="planner-board"]') as HTMLElement | null

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
  await gotoPerksBrowser(page, { height: 720, width: 900 })
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

test('keeps dense picked builds usable on small desktop viewports', async ({ page }) => {
  await page.setViewportSize({ height: 720, width: 1280 })
  await page.goto(denseSmallDesktopBuildUrl)

  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()
  await expect(page.getByLabel('Search perks')).toBeVisible()
  await expect(
    getBackgroundFitPanel(page).getByRole('button', { name: 'Expand background fit' }),
  ).toHaveAttribute('aria-expanded', 'false')
  await expectNoWorkspaceHorizontalClip(page)

  const smallDesktopMetrics = await page.evaluate(() => {
    const plannerBoard = document.querySelector('[data-testid="planner-board"]') as HTMLElement | null
    const resultsList = document.querySelector('[data-testid="results-list"]') as HTMLElement | null
    const workspace = document.querySelector('[data-testid="workspace"]') as HTMLElement | null

    return {
      plannerBoardOverflow:
        plannerBoard === null
          ? Number.POSITIVE_INFINITY
          : plannerBoard.scrollHeight - plannerBoard.clientHeight,
      resultsListHeight: resultsList?.clientHeight ?? 0,
      workspaceHeight: workspace?.clientHeight ?? 0,
    }
  })

  expect(smallDesktopMetrics.plannerBoardOverflow).toBeGreaterThan(20)
  expect(smallDesktopMetrics.resultsListHeight).toBeGreaterThanOrEqual(160)
  expect(smallDesktopMetrics.workspaceHeight).toBeGreaterThanOrEqual(340)
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
  await gotoPerksBrowser(page, { height: 740, width: 360 })
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
      perkDetails: getElementTop('[data-testid="perk-detail-panel"]'),
      results: getElementTop('[data-testid="results-panel"]'),
    }
  })

  expect(mobileSectionTops.buildPlanner).toBeLessThan(mobileSectionTops.results)
  expect(mobileSectionTops.results).toBeLessThan(mobileSectionTops.perkDetails)
  expect(mobileSectionTops.perkDetails).toBeLessThan(mobileSectionTops.filters)
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

test('keeps collapsed background fit content out of the keyboard order', async ({ page }) => {
  await gotoPerksBrowser(page, { height: 844, width: 390 })
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
