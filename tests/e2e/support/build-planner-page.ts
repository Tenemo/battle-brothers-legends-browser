import { expect, type Locator, type Page } from '@playwright/test'

type BuildPlannerViewport = {
  height: number
  width: number
}

const defaultBuildPlannerViewport = {
  height: 720,
  width: 900,
} as const
export const backgroundFitCalculationTimeoutMs = 30_000

export const mediumBuildPlannerViewport = {
  height: 720,
  width: 820,
} as const

type CssRgbColorParts = {
  alpha: number
  blue: number
  green: number
  red: number
}

type LocatorBoundingBox = {
  height: number
  width: number
  x: number
  y: number
}

export async function getRequiredLocatorBoundingBox(
  locator: Locator,
  label: string,
): Promise<LocatorBoundingBox> {
  const boundingBox = await locator.boundingBox()

  if (boundingBox === null) {
    throw new Error(`${label} did not have a measurable bounding box.`)
  }

  return boundingBox
}

export function getParsedCssRgbColor(cssColor: string): CssRgbColorParts {
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

function doCssRgbColorsMatch(actualColor: string, expectedColor: string): boolean {
  const actualColorParts = getParsedCssRgbColor(actualColor)
  const expectedColorParts = getParsedCssRgbColor(expectedColor)

  return (
    actualColorParts.red === expectedColorParts.red &&
    actualColorParts.green === expectedColorParts.green &&
    actualColorParts.blue === expectedColorParts.blue &&
    Math.abs(actualColorParts.alpha - expectedColorParts.alpha) <= 0.001
  )
}

export function expectCssRgbColorsToMatch(actualColor: string, expectedColor: string): void {
  expect(doCssRgbColorsMatch(actualColor, expectedColor)).toBe(true)
}

export async function waitForCssRgbColor(
  getCssColor: () => Promise<string>,
  expectedColor: string,
): Promise<void> {
  await expect.poll(async () => doCssRgbColorsMatch(await getCssColor(), expectedColor)).toBe(true)
}

export async function getResolvedCssBackgroundColor(
  page: Page,
  cssBackgroundValue: string,
): Promise<string> {
  return page.evaluate((backgroundValue) => {
    const colorProbe = document.createElement('div')
    colorProbe.style.background = backgroundValue
    document.body.append(colorProbe)
    const resolvedColor = window.getComputedStyle(colorProbe).backgroundColor

    colorProbe.remove()

    return resolvedColor
  }, cssBackgroundValue)
}

export async function getResolvedCssBorderColor(
  page: Page,
  cssBorderColorValue: string,
): Promise<string> {
  return page.evaluate((borderColorValue) => {
    const colorProbe = document.createElement('div')
    colorProbe.style.borderTopColor = borderColorValue
    document.body.append(colorProbe)
    const resolvedColor = window.getComputedStyle(colorProbe).borderTopColor

    colorProbe.remove()

    return resolvedColor
  }, cssBorderColorValue)
}

export function getBuildIndividualGroupsList(page: Page): Locator {
  return page.getByTestId('build-individual-groups-list')
}

export function getBuildSharedGroupsList(page: Page): Locator {
  return page.getByTestId('build-shared-groups-list')
}

export function getBuildPerksBar(page: Page): Locator {
  return page.getByTestId('build-perks-bar')
}

export function getBackgroundFitPanel(page: Page): Locator {
  return page.getByTestId('background-fit-panel')
}

export function getDetailPanel(page: Page): Locator {
  return page.getByTestId('detail-panel')
}

export function getResultsList(page: Page): Locator {
  return page.getByTestId('results-list')
}

export async function expectBackgroundFitCalculationComplete(
  backgroundFitPanel: Locator,
  options: { shouldObserveProgress?: boolean } = {},
): Promise<void> {
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

  await expect(backgroundFitProgressBar).toHaveCount(0, {
    timeout: backgroundFitCalculationTimeoutMs,
  })
  await expect(backgroundFitRankingSummary).toBeVisible({
    timeout: backgroundFitCalculationTimeoutMs,
  })
  await expect(backgroundFitRankingSummary).toHaveAttribute('aria-hidden', 'false')
}

export async function getPlannerBoardVisualVerticalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const plannerBoard = document.querySelector('[data-testid="planner-board"]')

    if (!(plannerBoard instanceof HTMLElement)) {
      return Number.POSITIVE_INFINITY
    }

    const plannerBoardRectangle = plannerBoard.getBoundingClientRect()
    const childRectangles = [...plannerBoard.children].map((child) => child.getBoundingClientRect())

    if (childRectangles.length === 0) {
      return 0
    }

    return (
      Math.max(...childRectangles.map((rectangle) => rectangle.bottom)) -
      plannerBoardRectangle.bottom
    )
  })
}

export async function expectSearchParam(
  page: Page,
  paramName: string,
  expectedValue: string | null,
): Promise<void> {
  await expect.poll(() => new URL(page.url()).searchParams.get(paramName)).toBe(expectedValue)
}

export async function expectSearchParamValues(
  page: Page,
  paramName: string,
  expectedValues: string[],
): Promise<void> {
  await expect
    .poll(() => new URL(page.url()).searchParams.getAll(paramName))
    .toEqual(expectedValues)
}

export async function expectRawAncientScrollMarker(marker: Locator): Promise<void> {
  const markerPresentation = await marker.evaluate((element) => {
    const style = window.getComputedStyle(element)

    return {
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      borderRadius: style.borderRadius,
      borderTopWidth: style.borderTopWidth,
      cursor: style.cursor,
    }
  })

  expect(markerPresentation.backgroundColor).toBe('rgba(0, 0, 0, 0)')
  expect(markerPresentation.backgroundImage).toBe('none')
  expect(markerPresentation.borderRadius).toBe('0px')
  expect(markerPresentation.borderTopWidth).toBe('0px')
  expect(markerPresentation.cursor).toBe('help')
}

function getSidebar(page: Page): Locator {
  return page.getByTestId('category-sidebar')
}

export function getSidebarPerkGroupButton(page: Page, perkGroupName: string): Locator {
  return getSidebar(page).getByRole('button', {
    name: `Select perk group ${perkGroupName}`,
  })
}

export async function gotoBuildPlanner(
  page: Page,
  viewport: BuildPlannerViewport = defaultBuildPlannerViewport,
): Promise<void> {
  await page.setViewportSize(viewport)
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()
  await expect(page.getByLabel('Search perks')).toBeVisible()
  await expect(getBuildPerksBar(page)).toBeVisible()
  await expect(getBuildSharedGroupsList(page)).toBeVisible()
  await expect(getBuildIndividualGroupsList(page)).toBeVisible()
}

export async function expectViewportLocked(page: Page): Promise<void> {
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const detailPanelBody = document.querySelector(
          '[data-testid="detail-panel-body"]',
        ) as HTMLElement | null
        const resultsList = document.querySelector(
          '[data-testid="results-list"]',
        ) as HTMLElement | null

        return {
          detailPanelScrollStateIsValid:
            detailPanelBody !== null &&
            (detailPanelBody.querySelector('[data-testid="empty-state"]') !== null ||
              detailPanelBody.scrollHeight > detailPanelBody.clientHeight),
          documentScrollHeight: document.documentElement.scrollHeight,
          resultsListIsScrollable:
            resultsList !== null && resultsList.scrollHeight > resultsList.clientHeight,
          viewportHeight: window.innerHeight,
        }
      }),
    )
    .toMatchObject({
      detailPanelScrollStateIsValid: true,
      resultsListIsScrollable: true,
    })

  await expect
    .poll(async () =>
      page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight),
    )
    .toBeLessThanOrEqual(2)
}

export async function expectNoDocumentHorizontalOverflow(page: Page): Promise<void> {
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
          window.innerWidth,
      ),
    )
    .toBeLessThanOrEqual(1)
}

export async function expectNoWorkspaceHorizontalClip(page: Page): Promise<void> {
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const workspace = document.querySelector('[data-testid="workspace"]') as HTMLElement | null

        if (workspace === null) {
          return Number.POSITIVE_INFINITY
        }

        const workspaceRight = workspace.getBoundingClientRect().right
        const workspaceColumnRights = [
          '[data-testid="background-fit-panel"]',
          '[data-testid="category-sidebar"]',
          '[aria-label="Perk results"]',
          '[data-testid="detail-panel"]',
        ].flatMap((selector) => {
          const element = document.querySelector(selector)

          return element instanceof HTMLElement ? [element.getBoundingClientRect().right] : []
        })

        return Math.max(0, Math.max(...workspaceColumnRights) - workspaceRight)
      }),
    )
    .toBeLessThanOrEqual(1)
}

export async function searchPerks(page: Page, query: string): Promise<void> {
  await page.getByLabel('Search perks').fill(query)
}

export async function clearAllFilters(page: Page): Promise<void> {
  const clearCategorySelectionButton = page.getByRole('button', {
    name: 'Clear category selection',
  })

  if ((await clearCategorySelectionButton.count()) > 0) {
    await clearCategorySelectionButton.click()
  }

  await page.getByLabel('Search perks').fill('')
}

export async function enableCategory(page: Page, categoryName: string): Promise<void> {
  await page.getByRole('button', { name: `Enable category ${categoryName}` }).click()
}

export async function disableCategory(page: Page, categoryName: string): Promise<void> {
  await page.getByRole('button', { name: `Disable category ${categoryName}` }).click()
}

export async function expandCategory(page: Page, categoryName: string): Promise<void> {
  await page.getByRole('button', { name: `Expand category ${categoryName}` }).click()
}

export async function selectPerkGroup(page: Page, perkGroupName: string): Promise<void> {
  await getSidebarPerkGroupButton(page, perkGroupName).click()
}

export async function inspectPerkFromResults(page: Page, perkName: string): Promise<void> {
  const inspectButton = getResultsList(page).getByRole('button', {
    exact: true,
    name: `Inspect ${perkName}`,
  })

  await expect(inspectButton).toBeVisible()
  await inspectButton.scrollIntoViewIfNeeded()
  await inspectButton.focus()
  await inspectButton.press('Enter')
}

export async function addPerkToBuildFromResults(page: Page, perkName: string): Promise<void> {
  const resultsList = getResultsList(page)

  await resultsList.getByRole('button', { name: `Add ${perkName} to build from results` }).click()
  await expect(
    resultsList.getByRole('button', { name: `Remove ${perkName} from build from results` }),
  ).toBeVisible()
}

export async function addSelectedPerkToBuild(page: Page, perkName: string): Promise<void> {
  await page.getByRole('button', { name: `Add ${perkName} to build`, exact: true }).click()
}
