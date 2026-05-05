import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from './App.module.scss'
import { BackgroundFitPanel } from './components/BackgroundFitPanel'
import {
  BuildPlanner,
  type BuildPlannerSavedBuild,
  type SavedBuildOperationStatus,
} from './components/BuildPlanner'
import { CategorySidebar } from './components/CategorySidebar'
import { DetailPanel } from './components/DetailPanel'
import { PerkResults } from './components/PerkResults'
import { type BuildRequirement } from './components/SharedControls'
import {
  allAvailableCategories,
  allBackgroundUrlOptions,
  allPerkGroupOptionsByCategory,
  allPerks,
  allPerksById,
  availableBackgroundVeteranPerkLevelIntervals,
  legendsPerkCatalogDataset,
  mediumDesktopBackgroundFitMediaQuery,
} from './app-data'
import { type RankedBackgroundFit } from './lib/background-fit'
import {
  createBuildPlannerUrlSearch,
  createSharedBuildUrlSearch,
  type BuildPlannerUrlState,
} from './lib/build-planner-url-state'
import { getBackgroundFitKey, groupBackgroundSources } from './lib/perk-display'
import { normalizeBackgroundVeteranPerkLevelIntervals } from './lib/background-veteran-perks'
import { copyBuildShareUrl, useBuildShareLink } from './lib/use-build-share-link'
import { useBackgroundFitView } from './lib/use-background-fit-view'
import { usePerkFilters } from './lib/use-perk-filters'
import { usePickedBuild } from './lib/use-picked-build'
import {
  useBuildPlannerUrlSync,
  useInitialBuildPlannerUrlState,
  type BuildPlannerUrlHistoryWriteMode,
} from './lib/use-build-planner-url-sync'
import { PlannerInteractionProvider } from './lib/planner-interaction-context'
import { usePerkInteractionState } from './lib/use-perk-interaction-state'
import { useSavedBuilds } from './lib/use-saved-builds'
import {
  createActiveDetailSelectionFromUrl,
  createBackgroundDetailSelectionFromKey,
  createInitialDetailHistoryState,
  createUrlDetailSelection,
  getSelectedPerkIdFromUrl,
  recordDetailHistoryUrlState,
  syncDetailHistoryUrlStateFromBrowser,
  type ActiveDetailSelection,
  type DetailHistoryNavigationDirection,
} from './lib/detail-history-state'
import {
  createDefaultSavedBuildPlannerFilters,
  createSavedBuildPlannerFilters,
  createSavedBuildUrlState,
} from './lib/saved-build-planner-filters'
import type { SavedBuildPlannerFilters } from './lib/saved-builds-storage'

function getInitialBackgroundFitExpandedState() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true
  }

  return !window.matchMedia(mediumDesktopBackgroundFitMediaQuery).matches
}

export function PlannerExperience() {
  const initialUrlState = useInitialBuildPlannerUrlState({
    availableCategoryNames: allAvailableCategories,
    availableBackgroundVeteranPerkLevelIntervals,
    backgrounds: allBackgroundUrlOptions,
    perks: allPerks,
    perkGroupOptionsByCategory: allPerkGroupOptionsByCategory,
  })
  const urlHistoryWriteModeRef = useRef<BuildPlannerUrlHistoryWriteMode>('replace')
  const perkFilters = usePerkFilters({
    allPerks,
    initialUrlState,
  })
  const {
    applySavedBuildPlannerFilters: applySavedBuildPerkFilters,
    applyUrlState: applyUrlPerkFilterState,
    catalogPerks,
    categoryCounts,
    categoryFilterMode,
    changePerkSearch,
    clearCategoryFilterSelection,
    displayedCategoryNames,
    displayedPerkGroupOptionsByCategory,
    expandedCategoryNames,
    inspectPerkGroup,
    perkResultListScrollResetKey,
    query,
    resetCategoryPerkGroups,
    selectAllCategories,
    selectedCategoryNames,
    selectedPerkGroupIdsByCategory,
    selectPerkGroup,
    selectSidebarPerkGroup,
    setPerkSearchQuery,
    setShouldIncludeAncientScrollPerkGroups,
    setShouldIncludeOriginPerkGroups,
    shouldIncludeAncientScrollPerkGroups,
    shouldIncludeOriginPerkGroups,
    toggleCategory,
    toggleCategoryExpansion,
    visiblePerkResultSetKey,
    visiblePerks,
  } = perkFilters
  const [shouldAllowBackgroundStudyBook, setShouldAllowBackgroundStudyBook] = useState(
    initialUrlState.shouldAllowBackgroundStudyBook,
  )
  const [shouldAllowBackgroundStudyScroll, setShouldAllowBackgroundStudyScroll] = useState(
    initialUrlState.shouldAllowBackgroundStudyScroll,
  )
  const [shouldAllowSecondBackgroundStudyScroll, setShouldAllowSecondBackgroundStudyScroll] =
    useState(initialUrlState.shouldAllowSecondBackgroundStudyScroll)
  const [shouldIncludeOriginBackgrounds, setShouldIncludeOriginBackgrounds] = useState(
    initialUrlState.shouldIncludeOriginBackgrounds,
  )
  const [
    selectedBackgroundVeteranPerkLevelIntervals,
    setSelectedBackgroundVeteranPerkLevelIntervals,
  ] = useState(initialUrlState.selectedBackgroundVeteranPerkLevelIntervals)
  const [isBackgroundFitPanelExpanded, setIsBackgroundFitPanelExpanded] = useState(
    getInitialBackgroundFitExpandedState,
  )
  const [isCategorySidebarExpanded, setIsCategorySidebarExpanded] = useState(true)
  const [hasActiveBackgroundFitSearch, setHasActiveBackgroundFitSearch] = useState(false)
  const [detailHistoryState, setDetailHistoryState] = useState(() =>
    createInitialDetailHistoryState(initialUrlState),
  )
  const plannerInteraction = usePerkInteractionState({
    allPerksById,
    selectedCategoryNames,
    selectedPerkGroupIdsByCategory,
  })
  const { clearAllHover, clearBuildPerkTooltip, clearPerkGroupHover, clearPerkHover } =
    plannerInteraction
  const [selectedPerkId, setSelectedPerkId] = useState<string | null>(() =>
    getSelectedPerkIdFromUrl(initialUrlState.detailSelection),
  )
  const [activeDetailSelection, setActiveDetailSelection] = useState<ActiveDetailSelection>(() =>
    createActiveDetailSelectionFromUrl(initialUrlState.detailSelection),
  )
  const selectedPerk = useMemo(
    () => (selectedPerkId === null ? null : (allPerksById.get(selectedPerkId) ?? null)),
    [selectedPerkId],
  )
  const {
    addPickedPerk,
    buildPlannerGroups,
    buildShareSearch,
    clearPickedPerks,
    hasPickedPerks,
    mustHavePickedPerkIds,
    mustHavePickedPerks,
    optionalPickedPerkIds,
    pickedPerkIds,
    pickedPerkRequirementById,
    pickedPerkRequirementCountsByCategory,
    pickedPerkRequirementCountsByPerkGroup,
    pickedPerks,
    removePickedPerk,
    replacePickedPerks,
    togglePickedPerkOptional,
  } = usePickedBuild({
    allPerksById,
    initialOptionalPerkIds: initialUrlState.optionalPerkIds,
    initialPickedPerkIds: initialUrlState.pickedPerkIds,
    shouldIncludeAncientScrollPerkGroups,
    shouldIncludeOriginPerkGroups,
  })
  const { handleShareBuild, resetShareBuildStatus, shareBuildStatus } = useBuildShareLink({
    buildShareSearch,
    hasPickedPerks,
  })
  const {
    deleteSavedBuild,
    isSavedBuildsLoading,
    overwriteSavedBuild,
    saveCurrentBuild,
    savedBuildPersistenceState,
    savedBuilds,
    savedBuildsErrorMessage,
  } = useSavedBuilds({
    referenceVersion: legendsPerkCatalogDataset.referenceVersion,
  })
  const [savedBuildOperationStatus, setSavedBuildOperationStatus] =
    useState<SavedBuildOperationStatus>('idle')
  const savedBuildViews = useMemo<BuildPlannerSavedBuild[]>(
    () =>
      savedBuilds.map((savedBuild) => {
        const availablePerks = savedBuild.pickedPerkIds.flatMap((pickedPerkId) => {
          const pickedPerk = allPerksById.get(pickedPerkId)

          return pickedPerk ? [pickedPerk] : []
        })
        const availablePerkIdSet = new Set(availablePerks.map((perk) => perk.id))
        const availableOptionalPerkIds = savedBuild.optionalPerkIds.filter((optionalPerkId) =>
          availablePerkIdSet.has(optionalPerkId),
        )

        return {
          availablePerkIds: availablePerks.map((perk) => perk.id),
          id: savedBuild.id,
          missingPerkCount: savedBuild.pickedPerkIds.length - availablePerks.length,
          name: savedBuild.name,
          optionalPerkIds: availableOptionalPerkIds,
          perkNames: availablePerks.map((perk) => perk.perkName),
          pickedPerkCount: savedBuild.pickedPerkIds.length,
          plannerFilters: savedBuild.plannerFilters,
          referenceVersion: savedBuild.referenceVersion,
          updatedAt: savedBuild.updatedAt,
        }
      }),
    [savedBuilds],
  )
  const shouldLoadBackgroundFitView =
    hasActiveBackgroundFitSearch ||
    shouldIncludeOriginBackgrounds ||
    activeDetailSelection.type === 'background' ||
    (pickedPerks.length > 0 && isBackgroundFitPanelExpanded)
  const {
    backgroundFitErrorMessage,
    backgroundFitProgress,
    backgroundFitView,
    completedBackgroundFitView,
    isBackgroundFitProgressVisible,
    isBackgroundFitViewLoading,
  } = useBackgroundFitView({
    allPerksById,
    optionalPickedPerkIds,
    pickedPerkIds,
    shouldAllowBackgroundStudyBook,
    shouldAllowBackgroundStudyScroll,
    shouldAllowSecondBackgroundStudyScroll,
    shouldLoadBackgroundFitView,
  })
  const selectedBackgroundFitDetail = useMemo<{
    backgroundFit: RankedBackgroundFit
    rank: number
  } | null>(() => {
    if (activeDetailSelection.type !== 'background' || backgroundFitView === null) {
      return null
    }

    const backgroundFitIndex = backgroundFitView.rankedBackgroundFits.findIndex(
      (rankedBackgroundFit) =>
        getBackgroundFitKey(rankedBackgroundFit) === activeDetailSelection.backgroundFitKey,
    )

    if (backgroundFitIndex === -1) {
      return null
    }

    return {
      backgroundFit: backgroundFitView.rankedBackgroundFits[backgroundFitIndex],
      rank: backgroundFitIndex,
    }
  }, [activeDetailSelection, backgroundFitView])
  const selectedDetailType: 'background' | 'perk' =
    selectedBackgroundFitDetail === null ? 'perk' : 'background'
  const selectedBackgroundFitKey =
    selectedBackgroundFitDetail === null
      ? null
      : getBackgroundFitKey(selectedBackgroundFitDetail.backgroundFit)
  const detailSelection = useMemo(
    () =>
      createUrlDetailSelection({
        activeDetailSelection,
        selectedPerk,
      }),
    [activeDetailSelection, selectedPerk],
  )
  const currentUrlState = useMemo<BuildPlannerUrlState>(
    () => ({
      detailSelection,
      optionalPerkIds: optionalPickedPerkIds,
      pickedPerkIds,
      categoryFilterMode,
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
    }),
    [
      categoryFilterMode,
      detailSelection,
      optionalPickedPerkIds,
      pickedPerkIds,
      query,
      selectedBackgroundVeteranPerkLevelIntervals,
      selectedCategoryNames,
      selectedPerkGroupIdsByCategory,
      shouldAllowBackgroundStudyBook,
      shouldAllowBackgroundStudyScroll,
      shouldAllowSecondBackgroundStudyScroll,
      shouldIncludeAncientScrollPerkGroups,
      shouldIncludeOriginBackgrounds,
      shouldIncludeOriginPerkGroups,
    ],
  )
  const detailHistoryNavigationAvailability = useMemo(
    () => ({
      next:
        detailHistoryState.index >= 0 &&
        detailHistoryState.index < detailHistoryState.entries.length - 1,
      previous: detailHistoryState.index > 0,
    }),
    [detailHistoryState],
  )

  const selectedPerkRequirement = selectedPerk
    ? (pickedPerkRequirementById.get(selectedPerk.id) ?? null)
    : null
  const groupedBackgroundSources = useMemo(
    () => (selectedPerk ? groupBackgroundSources(selectedPerk.backgroundSources) : []),
    [selectedPerk],
  )
  const applyUrlState = useCallback(
    (
      urlState: BuildPlannerUrlState,
      options: {
        shouldUseTransition?: boolean
      } = {},
    ) => {
      urlHistoryWriteModeRef.current = 'replace'
      const applyNextUrlState = () => {
        applyUrlPerkFilterState(urlState)
        replacePickedPerks(urlState.pickedPerkIds, urlState.optionalPerkIds)
        setShouldAllowBackgroundStudyBook(urlState.shouldAllowBackgroundStudyBook)
        setShouldAllowBackgroundStudyScroll(urlState.shouldAllowBackgroundStudyScroll)
        setShouldAllowSecondBackgroundStudyScroll(urlState.shouldAllowSecondBackgroundStudyScroll)
        setShouldIncludeOriginBackgrounds(urlState.shouldIncludeOriginBackgrounds)
        setSelectedBackgroundVeteranPerkLevelIntervals(
          urlState.selectedBackgroundVeteranPerkLevelIntervals,
        )
        setSelectedPerkId(getSelectedPerkIdFromUrl(urlState.detailSelection))
        setActiveDetailSelection(createActiveDetailSelectionFromUrl(urlState.detailSelection))
        clearAllHover()
        resetShareBuildStatus()
      }

      if (options.shouldUseTransition === false) {
        applyNextUrlState()
      } else {
        startTransition(applyNextUrlState)
      }
    },
    [applyUrlPerkFilterState, clearAllHover, replacePickedPerks, resetShareBuildStatus],
  )
  const handleUrlStateChange = useCallback(
    (urlState: BuildPlannerUrlState) => {
      setDetailHistoryState((currentDetailHistoryState) =>
        syncDetailHistoryUrlStateFromBrowser(currentDetailHistoryState, urlState),
      )
      applyUrlState(urlState, { shouldUseTransition: false })
    },
    [applyUrlState],
  )

  useBuildPlannerUrlSync(
    currentUrlState,
    {
      availableCategoryNames: allAvailableCategories,
      availableBackgroundVeteranPerkLevelIntervals,
      backgrounds: allBackgroundUrlOptions,
      perksById: allPerksById,
      perkGroupOptionsByCategory: allPerkGroupOptionsByCategory,
    },
    handleUrlStateChange,
    urlHistoryWriteModeRef,
  )

  useEffect(() => {
    if (savedBuildOperationStatus === 'idle') {
      return
    }

    const resetSavedBuildOperationStatusTimeout = window.setTimeout(() => {
      setSavedBuildOperationStatus('idle')
    }, 1600)

    return () => {
      window.clearTimeout(resetSavedBuildOperationStatusTimeout)
    }
  }, [savedBuildOperationStatus])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const backgroundFitMediaQueryList = window.matchMedia(mediumDesktopBackgroundFitMediaQuery)

    function handleBackgroundFitMediaChange(event: { matches: boolean }) {
      setIsBackgroundFitPanelExpanded(!event.matches)
    }

    handleBackgroundFitMediaChange(backgroundFitMediaQueryList)
    backgroundFitMediaQueryList.addEventListener('change', handleBackgroundFitMediaChange)

    return () => {
      backgroundFitMediaQueryList.removeEventListener('change', handleBackgroundFitMediaChange)
    }
  }, [])

  function requestNextUrlHistoryEntry() {
    urlHistoryWriteModeRef.current = 'push'
  }

  function recordDetailHistoryEntry(urlState: BuildPlannerUrlState) {
    setDetailHistoryState((currentDetailHistoryState) =>
      recordDetailHistoryUrlState(currentDetailHistoryState, urlState),
    )
  }

  function getRestoredBackgroundVeteranPerkLevelIntervals(
    plannerFilters: SavedBuildPlannerFilters,
  ) {
    const normalizedIntervals = normalizeBackgroundVeteranPerkLevelIntervals(
      plannerFilters.selectedBackgroundVeteranPerkLevelIntervals,
      availableBackgroundVeteranPerkLevelIntervals,
    )

    return plannerFilters.selectedBackgroundVeteranPerkLevelIntervals.length > 0 &&
      normalizedIntervals.length === 0
      ? availableBackgroundVeteranPerkLevelIntervals
      : normalizedIntervals
  }

  function applySavedBuildPlannerFilters(plannerFilters: SavedBuildPlannerFilters) {
    applySavedBuildPerkFilters(plannerFilters)
    setShouldAllowBackgroundStudyBook(plannerFilters.shouldAllowBackgroundStudyBook)
    setShouldAllowBackgroundStudyScroll(plannerFilters.shouldAllowBackgroundStudyScroll)
    setShouldAllowSecondBackgroundStudyScroll(
      plannerFilters.shouldAllowBackgroundStudyScroll &&
        plannerFilters.shouldAllowSecondBackgroundStudyScroll,
    )
    setShouldIncludeOriginBackgrounds(plannerFilters.shouldIncludeOriginBackgrounds)
    setSelectedBackgroundVeteranPerkLevelIntervals(
      getRestoredBackgroundVeteranPerkLevelIntervals(plannerFilters),
    )
  }

  function isPerkSelectedInDetailPanel(perkId: string) {
    return activeDetailSelection.type === 'perk' && selectedPerkId === perkId
  }

  function clearSelectedPerkFromDetailPanel() {
    setSelectedPerkId(null)
    setActiveDetailSelection({ type: 'perk' })
  }

  function handleClearCategorySelection() {
    requestNextUrlHistoryEntry()
    startTransition(() => {
      clearCategoryFilterSelection()
    })
  }

  function handleSelectAllCategories() {
    requestNextUrlHistoryEntry()
    startTransition(() => {
      selectAllCategories()
    })
  }

  function handlePerkSearchChange(nextQuery: string) {
    changePerkSearch(nextQuery)
  }

  function handleSelectPerk(perkId: string) {
    requestNextUrlHistoryEntry()

    if (isPerkSelectedInDetailPanel(perkId)) {
      clearSelectedPerkFromDetailPanel()
      return
    }

    recordDetailHistoryEntry({
      ...currentUrlState,
      detailSelection: { perkId, type: 'perk' },
    })
    setSelectedPerkId(perkId)
    setActiveDetailSelection({ type: 'perk' })
  }

  function handleSelectBackgroundFit(backgroundFitKey: string) {
    requestNextUrlHistoryEntry()
    recordDetailHistoryEntry({
      ...currentUrlState,
      detailSelection: createBackgroundDetailSelectionFromKey(backgroundFitKey),
    })
    setActiveDetailSelection({ backgroundFitKey, type: 'background' })
  }

  function handleNavigateDetailHistory(direction: DetailHistoryNavigationDirection) {
    const targetIndex = detailHistoryState.index + direction
    const targetEntry = detailHistoryState.entries[targetIndex]

    if (!targetEntry) {
      return
    }

    setDetailHistoryState((currentDetailHistoryState) =>
      currentDetailHistoryState.entries[targetIndex]
        ? {
            entries: currentDetailHistoryState.entries,
            index: targetIndex,
          }
        : currentDetailHistoryState,
    )
    applyUrlState(targetEntry.urlState, { shouldUseTransition: false })
  }

  function handleOriginPerkGroupsChange(shouldIncludeNextOriginPerkGroups: boolean) {
    requestNextUrlHistoryEntry()
    setShouldIncludeOriginPerkGroups(shouldIncludeNextOriginPerkGroups)
  }

  function handleAncientScrollPerkGroupsChange(shouldIncludeNextAncientScrollPerkGroups: boolean) {
    requestNextUrlHistoryEntry()
    setShouldIncludeAncientScrollPerkGroups(shouldIncludeNextAncientScrollPerkGroups)
  }

  function handleOriginBackgroundsChange(shouldIncludeNextOriginBackgrounds: boolean) {
    requestNextUrlHistoryEntry()
    setShouldIncludeOriginBackgrounds(shouldIncludeNextOriginBackgrounds)
  }

  function handleBackgroundStudyBookChange(shouldAllowNextBackgroundStudyBook: boolean) {
    requestNextUrlHistoryEntry()
    setShouldAllowBackgroundStudyBook(shouldAllowNextBackgroundStudyBook)
  }

  function handleBackgroundStudyScrollChange(shouldAllowNextBackgroundStudyScroll: boolean) {
    requestNextUrlHistoryEntry()
    setShouldAllowBackgroundStudyScroll(shouldAllowNextBackgroundStudyScroll)

    if (!shouldAllowNextBackgroundStudyScroll) {
      setShouldAllowSecondBackgroundStudyScroll(false)
    }
  }

  function handleSecondBackgroundStudyScrollChange(
    shouldAllowNextSecondBackgroundStudyScroll: boolean,
  ) {
    requestNextUrlHistoryEntry()
    setShouldAllowSecondBackgroundStudyScroll(shouldAllowNextSecondBackgroundStudyScroll)

    if (shouldAllowNextSecondBackgroundStudyScroll) {
      setShouldAllowBackgroundStudyScroll(true)
    }
  }

  function handleBackgroundVeteranPerkLevelIntervalChange(
    interval: number,
    shouldIncludeInterval: boolean,
  ) {
    requestNextUrlHistoryEntry()
    setSelectedBackgroundVeteranPerkLevelIntervals((currentIntervals) => {
      const nextIntervalSet = new Set(currentIntervals)

      if (shouldIncludeInterval) {
        nextIntervalSet.add(interval)
      } else {
        nextIntervalSet.delete(interval)
      }

      return availableBackgroundVeteranPerkLevelIntervals.filter((availableInterval) =>
        nextIntervalSet.has(availableInterval),
      )
    })
  }

  function handleAddPickedPerk(perkId: string, requirement: BuildRequirement) {
    requestNextUrlHistoryEntry()
    startTransition(() => {
      addPickedPerk(perkId, requirement)
      clearBuildPerkTooltip(perkId)
    })
  }

  function handleRemovePickedPerk(perkId: string) {
    requestNextUrlHistoryEntry()
    startTransition(() => {
      removePickedPerk(perkId)
      clearPerkHover(perkId)
      clearBuildPerkTooltip(perkId)
      clearPerkGroupHover()
    })
  }

  function handleTogglePickedPerkOptional(perkId: string) {
    requestNextUrlHistoryEntry()
    startTransition(() => {
      togglePickedPerkOptional(perkId)
      clearPerkHover(perkId)
      clearBuildPerkTooltip(perkId)
      clearPerkGroupHover()
    })
  }

  function handleClearBuild() {
    requestNextUrlHistoryEntry()
    startTransition(() => {
      clearPickedPerks()
      setActiveDetailSelection({ type: 'perk' })
      clearAllHover()
      resetShareBuildStatus()
    })
  }

  async function handleSaveCurrentBuild(name: string) {
    await saveCurrentBuild({
      name,
      optionalPerkIds: optionalPickedPerkIds,
      pickedPerkIds,
      plannerFilters: createSavedBuildPlannerFilters(currentUrlState),
    })
    setSavedBuildOperationStatus('saved')
  }

  async function handleOverwriteSavedBuild(savedBuildId: string) {
    await overwriteSavedBuild(savedBuildId, {
      optionalPerkIds: optionalPickedPerkIds,
      pickedPerkIds,
      plannerFilters: createSavedBuildPlannerFilters(currentUrlState),
    })
    setSavedBuildOperationStatus('saved')
  }

  function handleLoadSavedBuild(savedBuildId: string) {
    const savedBuild = savedBuildViews.find(
      (currentSavedBuild) => currentSavedBuild.id === savedBuildId,
    )

    if (!savedBuild || savedBuild.availablePerkIds.length === 0) {
      return
    }

    requestNextUrlHistoryEntry()
    startTransition(() => {
      replacePickedPerks(savedBuild.availablePerkIds, savedBuild.optionalPerkIds)
      applySavedBuildPlannerFilters(
        savedBuild.plannerFilters ??
          createDefaultSavedBuildPlannerFilters(availableBackgroundVeteranPerkLevelIntervals),
      )
      setActiveDetailSelection({ type: 'perk' })
      clearAllHover()
      resetShareBuildStatus()
    })
    setSavedBuildOperationStatus('loaded')
  }

  async function handleDeleteSavedBuild(savedBuildId: string) {
    await deleteSavedBuild(savedBuildId)
    setSavedBuildOperationStatus('deleted')
  }

  async function handleCopySavedBuildLink(savedBuildId: string) {
    const savedBuild = savedBuildViews.find(
      (currentSavedBuild) => currentSavedBuild.id === savedBuildId,
    )

    if (!savedBuild || savedBuild.availablePerkIds.length === 0) {
      return
    }

    try {
      const savedBuildUrlState = createSavedBuildUrlState(savedBuild)

      await copyBuildShareUrl(
        savedBuildUrlState
          ? createBuildPlannerUrlSearch(savedBuildUrlState, {
              availableCategoryNames: allAvailableCategories,
              availableBackgroundVeteranPerkLevelIntervals,
              backgrounds: allBackgroundUrlOptions,
              perksById: allPerksById,
              perkGroupOptionsByCategory: allPerkGroupOptionsByCategory,
            })
          : createSharedBuildUrlSearch(
              savedBuild.availablePerkIds,
              allPerksById,
              savedBuild.optionalPerkIds,
            ),
      )
      setSavedBuildOperationStatus('copied')
    } catch {
      setSavedBuildOperationStatus('copy-error')
    }
  }

  function handleInspectPlannerPerk(
    perkId: string,
    perkGroupSelection?: { categoryName: string; perkGroupId: string },
  ) {
    const shouldDeselectPerk = isPerkSelectedInDetailPanel(perkId)
    const inspectedPerk = allPerksById.get(perkId)
    const nextPerkGroupSelection = perkGroupSelection ?? inspectedPerk?.placements[0] ?? null
    const nextSelectedCategoryNames =
      nextPerkGroupSelection === null ? [] : [nextPerkGroupSelection.categoryName]
    const nextSelectedPerkGroupIdsByCategory =
      nextPerkGroupSelection === null
        ? {}
        : {
            [nextPerkGroupSelection.categoryName]: [nextPerkGroupSelection.perkGroupId],
          }

    requestNextUrlHistoryEntry()

    if (shouldDeselectPerk) {
      startTransition(() => {
        clearSelectedPerkFromDetailPanel()
      })
      return
    }

    recordDetailHistoryEntry({
      ...currentUrlState,
      categoryFilterMode: nextPerkGroupSelection === null ? 'none' : 'selection',
      detailSelection: { perkId, type: 'perk' },
      query: '',
      selectedCategoryNames: nextSelectedCategoryNames,
      selectedPerkGroupIdsByCategory: nextSelectedPerkGroupIdsByCategory,
    })
    startTransition(() => {
      setPerkSearchQuery('')
      setSelectedPerkId(perkId)
      setActiveDetailSelection({ type: 'perk' })
      selectPerkGroup(nextPerkGroupSelection)
    })
  }

  function handleInspectPerkGroup(categoryName: string, perkGroupId: string) {
    requestNextUrlHistoryEntry()
    startTransition(() => {
      inspectPerkGroup(categoryName, perkGroupId)
    })
  }

  function handleSelectBuildPlannerPerkGroup(categoryName: string, perkGroupId: string) {
    requestNextUrlHistoryEntry()
    startTransition(() => {
      inspectPerkGroup(categoryName, perkGroupId)
    })
  }

  function handleCategoryExpandToggle(categoryName: string) {
    startTransition(() => {
      toggleCategoryExpansion(categoryName)
    })
  }

  function handleCategoryToggle(nextCategoryName: string) {
    requestNextUrlHistoryEntry()
    startTransition(() => {
      toggleCategory(nextCategoryName)
    })
  }

  function handleResetCategoryPerkGroups(categoryName: string) {
    requestNextUrlHistoryEntry()
    startTransition(() => {
      resetCategoryPerkGroups(categoryName)
    })
  }

  function handlePerkGroupSelect(categoryName: string, perkGroupId: string) {
    requestNextUrlHistoryEntry()
    startTransition(() => {
      selectSidebarPerkGroup(categoryName, perkGroupId)
    })
  }

  useEffect(() => {
    if (activeDetailSelection.type !== 'background' || completedBackgroundFitView === null) {
      return
    }

    if (
      !completedBackgroundFitView.rankedBackgroundFits.some(
        (backgroundFit) =>
          getBackgroundFitKey(backgroundFit) === activeDetailSelection.backgroundFitKey,
      )
    ) {
      startTransition(() => setActiveDetailSelection({ type: 'perk' }))
    }
  }, [activeDetailSelection, completedBackgroundFitView])

  return (
    <PlannerInteractionProvider interaction={plannerInteraction}>
      <BuildPlanner
        hasActiveBackgroundFitSearch={hasActiveBackgroundFitSearch}
        individualPerkGroups={buildPlannerGroups.individualPerkGroups}
        isSavedBuildsLoading={isSavedBuildsLoading}
        onAddPerkToBuild={handleAddPickedPerk}
        onClearBuild={handleClearBuild}
        onCopySavedBuildLink={handleCopySavedBuildLink}
        onDeleteSavedBuild={handleDeleteSavedBuild}
        onInspectPerkGroup={handleSelectBuildPlannerPerkGroup}
        onInspectPlannerPerk={handleInspectPlannerPerk}
        onLoadSavedBuild={handleLoadSavedBuild}
        onOverwriteSavedBuild={handleOverwriteSavedBuild}
        onRemovePickedPerk={handleRemovePickedPerk}
        onTogglePickedPerkOptional={handleTogglePickedPerkOptional}
        onSaveCurrentBuild={handleSaveCurrentBuild}
        onShareBuild={handleShareBuild}
        pickedPerks={pickedPerks}
        savedBuildOperationStatus={savedBuildOperationStatus}
        savedBuildPersistenceState={savedBuildPersistenceState}
        savedBuilds={savedBuildViews}
        savedBuildsErrorMessage={savedBuildsErrorMessage}
        selectedBuildPlannerPerkId={
          selectedDetailType === 'perk' && selectedPerk !== null ? selectedPerk.id : null
        }
        shareBuildStatus={shareBuildStatus}
        shouldRenderPerkGroupCards
        sharedPerkGroups={buildPlannerGroups.sharedPerkGroups}
      />

      <main
        className={styles.workspace}
        data-background-fit-collapsed={!isBackgroundFitPanelExpanded}
        data-background-fit-search-active={hasActiveBackgroundFitSearch}
        data-category-collapsed={!isCategorySidebarExpanded}
        data-testid="workspace"
      >
        <BackgroundFitPanel
          backgroundFitView={backgroundFitView}
          backgroundFitErrorMessage={backgroundFitErrorMessage}
          backgroundFitProgress={backgroundFitProgress}
          isExpanded={isBackgroundFitPanelExpanded}
          isLoadingBackgroundFitView={isBackgroundFitViewLoading || isBackgroundFitProgressVisible}
          onSelectBackgroundFit={handleSelectBackgroundFit}
          onBackgroundStudyBookChange={handleBackgroundStudyBookChange}
          onBackgroundStudyScrollChange={handleBackgroundStudyScrollChange}
          onBackgroundVeteranPerkLevelIntervalChange={
            handleBackgroundVeteranPerkLevelIntervalChange
          }
          onOriginBackgroundsChange={handleOriginBackgroundsChange}
          onSearchActivityChange={setHasActiveBackgroundFitSearch}
          onSecondBackgroundStudyScrollChange={handleSecondBackgroundStudyScrollChange}
          onToggleExpanded={() => setIsBackgroundFitPanelExpanded((isExpanded) => !isExpanded)}
          pickedPerkCount={pickedPerks.length}
          mustHavePickedPerkCount={mustHavePickedPerks.length}
          optionalPickedPerkCount={optionalPickedPerkIds.length}
          shouldAllowBackgroundStudyBook={shouldAllowBackgroundStudyBook}
          shouldAllowBackgroundStudyScroll={shouldAllowBackgroundStudyScroll}
          shouldAllowSecondBackgroundStudyScroll={shouldAllowSecondBackgroundStudyScroll}
          availableBackgroundVeteranPerkLevelIntervals={
            availableBackgroundVeteranPerkLevelIntervals
          }
          selectedBackgroundVeteranPerkLevelIntervals={selectedBackgroundVeteranPerkLevelIntervals}
          selectedBackgroundFitKey={selectedBackgroundFitKey}
          shouldIncludeOriginBackgrounds={shouldIncludeOriginBackgrounds}
        />

        <DetailPanel
          selectedDetailType={selectedDetailType}
          selectedBackgroundFitDetail={selectedBackgroundFitDetail}
          detailHistoryNavigationAvailability={detailHistoryNavigationAvailability}
          groupedBackgroundSources={groupedBackgroundSources}
          mustHavePickedPerkIds={mustHavePickedPerkIds}
          onAddPerkToBuild={handleAddPickedPerk}
          onInspectPerk={handleInspectPlannerPerk}
          onInspectPerkGroup={handleInspectPerkGroup}
          onNavigateDetailHistory={handleNavigateDetailHistory}
          onRemovePerkFromBuild={handleRemovePickedPerk}
          optionalPickedPerkIds={optionalPickedPerkIds}
          mustHavePickedPerkCount={mustHavePickedPerks.length}
          optionalPickedPerkCount={optionalPickedPerkIds.length}
          pickedPerkCount={pickedPerks.length}
          selectedPerkRequirement={selectedPerkRequirement}
          selectedPerk={selectedPerk}
          studyResourceFilter={{
            shouldAllowBook: shouldAllowBackgroundStudyBook,
            shouldAllowScroll: shouldAllowBackgroundStudyScroll,
            shouldAllowSecondScroll: shouldAllowSecondBackgroundStudyScroll,
          }}
          supportedBuildTargetPerkGroups={backgroundFitView?.supportedBuildTargetPerkGroups ?? []}
        />

        <PerkResults
          onAncientScrollPerkGroupsChange={handleAncientScrollPerkGroupsChange}
          onInspectPerkGroup={handleInspectPerkGroup}
          onOriginPerkGroupsChange={handleOriginPerkGroupsChange}
          onAddPerkToBuild={handleAddPickedPerk}
          onRemovePerkFromBuild={handleRemovePickedPerk}
          onSelectPerk={handleSelectPerk}
          pickedPerkRequirementById={pickedPerkRequirementById}
          query={query}
          selectedPerk={selectedPerk}
          setQuery={handlePerkSearchChange}
          shouldIncludeAncientScrollPerkGroups={shouldIncludeAncientScrollPerkGroups}
          shouldIncludeOriginPerkGroups={shouldIncludeOriginPerkGroups}
          perkResultListScrollResetKey={perkResultListScrollResetKey}
          visiblePerkResultSetKey={visiblePerkResultSetKey}
          visiblePerks={visiblePerks}
        />

        <CategorySidebar
          allPerkCount={catalogPerks.length}
          categoryFilterMode={categoryFilterMode}
          displayedCategoryNames={displayedCategoryNames}
          displayedPerkGroupOptionsByCategory={displayedPerkGroupOptionsByCategory}
          expandedCategoryNames={expandedCategoryNames}
          categoryCounts={categoryCounts}
          isExpanded={isCategorySidebarExpanded}
          onCategoryExpandToggle={handleCategoryExpandToggle}
          onCategoryToggle={handleCategoryToggle}
          onClearCategorySelection={handleClearCategorySelection}
          onResetCategoryPerkGroups={handleResetCategoryPerkGroups}
          onPerkGroupSelect={handlePerkGroupSelect}
          onSelectAllCategories={handleSelectAllCategories}
          onToggleExpanded={() => setIsCategorySidebarExpanded((isExpanded) => !isExpanded)}
          pickedPerkRequirementCountsByCategory={pickedPerkRequirementCountsByCategory}
          pickedPerkRequirementCountsByPerkGroup={pickedPerkRequirementCountsByPerkGroup}
          query={query}
          selectedCategoryNames={selectedCategoryNames}
          selectedPerkGroupIdsByCategory={selectedPerkGroupIdsByCategory}
        />
      </main>
    </PlannerInteractionProvider>
  )
}
