import { describe, expect, test } from 'vitest'
import { formatMorePerkResultsLabel, groupBackgroundSources } from '../src/lib/perk-display'
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
  test('formats show more perk result labels with singular and plural nouns', () => {
    expect(formatMorePerkResultsLabel(1)).toBe('Show 1 more perk')
    expect(formatMorePerkResultsLabel(2)).toBe('Show 2 more perks')
    expect(formatMorePerkResultsLabel(12)).toBe('Show 12 more perks')
  })

  test('groups background sources by probability and sorts them from highest chance', () => {
    const backgroundSources = [
      createBackgroundSource({
        backgroundId: 'background.one_in_eight',
        backgroundName: 'Hedge Knight',
        categoryName: 'Class',
        perkGroupId: 'CalmTree',
        perkGroupName: 'Calm',
      }),
      createBackgroundSource({
        backgroundId: 'background.guaranteed_one',
        backgroundName: 'Anatomist',
        categoryName: 'Class',
        perkGroupId: 'FaithTree',
        perkGroupName: 'Faith',
      }),
      createBackgroundSource({
        backgroundId: 'background.half_duplicate',
        backgroundName: 'Scholar',
        categoryName: 'Magic',
        perkGroupId: 'CalmTree',
        perkGroupName: 'Study',
      }),
      createBackgroundSource({
        backgroundId: 'background.never',
        backgroundName: 'Dormant',
        categoryName: 'Weapon',
        perkGroupId: 'CalmTree',
        perkGroupName: 'Calm',
      }),
      createBackgroundSource({
        backgroundId: 'background.guaranteed_two',
        backgroundName: 'Youngblood',
        categoryName: 'Magic',
        perkGroupId: 'DruidicArtsTree',
        perkGroupName: 'Druidic Arts',
      }),
      createBackgroundSource({
        backgroundId: 'background.half',
        backgroundName: 'Scholar',
        categoryName: 'Profession',
        perkGroupId: 'CalmTree',
        perkGroupName: 'Calm',
      }),
      createBackgroundSource({
        backgroundId: 'background.half_other',
        backgroundName: 'Pilgrim',
        categoryName: 'Traits',
        perkGroupId: 'CalmTree',
        perkGroupName: 'Calm',
      }),
      createBackgroundSource({
        backgroundId: 'background.rounded_one',
        backgroundName: 'Militia',
        categoryName: 'Class',
        perkGroupId: 'NetsTree',
        perkGroupName: 'Nets',
      }),
      createBackgroundSource({
        backgroundId: 'background.rounded_two',
        backgroundName: 'Indebted',
        categoryName: 'Enemy',
        perkGroupId: 'SwordmastersTree',
        perkGroupName: 'Swordmasters',
      }),
      createBackgroundSource({
        backgroundId: 'background.rounded_three',
        backgroundName: 'Caravan Hand',
        categoryName: 'Profession',
        perkGroupId: 'TradeTree',
        perkGroupName: 'Trade',
      }),
    ]
    const probabilityByBackgroundId = new Map([
      ['background.guaranteed_one', 1],
      ['background.guaranteed_two', 1],
      ['background.half', 0.5],
      ['background.half_duplicate', 0.5],
      ['background.half_other', 0.5],
      ['background.one_in_eight', 0.125],
      ['background.rounded_one', 0.001],
      ['background.rounded_two', 0.00102],
      ['background.rounded_three', 0.000999],
      ['background.never', 0],
    ])

    const groupedBackgroundSources = groupBackgroundSources(
      backgroundSources,
      (backgroundSource) => probabilityByBackgroundId.get(backgroundSource.backgroundId) ?? 0,
    )

    expect(groupedBackgroundSources).toEqual([
      {
        backgroundNames: ['Anatomist', 'Youngblood'],
        probability: 1,
      },
      {
        backgroundNames: ['Scholar', 'Pilgrim'],
        probability: 0.5,
      },
      {
        backgroundNames: ['Hedge Knight'],
        probability: 0.125,
      },
      {
        backgroundNames: ['Militia', 'Indebted', 'Caravan Hand'],
        probability: 0.00102,
      },
      {
        backgroundNames: ['Dormant'],
        probability: 0,
      },
    ])
  })
})
