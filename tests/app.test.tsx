import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { LegendsPerksDataset } from '../src/types/legends-perks'

const { backgroundFitSourceFileNamesForAppTests, perkNamesForAppTests } = vi.hoisted(() => ({
  backgroundFitSourceFileNamesForAppTests: new Set([
    'apprentice_background.nut',
    'companion_1h_background.nut',
    'companion_2h_background.nut',
    'companion_ranged_background.nut',
    'converted_cultist_background.nut',
    'cultist_background.nut',
    'legend_berserker_background.nut',
    'legend_berserker_commander_background.nut',
    'legend_companion_melee_background.nut',
    'legend_companion_ranged_background.nut',
    'paladin_background.nut',
  ]),
  perkNamesForAppTests: new Set([
    'Axe Mastery',
    'Berserk',
    'Blacksmiths Technique',
    'Butchers Fillet',
    'Clarity',
    'Evasion',
    'Feint',
    'Favoured Enemy - Beasts',
    'Fearsome',
    'Killing Frenzy',
    'Perfect Focus',
    'Steadfast',
  ]),
}))

vi.mock('../src/data/legends-perks.json', async () => {
  const actualDataset = (await vi.importActual(
    '../src/data/legends-perks.json',
  )) as LegendsPerksDataset
  const perks = actualDataset.perks.filter((perk) => perkNamesForAppTests.has(perk.perkName))
  const treeCount = new Set(
    perks.flatMap((perk) =>
      perk.placements.map((placement) => `${placement.categoryName}::${placement.treeId}`),
    ),
  ).size
  const backgroundFitBackgrounds = actualDataset.backgroundFitBackgrounds.filter((backgroundFit) =>
    backgroundFitSourceFileNamesForAppTests.has(
      backgroundFit.sourceFilePath.split('/').at(-1) ?? '',
    ),
  )

  return {
    default: {
      ...actualDataset,
      backgroundFitBackgrounds,
      perkCount: perks.length,
      perks,
      treeCount,
    },
  }
})

import App from '../src/App'

afterEach(() => {
  window.history.replaceState({}, '', '/')
})

function setPerkSearchQuery(nextQuery: string) {
  fireEvent.change(screen.getByLabelText('Search perks'), {
    target: { value: nextQuery },
  })
}

describe('app', () => {
  test('renders the catalog shell without the old reference root footer', () => {
    const { container } = render(<App />)
    const hero = screen.getByRole('banner')
    const brandEmphasis = container.querySelector('.hero-brand-emphasis')

    expect(screen.getByRole('heading', { level: 1, name: 'Perks browser' })).toBeInTheDocument()
    expect(brandEmphasis).not.toBeNull()
    expect(brandEmphasis).toHaveTextContent('Legends')
    expect(within(hero).getByText('Perk groups')).toBeInTheDocument()
    expect(within(hero).getByText('Reference')).toBeInTheDocument()
    expect(within(hero).getByText('19.3.17')).toBeInTheDocument()
    expect(
      screen.getByRole('link', {
        name: 'Open the battle-brothers-legends-browser repository on GitHub',
      }),
    ).toHaveAttribute('href', 'https://github.com/Tenemo/battle-brothers-legends-browser')
    expect(screen.getByLabelText('Search perks')).toBeInTheDocument()
    expect(screen.getByTestId('build-perks-bar')).toBeInTheDocument()
    expect(screen.getByTestId('build-shared-groups-list')).toBeInTheDocument()
    expect(screen.getByTestId('build-individual-groups-list')).toBeInTheDocument()
    expect(
      screen.queryByText('Local Legends perk data, actual game icons, and exact in-mod labels.'),
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/Reference root/i)).not.toBeInTheDocument()
  })

  test('shows an empty state when the search returns no results', async () => {
    render(<App />)

    setPerkSearchQuery('zzzz impossible perk')

    expect(screen.getByRole('heading', { level: 2, name: 'No perks found' })).toBeInTheDocument()
  })

  test('shows and applies the perk search clear button only while search has text', async () => {
    const user = userEvent.setup()
    render(<App />)
    const perkSearchInput = screen.getByLabelText('Search perks')

    expect(screen.queryByRole('button', { name: 'Clear perk search' })).not.toBeInTheDocument()

    await user.type(perkSearchInput, 'Berserk')

    const clearPerkSearchButton = screen.getByRole('button', { name: 'Clear perk search' })

    expect(clearPerkSearchButton).toBeVisible()
    expect(perkSearchInput).toHaveValue('Berserk')

    await user.click(clearPerkSearchButton)

    expect(perkSearchInput).toHaveValue('')
    expect(screen.queryByRole('button', { name: 'Clear perk search' })).not.toBeInTheDocument()
    expect(perkSearchInput).toHaveFocus()
  })

  test('shows and applies the background search clear button only while search has text', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    const backgroundFitPanel = screen.getByRole('complementary', { name: 'Background fit' })
    const backgroundSearchInput = within(backgroundFitPanel).getByLabelText('Search backgrounds')

    expect(
      within(backgroundFitPanel).queryByRole('button', { name: 'Clear background search' }),
    ).not.toBeInTheDocument()

    await user.type(backgroundSearchInput, 'Oath')

    const clearBackgroundSearchButton = within(backgroundFitPanel).getByRole('button', {
      name: 'Clear background search',
    })

    expect(clearBackgroundSearchButton).toBeVisible()
    expect(backgroundSearchInput).toHaveValue('Oath')
    expect(
      within(backgroundFitPanel).getByRole('heading', {
        level: 3,
        name: 'Oathtaker',
      }),
    ).toBeInTheDocument()

    await user.click(clearBackgroundSearchButton)

    expect(backgroundSearchInput).toHaveValue('')
    expect(
      within(backgroundFitPanel).queryByRole('button', { name: 'Clear background search' }),
    ).not.toBeInTheDocument()
    expect(container.querySelector('.background-fit-panel .search-highlight')).toBeNull()
    expect(backgroundSearchInput).toHaveFocus()
  })

  test('can expand and collapse a category, then filter by perk group and inspect a trait perk', async () => {
    const user = userEvent.setup()
    render(<App />)
    const categoriesPanel = screen.getByRole('complementary', { name: 'Perk categories' })

    await user.click(screen.getByRole('button', { name: 'Enable category Traits' }))
    expect(within(categoriesPanel).getByText('Perk groups')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Disable category Traits' }))
    expect(within(categoriesPanel).queryByText('Perk groups')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Enable category Traits' }))
    await user.click(screen.getByRole('button', { name: 'Toggle perk group Calm' }))
    setPerkSearchQuery('Clarity')
    await user.click(
      within(screen.getByTestId('results-list')).getByRole('button', { name: 'Inspect Clarity' }),
    )

    const detailHeading = screen.getByRole('heading', { level: 2, name: 'Clarity' })
    const detailHeader = detailHeading.closest('.detail-header')

    expect(detailHeading).toBeInTheDocument()
    expect(detailHeader).not.toBeNull()
    expect(
      within(detailHeader as HTMLElement).getByRole('img', { name: 'Clarity icon' }),
    ).toHaveAttribute('src', '/game-icons/ui/perks/clarity_circle.png')
    expect(
      screen.getByRole('heading', { level: 3, name: 'Perk group placement' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 3, name: 'Background sources' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 3, name: 'Source files' }),
    ).not.toBeInTheDocument()
  })

  test('renders favored enemy targets and scenario overlay details in the detail panel', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Enable category Enemy' }))
    setPerkSearchQuery('Favoured Enemy - Beasts')
    await user.click(
      within(screen.getByTestId('results-list')).getByRole('button', {
        name: 'Inspect Favoured Enemy - Beasts',
      }),
    )

    expect(
      screen.getByRole('heading', { level: 3, name: 'Favored enemy targets' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Bear')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Scenario overlays' })).toBeInTheDocument()
    expect(screen.getByText(/Beast Slayers/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Random pool: Favoured Enemy - Occult, Favoured Enemy - Beasts/i),
    ).toBeInTheDocument()
    expect(screen.queryByText('onBuildPerkTree')).not.toBeInTheDocument()
    expect(screen.queryByText('LegendBear')).not.toBeInTheDocument()
  })

  test('groups repeated background sources with the same values into one entry', async () => {
    const user = userEvent.setup()
    render(<App />)

    setPerkSearchQuery('Perfect Focus')
    await user.click(
      within(screen.getByTestId('results-list')).getByRole('button', {
        name: 'Inspect Perfect Focus',
      }),
    )

    expect(
      screen.getByText(
        (content) =>
          content.includes('Anatomist') &&
          content.includes('Beast Slayer') &&
          content.includes('Youngblood'),
      ),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Minimum 7 / No chance override')).toHaveLength(1)
  })

  test('uses the actual effect instead of a flavor quote in result previews', async () => {
    render(<App />)

    setPerkSearchQuery('Evasion')
    const resultsList = screen.getByTestId('results-list')

    expect(
      within(resultsList).getByText(/Active: • Enables the character to move swiftly and safely/i),
    ).toBeInTheDocument()
    expect(within(resultsList).getByText(/• Costs 4 AP and 20 Fatigue/i)).toBeInTheDocument()
    expect(within(resultsList).queryByText("'Excuse me'")).not.toBeInTheDocument()
  })

  test('uses the actual effect instead of an unquoted flavor sentence in result previews', async () => {
    render(<App />)

    setPerkSearchQuery('Blacksmiths Technique')
    const resultsList = screen.getByTestId('results-list')

    expect(
      within(resultsList).getByText(
        /While using a Blacksmith's Hammer gain \+12 chance to hit and \+30% effectiveness vs armor/i,
      ),
    ).toBeInTheDocument()
    expect(
      within(resultsList).getByText(
        /• When taking Hammer Mastery you will also gain 10% bonus damage/i,
      ),
    ).toBeInTheDocument()
    expect(
      within(resultsList).queryByText(
        /Diligent practice with the hammer each day has proven to be equally good at crafting armor/i,
      ),
    ).not.toBeInTheDocument()
  })

  test('shows imported effect previews for perks whose descriptions come from hook overrides', async () => {
    render(<App />)
    const searchInput = screen.getByLabelText('Search perks')
    const resultsList = screen.getByTestId('results-list')

    fireEvent.change(searchInput, { target: { value: 'Berserk' } })
    expect(
      within(resultsList).getByText(
        /upon killing an enemy 4 Action Points are immediately restored/i,
      ),
    ).toBeInTheDocument()
    expect(within(resultsList).queryByText(/Passive:/i)).not.toBeInTheDocument()
    expect(within(resultsList).queryByText(/^is vicious$/i)).not.toBeInTheDocument()

    fireEvent.change(searchInput, { target: { value: 'Killing Frenzy' } })
    expect(
      within(resultsList).getByText(/A kill increases all damage by 25% for two turns/i),
    ).toBeInTheDocument()
    expect(
      within(resultsList).getByText(/Does not stack, but another kill will reset the timer/i),
    ).toBeInTheDocument()
    expect(within(resultsList).queryByText(/^axes$/i)).not.toBeInTheDocument()

    fireEvent.change(searchInput, { target: { value: 'Fearsome' } })
    expect(
      within(resultsList).getByText(
        /triggers a morale check for the opponent with a penalty equal to 20% of your current Resolve/i,
      ),
    ).toBeInTheDocument()
    expect(within(resultsList).queryByText(/^cleavers$/i)).not.toBeInTheDocument()
  })

  test('shows normalized mastery labels from the imported technical names', async () => {
    render(<App />)

    setPerkSearchQuery('Axe Mastery')

    expect(
      within(screen.getByTestId('results-list')).getByRole('button', {
        name: 'Inspect Axe Mastery',
      }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Spec Axe')).not.toBeInTheDocument()
  })

  test('reorders categories and perk groups around the active perk search query', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)

    setPerkSearchQuery('Shady')

    const categoryButtons = screen.getAllByRole('button', {
      name: /^(Enable|Disable) category /,
    })

    expect(categoryButtons[0]).toHaveAccessibleName('Enable category Other')

    await user.click(categoryButtons[0])

    const subgroupButtons = screen.getAllByRole('button', { name: /Toggle perk group / })

    expect(subgroupButtons[0]).toHaveAccessibleName('Toggle perk group Shady')
    expect(container.querySelectorAll('.sidebar .search-highlight')).toHaveLength(1)
    expect(container.querySelector('.sidebar .search-highlight')?.textContent).toBe('Shady')
  })

  test('highlights the searched perk phrase in visible perk result text', () => {
    const { container } = render(<App />)

    setPerkSearchQuery('Axe')

    expect(
      container.querySelectorAll('.results-list .search-highlight').length,
    ).toBeGreaterThanOrEqual(1)
    expect(
      [...container.querySelectorAll('.results-list .search-highlight')].some(
        (searchHighlight) => searchHighlight.textContent === 'Axe',
      ),
    ).toBe(true)
  })

  test('can filter by multiple categories at the same time while keeping subgroup filters scoped', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Enable category Traits' }))
    await user.click(screen.getByRole('button', { name: 'Toggle perk group Calm' }))

    const resultsList = screen.getByTestId('results-list')

    expect(within(resultsList).getByRole('button', { name: 'Inspect Clarity' })).toBeInTheDocument()
    expect(
      within(resultsList).queryByRole('button', { name: 'Inspect Favoured Enemy - Beasts' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Enable category Enemy' }))

    expect(within(resultsList).getByRole('button', { name: 'Inspect Clarity' })).toBeInTheDocument()
    expect(
      within(resultsList).getByRole('button', { name: 'Inspect Favoured Enemy - Beasts' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Filtered to 2 categories and 1 perk group.')).toBeInTheDocument()
  })

  test('keeps perk search full-width without tier or clear-all controls', () => {
    render(<App />)

    expect(screen.getByLabelText('Search perks')).toBeInTheDocument()
    expect(screen.queryByLabelText('Filter by tier')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear all filters' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Enable category Traits' }))
    fireEvent.click(screen.getByRole('button', { name: 'Toggle perk group Calm' }))
    setPerkSearchQuery('Clarity')

    expect(screen.getByText('Filtered to 1 category and 1 perk group.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reset all category filters' }))

    expect(screen.getByLabelText('Search perks')).toHaveValue('Clarity')
    expect(screen.getByRole('button', { name: 'Enable category Traits' })).toBeInTheDocument()
  })

  test('can pick perks into a build and split shared and individual perk groups', async () => {
    const user = userEvent.setup()
    render(<App />)

    setPerkSearchQuery('Clarity')
    await user.click(
      within(screen.getByTestId('results-list')).getByRole('button', { name: 'Inspect Clarity' }),
    )
    await user.click(
      within(screen.getByTestId('results-list')).getByRole('button', {
        name: 'Add Clarity to build from results',
      }),
    )

    const buildPerksBar = screen.getByTestId('build-perks-bar')
    const buildSharedGroupsList = screen.getByTestId('build-shared-groups-list')
    const buildIndividualGroupsList = screen.getByTestId('build-individual-groups-list')

    expect(within(buildPerksBar).getByText('Clarity')).toBeInTheDocument()
    expect(within(buildPerksBar).queryByText(/Tier 5/i)).not.toBeInTheDocument()
    expect(within(buildPerksBar).queryByText(/^Remove$/i)).not.toBeInTheDocument()
    expect(
      within(buildSharedGroupsList).getByText(
        'Perk groups covering 2 or more picked perks will appear here',
      ),
    ).toBeInTheDocument()
    expect(within(buildIndividualGroupsList).getByText('Calm')).toBeInTheDocument()
    expect(
      within(buildIndividualGroupsList).getByRole('img', { name: 'Calm perk group icon' }),
    ).toHaveAttribute('src', '/game-icons/ui/perks/clarity_circle.png')
    expect(
      within(buildIndividualGroupsList).getByText('Clarity', { exact: true }),
    ).toBeInTheDocument()
    expect(screen.getByText('Build slot 1')).toBeInTheDocument()

    setPerkSearchQuery('Perfect Focus')
    await user.click(
      within(screen.getByTestId('results-list')).getByRole('button', {
        name: 'Inspect Perfect Focus',
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Add Perfect Focus to build' }))

    expect(within(buildPerksBar).getByText('Perfect Focus')).toBeInTheDocument()
    expect(within(buildSharedGroupsList).getAllByText('Calm')).toHaveLength(1)
    expect(within(buildSharedGroupsList).getByText('Clarity', { exact: true })).toBeInTheDocument()
    expect(
      within(buildSharedGroupsList).getByText('Perfect Focus', { exact: true }),
    ).toBeInTheDocument()
    expect(
      within(buildIndividualGroupsList).getByText('Deadeye', { exact: true }),
    ).toBeInTheDocument()
    expect(
      within(buildIndividualGroupsList).getByText('Perfect Focus', { exact: true }),
    ).toBeInTheDocument()
    expect(within(screen.getByTestId('results-list')).getByText('Build 2')).toBeInTheDocument()
  })

  test('highlights the same covered perk across all planner groups while hovering it', async () => {
    const user = userEvent.setup()
    render(<App />)

    setPerkSearchQuery('Clarity')
    await user.click(
      within(screen.getByTestId('results-list')).getByRole('button', {
        name: 'Add Clarity to build from results',
      }),
    )

    setPerkSearchQuery('Perfect Focus')
    await user.click(
      within(screen.getByTestId('results-list')).getByRole('button', {
        name: 'Add Perfect Focus to build from results',
      }),
    )

    const buildSharedGroupsList = screen.getByTestId('build-shared-groups-list')
    const buildIndividualGroupsList = screen.getByTestId('build-individual-groups-list')
    const buildPerksBar = screen.getByTestId('build-perks-bar')
    const sharedPerfectFocusButton = within(buildSharedGroupsList).getByRole('button', {
      name: 'Perfect Focus',
    })
    const individualPerfectFocusButton = within(buildIndividualGroupsList).getByRole('button', {
      name: 'Perfect Focus',
    })
    const pickedPerfectFocusButton = within(buildPerksBar).getByRole('button', {
      name: 'Remove Perfect Focus from build',
    })
    const sharedClarityButton = within(buildSharedGroupsList).getByRole('button', {
      name: 'Clarity',
    })

    fireEvent.mouseEnter(sharedPerfectFocusButton)

    expect(sharedPerfectFocusButton).toHaveClass('is-highlighted')
    expect(individualPerfectFocusButton).toHaveClass('is-highlighted')
    expect(pickedPerfectFocusButton).toHaveClass('is-highlighted')
    expect(sharedClarityButton).not.toHaveClass('is-highlighted')
  })

  test('links hover highlighting between search results and the build planner', async () => {
    const user = userEvent.setup()
    render(<App />)

    setPerkSearchQuery('Clarity')
    await user.click(
      within(screen.getByTestId('results-list')).getByRole('button', {
        name: 'Add Clarity to build from results',
      }),
    )

    setPerkSearchQuery('Perfect Focus')
    await user.click(
      within(screen.getByTestId('results-list')).getByRole('button', {
        name: 'Add Perfect Focus to build from results',
      }),
    )

    const resultsList = screen.getByTestId('results-list')
    const buildSharedGroupsList = screen.getByTestId('build-shared-groups-list')
    const buildIndividualGroupsList = screen.getByTestId('build-individual-groups-list')
    const buildPerksBar = screen.getByTestId('build-perks-bar')
    const perfectFocusResultsButton = within(resultsList).getByRole('button', {
      name: 'Inspect Perfect Focus',
    })
    const perfectFocusResultsRow = perfectFocusResultsButton.closest('.perk-row')
    const sharedPerfectFocusButton = within(buildSharedGroupsList).getByRole('button', {
      name: 'Perfect Focus',
    })
    const individualPerfectFocusButton = within(buildIndividualGroupsList).getByRole('button', {
      name: 'Perfect Focus',
    })
    const pickedPerfectFocusButton = within(buildPerksBar).getByRole('button', {
      name: 'Remove Perfect Focus from build',
    })

    expect(perfectFocusResultsRow).not.toBeNull()

    fireEvent.mouseEnter(perfectFocusResultsRow as HTMLElement)

    expect(perfectFocusResultsRow).toHaveClass('is-highlighted')
    expect(sharedPerfectFocusButton).toHaveClass('is-highlighted')
    expect(individualPerfectFocusButton).toHaveClass('is-highlighted')
    expect(pickedPerfectFocusButton).toHaveClass('is-highlighted')

    fireEvent.mouseLeave(perfectFocusResultsRow as HTMLElement)
    fireEvent.mouseEnter(sharedPerfectFocusButton)

    expect(perfectFocusResultsRow).toHaveClass('is-highlighted')
    expect(sharedPerfectFocusButton).toHaveClass('is-highlighted')
    expect(individualPerfectFocusButton).toHaveClass('is-highlighted')
    expect(pickedPerfectFocusButton).toHaveClass('is-highlighted')
  })

  test('shows picked-perk stars next to category and subgroup counts based on the current build', async () => {
    const user = userEvent.setup()
    render(<App />)

    setPerkSearchQuery('Clarity')
    await user.click(
      within(screen.getByTestId('results-list')).getByRole('button', {
        name: 'Add Clarity to build from results',
      }),
    )

    setPerkSearchQuery('Perfect Focus')
    await user.click(
      within(screen.getByTestId('results-list')).getByRole('button', {
        name: 'Add Perfect Focus to build from results',
      }),
    )

    const traitsCategoryButton = screen.getByRole('button', { name: 'Enable category Traits' })
    const magicCategoryButton = screen.getByRole('button', { name: 'Enable category Magic' })
    const traitsCategoryStarCount = traitsCategoryButton.querySelectorAll(
      '.group-chip-picked-stars .build-star',
    ).length
    const magicCategoryStarCount = magicCategoryButton.querySelectorAll(
      '.group-chip-picked-stars .build-star',
    ).length

    expect(traitsCategoryStarCount).toBe(2)
    expect(magicCategoryStarCount).toBe(1)

    await user.click(traitsCategoryButton)
    await user.click(magicCategoryButton)

    const calmSubgroupButton = screen.getByRole('button', { name: 'Toggle perk group Calm' })
    const deadeyeSubgroupButton = screen.getByRole('button', { name: 'Toggle perk group Deadeye' })
    const calmSubgroupStarCount = calmSubgroupButton.querySelectorAll(
      '.group-chip-picked-stars .build-star',
    ).length
    const deadeyeSubgroupStarCount = deadeyeSubgroupButton.querySelectorAll(
      '.group-chip-picked-stars .build-star',
    ).length

    expect(calmSubgroupStarCount).toBe(2)
    expect(deadeyeSubgroupStarCount).toBe(1)
  })

  test('merges individual perk groups that unlock the same picked perk into one card', () => {
    window.history.replaceState({}, '', '/?build=Steadfast')

    render(<App />)
    const buildIndividualGroupsList = screen.getByTestId('build-individual-groups-list')

    expect(
      within(buildIndividualGroupsList).getByText('Heavy Armor / Sturdy / Swordmasters'),
    ).toBeInTheDocument()
    expect(
      within(buildIndividualGroupsList).getByText('Steadfast', { exact: true }),
    ).toBeInTheDocument()
  })

  test('shows an immediate tooltip with the perk effect when a picked perk tile is focused', async () => {
    const user = userEvent.setup()
    render(<App />)

    setPerkSearchQuery('Clarity')
    await user.click(
      within(screen.getByTestId('results-list')).getByRole('button', {
        name: 'Add Clarity to build from results',
      }),
    )

    const pickedPerkTile = within(screen.getByTestId('build-perks-bar')).getByRole('button', {
      name: 'Remove Clarity from build',
    })

    fireEvent.focus(pickedPerkTile)
    const buildPerkTooltip = screen.getByRole('tooltip')

    expect(buildPerkTooltip).toBeInTheDocument()
    expect(
      within(buildPerkTooltip).getByText(/An additional \+10% of any damage ignores armor/i),
    ).toBeInTheDocument()
  })

  test('shows the same tooltip when a covered perk in planner perk groups is focused', async () => {
    const user = userEvent.setup()
    render(<App />)

    setPerkSearchQuery('Clarity')
    await user.click(
      within(screen.getByTestId('results-list')).getByRole('button', {
        name: 'Add Clarity to build from results',
      }),
    )

    setPerkSearchQuery('Perfect Focus')
    await user.click(
      within(screen.getByTestId('results-list')).getByRole('button', {
        name: 'Add Perfect Focus to build from results',
      }),
    )

    const coveredPerkButton = within(screen.getByTestId('build-shared-groups-list')).getByRole(
      'button',
      {
        name: 'Perfect Focus',
      },
    )

    fireEvent.focus(coveredPerkButton)
    const buildPerkTooltip = screen.getByRole('tooltip')

    expect(buildPerkTooltip).toBeInTheDocument()
    expect(
      within(buildPerkTooltip).getByText(/Unlocks the Perfect Focus skill/i),
    ).toBeInTheDocument()
  })

  test('can remove perks from the build and clear the planner', async () => {
    const user = userEvent.setup()
    render(<App />)

    setPerkSearchQuery('Clarity')
    await user.click(
      within(screen.getByTestId('results-list')).getByRole('button', { name: 'Inspect Clarity' }),
    )
    await user.click(screen.getByRole('button', { name: 'Add Clarity to build' }))

    expect(screen.getByText('1 perk picked.')).toBeInTheDocument()

    await user.click(
      within(screen.getByTestId('build-perks-bar')).getByRole('button', {
        name: 'Remove Clarity from build',
      }),
    )

    expect(screen.getByText('No perks picked yet.')).toBeInTheDocument()
    expect(
      within(screen.getByTestId('build-perks-bar')).getByText('Pick a perk to start'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add Clarity to build' }))
    await user.click(screen.getByRole('button', { name: 'Clear build' }))

    expect(screen.getByText('No perks picked yet.')).toBeInTheDocument()
    expect(
      within(screen.getByTestId('build-shared-groups-list')).getByText(
        'Perk groups covering 2 or more picked perks will appear here',
      ),
    ).toBeInTheDocument()
    expect(
      within(screen.getByTestId('build-individual-groups-list')).getByText(
        'Single-perk groups will appear here',
      ),
    ).toBeInTheDocument()
  })

  test('renders explicit separators between the category and perk group in result rows', async () => {
    render(<App />)

    setPerkSearchQuery('Butchers Fillet')

    expect(screen.getByText('Class / Butcher / Tier 1')).toBeInTheDocument()
    expect(screen.queryByText('ClassButcher / Tier 1')).not.toBeInTheDocument()
  })

  test('restores filters and the picked build from a shared url', () => {
    window.history.replaceState(
      {},
      '',
      '/?search=Perfect+Focus&category=Traits,Magic&group-traits=Calm&group-magic=Deadeye&build=Clarity,Perfect+Focus',
    )

    render(<App />)
    const categoriesPanel = screen.getByRole('complementary', { name: 'Perk categories' })

    expect(screen.getByLabelText('Search perks')).toHaveValue('Perfect Focus')
    expect(screen.queryByLabelText('Filter by tier')).not.toBeInTheDocument()
    expect(within(categoriesPanel).getAllByText('Perk groups')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Disable category Traits' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Disable category Magic' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Inspect Perfect Focus' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Inspect Clarity' })).not.toBeInTheDocument()
    expect(within(screen.getByTestId('build-perks-bar')).getByText('Clarity')).toBeInTheDocument()
    expect(
      within(screen.getByTestId('build-perks-bar')).getByText('Perfect Focus'),
    ).toBeInTheDocument()
    expect(
      within(screen.getByTestId('build-shared-groups-list')).getByText('Calm'),
    ).toBeInTheDocument()
    expect(
      within(screen.getByTestId('build-shared-groups-list')).getByText('Clarity'),
    ).toBeInTheDocument()
    expect(
      within(screen.getByTestId('build-shared-groups-list')).getByText('Perfect Focus'),
    ).toBeInTheDocument()
    expect(
      within(screen.getByTestId('build-individual-groups-list')).getByText('Deadeye'),
    ).toBeInTheDocument()
    expect(
      within(screen.getByTestId('build-individual-groups-list')).getByText('Perfect Focus', {
        exact: true,
      }),
    ).toBeInTheDocument()
  })

  test('shows the background fit ranking with the panel open and cards collapsed by default', async () => {
    const user = userEvent.setup()
    render(<App />)

    setPerkSearchQuery('Axe Mastery')
    await user.click(
      within(screen.getByTestId('results-list')).getByRole('button', {
        name: 'Add Axe Mastery to build from results',
      }),
    )

    const backgroundFitPanel = screen.getByRole('complementary', { name: 'Background fit' })
    const backgroundFitPanelBody = screen.getByTestId('background-fit-panel-body')
    const backgroundFitCollapseToggle = within(backgroundFitPanel).getByRole('button', {
      name: 'Collapse background fit',
    })
    const apprenticeToggle = within(backgroundFitPanel).getByRole('button', {
      name: 'Expand background Apprentice',
    })
    const apprenticeCard = apprenticeToggle.closest('.background-fit-card')
    const apprenticePanel = apprenticeCard?.querySelector('.background-fit-card-panel')

    expect(backgroundFitPanelBody).toHaveAttribute('aria-hidden', 'false')
    expect(backgroundFitCollapseToggle).toHaveAttribute('aria-expanded', 'true')
    expect(within(backgroundFitPanel).queryByText('Background fit')).not.toBeInTheDocument()
    expect(
      within(backgroundFitPanel).getByText(
        /Ranked by guaranteed perks pickable first, then total perks pickable/i,
      ),
    ).toBeInTheDocument()
    expect(apprenticeCard).not.toBeNull()
    expect(apprenticePanel).not.toBeNull()
    expect(within(apprenticeCard as HTMLElement).getByText('Apprentice')).toBeInTheDocument()
    expect(
      within(apprenticeCard as HTMLElement).getByRole('img', {
        name: 'Apprentice background icon',
      }),
    ).toHaveAttribute('src', '/game-icons/ui/backgrounds/background_40.png')
    expect(
      within(apprenticeCard as HTMLElement).getByText('Up to 1/1 perks pickable'),
    ).toBeInTheDocument()
    expect(
      within(apprenticeCard as HTMLElement).getByText('Guaranteed 1/1 perks pickable'),
    ).toBeInTheDocument()
    expect(apprenticePanel as HTMLElement).toHaveAttribute('aria-hidden', 'true')
    expect(within(apprenticeCard as HTMLElement).getByText('1/1 matched group')).toBeInTheDocument()
    expect(
      within(apprenticeCard as HTMLElement).getByText(/Maximum \d+ total groups/),
    ).toBeInTheDocument()
    expect(
      (apprenticeCard as HTMLElement).querySelectorAll('.background-fit-accordion-summary-row'),
    ).toHaveLength(2)

    fireEvent.mouseEnter(
      within(apprenticeCard as HTMLElement).getByText(/Maximum \d+ total groups/),
    )

    const backgroundFitSummaryTooltip = screen.getByRole('tooltip')

    expect(backgroundFitSummaryTooltip).toBeInTheDocument()
    expect(
      within(backgroundFitSummaryTooltip).getByText(/Overall hard cap for this background/i),
    ).toBeInTheDocument()
    expect(
      within(backgroundFitSummaryTooltip).getByText(/not limited to your build/i),
    ).toBeInTheDocument()

    await user.click(apprenticeToggle)

    expect(
      within(apprenticeCard as HTMLElement).getByRole('button', {
        name: 'Collapse background Apprentice',
      }),
    ).toBeInTheDocument()
    expect(apprenticePanel as HTMLElement).toHaveAttribute('aria-hidden', 'false')
    expect(
      within(apprenticeCard as HTMLElement).getByText('Guaranteed groups 1'),
    ).toBeInTheDocument()
    expect(
      within(apprenticeCard as HTMLElement).queryByText(/^Guaranteed weight /),
    ).not.toBeInTheDocument()
    expect(
      within(apprenticeCard as HTMLElement).queryByText(/^Expected \+/),
    ).not.toBeInTheDocument()

    const categoriesPanel = screen.getByRole('complementary', { name: 'Perk categories' })
    const axeMatchButton = within(apprenticeCard as HTMLElement).getByRole('button', {
      name: 'Select perk group Axe',
    })
    const plannerAxeGroupCard = within(screen.getByTestId('build-individual-groups-list'))
      .getByText('Axe', { exact: true })
      .closest('.planner-group-card')
    const weaponCategoryButton = within(categoriesPanel).getByRole('button', {
      name: 'Enable category Weapon',
    })

    expect(plannerAxeGroupCard).not.toBeNull()

    fireEvent.mouseEnter(axeMatchButton)

    expect(axeMatchButton).toHaveClass('is-highlighted')
    expect(plannerAxeGroupCard).toHaveClass('is-highlighted')
    expect(weaponCategoryButton).toHaveClass('is-highlighted')

    fireEvent.mouseLeave(axeMatchButton)

    expect(axeMatchButton).not.toHaveClass('is-highlighted')
    expect(plannerAxeGroupCard).not.toHaveClass('is-highlighted')
    expect(weaponCategoryButton).not.toHaveClass('is-highlighted')

    await user.click(axeMatchButton)

    const selectedWeaponCategoryButton = within(categoriesPanel).getByRole('button', {
      name: 'Disable category Weapon',
    })
    const selectedAxeGroupButton = within(categoriesPanel).getByRole('button', {
      name: 'Toggle perk group Axe',
    })

    expect(selectedWeaponCategoryButton).toHaveClass('is-active')
    expect(selectedAxeGroupButton).toHaveClass('is-active')
    expect(screen.getByLabelText('Search perks')).toHaveValue('')
    expect(screen.getByText('Filtered to 1 category and 1 perk group.')).toBeInTheDocument()

    fireEvent.mouseEnter(axeMatchButton)

    expect(selectedAxeGroupButton).toHaveClass('is-highlighted')

    await user.click(backgroundFitCollapseToggle)

    expect(backgroundFitCollapseToggle).toHaveAttribute('aria-expanded', 'false')
    expect(backgroundFitPanelBody).toHaveAttribute('aria-hidden', 'true')
    expect(within(backgroundFitPanel).getByText('Background fit')).toBeInTheDocument()

    await user.click(
      within(backgroundFitPanel).getByRole('button', {
        name: 'Expand background fit',
      }),
    )

    expect(backgroundFitPanelBody).toHaveAttribute('aria-hidden', 'false')
  })

  test('filters background fit cards by background name', async () => {
    const user = userEvent.setup()
    render(<App />)

    setPerkSearchQuery('Axe Mastery')
    await user.click(
      within(screen.getByTestId('results-list')).getByRole('button', {
        name: 'Add Axe Mastery to build from results',
      }),
    )

    const backgroundFitPanel = screen.getByRole('complementary', { name: 'Background fit' })
    const backgroundSearchInput = within(backgroundFitPanel).getByLabelText('Search backgrounds')
    const workspace = screen.getByRole('main')
    const oathtakerHeadingBeforeFiltering = within(backgroundFitPanel).getByRole('heading', {
      level: 3,
      name: 'Oathtaker',
    })
    const oathtakerCardBeforeFiltering =
      oathtakerHeadingBeforeFiltering.closest('.background-fit-card')
    const oathtakerRankBeforeFiltering =
      oathtakerCardBeforeFiltering?.querySelector('.background-fit-rank')?.textContent ?? null

    expect(backgroundSearchInput).toHaveValue('')
    expect(workspace).not.toHaveClass('has-active-background-fit-search')
    expect(oathtakerRankBeforeFiltering).toMatch(/^\d+$/)

    await user.type(backgroundSearchInput, 'Oath')

    expect(workspace).toHaveClass('has-active-background-fit-search')
    const oathtakerCardAfterFiltering = within(backgroundFitPanel)
      .getByRole('heading', {
        level: 3,
        name: 'Oathtaker',
      })
      .closest('.background-fit-card')

    expect(oathtakerCardAfterFiltering).not.toBeNull()
    expect(
      oathtakerCardAfterFiltering?.querySelector('.background-fit-rank')?.textContent ?? null,
    ).toBe(oathtakerRankBeforeFiltering)
    expect(
      within(backgroundFitPanel).queryByRole('heading', {
        level: 3,
        name: 'Apprentice',
      }),
    ).not.toBeInTheDocument()

    await user.clear(backgroundSearchInput)
    await user.type(backgroundSearchInput, 'zzzz impossible background')

    expect(
      within(backgroundFitPanel).getByText('No backgrounds match "zzzz impossible background".'),
    ).toBeInTheDocument()
  })

  test('keeps background search enabled and usable without any picked perks', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)

    const backgroundFitPanel = screen.getByRole('complementary', { name: 'Background fit' })
    const backgroundSearchInput = within(backgroundFitPanel).getByLabelText('Search backgrounds')

    expect(backgroundSearchInput).toBeEnabled()
    expect(
      within(backgroundFitPanel).queryByText(/Showing all backgrounds/i),
    ).not.toBeInTheDocument()
    expect(within(backgroundFitPanel).queryByText(/Exact probabilities/i)).not.toBeInTheDocument()

    await user.type(backgroundSearchInput, 'Oath')

    expect(
      within(backgroundFitPanel).getByRole('heading', {
        level: 3,
        name: 'Oathtaker',
      }),
    ).toBeInTheDocument()
    expect(container.querySelectorAll('.background-fit-panel .search-highlight')).toHaveLength(1)
    expect(container.querySelector('.background-fit-panel .search-highlight')?.textContent).toBe(
      'Oath',
    )
    expect(
      within(backgroundFitPanel).queryByText(
        /Ranked by guaranteed perks pickable first, then total perks pickable/i,
      ),
    ).not.toBeInTheDocument()
  })

  test('keeps zero-match backgrounds in the list after matching backgrounds', async () => {
    const user = userEvent.setup()
    render(<App />)

    setPerkSearchQuery('Axe Mastery')
    await user.click(
      within(screen.getByTestId('results-list')).getByRole('button', {
        name: 'Add Axe Mastery to build from results',
      }),
    )

    const backgroundFitPanel = screen.getByRole('complementary', { name: 'Background fit' })
    const orderedBackgroundNames = [
      ...backgroundFitPanel.querySelectorAll('.background-fit-card h3'),
    ].map((heading) => heading.textContent?.trim())

    expect(orderedBackgroundNames).toContain('Apprentice')
    expect(orderedBackgroundNames).toContain('Oathtaker')
    expect(orderedBackgroundNames.indexOf('Apprentice')).toBeLessThan(
      orderedBackgroundNames.indexOf('Oathtaker'),
    )
  })

  test('shows duplicate-name disambiguators only for repeated backgrounds in the background fit list', async () => {
    const user = userEvent.setup()
    render(<App />)

    setPerkSearchQuery('Axe Mastery')
    await user.click(
      within(screen.getByTestId('results-list')).getByRole('button', {
        name: 'Add Axe Mastery to build from results',
      }),
    )

    const backgroundFitPanel = screen.getByRole('complementary', { name: 'Background fit' })
    const apprenticeHeading = within(backgroundFitPanel).getByRole('heading', {
      level: 3,
      name: 'Apprentice',
    })
    const apprenticeCard = apprenticeHeading.closest('.background-fit-card')

    expect(apprenticeCard).not.toBeNull()
    expect(apprenticeCard?.querySelector('.background-fit-disambiguator')).toBeNull()
    expect(within(backgroundFitPanel).getByText('starting shield')).toBeInTheDocument()
    expect(within(backgroundFitPanel).getByText('starting two-handed')).toBeInTheDocument()
    expect(within(backgroundFitPanel).getByText('starting ranged')).toBeInTheDocument()
    expect(within(backgroundFitPanel).getByText('origin melee')).toBeInTheDocument()
    expect(within(backgroundFitPanel).getByText('origin ranged')).toBeInTheDocument()
    expect(within(backgroundFitPanel).getAllByText('origin commander').length).toBeGreaterThan(0)
    expect(within(backgroundFitPanel).getByText('converted cultist')).toBeInTheDocument()
  })
})
