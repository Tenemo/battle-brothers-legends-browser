import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { DetailPanel } from '../src/components/DetailPanel'
import { ancientScrollPerkGroupMarkerTestId } from '../src/lib/ancient-scroll-perk-group-display'
import type { BuildTargetPerkGroup, RankedBackgroundFit } from '../src/lib/background-fit'
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
  excludedTraitNames: ['Fear of Undead'],
  expectedCoveredMustHavePerkCount: 1,
  expectedCoveredOptionalPerkCount: 0,
  expectedCoveredPickedPerkCount: 1,
  expectedMatchedPerkGroupCount: 0,
  fullBuildReachabilityProbability: 1,
  fullBuildStudyResourceRequirement: skillBookRequirementProfile,
  guaranteedCoveredMustHavePerkCount: 0,
  guaranteedCoveredOptionalPerkCount: 0,
  guaranteedMatchedPerkGroupCount: 0,
  guaranteedTraitNames: ['Quick'],
  iconPath: null,
  matches: [],
  maximumNativeCoveredPickedPerkCount: 0,
  maximumTotalPerkGroupCount: 1,
  mustHaveBuildReachabilityProbability: 1,
  mustHaveStudyResourceRequirement: skillBookRequirementProfile,
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
  test('renders imported background metadata as a regular detail section', () => {
    renderSelectedBackgroundFitDetail()

    const metadataSection = screen.getByTestId('detail-background-metadata-section')
    const backgroundFitHeading = screen.getByRole('heading', { name: 'Background fit' })

    expect(metadataSection.tagName).toBe('DIV')
    expect(within(metadataSection).getByRole('heading', { name: 'Background details' })).toBeVisible()
    expect(
      metadataSection.compareDocumentPosition(backgroundFitHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0)
    expect(within(metadataSection).getByText('Daily cost')).toBeVisible()
    expect(within(metadataSection).getByText('6')).toBeVisible()
    expect(within(metadataSection).getByText('Crusader')).toBeVisible()
    expect(within(metadataSection).getByText('Educated')).toBeVisible()
    expect(within(metadataSection).getByText('Fear of Undead')).toBeVisible()
    expect(within(metadataSection).getByText('Quick')).toBeVisible()
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

  test('shows none for empty background trait and talent metadata', () => {
    renderSelectedBackgroundFitDetail({
      selectedBackgroundFitDetail: {
        ...backgroundFit,
        backgroundTypeNames: [],
        campResourceModifiers: [],
        dailyCost: null,
        excludedTalentAttributeNames: [],
        excludedTraitNames: [],
        guaranteedTraitNames: [],
      },
    })

    const metadataSection = screen.getByTestId('detail-background-metadata-section')

    expect(within(metadataSection).getAllByText('None')).toHaveLength(5)
    expect(
      within(metadataSection).queryByTestId('detail-camp-resource-modifier-groups'),
    ).not.toBeInTheDocument()
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
            probability: 1,
          },
          {
            categoryName: 'Traits',
            isGuaranteed: false,
            perkGroupIconPath: 'ui/perks/bold.png',
            perkGroupId: 'BoldTree',
            perkGroupName: 'Bold',
            probability: 0.5,
          },
        ],
      },
    })

    const toggle = screen.getByRole('button', { name: 'Expand other native perk groups' })

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByTestId('detail-other-perk-groups-count')).toHaveTextContent('2')
    expect(screen.queryByTestId('detail-other-perk-groups-section')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Select perk group Heavy armor' }),
    ).not.toBeInTheDocument()

    await user.click(toggle)

    const section = screen.getByTestId('detail-other-perk-groups-section')
    const heavyArmorButton = within(section).getByRole('button', {
      name: 'Select perk group Heavy armor',
    })
    const probabilityBadges = within(section)
      .getAllByTestId('detail-other-perk-group-probability')
      .map((probabilityBadge) => probabilityBadge.textContent)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(within(section).getAllByText('Guaranteed')[0]).toBeVisible()
    expect(within(section).getByText('Possible')).toBeVisible()
    expect(within(section).getByText('Defense')).toBeVisible()
    expect(within(section).getByText('Traits')).toBeVisible()
    expect(probabilityBadges).toEqual(['Guaranteed', '50%'])
    expect(
      within(section).queryByRole('button', { name: 'Select perk group Calm' }),
    ).not.toBeInTheDocument()

    await user.click(heavyArmorButton)

    expect(onInspectPerkGroup).toHaveBeenCalledWith('Defense', 'HeavyDefenseTree')
  })

  test('uses planner perk group tiles for book and scroll learning requirements', () => {
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

    const [mustHaveStudyResourceSection] = screen.getAllByTestId('detail-study-resource-section')
    const studyResourceTile = within(mustHaveStudyResourceSection).getByTestId('planner-group-card')

    expect(
      within(mustHaveStudyResourceSection).getByRole('img', { name: 'Skill book' }),
    ).toBeVisible()
    expect(
      within(studyResourceTile).getByRole('button', { name: 'Select perk group Calm' }),
    ).toBeVisible()
    expect(within(studyResourceTile).getByRole('button', { name: 'Clarity' })).toBeVisible()
    expect(screen.queryByText('Skill book: Calm')).not.toBeInTheDocument()
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

    expect(within(chanceBreakdown).getByText('Must-have chance breakdown')).toBeVisible()
    expect(within(chanceBreakdown).getByText('Native roll')).toBeVisible()
    expect(within(chanceBreakdown).getByText('10%')).toBeVisible()
    expect(within(chanceBreakdown).getByText('Skill book')).toBeVisible()
    expect(within(chanceBreakdown).getByText('20%')).toBeVisible()
    expect(within(chanceBreakdown).getByText('Ancient scroll')).toBeVisible()
    expect(within(chanceBreakdown).getByText('40%')).toBeVisible()
    expect(within(chanceBreakdown).getByText('Skill book and ancient scroll')).toBeVisible()
    expect(within(chanceBreakdown).getByText('60%')).toBeVisible()
  })

  test('does not present alternate full-build study resources as optional-only routes', () => {
    const alternateFullBuildResourceBackgroundFit = {
      ...backgroundFit,
      fullBuildStudyResourceRequirement: ancientScrollRequirementProfile,
      mustHaveStudyResourceRequirement: skillBookRequirementProfile,
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
          pickedPerkIds: ['perk.legend_clarity'],
          pickedPerkNames: ['Clarity'],
          perkGroupIconPath: 'ui/perks/perk_01.png',
          perkGroupId: 'CalmTree',
          perkGroupName: 'Calm',
        },
        {
          categoryName: 'Magic',
          pickedPerkCount: 1,
          pickedPerkIds: ['perk.legend_assassinate'],
          pickedPerkNames: ['Assassinate'],
          perkGroupIconPath: 'ui/perks/perk_37.png',
          perkGroupId: 'AssassinMagicTree',
          perkGroupName: 'Assassin',
        },
      ],
    })

    const [, optionalStudyResourceSection] = screen.getAllByTestId('detail-study-resource-section')

    expect(
      within(optionalStudyResourceSection).getByText('Additional optional-only study route'),
    ).toBeVisible()
    expect(
      within(optionalStudyResourceSection).getByText(
        'No separate optional-only book or scroll route.',
      ),
    ).toBeVisible()
    expect(
      within(optionalStudyResourceSection).queryByText('Ancient scroll'),
    ).not.toBeInTheDocument()
    expect(
      within(optionalStudyResourceSection).queryByTestId('detail-study-resource-tile-frame'),
    ).not.toBeInTheDocument()
  })

  test('uses only the built-in perk group tile marker for scroll learning requirements', () => {
    const scrollBackgroundFit = {
      ...backgroundFit,
      fullBuildStudyResourceRequirement: ancientScrollRequirementProfile,
      mustHaveStudyResourceRequirement: ancientScrollRequirementProfile,
    } satisfies RankedBackgroundFit

    renderSelectedBackgroundFitDetail({
      selectedBackgroundFitDetail: scrollBackgroundFit,
      supportedBuildTargetPerkGroups: [
        {
          categoryName: 'Magic',
          pickedPerkCount: 1,
          pickedPerkIds: ['perk.legend_assassinate'],
          pickedPerkNames: ['Assassinate'],
          perkGroupIconPath: 'ui/perks/perk_37.png',
          perkGroupId: 'AssassinMagicTree',
          perkGroupName: 'Assassin',
        },
      ],
    })

    const [mustHaveStudyResourceSection] = screen.getAllByTestId('detail-study-resource-section')
    const studyResourceTileFrame = within(mustHaveStudyResourceSection).getByTestId(
      'detail-study-resource-tile-frame',
    )
    const studyResourceTile = within(studyResourceTileFrame).getByTestId('planner-group-card')

    expect(studyResourceTileFrame).toHaveAttribute('data-study-resource-type', 'scroll')
    expect(studyResourceTileFrame).toHaveAttribute('data-has-resource-icon', 'false')
    expect(
      within(mustHaveStudyResourceSection).queryByRole('img', { name: 'Ancient scroll' }),
    ).not.toBeInTheDocument()
    expect(within(studyResourceTile).getByTestId(ancientScrollPerkGroupMarkerTestId)).toBeVisible()
    expect(
      within(studyResourceTile).getByRole('button', {
        name: 'Learnable using an ancient scroll',
      }),
    ).toBeVisible()
  })
})
