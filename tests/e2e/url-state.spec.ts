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
  await searchPerks(page, 'Perfect Focus')
  await inspectPerkFromResults(page, 'Perfect Focus')
  await addPerkToBuildFromResults(page, 'Perfect Focus')

  await searchPerks(page, 'Clarity')
  await inspectPerkFromResults(page, 'Clarity')
  await addPerkToBuildFromResults(page, 'Clarity')
  await expect(getBuildPerksBar(page).getByText('Clarity')).toBeVisible()
  await expect.poll(() => page.url()).toContain('build=Perfect+Focus,Clarity')
  await expect.poll(() => page.url()).toContain('category=Traits,Magic')

  const savedUrl = page.url()

  expect(savedUrl).toContain('search=Clarity')
  expect(savedUrl).not.toContain('tier=')
  expect(savedUrl).toContain('category=Traits,Magic')
  expect(savedUrl).toContain('group-traits=Calm')
  expect(savedUrl).toContain('group-magic=Deadeye')
  expect(savedUrl).toContain('build=Perfect+Focus,Clarity')
  expect(new URL(savedUrl).searchParams.getAll('category')).toEqual(['Traits,Magic'])
  expect(new URL(savedUrl).searchParams.getAll('build')).toEqual(['Perfect Focus,Clarity'])

  const sharedPage = await page.context().newPage()

  try {
    await sharedPage.setViewportSize({ width: 900, height: 720 })
    await sharedPage.goto(savedUrl)

    await expect(sharedPage.getByLabel('Search perks')).toHaveValue('Clarity')
    await expect(sharedPage.getByLabel('Filter by tier')).toHaveCount(0)
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
    await expect(
      getBuildSharedGroupsList(sharedPage).getByText('Calm', { exact: true }),
    ).toBeVisible()
    await expect(
      getBuildSharedGroupsList(sharedPage).getByText('Perfect Focus', { exact: true }),
    ).toBeVisible()
    await expect(
      getBuildSharedGroupsList(sharedPage).getByText('Clarity', { exact: true }),
    ).toBeVisible()
    await expect(
      getBuildIndividualGroupsList(sharedPage).getByText('Deadeye', { exact: true }),
    ).toBeVisible()
    await expect(
      getBuildIndividualGroupsList(sharedPage).getByText('Perfect Focus', { exact: true }),
    ).toBeVisible()
  } finally {
    await sharedPage.close()
  }
})
