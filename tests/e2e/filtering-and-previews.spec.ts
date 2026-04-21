import { expect, test } from '@playwright/test'
import {
  clearAllFilters,
  disableCategory,
  enableCategory,
  getResultsList,
  gotoPerksBrowser,
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
  await expect(page.getByLabel('Filter by tier')).toHaveValue('all-tiers')
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
    resultsList.getByText(/Passive: .*upon killing an enemy 4 Action Points are immediately restored/i),
  ).toBeVisible()
  await expect(resultsList.getByText('is vicious', { exact: true })).toHaveCount(0)

  await searchPerks(page, 'Killing Frenzy')
  await expect(
    resultsList.getByText(/Passive: .*A kill increases all damage by 25% for two turns/i),
  ).toBeVisible()
  await expect(
    resultsList.getByText(/Does not stack, but another kill will reset the timer/i),
  ).toBeVisible()
  await expect(resultsList.getByText('axes', { exact: true })).toHaveCount(0)

  await searchPerks(page, 'Fearsome')
  await expect(
    resultsList.getByText(
      /Passive: .*triggers a morale check for the opponent with a penalty equal to 20% of your current Resolve/i,
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
