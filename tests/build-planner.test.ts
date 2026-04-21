import { describe, expect, test } from 'vitest'
import {
  getGroupedBuildPerkGroupRequirements,
  getPerkGroupRequirementLabel,
  getPerkGroupRequirements,
} from '../src/lib/build-planner'
import type { LegendsPerkRecord } from '../src/types/legends-perks'

const samplePerk: LegendsPerkRecord = {
  backgroundSources: [],
  descriptionParagraphs: ['Unlocks disciplined movement through several trees.'],
  groupNames: ['Defense', 'Traits'],
  iconPath: null,
  id: 'perk.legend_sample',
  perkConstName: 'LegendSample',
  perkName: 'Sample perk',
  placements: [
    {
      categoryName: 'Defense',
      sourceFilePath: 'reference/mod_legends/config/z_perks_tree_defense.nut',
      tier: 2,
      treeAttributes: [],
      treeDescriptions: ['defensive footwork'],
      treeIconPath: null,
      treeId: 'ClothArmorTree',
      treeName: 'Cloth Armor',
    },
    {
      categoryName: 'Traits',
      sourceFilePath: 'reference/mod_legends/config/z_perks_tree_traits.nut',
      tier: 1,
      treeAttributes: [],
      treeDescriptions: ['never gives up'],
      treeIconPath: null,
      treeId: 'TenaciousTree',
      treeName: 'Tenacious',
    },
    {
      categoryName: 'Defense',
      sourceFilePath: 'reference/mod_legends/config/z_perks_tree_defense.nut',
      tier: 3,
      treeAttributes: [],
      treeDescriptions: ['duplicate placement in the same tree'],
      treeIconPath: null,
      treeId: 'ClothArmorTree',
      treeName: 'Cloth Armor',
    },
  ],
  primaryGroupName: 'Defense',
  scenarioSources: [],
  scriptPath: null,
  searchText: 'Sample perk cloth armor tenacious',
  sourceFilePaths: ['reference/mod_legends/config/z_perks_tree_defense.nut'],
}

const overlappingPerk: LegendsPerkRecord = {
  ...samplePerk,
  id: 'perk.legend_overlapping',
  perkConstName: 'LegendOverlapping',
  perkName: 'Overlapping perk',
  placements: [
    {
      ...samplePerk.placements[0],
      categoryName: 'Defense',
      treeId: 'ClothArmorTree',
      treeName: 'Cloth Armor',
    },
    {
      ...samplePerk.placements[1],
      categoryName: 'Magic',
      treeId: 'FaithTree',
      treeName: 'Faith',
    },
  ],
  searchText: 'Overlapping perk cloth armor faith',
}

const repeatedTreeNamePerk: LegendsPerkRecord = {
  ...samplePerk,
  id: 'perk.legend_repeated_tree_name',
  perkConstName: 'LegendRepeatedTreeName',
  perkName: 'Repeated tree name perk',
  placements: [
    {
      ...samplePerk.placements[0],
      categoryName: 'Class',
      treeId: 'ClassBlacksmithTree',
      treeName: 'Blacksmith',
    },
    {
      ...samplePerk.placements[1],
      categoryName: 'Profession',
      treeId: 'ProfessionBlacksmithTree',
      treeName: 'Blacksmith',
    },
  ],
  searchText: 'Repeated tree name perk blacksmith',
}

describe('build planner', () => {
  test('dedupes repeated tree placements when deriving perk group requirements', () => {
    expect(getPerkGroupRequirements(samplePerk)).toEqual([
      {
        categoryName: 'Defense',
        treeId: 'ClothArmorTree',
        treeName: 'Cloth Armor',
      },
      {
        categoryName: 'Traits',
        treeId: 'TenaciousTree',
        treeName: 'Tenacious',
      },
    ])
  })

  test('joins multiple perk group options into one slot label', () => {
    expect(getPerkGroupRequirementLabel(samplePerk)).toBe('Cloth Armor / Tenacious')
  })

  test('disambiguates repeated tree names from different categories', () => {
    expect(
      getPerkGroupRequirementLabel({
        ...samplePerk,
        placements: [
          {
            ...samplePerk.placements[0],
            categoryName: 'Class',
            treeId: 'ClassBlacksmithTree',
            treeName: 'Blacksmith',
          },
          {
            ...samplePerk.placements[1],
            categoryName: 'Profession',
            treeId: 'ProfessionBlacksmithTree',
            treeName: 'Blacksmith',
          },
        ],
      }),
    ).toBe('Class: Blacksmith / Profession: Blacksmith')
  })

  test('falls back cleanly when the perk has no tree placement', () => {
    expect(
      getPerkGroupRequirementLabel({
        ...samplePerk,
        placements: [],
      }),
    ).toBe('No perk group placement')
  })

  test('collapses duplicate group requirements across a picked build while preserving first-seen order', () => {
    expect(getGroupedBuildPerkGroupRequirements([samplePerk, overlappingPerk])).toEqual([
      {
        categoryName: 'Defense',
        perkIds: ['perk.legend_sample', 'perk.legend_overlapping'],
        perkNames: ['Sample perk', 'Overlapping perk'],
        treeId: 'ClothArmorTree',
        treeLabel: 'Cloth Armor',
        treeName: 'Cloth Armor',
      },
      {
        categoryName: 'Traits',
        perkIds: ['perk.legend_sample'],
        perkNames: ['Sample perk'],
        treeId: 'TenaciousTree',
        treeLabel: 'Tenacious',
        treeName: 'Tenacious',
      },
      {
        categoryName: 'Magic',
        perkIds: ['perk.legend_overlapping'],
        perkNames: ['Overlapping perk'],
        treeId: 'FaithTree',
        treeLabel: 'Faith',
        treeName: 'Faith',
      },
    ])
  })

  test('disambiguates grouped build requirements when different categories share a tree name', () => {
    expect(getGroupedBuildPerkGroupRequirements([repeatedTreeNamePerk])).toEqual([
      {
        categoryName: 'Class',
        perkIds: ['perk.legend_repeated_tree_name'],
        perkNames: ['Repeated tree name perk'],
        treeId: 'ClassBlacksmithTree',
        treeLabel: 'Class: Blacksmith',
        treeName: 'Blacksmith',
      },
      {
        categoryName: 'Profession',
        perkIds: ['perk.legend_repeated_tree_name'],
        perkNames: ['Repeated tree name perk'],
        treeId: 'ProfessionBlacksmithTree',
        treeLabel: 'Profession: Blacksmith',
        treeName: 'Blacksmith',
      },
    ])
  })
})
