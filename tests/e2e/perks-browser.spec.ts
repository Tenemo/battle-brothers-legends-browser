import { expect, test } from '@playwright/test'

test('browses and searches the perks catalog', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Expand category Traits' }).click()
  await expect(page.locator('.subgroup-heading')).toHaveText('Perk groups')
  await page.getByRole('button', { name: 'Collapse category Traits' }).click()
  await expect(page.locator('.subgroup-heading')).toHaveCount(0)
  await page.getByRole('button', { name: 'Expand category Traits' }).click()
  await page.getByRole('button', { name: 'Toggle perk group Calm' }).click()
  await page.getByLabel('Search perks').fill('Clarity')
  await page.getByRole('button', { name: /Clarity/i }).click()

  await expect(page.getByRole('heading', { level: 2, name: 'Clarity' })).toBeVisible()
  await expect(page.locator('.detail-header').getByRole('img', { name: 'Clarity icon' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Tree placement' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Background sources' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Source files' })).toHaveCount(0)
  await expect(page.getByText(/Reference root/i)).toHaveCount(0)

  await page.getByRole('button', { name: 'Expand category Enemy' }).click()
  await page.getByLabel('Search perks').fill('Favoured Enemy - Beasts')
  await page.getByRole('button', { name: /Favoured Enemy - Beasts/i }).click()

  await expect(page.getByRole('heading', { level: 3, name: 'Favored enemy targets' })).toBeVisible()
  await expect(page.getByText('Bear', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Scenario overlays' })).toBeVisible()
  await expect(page.getByText(/Random pool: Favoured Enemy - Occult, Favoured Enemy - Beasts/i)).toBeVisible()
})
