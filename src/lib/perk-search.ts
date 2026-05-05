import type {
  LegendsFavouredEnemyTarget,
  LegendsPerkBackgroundSource,
  LegendsPerkPlacement,
  LegendsPerkRecord,
  LegendsPerkScenarioSource,
} from '../types/legends-perks'
import {
  getCategoryFilterModeFromSelection,
  type CategoryFilterMode,
} from './category-filter-state'
import { formatDisplayBulletText } from './bullet-display'

type PerkSearchFilters = {
  categoryFilterMode?: CategoryFilterMode
  query: string
  selectedCategoryNames: string[]
  selectedPerkGroupIdsByCategory: Record<string, string[]>
}

type NormalizedPerkSearchIndex = {
  backgroundNames: string[]
  categoryNames: string[]
  perkName: string
  scenarioNames: string[]
  searchText: string
  perkGroupNames: string[]
}

type PerkSearchTextSource = {
  backgroundSources: LegendsPerkBackgroundSource[]
  categoryNames: string[]
  descriptionParagraphs: string[]
  favouredEnemyTargets?: LegendsFavouredEnemyTarget[]
  perkName: string
  placements: LegendsPerkPlacement[]
  scenarioSources: LegendsPerkScenarioSource[]
}

const normalizedPerkSearchTextCache = new WeakMap<LegendsPerkRecord, string>()

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase()
}

function normalizeSearchText(value: string): string {
  return value.replace(/\s+/gu, ' ').trim()
}

export function createPerkSearchText(perk: PerkSearchTextSource): string {
  return normalizeSearchText(
    [
      perk.perkName,
      ...perk.categoryNames,
      ...perk.descriptionParagraphs,
      ...perk.placements.flatMap((placement) => [
        placement.categoryName,
        placement.perkGroupName,
        placement.perkGroupId,
        placement.tier === null ? '' : `Tier ${placement.tier}`,
      ]),
      ...(perk.favouredEnemyTargets ?? []).flatMap((favouredEnemyTarget) => [
        favouredEnemyTarget.entityConstName,
        favouredEnemyTarget.entityName,
        favouredEnemyTarget.killsPerPercentBonus === null
          ? ''
          : String(favouredEnemyTarget.killsPerPercentBonus),
      ]),
      ...perk.backgroundSources.flatMap((backgroundSource) => [
        backgroundSource.backgroundName,
        backgroundSource.perkGroupName,
      ]),
      ...perk.scenarioSources.flatMap((scenarioSource) => [
        scenarioSource.scenarioName,
        scenarioSource.scenarioId,
        scenarioSource.grantType,
        scenarioSource.sourceMethodName,
        ...scenarioSource.candidatePerkNames,
      ]),
    ]
      .filter((value) => value.length > 0)
      .join(' '),
  )
}

function getNormalizedPerkSearchText(perk: LegendsPerkRecord): string {
  const cachedSearchText = normalizedPerkSearchTextCache.get(perk)

  if (cachedSearchText !== undefined) {
    return cachedSearchText
  }

  const searchText = perk.searchText.length > 0 ? perk.searchText : createPerkSearchText(perk)
  const normalizedSearchText = searchText.toLowerCase()

  normalizedPerkSearchTextCache.set(perk, normalizedSearchText)

  return normalizedSearchText
}

function getNormalizedPerkSearchIndex(perk: LegendsPerkRecord): NormalizedPerkSearchIndex {
  const backgroundNames = perk.backgroundSources.map((backgroundSource) =>
    backgroundSource.backgroundName.toLowerCase(),
  )
  const backgroundSourceSearchText = perk.backgroundSources
    .map((backgroundSource) =>
      [backgroundSource.backgroundName, backgroundSource.perkGroupName].join(' '),
    )
    .join(' ')
  const normalizedSearchText = getNormalizedPerkSearchText(perk)
  const normalizedBackgroundSourceSearchText = backgroundSourceSearchText.toLowerCase()

  const normalizedSearchIndex = {
    backgroundNames,
    categoryNames: perk.categoryNames.map((categoryName) => categoryName.toLowerCase()),
    perkName: perk.perkName.toLowerCase(),
    scenarioNames: perk.scenarioSources.map((scenarioSource) =>
      scenarioSource.scenarioName.toLowerCase(),
    ),
    searchText:
      normalizedBackgroundSourceSearchText.length > 0 &&
      !normalizedSearchText.includes(normalizedBackgroundSourceSearchText)
        ? `${normalizedSearchText} ${normalizedBackgroundSourceSearchText}`
        : normalizedSearchText,
    perkGroupNames: perk.placements.map((placement) => placement.perkGroupName.toLowerCase()),
  }

  return normalizedSearchIndex
}

function getLowestPlacementTier(perk: LegendsPerkRecord): number | null {
  const placementTiers = perk.placements
    .map((placement) => placement.tier)
    .filter((tier): tier is number => tier !== null)
    .toSorted((leftTier, rightTier) => leftTier - rightTier)

  return placementTiers[0] ?? null
}

function getPrimaryPlacement(perk: LegendsPerkRecord): LegendsPerkPlacement | null {
  return perk.placements[0] ?? null
}

export function getTierLabel(tier: number | null): string {
  return tier === null ? 'No tier' : `Tier ${tier}`
}

function isFlavorQuoteParagraph(paragraph: string): boolean {
  const trimmedParagraph = paragraph.trim()

  return (
    (trimmedParagraph.startsWith("'") && trimmedParagraph.endsWith("'")) ||
    (trimmedParagraph.startsWith('"') && trimmedParagraph.endsWith('"'))
  )
}

function isEffectDescriptionParagraph(paragraph: string): boolean {
  const trimmedParagraph = paragraph.trim()

  return /^(Passive|Active|Specialist Weapon Perk):/u.test(trimmedParagraph)
}

function formatPreviewParagraph(paragraph: string): string {
  return formatDisplayBulletText(paragraph.trim().replace(/^Passive:\s*/u, ''))
}

function getPreviewDescriptionParagraphs(descriptionParagraphs: string[]): string[] | null {
  if (descriptionParagraphs.length === 0) {
    return null
  }

  const firstEffectParagraphIndex = descriptionParagraphs.findIndex((paragraph) =>
    isEffectDescriptionParagraph(paragraph),
  )

  if (firstEffectParagraphIndex !== -1) {
    return descriptionParagraphs.slice(firstEffectParagraphIndex)
  }

  const nonFlavorParagraphs = descriptionParagraphs.filter(
    (paragraph) => !isFlavorQuoteParagraph(paragraph),
  )

  return nonFlavorParagraphs.length > 0 ? nonFlavorParagraphs : [descriptionParagraphs[0]]
}

export function getPerkPreviewParagraphs(perk: LegendsPerkRecord): string[] {
  const favouredEnemyTarget = perk.favouredEnemyTargets?.[0]
  const backgroundSource = perk.backgroundSources[0]
  const scenarioSource = perk.scenarioSources[0]
  const descriptionParagraphs = getPreviewDescriptionParagraphs(perk.descriptionParagraphs)

  if (descriptionParagraphs !== null) {
    return descriptionParagraphs.map(formatPreviewParagraph)
  }

  if (favouredEnemyTarget) {
    return [
      `${favouredEnemyTarget.entityName} (${favouredEnemyTarget.killsPerPercentBonus ?? 'varies'})`,
    ]
  }

  if (backgroundSource) {
    return [`${backgroundSource.backgroundName} via ${backgroundSource.perkGroupName}`]
  }

  if (scenarioSource) {
    return [`${scenarioSource.scenarioName} (${scenarioSource.grantType})`]
  }

  return ['No description available.']
}

function comparePerksAlphabetically(
  leftPerk: LegendsPerkRecord,
  rightPerk: LegendsPerkRecord,
): number {
  const leftPrimaryPlacement = getPrimaryPlacement(leftPerk)
  const rightPrimaryPlacement = getPrimaryPlacement(rightPerk)
  const leftTier = getLowestPlacementTier(leftPerk) ?? Number.POSITIVE_INFINITY
  const rightTier = getLowestPlacementTier(rightPerk) ?? Number.POSITIVE_INFINITY

  return (
    leftPerk.primaryCategoryName.localeCompare(rightPerk.primaryCategoryName) ||
    (leftPrimaryPlacement?.perkGroupName ?? '').localeCompare(
      rightPrimaryPlacement?.perkGroupName ?? '',
    ) ||
    leftTier - rightTier ||
    leftPerk.perkName.localeCompare(rightPerk.perkName)
  )
}

function perkMatchesFilters(
  perk: LegendsPerkRecord,
  filters: PerkSearchFilters,
  categoryFilterMode: CategoryFilterMode,
): boolean {
  if (categoryFilterMode === 'selection' && filters.selectedCategoryNames.length > 0) {
    const matchingSelectedCategoryNames = filters.selectedCategoryNames.filter((categoryName) =>
      perk.categoryNames.includes(categoryName),
    )

    if (matchingSelectedCategoryNames.length === 0) {
      return false
    }

    const matchesSelectedCategoryPerkGroupFilter = matchingSelectedCategoryNames.some(
      (categoryName) => {
        const selectedPerkGroupIds = filters.selectedPerkGroupIdsByCategory[categoryName] ?? []

        if (selectedPerkGroupIds.length === 0) {
          return true
        }

        return perk.placements.some(
          (placement) =>
            placement.categoryName === categoryName &&
            selectedPerkGroupIds.includes(placement.perkGroupId),
        )
      },
    )

    if (!matchesSelectedCategoryPerkGroupFilter) {
      return false
    }
  }

  return true
}

function getSearchScore(perk: LegendsPerkRecord, query: string): number | null {
  if (!query) {
    return 0
  }

  const normalizedQuery = normalizeSearchValue(query)
  const searchTerms = normalizedQuery.split(/\s+/).filter(Boolean)
  const normalizedSearchIndex = getNormalizedPerkSearchIndex(perk)
  const { backgroundNames, categoryNames, perkName, scenarioNames, searchText, perkGroupNames } =
    normalizedSearchIndex

  if (!searchTerms.every((searchTerm) => searchText.includes(searchTerm))) {
    return null
  }

  if (perkName === normalizedQuery) {
    return 0
  }

  if (perkName.startsWith(normalizedQuery)) {
    return 1
  }

  if (perkName.includes(normalizedQuery)) {
    return 2
  }

  if (perkGroupNames.some((perkGroupName) => perkGroupName === normalizedQuery)) {
    return 3
  }

  if (perkGroupNames.some((perkGroupName) => perkGroupName.startsWith(normalizedQuery))) {
    return 4
  }

  if (categoryNames.some((categoryName) => categoryName === normalizedQuery)) {
    return 5
  }

  if (categoryNames.some((categoryName) => categoryName.startsWith(normalizedQuery))) {
    return 6
  }

  if (backgroundNames.some((backgroundName) => backgroundName === normalizedQuery)) {
    return 7
  }

  if (scenarioNames.some((scenarioName) => scenarioName === normalizedQuery)) {
    return 8
  }

  return 9
}

export function filterAndSortPerks(
  perks: LegendsPerkRecord[],
  filters: PerkSearchFilters,
): LegendsPerkRecord[] {
  const normalizedQuery = normalizeSearchValue(filters.query)
  const categoryFilterMode =
    filters.categoryFilterMode ??
    getCategoryFilterModeFromSelection({
      selectedCategoryNames: filters.selectedCategoryNames,
      selectedPerkGroupIdsByCategory: filters.selectedPerkGroupIdsByCategory,
    })

  if (categoryFilterMode === 'none' && !normalizedQuery) {
    return []
  }

  const visiblePerks = perks.filter((perk) => perkMatchesFilters(perk, filters, categoryFilterMode))

  if (!normalizedQuery) {
    return visiblePerks.toSorted(comparePerksAlphabetically)
  }

  return visiblePerks
    .map((perk) => ({
      perk,
      score: getSearchScore(perk, normalizedQuery),
    }))
    .filter((entry) => entry.score !== null)
    .toSorted((leftEntry, rightEntry) => {
      return (
        Number(leftEntry.score) - Number(rightEntry.score) ||
        comparePerksAlphabetically(leftEntry.perk, rightEntry.perk)
      )
    })
    .map((entry) => entry.perk)
}
