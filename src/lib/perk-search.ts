import type { LegendsPerkPlacement, LegendsPerkRecord } from '../types/legends-perks'

type PerkBrowserFilters = {
  query: string
  selectedGroupNames: string[]
  selectedTreeIdsByGroup: Record<string, string[]>
}

type NormalizedPerkSearchIndex = {
  backgroundNames: string[]
  groupNames: string[]
  perkName: string
  scenarioNames: string[]
  searchText: string
  treeNames: string[]
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

  const normalizedSearchIndex = {
    backgroundNames: perk.backgroundSources.map((backgroundSource) =>
      backgroundSource.backgroundName.toLowerCase(),
    ),
    groupNames: perk.groupNames.map((groupName) => groupName.toLowerCase()),
    perkName: perk.perkName.toLowerCase(),
    scenarioNames: perk.scenarioSources.map((scenarioSource) =>
      scenarioSource.scenarioName.toLowerCase(),
    ),
    searchText: perk.searchText.toLowerCase(),
    treeNames: perk.placements.map((placement) => placement.treeName.toLowerCase()),
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
  const favoredEnemyTarget = perk.favoredEnemyTargets?.[0]
  const backgroundSource = perk.backgroundSources[0]
  const scenarioSource = perk.scenarioSources[0]
  const descriptionParagraphs = getPreviewDescriptionParagraphs(perk.descriptionParagraphs)

  if (descriptionParagraphs !== null) {
    return descriptionParagraphs.map(formatPreviewParagraph)
  }

  if (primaryPlacement?.treeAttributes[0]) {
    return [primaryPlacement.treeAttributes[0]]
  }

  if (primaryPlacement?.treeDescriptions[0]) {
    return [primaryPlacement.treeDescriptions[0]]
  }

  if (favoredEnemyTarget) {
    return [
      `${favoredEnemyTarget.entityName} (${favoredEnemyTarget.killsPerPercentBonus ?? 'varies'})`,
    ]
  }

  if (backgroundSource) {
    return [`${backgroundSource.backgroundName} via ${backgroundSource.treeName}`]
  }

  if (scenarioSource) {
    return [`${scenarioSource.scenarioName} (${scenarioSource.grantType})`]
  }

  return ['No description available.']
}

export function getPerkPreview(perk: LegendsPerkRecord): string {
  return getPerkPreviewParagraphs(perk).join(' ')
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
    leftPerk.primaryGroupName.localeCompare(rightPerk.primaryGroupName) ||
    (leftPrimaryPlacement?.treeName ?? '').localeCompare(rightPrimaryPlacement?.treeName ?? '') ||
    leftTier - rightTier ||
    leftPerk.perkName.localeCompare(rightPerk.perkName)
  )
}

function perkMatchesFilters(perk: LegendsPerkRecord, filters: PerkBrowserFilters): boolean {
  if (filters.selectedGroupNames.length > 0) {
    const matchingSelectedGroupNames = filters.selectedGroupNames.filter((groupName) =>
      perk.groupNames.includes(groupName),
    )

    if (matchingSelectedGroupNames.length === 0) {
      return false
    }

    const matchesSelectedCategoryTreeFilter = matchingSelectedGroupNames.some((groupName) => {
      const selectedTreeIds = filters.selectedTreeIdsByGroup[groupName] ?? []

      if (selectedTreeIds.length === 0) {
        return true
      }

      return perk.placements.some(
        (placement) =>
          placement.categoryName === groupName && selectedTreeIds.includes(placement.treeId),
      )
    })

    if (!matchesSelectedCategoryTreeFilter) {
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
  const { backgroundNames, groupNames, perkName, scenarioNames, searchText, treeNames } =
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

  if (treeNames.some((treeName) => treeName === normalizedQuery)) {
    return 3
  }

  if (treeNames.some((treeName) => treeName.startsWith(normalizedQuery))) {
    return 4
  }

  if (groupNames.some((groupName) => groupName === normalizedQuery)) {
    return 5
  }

  if (groupNames.some((groupName) => groupName.startsWith(normalizedQuery))) {
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
