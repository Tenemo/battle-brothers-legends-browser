import { expect, test } from '@playwright/test'
import {
  addPerkToBuildFromResults,
  expectViewportLocked,
  getBackgroundFitPanel,
  gotoPerksBrowser,
  mediumPerksBrowserViewport,
  searchPerks,
} from './support/perks-browser'

test('shows the background fit panel for a picked build and keeps the shell viewport-locked', async ({
  page,
}) => {
  await gotoPerksBrowser(page, mediumPerksBrowserViewport)
  await searchPerks(page, 'Axe Mastery')
  await addPerkToBuildFromResults(page, 'Axe Mastery')

  const backgroundFitPanel = getBackgroundFitPanel(page)

  await expect(backgroundFitPanel).toBeVisible()
  await expect(backgroundFitPanel.getByText(/Ranked by guaranteed build weight first/i)).toBeVisible()
  await expect(backgroundFitPanel.getByText('Apprentice')).toBeVisible()
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const backgroundFitPanelBody = document.querySelector(
          '[data-testid="background-fit-panel-body"]',
        ) as HTMLElement | null

        return backgroundFitPanelBody === null
          ? Number.POSITIVE_INFINITY
          : backgroundFitPanelBody.scrollWidth - backgroundFitPanelBody.clientWidth
      }),
    )
    .toBeLessThanOrEqual(1)

  await backgroundFitPanel.getByRole('button', { name: 'Collapse background fit' }).click()
  await expect(
    backgroundFitPanel.getByRole('button', { name: 'Expand background fit' }),
  ).toHaveAttribute('aria-expanded', 'false')
  await expect(backgroundFitPanel.getByText('Background fit')).toBeVisible()

  await backgroundFitPanel.getByRole('button', { name: 'Expand background fit' }).click()
  await expect(
    backgroundFitPanel.getByRole('button', { name: 'Collapse background fit' }),
  ).toHaveAttribute('aria-expanded', 'true')

  await expectViewportLocked(page)
})
