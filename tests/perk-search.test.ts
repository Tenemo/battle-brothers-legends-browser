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
        minimumTrees: 1,
        treeId: 'ValaChantMagicTree',
        treeName: 'Vala Chant',
      },
    ],
    descriptionParagraphs: ['Gain heightened senses for nearby allies.'],
    groupNames: ['Magic'],
    iconPath: null,
    id: 'perk.legend_heightened_senses',
    perkConstName: 'LegendHeightenedSenses',
    perkName: 'Heightened Senses',
    placements: [
      {
        categoryName: 'Magic',
        tier: 3,
        treeAttributes: [],
        treeDescriptions: ['chants'],
        treeIconPath: null,
        treeId: 'ValaChantMagicTree',
        treeName: 'Vala Chant',
      },
    ],
    primaryGroupName: 'Magic',
    scenarioSources: [],
    searchText:
      'Heightened Senses Magic Vala Chant chants gain heightened senses nearby allies Vala',
  },
  {
    backgroundSources: [],
    descriptionParagraphs: ['Improve ranged accuracy and scouting.'],
    groupNames: ['Weapon'],
    iconPath: null,
    id: 'perk.legend_lookout',
    perkConstName: 'LegendLookout',
    perkName: 'Lookout',
    placements: [
      {
        categoryName: 'Weapon',
        tier: 1,
        treeAttributes: ['Ranged skill: +2 to +4'],
        treeDescriptions: ['bows'],
        treeIconPath: null,
        treeId: 'BowTree',
        treeName: 'Bows',
      },
    ],
    primaryGroupName: 'Weapon',
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
        minimumTrees: 2,
        treeId: 'BeastTree',
        treeName: 'Beasts',
      },
    ],
    descriptionParagraphs: ['Favored enemy bonuses scale with kills.'],
    favoredEnemyTargets: [
      {
        entityConstName: 'LegendBear',
        entityName: 'Bear',
        killsPerPercentBonus: 2,
      },
    ],
    groupNames: ['Enemy'],
    iconPath: null,
    id: 'perk.legend_favoured_enemy_beast',
    perkConstName: 'LegendFavouredEnemyBeast',
    perkName: 'Favoured Enemy - Beasts',
    placements: [
      {
        categoryName: 'Enemy',
        tier: 3,
        treeAttributes: [],
        treeDescriptions: ['beasts'],
        treeIconPath: null,
        treeId: 'BeastTree',
        treeName: 'Beasts',
      },
    ],
    primaryGroupName: 'Enemy',
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
    backgroundSources: [],
    descriptionParagraphs: ['Remain calm and ignore armor more effectively.'],
    groupNames: ['Traits'],
    iconPath: null,
    id: 'perk.legend_clarity',
    perkConstName: 'LegendClarity',
    perkName: 'Clarity',
    placements: [
      {
        categoryName: 'Traits',
        tier: 5,
        treeAttributes: [],
        treeDescriptions: ['is calm'],
        treeIconPath: null,
        treeId: 'CalmTree',
        treeName: 'Calm',
      },
    ],
    primaryGroupName: 'Traits',
    scenarioSources: [],
    searchText: 'Clarity Traits Calm is calm ignore armor',
  },
]

describe('perk search', () => {
  test('prefers exact name matches over broader text matches', () => {
    const results = filterAndSortPerks(samplePerks, {
      query: 'Clarity',
      selectedGroupNames: [],
      selectedTreeIdsByGroup: {},
    })

    expect(results.map((perk) => perk.perkName)[0]).toBe('Clarity')
  })

  test('matches description-only text when no name or tree match exists', () => {
    const results = filterAndSortPerks(samplePerks, {
      query: 'scouting',
      selectedGroupNames: [],
      selectedTreeIdsByGroup: {},
    })

    expect(results.map((perk) => perk.perkName)).toEqual(['Lookout'])
  })

  test('matches tree text and dynamic background names', () => {
    const treeResults = filterAndSortPerks(samplePerks, {
      query: 'vala chant',
      selectedGroupNames: [],
      selectedTreeIdsByGroup: {},
    })
    const backgroundResults = filterAndSortPerks(samplePerks, {
      query: 'Beast Slayer',
      selectedGroupNames: [],
      selectedTreeIdsByGroup: {},
    })

    expect(treeResults.map((perk) => perk.perkName)).toEqual(['Heightened Senses'])
    expect(backgroundResults.map((perk) => perk.perkName)).toEqual(['Favoured Enemy - Beasts'])
  })

  test('matches scenario names and favored enemy targets', () => {
    const scenarioResults = filterAndSortPerks(samplePerks, {
      query: 'Beast Slayers',
      selectedGroupNames: [],
      selectedTreeIdsByGroup: {},
    })
    const targetResults = filterAndSortPerks(samplePerks, {
      query: 'Bear',
      selectedGroupNames: [],
      selectedTreeIdsByGroup: {},
    })

    expect(scenarioResults.map((perk) => perk.perkName)).toEqual(['Favoured Enemy - Beasts'])
    expect(targetResults.map((perk) => perk.perkName)).toEqual(['Favoured Enemy - Beasts'])
  })

  test('treats multiple selected categories as a union while keeping subgroup filters scoped per category', () => {
    const results = filterAndSortPerks(samplePerks, {
      query: '',
      selectedGroupNames: ['Traits', 'Enemy'],
      selectedTreeIdsByGroup: { Traits: ['CalmTree'] },
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
