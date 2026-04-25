import type { PerkBrowserUrlTreeOption } from './perk-browser-url-state'
import type { LegendsPerkRecord } from '../types/legends-perks'
import { compareCategoryNames } from './perk-categories'
import { getSearchMatchPriority } from './perk-display'

export type CategoryTreeOption = PerkBrowserUrlTreeOption & {
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

export function getGroupCounts(perks: LegendsPerkRecord[]): Map<string, number> {
  return getPerkCountsByValues(perks, (perk) => perk.groupNames)
}

export function getPickedPerkCountsByGroup(pickedPerks: LegendsPerkRecord[]): Map<string, number> {
  return getPerkCountsByValues(pickedPerks, (pickedPerk) => pickedPerk.groupNames, {
    dedupeValuesPerPerk: true,
  })
}

export function getPickedPerkCountsByTree(pickedPerks: LegendsPerkRecord[]): Map<string, number> {
  return getPerkCountsByValues(
    pickedPerks,
    (pickedPerk) => pickedPerk.placements.map((placement) => placement.treeId),
    { dedupeValuesPerPerk: true },
  )
}

export function getCategoryTreeOptions(
  perks: LegendsPerkRecord[],
): Map<string, CategoryTreeOption[]> {
  const optionsByCategory = new Map<
    string,
    Map<string, { perkIds: Set<string>; treeId: string; treeName: string }>
  >()

  for (const perk of perks) {
    for (const placement of perk.placements) {
      if (!optionsByCategory.has(placement.categoryName)) {
        optionsByCategory.set(placement.categoryName, new Map())
      }

      const categoryOptions = optionsByCategory.get(placement.categoryName)

      if (!categoryOptions?.has(placement.treeId)) {
        categoryOptions?.set(placement.treeId, {
          perkIds: new Set(),
          treeId: placement.treeId,
          treeName: placement.treeName,
        })
      }

      categoryOptions?.get(placement.treeId)?.perkIds.add(perk.id)
    }
  }

  return new Map(
    [...optionsByCategory.entries()].map(([categoryName, treeOptions]) => [
      categoryName,
      [...treeOptions.values()]
        .map((treeOption) => ({
          perkCount: treeOption.perkIds.size,
          treeId: treeOption.treeId,
          treeName: treeOption.treeName,
        }))
        .toSorted((leftTreeOption, rightTreeOption) =>
          leftTreeOption.treeName.localeCompare(rightTreeOption.treeName),
        ),
    ]),
  )
}

export function getVisiblePerkCountsByGroup(perks: LegendsPerkRecord[]): Map<string, number> {
  return getPerkCountsByValues(perks, (perk) => perk.groupNames, {
    dedupeValuesPerPerk: true,
  })
}

export function getVisiblePerkCountsByCategoryTree(
  perks: LegendsPerkRecord[],
): Map<string, number> {
  const countsByCategoryTree = new Map<string, number>()

  for (const perk of perks) {
    for (const placement of perk.placements) {
      const categoryTreeKey = `${placement.categoryName}::${placement.treeId}`
      countsByCategoryTree.set(
        categoryTreeKey,
        (countsByCategoryTree.get(categoryTreeKey) ?? 0) + 1,
      )
    }
  }

  return countsByCategoryTree
}

export function compareDisplayedGroups({
  leftGroupName,
  normalizedSearchPhrase,
  rightGroupName,
  treeOptionsByGroup,
  visiblePerkCountsByGroup,
}: {
  leftGroupName: string
  normalizedSearchPhrase: string
  rightGroupName: string
  treeOptionsByGroup: Map<string, CategoryTreeOption[]>
  visiblePerkCountsByGroup: Map<string, number>
}): number {
  if (normalizedSearchPhrase.length === 0) {
    return compareCategoryNames(leftGroupName, rightGroupName)
  }

  const leftTreeOptions = treeOptionsByGroup.get(leftGroupName) ?? []
  const rightTreeOptions = treeOptionsByGroup.get(rightGroupName) ?? []
  const leftGroupMatchPriority = getSearchMatchPriority(leftGroupName, normalizedSearchPhrase)
  const rightGroupMatchPriority = getSearchMatchPriority(rightGroupName, normalizedSearchPhrase)
  const leftTreeMatchPriority = Math.min(
    ...leftTreeOptions.map((treeOption) =>
      getSearchMatchPriority(treeOption.treeName, normalizedSearchPhrase),
    ),
    2,
  )
  const rightTreeMatchPriority = Math.min(
    ...rightTreeOptions.map((treeOption) =>
      getSearchMatchPriority(treeOption.treeName, normalizedSearchPhrase),
    ),
    2,
  )
  const leftVisiblePerkCount = visiblePerkCountsByGroup.get(leftGroupName) ?? 0
  const rightVisiblePerkCount = visiblePerkCountsByGroup.get(rightGroupName) ?? 0
  const leftHasVisiblePerksPriority = leftVisiblePerkCount > 0 ? 0 : 1
  const rightHasVisiblePerksPriority = rightVisiblePerkCount > 0 ? 0 : 1

  return (
    leftGroupMatchPriority - rightGroupMatchPriority ||
    leftTreeMatchPriority - rightTreeMatchPriority ||
    leftHasVisiblePerksPriority - rightHasVisiblePerksPriority ||
    rightVisiblePerkCount - leftVisiblePerkCount ||
    compareCategoryNames(leftGroupName, rightGroupName)
  )
}

export function compareDisplayedTreeOptions({
  categoryName,
  leftTreeOption,
  normalizedSearchPhrase,
  rightTreeOption,
  visiblePerkCountsByCategoryTree,
}: {
  categoryName: string
  leftTreeOption: CategoryTreeOption
  normalizedSearchPhrase: string
  rightTreeOption: CategoryTreeOption
  visiblePerkCountsByCategoryTree: Map<string, number>
}): number {
  if (normalizedSearchPhrase.length === 0) {
    return leftTreeOption.treeName.localeCompare(rightTreeOption.treeName)
  }

  const leftMatchPriority = getSearchMatchPriority(leftTreeOption.treeName, normalizedSearchPhrase)
  const rightMatchPriority = getSearchMatchPriority(
    rightTreeOption.treeName,
    normalizedSearchPhrase,
  )
  const leftVisiblePerkCount =
    visiblePerkCountsByCategoryTree.get(`${categoryName}::${leftTreeOption.treeId}`) ?? 0
  const rightVisiblePerkCount =
    visiblePerkCountsByCategoryTree.get(`${categoryName}::${rightTreeOption.treeId}`) ?? 0
  const leftHasVisiblePerksPriority = leftVisiblePerkCount > 0 ? 0 : 1
  const rightHasVisiblePerksPriority = rightVisiblePerkCount > 0 ? 0 : 1

  return (
    leftMatchPriority - rightMatchPriority ||
    leftHasVisiblePerksPriority - rightHasVisiblePerksPriority ||
    rightVisiblePerkCount - leftVisiblePerkCount ||
    leftTreeOption.treeName.localeCompare(rightTreeOption.treeName)
  )
}
