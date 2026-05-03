import { expect, test, type Locator } from '@playwright/test'
import {
  getDetailPanel,
  expectSearchParam,
  getBackgroundFitPanel,
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

async function expectImageToLoad(imageLocator: Locator): Promise<void> {
  await expect
    .poll(() =>
      imageLocator.evaluate(
        (element) =>
          element instanceof HTMLImageElement &&
          element.complete &&
          element.naturalWidth > 0 &&
          element.naturalHeight > 0,
      ),
    )
    .toBe(true)
}

const reportedPeddlerStudyResourceBuildUrl =
  '/?build=Muscularity,Brawny,Perfect+Fit,Colossus,Perfect+Focus,Athlete,Clarity,Lithe,Polearm+Mastery,Heightened+Reflexes,Alert,Onslaught,Berserk,Killing+Frenzy,In+the+Zone,First+Blood,Double+Strike,Bloody+Harvest&optional=Berserk,Killing+Frenzy,In+the+Zone,First+Blood,Double+Strike,Bloody+Harvest'

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
  await expectSearchParam(page, 'category', null)
})

test('deselects an inspected result perk when it is clicked again', async ({ page }) => {
  await gotoBuildPlanner(page)

  await searchPerks(page, 'Berserk')
  await inspectPerkFromResults(page, 'Berserk')

  const detailPanel = getDetailPanel(page)
  const selectedResultRows = getResultsList(page).locator(
    '[data-testid="perk-row"][data-selected="true"]',
  )

  await expect(detailPanel.getByRole('heading', { level: 2, name: 'Berserk' })).toBeVisible()
  await expect(selectedResultRows).toHaveCount(1)
  await expectSearchParam(page, 'detail', 'perk')

  await inspectPerkFromResults(page, 'Berserk')

  await expect(
    detailPanel.getByRole('heading', { level: 2, name: 'Select a perk or background' }),
  ).toBeVisible()
  await expect(selectedResultRows).toHaveCount(0)
  await expectSearchParam(page, 'detail', null)
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

test('shows imported background metadata only in the background detail panel', async ({ page }) => {
  await gotoBuildPlanner(page)

  const backgroundFitPanel = getBackgroundFitPanel(page)
  const expandBackgroundFitButton = backgroundFitPanel.getByRole('button', {
    name: 'Expand background fit',
  })

  if (await expandBackgroundFitButton.isVisible()) {
    await expandBackgroundFitButton.click()
  }

  await backgroundFitPanel.getByLabel('Search backgrounds').fill('Peddler')
  await backgroundFitPanel.getByRole('button', { name: 'Inspect background Peddler' }).click()

  const detailPanel = getDetailPanel(page)
  const metadataSection = detailPanel.getByTestId('detail-background-metadata-section')
  const metadataToggle = metadataSection.getByRole('button', { name: 'Background details' })

  await expect(metadataSection).toHaveJSProperty('tagName', 'SECTION')
  await expect(metadataSection.getByRole('heading', { name: 'Background details' })).toBeVisible()
  await expect(metadataToggle).toHaveAttribute('aria-expanded', 'false')
  await expect(metadataSection.getByText('Daily cost')).toHaveCount(0)

  await metadataToggle.click()

  await expect(metadataToggle).toHaveAttribute('aria-expanded', 'true')
  await expect(metadataSection.getByText('Daily cost:')).toBeVisible()
  await expect(metadataSection.getByText('6')).toBeVisible()
  await expect(metadataSection.getByText('Background type:')).toBeVisible()
  await expect(metadataSection.getByText('Lowborn')).toBeVisible()
  await expect(metadataSection.getByText('Bartering')).toBeVisible()
  await expect(metadataSection.getByText('+13')).toHaveCount(2)
  const metadataParentHeading = metadataToggle
    .locator('span')
    .filter({ hasText: /^Background details$/u })
    .first()
  const excludedTraitsHeading = metadataSection.getByRole('heading', {
    level: 4,
    name: 'Excluded traits',
  })
  const metadataParentHeadingFontSize = await metadataParentHeading.evaluate((element) =>
    Number.parseFloat(window.getComputedStyle(element).fontSize),
  )
  const excludedTraitsHeadingFontSize = await excludedTraitsHeading.evaluate((element) =>
    Number.parseFloat(window.getComputedStyle(element).fontSize),
  )

  await expect(excludedTraitsHeading).toBeVisible()
  expect(excludedTraitsHeadingFontSize).toBeLessThan(metadataParentHeadingFontSize)
  const fearUndeadTraitPill = metadataSection.getByRole('button', { name: 'Fear Undead' })
  const aggressiveTraitPill = metadataSection.getByRole('button', { name: 'Aggressive' })
  const martialTraitPill = metadataSection.getByRole('button', { name: 'Martial' })
  const fearUndeadTraitIcon = fearUndeadTraitPill.getByTestId('detail-background-trait-icon')
  const aggressiveTraitIcon = aggressiveTraitPill.getByTestId('detail-background-trait-icon')
  const martialTraitIcon = martialTraitPill.getByTestId('detail-background-trait-icon')

  await expect(fearUndeadTraitIcon).toHaveAttribute(
    'src',
    /\/game-icons\/ui\/traits\/trait_icon_47\.png$/u,
  )
  await expect(aggressiveTraitIcon).toHaveAttribute(
    'src',
    /\/game-icons\/ui\/traits\/aggressive_trait\.png$/u,
  )
  await expect(martialTraitIcon).toHaveAttribute(
    'src',
    /\/game-icons\/ui\/traits\/firm_trait\.png$/u,
  )
  await expectImageToLoad(fearUndeadTraitIcon)
  await expectImageToLoad(aggressiveTraitIcon)
  await expectImageToLoad(martialTraitIcon)
  await aggressiveTraitPill.hover()
  const traitTooltip = page.getByTestId('detail-background-trait-tooltip')

  await expect(traitTooltip).toBeVisible()
  await expect(traitTooltip).toContainText(
    'This character is pretty aggressive, even to their own detriment.',
  )
  await expect(traitTooltip).not.toContainText('This background excludes this trait')
  await expect(backgroundFitPanel.getByText('Daily cost')).toHaveCount(0)
  await expect(backgroundFitPanel.getByText('Bartering')).toHaveCount(0)
})

test('keeps camp skill metadata rows tucked under their heading', async ({ page }) => {
  await gotoBuildPlanner(page)

  const backgroundFitPanel = getBackgroundFitPanel(page)
  const expandBackgroundFitButton = backgroundFitPanel.getByRole('button', {
    name: 'Expand background fit',
  })

  if (await expandBackgroundFitButton.isVisible()) {
    await expandBackgroundFitButton.click()
  }

  await backgroundFitPanel.getByLabel('Search backgrounds').fill('Vagabond')
  await backgroundFitPanel.getByRole('button', { name: /Inspect background Vagabond/u }).click()

  const detailPanel = getDetailPanel(page)
  const metadataSection = detailPanel.getByTestId('detail-background-metadata-section')
  const metadataToggle = metadataSection.getByRole('button', { name: 'Background details' })

  await metadataToggle.click()
  await expect(metadataToggle).toHaveAttribute('aria-expanded', 'true')
  await expect(metadataSection.getByText('Camp skills')).toBeVisible()
  await expect(metadataSection.getByText('Scouting', { exact: true })).toBeVisible()
  await expect(metadataSection.getByText('Gathering', { exact: true })).toBeVisible()

  const campSkillMetrics = await metadataSection.evaluate((section) => {
    const headingElements = [...section.querySelectorAll('h4')]
    const campSkillsHeading = headingElements.find(
      (headingElement) => headingElement.textContent?.trim() === 'Camp skills',
    )
    const campSkillsSection = campSkillsHeading?.parentElement
    const firstCampSkillRow = campSkillsSection?.querySelector('li')

    if (
      !(campSkillsHeading instanceof HTMLElement) ||
      !(campSkillsSection instanceof HTMLElement) ||
      !(firstCampSkillRow instanceof HTMLElement)
    ) {
      return null
    }

    const headingRectangle = campSkillsHeading.getBoundingClientRect()
    const firstRowRectangle = firstCampSkillRow.getBoundingClientRect()

    return {
      headingHeight: headingRectangle.height,
      headingToFirstRowDistance: firstRowRectangle.top - headingRectangle.top,
    }
  })

  expect(campSkillMetrics).not.toBeNull()
  expect(campSkillMetrics!.headingHeight).toBeLessThan(24)
  expect(campSkillMetrics!.headingToFirstRowDistance).toBeLessThanOrEqual(28)
})

test('shows the dominant study resource strategy for the reported Peddler build', async ({
  page,
}) => {
  await page.setViewportSize({ height: 720, width: 900 })
  await page.goto(reportedPeddlerStudyResourceBuildUrl)
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()

  const backgroundFitPanel = getBackgroundFitPanel(page)
  const expandBackgroundFitButton = backgroundFitPanel.getByRole('button', {
    name: 'Expand background fit',
  })

  if (await expandBackgroundFitButton.isVisible()) {
    await expandBackgroundFitButton.click()
  }

  await backgroundFitPanel.getByLabel('Search backgrounds').fill('Peddler')
  await backgroundFitPanel.getByRole('button', { name: 'Inspect background Peddler' }).click()

  const detailPanel = getDetailPanel(page)
  const studyResourcePlan = detailPanel.getByTestId('detail-study-resource-plan')
  const mustHaveStudyResourcePlan = studyResourcePlan
    .getByTestId('detail-study-resource-plan-scope')
    .filter({ hasText: 'Must-have impact' })

  await expect(detailPanel.getByRole('heading', { level: 2, name: 'Peddler' })).toBeVisible()
  await expect(mustHaveStudyResourcePlan.getByText('Ancient scroll:')).toBeVisible()
  await expect(mustHaveStudyResourcePlan.getByText('Berserker')).toBeVisible()
  await expect(mustHaveStudyResourcePlan.getByText('Skill book:')).toBeVisible()
  await expect(mustHaveStudyResourcePlan.getByText('Medium Armor or Fit')).toBeVisible()
  await expect(studyResourcePlan.getByText('Heavy Armor')).toHaveCount(0)
})

test('detail history buttons stay inside page detail history', async ({ page }) => {
  await page.goto('about:blank')
  await gotoBuildPlanner(page)

  await searchPerks(page, 'Berserk')
  await inspectPerkFromResults(page, 'Berserk')

  const detailPanel = getDetailPanel(page)
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

test('keeps raw perk group flavour strings out of perk detail content', async ({ page }) => {
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
