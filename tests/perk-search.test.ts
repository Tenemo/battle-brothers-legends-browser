import { describe, expect, test } from 'vitest'
import { filterAndSortPerks, getPerkPreviewParagraphs } from '../src/lib/perk-search'
import type { LegendsPerkRecord } from '../src/types/legends-perks'

const samplePerks: LegendsPerkRecord[] = [
  {
    backgroundSources: [
      {
        backgroundId: 'background.legend_vala',
        backgroundName: 'Vala',
        categoryName: 'Magic',
        chance: 0.2,
        minimumPerkGroups: 1,
        perkGroupId: 'ValaChantMagicTree',
        perkGroupName: 'Vala Chant',
      },
    ],
    descriptionParagraphs: ['Gain heightened senses for nearby allies.'],
    categoryNames: ['Magic'],
    iconPath: null,
    id: 'perk.legend_heightened_senses',
    perkConstName: 'LegendHeightenedSenses',
    perkName: 'Heightened Senses',
    placements: [
      {
        categoryName: 'Magic',
        tier: 3,
        perkGroupAttributes: [],
        perkGroupDescriptions: ['chants'],
        perkGroupIconPath: null,
        perkGroupId: 'ValaChantMagicTree',
        perkGroupName: 'Vala Chant',
      },
    ],
    primaryCategoryName: 'Magic',
    scenarioSources: [],
    searchText:
      'Heightened Senses Magic Vala Chant chants gain heightened senses nearby allies Vala',
  },
  {
    backgroundSources: [],
    descriptionParagraphs: ['Improve ranged accuracy and scouting.'],
    categoryNames: ['Weapon'],
    iconPath: null,
    id: 'perk.legend_lookout',
    perkConstName: 'LegendLookout',
    perkName: 'Lookout',
    placements: [
      {
        categoryName: 'Weapon',
        tier: 1,
        perkGroupAttributes: ['Ranged skill: +2 to +4'],
        perkGroupDescriptions: ['bows'],
        perkGroupIconPath: null,
        perkGroupId: 'BowTree',
        perkGroupName: 'Bows',
      },
    ],
    primaryCategoryName: 'Weapon',
    scenarioSources: [],
    searchText: 'Lookout Weapon Bows bows ranged skill scouting accuracy',
  },
  {
    backgroundSources: [
      {
        backgroundId: 'background.beast_slayer',
        backgroundName: 'Beast Slayer',
        categoryName: 'Enemy',
        chance: 0.05,
        minimumPerkGroups: 2,
        perkGroupId: 'BeastTree',
        perkGroupName: 'Beasts',
      },
    ],
    descriptionParagraphs: ['Favoured enemy bonuses scale with kills.'],
    favouredEnemyTargets: [
      {
        entityConstName: 'LegendBear',
        entityName: 'Bear',
        killsPerPercentBonus: 2,
      },
    ],
    categoryNames: ['Enemy'],
    iconPath: null,
    id: 'perk.legend_favoured_enemy_beast',
    perkConstName: 'LegendFavouredEnemyBeast',
    perkName: 'Favoured Enemy - Beasts',
    placements: [
      {
        categoryName: 'Enemy',
        tier: 3,
        perkGroupAttributes: [],
        perkGroupDescriptions: ['beasts'],
        perkGroupIconPath: null,
        perkGroupId: 'BeastTree',
        perkGroupName: 'Beasts',
      },
    ],
    primaryCategoryName: 'Enemy',
    scenarioSources: [
      {
        candidatePerkNames: ['Favoured Enemy - Beasts', 'Favoured Enemy - Occult'],
        grantType: 'random-pool',
        scenarioId: 'scenario.beast_hunters',
        scenarioName: 'Beast Slayers',
        sourceMethodName: 'onBuildPerkTree',
      },
    ],
    searchText:
      'Favoured Enemy - Beasts Enemy Beasts beasts bear beast slayer Beast Slayers random-pool',
  },
  {
    backgroundSources: [
      {
        backgroundId: 'background.hedge_knight',
        backgroundName: 'Hedge Knight',
        categoryName: 'Traits',
        chance: null,
        minimumPerkGroups: 7,
        perkGroupId: 'CalmTree',
        perkGroupName: 'Calm',
      },
    ],
    descriptionParagraphs: ['Remain calm and ignore armor more effectively.'],
    categoryNames: ['Traits'],
    iconPath: null,
    id: 'perk.legend_clarity',
    perkConstName: 'LegendClarity',
    perkName: 'Clarity',
    placements: [
      {
        categoryName: 'Traits',
        tier: 5,
        perkGroupAttributes: [],
        perkGroupDescriptions: ['is calm'],
        perkGroupIconPath: null,
        perkGroupId: 'CalmTree',
        perkGroupName: 'Calm',
      },
    ],
    primaryCategoryName: 'Traits',
    scenarioSources: [],
    searchText: 'Clarity Traits Calm is calm ignore armor',
  },
]

describe('perk search', () => {
  test('prefers exact name matches over broader text matches', () => {
    const results = filterAndSortPerks(samplePerks, {
      query: 'Clarity',
      selectedCategoryNames: [],
      selectedPerkGroupIdsByCategory: {},
    })

    expect(results.map((perk) => perk.perkName)[0]).toBe('Clarity')
  })

  test('matches description-only text when no name or perk group match exists', () => {
    const results = filterAndSortPerks(samplePerks, {
      query: 'scouting',
      selectedCategoryNames: [],
      selectedPerkGroupIdsByCategory: {},
    })

    expect(results.map((perk) => perk.perkName)).toEqual(['Lookout'])
  })

  test('matches perk group text and dynamic background names', () => {
    const treeResults = filterAndSortPerks(samplePerks, {
      query: 'vala chant',
      selectedCategoryNames: [],
      selectedPerkGroupIdsByCategory: {},
    })
    const backgroundResults = filterAndSortPerks(samplePerks, {
      query: 'Beast Slayer',
      selectedCategoryNames: [],
      selectedPerkGroupIdsByCategory: {},
    })

    expect(treeResults.map((perk) => perk.perkName)).toEqual(['Heightened Senses'])
    expect(backgroundResults.map((perk) => perk.perkName)).toEqual(['Favoured Enemy - Beasts'])
  })

  test('matches background source names even when generated search text omits them', () => {
    const results = filterAndSortPerks(samplePerks, {
      query: 'Hedge Knight',
      selectedCategoryNames: [],
      selectedPerkGroupIdsByCategory: {},
    })

    expect(results.map((perk) => perk.perkName)).toEqual(['Clarity'])
  })

  test('matches scenario names and favoured enemy targets', () => {
    const scenarioResults = filterAndSortPerks(samplePerks, {
      query: 'Beast Slayers',
      selectedCategoryNames: [],
      selectedPerkGroupIdsByCategory: {},
    })
    const targetResults = filterAndSortPerks(samplePerks, {
      query: 'Bear',
      selectedCategoryNames: [],
      selectedPerkGroupIdsByCategory: {},
    })

    expect(scenarioResults.map((perk) => perk.perkName)).toEqual(['Favoured Enemy - Beasts'])
    expect(targetResults.map((perk) => perk.perkName)).toEqual(['Favoured Enemy - Beasts'])
  })

  test('treats multiple selected categories as a union while keeping perk group filters scoped per category', () => {
    const results = filterAndSortPerks(samplePerks, {
      query: '',
      selectedCategoryNames: ['Traits', 'Enemy'],
      selectedPerkGroupIdsByCategory: { Traits: ['CalmTree'] },
    })

    expect(results.map((perk) => perk.perkName)).toEqual(['Favoured Enemy - Beasts', 'Clarity'])
  })

  test('returns the full effect block after skipping a flavor quote in the perk preview', () => {
    const previewParagraphs = getPerkPreviewParagraphs({
      ...samplePerks[0],
      descriptionParagraphs: [
        "'In short, we tailored.'",
        'Passive: Repairs armor after combat.',
        'Costs no AP.',
      ],
    })

    expect(previewParagraphs).toEqual(['Repairs armor after combat.', 'Costs no AP.'])
  })

  test('returns the full effect block after skipping unquoted flavor text in the perk preview', () => {
    const previewParagraphs = getPerkPreviewParagraphs({
      ...samplePerks[0],
      descriptionParagraphs: [
        'An ace up your sleeve.',
        'Passive: Currently equipped throwing items regain 1 ammo each turn.',
        'Costs no AP.',
      ],
    })

    expect(previewParagraphs).toEqual([
      'Currently equipped throwing items regain 1 ammo each turn.',
      'Costs no AP.',
    ])
  })
})
