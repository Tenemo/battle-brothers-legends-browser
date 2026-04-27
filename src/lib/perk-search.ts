import type { LegendsPerkPlacement, LegendsPerkRecord } from '../types/legends-perks'

type PerkBrowserFilters = {
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

const normalizedPerkSearchIndexByPerkId = new Map<string, NormalizedPerkSearchIndex>()

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase()
}

function getNormalizedPerkSearchIndex(perk: LegendsPerkRecord): NormalizedPerkSearchIndex {
  const cachedSearchIndex = normalizedPerkSearchIndexByPerkId.get(perk.id)

  if (cachedSearchIndex) {
    return cachedSearchIndex
  }

  const backgroundNames = perk.backgroundSources.map((backgroundSource) =>
    backgroundSource.backgroundName.toLowerCase(),
  )
  const backgroundSourceSearchText = perk.backgroundSources
    .map((backgroundSource) =>
      [
        backgroundSource.backgroundName,
        backgroundSource.categoryName,
        backgroundSource.perkGroupName,
      ].join(' '),
    )
    .join(' ')

  const normalizedSearchIndex = {
    backgroundNames,
    categoryNames: perk.categoryNames.map((categoryName) => categoryName.toLowerCase()),
    perkName: perk.perkName.toLowerCase(),
    scenarioNames: perk.scenarioSources.map((scenarioSource) =>
      scenarioSource.scenarioName.toLowerCase(),
    ),
    searchText: `${perk.searchText} ${backgroundSourceSearchText}`.toLowerCase(),
    perkGroupNames: perk.placements.map((placement) => placement.perkGroupName.toLowerCase()),
  }

  normalizedPerkSearchIndexByPerkId.set(perk.id, normalizedSearchIndex)
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
  return paragraph.trim().replace(/^Passive:\s*/u, '')
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
  const primaryPlacement = getPrimaryPlacement(perk)
  const favouredEnemyTarget = perk.favouredEnemyTargets?.[0]
  const backgroundSource = perk.backgroundSources[0]
  const scenarioSource = perk.scenarioSources[0]
  const descriptionParagraphs = getPreviewDescriptionParagraphs(perk.descriptionParagraphs)

  if (descriptionParagraphs !== null) {
    return descriptionParagraphs.map(formatPreviewParagraph)
  }

  if (primaryPlacement?.perkGroupAttributes[0]) {
    return [primaryPlacement.perkGroupAttributes[0]]
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

function perkMatchesFilters(perk: LegendsPerkRecord, filters: PerkBrowserFilters): boolean {
  if (filters.selectedCategoryNames.length > 0) {
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
  filters: PerkBrowserFilters,
): LegendsPerkRecord[] {
  const visiblePerks = perks.filter((perk) => perkMatchesFilters(perk, filters))
  const normalizedQuery = normalizeSearchValue(filters.query)

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
