import { expect, test } from '@playwright/test'
import {
  addPerkToBuildFromResults,
  enableCategory,
  getBuildPerksBar,
  gotoPerksBrowser,
  searchPerks,
  selectPerkGroup,
} from './support/perks-browser'

test('copies a canonical build-only link from an active filtered workspace', async ({ page }) => {
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
  await gotoPerksBrowser(page)

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
  await expect(page.getByText('Filtered to 1 category and 1 perk group.')).toBeVisible()

  await copyBuildLinkButton.click()

  await expect(copyBuildLinkButton).toHaveText('Copied')

  const copiedBuildLink = await page.evaluate(
    () => (window as Window & { copiedBuildLink?: string }).copiedBuildLink ?? null,
  )

  expect(copiedBuildLink).not.toBeNull()

  const copiedUrl = new URL(copiedBuildLink ?? '')

  expect(copiedUrl.origin).toBe('http://127.0.0.1:4173')
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
  await gotoPerksBrowser(page)

  await searchPerks(page, 'Clarity')
  await addPerkToBuildFromResults(page, 'Clarity')

  const copyBuildLinkButton = page.getByRole('button', { name: 'Copy build link' })

  await copyBuildLinkButton.click()

  await expect(copyBuildLinkButton).toHaveText('Copy failed')
  await expect(getBuildPerksBar(page).getByText('Clarity')).toBeVisible()
})
