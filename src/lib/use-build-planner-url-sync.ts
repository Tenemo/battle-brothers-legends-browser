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
  const { availableCategoryNames, perkGroupOptionsByCategory, perksById } = options
  const {
    optionalPerkIds,
    pickedPerkIds,
    query,
    selectedCategoryNames,
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
        optionalPerkIds,
        pickedPerkIds,
        query,
        selectedCategoryNames,
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
    optionalPerkIds,
    perkGroupOptionsByCategory,
    perksById,
    pickedPerkIds,
    query,
    selectedCategoryNames,
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
          perks: [...perksById.values()],
          perkGroupOptionsByCategory,
        }),
      )
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [availableCategoryNames, onUrlStateChange, perkGroupOptionsByCategory, perksById])
}
