import { expect, test } from '@playwright/test'

test('browses and searches the perks catalog', async ({ page }) => {
  await page.goto('/')

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const detailPanel = document.querySelector('.detail-panel') as HTMLElement | null
        const resultsList = document.querySelector('.results-list') as HTMLElement | null

        return {
          detailPanelIsScrollable:
            detailPanel !== null && detailPanel.scrollHeight > detailPanel.clientHeight,
          documentScrollHeight: document.documentElement.scrollHeight,
          resultsListIsScrollable:
            resultsList !== null && resultsList.scrollHeight > resultsList.clientHeight,
          viewportHeight: window.innerHeight,
        }
      }),
    )
    .toMatchObject({
      detailPanelIsScrollable: true,
      resultsListIsScrollable: true,
    })
  await expect
    .poll(async () =>
      page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight),
    )
    .toBeLessThanOrEqual(2)

  await page.getByRole('button', { name: 'Enable category Traits' }).click()
  await expect(page.locator('.subgroup-heading')).toHaveText('Perk groups')
  await page.getByRole('button', { name: 'Disable category Traits' }).click()
  await expect(page.locator('.subgroup-heading')).toHaveCount(0)
  await page.getByRole('button', { name: 'Enable category Traits' }).click()
  await page.getByRole('button', { name: 'Toggle perk group Calm' }).click()
  await expect(page.getByText('Filtered to 1 category and 1 perk group.')).toBeVisible()
  await page.getByRole('button', { name: 'Enable category Enemy' }).click()
  await expect(page.getByText('Filtered to 2 categories and 1 perk group.')).toBeVisible()
  await expect(page.getByTestId('results-list').getByRole('button', { name: /Favoured Enemy - Beasts/i })).toBeVisible()
  await page.getByRole('button', { name: 'Clear all filters' }).click()
  await expect(page.getByLabel('Search perks')).toHaveValue('')
  await expect(page.getByLabel('Filter by tier')).toHaveValue('all-tiers')
  await expect(page.getByText(/Ranked by exact perk names first/i)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Enable category Traits' })).toBeVisible()

  await page.getByRole('button', { name: 'Enable category Traits' }).click()
  await page.getByRole('button', { name: 'Toggle perk group Calm' }).click()
  await page.getByLabel('Search perks').fill('Clarity')
  await page.getByRole('button', { name: /Clarity/i }).click()

  await expect(page.getByRole('heading', { level: 2, name: 'Clarity' })).toBeVisible()
  await expect(page.locator('.detail-header').getByRole('img', { name: 'Clarity icon' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Tree placement' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Background sources' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Source files' })).toHaveCount(0)
  await expect(page.getByText(/Reference root/i)).toHaveCount(0)

  await page.getByRole('button', { name: 'Enable category Enemy' }).click()
  await page.getByLabel('Search perks').fill('Favoured Enemy - Beasts')
  await page.getByRole('button', { name: /Favoured Enemy - Beasts/i }).click()

  await expect(page.getByRole('heading', { level: 3, name: 'Favored enemy targets' })).toBeVisible()
  await expect(page.getByText('Bear', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Scenario overlays' })).toBeVisible()
  await expect(page.getByText(/Random pool: Favoured Enemy - Occult, Favoured Enemy - Beasts/i)).toBeVisible()

  await expect
    .poll(async () =>
      page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight),
    )
    .toBeLessThanOrEqual(2)
})
