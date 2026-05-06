import { render, screen, waitFor, within } from '@testing-library/react'
import type { ComponentProps } from 'react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { DetailPanel } from '../src/components/DetailPanel'
import type {
  BackgroundFitChanceCalculation,
  BackgroundFitStudyResourceStrategy,
  BackgroundFitStudyResourceStrategyTarget,
  BuildTargetPerkGroup,
  RankedBackgroundFit,
} from '../src/lib/background-fit'
import {
  backgroundStudyResourceBadgesTestId,
  skillBookIconPath,
} from '../src/lib/background-study-resource-display'
import { gameIconImageWidths, getGameIconUrl } from '../src/lib/game-icon-url'
import type { StudyResourceRequirementProfile } from '../src/lib/background-study-reachability'
import type { LegendsPerkRecord } from '../src/types/legends-perks'
import { PlannerInteractionTestProvider } from './PlannerInteractionTestProvider'

type TestChanceCalculationTerm = Omit<
  BackgroundFitChanceCalculation['successfulNativeOutcomeProbabilityTerms'][number],
  'nativeCoveredPickedPerkIdsByOutcome'
> &
  Partial<
    Pick<
      BackgroundFitChanceCalculation['successfulNativeOutcomeProbabilityTerms'][number],
      'nativeCoveredPickedPerkIdsByOutcome'
    >
  >

const skillBookRequirementProfile = {
  bookRequirement: {
    categoryName: 'Traits',
    perkGroupId: 'CalmTree',
  },
  requiredScrollCount: 0,
  requiresBook: true,
  requiresBright: false,
  scrollRequirements: [],
} satisfies StudyResourceRequirementProfile

const ancientScrollRequirementProfile = {
  bookRequirement: null,
  requiredScrollCount: 1,
  requiresBook: false,
  requiresBright: false,
  scrollRequirements: [
    {
      categoryName: 'Magic',
      perkGroupId: 'AssassinMagicTree',
    },
  ],
} satisfies StudyResourceRequirementProfile

const calmStrategyTarget = {
  categoryName: 'Traits',
  coveredPickedPerkIds: ['perk.legend_clarity'],
  coveredPickedPerkNames: ['Clarity'],
  fixedTargetProbability: 1,
  marginalProbabilityGain: 1,
  perkGroupIconPath: 'ui/perks/perk_01.png',
  perkGroupId: 'CalmTree',
  perkGroupName: 'Calm',
} satisfies BackgroundFitStudyResourceStrategyTarget

const assassinStrategyTarget = {
  categoryName: 'Magic',
  coveredPickedPerkIds: ['perk.legend_assassinate'],
  coveredPickedPerkNames: ['Assassinate'],
  fixedTargetProbability: 1,
  marginalProbabilityGain: 1,
  perkGroupIconPath: 'ui/perks/perk_37.png',
  perkGroupId: 'AssassinMagicTree',
  perkGroupName: 'Assassin',
} satisfies BackgroundFitStudyResourceStrategyTarget

const mediumArmorStrategyTarget = {
  categoryName: 'Defense',
  coveredPickedPerkIds: ['perk.legend_perfect_fit', 'perk.legend_lithe'],
  coveredPickedPerkNames: ['Perfect Fit', 'Lithe'],
  fixedTargetProbability: 0.3,
  marginalProbabilityGain: 0.2,
  perkGroupIconPath: 'ui/perks/perk_22.png',
  perkGroupId: 'MediumDefenseTree',
  perkGroupName: 'Medium Armor',
} satisfies BackgroundFitStudyResourceStrategyTarget

const fitStrategyTarget = {
  categoryName: 'Traits',
  coveredPickedPerkIds: ['perk.legend_athlete'],
  coveredPickedPerkNames: ['Athlete'],
  fixedTargetProbability: 1 / 3,
  marginalProbabilityGain: 0.23,
  perkGroupIconPath: 'ui/perks/perk_31.png',
  perkGroupId: 'FitTree',
  perkGroupName: 'Fit',
} satisfies BackgroundFitStudyResourceStrategyTarget

const berserkerStrategyTarget = {
  categoryName: 'Magic',
  coveredPickedPerkIds: ['perk.legend_muscularity', 'perk.legend_brawny', 'perk.legend_colossus'],
  coveredPickedPerkNames: ['Muscularity', 'Brawny', 'Colossus'],
  fixedTargetProbability: 0.53,
  marginalProbabilityGain: 0.49,
  perkGroupIconPath: 'ui/perks/perk_37.png',
  perkGroupId: 'BerserkerMagicTree',
  perkGroupName: 'Berserker',
} satisfies BackgroundFitStudyResourceStrategyTarget

function createStudyResourceStrategy(
  overrides: Partial<BackgroundFitStudyResourceStrategy> = {},
): BackgroundFitStudyResourceStrategy {
  return {
    bookTargets: [],
    nativeProbability: 0,
    probability: 1,
    scrollTargets: [],
    selectedCombinationKey: 'book',
    shouldAllowSecondScroll: false,
    ...overrides,
  }
}

function createChanceCalculation({
  isNativeOutcomeIndependent = false,
  nativeCoveredPickedPerkIdsByOutcome,
  probability,
  successfulOutcomeCount = probability > 0 ? 1 : 0,
  terms = probability > 0 ? [{ outcomeCount: 1, probability }] : [],
  totalOutcomeCount = Math.max(1, successfulOutcomeCount),
}: {
  isNativeOutcomeIndependent?: boolean
  nativeCoveredPickedPerkIdsByOutcome?: string[][]
  probability: number
  successfulOutcomeCount?: number
  terms?: TestChanceCalculationTerm[]
  totalOutcomeCount?: number
}): BackgroundFitChanceCalculation {
  const completedTerms: BackgroundFitChanceCalculation['successfulNativeOutcomeProbabilityTerms'] =
    terms.map((term) => ({
      ...term,
      nativeCoveredPickedPerkIdsByOutcome:
        term.nativeCoveredPickedPerkIdsByOutcome ??
        nativeCoveredPickedPerkIdsByOutcome ??
        Array.from({ length: term.outcomeCount }, () => []),
    }))

  return {
    isNativeOutcomeIndependent,
    probability,
    successfulNativeOutcomeCount: successfulOutcomeCount,
    successfulNativeOutcomeProbabilityTerms: completedTerms,
    totalNativeOutcomeCount: totalOutcomeCount,
  }
}

async function expandChanceExplanation() {
  const chanceExplanationToggle = screen.getByRole('button', { name: 'How chances combine' })

  expect(chanceExplanationToggle).toHaveAttribute('aria-expanded', 'false')
  await userEvent.click(chanceExplanationToggle)
  expect(chanceExplanationToggle).toHaveAttribute('aria-expanded', 'true')
}

const backgroundFit = {
  backgroundId: 'background.apprentice',
  backgroundName: 'Apprentice',
  backgroundTypeNames: ['Crusader', 'Educated'],
  buildReachabilityProbability: 1,
  campResourceModifiers: [
    {
      group: 'capacity',
      label: 'Tools and supplies capacity',
      modifierKey: 'ArmorParts',
      value: 13,
      valueKind: 'flat',
    },
    {
      group: 'skill',
      label: 'Repairing',
      modifierKey: 'Repair',
      value: 0.3,
      valueKind: 'percent',
    },
    {
      group: 'terrain',
      label: 'Plains',
      modifierKey: 'Terrain.2',
      value: 0.15,
      valueKind: 'percent',
    },
  ],
  dailyCost: 6,
  disambiguator: null,
  excludedTalentAttributeNames: ['Ranged skill'],
  excludedTraits: [
    {
      description: 'Afraid of walking dead.',
      iconPath: 'ui/traits/trait_icon_50.png',
      traitName: 'Fear of Undead',
    },
  ],
  excludedTraitNames: ['Fear of Undead'],
  expectedCoveredMustHavePerkCount: 1,
  expectedCoveredOptionalPerkCount: 0,
  expectedCoveredPickedPerkCount: 1,
  expectedMatchedPerkGroupCount: 0,
  fullBuildReachabilityProbability: 1,
  fullBuildStudyResourceRequirement: skillBookRequirementProfile,
  fullBuildStudyResourceStrategy: createStudyResourceStrategy({
    bookTargets: [calmStrategyTarget],
  }),
  guaranteedCoveredMustHavePerkCount: 0,
  guaranteedCoveredOptionalPerkCount: 0,
  guaranteedMatchedPerkGroupCount: 0,
  guaranteedTraits: [
    {
      description: 'Moves with unusual speed.',
      iconPath: 'ui/traits/trait_icon_32.png',
      traitName: 'Quick',
    },
  ],
  guaranteedTraitNames: ['Quick'],
  iconPath: null,
  matches: [],
  maximumNativeCoveredPickedPerkCount: 0,
  maximumTotalPerkGroupCount: 1,
  mustHaveBuildReachabilityProbability: 1,
  mustHaveStudyResourceRequirement: skillBookRequirementProfile,
  mustHaveStudyResourceStrategy: createStudyResourceStrategy({
    bookTargets: [calmStrategyTarget],
  }),
  otherPerkGroups: [],
  sourceFilePath: 'scripts/skills/backgrounds/apprentice_background.nut',
  veteranPerkLevelInterval: 4,
} satisfies RankedBackgroundFit

const selectedPerk = {
  backgroundSources: [],
  categoryNames: ['Traits'],
  descriptionParagraphs: ['Keep a calm mind.'],
  iconPath: null,
  id: 'perk.legend_clarity',
  perkConstName: 'LegendClarity',
  perkName: 'Clarity',
  placements: [],
  primaryCategoryName: 'Traits',
  scenarioSources: [],
  searchText: 'Clarity Traits Keep a calm mind.',
} satisfies LegendsPerkRecord

function createDetailPanelProps({
  mustHavePickedPerkCount = 1,
  mustHavePickedPerkIds = ['perk.legend_clarity'],
  onInspectPerk = vi.fn(),
  onInspectPerkGroup = vi.fn(),
  optionalPickedPerkCount = 0,
  optionalPickedPerkIds = [],
  pickedPerkCount = mustHavePickedPerkCount + optionalPickedPerkCount,
  selectedBackgroundFitDetail = backgroundFit,
  selectedDetailType = 'background',
  selectedPerkDetail = null,
  studyResourceFilter = {
    shouldAllowBook: true,
    shouldAllowScroll: true,
    shouldAllowSecondScroll: false,
  },
  supportedBuildTargetPerkGroups = [
    {
      categoryName: 'Traits',
      pickedPerkCount: 1,
      pickedPerkIconPaths: ['ui/perks/clarity.png'],
      pickedPerkIds: ['perk.legend_clarity'],
      pickedPerkNames: ['Clarity'],
      perkGroupIconPath: 'ui/perks/perk_01.png',
      perkGroupId: 'CalmTree',
      perkGroupName: 'Calm',
    },
  ],
}: {
  mustHavePickedPerkCount?: number
  mustHavePickedPerkIds?: string[]
  onInspectPerk?: ComponentProps<typeof DetailPanel>['onInspectPerk']
  onInspectPerkGroup?: (categoryName: string, perkGroupId: string) => void
  optionalPickedPerkCount?: number
  optionalPickedPerkIds?: string[]
  pickedPerkCount?: number
  selectedBackgroundFitDetail?: RankedBackgroundFit | null
  selectedDetailType?: 'background' | 'perk'
  selectedPerkDetail?: LegendsPerkRecord | null
  studyResourceFilter?: ComponentProps<typeof DetailPanel>['studyResourceFilter']
  supportedBuildTargetPerkGroups?: BuildTargetPerkGroup[]
} = {}): ComponentProps<typeof DetailPanel> {
  return {
    selectedDetailType,
    selectedBackgroundFitDetail:
      selectedBackgroundFitDetail === null
        ? null
        : { backgroundFit: selectedBackgroundFitDetail, rank: 0 },
    detailHistoryNavigationAvailability: {
      next: false,
      previous: false,
    },
    groupedBackgroundSources: [],
    mustHavePickedPerkCount,
    mustHavePickedPerkIds,
    onAddPerkToBuild: vi.fn(),
    onInspectPerk,
    onInspectPerkGroup,
    onNavigateDetailHistory: vi.fn(),
    onRemovePerkFromBuild: vi.fn(),
    optionalPickedPerkCount,
    optionalPickedPerkIds,
    pickedPerkCount,
    selectedPerkRequirement: null,
    selectedPerk: selectedPerkDetail,
    studyResourceFilter,
    supportedBuildTargetPerkGroups,
  }
}

function createDetailPanelElement(options: Parameters<typeof createDetailPanelProps>[0] = {}) {
  return (
    <PlannerInteractionTestProvider>
      <DetailPanel {...createDetailPanelProps(options)} />
    </PlannerInteractionTestProvider>
  )
}

function renderSelectedBackgroundFitDetail(
  options: Parameters<typeof createDetailPanelProps>[0] = {},
) {
  const onInspectPerk = options.onInspectPerk ?? vi.fn()
  const onInspectPerkGroup = options.onInspectPerkGroup ?? vi.fn()
  const renderResult = render(
    createDetailPanelElement({ ...options, onInspectPerk, onInspectPerkGroup }),
  )

  return {
    onInspectPerk,
    onInspectPerkGroup,
    renderResult,
  }
}

describe('background details study resources', () => {
  test('keeps imported background metadata collapsed until expanded', async () => {
    const user = userEvent.setup()

    renderSelectedBackgroundFitDetail()

    const metadataSection = screen.getByTestId('detail-background-metadata-section')
    const metadataToggle = within(metadataSection).getByRole('button', {
      name: 'Background details',
    })
    const backgroundFitHeading = screen.getByRole('heading', { name: 'Background fit' })

    expect(metadataSection.tagName).toBe('SECTION')
    expect(
      within(metadataSection).getByRole('heading', { name: 'Background details' }),
    ).toBeVisible()
    expect(metadataToggle).toHaveAttribute('aria-expanded', 'false')
    expect(
      metadataSection.compareDocumentPosition(backgroundFitHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0)
    expect(within(metadataSection).queryByText('Daily cost')).not.toBeInTheDocument()
    expect(within(metadataSection).queryByText('Fear of Undead')).not.toBeInTheDocument()
    expect(
      within(metadataSection).queryByTestId('detail-background-metadata-content'),
    ).not.toBeInTheDocument()

    await user.click(metadataToggle)

    expect(metadataToggle).toHaveAttribute('aria-expanded', 'true')
    expect(
      within(metadataSection).getByRole('region', { name: 'Background details' }),
    ).toBeVisible()
    expect(within(metadataSection).getByText('Daily cost:')).toBeVisible()
    expect(
      within(metadataSection).queryByRole('heading', { name: 'Daily cost' }),
    ).not.toBeInTheDocument()
    expect(within(metadataSection).getByText('6')).toBeVisible()
    expect(within(metadataSection).getByText('Background type:')).toBeVisible()
    expect(within(metadataSection).getByText('Crusader, Educated')).toBeVisible()
    expect(
      within(metadataSection).queryByRole('heading', { name: 'Background type' }),
    ).not.toBeInTheDocument()
    const fearOfUndeadTraitPill = within(metadataSection).getByRole('button', {
      name: 'Fear of Undead',
    })
    const quickTraitPill = within(metadataSection).getByRole('button', { name: 'Quick' })

    expect(fearOfUndeadTraitPill).toBeVisible()
    expect(quickTraitPill).toBeVisible()
    expect(
      within(fearOfUndeadTraitPill).getByTestId('detail-background-trait-icon'),
    ).toHaveAttribute(
      'src',
      getGameIconUrl('ui/traits/trait_icon_50.png', gameIconImageWidths.compact),
    )
    expect(within(quickTraitPill).getByTestId('detail-background-trait-icon')).toHaveAttribute(
      'src',
      getGameIconUrl('ui/traits/trait_icon_32.png', gameIconImageWidths.compact),
    )
    expect(within(metadataSection).getByText('Ranged skill')).toBeVisible()
    const talentAttributeList = within(metadataSection).getByTestId(
      'detail-background-talent-attribute-list',
    )

    expect(
      within(talentAttributeList).getByTestId(
        'detail-background-talent-attribute-icon-ranged-skill',
      ),
    ).toHaveAttribute(
      'src',
      getGameIconUrl('ui/icons/ranged_skill_va11.png', gameIconImageWidths.compact),
    )
    expect(within(metadataSection).getByText('Company capacity')).toBeVisible()
    expect(within(metadataSection).getByText('Tools and supplies capacity')).toBeVisible()
    expect(within(metadataSection).getByText('+13')).toBeVisible()
    expect(within(metadataSection).getByText('Camp skills')).toBeVisible()
    expect(screen.getByTestId('detail-camp-resource-modifier-columns')).toBeVisible()
    expect(
      within(metadataSection)
        .getAllByTestId('detail-camp-resource-modifier-value')
        .every((modifierValue) =>
          [...modifierValue.classList].some((className) =>
            className.includes('detailCampResourceModifierValue'),
          ),
        ),
    ).toBe(true)
    expect(within(metadataSection).getByText('Repairing')).toBeVisible()
    expect(within(metadataSection).getByText('+30%')).toBeVisible()
    expect(within(metadataSection).getByText('Terrain movement')).toBeVisible()
    expect(within(metadataSection).getByText('Plains')).toBeVisible()
    expect(within(metadataSection).getByText('+15%')).toBeVisible()
  })

  test('normalizes background talent attribute names before resolving icons', async () => {
    const user = userEvent.setup()

    renderSelectedBackgroundFitDetail({
      selectedBackgroundFitDetail: {
        ...backgroundFit,
        excludedTalentAttributeNames: [' Ranged Skill ', 'melee DEFENSE'],
      },
    })

    const metadataSection = screen.getByTestId('detail-background-metadata-section')
    const metadataToggle = within(metadataSection).getByRole('button', {
      name: 'Background details',
    })

    await user.click(metadataToggle)

    const talentAttributeList = within(metadataSection).getByTestId(
      'detail-background-talent-attribute-list',
    )

    expect(
      within(talentAttributeList).getByTestId(
        'detail-background-talent-attribute-icon-ranged-skill',
      ),
    ).toHaveAttribute(
      'src',
      getGameIconUrl('ui/icons/ranged_skill_va11.png', gameIconImageWidths.compact),
    )
    expect(
      within(talentAttributeList).getByTestId(
        'detail-background-talent-attribute-icon-melee-defense',
      ),
    ).toHaveAttribute(
      'src',
      getGameIconUrl('ui/icons/melee_defense_va11.png', gameIconImageWidths.compact),
    )
    expect(talentAttributeList.querySelector('[data-placeholder="true"]')).not.toBeInTheDocument()
  })

  test('collapses top-level background sections without hiding their headings', async () => {
    const user = userEvent.setup()

    renderSelectedBackgroundFitDetail()

    const backgroundFitToggle = screen.getByRole('button', { name: 'Background fit' })
    const matchedGroupsToggle = screen.getByRole('button', { name: 'Matched perk groups' })

    expect(screen.getByRole('heading', { name: 'Background fit' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Matched perk groups' })).toBeVisible()
    expect(backgroundFitToggle).toHaveAttribute('aria-expanded', 'true')
    expect(matchedGroupsToggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Must-have build chance')).toBeVisible()
    expect(screen.getByRole('img', { name: 'Must-have perk groups' })).toBeVisible()

    await user.click(backgroundFitToggle)
    await user.click(matchedGroupsToggle)

    expect(backgroundFitToggle).toHaveAttribute('aria-expanded', 'false')
    expect(matchedGroupsToggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('heading', { name: 'Background fit' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Matched perk groups' })).toBeVisible()
    expect(screen.queryByText('Must-have build chance')).not.toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'Must-have perk groups' })).not.toBeInTheDocument()
  })

  test('keeps background section expansion state while switching details', async () => {
    const user = userEvent.setup()
    const alternateBackgroundFit = {
      ...backgroundFit,
      backgroundId: 'background.messenger',
      backgroundName: 'Messenger',
      dailyCost: 8,
    } satisfies RankedBackgroundFit
    const { renderResult } = renderSelectedBackgroundFitDetail()

    const metadataToggle = screen.getByRole('button', { name: 'Background details' })

    await user.click(metadataToggle)

    expect(metadataToggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Daily cost:')).toBeVisible()

    renderResult.rerender(
      createDetailPanelElement({ selectedBackgroundFitDetail: alternateBackgroundFit }),
    )

    expect(screen.getByRole('button', { name: 'Background details' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByText('8')).toBeVisible()

    renderResult.rerender(
      createDetailPanelElement({
        selectedBackgroundFitDetail: null,
        selectedDetailType: 'perk',
        selectedPerkDetail: selectedPerk,
      }),
    )

    expect(screen.getByRole('heading', { name: 'Clarity' })).toBeVisible()

    renderResult.rerender(createDetailPanelElement({ selectedBackgroundFitDetail: backgroundFit }))

    expect(screen.getByRole('button', { name: 'Background details' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByText('Daily cost:')).toBeVisible()
  })

  test('opens background trait tooltips from trait pills', async () => {
    const user = userEvent.setup()

    renderSelectedBackgroundFitDetail()

    const metadataSection = screen.getByTestId('detail-background-metadata-section')
    const metadataToggle = within(metadataSection).getByRole('button', {
      name: 'Background details',
    })

    await user.click(metadataToggle)

    const fearOfUndeadTraitPill = within(metadataSection).getByRole('button', {
      name: 'Fear of Undead',
    })

    await user.click(fearOfUndeadTraitPill)

    const traitTooltip = screen.getByRole('tooltip')

    expect(fearOfUndeadTraitPill).toHaveAttribute('aria-describedby', traitTooltip.id)
    expect(traitTooltip).toHaveTextContent('Afraid of walking dead.')
    expect(traitTooltip).not.toHaveTextContent(
      'This background excludes this trait, so recruits with this background cannot roll it.',
    )
  })

  test('clears background trait tooltips while switching background details', async () => {
    const user = userEvent.setup()
    const alternateBackgroundFit = {
      ...backgroundFit,
      backgroundId: 'background.messenger',
      backgroundName: 'Messenger',
      excludedTraits: [],
      excludedTraitNames: [],
      guaranteedTraits: [],
      guaranteedTraitNames: [],
      sourceFilePath: 'scripts/skills/backgrounds/messenger_background.nut',
    } satisfies RankedBackgroundFit
    const { renderResult } = renderSelectedBackgroundFitDetail()

    let metadataSection = screen.getByTestId('detail-background-metadata-section')
    const metadataToggle = within(metadataSection).getByRole('button', {
      name: 'Background details',
    })

    await user.click(metadataToggle)

    const fearOfUndeadTraitPill = within(metadataSection).getByRole('button', {
      name: 'Fear of Undead',
    })

    await user.click(fearOfUndeadTraitPill)

    const traitTooltip = screen.getByRole('tooltip')

    expect(fearOfUndeadTraitPill).toHaveAttribute('aria-describedby', traitTooltip.id)
    expect(traitTooltip).toHaveTextContent('Afraid of walking dead.')

    renderResult.rerender(
      createDetailPanelElement({ selectedBackgroundFitDetail: alternateBackgroundFit }),
    )

    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument())

    metadataSection = screen.getByTestId('detail-background-metadata-section')

    expect(
      within(metadataSection).getByRole('button', { name: 'Background details' }),
    ).toHaveAttribute('aria-expanded', 'true')
    expect(
      within(metadataSection).queryByRole('button', { name: 'Fear of Undead' }),
    ).not.toBeInTheDocument()
    expect(within(metadataSection).getAllByText('None')).toHaveLength(2)
  })

  test('shows none for empty background trait and talent metadata', async () => {
    renderSelectedBackgroundFitDetail({
      selectedBackgroundFitDetail: {
        ...backgroundFit,
        backgroundTypeNames: [],
        campResourceModifiers: [],
        dailyCost: null,
        excludedTalentAttributeNames: [],
        excludedTraits: [],
        excludedTraitNames: [],
        guaranteedTraits: [],
        guaranteedTraitNames: [],
      },
    })

    const metadataSection = screen.getByTestId('detail-background-metadata-section')
    const metadataToggle = within(metadataSection).getByRole('button', {
      name: 'Background details',
    })

    await userEvent.click(metadataToggle)

    expect(within(metadataSection).getAllByText('None')).toHaveLength(5)
    expect(within(metadataSection).queryByText('Company capacity')).not.toBeInTheDocument()
  })

  test('keeps native non-build perk groups collapsed until expanded', async () => {
    const user = userEvent.setup()
    const onInspectPerkGroup = vi.fn()

    renderSelectedBackgroundFitDetail({
      onInspectPerkGroup,
      selectedBackgroundFitDetail: {
        ...backgroundFit,
        otherPerkGroups: [
          {
            categoryName: 'Defense',
            isGuaranteed: true,
            perkGroupIconPath: 'ui/perks/heavy_defense.png',
            perkGroupId: 'HeavyDefenseTree',
            perkGroupName: 'Heavy armor',
            perks: [
              {
                iconPath: 'ui/perks/heavy_armor.png',
                perkId: 'perk.legend_heavy_armor',
                perkName: 'Heavy armor stance',
              },
            ],
            probability: 1,
          },
          {
            categoryName: 'Traits',
            isGuaranteed: false,
            perkGroupIconPath: 'ui/perks/bold.png',
            perkGroupId: 'BoldTree',
            perkGroupName: 'Bold',
            perks: [
              {
                iconPath: 'ui/perks/bold.png',
                perkId: 'perk.legend_bold',
                perkName: 'Bold spirit',
              },
            ],
            probability: 0.5,
          },
          {
            categoryName: 'Enemy',
            isGuaranteed: false,
            perkGroupIconPath: 'ui/perks/beasts.png',
            perkGroupId: 'BeastTree',
            perkGroupName: 'Beasts',
            perks: [
              {
                iconPath: 'ui/perks/beasts.png',
                perkId: 'perk.legend_favoured_enemy_beasts',
                perkName: 'Favoured Enemy - Beasts',
              },
            ],
            probability: 0.005,
          },
        ],
      },
    })

    const toggle = screen.getByTestId('detail-other-perk-groups-toggle')

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByTestId('detail-other-perk-groups-count')).toHaveTextContent('3')
    expect(screen.queryByTestId('detail-other-perk-groups-section')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Select perk group Heavy armor' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Select perk group Beasts' }),
    ).not.toBeInTheDocument()

    await user.click(toggle)

    const section = screen.getByTestId('detail-other-perk-groups-section')
    const heavyArmorButton = within(section).getByRole('button', {
      name: 'Select perk group Heavy armor',
    })
    const probabilityBadges = within(section)
      .getAllByTestId('detail-other-perk-group-probability')
      .map((probabilityBadge) => probabilityBadge.textContent)
    const rareToggle = within(section).getByRole('button', {
      name: 'Expand Possible - under 1% chance, 1 rare native perk group',
    })
    const sectionCountBadges = within(section).getAllByTestId(
      'detail-other-perk-group-section-count',
    )

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(
      within(section).getByText(
        'Native perk groups this background can get outside the current build. Skill books and ancient scrolls are not included.',
      ),
    ).toBeVisible()
    expect(within(section).getByRole('heading', { level: 4, name: 'Guaranteed' })).toBeVisible()
    expect(within(section).getByRole('heading', { level: 4, name: 'Possible' })).toBeVisible()
    expect(sectionCountBadges.map((countBadge) => countBadge.textContent)).toEqual(['1', '1'])
    expect(sectionCountBadges.map((countBadge) => countBadge.getAttribute('aria-label'))).toEqual([
      '1 guaranteed native perk group',
      '1 possible native perk group',
    ])
    expect(within(section).getByText('Heavy armor stance')).toBeVisible()
    expect(within(section).getByText('Bold spirit')).toBeVisible()
    expect(within(section).queryByText('Defense')).not.toBeInTheDocument()
    expect(within(section).queryByText('Traits')).not.toBeInTheDocument()
    expect(probabilityBadges).toEqual(['Guaranteed', '50%'])
    expect(within(section).getByText('Possible - under 1% chance')).toBeVisible()
    expect(rareToggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByTestId('detail-rare-other-perk-groups-count')).toHaveTextContent('1')
    expect(screen.queryByTestId('detail-rare-other-perk-groups-list')).not.toBeInTheDocument()
    expect(
      within(section).queryByRole('button', { name: 'Select perk group Beasts' }),
    ).not.toBeInTheDocument()
    expect(
      within(section).queryByRole('button', { name: 'Select perk group Calm' }),
    ).not.toBeInTheDocument()

    await user.click(heavyArmorButton)

    expect(onInspectPerkGroup).toHaveBeenCalledWith('Defense', 'HeavyDefenseTree')

    await user.click(rareToggle)

    const rareGroupList = screen.getByTestId('detail-rare-other-perk-groups-list')

    expect(rareToggle).toHaveAttribute('aria-expanded', 'true')
    expect(rareToggle).toHaveAccessibleName(
      'Collapse Possible - under 1% chance, 1 rare native perk group',
    )
    expect(
      within(rareGroupList).getByRole('button', { name: 'Select perk group Beasts' }),
    ).toBeVisible()
    expect(within(rareGroupList).getByText('0.50%')).toBeVisible()
  })

  test('renders the strategy study resource plan near fit metrics', () => {
    renderSelectedBackgroundFitDetail()

    expect(screen.getByRole('img', { name: 'Must-have perk groups' })).toBeVisible()
    const detailBadgeRow = screen.getByTestId('detail-badge-row')
    const veteranPerkIntervalBadge = within(detailBadgeRow).getByTestId(
      'detail-background-veteran-perk-badge',
    )
    const studyResourceBadges = within(detailBadgeRow).getByTestId(
      backgroundStudyResourceBadgesTestId,
    )

    expect(studyResourceBadges).toBeVisible()
    expect(
      veteranPerkIntervalBadge.compareDocumentPosition(studyResourceBadges) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0)

    const studyResourcePlan = screen.getByTestId('detail-study-resource-plan')

    expect(
      within(studyResourcePlan).getByRole('heading', {
        level: 4,
        name: 'Must-have book usage',
      }),
    ).toBeVisible()
    expect(within(studyResourcePlan).queryByText('Study resource plan')).not.toBeInTheDocument()
    expect(
      within(studyResourcePlan).getByRole('heading', {
        level: 5,
        name: 'Skill book covers:',
      }),
    ).toBeVisible()
    expect(within(studyResourcePlan).queryByText('Covers')).not.toBeInTheDocument()

    const skillBookPerkGroupList = within(studyResourcePlan).getByRole('list', {
      name: 'Skill book covered perk groups',
    })
    const calmStudyResourceTile = within(skillBookPerkGroupList).getByTestId('planner-group-card')
    const calmStudyResourceTileIcons = within(calmStudyResourceTile).getAllByTestId(
      'planner-group-option-icon',
    )
    const coveredClarityPill = within(calmStudyResourceTile).getByRole('button', {
      name: 'Clarity',
    })

    expect(calmStudyResourceTile).toBeVisible()
    expect(calmStudyResourceTileIcons).toHaveLength(2)
    expect(calmStudyResourceTileIcons[0]).toHaveAttribute(
      'src',
      getGameIconUrl('ui/perks/perk_01.png', gameIconImageWidths.compact),
    )
    expect(calmStudyResourceTileIcons[1]).toHaveAttribute(
      'src',
      getGameIconUrl(skillBookIconPath, gameIconImageWidths.compact),
    )

    expect(coveredClarityPill).toBeVisible()
    expect(within(coveredClarityPill).getByTestId('planner-pill-icon')).toHaveAttribute(
      'src',
      getGameIconUrl('ui/perks/clarity.png', gameIconImageWidths.compact),
    )
    expect(screen.queryByText('Must-have study route')).not.toBeInTheDocument()
    expect(screen.queryByTestId('detail-study-resource-tile-frame')).not.toBeInTheDocument()
  })

  test('uses the resolved build target group for study resource perk pill interactions', async () => {
    const user = userEvent.setup()
    const onInspectPerk = vi.fn()
    const fallbackStrategyTarget = {
      ...calmStrategyTarget,
      perkGroupId: 'MissingTree',
      perkGroupName: 'Missing target',
    } satisfies BackgroundFitStudyResourceStrategyTarget

    renderSelectedBackgroundFitDetail({
      onInspectPerk,
      selectedBackgroundFitDetail: {
        ...backgroundFit,
        mustHaveStudyResourceStrategy: createStudyResourceStrategy({
          bookTargets: [fallbackStrategyTarget],
        }),
      },
    })

    const studyResourcePlan = screen.getByTestId('detail-study-resource-plan')
    const coveredClarityPill = within(studyResourcePlan).getByRole('button', {
      name: 'Clarity',
    })

    await user.click(coveredClarityPill)

    expect(onInspectPerk).toHaveBeenCalledWith('perk.legend_clarity', {
      categoryName: 'Traits',
      perkGroupId: 'CalmTree',
    })
  })

  test('shows study resource route comparison inside the chance explanation', async () => {
    renderSelectedBackgroundFitDetail({
      selectedBackgroundFitDetail: {
        ...backgroundFit,
        mustHaveBuildReachabilityProbability: 0.6,
        mustHaveStudyResourceChanceBreakdown: [
          {
            key: 'native',
            probability: 0.1,
            shouldAllowBook: false,
            shouldAllowScroll: false,
            shouldAllowSecondScroll: false,
          },
          {
            calculation: createChanceCalculation({
              probability: 0.2,
              terms: [{ outcomeCount: 1, probability: 0.2 }],
              totalOutcomeCount: 5,
            }),
            key: 'book',
            probability: 0.2,
            shouldAllowBook: true,
            shouldAllowScroll: false,
            shouldAllowSecondScroll: false,
          },
          {
            key: 'scroll',
            probability: 0.4,
            shouldAllowBook: false,
            shouldAllowScroll: true,
            shouldAllowSecondScroll: false,
          },
          {
            key: 'book-and-scroll',
            probability: 0.6,
            shouldAllowBook: true,
            shouldAllowScroll: true,
            shouldAllowSecondScroll: false,
          },
        ],
        mustHaveStudyResourceStrategy: createStudyResourceStrategy({
          bookTargets: [calmStrategyTarget],
          nativeProbability: 0.1,
          probability: 0.6,
          selectedCombinationKey: 'book-and-scroll',
        }),
      },
    })

    const backgroundFitTables = screen.getByTestId('detail-background-fit-tables')

    expect(backgroundFitTables).toContainElement(screen.getByTestId('background-fit-summary-table'))
    expect(screen.queryByTestId('detail-chance-breakdown')).not.toBeInTheDocument()

    await expandChanceExplanation()

    const mustHaveScope = screen
      .getAllByTestId('detail-chance-explanation-scope')
      .find((scope) => scope.textContent?.includes('Must-have chance'))
    const routeComparison = within(mustHaveScope!).getByTestId('detail-chance-route-comparison')

    expect(mustHaveScope).toBeDefined()
    expect(
      within(routeComparison).getByRole('heading', {
        level: 5,
        name: 'Route comparison',
      }),
    ).toBeVisible()
    expect(within(routeComparison).getByText('Native roll')).toBeVisible()
    expect(within(routeComparison).getByText('10%')).toBeVisible()
    expect(within(routeComparison).getByText('Skill book')).toBeVisible()
    expect(within(routeComparison).getByText('20%')).toBeVisible()
    expect(within(routeComparison).getByText('Ancient scroll')).toBeVisible()
    expect(within(routeComparison).getByText('40%')).toBeVisible()
    expect(within(routeComparison).getByText('Skill book + ancient scroll')).toBeVisible()
    expect(within(routeComparison).getByText('60%')).toBeVisible()
    expect(mustHaveScope!).toHaveTextContent(
      'Best route improves this from 10% native-only to 60%.',
    )
  })

  test('labels a differing full-build strategy by impact instead of optional-only route', () => {
    const alternateFullBuildResourceBackgroundFit = {
      ...backgroundFit,
      fullBuildStudyResourceRequirement: ancientScrollRequirementProfile,
      fullBuildStudyResourceStrategy: createStudyResourceStrategy({
        bookTargets: [],
        scrollTargets: [assassinStrategyTarget],
        selectedCombinationKey: 'scroll',
      }),
      mustHaveStudyResourceRequirement: skillBookRequirementProfile,
      mustHaveStudyResourceStrategy: createStudyResourceStrategy({
        bookTargets: [calmStrategyTarget],
      }),
    } satisfies RankedBackgroundFit

    renderSelectedBackgroundFitDetail({
      optionalPickedPerkCount: 1,
      optionalPickedPerkIds: ['perk.legend_assassinate'],
      pickedPerkCount: 2,
      selectedBackgroundFitDetail: alternateFullBuildResourceBackgroundFit,
      supportedBuildTargetPerkGroups: [
        {
          categoryName: 'Traits',
          pickedPerkCount: 1,
          pickedPerkIconPaths: ['ui/perks/clarity.png'],
          pickedPerkIds: ['perk.legend_clarity'],
          pickedPerkNames: ['Clarity'],
          perkGroupIconPath: 'ui/perks/perk_01.png',
          perkGroupId: 'CalmTree',
          perkGroupName: 'Calm',
        },
        {
          categoryName: 'Magic',
          pickedPerkCount: 1,
          pickedPerkIconPaths: ['ui/perks/assassinate.png'],
          pickedPerkIds: ['perk.legend_assassinate'],
          pickedPerkNames: ['Assassinate'],
          perkGroupIconPath: 'ui/perks/perk_37.png',
          perkGroupId: 'AssassinMagicTree',
          perkGroupName: 'Assassin',
        },
      ],
    })

    const studyResourcePlan = screen.getByTestId('detail-study-resource-plan')

    expect(
      within(studyResourcePlan).getByRole('heading', { level: 4, name: 'Must-have book usage' }),
    ).toBeVisible()
    expect(
      within(studyResourcePlan).getByRole('heading', { level: 4, name: 'Full-build scroll usage' }),
    ).toBeVisible()
    expect(
      within(studyResourcePlan).getByRole('heading', {
        level: 5,
        name: 'Skill book covers:',
      }),
    ).toBeVisible()
    expect(
      within(studyResourcePlan).getByRole('heading', {
        level: 5,
        name: 'Ancient scroll covers:',
      }),
    ).toBeVisible()
    expect(screen.queryByText('Additional optional-only study route')).not.toBeInTheDocument()
  })

  test('keeps matched groups visible while excluding redundant groups from the study plan', () => {
    const peddlerLikeBackgroundFit = {
      ...backgroundFit,
      expectedCoveredMustHavePerkCount: 7.9,
      fullBuildStudyResourceRequirement: skillBookRequirementProfile,
      fullBuildStudyResourceStrategy: createStudyResourceStrategy({
        bookTargets: [mediumArmorStrategyTarget, fitStrategyTarget],
        probability: 0.53,
        scrollTargets: [berserkerStrategyTarget],
        selectedCombinationKey: 'book-and-scroll',
      }),
      matches: [
        {
          categoryName: 'Defense',
          isGuaranteed: false,
          pickedPerkCount: 1,
          pickedPerkIconPaths: ['ui/perks/brawny.png'],
          pickedPerkIds: ['perk.legend_brawny'],
          pickedPerkNames: ['Brawny'],
          perkGroupIconPath: 'ui/perks/perk_22.png',
          perkGroupId: 'HeavyDefenseTree',
          perkGroupName: 'Heavy Armor',
          probability: 1 / 3,
        },
      ],
      mustHaveStudyResourceRequirement: skillBookRequirementProfile,
      mustHaveStudyResourceStrategy: createStudyResourceStrategy({
        bookTargets: [mediumArmorStrategyTarget, fitStrategyTarget],
        probability: 0.53,
        scrollTargets: [berserkerStrategyTarget],
        selectedCombinationKey: 'book-and-scroll',
      }),
    } satisfies RankedBackgroundFit

    renderSelectedBackgroundFitDetail({
      mustHavePickedPerkCount: 1,
      mustHavePickedPerkIds: ['perk.legend_brawny'],
      selectedBackgroundFitDetail: peddlerLikeBackgroundFit,
      supportedBuildTargetPerkGroups: [
        {
          categoryName: 'Defense',
          pickedPerkCount: 2,
          pickedPerkIconPaths: ['ui/perks/perfect_fit.png', 'ui/perks/lithe.png'],
          pickedPerkIds: ['perk.legend_perfect_fit', 'perk.legend_lithe'],
          pickedPerkNames: ['Perfect Fit', 'Lithe'],
          perkGroupIconPath: 'ui/perks/perk_22.png',
          perkGroupId: 'MediumDefenseTree',
          perkGroupName: 'Medium Armor',
        },
        {
          categoryName: 'Traits',
          pickedPerkCount: 1,
          pickedPerkIconPaths: ['ui/perks/athlete.png'],
          pickedPerkIds: ['perk.legend_athlete'],
          pickedPerkNames: ['Athlete'],
          perkGroupIconPath: 'ui/perks/perk_31.png',
          perkGroupId: 'FitTree',
          perkGroupName: 'Fit',
        },
        {
          categoryName: 'Magic',
          pickedPerkCount: 3,
          pickedPerkIconPaths: [
            'ui/perks/muscularity.png',
            'ui/perks/brawny.png',
            'ui/perks/colossus.png',
          ],
          pickedPerkIds: ['perk.legend_muscularity', 'perk.legend_brawny', 'perk.legend_colossus'],
          pickedPerkNames: ['Muscularity', 'Brawny', 'Colossus'],
          perkGroupIconPath: 'ui/perks/perk_37.png',
          perkGroupId: 'BerserkerMagicTree',
          perkGroupName: 'Berserker',
        },
        {
          categoryName: 'Defense',
          pickedPerkCount: 1,
          pickedPerkIconPaths: ['ui/perks/brawny.png'],
          pickedPerkIds: ['perk.legend_brawny'],
          pickedPerkNames: ['Brawny'],
          perkGroupIconPath: 'ui/perks/perk_22.png',
          perkGroupId: 'HeavyDefenseTree',
          perkGroupName: 'Heavy Armor',
        },
      ],
    })

    const studyResourcePlan = screen.getByTestId('detail-study-resource-plan')

    expect(
      within(studyResourcePlan).getByRole('heading', {
        level: 4,
        name: 'Must-have book/scroll usage',
      }),
    ).toBeVisible()
    expect(
      within(studyResourcePlan).getByRole('heading', {
        level: 5,
        name: 'Ancient scroll covers:',
      }),
    ).toBeVisible()
    expect(
      within(studyResourcePlan).getByRole('heading', {
        level: 5,
        name: 'Skill book covers:',
      }),
    ).toBeVisible()
    expect(
      within(studyResourcePlan)
        .getAllByTestId('detail-study-resource-plan-row')
        .map((row) => row.getAttribute('data-resource-kind')),
    ).toEqual(['book', 'scroll'])
    expect(within(studyResourcePlan).queryByText('Heavy Armor')).not.toBeInTheDocument()
    const scrollCoveredPerkGroups = within(studyResourcePlan).getByRole('list', {
      name: 'Ancient scroll covered perk groups',
    })
    const berserkerStudyResourceTile = within(scrollCoveredPerkGroups)
      .getAllByTestId('planner-group-card')
      .find((groupCard) => groupCard.textContent?.includes('Berserker'))

    expect(berserkerStudyResourceTile).toBeDefined()

    expect(
      within(berserkerStudyResourceTile!).getByRole('button', { name: 'Muscularity' }),
    ).toBeVisible()
    expect(
      within(berserkerStudyResourceTile!).getByRole('button', { name: 'Brawny' }),
    ).toBeVisible()
    expect(
      within(berserkerStudyResourceTile!).getByRole('button', { name: 'Colossus' }),
    ).toBeVisible()
    expect(
      within(
        within(berserkerStudyResourceTile!).getByRole('button', { name: 'Muscularity' }),
      ).getByTestId('planner-pill-icon'),
    ).toHaveAttribute(
      'src',
      getGameIconUrl('ui/perks/muscularity.png', gameIconImageWidths.compact),
    )
    expect(screen.getByRole('button', { name: 'Select perk group Heavy Armor' })).toBeVisible()
  })

  test('explains why individual possible native rows combine into a smaller full build chance', async () => {
    const nightRaiderAssassinStrategyTarget = {
      ...assassinStrategyTarget,
      coveredPickedPerkIds: ['perk.legend_night_raider'],
      coveredPickedPerkNames: ['Night Raider'],
    } satisfies BackgroundFitStudyResourceStrategyTarget
    const heavyArmorStrategyTarget = {
      categoryName: 'Defense',
      coveredPickedPerkIds: ['perk.legend_brawny'],
      coveredPickedPerkNames: ['Brawny'],
      fixedTargetProbability: 1 / 36,
      marginalProbabilityGain: 1 / 36,
      perkGroupIconPath: 'ui/perks/perk_03.png',
      perkGroupId: 'HeavyArmorTree',
      perkGroupName: 'Heavy Armor',
    } satisfies BackgroundFitStudyResourceStrategyTarget
    const rangerLikeBackgroundFit = {
      ...backgroundFit,
      backgroundId: 'background.legend_ranger',
      backgroundName: 'Ranger',
      fullBuildReachabilityProbability: 1 / 36,
      fullBuildStudyResourceChanceBreakdown: [
        {
          calculation: createChanceCalculation({
            probability: 0,
            successfulOutcomeCount: 0,
            terms: [],
            totalOutcomeCount: 36,
          }),
          key: 'native',
          probability: 0,
          shouldAllowBook: false,
          shouldAllowScroll: false,
          shouldAllowSecondScroll: false,
        },
        {
          calculation: createChanceCalculation({
            nativeCoveredPickedPerkIdsByOutcome: [['perk.legend_alert', 'perk.legend_muscularity']],
            probability: 1 / 36,
            successfulOutcomeCount: 1,
            terms: [{ outcomeCount: 1, probability: 1 / 36 }],
            totalOutcomeCount: 36,
          }),
          key: 'book-and-scroll',
          probability: 1 / 36,
          shouldAllowBook: true,
          shouldAllowScroll: true,
          shouldAllowSecondScroll: false,
        },
      ],
      fullBuildStudyResourceStrategy: createStudyResourceStrategy({
        bookTargets: [heavyArmorStrategyTarget],
        nativeProbability: 0,
        probability: 1 / 36,
        scrollTargets: [nightRaiderAssassinStrategyTarget],
        selectedCombinationKey: 'book-and-scroll',
      }),
      matches: [
        {
          categoryName: 'Traits',
          isGuaranteed: false,
          pickedPerkCount: 1,
          pickedPerkIconPaths: ['ui/perks/alert_circle.png'],
          pickedPerkIds: ['perk.legend_alert'],
          pickedPerkNames: ['Alert'],
          perkGroupIconPath: 'ui/perks/clarity_circle.png',
          perkGroupId: 'CalmTree',
          perkGroupName: 'Calm',
          probability: 2 / 9,
        },
        {
          categoryName: 'Traits',
          isGuaranteed: false,
          pickedPerkCount: 1,
          pickedPerkIconPaths: ['ui/perks/muscularity.png'],
          pickedPerkIds: ['perk.legend_muscularity'],
          pickedPerkNames: ['Muscularity'],
          perkGroupIconPath: 'ui/perks/perk_40.png',
          perkGroupId: 'LargeTree',
          perkGroupName: 'Large',
          probability: 2 / 9,
        },
      ],
      mustHaveBuildReachabilityProbability: 1,
      mustHaveStudyResourceStrategy: createStudyResourceStrategy({
        nativeProbability: 0,
        probability: 1,
        scrollTargets: [nightRaiderAssassinStrategyTarget],
        selectedCombinationKey: 'scroll',
      }),
      otherPerkGroups: Array.from({ length: 7 }, (_, perkGroupIndex) => ({
        categoryName: 'Traits',
        isGuaranteed: false,
        perkGroupIconPath: null,
        perkGroupId: `OtherTraitTree${perkGroupIndex}`,
        perkGroupName: `Other trait ${perkGroupIndex + 1}`,
        perks: [],
        probability: 2 / 9,
      })),
    } satisfies RankedBackgroundFit

    renderSelectedBackgroundFitDetail({
      mustHavePickedPerkCount: 1,
      mustHavePickedPerkIds: ['perk.legend_night_raider'],
      optionalPickedPerkCount: 3,
      optionalPickedPerkIds: ['perk.legend_alert', 'perk.legend_brawny', 'perk.legend_muscularity'],
      pickedPerkCount: 4,
      selectedBackgroundFitDetail: rangerLikeBackgroundFit,
      supportedBuildTargetPerkGroups: [
        {
          categoryName: 'Magic',
          pickedPerkCount: 1,
          pickedPerkIconPaths: ['ui/perks/night_raider.png'],
          pickedPerkIds: ['perk.legend_night_raider'],
          pickedPerkNames: ['Night Raider'],
          perkGroupIconPath: 'ui/perks/perk_37.png',
          perkGroupId: 'AssassinMagicTree',
          perkGroupName: 'Assassin',
        },
        {
          categoryName: 'Defense',
          pickedPerkCount: 1,
          pickedPerkIconPaths: ['ui/perks/brawny.png'],
          pickedPerkIds: ['perk.legend_brawny'],
          pickedPerkNames: ['Brawny'],
          perkGroupIconPath: 'ui/perks/perk_03.png',
          perkGroupId: 'HeavyArmorTree',
          perkGroupName: 'Heavy Armor',
        },
        {
          categoryName: 'Traits',
          pickedPerkCount: 1,
          pickedPerkIconPaths: ['ui/perks/alert_circle.png'],
          pickedPerkIds: ['perk.legend_alert'],
          pickedPerkNames: ['Alert'],
          perkGroupIconPath: 'ui/perks/clarity_circle.png',
          perkGroupId: 'CalmTree',
          perkGroupName: 'Calm',
        },
        {
          categoryName: 'Traits',
          pickedPerkCount: 1,
          pickedPerkIconPaths: ['ui/perks/muscularity.png'],
          pickedPerkIds: ['perk.legend_muscularity'],
          pickedPerkNames: ['Muscularity'],
          perkGroupIconPath: 'ui/perks/perk_40.png',
          perkGroupId: 'LargeTree',
          perkGroupName: 'Large',
        },
      ],
    })

    expect(screen.getByTestId('detail-chance-explanation')).toBeVisible()
    expect(screen.queryByTestId('detail-chance-explanation-scope')).not.toBeInTheDocument()
    await expandChanceExplanation()

    const fullBuildScope = screen
      .getAllByTestId('detail-chance-explanation-scope')
      .find((scope) => scope.textContent?.includes('Full build chance'))

    expect(fullBuildScope).toBeDefined()
    expect(fullBuildScope!).toHaveTextContent('Full build chance')
    expect(fullBuildScope!).toHaveTextContent('2.8%')
    expect(fullBuildScope!).toHaveTextContent(
      'Best route improves this from 0% native-only to 2.8%.',
    )
    expect(fullBuildScope!).toHaveTextContent('Skill book covers Heavy Armor for Brawny.')
    expect(fullBuildScope!).toHaveTextContent('Ancient scroll covers Assassin for Night Raider.')
    expect(fullBuildScope!).toHaveTextContent('The remaining native roll needs Calm and Large.')
    expect(fullBuildScope!).toHaveTextContent(
      'Chance math: Traits roll picks 2 of 9 trait groups (22.2% each), so Calm and Large together are C(7, 0) / C(9, 2) = 2.8%.',
    )
    expect(fullBuildScope!).not.toHaveTextContent('those percentages are not added together')
    const routeComparison = within(fullBuildScope!).getByTestId('detail-chance-route-comparison')

    expect(within(routeComparison).getByText('Native roll')).toBeVisible()
    expect(within(routeComparison).getByText('0%')).toBeVisible()
    expect(within(routeComparison).getByText('Skill book + ancient scroll')).toBeVisible()
    expect(within(routeComparison).getByText('2.8%')).toBeVisible()

    const advancedDetails = within(fullBuildScope!).getByTestId(
      'detail-chance-explanation-advanced',
    )

    expect(advancedDetails).toHaveTextContent('Native roll details')
    expect(advancedDetails).toHaveTextContent(
      '1 legal native roll path out of 36 grouped native roll patterns total 2.8%.',
    )
    expect(advancedDetails).toHaveTextContent('Calm and Large')
    expect(advancedDetails).toHaveTextContent('2.8%')
    expect(advancedDetails).toHaveTextContent(
      'Traits roll picks 2 of 9 trait groups (22.2% each), so Calm and Large together are C(7, 0) / C(9, 2) = 2.8%.',
    )
    expect(advancedDetails).not.toHaveTextContent('Actual engine expression')
    expect(advancedDetails).not.toHaveTextContent('The engine summed')

    expect(screen.queryByTestId('detail-chance-explanation-native-match')).not.toBeInTheDocument()
  })

  test('derives same-category native roll chance from visible group probabilities', async () => {
    const weaponJointProbability = 36 / 330
    const traitJointProbability = 8 / 120
    const nativeProbability = weaponJointProbability * traitJointProbability
    const crossbowPerkId = 'perk.legend_heightened_reflexes'
    const daggerPerkId = 'perk.legend_double_strike'
    const calmPerkId = 'perk.legend_clarity'
    const agilePerkId = 'perk.legend_in_the_zone'

    renderSelectedBackgroundFitDetail({
      mustHavePickedPerkCount: 4,
      mustHavePickedPerkIds: [crossbowPerkId, daggerPerkId, calmPerkId, agilePerkId],
      pickedPerkCount: 4,
      selectedBackgroundFitDetail: {
        ...backgroundFit,
        matches: [
          {
            categoryName: 'Weapon',
            isGuaranteed: false,
            pickedPerkCount: 1,
            pickedPerkIconPaths: ['ui/perks/heightened_reflexes.png'],
            pickedPerkIds: [crossbowPerkId],
            pickedPerkNames: ['Heightened Reflexes'],
            perkGroupIconPath: 'ui/perks/perk_01.png',
            perkGroupId: 'CrossbowTree',
            perkGroupName: 'Crossbow',
            probability: 4 / 11,
          },
          {
            categoryName: 'Weapon',
            isGuaranteed: false,
            pickedPerkCount: 1,
            pickedPerkIconPaths: ['ui/perks/double_strike.png'],
            pickedPerkIds: [daggerPerkId],
            pickedPerkNames: ['Double Strike'],
            perkGroupIconPath: 'ui/perks/perk_02.png',
            perkGroupId: 'DaggerTree',
            perkGroupName: 'Dagger',
            probability: 4 / 11,
          },
          {
            categoryName: 'Traits',
            isGuaranteed: false,
            pickedPerkCount: 1,
            pickedPerkIconPaths: ['ui/perks/clarity.png'],
            pickedPerkIds: [calmPerkId],
            pickedPerkNames: ['Clarity'],
            perkGroupIconPath: 'ui/perks/perk_03.png',
            perkGroupId: 'CalmTree',
            perkGroupName: 'Calm',
            probability: 3 / 10,
          },
          {
            categoryName: 'Traits',
            isGuaranteed: false,
            pickedPerkCount: 1,
            pickedPerkIconPaths: ['ui/perks/in_the_zone.png'],
            pickedPerkIds: [agilePerkId],
            pickedPerkNames: ['In the Zone'],
            perkGroupIconPath: 'ui/perks/perk_04.png',
            perkGroupId: 'AgileTree',
            perkGroupName: 'Agile',
            probability: 3 / 10,
          },
        ],
        mustHaveBuildReachabilityProbability: nativeProbability,
        mustHaveStudyResourceChanceBreakdown: [
          {
            calculation: createChanceCalculation({
              nativeCoveredPickedPerkIdsByOutcome: [
                [crossbowPerkId, daggerPerkId, calmPerkId, agilePerkId],
              ],
              probability: nativeProbability,
              successfulOutcomeCount: 1,
              terms: [{ outcomeCount: 1, probability: nativeProbability }],
              totalOutcomeCount: 450,
            }),
            key: 'native',
            probability: nativeProbability,
            shouldAllowBook: false,
            shouldAllowScroll: false,
            shouldAllowSecondScroll: false,
          },
        ],
        mustHaveStudyResourceStrategy: undefined,
      },
      supportedBuildTargetPerkGroups: [
        {
          categoryName: 'Weapon',
          pickedPerkCount: 1,
          pickedPerkIconPaths: ['ui/perks/heightened_reflexes.png'],
          pickedPerkIds: [crossbowPerkId],
          pickedPerkNames: ['Heightened Reflexes'],
          perkGroupIconPath: 'ui/perks/perk_01.png',
          perkGroupId: 'CrossbowTree',
          perkGroupName: 'Crossbow',
        },
        {
          categoryName: 'Weapon',
          pickedPerkCount: 1,
          pickedPerkIconPaths: ['ui/perks/double_strike.png'],
          pickedPerkIds: [daggerPerkId],
          pickedPerkNames: ['Double Strike'],
          perkGroupIconPath: 'ui/perks/perk_02.png',
          perkGroupId: 'DaggerTree',
          perkGroupName: 'Dagger',
        },
        {
          categoryName: 'Traits',
          pickedPerkCount: 1,
          pickedPerkIconPaths: ['ui/perks/clarity.png'],
          pickedPerkIds: [calmPerkId],
          pickedPerkNames: ['Clarity'],
          perkGroupIconPath: 'ui/perks/perk_03.png',
          perkGroupId: 'CalmTree',
          perkGroupName: 'Calm',
        },
        {
          categoryName: 'Traits',
          pickedPerkCount: 1,
          pickedPerkIconPaths: ['ui/perks/in_the_zone.png'],
          pickedPerkIds: [agilePerkId],
          pickedPerkNames: ['In the Zone'],
          perkGroupIconPath: 'ui/perks/perk_04.png',
          perkGroupId: 'AgileTree',
          perkGroupName: 'Agile',
        },
      ],
    })
    await expandChanceExplanation()

    const mustHaveScope = screen
      .getAllByTestId('detail-chance-explanation-scope')
      .find((scope) => scope.textContent?.includes('Must-have chance'))

    expect(mustHaveScope).toBeDefined()
    expect(mustHaveScope!).toHaveTextContent('Must-have chance')
    expect(mustHaveScope!).toHaveTextContent('0.73%')
    expect(mustHaveScope!).toHaveTextContent(
      'The remaining native roll needs Crossbow, Dagger, Calm, and Agile.',
    )
    expect(mustHaveScope!).toHaveTextContent(
      'Chance math: Weapon roll picks 4 of 11 weapon groups (36.4% each), so Crossbow and Dagger together are C(9, 2) / C(11, 4) = 10.9%. Traits roll picks 3 of 10 trait groups (30% each), so Calm and Agile together are C(8, 1) / C(10, 3) = 6.7%. Independent roll categories multiply: 10.9% x 6.7% = 0.73%.',
    )

    const nativeRollDetails = within(mustHaveScope!).getByTestId(
      'detail-chance-explanation-advanced',
    )

    expect(nativeRollDetails).toHaveTextContent('Native roll details')
    expect(nativeRollDetails).toHaveTextContent('Crossbow, Dagger, Calm, and Agile')
    expect(nativeRollDetails).toHaveTextContent('0.73%')
    expect(nativeRollDetails).not.toHaveTextContent('Actual engine expression')
    expect(nativeRollDetails).not.toHaveTextContent('The engine summed')
  })

  test('explains a resource-only route without inventing a native random requirement', async () => {
    renderSelectedBackgroundFitDetail({
      selectedBackgroundFitDetail: {
        ...backgroundFit,
        mustHaveStudyResourceChanceBreakdown: [
          {
            key: 'native',
            probability: 0.002,
            shouldAllowBook: false,
            shouldAllowScroll: false,
            shouldAllowSecondScroll: false,
          },
          {
            calculation: createChanceCalculation({
              isNativeOutcomeIndependent: true,
              probability: 1,
              successfulOutcomeCount: 1,
              terms: [{ outcomeCount: 1, probability: 1 }],
              totalOutcomeCount: 1,
            }),
            key: 'book',
            probability: 1,
            shouldAllowBook: true,
            shouldAllowScroll: false,
            shouldAllowSecondScroll: false,
          },
        ],
        mustHaveStudyResourceStrategy: createStudyResourceStrategy({
          bookTargets: [calmStrategyTarget],
          nativeProbability: 0.002,
          probability: 1,
          selectedCombinationKey: 'book',
        }),
      },
    })
    await expandChanceExplanation()

    const mustHaveScope = screen
      .getAllByTestId('detail-chance-explanation-scope')
      .find((scope) => scope.textContent?.includes('Must-have chance'))

    expect(mustHaveScope).toBeDefined()
    expect(mustHaveScope!).toHaveTextContent(
      'Best route improves this from 0.20% native-only to 100%.',
    )
    expect(mustHaveScope!).toHaveTextContent('Skill book covers Calm for Clarity.')
    expect(mustHaveScope!).toHaveTextContent(
      'After that route, no random native group is still required.',
    )
    expect(mustHaveScope!).toHaveTextContent(
      'Chance math: no random native group is required, so the chance is 100%.',
    )
    expect(mustHaveScope!).toHaveTextContent('Native roll details')
    expect(mustHaveScope!).toHaveTextContent(
      'No random native group remains after the selected route, so this scope is 100%.',
    )
    expect(mustHaveScope!).not.toHaveTextContent('Actual engine expression')
    expect(mustHaveScope!).not.toHaveTextContent('No native probability terms are needed')
    expect(mustHaveScope!).not.toHaveTextContent('99.8%')
    expect(mustHaveScope!).not.toHaveTextContent('The engine summed')
    expect(
      within(mustHaveScope!).queryByTestId('detail-chance-explanation-native-match'),
    ).not.toBeInTheDocument()
    expect(
      within(mustHaveScope!).queryByTestId('detail-chance-native-roll-path'),
    ).not.toBeInTheDocument()
  })

  test('explains a native-only route when books and scrolls are disabled', async () => {
    renderSelectedBackgroundFitDetail({
      selectedBackgroundFitDetail: {
        ...backgroundFit,
        matches: [
          {
            categoryName: 'Traits',
            isGuaranteed: false,
            pickedPerkCount: 1,
            pickedPerkIconPaths: ['ui/perks/clarity.png'],
            pickedPerkIds: ['perk.legend_clarity'],
            pickedPerkNames: ['Clarity'],
            perkGroupIconPath: 'ui/perks/perk_01.png',
            perkGroupId: 'CalmTree',
            perkGroupName: 'Calm',
            probability: 0.002,
          },
        ],
        mustHaveBuildReachabilityProbability: 0.002,
        mustHaveStudyResourceChanceBreakdown: [
          {
            calculation: createChanceCalculation({
              nativeCoveredPickedPerkIdsByOutcome: [['perk.legend_clarity']],
              probability: 0.002,
              successfulOutcomeCount: 1,
              terms: [{ outcomeCount: 1, probability: 0.002 }],
              totalOutcomeCount: 500,
            }),
            key: 'native',
            probability: 0.002,
            shouldAllowBook: false,
            shouldAllowScroll: false,
            shouldAllowSecondScroll: false,
          },
        ],
        mustHaveStudyResourceStrategy: undefined,
      },
      studyResourceFilter: {
        shouldAllowBook: false,
        shouldAllowScroll: false,
        shouldAllowSecondScroll: false,
      },
    })
    await expandChanceExplanation()

    const mustHaveScope = screen
      .getAllByTestId('detail-chance-explanation-scope')
      .find((scope) => scope.textContent?.includes('Must-have chance'))

    expect(mustHaveScope).toBeDefined()
    expect(mustHaveScope!).toHaveTextContent(
      'Books and scrolls are disabled, so the chance is native-only.',
    )
    expect(mustHaveScope!).toHaveTextContent('The remaining native roll needs Calm.')
    expect(mustHaveScope!).toHaveTextContent(
      'Chance math: Calm appears in 0.20% of native rolls, so this route is 0.20%.',
    )
    expect(
      within(mustHaveScope!).queryByTestId('detail-chance-route-comparison'),
    ).not.toBeInTheDocument()
  })

  test('explains unreachable scopes instead of presenting empty possible rows as success', async () => {
    renderSelectedBackgroundFitDetail({
      selectedBackgroundFitDetail: {
        ...backgroundFit,
        fullBuildReachabilityProbability: 0,
        fullBuildStudyResourceStrategy: undefined,
        matches: [],
        mustHaveBuildReachabilityProbability: 0,
        mustHaveStudyResourceStrategy: undefined,
      },
    })
    await expandChanceExplanation()

    const mustHaveScope = screen
      .getAllByTestId('detail-chance-explanation-scope')
      .find((scope) => scope.textContent?.includes('Must-have chance'))

    expect(mustHaveScope).toBeDefined()
    expect(mustHaveScope!).toHaveTextContent('Must-have chance')
    expect(mustHaveScope!).toHaveTextContent('0%')
    expect(mustHaveScope!).toHaveTextContent(
      'No allowed book or scroll route improves this, so the chance is native-only.',
    )
    expect(mustHaveScope!).toHaveTextContent(
      'No legal native roll can cover every picked perk here.',
    )
  })

  test('calls out the Bright gate when a two-scroll route is part of the explanation', async () => {
    const twoScrollBackgroundFit = {
      ...backgroundFit,
      mustHaveBuildReachabilityProbability: 0.25,
      mustHaveStudyResourceStrategy: createStudyResourceStrategy({
        nativeProbability: 0,
        probability: 0.25,
        scrollTargets: [assassinStrategyTarget, berserkerStrategyTarget],
        selectedCombinationKey: 'scroll',
        shouldAllowSecondScroll: true,
      }),
    } satisfies RankedBackgroundFit

    renderSelectedBackgroundFitDetail({
      mustHavePickedPerkCount: 4,
      mustHavePickedPerkIds: [
        'perk.legend_assassinate',
        'perk.legend_muscularity',
        'perk.legend_brawny',
        'perk.legend_colossus',
      ],
      pickedPerkCount: 4,
      selectedBackgroundFitDetail: twoScrollBackgroundFit,
    })
    await expandChanceExplanation()

    const mustHaveScope = screen
      .getAllByTestId('detail-chance-explanation-scope')
      .find((scope) => scope.textContent?.includes('Must-have chance'))

    expect(mustHaveScope).toBeDefined()
    expect(mustHaveScope!).toHaveTextContent('Best route improves this from 0% native-only to 25%.')
    expect(mustHaveScope!).toHaveTextContent(
      'A second ancient scroll only counts when Bright is available on that native roll.',
    )
    expect(mustHaveScope!).toHaveTextContent(
      'Ancient scrolls cover Assassin for Assassinate and Berserker for Muscularity, Brawny, and Colossus.',
    )
    expect(
      within(mustHaveScope!).getAllByTestId('detail-chance-explanation-resource-line'),
    ).toHaveLength(1)
  })
})
