import { expect, test } from '@playwright/test'
import {
  expectLocatorVisibleInVirtualizedScrollContainer,
  getResultsList,
  gotoBuildPlanner,
  searchPerks,
} from './support/build-planner-page'

test('searches imported metadata fields and shows a real empty state', async ({ page }) => {
  await gotoBuildPlanner(page)

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
  await expectLocatorVisibleInVirtualizedScrollContainer({
    label: 'Perfect Focus search result',
    page,
    scrollContainer: getResultsList(page),
    target: getResultsList(page).getByRole('button', {
      name: 'Inspect Perfect Focus',
    }),
  })

  await searchPerks(page, 'zzzz impossible perk')

  await expect(page.getByRole('heading', { level: 2, name: 'No perks found' })).toBeVisible()
  await expect(
    page.getByRole('heading', { level: 2, name: 'Select a perk or background' }),
  ).toBeVisible()
  await expect(getResultsList(page).getByTestId('perk-row')).toHaveCount(0)
})
