import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { DetailPanel } from '../src/components/DetailPanel'
import type {
  BackgroundFitStudyResourceStrategy,
  BackgroundFitStudyResourceStrategyTarget,
  BuildTargetPerkGroup,
  RankedBackgroundFit,
} from '../src/lib/background-fit'
import { backgroundStudyResourceBadgesTestId } from '../src/lib/background-study-resource-display'
import type { StudyResourceRequirementProfile } from '../src/lib/background-study-reachability'

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

function renderSelectedBackgroundFitDetail({
  mustHavePickedPerkCount = 1,
  mustHavePickedPerkIds = ['perk.legend_clarity'],
  onInspectPerkGroup = vi.fn(),
  optionalPickedPerkCount = 0,
  optionalPickedPerkIds = [],
  pickedPerkCount = mustHavePickedPerkCount + optionalPickedPerkCount,
  selectedBackgroundFitDetail = backgroundFit,
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
  onInspectPerkGroup?: (categoryName: string, perkGroupId: string) => void
  optionalPickedPerkCount?: number
  optionalPickedPerkIds?: string[]
  pickedPerkCount?: number
  selectedBackgroundFitDetail?: RankedBackgroundFit
  supportedBuildTargetPerkGroups?: BuildTargetPerkGroup[]
} = {}) {
  const renderResult = render(
    <DetailPanel
      selectedDetailType="background"
      selectedBackgroundFitDetail={{ backgroundFit: selectedBackgroundFitDetail, rank: 0 }}
      detailHistoryNavigationAvailability={{
        next: false,
        previous: false,
      }}
      emphasizedCategoryNames={new Set()}
      emphasizedPerkGroupKeys={new Set()}
      selectedEmphasisCategoryNames={new Set()}
      selectedEmphasisPerkGroupKeys={new Set()}
      groupedBackgroundSources={[]}
      hoveredBuildPerkId={null}
      hoveredBuildPerkTooltipId={undefined}
      hoveredPerkId={null}
      mustHavePickedPerkCount={mustHavePickedPerkCount}
      mustHavePickedPerkIds={mustHavePickedPerkIds}
      onAddPerkToBuild={vi.fn()}
      onCloseBuildPerkHover={vi.fn()}
      onCloseBuildPerkTooltip={vi.fn()}
      onClosePerkGroupHover={vi.fn()}
      onInspectPerk={vi.fn()}
      onInspectPerkGroup={onInspectPerkGroup}
      onNavigateDetailHistory={vi.fn()}
      onOpenBuildPerkHover={vi.fn()}
      onOpenBuildPerkTooltip={vi.fn()}
      onOpenPerkGroupHover={vi.fn()}
      onRemovePerkFromBuild={vi.fn()}
      optionalPickedPerkCount={optionalPickedPerkCount}
      optionalPickedPerkIds={optionalPickedPerkIds}
      pickedPerkCount={pickedPerkCount}
      selectedPerkRequirement={null}
      selectedPerk={null}
      studyResourceFilter={{
        shouldAllowBook: true,
        shouldAllowScroll: true,
        shouldAllowSecondScroll: false,
      }}
      supportedBuildTargetPerkGroups={supportedBuildTargetPerkGroups}
    />,
  )

  return {
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
    expect(within(metadataSection).getByRole('heading', { name: 'Daily cost' })).toBeVisible()
    expect(within(metadataSection).getByText('6')).toBeVisible()
    expect(within(metadataSection).getByText('Crusader')).toBeVisible()
    expect(within(metadataSection).getByText('Educated')).toBeVisible()
    const fearOfUndeadTraitPill = within(metadataSection).getByRole('button', {
      name: 'Fear of Undead',
    })
    const quickTraitPill = within(metadataSection).getByRole('button', { name: 'Quick' })

    expect(fearOfUndeadTraitPill).toBeVisible()
    expect(quickTraitPill).toBeVisible()
    expect(
      within(fearOfUndeadTraitPill).getByTestId('detail-background-trait-icon'),
    ).toHaveAttribute('src', '/game-icons/ui/traits/trait_icon_50.png')
    expect(within(quickTraitPill).getByTestId('detail-background-trait-icon')).toHaveAttribute(
      'src',
      '/game-icons/ui/traits/trait_icon_32.png',
    )
    expect(within(metadataSection).getByText('Ranged skill')).toBeVisible()
    expect(within(metadataSection).getByText('Company capacity')).toBeVisible()
    expect(within(metadataSection).getByText('Tools and supplies capacity')).toBeVisible()
    expect(within(metadataSection).getByText('+13')).toBeVisible()
    expect(within(metadataSection).getByText('Camp skills')).toBeVisible()
    expect(within(metadataSection).getByText('Repairing')).toBeVisible()
    expect(within(metadataSection).getByText('+30%')).toBeVisible()
    expect(within(metadataSection).getByText('Terrain movement')).toBeVisible()
    expect(within(metadataSection).getByText('Plains')).toBeVisible()
    expect(within(metadataSection).getByText('+15%')).toBeVisible()
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
    expect(traitTooltip).toHaveTextContent(
      'This background excludes this trait, so recruits with this background cannot roll it.',
    )
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
      name: 'Expand rare native perk groups',
    })

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(
      within(section).getByText(
        'Native perk groups this background can get outside the current build. Skill books and ancient scrolls are not included.',
      ),
    ).toBeVisible()
    expect(within(section).getByRole('heading', { level: 4, name: 'Guaranteed' })).toBeVisible()
    expect(within(section).getByRole('heading', { level: 4, name: 'Possible' })).toBeVisible()
    expect(within(section).getByText('Heavy armor stance')).toBeVisible()
    expect(within(section).getByText('Bold spirit')).toBeVisible()
    expect(within(section).queryByText('Defense')).not.toBeInTheDocument()
    expect(within(section).queryByText('Traits')).not.toBeInTheDocument()
    expect(probabilityBadges).toEqual(['Guaranteed', '50%'])
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
        name: 'Study resource plan',
      }),
    ).toBeVisible()
    expect(
      within(studyResourcePlan).getByRole('heading', { level: 5, name: 'Must-have impact' }),
    ).toBeVisible()
    expect(within(studyResourcePlan).getByText('Skill book:')).toBeVisible()
    expect(within(studyResourcePlan).getByText('Calm')).toBeVisible()
    expect(within(studyResourcePlan).getByText('Covers Clarity')).toBeVisible()
    expect(screen.queryByText('Must-have study route')).not.toBeInTheDocument()
    expect(screen.queryByTestId('detail-study-resource-tile-frame')).not.toBeInTheDocument()
  })

  test('shows a must-have chance breakdown for study resources', () => {
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
      },
    })

    const chanceBreakdown = screen.getByTestId('detail-chance-breakdown')

    expect(
      within(chanceBreakdown).getByRole('heading', {
        level: 4,
        name: 'Must-have chance breakdown',
      }),
    ).toBeVisible()
    expect(within(chanceBreakdown).getByText('Native roll')).toBeVisible()
    expect(within(chanceBreakdown).getByText('10%')).toBeVisible()
    expect(within(chanceBreakdown).getByText('Skill book')).toBeVisible()
    expect(within(chanceBreakdown).getByText('20%')).toBeVisible()
    expect(within(chanceBreakdown).getByText('Ancient scroll')).toBeVisible()
    expect(within(chanceBreakdown).getByText('40%')).toBeVisible()
    expect(within(chanceBreakdown).getByText('Skill book and ancient scroll')).toBeVisible()
    expect(within(chanceBreakdown).getByText('60%')).toBeVisible()
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
      within(studyResourcePlan).getByRole('heading', { level: 5, name: 'Must-have impact' }),
    ).toBeVisible()
    expect(
      within(studyResourcePlan).getByRole('heading', { level: 5, name: 'Full-build impact' }),
    ).toBeVisible()
    expect(within(studyResourcePlan).getByText('Skill book:')).toBeVisible()
    expect(within(studyResourcePlan).getByText('Calm')).toBeVisible()
    expect(within(studyResourcePlan).getByText('Ancient scroll:')).toBeVisible()
    expect(within(studyResourcePlan).getByText('Assassin')).toBeVisible()
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

    expect(within(studyResourcePlan).getByText('Ancient scroll:')).toBeVisible()
    expect(within(studyResourcePlan).getByText('Berserker')).toBeVisible()
    expect(within(studyResourcePlan).getByText('Skill book:')).toBeVisible()
    expect(within(studyResourcePlan).getByText('Medium Armor or Fit')).toBeVisible()
    expect(within(studyResourcePlan).queryByText('Heavy Armor')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Select perk group Heavy Armor' })).toBeVisible()
  })
})
