import { expect, test } from '@playwright/test'
import {
  addPerkToBuildFromResults,
  enableCategory,
  expectViewportLocked,
  getBackgroundFitPanel,
  getBuildIndividualGroupsList,
  getResultsList,
  getSidebarPerkGroupButton,
  gotoPerksBrowser,
  mediumPerksBrowserViewport,
  searchPerks,
  selectPerkGroup,
} from './support/perks-browser'

const denseSharedBuildUrl =
  '/?category=Other&group-other=Forceful,Ranger,Shady&build=Student,Muscularity,Battle+Forged,Immovable+Object,Brawny,Steadfast,Steel+Brow,Perfect+Fit,Axe+Mastery,Battle+Flow,Balance,Mind+over+Body,Lone+Wolf,Last+Stand,Berserk,Killing+Frenzy,Swagger,Rebound,Fortified+Mind,Hold+Out,Underdog,Assured+Conquest'

test('shows the background fit panel for a picked build and keeps the shell viewport-locked', async ({
  page,
}) => {
  await gotoPerksBrowser(page, { height: 768, width: 1366 })
  await searchPerks(page, 'Axe Mastery')
  await addPerkToBuildFromResults(page, 'Axe Mastery')

  const backgroundFitPanel = getBackgroundFitPanel(page)
  const backgroundFitResultsScroll = backgroundFitPanel.getByTestId('background-fit-panel-body')
  const backgroundSearchInput = backgroundFitPanel.getByLabel('Search backgrounds')
  const apprenticeCard = backgroundFitPanel
    .locator('.background-fit-card')
    .filter({ hasText: 'Apprentice' })
    .first()

  await expect(backgroundFitPanel).toBeVisible()
  await expect(
    backgroundFitPanel.getByRole('button', { name: 'Expand background fit' }),
  ).toHaveAttribute('aria-expanded', 'false')
  await backgroundFitPanel.getByRole('button', { name: 'Expand background fit' }).click()
  await expect(
    backgroundFitPanel.getByRole('button', { name: 'Collapse background fit' }),
  ).toHaveAttribute('aria-expanded', 'true')
  await expect(
    backgroundFitPanel.getByText(
      /Ranked by guaranteed perks pickable first, then expected perks pickable/i,
    ),
  ).toBeVisible()
  await expect(
    backgroundFitPanel.getByRole('button', { name: 'Expand background Apprentice' }),
  ).toBeVisible()
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
  await expect(apprenticeCard.getByText('Expected 1/1 perks pickable')).toBeVisible()
  await expect(apprenticeCard.getByText('Guaranteed 1/1 perks pickable')).toBeVisible()
  await expect(apprenticeCard.getByText('1/1 matched perk group')).not.toBeVisible()
  await expect(apprenticeCard.getByText('Up to 1/1 perks pickable')).toBeVisible()
  await expect(apprenticeCard.locator('.background-fit-accordion-summary-row')).toHaveCount(1)
  await expect(apprenticeCard).not.toHaveAttribute('title', /.+/)
  const expectedBuildPerksBadge = apprenticeCard
    .locator('.background-fit-summary-badge')
    .filter({ hasText: 'Expected 1/1 perks pickable' })

  await expect(expectedBuildPerksBadge).toHaveAttribute(
    'title',
    /Expected picked-perk coverage/i,
  )
  await expect(expectedBuildPerksBadge).toHaveAttribute(
    'aria-label',
    /Expected picked-perk coverage/i,
  )
  await expect(apprenticeCard.locator('.background-fit-card-panel')).toHaveAttribute(
    'aria-hidden',
    'true',
  )
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

  await backgroundFitPanel.getByRole('button', { name: 'Expand background Apprentice' }).click()
  await expect(apprenticeCard.locator('.background-fit-card-panel')).toHaveAttribute(
    'aria-hidden',
    'false',
  )
  await expect(apprenticeCard.getByText('1/1 matched perk group')).toBeVisible()
  await expect(apprenticeCard.getByText('Guaranteed perk groups 1')).toBeVisible()
  await expect
    .poll(async () =>
      apprenticeCard
        .locator('.background-fit-card-panel')
        .evaluate((element) => getComputedStyle(element).transitionDuration),
    )
    .toBe('0s')

  const axeMatchButton = apprenticeCard.getByRole('button', { name: 'Select perk group Axe' })
  const axeResultRow = getResultsList(page)
    .getByRole('button', { name: 'Inspect Axe Mastery' })
    .locator(
      'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " perk-row ")][1]',
    )
  const axeResultGroupButton = axeResultRow.getByRole('button', {
    name: 'Select perk group Axe',
  })
  const plannerAxeGroupCard = getBuildIndividualGroupsList(page)
    .getByText('Axe', { exact: true })
    .locator(
      'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " planner-group-card ")][1]',
    )

  await expect(axeMatchButton.getByRole('img', { name: 'Axe perk group icon' })).toBeVisible()
  await expect(axeResultGroupButton).toBeVisible()
  await axeResultGroupButton.hover()
  await expect(axeResultGroupButton).toHaveClass(/is-highlighted/)
  await expect(axeMatchButton).toHaveClass(/is-highlighted/)
  await expect(plannerAxeGroupCard).toHaveClass(/is-highlighted/)

  await enableCategory(page, 'Traits')
  await selectPerkGroup(page, 'Calm')
  await searchPerks(page, 'Berserk')

  await axeMatchButton.click()
  await expect(page.getByLabel('Search perks')).toHaveValue('')
  await expect(page.getByRole('button', { name: 'Disable category Weapon' })).toBeVisible()
  await expect(getSidebarPerkGroupButton(page, 'Axe')).toHaveClass(/is-active/)
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

  await expectViewportLocked(page)
})

test('filters the background fit list with the background search field', async ({ page }) => {
  await gotoPerksBrowser(page, mediumPerksBrowserViewport)
  await searchPerks(page, 'Axe Mastery')
  await addPerkToBuildFromResults(page, 'Axe Mastery')

  const backgroundFitPanel = getBackgroundFitPanel(page)
  const backgroundSearchInput = backgroundFitPanel.getByLabel('Search backgrounds')
  const backgroundFitPanelBody = backgroundFitPanel.getByTestId('background-fit-panel-body')
  const oathtakerCard = backgroundFitPanel
    .locator('.background-fit-card')
    .filter({ hasText: 'Oathtaker' })
    .first()

  await expect(backgroundSearchInput).toBeVisible()
  await expect(oathtakerCard.getByText('Expected 0.3/1 perks pickable')).toBeVisible()
  const oathtakerRankBeforeFiltering = await page.evaluate(() => {
    const oathtakerCard = [...document.querySelectorAll('.background-fit-card')].find(
      (backgroundFitCard) =>
        backgroundFitCard.querySelector('h3')?.textContent?.trim() === 'Oathtaker',
    )

    return oathtakerCard?.querySelector('.background-fit-rank')?.textContent ?? null
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
    name: 'Expand background Oathtaker',
  })

  await expect(oathtakerHeading).toBeVisible()
  await expect(oathtakerToggle).toBeVisible()
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const oathtakerCard = [...document.querySelectorAll('.background-fit-card')].find(
          (backgroundFitCard) =>
            backgroundFitCard.querySelector('h3')?.textContent?.trim() === 'Oathtaker',
        )

        return oathtakerCard?.querySelector('.background-fit-rank')?.textContent ?? null
      }),
    )
    .toBe(oathtakerRankBeforeFiltering)
  await expect(backgroundFitPanel.locator('.search-highlight')).toContainText(['Oath'])
  await expect
    .poll(async () => {
      return page.evaluate(() => {
        const backgroundFitPanelBody = document.querySelector(
          '[data-testid="background-fit-panel-body"]',
        )
        const oathtakerHeading = [...document.querySelectorAll('.background-fit-card h3')].find(
          (heading) => heading.textContent?.trim() === 'Oathtaker',
        )

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
      name: 'Expand background Apprentice',
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

test('filters origin backgrounds from the background search menu', async ({ page }) => {
  await gotoPerksBrowser(page, mediumPerksBrowserViewport)

  const backgroundFitPanel = getBackgroundFitPanel(page)
  const backgroundSearchInput = backgroundFitPanel.getByLabel('Search backgrounds')
  const filterBackgroundsButton = backgroundFitPanel.getByRole('button', {
    name: 'Filter backgrounds',
  })

  await expect(filterBackgroundsButton).toBeVisible()
  await expect(filterBackgroundsButton).toHaveClass(/has-active-filter/)
  await expect(filterBackgroundsButton.locator('.background-fit-filter-icon')).toHaveAttribute(
    'fill',
    'currentColor',
  )
  await expect.poll(() => new URL(page.url()).searchParams.get('origin-backgrounds')).toBe('true')
  await backgroundSearchInput.fill('origin crusader')

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
    backgroundFitPanel.getByRole('heading', {
      level: 3,
      name: 'Holy Crusader',
    }),
  ).toBeVisible()
  await expect(backgroundFitPanel.getByText('origin crusader').first()).toBeVisible()

  await filterBackgroundsButton.click()

  const originBackgroundsCheckbox = backgroundFitPanel.getByRole('checkbox', {
    name: 'Origin backgrounds',
  })
  const backgroundFiltersGroup = backgroundFitPanel.getByRole('group', {
    name: 'Background filters',
  })
  const originBackgroundsLabel = backgroundFiltersGroup.getByText('Origin backgrounds')

  await expect(originBackgroundsCheckbox).toBeChecked()
  await expect
    .poll(async () => {
      const checkboxBox = await originBackgroundsCheckbox.boundingBox()

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
  await expect(originBackgroundsCheckbox).toBeChecked()

  await originBackgroundsLabel.click()
  await expect(filterBackgroundsButton).toHaveAttribute('aria-expanded', 'true')
  await expect(originBackgroundsCheckbox).not.toBeChecked()
  await expect.poll(() => new URL(page.url()).searchParams.get('origin-backgrounds')).toBe('false')
  await expect(
    backgroundFitPanel.getByText('No backgrounds match "origin crusader".'),
  ).toBeVisible()

  const savedUrl = page.url()
  const sharedPage = await page.context().newPage()

  try {
    await sharedPage.setViewportSize(mediumPerksBrowserViewport)
    await sharedPage.goto(savedUrl)

    const sharedBackgroundFitPanel = getBackgroundFitPanel(sharedPage)
    const sharedFilterBackgroundsButton = sharedBackgroundFitPanel.getByRole('button', {
      name: 'Filter backgrounds',
    })

    await expect(sharedBackgroundFitPanel.getByText('origin crusader')).toHaveCount(0)
    await sharedFilterBackgroundsButton.click()
    await expect(
      sharedBackgroundFitPanel.getByRole('checkbox', {
        name: 'Origin backgrounds',
      }),
    ).not.toBeChecked()
  } finally {
    await sharedPage.close()
  }

  await originBackgroundsLabel.click()
  await expect(filterBackgroundsButton).toHaveAttribute('aria-expanded', 'true')
  await expect(originBackgroundsCheckbox).toBeChecked()
  await expect.poll(() => new URL(page.url()).searchParams.get('origin-backgrounds')).toBe('true')
  await expect(backgroundFitPanel.getByText('origin crusader').first()).toBeVisible()

  await page.getByLabel('Search perks').click()
  await expect(filterBackgroundsButton).toHaveAttribute('aria-expanded', 'false')
  await expect(
    backgroundFitPanel.getByRole('group', {
      name: 'Background filters',
    }),
  ).toHaveCount(0)
})

test('shows probabilistic background fit matches with percentage badges', async ({ page }) => {
  await gotoPerksBrowser(page, mediumPerksBrowserViewport)
  await searchPerks(page, 'Danger Pay')
  await addPerkToBuildFromResults(page, 'Danger Pay')

  const backgroundFitPanel = getBackgroundFitPanel(page)
  const apprenticeCard = backgroundFitPanel
    .locator('.background-fit-card')
    .filter({ hasText: 'Apprentice' })
    .first()
  const apprenticePanel = apprenticeCard.locator('.background-fit-card-panel')
  const apprenticeToggle = apprenticeCard.getByRole('button', {
    name: 'Expand background Apprentice',
  })

  await apprenticeCard.scrollIntoViewIfNeeded()
  await expect(apprenticeCard.getByText('1/1 matched perk group')).not.toBeVisible()
  await apprenticeToggle.click()
  await expect(apprenticePanel).toHaveAttribute('aria-hidden', 'false')
  await expect(apprenticeCard.getByText('1/1 matched perk group')).toBeVisible()

  const barterMatchButton = apprenticeCard.getByRole('button', {
    name: 'Select perk group Barter',
  })

  await expect(apprenticeCard.getByText('Possible', { exact: true })).toBeVisible()
  await expect(apprenticeCard.getByText(/Expected perk groups \d+(\.\d)?/)).toBeVisible()
  await expect(barterMatchButton).toBeVisible()
  await expect(barterMatchButton.locator('.detail-badge')).toHaveText(/\d+(\.\d)?%/)
  await barterMatchButton.click()
  await expect(page.getByLabel('Search perks')).toHaveValue('')
  await expect(page.getByRole('button', { name: 'Disable category Profession' })).toBeVisible()
  await expect(getSidebarPerkGroupButton(page, 'Barter')).toHaveClass(/is-active/)
})

test('keeps the background search enabled without any picked perks', async ({ page }) => {
  await gotoPerksBrowser(page, mediumPerksBrowserViewport)

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
  await expect(backgroundFitPanel.locator('.search-highlight')).toContainText(['Oath'])
  await expect(
    backgroundFitPanel.getByText(
      /Ranked by guaranteed perks pickable first, then expected perks pickable/i,
    ),
  ).toHaveCount(0)
})

test('hides redundant background disambiguator pills when they only repeat the name', async ({
  page,
}) => {
  await gotoPerksBrowser(page, mediumPerksBrowserViewport)

  const backgroundFitPanel = getBackgroundFitPanel(page)
  const backgroundSearchInput = backgroundFitPanel.getByLabel('Search backgrounds')

  await backgroundSearchInput.fill('Gladiator')

  await expect
    .poll(async () =>
      page.evaluate(() =>
        [...document.querySelectorAll('.background-fit-card')]
          .map((backgroundFitCard) => {
            const heading = backgroundFitCard.querySelector('h3')?.textContent?.trim() ?? ''
            const disambiguator =
              backgroundFitCard
                .querySelector('.background-fit-disambiguator')
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
  await gotoPerksBrowser(page, mediumPerksBrowserViewport)
  await searchPerks(page, 'Axe Mastery')
  await addPerkToBuildFromResults(page, 'Axe Mastery')

  const backgroundNameOrder = await page.evaluate(() =>
    [...document.querySelectorAll('.background-fit-card h3')].map((heading) =>
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
  await expect(
    backgroundFitPanel.getByText(
      /Ranked by guaranteed perks pickable first, then expected perks pickable/i,
    ),
  ).toBeVisible()

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
  const backgroundFitPanelBody = backgroundFitPanel.locator('.background-fit-panel-body')
  const backgroundFitResultsScroll = backgroundFitPanel.getByTestId('background-fit-panel-body')
  const backgroundSearchInput = backgroundFitPanel.getByLabel('Search backgrounds')

  await backgroundFitPanel.getByRole('button', { name: 'Expand background fit' }).click()
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
    .poll(async () => backgroundFitPanelBody.evaluate((element) => element.clientHeight))
    .toBeGreaterThanOrEqual(280)
  await expect
    .poll(async () =>
      backgroundFitResultsScroll.evaluate((element) => element.scrollHeight - element.clientHeight),
    )
    .toBeLessThanOrEqual(1)
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const backgroundFitPanelBody = document.querySelector('.background-fit-results-scroll')
        const hedgeKnightHeading = [...document.querySelectorAll('.background-fit-card h3')].find(
          (heading) => heading.textContent?.trim() === 'Hedge Knight',
        )

        if (
          !(backgroundFitPanelBody instanceof HTMLElement) ||
          !(hedgeKnightHeading instanceof HTMLElement)
        ) {
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

  await backgroundFitPanel.getByRole('button', { name: 'Expand background fit' }).click()
  await backgroundSearchInput.fill('hedge')
  await expect(
    backgroundFitPanel.getByRole('heading', { level: 3, name: 'Hedge Knight' }),
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
          '.background-fit-search-field',
        ) as HTMLElement | null

        return searchField?.getBoundingClientRect().height ?? Number.POSITIVE_INFINITY
      }),
    )
    .toBeLessThanOrEqual(60)
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const rankingSummary = document.querySelector(
          '.background-fit-ranking-summary',
        ) as HTMLElement | null

        if (rankingSummary === null) {
          return 'missing'
        }

        return window.getComputedStyle(rankingSummary).display
      }),
    )
    .toBe('none')
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const searchField = document.querySelector(
          '.background-fit-search-field',
        ) as HTMLElement | null
        const firstCard = document.querySelector('.background-fit-card') as HTMLElement | null

        if (searchField === null || firstCard === null) {
          return Number.POSITIVE_INFINITY
        }

        return firstCard.getBoundingClientRect().top - searchField.getBoundingClientRect().bottom
      }),
    )
    .toBeLessThanOrEqual(24)
})
