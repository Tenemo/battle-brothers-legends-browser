import { describe, expect, test } from 'vitest'
import {
  getBuildPlannerGroups,
  getPerkGroupRequirementLabel,
  getPerkGroupRequirements,
} from '../src/lib/build-planner'
import type { LegendsPerkRecord } from '../src/types/legends-perks'

const samplePerk: LegendsPerkRecord = {
  backgroundSources: [],
  descriptionParagraphs: ['Unlocks disciplined movement through several trees.'],
  groupNames: ['Defense', 'Traits'],
  iconPath: 'ui/perks/sample_perk.png',
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

const matchingSharedCoveragePerk: LegendsPerkRecord = {
  ...samplePerk,
  id: 'perk.legend_matching_shared_coverage',
  perkConstName: 'LegendMatchingSharedCoverage',
  perkName: 'Matching shared coverage perk',
  searchText: 'Matching shared coverage perk cloth armor tenacious',
}

const multiOptionPerk: LegendsPerkRecord = {
  ...samplePerk,
  id: 'perk.legend_multi_option',
  perkConstName: 'LegendMultiOption',
  perkName: 'Multi option perk',
  placements: [
    {
      ...samplePerk.placements[0],
      categoryName: 'Defense',
      treeId: 'ClothArmorTree',
      treeName: 'Cloth Armor',
    },
    {
      ...samplePerk.placements[1],
      categoryName: 'Traits',
      treeIconPath: 'ui/perks/tenacious_tree.png',
      treeId: 'TenaciousTree',
      treeName: 'Tenacious',
    },
    {
      ...samplePerk.placements[1],
      categoryName: 'Magic',
      treeIconPath: 'ui/perks/faith_tree.png',
      treeId: 'FaithTree',
      treeName: 'Faith',
    },
  ],
  searchText: 'Multi option perk cloth armor tenacious faith',
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

  test('joins multiple perk group options into one label', () => {
    expect(getPerkGroupRequirementLabel(samplePerk)).toBe('Cloth Armor / Tenacious')
  })

  test('disambiguates repeated tree names from different categories', () => {
    expect(getPerkGroupRequirementLabel(repeatedTreeNamePerk)).toBe(
      'Class: Blacksmith / Profession: Blacksmith',
    )
  })

  test('falls back cleanly when the perk has no tree placement', () => {
    expect(
      getPerkGroupRequirementLabel({
        ...samplePerk,
        placements: [],
      }),
    ).toBe('No perk group placement')
  })

  test('groups all single-perk matches into the individual row', () => {
    expect(getBuildPlannerGroups([samplePerk])).toEqual({
      individualPerkGroups: [
        {
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
          perkIds: ['perk.legend_sample'],
          perkNames: ['Sample perk'],
        },
      ],
      sharedPerkGroups: [],
    })
  })

  test('splits shared and individual groups by how many picked perks they cover', () => {
    expect(
      getBuildPlannerGroups([samplePerk, matchingSharedCoveragePerk, overlappingPerk]),
    ).toEqual({
      individualPerkGroups: [
        {
          perkGroupOptions: [
            {
              categoryName: 'Magic',
              treeIconPath: 'ui/perks/faith_tree.png',
              treeId: 'FaithTree',
              treeLabel: 'Faith',
              treeName: 'Faith',
            },
          ],
          perkIds: ['perk.legend_overlapping'],
          perkNames: ['Overlapping perk'],
        },
      ],
      sharedPerkGroups: [
        {
          perkGroupOptions: [
            {
              categoryName: 'Defense',
              treeIconPath: 'ui/perks/cloth_armor_tree.png',
              treeId: 'ClothArmorTree',
              treeLabel: 'Cloth Armor',
              treeName: 'Cloth Armor',
            },
          ],
          perkIds: [
            'perk.legend_sample',
            'perk.legend_matching_shared_coverage',
            'perk.legend_overlapping',
          ],
          perkNames: ['Sample perk', 'Matching shared coverage perk', 'Overlapping perk'],
        },
        {
          perkGroupOptions: [
            {
              categoryName: 'Traits',
              treeIconPath: 'ui/perks/tenacious_tree.png',
              treeId: 'TenaciousTree',
              treeLabel: 'Tenacious',
              treeName: 'Tenacious',
            },
          ],
          perkIds: ['perk.legend_sample', 'perk.legend_matching_shared_coverage'],
          perkNames: ['Sample perk', 'Matching shared coverage perk'],
        },
      ],
    })
  })

  test('merges multiple group options when they unlock the same single picked perk', () => {
    expect(getBuildPlannerGroups([multiOptionPerk])).toEqual({
      individualPerkGroups: [
        {
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
            {
              categoryName: 'Magic',
              treeIconPath: 'ui/perks/faith_tree.png',
              treeId: 'FaithTree',
              treeLabel: 'Faith',
              treeName: 'Faith',
            },
          ],
          perkIds: ['perk.legend_multi_option'],
          perkNames: ['Multi option perk'],
        },
      ],
      sharedPerkGroups: [],
    })
  })

  test('keeps disambiguated labels when grouped perk options share the same perk', () => {
    expect(getBuildPlannerGroups([repeatedTreeNamePerk])).toEqual({
      individualPerkGroups: [
        {
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
          perkIds: ['perk.legend_repeated_tree_name'],
          perkNames: ['Repeated tree name perk'],
        },
      ],
      sharedPerkGroups: [],
    })
  })

  test('surfaces perks without any perk-group placement in the individual row', () => {
    expect(
      getBuildPlannerGroups([
        {
          ...samplePerk,
          id: 'perk.legend_direct',
          perkConstName: 'LegendDirect',
          perkName: 'Direct perk',
          placements: [],
        },
      ]),
    ).toEqual({
      individualPerkGroups: [
        {
          perkGroupOptions: [
            {
              categoryName: 'No perk group',
              treeIconPath: null,
              treeId: 'no-perk-group-placement::perk.legend_direct',
              treeLabel: 'No perk group placement',
              treeName: 'No perk group placement',
            },
          ],
          perkIds: ['perk.legend_direct'],
          perkNames: ['Direct perk'],
        },
      ],
      sharedPerkGroups: [],
    })
  })
})
