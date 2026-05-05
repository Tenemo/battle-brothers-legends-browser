import { expect, type Page, test } from '@playwright/test'
import {
  addPerkToBuildFromResults,
  expectNoDocumentHorizontalOverflow,
  expectSearchParam,
  getBuildPerksBar,
  getBuildIndividualGroupsList,
  getBuildSharedGroupsList,
  getSidebarPerkGroupButton,
  gotoBuildPlanner,
  searchPerks,
  selectPerkGroup,
} from './support/build-planner-page'

type IndexedDbSavedBuildRecord = {
  createdAt: string
  id: string
  name: string
  optionalPerkIds: string[]
  pickedPerkIds: string[]
  referenceVersion: string
  schemaVersion: 1
  updatedAt: string
}

const savedBuildsDatabaseName = 'battle-brothers-legends-browser'
const savedBuildsStoreName = 'saved-builds'

async function clearBuildWithConfirmation(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Clear build' }).click()

  const clearBuildDialog = page.getByRole('alertdialog', { name: 'Clear this build?' })

  await expect(clearBuildDialog).toBeVisible()
  await clearBuildDialog.getByRole('button', { name: 'Clear build' }).click()
}

function createOverflowSavedBuildRecords(savedBuildCount: number): IndexedDbSavedBuildRecord[] {
  return Array.from({ length: savedBuildCount }, (_unusedValue, savedBuildIndex) => {
    const savedBuildNumber = savedBuildIndex + 1
    const savedAt = new Date(Date.UTC(2026, 4, 3, 10, savedBuildIndex)).toISOString()

    return {
      createdAt: savedAt,
      id: `saved-build-overflow-${savedBuildNumber}`,
      name: `Overflow build ${savedBuildNumber}`,
      optionalPerkIds: [],
      pickedPerkIds: ['perk.legend_clarity'],
      referenceVersion: '19.3.22',
      schemaVersion: 1,
      updatedAt: savedAt,
    }
  })
}

async function seedSavedBuildRecords(
  page: Page,
  savedBuildRecords: IndexedDbSavedBuildRecord[],
): Promise<void> {
  await page.evaluate(
    async ({ databaseName, savedBuilds, storeName }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(databaseName, 1)

        request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed.'))
        request.onupgradeneeded = () => {
          const upgradeDatabase = request.result

          if (!upgradeDatabase.objectStoreNames.contains(storeName)) {
            const store = upgradeDatabase.createObjectStore(storeName, { keyPath: 'id' })

            store.createIndex('updatedAt', 'updatedAt', { unique: false })
          }
        }
        request.onsuccess = () => resolve(request.result)
      })

      try {
        await new Promise<void>((resolve, reject) => {
          const transaction = database.transaction(storeName, 'readwrite')
          const store = transaction.objectStore(storeName)

          store.clear()

          for (const savedBuild of savedBuilds) {
            store.put(savedBuild)
          }

          transaction.onabort = () =>
            reject(transaction.error ?? new Error('IndexedDB transaction aborted.'))
          transaction.onerror = () =>
            reject(transaction.error ?? new Error('IndexedDB transaction failed.'))
          transaction.oncomplete = () => resolve()
        })
      } finally {
        database.close()
      }
    },
    {
      databaseName: savedBuildsDatabaseName,
      savedBuilds: savedBuildRecords,
      storeName: savedBuildsStoreName,
    },
  )
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

  await page.getByRole('button', { name: 'Saved builds' }).click()
  await page.getByLabel('Build name').fill('Calm focus')
  await page.getByRole('button', { exact: true, name: 'Save current' }).click()

  await expect(page.getByRole('status')).toHaveText('Saved build')
  await expect(page.getByTestId('saved-builds-list')).toContainText('Calm focus')
  await page.getByRole('button', { name: 'Close saved builds' }).click()
  await clearBuildWithConfirmation(page)
  await expect(getBuildPerksBar(page).getByText('Pick a perk to start')).toBeVisible()

  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()
  await page.getByRole('button', { name: 'Saved builds' }).click()

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
  expect(new URL(copiedSavedBuildLink ?? '').searchParams.get('search')).toBe('Clarity')

  await savedBuild.getByRole('button', { name: 'Load saved build Calm focus' }).click()
  await expect(getBuildPerksBar(page).getByText('Perfect Focus')).toBeVisible()
  await expect(getBuildPerksBar(page).getByText('Clarity')).toBeVisible()
  await expect(page.getByLabel('Search perks')).toHaveValue('Clarity')
})

test('saves and restores perk and background filters with a saved build', async ({ page }) => {
  await gotoBuildPlanner(page)

  await page.getByRole('button', { name: 'Enable category Traits' }).click()
  await selectPerkGroup(page, 'Calm')
  await addPerkToBuildFromResults(page, 'Clarity')

  await page.getByRole('button', { name: 'Filter perks' }).click()
  await page.getByTestId('origin-perk-groups-checkbox').check()
  await page.getByTestId('ancient-scroll-perk-groups-checkbox').uncheck()

  await page.getByRole('button', { name: 'Filter backgrounds' }).click()
  await page.getByTestId('origin-backgrounds-checkbox').check()
  await page.getByTestId('background-study-book-checkbox').uncheck()
  await page.getByTestId('background-study-second-scroll-checkbox').check()
  await page.getByTestId('background-veteran-perk-3-checkbox').uncheck()

  await page.getByRole('button', { name: 'Saved builds' }).click()
  await page.getByLabel('Build name').fill('Filtered calm')
  await page.getByRole('button', { exact: true, name: 'Save current' }).click()
  await expect(page.getByRole('status')).toHaveText('Saved build')
  await page.getByRole('button', { name: 'Close saved builds' }).click()

  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()
  await page.getByRole('button', { name: 'Saved builds' }).click()

  const savedBuild = page
    .getByTestId('saved-builds-list')
    .getByTestId('saved-build-card')
    .filter({ hasText: 'Filtered calm' })

  await savedBuild.getByRole('button', { name: 'Load saved build Filtered calm' }).click()

  await expect(getBuildPerksBar(page).getByText('Clarity')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Disable category Traits' })).toBeVisible()
  await expect(getSidebarPerkGroupButton(page, 'Calm')).toHaveAttribute('aria-pressed', 'true')
  await expectSearchParam(page, 'category', 'Traits')
  await expectSearchParam(page, 'group-traits', 'Calm')
  await expectSearchParam(page, 'origin-perk-groups', 'true')
  await expectSearchParam(page, 'ancient-scroll-perk-groups', 'false')
  await expectSearchParam(page, 'origin-backgrounds', 'true')
  await expectSearchParam(page, 'background-book', 'false')
  await expectSearchParam(page, 'background-two-scrolls', 'true')
  await expectSearchParam(page, 'background-veteran-perks', '2,4')

  await page.getByRole('button', { name: 'Filter perks' }).click()
  await expect(page.getByTestId('origin-perk-groups-checkbox')).toBeChecked()
  await expect(page.getByTestId('ancient-scroll-perk-groups-checkbox')).not.toBeChecked()

  await page.getByRole('button', { name: 'Filter backgrounds' }).click()
  await expect(page.getByTestId('origin-backgrounds-checkbox')).toBeChecked()
  await expect(page.getByTestId('background-study-book-checkbox')).not.toBeChecked()
  await expect(page.getByTestId('background-study-scroll-checkbox')).toBeChecked()
  await expect(page.getByTestId('background-study-second-scroll-checkbox')).toBeChecked()
  await expect(page.getByTestId('background-veteran-perk-2-checkbox')).toBeChecked()
  await expect(page.getByTestId('background-veteran-perk-3-checkbox')).not.toBeChecked()
  await expect(page.getByTestId('background-veteran-perk-4-checkbox')).toBeChecked()
})

test('loading a legacy saved build clears current planner filters', async ({ page }) => {
  await gotoBuildPlanner(page)
  await seedSavedBuildRecords(page, [
    {
      createdAt: '2026-05-04T12:00:00.000Z',
      id: 'legacy-saved-build',
      name: 'Legacy clarity',
      optionalPerkIds: [],
      pickedPerkIds: ['perk.legend_clarity'],
      referenceVersion: '19.3.21',
      schemaVersion: 1,
      updatedAt: '2026-05-04T12:00:00.000Z',
    },
  ])
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()

  await page.getByRole('button', { name: 'Enable category Traits' }).click()
  await selectPerkGroup(page, 'Calm')
  await searchPerks(page, 'Berserk')

  await page.getByRole('button', { name: 'Filter perks' }).click()
  await page.getByTestId('origin-perk-groups-checkbox').check()
  await page.getByTestId('ancient-scroll-perk-groups-checkbox').uncheck()

  await page.getByRole('button', { name: 'Filter backgrounds' }).click()
  await page.getByTestId('origin-backgrounds-checkbox').check()
  await page.getByTestId('background-study-book-checkbox').uncheck()
  await page.getByTestId('background-study-scroll-checkbox').uncheck()
  await page.getByTestId('background-veteran-perk-3-checkbox').uncheck()

  await page.getByRole('button', { name: 'Saved builds' }).click()
  await page.getByRole('button', { name: 'Load saved build Legacy clarity' }).click()

  await expect(getBuildPerksBar(page).getByText('Clarity')).toBeVisible()
  await expect(page.getByLabel('Search perks')).toHaveValue('')
  await expect(page.getByRole('button', { name: 'Show all categories' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expectSearchParam(page, 'search', null)
  await expectSearchParam(page, 'category', null)
  await expectSearchParam(page, 'group-traits', null)
  await expectSearchParam(page, 'origin-perk-groups', null)
  await expectSearchParam(page, 'ancient-scroll-perk-groups', null)
  await expectSearchParam(page, 'origin-backgrounds', null)
  await expectSearchParam(page, 'background-book', null)
  await expectSearchParam(page, 'background-scroll', null)
  await expectSearchParam(page, 'background-veteran-perks', null)

  await page.getByRole('button', { name: 'Filter perks' }).click()
  await expect(page.getByTestId('origin-perk-groups-checkbox')).not.toBeChecked()
  await expect(page.getByTestId('ancient-scroll-perk-groups-checkbox')).toBeChecked()

  await page.getByRole('button', { name: 'Filter backgrounds' }).click()
  await expect(page.getByTestId('origin-backgrounds-checkbox')).not.toBeChecked()
  await expect(page.getByTestId('background-study-book-checkbox')).toBeChecked()
  await expect(page.getByTestId('background-study-scroll-checkbox')).toBeChecked()
  await expect(page.getByTestId('background-study-second-scroll-checkbox')).not.toBeChecked()
  await expect(page.getByTestId('background-veteran-perk-2-checkbox')).toBeChecked()
  await expect(page.getByTestId('background-veteran-perk-3-checkbox')).toBeChecked()
  await expect(page.getByTestId('background-veteran-perk-4-checkbox')).toBeChecked()
})

test('keeps local save and load controls usable on mobile', async ({ page }) => {
  await gotoBuildPlanner(page, { width: 390, height: 760 })

  await searchPerks(page, 'Axe Mastery')
  await addPerkToBuildFromResults(page, 'Axe Mastery')
  await expectNoDocumentHorizontalOverflow(page)

  await page.getByRole('button', { name: 'Saved builds' }).click()
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

  await page.getByRole('button', { name: 'Saved builds' }).click()
  await page.getByRole('button', { name: 'Load saved build Mobile axe' }).click()
  await expect(getBuildPerksBar(page).getByText('Axe Mastery')).toBeVisible()
  await expectNoDocumentHorizontalOverflow(page)
})

test('keeps many saved builds scrollable inside the saved builds dialog', async ({ page }) => {
  await gotoBuildPlanner(page, { width: 1280, height: 620 })
  await seedSavedBuildRecords(page, createOverflowSavedBuildRecords(12))
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()
  await expect(getBuildPerksBar(page)).toBeVisible()
  await expect(getBuildSharedGroupsList(page)).toBeVisible()
  await expect(getBuildIndividualGroupsList(page)).toBeVisible()

  await page.getByRole('button', { name: 'Saved builds' }).click()

  const savedBuildsDialog = page.getByRole('dialog', { name: 'Saved builds' })
  const savedBuildsList = page.getByTestId('saved-builds-list')
  const savedBuildCards = savedBuildsList.getByTestId('saved-build-card')

  await expect(savedBuildsDialog).toBeVisible()
  await expect(savedBuildCards).toHaveCount(12)
  await expect(savedBuildsList.getByText('Overflow build 12', { exact: true })).toBeVisible()

  const initialListMetrics = await savedBuildsList.evaluate((listElement) => {
    const dialogElement = listElement.closest('[role="dialog"]')

    if (!(dialogElement instanceof HTMLElement)) {
      return null
    }

    const listRectangle = listElement.getBoundingClientRect()
    const dialogRectangle = dialogElement.getBoundingClientRect()
    const listStyle = window.getComputedStyle(listElement)

    return {
      dialogBottom: dialogRectangle.bottom,
      documentVerticalOverflow: document.documentElement.scrollHeight - window.innerHeight,
      listBottom: listRectangle.bottom,
      listClientHeight: listElement.clientHeight,
      listScrollHeight: listElement.scrollHeight,
      overflowY: listStyle.overflowY,
    }
  })

  expect(initialListMetrics).not.toBeNull()
  expect(initialListMetrics!.listScrollHeight).toBeGreaterThan(initialListMetrics!.listClientHeight)
  expect(initialListMetrics!.overflowY).toBe('scroll')
  expect(initialListMetrics!.listBottom).toBeLessThanOrEqual(initialListMetrics!.dialogBottom + 1)
  expect(initialListMetrics!.documentVerticalOverflow).toBeLessThanOrEqual(2)

  await savedBuildsList.evaluate((listElement) => {
    listElement.scrollTop = listElement.scrollHeight
  })
  await expect
    .poll(() => savedBuildsList.evaluate((listElement) => listElement.scrollTop))
    .toBeGreaterThan(0)

  const oldestSavedBuildVisibility = await savedBuildsList
    .getByText('Overflow build 1', { exact: true })
    .evaluate((savedBuildNameElement) => {
      const listElement = savedBuildNameElement.closest('[data-testid="saved-builds-list"]')

      if (!(listElement instanceof HTMLElement)) {
        return null
      }

      const listRectangle = listElement.getBoundingClientRect()
      const savedBuildNameRectangle = savedBuildNameElement.getBoundingClientRect()

      return {
        listBottom: listRectangle.bottom,
        listTop: listRectangle.top,
        savedBuildNameBottom: savedBuildNameRectangle.bottom,
        savedBuildNameTop: savedBuildNameRectangle.top,
      }
    })

  expect(oldestSavedBuildVisibility).not.toBeNull()
  expect(oldestSavedBuildVisibility!.savedBuildNameTop).toBeGreaterThanOrEqual(
    oldestSavedBuildVisibility!.listTop,
  )
  expect(oldestSavedBuildVisibility!.savedBuildNameBottom).toBeLessThanOrEqual(
    oldestSavedBuildVisibility!.listBottom,
  )
})

test('overwrites a saved build after confirmation', async ({ page }) => {
  await gotoBuildPlanner(page)

  await searchPerks(page, 'Clarity')
  await addPerkToBuildFromResults(page, 'Clarity')

  await page.getByRole('button', { name: 'Saved builds' }).click()
  await expect(page.getByRole('dialog', { name: 'Saved builds' }).locator('p[title]')).toHaveCSS(
    'cursor',
    'help',
  )
  await page.getByLabel('Build name').fill('Overwrite target')
  await page.getByRole('button', { exact: true, name: 'Save current' }).click()
  await expect(page.getByRole('status')).toHaveText('Saved build')
  await page.getByRole('button', { name: 'Close saved builds' }).click()

  await clearBuildWithConfirmation(page)
  await searchPerks(page, 'Axe Mastery')
  await addPerkToBuildFromResults(page, 'Axe Mastery')

  await page.getByRole('button', { name: 'Saved builds' }).click()

  const savedBuild = page
    .getByTestId('saved-builds-list')
    .getByTestId('saved-build-card')
    .filter({ hasText: 'Overwrite target' })
  const overwriteSavedBuildButton = savedBuild.getByRole('button', {
    name: 'Overwrite saved build Overwrite target',
  })

  await expect(overwriteSavedBuildButton).toHaveText('Overwrite')
  await overwriteSavedBuildButton.click()
  await expect(
    savedBuild.getByRole('button', { name: 'Confirm overwrite saved build Overwrite target' }),
  ).toHaveText('Confirm?')
  await savedBuild
    .getByRole('button', { name: 'Confirm overwrite saved build Overwrite target' })
    .click()
  await expect(page.getByRole('status')).toHaveText('Saved build')

  await page.getByRole('button', { name: 'Close saved builds' }).click()
  await clearBuildWithConfirmation(page)
  await page.getByRole('button', { name: 'Saved builds' }).click()
  await savedBuild.getByRole('button', { name: 'Load saved build Overwrite target' }).click()

  await expect(getBuildPerksBar(page).getByText('Axe Mastery')).toBeVisible()
  await expect(getBuildPerksBar(page).getByText('Clarity')).toHaveCount(0)
})

test('keeps keyboard focus inside the saved builds dialog', async ({ page }) => {
  await gotoBuildPlanner(page)

  await searchPerks(page, 'Clarity')
  await addPerkToBuildFromResults(page, 'Clarity')

  const openSavedBuildsButton = page.getByRole('button', { name: 'Saved builds' })

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

  await page.getByRole('button', { name: 'Saved builds' }).click()
  await page.getByLabel('Build name').fill('Temporary clarity')
  await page.getByRole('button', { exact: true, name: 'Save current' }).click()
  await expect(page.getByTestId('saved-builds-list')).toContainText('Temporary clarity')

  await page.getByRole('button', { name: 'Delete saved build Temporary clarity' }).click()
  await expect(page.getByRole('status')).toHaveText('Deleted build')
  await expect(page.getByTestId('saved-builds-list')).not.toContainText('Temporary clarity')
  await expect(page.getByTestId('saved-builds-list')).toContainText('No saved builds yet.')
})
