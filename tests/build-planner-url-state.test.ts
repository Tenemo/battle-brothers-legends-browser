import { describe, expect, test } from 'vitest'
import type { LegendsPerkRecord } from '../src/types/legends-perks'
import {
  createBuildPlannerUrlSearch,
  readBuildPlannerUrlState,
} from '../src/lib/build-planner-url-state'

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
        perkGroupIconPath: null,
        perkGroupId: 'CalmTree',
        perkGroupName: 'Calm',
      },
      {
        categoryName: 'Magic',
        tier: 7,
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
const defaultBackgroundStudyUrlState = {
  optionalPerkIds: [],
  selectedBackgroundVeteranPerkLevelIntervals: [2, 3, 4],
  shouldAllowBackgroundStudyBook: true,
  shouldAllowBackgroundStudyScroll: true,
  shouldAllowSecondBackgroundStudyScroll: false,
}
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

describe('build planner url state', () => {
  test('serializes only one perk group with filters and build query params', () => {
    const search = createBuildPlannerUrlSearch(
      {
        pickedPerkIds: ['perk.legend_clarity', 'perk.legend_perfect_focus'],
        query: 'Perfect Focus',
        selectedCategoryNames: ['Magic', 'Traits'],
        selectedPerkGroupIdsByCategory: {
          Magic: ['DeadeyeTree'],
          Traits: ['CalmTree', 'ViciousTree'],
        },
        ...defaultBackgroundStudyUrlState,
        shouldIncludeAncientScrollPerkGroups: true,
        shouldIncludeOriginBackgrounds: false,
        shouldIncludeOriginPerkGroups: false,
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

  test('serializes and restores optional picked perks', () => {
    const search = createBuildPlannerUrlSearch(
      {
        pickedPerkIds: [
          'perk.legend_clarity',
          'perk.legend_perfect_focus',
          'perk.legend_peaceable',
        ],
        query: '',
        selectedCategoryNames: [],
        selectedPerkGroupIdsByCategory: {},
        ...defaultBackgroundStudyUrlState,
        optionalPerkIds: ['perk.legend_perfect_focus', 'perk.legend_peaceable'],
        shouldIncludeAncientScrollPerkGroups: true,
        shouldIncludeOriginBackgrounds: false,
        shouldIncludeOriginPerkGroups: false,
      },
      {
        availableCategoryNames,
        perksById,
        perkGroupOptionsByCategory,
      },
    )

    expect(search).toBe('?build=Clarity,Perfect+Focus,Peaceable&optional=Perfect+Focus,Peaceable')
    expect(
      readBuildPlannerUrlState(search, {
        availableCategoryNames,
        perks: samplePerks,
        perkGroupOptionsByCategory,
      }),
    ).toMatchObject({
      optionalPerkIds: ['perk.legend_perfect_focus', 'perk.legend_peaceable'],
      pickedPerkIds: ['perk.legend_clarity', 'perk.legend_perfect_focus', 'perk.legend_peaceable'],
    })
  })

  test('ignores optional perks that are not in the current build', () => {
    expect(
      readBuildPlannerUrlState('?build=Clarity&optional=Perfect+Focus,Clarity,Missing,Clarity', {
        availableCategoryNames,
        perks: samplePerks,
        perkGroupOptionsByCategory,
      }),
    ).toMatchObject({
      optionalPerkIds: ['perk.legend_clarity'],
      pickedPerkIds: ['perk.legend_clarity'],
    })
  })

  test('parses only one grouped readable perk group param', () => {
    expect(
      readBuildPlannerUrlState(
        '?search=Perfect+Focus&category=Traits,Magic&group-traits=Calm&group-magic=Deadeye&build=Clarity,Perfect+Focus',
        {
          availableCategoryNames,
          perks: samplePerks,
          perkGroupOptionsByCategory,
        },
      ),
    ).toEqual({
      categoryFilterMode: 'selection',
      pickedPerkIds: ['perk.legend_clarity', 'perk.legend_perfect_focus'],
      query: 'Perfect Focus',
      selectedCategoryNames: ['Traits', 'Magic'],
      selectedPerkGroupIdsByCategory: {
        Traits: ['CalmTree'],
      },
      ...defaultBackgroundStudyUrlState,
      shouldIncludeAncientScrollPerkGroups: true,
      shouldIncludeOriginBackgrounds: false,
      shouldIncludeOriginPerkGroups: false,
    })
  })

  test('ignores unknown values, normalizes values, and infers categories from groups', () => {
    expect(
      readBuildPlannerUrlState(
        '?category=traits,missing&group-traits=calm,calm,unknown&group-magic=deadeye&build=perfect-focus,perfect-focus,unknown,peaceable,Clarity&search=++Perfect+++Focus++',
        {
          availableCategoryNames,
          perks: samplePerks,
          perkGroupOptionsByCategory,
        },
      ),
    ).toEqual({
      categoryFilterMode: 'selection',
      pickedPerkIds: ['perk.legend_perfect_focus', 'perk.legend_peaceable', 'perk.legend_clarity'],
      query: 'Perfect Focus',
      selectedCategoryNames: ['Traits'],
      selectedPerkGroupIdsByCategory: {
        Traits: ['CalmTree'],
      },
      ...defaultBackgroundStudyUrlState,
      shouldIncludeAncientScrollPerkGroups: true,
      shouldIncludeOriginBackgrounds: false,
      shouldIncludeOriginPerkGroups: false,
    })
  })

  test('serializes and restores explicit all categories selection', () => {
    const search = createBuildPlannerUrlSearch(
      {
        categoryFilterMode: 'all',
        pickedPerkIds: [],
        query: '',
        selectedCategoryNames: [],
        selectedPerkGroupIdsByCategory: {},
        ...defaultBackgroundStudyUrlState,
        shouldIncludeAncientScrollPerkGroups: true,
        shouldIncludeOriginBackgrounds: false,
        shouldIncludeOriginPerkGroups: false,
      },
      {
        availableCategoryNames,
        perksById,
        perkGroupOptionsByCategory,
      },
    )

    expect(search).toBe('?category=all')
    expect(
      readBuildPlannerUrlState(search, {
        availableCategoryNames,
        perks: samplePerks,
        perkGroupOptionsByCategory,
      }),
    ).toMatchObject({
      categoryFilterMode: 'all',
      selectedCategoryNames: [],
      selectedPerkGroupIdsByCategory: {},
    })
  })

  test('serializes and restores the non-default origin background filter', () => {
    const search = createBuildPlannerUrlSearch(
      {
        pickedPerkIds: [],
        query: '',
        selectedCategoryNames: [],
        selectedPerkGroupIdsByCategory: {},
        ...defaultBackgroundStudyUrlState,
        shouldIncludeAncientScrollPerkGroups: true,
        shouldIncludeOriginBackgrounds: true,
        shouldIncludeOriginPerkGroups: false,
      },
      {
        availableCategoryNames,
        perksById,
        perkGroupOptionsByCategory,
      },
    )

    expect(search).toBe('?origin-backgrounds=true')
    expect(
      readBuildPlannerUrlState(search, {
        availableCategoryNames,
        perks: samplePerks,
        perkGroupOptionsByCategory,
      }).shouldIncludeOriginBackgrounds,
    ).toBe(true)
  })

  test('serializes and restores the non-default origin perk group filter', () => {
    const search = createBuildPlannerUrlSearch(
      {
        pickedPerkIds: [],
        query: '',
        selectedCategoryNames: [],
        selectedPerkGroupIdsByCategory: {},
        ...defaultBackgroundStudyUrlState,
        shouldIncludeAncientScrollPerkGroups: true,
        shouldIncludeOriginBackgrounds: false,
        shouldIncludeOriginPerkGroups: true,
      },
      {
        availableCategoryNames,
        perksById,
        perkGroupOptionsByCategory,
      },
    )

    expect(search).toBe('?origin-perk-groups=true')
    expect(
      readBuildPlannerUrlState(search, {
        availableCategoryNames,
        perks: samplePerks,
        perkGroupOptionsByCategory,
      }).shouldIncludeOriginPerkGroups,
    ).toBe(true)
  })

  test('serializes and restores the non-default disabled ancient scroll perk group filter', () => {
    const search = createBuildPlannerUrlSearch(
      {
        pickedPerkIds: [],
        query: '',
        selectedCategoryNames: [],
        selectedPerkGroupIdsByCategory: {},
        ...defaultBackgroundStudyUrlState,
        shouldIncludeAncientScrollPerkGroups: false,
        shouldIncludeOriginBackgrounds: false,
        shouldIncludeOriginPerkGroups: false,
      },
      {
        availableCategoryNames,
        perksById,
        perkGroupOptionsByCategory,
      },
    )

    expect(search).toBe('?ancient-scroll-perk-groups=false')
    expect(
      readBuildPlannerUrlState(search, {
        availableCategoryNames,
        perks: samplePerks,
        perkGroupOptionsByCategory,
      }).shouldIncludeAncientScrollPerkGroups,
    ).toBe(false)
  })

  test('serializes and restores non-default background study resource filters', () => {
    const search = createBuildPlannerUrlSearch(
      {
        optionalPerkIds: [],
        pickedPerkIds: [],
        query: '',
        selectedCategoryNames: [],
        selectedBackgroundVeteranPerkLevelIntervals: [2, 3, 4],
        selectedPerkGroupIdsByCategory: {},
        shouldAllowBackgroundStudyBook: false,
        shouldAllowBackgroundStudyScroll: true,
        shouldAllowSecondBackgroundStudyScroll: true,
        shouldIncludeAncientScrollPerkGroups: true,
        shouldIncludeOriginBackgrounds: false,
        shouldIncludeOriginPerkGroups: false,
      },
      {
        availableCategoryNames,
        perksById,
        perkGroupOptionsByCategory,
      },
    )

    expect(search).toBe('?background-book=false&background-two-scrolls=true')
    expect(
      readBuildPlannerUrlState(search, {
        availableCategoryNames,
        perks: samplePerks,
        perkGroupOptionsByCategory,
      }),
    ).toMatchObject({
      shouldAllowBackgroundStudyBook: false,
      shouldAllowBackgroundStudyScroll: true,
      shouldAllowSecondBackgroundStudyScroll: true,
    })
  })

  test('serializes and restores background veteran perk interval filters', () => {
    const search = createBuildPlannerUrlSearch(
      {
        optionalPerkIds: [],
        pickedPerkIds: [],
        query: '',
        selectedCategoryNames: [],
        selectedBackgroundVeteranPerkLevelIntervals: [2, 4],
        selectedPerkGroupIdsByCategory: {},
        shouldAllowBackgroundStudyBook: true,
        shouldAllowBackgroundStudyScroll: true,
        shouldAllowSecondBackgroundStudyScroll: false,
        shouldIncludeAncientScrollPerkGroups: true,
        shouldIncludeOriginBackgrounds: false,
        shouldIncludeOriginPerkGroups: false,
      },
      {
        availableCategoryNames,
        availableBackgroundVeteranPerkLevelIntervals: [2, 3, 4],
        perksById,
        perkGroupOptionsByCategory,
      },
    )

    expect(search).toBe('?background-veteran-perks=2,4')
    expect(
      readBuildPlannerUrlState(search, {
        availableCategoryNames,
        availableBackgroundVeteranPerkLevelIntervals: [2, 3, 4],
        perks: samplePerks,
        perkGroupOptionsByCategory,
      }).selectedBackgroundVeteranPerkLevelIntervals,
    ).toEqual([2, 4])
  })

  test('serializes and restores empty background veteran perk interval filters', () => {
    const search = createBuildPlannerUrlSearch(
      {
        optionalPerkIds: [],
        pickedPerkIds: [],
        query: '',
        selectedCategoryNames: [],
        selectedBackgroundVeteranPerkLevelIntervals: [],
        selectedPerkGroupIdsByCategory: {},
        shouldAllowBackgroundStudyBook: true,
        shouldAllowBackgroundStudyScroll: true,
        shouldAllowSecondBackgroundStudyScroll: false,
        shouldIncludeAncientScrollPerkGroups: true,
        shouldIncludeOriginBackgrounds: false,
        shouldIncludeOriginPerkGroups: false,
      },
      {
        availableCategoryNames,
        availableBackgroundVeteranPerkLevelIntervals: [2, 3, 4],
        perksById,
        perkGroupOptionsByCategory,
      },
    )

    expect(search).toBe('?background-veteran-perks=none')
    expect(
      readBuildPlannerUrlState(search, {
        availableCategoryNames,
        availableBackgroundVeteranPerkLevelIntervals: [2, 3, 4],
        perks: samplePerks,
        perkGroupOptionsByCategory,
      }).selectedBackgroundVeteranPerkLevelIntervals,
    ).toEqual([])
  })

  test('treats supplied background veteran perk intervals as the default set', () => {
    const availableBackgroundVeteranPerkLevelIntervals = [2, 3, 4, 5]
    const defaultSearch = createBuildPlannerUrlSearch(
      {
        optionalPerkIds: [],
        pickedPerkIds: [],
        query: '',
        selectedCategoryNames: [],
        selectedBackgroundVeteranPerkLevelIntervals: availableBackgroundVeteranPerkLevelIntervals,
        selectedPerkGroupIdsByCategory: {},
        shouldAllowBackgroundStudyBook: true,
        shouldAllowBackgroundStudyScroll: true,
        shouldAllowSecondBackgroundStudyScroll: false,
        shouldIncludeAncientScrollPerkGroups: true,
        shouldIncludeOriginBackgrounds: false,
        shouldIncludeOriginPerkGroups: false,
      },
      {
        availableCategoryNames,
        availableBackgroundVeteranPerkLevelIntervals,
        perksById,
        perkGroupOptionsByCategory,
      },
    )

    expect(defaultSearch).toBe('')
    expect(
      readBuildPlannerUrlState('', {
        availableCategoryNames,
        availableBackgroundVeteranPerkLevelIntervals,
        perks: samplePerks,
        perkGroupOptionsByCategory,
      }).selectedBackgroundVeteranPerkLevelIntervals,
    ).toEqual(availableBackgroundVeteranPerkLevelIntervals)
    expect(
      readBuildPlannerUrlState('?background-veteran-perks=2,missing,5', {
        availableCategoryNames,
        availableBackgroundVeteranPerkLevelIntervals,
        perks: samplePerks,
        perkGroupOptionsByCategory,
      }).selectedBackgroundVeteranPerkLevelIntervals,
    ).toEqual([2, 5])
  })

  test('normalizes impossible background study scroll combinations', () => {
    const search = createBuildPlannerUrlSearch(
      {
        optionalPerkIds: [],
        pickedPerkIds: [],
        query: '',
        selectedCategoryNames: [],
        selectedBackgroundVeteranPerkLevelIntervals: [2, 3, 4],
        selectedPerkGroupIdsByCategory: {},
        shouldAllowBackgroundStudyBook: false,
        shouldAllowBackgroundStudyScroll: false,
        shouldAllowSecondBackgroundStudyScroll: true,
        shouldIncludeAncientScrollPerkGroups: true,
        shouldIncludeOriginBackgrounds: false,
        shouldIncludeOriginPerkGroups: false,
      },
      {
        availableCategoryNames,
        perksById,
        perkGroupOptionsByCategory,
      },
    )

    expect(search).toBe('?background-book=false&background-scroll=false')
    expect(
      readBuildPlannerUrlState('?background-scroll=false&background-two-scrolls=true', {
        availableCategoryNames,
        perks: samplePerks,
        perkGroupOptionsByCategory,
      }),
    ).toMatchObject({
      shouldAllowBackgroundStudyScroll: false,
      shouldAllowSecondBackgroundStudyScroll: false,
    })
  })

  test('ignores the removed combined origin and ancient scroll perk group filter', () => {
    expect(
      readBuildPlannerUrlState('?origin-scroll-perk-groups=true', {
        availableCategoryNames,
        perks: samplePerks,
        perkGroupOptionsByCategory,
      }),
    ).toMatchObject({
      ...defaultBackgroundStudyUrlState,
      shouldIncludeAncientScrollPerkGroups: true,
      shouldIncludeOriginPerkGroups: false,
    })
  })

  test('serializes duplicate-name build perks with readable stable ids and restores both ids', () => {
    const search = createBuildPlannerUrlSearch(
      {
        pickedPerkIds: ['perk.legend_chain_lightning', 'perk.legend_magic_chain_lightning'],
        query: '',
        selectedCategoryNames: [],
        selectedPerkGroupIdsByCategory: {},
        ...defaultBackgroundStudyUrlState,
        shouldIncludeAncientScrollPerkGroups: true,
        shouldIncludeOriginBackgrounds: false,
        shouldIncludeOriginPerkGroups: false,
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
      readBuildPlannerUrlState(search, {
        availableCategoryNames,
        perks: duplicateNamePerks,
        perkGroupOptionsByCategory,
      }).pickedPerkIds,
    ).toEqual(['perk.legend_chain_lightning', 'perk.legend_magic_chain_lightning'])
  })

  test('omits the query string entirely when only default state needs to be shared', () => {
    expect(
      createBuildPlannerUrlSearch(
        {
          pickedPerkIds: [],
          query: '',
          selectedCategoryNames: [],
          selectedPerkGroupIdsByCategory: {},
          ...defaultBackgroundStudyUrlState,
          shouldIncludeAncientScrollPerkGroups: true,
          shouldIncludeOriginBackgrounds: false,
          shouldIncludeOriginPerkGroups: false,
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
