import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import packageJson from '../package.json'
import type {
  LegendsBackgroundFitDataset,
  LegendsPerkCatalogDataset,
  LegendsPerksDataset,
} from '../src/types/legends-perks'

const { backgroundFitSourceFileNamesForAppTests, perkNamesForAppTests } = vi.hoisted(() => ({
  backgroundFitSourceFileNamesForAppTests: new Set([
    'apprentice_background.nut',
    'paladin_background.nut',
  ]),
  perkNamesForAppTests: new Set([
    'Ammunition Binding',
    'Berserk',
    'Hold Out',
    'Killing Frenzy',
    'Magic Missile',
  ]),
}))

async function loadFilteredAppTestDatasets() {
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
    actualDataset,
    backgroundFitBackgrounds,
    perkGroupCount,
    perks,
  }
}

vi.mock('../src/data/legends-perk-catalog.json', async () => {
  const { actualDataset, perkGroupCount, perks } = await loadFilteredAppTestDatasets()

  return {
    default: {
      generatedAt: actualDataset.generatedAt,
      perkCount: perks.length,
      perks,
      referenceRoot: actualDataset.referenceRoot,
      referenceVersion: actualDataset.referenceVersion,
      sourceFiles: actualDataset.sourceFiles,
      perkGroupCount,
    } satisfies LegendsPerkCatalogDataset,
  }
})

vi.mock('../src/data/legends-background-fit.json', async () => {
  const { actualDataset, backgroundFitBackgrounds, perks } = await loadFilteredAppTestDatasets()

  return {
    default: {
      backgroundFitBackgrounds,
      backgroundFitRules: actualDataset.backgroundFitRules,
      perks: perks.map(({ id, perkName, placements }) => ({
        id,
        perkName,
        placements,
      })),
    } satisfies LegendsBackgroundFitDataset,
  }
})

import App from '../src/App'

afterEach(() => {
  window.history.replaceState({}, '', '/')
})

describe('app', () => {
  test('renders the catalog shell without the old reference root footer', () => {
    render(<App />)
    const hero = screen.getByRole('banner')
    const brandEmphasis = screen.getByTestId('hero-brand-emphasis')
    const legendsModRepositoryLink = within(hero).getByRole('link', {
      name: 'Open the Battle Brothers Legends mod repository on GitHub',
    })

    expect(screen.getByRole('heading', { level: 1, name: 'Build planner' })).toBeInTheDocument()
    expect(legendsModRepositoryLink).toHaveAttribute(
      'href',
      'https://github.com/Battle-Brothers-Legends/Legends-public',
    )
    expect(brandEmphasis).not.toBeNull()
    expect(brandEmphasis).toHaveTextContent('Legends')
    expect(within(hero).getByText('Perk groups')).toBeInTheDocument()
    expect(within(hero).getByText('Mod version')).toBeInTheDocument()
    expect(within(hero).getByText('19.3.21')).toBeInTheDocument()
    expect(within(hero).getByText('Planner version')).toBeInTheDocument()
    expect(within(hero).getByText(packageJson.version)).toBeInTheDocument()
    expect(
      screen.getByRole('link', {
        name: 'Open the build planner repository on GitHub',
      }),
    ).toHaveAttribute('href', 'https://github.com/Tenemo/battle-brothers-legends-browser')
    expect(
      screen.getByRole('link', {
        name: 'Open Piotr Piechowski projects',
      }),
    ).toHaveAttribute('href', 'https://piech.dev/projects')
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

  test('splits origin and ancient scroll perk search filters', async () => {
    const user = userEvent.setup()
    render(<App />)
    const perkSearchInput = screen.getByLabelText('Search perks')

    await user.type(perkSearchInput, 'Berserk')

    const berserkResultRow = within(screen.getByTestId('results-list'))
      .getByRole('button', { name: 'Inspect Berserk' })
      .closest('[data-testid="perk-row"]')

    expect(berserkResultRow).not.toBeNull()
    expect(
      within(berserkResultRow as HTMLElement).getByTestId('perk-placement-list'),
    ).toHaveTextContent('Vicious')
    expect(
      within(berserkResultRow as HTMLElement).getByTestId('perk-placement-list'),
    ).toHaveTextContent('Berserker')

    await user.clear(perkSearchInput)
    await user.type(perkSearchInput, 'Ammunition Binding')

    expect(screen.getByText('No perks found')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Filter perks' }))

    const getOriginPerkGroupsCheckbox = () =>
      screen.getByRole('checkbox', {
        name: 'Origin perk groups',
      })
    const getAncientScrollPerkGroupsCheckbox = () =>
      screen.getByRole('checkbox', {
        name: 'Ancient scroll perks',
      })

    expect(getOriginPerkGroupsCheckbox()).not.toBeChecked()
    expect(getAncientScrollPerkGroupsCheckbox()).toBeChecked()
    expect(window.location.search).not.toContain('ancient-scroll-perk-groups')

    await user.click(getAncientScrollPerkGroupsCheckbox())

    await waitFor(() => {
      expect(window.location.search).toContain('ancient-scroll-perk-groups=false')
    })
    expect(getOriginPerkGroupsCheckbox()).not.toBeChecked()
    expect(getAncientScrollPerkGroupsCheckbox()).not.toBeChecked()

    await user.click(getOriginPerkGroupsCheckbox())

    await waitFor(() => {
      expect(
        within(screen.getByTestId('results-list')).getByRole('button', {
          name: 'Inspect Ammunition Binding',
        }),
      ).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(window.location.search).toContain('origin-perk-groups=true')
    })
    expect(window.location.search).toContain('ancient-scroll-perk-groups=false')

    await user.click(getAncientScrollPerkGroupsCheckbox())

    await waitFor(() => {
      expect(window.location.search).not.toContain('ancient-scroll-perk-groups')
    })

    await user.clear(perkSearchInput)
    await user.type(perkSearchInput, 'Magic Missile')

    await waitFor(() => {
      expect(
        within(screen.getByTestId('results-list')).getByRole('button', {
          name: 'Inspect Magic Missile',
        }),
      ).toBeInTheDocument()
    })
    expect(window.location.search).toContain('origin-perk-groups=true')

    await user.click(screen.getByRole('button', { name: 'Filter perks' }))
    await user.click(getOriginPerkGroupsCheckbox())

    await waitFor(() => {
      expect(window.location.search).not.toContain('origin-perk-groups')
    })
    expect(window.location.search).not.toContain('ancient-scroll-perk-groups')
  })

  test('keeps hidden origin perk groups out of the build planner until enabled', async () => {
    const user = userEvent.setup()

    window.history.replaceState({}, '', '/?build=Killing+Frenzy,Hold+Out')
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('2 perks picked.')).toBeInTheDocument()
    })

    const sharedPerkGroups = screen.getByTestId('build-shared-groups-list')

    expect(
      within(sharedPerkGroups).queryByRole('button', {
        name: 'Select perk group Cutthroat',
      }),
    ).not.toBeInTheDocument()
    expect(within(sharedPerkGroups).queryByText('Cutthroat')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Filter perks' }))
    await user.click(screen.getByRole('checkbox', { name: 'Origin perk groups' }))

    await waitFor(() => {
      expect(
        within(sharedPerkGroups).getByRole('button', {
          name: 'Select perk group Cutthroat',
        }),
      ).toBeInTheDocument()
    })
  })

  test('shows the background search clear button only while search has text', async () => {
    const user = userEvent.setup()
    render(<App />)
    const backgroundFitPanel = screen.getByRole('complementary', { name: 'Background fit' })
    const backgroundSearchInput = within(backgroundFitPanel).getByLabelText('Search backgrounds')
    const filterBackgroundsButton = within(backgroundFitPanel).getByRole('button', {
      name: 'Filter backgrounds',
    })
    const searchInputControl = backgroundSearchInput.closest('[data-testid="search-input-control"]')

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
    expect(backgroundFitPanel.querySelector('[data-search-highlight="true"]')).toBeNull()
    expect(backgroundSearchInput).toHaveFocus()
  })

  test('keeps default background study filters out of the url and serializes changes', async () => {
    const user = userEvent.setup()
    render(<App />)
    const backgroundFitPanel = screen.getByRole('complementary', { name: 'Background fit' })

    await user.click(within(backgroundFitPanel).getByRole('button', { name: 'Filter backgrounds' }))

    const allowBookCheckbox = within(backgroundFitPanel).getByRole('checkbox', {
      name: 'Allow a book',
    })
    const allowScrollCheckbox = within(backgroundFitPanel).getByRole('checkbox', {
      name: 'Allow a scroll',
    })
    const allowTwoScrollsCheckbox = within(backgroundFitPanel).getByRole('checkbox', {
      name: 'Allow two scrolls',
    })
    const everyTwoVeteranLevelsCheckbox = within(backgroundFitPanel).getByRole('checkbox', {
      name: 'Every 2 veteran levels',
    })
    const everyThreeVeteranLevelsCheckbox = within(backgroundFitPanel).getByRole('checkbox', {
      name: 'Every 3 veteran levels',
    })
    const everyFourVeteranLevelsCheckbox = within(backgroundFitPanel).getByRole('checkbox', {
      name: 'Every 4 veteran levels',
    })

    expect(allowBookCheckbox).toBeChecked()
    expect(allowScrollCheckbox).toBeChecked()
    expect(allowTwoScrollsCheckbox).not.toBeChecked()
    expect(everyTwoVeteranLevelsCheckbox).toBeChecked()
    expect(everyThreeVeteranLevelsCheckbox).toBeChecked()
    expect(everyFourVeteranLevelsCheckbox).toBeChecked()
    expect(window.location.search).not.toContain('background-book')
    expect(window.location.search).not.toContain('background-scroll')
    expect(window.location.search).not.toContain('background-two-scrolls')
    expect(window.location.search).not.toContain('background-veteran-perks')

    await user.click(everyTwoVeteranLevelsCheckbox)

    await waitFor(() => {
      expect(window.location.search).toContain('background-veteran-perks=3,4')
    })

    await user.click(everyTwoVeteranLevelsCheckbox)

    await waitFor(() => {
      expect(window.location.search).not.toContain('background-veteran-perks')
    })

    await user.click(allowBookCheckbox)

    await waitFor(() => {
      expect(window.location.search).toContain('background-book=false')
    })

    await user.click(allowScrollCheckbox)

    await waitFor(() => {
      expect(window.location.search).toContain('background-scroll=false')
    })
    expect(allowTwoScrollsCheckbox).toBeDisabled()
    expect(allowTwoScrollsCheckbox).not.toBeChecked()

    await user.click(allowScrollCheckbox)
    await user.click(allowTwoScrollsCheckbox)

    await waitFor(() => {
      expect(window.location.search).not.toContain('background-scroll=false')
    })
    expect(window.location.search).toContain('background-book=false')
    expect(window.location.search).toContain('background-two-scrolls=true')
  })

  test('updates visible state when browser history restores a shared url', async () => {
    render(<App />)

    expect(screen.getByLabelText('Search perks')).toHaveValue('')
    expect(screen.getByText('No perks picked yet.')).toBeInTheDocument()

    act(() => {
      window.history.pushState({}, '', '/?search=Berserk&build=Berserk')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    await waitFor(() => {
      expect(screen.getByLabelText('Search perks')).toHaveValue('Berserk')
    })
    expect(screen.getByText('1 perk picked.')).toBeInTheDocument()
    expect(
      within(screen.getByTestId('build-perks-bar')).getByRole('button', {
        name: 'View Berserk from build planner',
      }),
    ).toBeInTheDocument()
  })

  test('updates selected perk detail state when browser history restores detail url state', async () => {
    render(<App />)

    act(() => {
      window.history.pushState({}, '', '/?detail=perk&perk=Berserk&search=Berserk&build=Berserk')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    await waitFor(() => {
      expect(
        within(screen.getByTestId('detail-panel')).getByRole('heading', {
          level: 2,
          name: 'Berserk',
        }),
      ).toBeInTheDocument()
    })
  })

  test('keeps selected perk detail state when a perk group filter hides the selected perk', async () => {
    const user = userEvent.setup()
    render(<App />)
    const perkSearchInput = screen.getByLabelText('Search perks')

    await user.type(perkSearchInput, 'Berserk')
    await user.click(
      within(screen.getByTestId('results-list')).getByRole('button', { name: 'Inspect Berserk' }),
    )

    expect(
      within(screen.getByTestId('detail-panel')).getByRole('heading', {
        level: 2,
        name: 'Berserk',
      }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Expand category Magic' }))
    await user.click(screen.getByRole('button', { name: 'Select perk group Evocation' }))

    await waitFor(() => {
      expect(perkSearchInput).toHaveValue('')
    })
    expect(
      within(screen.getByTestId('results-list')).queryByRole('button', { name: 'Inspect Berserk' }),
    ).not.toBeInTheDocument()
    expect(
      within(screen.getByTestId('detail-panel')).getByRole('heading', {
        level: 2,
        name: 'Berserk',
      }),
    ).toBeInTheDocument()
  })

  test('loads background fit when browser history restores background detail url state', async () => {
    render(<App />)

    act(() => {
      window.history.pushState(
        {},
        '',
        '/?detail=background&background=background.apprentice&background-source=apprentice&build=Berserk',
      )
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    await waitFor(() => {
      expect(
        within(screen.getByTestId('detail-panel')).getByRole('heading', {
          level: 2,
          name: 'Apprentice',
        }),
      ).toBeInTheDocument()
    })
  })
})
