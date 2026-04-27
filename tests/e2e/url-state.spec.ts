import { expect, test } from '@playwright/test'
import {
  addPerkToBuildFromResults,
  getBuildIndividualGroupsList,
  getBuildPerksBar,
  getBuildSharedGroupsList,
  getSidebarPerkGroupButton,
  gotoPerksBrowser,
  inspectPerkFromResults,
  searchPerks,
  selectPerkGroup,
} from './support/perks-browser'

test('stores readable filters and build state in the url and restores them on a shared link', async ({
  page,
}) => {
  await gotoPerksBrowser(page)

  await page.getByRole('button', { name: 'Enable category Traits' }).click()
  await selectPerkGroup(page, 'Calm')
  await searchPerks(page, 'Perfect Focus')
  await inspectPerkFromResults(page, 'Perfect Focus')
  await addPerkToBuildFromResults(page, 'Perfect Focus')

  await searchPerks(page, 'Clarity')
  await inspectPerkFromResults(page, 'Clarity')
  await addPerkToBuildFromResults(page, 'Clarity')
  await page.getByRole('button', { name: 'Enable category Magic' }).click()
  await expect(getBuildPerksBar(page).getByText('Clarity')).toBeVisible()
  await expect.poll(() => page.url()).toContain('build=Perfect+Focus,Clarity')
  await expect.poll(() => page.url()).toContain('category=Magic')

  const savedUrl = page.url()

  expect(savedUrl).toContain('search=Clarity')
  expect(savedUrl).not.toContain('tier=')
  expect(savedUrl).toContain('category=Magic')
  expect(savedUrl).not.toContain('group-traits')
  expect(savedUrl).not.toContain('group-magic')
  expect(savedUrl).toContain('build=Perfect+Focus,Clarity')
  expect(savedUrl).not.toContain('origin-backgrounds')
  expect(new URL(savedUrl).searchParams.getAll('category')).toEqual(['Magic'])
  expect(new URL(savedUrl).searchParams.getAll('build')).toEqual(['Perfect Focus,Clarity'])
  expect(new URL(savedUrl).searchParams.get('origin-backgrounds')).toBeNull()

  const sharedPage = await page.context().newPage()

  try {
    await sharedPage.setViewportSize({ width: 900, height: 720 })
    await sharedPage.goto(savedUrl)

    await expect(sharedPage.getByLabel('Search perks')).toHaveValue('Clarity')
    await expect(sharedPage.getByLabel('Filter by tier')).toHaveCount(0)
    await expect(sharedPage.getByRole('button', { name: 'Enable category Traits' })).toBeVisible()
    await expect(sharedPage.getByRole('button', { name: 'Disable category Magic' })).toBeVisible()
    await expect(getSidebarPerkGroupButton(sharedPage, 'Calm')).toHaveCount(0)
    await expect(getSidebarPerkGroupButton(sharedPage, 'Deadeye')).not.toHaveClass(/is-active/)
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

test('restores duplicate-name build perks from disambiguated shared links', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 720 })
  await page.goto(
    '/?build=Chain+Lightning--perk.legend_chain_lightning,Chain+Lightning--perk.legend_magic_chain_lightning',
  )

  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()
  await expect(page.getByText('2 perks picked.')).toBeVisible()
  await expect(
    getBuildPerksBar(page).getByRole('button', {
      name: 'View Chain Lightning from build planner',
    }),
  ).toHaveCount(2)
  expect(new URL(page.url()).searchParams.get('build')).toBe(
    'Chain Lightning--perk.legend_chain_lightning,Chain Lightning--perk.legend_magic_chain_lightning',
  )
  expect(new URL(page.url()).searchParams.get('origin-backgrounds')).toBeNull()
})
