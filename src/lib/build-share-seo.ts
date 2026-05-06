import {
  buildShareSeoData,
  type BuildShareSeoPerkRecord,
} from '../data/build-share-seo-data.generated'

type BuildShareSeoPerk = {
  perkName: string
}

type BuildShareSeoPayload = {
  canonicalSearch: string
  description: string
  imageAlt: string
  imagePath: string
  pickedPerkCount: number
  pickedPerks: BuildShareSeoPerk[]
  referenceVersion: string
  status: 'empty' | 'found'
  title: string
}

type BuildShareSeoBuildState = {
  optionalPerkIds: string[]
  pickedPerkIds: string[]
}

const allPerks = buildShareSeoData.perks
const allPerksById = new Map(allPerks.map((perk) => [perk.id, perk]))
const buildSocialImagePathPrefix = '/social/builds'
const buildParamName = 'build'
const optionalPerksParamName = 'optional'
const disambiguatedPerkTokenSeparator = '--'
const maxDescriptionPerks = 4
const perkNameCountByLookupValue = createPerkNameCountByLookupValue(allPerks)
const perkIdByLookupValue = createPerkIdByLookupValue(allPerks)

function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/gu, ' ')
}

function normalizeLookupValue(value: string): string {
  return collapseWhitespace(
    value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/gu, ' '),
  )
}

function createPerkNameCountByLookupValue(
  perks: Iterable<BuildShareSeoPerkRecord>,
): Map<string, number> {
  const nextPerkNameCountByLookupValue = new Map<string, number>()

  for (const perk of perks) {
    const lookupValue = normalizeLookupValue(perk.perkName)
    nextPerkNameCountByLookupValue.set(
      lookupValue,
      (nextPerkNameCountByLookupValue.get(lookupValue) ?? 0) + 1,
    )
  }

  return nextPerkNameCountByLookupValue
}

function createDisambiguatedPerkUrlLabel(perk: BuildShareSeoPerkRecord): string {
  return `${perk.perkName}${disambiguatedPerkTokenSeparator}${perk.id}`
}

function createPerkUrlLabel(perk: BuildShareSeoPerkRecord): string {
  return (perkNameCountByLookupValue.get(normalizeLookupValue(perk.perkName)) ?? 0) > 1
    ? createDisambiguatedPerkUrlLabel(perk)
    : perk.perkName
}

function createPerkIdByLookupValue(perks: BuildShareSeoPerkRecord[]): Map<string, string> {
  const nextPerkIdByLookupValue = new Map<string, string>()

  for (const perk of perks) {
    nextPerkIdByLookupValue.set(normalizeLookupValue(perk.id), perk.id)
    nextPerkIdByLookupValue.set(normalizeLookupValue(createPerkUrlLabel(perk)), perk.id)
  }

  return nextPerkIdByLookupValue
}

function encodeQueryValue(value: string): string {
  return encodeURIComponent(value).replace(/%20/gu, '+')
}

function splitGroupedParamValue(value: string): string[] {
  return value
    .split(',')
    .map((item) => collapseWhitespace(item))
    .filter((item) => item.length > 0)
}

function getGroupedParamValues(params: URLSearchParams, key: string): string[] {
  const value = params.get(key)

  return value ? splitGroupedParamValue(value) : []
}

function appendGroupedQueryEntry(entries: string[], key: string, values: string[]): void {
  if (values.length === 0) {
    return
  }

  entries.push(
    `${encodeQueryValue(key)}=${values.map((value) => encodeQueryValue(value)).join(',')}`,
  )
}

function getPerksFromPickedPerkIds(pickedPerkIds: string[]): BuildShareSeoPerkRecord[] {
  return pickedPerkIds.flatMap((pickedPerkId) => {
    const perk = allPerksById.get(pickedPerkId)

    return perk ? [perk] : []
  })
}

function getBuildStateFromSearch(search: string | URLSearchParams): BuildShareSeoBuildState {
  const params = new URLSearchParams(search)
  const pickedPerkIdSet = new Set<string>()
  const pickedPerkIds: string[] = []
  const optionalPerkIdSet = new Set<string>()
  const optionalPerkIds: string[] = []

  for (const buildValue of getGroupedParamValues(params, buildParamName)) {
    const perkId = perkIdByLookupValue.get(normalizeLookupValue(buildValue))

    if (!perkId || pickedPerkIdSet.has(perkId)) {
      continue
    }

    pickedPerkIdSet.add(perkId)
    pickedPerkIds.push(perkId)
  }

  for (const optionalValue of getGroupedParamValues(params, optionalPerksParamName)) {
    const perkId = perkIdByLookupValue.get(normalizeLookupValue(optionalValue))

    if (!perkId || !pickedPerkIdSet.has(perkId) || optionalPerkIdSet.has(perkId)) {
      continue
    }

    optionalPerkIdSet.add(perkId)
    optionalPerkIds.push(perkId)
  }

  return {
    optionalPerkIds,
    pickedPerkIds,
  }
}

function buildShareSearchFromPickedPerkIds(
  pickedPerkIds: string[],
  optionalPerkIds: string[],
): string {
  const pickedPerkLabels = pickedPerkIds.flatMap((pickedPerkId) => {
    const perk = allPerksById.get(pickedPerkId)

    return perk ? [createPerkUrlLabel(perk)] : []
  })
  const optionalPerkLabels = optionalPerkIds.flatMap((optionalPerkId) => {
    const perk = allPerksById.get(optionalPerkId)

    return perk ? [createPerkUrlLabel(perk)] : []
  })
  const entries: string[] = []

  appendGroupedQueryEntry(entries, buildParamName, pickedPerkLabels)
  appendGroupedQueryEntry(entries, optionalPerksParamName, optionalPerkLabels)

  return entries.length > 0 ? `?${entries.join('&')}` : ''
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

function createBuildDescription(pickedPerks: BuildShareSeoPerk[]): string {
  const perkSummary = formatPerkListForSentence(
    pickedPerks.map((perk) => perk.perkName),
    maxDescriptionPerks,
  )

  return `Shared Battle Brothers Legends build with ${pickedPerks.length} picked perk${
    pickedPerks.length === 1 ? '' : 's'
  }: ${perkSummary}.`
}

function createBuildImagePath(canonicalSearch: string): string {
  const searchParams = new URLSearchParams(canonicalSearch)
  const canonicalBuild = searchParams.get(buildParamName) ?? ''
  const canonicalOptionalPerks = searchParams.get(optionalPerksParamName) ?? ''
  const encodedReference = encodeURIComponent(buildShareSeoData.referenceVersion)
  const encodedBuild = encodeURIComponent(canonicalBuild)
  const optionalPerksSearch = canonicalOptionalPerks
    ? `?optional=${encodeURIComponent(canonicalOptionalPerks)}`
    : ''

  return `${buildSocialImagePathPrefix}/${encodedReference}/${encodedBuild}.png${optionalPerksSearch}`
}

function createBuildShareSeoPayloadFromPickedPerkIds(
  pickedPerkIds: string[],
  optionalPerkIds: string[],
): BuildShareSeoPayload {
  const pickedPerks = getPerksFromPickedPerkIds(pickedPerkIds)
  const availablePickedPerkIds = pickedPerks.map((pickedPerk) => pickedPerk.id)
  const availablePickedPerkIdSet = new Set(availablePickedPerkIds)
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
      referenceVersion: buildShareSeoData.referenceVersion,
      status: 'empty',
      title: 'Battle Brothers Legends build planner',
    }
  }

  const canonicalSearch = buildShareSearchFromPickedPerkIds(
    availablePickedPerkIds,
    availableOptionalPerkIds,
  )
  const previewPerks = pickedPerks.map((pickedPerk) => ({
    perkName: pickedPerk.perkName,
  }))
  const title = `Battle Brothers Legends build: ${pickedPerks.length} perk${
    pickedPerks.length === 1 ? '' : 's'
  }`

  return {
    canonicalSearch,
    description: createBuildDescription(previewPerks),
    imageAlt: `${title} with ${formatPerkListForSentence(
      previewPerks.map((perk) => perk.perkName),
      maxDescriptionPerks,
    )}.`,
    imagePath: createBuildImagePath(canonicalSearch),
    pickedPerkCount: pickedPerks.length,
    pickedPerks: previewPerks,
    referenceVersion: buildShareSeoData.referenceVersion,
    status: 'found',
    title,
  }
}

export function createBuildShareSeoPayloadFromSearch(
  search: string | URLSearchParams,
): BuildShareSeoPayload {
  const buildState = getBuildStateFromSearch(search)

  return createBuildShareSeoPayloadFromPickedPerkIds(
    buildState.pickedPerkIds,
    buildState.optionalPerkIds,
  )
}
