import { describe, expect, test } from 'vitest'
import {
  allGroupsFilterValue,
  allTiersFilterValue,
  filterAndSortPerks,
} from '../src/lib/perk-search'
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
        sourceFilePath: 'reference/mod_legends/hooks/skills/backgrounds/legend_vala_background.nut',
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
        sourceFilePath: 'reference/mod_legends/config/z_perks_tree_magic.nut',
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
    scriptPath: null,
    searchText:
      'Heightened Senses Magic Vala Chant chants gain heightened senses nearby allies Vala',
    sourceFilePaths: ['reference/mod_legends/config/z_perks_tree_magic.nut'],
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
        sourceFilePath: 'reference/mod_legends/config/z_perks_tree_weapons.nut',
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
    scriptPath: null,
    searchText: 'Lookout Weapon Bows bows ranged skill scouting accuracy',
    sourceFilePaths: ['reference/mod_legends/config/z_perks_tree_weapons.nut'],
  },
  {
    backgroundSources: [
      {
        backgroundId: 'background.beast_slayer',
        backgroundName: 'Beast Slayer',
        categoryName: 'Enemy',
        chance: 0.05,
        minimumTrees: 2,
        sourceFilePath: 'reference/mod_legends/hooks/skills/backgrounds/beast_hunter_background.nut',
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
        sourceFilePath: 'reference/mod_legends/config/z_perks_tree_enemy.nut',
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
        sourceFilePath: 'reference/mod_legends/hooks/scenarios/world/beast_hunters_scenario.nut',
        sourceMethodName: 'onBuildPerkTree',
      },
    ],
    scriptPath: null,
    searchText:
      'Favoured Enemy - Beasts Enemy Beasts beasts bear beast slayer Beast Slayers random-pool',
    sourceFilePaths: ['reference/mod_legends/config/z_perks_tree_enemy.nut'],
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
        sourceFilePath: 'reference/mod_legends/config/z_perks_tree_traits.nut',
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
    scriptPath: null,
    searchText: 'Clarity Traits Calm is calm ignore armor',
    sourceFilePaths: ['reference/mod_legends/config/z_perks_tree_traits.nut'],
  },
]

describe('perk search', () => {
  test('prefers exact name matches over broader text matches', () => {
    const results = filterAndSortPerks(samplePerks, {
      groupName: allGroupsFilterValue,
      query: 'Clarity',
      selectedTreeIds: [],
      tierValue: allTiersFilterValue,
    })

    expect(results.map((perk) => perk.perkName)[0]).toBe('Clarity')
  })

  test('matches description-only text when no name or tree match exists', () => {
    const results = filterAndSortPerks(samplePerks, {
      groupName: allGroupsFilterValue,
      query: 'scouting',
      selectedTreeIds: [],
      tierValue: allTiersFilterValue,
    })

    expect(results.map((perk) => perk.perkName)).toEqual(['Lookout'])
  })

  test('matches tree text and dynamic background names', () => {
    const treeResults = filterAndSortPerks(samplePerks, {
      groupName: allGroupsFilterValue,
      query: 'vala chant',
      selectedTreeIds: [],
      tierValue: allTiersFilterValue,
    })
    const backgroundResults = filterAndSortPerks(samplePerks, {
      groupName: allGroupsFilterValue,
      query: 'Beast Slayer',
      selectedTreeIds: [],
      tierValue: allTiersFilterValue,
    })

    expect(treeResults.map((perk) => perk.perkName)).toEqual(['Heightened Senses'])
    expect(backgroundResults.map((perk) => perk.perkName)).toEqual([
      'Favoured Enemy - Beasts',
    ])
  })

  test('matches scenario names and favored enemy targets', () => {
    const scenarioResults = filterAndSortPerks(samplePerks, {
      groupName: allGroupsFilterValue,
      query: 'Beast Slayers',
      selectedTreeIds: [],
      tierValue: allTiersFilterValue,
    })
    const targetResults = filterAndSortPerks(samplePerks, {
      groupName: allGroupsFilterValue,
      query: 'Bear',
      selectedTreeIds: [],
      tierValue: allTiersFilterValue,
    })

    expect(scenarioResults.map((perk) => perk.perkName)).toEqual(['Favoured Enemy - Beasts'])
    expect(targetResults.map((perk) => perk.perkName)).toEqual(['Favoured Enemy - Beasts'])
  })

  test('combines category and tier filters', () => {
    const results = filterAndSortPerks(samplePerks, {
      groupName: 'Traits',
      query: '',
      selectedTreeIds: [],
      tierValue: '5',
    })

    expect(results.map((perk) => perk.perkName)).toEqual(['Clarity'])
  })

  test('combines category, perk group, and tier filters', () => {
    const results = filterAndSortPerks(samplePerks, {
      groupName: 'Enemy',
      query: '',
      selectedTreeIds: ['BeastTree'],
      tierValue: '3',
    })

    expect(results.map((perk) => perk.perkName)).toEqual(['Favoured Enemy - Beasts'])
  })
})
