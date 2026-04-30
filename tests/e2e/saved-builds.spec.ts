import { expect, type Page, test } from '@playwright/test'
import {
  addPerkToBuildFromResults,
  expectNoDocumentHorizontalOverflow,
  getBuildPerksBar,
  gotoBuildPlanner,
  searchPerks,
} from './support/build-planner-page'

async function clearBuildWithConfirmation(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Clear build' }).click()

  const clearBuildDialog = page.getByRole('alertdialog', { name: 'Clear this build?' })

  await expect(clearBuildDialog).toBeVisible()
  await clearBuildDialog.getByRole('button', { name: 'Clear build' }).click()
}

test('saves a build locally, copies its link, and loads it after a reload', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          const writableWindow = window as Window & { copiedSavedBuildLink?: string }
          writableWindow.copiedSavedBuildLink = text
        },
      },
    })
  })
  await gotoBuildPlanner(page)

  await searchPerks(page, 'Perfect Focus')
  await addPerkToBuildFromResults(page, 'Perfect Focus')
  await searchPerks(page, 'Clarity')
  await addPerkToBuildFromResults(page, 'Clarity')

  await page.getByRole('button', { name: 'Save / Load build' }).click()
  await page.getByLabel('Build name').fill('Calm focus')
  await page.getByRole('button', { exact: true, name: 'Save current' }).click()

  await expect(page.getByRole('status')).toHaveText('Saved build')
  await expect(page.getByTestId('saved-builds-list')).toContainText('Calm focus')
  await page.getByRole('button', { name: 'Close saved builds' }).click()
  await clearBuildWithConfirmation(page)
  await expect(getBuildPerksBar(page).getByText('Pick a perk to start')).toBeVisible()

  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()
  await page.getByRole('button', { name: 'Save / Load build' }).click()

  const savedBuild = page
    .getByTestId('saved-builds-list')
    .getByTestId('saved-build-card')
    .filter({ hasText: 'Calm focus' })

  await expect(savedBuild).toContainText('2 perks.')
  await savedBuild.getByRole('button', { name: 'Copy saved build Calm focus link' }).click()
  await expect(page.getByRole('status')).toHaveText('Copied link')

  const copiedSavedBuildLink = await page.evaluate(
    () => (window as Window & { copiedSavedBuildLink?: string }).copiedSavedBuildLink ?? null,
  )

  expect(copiedSavedBuildLink).not.toBeNull()
  expect(new URL(copiedSavedBuildLink ?? '').searchParams.get('build')).toBe(
    'Perfect Focus,Clarity',
  )

  await savedBuild.getByRole('button', { name: 'Load saved build Calm focus' }).click()
  await expect(getBuildPerksBar(page).getByText('Perfect Focus')).toBeVisible()
  await expect(getBuildPerksBar(page).getByText('Clarity')).toBeVisible()
})

test('keeps local save and load controls usable on mobile', async ({ page }) => {
  await gotoBuildPlanner(page, { width: 390, height: 760 })

  await searchPerks(page, 'Axe Mastery')
  await addPerkToBuildFromResults(page, 'Axe Mastery')
  await expectNoDocumentHorizontalOverflow(page)

  await page.getByRole('button', { name: 'Save / Load build' }).click()
  await page.getByLabel('Build name').fill('Mobile axe')
  await page.getByRole('button', { exact: true, name: 'Save current' }).click()
  await expect(page.getByRole('status')).toHaveText('Saved build')

  await page.getByRole('button', { name: 'Close saved builds' }).click()
  await page.getByRole('button', { name: 'Clear build' }).click()
  const clearBuildDialog = page.getByRole('alertdialog', { name: 'Clear this build?' })

  await expect(clearBuildDialog).toBeVisible()
  await expectNoDocumentHorizontalOverflow(page)
  await clearBuildDialog.getByRole('button', { name: 'Clear build' }).click()
  await expect(getBuildPerksBar(page).getByText('Pick a perk to start')).toBeVisible()

  await page.getByRole('button', { name: 'Save / Load build' }).click()
  await page.getByRole('button', { name: 'Load saved build Mobile axe' }).click()
  await expect(getBuildPerksBar(page).getByText('Axe Mastery')).toBeVisible()
  await expectNoDocumentHorizontalOverflow(page)
})

test('keeps keyboard focus inside the saved builds dialog', async ({ page }) => {
  await gotoBuildPlanner(page)

  await searchPerks(page, 'Clarity')
  await addPerkToBuildFromResults(page, 'Clarity')

  const openSavedBuildsButton = page.getByRole('button', { name: 'Save / Load build' })

  await openSavedBuildsButton.click()

  const savedBuildsDialog = page.getByRole('dialog', { name: 'Saved builds' })
  const buildNameInput = page.getByLabel('Build name')
  const closeSavedBuildsButton = savedBuildsDialog.getByRole('button', {
    name: 'Close saved builds',
  })
  const saveCurrentButton = savedBuildsDialog.getByRole('button', {
    exact: true,
    name: 'Save current',
  })

  await expect(savedBuildsDialog).toBeVisible()
  await expect(buildNameInput).toBeFocused()

  await page.keyboard.press('Shift+Tab')
  await expect(closeSavedBuildsButton).toBeFocused()

  await page.keyboard.press('Shift+Tab')
  await expect(saveCurrentButton).toBeFocused()

  await page.keyboard.press('Tab')
  await expect(closeSavedBuildsButton).toBeFocused()

  await closeSavedBuildsButton.click()
  await expect(savedBuildsDialog).toHaveCount(0)
  await expect(openSavedBuildsButton).toBeFocused()
})

test('deletes saved builds from IndexedDB storage', async ({ page }) => {
  await gotoBuildPlanner(page)

  await searchPerks(page, 'Clarity')
  await addPerkToBuildFromResults(page, 'Clarity')

  await page.getByRole('button', { name: 'Save / Load build' }).click()
  await page.getByLabel('Build name').fill('Temporary clarity')
  await page.getByRole('button', { exact: true, name: 'Save current' }).click()
  await expect(page.getByTestId('saved-builds-list')).toContainText('Temporary clarity')

  await page.getByRole('button', { name: 'Delete saved build Temporary clarity' }).click()
  await expect(page.getByRole('status')).toHaveText('Deleted build')
  await expect(page.getByTestId('saved-builds-list')).not.toContainText('Temporary clarity')
  await expect(page.getByTestId('saved-builds-list')).toContainText('No saved builds yet.')
})
