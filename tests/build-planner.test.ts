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
      treeIconPath: 'ui/perks/cloth_armor_tree.png',
      treeId: 'ClothArmorTree',
      treeName: 'Cloth Armor',
    },
    {
      categoryName: 'Traits',
      sourceFilePath: 'reference/mod_legends/config/z_perks_tree_traits.nut',
      tier: 1,
      treeAttributes: [],
      treeDescriptions: ['never gives up'],
      treeIconPath: 'ui/perks/tenacious_tree.png',
      treeId: 'TenaciousTree',
      treeName: 'Tenacious',
    },
    {
      categoryName: 'Defense',
      sourceFilePath: 'reference/mod_legends/config/z_perks_tree_defense.nut',
      tier: 3,
      treeAttributes: [],
      treeDescriptions: ['duplicate placement in the same tree'],
      treeIconPath: 'ui/perks/cloth_armor_tree.png',
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
      treeIconPath: 'ui/perks/faith_tree.png',
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
      treeIconPath: 'ui/perks/blacksmith_class.png',
      treeId: 'ClassBlacksmithTree',
      treeName: 'Blacksmith',
    },
    {
      ...samplePerk.placements[1],
      categoryName: 'Profession',
      treeIconPath: 'ui/perks/blacksmith_profession.png',
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
        treeIconPath: 'ui/perks/cloth_armor_tree.png',
        treeId: 'ClothArmorTree',
        treeName: 'Cloth Armor',
      },
      {
        categoryName: 'Traits',
        treeIconPath: 'ui/perks/tenacious_tree.png',
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
        treeIconPath: 'ui/perks/cloth_armor_tree.png',
        treeId: 'ClothArmorTree',
        treeLabel: 'Cloth Armor',
        treeName: 'Cloth Armor',
      },
      {
        categoryName: 'Traits',
        perkIds: ['perk.legend_sample'],
        perkNames: ['Sample perk'],
        treeIconPath: 'ui/perks/tenacious_tree.png',
        treeId: 'TenaciousTree',
        treeLabel: 'Tenacious',
        treeName: 'Tenacious',
      },
      {
        categoryName: 'Magic',
        perkIds: ['perk.legend_overlapping'],
        perkNames: ['Overlapping perk'],
        treeIconPath: 'ui/perks/faith_tree.png',
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
        treeIconPath: 'ui/perks/blacksmith_class.png',
        treeId: 'ClassBlacksmithTree',
        treeLabel: 'Class: Blacksmith',
        treeName: 'Blacksmith',
      },
      {
        categoryName: 'Profession',
        perkIds: ['perk.legend_repeated_tree_name'],
        perkNames: ['Repeated tree name perk'],
        treeIconPath: 'ui/perks/blacksmith_profession.png',
        treeId: 'ProfessionBlacksmithTree',
        treeLabel: 'Profession: Blacksmith',
        treeName: 'Blacksmith',
      },
    ])
  })
})
