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
  'Magic',
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
