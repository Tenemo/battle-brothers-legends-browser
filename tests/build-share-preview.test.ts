import { describe, expect, test } from 'vitest'
import legendsBackgroundFitDatasetJson from '../src/data/legends-background-fit.json'
import {
  createBackgroundFitEngine,
  getGuaranteedCoveredPickedPerkCount,
} from '../src/lib/background-fit'
import { isOriginBackgroundFit } from '../src/lib/background-origin'
import { defaultBackgroundStudyResourceFilter } from '../src/lib/background-study-reachability'
import { createBuildSharePreviewPayloadFromSearch } from '../src/lib/build-share-preview'
import type { LegendsBackgroundFitDataset } from '../src/types/legends-perks'

const legendsBackgroundFitDataset = legendsBackgroundFitDatasetJson as LegendsBackgroundFitDataset
const backgroundFitEngine = createBackgroundFitEngine(legendsBackgroundFitDataset)
const allPerksByName = new Map(
  legendsBackgroundFitDataset.perks.map((perk) => [perk.perkName, perk]),
)

function getRequiredPerkByName(perkName: string) {
  const perk = allPerksByName.get(perkName)

  if (!perk) {
    throw new Error(`Missing perk fixture: ${perkName}`)
  }

  return perk
}

function encodeBuildParam(perkNames: string[]): string {
  return perkNames.map((perkName) => perkName.replaceAll(' ', '+')).join(',')
}

function getExpectedTopBackgroundFits({
  optionalPerkNames = [],
  pickedPerkNames,
}: {
  optionalPerkNames?: string[]
  pickedPerkNames: string[]
}) {
  const pickedPerks = pickedPerkNames.map(getRequiredPerkByName)
  const optionalPickedPerkIds = new Set(
    optionalPerkNames.map((perkName) => getRequiredPerkByName(perkName).id),
  )

  return backgroundFitEngine
    .getBackgroundFitView(pickedPerks, defaultBackgroundStudyResourceFilter, {
      optionalPickedPerkIds,
    })
    .rankedBackgroundFits.filter(
      (backgroundFit) =>
        !isOriginBackgroundFit(backgroundFit) &&
        (backgroundFit.matches.length > 0 ||
          backgroundFit.guaranteedMatchedPerkGroupCount > 0 ||
          backgroundFit.expectedMatchedPerkGroupCount > 0),
    )
    .slice(0, 3)
    .map((backgroundFit) => ({
      backgroundName: backgroundFit.backgroundName,
      expectedCoveredPickedPerkCount: backgroundFit.expectedCoveredPickedPerkCount,
      guaranteedCoveredPickedPerkCount: getGuaranteedCoveredPickedPerkCount(backgroundFit.matches),
      iconPath: backgroundFit.iconPath,
    }))
}

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
      '?search=clarity&category=Traits&build=Clarity,Perfect+Focus,Clarity',
    )

    expect(payload.status).toBe('found')
    expect(payload.pickedPerkCount).toBe(2)
    expect(payload.pickedPerks.map((perk) => perk.perkName)).toEqual(['Clarity', 'Perfect Focus'])
    expect(payload.canonicalSearch).toBe('?build=Clarity,Perfect+Focus')
    expect(payload.imagePath).toBe(
      `/social/builds/${encodeURIComponent(payload.referenceVersion)}/build%3DClarity%2CPerfect%2BFocus.png`,
    )
    expect(payload.title).toBe('Battle Brothers Legends build: 2 perks')
    expect(payload.description).toContain('Clarity')
    expect(payload.description).toContain('Perfect Focus')
  })

  test('keeps optional perks in shared build metadata and social image urls', () => {
    const payload = createBuildSharePreviewPayloadFromSearch(
      '?search=clarity&build=Clarity,Perfect+Focus,Peaceable&optional=Perfect+Focus,Peaceable',
    )

    expect(payload.status).toBe('found')
    expect(payload.canonicalSearch).toBe(
      '?build=Clarity,Perfect+Focus,Peaceable&optional=Perfect+Focus,Peaceable',
    )
    expect(payload.imagePath).toBe(
      `/social/builds/${encodeURIComponent(
        payload.referenceVersion,
      )}/build%3DClarity%2CPerfect%2BFocus%2CPeaceable%26optional%3DPerfect%2BFocus%2CPeaceable.png`,
    )
  })

  test('canonicalizes duplicate-name shared build urls without dropping either perk id', () => {
    const payload = createBuildSharePreviewPayloadFromSearch(
      '?build=Chain+Lightning--perk.legend_chain_lightning,Chain+Lightning--perk.legend_magic_chain_lightning',
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
      )}/build%3DChain%2BLightning--perk.legend_chain_lightning%2CChain%2BLightning--perk.legend_magic_chain_lightning.png`,
    )
  })

  test('fully encodes apostrophes in social image path segments', () => {
    const payload = createBuildSharePreviewPayloadFromSearch('?build=Browbeater%27s+Bludgeon', {
      shouldIncludeTopBackgroundFits: false,
    })

    expect(payload.status).toBe('found')
    expect(payload.canonicalSearch).toBe("?build=Browbeater's+Bludgeon")
    expect(payload.imagePath).toContain('Browbeater%27s%2BBludgeon')
    expect(payload.imagePath).not.toContain("'")
  })

  test('uses a path-keyed social image url for dense shared builds', () => {
    const payload = createBuildSharePreviewPayloadFromSearch(
      '?build=Student,Muscularity,Battle+Forged,Immovable+Object,Brawny,Steadfast,Steel+Brow,Perfect+Fit,Axe+Mastery,Battle+Flow,Balance,Mind+over+Body,Lone+Wolf,Last+Stand,Berserk,Killing+Frenzy,Swagger,Rebound,Hold+Out,Underdog,Assured+Conquest,Colossus,Tactical+Maneuvers,Nine+Lives,Crippling+Strikes,Perfect+Focus',
      {
        shouldIncludeTopBackgroundFits: false,
      },
    )

    expect(payload.status).toBe('found')
    expect(payload.pickedPerkCount).toBe(26)
    expect(payload.imagePath).toMatch(/^\/social\/builds\/[^/]+\/[^/]+\.png$/u)
    expect(payload.imagePath).toContain('%2C')
    expect(payload.imagePath).not.toContain('?')
  })

  test('summarizes background fits in visible background ranking order', () => {
    const pickedPerkNames = ['Perfect Focus', 'Peaceable', 'Clarity']
    const payload = createBuildSharePreviewPayloadFromSearch(
      `?build=${pickedPerkNames.map((perkName) => perkName.replaceAll(' ', '+')).join(',')}`,
    )
    const expectedPreviewBackgroundFits = getExpectedTopBackgroundFits({ pickedPerkNames })

    expect(payload.status).toBe('found')
    expect(payload.topBackgroundFits.length).toBeGreaterThan(0)
    expect(payload.topBackgroundFits[0].backgroundName).toBeTruthy()
    expect(payload.topBackgroundFits[0].expectedCoveredPickedPerkCount).toBeGreaterThan(0)
    expect(payload.topBackgroundFits[0].guaranteedCoveredPickedPerkCount).toBeGreaterThan(0)
    expect(payload.topBackgroundFits).toEqual(
      expectedPreviewBackgroundFits.slice(0, payload.topBackgroundFits.length),
    )
  })

  test('keeps fast social background previews aligned with the full optional-perk ranking', () => {
    const pickedPerkNames = [
      'Pathfinder',
      'Lookout',
      'Keen Eyesight',
      'Dodge',
      'Relentless',
      'Heightened Reflexes',
      'Berserk',
      'Vengeance',
      'Alert',
      'Blacksmiths Technique',
      'Prayer of Hope',
      'Ballistics',
      'Anticipation',
      'Perfect Fit',
      'Brawny',
      'Muscularity',
      'Mind over Body',
    ]
    const optionalPerkNames = [
      'Ballistics',
      'Anticipation',
      'Perfect Fit',
      'Brawny',
      'Muscularity',
      'Mind over Body',
    ]
    const payload = createBuildSharePreviewPayloadFromSearch(
      `?build=${encodeBuildParam(pickedPerkNames)}&optional=${encodeBuildParam(optionalPerkNames)}`,
    )

    expect(payload.topBackgroundFits).toEqual(
      getExpectedTopBackgroundFits({
        optionalPerkNames,
        pickedPerkNames,
      }),
    )
  }, 30_000)

  test('excludes origin-specific backgrounds from shared build social image previews', () => {
    const payload = createBuildSharePreviewPayloadFromSearch(
      '?build=Student,Muscularity,Battle+Forged,Immovable+Object,Brawny,Steadfast,Steel+Brow,Perfect+Fit,Axe+Mastery,Battle+Flow,Balance,Mind+over+Body,Lone+Wolf,Last+Stand,Berserk,Killing+Frenzy,Swagger,Rebound,Hold+Out,Underdog,Assured+Conquest,Colossus,Tactical+Maneuvers,Nine+Lives,Crippling+Strikes,Perfect+Focus',
    )

    expect(
      payload.topBackgroundFits.map((backgroundFit) => backgroundFit.backgroundName),
    ).not.toEqual(expect.arrayContaining(['Companion', 'Berserker', 'Holy Crusader']))
  })
})
