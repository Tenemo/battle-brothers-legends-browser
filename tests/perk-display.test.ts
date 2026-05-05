import { describe, expect, test } from 'vitest'
import { formatMorePerkResultsLabel, groupBackgroundSources } from '../src/lib/perk-display'
import type { LegendsPerkBackgroundSource } from '../src/types/legends-perks'

function createBackgroundSource({
  backgroundName,
  perkGroupId,
  perkGroupName,
  probability,
}: {
  backgroundName: string
  perkGroupId: string
  perkGroupName: string
  probability: number
}): LegendsPerkBackgroundSource {
  return {
    backgroundName,
    perkGroupId,
    perkGroupName,
    probability,
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
        backgroundName: 'Hedge Knight',
        perkGroupId: 'CalmTree',
        perkGroupName: 'Calm',
        probability: 0.125,
      }),
      createBackgroundSource({
        backgroundName: 'Anatomist',
        perkGroupId: 'FaithTree',
        perkGroupName: 'Faith',
        probability: 1,
      }),
      createBackgroundSource({
        backgroundName: 'Scholar',
        perkGroupId: 'CalmTree',
        perkGroupName: 'Study',
        probability: 0.5,
      }),
      createBackgroundSource({
        backgroundName: 'Dormant',
        perkGroupId: 'CalmTree',
        perkGroupName: 'Calm',
        probability: 0,
      }),
      createBackgroundSource({
        backgroundName: 'Youngblood',
        perkGroupId: 'DruidicArtsTree',
        perkGroupName: 'Druidic Arts',
        probability: 1,
      }),
      createBackgroundSource({
        backgroundName: 'Scholar',
        perkGroupId: 'CalmTree',
        perkGroupName: 'Calm',
        probability: 0.5,
      }),
      createBackgroundSource({
        backgroundName: 'Pilgrim',
        perkGroupId: 'CalmTree',
        perkGroupName: 'Calm',
        probability: 0.5,
      }),
      createBackgroundSource({
        backgroundName: 'Militia',
        perkGroupId: 'NetsTree',
        perkGroupName: 'Nets',
        probability: 0.001,
      }),
      createBackgroundSource({
        backgroundName: 'Indebted',
        perkGroupId: 'SwordmastersTree',
        perkGroupName: 'Swordmasters',
        probability: 0.00102,
      }),
      createBackgroundSource({
        backgroundName: 'Caravan Hand',
        perkGroupId: 'TradeTree',
        perkGroupName: 'Trade',
        probability: 0.000999,
      }),
    ]

    const groupedBackgroundSources = groupBackgroundSources(backgroundSources)

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
