import { expect, test } from '@playwright/test'
import {
  addPerkToBuildFromResults,
  expectViewportLocked,
  getBackgroundFitPanel,
  gotoPerksBrowser,
  mediumPerksBrowserViewport,
  searchPerks,
} from './support/perks-browser'

const denseSharedBuildUrl =
  '/?category=Other&group-other=Forceful&group-other=Ranger&group-other=Shady&build=Student&build=Muscularity&build=Battle+Forged&build=Immovable+Object&build=Brawny&build=Steadfast&build=Steel+Brow&build=Perfect+Fit&build=Axe+Mastery&build=Battle+Flow&build=Balance&build=Mind+over+Body&build=Lone+Wolf&build=Last+Stand&build=Berserk&build=Killing+Frenzy&build=Swagger&build=Rebound&build=Fortified+Mind&build=Hold+Out&build=Underdog&build=Assured+Conquest'

test('shows the background fit panel for a picked build and keeps the shell viewport-locked', async ({
  page,
}) => {
  await gotoPerksBrowser(page, mediumPerksBrowserViewport)
  await searchPerks(page, 'Axe Mastery')
  await addPerkToBuildFromResults(page, 'Axe Mastery')

  const backgroundFitPanel = getBackgroundFitPanel(page)
  const apprenticeCard = backgroundFitPanel
    .locator('.background-fit-card')
    .filter({ hasText: 'Apprentice' })
    .first()

  await expect(backgroundFitPanel).toBeVisible()
  await expect(backgroundFitPanel.getByRole('button', { name: 'Collapse background fit' })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  await expect(backgroundFitPanel.getByText(/Ranked by guaranteed build weight first/i)).toBeVisible()
  await expect(backgroundFitPanel.getByRole('button', { name: 'Expand background Apprentice' })).toBeVisible()
  await expect(apprenticeCard.getByText('Up to 1/1 perks pickable')).toBeVisible()
    await expect(apprenticeCard.getByText('Guaranteed 1/1 perks pickable')).toBeVisible()
    await expect(apprenticeCard.getByText('1/1 matched group')).toBeVisible()
    await expect(apprenticeCard.getByText(/Maximum \d+ total groups/)).toBeVisible()
    await expect(apprenticeCard.locator('.background-fit-accordion-summary-row')).toHaveCount(2)
    await expect(apprenticeCard).not.toHaveAttribute('title', /.+/)
    await expect(
      apprenticeCard
        .locator('.background-fit-summary-badge')
        .filter({ hasText: /Maximum \d+ total groups/ }),
    ).not.toHaveAttribute('title', /.+/)
  await expect(apprenticeCard.locator('.background-fit-card-panel')).toHaveAttribute('aria-hidden', 'true')
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

  await backgroundFitPanel.getByRole('button', { name: 'Expand background Apprentice' }).click()
  await expect(apprenticeCard.locator('.background-fit-card-panel')).toHaveAttribute('aria-hidden', 'false')
  await expect(apprenticeCard.getByText('Guaranteed groups 1')).toBeVisible()

  await backgroundFitPanel.getByRole('button', { name: 'Collapse background fit' }).click()
  await expect(
    backgroundFitPanel.getByRole('button', { name: 'Expand background fit' }),
  ).toHaveAttribute('aria-expanded', 'false')
  await expect(backgroundFitPanel.getByText('Background fit')).toBeVisible()

  await backgroundFitPanel.getByRole('button', { name: 'Expand background fit' }).click()
  await expect(
    backgroundFitPanel.getByRole('button', { name: 'Collapse background fit' }),
  ).toHaveAttribute('aria-expanded', 'true')

  await expectViewportLocked(page)
})

test('filters the background fit list with the background search field', async ({ page }) => {
  await gotoPerksBrowser(page, mediumPerksBrowserViewport)
  await searchPerks(page, 'Axe Mastery')
  await addPerkToBuildFromResults(page, 'Axe Mastery')

  const backgroundFitPanel = getBackgroundFitPanel(page)
  const backgroundSearchInput = backgroundFitPanel.getByLabel('Search backgrounds')
  const backgroundFitPanelBody = backgroundFitPanel.getByTestId('background-fit-panel-body')

  await expect(backgroundSearchInput).toBeVisible()
  await backgroundFitPanelBody.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await expect
    .poll(async () =>
      backgroundFitPanelBody.evaluate((element) => element.scrollTop),
    )
    .toBeGreaterThan(0)

  await backgroundSearchInput.fill('Oathtaker')
  await expect
    .poll(async () =>
      backgroundFitPanelBody.evaluate((element) => element.scrollTop),
    )
    .toBeLessThanOrEqual(1)
  const oathtakerHeading = backgroundFitPanel.getByRole('heading', {
    level: 3,
    name: 'Oathtaker',
  })
  const oathtakerToggle = backgroundFitPanel.getByRole('button', {
    name: 'Expand background Oathtaker',
  })

  await expect(oathtakerHeading).toBeVisible()
  await expect(oathtakerToggle).toBeVisible()
  await expect
    .poll(async () => {
      return page.evaluate(() => {
        const backgroundFitPanelBody = document.querySelector(
          '[data-testid="background-fit-panel-body"]',
        )
        const oathtakerHeading = [...document.querySelectorAll('.background-fit-card h3')].find(
          (heading) => heading.textContent?.trim() === 'Oathtaker',
        )

        if (!(backgroundFitPanelBody instanceof HTMLElement) || !(oathtakerHeading instanceof HTMLElement)) {
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
      name: 'Expand background Apprentice',
    }),
  ).toHaveCount(0)

  await backgroundSearchInput.fill('zzzz impossible background')
  await expect(backgroundFitPanel.getByText('No backgrounds match "zzzz impossible background".')).toBeVisible()
})

test('keeps dense background names readable from a shared build url and starts collapsed', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto(denseSharedBuildUrl)

  const backgroundFitPanel = getBackgroundFitPanel(page)

  await expect(backgroundFitPanel.getByRole('button', { name: 'Collapse background fit' })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  await expect(backgroundFitPanel.getByText(/Ranked by guaranteed build weight first/i)).toBeVisible()

  const hedgeKnightCard = backgroundFitPanel
    .locator('.background-fit-card')
    .filter({ hasText: 'Hedge Knight' })
    .first()
  const hedgeKnightHeading = hedgeKnightCard.locator('h3')
  const hedgeKnightPanel = hedgeKnightCard.locator('.background-fit-card-panel')

  await hedgeKnightHeading.scrollIntoViewIfNeeded()
  await expect(hedgeKnightHeading).toBeVisible()
  await expect(hedgeKnightPanel).toHaveAttribute('aria-hidden', 'true')
  await expect
    .poll(async () => {
      const hedgeKnightBoundingBox = await hedgeKnightHeading.boundingBox()

      return hedgeKnightBoundingBox === null
        ? null
        : {
            height: hedgeKnightBoundingBox.height,
            width: hedgeKnightBoundingBox.width,
          }
    })
    .toMatchObject({
      height: expect.any(Number),
      width: expect.any(Number),
    })
  const hedgeKnightBoundingBox = await hedgeKnightHeading.boundingBox()

  expect(hedgeKnightBoundingBox).not.toBeNull()
  expect(hedgeKnightBoundingBox!.width).toBeGreaterThan(90)
  expect(hedgeKnightBoundingBox!.width).toBeGreaterThan(hedgeKnightBoundingBox!.height * 2)
})

test('keeps the dense build workspace visible while filtering backgrounds on desktop', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1365, height: 900 })
  await page.goto(denseSharedBuildUrl)

  const backgroundFitPanel = getBackgroundFitPanel(page)
  const backgroundFitPanelBody = backgroundFitPanel.getByTestId('background-fit-panel-body')
  const backgroundSearchInput = backgroundFitPanel.getByLabel('Search backgrounds')

  await backgroundSearchInput.fill('hedge')

  const hedgeKnightHeading = backgroundFitPanel.getByRole('heading', {
    level: 3,
    name: 'Hedge Knight',
  })

  await expect(hedgeKnightHeading).toBeVisible()
  await expect
    .poll(async () =>
      page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight),
    )
    .toBeLessThanOrEqual(1)
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const workspace = document.querySelector('.workspace') as HTMLElement | null

        return workspace?.getBoundingClientRect().height ?? 0
      }),
    )
    .toBeGreaterThanOrEqual(280)
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const plannerBoard = document.querySelector('.planner-board') as HTMLElement | null

        return plannerBoard === null ? 0 : plannerBoard.scrollHeight - plannerBoard.clientHeight
      }),
    )
    .toBeGreaterThan(200)
  await expect
    .poll(async () =>
      backgroundFitPanelBody.evaluate((element) => element.clientHeight),
    )
    .toBeGreaterThanOrEqual(280)
  await expect
    .poll(async () =>
      backgroundFitPanelBody.evaluate((element) => element.scrollHeight - element.clientHeight),
    )
    .toBeLessThanOrEqual(1)
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const backgroundFitPanelBody = document.querySelector(
          '[data-testid="background-fit-panel-body"]',
        )
        const hedgeKnightHeading = [...document.querySelectorAll('.background-fit-card h3')].find(
          (heading) => heading.textContent?.trim() === 'Hedge Knight',
        )

        if (!(backgroundFitPanelBody instanceof HTMLElement) || !(hedgeKnightHeading instanceof HTMLElement)) {
          return false
        }

        const backgroundFitPanelBodyBox = backgroundFitPanelBody.getBoundingClientRect()
        const hedgeKnightHeadingBox = hedgeKnightHeading.getBoundingClientRect()

        return (
          hedgeKnightHeadingBox.top >= backgroundFitPanelBodyBox.top &&
          hedgeKnightHeadingBox.bottom <= backgroundFitPanelBodyBox.bottom
        )
      }),
    )
    .toBe(true)
})

test('does not stretch the background search field on tall desktop screens', async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 1300 })
  await page.goto(denseSharedBuildUrl)

  const backgroundFitPanel = getBackgroundFitPanel(page)
  const backgroundFitPanelBody = backgroundFitPanel.getByTestId('background-fit-panel-body')
  const backgroundSearchInput = backgroundFitPanel.getByLabel('Search backgrounds')

  await backgroundSearchInput.fill('hedge')
  await expect(backgroundFitPanel.getByRole('heading', { level: 3, name: 'Hedge Knight' })).toBeVisible()
  await expect
    .poll(async () =>
      backgroundFitPanelBody.evaluate((element) => element.scrollHeight - element.clientHeight),
    )
    .toBeLessThanOrEqual(1)
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const searchField = document.querySelector('.background-fit-search-field') as HTMLElement | null

        return searchField?.getBoundingClientRect().height ?? Number.POSITIVE_INFINITY
      }),
    )
    .toBeLessThanOrEqual(60)
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const searchField = document.querySelector('.background-fit-search-field') as HTMLElement | null
        const rankingSummary = document.querySelector('.background-fit-ranking-summary') as HTMLElement | null

        if (searchField === null || rankingSummary === null) {
          return Number.POSITIVE_INFINITY
        }

        return rankingSummary.getBoundingClientRect().top - searchField.getBoundingClientRect().bottom
      }),
    )
    .toBeLessThanOrEqual(24)
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const rankingSummary = document.querySelector('.background-fit-ranking-summary') as HTMLElement | null
        const firstCard = document.querySelector('.background-fit-card') as HTMLElement | null

        if (rankingSummary === null || firstCard === null) {
          return Number.POSITIVE_INFINITY
        }

        return firstCard.getBoundingClientRect().top - rankingSummary.getBoundingClientRect().bottom
      }),
    )
    .toBeLessThanOrEqual(24)
})
