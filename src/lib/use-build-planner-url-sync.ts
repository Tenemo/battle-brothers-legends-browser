import { useEffect, useState } from 'react'
import {
  createBuildPlannerUrlSearch,
  readBuildPlannerUrlStateFromLocation,
  type BuildPlannerUrlState,
  type BuildPlannerUrlStateReadOptions,
  type BuildPlannerUrlStateWriteOptions,
} from './build-planner-url-state'

export function useInitialBuildPlannerUrlState(
  options: BuildPlannerUrlStateReadOptions,
): BuildPlannerUrlState {
  const [initialUrlState] = useState(() => readBuildPlannerUrlStateFromLocation(options))

  return initialUrlState
}

export function useBuildPlannerUrlSync(
  urlState: BuildPlannerUrlState,
  options: BuildPlannerUrlStateWriteOptions,
  onUrlStateChange?: (urlState: BuildPlannerUrlState) => void,
): void {
  const {
    availableBackgroundVeteranPerkLevelIntervals,
    availableCategoryNames,
    perkGroupOptionsByCategory,
    perksById,
  } = options
  const {
    categoryFilterMode,
    optionalPerkIds,
    pickedPerkIds,
    query,
    selectedCategoryNames,
    selectedBackgroundVeteranPerkLevelIntervals,
    selectedPerkGroupIdsByCategory,
    shouldAllowBackgroundStudyBook,
    shouldAllowBackgroundStudyScroll,
    shouldAllowSecondBackgroundStudyScroll,
    shouldIncludeAncientScrollPerkGroups,
    shouldIncludeOriginBackgrounds,
    shouldIncludeOriginPerkGroups,
  } = urlState

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const nextSearch = createBuildPlannerUrlSearch(
      {
        categoryFilterMode,
        optionalPerkIds,
        pickedPerkIds,
        query,
        selectedCategoryNames,
        selectedBackgroundVeteranPerkLevelIntervals,
        selectedPerkGroupIdsByCategory,
        shouldAllowBackgroundStudyBook,
        shouldAllowBackgroundStudyScroll,
        shouldAllowSecondBackgroundStudyScroll,
        shouldIncludeAncientScrollPerkGroups,
        shouldIncludeOriginBackgrounds,
        shouldIncludeOriginPerkGroups,
      },
      {
        availableCategoryNames,
        availableBackgroundVeteranPerkLevelIntervals,
        perkGroupOptionsByCategory,
        perksById,
      },
    )

    if (window.location.search === nextSearch) {
      return
    }

    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${nextSearch}${window.location.hash}`,
    )
  }, [
    availableCategoryNames,
    availableBackgroundVeteranPerkLevelIntervals,
    categoryFilterMode,
    optionalPerkIds,
    perkGroupOptionsByCategory,
    perksById,
    pickedPerkIds,
    query,
    selectedCategoryNames,
    selectedBackgroundVeteranPerkLevelIntervals,
    selectedPerkGroupIdsByCategory,
    shouldAllowBackgroundStudyBook,
    shouldAllowBackgroundStudyScroll,
    shouldAllowSecondBackgroundStudyScroll,
    shouldIncludeAncientScrollPerkGroups,
    shouldIncludeOriginBackgrounds,
    shouldIncludeOriginPerkGroups,
  ])

  useEffect(() => {
    if (typeof window === 'undefined' || !onUrlStateChange) {
      return
    }

    const handleUrlStateChange = onUrlStateChange

    function handlePopState() {
      handleUrlStateChange(
        readBuildPlannerUrlStateFromLocation({
          availableCategoryNames,
          availableBackgroundVeteranPerkLevelIntervals,
          perks: [...perksById.values()],
          perkGroupOptionsByCategory,
        }),
      )
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [
    availableBackgroundVeteranPerkLevelIntervals,
    availableCategoryNames,
    onUrlStateChange,
    perkGroupOptionsByCategory,
    perksById,
  ])
}
