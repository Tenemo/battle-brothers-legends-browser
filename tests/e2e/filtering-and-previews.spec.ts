import { expect, test } from '@playwright/test'
import {
  clearAllFilters,
  disableCategory,
  enableCategory,
  expandCategory,
  getParsedCssRgbColor,
  expectRawAncientScrollMarker,
  expectSearchParam,
  getResultsList,
  getSidebarPerkGroupButton,
  gotoBuildPlanner,
  inspectPerkFromResults,
  searchPerks,
  selectPerkGroup,
} from './support/build-planner-page'

test('switches active categories and scoped perk groups, then clears everything cleanly', async ({
  page,
}) => {
  await gotoBuildPlanner(page)

  const categoriesHeading = page.getByRole('heading', { level: 2, name: 'Categories' })
  const categoryHeaderHeightBeforeSelection = await categoriesHeading.evaluate(
    (element) => element.parentElement?.getBoundingClientRect().height ?? 0,
  )

  await expect(page.getByRole('button', { name: 'Show all categories' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByRole('button', { name: 'Clear category selection' })).toBeVisible()
  await expectSearchParam(page, 'category', null)
  await enableCategory(page, 'Traits')
  await expect(page.getByTestId('perk-group-heading')).toHaveText('Perk groups')
  await expect
    .poll(() =>
      categoriesHeading.evaluate(
        (element) => element.parentElement?.getBoundingClientRect().height ?? 0,
      ),
    )
    .toBe(categoryHeaderHeightBeforeSelection)
  await page.getByRole('button', { name: 'Clear category selection' }).click()
  await expect(page.getByTestId('perk-group-heading')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Enable category Traits' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Clear category selection' })).toHaveCount(0)
  await expect
    .poll(() =>
      categoriesHeading.evaluate(
        (element) => element.parentElement?.getBoundingClientRect().height ?? 0,
      ),
    )
    .toBe(categoryHeaderHeightBeforeSelection)

  await enableCategory(page, 'Traits')
  await disableCategory(page, 'Traits')
  await expect(page.getByTestId('perk-group-heading')).toHaveCount(0)

  await enableCategory(page, 'Traits')
  await selectPerkGroup(page, 'Calm')
  await expect(getSidebarPerkGroupButton(page, 'Calm')).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Clear category selection' }).click()
  await expect(page.getByRole('button', { name: 'Enable category Traits' })).toBeVisible()
  await expect(getSidebarPerkGroupButton(page, 'Calm')).toHaveCount(0)
  await expectSearchParam(page, 'category', 'none')
  await expectSearchParam(page, 'group-traits', null)

  await enableCategory(page, 'Traits')
  await selectPerkGroup(page, 'Calm')
  await expect(page.getByText(/Filtered to /i)).toHaveCount(0)

  await enableCategory(page, 'Enemy')
  await expect(page.getByRole('button', { name: 'Enable category Traits' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Disable category Enemy' })).toBeVisible()
  await expect(getSidebarPerkGroupButton(page, 'Calm')).toHaveCount(0)
  await expect(
    getResultsList(page).getByRole('button', {
      name: 'Inspect Favoured Enemy - Beasts',
    }),
  ).toBeVisible()

  await clearAllFilters(page)

  await expect(page.getByLabel('Search perks')).toHaveValue('')
  await expect(page.getByLabel('Filter by tier')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Clear all filters' })).toHaveCount(0)
  await expect(page.getByText(/Ranked by exact perk names first/i)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Enable category Traits' })).toBeVisible()
})

test('keeps only one selected perk group when another group is selected', async ({ page }) => {
  await gotoBuildPlanner(page)

  await enableCategory(page, 'Traits')
  await selectPerkGroup(page, 'Calm')
  await expect(getSidebarPerkGroupButton(page, 'Calm')).toHaveAttribute('aria-pressed', 'true')

  await enableCategory(page, 'Magic')
  await selectPerkGroup(page, 'Deadeye')

  await expect(page.getByRole('button', { name: 'Enable category Traits' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Disable category Magic' })).toBeVisible()
  await expect(getSidebarPerkGroupButton(page, 'Deadeye')).toHaveAttribute('aria-pressed', 'true')
  await expect(getSidebarPerkGroupButton(page, 'Calm')).toHaveCount(0)
  await expect(page.getByText(/Filtered to /i)).toHaveCount(0)
  await expectSearchParam(page, 'group-traits', null)
  await expectSearchParam(page, 'group-magic', 'Deadeye')

  await selectPerkGroup(page, 'Deadeye')

  await expect(getSidebarPerkGroupButton(page, 'Deadeye')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('button', { name: 'Enable category Magic' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Show all categories' })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  await expect(page.getByText('No perks found')).toBeVisible()
  await expectSearchParam(page, 'category', 'none')
  await expectSearchParam(page, 'group-magic', null)
})

test('resets category drilldown when typing a perk search', async ({ page }) => {
  await gotoBuildPlanner(page)

  await enableCategory(page, 'Traits')
  await selectPerkGroup(page, 'Calm')

  await expect(page.getByRole('button', { name: 'Disable category Traits' })).toBeVisible()
  await expect(getSidebarPerkGroupButton(page, 'Calm')).toHaveAttribute('aria-pressed', 'true')

  await searchPerks(page, 'Axe')

  await expect(page.getByLabel('Search perks')).toHaveValue('Axe')
  await expect(page.getByRole('button', { name: 'Show all categories' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByRole('button', { name: 'Enable category Traits' })).toBeVisible()
  await expect(getSidebarPerkGroupButton(page, 'Calm')).toHaveCount(0)
  await expect(
    getResultsList(page).getByRole('button', { name: 'Inspect Axe Mastery' }),
  ).toBeVisible()
  await expect.poll(() => new URL(page.url()).searchParams.get('category')).toBeNull()
  await expect.poll(() => new URL(page.url()).searchParams.get('group-traits')).toBeNull()

  await searchPerks(page, '')

  await expect(page.getByRole('button', { name: 'Show all categories' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(getResultsList(page).getByTestId('perk-row').first()).toBeVisible()
  await expect.poll(() => new URL(page.url()).searchParams.get('category')).toBeNull()
})

test('leaves no category selected when deselecting a scoped perk group from an expanded category', async ({
  page,
}) => {
  await gotoBuildPlanner(page)

  await expandCategory(page, 'Enemy')
  await selectPerkGroup(page, 'Beasts')

  await expect(page.getByRole('button', { name: 'Disable category Enemy' })).toBeVisible()
  await expect(getSidebarPerkGroupButton(page, 'Beasts')).toHaveAttribute('aria-pressed', 'true')
  await expect(
    getResultsList(page).getByRole('button', { name: 'Inspect Favoured Enemy - Beasts' }),
  ).toBeVisible()

  await selectPerkGroup(page, 'Beasts')

  await expect(page.getByRole('button', { name: 'Enable category Enemy' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Show all categories' })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  await expect(page.getByRole('button', { name: 'Show all perk groups' })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  await expect(getSidebarPerkGroupButton(page, 'Beasts')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByText('No perks found')).toBeVisible()
  await expect.poll(() => new URL(page.url()).searchParams.get('category')).toBe('none')
  await expect.poll(() => new URL(page.url()).searchParams.get('group-enemy')).toBeNull()
})

test('resets the perk result scroll when category filters change', async ({ page }) => {
  await gotoBuildPlanner(page, { height: 768, width: 1366 })

  const resultsList = getResultsList(page)

  await enableCategory(page, 'Weapon')
  await expect(page.getByRole('button', { name: 'Disable category Weapon' })).toBeVisible()
  await expect(resultsList.getByRole('button', { name: 'Inspect Axe Mastery' })).toBeVisible()
  await expect
    .poll(async () =>
      resultsList.evaluate((element) => element.scrollHeight - element.clientHeight),
    )
    .toBeGreaterThan(100)

  await resultsList.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await expect
    .poll(async () => resultsList.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0)

  await disableCategory(page, 'Weapon')
  await enableCategory(page, 'Traits')

  await expect(page.getByRole('button', { name: 'Disable category Traits' })).toBeVisible()
  await expect(getSidebarPerkGroupButton(page, 'Calm')).toBeVisible()
  await expect
    .poll(async () => resultsList.evaluate((element) => element.scrollTop))
    .toBeLessThanOrEqual(1)
})

test('splits origin and ancient scroll perk search filters', async ({ page }) => {
  await gotoBuildPlanner(page)

  const resultsList = getResultsList(page)
  const filterPerksButton = page.getByRole('button', { name: 'Filter perks' })

  await expect(filterPerksButton).toBeVisible()
  await expect(filterPerksButton).toHaveAttribute('data-active-filter', 'true')
  await expect(filterPerksButton.getByTestId('perk-filter-icon')).toHaveAttribute(
    'fill',
    'currentColor',
  )
  await expect.poll(() => new URL(page.url()).searchParams.get('origin-perk-groups')).toBeNull()
  await expect
    .poll(() => new URL(page.url()).searchParams.get('ancient-scroll-perk-groups'))
    .toBeNull()

  await searchPerks(page, 'Ammunition Binding')

  await expect(resultsList.getByRole('button', { name: 'Inspect Ammunition Binding' })).toHaveCount(
    0,
  )
  await expect(page.getByText('No perks found')).toBeVisible()

  await searchPerks(page, 'Magic Missile Focus')

  const defaultMagicMissileFocusResultRow = resultsList
    .getByRole('button', { name: 'Inspect Magic Missile Focus' })
    .locator('xpath=ancestor::*[@data-testid="perk-row"][1]')
  const defaultMagicMissileFocusPlacementList =
    defaultMagicMissileFocusResultRow.getByTestId('perk-placement-list')

  await expect(defaultMagicMissileFocusResultRow).toBeVisible()
  await expect(defaultMagicMissileFocusPlacementList).toContainText('Evocation')
  await expect(defaultMagicMissileFocusPlacementList).not.toContainText('Seer')
  await expectRawAncientScrollMarker(
    defaultMagicMissileFocusPlacementList.getByTestId('ancient-scroll-perk-group-marker'),
  )

  await searchPerks(page, 'Berserk')

  const berserkResultRow = resultsList
    .getByRole('button', { exact: true, name: 'Inspect Berserk' })
    .locator('xpath=ancestor::*[@data-testid="perk-row"][1]')
  const berserkPlacementList = berserkResultRow.getByTestId('perk-placement-list')

  await expect(berserkResultRow).toBeVisible()
  await expect(berserkPlacementList).toContainText('Vicious')
  await expect(berserkPlacementList).toContainText('Aggressive')
  await expect(berserkPlacementList).toContainText('Berserker')

  await filterPerksButton.click()

  const perkFiltersGroup = page.getByRole('group', { name: 'Perk filters' })
  const originPerkGroupsCheckbox = perkFiltersGroup.getByRole('checkbox', {
    name: 'Origin perk groups',
  })
  const ancientScrollPerkGroupsCheckbox = perkFiltersGroup.getByRole('checkbox', {
    name: 'Ancient scroll perks',
  })
  const originPerkGroupsCheckboxControl = perkFiltersGroup.locator(
    'input[data-testid="origin-perk-groups-checkbox"]',
  )
  const ancientScrollPerkGroupsCheckboxControl = perkFiltersGroup.locator(
    'input[data-testid="ancient-scroll-perk-groups-checkbox"]',
  )
  const filterOptions = [
    {
      checkboxControl: originPerkGroupsCheckboxControl,
      label: perkFiltersGroup.getByText('Origin perk groups', { exact: true }),
      labelRow: perkFiltersGroup.locator('label').filter({ hasText: 'Origin perk groups' }),
      title: 'Shows perk groups that come only from origins and are hidden by default.',
    },
    {
      checkboxControl: ancientScrollPerkGroupsCheckboxControl,
      label: perkFiltersGroup.getByText('Ancient scroll perks', { exact: true }),
      labelRow: perkFiltersGroup.locator('label').filter({ hasText: 'Ancient scroll perks' }),
      title: 'Shows perk groups that are only available through ancient scroll sources.',
    },
  ] as const

  await expect(originPerkGroupsCheckbox).not.toBeChecked()
  await expect(ancientScrollPerkGroupsCheckbox).toBeChecked()

  for (const { checkboxControl, label, labelRow, title } of filterOptions) {
    await expect(labelRow).toHaveAttribute('title', title)
    await expect
      .poll(() => labelRow.evaluate((element) => getComputedStyle(element).cursor))
      .toBe('help')
    await expect
      .poll(async () => {
        const checkboxBox = await checkboxControl.boundingBox()

        return checkboxBox === null
          ? null
          : {
              height: Math.round(checkboxBox.height),
              width: Math.round(checkboxBox.width),
            }
      })
      .toEqual({
        height: 16,
        width: 16,
      })
    await expect
      .poll(async () => {
        const checkboxBox = await checkboxControl.boundingBox()
        const labelBox = await label.boundingBox()

        if (checkboxBox === null || labelBox === null) {
          return Number.POSITIVE_INFINITY
        }

        return Math.abs(checkboxBox.y + checkboxBox.height / 2 - (labelBox.y + labelBox.height / 2))
      })
      .toBeLessThanOrEqual(1)
    await expect
      .poll(async () => {
        const checkboxBox = await checkboxControl.boundingBox()
        const labelBox = await label.boundingBox()

        if (checkboxBox === null || labelBox === null) {
          return Number.POSITIVE_INFINITY
        }

        return checkboxBox.y + checkboxBox.height / 2 - (labelBox.y + labelBox.height / 2)
      })
      .toBeLessThanOrEqual(-0.5)
    await expect
      .poll(async () => {
        const checkboxBox = await checkboxControl.boundingBox()
        const labelBox = await label.boundingBox()

        if (checkboxBox === null || labelBox === null) {
          return Number.NEGATIVE_INFINITY
        }

        return checkboxBox.y + checkboxBox.height / 2 - (labelBox.y + labelBox.height / 2)
      })
      .toBeGreaterThanOrEqual(-1.75)
  }

  await ancientScrollPerkGroupsCheckbox.click()

  await expect(originPerkGroupsCheckbox).not.toBeChecked()
  await expect(ancientScrollPerkGroupsCheckbox).not.toBeChecked()
  await expect.poll(() => new URL(page.url()).searchParams.get('origin-perk-groups')).toBeNull()
  await expect
    .poll(() => new URL(page.url()).searchParams.get('ancient-scroll-perk-groups'))
    .toBe('false')
  await expect(filterPerksButton).toHaveAttribute('data-active-filter', 'false')
  await expect(filterPerksButton.getByTestId('perk-filter-icon')).toHaveAttribute('fill', 'none')

  await searchPerks(page, 'Magic Missile Focus')

  await expect(
    resultsList.getByRole('button', { name: 'Inspect Magic Missile Focus' }),
  ).toHaveCount(0)

  await originPerkGroupsCheckbox.click()

  await expect(originPerkGroupsCheckbox).toBeChecked()
  await expect(ancientScrollPerkGroupsCheckbox).not.toBeChecked()
  await expect.poll(() => new URL(page.url()).searchParams.get('origin-perk-groups')).toBe('true')
  await expect
    .poll(() => new URL(page.url()).searchParams.get('ancient-scroll-perk-groups'))
    .toBe('false')
  await expect(filterPerksButton).toHaveAttribute('data-active-filter', 'true')
  await expect(filterPerksButton.getByTestId('perk-filter-icon')).toHaveAttribute(
    'fill',
    'currentColor',
  )

  await searchPerks(page, 'Ammunition Binding')

  const ammunitionBindingResultRow = resultsList
    .getByRole('button', { name: 'Inspect Ammunition Binding' })
    .locator('xpath=ancestor::*[@data-testid="perk-row"][1]')

  await expect(ammunitionBindingResultRow).toBeVisible()
  await expect(ammunitionBindingResultRow.getByTestId('perk-placement-list')).toContainText(
    'ArcherCommand',
  )

  await searchPerks(page, 'Magic Missile Focus')

  const magicMissileFocusResultRow = resultsList
    .getByRole('button', { name: 'Inspect Magic Missile Focus' })
    .locator('xpath=ancestor::*[@data-testid="perk-row"][1]')
  const magicMissileFocusPlacementList =
    magicMissileFocusResultRow.getByTestId('perk-placement-list')

  await expect(magicMissileFocusResultRow).toBeVisible()
  await expect(magicMissileFocusPlacementList).toContainText('Seer')
  await expect(magicMissileFocusPlacementList).not.toContainText('Evocation')

  await ancientScrollPerkGroupsCheckbox.click()

  await expect(originPerkGroupsCheckbox).toBeChecked()
  await expect(ancientScrollPerkGroupsCheckbox).toBeChecked()
  await expect.poll(() => new URL(page.url()).searchParams.get('origin-perk-groups')).toBe('true')
  await expect
    .poll(() => new URL(page.url()).searchParams.get('ancient-scroll-perk-groups'))
    .toBeNull()
  await expect(magicMissileFocusPlacementList).toContainText('Evocation')
  await expect(magicMissileFocusPlacementList).toContainText('Seer')

  await originPerkGroupsCheckbox.click()

  await expect(originPerkGroupsCheckbox).not.toBeChecked()
  await expect(ancientScrollPerkGroupsCheckbox).toBeChecked()
  await expect.poll(() => new URL(page.url()).searchParams.get('origin-perk-groups')).toBeNull()
  await expect
    .poll(() => new URL(page.url()).searchParams.get('ancient-scroll-perk-groups'))
    .toBeNull()
  await expect(filterPerksButton).toHaveAttribute('data-active-filter', 'true')
  await expect(filterPerksButton.getByTestId('perk-filter-icon')).toHaveAttribute(
    'fill',
    'currentColor',
  )

  await searchPerks(page, 'Berserk')

  const refreshedBerserkResultRow = resultsList
    .getByRole('button', { exact: true, name: 'Inspect Berserk' })
    .locator('xpath=ancestor::*[@data-testid="perk-row"][1]')
  const refreshedBerserkPlacementList = refreshedBerserkResultRow.getByTestId('perk-placement-list')

  await expect(refreshedBerserkPlacementList).toContainText('Berserker')

  const savedUrl = page.url()
  const sharedPage = await page.context().newPage()

  try {
    await sharedPage.setViewportSize({ width: 900, height: 720 })
    await sharedPage.goto(savedUrl)

    await expect(
      getResultsList(sharedPage).getByRole('button', { exact: true, name: 'Inspect Berserk' }),
    ).toBeVisible()
    await sharedPage.getByRole('button', { name: 'Filter perks' }).click()
    await expect(
      sharedPage.getByRole('checkbox', {
        name: 'Origin perk groups',
      }),
    ).not.toBeChecked()
    await expect(
      sharedPage.getByRole('checkbox', {
        name: 'Ancient scroll perks',
      }),
    ).toBeChecked()
  } finally {
    await sharedPage.close()
  }
})

test('shows real effect previews for hooked perk descriptions instead of perk group text', async ({
  page,
}) => {
  await gotoBuildPlanner(page)
  const resultsList = getResultsList(page)

  await searchPerks(page, 'Berserk')
  await expect(
    resultsList.getByText(/upon killing an enemy 4 Action Points are immediately restored/i),
  ).toBeVisible()
  await expect(resultsList.getByText(/Passive:/i)).toHaveCount(0)
  await expect(resultsList.getByText('is vicious', { exact: true })).toHaveCount(0)

  await searchPerks(page, 'Killing Frenzy')
  await expect(
    resultsList.getByText(/A kill increases all damage by 25% for two turns/i),
  ).toBeVisible()
  await expect(
    resultsList.getByText(/Does not stack, but another kill will reset the timer/i),
  ).toBeVisible()
  await expect(resultsList.getByText('axes', { exact: true })).toHaveCount(0)

  await searchPerks(page, 'Fearsome')
  await expect(
    resultsList.getByText(
      /triggers a morale check for the opponent with a penalty equal to 20% of your current Resolve/i,
    ),
  ).toBeVisible()
  await expect(resultsList.getByText('cleavers', { exact: true })).toHaveCount(0)
})

test('shows normalized mastery labels in the result list', async ({ page }) => {
  await gotoBuildPlanner(page)

  await searchPerks(page, 'Axe Mastery')

  await expect(
    getResultsList(page).getByRole('button', { name: 'Inspect Axe Mastery' }),
  ).toBeVisible()
  await expect(getResultsList(page).getByText('Spec Axe', { exact: true })).toHaveCount(0)
  await expect(getResultsList(page).getByTestId('tier-badge')).toHaveCount(0)
})

test('reorders categories and perk groups around the active perk search query and highlights the match', async ({
  page,
}) => {
  await gotoBuildPlanner(page)

  await searchPerks(page, 'Shady')

  const categoryButtons = page
    .getByTestId('category-sidebar')
    .getByRole('button', { name: /^Enable category /u })

  await expect(categoryButtons.first()).toHaveAttribute('aria-label', 'Enable category Other')

  await expandCategory(page, 'Other')
  await expect(page.getByLabel('Search perks')).toHaveValue('Shady')
  await expect(page.getByRole('button', { name: 'Enable category Other' })).toHaveAttribute(
    'aria-pressed',
    'false',
  )

  const perkGroupButtons = page
    .getByTestId('category-sidebar')
    .getByRole('button', { name: /^Select perk group /u })

  await expect(perkGroupButtons.first()).toHaveAttribute('aria-label', 'Select perk group Shady')
  await expect(
    page.getByTestId('category-sidebar').locator('[data-search-highlight="true"]'),
  ).toContainText(['Shady'])
})

test('keeps category disclosure separate from category and perk group selection', async ({
  page,
}) => {
  await gotoBuildPlanner(page)

  await searchPerks(page, 'Axe')
  await expandCategory(page, 'Weapon')

  await expect(page.getByLabel('Search perks')).toHaveValue('Axe')
  await expect(page.getByRole('button', { name: 'Enable category Weapon' })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  await expect(page.getByRole('button', { name: 'Show all categories' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByRole('button', { name: 'Clear category selection' })).toBeVisible()
  await expect(getSidebarPerkGroupButton(page, 'Axe')).toBeVisible()
  await expect.poll(() => new URL(page.url()).searchParams.get('category')).toBeNull()

  await enableCategory(page, 'Weapon')

  await expect(page.getByLabel('Search perks')).toHaveValue('')
  await expect(page.getByRole('button', { name: 'Disable category Weapon' })).toBeVisible()
  await expect(getSidebarPerkGroupButton(page, 'Axe')).toBeVisible()
  await expect(
    getResultsList(page).getByRole('button', { name: 'Inspect Axe Mastery' }),
  ).toBeVisible()

  await searchPerks(page, 'Axe')
  await expandCategory(page, 'Weapon')
  await selectPerkGroup(page, 'Axe')

  await expect(page.getByLabel('Search perks')).toHaveValue('')
  await expect(page.getByRole('button', { name: 'Disable category Weapon' })).toBeVisible()
  await expect(getSidebarPerkGroupButton(page, 'Axe')).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => new URL(page.url()).searchParams.get('group-weapon')).toBe('Axe')
})

test('keeps category hover and disclosure styling separate from perk group highlights', async ({
  page,
}) => {
  await gotoBuildPlanner(page)

  await expandCategory(page, 'Magic')
  await page.mouse.move(1, 1)

  const magicCategoryButton = page.getByRole('button', { name: 'Enable category Magic' })
  const magicDisclosureButton = page.getByRole('button', { name: 'Collapse category Magic' })
  const alchemyGroupButton = getSidebarPerkGroupButton(page, 'Alchemy')
  const deadeyeGroupButton = getSidebarPerkGroupButton(page, 'Deadeye')
  const disclosureBaseStyles = await magicDisclosureButton.evaluate((button) => {
    const computedStyle = window.getComputedStyle(button)

    return {
      backgroundColor: computedStyle.backgroundColor,
      borderLeftColor: computedStyle.borderLeftColor,
      borderRightColor: computedStyle.borderRightColor,
      borderRightWidth: computedStyle.borderRightWidth,
    }
  })

  expect(disclosureBaseStyles.borderRightWidth).toBe('2px')

  await magicCategoryButton.hover()

  await expect(magicCategoryButton).toHaveAttribute('data-highlighted', 'true')
  await expect(alchemyGroupButton).toHaveAttribute('data-highlighted', 'false')
  await expect(deadeyeGroupButton).toHaveAttribute('data-highlighted', 'false')

  await magicDisclosureButton.hover()

  await expect
    .poll(async () =>
      magicDisclosureButton.evaluate((button, baseStyles) => {
        const computedStyle = window.getComputedStyle(button)

        return (
          button.matches(':hover') &&
          computedStyle.backgroundColor !== baseStyles.backgroundColor &&
          computedStyle.borderLeftColor !== baseStyles.borderLeftColor &&
          computedStyle.borderRightColor !== baseStyles.borderRightColor
        )
      }, disclosureBaseStyles),
    )
    .toBe(true)
  await expect(magicCategoryButton).toHaveAttribute('data-highlighted', 'false')

  await alchemyGroupButton.hover()

  await expect(alchemyGroupButton).toHaveAttribute('data-highlighted', 'true')
  await expect(deadeyeGroupButton).toHaveAttribute('data-highlighted', 'false')
  await expect(magicCategoryButton).toHaveAttribute('data-highlighted', 'false')
})

test('places ancient scroll markers next to sidebar perk group names', async ({ page }) => {
  await gotoBuildPlanner(page)

  await expandCategory(page, 'Magic')

  const markerMetrics = await getSidebarPerkGroupButton(page, 'Evocation').evaluate((button) => {
    const label = button.querySelector('[data-testid="perk-group-label"]')
    const marker = button.querySelector('[data-testid="ancient-scroll-perk-group-marker"]')
    const count = button.querySelector('[data-testid="perk-group-count"]')

    if (
      !(label instanceof HTMLElement) ||
      !(marker instanceof HTMLElement) ||
      !(count instanceof HTMLElement)
    ) {
      return null
    }

    const labelRectangle = label.getBoundingClientRect()
    const markerRectangle = marker.getBoundingClientRect()
    const countRectangle = count.getBoundingClientRect()

    return {
      countLeft: countRectangle.left,
      gapAfterLabel: markerRectangle.left - labelRectangle.right,
      markerRight: markerRectangle.right,
      spaceBeforeCount: countRectangle.left - markerRectangle.right,
      verticalCenterOffset: Math.abs(
        markerRectangle.top +
          markerRectangle.height / 2 -
          (labelRectangle.top + labelRectangle.height / 2),
      ),
    }
  })

  expect(markerMetrics).not.toBeNull()
  expect(markerMetrics!.gapAfterLabel).toBeGreaterThanOrEqual(0)
  expect(markerMetrics!.gapAfterLabel).toBeLessThanOrEqual(8)
  expect(markerMetrics!.spaceBeforeCount).toBeGreaterThan(0)
  expect(markerMetrics!.markerRight).toBeLessThan(markerMetrics!.countLeft)
  expect(markerMetrics!.verticalCenterOffset).toBeLessThanOrEqual(2)

  await expectRawAncientScrollMarker(
    getSidebarPerkGroupButton(page, 'Evocation').getByTestId('ancient-scroll-perk-group-marker'),
  )
})

test('keeps category rows compact with bordered separation in the sidebar', async ({ page }) => {
  await gotoBuildPlanner(page)

  const categoryMetrics = await page.getByTestId('category-sidebar').evaluate((sidebar) => {
    const categoryButtons = Array.from(
      sidebar.querySelectorAll('button[aria-label^="Enable category "]'),
    ).slice(0, 4)

    return categoryButtons.flatMap((categoryButton, categoryIndex) => {
      const nextCategoryButton = categoryButtons[categoryIndex + 1]

      if (
        !(categoryButton instanceof HTMLElement) ||
        !(nextCategoryButton instanceof HTMLElement)
      ) {
        return []
      }

      const categoryCard = categoryButton.closest('[data-active]')
      const nextCategoryCard = nextCategoryButton.closest('[data-active]')

      if (!(categoryCard instanceof HTMLElement) || !(nextCategoryCard instanceof HTMLElement)) {
        return []
      }

      const categoryCardRectangle = categoryCard.getBoundingClientRect()
      const nextCategoryCardRectangle = nextCategoryCard.getBoundingClientRect()
      const computedStyle = window.getComputedStyle(categoryCard)

      return [
        {
          borderTopWidth: computedStyle.borderTopWidth,
          gap: nextCategoryCardRectangle.top - categoryCardRectangle.bottom,
        },
      ]
    })
  })

  expect(categoryMetrics.length).toBeGreaterThanOrEqual(3)

  for (const categoryMetric of categoryMetrics) {
    expect(categoryMetric.borderTopWidth).toBe('1px')
    expect(categoryMetric.gap).toBeGreaterThanOrEqual(1.5)
    expect(categoryMetric.gap).toBeLessThanOrEqual(2.5)
  }
})

test('highlights the searched perk phrase in the visible perk results', async ({ page }) => {
  await gotoBuildPlanner(page)

  await searchPerks(page, 'Axe')

  await expect(getResultsList(page).locator('[data-search-highlight="true"]')).toContainText([
    'Axe',
  ])
  await expect(getResultsList(page).getByTestId('tier-badge')).toHaveCount(0)
})

test('shows every matching perk group placement in the result list', async ({ page }) => {
  await gotoBuildPlanner(page)

  await searchPerks(page, 'ranger')

  const poisonMasteryResultRow = getResultsList(page)
    .getByRole('button', { name: 'Inspect Poison Mastery' })
    .locator('xpath=ancestor::*[@data-testid="perk-row"][1]')
  const placementChips = poisonMasteryResultRow.getByTestId('perk-placement-chip')

  await expect(placementChips).toContainText(['Poison', 'Ranger'])
  await expect(poisonMasteryResultRow.getByTestId('perk-placement-list')).not.toContainText(
    /Class|Magic/,
  )
  await expect(poisonMasteryResultRow.getByTestId('perk-placement-list')).not.toContainText(/Tier/i)
  await expect(poisonMasteryResultRow.getByTestId('tier-badge')).toHaveCount(0)
  await expect(poisonMasteryResultRow).not.toContainText(/\+\s*\d+\s*more/i)
  await expect(
    poisonMasteryResultRow
      .getByTestId('perk-placement-label')
      .locator('[data-search-highlight="true"]'),
  ).toContainText(['Ranger'])
  const [perkNameBox, placementListBox] = await Promise.all([
    poisonMasteryResultRow.getByTestId('perk-name').boundingBox(),
    poisonMasteryResultRow.getByTestId('perk-placement-list').boundingBox(),
  ])

  expect(perkNameBox).not.toBeNull()
  expect(placementListBox).not.toBeNull()
  expect(placementListBox!.y - (perkNameBox!.y + perkNameBox!.height)).toBeLessThanOrEqual(8)
  await expect(
    poisonMasteryResultRow.getByRole('img', { name: 'Poison perk group icon' }),
  ).toBeVisible()
  await expect(
    poisonMasteryResultRow.getByRole('img', { name: 'Ranger perk group icon' }),
  ).toBeVisible()

  await searchPerks(page, '')
  await enableCategory(page, 'Class')
  await selectPerkGroup(page, 'Poison')
  await searchPerks(page, 'ranger')

  await poisonMasteryResultRow.getByRole('button', { name: 'Select perk group Ranger' }).click()

  await expect(page.getByLabel('Search perks')).toHaveValue('')
  await expect(page.getByRole('button', { name: 'Enable category Class' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Disable category Magic' })).toBeVisible()
  await expect(getSidebarPerkGroupButton(page, 'Ranger')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText(/Filtered to /i)).toHaveCount(0)
})

test('keeps search result and repository hover states fixed in place', async ({ page }) => {
  await gotoBuildPlanner(page, { height: 768, width: 1366 })
  await page.getByTestId('hero').evaluate(async (element) => {
    await Promise.all(
      element.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
    )
  })

  await searchPerks(page, 'Perfect')

  const perfectFitInspectButton = getResultsList(page).getByRole('button', {
    name: 'Inspect Perfect Fit',
  })
  const perfectFocusInspectButton = getResultsList(page).getByRole('button', {
    name: 'Inspect Perfect Focus',
  })
  const perfectFitResultRow = perfectFitInspectButton.locator(
    'xpath=ancestor::*[@data-testid="perk-row"][1]',
  )
  const perfectFocusResultRow = perfectFocusInspectButton.locator(
    'xpath=ancestor::*[@data-testid="perk-row"][1]',
  )
  const repositoryLink = page.getByLabel('Open the build planner repository on GitHub')

  await expect(perfectFocusResultRow).toBeVisible()
  await perfectFitInspectButton.click()
  await expect(page.getByRole('heading', { level: 2, name: 'Perfect Fit' })).toBeVisible()
  await perfectFocusInspectButton.scrollIntoViewIfNeeded()

  const resultRowBeforeHover = await perfectFocusResultRow.evaluate((element) => {
    const rectangle = element.getBoundingClientRect()
    const computedStyle = window.getComputedStyle(element)

    return {
      backgroundColor: computedStyle.backgroundColor,
      height: rectangle.height,
      top: rectangle.top,
      width: rectangle.width,
    }
  })
  const selectedResultRowBackgroundColor = await perfectFitResultRow.evaluate(
    (element) => window.getComputedStyle(element).backgroundColor,
  )

  await perfectFocusResultRow.hover()

  await expect(perfectFocusResultRow).toHaveCSS('transform', 'none')
  await expect
    .poll(() =>
      perfectFocusResultRow.evaluate((element) => window.getComputedStyle(element).backgroundColor),
    )
    .not.toBe(resultRowBeforeHover.backgroundColor)

  const resultRowAfterHover = await perfectFocusResultRow.evaluate((element) => {
    const rectangle = element.getBoundingClientRect()
    const computedStyle = window.getComputedStyle(element)

    return {
      backgroundColor: computedStyle.backgroundColor,
      height: rectangle.height,
      top: rectangle.top,
      width: rectangle.width,
    }
  })

  expect(resultRowAfterHover.backgroundColor).not.toBe(resultRowBeforeHover.backgroundColor)
  expect(resultRowAfterHover.backgroundColor).not.toBe(selectedResultRowBackgroundColor)
  expect(Math.abs(resultRowAfterHover.top - resultRowBeforeHover.top)).toBeLessThanOrEqual(1)
  expect(Math.abs(resultRowAfterHover.height - resultRowBeforeHover.height)).toBeLessThanOrEqual(1)
  expect(Math.abs(resultRowAfterHover.width - resultRowBeforeHover.width)).toBeLessThanOrEqual(1)

  const [previewBox, resultRowBox] = await Promise.all([
    perfectFocusResultRow.getByTestId('perk-preview').boundingBox(),
    perfectFocusResultRow.boundingBox(),
  ])

  expect(previewBox).not.toBeNull()
  expect(resultRowBox).not.toBeNull()
  await perfectFocusResultRow.click({
    position: {
      x: previewBox!.x - resultRowBox!.x + 8,
      y: previewBox!.y - resultRowBox!.y + 8,
    },
  })
  await expect(page.getByRole('heading', { level: 2, name: 'Perfect Focus' })).toBeVisible()

  const repositoryLinkBeforeHover = await repositoryLink.evaluate((element) => {
    const rectangle = element.getBoundingClientRect()

    return {
      height: rectangle.height,
      top: rectangle.top,
      width: rectangle.width,
    }
  })

  await repositoryLink.hover()

  await expect(repositoryLink).toHaveCSS('transform', 'none')

  const repositoryLinkAfterHover = await repositoryLink.evaluate((element) => {
    const rectangle = element.getBoundingClientRect()

    return {
      height: rectangle.height,
      top: rectangle.top,
      width: rectangle.width,
    }
  })

  expect(
    Math.abs(repositoryLinkAfterHover.top - repositoryLinkBeforeHover.top),
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(repositoryLinkAfterHover.height - repositoryLinkBeforeHover.height),
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(repositoryLinkAfterHover.width - repositoryLinkBeforeHover.width),
  ).toBeLessThanOrEqual(1)
})

test('keeps middle-of-word search highlights from adding visual gaps', async ({ page }) => {
  await gotoBuildPlanner(page)

  await searchPerks(page, 'tellige')

  const intelligentHighlight = getResultsList(page)
    .locator('[data-testid="perk-placement-list"] [data-search-highlight="true"]')
    .filter({ hasText: 'tellige' })
    .first()

  await expect(intelligentHighlight).toBeVisible()
  await expect(
    intelligentHighlight.locator('xpath=ancestor::*[@data-testid="perk-placement-list"][1]'),
  ).toContainText(/Intelligent/)

  const horizontalPadding = await intelligentHighlight.evaluate((element) => {
    const computedStyle = window.getComputedStyle(element)

    return {
      left: computedStyle.paddingLeft,
      right: computedStyle.paddingRight,
    }
  })

  expect(horizontalPadding).toEqual({
    left: '0px',
    right: '0px',
  })
})

test('shows picked categories and perk groups with requirement icons and keeps picked result rows outlined while selection changes the background', async ({
  page,
}) => {
  await gotoBuildPlanner(page)

  await searchPerks(page, 'Clarity')
  await getResultsList(page)
    .getByRole('button', { name: 'Add Clarity to build from results' })
    .click()

  await searchPerks(page, 'Perfect Focus')
  await getResultsList(page)
    .getByRole('button', { name: 'Add Perfect Focus as optional from results' })
    .click()
  await inspectPerkFromResults(page, 'Perfect Focus')

  await searchPerks(page, '')

  await expect(
    page
      .getByRole('button', { name: 'Enable category Traits' })
      .getByTestId('category-picked-requirement-icon'),
  ).toHaveCount(2)
  await expect(
    page
      .getByRole('button', { name: 'Enable category Traits' })
      .getByTestId('category-picked-requirement-icon')
      .nth(0),
  ).toHaveAttribute('data-requirement', 'must-have')
  await expect(
    page
      .getByRole('button', { name: 'Enable category Traits' })
      .getByTestId('category-picked-requirement-icon')
      .nth(1),
  ).toHaveAttribute('data-requirement', 'optional')
  const traitsRequirementIconColorValues = await page
    .getByRole('button', { name: 'Enable category Traits' })
    .getByTestId('category-picked-requirement-icon')
    .evaluateAll((requirementIcons) =>
      requirementIcons.map((requirementIcon) => window.getComputedStyle(requirementIcon).color),
    )
  const traitsRequirementIconColors = traitsRequirementIconColorValues.map((color) => ({
    ...getParsedCssRgbColor(color),
    color,
  }))

  expect(traitsRequirementIconColors).toHaveLength(2)
  expect(traitsRequirementIconColors[0]?.color).not.toBe(traitsRequirementIconColors[1]?.color)
  expect(traitsRequirementIconColors[1]?.red).toBe(traitsRequirementIconColors[1]?.green)
  expect(traitsRequirementIconColors[1]?.green).toBe(traitsRequirementIconColors[1]?.blue)
  expect(traitsRequirementIconColors[1]?.red).toBeGreaterThan(120)
  await expect(
    page
      .getByRole('button', { name: 'Enable category Magic' })
      .getByTestId('category-picked-requirement-icon'),
  ).toHaveCount(1)
  await expect(
    page
      .getByRole('button', { name: 'Enable category Magic' })
      .getByTestId('category-picked-requirement-icon'),
  ).toHaveAttribute('data-requirement', 'optional')

  await enableCategory(page, 'Traits')

  await expect(
    getSidebarPerkGroupButton(page, 'Calm').getByTestId('category-picked-requirement-icon'),
  ).toHaveCount(2)

  await enableCategory(page, 'Magic')

  await expect(getSidebarPerkGroupButton(page, 'Calm')).toHaveCount(0)
  await expect(
    getSidebarPerkGroupButton(page, 'Deadeye').getByTestId('category-picked-requirement-icon'),
  ).toHaveCount(1)
  await expect(
    getSidebarPerkGroupButton(page, 'Deadeye').getByTestId('category-picked-requirement-icon'),
  ).toHaveAttribute('data-requirement', 'optional')

  await disableCategory(page, 'Magic')

  await searchPerks(page, 'Perfect')
  await inspectPerkFromResults(page, 'Perfect Fit')
  await page.getByLabel('Search perks').focus()

  await expect
    .poll(async () =>
      page.evaluate(() => {
        function getPerkRowStyles(perkName: string) {
          const inspectButton = document.querySelector(
            `button[aria-label="Inspect ${perkName}"]`,
          ) as HTMLButtonElement | null
          const perkRow = inspectButton?.closest('[data-testid="perk-row"]') as
            | HTMLElement
            | null
            | undefined

          if (perkRow == null) {
            return null
          }

          const computedStyle = window.getComputedStyle(perkRow)

          return {
            backgroundColor: computedStyle.backgroundColor,
            borderColor: computedStyle.borderTopColor,
          }
        }

        return {
          picked: getPerkRowStyles('Perfect Focus'),
          selected: getPerkRowStyles('Perfect Fit'),
        }
      }),
    )
    .toMatchObject({
      picked: expect.any(Object),
      selected: expect.objectContaining({
        borderColor: 'rgba(0, 0, 0, 0)',
      }),
    })

  const rowStyles = await page.evaluate(() => {
    function getPerkRowStyles(perkName: string) {
      const inspectButton = document.querySelector(
        `button[aria-label="Inspect ${perkName}"]`,
      ) as HTMLButtonElement | null
      const perkRow = inspectButton?.closest('[data-testid="perk-row"]') as
        | HTMLElement
        | null
        | undefined

      if (perkRow == null) {
        return null
      }

      const computedStyle = window.getComputedStyle(perkRow)

      return {
        backgroundColor: computedStyle.backgroundColor,
        borderColor: computedStyle.borderTopColor,
      }
    }

    return {
      picked: getPerkRowStyles('Perfect Focus'),
      selected: getPerkRowStyles('Perfect Fit'),
    }
  })

  expect(rowStyles.picked).not.toBeNull()
  expect(rowStyles.selected).not.toBeNull()

  expect(rowStyles.picked?.borderColor).not.toBe(rowStyles.selected?.borderColor)
  expect(rowStyles.picked?.backgroundColor).not.toBe(rowStyles.selected?.backgroundColor)
})
