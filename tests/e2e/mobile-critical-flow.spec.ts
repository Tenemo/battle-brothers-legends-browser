import { expect, test } from '@playwright/test'
import {
  addPerkToBuildFromResults,
  expectNoDocumentHorizontalOverflow,
  getBackgroundFitPanel,
  getBuildPerksBar,
  getDetailPanel,
  getSidebarPerkGroupButton,
  gotoBuildPlanner,
  searchPerks,
} from './support/build-planner-page'

test('keeps the main build and filtering flow usable on mobile', async ({ page }) => {
  await gotoBuildPlanner(page, { width: 390, height: 844 })
  await expectNoDocumentHorizontalOverflow(page)

  await searchPerks(page, 'Axe Mastery')
  await addPerkToBuildFromResults(page, 'Axe Mastery')

  await expect(getBuildPerksBar(page).getByText('Axe Mastery')).toBeVisible()
  await expect(page.getByText('1 perk picked.')).toBeVisible()
  await expect(page.getByText(/Build slot \d+|Not in build/)).toHaveCount(0)

  const backgroundFitPanel = getBackgroundFitPanel(page)
  const detailPanel = getDetailPanel(page)

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const backgroundFitPanelElement = document.querySelector(
          '[data-testid="background-fit-panel"]',
        )
        const detailPanelElement = document.querySelector('[data-testid="detail-panel"]')

        return {
          backgroundFitDirection:
            backgroundFitPanelElement instanceof HTMLElement
              ? window.getComputedStyle(backgroundFitPanelElement).flexDirection
              : null,
          perkDetailDirection:
            detailPanelElement instanceof HTMLElement
              ? window.getComputedStyle(detailPanelElement).flexDirection
              : null,
        }
      }),
    )
    .toEqual({
      backgroundFitDirection: 'column',
      perkDetailDirection: 'column',
    })
  await expect(backgroundFitPanel.getByLabel('Search backgrounds')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Collapse detail panel' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Collapse category filters' })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  await backgroundFitPanel.getByRole('button', { name: 'Inspect background Apprentice' }).click()
  await detailPanel.getByRole('button', { name: 'Select perk group Axe' }).click()

  await expect(page.getByLabel('Search perks')).toHaveValue('')
  await expect(page.getByRole('button', { name: 'Disable category Weapon' })).toBeVisible()
  await expect(getSidebarPerkGroupButton(page, 'Axe')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Inspect Axe Mastery' })).toBeVisible()

  await backgroundFitPanel.getByRole('button', { name: 'Collapse background fit' }).click()
  await expect(
    backgroundFitPanel.getByRole('button', { name: 'Expand background fit' }),
  ).toHaveAttribute('aria-expanded', 'false')
  await page.getByRole('button', { name: 'Collapse category filters' }).click()
  await expect(page.getByRole('button', { name: 'Expand category filters' })).toHaveAttribute(
    'aria-expanded',
    'false',
  )
  await expect(page.getByTestId('category-sidebar-body')).toBeHidden()
  await expect(detailPanel.getByTestId('detail-panel-body')).toBeVisible()
  await expectNoDocumentHorizontalOverflow(page)
})
