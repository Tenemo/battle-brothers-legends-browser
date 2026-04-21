import { describe, expect, test } from 'vitest'
import type { LegendsPerkRecord } from '../src/types/legends-perks'
import {
  buildPerkBrowserUrlSearch,
  readPerkBrowserUrlState,
} from '../src/lib/perk-browser-url-state'

const samplePerks: LegendsPerkRecord[] = [
  {
    backgroundSources: [],
    descriptionParagraphs: ['Keep a calm mind.'],
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
    searchText: 'Clarity traits calm',
    sourceFilePaths: ['reference/mod_legends/config/z_perks_tree_traits.nut'],
  },
  {
    backgroundSources: [],
    descriptionParagraphs: ['Maintain peace.'],
    groupNames: ['Traits'],
    iconPath: null,
    id: 'perk.legend_peaceable',
    perkConstName: 'LegendPeaceable',
    perkName: 'Peaceable',
    placements: [
      {
        categoryName: 'Traits',
        sourceFilePath: 'reference/mod_legends/config/z_perks_tree_traits.nut',
        tier: 6,
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
    searchText: 'Peaceable traits calm',
    sourceFilePaths: ['reference/mod_legends/config/z_perks_tree_traits.nut'],
  },
  {
    backgroundSources: [],
    descriptionParagraphs: ['Focus through calm or archery training.'],
    groupNames: ['Traits', 'Magic'],
    iconPath: null,
    id: 'perk.legend_perfect_focus',
    perkConstName: 'LegendPerfectFocus',
    perkName: 'Perfect Focus',
    placements: [
      {
        categoryName: 'Traits',
        sourceFilePath: 'reference/mod_legends/config/z_perks_tree_traits.nut',
        tier: 7,
        treeAttributes: [],
        treeDescriptions: ['is calm'],
        treeIconPath: null,
        treeId: 'CalmTree',
        treeName: 'Calm',
      },
      {
        categoryName: 'Magic',
        sourceFilePath: 'reference/mod_legends/config/z_perks_tree_magic.nut',
        tier: 7,
        treeAttributes: [],
        treeDescriptions: ['archery'],
        treeIconPath: null,
        treeId: 'DeadeyeTree',
        treeName: 'Deadeye',
      },
    ],
    primaryGroupName: 'Traits',
    scenarioSources: [],
    scriptPath: null,
    searchText: 'Perfect Focus traits calm magic deadeye',
    sourceFilePaths: ['reference/mod_legends/config/z_perks_tree_traits.nut'],
  },
]

const availableGroupNames = ['Traits', 'Magic', 'Enemy']
const tierOptions = ['5', '6', '7', 'no-tier']
const treeOptionsByGroup = new Map([
  [
    'Traits',
    [
      { treeId: 'CalmTree', treeName: 'Calm' },
      { treeId: 'ViciousTree', treeName: 'Vicious' },
    ],
  ],
  ['Magic', [{ treeId: 'DeadeyeTree', treeName: 'Deadeye' }]],
  ['Enemy', [{ treeId: 'BeastTree', treeName: 'Beasts' }]],
])
const perksById = new Map(samplePerks.map((perk) => [perk.id, perk]))

describe('perk browser url state', () => {
  test('serializes filters and build into a readable query string', () => {
    const search = buildPerkBrowserUrlSearch(
      {
        pickedPerkIds: ['perk.legend_clarity', 'perk.legend_perfect_focus'],
        query: 'Perfect Focus',
        selectedGroupNames: ['Magic', 'Traits'],
        selectedTreeIdsByGroup: {
          Magic: ['DeadeyeTree'],
          Traits: ['CalmTree'],
        },
        tierValue: '7',
      },
      {
        availableGroupNames,
        perksById,
        treeOptionsByGroup,
      },
    )

    expect(search).toBe(
      '?search=Perfect+Focus&tier=7&category=Traits&category=Magic&group-traits=Calm&group-magic=Deadeye&build=Clarity&build=Perfect+Focus',
    )
  })

  test('parses the readable query string back into filter and build state', () => {
    expect(
      readPerkBrowserUrlState(
        '?search=Perfect+Focus&tier=7&category=Traits&category=Magic&group-traits=Calm&group-magic=Deadeye&build=Clarity&build=Perfect+Focus',
        {
          availableGroupNames,
          perks: samplePerks,
          tierOptions,
          treeOptionsByGroup,
        },
      ),
    ).toEqual({
      pickedPerkIds: ['perk.legend_clarity', 'perk.legend_perfect_focus'],
      query: 'Perfect Focus',
      selectedGroupNames: ['Traits', 'Magic'],
      selectedTreeIdsByGroup: {
        Magic: ['DeadeyeTree'],
        Traits: ['CalmTree'],
      },
      tierValue: '7',
    })
  })

  test('accepts manual url edits with relaxed spacing, hyphens, and duplicate values', () => {
    expect(
      readPerkBrowserUrlState(
        '?category=traits&group-traits=calm&group-traits=calm&build=perfect-focus&build=perfect-focus&build=peaceable&tier=bad-value&search=++Perfect+++Focus++',
        {
          availableGroupNames,
          perks: samplePerks,
          tierOptions,
          treeOptionsByGroup,
        },
      ),
    ).toEqual({
      pickedPerkIds: ['perk.legend_perfect_focus', 'perk.legend_peaceable'],
      query: 'Perfect Focus',
      selectedGroupNames: ['Traits'],
      selectedTreeIdsByGroup: {
        Traits: ['CalmTree'],
      },
      tierValue: 'all-tiers',
    })
  })

  test('omits the query string entirely when nothing needs to be shared', () => {
    expect(
      buildPerkBrowserUrlSearch(
        {
          pickedPerkIds: [],
          query: '',
          selectedGroupNames: [],
          selectedTreeIdsByGroup: {},
          tierValue: 'all-tiers',
        },
        {
          availableGroupNames,
          perksById,
          treeOptionsByGroup,
        },
      ),
    ).toBe('')
  })
})
