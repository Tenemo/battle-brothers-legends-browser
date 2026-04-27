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
    categoryNames: ['Traits'],
    iconPath: null,
    id: 'perk.legend_clarity',
    perkConstName: 'LegendClarity',
    perkName: 'Clarity',
    placements: [
      {
        categoryName: 'Traits',
        tier: 5,
        perkGroupAttributes: [],
        perkGroupDescriptions: ['is calm'],
        perkGroupIconPath: null,
        perkGroupId: 'CalmTree',
        perkGroupName: 'Calm',
      },
    ],
    primaryCategoryName: 'Traits',
    scenarioSources: [],
    searchText: 'Clarity traits calm',
  },
  {
    backgroundSources: [],
    descriptionParagraphs: ['Maintain peace.'],
    categoryNames: ['Traits'],
    iconPath: null,
    id: 'perk.legend_peaceable',
    perkConstName: 'LegendPeaceable',
    perkName: 'Peaceable',
    placements: [
      {
        categoryName: 'Traits',
        tier: 6,
        perkGroupAttributes: [],
        perkGroupDescriptions: ['is calm'],
        perkGroupIconPath: null,
        perkGroupId: 'CalmTree',
        perkGroupName: 'Calm',
      },
    ],
    primaryCategoryName: 'Traits',
    scenarioSources: [],
    searchText: 'Peaceable traits calm',
  },
  {
    backgroundSources: [],
    descriptionParagraphs: ['Focus through calm or archery training.'],
    categoryNames: ['Traits', 'Magic'],
    iconPath: null,
    id: 'perk.legend_perfect_focus',
    perkConstName: 'LegendPerfectFocus',
    perkName: 'Perfect Focus',
    placements: [
      {
        categoryName: 'Traits',
        tier: 7,
        perkGroupAttributes: [],
        perkGroupDescriptions: ['is calm'],
        perkGroupIconPath: null,
        perkGroupId: 'CalmTree',
        perkGroupName: 'Calm',
      },
      {
        categoryName: 'Magic',
        tier: 7,
        perkGroupAttributes: [],
        perkGroupDescriptions: ['archery'],
        perkGroupIconPath: null,
        perkGroupId: 'DeadeyeTree',
        perkGroupName: 'Deadeye',
      },
    ],
    primaryCategoryName: 'Traits',
    scenarioSources: [],
    searchText: 'Perfect Focus traits calm magic deadeye',
  },
]

const availableCategoryNames = ['Traits', 'Magic', 'Enemy']
const perkGroupOptionsByCategory = new Map([
  [
    'Traits',
    [
      { perkGroupId: 'CalmTree', perkGroupName: 'Calm' },
      { perkGroupId: 'ViciousTree', perkGroupName: 'Vicious' },
    ],
  ],
  ['Magic', [{ perkGroupId: 'DeadeyeTree', perkGroupName: 'Deadeye' }]],
  ['Enemy', [{ perkGroupId: 'BeastTree', perkGroupName: 'Beasts' }]],
])
const perksById = new Map(samplePerks.map((perk) => [perk.id, perk]))
const duplicateNamePerks: LegendsPerkRecord[] = [
  ...samplePerks,
  {
    ...samplePerks[0],
    categoryNames: ['Magic'],
    id: 'perk.legend_chain_lightning',
    perkConstName: 'LegendChainLightning',
    perkName: 'Chain Lightning',
    primaryCategoryName: 'Magic',
    searchText: 'Chain Lightning magic evocation',
  },
  {
    ...samplePerks[0],
    categoryNames: ['Other'],
    id: 'perk.legend_magic_chain_lightning',
    perkConstName: 'LegendMagicChainLightning',
    perkName: 'Chain Lightning',
    placements: [],
    primaryCategoryName: 'Other',
    searchText: 'Chain Lightning other spell',
  },
]
const duplicateNamePerksById = new Map(duplicateNamePerks.map((perk) => [perk.id, perk]))

describe('perk browser url state', () => {
  test('serializes only one perk group with filters and build query params', () => {
    const search = buildPerkBrowserUrlSearch(
      {
        pickedPerkIds: ['perk.legend_clarity', 'perk.legend_perfect_focus'],
        query: 'Perfect Focus',
        selectedCategoryNames: ['Magic', 'Traits'],
        selectedPerkGroupIdsByCategory: {
          Magic: ['DeadeyeTree'],
          Traits: ['CalmTree', 'ViciousTree'],
        },
        shouldIncludeOriginBackgrounds: true,
      },
      {
        availableCategoryNames,
        perksById,
        perkGroupOptionsByCategory,
      },
    )

    expect(search).toBe(
      '?search=Perfect+Focus&category=Traits,Magic&group-traits=Calm&build=Clarity,Perfect+Focus',
    )
  })

  test('parses only one grouped readable perk group param', () => {
    expect(
      readPerkBrowserUrlState(
        '?search=Perfect+Focus&category=Traits,Magic&group-traits=Calm&group-magic=Deadeye&build=Clarity,Perfect+Focus',
        {
          availableCategoryNames,
          perks: samplePerks,
          perkGroupOptionsByCategory,
        },
      ),
    ).toEqual({
      pickedPerkIds: ['perk.legend_clarity', 'perk.legend_perfect_focus'],
      query: 'Perfect Focus',
      selectedCategoryNames: ['Traits', 'Magic'],
      selectedPerkGroupIdsByCategory: {
        Traits: ['CalmTree'],
      },
      shouldIncludeOriginBackgrounds: true,
    })
  })

  test('ignores unknown values, normalizes values, and infers categories from groups', () => {
    expect(
      readPerkBrowserUrlState(
        '?category=traits,missing&group-traits=calm,calm,unknown&group-magic=deadeye&build=perfect-focus,perfect-focus,unknown,peaceable,Clarity&search=++Perfect+++Focus++',
        {
          availableCategoryNames,
          perks: samplePerks,
          perkGroupOptionsByCategory,
        },
      ),
    ).toEqual({
      pickedPerkIds: ['perk.legend_perfect_focus', 'perk.legend_peaceable', 'perk.legend_clarity'],
      query: 'Perfect Focus',
      selectedCategoryNames: ['Traits'],
      selectedPerkGroupIdsByCategory: {
        Traits: ['CalmTree'],
      },
      shouldIncludeOriginBackgrounds: true,
    })
  })

  test('serializes and restores the non-default origin background filter', () => {
    const search = buildPerkBrowserUrlSearch(
      {
        pickedPerkIds: [],
        query: '',
        selectedCategoryNames: [],
        selectedPerkGroupIdsByCategory: {},
        shouldIncludeOriginBackgrounds: false,
      },
      {
        availableCategoryNames,
        perksById,
        perkGroupOptionsByCategory,
      },
    )

    expect(search).toBe('?origin-backgrounds=false')
    expect(
      readPerkBrowserUrlState(search, {
        availableCategoryNames,
        perks: samplePerks,
        perkGroupOptionsByCategory,
      }).shouldIncludeOriginBackgrounds,
    ).toBe(false)
  })

  test('serializes duplicate-name build perks with readable stable ids and restores both ids', () => {
    const search = buildPerkBrowserUrlSearch(
      {
        pickedPerkIds: ['perk.legend_chain_lightning', 'perk.legend_magic_chain_lightning'],
        query: '',
        selectedCategoryNames: [],
        selectedPerkGroupIdsByCategory: {},
        shouldIncludeOriginBackgrounds: true,
      },
      {
        availableCategoryNames,
        perksById: duplicateNamePerksById,
        perkGroupOptionsByCategory,
      },
    )

    expect(search).toBe(
      '?build=Chain+Lightning--perk.legend_chain_lightning,Chain+Lightning--perk.legend_magic_chain_lightning',
    )
    expect(
      readPerkBrowserUrlState(search, {
        availableCategoryNames,
        perks: duplicateNamePerks,
        perkGroupOptionsByCategory,
      }).pickedPerkIds,
    ).toEqual(['perk.legend_chain_lightning', 'perk.legend_magic_chain_lightning'])
  })

  test('omits the query string entirely when only default state needs to be shared', () => {
    expect(
      buildPerkBrowserUrlSearch(
        {
          pickedPerkIds: [],
          query: '',
          selectedCategoryNames: [],
          selectedPerkGroupIdsByCategory: {},
          shouldIncludeOriginBackgrounds: true,
        },
        {
          availableCategoryNames,
          perksById,
          perkGroupOptionsByCategory,
        },
      ),
    ).toBe('')
  })
})
