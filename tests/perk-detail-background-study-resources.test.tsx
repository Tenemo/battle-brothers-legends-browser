import { render, screen, within } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { DetailsPanel } from '../src/components/PerkDetail'
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
  buildReachabilityProbability: 1,
  disambiguator: null,
  expectedCoveredMustHavePerkCount: 1,
  expectedCoveredOptionalPerkCount: 0,
  expectedCoveredPickedPerkCount: 1,
  expectedMatchedPerkGroupCount: 0,
  fullBuildReachabilityProbability: 1,
  fullBuildStudyResourceRequirement: skillBookRequirementProfile,
  guaranteedCoveredMustHavePerkCount: 0,
  guaranteedCoveredOptionalPerkCount: 0,
  guaranteedMatchedPerkGroupCount: 0,
  iconPath: null,
  matches: [],
  maximumNativeCoveredPickedPerkCount: 0,
  maximumTotalPerkGroupCount: 1,
  mustHaveBuildReachabilityProbability: 1,
  mustHaveStudyResourceRequirement: skillBookRequirementProfile,
  sourceFilePath: 'scripts/skills/backgrounds/apprentice_background.nut',
  veteranPerkLevelInterval: 4,
} satisfies RankedBackgroundFit

function renderBackgroundFitDetail({
  backgroundFitDetail = backgroundFit,
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
  backgroundFitDetail?: RankedBackgroundFit
  supportedBuildTargetPerkGroups?: BuildTargetPerkGroup[]
} = {}) {
  render(
    <DetailsPanel
      activeDetailType="background"
      backgroundFitDetail={{ backgroundFit: backgroundFitDetail, rank: 0 }}
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
      isSelectedPerkPicked={false}
      mustHavePickedPerkCount={1}
      mustHavePickedPerkIds={['perk.legend_clarity']}
      onCloseBuildPerkHover={vi.fn()}
      onCloseBuildPerkTooltip={vi.fn()}
      onClosePerkGroupHover={vi.fn()}
      onInspectPerk={vi.fn()}
      onInspectPerkGroup={vi.fn()}
      onNavigateDetailHistory={vi.fn()}
      onOpenBuildPerkHover={vi.fn()}
      onOpenBuildPerkTooltip={vi.fn()}
      onOpenPerkGroupHover={vi.fn()}
      onTogglePerkPicked={vi.fn()}
      optionalPickedPerkCount={0}
      optionalPickedPerkIds={[]}
      pickedPerkCount={1}
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
  test('uses planner perk group tiles for book and scroll learning requirements', () => {
    renderBackgroundFitDetail()

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

    renderBackgroundFitDetail({
      backgroundFitDetail: scrollBackgroundFit,
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
