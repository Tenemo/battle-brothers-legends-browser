import { expect, test } from '@playwright/test'
import {
  clearAllFilters,
  disableCategory,
  enableCategory,
  getResultsList,
  gotoPerksBrowser,
  inspectPerkFromResults,
  searchPerks,
  togglePerkGroup,
} from './support/perks-browser'

test('filters by multiple categories and scoped perk groups, then clears everything cleanly', async ({
  page,
}) => {
  await gotoPerksBrowser(page)

  await enableCategory(page, 'Traits')
  await expect(page.locator('.subgroup-heading')).toHaveText('Perk groups')
  await disableCategory(page, 'Traits')
  await expect(page.locator('.subgroup-heading')).toHaveCount(0)

  await enableCategory(page, 'Traits')
  await togglePerkGroup(page, 'Calm')
  await expect(page.getByText('Filtered to 1 category and 1 perk group.')).toBeVisible()

  await enableCategory(page, 'Enemy')
  await expect(page.getByText('Filtered to 2 categories and 1 perk group.')).toBeVisible()
  await expect(
    getResultsList(page).getByRole('button', {
      name: 'Inspect Favoured Enemy - Beasts',
    }),
  ).toBeVisible()

  await clearAllFilters(page)

  await expect(page.getByLabel('Search perks')).toHaveValue('')
  await expect(page.getByLabel('Filter by tier')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Clear all filters' })).toHaveCount(0)
  await expect(page.getByText(/Ranked by exact perk names first/i)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Enable category Traits' })).toBeVisible()
})

test('shows real effect previews for hooked perk descriptions instead of tree text', async ({
  page,
}) => {
  await gotoPerksBrowser(page)
  const resultsList = getResultsList(page)

  await searchPerks(page, 'Berserk')
  await expect(
    resultsList.getByText(/upon killing an enemy 4 Action Points are immediately restored/i),
  ).toBeVisible()
  await expect(resultsList.getByText(/Passive:/i)).toHaveCount(0)
  await expect(resultsList.getByText('is vicious', { exact: true })).toHaveCount(0)

  await searchPerks(page, 'Killing Frenzy')
  await expect(
    resultsList.getByText(/A kill increases all damage by 25% for two turns/i),
  ).toBeVisible()
  await expect(
    resultsList.getByText(/Does not stack, but another kill will reset the timer/i),
  ).toBeVisible()
  await expect(resultsList.getByText('axes', { exact: true })).toHaveCount(0)

  await searchPerks(page, 'Fearsome')
  await expect(
    resultsList.getByText(
      /triggers a morale check for the opponent with a penalty equal to 20% of your current Resolve/i,
    ),
  ).toBeVisible()
  await expect(resultsList.getByText('cleavers', { exact: true })).toHaveCount(0)
})

test('shows normalized mastery labels in the result list', async ({ page }) => {
  await gotoPerksBrowser(page)

  await searchPerks(page, 'Axe Mastery')

  await expect(
    getResultsList(page).getByRole('button', { name: 'Inspect Axe Mastery' }),
  ).toBeVisible()
  await expect(getResultsList(page).getByText('Spec Axe', { exact: true })).toHaveCount(0)
})

test('reorders categories and perk groups around the active perk search query and highlights the match', async ({
  page,
}) => {
  await gotoPerksBrowser(page)

  await searchPerks(page, 'Shady')

  const categoryButtons = page.locator('.sidebar .category-card > button.group-chip')

  await expect(categoryButtons.first()).toHaveAttribute('aria-label', 'Enable category Other')

  await enableCategory(page, 'Other')

  const subgroupButtons = page.locator(
    '.sidebar .subgroup-panel button[aria-label^="Toggle perk group "]',
  )

  await expect(subgroupButtons.first()).toHaveAttribute('aria-label', 'Toggle perk group Shady')
  await expect(page.locator('.sidebar .search-highlight')).toContainText(['Shady'])
})

test('highlights the searched perk phrase in the visible perk results', async ({ page }) => {
  await gotoPerksBrowser(page)

  await searchPerks(page, 'Axe')

  await expect(getResultsList(page).locator('.search-highlight')).toContainText(['Axe'])
})

test('keeps search result and repository hover states fixed in place', async ({ page }) => {
  await gotoPerksBrowser(page)
  await page.locator('.hero').evaluate(async (element) => {
    await Promise.all(
      element.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
    )
  })

  await searchPerks(page, 'Perfect')

  const perfectFocusInspectButton = getResultsList(page).getByRole('button', {
    name: 'Inspect Perfect Focus',
  })
  const perfectFocusResultRow = perfectFocusInspectButton.locator(
    'xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " perk-row ")][1]',
  )
  const repositoryLink = page.getByLabel(
    'Open the battle-brothers-legends-browser repository on GitHub',
  )

  await expect(perfectFocusResultRow).toBeVisible()
  await perfectFocusInspectButton.scrollIntoViewIfNeeded()

  const resultRowBeforeHover = await perfectFocusResultRow.evaluate((element) => {
    const rectangle = element.getBoundingClientRect()
    const computedStyle = window.getComputedStyle(element)

    return {
      backgroundColor: computedStyle.backgroundColor,
      height: rectangle.height,
      top: rectangle.top,
      width: rectangle.width,
    }
  })

  await perfectFocusInspectButton.hover()

  await expect(perfectFocusResultRow).toHaveCSS('transform', 'none')

  const resultRowAfterHover = await perfectFocusResultRow.evaluate((element) => {
    const rectangle = element.getBoundingClientRect()
    const computedStyle = window.getComputedStyle(element)

    return {
      backgroundColor: computedStyle.backgroundColor,
      height: rectangle.height,
      top: rectangle.top,
      width: rectangle.width,
    }
  })

  expect(resultRowAfterHover.backgroundColor).toBe(resultRowBeforeHover.backgroundColor)
  expect(Math.abs(resultRowAfterHover.top - resultRowBeforeHover.top)).toBeLessThanOrEqual(1)
  expect(Math.abs(resultRowAfterHover.height - resultRowBeforeHover.height)).toBeLessThanOrEqual(1)
  expect(Math.abs(resultRowAfterHover.width - resultRowBeforeHover.width)).toBeLessThanOrEqual(1)

  const repositoryLinkBeforeHover = await repositoryLink.evaluate((element) => {
    const rectangle = element.getBoundingClientRect()

    return {
      height: rectangle.height,
      top: rectangle.top,
      width: rectangle.width,
    }
  })

  await repositoryLink.hover()

  await expect(repositoryLink).toHaveCSS('transform', 'none')

  const repositoryLinkAfterHover = await repositoryLink.evaluate((element) => {
    const rectangle = element.getBoundingClientRect()

    return {
      height: rectangle.height,
      top: rectangle.top,
      width: rectangle.width,
    }
  })

  expect(
    Math.abs(repositoryLinkAfterHover.top - repositoryLinkBeforeHover.top),
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(repositoryLinkAfterHover.height - repositoryLinkBeforeHover.height),
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(repositoryLinkAfterHover.width - repositoryLinkBeforeHover.width),
  ).toBeLessThanOrEqual(1)
})

test('keeps middle-of-word search highlights from adding visual gaps', async ({ page }) => {
  await gotoPerksBrowser(page)

  await searchPerks(page, 'tellige')

  const intelligentHighlight = getResultsList(page)
    .locator('.perk-context .search-highlight')
    .filter({ hasText: 'tellige' })
    .first()

  await expect(intelligentHighlight).toBeVisible()
  await expect(
    intelligentHighlight.locator('xpath=ancestor::*[contains(@class, "perk-context")][1]'),
  ).toContainText(/Intelligent/)

  const horizontalPadding = await intelligentHighlight.evaluate((element) => {
    const computedStyle = window.getComputedStyle(element)

    return {
      left: computedStyle.paddingLeft,
      right: computedStyle.paddingRight,
    }
  })

  expect(horizontalPadding).toEqual({
    left: '0px',
    right: '0px',
  })
})

test('shows picked categories and subgroups with stars and keeps picked result rows outlined while selection changes the background', async ({
  page,
}) => {
  await gotoPerksBrowser(page)

  await searchPerks(page, 'Clarity')
  await getResultsList(page)
    .getByRole('button', { name: 'Add Clarity to build from results' })
    .click()

  await searchPerks(page, 'Perfect Focus')
  await getResultsList(page)
    .getByRole('button', { name: 'Add Perfect Focus to build from results' })
    .click()
  await inspectPerkFromResults(page, 'Perfect Focus')

  await searchPerks(page, '')

  await expect(
    page
      .getByRole('button', { name: 'Enable category Traits' })
      .locator('.group-chip-picked-stars .build-star'),
  ).toHaveCount(2)
  await expect(
    page
      .getByRole('button', { name: 'Enable category Magic' })
      .locator('.group-chip-picked-stars .build-star'),
  ).toHaveCount(1)

  await enableCategory(page, 'Traits')
  await enableCategory(page, 'Magic')

  await expect(
    page
      .getByRole('button', { name: 'Toggle perk group Calm' })
      .locator('.group-chip-picked-stars .build-star'),
  ).toHaveCount(2)
  await expect(
    page
      .getByRole('button', { name: 'Toggle perk group Deadeye' })
      .locator('.group-chip-picked-stars .build-star'),
  ).toHaveCount(1)

  await disableCategory(page, 'Traits')
  await disableCategory(page, 'Magic')

  await searchPerks(page, 'Perfect')
  await inspectPerkFromResults(page, 'Perfect Fit')

  const rowStyles = await page.evaluate(() => {
    function getPerkRowStyles(perkName: string) {
      const inspectButton = document.querySelector(
        `button[aria-label="Inspect ${perkName}"]`,
      ) as HTMLButtonElement | null
      const perkRow = inspectButton?.closest('.perk-row') as HTMLElement | null | undefined

      if (perkRow == null) {
        return null
      }

      const computedStyle = window.getComputedStyle(perkRow)

      return {
        backgroundColor: computedStyle.backgroundColor,
        borderColor: computedStyle.borderTopColor,
      }
    }

    return {
      picked: getPerkRowStyles('Perfect Focus'),
      selected: getPerkRowStyles('Perfect Fit'),
    }
  })

  expect(rowStyles.picked).not.toBeNull()
  expect(rowStyles.selected).not.toBeNull()

  expect(rowStyles.picked?.borderColor).not.toBe(rowStyles.selected?.borderColor)
  expect(rowStyles.picked?.backgroundColor).not.toBe(rowStyles.selected?.backgroundColor)
})
