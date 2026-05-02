import { beforeEach, describe, expect, test, vi } from 'vitest'
import type {
  BackgroundFitSummary,
  BackgroundFitView,
  RankedBackgroundFit,
} from '../src/lib/background-fit'
import { defaultBackgroundStudyResourceFilter } from '../src/lib/background-study-reachability'

const {
  getBackgroundFitSummaryView,
  getBackgroundFitView,
  getBackgroundPerkGroupProbability,
  getPerkBackgroundSources,
} = vi.hoisted(() => ({
  getBackgroundFitSummaryView: vi.fn(),
  getBackgroundFitView: vi.fn(),
  getBackgroundPerkGroupProbability: vi.fn(),
  getPerkBackgroundSources: vi.fn(),
}))

vi.mock('../src/lib/background-fit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/lib/background-fit')>()

  return {
    ...actual,
    createBackgroundFitEngine: () => ({
      getBackgroundFitSummaryView,
      getBackgroundFitView,
      getBackgroundPerkGroupProbability,
      getPerkBackgroundSources,
    }),
  }
})

import { createBuildSharePreviewPayloadFromSearch } from '../src/lib/build-share-preview'

beforeEach(() => {
  vi.clearAllMocks()
})

function createSummary({
  backgroundId,
  backgroundName,
  sourceFilePath,
}: {
  backgroundId: string
  backgroundName: string
  sourceFilePath: string
}): BackgroundFitSummary {
  return {
    backgroundId,
    backgroundName,
    disambiguator: null,
    expectedCoveredPickedPerkCount: 1,
    expectedMatchedPerkGroupCount: 1,
    guaranteedMatchedPerkGroupCount: 1,
    iconPath: null,
    matches: [
      {
        categoryName: 'Traits',
        isGuaranteed: true,
        perkGroupIconPath: null,
        perkGroupId: 'CalmTree',
        perkGroupName: 'Calm',
        pickedPerkCount: 1,
        pickedPerkIds: ['perk.legend_clarity'],
        pickedPerkNames: ['Clarity'],
        probability: 1,
      },
    ],
    maximumTotalPerkGroupCount: 1,
    sourceFilePath,
    veteranPerkLevelInterval: 4,
  }
}

function createRankedBackgroundFit({
  backgroundId,
  backgroundName,
  buildReachabilityProbability = 1,
  expectedCoveredMustHavePerkCount = 1,
  expectedCoveredOptionalPerkCount = 0,
  sourceFilePath,
}: {
  backgroundId: string
  backgroundName: string
  buildReachabilityProbability?: number
  expectedCoveredMustHavePerkCount?: number
  expectedCoveredOptionalPerkCount?: number
  sourceFilePath: string
}): RankedBackgroundFit {
  return {
    ...createSummary({
      backgroundId,
      backgroundName,
      sourceFilePath,
    }),
    buildReachabilityProbability,
    expectedCoveredMustHavePerkCount,
    expectedCoveredOptionalPerkCount,
    fullBuildReachabilityProbability: buildReachabilityProbability,
    fullBuildStudyResourceRequirement: null,
    guaranteedCoveredMustHavePerkCount: 1,
    guaranteedCoveredOptionalPerkCount: 0,
    maximumNativeCoveredPickedPerkCount: 1,
    mustHaveBuildReachabilityProbability: buildReachabilityProbability,
    mustHaveStudyResourceRequirement: null,
  }
}

describe('build share preview background fits', () => {
  test('uses full background fit ranking and filters origin backgrounds from social previews', () => {
    const backgroundFitView = {
      rankedBackgroundFits: [
        createRankedBackgroundFit({
          backgroundId: 'background.legend_berserker',
          backgroundName: 'Berserker',
          buildReachabilityProbability: 1,
          sourceFilePath: 'scripts/skills/backgrounds/legend_berserker_background.nut',
        }),
        createRankedBackgroundFit({
          backgroundId: 'background.apprentice',
          backgroundName: 'Apprentice',
          buildReachabilityProbability: 0.9,
          expectedCoveredMustHavePerkCount: 2,
          sourceFilePath: 'scripts/skills/backgrounds/apprentice_background.nut',
        }),
        createRankedBackgroundFit({
          backgroundId: 'background.daytaler',
          backgroundName: 'Daytaler',
          buildReachabilityProbability: 0.8,
          sourceFilePath: 'scripts/skills/backgrounds/daytaler_background.nut',
        }),
      ],
      supportedBuildTargetPerkGroups: [],
      unsupportedBuildTargetPerkGroups: [],
    } satisfies BackgroundFitView

    getBackgroundFitView.mockReturnValue(backgroundFitView)
    getBackgroundFitSummaryView.mockImplementation(() => {
      throw new Error('Social previews should use the same ranking view as the app.')
    })

    const firstPayload = createBuildSharePreviewPayloadFromSearch(
      '?build=Clarity,Perfect+Focus&optional=Perfect+Focus',
    )
    const secondPayload = createBuildSharePreviewPayloadFromSearch(
      '?build=Clarity,Perfect+Focus&optional=Perfect+Focus',
    )

    expect(getBackgroundFitSummaryView).not.toHaveBeenCalled()
    expect(getBackgroundFitView).toHaveBeenCalledTimes(1)
    const [pickedPerks, studyResourceFilter, options] = getBackgroundFitView.mock.calls[0]
    const pickedPerkNames = (pickedPerks as Array<{ perkName: string }>).map(
      (perk) => perk.perkName,
    )

    expect(pickedPerkNames).toEqual(['Clarity', 'Perfect Focus'])
    expect(studyResourceFilter).toEqual(defaultBackgroundStudyResourceFilter)
    expect([...(options?.optionalPickedPerkIds ?? [])]).toEqual(['perk.legend_perfect_focus'])
    expect(
      firstPayload.topBackgroundFits.map((backgroundFit) => backgroundFit.backgroundName),
    ).toEqual(['Apprentice', 'Daytaler'])
    expect(secondPayload.topBackgroundFits).toEqual(firstPayload.topBackgroundFits)
  })

  test('skips background ranking work when top fits are disabled', () => {
    const payload = createBuildSharePreviewPayloadFromSearch('?build=Clarity', {
      shouldIncludeTopBackgroundFits: false,
    })

    expect(payload.status).toBe('found')
    expect(payload.topBackgroundFits).toEqual([])
    expect(getBackgroundFitView).not.toHaveBeenCalled()
    expect(getBackgroundFitSummaryView).not.toHaveBeenCalled()
  })
})
