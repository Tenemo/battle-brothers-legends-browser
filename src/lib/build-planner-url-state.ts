import type { LegendsPerkRecord } from '../types/legends-perks'
import {
  getCategoryFilterModeFromSelection,
  type CategoryFilterMode,
} from './category-filter-state'
import {
  areBackgroundVeteranPerkLevelIntervalsDefault,
  baselineBackgroundVeteranPerkLevelIntervals,
  normalizeBackgroundVeteranPerkLevelIntervals,
} from './background-veteran-perks'

export type BuildPlannerUrlPerkGroupOption = {
  perkGroupId: string
  perkGroupName: string
}

export type BuildPlannerUrlBackgroundOption = {
  backgroundId: string
  sourceFilePath: string
}

export type BuildPlannerDetailSelection =
  | {
      type: 'none'
    }
  | {
      type: 'perk'
      perkId: string
    }
  | {
      type: 'background'
      backgroundId: string
      sourceFilePath: string
    }

export type BuildPlannerUrlState = {
  categoryFilterMode?: CategoryFilterMode
  detailSelection: BuildPlannerDetailSelection
  optionalPerkIds: string[]
  pickedPerkIds: string[]
  query: string
  selectedCategoryNames: string[]
  selectedBackgroundVeteranPerkLevelIntervals: number[]
  selectedPerkGroupIdsByCategory: Record<string, string[]>
  shouldAllowBackgroundStudyBook: boolean
  shouldAllowBackgroundStudyScroll: boolean
  shouldAllowSecondBackgroundStudyScroll: boolean
  shouldIncludeAncientScrollPerkGroups: boolean
  shouldIncludeOriginBackgrounds: boolean
  shouldIncludeOriginPerkGroups: boolean
}

export type BuildPlannerUrlStateReadOptions = {
  availableCategoryNames: string[]
  availableBackgroundVeteranPerkLevelIntervals?: number[]
  backgrounds?: BuildPlannerUrlBackgroundOption[]
  perks: LegendsPerkRecord[]
  perkGroupOptionsByCategory: Map<string, BuildPlannerUrlPerkGroupOption[]>
}

export type BuildPlannerUrlStateWriteOptions = {
  availableCategoryNames: string[]
  availableBackgroundVeteranPerkLevelIntervals?: number[]
  backgrounds?: BuildPlannerUrlBackgroundOption[]
  perksById: Map<string, LegendsPerkRecord>
  perkGroupOptionsByCategory: Map<string, BuildPlannerUrlPerkGroupOption[]>
  shouldWriteBackgroundStudyBookParam?: boolean
  shouldWriteBackgroundStudyScrollParam?: boolean
  shouldWriteBackgroundVeteranPerkLevelIntervalsParam?: boolean
  shouldWriteSecondBackgroundStudyScrollParam?: boolean
  shouldWriteAncientScrollPerkGroupsParam?: boolean
  shouldWriteOriginBackgroundsParam?: boolean
  shouldWriteOriginPerkGroupsParam?: boolean
}

const buildParamName = 'build'
const categoryParamName = 'category'
const ancientScrollPerkGroupsParamName = 'ancient-scroll-perk-groups'
const backgroundStudyBookParamName = 'background-book'
const backgroundStudyScrollParamName = 'background-scroll'
const backgroundVeteranPerkLevelIntervalsParamName = 'background-veteran-perks'
const backgroundDetailParamName = 'background'
const backgroundDetailSourceParamName = 'background-source'
const detailParamName = 'detail'
const optionalPerksParamName = 'optional'
const perkDetailParamName = 'perk'
const secondBackgroundStudyScrollParamName = 'background-two-scrolls'
const originBackgroundsParamName = 'origin-backgrounds'
const originPerkGroupsParamName = 'origin-perk-groups'
const perkGroupParamKeyPrefix = 'group-'
const disambiguatedPerkTokenSeparator = '--'
const searchParamName = 'search'
const allCategoriesParamValue = 'all'
const emptyBackgroundVeteranPerkLevelIntervalsParamValue = 'none'
const backgroundDetailParamValue = 'background'
const perkDetailParamValue = 'perk'
const noDetailSelection = { type: 'none' } as const satisfies BuildPlannerDetailSelection

function normalizeBackgroundStudyScrollState({
  shouldAllowBackgroundStudyScroll,
  shouldAllowSecondBackgroundStudyScroll,
}: {
  shouldAllowBackgroundStudyScroll: boolean
  shouldAllowSecondBackgroundStudyScroll: boolean
}) {
  return {
    shouldAllowBackgroundStudyScroll,
    shouldAllowSecondBackgroundStudyScroll:
      shouldAllowBackgroundStudyScroll && shouldAllowSecondBackgroundStudyScroll,
  }
}

function getAvailableBackgroundVeteranPerkLevelIntervals(
  options: Pick<
    BuildPlannerUrlStateReadOptions | BuildPlannerUrlStateWriteOptions,
    'availableBackgroundVeteranPerkLevelIntervals'
  >,
): number[] {
  const availableIntervals =
    options.availableBackgroundVeteranPerkLevelIntervals ??
    baselineBackgroundVeteranPerkLevelIntervals

  return [...new Set(availableIntervals)]
    .filter((interval) => Number.isInteger(interval) && interval > 0)
    .toSorted((leftInterval, rightInterval) => leftInterval - rightInterval)
}

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

function createBackgroundSourceFileToken(sourceFilePath: string): string {
  const sourceFileName = sourceFilePath.split(/[\\/]/u).at(-1) ?? sourceFilePath
  const sourceFileBaseName = sourceFileName.replace(/\.nut$/u, '').replace(/_background$/u, '')

  return createUrlToken(sourceFileBaseName)
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

function createBackgroundOptionsByIdLookupValue(
  backgrounds: readonly BuildPlannerUrlBackgroundOption[] | undefined,
): Map<string, BuildPlannerUrlBackgroundOption[]> {
  const backgroundOptionsByIdLookupValue = new Map<string, BuildPlannerUrlBackgroundOption[]>()

  for (const background of backgrounds ?? []) {
    const backgroundIdLookupValue = normalizeLookupValue(background.backgroundId)
    const backgroundOptions = backgroundOptionsByIdLookupValue.get(backgroundIdLookupValue) ?? []

    backgroundOptions.push(background)
    backgroundOptionsByIdLookupValue.set(backgroundIdLookupValue, backgroundOptions)
  }

  return backgroundOptionsByIdLookupValue
}

function readDetailSelectionSearchParam({
  backgroundOptionsByIdLookupValue,
  params,
  perkIdByLookupValue,
}: {
  backgroundOptionsByIdLookupValue: ReadonlyMap<string, BuildPlannerUrlBackgroundOption[]>
  params: URLSearchParams
  perkIdByLookupValue: ReadonlyMap<string, string>
}): BuildPlannerDetailSelection {
  const detailType = normalizeLookupValue(params.get(detailParamName) ?? '')

  if (detailType === perkDetailParamValue) {
    const perkId = perkIdByLookupValue.get(
      normalizeLookupValue(params.get(perkDetailParamName) ?? ''),
    )

    return perkId ? { perkId, type: 'perk' } : noDetailSelection
  }

  if (detailType !== backgroundDetailParamValue) {
    return noDetailSelection
  }

  const backgroundOptions =
    backgroundOptionsByIdLookupValue.get(
      normalizeLookupValue(params.get(backgroundDetailParamName) ?? ''),
    ) ?? []

  if (backgroundOptions.length === 0) {
    return noDetailSelection
  }

  const backgroundSourceLookupValue = normalizeLookupValue(
    params.get(backgroundDetailSourceParamName) ?? '',
  )
  const selectedBackground =
    backgroundOptions.find(
      (backgroundOption) =>
        normalizeLookupValue(createBackgroundSourceFileToken(backgroundOption.sourceFilePath)) ===
          backgroundSourceLookupValue ||
        normalizeLookupValue(backgroundOption.sourceFilePath) === backgroundSourceLookupValue,
    ) ??
    (backgroundOptions.length === 1 && backgroundSourceLookupValue.length === 0
      ? backgroundOptions[0]
      : null)

  return selectedBackground
    ? {
        backgroundId: selectedBackground.backgroundId,
        sourceFilePath: selectedBackground.sourceFilePath,
        type: 'background',
      }
    : noDetailSelection
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

function createPerkUrlLabels(
  perkIds: string[],
  perksById: Map<string, LegendsPerkRecord>,
  perkNameCountByLookupValue: Map<string, number>,
): string[] {
  const perkLabels: string[] = []

  for (const perkId of perkIds) {
    const perk = perksById.get(perkId)

    if (perk) {
      perkLabels.push(createPerkUrlLabel(perk, perkNameCountByLookupValue))
    }
  }

  return perkLabels
}

function createDefaultUrlState(): BuildPlannerUrlState {
  return {
    categoryFilterMode: 'none',
    detailSelection: noDetailSelection,
    optionalPerkIds: [],
    pickedPerkIds: [],
    query: '',
    selectedCategoryNames: [],
    selectedBackgroundVeteranPerkLevelIntervals: [...baselineBackgroundVeteranPerkLevelIntervals],
    selectedPerkGroupIdsByCategory: {},
    shouldAllowBackgroundStudyBook: true,
    shouldAllowBackgroundStudyScroll: true,
    shouldAllowSecondBackgroundStudyScroll: false,
    shouldIncludeAncientScrollPerkGroups: true,
    shouldIncludeOriginBackgrounds: false,
    shouldIncludeOriginPerkGroups: false,
  }
}

function readBackgroundVeteranPerkLevelIntervalsSearchParam(
  params: URLSearchParams,
  availableIntervals: readonly number[],
): number[] {
  const value = params.get(backgroundVeteranPerkLevelIntervalsParamName)

  if (value === null) {
    return [...availableIntervals]
  }

  const groupedValues = splitGroupedParamValue(value)

  if (groupedValues.length === 0) {
    return [...availableIntervals]
  }

  if (
    groupedValues.some(
      (groupedValue) =>
        normalizeLookupValue(groupedValue) === emptyBackgroundVeteranPerkLevelIntervalsParamValue,
    )
  ) {
    return []
  }

  const parsedIntervals = groupedValues.flatMap((groupedValue) => {
    const parsedInterval = Number(groupedValue)

    return Number.isInteger(parsedInterval) && parsedInterval > 0 ? [parsedInterval] : []
  })
  const normalizedIntervals = normalizeBackgroundVeteranPerkLevelIntervals(
    parsedIntervals,
    availableIntervals,
  )

  return normalizedIntervals.length > 0 ? normalizedIntervals : [...availableIntervals]
}

function readBooleanSearchParam(
  params: URLSearchParams,
  paramName: string,
  defaultValue: boolean,
): boolean {
  const value = params.get(paramName)

  if (value === null) {
    return defaultValue
  }

  return !['0', 'false', 'no', 'off'].includes(collapseWhitespace(value).toLowerCase())
}

export function readBuildPlannerUrlState(
  search: string,
  options: BuildPlannerUrlStateReadOptions,
): BuildPlannerUrlState {
  const params = new URLSearchParams(search)
  const categoryNameByLookupValue = new Map(
    options.availableCategoryNames.map((categoryName) => [
      normalizeLookupValue(categoryName),
      categoryName,
    ]),
  )
  const availableBackgroundVeteranPerkLevelIntervals =
    getAvailableBackgroundVeteranPerkLevelIntervals(options)
  const categoryNameByParamKey = new Map(
    options.availableCategoryNames.map((categoryName) => [
      createPerkGroupParamKey(categoryName),
      categoryName,
    ]),
  )
  const perkIdByLookupValue = createPerkIdByLookupValue(options.perks)
  const backgroundOptionsByIdLookupValue = createBackgroundOptionsByIdLookupValue(
    options.backgrounds,
  )
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
  const optionalPerkIdSet = new Set<string>()
  const optionalPerkIds: string[] = []
  const selectedPerkGroupIdsByCategory: Record<string, string[]> = {}
  let selectedPerkGroupCategoryName: string | null = null
  let hasAllCategoriesParamValue = false
  const query = collapseWhitespace(params.get(searchParamName) ?? '')
  const shouldAllowBackgroundStudyBook = readBooleanSearchParam(
    params,
    backgroundStudyBookParamName,
    true,
  )
  const shouldAllowBackgroundStudyScroll = readBooleanSearchParam(
    params,
    backgroundStudyScrollParamName,
    true,
  )
  const shouldAllowSecondBackgroundStudyScroll = readBooleanSearchParam(
    params,
    secondBackgroundStudyScrollParamName,
    false,
  )
  const shouldIncludeAncientScrollPerkGroups = readBooleanSearchParam(
    params,
    ancientScrollPerkGroupsParamName,
    true,
  )
  const shouldIncludeOriginBackgrounds = readBooleanSearchParam(
    params,
    originBackgroundsParamName,
    false,
  )
  const shouldIncludeOriginPerkGroups = readBooleanSearchParam(
    params,
    originPerkGroupsParamName,
    false,
  )
  const selectedBackgroundVeteranPerkLevelIntervals =
    readBackgroundVeteranPerkLevelIntervalsSearchParam(
      params,
      availableBackgroundVeteranPerkLevelIntervals,
    )
  const backgroundStudyScrollState = normalizeBackgroundStudyScrollState({
    shouldAllowBackgroundStudyScroll,
    shouldAllowSecondBackgroundStudyScroll,
  })

  for (const categoryValue of getGroupedParamValues(params, categoryParamName)) {
    const normalizedCategoryValue = normalizeLookupValue(categoryValue)
    const categoryName = categoryNameByLookupValue.get(normalizedCategoryValue)

    if (categoryName) {
      selectedCategoryNameSet.add(categoryName)
    } else if (normalizedCategoryValue === allCategoriesParamValue) {
      hasAllCategoriesParamValue = true
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

  for (const optionalValue of getGroupedParamValues(params, optionalPerksParamName)) {
    const lookupValue = normalizeLookupValue(optionalValue)
    const perkId = perkIdByLookupValue.get(lookupValue)

    if (!perkId || !pickedPerkIdSet.has(perkId) || optionalPerkIdSet.has(perkId)) {
      continue
    }

    optionalPerkIdSet.add(perkId)
    optionalPerkIds.push(perkId)
  }

  const selectedCategoryNames = options.availableCategoryNames.filter((categoryName) =>
    selectedCategoryNameSet.has(categoryName),
  )

  return {
    categoryFilterMode:
      selectedCategoryNames.length > 0 || Object.keys(selectedPerkGroupIdsByCategory).length > 0
        ? 'selection'
        : hasAllCategoriesParamValue
          ? 'all'
          : 'none',
    detailSelection: readDetailSelectionSearchParam({
      backgroundOptionsByIdLookupValue,
      params,
      perkIdByLookupValue,
    }),
    optionalPerkIds,
    pickedPerkIds,
    query,
    selectedCategoryNames,
    selectedBackgroundVeteranPerkLevelIntervals,
    selectedPerkGroupIdsByCategory,
    shouldAllowBackgroundStudyBook,
    ...backgroundStudyScrollState,
    shouldIncludeAncientScrollPerkGroups,
    shouldIncludeOriginBackgrounds,
    shouldIncludeOriginPerkGroups,
  }
}

export function createBuildPlannerUrlSearch(
  urlState: BuildPlannerUrlState,
  options: BuildPlannerUrlStateWriteOptions,
): string {
  const entries: string[] = []
  const selectedCategoryNameSet = new Set(urlState.selectedCategoryNames)
  const orderedSelectedCategoryNames = options.availableCategoryNames.filter((categoryName) =>
    selectedCategoryNameSet.has(categoryName),
  )
  const categoryFilterMode =
    urlState.categoryFilterMode ??
    getCategoryFilterModeFromSelection({
      selectedCategoryNames: urlState.selectedCategoryNames,
      selectedPerkGroupIdsByCategory: urlState.selectedPerkGroupIdsByCategory,
    })
  let hasWrittenPerkGroup = false
  const normalizedQuery = collapseWhitespace(urlState.query)
  const shouldWriteAncientScrollPerkGroupsParam =
    options.shouldWriteAncientScrollPerkGroupsParam ?? true
  const shouldWriteBackgroundStudyBookParam = options.shouldWriteBackgroundStudyBookParam ?? true
  const shouldWriteBackgroundStudyScrollParam =
    options.shouldWriteBackgroundStudyScrollParam ?? true
  const shouldWriteBackgroundVeteranPerkLevelIntervalsParam =
    options.shouldWriteBackgroundVeteranPerkLevelIntervalsParam ?? true
  const shouldWriteSecondBackgroundStudyScrollParam =
    options.shouldWriteSecondBackgroundStudyScrollParam ?? true
  const shouldWriteOriginBackgroundsParam = options.shouldWriteOriginBackgroundsParam ?? true
  const shouldWriteOriginPerkGroupsParam = options.shouldWriteOriginPerkGroupsParam ?? true
  const perkNameCountByLookupValue = createPerkNameCountByLookupValue(options.perksById.values())
  const detailSelection = urlState.detailSelection

  if (normalizedQuery) {
    appendScalarQueryEntry(entries, searchParamName, normalizedQuery)
  }

  if (detailSelection.type === 'perk') {
    const selectedPerk = options.perksById.get(detailSelection.perkId)

    if (selectedPerk) {
      appendScalarQueryEntry(entries, detailParamName, perkDetailParamValue)
      appendScalarQueryEntry(
        entries,
        perkDetailParamName,
        createPerkUrlLabel(selectedPerk, perkNameCountByLookupValue),
      )
    }
  } else if (detailSelection.type === 'background') {
    appendScalarQueryEntry(entries, detailParamName, backgroundDetailParamValue)
    appendScalarQueryEntry(entries, backgroundDetailParamName, detailSelection.backgroundId)
    appendScalarQueryEntry(
      entries,
      backgroundDetailSourceParamName,
      createBackgroundSourceFileToken(detailSelection.sourceFilePath),
    )
  }

  if (shouldWriteOriginPerkGroupsParam && urlState.shouldIncludeOriginPerkGroups) {
    appendScalarQueryEntry(entries, originPerkGroupsParamName, 'true')
  }

  if (shouldWriteAncientScrollPerkGroupsParam && !urlState.shouldIncludeAncientScrollPerkGroups) {
    appendScalarQueryEntry(entries, ancientScrollPerkGroupsParamName, 'false')
  }

  if (shouldWriteBackgroundStudyBookParam && !urlState.shouldAllowBackgroundStudyBook) {
    appendScalarQueryEntry(entries, backgroundStudyBookParamName, 'false')
  }

  if (shouldWriteBackgroundStudyScrollParam && !urlState.shouldAllowBackgroundStudyScroll) {
    appendScalarQueryEntry(entries, backgroundStudyScrollParamName, 'false')
  }

  if (
    shouldWriteSecondBackgroundStudyScrollParam &&
    urlState.shouldAllowBackgroundStudyScroll &&
    urlState.shouldAllowSecondBackgroundStudyScroll
  ) {
    appendScalarQueryEntry(entries, secondBackgroundStudyScrollParamName, 'true')
  }

  const availableBackgroundVeteranPerkLevelIntervals =
    getAvailableBackgroundVeteranPerkLevelIntervals(options)
  const selectedBackgroundVeteranPerkLevelIntervals = normalizeBackgroundVeteranPerkLevelIntervals(
    urlState.selectedBackgroundVeteranPerkLevelIntervals,
    availableBackgroundVeteranPerkLevelIntervals,
  )

  if (
    shouldWriteBackgroundVeteranPerkLevelIntervalsParam &&
    !areBackgroundVeteranPerkLevelIntervalsDefault(
      selectedBackgroundVeteranPerkLevelIntervals,
      availableBackgroundVeteranPerkLevelIntervals,
    )
  ) {
    appendGroupedQueryEntry(
      entries,
      backgroundVeteranPerkLevelIntervalsParamName,
      selectedBackgroundVeteranPerkLevelIntervals.length === 0
        ? [emptyBackgroundVeteranPerkLevelIntervalsParamValue]
        : selectedBackgroundVeteranPerkLevelIntervals.map(String),
    )
  }

  if (shouldWriteOriginBackgroundsParam && urlState.shouldIncludeOriginBackgrounds) {
    appendScalarQueryEntry(entries, originBackgroundsParamName, 'true')
  }

  if (categoryFilterMode === 'all') {
    appendGroupedQueryEntry(entries, categoryParamName, [allCategoriesParamValue])
  } else if (categoryFilterMode === 'selection') {
    appendGroupedQueryEntry(entries, categoryParamName, orderedSelectedCategoryNames)
  }

  for (const categoryName of categoryFilterMode === 'selection'
    ? orderedSelectedCategoryNames
    : []) {
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

  const pickedPerkIdSet = new Set(urlState.pickedPerkIds)
  const pickedPerkLabels = createPerkUrlLabels(
    urlState.pickedPerkIds,
    options.perksById,
    perkNameCountByLookupValue,
  )
  const optionalPerkLabels = createPerkUrlLabels(
    urlState.optionalPerkIds.filter((optionalPerkId) => pickedPerkIdSet.has(optionalPerkId)),
    options.perksById,
    perkNameCountByLookupValue,
  )

  appendGroupedQueryEntry(entries, buildParamName, pickedPerkLabels)
  appendGroupedQueryEntry(entries, optionalPerksParamName, optionalPerkLabels)

  const searchString = entries.join('&')
  return searchString ? `?${searchString}` : ''
}

export function createSharedBuildUrlSearch(
  pickedPerkIds: string[],
  perksById: Map<string, LegendsPerkRecord>,
  optionalPerkIds: string[] = [],
): string {
  return createBuildPlannerUrlSearch(
    {
      categoryFilterMode: 'none',
      optionalPerkIds,
      detailSelection: noDetailSelection,
      pickedPerkIds,
      query: '',
      selectedCategoryNames: [],
      selectedBackgroundVeteranPerkLevelIntervals: [...baselineBackgroundVeteranPerkLevelIntervals],
      selectedPerkGroupIdsByCategory: {},
      shouldAllowBackgroundStudyBook: true,
      shouldAllowBackgroundStudyScroll: true,
      shouldAllowSecondBackgroundStudyScroll: false,
      shouldIncludeAncientScrollPerkGroups: false,
      shouldIncludeOriginBackgrounds: false,
      shouldIncludeOriginPerkGroups: false,
    },
    {
      availableCategoryNames: [],
      availableBackgroundVeteranPerkLevelIntervals: [],
      perksById,
      perkGroupOptionsByCategory: new Map(),
      shouldWriteAncientScrollPerkGroupsParam: false,
      shouldWriteBackgroundStudyBookParam: false,
      shouldWriteBackgroundStudyScrollParam: false,
      shouldWriteBackgroundVeteranPerkLevelIntervalsParam: false,
      shouldWriteSecondBackgroundStudyScrollParam: false,
      shouldWriteOriginBackgroundsParam: false,
      shouldWriteOriginPerkGroupsParam: false,
    },
  )
}

export function readBuildPlannerUrlStateFromLocation(
  options: BuildPlannerUrlStateReadOptions,
): BuildPlannerUrlState {
  if (typeof window === 'undefined') {
    return createDefaultUrlState()
  }

  return readBuildPlannerUrlState(window.location.search, options)
}
