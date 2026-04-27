import type { LegendsPerkRecord } from '../types/legends-perks'

export type PerkBrowserUrlPerkGroupOption = {
  perkGroupId: string
  perkGroupName: string
}

export type PerkBrowserUrlState = {
  pickedPerkIds: string[]
  query: string
  selectedCategoryNames: string[]
  selectedPerkGroupIdsByCategory: Record<string, string[]>
  shouldIncludeOriginBackgrounds: boolean
}

export type PerkBrowserUrlStateReadOptions = {
  availableCategoryNames: string[]
  perks: LegendsPerkRecord[]
  perkGroupOptionsByCategory: Map<string, PerkBrowserUrlPerkGroupOption[]>
}

export type PerkBrowserUrlStateWriteOptions = {
  availableCategoryNames: string[]
  perksById: Map<string, LegendsPerkRecord>
  perkGroupOptionsByCategory: Map<string, PerkBrowserUrlPerkGroupOption[]>
  shouldWriteOriginBackgroundsParam?: boolean
}

const buildParamName = 'build'
const categoryParamName = 'category'
const originBackgroundsParamName = 'origin-backgrounds'
const perkGroupParamKeyPrefix = 'group-'
const disambiguatedPerkTokenSeparator = '--'
const searchParamName = 'search'

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

function createUrlToken(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+/u, '')
    .replace(/-+$/u, '')
}

function createPerkGroupParamKey(categoryName: string): string {
  return `${perkGroupParamKeyPrefix}${createUrlToken(categoryName)}`
}

function createPerkNameCountByLookupValue(perks: Iterable<LegendsPerkRecord>): Map<string, number> {
  const perkNameCountByLookupValue = new Map<string, number>()

  for (const perk of perks) {
    const lookupValue = normalizeLookupValue(perk.perkName)
    perkNameCountByLookupValue.set(
      lookupValue,
      (perkNameCountByLookupValue.get(lookupValue) ?? 0) + 1,
    )
  }

  return perkNameCountByLookupValue
}

function createDisambiguatedPerkUrlLabel(perk: LegendsPerkRecord): string {
  return `${perk.perkName}${disambiguatedPerkTokenSeparator}${perk.id}`
}

function createPerkUrlLabel(
  perk: LegendsPerkRecord,
  perkNameCountByLookupValue: Map<string, number>,
): string {
  return (perkNameCountByLookupValue.get(normalizeLookupValue(perk.perkName)) ?? 0) > 1
    ? createDisambiguatedPerkUrlLabel(perk)
    : perk.perkName
}

function createPerkIdByLookupValue(perks: LegendsPerkRecord[]): Map<string, string> {
  const perkNameCountByLookupValue = createPerkNameCountByLookupValue(perks)
  const perkIdByLookupValue = new Map<string, string>()

  for (const perk of perks) {
    perkIdByLookupValue.set(normalizeLookupValue(perk.id), perk.id)
    perkIdByLookupValue.set(
      normalizeLookupValue(createPerkUrlLabel(perk, perkNameCountByLookupValue)),
      perk.id,
    )
  }

  return perkIdByLookupValue
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

function appendScalarQueryEntry(entries: string[], key: string, value: string): void {
  entries.push(`${encodeQueryValue(key)}=${encodeQueryValue(value)}`)
}

function appendGroupedQueryEntry(entries: string[], key: string, values: string[]): void {
  if (values.length === 0) {
    return
  }

  entries.push(
    `${encodeQueryValue(key)}=${values.map((value) => encodeQueryValue(value)).join(',')}`,
  )
}

function createDefaultUrlState(): PerkBrowserUrlState {
  return {
    pickedPerkIds: [],
    query: '',
    selectedCategoryNames: [],
    selectedPerkGroupIdsByCategory: {},
    shouldIncludeOriginBackgrounds: true,
  }
}

function readShouldIncludeOriginBackgrounds(params: URLSearchParams): boolean {
  const value = params.get(originBackgroundsParamName)

  if (value === null) {
    return true
  }

  return !['0', 'false', 'no', 'off'].includes(collapseWhitespace(value).toLowerCase())
}

export function readPerkBrowserUrlState(
  search: string,
  options: PerkBrowserUrlStateReadOptions,
): PerkBrowserUrlState {
  const params = new URLSearchParams(search)
  const categoryNameByLookupValue = new Map(
    options.availableCategoryNames.map((categoryName) => [
      normalizeLookupValue(categoryName),
      categoryName,
    ]),
  )
  const categoryNameByParamKey = new Map(
    options.availableCategoryNames.map((categoryName) => [
      createPerkGroupParamKey(categoryName),
      categoryName,
    ]),
  )
  const perkIdByLookupValue = createPerkIdByLookupValue(options.perks)
  const perkGroupIdByLookupValueByGroup = new Map(
    [...options.perkGroupOptionsByCategory.entries()].map(([categoryName, perkGroupOptions]) => [
      categoryName,
      new Map(
        perkGroupOptions.map((perkGroupOption) => [
          normalizeLookupValue(perkGroupOption.perkGroupName),
          perkGroupOption.perkGroupId,
        ]),
      ),
    ]),
  )
  const selectedCategoryNameSet = new Set<string>()
  const pickedPerkIdSet = new Set<string>()
  const pickedPerkIds: string[] = []
  const selectedPerkGroupIdsByCategory: Record<string, string[]> = {}
  let selectedPerkGroupCategoryName: string | null = null
  const query = collapseWhitespace(params.get(searchParamName) ?? '')
  const shouldIncludeOriginBackgrounds = readShouldIncludeOriginBackgrounds(params)

  for (const categoryValue of getGroupedParamValues(params, categoryParamName)) {
    const categoryName = categoryNameByLookupValue.get(normalizeLookupValue(categoryValue))

    if (categoryName) {
      selectedCategoryNameSet.add(categoryName)
    }
  }

  for (const [perkGroupParamKey, categoryName] of categoryNameByParamKey) {
    if (selectedPerkGroupCategoryName !== null) {
      break
    }

    for (const perkGroupValue of getGroupedParamValues(params, perkGroupParamKey)) {
      const perkGroupId = perkGroupIdByLookupValueByGroup
        .get(categoryName)
        ?.get(normalizeLookupValue(perkGroupValue))

      if (!perkGroupId) {
        continue
      }

      selectedCategoryNameSet.add(categoryName)
      selectedPerkGroupIdsByCategory[categoryName] = [perkGroupId]
      selectedPerkGroupCategoryName = categoryName
      break
    }
  }

  for (const buildValue of getGroupedParamValues(params, buildParamName)) {
    const lookupValue = normalizeLookupValue(buildValue)
    const perkId = perkIdByLookupValue.get(lookupValue)

    if (!perkId || pickedPerkIdSet.has(perkId)) {
      continue
    }

    pickedPerkIdSet.add(perkId)
    pickedPerkIds.push(perkId)
  }

  return {
    pickedPerkIds,
    query,
    selectedCategoryNames: options.availableCategoryNames.filter((categoryName) =>
      selectedCategoryNameSet.has(categoryName),
    ),
    selectedPerkGroupIdsByCategory,
    shouldIncludeOriginBackgrounds,
  }
}

export function buildPerkBrowserUrlSearch(
  urlState: PerkBrowserUrlState,
  options: PerkBrowserUrlStateWriteOptions,
): string {
  const entries: string[] = []
  const selectedCategoryNameSet = new Set(urlState.selectedCategoryNames)
  const orderedSelectedCategoryNames = options.availableCategoryNames.filter((categoryName) =>
    selectedCategoryNameSet.has(categoryName),
  )
  let hasWrittenPerkGroup = false
  const normalizedQuery = collapseWhitespace(urlState.query)
  const shouldWriteOriginBackgroundsParam = options.shouldWriteOriginBackgroundsParam ?? true

  if (normalizedQuery) {
    appendScalarQueryEntry(entries, searchParamName, normalizedQuery)
  }

  if (shouldWriteOriginBackgroundsParam && !urlState.shouldIncludeOriginBackgrounds) {
    appendScalarQueryEntry(entries, originBackgroundsParamName, 'false')
  }

  appendGroupedQueryEntry(entries, categoryParamName, orderedSelectedCategoryNames)

  for (const categoryName of orderedSelectedCategoryNames) {
    if (hasWrittenPerkGroup) {
      break
    }

    const selectedPerkGroupIdSet = new Set(
      urlState.selectedPerkGroupIdsByCategory[categoryName] ?? [],
    )
    const perkGroupOptions = options.perkGroupOptionsByCategory.get(categoryName) ?? []
    const selectedPerkGroupNames: string[] = []

    for (const perkGroupOption of perkGroupOptions) {
      if (selectedPerkGroupIdSet.has(perkGroupOption.perkGroupId)) {
        selectedPerkGroupNames.push(perkGroupOption.perkGroupName)
        break
      }
    }

    appendGroupedQueryEntry(entries, createPerkGroupParamKey(categoryName), selectedPerkGroupNames)
    hasWrittenPerkGroup = selectedPerkGroupNames.length > 0
  }

  const perkNameCountByLookupValue = createPerkNameCountByLookupValue(options.perksById.values())
  const pickedPerkLabels: string[] = []

  for (const pickedPerkId of urlState.pickedPerkIds) {
    const perk = options.perksById.get(pickedPerkId)

    if (perk) {
      pickedPerkLabels.push(createPerkUrlLabel(perk, perkNameCountByLookupValue))
    }
  }

  appendGroupedQueryEntry(entries, buildParamName, pickedPerkLabels)

  const searchString = entries.join('&')
  return searchString ? `?${searchString}` : ''
}

export function buildPerkBrowserBuildUrlSearch(
  pickedPerkIds: string[],
  perksById: Map<string, LegendsPerkRecord>,
): string {
  return buildPerkBrowserUrlSearch(
    {
      pickedPerkIds,
      query: '',
      selectedCategoryNames: [],
      selectedPerkGroupIdsByCategory: {},
      shouldIncludeOriginBackgrounds: true,
    },
    {
      availableCategoryNames: [],
      perksById,
      perkGroupOptionsByCategory: new Map(),
      shouldWriteOriginBackgroundsParam: false,
    },
  )
}

export function readPerkBrowserUrlStateFromLocation(
  options: PerkBrowserUrlStateReadOptions,
): PerkBrowserUrlState {
  if (typeof window === 'undefined') {
    return createDefaultUrlState()
  }

  return readPerkBrowserUrlState(window.location.search, options)
}
