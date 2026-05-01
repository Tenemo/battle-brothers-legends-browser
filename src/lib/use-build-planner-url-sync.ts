import { useEffect, useState, type MutableRefObject } from 'react'
import {
  createBuildPlannerUrlSearch,
  readBuildPlannerUrlStateFromLocation,
  type BuildPlannerUrlState,
  type BuildPlannerUrlStateReadOptions,
  type BuildPlannerUrlStateWriteOptions,
} from './build-planner-url-state'

export type BuildPlannerUrlHistoryWriteMode = 'push' | 'replace'

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
  historyWriteModeRef?: MutableRefObject<BuildPlannerUrlHistoryWriteMode>,
): void {
  const {
    availableBackgroundVeteranPerkLevelIntervals,
    availableCategoryNames,
    backgrounds,
    perkGroupOptionsByCategory,
    perksById,
  } = options
  const {
    categoryFilterMode,
    detailSelection,
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
        detailSelection,
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
      if (historyWriteModeRef) {
        historyWriteModeRef.current = 'replace'
      }
      return
    }

    const nextUrl = `${window.location.pathname}${nextSearch}${window.location.hash}`
    const writeMode = historyWriteModeRef?.current ?? 'replace'

    if (historyWriteModeRef) {
      historyWriteModeRef.current = 'replace'
    }

    if (writeMode === 'push') {
      window.history.pushState(window.history.state, '', nextUrl)
    } else {
      window.history.replaceState(window.history.state, '', nextUrl)
    }
  }, [
    availableCategoryNames,
    availableBackgroundVeteranPerkLevelIntervals,
    categoryFilterMode,
    detailSelection,
    historyWriteModeRef,
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
          backgrounds,
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
    backgrounds,
    onUrlStateChange,
    perkGroupOptionsByCategory,
    perksById,
  ])
}
