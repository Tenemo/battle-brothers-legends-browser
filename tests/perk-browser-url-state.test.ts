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
    searchText: 'Clarity traits calm',
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
    searchText: 'Peaceable traits calm',
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
        tier: 7,
        treeAttributes: [],
        treeDescriptions: ['is calm'],
        treeIconPath: null,
        treeId: 'CalmTree',
        treeName: 'Calm',
      },
      {
        categoryName: 'Magic',
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
    searchText: 'Perfect Focus traits calm magic deadeye',
  },
]

const availableGroupNames = ['Traits', 'Magic', 'Enemy']
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
const duplicateNamePerks: LegendsPerkRecord[] = [
  ...samplePerks,
  {
    ...samplePerks[0],
    groupNames: ['Magic'],
    id: 'perk.legend_chain_lightning',
    perkConstName: 'LegendChainLightning',
    perkName: 'Chain Lightning',
    primaryGroupName: 'Magic',
    searchText: 'Chain Lightning magic evocation',
  },
  {
    ...samplePerks[0],
    groupNames: ['Other'],
    id: 'perk.legend_magic_chain_lightning',
    perkConstName: 'LegendMagicChainLightning',
    perkName: 'Chain Lightning',
    placements: [],
    primaryGroupName: 'Other',
    searchText: 'Chain Lightning other spell',
  },
]
const duplicateNamePerksById = new Map(duplicateNamePerks.map((perk) => [perk.id, perk]))

describe('perk browser url state', () => {
  test('serializes filters and build into grouped readable query params', () => {
    const search = buildPerkBrowserUrlSearch(
      {
        pickedPerkIds: ['perk.legend_clarity', 'perk.legend_perfect_focus'],
        query: 'Perfect Focus',
        selectedGroupNames: ['Magic', 'Traits'],
        selectedTreeIdsByGroup: {
          Magic: ['DeadeyeTree'],
          Traits: ['CalmTree'],
        },
      },
      {
        availableGroupNames,
        perksById,
        treeOptionsByGroup,
      },
    )

    expect(search).toBe(
      '?search=Perfect+Focus&category=Traits,Magic&group-traits=Calm&group-magic=Deadeye&build=Clarity,Perfect+Focus',
    )
  })

  test('parses the grouped readable query params', () => {
    expect(
      readPerkBrowserUrlState(
        '?search=Perfect+Focus&category=Traits,Magic&group-traits=Calm&group-magic=Deadeye&build=Clarity,Perfect+Focus',
        {
          availableGroupNames,
          perks: samplePerks,
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
    })
  })

  test('ignores unknown values, normalizes values, and infers categories from groups', () => {
    expect(
      readPerkBrowserUrlState(
        '?category=traits,missing&group-traits=calm,calm,unknown&group-magic=deadeye&build=perfect-focus,perfect-focus,unknown,peaceable,Clarity&search=++Perfect+++Focus++',
        {
          availableGroupNames,
          perks: samplePerks,
          treeOptionsByGroup,
        },
      ),
    ).toEqual({
      pickedPerkIds: ['perk.legend_perfect_focus', 'perk.legend_peaceable', 'perk.legend_clarity'],
      query: 'Perfect Focus',
      selectedGroupNames: ['Traits', 'Magic'],
      selectedTreeIdsByGroup: {
        Traits: ['CalmTree'],
        Magic: ['DeadeyeTree'],
      },
    })
  })

  test('serializes duplicate-name build perks with readable stable ids and restores both ids', () => {
    const search = buildPerkBrowserUrlSearch(
      {
        pickedPerkIds: ['perk.legend_chain_lightning', 'perk.legend_magic_chain_lightning'],
        query: '',
        selectedGroupNames: [],
        selectedTreeIdsByGroup: {},
      },
      {
        availableGroupNames,
        perksById: duplicateNamePerksById,
        treeOptionsByGroup,
      },
    )

    expect(search).toBe(
      '?build=Chain+Lightning--perk.legend_chain_lightning,Chain+Lightning--perk.legend_magic_chain_lightning',
    )
    expect(
      readPerkBrowserUrlState(search, {
        availableGroupNames,
        perks: duplicateNamePerks,
        treeOptionsByGroup,
      }).pickedPerkIds,
    ).toEqual(['perk.legend_chain_lightning', 'perk.legend_magic_chain_lightning'])
  })

  test('omits the query string entirely when nothing needs to be shared', () => {
    expect(
      buildPerkBrowserUrlSearch(
        {
          pickedPerkIds: [],
          query: '',
          selectedGroupNames: [],
          selectedTreeIdsByGroup: {},
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
