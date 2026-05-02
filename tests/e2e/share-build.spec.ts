import { expect, test } from '@playwright/test'
import {
  addPerkToBuildFromResults,
  enableCategory,
  getBuildPerksBar,
  getSidebarPerkGroupButton,
  gotoBuildPlanner,
  searchPerks,
  selectPerkGroup,
} from './support/build-planner-page'

test('copies a canonical build-only link from a searched workspace', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          const writableWindow = window as Window & { copiedBuildLink?: string }
          writableWindow.copiedBuildLink = text
        },
      },
    })
  })
  await gotoBuildPlanner(page)

  const copyBuildLinkButton = page.getByRole('button', { name: 'Copy build link' })

  await expect(copyBuildLinkButton).toBeDisabled()

  await enableCategory(page, 'Traits')
  await selectPerkGroup(page, 'Calm')
  await searchPerks(page, 'Perfect Focus')
  await addPerkToBuildFromResults(page, 'Perfect Focus')
  await searchPerks(page, 'Clarity')
  await addPerkToBuildFromResults(page, 'Clarity')

  await expect(getBuildPerksBar(page).getByTestId('planner-slot-perk')).toHaveCount(2)
  await expect(page.getByLabel('Search perks')).toHaveValue('Clarity')
  await expect(page.getByRole('button', { name: 'Show all categories' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByRole('button', { name: 'Enable category Traits' })).toBeVisible()
  await expect(getSidebarPerkGroupButton(page, 'Calm')).toHaveCount(0)
  await expect(page.getByText(/Filtered to /i)).toHaveCount(0)

  await copyBuildLinkButton.click()

  await expect(copyBuildLinkButton).toHaveText('Copied')

  const copiedBuildLink = await page.evaluate(
    () => (window as Window & { copiedBuildLink?: string }).copiedBuildLink ?? null,
  )

  expect(copiedBuildLink).not.toBeNull()

  const copiedUrl = new URL(copiedBuildLink ?? '')
  const expectedOrigin = new URL(page.url()).origin

  expect(copiedUrl.origin).toBe(expectedOrigin)
  expect(copiedUrl.pathname).toBe('/')
  expect(copiedUrl.searchParams.get('build')).toBe('Perfect Focus,Clarity')
  expect(copiedUrl.searchParams.has('search')).toBe(false)
  expect(copiedUrl.searchParams.has('category')).toBe(false)
  expect(copiedUrl.searchParams.has('group-traits')).toBe(false)
})

test('shows a deterministic copy failure state when clipboard paths fail', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error('Clipboard unavailable.')
        },
      },
    })
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: () => false,
    })
  })
  await gotoBuildPlanner(page)

  await searchPerks(page, 'Clarity')
  await addPerkToBuildFromResults(page, 'Clarity')

  const copyBuildLinkButton = page.getByRole('button', { name: 'Copy build link' })

  await copyBuildLinkButton.click()

  await expect(copyBuildLinkButton).toHaveText('Copy failed')
  await expect(getBuildPerksBar(page).getByText('Clarity')).toBeVisible()
})
