import { expect, test } from '@playwright/test'
import {
  addPerkToBuildFromResults,
  expectNoDocumentHorizontalOverflow,
  getBackgroundFitPanel,
  getBuildPerksBar,
  getPerkDetailPanel,
  getSidebarPerkGroupButton,
  gotoPerksBrowser,
  searchPerks,
} from './support/perks-browser'

test('keeps the main build and filtering flow usable on mobile', async ({ page }) => {
  await gotoPerksBrowser(page, { width: 390, height: 844 })
  await expectNoDocumentHorizontalOverflow(page)

  await searchPerks(page, 'Axe Mastery')
  await addPerkToBuildFromResults(page, 'Axe Mastery')

  await expect(getBuildPerksBar(page).getByText('Axe Mastery')).toBeVisible()
  await expect(page.getByText('1 perk picked.')).toBeVisible()
  await expect(page.getByText(/Build slot \d+|Not in build/)).toHaveCount(0)

  const backgroundFitPanel = getBackgroundFitPanel(page)
  const perkDetailPanel = getPerkDetailPanel(page)
  const apprenticeCard = backgroundFitPanel
    .getByTestId('background-fit-card')
    .filter({ hasText: 'Apprentice' })
    .first()

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const backgroundFitPanelElement = document.querySelector(
          '[data-testid="background-fit-panel"]',
        )
        const perkDetailPanelElement = document.querySelector('[data-testid="perk-detail-panel"]')

        return {
          backgroundFitDirection:
            backgroundFitPanelElement instanceof HTMLElement
              ? window.getComputedStyle(backgroundFitPanelElement).flexDirection
              : null,
          perkDetailDirection:
            perkDetailPanelElement instanceof HTMLElement
              ? window.getComputedStyle(perkDetailPanelElement).flexDirection
              : null,
        }
      }),
    )
    .toEqual({
      backgroundFitDirection: 'column',
      perkDetailDirection: 'column',
    })
  await expect(backgroundFitPanel.getByLabel('Search backgrounds')).toBeVisible()
  await expect(
    perkDetailPanel.getByRole('button', { name: 'Collapse perk details' }),
  ).toHaveAttribute('aria-expanded', 'true')
  await backgroundFitPanel.getByRole('button', { name: 'Expand background Apprentice' }).click()
  await apprenticeCard.getByRole('button', { name: 'Select perk group Axe' }).click()

  await expect(page.getByLabel('Search perks')).toHaveValue('')
  await expect(page.getByRole('button', { name: 'Disable category Weapon' })).toBeVisible()
  await expect(getSidebarPerkGroupButton(page, 'Axe')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Inspect Axe Mastery' })).toBeVisible()

  await backgroundFitPanel.getByRole('button', { name: 'Collapse background fit' }).click()
  await expect(
    backgroundFitPanel.getByRole('button', { name: 'Expand background fit' }),
  ).toHaveAttribute('aria-expanded', 'false')
  await perkDetailPanel.getByRole('button', { name: 'Collapse perk details' }).click()
  await expect(
    perkDetailPanel.getByRole('button', { name: 'Expand perk details' }),
  ).toHaveAttribute('aria-expanded', 'false')
  await expect(perkDetailPanel.getByTestId('perk-detail-panel-body')).toBeHidden()
  await expectNoDocumentHorizontalOverflow(page)
})
