import { describe, expect, test } from 'vitest'
import { createBuildSharePreviewPayloadFromSearch } from '../src/lib/build-share-preview'

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
    expect(payload.imagePath).toBe(
      `/social/builds/${encodeURIComponent(payload.referenceVersion)}/Clarity%2CPerfect%20Focus.png`,
    )
    expect(payload.title).toBe('Battle Brothers Legends build: 2 perks')
    expect(payload.description).toContain('Clarity')
    expect(payload.description).toContain('Perfect Focus')
  })

  test('canonicalizes duplicate-name shared build urls without dropping either perk id', () => {
    const payload = createBuildSharePreviewPayloadFromSearch(
      '?build=Chain+Lightning--perk.legend_chain_lightning&build=Chain+Lightning--perk.legend_magic_chain_lightning',
    )

    expect(payload.status).toBe('found')
    expect(payload.pickedPerkCount).toBe(2)
    expect(payload.pickedPerks.map((perk) => perk.perkName)).toEqual([
      'Chain Lightning',
      'Chain Lightning',
    ])
    expect(payload.canonicalSearch).toBe(
      '?build=Chain+Lightning--perk.legend_chain_lightning,Chain+Lightning--perk.legend_magic_chain_lightning',
    )
    expect(payload.imagePath).toBe(
      `/social/builds/${encodeURIComponent(
        payload.referenceVersion,
      )}/Chain%20Lightning--perk.legend_chain_lightning%2CChain%20Lightning--perk.legend_magic_chain_lightning.png`,
    )
  })

  test('uses a path-keyed social image url for dense shared builds', () => {
    const payload = createBuildSharePreviewPayloadFromSearch(
      '?build=Student,Muscularity,Battle+Forged,Immovable+Object,Brawny,Steadfast,Steel+Brow,Perfect+Fit,Axe+Mastery,Battle+Flow,Balance,Mind+over+Body,Lone+Wolf,Last+Stand,Berserk,Killing+Frenzy,Swagger,Rebound,Hold+Out,Underdog,Assured+Conquest,Colossus,Tactical+Maneuvers,Nine+Lives,Crippling+Strikes,Perfect+Focus',
    )

    expect(payload.status).toBe('found')
    expect(payload.pickedPerkCount).toBe(26)
    expect(payload.imagePath).toMatch(/^\/social\/builds\/[^/]+\/[^/]+\.png$/u)
    expect(payload.imagePath).toContain('%2C')
    expect(payload.imagePath).not.toContain('?')
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
})
