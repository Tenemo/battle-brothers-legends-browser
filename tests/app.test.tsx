import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'
import App from '../src/App'

describe('app', () => {
  test('renders the catalog shell without the old reference root footer', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Perks browser' })).toBeInTheDocument()
    expect(screen.getByLabelText('Search perks')).toBeInTheDocument()
    expect(screen.getByTestId('build-perks-bar')).toBeInTheDocument()
    expect(screen.getByTestId('build-groups-bar')).toBeInTheDocument()
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
    expect(within(resultsList).queryByText("'Excuse me'")).not.toBeInTheDocument()
  })

  test('uses the actual effect instead of an unquoted flavor sentence in result previews', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('Search perks'), 'Blacksmiths Technique')
    const resultsList = screen.getByTestId('results-list')

    expect(
      within(resultsList).getByText(
        /Passive: .*While using a Blacksmith's Hammer gain \+12 chance to hit and \+30% effectiveness vs armor/i,
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
        /Passive: .*upon killing an enemy 4 Action Points are immediately restored/i,
      ),
    ).toBeInTheDocument()
    expect(within(resultsList).queryByText(/^is vicious$/i)).not.toBeInTheDocument()

    await user.clear(searchInput)
    await user.type(searchInput, 'Killing Frenzy')
    expect(
      within(resultsList).getByText(/Passive: .*A kill increases all damage by 25% for two turns/i),
    ).toBeInTheDocument()
    expect(within(resultsList).queryByText(/^axes$/i)).not.toBeInTheDocument()

    await user.clear(searchInput)
    await user.type(searchInput, 'Fearsome')
    expect(
      within(resultsList).getByText(
        /Passive: .*triggers a morale check for the opponent with a penalty equal to 20% of your current Resolve/i,
      ),
    ).toBeInTheDocument()
    expect(within(resultsList).queryByText(/^cleavers$/i)).not.toBeInTheDocument()
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

  test('can pick perks into a build and collapse duplicate perk groups into grouped tiles', async () => {
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
    const buildGroupsBar = screen.getByTestId('build-groups-bar')

    expect(within(buildPerksBar).getByText('Clarity')).toBeInTheDocument()
    expect(within(buildGroupsBar).getByText('Calm')).toBeInTheDocument()
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
    expect(within(buildGroupsBar).getAllByText('Calm')).toHaveLength(1)
    expect(within(buildGroupsBar).getByText('Deadeye')).toBeInTheDocument()
    expect(within(buildGroupsBar).getByText('Clarity, Perfect Focus')).toBeInTheDocument()
    expect(within(screen.getByTestId('results-list')).getByText('Build 2')).toBeInTheDocument()
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
      within(screen.getByTestId('build-groups-bar')).getByText('Required perk groups will appear here'),
    ).toBeInTheDocument()
  })

  test('renders explicit separators between the category and perk group in result rows', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('Search perks'), 'Butchers Fillet')

    expect(screen.getByText('Class / Butcher / Tier 1')).toBeInTheDocument()
    expect(screen.queryByText('ClassButcher / Tier 1')).not.toBeInTheDocument()
  })
})
