import { describe, expect, test } from 'vitest'
import {
  createSavedBuildRecord,
  readSavedBuildRecord,
  sortSavedBuildRecords,
} from '../src/lib/saved-builds-storage'

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
      referenceVersion: '19.3.17',
    })

    expect(savedBuild).toEqual({
      createdAt: '2026-04-26T10:20:30.000Z',
      id: 'saved-build-1',
      name: 'Calm focus',
      pickedPerkIds: ['perk.legend_clarity', 'perk.legend_perfect_focus'],
      referenceVersion: '19.3.17',
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
        referenceVersion: '19.3.17',
      }),
    ).toThrow('A saved build needs at least one perk.')
  })

  test('reads valid records defensively and normalizes recoverable fields', () => {
    expect(
      readSavedBuildRecord({
        createdAt: '2026-04-25T09:00:00.000Z',
        id: ' saved-build-2 ',
        name: '   ',
        pickedPerkIds: ['perk.legend_clarity', 'perk.legend_clarity', 12, null],
        referenceVersion: '19.3.17',
        schemaVersion: 1,
        updatedAt: '2026-04-26T09:00:00.000Z',
      }),
    ).toEqual({
      createdAt: '2026-04-25T09:00:00.000Z',
      id: 'saved-build-2',
      name: 'Untitled build',
      pickedPerkIds: ['perk.legend_clarity'],
      referenceVersion: '19.3.17',
      schemaVersion: 1,
      updatedAt: '2026-04-26T09:00:00.000Z',
    })
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
        referenceVersion: '19.3.17',
        schemaVersion: 0,
        updatedAt: '2026-04-26T09:00:00.000Z',
      },
      {
        createdAt: 'not a date',
        id: 'saved-build-bad-date',
        name: 'Bad date',
        pickedPerkIds: ['perk.legend_clarity'],
        referenceVersion: '19.3.17',
        schemaVersion: 1,
        updatedAt: '2026-04-26T09:00:00.000Z',
      },
      {
        createdAt: '2026-04-25T09:00:00.000Z',
        id: 'saved-build-no-perks',
        name: 'No perks',
        pickedPerkIds: [],
        referenceVersion: '19.3.17',
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
      referenceVersion: '19.3.17',
    })
    const secondSavedBuild = createSavedBuildRecord({
      id: 'saved-build-2',
      name: 'B build',
      now: new Date('2026-04-26T10:00:00.000Z'),
      pickedPerkIds: ['perk.legend_perfect_focus'],
      referenceVersion: '19.3.17',
    })
    const thirdSavedBuild = createSavedBuildRecord({
      id: 'saved-build-3',
      name: 'C build',
      now: new Date('2026-04-26T10:00:00.000Z'),
      pickedPerkIds: ['perk.legend_steadfast'],
      referenceVersion: '19.3.17',
    })

    expect(sortSavedBuildRecords([firstSavedBuild, thirdSavedBuild, secondSavedBuild])).toEqual([
      secondSavedBuild,
      thirdSavedBuild,
      firstSavedBuild,
    ])
  })
})
