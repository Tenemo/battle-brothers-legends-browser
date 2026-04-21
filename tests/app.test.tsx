import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test } from 'vitest'
import App from '../src/App'

describe('app', () => {
  test('renders the catalog shell without the old reference root footer', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Perks browser' })).toBeInTheDocument()
    expect(screen.getByLabelText('Search perks')).toBeInTheDocument()
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

    await user.click(screen.getByRole('button', { name: 'Enable category Traits' }))
    expect(screen.getByText('Perk groups')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Disable category Traits' }))
    expect(screen.queryByText('Perk groups')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Enable category Traits' }))
    await user.click(screen.getByRole('button', { name: 'Toggle perk group Calm' }))
    await user.type(screen.getByLabelText('Search perks'), 'Clarity')
    await user.click(screen.getByRole('button', { name: /Clarity/i }))

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
    await user.click(screen.getByRole('button', { name: /Favoured Enemy - Beasts/i }))

    expect(screen.getByRole('heading', { level: 3, name: 'Favored enemy targets' })).toBeInTheDocument()
    expect(screen.getByText('Bear')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Scenario overlays' })).toBeInTheDocument()
    expect(screen.getByText(/Beast Slayers/i)).toBeInTheDocument()
    expect(screen.getByText(/Random pool: Favoured Enemy - Occult, Favoured Enemy - Beasts/i)).toBeInTheDocument()
    expect(screen.queryByText('onBuildPerkTree')).not.toBeInTheDocument()
    expect(screen.queryByText('LegendBear')).not.toBeInTheDocument()
  })

  test('can filter by multiple categories at the same time while keeping subgroup filters scoped', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Enable category Traits' }))
    await user.click(screen.getByRole('button', { name: 'Toggle perk group Calm' }))

    const resultsList = screen.getByTestId('results-list')

    expect(within(resultsList).getByRole('button', { name: /Clarity/i })).toBeInTheDocument()
    expect(
      within(resultsList).queryByRole('button', { name: /Favoured Enemy - Beasts/i }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Enable category Enemy' }))

    expect(within(resultsList).getByRole('button', { name: /Clarity/i })).toBeInTheDocument()
    expect(
      within(resultsList).getByRole('button', { name: /Favoured Enemy - Beasts/i }),
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

  test('renders explicit separators between the category and perk group in result rows', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('Search perks'), 'Butchers Fillet')

    expect(screen.getByText('Class / Butcher / Tier 1')).toBeInTheDocument()
    expect(screen.queryByText('ClassButcher / Tier 1')).not.toBeInTheDocument()
  })
})
