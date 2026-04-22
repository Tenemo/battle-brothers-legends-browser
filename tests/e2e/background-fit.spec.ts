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
  const apprenticeCard = backgroundFitPanel
    .locator('.background-fit-card')
    .filter({ hasText: 'Apprentice' })
    .first()

  await expect(backgroundFitPanel).toBeVisible()
  await expect(backgroundFitPanel.getByRole('button', { name: 'Collapse background fit' })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  await expect(backgroundFitPanel.getByText(/Ranked by guaranteed build weight first/i)).toBeVisible()
  await expect(backgroundFitPanel.getByRole('button', { name: 'Expand background Apprentice' })).toBeVisible()
  await expect(apprenticeCard.getByText('Up to 1/1 perks pickable')).toBeVisible()
  await expect(apprenticeCard.getByText('Guaranteed 1/1 perks pickable')).toBeVisible()
  await expect(apprenticeCard.getByText('1/1 matched group')).toBeVisible()
  await expect(apprenticeCard.getByText(/Maximum \d+ total groups/)).toBeVisible()
  await expect(apprenticeCard.locator('.background-fit-accordion-summary-row')).toHaveCount(2)
  await expect(apprenticeCard.locator('.background-fit-card-panel')).toHaveAttribute('aria-hidden', 'true')
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

  await backgroundFitPanel.getByRole('button', { name: 'Expand background Apprentice' }).click()
  await expect(apprenticeCard.locator('.background-fit-card-panel')).toHaveAttribute('aria-hidden', 'false')
  await expect(apprenticeCard.getByText('Guaranteed groups 1')).toBeVisible()

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

test('keeps dense background names readable from a shared build url and starts collapsed', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1400, height: 900 })
  await page.goto(
    '/?category=Other&group-other=Forceful&group-other=Ranger&group-other=Shady&build=Student&build=Muscularity&build=Battle+Forged&build=Immovable+Object&build=Brawny&build=Steadfast&build=Steel+Brow&build=Perfect+Fit&build=Axe+Mastery&build=Battle+Flow&build=Balance&build=Mind+over+Body&build=Lone+Wolf&build=Last+Stand&build=Berserk&build=Killing+Frenzy&build=Swagger&build=Rebound&build=Fortified+Mind&build=Hold+Out&build=Underdog&build=Assured+Conquest',
  )

  const backgroundFitPanel = getBackgroundFitPanel(page)

  await expect(backgroundFitPanel.getByRole('button', { name: 'Collapse background fit' })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  await expect(backgroundFitPanel.getByText(/Ranked by guaranteed build weight first/i)).toBeVisible()

  const hedgeKnightCard = backgroundFitPanel
    .locator('.background-fit-card')
    .filter({ hasText: 'Hedge Knight' })
    .first()
  const hedgeKnightHeading = hedgeKnightCard.locator('h3')
  const hedgeKnightPanel = hedgeKnightCard.locator('.background-fit-card-panel')

  await hedgeKnightHeading.scrollIntoViewIfNeeded()
  await expect(hedgeKnightHeading).toBeVisible()
  await expect(hedgeKnightPanel).toHaveAttribute('aria-hidden', 'true')
  await expect
    .poll(async () => {
      const hedgeKnightBoundingBox = await hedgeKnightHeading.boundingBox()

      return hedgeKnightBoundingBox === null
        ? null
        : {
            height: hedgeKnightBoundingBox.height,
            width: hedgeKnightBoundingBox.width,
          }
    })
    .toMatchObject({
      height: expect.any(Number),
      width: expect.any(Number),
    })
  const hedgeKnightBoundingBox = await hedgeKnightHeading.boundingBox()

  expect(hedgeKnightBoundingBox).not.toBeNull()
  expect(hedgeKnightBoundingBox!.width).toBeGreaterThan(90)
  expect(hedgeKnightBoundingBox!.width).toBeGreaterThan(hedgeKnightBoundingBox!.height * 2)
})
