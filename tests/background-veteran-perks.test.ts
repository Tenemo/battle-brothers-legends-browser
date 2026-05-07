import { describe, expect, test } from 'vitest'
import legendsBackgroundFitDatasetJson from '../src/data/legends-background-fit.json'
import {
  getBackgroundVeteranPerkLevelIntervalBadges,
  getBackgroundVeteranPerkLevelIntervals,
} from '../src/lib/background-veteran-perks'
import type {
  LegendsBackgroundFitBackgroundDefinition,
  LegendsBackgroundFitDataset,
} from '../src/types/legends-perks'

const legendsBackgroundFitDataset = legendsBackgroundFitDatasetJson as LegendsBackgroundFitDataset

function getBackground(backgroundId: string): LegendsBackgroundFitBackgroundDefinition {
  const background = legendsBackgroundFitDataset.backgroundFitBackgrounds.find(
    (candidateBackground) => candidateBackground.backgroundId === backgroundId,
  )

  expect(background).toBeDefined()

  return background as LegendsBackgroundFitBackgroundDefinition
}

describe('background veteran perk interval pills', () => {
  test('excludes broad random solo and free company origin overrides from 1 / 2 pills', () => {
    const adventurousNoble = getBackground('background.adventurous_noble')
    const adventurousNobleBadges = getBackgroundVeteranPerkLevelIntervalBadges(adventurousNoble)

    expect(getBackgroundVeteranPerkLevelIntervals(adventurousNoble)).toEqual([4])
    expect(adventurousNobleBadges.map((badge) => badge.label)).toEqual(['1 / 4'])
    expect(
      adventurousNoble.veteranPerkLevelIntervalContexts.some(
        (context) =>
          context.scenarioId === 'scenario.legend_random_solo' ||
          context.scenarioId === 'scenario.legends_free_company',
      ),
    ).toBe(false)
  })

  test('keeps narrower 1 / 2 origin overrides in veteran pill tooltips', () => {
    const holyCrusader = getBackground('background.legend_crusader')
    const vala = getBackground('background.legend_vala')
    const holyCrusaderTwoLevelBadge = getBackgroundVeteranPerkLevelIntervalBadges(
      holyCrusader,
    ).find((badge) => badge.interval === 2)
    const valaTwoLevelBadge = getBackgroundVeteranPerkLevelIntervalBadges(vala).find(
      (badge) => badge.interval === 2,
    )

    expect(getBackgroundVeteranPerkLevelIntervals(holyCrusader)).toEqual([2, 4])
    expect(holyCrusaderTwoLevelBadge?.title).toContain('Crusader')
    expect(holyCrusaderTwoLevelBadge?.title).not.toContain('Random Solo')

    expect(getBackgroundVeteranPerkLevelIntervals(vala)).toEqual([2, 3])
    expect(valaTwoLevelBadge?.title).toContain('Sisterhood')
    expect(valaTwoLevelBadge?.title).not.toContain('Random Solo')
  })
})
