import { expect, test } from '@playwright/test'
import {
  getPerkDetailPanel,
  getSidebarPerkGroupButton,
  getResultsList,
  gotoBuildPlanner,
  inspectPerkFromResults,
  searchPerks,
} from './support/build-planner-page'

function readBackgroundSourceProbabilityLabel(label: string): number {
  const normalizedLabel = label.trim()

  if (normalizedLabel === 'Guaranteed') {
    return 1
  }

  const chanceMatch = /^<?([\d.]+)% chance$/u.exec(normalizedLabel)

  if (!chanceMatch) {
    throw new Error(`Unexpected background source probability label: ${label}`)
  }

  return Number(chanceMatch[1]) / 100
}

test('starts with an empty detail panel until a perk or background is selected', async ({
  page,
}) => {
  await gotoBuildPlanner(page)

  await expect(
    page.getByRole('heading', { level: 2, name: 'Select a perk or background' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Show all categories' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByTestId('perk-row').first()).toBeVisible()
  await expect(page.locator('[data-testid="perk-row"][data-selected="true"]')).toHaveCount(0)
  await expect.poll(() => new URL(page.url()).searchParams.get('category')).toBeNull()
})

test('deselects an inspected result perk when it is clicked again', async ({ page }) => {
  await gotoBuildPlanner(page)

  await searchPerks(page, 'Berserk')
  await inspectPerkFromResults(page, 'Berserk')

  const detailPanel = getPerkDetailPanel(page)
  const selectedResultRows = getResultsList(page).locator(
    '[data-testid="perk-row"][data-selected="true"]',
  )

  await expect(detailPanel.getByRole('heading', { level: 2, name: 'Berserk' })).toBeVisible()
  await expect(selectedResultRows).toHaveCount(1)
  await expect.poll(() => new URL(page.url()).searchParams.get('detail')).toBe('perk')

  await inspectPerkFromResults(page, 'Berserk')

  await expect(
    detailPanel.getByRole('heading', { level: 2, name: 'Select a perk or background' }),
  ).toBeVisible()
  await expect(selectedResultRows).toHaveCount(0)
  await expect.poll(() => new URL(page.url()).searchParams.get('detail')).toBeNull()
})

test('groups repeated background sources in the detail panel', async ({ page }) => {
  await gotoBuildPlanner(page)

  await searchPerks(page, 'Perfect Focus')
  await inspectPerkFromResults(page, 'Perfect Focus')

  const backgroundSourcesSection = page
    .getByTestId('detail-section')
    .filter({ has: page.getByRole('heading', { level: 3, name: 'Background sources' }) })

  await expect(page.getByRole('heading', { level: 2, name: 'Perfect Focus' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Background sources' })).toBeVisible()
  await expect(
    backgroundSourcesSection
      .getByTestId('detail-background-source-names')
      .getByText(/Anatomist.*Beast Slayer.*Youngblood/i),
  ).toBeVisible()
  const groupedBackgroundSourceRow = backgroundSourcesSection.locator('li').filter({
    hasText: /Anatomist.*Beast Slayer.*Youngblood/i,
  })
  const backgroundSourceNamesFontWeight = await groupedBackgroundSourceRow
    .getByTestId('detail-background-source-names')
    .evaluate((element) => window.getComputedStyle(element).fontWeight)

  expect(Number(backgroundSourceNamesFontWeight)).toBeLessThan(600)
  await expect(groupedBackgroundSourceRow.getByText('Guaranteed')).toBeVisible()
})

test('detail history buttons stay inside page detail history', async ({ page }) => {
  await page.goto('about:blank')
  await gotoBuildPlanner(page)

  await searchPerks(page, 'Berserk')
  await inspectPerkFromResults(page, 'Berserk')

  const detailPanel = getPerkDetailPanel(page)
  const previousDetailButton = detailPanel.getByRole('button', { name: 'Show previous detail' })
  const nextDetailButton = detailPanel.getByRole('button', { name: 'Show next detail' })
  const buildToggleButton = detailPanel.getByRole('button', { name: 'Add Berserk to build' })
  const buildToggleControl = detailPanel.getByTestId('build-toggle-split-button')

  await expect(detailPanel.getByRole('heading', { level: 2, name: 'Berserk' })).toBeVisible()
  await expect(previousDetailButton).toBeVisible()
  await expect(nextDetailButton).toBeVisible()
  await expect(previousDetailButton).toBeDisabled()
  await expect(nextDetailButton).toBeDisabled()
  await expect(buildToggleButton).toBeVisible()
  await expect(detailPanel.getByRole('button', { name: 'Add Berserk as optional' })).toBeVisible()
  const detailActionButtonSizes = await Promise.all(
    [previousDetailButton, nextDetailButton, buildToggleControl].map((button) =>
      button.evaluate((element) => {
        const rectangle = element.getBoundingClientRect()

        return {
          height: Math.round(rectangle.height),
          width: Math.round(rectangle.width),
        }
      }),
    ),
  )

  expect(detailActionButtonSizes[2].height).toEqual(detailActionButtonSizes[0].height)
  expect(detailActionButtonSizes[2].width).toBeGreaterThan(detailActionButtonSizes[0].width)
  expect(detailActionButtonSizes[2].width).toBeLessThan(
    detailActionButtonSizes[0].width + detailActionButtonSizes[1].width,
  )
  const detailActionButtonLayout = await Promise.all(
    [previousDetailButton, nextDetailButton, buildToggleControl].map((button) =>
      button.evaluate((element) => {
        const rectangle = element.getBoundingClientRect()

        return {
          bottom: rectangle.bottom,
          top: rectangle.top,
        }
      }),
    ),
  )
  const arrowsBottom = Math.max(
    detailActionButtonLayout[0].bottom,
    detailActionButtonLayout[1].bottom,
  )

  expect(detailActionButtonLayout[2].top).toBeGreaterThanOrEqual(arrowsBottom)

  await searchPerks(page, 'Hold Out')
  await inspectPerkFromResults(page, 'Hold Out')
  await detailPanel.getByRole('button', { name: 'Select perk group Tenacious' }).click()

  await expect(detailPanel.getByRole('heading', { level: 2, name: 'Hold Out' })).toBeVisible()
  await expect(page.getByLabel('Search perks')).toHaveValue('')
  await expect(previousDetailButton).toBeEnabled()
  await expect(nextDetailButton).toBeDisabled()

  await previousDetailButton.click()

  await expect(detailPanel.getByRole('heading', { level: 2, name: 'Berserk' })).toBeVisible()
  await expect(detailPanel.getByRole('heading', { level: 2, name: 'Hold Out' })).toHaveCount(0)
  await expect(previousDetailButton).toBeDisabled()
  await expect(nextDetailButton).toBeEnabled()

  await nextDetailButton.click()

  await expect(detailPanel.getByRole('heading', { level: 2, name: 'Hold Out' })).toBeVisible()
  await expect(previousDetailButton).toBeEnabled()
  await expect(nextDetailButton).toBeDisabled()
})

test('shows favoured enemy targets and scenario overlays for enemy perks', async ({ page }) => {
  await gotoBuildPlanner(page)

  await searchPerks(page, 'Favoured Enemy - Beasts')
  await inspectPerkFromResults(page, 'Favoured Enemy - Beasts')

  await expect(
    page.getByRole('heading', { level: 3, name: 'Favoured enemy targets' }),
  ).toBeVisible()
  await expect(page.getByText('Bear', { exact: true })).toBeVisible()
  await expect(page.getByText('Spider', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Scenario overlays' })).toBeVisible()
  await expect(
    page.getByText(/Random pool: Favoured Enemy - Occult, Favoured Enemy - Beasts/i),
  ).toBeVisible()
  await expect(page.getByText('Guaranteed').first()).toBeVisible()

  await expect(
    getResultsList(page).getByRole('button', {
      name: 'Inspect Favoured Enemy - Beasts',
    }),
  ).toBeVisible()
})

test('shows inferred random-fill background sources with calculated chance', async ({ page }) => {
  await gotoBuildPlanner(page)

  await searchPerks(page, 'Alert')
  await inspectPerkFromResults(page, 'Alert')

  const backgroundSourcesSection = page
    .getByTestId('detail-section')
    .filter({ has: page.getByRole('heading', { level: 3, name: 'Background sources' }) })
  const hedgeKnightBackgroundSourceRow = backgroundSourcesSection.locator('li').filter({
    hasText: /Hedge Knight/,
  })

  await expect(page.getByRole('heading', { level: 2, name: 'Alert' })).toBeVisible()
  await expect(hedgeKnightBackgroundSourceRow.getByText('12.5% chance')).toBeVisible()
  await expect(backgroundSourcesSection.getByText('Traits / Calm')).toHaveCount(0)
})

test('merges background sources with the same probability across perk groups', async ({ page }) => {
  await gotoBuildPlanner(page)

  await searchPerks(page, 'Prayer of Hope')
  await inspectPerkFromResults(page, 'Prayer of Hope')

  const backgroundSourcesSection = page
    .getByTestId('detail-section')
    .filter({ has: page.getByRole('heading', { level: 3, name: 'Background sources' }) })
  const guaranteedBackgroundSourceRows = backgroundSourcesSection
    .locator('li')
    .filter({ has: page.getByTestId('detail-badge').getByText('Guaranteed', { exact: true }) })
  const daytalerBackgroundSourceRow = backgroundSourcesSection.locator('li').filter({
    has: page.getByTestId('detail-background-source-names').getByText('Daytaler', { exact: true }),
  })
  const roundedChanceBackgroundSourceRows = backgroundSourcesSection.locator('li').filter({
    has: page.getByTestId('detail-badge').getByText('0.1% chance', { exact: true }),
  })

  await expect(page.getByRole('heading', { level: 2, name: 'Prayer of Hope' })).toBeVisible()
  await expect(guaranteedBackgroundSourceRows).toHaveCount(1)
  await expect(
    guaranteedBackgroundSourceRows
      .getByTestId('detail-background-source-names')
      .getByText(/Battle Sister.*Druid.*Youngblood/i),
  ).toBeVisible()
  await expect(daytalerBackgroundSourceRow.getByText('2.1% chance')).toBeVisible()
  await expect(roundedChanceBackgroundSourceRows).toHaveCount(1)
  await expect(
    roundedChanceBackgroundSourceRows.getByTestId('detail-background-source-names'),
  ).toContainText('Caravan Hand')
  await expect(
    roundedChanceBackgroundSourceRows.getByTestId('detail-background-source-names'),
  ).toContainText('Indebted')
  await expect(
    roundedChanceBackgroundSourceRows.getByTestId('detail-background-source-names'),
  ).toContainText('Retired Soldier')
  await expect(backgroundSourcesSection.getByText('Class / Faith')).toHaveCount(0)
  await expect(backgroundSourcesSection.getByText('Magic / Druidic Arts')).toHaveCount(0)
})

test('sorts background sources from guaranteed to lowest chance', async ({ page }) => {
  await gotoBuildPlanner(page)

  await searchPerks(page, 'Alert')
  await inspectPerkFromResults(page, 'Alert')

  const backgroundSourcesSection = page
    .getByTestId('detail-section')
    .filter({ has: page.getByRole('heading', { level: 3, name: 'Background sources' }) })
  const probabilityLabels = await backgroundSourcesSection
    .getByTestId('detail-badge')
    .allTextContents()
  const probabilities = probabilityLabels.map(readBackgroundSourceProbabilityLabel)

  expect(probabilities.length).toBeGreaterThan(1)

  for (let index = 1; index < probabilities.length; index += 1) {
    expect(probabilities[index - 1]).toBeGreaterThanOrEqual(probabilities[index])
  }
})

test('keeps raw perk group flavour strings out of perk details', async ({ page }) => {
  await gotoBuildPlanner(page)

  await searchPerks(page, 'Favoured Enemy - Civilization')
  await inspectPerkFromResults(page, 'Favoured Enemy - Civilization')

  const perkGroupPlacementSection = page
    .getByTestId('detail-section')
    .filter({ has: page.getByRole('heading', { level: 3, name: 'Perk group placement' }) })
  const civilizationPlacementTile = perkGroupPlacementSection
    .getByTestId('planner-group-card')
    .filter({ hasText: 'Civilization' })

  await expect(civilizationPlacementTile).toHaveAttribute('data-testid', 'planner-group-card')
  await expect(
    civilizationPlacementTile.getByRole('img', { name: 'Civilization perk group icon' }),
  ).toBeVisible()
  await expect(civilizationPlacementTile.getByTestId('detail-placement-tier-badge')).toHaveText(
    'Tier 5',
  )
  await expect(
    civilizationPlacementTile.getByRole('button', { name: 'Favoured Enemy - Civilization' }),
  ).toBeVisible()
  await expect(perkGroupPlacementSection.getByText('law-abiding fools')).toHaveCount(0)

  await civilizationPlacementTile
    .getByRole('button', { name: 'Select perk group Civilization' })
    .click()

  await expect(page.getByLabel('Search perks')).toHaveValue('')
  await expect(page.getByRole('button', { name: 'Disable category Enemy' })).toBeVisible()
  await expect(getSidebarPerkGroupButton(page, 'Civilization')).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  await civilizationPlacementTile
    .getByRole('button', { name: 'Select perk group Civilization' })
    .click()

  await expect(page.getByRole('button', { name: 'Enable category Enemy' })).toBeVisible()
  await expect(getSidebarPerkGroupButton(page, 'Civilization')).toHaveCount(0)
})
