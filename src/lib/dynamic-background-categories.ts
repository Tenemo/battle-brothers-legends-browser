import type { LegendsDynamicBackgroundCategoryName } from '../types/legends-perks'

export const dynamicBackgroundCategoryNames = [
  'Weapon',
  'Defense',
  'Traits',
  'Enemy',
  'Class',
  'Profession',
  'Magic',
] as const satisfies LegendsDynamicBackgroundCategoryName[]

export const dynamicBackgroundCategoryOrder = [...dynamicBackgroundCategoryNames, 'Other'] as const

export const deterministicDynamicBackgroundCategoryNames = [
  'Weapon',
  'Defense',
  'Traits',
] as const satisfies LegendsDynamicBackgroundCategoryName[]

export const chanceDynamicBackgroundCategoryNames = [
  'Enemy',
  'Profession',
] as const satisfies LegendsDynamicBackgroundCategoryName[]

export const dynamicBackgroundCategoryMinimumKeys = {
  Class: 'Class',
  Defense: 'Defense',
  Enemy: 'Enemy',
  Magic: 'Magic',
  Profession: 'Profession',
  Traits: 'Traits',
  Weapon: 'Weapon',
} as const satisfies Record<LegendsDynamicBackgroundCategoryName, string>

export const dynamicBackgroundCategoryChanceKeys = {
  Class: 'ClassChance',
  Enemy: 'EnemyChance',
  Magic: 'MagicChance',
  Profession: 'ProfessionChance',
} as const satisfies Partial<Record<LegendsDynamicBackgroundCategoryName, string>>

const dynamicBackgroundCategoryNameSet = new Set<LegendsDynamicBackgroundCategoryName>(
  dynamicBackgroundCategoryNames,
)

export function isDynamicBackgroundCategoryName(
  categoryName: string,
): categoryName is LegendsDynamicBackgroundCategoryName {
  return dynamicBackgroundCategoryNameSet.has(categoryName as LegendsDynamicBackgroundCategoryName)
}

export function getCategoryPriority(categoryName: string): number {
  const priority = dynamicBackgroundCategoryOrder.indexOf(
    categoryName as (typeof dynamicBackgroundCategoryOrder)[number],
  )

  return priority === -1 ? Number.POSITIVE_INFINITY : priority
}

export function compareCategoryNames(leftCategoryName: string, rightCategoryName: string): number {
  return (
    getCategoryPriority(leftCategoryName) - getCategoryPriority(rightCategoryName) ||
    leftCategoryName.localeCompare(rightCategoryName)
  )
}
