import { expect, type Locator, type Page } from '@playwright/test'

type PerksBrowserViewport = {
  height: number
  width: number
}

export const defaultPerksBrowserViewport = {
  height: 720,
  width: 900,
} as const

export const mediumPerksBrowserViewport = {
  height: 720,
  width: 820,
} as const

export function getBuildIndividualGroupsList(page: Page): Locator {
  return page.getByTestId('build-individual-groups-list')
}

export function getBuildSharedGroupsList(page: Page): Locator {
  return page.getByTestId('build-shared-groups-list')
}

export function getBuildPerksBar(page: Page): Locator {
  return page.getByTestId('build-perks-bar')
}

export function getBackgroundFitPanel(page: Page): Locator {
  return page.getByTestId('background-fit-panel')
}

export function getResultsList(page: Page): Locator {
  return page.getByTestId('results-list')
}

export async function gotoPerksBrowser(
  page: Page,
  viewport: PerksBrowserViewport = defaultPerksBrowserViewport,
): Promise<void> {
  await page.setViewportSize(viewport)
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Perks browser' })).toBeVisible()
  await expect(page.getByLabel('Search perks')).toBeVisible()
  await expect(getBuildPerksBar(page)).toBeVisible()
  await expect(getBuildSharedGroupsList(page)).toBeVisible()
  await expect(getBuildIndividualGroupsList(page)).toBeVisible()
}

export async function expectViewportLocked(page: Page): Promise<void> {
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
}

export async function searchPerks(page: Page, query: string): Promise<void> {
  await page.getByLabel('Search perks').fill(query)
}

export async function clearAllFilters(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Reset all category filters' }).click()
  await page.getByLabel('Search perks').fill('')
}

export async function enableCategory(page: Page, categoryName: string): Promise<void> {
  await page.getByRole('button', { name: `Enable category ${categoryName}` }).click()
}

export async function disableCategory(page: Page, categoryName: string): Promise<void> {
  await page.getByRole('button', { name: `Disable category ${categoryName}` }).click()
}

export async function togglePerkGroup(page: Page, treeName: string): Promise<void> {
  await page.getByRole('button', { name: `Toggle perk group ${treeName}` }).click()
}

export async function inspectPerkFromResults(page: Page, perkName: string): Promise<void> {
  const inspectButton = getResultsList(page).getByRole('button', {
    name: `Inspect ${perkName}`,
  })

  await expect(inspectButton).toBeVisible()
  await inspectButton.scrollIntoViewIfNeeded()
  await inspectButton.focus()
  await inspectButton.press('Enter')
}

export async function addPerkToBuildFromResults(page: Page, perkName: string): Promise<void> {
  await getResultsList(page)
    .getByRole('button', { name: `Add ${perkName} to build from results` })
    .click()
}

export async function addSelectedPerkToBuild(page: Page, perkName: string): Promise<void> {
  await page.getByRole('button', { name: `Add ${perkName} to build`, exact: true }).click()
}
