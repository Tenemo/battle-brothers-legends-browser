import { existsSync } from 'node:fs'
import path from 'node:path'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { BackgroundFitCard, BackgroundFitMetricTable } from '../src/components/BackgroundFitCard'
import {
  backgroundStudyResourceBadgesTestId,
  backgroundStudyResourceBadgeTestId,
  brightTraitIconPath,
  skillBookIconPath,
} from '../src/lib/background-study-resource-display'
import { ancientScrollIconPath } from '../src/lib/ancient-scroll-perk-group-display'
import type {
  BackgroundFitStudyResourceStrategy,
  BackgroundFitStudyResourceStrategyTarget,
  RankedBackgroundFit,
} from '../src/lib/background-fit'
import type {
  BackgroundStudyResourceFilter,
  StudyResourceRequirementProfile,
} from '../src/lib/background-study-reachability'
import { PlannerInteractionTestProvider } from './PlannerInteractionTestProvider'

const nativeStudyResourceRequirement = {
  bookRequirement: null,
  requiredScrollCount: 0,
  requiresBook: false,
  requiresBright: false,
  scrollRequirements: [],
} satisfies StudyResourceRequirementProfile

const calmStrategyTarget = {
  categoryName: 'Traits',
  coveredPickedPerkIds: ['perk.legend_clarity'],
  coveredPickedPerkNames: ['Clarity'],
  fixedTargetProbability: 0.6,
  marginalProbabilityGain: 0.5,
  perkGroupIconPath: 'ui/perks/perk_01.png',
  perkGroupId: 'CalmTree',
  perkGroupName: 'Calm',
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
  coveredPickedPerkIds: ['perk.legend_muscularity', 'perk.legend_brawny'],
  coveredPickedPerkNames: ['Muscularity', 'Brawny'],
  fixedTargetProbability: 0.6,
  marginalProbabilityGain: 0.5,
  perkGroupIconPath: 'ui/perks/perk_37.png',
  perkGroupId: 'BerserkerMagicTree',
  perkGroupName: 'Berserker',
} satisfies BackgroundFitStudyResourceStrategyTarget

const evocationStrategyTarget = {
  categoryName: 'Magic',
  coveredPickedPerkIds: ['perk.legend_chain_lightning'],
  coveredPickedPerkNames: ['Chain Lightning'],
  fixedTargetProbability: 0.6,
  marginalProbabilityGain: 0.5,
  perkGroupIconPath: 'ui/perks/perk_39.png',
  perkGroupId: 'EvocationMagicTree',
  perkGroupName: 'Evocation',
} satisfies BackgroundFitStudyResourceStrategyTarget

function createStudyResourceStrategy(
  overrides: Partial<BackgroundFitStudyResourceStrategy> = {},
): BackgroundFitStudyResourceStrategy {
  return {
    bookTargets: [],
    nativeProbability: 0,
    probability: 0.6,
    scrollTargets: [],
    selectedCombinationKey: 'book-and-scroll',
    shouldAllowSecondScroll: false,
    ...overrides,
  }
}

function createBackgroundFit(overrides: Partial<RankedBackgroundFit> = {}): RankedBackgroundFit {
  return {
    backgroundId: 'background.study_resource_badges',
    backgroundName: 'Study resource badges',
    backgroundTypeNames: [],
    buildReachabilityProbability: 1,
    campResourceModifiers: [],
    dailyCost: null,
    disambiguator: null,
    excludedTalentAttributeNames: [],
    excludedTraits: [],
    excludedTraitNames: [],
    expectedCoveredMustHavePerkCount: 1,
    expectedCoveredOptionalPerkCount: 1,
    expectedCoveredPickedPerkCount: 2,
    expectedMatchedPerkGroupCount: 0,
    fullBuildReachabilityProbability: 1,
    fullBuildStudyResourceRequirement: nativeStudyResourceRequirement,
    guaranteedCoveredMustHavePerkCount: 1,
    guaranteedCoveredOptionalPerkCount: 0,
    guaranteedMatchedPerkGroupCount: 0,
    guaranteedTraits: [],
    guaranteedTraitNames: [],
    iconPath: null,
    matches: [],
    maximumNativeCoveredPickedPerkCount: 1,
    maximumTotalPerkGroupCount: 0,
    mustHaveBuildReachabilityProbability: 1,
    mustHaveStudyResourceRequirement: nativeStudyResourceRequirement,
    otherPerkGroups: [],
    sourceFilePath: 'backgrounds/study_resource_badges_background.nut',
    veteranPerkLevelInterval: 4,
    ...overrides,
  }
}

function renderBackgroundFitCard(backgroundFit: RankedBackgroundFit, rank = 0) {
  return render(
    <PlannerInteractionTestProvider>
      <BackgroundFitCard
        backgroundFit={backgroundFit}
        isSelected={false}
        mustHavePickedPerkCount={1}
        onSelect={vi.fn()}
        optionalPickedPerkCount={1}
        pickedPerkCount={2}
        query=""
        rank={rank}
        studyResourceFilter={{
          shouldAllowBook: true,
          shouldAllowScroll: true,
          shouldAllowSecondScroll: false,
        }}
      />
    </PlannerInteractionTestProvider>,
  )
}

function renderBackgroundFitCardWithStudyResourceFilter(
  studyResourceFilter: BackgroundStudyResourceFilter,
) {
  return render(
    <PlannerInteractionTestProvider>
      <BackgroundFitCard
        backgroundFit={createBackgroundFit()}
        isSelected={false}
        mustHavePickedPerkCount={1}
        onSelect={vi.fn()}
        optionalPickedPerkCount={0}
        pickedPerkCount={1}
        query=""
        rank={0}
        studyResourceFilter={studyResourceFilter}
      />
    </PlannerInteractionTestProvider>,
  )
}

describe('background fit card study resource badges', () => {
  test('does not render imported detail-only metadata on the card', () => {
    renderBackgroundFitCard(
      createBackgroundFit({
        backgroundTypeNames: ['Crusader'],
        campResourceModifiers: [
          {
            group: 'skill',
            label: 'Repairing',
            modifierKey: 'Repair',
            value: 0.3,
            valueKind: 'percent',
          },
        ],
        dailyCost: 6,
        excludedTalentAttributeNames: ['Ranged skill'],
        excludedTraits: [
          {
            description: 'Afraid of walking dead.',
            iconPath: 'ui/traits/trait_icon_50.png',
            traitName: 'Fear of Undead',
          },
        ],
        excludedTraitNames: ['Fear of Undead'],
        guaranteedTraits: [
          {
            description: 'Moves with unusual speed.',
            iconPath: 'ui/traits/trait_icon_32.png',
            traitName: 'Quick',
          },
        ],
        guaranteedTraitNames: ['Quick'],
      }),
    )

    expect(screen.queryByText('Daily cost')).not.toBeInTheDocument()
    expect(screen.queryByText('Crusader')).not.toBeInTheDocument()
    expect(screen.queryByText('Repairing')).not.toBeInTheDocument()
    expect(screen.queryByText('Fear of Undead')).not.toBeInTheDocument()
    expect(screen.queryByText('Quick')).not.toBeInTheDocument()
    expect(screen.queryByText('Ranged skill')).not.toBeInTheDocument()
  })

  test('renders strategy resource icons with target-specific titles', () => {
    renderBackgroundFitCard(
      createBackgroundFit({
        fullBuildStudyResourceStrategy: createStudyResourceStrategy({
          bookTargets: [calmStrategyTarget],
          scrollTargets: [berserkerStrategyTarget, evocationStrategyTarget],
          selectedCombinationKey: 'scroll',
          shouldAllowSecondScroll: true,
        }),
      }),
    )

    const badgeContainer = screen.getByTestId(backgroundStudyResourceBadgesTestId)
    const badges = screen.getAllByTestId(backgroundStudyResourceBadgeTestId)

    expect(badgeContainer).toHaveAccessibleName('Study resources improve full build chance')
    expect(badges).toHaveLength(4)
    expect(badges.map((badge) => badge.getAttribute('data-study-resource-kind'))).toEqual([
      'book',
      'scroll',
      'scroll',
      'bright',
    ])
    expect(badges[0]).toHaveAttribute('src', `/game-icons/${skillBookIconPath}`)
    expect(badges[0]).toHaveAttribute('title', 'Skill book improves full build chance: Calm')
    expect(badges[0]).toHaveAttribute('data-optional-only', 'false')
    expect(badges[1]).toHaveAttribute('src', `/game-icons/${ancientScrollIconPath}`)
    expect(badges[1]).toHaveAttribute(
      'title',
      'Ancient scroll improves full build chance: Berserker or Evocation',
    )
    expect(badges[1]).toHaveAttribute('data-optional-only', 'false')
    expect(badges[2]).toHaveAttribute('src', `/game-icons/${ancientScrollIconPath}`)
    expect(badges[2]).toHaveAttribute(
      'title',
      'Ancient scroll improves full build chance: Berserker or Evocation',
    )
    expect(badges[2]).toHaveAttribute('data-optional-only', 'false')
    expect(badges[3]).toHaveAttribute('src', `/game-icons/${brightTraitIconPath}`)
    expect(badges[3]).toHaveAttribute(
      'title',
      'Bright enables the second ancient scroll for full build chance: Berserker or Evocation',
    )
    expect(brightTraitIconPath).toBe('ui/traits/trait_icon_11.png')
    expect(badges[3]).toHaveAttribute('data-optional-only', 'false')
    expect(existsSync(path.join(process.cwd(), 'public', 'game-icons', skillBookIconPath))).toBe(
      true,
    )
    expect(
      existsSync(path.join(process.cwd(), 'public', 'game-icons', ancientScrollIconPath)),
    ).toBe(true)
    expect(existsSync(path.join(process.cwd(), 'public', 'game-icons', brightTraitIconPath))).toBe(
      true,
    )
  })

  test('does not duplicate the scroll badge when only one scroll target improves the strategy', () => {
    renderBackgroundFitCard(
      createBackgroundFit({
        fullBuildStudyResourceStrategy: createStudyResourceStrategy({
          bookTargets: [calmStrategyTarget],
          scrollTargets: [berserkerStrategyTarget],
          selectedCombinationKey: 'book-and-scroll',
          shouldAllowSecondScroll: true,
        }),
      }),
    )

    const badges = screen.getAllByTestId(backgroundStudyResourceBadgeTestId)

    expect(badges).toHaveLength(2)
    expect(badges.map((badge) => badge.getAttribute('data-study-resource-kind'))).toEqual([
      'book',
      'scroll',
    ])
    expect(badges[1]).toHaveAttribute(
      'title',
      'Ancient scroll improves full build chance: Berserker',
    )
    expect(
      screen.queryByAltText(/Bright enables the second ancient scroll/),
    ).not.toBeInTheDocument()
  })

  test('marks study resources as must-have chance improvements when breakdown data shows an impact', () => {
    renderBackgroundFitCard(
      createBackgroundFit({
        mustHaveBuildReachabilityProbability: 0.6,
        mustHaveStudyResourceStrategy: createStudyResourceStrategy({
          bookTargets: [mediumArmorStrategyTarget, fitStrategyTarget],
          scrollTargets: [berserkerStrategyTarget],
        }),
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
      }),
    )

    const badgeContainer = screen.getByTestId(backgroundStudyResourceBadgesTestId)
    const badges = screen.getAllByTestId(backgroundStudyResourceBadgeTestId)

    expect(badgeContainer).toHaveAccessibleName('Study resources improve must-have chance')
    expect(badges).toHaveLength(2)
    expect(badges.map((badge) => badge.getAttribute('data-study-resource-kind'))).toEqual([
      'book',
      'scroll',
    ])
    expect(badges[0]).toHaveAttribute(
      'title',
      'Skill book improves must-have chance: Medium Armor or Fit',
    )
    expect(badges[0]).toHaveAttribute(
      'alt',
      'Skill book improves must-have chance: Medium Armor or Fit',
    )
    expect(badges[0]).toHaveAttribute('data-optional-only', 'false')
    expect(badges[1]).toHaveAttribute(
      'title',
      'Ancient scroll improves must-have chance: Berserker',
    )
    expect(badges[1]).toHaveAttribute('alt', 'Ancient scroll improves must-have chance: Berserker')
    expect(badges[1]).toHaveAttribute('data-optional-only', 'false')
    expect(screen.getByText('Must-have build chance').closest('[title]')).not.toHaveAttribute(
      'title',
      expect.stringContaining('Breakdown:'),
    )
  })

  test('does not render badges when the full build is native-only', () => {
    renderBackgroundFitCard(createBackgroundFit())

    expect(screen.queryByTestId(backgroundStudyResourceBadgesTestId)).not.toBeInTheDocument()
  })

  test('renders must-have strategy icons when the full build is unreachable', () => {
    renderBackgroundFitCard(
      createBackgroundFit({
        fullBuildReachabilityProbability: 0,
        fullBuildStudyResourceRequirement: null,
        mustHaveStudyResourceStrategy: createStudyResourceStrategy({
          bookTargets: [calmStrategyTarget],
          scrollTargets: [berserkerStrategyTarget],
        }),
      }),
    )

    const badgeContainer = screen.getByTestId(backgroundStudyResourceBadgesTestId)
    const badges = screen.getAllByTestId(backgroundStudyResourceBadgeTestId)

    expect(badgeContainer).toHaveAccessibleName('Study resources improve must-have chance')
    expect(badges).toHaveLength(2)
    expect(badges.map((badge) => badge.getAttribute('data-study-resource-kind'))).toEqual([
      'book',
      'scroll',
    ])
    expect(badges[0]).toHaveAttribute('title', 'Skill book improves must-have chance: Calm')
    expect(badges[0]).toHaveAttribute('data-optional-only', 'false')
    expect(badges[1]).toHaveAttribute(
      'title',
      'Ancient scroll improves must-have chance: Berserker',
    )
    expect(badges[1]).toHaveAttribute('data-optional-only', 'false')
    expect(screen.getByText('Full build chance').closest('[title]')).toHaveAttribute(
      'title',
      'No legal native background roll plus up to one skill book and up to one ancient scroll can cover every picked perk for the full build, including optional perks.',
    )
  })

  test('describes the selected study resource filters in build chance tooltips', () => {
    const { unmount } = renderBackgroundFitCardWithStudyResourceFilter({
      shouldAllowBook: true,
      shouldAllowScroll: true,
      shouldAllowSecondScroll: true,
    })

    expect(screen.getByText('Must-have build chance').closest('[title]')).toHaveAttribute(
      'title',
      'One legal native background roll plus up to one skill book and up to two ancient scrolls if Bright is available can cover every picked perk with a 100% chance for the must-have build.',
    )

    unmount()
    renderBackgroundFitCardWithStudyResourceFilter({
      shouldAllowBook: false,
      shouldAllowScroll: false,
      shouldAllowSecondScroll: false,
    })

    expect(screen.getByText('Must-have build chance').closest('[title]')).toHaveAttribute(
      'title',
      'One legal native background roll without books or scrolls can cover every picked perk with a 100% chance for the must-have build.',
    )
  })

  test('renders must-have metric icons from explicit metadata', () => {
    render(
      <BackgroundFitMetricTable
        metrics={[
          {
            accessibleLabel: 'Required build chance 100%',
            icon: 'must-have',
            label: 'Required build chance',
            tooltip: 'A renamed required-build metric still uses the must-have icon.',
            value: '100%',
          },
          {
            accessibleLabel: 'Must-have wording without icon 1/1',
            icon: null,
            label: 'Must-have wording without icon',
            tooltip: 'Label text alone should not opt into the must-have icon.',
            value: '1/1',
          },
        ]}
      />,
    )

    const metricRows = screen.getAllByTestId('background-fit-summary-metric')

    expect(within(metricRows[0]).getByTestId('background-fit-summary-must-have-icon')).toBeVisible()
    expect(
      within(metricRows[1]).queryByTestId('background-fit-summary-must-have-icon'),
    ).not.toBeInTheDocument()
  })

  test('shows the veteran perk interval badge with a native tooltip', () => {
    renderBackgroundFitCard(
      createBackgroundFit({
        veteranPerkLevelInterval: 3,
      }),
    )

    const veteranPerkBadge = screen.getByTestId('background-fit-veteran-perk-badge')

    expect(veteranPerkBadge).toHaveTextContent('1 / 3')
    expect(veteranPerkBadge).toHaveAccessibleName('1 / 3 veteran perk interval')
    expect(veteranPerkBadge).toHaveAttribute('data-veteran-perk-interval', '3')
    expect(veteranPerkBadge).toHaveAttribute(
      'title',
      '1 / 3 means this background gains 1 perk point every 3 veteran levels after level 12. The first veteran perk point is at level 15.',
    )
  })

  test('shows the rank badge with a native tooltip', () => {
    const { unmount } = renderBackgroundFitCard(createBackgroundFit(), 2)

    const rankedByBuildChanceBadge = screen.getByTestId('background-fit-rank')

    expect(rankedByBuildChanceBadge).toHaveTextContent('3')
    expect(rankedByBuildChanceBadge).toHaveAccessibleName('Background fit rank 3')
    expect(rankedByBuildChanceBadge).toHaveAttribute(
      'title',
      'Background fit rank 3. Ranked first by must-have build chance, then full build chance, perk coverage, and background name.',
    )

    unmount()
    renderBackgroundFitCard(
      createBackgroundFit({
        buildReachabilityProbability: null,
        fullBuildReachabilityProbability: null,
        mustHaveBuildReachabilityProbability: null,
      }),
      4,
    )

    const rankedByPerkCoverageBadge = screen.getByTestId('background-fit-rank')

    expect(rankedByPerkCoverageBadge).toHaveTextContent('5')
    expect(rankedByPerkCoverageBadge).toHaveAccessibleName('Background fit rank 5')
    expect(rankedByPerkCoverageBadge).toHaveAttribute(
      'title',
      'Background fit rank 5. Ranked by expected perks pickable, guaranteed perks, best native roll, and background name.',
    )
  })
})
