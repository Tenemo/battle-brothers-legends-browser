import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { LegendsPerksDataset } from '../src/types/legends-perks'

const { backgroundFitSourceFileNamesForAppTests, perkNamesForAppTests } = vi.hoisted(() => ({
  backgroundFitSourceFileNamesForAppTests: new Set([
    'apprentice_background.nut',
    'paladin_background.nut',
  ]),
  perkNamesForAppTests: new Set(['Berserk']),
}))

vi.mock('../src/data/legends-perks.json', async () => {
  const actualDataset = (await vi.importActual(
    '../src/data/legends-perks.json',
  )) as LegendsPerksDataset
  const perks = actualDataset.perks.filter((perk) => perkNamesForAppTests.has(perk.perkName))
  const perkGroupCount = new Set(
    perks.flatMap((perk) =>
      perk.placements.map((placement) => `${placement.categoryName}::${placement.perkGroupId}`),
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
      perkGroupCount,
    },
  }
})

import App from '../src/App'

afterEach(() => {
  window.history.replaceState({}, '', '/')
})

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
    expect(within(hero).getByText(/\d+\.\d+\.\d+/)).toBeInTheDocument()
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

  test('shows the perk search clear button only while search has text', async () => {
    const user = userEvent.setup()
    render(<App />)
    const perkSearchInput = screen.getByLabelText('Search perks')

    expect(screen.queryByRole('button', { name: 'Clear perk search' })).not.toBeInTheDocument()

    await user.type(perkSearchInput, 'Berserk')

    const clearPerkSearchButton = screen.getByRole('button', { name: 'Clear perk search' })

    expect(clearPerkSearchButton).toBeVisible()
    expect(perkSearchInput).toHaveValue('Berserk')
    expect(
      within(screen.getByTestId('results-list')).getByRole('button', { name: 'Inspect Berserk' }),
    ).toBeInTheDocument()

    await user.click(clearPerkSearchButton)

    expect(perkSearchInput).toHaveValue('')
    expect(screen.queryByRole('button', { name: 'Clear perk search' })).not.toBeInTheDocument()
    expect(perkSearchInput).toHaveFocus()
  })

  test('shows the background search clear button only while search has text', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    const backgroundFitPanel = screen.getByRole('complementary', { name: 'Background fit' })
    const backgroundSearchInput = within(backgroundFitPanel).getByLabelText('Search backgrounds')
    const filterBackgroundsButton = within(backgroundFitPanel).getByRole('button', {
      name: 'Filter backgrounds',
    })
    const searchInputControl = backgroundSearchInput.closest('.search-input-control')

    expect(
      within(backgroundFitPanel).queryByRole('button', { name: 'Clear background search' }),
    ).not.toBeInTheDocument()
    expect(filterBackgroundsButton).toBeVisible()
    expect(searchInputControl).not.toBeNull()
    expect(
      within(searchInputControl as HTMLElement)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual(['Filter backgrounds'])

    await user.type(backgroundSearchInput, 'Paladin')

    const clearBackgroundSearchButton = within(backgroundFitPanel).getByRole('button', {
      name: 'Clear background search',
    })

    expect(clearBackgroundSearchButton).toBeVisible()
    expect(
      within(searchInputControl as HTMLElement)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual(['Clear background search', 'Filter backgrounds'])
    expect(backgroundSearchInput).toHaveValue('Paladin')

    await user.click(clearBackgroundSearchButton)

    expect(backgroundSearchInput).toHaveValue('')
    expect(
      within(backgroundFitPanel).queryByRole('button', { name: 'Clear background search' }),
    ).not.toBeInTheDocument()
    expect(container.querySelector('.background-fit-panel .search-highlight')).toBeNull()
    expect(backgroundSearchInput).toHaveFocus()
  })
})
