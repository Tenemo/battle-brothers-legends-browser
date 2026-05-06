import { describe, expect, test } from 'vitest'
import legendsBackgroundFitDatasetJson from '../src/data/legends-background-fit.json'
import { buildShareSeoData } from '../src/data/build-share-seo-data.generated'
import { createBuildSharePreviewPayloadFromSearch } from '../src/lib/build-share-preview'
import { createBuildShareSeoPayloadFromSearch } from '../src/lib/build-share-seo'
import type { LegendsBackgroundFitDataset } from '../src/types/legends-perks'

const legendsBackgroundFitDataset = legendsBackgroundFitDatasetJson as LegendsBackgroundFitDataset

const sharedBuildSearchCases = [
  '',
  '?build=Definitely+not+a+perk',
  '?search=clarity&category=Traits&build=Clarity,Perfect+Focus,Clarity',
  '?search=clarity&build=Clarity,Perfect+Focus,Peaceable&optional=Peaceable,Perfect+Focus',
  '?build=Chain+Lightning--perk.legend_chain_lightning,Chain+Lightning--perk.legend_magic_chain_lightning',
  '?build=Meisters%C3%A4nger,Minnes%C3%A4nger',
  '?build=Student,Muscularity,Battle+Forged,Immovable+Object,Brawny,Steadfast,Steel+Brow,Perfect+Fit,Axe+Mastery,Battle+Flow,Balance,Mind+over+Body,Lone+Wolf,Last+Stand,Berserk,Killing+Frenzy,Swagger,Rebound,Hold+Out,Underdog,Assured+Conquest,Colossus,Tactical+Maneuvers,Nine+Lives,Crippling+Strikes,Perfect+Focus&optional=Perfect+Focus,Student',
]

describe('build share SEO', () => {
  test('keeps generated lightweight SEO data in sync with the Legends dataset', () => {
    expect(buildShareSeoData.referenceVersion).toBe(legendsBackgroundFitDataset.referenceVersion)
    expect(buildShareSeoData.perks).toEqual(
      legendsBackgroundFitDataset.perks.map((perk) => ({
        id: perk.id,
        perkName: perk.perkName,
      })),
    )
  })

  test.each(sharedBuildSearchCases)(
    'matches social preview metadata without background fit ranking for %s',
    (search) => {
      const seoPayload = createBuildShareSeoPayloadFromSearch(search)
      const previewPayload = createBuildSharePreviewPayloadFromSearch(search, {
        shouldIncludeTopBackgroundFits: false,
      })

      expect(seoPayload).toEqual({
        canonicalSearch: previewPayload.canonicalSearch,
        description: previewPayload.description,
        imageAlt: previewPayload.imageAlt,
        imagePath: previewPayload.imagePath,
        pickedPerkCount: previewPayload.pickedPerkCount,
        pickedPerks: previewPayload.pickedPerks.map((perk) => ({
          perkName: perk.perkName,
        })),
        referenceVersion: previewPayload.referenceVersion,
        status: previewPayload.status,
        title: previewPayload.title,
      })
    },
  )

  test('keeps document SEO pointed at the rich social image endpoint', () => {
    const seoPayload = createBuildShareSeoPayloadFromSearch(
      '?build=Clarity,Perfect+Focus&optional=Perfect+Focus',
    )
    const socialPreviewPayload = createBuildSharePreviewPayloadFromSearch(
      '?build=Clarity,Perfect+Focus&optional=Perfect+Focus',
    )

    expect(seoPayload.imagePath).toBe(socialPreviewPayload.imagePath)
    expect(socialPreviewPayload.topBackgroundFits.length).toBeGreaterThan(0)
  })
})
