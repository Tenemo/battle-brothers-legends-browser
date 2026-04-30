import { existsSync } from 'node:fs'
import path from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { BackgroundFitCard } from '../src/components/BackgroundFitCard'
import {
  backgroundStudyResourceBadgesTestId,
  backgroundStudyResourceBadgeTestId,
  brightTraitIconPath,
  skillBookIconPath,
} from '../src/lib/background-study-resource-display'
import { ancientScrollIconPath } from '../src/lib/ancient-scroll-perk-group-display'
import type { RankedBackgroundFit } from '../src/lib/background-fit'
import type { BackgroundStudyResourceFilter } from '../src/lib/background-study-reachability'

const nativeStudyResourceRequirement = {
  requiredScrollCount: 0,
  requiresBook: false,
  requiresBright: false,
} as const

function createBackgroundFit(overrides: Partial<RankedBackgroundFit> = {}): RankedBackgroundFit {
  return {
    backgroundId: 'background.study_resource_badges',
    backgroundName: 'Study resource badges',
    buildReachabilityProbability: 1,
    disambiguator: null,
    expectedCoveredMustHavePerkCount: 1,
    expectedCoveredOptionalPerkCount: 1,
    expectedCoveredPickedPerkCount: 2,
    expectedMatchedPerkGroupCount: 0,
    fullBuildReachabilityProbability: 1,
    fullBuildStudyResourceRequirement: nativeStudyResourceRequirement,
    guaranteedCoveredMustHavePerkCount: 1,
    guaranteedCoveredOptionalPerkCount: 0,
    guaranteedMatchedPerkGroupCount: 0,
    iconPath: null,
    matches: [],
    maximumNativeCoveredPickedPerkCount: 1,
    maximumTotalPerkGroupCount: 0,
    mustHaveBuildReachabilityProbability: 1,
    mustHaveStudyResourceRequirement: nativeStudyResourceRequirement,
    sourceFilePath: 'backgrounds/study_resource_badges_background.nut',
    veteranPerkLevelInterval: 4,
    ...overrides,
  }
}

function renderBackgroundFitCard(backgroundFit: RankedBackgroundFit, rank = 0) {
  return render(
    <BackgroundFitCard
      backgroundFit={backgroundFit}
      isSelected={false}
      mustHavePickedPerkCount={1}
      onClearPerkGroupHover={vi.fn()}
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
    />,
  )
}

function renderBackgroundFitCardWithStudyResourceFilter(
  studyResourceFilter: BackgroundStudyResourceFilter,
) {
  return render(
    <BackgroundFitCard
      backgroundFit={createBackgroundFit()}
      isSelected={false}
      mustHavePickedPerkCount={1}
      onClearPerkGroupHover={vi.fn()}
      onSelect={vi.fn()}
      optionalPickedPerkCount={0}
      pickedPerkCount={1}
      query=""
      rank={0}
      studyResourceFilter={studyResourceFilter}
    />,
  )
}

describe('background fit card study resource badges', () => {
  test('renders full-build resource icons with native titles and optional-only styling hooks', () => {
    renderBackgroundFitCard(
      createBackgroundFit({
        fullBuildStudyResourceRequirement: {
          requiredScrollCount: 2,
          requiresBook: true,
          requiresBright: true,
        },
        mustHaveStudyResourceRequirement: {
          requiredScrollCount: 1,
          requiresBook: true,
          requiresBright: false,
        },
      }),
    )

    const badgeContainer = screen.getByTestId(backgroundStudyResourceBadgesTestId)
    const badges = screen.getAllByTestId(backgroundStudyResourceBadgeTestId)

    expect(badgeContainer).toHaveAccessibleName('Full build study resource requirements')
    expect(badges).toHaveLength(4)
    expect(badges.map((badge) => badge.getAttribute('data-study-resource-kind'))).toEqual([
      'book',
      'scroll',
      'scroll',
      'bright',
    ])
    expect(badges[0]).toHaveAttribute('src', `/game-icons/${skillBookIconPath}`)
    expect(badges[0]).toHaveAttribute('title', 'Full build requires a skill book')
    expect(badges[0]).toHaveAttribute('data-optional-only', 'false')
    expect(badges[1]).toHaveAttribute('src', `/game-icons/${ancientScrollIconPath}`)
    expect(badges[1]).toHaveAttribute('title', 'Full build requires two ancient scrolls')
    expect(badges[1]).toHaveAttribute('data-optional-only', 'false')
    expect(badges[2]).toHaveAttribute('src', `/game-icons/${ancientScrollIconPath}`)
    expect(badges[2]).toHaveAttribute('title', 'Optional perks can use a second ancient scroll')
    expect(badges[2]).toHaveAttribute('data-optional-only', 'true')
    expect(badges[2].className).toContain('backgroundFitStudyResourceBadgeOptionalOnly')
    expect(badges[3]).toHaveAttribute('src', `/game-icons/${brightTraitIconPath}`)
    expect(badges[3]).toHaveAttribute(
      'title',
      'Optional perks can use a second ancient scroll if Bright is available',
    )
    expect(brightTraitIconPath).toBe('ui/traits/trait_icon_11.png')
    expect(badges[3]).toHaveAttribute('data-optional-only', 'true')
    expect(badges[3].className).toContain('backgroundFitStudyResourceBadgeOptionalOnly')
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

  test('does not render badges when the full build is native-only', () => {
    renderBackgroundFitCard(createBackgroundFit())

    expect(screen.queryByTestId(backgroundStudyResourceBadgesTestId)).not.toBeInTheDocument()
  })

  test('falls back to must-have resource icons when the full build is unreachable', () => {
    renderBackgroundFitCard(
      createBackgroundFit({
        fullBuildReachabilityProbability: 0,
        fullBuildStudyResourceRequirement: null,
        mustHaveStudyResourceRequirement: {
          requiredScrollCount: 1,
          requiresBook: true,
          requiresBright: false,
        },
      }),
    )

    const badgeContainer = screen.getByTestId(backgroundStudyResourceBadgesTestId)
    const badges = screen.getAllByTestId(backgroundStudyResourceBadgeTestId)

    expect(badgeContainer).toHaveAccessibleName('Must-have build study resource requirements')
    expect(badges).toHaveLength(2)
    expect(badges.map((badge) => badge.getAttribute('data-study-resource-kind'))).toEqual([
      'book',
      'scroll',
    ])
    expect(badges[0]).toHaveAttribute('title', 'Must-have build requires a skill book')
    expect(badges[0]).toHaveAttribute('data-optional-only', 'false')
    expect(badges[1]).toHaveAttribute('title', 'Must-have build requires an ancient scroll')
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
      'Background fit rank 3. Ranked first by must-have build chance, then full-build chance, perk coverage, and background name.',
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
