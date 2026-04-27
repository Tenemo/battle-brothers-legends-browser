import { expect, test } from '@playwright/test'
import { getResultsList, gotoPerksBrowser, searchPerks } from './support/perks-browser'

test('searches imported metadata fields and shows a real empty state', async ({ page }) => {
  await gotoPerksBrowser(page)

  await searchPerks(page, 'Beast Slayers')
  await expect(
    getResultsList(page).getByRole('button', {
      name: 'Inspect Favoured Enemy - Beasts',
    }),
  ).toBeVisible()

  await searchPerks(page, 'Spider')
  await expect(
    getResultsList(page).getByRole('button', {
      name: 'Inspect Favoured Enemy - Beasts',
    }),
  ).toBeVisible()

  await searchPerks(page, 'Beast Slayer')
  await expect(
    getResultsList(page).getByRole('button', {
      name: 'Inspect Perfect Focus',
    }),
  ).toBeVisible()

  await searchPerks(page, 'zzzz impossible perk')

  await expect(page.getByRole('heading', { level: 2, name: 'No perks found' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Select a perk' })).toBeVisible()
  await expect(getResultsList(page).getByTestId('perk-row')).toHaveCount(0)
})
