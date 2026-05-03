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
  sourceFilePath: 'scripts/skills/backgrounds/apprentice_background.nut',
  veteranPerkLevelInterval: 4,
} satisfies RankedBackgroundFit

function renderSelectedBackgroundFitDetail({
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
  selectedBackgroundFitDetail?: RankedBackgroundFit
  supportedBuildTargetPerkGroups?: BuildTargetPerkGroup[]
} = {}) {
  render(
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
      mustHavePickedPerkCount={1}
      mustHavePickedPerkIds={['perk.legend_clarity']}
      onAddPerkToBuild={vi.fn()}
      onCloseBuildPerkHover={vi.fn()}
      onCloseBuildPerkTooltip={vi.fn()}
      onClosePerkGroupHover={vi.fn()}
      onInspectPerk={vi.fn()}
      onInspectPerkGroup={vi.fn()}
      onNavigateDetailHistory={vi.fn()}
      onOpenBuildPerkHover={vi.fn()}
      onOpenBuildPerkTooltip={vi.fn()}
      onOpenPerkGroupHover={vi.fn()}
      onRemovePerkFromBuild={vi.fn()}
      optionalPickedPerkCount={0}
      optionalPickedPerkIds={[]}
      pickedPerkCount={1}
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
}

describe('background details study resources', () => {
  test('renders imported background metadata in a default-open collapsible section', async () => {
    const user = userEvent.setup()

    renderSelectedBackgroundFitDetail()

    const metadataSection = screen.getByTestId('detail-background-metadata-section')
    const backgroundFitHeading = screen.getByRole('heading', { name: 'Background fit' })

    expect(metadataSection).toHaveAttribute('open')
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

    await user.click(within(metadataSection).getByText('Background details'))

    expect(metadataSection).not.toHaveAttribute('open')
    expect(within(metadataSection).getByText('Background details')).toBeVisible()
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
