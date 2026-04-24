import { describe, expect, test } from 'vitest'
import {
  buildShareSearchFromPickedPerkIds,
  createBuildSharePreviewPayloadFromSearch,
} from '../src/lib/build-share-preview'

describe('build share preview', () => {
  test('returns the empty preview for missing or invalid build params', () => {
    const emptyPayload = createBuildSharePreviewPayloadFromSearch('')

    expect(emptyPayload.status).toBe('empty')
    expect(emptyPayload.imagePath).toBe('/seo/og-image-v2.png')
    expect(createBuildSharePreviewPayloadFromSearch('?build=Definitely+not+a+perk').status).toBe(
      'empty',
    )
  })

  test('normalizes duplicated and noisy shared build urls into build-only metadata', () => {
    const payload = createBuildSharePreviewPayloadFromSearch(
      '?search=clarity&category=Traits&build=Clarity&build=Perfect+Focus&build=Clarity',
    )

    expect(payload.status).toBe('found')
    expect(payload.pickedPerkCount).toBe(2)
    expect(payload.pickedPerks.map((perk) => perk.perkName)).toEqual(['Clarity', 'Perfect Focus'])
    expect(payload.canonicalSearch).toBe('?build=Clarity,Perfect+Focus')
    expect(payload.imagePath).toContain('/social/build.png?')
    expect(payload.imagePath).toContain('build=Clarity%2CPerfect+Focus')
    expect(payload.imagePath).toContain('reference=')
    expect(payload.title).toBe('Battle Brothers Legends build: 2 perks')
    expect(payload.description).toContain('Clarity')
    expect(payload.description).toContain('Perfect Focus')
  })

  test('summarizes shared perk groups and background fits for picked builds', () => {
    const payload = createBuildSharePreviewPayloadFromSearch(
      '?build=Perfect+Focus&build=Peaceable&build=Clarity',
    )

    expect(payload.status).toBe('found')
    expect(payload.sharedGroups.length).toBeGreaterThan(0)
    expect(payload.sharedGroups[0].perkCount).toBeGreaterThanOrEqual(2)
    expect(payload.sharedGroups[0].groupLabel).toBeTruthy()
    expect(payload.topBackgroundFits.length).toBeGreaterThan(0)
    expect(payload.topBackgroundFits[0].backgroundName).toBeTruthy()
    expect(payload.topBackgroundFits[0].maximumTotalGroupCount).toBeGreaterThan(0)
  })

  test('builds the same share search from picked perk ids', () => {
    const payload = createBuildSharePreviewPayloadFromSearch('?build=Clarity&build=Perfect+Focus')

    expect(buildShareSearchFromPickedPerkIds(payload.pickedPerks.map((perk) => perk.id))).toBe(
      payload.canonicalSearch,
    )
  })
})
