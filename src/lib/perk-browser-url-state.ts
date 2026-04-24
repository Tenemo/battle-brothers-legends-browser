import type { LegendsPerkRecord } from '../types/legends-perks'
import { allTiersFilterValue } from './perk-search'

export type PerkBrowserUrlTreeOption = {
  treeId: string
  treeName: string
}

type PerkBrowserUrlState = {
  pickedPerkIds: string[]
  query: string
  selectedGroupNames: string[]
  selectedTreeIdsByGroup: Record<string, string[]>
  tierValue: string
}

type PerkBrowserUrlStateReadOptions = {
  availableGroupNames: string[]
  perks: LegendsPerkRecord[]
  tierOptions: string[]
  treeOptionsByGroup: Map<string, PerkBrowserUrlTreeOption[]>
}

type PerkBrowserUrlStateWriteOptions = {
  availableGroupNames: string[]
  perksById: Map<string, LegendsPerkRecord>
  treeOptionsByGroup: Map<string, PerkBrowserUrlTreeOption[]>
}

const buildParamName = 'build'
const categoryParamName = 'category'
const groupParamKeyPrefix = 'group-'
const searchParamName = 'search'
const tierParamName = 'tier'

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

function createGroupParamKey(groupName: string): string {
  return `${groupParamKeyPrefix}${createUrlToken(groupName)}`
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
  return params.getAll(key).flatMap((value) => splitGroupedParamValue(value))
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
    selectedGroupNames: [],
    selectedTreeIdsByGroup: {},
    tierValue: allTiersFilterValue,
  }
}

export function readPerkBrowserUrlState(
  search: string,
  options: PerkBrowserUrlStateReadOptions,
): PerkBrowserUrlState {
  const params = new URLSearchParams(search)
  const availableTierValues = new Set(options.tierOptions)
  const groupNameByLookupValue = new Map(
    options.availableGroupNames.map((groupName) => [normalizeLookupValue(groupName), groupName]),
  )
  const groupNameByParamKey = new Map(
    options.availableGroupNames.map((groupName) => [createGroupParamKey(groupName), groupName]),
  )
  const perkIdByLookupValue = new Map(
    options.perks.map((perk) => [normalizeLookupValue(perk.perkName), perk.id]),
  )
  const treeIdByLookupValueByGroup = new Map(
    [...options.treeOptionsByGroup.entries()].map(([groupName, treeOptions]) => [
      groupName,
      new Map(
        treeOptions.map((treeOption) => [
          normalizeLookupValue(treeOption.treeName),
          treeOption.treeId,
        ]),
      ),
    ]),
  )
  const selectedGroupNameSet = new Set<string>()
  const pickedPerkIdSet = new Set<string>()
  const pickedPerkIds: string[] = []
  const selectedTreeIdsByGroup: Record<string, string[]> = {}
  const query = collapseWhitespace(params.get(searchParamName) ?? '')
  const tierValue = availableTierValues.has(params.get(tierParamName) ?? '')
    ? (params.get(tierParamName) as string)
    : allTiersFilterValue

  for (const categoryValue of getGroupedParamValues(params, categoryParamName)) {
    const groupName = groupNameByLookupValue.get(normalizeLookupValue(categoryValue))

    if (groupName) {
      selectedGroupNameSet.add(groupName)
    }
  }

  for (const [paramKey, paramValue] of params.entries()) {
    if (!paramKey.startsWith(groupParamKeyPrefix)) {
      continue
    }

    const groupName = groupNameByParamKey.get(paramKey)

    if (!groupName) {
      continue
    }

    for (const groupValue of splitGroupedParamValue(paramValue)) {
      const treeId = treeIdByLookupValueByGroup
        .get(groupName)
        ?.get(normalizeLookupValue(groupValue))

      if (!treeId) {
        continue
      }

      selectedGroupNameSet.add(groupName)

      if (!(groupName in selectedTreeIdsByGroup)) {
        selectedTreeIdsByGroup[groupName] = []
      }

      if (!selectedTreeIdsByGroup[groupName].includes(treeId)) {
        selectedTreeIdsByGroup[groupName].push(treeId)
      }
    }
  }

  for (const buildValue of getGroupedParamValues(params, buildParamName)) {
    const perkId = perkIdByLookupValue.get(normalizeLookupValue(buildValue))

    if (!perkId || pickedPerkIdSet.has(perkId)) {
      continue
    }

    pickedPerkIdSet.add(perkId)
    pickedPerkIds.push(perkId)
  }

  return {
    pickedPerkIds,
    query,
    selectedGroupNames: options.availableGroupNames.filter((groupName) =>
      selectedGroupNameSet.has(groupName),
    ),
    selectedTreeIdsByGroup,
    tierValue,
  }
}

export function buildPerkBrowserUrlSearch(
  urlState: PerkBrowserUrlState,
  options: PerkBrowserUrlStateWriteOptions,
): string {
  const entries: string[] = []
  const selectedGroupNameSet = new Set(urlState.selectedGroupNames)
  const orderedSelectedGroupNames = options.availableGroupNames.filter((groupName) =>
    selectedGroupNameSet.has(groupName),
  )
  const normalizedQuery = collapseWhitespace(urlState.query)

  if (normalizedQuery) {
    appendScalarQueryEntry(entries, searchParamName, normalizedQuery)
  }

  if (urlState.tierValue !== allTiersFilterValue) {
    appendScalarQueryEntry(entries, tierParamName, urlState.tierValue)
  }

  appendGroupedQueryEntry(entries, categoryParamName, orderedSelectedGroupNames)

  for (const groupName of orderedSelectedGroupNames) {
    const selectedTreeIdSet = new Set(urlState.selectedTreeIdsByGroup[groupName] ?? [])
    const treeOptions = options.treeOptionsByGroup.get(groupName) ?? []
    const selectedTreeNames: string[] = []

    for (const treeOption of treeOptions) {
      if (selectedTreeIdSet.has(treeOption.treeId)) {
        selectedTreeNames.push(treeOption.treeName)
      }
    }

    appendGroupedQueryEntry(entries, createGroupParamKey(groupName), selectedTreeNames)
  }

  const pickedPerkNames: string[] = []

  for (const pickedPerkId of urlState.pickedPerkIds) {
    const perk = options.perksById.get(pickedPerkId)

    if (perk) {
      pickedPerkNames.push(perk.perkName)
    }
  }

  appendGroupedQueryEntry(entries, buildParamName, pickedPerkNames)

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
      selectedGroupNames: [],
      selectedTreeIdsByGroup: {},
      tierValue: allTiersFilterValue,
    },
    {
      availableGroupNames: [],
      perksById,
      treeOptionsByGroup: new Map(),
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
