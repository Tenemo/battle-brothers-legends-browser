import type { LegendsDynamicBackgroundCategoryName } from '../types/legends-perks'
import {
  dynamicBackgroundCategoryNames,
  dynamicBackgroundCategoryOrder,
} from './dynamic-background-categories'

const categoryOrder = dynamicBackgroundCategoryOrder

const dynamicBackgroundCategoryNameSet = new Set<LegendsDynamicBackgroundCategoryName>(
  dynamicBackgroundCategoryNames,
)

export function isDynamicBackgroundCategoryName(
  categoryName: string,
): categoryName is LegendsDynamicBackgroundCategoryName {
  return dynamicBackgroundCategoryNameSet.has(categoryName as LegendsDynamicBackgroundCategoryName)
}

export function getCategoryPriority(categoryName: string): number {
  const priority = categoryOrder.indexOf(categoryName as (typeof categoryOrder)[number])

  return priority === -1 ? Number.POSITIVE_INFINITY : priority
}

export function compareCategoryNames(leftCategoryName: string, rightCategoryName: string): number {
  return (
    getCategoryPriority(leftCategoryName) - getCategoryPriority(rightCategoryName) ||
    leftCategoryName.localeCompare(rightCategoryName)
  )
}
