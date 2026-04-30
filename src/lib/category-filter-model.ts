import type { BuildPlannerUrlPerkGroupOption } from './build-planner-url-state'
import type { LegendsPerkRecord } from '../types/legends-perks'
import { compareCategoryNames } from './dynamic-background-categories'
import { getSearchMatchPriority } from './perk-display'

export type CategoryPerkGroupOption = BuildPlannerUrlPerkGroupOption & {
  perkCount: number
}

type PerkValueCountOptions = {
  dedupeValuesPerPerk?: boolean
}

function getPerkCountsByValues(
  perks: LegendsPerkRecord[],
  getValues: (perk: LegendsPerkRecord) => Iterable<string>,
  { dedupeValuesPerPerk = false }: PerkValueCountOptions = {},
): Map<string, number> {
  const counts = new Map<string, number>()

  for (const perk of perks) {
    const values = getValues(perk)
    const countedValues = dedupeValuesPerPerk ? new Set(values) : values

    for (const value of countedValues) {
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }
  }

  return counts
}

export function getCategoryCounts(perks: LegendsPerkRecord[]): Map<string, number> {
  return getPerkCountsByValues(perks, (perk) => perk.categoryNames)
}

export function getPickedPerkCountsByCategory(
  pickedPerks: LegendsPerkRecord[],
): Map<string, number> {
  return getPerkCountsByValues(pickedPerks, (pickedPerk) => pickedPerk.categoryNames, {
    dedupeValuesPerPerk: true,
  })
}

export function getPickedPerkCountsByPerkGroup(
  pickedPerks: LegendsPerkRecord[],
): Map<string, number> {
  return getPerkCountsByValues(
    pickedPerks,
    (pickedPerk) => pickedPerk.placements.map((placement) => placement.perkGroupId),
    { dedupeValuesPerPerk: true },
  )
}

export function getCategoryPerkGroupOptions(
  perks: LegendsPerkRecord[],
): Map<string, CategoryPerkGroupOption[]> {
  const optionsByCategory = new Map<
    string,
    Map<string, { perkIds: Set<string>; perkGroupId: string; perkGroupName: string }>
  >()

  for (const perk of perks) {
    for (const placement of perk.placements) {
      if (!optionsByCategory.has(placement.categoryName)) {
        optionsByCategory.set(placement.categoryName, new Map())
      }

      const categoryOptions = optionsByCategory.get(placement.categoryName)

      if (!categoryOptions?.has(placement.perkGroupId)) {
        categoryOptions?.set(placement.perkGroupId, {
          perkIds: new Set(),
          perkGroupId: placement.perkGroupId,
          perkGroupName: placement.perkGroupName,
        })
      }

      categoryOptions?.get(placement.perkGroupId)?.perkIds.add(perk.id)
    }
  }

  return new Map(
    [...optionsByCategory.entries()].map(([categoryName, perkGroupOptions]) => [
      categoryName,
      [...perkGroupOptions.values()]
        .map((perkGroupOption) => ({
          perkCount: perkGroupOption.perkIds.size,
          perkGroupId: perkGroupOption.perkGroupId,
          perkGroupName: perkGroupOption.perkGroupName,
        }))
        .toSorted((leftPerkGroupOption, rightPerkGroupOption) =>
          leftPerkGroupOption.perkGroupName.localeCompare(rightPerkGroupOption.perkGroupName),
        ),
    ]),
  )
}

export function getVisiblePerkCountsByCategory(perks: LegendsPerkRecord[]): Map<string, number> {
  return getPerkCountsByValues(perks, (perk) => perk.categoryNames, {
    dedupeValuesPerPerk: true,
  })
}

export function getVisiblePerkCountsByCategoryPerkGroup(
  perks: LegendsPerkRecord[],
): Map<string, number> {
  const countsByCategoryPerkGroup = new Map<string, number>()

  for (const perk of perks) {
    for (const placement of perk.placements) {
      const categoryPerkGroupKey = `${placement.categoryName}::${placement.perkGroupId}`
      countsByCategoryPerkGroup.set(
        categoryPerkGroupKey,
        (countsByCategoryPerkGroup.get(categoryPerkGroupKey) ?? 0) + 1,
      )
    }
  }

  return countsByCategoryPerkGroup
}

export function compareDisplayedCategories({
  leftCategoryName,
  normalizedSearchPhrase,
  rightCategoryName,
  perkGroupOptionsByCategory,
  visiblePerkCountsByCategory,
}: {
  leftCategoryName: string
  normalizedSearchPhrase: string
  rightCategoryName: string
  perkGroupOptionsByCategory: Map<string, CategoryPerkGroupOption[]>
  visiblePerkCountsByCategory: Map<string, number>
}): number {
  if (normalizedSearchPhrase.length === 0) {
    return compareCategoryNames(leftCategoryName, rightCategoryName)
  }

  const leftPerkGroupOptions = perkGroupOptionsByCategory.get(leftCategoryName) ?? []
  const rightPerkGroupOptions = perkGroupOptionsByCategory.get(rightCategoryName) ?? []
  const leftCategoryMatchPriority = getSearchMatchPriority(leftCategoryName, normalizedSearchPhrase)
  const rightCategoryMatchPriority = getSearchMatchPriority(
    rightCategoryName,
    normalizedSearchPhrase,
  )
  const leftPerkGroupMatchPriority = Math.min(
    ...leftPerkGroupOptions.map((perkGroupOption) =>
      getSearchMatchPriority(perkGroupOption.perkGroupName, normalizedSearchPhrase),
    ),
    2,
  )
  const rightPerkGroupMatchPriority = Math.min(
    ...rightPerkGroupOptions.map((perkGroupOption) =>
      getSearchMatchPriority(perkGroupOption.perkGroupName, normalizedSearchPhrase),
    ),
    2,
  )
  const leftVisiblePerkCount = visiblePerkCountsByCategory.get(leftCategoryName) ?? 0
  const rightVisiblePerkCount = visiblePerkCountsByCategory.get(rightCategoryName) ?? 0
  const leftHasVisiblePerksPriority = leftVisiblePerkCount > 0 ? 0 : 1
  const rightHasVisiblePerksPriority = rightVisiblePerkCount > 0 ? 0 : 1

  return (
    leftCategoryMatchPriority - rightCategoryMatchPriority ||
    leftPerkGroupMatchPriority - rightPerkGroupMatchPriority ||
    leftHasVisiblePerksPriority - rightHasVisiblePerksPriority ||
    rightVisiblePerkCount - leftVisiblePerkCount ||
    compareCategoryNames(leftCategoryName, rightCategoryName)
  )
}

export function compareDisplayedPerkGroupOptions({
  categoryName,
  leftPerkGroupOption,
  normalizedSearchPhrase,
  rightPerkGroupOption,
  visiblePerkCountsByCategoryPerkGroup,
}: {
  categoryName: string
  leftPerkGroupOption: CategoryPerkGroupOption
  normalizedSearchPhrase: string
  rightPerkGroupOption: CategoryPerkGroupOption
  visiblePerkCountsByCategoryPerkGroup: Map<string, number>
}): number {
  if (normalizedSearchPhrase.length === 0) {
    return leftPerkGroupOption.perkGroupName.localeCompare(rightPerkGroupOption.perkGroupName)
  }

  const leftMatchPriority = getSearchMatchPriority(
    leftPerkGroupOption.perkGroupName,
    normalizedSearchPhrase,
  )
  const rightMatchPriority = getSearchMatchPriority(
    rightPerkGroupOption.perkGroupName,
    normalizedSearchPhrase,
  )
  const leftVisiblePerkCount =
    visiblePerkCountsByCategoryPerkGroup.get(
      `${categoryName}::${leftPerkGroupOption.perkGroupId}`,
    ) ?? 0
  const rightVisiblePerkCount =
    visiblePerkCountsByCategoryPerkGroup.get(
      `${categoryName}::${rightPerkGroupOption.perkGroupId}`,
    ) ?? 0
  const leftHasVisiblePerksPriority = leftVisiblePerkCount > 0 ? 0 : 1
  const rightHasVisiblePerksPriority = rightVisiblePerkCount > 0 ? 0 : 1

  return (
    leftMatchPriority - rightMatchPriority ||
    leftHasVisiblePerksPriority - rightHasVisiblePerksPriority ||
    rightVisiblePerkCount - leftVisiblePerkCount ||
    leftPerkGroupOption.perkGroupName.localeCompare(rightPerkGroupOption.perkGroupName)
  )
}
