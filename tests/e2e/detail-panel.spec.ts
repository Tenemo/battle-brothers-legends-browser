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

const maximumTypographyFontSizeDifference = 0.1

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

const reportedRangerChanceExplanationBuildUrl =
  '/?detail=background&background=background.legend_ranger&background-source=legend-ranger&build=Devastating+Strikes,Pathfinder,Lookout,Bullseye,Keen+Eyesight,Dodge,Relentless,Greed,Heightened+Reflexes,Berserk,Poison+Mastery,Nightvision,Ballistics,Anticipation,Perfect+Fit,Alert,Brawny,Muscularity&optional=Poison+Mastery,Nightvision,Ballistics,Anticipation,Perfect+Fit,Alert,Brawny,Muscularity'

const reportedHunterChanceExplanationBuildUrl =
  '/?detail=background&background=background.hunter&background-source=hunter&build=Devastating+Strikes,Pathfinder,Lookout,Bullseye,Keen+Eyesight,Dodge,Relentless,Greed,Heightened+Reflexes,Berserk,Poison+Mastery,Nightvision,Ballistics,Anticipation,Perfect+Fit,Alert,Brawny,Muscularity&optional=Poison+Mastery,Nightvision,Ballistics,Anticipation,Perfect+Fit,Alert,Brawny,Muscularity'

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
  const fearUndeadTraitPill = metadataSection.getByRole('button', { name: 'Fear of Undead' })
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
  const traitTooltip = page.getByTestId('detail-background-trait-tooltip')

  await fearUndeadTraitPill.hover()
  await expect(traitTooltip).toBeVisible()
  await expect(traitTooltip).toContainText(
    'Some past event or particularly convincing story in this character',
  )

  await aggressiveTraitPill.hover()
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
  await expect(
    metadataSection.getByTestId('detail-camp-resource-modifier-value').first(),
  ).toHaveText(/^\+/u)

  const campModifierTypography = await detailPanel.evaluate((panel) => {
    function parsePixelValue(value: string) {
      const parsedValue = Number.parseFloat(value)

      return Number.isFinite(parsedValue) ? parsedValue : Number.POSITIVE_INFINITY
    }

    const campLabel = panel.querySelector('[data-testid="detail-camp-resource-modifier-label"]')
    const campValue = panel.querySelector('[data-testid="detail-camp-resource-modifier-value"]')
    const fitLabel = panel.querySelector('[data-testid="background-fit-summary-label"]')
    const fitValue = panel.querySelector('[data-testid="background-fit-summary-value"]')

    if (
      !(campLabel instanceof HTMLElement) ||
      !(campValue instanceof HTMLElement) ||
      !(fitLabel instanceof HTMLElement) ||
      !(fitValue instanceof HTMLElement)
    ) {
      return null
    }

    const campLabelStyle = window.getComputedStyle(campLabel)
    const campValueStyle = window.getComputedStyle(campValue)
    const fitLabelStyle = window.getComputedStyle(fitLabel)
    const fitValueStyle = window.getComputedStyle(fitValue)

    return {
      campLabelFontSize: parsePixelValue(campLabelStyle.fontSize),
      campValueBackgroundImage: campValueStyle.backgroundImage,
      campValueBorderRadius: campValueStyle.borderRadius,
      campValueFontSize: parsePixelValue(campValueStyle.fontSize),
      fitLabelFontSize: parsePixelValue(fitLabelStyle.fontSize),
      fitValueFontSize: parsePixelValue(fitValueStyle.fontSize),
    }
  })

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

  expect(campModifierTypography).not.toBeNull()
  expect(
    Math.abs(campModifierTypography!.campLabelFontSize - campModifierTypography!.fitLabelFontSize),
  ).toBeLessThanOrEqual(maximumTypographyFontSizeDifference)
  expect(
    Math.abs(campModifierTypography!.campValueFontSize - campModifierTypography!.fitValueFontSize),
  ).toBeLessThanOrEqual(maximumTypographyFontSizeDifference)
  expect(campModifierTypography!.campValueBackgroundImage).toBe('none')
  expect(campModifierTypography!.campValueBorderRadius).toBe('0px')
  expect(campSkillMetrics).not.toBeNull()
  expect(campSkillMetrics!.headingHeight).toBeLessThan(24)
  expect(campSkillMetrics!.headingToFirstRowDistance).toBeLessThanOrEqual(28)

  const campModifierValueSpacingMetrics = await metadataSection.evaluate((section) => {
    return [...section.querySelectorAll('[data-testid="detail-camp-resource-modifier-columns"] li')]
      .map((row) => {
        const label = row.querySelector('[data-testid="detail-camp-resource-modifier-label"]')
        const value = row.querySelector('[data-testid="detail-camp-resource-modifier-value"]')

        if (
          !(row instanceof HTMLElement) ||
          !(label instanceof HTMLElement) ||
          !(value instanceof HTMLElement)
        ) {
          return null
        }

        const labelRectangle = label.getBoundingClientRect()
        const rowRectangle = row.getBoundingClientRect()
        const valueRectangle = value.getBoundingClientRect()

        return {
          distanceFromLabel: valueRectangle.left - labelRectangle.right,
          isValueBeforeRowMiddle: valueRectangle.left < rowRectangle.left + rowRectangle.width / 2,
        }
      })
      .filter((metric) => metric !== null)
  })

  expect(campModifierValueSpacingMetrics.length).toBeGreaterThan(0)
  expect(
    campModifierValueSpacingMetrics.every(
      (metric) => metric.distanceFromLabel <= 16 && metric.isValueBeforeRowMiddle,
    ),
  ).toBe(true)
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
  const backgroundFitTables = detailPanel.getByTestId('detail-background-fit-tables')
  const metricSummary = backgroundFitTables.getByTestId('background-fit-summary-table')
  const studyResourcePlan = detailPanel.getByTestId('detail-study-resource-plan')
  const mustHaveStudyResourcePlan = studyResourcePlan
    .getByTestId('detail-study-resource-plan-scope')
    .filter({ hasText: 'Must-have book/scroll usage' })
  const fullBuildStudyResourcePlan = studyResourcePlan
    .getByTestId('detail-study-resource-plan-scope')
    .filter({ hasText: 'Full-build book/scroll usage' })

  await expect(detailPanel.getByRole('heading', { level: 2, name: 'Peddler' })).toBeVisible()
  await expect(metricSummary).toBeVisible()
  await expect(backgroundFitTables.getByTestId('detail-chance-breakdown')).toHaveCount(0)
  const studyResourcePlanSpacing = await studyResourcePlan.evaluate((plan) => {
    const previousElement = plan.previousElementSibling

    if (!(previousElement instanceof HTMLElement)) {
      return null
    }

    return plan.getBoundingClientRect().top - previousElement.getBoundingClientRect().bottom
  })
  const studyResourceScopeSpacing = await studyResourcePlan.evaluate((plan) => {
    const scopeElements = [
      ...plan.querySelectorAll('[data-testid="detail-study-resource-plan-scope"]'),
    ]

    if (scopeElements.length < 2) {
      return null
    }

    const firstScopeElement = scopeElements[0]
    const secondScopeElement = scopeElements[1]

    if (
      !(firstScopeElement instanceof HTMLElement) ||
      !(secondScopeElement instanceof HTMLElement)
    ) {
      return null
    }

    return (
      secondScopeElement.getBoundingClientRect().top -
      firstScopeElement.getBoundingClientRect().bottom
    )
  })

  expect(studyResourcePlanSpacing).not.toBeNull()
  expect(studyResourcePlanSpacing!).toBeGreaterThanOrEqual(16)
  expect(studyResourceScopeSpacing).not.toBeNull()
  expect(studyResourceScopeSpacing!).toBeGreaterThanOrEqual(18)
  await expect(
    mustHaveStudyResourcePlan.getByRole('heading', {
      level: 5,
      name: 'Ancient scroll covers:',
    }),
  ).toBeVisible()
  await expect(
    mustHaveStudyResourcePlan.getByRole('heading', {
      level: 5,
      name: 'Skill book covers:',
    }),
  ).toBeVisible()
  await expect(
    fullBuildStudyResourcePlan.getByRole('heading', {
      level: 4,
      name: 'Full-build book/scroll usage',
    }),
  ).toBeVisible()
  const ancientScrollCoveredPerkGroups = mustHaveStudyResourcePlan.getByRole('list', {
    name: 'Ancient scroll covered perk groups',
  })
  const mustHaveStudyResourceRowKinds = await mustHaveStudyResourcePlan
    .getByTestId('detail-study-resource-plan-row')
    .evaluateAll((rows) =>
      rows.map((row) => row.getAttribute('data-resource-kind')).filter(Boolean),
    )
  const berserkerStudyResourceTile = ancientScrollCoveredPerkGroups
    .getByTestId('planner-group-card')
    .filter({ hasText: 'Berserker' })
  const berserkerStudyResourceTileIcons = berserkerStudyResourceTile.getByTestId(
    'planner-group-option-icon',
  )
  const muscularityCoveredPerkPill = berserkerStudyResourceTile.getByRole('button', {
    name: 'Muscularity',
  })
  const muscularityCoveredPerkIcon = muscularityCoveredPerkPill.getByTestId('planner-pill-icon')

  expect(mustHaveStudyResourceRowKinds).toEqual(['book', 'scroll'])
  await expect(berserkerStudyResourceTile).toBeVisible()
  await expect(berserkerStudyResourceTileIcons).toHaveCount(2)
  await expect(berserkerStudyResourceTileIcons.nth(1)).toHaveAttribute(
    'src',
    /\/game-icons\/ui\/items\/trade\/scroll\.png$/,
  )
  await expect(berserkerStudyResourceTile.getByRole('button', { name: 'Brawny' })).toBeVisible()
  await expect(berserkerStudyResourceTile.getByRole('button', { name: 'Colossus' })).toBeVisible()
  await expect(muscularityCoveredPerkPill).toBeVisible()
  await expect(muscularityCoveredPerkIcon).toBeVisible()
  await expectImageToLoad(muscularityCoveredPerkIcon)
  await muscularityCoveredPerkPill.hover()
  await expect(muscularityCoveredPerkPill).toHaveAttribute('data-tooltip-pending', 'true', {
    timeout: 2500,
  })
  await expect(page.getByRole('tooltip')).toBeVisible({ timeout: 2500 })
  await page.mouse.move(1, 1)
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  await expect(studyResourcePlan.getByText('Heavy Armor')).toHaveCount(0)
})

test('explains the reported Ranger full-build chance from remaining native rows', async ({
  page,
}) => {
  await page.setViewportSize({ height: 720, width: 900 })
  await page.goto(reportedRangerChanceExplanationBuildUrl)
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()

  const detailPanel = getDetailPanel(page)
  const chanceExplanation = detailPanel.getByTestId('detail-chance-explanation')
  const chanceExplanationToggle = chanceExplanation.getByRole('button', {
    name: 'How chances combine',
  })
  const matchedPerkGroupsRegion = detailPanel.getByRole('region', { name: 'Matched perk groups' })
  const mustHaveMatchColumn = matchedPerkGroupsRegion.locator(
    '[data-requirement-scope="must-have"]',
  )
  const optionalMatchColumn = matchedPerkGroupsRegion.locator('[data-requirement-scope="optional"]')

  await expect(detailPanel.getByRole('heading', { level: 2, name: 'Ranger' })).toBeVisible()
  await expect(chanceExplanation).toBeVisible()
  await expect(chanceExplanationToggle).toHaveAttribute('aria-expanded', 'false')
  await expect(chanceExplanation.getByTestId('detail-chance-explanation-scope')).toHaveCount(0)

  const layoutMetrics = await matchedPerkGroupsRegion.evaluate((region) => {
    const explanation = region.querySelector('[data-testid="detail-chance-explanation"]')
    const mustHaveColumn = region.querySelector('[data-requirement-scope="must-have"]')
    const optionalColumn = region.querySelector('[data-requirement-scope="optional"]')

    if (
      !(explanation instanceof HTMLElement) ||
      !(mustHaveColumn instanceof HTMLElement) ||
      !(optionalColumn instanceof HTMLElement)
    ) {
      return null
    }

    return {
      explanationTop: explanation.getBoundingClientRect().top,
      mustHaveBottom: mustHaveColumn.getBoundingClientRect().bottom,
      optionalBottom: optionalColumn.getBoundingClientRect().bottom,
    }
  })

  expect(layoutMetrics).not.toBeNull()
  expect(layoutMetrics!.explanationTop).toBeGreaterThanOrEqual(layoutMetrics!.mustHaveBottom - 1)
  expect(layoutMetrics!.explanationTop).toBeGreaterThanOrEqual(layoutMetrics!.optionalBottom - 1)

  await expect(mustHaveMatchColumn).toBeVisible()
  await expect(optionalMatchColumn).toBeVisible()
  await chanceExplanationToggle.click()
  await expect(chanceExplanationToggle).toHaveAttribute('aria-expanded', 'true')

  const fullBuildScope = chanceExplanation
    .getByTestId('detail-chance-explanation-scope')
    .filter({ hasText: 'Full build chance' })

  await expect(fullBuildScope).toContainText('22.4%')
  await expect(fullBuildScope).toContainText(
    'Best route improves this from 0% native-only to 22.4%.',
  )
  await expect(fullBuildScope).toContainText(
    'Skill book covers one of Barter for Greed or Calm for Alert, depending on the native roll.',
  )
  await expect(fullBuildScope).toContainText(
    'Ancient scroll covers Berserker for Brawny and Muscularity.',
  )
  await expect(fullBuildScope).toContainText('The remaining native roll needs Barter or Calm.')
  await expect(fullBuildScope).toContainText(
    'Chance math: Barter 0.20% + Calm 22.2% - both 0.04% = 22.4%.',
  )
  await expect(fullBuildScope).toContainText('Actual engine expression:')
  await expect(fullBuildScope).toContainText('successful grouped native outcome')
  await expect(
    fullBuildScope.getByTestId('detail-chance-explanation-probability-term').first(),
  ).toHaveAttribute(
    'title',
    /Full build.*probability.*Skill book covers.*Ancient scroll covers Berserker/,
  )

  await expect(fullBuildScope.getByTestId('detail-chance-explanation-native-match')).toHaveCount(0)
})

test('keeps reported Hunter must-have expressions scoped to must-have rows', async ({ page }) => {
  await page.setViewportSize({ height: 720, width: 900 })
  await page.goto(reportedHunterChanceExplanationBuildUrl)
  await expect(page.getByRole('heading', { level: 1, name: 'Build planner' })).toBeVisible()

  const detailPanel = getDetailPanel(page)
  const chanceExplanation = detailPanel.getByTestId('detail-chance-explanation')
  const chanceExplanationToggle = chanceExplanation.getByRole('button', {
    name: 'How chances combine',
  })

  await expect(detailPanel.getByRole('heading', { level: 2, name: 'Hunter' })).toBeVisible()
  await chanceExplanationToggle.click()

  const mustHaveScope = chanceExplanation
    .getByTestId('detail-chance-explanation-scope')
    .filter({ hasText: 'Must-have chance' })

  await expect(mustHaveScope).toContainText(
    'Actual engine expression: P = 36.3% + 0.13% + 0.07% = 36.5%.',
  )
  await expect(mustHaveScope).toContainText(
    'The engine summed 3 successful grouped native outcomes out of 4 grouped native outcomes.',
  )
  await expect(mustHaveScope).not.toContainText('72 successful grouped native outcomes')
  await expect(mustHaveScope.getByTestId('detail-chance-explanation-probability-term')).toHaveCount(
    3,
  )
  await expect(
    mustHaveScope.getByTestId('detail-chance-explanation-probability-term').first(),
  ).toHaveAttribute(
    'title',
    /Must-have term has 36\.3% probability\..*(Sling covers Lookout|Barter covers Greed|Skill book covers)/,
  )
  await expect(mustHaveScope.getByTestId('detail-chance-explanation-native-match')).toHaveCount(0)
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
