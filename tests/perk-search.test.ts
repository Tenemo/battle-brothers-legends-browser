import { describe, expect, test } from 'vitest'
import { filterAndSortPerks, getPerkPreviewParagraphs } from '../src/lib/perk-search'
import type { LegendsPerkRecord } from '../src/types/legends-perks'

const samplePerks: LegendsPerkRecord[] = [
  {
    backgroundSources: [
      {
        backgroundName: 'Vala',
        perkGroupId: 'ValaChantMagicTree',
        perkGroupName: 'Vala Chant',
        probability: 0.2,
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
        perkGroupIconPath: null,
        perkGroupId: 'ValaChantMagicTree',
        perkGroupName: 'Vala Chant',
      },
    ],
    primaryCategoryName: 'Magic',
    scenarioSources: [],
    searchText: 'Heightened Senses Magic Vala Chant gain heightened senses nearby allies Vala',
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
        perkGroupIconPath: null,
        perkGroupId: 'BowTree',
        perkGroupName: 'Bows',
      },
    ],
    primaryCategoryName: 'Weapon',
    scenarioSources: [],
    searchText: 'Lookout Weapon Bows ranged skill scouting accuracy',
  },
  {
    backgroundSources: [
      {
        backgroundName: 'Beast Slayer',
        perkGroupId: 'BeastTree',
        perkGroupName: 'Beasts',
        probability: 0.05,
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
    searchText: 'Favoured Enemy - Beasts Enemy Beasts bear beast slayer Beast Slayers random-pool',
  },
  {
    backgroundSources: [
      {
        backgroundName: 'Hedge Knight',
        perkGroupId: 'CalmTree',
        perkGroupName: 'Calm',
        probability: 0.125,
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
        perkGroupIconPath: null,
        perkGroupId: 'CalmTree',
        perkGroupName: 'Calm',
      },
    ],
    primaryCategoryName: 'Traits',
    scenarioSources: [],
    searchText: 'Clarity Traits Calm ignore armor',
  },
]

describe('perk search', () => {
  test('shows no unscoped results until all categories, a category, or search text is selected', () => {
    const noSelectionResults = filterAndSortPerks(samplePerks, {
      categoryFilterMode: 'none',
      query: '',
      selectedCategoryNames: [],
      selectedPerkGroupIdsByCategory: {},
    })
    const allCategoryResults = filterAndSortPerks(samplePerks, {
      categoryFilterMode: 'all',
      query: '',
      selectedCategoryNames: [],
      selectedPerkGroupIdsByCategory: {},
    })

    expect(noSelectionResults).toEqual([])
    expect(allCategoryResults.map((perk) => perk.perkName)).toEqual(
      expect.arrayContaining([
        'Clarity',
        'Favoured Enemy - Beasts',
        'Heightened Senses',
        'Lookout',
      ]),
    )
    expect(allCategoryResults).toHaveLength(samplePerks.length)
  })

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

  test('returns the full effect block after skipping a flavour quote in the perk preview', () => {
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

  test('returns the full effect block after skipping unquoted flavour text in the perk preview', () => {
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

  test('formats perk preview bullet markers as en dashes', () => {
    const previewParagraphs = getPerkPreviewParagraphs({
      ...samplePerks[0],
      descriptionParagraphs: [
        'An ace up your sleeve.',
        'Passive: • Currently equipped throwing items regain 1 ammo each turn.',
        '•Costs no AP.',
        'â€¢ Ignores mojibake bullet markers from source fixtures.',
      ],
    })

    expect(previewParagraphs).toEqual([
      '– Currently equipped throwing items regain 1 ammo each turn.',
      '– Costs no AP.',
      '– Ignores mojibake bullet markers from source fixtures.',
    ])
  })
})
