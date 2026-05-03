import { describe, expect, test } from 'vitest'
import {
  createSavedBuildRecord,
  readSavedBuildRecord,
  sortSavedBuildRecords,
  type SavedBuildPlannerFilters,
} from '../src/lib/saved-builds-storage'

const plannerFilters = {
  categoryFilterMode: 'selection',
  query: 'Calm',
  selectedBackgroundVeteranPerkLevelIntervals: [2, 4],
  selectedCategoryNames: ['Traits'],
  selectedPerkGroupIdsByCategory: {
    Traits: ['CalmTree'],
  },
  shouldAllowBackgroundStudyBook: false,
  shouldAllowBackgroundStudyScroll: true,
  shouldAllowSecondBackgroundStudyScroll: true,
  shouldIncludeAncientScrollPerkGroups: false,
  shouldIncludeOriginBackgrounds: true,
  shouldIncludeOriginPerkGroups: true,
} satisfies SavedBuildPlannerFilters

describe('saved builds storage records', () => {
  test('creates versioned records with normalized names and unique ordered perk ids', () => {
    const savedBuild = createSavedBuildRecord({
      id: 'saved-build-1',
      name: '  Calm   focus  ',
      now: new Date('2026-04-26T10:20:30.000Z'),
      pickedPerkIds: [
        'perk.legend_clarity',
        'perk.legend_perfect_focus',
        'perk.legend_clarity',
        '',
        '   ',
      ],
      referenceVersion: '19.3.21',
    })

    expect(savedBuild).toEqual({
      createdAt: '2026-04-26T10:20:30.000Z',
      id: 'saved-build-1',
      name: 'Calm focus',
      optionalPerkIds: [],
      pickedPerkIds: ['perk.legend_clarity', 'perk.legend_perfect_focus'],
      referenceVersion: '19.3.21',
      schemaVersion: 1,
      updatedAt: '2026-04-26T10:20:30.000Z',
    })
  })

  test('rejects empty builds instead of storing unusable records', () => {
    expect(() =>
      createSavedBuildRecord({
        id: 'saved-build-empty',
        name: 'Empty',
        now: new Date('2026-04-26T10:20:30.000Z'),
        pickedPerkIds: ['', '  '],
        referenceVersion: '19.3.21',
      }),
    ).toThrow('A saved build needs at least one perk.')
  })

  test('stores only optional perks that still belong to the saved build', () => {
    const savedBuild = createSavedBuildRecord({
      id: 'saved-build-optional',
      name: 'Optional build',
      now: new Date('2026-04-26T10:20:30.000Z'),
      optionalPerkIds: [
        'perk.legend_perfect_focus',
        'perk.legend_unknown',
        'perk.legend_perfect_focus',
        ' ',
      ],
      pickedPerkIds: ['perk.legend_clarity', 'perk.legend_perfect_focus'],
      referenceVersion: '19.3.21',
    })

    expect(savedBuild.optionalPerkIds).toEqual(['perk.legend_perfect_focus'])
  })

  test('stores planner filters with new saved builds', () => {
    const savedBuild = createSavedBuildRecord({
      id: 'saved-build-filters',
      name: 'Filtered build',
      now: new Date('2026-04-26T10:20:30.000Z'),
      pickedPerkIds: ['perk.legend_clarity'],
      plannerFilters,
      referenceVersion: '19.3.21',
    })

    expect(savedBuild.plannerFilters).toEqual(plannerFilters)
  })

  test('reads valid records defensively and normalizes recoverable fields', () => {
    expect(
      readSavedBuildRecord({
        createdAt: '2026-04-25T09:00:00.000Z',
        id: ' saved-build-2 ',
        name: '   ',
        optionalPerkIds: [
          'perk.legend_unknown',
          'perk.legend_clarity',
          'perk.legend_clarity',
          12,
          null,
        ],
        pickedPerkIds: ['perk.legend_clarity', 'perk.legend_clarity', 12, null],
        referenceVersion: '19.3.21',
        schemaVersion: 1,
        updatedAt: '2026-04-26T09:00:00.000Z',
      }),
    ).toEqual({
      createdAt: '2026-04-25T09:00:00.000Z',
      id: 'saved-build-2',
      name: 'Untitled build',
      optionalPerkIds: ['perk.legend_clarity'],
      pickedPerkIds: ['perk.legend_clarity'],
      referenceVersion: '19.3.21',
      schemaVersion: 1,
      updatedAt: '2026-04-26T09:00:00.000Z',
    })
  })

  test('keeps legacy saved builds without planner filters loadable', () => {
    const savedBuild = readSavedBuildRecord({
      createdAt: '2026-04-25T09:00:00.000Z',
      id: 'saved-build-legacy',
      name: 'Legacy build',
      optionalPerkIds: [],
      pickedPerkIds: ['perk.legend_clarity'],
      referenceVersion: '19.3.21',
      schemaVersion: 1,
      updatedAt: '2026-04-26T09:00:00.000Z',
    })

    expect(savedBuild?.plannerFilters).toBeUndefined()
    expect(savedBuild?.pickedPerkIds).toEqual(['perk.legend_clarity'])
  })

  test('normalizes recoverable planner filter fields', () => {
    expect(
      readSavedBuildRecord({
        createdAt: '2026-04-25T09:00:00.000Z',
        id: 'saved-build-filter-normalization',
        name: 'Filtered build',
        optionalPerkIds: [],
        pickedPerkIds: ['perk.legend_clarity'],
        plannerFilters: {
          categoryFilterMode: 'missing',
          query: '  Calm   focus  ',
          selectedBackgroundVeteranPerkLevelIntervals: [4, 2, 4, 0, -1, 1.5, '3'],
          selectedCategoryNames: [' Traits ', 'Traits', '', 12],
          selectedPerkGroupIdsByCategory: {
            ' Traits ': [' CalmTree ', 'CalmTree', '', 12],
            ' ': ['IgnoredTree'],
          },
          shouldAllowBackgroundStudyBook: false,
          shouldAllowBackgroundStudyScroll: false,
          shouldAllowSecondBackgroundStudyScroll: true,
          shouldIncludeAncientScrollPerkGroups: false,
          shouldIncludeOriginBackgrounds: true,
          shouldIncludeOriginPerkGroups: true,
        },
        referenceVersion: '19.3.21',
        schemaVersion: 1,
        updatedAt: '2026-04-26T09:00:00.000Z',
      })?.plannerFilters,
    ).toEqual({
      categoryFilterMode: 'selection',
      query: 'Calm focus',
      selectedBackgroundVeteranPerkLevelIntervals: [2, 4],
      selectedCategoryNames: ['Traits'],
      selectedPerkGroupIdsByCategory: {
        Traits: ['CalmTree'],
      },
      shouldAllowBackgroundStudyBook: false,
      shouldAllowBackgroundStudyScroll: false,
      shouldAllowSecondBackgroundStudyScroll: false,
      shouldIncludeAncientScrollPerkGroups: false,
      shouldIncludeOriginBackgrounds: true,
      shouldIncludeOriginPerkGroups: true,
    })
  })

  test('defaults missing planner interval filters without treating them as an empty selection', () => {
    expect(
      readSavedBuildRecord({
        createdAt: '2026-04-25T09:00:00.000Z',
        id: 'saved-build-partial-filter',
        name: 'Partial filter build',
        optionalPerkIds: [],
        pickedPerkIds: ['perk.legend_clarity'],
        plannerFilters: {},
        referenceVersion: '19.3.21',
        schemaVersion: 1,
        updatedAt: '2026-04-26T09:00:00.000Z',
      })?.plannerFilters?.selectedBackgroundVeteranPerkLevelIntervals,
    ).toEqual([2, 3, 4])
  })

  test('drops corrupted or incompatible records', () => {
    const invalidRecords = [
      null,
      {},
      {
        createdAt: '2026-04-25T09:00:00.000Z',
        id: 'saved-build-old-schema',
        name: 'Old',
        pickedPerkIds: ['perk.legend_clarity'],
        referenceVersion: '19.3.21',
        schemaVersion: 0,
        updatedAt: '2026-04-26T09:00:00.000Z',
      },
      {
        createdAt: 'not a date',
        id: 'saved-build-bad-date',
        name: 'Bad date',
        pickedPerkIds: ['perk.legend_clarity'],
        referenceVersion: '19.3.21',
        schemaVersion: 1,
        updatedAt: '2026-04-26T09:00:00.000Z',
      },
      {
        createdAt: '2026-04-25T09:00:00.000Z',
        id: 'saved-build-no-perks',
        name: 'No perks',
        pickedPerkIds: [],
        referenceVersion: '19.3.21',
        schemaVersion: 1,
        updatedAt: '2026-04-26T09:00:00.000Z',
      },
    ]

    expect(invalidRecords.map(readSavedBuildRecord)).toEqual([null, null, null, null, null])
  })

  test('sorts by newest update first with stable name ordering for ties', () => {
    const firstSavedBuild = createSavedBuildRecord({
      id: 'saved-build-1',
      name: 'A build',
      now: new Date('2026-04-25T10:00:00.000Z'),
      pickedPerkIds: ['perk.legend_clarity'],
      referenceVersion: '19.3.21',
    })
    const secondSavedBuild = createSavedBuildRecord({
      id: 'saved-build-2',
      name: 'B build',
      now: new Date('2026-04-26T10:00:00.000Z'),
      pickedPerkIds: ['perk.legend_perfect_focus'],
      referenceVersion: '19.3.21',
    })
    const thirdSavedBuild = createSavedBuildRecord({
      id: 'saved-build-3',
      name: 'C build',
      now: new Date('2026-04-26T10:00:00.000Z'),
      pickedPerkIds: ['perk.legend_steadfast'],
      referenceVersion: '19.3.21',
    })

    expect(sortSavedBuildRecords([firstSavedBuild, thirdSavedBuild, secondSavedBuild])).toEqual([
      secondSavedBuild,
      thirdSavedBuild,
      firstSavedBuild,
    ])
  })
})
