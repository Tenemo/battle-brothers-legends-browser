import { describe, expect, test, vi } from 'vitest'
import type { BackgroundFitSummary, BackgroundFitSummaryView } from '../src/lib/background-fit'

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
  }
}

describe('build share preview lightweight background fits', () => {
  test('uses background fit summaries and filters origin backgrounds from social previews', () => {
    const summaryView = {
      rankedBackgroundFitSummaries: [
        createSummary({
          backgroundId: 'background.legend_berserker',
          backgroundName: 'Berserker',
          sourceFilePath: 'scripts/skills/backgrounds/legend_berserker_background.nut',
        }),
        createSummary({
          backgroundId: 'background.apprentice',
          backgroundName: 'Apprentice',
          sourceFilePath: 'scripts/skills/backgrounds/apprentice_background.nut',
        }),
      ],
      supportedBuildTargetPerkGroups: [],
      unsupportedBuildTargetPerkGroups: [],
    } satisfies BackgroundFitSummaryView

    getBackgroundFitSummaryView.mockReturnValue(summaryView)
    getBackgroundFitView.mockImplementation(() => {
      throw new Error('Social previews should not use the full background fit view.')
    })

    const payload = createBuildSharePreviewPayloadFromSearch('?build=Clarity')

    expect(getBackgroundFitSummaryView).toHaveBeenCalledTimes(1)
    expect(getBackgroundFitView).not.toHaveBeenCalled()
    expect(payload.topBackgroundFits.map((backgroundFit) => backgroundFit.backgroundName)).toEqual([
      'Apprentice',
    ])
  })
})
