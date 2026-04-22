import { describe, expect, test } from 'vitest'
import {
  getBuildPlannerRecommendation,
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

const matchingAlternativeSetPerk: LegendsPerkRecord = {
  ...samplePerk,
  id: 'perk.legend_matching_alternative_set',
  perkConstName: 'LegendMatchingAlternativeSet',
  perkName: 'Matching alternative set perk',
  searchText: 'Matching alternative set perk cloth armor tenacious',
}

const multiAlternativePerk: LegendsPerkRecord = {
  ...samplePerk,
  id: 'perk.legend_multi_alternative',
  perkConstName: 'LegendMultiAlternative',
  perkName: 'Multi alternative perk',
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
  searchText: 'Multi alternative perk cloth armor tenacious faith',
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

  test('recommends one best-fit perk group and keeps the remaining options as grouped alternatives', () => {
    expect(getBuildPlannerRecommendation([samplePerk])).toEqual({
      alternativeGroups: [
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
          perkIds: ['perk.legend_sample'],
          perkNames: ['Sample perk'],
        },
      ],
      recommendedGroups: [
        {
          categoryName: 'Defense',
          perkIds: ['perk.legend_sample'],
          perkNames: ['Sample perk'],
          treeIconPath: 'ui/perks/cloth_armor_tree.png',
          treeId: 'ClothArmorTree',
          treeLabel: 'Cloth Armor',
          treeName: 'Cloth Armor',
        },
      ],
    })
  })

  test('prefers a shared minimal unlock plan when one perk group can cover the full build', () => {
    expect(
      getBuildPlannerRecommendation([samplePerk, matchingAlternativeSetPerk, overlappingPerk]),
    ).toEqual({
      alternativeGroups: [
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
          perkIds: ['perk.legend_sample', 'perk.legend_matching_alternative_set'],
          perkNames: ['Sample perk', 'Matching alternative set perk'],
        },
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
      recommendedGroups: [
        {
          categoryName: 'Defense',
          perkIds: [
            'perk.legend_sample',
            'perk.legend_matching_alternative_set',
            'perk.legend_overlapping',
          ],
          perkNames: ['Sample perk', 'Matching alternative set perk', 'Overlapping perk'],
          treeIconPath: 'ui/perks/cloth_armor_tree.png',
          treeId: 'ClothArmorTree',
          treeLabel: 'Cloth Armor',
          treeName: 'Cloth Armor',
        },
      ],
    })
  })

  test('merges multiple alternative groups when they unlock the same picked perk set', () => {
    expect(getBuildPlannerRecommendation([multiAlternativePerk])).toEqual({
      alternativeGroups: [
        {
          perkGroupOptions: [
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
          perkIds: ['perk.legend_multi_alternative'],
          perkNames: ['Multi alternative perk'],
        },
      ],
      recommendedGroups: [
        {
          categoryName: 'Defense',
          perkIds: ['perk.legend_multi_alternative'],
          perkNames: ['Multi alternative perk'],
          treeIconPath: 'ui/perks/cloth_armor_tree.png',
          treeId: 'ClothArmorTree',
          treeLabel: 'Cloth Armor',
          treeName: 'Cloth Armor',
        },
      ],
    })
  })

  test('keeps disambiguated labels in the recommended plan and grouped alternatives', () => {
    expect(getBuildPlannerRecommendation([repeatedTreeNamePerk])).toEqual({
      alternativeGroups: [
        {
          perkGroupOptions: [
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
      recommendedGroups: [
        {
          categoryName: 'Class',
          perkIds: ['perk.legend_repeated_tree_name'],
          perkNames: ['Repeated tree name perk'],
          treeIconPath: 'ui/perks/blacksmith_class.png',
          treeId: 'ClassBlacksmithTree',
          treeLabel: 'Class: Blacksmith',
          treeName: 'Blacksmith',
        },
      ],
    })
  })

  test('surfaces perks without any perk-group placement as direct plan items', () => {
    expect(
      getBuildPlannerRecommendation([
        {
          ...samplePerk,
          id: 'perk.legend_direct',
          perkConstName: 'LegendDirect',
          perkName: 'Direct perk',
          placements: [],
        },
      ]),
    ).toEqual({
      alternativeGroups: [],
      recommendedGroups: [
        {
          categoryName: 'No perk group',
          perkIds: ['perk.legend_direct'],
          perkNames: ['Direct perk'],
          treeIconPath: null,
          treeId: 'no-perk-group-placement',
          treeLabel: 'No perk group placement',
          treeName: 'No perk group placement',
        },
      ],
    })
  })
})
