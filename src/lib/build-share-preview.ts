import legendsBackgroundFitDatasetJson from '../data/legends-background-fit.json'
import type { RankedBackgroundFit } from './background-fit'
import { createBackgroundFitEngine, getGuaranteedCoveredPickedPerkCount } from './background-fit'
import { isOriginBackgroundFit } from './background-origin'
import { createSharedBuildUrlSearch, readBuildPlannerUrlState } from './build-planner-url-state'
import { defaultBackgroundStudyResourceFilter } from './background-study-reachability'
import type {
  LegendsBuildSharePreviewPerkRecord,
  LegendsBackgroundFitDataset,
} from '../types/legends-perks'

export type BuildSharePreviewPerk = {
  iconPath: string | null
  perkName: string
}

export type BuildSharePreviewBackgroundFit = {
  backgroundName: string
  expectedCoveredPickedPerkCount: number
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

export type BuildSharePreviewOptions = {
  shouldIncludeTopBackgroundFits?: boolean
}

const legendsBackgroundFitDataset = legendsBackgroundFitDatasetJson as LegendsBackgroundFitDataset
const allPerks = legendsBackgroundFitDataset.perks
const allPerksById = new Map(allPerks.map((perk) => [perk.id, perk]))
const backgroundFitEngine = createBackgroundFitEngine(legendsBackgroundFitDataset)
const emptyPerkGroupOptionsByGroup = new Map<string, []>()
const buildSocialImagePathPrefix = '/social/builds'
const maxDescriptionPerks = 4
const maxDescriptionBackgrounds = 2
const maxPreviewBackgroundFits = 3
export const maxBuildSharePreviewTopBackgroundFitCacheEntries = 128
const topBackgroundFitsByCanonicalSearch = new Map<string, BuildSharePreviewBackgroundFit[]>()

type BuildSharePreviewBuildState = {
  optionalPerkIds: string[]
  pickedPerkIds: string[]
}

function getPerksFromPickedPerkIds(
  pickedPerkIds: string[],
): LegendsBuildSharePreviewPerkRecord[] {
  return pickedPerkIds.flatMap((pickedPerkId) => {
    const perk = allPerksById.get(pickedPerkId)

    return perk ? [perk] : []
  })
}

function getBuildStateFromSearch(search: string | URLSearchParams): BuildSharePreviewBuildState {
  const urlState = readBuildPlannerUrlState(search.toString(), {
    availableCategoryNames: [],
    perks: allPerks,
    perkGroupOptionsByCategory: emptyPerkGroupOptionsByGroup,
  })

  return {
    optionalPerkIds: urlState.optionalPerkIds,
    pickedPerkIds: urlState.pickedPerkIds,
  }
}

function buildShareSearchFromPickedPerkIds(
  pickedPerkIds: string[],
  optionalPerkIds: string[],
): string {
  return createSharedBuildUrlSearch(pickedPerkIds, allPerksById, optionalPerkIds)
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
    expectedCoveredPickedPerkCount: backgroundFit.expectedCoveredPickedPerkCount,
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

function copyTopBackgroundFits(
  topBackgroundFits: readonly BuildSharePreviewBackgroundFit[],
): BuildSharePreviewBackgroundFit[] {
  return topBackgroundFits.map((backgroundFit) => ({ ...backgroundFit }))
}

function getCachedTopBackgroundFits({
  availableOptionalPerkIds,
  canonicalSearch,
  pickedPerks,
}: {
  availableOptionalPerkIds: string[]
  canonicalSearch: string
  pickedPerks: LegendsBuildSharePreviewPerkRecord[]
}): BuildSharePreviewBackgroundFit[] {
  const cachedTopBackgroundFits = topBackgroundFitsByCanonicalSearch.get(canonicalSearch)

  if (cachedTopBackgroundFits) {
    topBackgroundFitsByCanonicalSearch.delete(canonicalSearch)
    topBackgroundFitsByCanonicalSearch.set(canonicalSearch, cachedTopBackgroundFits)

    return copyTopBackgroundFits(cachedTopBackgroundFits)
  }

  const topBackgroundFits = getTopBackgroundFits(
    backgroundFitEngine.getBackgroundFitView(pickedPerks, defaultBackgroundStudyResourceFilter, {
      optionalPickedPerkIds: new Set(availableOptionalPerkIds),
    }).rankedBackgroundFits,
  )

  topBackgroundFitsByCanonicalSearch.set(canonicalSearch, copyTopBackgroundFits(topBackgroundFits))

  if (
    topBackgroundFitsByCanonicalSearch.size > maxBuildSharePreviewTopBackgroundFitCacheEntries
  ) {
    const oldestCanonicalSearch = topBackgroundFitsByCanonicalSearch.keys().next().value

    if (oldestCanonicalSearch !== undefined) {
      topBackgroundFitsByCanonicalSearch.delete(oldestCanonicalSearch)
    }
  }

  return copyTopBackgroundFits(topBackgroundFits)
}

export function clearBuildSharePreviewCache(): void {
  topBackgroundFitsByCanonicalSearch.clear()
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
  const canonicalOptionalPerks = searchParams.get('optional') ?? ''
  const encodedReference = encodeURIComponent(legendsBackgroundFitDataset.referenceVersion)
  const encodedBuild = encodeURIComponent(canonicalBuild)
  const optionalPerksSearch = canonicalOptionalPerks
    ? `?optional=${encodeURIComponent(canonicalOptionalPerks)}`
    : ''

  return `${buildSocialImagePathPrefix}/${encodedReference}/${encodedBuild}.png${optionalPerksSearch}`
}

function createBuildSharePreviewPayloadFromPickedPerkIds(
  pickedPerkIds: string[],
  optionalPerkIds: string[],
  { shouldIncludeTopBackgroundFits = true }: BuildSharePreviewOptions = {},
): BuildSharePreviewPayload {
  const pickedPerks = getPerksFromPickedPerkIds(pickedPerkIds)
  const availablePickedPerkIds = pickedPerks.map((pickedPerk) => pickedPerk.id)
  const availablePickedPerkIdSet = new Set(pickedPerks.map((pickedPerk) => pickedPerk.id))
  const availableOptionalPerkIdSet = new Set(
    optionalPerkIds.filter((optionalPerkId) => availablePickedPerkIdSet.has(optionalPerkId)),
  )
  const availableOptionalPerkIds = availablePickedPerkIds.filter((pickedPerkId) =>
    availableOptionalPerkIdSet.has(pickedPerkId),
  )

  if (pickedPerks.length === 0) {
    return {
      canonicalSearch: '',
      description: 'Browse the Battle Brothers Legends perk catalog and plan shareable builds.',
      imageAlt: 'Battle Brothers Legends build planner social preview.',
      imagePath: '/seo/og-image-v2.png',
      pickedPerkCount: 0,
      pickedPerks: [],
      referenceVersion: legendsBackgroundFitDataset.referenceVersion,
      status: 'empty',
      title: 'Battle Brothers Legends build planner',
      topBackgroundFits: [],
    }
  }

  const canonicalSearch = buildShareSearchFromPickedPerkIds(
    availablePickedPerkIds,
    availableOptionalPerkIds,
  )
  const topBackgroundFits = shouldIncludeTopBackgroundFits
    ? getCachedTopBackgroundFits({
        availableOptionalPerkIds,
        canonicalSearch,
        pickedPerks,
      })
    : []
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
    referenceVersion: legendsBackgroundFitDataset.referenceVersion,
    status: 'found',
    title,
    topBackgroundFits,
  }
}

export function createBuildSharePreviewPayloadFromSearch(
  search: string | URLSearchParams,
  options?: BuildSharePreviewOptions,
): BuildSharePreviewPayload {
  const buildState = getBuildStateFromSearch(search)

  return createBuildSharePreviewPayloadFromPickedPerkIds(
    buildState.pickedPerkIds,
    buildState.optionalPerkIds,
    options,
  )
}
