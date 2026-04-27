import { describe, expect, test } from 'vitest'
import { groupBackgroundSources } from '../src/lib/perk-display'
import type { LegendsPerkBackgroundSource } from '../src/types/legends-perks'

function createBackgroundSource({
  backgroundId,
  backgroundName,
  categoryName = 'Traits',
  perkGroupId,
  perkGroupName,
}: {
  backgroundId: string
  backgroundName: string
  categoryName?: string
  perkGroupId: string
  perkGroupName: string
}): LegendsPerkBackgroundSource {
  return {
    backgroundId,
    backgroundName,
    categoryName,
    chance: null,
    minimumPerkGroups: null,
    perkGroupId,
    perkGroupName,
  }
}

describe('perk display', () => {
  test('groups background sources and sorts them by descending probability', () => {
    const backgroundSources = [
      createBackgroundSource({
        backgroundId: 'background.one_in_eight',
        backgroundName: 'Hedge Knight',
        perkGroupId: 'CalmTree',
        perkGroupName: 'Calm',
      }),
      createBackgroundSource({
        backgroundId: 'background.guaranteed_one',
        backgroundName: 'Anatomist',
        perkGroupId: 'CalmTree',
        perkGroupName: 'Calm',
      }),
      createBackgroundSource({
        backgroundId: 'background.never',
        backgroundName: 'Dormant',
        perkGroupId: 'CalmTree',
        perkGroupName: 'Calm',
      }),
      createBackgroundSource({
        backgroundId: 'background.guaranteed_two',
        backgroundName: 'Youngblood',
        perkGroupId: 'CalmTree',
        perkGroupName: 'Calm',
      }),
      createBackgroundSource({
        backgroundId: 'background.half',
        backgroundName: 'Scholar',
        perkGroupId: 'CalmTree',
        perkGroupName: 'Calm',
      }),
    ]
    const probabilityByBackgroundId = new Map([
      ['background.guaranteed_one', 1],
      ['background.guaranteed_two', 1],
      ['background.half', 0.5],
      ['background.one_in_eight', 0.125],
      ['background.never', 0],
    ])

    const groupedBackgroundSources = groupBackgroundSources(
      backgroundSources,
      (backgroundSource) => probabilityByBackgroundId.get(backgroundSource.backgroundId) ?? 0,
    )

    expect(groupedBackgroundSources).toEqual([
      expect.objectContaining({
        backgroundNames: ['Anatomist', 'Youngblood'],
        probability: 1,
      }),
      expect.objectContaining({
        backgroundNames: ['Scholar'],
        probability: 0.5,
      }),
      expect.objectContaining({
        backgroundNames: ['Hedge Knight'],
        probability: 0.125,
      }),
      expect.objectContaining({
        backgroundNames: ['Dormant'],
        probability: 0,
      }),
    ])
  })
})
