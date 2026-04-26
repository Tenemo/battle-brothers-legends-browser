import legendsPerksDatasetJson from '../data/legends-perks.json'
import type { RankedBackgroundFit } from './background-fit'
import { createBackgroundFitEngine, getGuaranteedCoveredPickedPerkCount } from './background-fit'
import { isOriginBackgroundFit } from './background-origin'
import { buildPerkBrowserBuildUrlSearch, readPerkBrowserUrlState } from './perk-browser-url-state'
import type { LegendsPerkRecord, LegendsPerksDataset } from '../types/legends-perks'

export type BuildSharePreviewPerk = {
  iconPath: string | null
  perkName: string
}

export type BuildSharePreviewBackgroundFit = {
  backgroundName: string
  guaranteedCoveredPickedPerkCount: number
  iconPath: string | null
}

export type BuildSharePreviewPayload = {
  canonicalSearch: string
  description: string
  imageAlt: string
  imagePath: string
  pickedPerkCount: number
  pickedPerks: BuildSharePreviewPerk[]
  referenceVersion: string
  status: 'empty' | 'found'
  title: string
  topBackgroundFits: BuildSharePreviewBackgroundFit[]
}

const legendsPerksDataset = legendsPerksDatasetJson as LegendsPerksDataset
const allPerks = legendsPerksDataset.perks
const allPerksById = new Map(allPerks.map((perk) => [perk.id, perk]))
const backgroundFitEngine = createBackgroundFitEngine(legendsPerksDataset)
const emptyPerkGroupOptionsByGroup = new Map<string, []>()
const buildSocialImagePathPrefix = '/social/builds'
const maxDescriptionPerks = 4
const maxDescriptionBackgrounds = 2
const maxPreviewBackgroundFits = 3

function getPerksFromPickedPerkIds(pickedPerkIds: string[]): LegendsPerkRecord[] {
  return pickedPerkIds.flatMap((pickedPerkId) => {
    const perk = allPerksById.get(pickedPerkId)

    return perk ? [perk] : []
  })
}

function getPickedPerkIdsFromSearch(search: string | URLSearchParams): string[] {
  const urlState = readPerkBrowserUrlState(search.toString(), {
    availableCategoryNames: [],
    perks: allPerks,
    perkGroupOptionsByCategory: emptyPerkGroupOptionsByGroup,
  })

  return urlState.pickedPerkIds
}

function buildShareSearchFromPickedPerkIds(pickedPerkIds: string[]): string {
  return buildPerkBrowserBuildUrlSearch(pickedPerkIds, allPerksById)
}

function formatPerkListForSentence(perkNames: string[], maxVisiblePerks: number): string {
  const visiblePerkNames = perkNames.slice(0, maxVisiblePerks)
  const hiddenPerkCount = perkNames.length - visiblePerkNames.length

  if (visiblePerkNames.length === 0) {
    return ''
  }

  if (hiddenPerkCount <= 0) {
    return visiblePerkNames.join(', ')
  }

  return `${visiblePerkNames.join(', ')}, and ${hiddenPerkCount} more`
}

function createBackgroundFitPreview(
  backgroundFit: RankedBackgroundFit,
): BuildSharePreviewBackgroundFit {
  return {
    backgroundName: backgroundFit.backgroundName,
    guaranteedCoveredPickedPerkCount: getGuaranteedCoveredPickedPerkCount(backgroundFit.matches),
    iconPath: backgroundFit.iconPath,
  }
}

function getTopBackgroundFits(
  rankedBackgroundFits: RankedBackgroundFit[],
): BuildSharePreviewBackgroundFit[] {
  return rankedBackgroundFits
    .filter(
      (backgroundFit) =>
        !isOriginBackgroundFit(backgroundFit) &&
        (backgroundFit.matches.length > 0 ||
          backgroundFit.guaranteedMatchedPerkGroupCount > 0 ||
          backgroundFit.expectedMatchedPerkGroupCount > 0),
    )
    .slice(0, maxPreviewBackgroundFits)
    .map(createBackgroundFitPreview)
}

function createBuildDescription(
  pickedPerks: BuildSharePreviewPerk[],
  topBackgroundFits: BuildSharePreviewBackgroundFit[],
): string {
  const perkSummary = formatPerkListForSentence(
    pickedPerks.map((perk) => perk.perkName),
    maxDescriptionPerks,
  )
  const backgroundSummary = topBackgroundFits
    .slice(0, maxDescriptionBackgrounds)
    .map((backgroundFit) => backgroundFit.backgroundName)
    .join(', ')

  if (backgroundSummary.length === 0) {
    return `Shared Battle Brothers Legends build with ${pickedPerks.length} picked perk${
      pickedPerks.length === 1 ? '' : 's'
    }: ${perkSummary}.`
  }

  return `Shared Battle Brothers Legends build with ${pickedPerks.length} picked perk${
    pickedPerks.length === 1 ? '' : 's'
  }: ${perkSummary}. Top background fits: ${backgroundSummary}.`
}

function createBuildImagePath(canonicalSearch: string): string {
  const searchParams = new URLSearchParams(canonicalSearch)
  const canonicalBuild = searchParams.get('build') ?? ''
  const encodedReference = encodeURIComponent(legendsPerksDataset.referenceVersion)
  const encodedBuild = encodeURIComponent(canonicalBuild)

  return `${buildSocialImagePathPrefix}/${encodedReference}/${encodedBuild}.png`
}

function createBuildSharePreviewPayloadFromPickedPerkIds(
  pickedPerkIds: string[],
): BuildSharePreviewPayload {
  const pickedPerks = getPerksFromPickedPerkIds(pickedPerkIds)

  if (pickedPerks.length === 0) {
    return {
      canonicalSearch: '',
      description: 'Browse the Battle Brothers Legends perk catalog and plan shareable builds.',
      imageAlt: 'Battle Brothers Legends perks browser social preview.',
      imagePath: '/seo/og-image-v2.png',
      pickedPerkCount: 0,
      pickedPerks: [],
      referenceVersion: legendsPerksDataset.referenceVersion,
      status: 'empty',
      title: 'Battle Brothers Legends perks browser',
      topBackgroundFits: [],
    }
  }

  const backgroundFitView = backgroundFitEngine.getBackgroundFitView(pickedPerks)
  const topBackgroundFits = getTopBackgroundFits(backgroundFitView.rankedBackgroundFits)
  const canonicalSearch = buildShareSearchFromPickedPerkIds(
    pickedPerks.map((pickedPerk) => pickedPerk.id),
  )
  const previewPerks = pickedPerks.map((pickedPerk) => ({
    iconPath: pickedPerk.iconPath,
    perkName: pickedPerk.perkName,
  }))
  const title = `Battle Brothers Legends build: ${pickedPerks.length} perk${
    pickedPerks.length === 1 ? '' : 's'
  }`

  return {
    canonicalSearch,
    description: createBuildDescription(previewPerks, topBackgroundFits),
    imageAlt: `${title} with ${formatPerkListForSentence(
      previewPerks.map((perk) => perk.perkName),
      maxDescriptionPerks,
    )}.`,
    imagePath: createBuildImagePath(canonicalSearch),
    pickedPerkCount: pickedPerks.length,
    pickedPerks: previewPerks,
    referenceVersion: legendsPerksDataset.referenceVersion,
    status: 'found',
    title,
    topBackgroundFits,
  }
}

export function createBuildSharePreviewPayloadFromSearch(
  search: string | URLSearchParams,
): BuildSharePreviewPayload {
  return createBuildSharePreviewPayloadFromPickedPerkIds(getPickedPerkIdsFromSearch(search))
}
