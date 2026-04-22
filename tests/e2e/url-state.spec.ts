import { expect, test } from '@playwright/test'
import {
  addPerkToBuildFromResults,
  getBuildIndividualGroupsList,
  getBuildPerksBar,
  getBuildSharedGroupsList,
  gotoPerksBrowser,
  inspectPerkFromResults,
  searchPerks,
} from './support/perks-browser'

test('stores readable filters and build state in the url and restores them on a shared link', async ({
  page,
}) => {
  await gotoPerksBrowser(page)

  await page.getByRole('button', { name: 'Enable category Traits' }).click()
  await page.getByRole('button', { name: 'Enable category Magic' }).click()
  await page.getByRole('button', { name: 'Toggle perk group Calm' }).click()
  await page.getByRole('button', { name: 'Toggle perk group Deadeye' }).click()
  await page.getByLabel('Filter by tier').selectOption('7')
  await searchPerks(page, 'Perfect Focus')
  await inspectPerkFromResults(page, 'Perfect Focus')
  await addPerkToBuildFromResults(page, 'Perfect Focus')

  await page.getByLabel('Filter by tier').selectOption('5')
  await searchPerks(page, 'Clarity')
  await inspectPerkFromResults(page, 'Clarity')
  await addPerkToBuildFromResults(page, 'Clarity')
  await expect(getBuildPerksBar(page).getByText('Clarity')).toBeVisible()

  const savedUrl = page.url()

  expect(savedUrl).toContain('search=Clarity')
  expect(savedUrl).toContain('tier=5')
  expect(savedUrl).toContain('category=Traits,Magic')
  expect(savedUrl).toContain('group-traits=Calm')
  expect(savedUrl).toContain('group-magic=Deadeye')
  expect(savedUrl).toContain('build=Perfect+Focus,Clarity')
  expect(savedUrl).not.toContain('category=Traits&category=Magic')
  expect(savedUrl).not.toContain('build=Perfect+Focus&build=Clarity')

  const sharedPage = await page.context().newPage()

  try {
    await sharedPage.setViewportSize({ width: 900, height: 720 })
    await sharedPage.goto(savedUrl)

    await expect(sharedPage.getByLabel('Search perks')).toHaveValue('Clarity')
    await expect(sharedPage.getByLabel('Filter by tier')).toHaveValue('5')
    await expect(sharedPage.getByRole('button', { name: 'Disable category Traits' })).toBeVisible()
    await expect(sharedPage.getByRole('button', { name: 'Disable category Magic' })).toBeVisible()
    await expect(sharedPage.getByRole('button', { name: 'Toggle perk group Calm' })).toHaveClass(
      /is-active/,
    )
    await expect(sharedPage.getByRole('button', { name: 'Toggle perk group Deadeye' })).toHaveClass(
      /is-active/,
    )
    await expect(getBuildPerksBar(sharedPage).getByText('Perfect Focus')).toBeVisible()
    await expect(getBuildPerksBar(sharedPage).getByText('Clarity')).toBeVisible()
    await expect(getBuildSharedGroupsList(sharedPage).getByText('Calm', { exact: true })).toBeVisible()
    await expect(getBuildSharedGroupsList(sharedPage).getByText('Perfect Focus', { exact: true })).toBeVisible()
    await expect(getBuildSharedGroupsList(sharedPage).getByText('Clarity', { exact: true })).toBeVisible()
    await expect(getBuildIndividualGroupsList(sharedPage).getByText('Deadeye', { exact: true })).toBeVisible()
    await expect(getBuildIndividualGroupsList(sharedPage).getByText('Perfect Focus', { exact: true })).toBeVisible()

    const legacyUrl = new URL(savedUrl)
    legacyUrl.search =
      '?search=Clarity&tier=5&category=Traits&category=Magic&group-traits=Calm&group-magic=Deadeye&build=Perfect+Focus&build=Clarity'

    await sharedPage.goto(legacyUrl.toString())

    await expect(sharedPage.getByLabel('Search perks')).toHaveValue('Clarity')
    await expect(sharedPage.getByLabel('Filter by tier')).toHaveValue('5')
    await expect(sharedPage.getByRole('button', { name: 'Disable category Traits' })).toBeVisible()
    await expect(sharedPage.getByRole('button', { name: 'Disable category Magic' })).toBeVisible()
    await expect(sharedPage.getByRole('button', { name: 'Toggle perk group Calm' })).toHaveClass(
      /is-active/,
    )
    await expect(sharedPage.getByRole('button', { name: 'Toggle perk group Deadeye' })).toHaveClass(
      /is-active/,
    )
    await expect(getBuildPerksBar(sharedPage).getByText('Perfect Focus')).toBeVisible()
    await expect(getBuildPerksBar(sharedPage).getByText('Clarity')).toBeVisible()
    await expect.poll(() => sharedPage.url()).toContain('category=Traits,Magic')
    await expect.poll(() => sharedPage.url()).toContain('build=Perfect+Focus,Clarity')
    await expect.poll(() => sharedPage.url()).not.toContain('category=Traits&category=Magic')
    await expect.poll(() => sharedPage.url()).not.toContain('build=Perfect+Focus&build=Clarity')
  } finally {
    await sharedPage.close()
  }
})
