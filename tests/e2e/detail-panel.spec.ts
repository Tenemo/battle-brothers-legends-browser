import { expect, test } from '@playwright/test'
import {
  getResultsList,
  gotoPerksBrowser,
  inspectPerkFromResults,
  searchPerks,
} from './support/perks-browser'

test('groups repeated background sources in the detail panel', async ({ page }) => {
  await gotoPerksBrowser(page)

  await searchPerks(page, 'Perfect Focus')
  await inspectPerkFromResults(page, 'Perfect Focus')

  const backgroundSourcesSection = page
    .locator('.detail-section')
    .filter({ has: page.getByRole('heading', { level: 3, name: 'Background sources' }) })

  await expect(page.getByRole('heading', { level: 2, name: 'Perfect Focus' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Background sources' })).toBeVisible()
  await expect(backgroundSourcesSection.locator('strong').getByText(/Anatomist.*Beast Slayer.*Youngblood/i)).toBeVisible()
  await expect(page.getByText('Minimum 7 / No chance override')).toHaveCount(1)
})

test('shows favored enemy targets and scenario overlays for enemy perks', async ({ page }) => {
  await gotoPerksBrowser(page)

  await searchPerks(page, 'Favoured Enemy - Beasts')
  await inspectPerkFromResults(page, 'Favoured Enemy - Beasts')

  await expect(page.getByRole('heading', { level: 3, name: 'Favored enemy targets' })).toBeVisible()
  await expect(page.getByText('Bear', { exact: true })).toBeVisible()
  await expect(page.getByText('Spider', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Scenario overlays' })).toBeVisible()
  await expect(page.getByText(/Random pool: Favoured Enemy - Occult, Favoured Enemy - Beasts/i)).toBeVisible()

  await expect(
    getResultsList(page).getByRole('button', {
      name: 'Inspect Favoured Enemy - Beasts',
    }),
  ).toBeVisible()
})
