import { describe, expect, test } from 'vitest'
import { getBuildPlannerGroups } from '../src/lib/build-planner'
import type { LegendsPerkRecord } from '../src/types/legends-perks'

const samplePerk: LegendsPerkRecord = {
  backgroundSources: [],
  descriptionParagraphs: ['Unlocks disciplined movement through several perk groups.'],
  categoryNames: ['Defense', 'Traits'],
  iconPath: 'ui/perks/sample_perk.png',
  id: 'perk.legend_sample',
  perkConstName: 'LegendSample',
  perkName: 'Sample perk',
  placements: [
    {
      categoryName: 'Defense',
      tier: 2,
      perkGroupIconPath: 'ui/perks/cloth_armor_tree.png',
      perkGroupId: 'ClothArmorTree',
      perkGroupName: 'Cloth Armor',
    },
    {
      categoryName: 'Traits',
      tier: 1,
      perkGroupIconPath: 'ui/perks/tenacious_tree.png',
      perkGroupId: 'TenaciousTree',
      perkGroupName: 'Tenacious',
    },
    {
      categoryName: 'Defense',
      tier: 3,
      perkGroupIconPath: 'ui/perks/cloth_armor_tree.png',
      perkGroupId: 'ClothArmorTree',
      perkGroupName: 'Cloth Armor',
    },
  ],
  primaryCategoryName: 'Defense',
  scenarioSources: [],
  searchText: 'Sample perk cloth armor tenacious',
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
      perkGroupId: 'ClothArmorTree',
      perkGroupName: 'Cloth Armor',
    },
    {
      ...samplePerk.placements[1],
      categoryName: 'Magic',
      perkGroupIconPath: 'ui/perks/faith_tree.png',
      perkGroupId: 'FaithTree',
      perkGroupName: 'Faith',
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
      perkGroupId: 'ClothArmorTree',
      perkGroupName: 'Cloth Armor',
    },
    {
      ...samplePerk.placements[1],
      categoryName: 'Traits',
      perkGroupIconPath: 'ui/perks/tenacious_tree.png',
      perkGroupId: 'TenaciousTree',
      perkGroupName: 'Tenacious',
    },
    {
      ...samplePerk.placements[1],
      categoryName: 'Magic',
      perkGroupIconPath: 'ui/perks/faith_tree.png',
      perkGroupId: 'FaithTree',
      perkGroupName: 'Faith',
    },
  ],
  searchText: 'Multi option perk cloth armor tenacious faith',
}

const repeatedPerkGroupNamePerk: LegendsPerkRecord = {
  ...samplePerk,
  id: 'perk.legend_repeated_tree_name',
  perkConstName: 'LegendRepeatedPerkGroupName',
  perkName: 'Repeated perk group name perk',
  placements: [
    {
      ...samplePerk.placements[0],
      categoryName: 'Class',
      perkGroupIconPath: 'ui/perks/blacksmith_class.png',
      perkGroupId: 'ClassBlacksmithTree',
      perkGroupName: 'Blacksmith',
    },
    {
      ...samplePerk.placements[1],
      categoryName: 'Profession',
      perkGroupIconPath: 'ui/perks/blacksmith_profession.png',
      perkGroupId: 'ProfessionBlacksmithTree',
      perkGroupName: 'Blacksmith',
    },
  ],
  searchText: 'Repeated perk group name perk blacksmith',
}

describe('build planner', () => {
  test('places all single-perk matches into the individual row', () => {
    expect(getBuildPlannerGroups([samplePerk])).toEqual({
      individualPerkGroups: [
        {
          perkGroupOptions: [
            {
              categoryName: 'Defense',
              perkGroupIconPath: 'ui/perks/cloth_armor_tree.png',
              perkGroupId: 'ClothArmorTree',
              perkGroupLabel: 'Cloth Armor',
              perkGroupName: 'Cloth Armor',
            },
            {
              categoryName: 'Traits',
              perkGroupIconPath: 'ui/perks/tenacious_tree.png',
              perkGroupId: 'TenaciousTree',
              perkGroupLabel: 'Tenacious',
              perkGroupName: 'Tenacious',
            },
          ],
          perkIds: ['perk.legend_sample'],
          perkNames: ['Sample perk'],
        },
      ],
      sharedPerkGroups: [],
    })
  })

  test('splits shared and individual perk groups by how many picked perks they cover', () => {
    expect(
      getBuildPlannerGroups([samplePerk, matchingSharedCoveragePerk, overlappingPerk]),
    ).toEqual({
      individualPerkGroups: [
        {
          perkGroupOptions: [
            {
              categoryName: 'Magic',
              perkGroupIconPath: 'ui/perks/faith_tree.png',
              perkGroupId: 'FaithTree',
              perkGroupLabel: 'Faith',
              perkGroupName: 'Faith',
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
              perkGroupIconPath: 'ui/perks/cloth_armor_tree.png',
              perkGroupId: 'ClothArmorTree',
              perkGroupLabel: 'Cloth Armor',
              perkGroupName: 'Cloth Armor',
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
              perkGroupIconPath: 'ui/perks/tenacious_tree.png',
              perkGroupId: 'TenaciousTree',
              perkGroupLabel: 'Tenacious',
              perkGroupName: 'Tenacious',
            },
          ],
          perkIds: ['perk.legend_sample', 'perk.legend_matching_shared_coverage'],
          perkNames: ['Sample perk', 'Matching shared coverage perk'],
        },
      ],
    })
  })

  test('merges multiple perk group options when they unlock the same single picked perk', () => {
    expect(getBuildPlannerGroups([multiOptionPerk])).toEqual({
      individualPerkGroups: [
        {
          perkGroupOptions: [
            {
              categoryName: 'Defense',
              perkGroupIconPath: 'ui/perks/cloth_armor_tree.png',
              perkGroupId: 'ClothArmorTree',
              perkGroupLabel: 'Cloth Armor',
              perkGroupName: 'Cloth Armor',
            },
            {
              categoryName: 'Traits',
              perkGroupIconPath: 'ui/perks/tenacious_tree.png',
              perkGroupId: 'TenaciousTree',
              perkGroupLabel: 'Tenacious',
              perkGroupName: 'Tenacious',
            },
            {
              categoryName: 'Magic',
              perkGroupIconPath: 'ui/perks/faith_tree.png',
              perkGroupId: 'FaithTree',
              perkGroupLabel: 'Faith',
              perkGroupName: 'Faith',
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
    expect(getBuildPlannerGroups([repeatedPerkGroupNamePerk])).toEqual({
      individualPerkGroups: [
        {
          perkGroupOptions: [
            {
              categoryName: 'Class',
              perkGroupIconPath: 'ui/perks/blacksmith_class.png',
              perkGroupId: 'ClassBlacksmithTree',
              perkGroupLabel: 'Class: Blacksmith',
              perkGroupName: 'Blacksmith',
            },
            {
              categoryName: 'Profession',
              perkGroupIconPath: 'ui/perks/blacksmith_profession.png',
              perkGroupId: 'ProfessionBlacksmithTree',
              perkGroupLabel: 'Profession: Blacksmith',
              perkGroupName: 'Blacksmith',
            },
          ],
          perkIds: ['perk.legend_repeated_tree_name'],
          perkNames: ['Repeated perk group name perk'],
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
              perkGroupIconPath: null,
              perkGroupId: 'no-perk-group-placement::perk.legend_direct',
              perkGroupLabel: 'No perk group placement',
              perkGroupName: 'No perk group placement',
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
