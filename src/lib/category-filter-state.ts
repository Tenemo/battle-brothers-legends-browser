export type CategoryFilterMode = 'all' | 'none' | 'selection'

export function getCategoryFilterModeFromSelection({
  selectedCategoryNames,
  selectedPerkGroupIdsByCategory,
}: {
  selectedCategoryNames: string[]
  selectedPerkGroupIdsByCategory: Record<string, string[]>
}): CategoryFilterMode {
  if (
    selectedCategoryNames.length > 0 ||
    Object.values(selectedPerkGroupIdsByCategory).some(
      (selectedPerkGroupIds) => selectedPerkGroupIds.length > 0,
    )
  ) {
    return 'selection'
  }

  return 'none'
}
