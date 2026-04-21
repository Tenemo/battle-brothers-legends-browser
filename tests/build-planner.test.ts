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

const matchingAlternativeSetPerk: LegendsPerkRecord = {
  ...samplePerk,
  id: 'perk.legend_matching_alternative_set',
  perkConstName: 'LegendMatchingAlternativeSet',
  perkName: 'Matching alternative set perk',
  searchText: 'Matching alternative set perk cloth armor tenacious',
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

  test('groups a perk alternative set into one slash-separated requirement tile', () => {
    expect(getGroupedBuildPerkGroupRequirements([samplePerk])).toEqual([
      {
        categoryLabel: 'Defense / Traits',
        perkIds: ['perk.legend_sample'],
        perkNames: ['Sample perk'],
        perkGroupOptions: [
          {
            categoryName: 'Defense',
            treeIconPath: 'ui/perks/cloth_armor_tree.png',
            treeId: 'ClothArmorTree',
            treeLabel: 'Cloth Armor',
            treeName: 'Cloth Armor',
          },
          {
            categoryName: 'Traits',
            treeIconPath: 'ui/perks/tenacious_tree.png',
            treeId: 'TenaciousTree',
            treeLabel: 'Tenacious',
            treeName: 'Tenacious',
          },
        ],
        requirementId: 'ClothArmorTree::TenaciousTree',
        treeLabel: 'Cloth Armor / Tenacious',
      },
    ])
  })

  test('collapses identical perk alternative sets across a picked build while preserving first-seen order', () => {
    expect(getGroupedBuildPerkGroupRequirements([samplePerk, matchingAlternativeSetPerk, overlappingPerk])).toEqual([
      {
        categoryLabel: 'Defense / Traits',
        perkIds: ['perk.legend_sample', 'perk.legend_matching_alternative_set'],
        perkNames: ['Sample perk', 'Matching alternative set perk'],
        perkGroupOptions: [
          {
            categoryName: 'Defense',
            treeIconPath: 'ui/perks/cloth_armor_tree.png',
            treeId: 'ClothArmorTree',
            treeLabel: 'Cloth Armor',
            treeName: 'Cloth Armor',
          },
          {
            categoryName: 'Traits',
            treeIconPath: 'ui/perks/tenacious_tree.png',
            treeId: 'TenaciousTree',
            treeLabel: 'Tenacious',
            treeName: 'Tenacious',
          },
        ],
        requirementId: 'ClothArmorTree::TenaciousTree',
        treeLabel: 'Cloth Armor / Tenacious',
      },
      {
        categoryLabel: 'Defense / Magic',
        perkIds: ['perk.legend_overlapping'],
        perkNames: ['Overlapping perk'],
        perkGroupOptions: [
          {
            categoryName: 'Defense',
            treeIconPath: 'ui/perks/cloth_armor_tree.png',
            treeId: 'ClothArmorTree',
            treeLabel: 'Cloth Armor',
            treeName: 'Cloth Armor',
          },
          {
            categoryName: 'Magic',
            treeIconPath: 'ui/perks/faith_tree.png',
            treeId: 'FaithTree',
            treeLabel: 'Faith',
            treeName: 'Faith',
          },
        ],
        requirementId: 'ClothArmorTree::FaithTree',
        treeLabel: 'Cloth Armor / Faith',
      },
    ])
  })

  test('disambiguates grouped build requirement alternatives when different categories share a tree name', () => {
    expect(getGroupedBuildPerkGroupRequirements([repeatedTreeNamePerk])).toEqual([
      {
        categoryLabel: 'Class / Profession',
        perkIds: ['perk.legend_repeated_tree_name'],
        perkNames: ['Repeated tree name perk'],
        perkGroupOptions: [
          {
            categoryName: 'Class',
            treeIconPath: 'ui/perks/blacksmith_class.png',
            treeId: 'ClassBlacksmithTree',
            treeLabel: 'Class: Blacksmith',
            treeName: 'Blacksmith',
          },
          {
            categoryName: 'Profession',
            treeIconPath: 'ui/perks/blacksmith_profession.png',
            treeId: 'ProfessionBlacksmithTree',
            treeLabel: 'Profession: Blacksmith',
            treeName: 'Blacksmith',
          },
        ],
        requirementId: 'ClassBlacksmithTree::ProfessionBlacksmithTree',
        treeLabel: 'Class: Blacksmith / Profession: Blacksmith',
      },
    ])
  })
})
