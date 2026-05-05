import type { BuildPlannerUrlState } from './build-planner-url-state'
import { getCategoryFilterModeFromSelection } from './category-filter-state'
import type { SavedBuildPlannerFilters } from './saved-builds-storage'

type SavedBuildUrlStateInput = {
  availablePerkIds: string[]
  optionalPerkIds: string[]
  plannerFilters?: SavedBuildPlannerFilters
}

export function createSavedBuildPlannerFilters(
  urlState: BuildPlannerUrlState,
): SavedBuildPlannerFilters {
  return {
    categoryFilterMode:
      urlState.categoryFilterMode ??
      getCategoryFilterModeFromSelection({
        selectedCategoryNames: urlState.selectedCategoryNames,
        selectedPerkGroupIdsByCategory: urlState.selectedPerkGroupIdsByCategory,
      }),
    query: urlState.query,
    selectedBackgroundVeteranPerkLevelIntervals:
      urlState.selectedBackgroundVeteranPerkLevelIntervals,
    selectedCategoryNames: urlState.selectedCategoryNames,
    selectedPerkGroupIdsByCategory: urlState.selectedPerkGroupIdsByCategory,
    shouldAllowBackgroundStudyBook: urlState.shouldAllowBackgroundStudyBook,
    shouldAllowBackgroundStudyScroll: urlState.shouldAllowBackgroundStudyScroll,
    shouldAllowSecondBackgroundStudyScroll: urlState.shouldAllowSecondBackgroundStudyScroll,
    shouldIncludeAncientScrollPerkGroups: urlState.shouldIncludeAncientScrollPerkGroups,
    shouldIncludeOriginBackgrounds: urlState.shouldIncludeOriginBackgrounds,
    shouldIncludeOriginPerkGroups: urlState.shouldIncludeOriginPerkGroups,
  }
}

export function createDefaultSavedBuildPlannerFilters(
  availableBackgroundVeteranPerkLevelIntervals: readonly number[],
): SavedBuildPlannerFilters {
  return {
    categoryFilterMode: 'all',
    query: '',
    selectedBackgroundVeteranPerkLevelIntervals: [...availableBackgroundVeteranPerkLevelIntervals],
    selectedCategoryNames: [],
    selectedPerkGroupIdsByCategory: {},
    shouldAllowBackgroundStudyBook: true,
    shouldAllowBackgroundStudyScroll: true,
    shouldAllowSecondBackgroundStudyScroll: false,
    shouldIncludeAncientScrollPerkGroups: true,
    shouldIncludeOriginBackgrounds: false,
    shouldIncludeOriginPerkGroups: false,
  }
}

export function createSavedBuildUrlState(
  savedBuild: SavedBuildUrlStateInput,
): BuildPlannerUrlState | null {
  if (!savedBuild.plannerFilters) {
    return null
  }

  return {
    ...savedBuild.plannerFilters,
    detailSelection: { type: 'none' },
    optionalPerkIds: savedBuild.optionalPerkIds,
    pickedPerkIds: savedBuild.availablePerkIds,
  }
}
