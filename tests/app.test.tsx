import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test } from 'vitest'
import App from '../src/App'

afterEach(() => {
  window.history.replaceState({}, '', '/')
})

describe('app', () => {
  test('renders the catalog shell without the old reference root footer', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Perks browser' })).toBeInTheDocument()
    expect(
      screen.getByRole('link', {
        name: 'Open the battle-brothers-legends-browser repository on GitHub',
      }),
    ).toHaveAttribute('href', 'https://github.com/Tenemo/battle-brothers-legends-browser')
    expect(screen.getByLabelText('Search perks')).toBeInTheDocument()
    expect(screen.getByTestId('build-perks-bar')).toBeInTheDocument()
    expect(screen.getByTestId('build-shared-groups-list')).toBeInTheDocument()
    expect(screen.getByTestId('build-individual-groups-list')).toBeInTheDocument()
    expect(screen.queryByText(/Reference root/i)).not.toBeInTheDocument()
  })

  test('shows an empty state when the search returns no results', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('Search perks'), 'zzzz impossible perk')

    expect(screen.getByRole('heading', { level: 2, name: 'No perks found' })).toBeInTheDocument()
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
    await user.type(screen.getByLabelText('Search perks'), 'Clarity')
    await user.click(
      within(screen.getByTestId('results-list')).getByRole('button', { name: 'Inspect Clarity' }),
    )

    const detailHeading = screen.getByRole('heading', { level: 2, name: 'Clarity' })
    const detailHeader = detailHeading.closest('.detail-header')

    expect(detailHeading).toBeInTheDocument()
    expect(detailHeader).not.toBeNull()
    expect(within(detailHeader as HTMLElement).getByRole('img', { name: 'Clarity icon' })).toHaveAttribute(
      'src',
      '/game-icons/ui/perks/clarity_circle.png',
    )
    expect(screen.getByRole('heading', { level: 3, name: 'Tree placement' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Background sources' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3, name: 'Source files' })).not.toBeInTheDocument()
  })

  test('renders favored enemy targets and scenario overlay details in the detail panel', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Enable category Enemy' }))
    await user.type(screen.getByLabelText('Search perks'), 'Favoured Enemy - Beasts')
    await user.click(
      within(screen.getByTestId('results-list')).getByRole('button', {
        name: 'Inspect Favoured Enemy - Beasts',
      }),
    )

    expect(screen.getByRole('heading', { level: 3, name: 'Favored enemy targets' })).toBeInTheDocument()
    expect(screen.getByText('Bear')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Scenario overlays' })).toBeInTheDocument()
    expect(screen.getByText(/Beast Slayers/i)).toBeInTheDocument()
    expect(screen.getByText(/Random pool: Favoured Enemy - Occult, Favoured Enemy - Beasts/i)).toBeInTheDocument()
    expect(screen.queryByText('onBuildPerkTree')).not.toBeInTheDocument()
    expect(screen.queryByText('LegendBear')).not.toBeInTheDocument()
  })

  test('groups repeated background sources with the same values into one entry', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('Search perks'), 'Perfect Focus')
    await user.click(
      within(screen.getByTestId('results-list')).getByRole('button', {
        name: 'Inspect Perfect Focus',
      }),
    )

    expect(screen.getByText(/Anatomist, Assassin, Beast Slayer/i)).toBeInTheDocument()
    expect(screen.getAllByText('Minimum 7 / No chance override')).toHaveLength(1)
  })

  test('uses the actual effect instead of a flavor quote in result previews', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('Search perks'), 'Evasion')
    const resultsList = screen.getByTestId('results-list')

    expect(
      within(resultsList).getByText(/Active: • Enables the character to move swiftly and safely/i),
    ).toBeInTheDocument()
    expect(
      within(resultsList).getByText(
        /• Costs 4 AP and 20 Fatigue/i,
      ),
    ).toBeInTheDocument()
    expect(within(resultsList).queryByText("'Excuse me'")).not.toBeInTheDocument()
  })

  test('uses the actual effect instead of an unquoted flavor sentence in result previews', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('Search perks'), 'Blacksmiths Technique')
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
    const user = userEvent.setup()
    render(<App />)
    const searchInput = screen.getByLabelText('Search perks')
    const resultsList = screen.getByTestId('results-list')

    await user.type(searchInput, 'Berserk')
    expect(
      within(resultsList).getByText(
        /upon killing an enemy 4 Action Points are immediately restored/i,
      ),
    ).toBeInTheDocument()
    expect(within(resultsList).queryByText(/Passive:/i)).not.toBeInTheDocument()
    expect(within(resultsList).queryByText(/^is vicious$/i)).not.toBeInTheDocument()

    await user.clear(searchInput)
    await user.type(searchInput, 'Killing Frenzy')
    expect(
      within(resultsList).getByText(/A kill increases all damage by 25% for two turns/i),
    ).toBeInTheDocument()
    expect(
      within(resultsList).getByText(/Does not stack, but another kill will reset the timer/i),
    ).toBeInTheDocument()
    expect(within(resultsList).queryByText(/^axes$/i)).not.toBeInTheDocument()

    await user.clear(searchInput)
    await user.type(searchInput, 'Fearsome')
    expect(
      within(resultsList).getByText(
        /triggers a morale check for the opponent with a penalty equal to 20% of your current Resolve/i,
      ),
    ).toBeInTheDocument()
    expect(within(resultsList).queryByText(/^cleavers$/i)).not.toBeInTheDocument()
  })

  test('shows normalized mastery labels from the imported technical names', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('Search perks'), 'Axe Mastery')

    expect(
      within(screen.getByTestId('results-list')).getByRole('button', {
        name: 'Inspect Axe Mastery',
      }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Spec Axe')).not.toBeInTheDocument()
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

  test('can clear all active filters at once', async () => {
    const user = userEvent.setup()
    render(<App />)

    const clearAllButton = screen.getByRole('button', { name: 'Clear all filters' })

    expect(clearAllButton).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Enable category Traits' }))
    await user.click(screen.getByRole('button', { name: 'Toggle perk group Calm' }))
    await user.selectOptions(screen.getByLabelText('Filter by tier'), '5')
    await user.type(screen.getByLabelText('Search perks'), 'Clarity')

    expect(clearAllButton).toBeEnabled()
    expect(screen.getByText('Filtered to 1 category and 1 perk group.')).toBeInTheDocument()

    await user.click(clearAllButton)

    expect(screen.getByLabelText('Search perks')).toHaveValue('')
    expect(screen.getByLabelText('Filter by tier')).toHaveValue('all-tiers')
    expect(clearAllButton).toBeDisabled()
    expect(screen.getByText(/Ranked by exact perk names first/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enable category Traits' })).toBeInTheDocument()
  })

  test('can pick perks into a build and split shared and individual perk groups', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('Search perks'), 'Clarity')
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
    expect(within(buildIndividualGroupsList).getByText('Clarity', { exact: true })).toBeInTheDocument()
    expect(screen.getByText('Build slot 1')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Search perks'))
    await user.type(screen.getByLabelText('Search perks'), 'Perfect Focus')
    await user.click(
      within(screen.getByTestId('results-list')).getByRole('button', {
        name: 'Inspect Perfect Focus',
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Add Perfect Focus to build' }))

    expect(within(buildPerksBar).getByText('Perfect Focus')).toBeInTheDocument()
      expect(within(buildSharedGroupsList).getAllByText('Calm')).toHaveLength(1)
      expect(within(buildSharedGroupsList).getByText('Clarity', { exact: true })).toBeInTheDocument()
      expect(within(buildSharedGroupsList).getByText('Perfect Focus', { exact: true })).toBeInTheDocument()
      expect(within(buildIndividualGroupsList).getByText('Deadeye', { exact: true })).toBeInTheDocument()
      expect(within(buildIndividualGroupsList).getByText('Perfect Focus', { exact: true })).toBeInTheDocument()
      expect(within(screen.getByTestId('results-list')).getByText('Build 2')).toBeInTheDocument()
    })

    test('highlights the same covered perk across all planner groups while hovering it', async () => {
      const user = userEvent.setup()
      render(<App />)

      await user.type(screen.getByLabelText('Search perks'), 'Clarity')
      await user.click(
        within(screen.getByTestId('results-list')).getByRole('button', {
          name: 'Add Clarity to build from results',
        }),
      )

      await user.clear(screen.getByLabelText('Search perks'))
      await user.type(screen.getByLabelText('Search perks'), 'Perfect Focus')
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

    test('shows picked-perk stars next to category and subgroup counts based on the current build', async () => {
      const user = userEvent.setup()
      render(<App />)

    await user.type(screen.getByLabelText('Search perks'), 'Clarity')
    await user.click(
      within(screen.getByTestId('results-list')).getByRole('button', {
        name: 'Add Clarity to build from results',
      }),
    )

    await user.clear(screen.getByLabelText('Search perks'))
    await user.type(screen.getByLabelText('Search perks'), 'Perfect Focus')
    await user.click(
      within(screen.getByTestId('results-list')).getByRole('button', {
        name: 'Add Perfect Focus to build from results',
      }),
    )

    const traitsCategoryButton = screen.getByRole('button', { name: 'Enable category Traits' })
    const magicCategoryButton = screen.getByRole('button', { name: 'Enable category Magic' })
    const traitsCategoryStarCount =
      traitsCategoryButton.querySelectorAll('.group-chip-picked-stars .build-star').length
    const magicCategoryStarCount =
      magicCategoryButton.querySelectorAll('.group-chip-picked-stars .build-star').length

    expect(traitsCategoryStarCount).toBe(2)
    expect(magicCategoryStarCount).toBe(1)

    await user.click(traitsCategoryButton)
    await user.click(magicCategoryButton)

    const calmSubgroupButton = screen.getByRole('button', { name: 'Toggle perk group Calm' })
    const deadeyeSubgroupButton = screen.getByRole('button', { name: 'Toggle perk group Deadeye' })
    const calmSubgroupStarCount =
      calmSubgroupButton.querySelectorAll('.group-chip-picked-stars .build-star').length
    const deadeyeSubgroupStarCount =
      deadeyeSubgroupButton.querySelectorAll('.group-chip-picked-stars .build-star').length

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
    expect(within(buildIndividualGroupsList).getByText('Steadfast', { exact: true })).toBeInTheDocument()
  })

  test('shows an immediate tooltip with the perk effect when a picked perk tile is focused', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('Search perks'), 'Clarity')
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

    await user.type(screen.getByLabelText('Search perks'), 'Clarity')
    await user.click(
      within(screen.getByTestId('results-list')).getByRole('button', {
        name: 'Add Clarity to build from results',
      }),
    )

    await user.clear(screen.getByLabelText('Search perks'))
    await user.type(screen.getByLabelText('Search perks'), 'Perfect Focus')
    await user.click(
      within(screen.getByTestId('results-list')).getByRole('button', {
        name: 'Add Perfect Focus to build from results',
      }),
    )

    const coveredPerkButton = within(screen.getByTestId('build-shared-groups-list')).getByRole('button', {
      name: 'Perfect Focus',
    })

    fireEvent.focus(coveredPerkButton)
    const buildPerkTooltip = screen.getByRole('tooltip')

    expect(buildPerkTooltip).toBeInTheDocument()
    expect(within(buildPerkTooltip).getByText(/Unlocks the Perfect Focus skill/i)).toBeInTheDocument()
  })

  test('can remove perks from the build and clear the planner', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('Search perks'), 'Clarity')
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
    expect(within(screen.getByTestId('build-perks-bar')).getByText('Pick a perk to start')).toBeInTheDocument()

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
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('Search perks'), 'Butchers Fillet')

    expect(screen.getByText('Class / Butcher / Tier 1')).toBeInTheDocument()
    expect(screen.queryByText('ClassButcher / Tier 1')).not.toBeInTheDocument()
  })

  test('restores filters and the picked build from a shared url', () => {
    window.history.replaceState(
      {},
      '',
      '/?search=Perfect+Focus&tier=7&category=Traits&category=Magic&group-traits=Calm&group-magic=Deadeye&build=Clarity&build=Perfect+Focus',
    )

    render(<App />)
    const categoriesPanel = screen.getByRole('complementary', { name: 'Perk categories' })

    expect(screen.getByLabelText('Search perks')).toHaveValue('Perfect Focus')
    expect(screen.getByLabelText('Filter by tier')).toHaveValue('7')
    expect(within(categoriesPanel).getAllByText('Perk groups')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Disable category Traits' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Disable category Magic' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Inspect Perfect Focus' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Inspect Clarity' })).not.toBeInTheDocument()
    expect(within(screen.getByTestId('build-perks-bar')).getByText('Clarity')).toBeInTheDocument()
    expect(within(screen.getByTestId('build-perks-bar')).getByText('Perfect Focus')).toBeInTheDocument()
    expect(within(screen.getByTestId('build-shared-groups-list')).getByText('Calm')).toBeInTheDocument()
    expect(within(screen.getByTestId('build-shared-groups-list')).getByText('Clarity')).toBeInTheDocument()
    expect(within(screen.getByTestId('build-shared-groups-list')).getByText('Perfect Focus')).toBeInTheDocument()
    expect(
      within(screen.getByTestId('build-individual-groups-list')).getByText('Deadeye'),
    ).toBeInTheDocument()
    expect(
      within(screen.getByTestId('build-individual-groups-list')).getByText(
        'Perfect Focus',
        { exact: true },
      ),
    ).toBeInTheDocument()
  })

  test('shows the background fit ranking with the panel open and cards collapsed by default', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('Search perks'), 'Axe Mastery')
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
    expect(within(backgroundFitPanel).getByText(/Ranked by guaranteed build weight first/i)).toBeInTheDocument()
    expect(apprenticeCard).not.toBeNull()
    expect(apprenticePanel).not.toBeNull()
    expect(within(apprenticeCard as HTMLElement).getByText('Apprentice')).toBeInTheDocument()
    expect(within(apprenticeCard as HTMLElement).getByText('Up to 1/1 perks pickable')).toBeInTheDocument()
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
    expect(within(apprenticeCard as HTMLElement).getByText('Guaranteed groups 1')).toBeInTheDocument()

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

      await user.type(screen.getByLabelText('Search perks'), 'Axe Mastery')
      await user.click(
        within(screen.getByTestId('results-list')).getByRole('button', {
          name: 'Add Axe Mastery to build from results',
        }),
      )

      const backgroundFitPanel = screen.getByRole('complementary', { name: 'Background fit' })
      const backgroundSearchInput = within(backgroundFitPanel).getByLabelText('Search backgrounds')

      expect(backgroundSearchInput).toHaveValue('')

      await user.type(backgroundSearchInput, 'Oathtaker')

      expect(
        within(backgroundFitPanel).getByRole('heading', {
          level: 3,
          name: 'Oathtaker',
        }),
      ).toBeInTheDocument()
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

    test('shows duplicate-name disambiguators only for repeated backgrounds in the background fit list', async () => {
      const user = userEvent.setup()
      render(<App />)

    await user.type(screen.getByLabelText('Search perks'), 'Axe Mastery')
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
    expect(within(backgroundFitPanel).getByText('companion 1h')).toBeInTheDocument()
    expect(within(backgroundFitPanel).getByText('companion 2h')).toBeInTheDocument()
    expect(within(backgroundFitPanel).getByText('companion ranged')).toBeInTheDocument()
    expect(within(backgroundFitPanel).getByText('converted cultist')).toBeInTheDocument()
  })
})
