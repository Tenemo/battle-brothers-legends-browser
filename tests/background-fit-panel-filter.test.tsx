import type { ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { BackgroundFitPanel } from '../src/components/BackgroundFitPanel'
import type { BackgroundFitView, RankedBackgroundFit } from '../src/lib/background-fit'
import { PlannerInteractionTestProvider } from './PlannerInteractionTestProvider'

type BackgroundFitPanelProps = ComponentProps<typeof BackgroundFitPanel>

type BackgroundFilterOverrides = Partial<
  Pick<
    BackgroundFitPanelProps,
    | 'availableBackgroundVeteranPerkLevelIntervals'
    | 'backgroundFitView'
    | 'selectedBackgroundVeteranPerkLevelIntervals'
    | 'shouldAllowBackgroundStudyBook'
    | 'shouldAllowBackgroundStudyScroll'
    | 'shouldAllowSecondBackgroundStudyScroll'
    | 'shouldIncludeEventBackgrounds'
    | 'shouldIncludeOriginBackgrounds'
  >
>

function createRankedBackgroundFit({
  backgroundAccessContexts = [],
  backgroundId,
  backgroundName,
  hasRegularRecruitment = false,
  veteranPerkLevelInterval,
  veteranPerkLevelIntervalContexts,
  veteranPerkLevelIntervals,
}: Pick<
  RankedBackgroundFit,
  | 'backgroundAccessContexts'
  | 'backgroundId'
  | 'backgroundName'
  | 'hasRegularRecruitment'
  | 'veteranPerkLevelInterval'
  | 'veteranPerkLevelIntervalContexts'
  | 'veteranPerkLevelIntervals'
>): RankedBackgroundFit {
  return {
    backgroundAccessContexts,
    backgroundId,
    backgroundName,
    backgroundTypeNames: [],
    buildReachabilityProbability: null,
    campResourceModifiers: [],
    dailyCost: null,
    disambiguator: null,
    excludedTalentAttributeNames: [],
    excludedTraits: [],
    excludedTraitNames: [],
    expectedCoveredMustHavePerkCount: 0,
    expectedCoveredOptionalPerkCount: 0,
    expectedCoveredPickedPerkCount: 0,
    expectedMatchedPerkGroupCount: 0,
    fullBuildReachabilityProbability: null,
    fullBuildStudyResourceRequirement: null,
    guaranteedCoveredMustHavePerkCount: 0,
    guaranteedCoveredOptionalPerkCount: 0,
    guaranteedMatchedPerkGroupCount: 0,
    guaranteedTraits: [],
    guaranteedTraitNames: [],
    hasRegularRecruitment,
    iconPath: null,
    matches: [],
    maximumNativeCoveredPickedPerkCount: 0,
    maximumTotalPerkGroupCount: 0,
    mustHaveBuildReachabilityProbability: null,
    mustHaveStudyResourceRequirement: null,
    otherPerkGroups: [],
    sourceFilePath: `scripts/skills/backgrounds/${backgroundId.replace(
      'background.',
      '',
    )}_background.nut`,
    startingAttributeRanges: [],
    veteranPerkLevelInterval,
    veteranPerkLevelIntervalContexts,
    veteranPerkLevelIntervals,
  }
}

function createBackgroundFitView(rankedBackgroundFits: RankedBackgroundFit[]): BackgroundFitView {
  return {
    rankedBackgroundFits,
    supportedBuildTargetPerkGroups: [],
    unsupportedBuildTargetPerkGroups: [],
  }
}

function createBackgroundFitPanel(overrides: BackgroundFilterOverrides = {}) {
  return (
    <PlannerInteractionTestProvider>
      <BackgroundFitPanel
        availableBackgroundVeteranPerkLevelIntervals={[2, 3, 4]}
        backgroundFitErrorMessage={null}
        backgroundFitProgress={null}
        backgroundFitView={null}
        isExpanded
        isLoadingBackgroundFitView={false}
        mustHavePickedPerkCount={1}
        onBackgroundStudyBookChange={vi.fn()}
        onBackgroundStudyScrollChange={vi.fn()}
        onBackgroundVeteranPerkLevelIntervalChange={vi.fn()}
        onEventBackgroundsChange={vi.fn()}
        onOriginBackgroundsChange={vi.fn()}
        onSearchActivityChange={vi.fn()}
        onSecondBackgroundStudyScrollChange={vi.fn()}
        onSelectBackgroundFit={vi.fn()}
        onToggleExpanded={vi.fn()}
        optionalPickedPerkCount={0}
        pickedPerkCount={1}
        selectedBackgroundFitKey={null}
        selectedBackgroundVeteranPerkLevelIntervals={[2, 3, 4]}
        shouldAllowBackgroundStudyBook
        shouldAllowBackgroundStudyScroll
        shouldAllowSecondBackgroundStudyScroll={false}
        shouldIncludeEventBackgrounds={false}
        shouldIncludeOriginBackgrounds={false}
        {...overrides}
      />
    </PlannerInteractionTestProvider>
  )
}

function getFilterBackgroundsButton() {
  return screen.getByRole('button', { name: 'Filter backgrounds' })
}

function getFilterOptionLabel(labelText: string): HTMLLabelElement {
  const label = screen.getByText(labelText).closest('label')

  expect(label).not.toBeNull()

  return label as HTMLLabelElement
}

describe('background fit panel filters', () => {
  test('marks any selected background filter as active', () => {
    const { rerender } = render(createBackgroundFitPanel())

    expect(getFilterBackgroundsButton()).toHaveAttribute('data-active-filter', 'true')

    rerender(
      createBackgroundFitPanel({
        selectedBackgroundVeteranPerkLevelIntervals: [4, 2, 3],
      }),
    )

    expect(getFilterBackgroundsButton()).toHaveAttribute('data-active-filter', 'true')

    const selectedFilters: BackgroundFilterOverrides[] = [
      { shouldIncludeOriginBackgrounds: true },
      { shouldIncludeEventBackgrounds: true },
      { shouldAllowSecondBackgroundStudyScroll: true },
      { selectedBackgroundVeteranPerkLevelIntervals: [2, 4] },
      {
        availableBackgroundVeteranPerkLevelIntervals: [1, 2, 3],
        selectedBackgroundVeteranPerkLevelIntervals: [2, 3, 4],
      },
    ]

    for (const selectedFilter of selectedFilters) {
      rerender(createBackgroundFitPanel(selectedFilter))

      expect(getFilterBackgroundsButton()).toHaveAttribute('data-active-filter', 'true')
    }

    rerender(
      createBackgroundFitPanel({
        selectedBackgroundVeteranPerkLevelIntervals: [],
        shouldAllowBackgroundStudyBook: false,
        shouldAllowBackgroundStudyScroll: false,
        shouldAllowSecondBackgroundStudyScroll: true,
        shouldIncludeEventBackgrounds: false,
        shouldIncludeOriginBackgrounds: false,
      }),
    )

    expect(getFilterBackgroundsButton()).toHaveAttribute('data-active-filter', 'false')
  })

  test('describes every background filter option with a native tooltip', async () => {
    const user = userEvent.setup()

    render(createBackgroundFitPanel())

    await user.click(getFilterBackgroundsButton())

    expect(getFilterOptionLabel('Origin backgrounds')).toHaveAttribute(
      'title',
      'Shows backgrounds that are not available from regular recruitment but can be gained from origin starts or origin hiring rosters.',
    )
    expect(getFilterOptionLabel('Event backgrounds')).toHaveAttribute(
      'title',
      'Shows backgrounds that are not available from regular recruitment but can be gained from events, contracts, encounters, or settlement situations.',
    )
    expect(getFilterOptionLabel('Allow a book')).toHaveAttribute(
      'title',
      'Counts one eligible skill book when checking whether a background can reach the picked build.',
    )
    expect(getFilterOptionLabel('Allow a scroll')).toHaveAttribute(
      'title',
      'Counts one eligible ancient scroll when checking whether a background can reach the picked build.',
    )
    expect(getFilterOptionLabel('Allow two scrolls')).toHaveAttribute(
      'title',
      'Counts a second ancient scroll when Bright is available and the first scroll is allowed.',
    )
    expect(getFilterOptionLabel('Perk every 2 veteran levels')).toHaveAttribute(
      'title',
      'Shows backgrounds that gain 1 perk point every 2 veteran levels after level 12. Random Solo and The Free Company origin overrides are excluded because they cover most backgrounds in the game and cause their starting brothers to use this interval.',
    )
    expect(getFilterOptionLabel('Perk every 3 veteran levels')).toHaveAttribute(
      'title',
      'Shows backgrounds that gain 1 perk point every 3 veteran levels after level 12.',
    )
    expect(getFilterOptionLabel('Perk every 4 veteran levels')).toHaveAttribute(
      'title',
      'Shows backgrounds that gain 1 perk point every 4 veteran levels after level 12.',
    )
  })

  test('matches source-only backgrounds against origin and event filters independently', () => {
    const regularBackground = createRankedBackgroundFit({
      backgroundId: 'background.monk',
      backgroundName: 'Monk',
      hasRegularRecruitment: true,
      veteranPerkLevelInterval: 4,
      veteranPerkLevelIntervalContexts: [
        {
          interval: 4,
          kind: 'native',
          label: 'Native background',
        },
      ],
      veteranPerkLevelIntervals: [4],
    })
    const originBackground = createRankedBackgroundFit({
      backgroundAccessContexts: [
        {
          kind: 'origin',
          label: 'Crusader starting roster',
          sourceFilePath: 'scripts/scenarios/world/legends_crusader_scenario.nut',
        },
      ],
      backgroundId: 'background.legend_crusader',
      backgroundName: 'Holy Crusader',
      veteranPerkLevelInterval: 2,
      veteranPerkLevelIntervalContexts: [
        {
          interval: 2,
          kind: 'native',
          label: 'Native background',
        },
      ],
      veteranPerkLevelIntervals: [2],
    })
    const eventBackground = createRankedBackgroundFit({
      backgroundAccessContexts: [
        {
          kind: 'event',
          label: 'Flagellant vs monk event',
          sourceFilePath: 'mod_legends/hooks/events/events/flagellant_vs_monk_event.nut',
        },
      ],
      backgroundId: 'background.monk_turned_flagellant',
      backgroundName: 'Monk turned Flagellant',
      veteranPerkLevelInterval: 4,
      veteranPerkLevelIntervalContexts: [
        {
          interval: 4,
          kind: 'native',
          label: 'Native background',
        },
      ],
      veteranPerkLevelIntervals: [4],
    })
    const bothSourcesBackground = createRankedBackgroundFit({
      backgroundAccessContexts: [
        {
          kind: 'event',
          label: 'Facing Justice (Legendary) contract',
          sourceFilePath: 'scripts/contracts/contracts/legend_barbarian_prisoner_contract.nut',
        },
        {
          kind: 'origin',
          label: 'Berserker hiring roster',
          sourceFilePath: 'scripts/scenarios/world/legends_berserker_scenario.nut',
        },
      ],
      backgroundId: 'background.legend_berserker',
      backgroundName: 'Berserker',
      veteranPerkLevelInterval: 4,
      veteranPerkLevelIntervalContexts: [
        {
          interval: 4,
          kind: 'native',
          label: 'Native background',
        },
      ],
      veteranPerkLevelIntervals: [4],
    })
    const backgroundFitView = createBackgroundFitView([
      regularBackground,
      originBackground,
      eventBackground,
      bothSourcesBackground,
    ])
    const { rerender } = render(
      createBackgroundFitPanel({
        backgroundFitView,
      }),
    )

    expect(screen.getByRole('heading', { name: 'Monk' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Holy Crusader' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Monk turned Flagellant' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Berserker' })).not.toBeInTheDocument()

    rerender(
      createBackgroundFitPanel({
        backgroundFitView,
        shouldIncludeOriginBackgrounds: true,
      }),
    )

    expect(screen.getByRole('heading', { name: 'Monk' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Holy Crusader' })).toBeVisible()
    expect(
      screen.queryByRole('heading', { name: 'Monk turned Flagellant' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Berserker' })).toBeVisible()

    rerender(
      createBackgroundFitPanel({
        backgroundFitView,
        shouldIncludeEventBackgrounds: true,
      }),
    )

    expect(screen.getByRole('heading', { name: 'Monk' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Holy Crusader' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Monk turned Flagellant' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Berserker' })).toBeVisible()
  })

  test('matches backgrounds against any veteran perk interval they can use', () => {
    const multiIntervalBackground = createRankedBackgroundFit({
      backgroundId: 'background.legend_vala',
      backgroundName: 'Vala',
      veteranPerkLevelInterval: 3,
      veteranPerkLevelIntervalContexts: [
        {
          interval: 2,
          kind: 'origin',
          label: 'Origin: Sisterhood',
          scenarioId: 'scenario.legends_sisterhood',
          scenarioName: 'Sisterhood',
          sourceFilePath: 'scripts/scenarios/world/legends_sisterhood_scenario.nut',
        },
        {
          interval: 3,
          kind: 'native',
          label: 'Native background',
        },
      ],
      veteranPerkLevelIntervals: [2, 3],
    })
    const defaultIntervalBackground = createRankedBackgroundFit({
      backgroundId: 'background.farmhand',
      backgroundName: 'Farmhand',
      veteranPerkLevelInterval: 4,
      veteranPerkLevelIntervalContexts: [
        {
          interval: 4,
          kind: 'native',
          label: 'Native background',
        },
      ],
      veteranPerkLevelIntervals: [4],
    })
    const backgroundFitView = createBackgroundFitView([
      multiIntervalBackground,
      defaultIntervalBackground,
    ])
    const { rerender } = render(
      createBackgroundFitPanel({
        backgroundFitView,
        selectedBackgroundVeteranPerkLevelIntervals: [3],
      }),
    )

    expect(screen.getByRole('heading', { name: 'Vala' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Farmhand' })).not.toBeInTheDocument()

    rerender(
      createBackgroundFitPanel({
        backgroundFitView,
        selectedBackgroundVeteranPerkLevelIntervals: [2],
      }),
    )

    expect(screen.getByRole('heading', { name: 'Vala' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Farmhand' })).not.toBeInTheDocument()

    rerender(
      createBackgroundFitPanel({
        backgroundFitView,
        selectedBackgroundVeteranPerkLevelIntervals: [4],
      }),
    )

    expect(screen.queryByRole('heading', { name: 'Vala' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Farmhand' })).toBeVisible()
  })
})
