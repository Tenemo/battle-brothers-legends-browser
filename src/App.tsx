import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '@fontsource/cinzel/700.css'
import '@fontsource/source-sans-3/400.css'
import '@fontsource/source-sans-3/600.css'
import '@fontsource/source-sans-3/700.css'
import styles from './App.module.scss'
import { BackgroundFitPanel } from './components/BackgroundFitPanel'
import {
  BuildPlanner,
  type BuildPlannerPickedPerk,
  type BuildPlannerSavedBuild,
  type SavedBuildOperationStatus,
} from './components/BuildPlanner'
import { CategorySidebar } from './components/CategorySidebar'
import { DetailsPanel } from './components/PerkDetail'
import { PerkResults } from './components/PerkResults'
import { GitHubIcon, PersonIcon, type BuildRequirement } from './components/SharedControls'
import legendsPerksDatasetJson from './data/legends-perks.json'
import {
  createBackgroundFitEngine,
  type BackgroundFitCalculationProgress,
  type RankedBackgroundFit,
  type BackgroundFitView,
} from './lib/background-fit'
import { getBuildPlannerGroups } from './lib/build-planner'
import {
  compareDisplayedCategories,
  compareDisplayedPerkGroupOptions,
  getCategoryPerkGroupOptions,
  getCategoryCounts,
  getPickedPerkCountsByCategory,
  getPickedPerkCountsByPerkGroup,
  getVisiblePerkCountsByCategoryPerkGroup,
  getVisiblePerkCountsByCategory,
} from './lib/category-filter-model'
import {
  getCategoryFilterModeFromSelection,
  type CategoryFilterMode,
} from './lib/category-filter-state'
import { compareCategoryNames } from './lib/dynamic-background-categories'
import {
  createSharedBuildUrlSearch,
  type BuildPlannerDetailSelection,
  type BuildPlannerUrlState,
} from './lib/build-planner-url-state'
import {
  createBackgroundFitKey,
  getBackgroundFitKey,
  groupBackgroundSources,
  normalizeSearchPhrase,
  parseBackgroundFitKey,
} from './lib/perk-display'
import { filterAndSortPerks } from './lib/perk-search'
import {
  getPerksWithOriginAndAncientScrollPerkGroupsFiltered,
  shouldKeepPerkGroupWithOriginAndAncientScrollFilters,
} from './lib/origin-and-ancient-scroll-perk-groups'
import { getAvailableBackgroundVeteranPerkLevelIntervals } from './lib/background-veteran-perks'
import { copyBuildShareUrl, useBuildShareLink } from './lib/use-build-share-link'
import { joinClassNames } from './lib/class-names'
import {
  createBackgroundFitWorkerClient,
  type BackgroundFitWorkerClient,
} from './lib/background-fit-worker-client'
import {
  useBuildPlannerUrlSync,
  useInitialBuildPlannerUrlState,
  type BuildPlannerUrlHistoryWriteMode,
} from './lib/use-build-planner-url-sync'
import { usePerkInteractionState } from './lib/use-perk-interaction-state'
import { useSavedBuilds } from './lib/use-saved-builds'
import type { LegendsPerksDataset } from './types/legends-perks'

declare const __PLANNER_VERSION__: string

const legendsPerksDataset = legendsPerksDatasetJson as LegendsPerksDataset
const backgroundFitEngine = createBackgroundFitEngine(legendsPerksDataset)
const allPerks = legendsPerksDataset.perks.map((perk) => ({
  ...perk,
  backgroundSources: backgroundFitEngine.getPerkBackgroundSources(perk),
}))
const allPerksById = new Map(allPerks.map((perk) => [perk.id, perk]))
const legendsModRepositoryUrl = 'https://github.com/Battle-Brothers-Legends/Legends-public'
const repositoryUrl = 'https://github.com/Tenemo/battle-brothers-legends-browser'
const personalProjectsUrl = 'https://piech.dev/projects'
const mediumDesktopBackgroundFitMediaQuery = '(min-width: 1280px) and (max-width: 1439px)'
const backgroundFitCompletionProgressMinimumDurationMs = 700
const backgroundFitProgressCountMinimumStepDurationMs = 10
const backgroundFitProgressCompletionPaddingMs = 550
const plannerVersion = __PLANNER_VERSION__

const allCategoryCounts = getCategoryCounts(allPerks)
const allPerkGroupOptionsByCategory = getCategoryPerkGroupOptions(allPerks)
const allAvailableCategories = [...allCategoryCounts.keys()].toSorted(compareCategoryNames)
const allBackgroundUrlOptions = legendsPerksDataset.backgroundFitBackgrounds.map(
  ({ backgroundId, sourceFilePath }) => ({
    backgroundId,
    sourceFilePath,
  }),
)
const availableBackgroundVeteranPerkLevelIntervals =
  getAvailableBackgroundVeteranPerkLevelIntervals(legendsPerksDataset.backgroundFitBackgrounds)

type PickedBuildPerkState = {
  isOptional: boolean
  perkId: string
}

type PickedPerkRequirementCounts = {
  mustHave: number
  optional: number
}

type BackgroundFitViewState = {
  key: string
  view: BackgroundFitView
}

type BackgroundFitPartialViewState = {
  key: string
  view: BackgroundFitView
}

type BackgroundFitErrorState = {
  key: string
  message: string
}

type BackgroundFitProgressState = {
  key: string
  progress: BackgroundFitCalculationProgress
}

type ActiveDetailSelection =
  | {
      type: 'background'
      backgroundFitKey: string
    }
  | {
      type: 'perk'
    }

type DetailHistoryNavigationDirection = -1 | 1

type DetailHistoryEntry = {
  key: string
  urlState: BuildPlannerUrlState
}

type DetailHistoryState = {
  entries: DetailHistoryEntry[]
  index: number
}

function createActiveDetailSelectionFromUrl(
  detailSelection: BuildPlannerDetailSelection,
): ActiveDetailSelection {
  if (detailSelection.type !== 'background') {
    return { type: 'perk' }
  }

  return {
    backgroundFitKey: createBackgroundFitKey(detailSelection),
    type: 'background',
  }
}

function getSelectedPerkIdFromUrl(detailSelection: BuildPlannerDetailSelection): string | null {
  return detailSelection.type === 'perk' ? detailSelection.perkId : null
}

function getDetailSelectionHistoryKey(detailSelection: BuildPlannerDetailSelection): string | null {
  if (detailSelection.type === 'perk') {
    return `perk\u0000${detailSelection.perkId}`
  }

  if (detailSelection.type === 'background') {
    return `background\u0000${detailSelection.backgroundId}\u0000${detailSelection.sourceFilePath}`
  }

  return null
}

function createDetailHistoryEntry(urlState: BuildPlannerUrlState): DetailHistoryEntry | null {
  const key = getDetailSelectionHistoryKey(urlState.detailSelection)

  return key === null ? null : { key, urlState }
}

function createInitialDetailHistoryState(urlState: BuildPlannerUrlState): DetailHistoryState {
  const entry = createDetailHistoryEntry(urlState)

  return entry
    ? {
        entries: [entry],
        index: 0,
      }
    : {
        entries: [],
        index: -1,
      }
}

function replaceDetailHistoryEntry(
  detailHistoryState: DetailHistoryState,
  index: number,
  entry: DetailHistoryEntry,
): DetailHistoryState {
  if (detailHistoryState.entries[index]?.urlState === entry.urlState) {
    return detailHistoryState.index === index
      ? detailHistoryState
      : {
          entries: detailHistoryState.entries,
          index,
        }
  }

  const entries = [...detailHistoryState.entries]
  entries[index] = entry

  return {
    entries,
    index,
  }
}

function recordDetailHistoryUrlState(
  detailHistoryState: DetailHistoryState,
  urlState: BuildPlannerUrlState,
): DetailHistoryState {
  const entry = createDetailHistoryEntry(urlState)

  if (entry === null) {
    return detailHistoryState
  }

  if (detailHistoryState.entries[detailHistoryState.index]?.key === entry.key) {
    return replaceDetailHistoryEntry(detailHistoryState, detailHistoryState.index, entry)
  }

  const retainedEntries =
    detailHistoryState.index >= 0
      ? detailHistoryState.entries.slice(0, detailHistoryState.index + 1)
      : []

  return {
    entries: [...retainedEntries, entry],
    index: retainedEntries.length,
  }
}

function syncDetailHistoryUrlStateFromBrowser(
  detailHistoryState: DetailHistoryState,
  urlState: BuildPlannerUrlState,
): DetailHistoryState {
  const entry = createDetailHistoryEntry(urlState)

  if (entry === null) {
    return detailHistoryState
  }

  const matchingEntryIndex = detailHistoryState.entries.findIndex(
    (detailHistoryEntry) => detailHistoryEntry.key === entry.key,
  )

  return matchingEntryIndex === -1
    ? recordDetailHistoryUrlState(detailHistoryState, urlState)
    : replaceDetailHistoryEntry(detailHistoryState, matchingEntryIndex, entry)
}

function createBackgroundDetailSelectionFromKey(
  backgroundFitKey: string,
): BuildPlannerDetailSelection {
  const backgroundFitKeyParts = parseBackgroundFitKey(backgroundFitKey)

  return backgroundFitKeyParts ? { ...backgroundFitKeyParts, type: 'background' } : { type: 'none' }
}

function createUrlDetailSelection({
  activeDetailSelection,
  selectedPerk,
}: {
  activeDetailSelection: ActiveDetailSelection
  selectedPerk: { id: string } | null
}): BuildPlannerDetailSelection {
  if (activeDetailSelection.type === 'background') {
    return createBackgroundDetailSelectionFromKey(activeDetailSelection.backgroundFitKey)
  }

  return selectedPerk ? { perkId: selectedPerk.id, type: 'perk' } : { type: 'none' }
}

function createPickedBuildPerkState(
  pickedPerkIds: string[],
  optionalPerkIds: string[],
): PickedBuildPerkState[] {
  const optionalPerkIdSet = new Set(optionalPerkIds)

  return pickedPerkIds.map((perkId) => ({
    isOptional: optionalPerkIdSet.has(perkId),
    perkId,
  }))
}

function getPickedBuildPerkIds(pickedBuildPerks: PickedBuildPerkState[]): string[] {
  return pickedBuildPerks.map((pickedBuildPerk) => pickedBuildPerk.perkId)
}

function getOptionalPickedBuildPerkIds(pickedBuildPerks: PickedBuildPerkState[]): string[] {
  return pickedBuildPerks.flatMap((pickedBuildPerk) =>
    pickedBuildPerk.isOptional ? [pickedBuildPerk.perkId] : [],
  )
}

function addPickedBuildPerk(
  pickedBuildPerks: PickedBuildPerkState[],
  perkId: string,
  requirement: BuildRequirement,
): PickedBuildPerkState[] {
  if (pickedBuildPerks.some((pickedBuildPerk) => pickedBuildPerk.perkId === perkId)) {
    return pickedBuildPerks
  }

  const nextPickedBuildPerk = {
    isOptional: requirement === 'optional',
    perkId,
  }

  if (nextPickedBuildPerk.isOptional) {
    return [...pickedBuildPerks, nextPickedBuildPerk]
  }

  const firstOptionalPerkIndex = pickedBuildPerks.findIndex(
    (pickedBuildPerk) => pickedBuildPerk.isOptional,
  )

  if (firstOptionalPerkIndex === -1) {
    return [...pickedBuildPerks, nextPickedBuildPerk]
  }

  return [
    ...pickedBuildPerks.slice(0, firstOptionalPerkIndex),
    nextPickedBuildPerk,
    ...pickedBuildPerks.slice(firstOptionalPerkIndex),
  ]
}

function getPickedPerkRequirementCounts(
  mustHavePickedPerkCounts: ReadonlyMap<string, number>,
  optionalPickedPerkCounts: ReadonlyMap<string, number>,
): Map<string, PickedPerkRequirementCounts> {
  const countKeys = new Set([
    ...mustHavePickedPerkCounts.keys(),
    ...optionalPickedPerkCounts.keys(),
  ])

  return new Map(
    [...countKeys].map((countKey) => [
      countKey,
      {
        mustHave: mustHavePickedPerkCounts.get(countKey) ?? 0,
        optional: optionalPickedPerkCounts.get(countKey) ?? 0,
      },
    ]),
  )
}

function getInitialBackgroundFitExpandedState() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true
  }

  return !window.matchMedia(mediumDesktopBackgroundFitMediaQuery).matches
}

function removeHiddenSelectedPerkGroupIds(
  selectedPerkGroupIdsByCategory: Record<string, string[]>,
  filters: {
    shouldIncludeAncientScrollPerkGroups: boolean
    shouldIncludeOriginPerkGroups: boolean
  },
): Record<string, string[]> {
  let hasRemovedSelectedPerkGroupId = false
  const visibleSelectedPerkGroupIdsByCategory: Record<string, string[]> = {}

  for (const [categoryName, selectedPerkGroupIds] of Object.entries(
    selectedPerkGroupIdsByCategory,
  )) {
    const visibleSelectedPerkGroupIds = selectedPerkGroupIds.filter((perkGroupId) =>
      shouldKeepPerkGroupWithOriginAndAncientScrollFilters(perkGroupId, filters),
    )

    if (visibleSelectedPerkGroupIds.length !== selectedPerkGroupIds.length) {
      hasRemovedSelectedPerkGroupId = true
    }

    if (visibleSelectedPerkGroupIds.length > 0) {
      visibleSelectedPerkGroupIdsByCategory[categoryName] = visibleSelectedPerkGroupIds
    }
  }

  if (
    Object.keys(visibleSelectedPerkGroupIdsByCategory).length !==
    Object.keys(selectedPerkGroupIdsByCategory).length
  ) {
    hasRemovedSelectedPerkGroupId = true
  }

  return hasRemovedSelectedPerkGroupId
    ? visibleSelectedPerkGroupIdsByCategory
    : selectedPerkGroupIdsByCategory
}

function getSelectedPerkGroupIdsByCategorySignature(
  selectedPerkGroupIdsByCategory: Record<string, string[]>,
): string {
  return Object.entries(selectedPerkGroupIdsByCategory)
    .filter(([, selectedPerkGroupIds]) => selectedPerkGroupIds.length > 0)
    .toSorted(([leftCategoryName], [rightCategoryName]) =>
      compareCategoryNames(leftCategoryName, rightCategoryName),
    )
    .map(
      ([categoryName, selectedPerkGroupIds]) => `${categoryName}:${selectedPerkGroupIds.join(',')}`,
    )
    .join('\u0000')
}

function hasActiveCategoryFilterSelection(
  categoryFilterMode: CategoryFilterMode,
  selectedCategoryNames: string[],
  selectedPerkGroupIdsByCategory: Record<string, string[]>,
): boolean {
  return (
    categoryFilterMode !== 'none' ||
    selectedCategoryNames.length > 0 ||
    Object.values(selectedPerkGroupIdsByCategory).some(
      (selectedPerkGroupIds) => selectedPerkGroupIds.length > 0,
    )
  )
}

export default function App() {
  const initialUrlState = useInitialBuildPlannerUrlState({
    availableCategoryNames: allAvailableCategories,
    availableBackgroundVeteranPerkLevelIntervals,
    backgrounds: allBackgroundUrlOptions,
    perks: allPerks,
    perkGroupOptionsByCategory: allPerkGroupOptionsByCategory,
  })
  const urlHistoryWriteModeRef = useRef<BuildPlannerUrlHistoryWriteMode>('replace')
  const [query, setQuery] = useState(initialUrlState.query)
  const [pickedBuildPerks, setPickedBuildPerks] = useState<PickedBuildPerkState[]>(() =>
    createPickedBuildPerkState(initialUrlState.pickedPerkIds, initialUrlState.optionalPerkIds),
  )
  const [selectedCategoryNames, setSelectedCategoryNames] = useState<string[]>(
    initialUrlState.selectedCategoryNames,
  )
  const [categoryFilterMode, setCategoryFilterMode] = useState<CategoryFilterMode>(
    initialUrlState.categoryFilterMode ??
      getCategoryFilterModeFromSelection({
        selectedCategoryNames: initialUrlState.selectedCategoryNames,
        selectedPerkGroupIdsByCategory: initialUrlState.selectedPerkGroupIdsByCategory,
      }),
  )
  const [expandedCategoryNames, setExpandedCategoryNames] = useState<string[]>(
    initialUrlState.selectedCategoryNames,
  )
  const [selectedPerkGroupIdsByCategory, setSelectedPerkGroupIdsByCategory] = useState<
    Record<string, string[]>
  >(initialUrlState.selectedPerkGroupIdsByCategory)
  const [perkResultListScrollResetKey, setPerkResultListScrollResetKey] = useState(0)
  const [shouldAllowBackgroundStudyBook, setShouldAllowBackgroundStudyBook] = useState(
    initialUrlState.shouldAllowBackgroundStudyBook,
  )
  const [shouldAllowBackgroundStudyScroll, setShouldAllowBackgroundStudyScroll] = useState(
    initialUrlState.shouldAllowBackgroundStudyScroll,
  )
  const [shouldAllowSecondBackgroundStudyScroll, setShouldAllowSecondBackgroundStudyScroll] =
    useState(initialUrlState.shouldAllowSecondBackgroundStudyScroll)
  const [shouldIncludeOriginPerkGroups, setShouldIncludeOriginPerkGroups] = useState(
    initialUrlState.shouldIncludeOriginPerkGroups,
  )
  const [shouldIncludeAncientScrollPerkGroups, setShouldIncludeAncientScrollPerkGroups] = useState(
    initialUrlState.shouldIncludeAncientScrollPerkGroups,
  )
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
  const [backgroundFitViewState, setBackgroundFitViewState] =
    useState<BackgroundFitViewState | null>(null)
  const [backgroundFitPartialViewState, setBackgroundFitPartialViewState] =
    useState<BackgroundFitPartialViewState | null>(null)
  const [backgroundFitErrorState, setBackgroundFitErrorState] =
    useState<BackgroundFitErrorState | null>(null)
  const [backgroundFitProgressState, setBackgroundFitProgressState] =
    useState<BackgroundFitProgressState | null>(null)
  const backgroundFitWorkerClientRef = useRef<BackgroundFitWorkerClient | null>(null)
  const latestBackgroundFitRequestIdRef = useRef(0)
  const backgroundFitProgressByViewKeyRef = useRef(
    new Map<string, BackgroundFitCalculationProgress>(),
  )
  const backgroundFitCompletionProgressTimeoutRef = useRef<number | null>(null)
  const [detailHistoryState, setDetailHistoryState] = useState(() =>
    createInitialDetailHistoryState(initialUrlState),
  )
  const clearBackgroundFitCompletionProgressTimeout = useCallback(() => {
    if (backgroundFitCompletionProgressTimeoutRef.current === null) {
      return
    }

    window.clearTimeout(backgroundFitCompletionProgressTimeoutRef.current)
    backgroundFitCompletionProgressTimeoutRef.current = null
  }, [])
  const getBackgroundFitWorkerClient = useCallback(() => {
    backgroundFitWorkerClientRef.current ??= createBackgroundFitWorkerClient({
      calculateOnMainThread(
        {
          optionalPickedPerkIds: fallbackOptionalPickedPerkIds,
          pickedPerkIds: fallbackPickedPerkIds,
          studyResourceFilter,
        },
        options,
      ) {
        const fallbackPickedPerks = fallbackPickedPerkIds.flatMap((pickedPerkId) => {
          const pickedPerk = allPerksById.get(pickedPerkId)

          return pickedPerk ? [pickedPerk] : []
        })

        return backgroundFitEngine.getBackgroundFitView(fallbackPickedPerks, studyResourceFilter, {
          onPartialView: options?.onPartialView
            ? (partialView) => {
                options.onPartialView?.(partialView.view, {
                  checkedBackgroundCount: partialView.checkedBackgroundCount,
                  totalBackgroundCount: partialView.totalBackgroundCount,
                })
              }
            : undefined,
          onProgress: options?.onProgress,
          optionalPickedPerkIds: new Set(fallbackOptionalPickedPerkIds),
        })
      },
    })

    return backgroundFitWorkerClientRef.current
  }, [])
  useEffect(
    () => () => {
      clearBackgroundFitCompletionProgressTimeout()
      backgroundFitWorkerClientRef.current?.dispose()
      backgroundFitWorkerClientRef.current = null
    },
    [clearBackgroundFitCompletionProgressTimeout],
  )
  const {
    clearAllHover,
    clearBuildPerkTooltip,
    clearPerkGroupHover,
    clearPerkHover,
    buildPerkHighlightPerkGroupKeys,
    closeCategoryHover,
    closeBuildPerkHover,
    closeBuildPerkTooltip,
    closePerkGroupHover,
    closeResultsPerkHover,
    emphasizedCategoryNames,
    emphasizedPerkGroupKeys,
    hoveredBuildPerk,
    hoveredBuildPerkTooltip,
    hoveredBuildPerkTooltipId,
    hoveredPerkGroupKey,
    hoveredPerkId,
    openCategoryHover,
    openBuildPerkHover,
    openBuildPerkTooltip,
    openPerkGroupHover,
    openResultsPerkHover,
    selectedEmphasisCategoryNames,
    selectedEmphasisPerkGroupKeys,
  } = usePerkInteractionState({
    allPerksById,
    selectedCategoryNames,
    selectedPerkGroupIdsByCategory,
  })
  const catalogPerks = useMemo(
    () =>
      getPerksWithOriginAndAncientScrollPerkGroupsFiltered(allPerks, {
        shouldIncludeAncientScrollPerkGroups,
        shouldIncludeOriginPerkGroups,
      }),
    [shouldIncludeAncientScrollPerkGroups, shouldIncludeOriginPerkGroups],
  )
  const categoryCounts = useMemo(() => getCategoryCounts(catalogPerks), [catalogPerks])
  const perkGroupOptionsByCategory = useMemo(
    () => getCategoryPerkGroupOptions(catalogPerks),
    [catalogPerks],
  )
  const availableCategories = useMemo(
    () => [...categoryCounts.keys()].toSorted(compareCategoryNames),
    [categoryCounts],
  )
  const normalizedPerkSearchPhrase = useMemo(() => normalizeSearchPhrase(query), [query])
  const visiblePerks = useMemo(
    () =>
      filterAndSortPerks(catalogPerks, {
        categoryFilterMode,
        query,
        selectedCategoryNames,
        selectedPerkGroupIdsByCategory,
      }),
    [
      catalogPerks,
      categoryFilterMode,
      query,
      selectedCategoryNames,
      selectedPerkGroupIdsByCategory,
    ],
  )
  const visiblePerkResultSetKey = useMemo(
    () =>
      [
        categoryFilterMode,
        query,
        selectedCategoryNames.join('\u0000'),
        getSelectedPerkGroupIdsByCategorySignature(selectedPerkGroupIdsByCategory),
        shouldIncludeAncientScrollPerkGroups ? 'ancient-scroll-perks' : '',
        shouldIncludeOriginPerkGroups ? 'origin-perks' : '',
        String(visiblePerks.length),
      ].join('\u0001'),
    [
      categoryFilterMode,
      query,
      selectedCategoryNames,
      selectedPerkGroupIdsByCategory,
      shouldIncludeAncientScrollPerkGroups,
      shouldIncludeOriginPerkGroups,
      visiblePerks.length,
    ],
  )
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
  const pickedPerkIds = useMemo(() => getPickedBuildPerkIds(pickedBuildPerks), [pickedBuildPerks])
  const optionalPickedPerkIds = useMemo(
    () => getOptionalPickedBuildPerkIds(pickedBuildPerks),
    [pickedBuildPerks],
  )
  const pickedPerks = useMemo<BuildPlannerPickedPerk[]>(
    () =>
      pickedBuildPerks.flatMap((pickedBuildPerk) => {
        const pickedPerk = allPerksById.get(pickedBuildPerk.perkId)

        return pickedPerk ? [{ ...pickedPerk, isOptional: pickedBuildPerk.isOptional }] : []
      }),
    [pickedBuildPerks],
  )
  const mustHavePickedPerks = useMemo(
    () => pickedPerks.filter((pickedPerk) => !pickedPerk.isOptional),
    [pickedPerks],
  )
  const optionalPickedPerks = useMemo(
    () => pickedPerks.filter((pickedPerk) => pickedPerk.isOptional),
    [pickedPerks],
  )
  const mustHavePickedPerkIds = useMemo(
    () => mustHavePickedPerks.map((pickedPerk) => pickedPerk.id),
    [mustHavePickedPerks],
  )
  const plannerGroupPerks = useMemo(
    () =>
      getPerksWithOriginAndAncientScrollPerkGroupsFiltered(pickedPerks, {
        shouldIncludeAncientScrollPerkGroups,
        shouldIncludeOriginPerkGroups,
      }),
    [pickedPerks, shouldIncludeAncientScrollPerkGroups, shouldIncludeOriginPerkGroups],
  )
  const buildShareSearch = useMemo(
    () => createSharedBuildUrlSearch(pickedPerkIds, allPerksById, optionalPickedPerkIds),
    [optionalPickedPerkIds, pickedPerkIds],
  )
  const hasPickedPerks = pickedPerks.length > 0
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
    referenceVersion: legendsPerksDataset.referenceVersion,
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
          referenceVersion: savedBuild.referenceVersion,
          updatedAt: savedBuild.updatedAt,
        }
      }),
    [savedBuilds],
  )
  const buildPlannerGroups = useMemo(
    () => getBuildPlannerGroups(plannerGroupPerks),
    [plannerGroupPerks],
  )
  const backgroundFitViewKey = useMemo(
    () =>
      [
        pickedPerkIds.join('\u0000'),
        optionalPickedPerkIds.join('\u0000'),
        shouldAllowBackgroundStudyBook ? 'book' : 'no-book',
        shouldAllowBackgroundStudyScroll ? 'scroll' : 'no-scroll',
        shouldAllowSecondBackgroundStudyScroll ? 'second-scroll' : 'single-scroll',
      ].join('\u0001'),
    [
      optionalPickedPerkIds,
      pickedPerkIds,
      shouldAllowBackgroundStudyBook,
      shouldAllowBackgroundStudyScroll,
      shouldAllowSecondBackgroundStudyScroll,
    ],
  )
  const shouldLoadBackgroundFitView =
    isBackgroundFitPanelExpanded ||
    hasActiveBackgroundFitSearch ||
    activeDetailSelection.type === 'background'
  const completedBackgroundFitView =
    backgroundFitViewState?.key === backgroundFitViewKey ? backgroundFitViewState.view : null
  const partialBackgroundFitView =
    backgroundFitPartialViewState?.key === backgroundFitViewKey
      ? backgroundFitPartialViewState.view
      : null
  const backgroundFitView = completedBackgroundFitView ?? partialBackgroundFitView
  const backgroundFitErrorMessage =
    backgroundFitErrorState?.key === backgroundFitViewKey ? backgroundFitErrorState.message : null
  const backgroundFitProgress =
    backgroundFitProgressState?.key === backgroundFitViewKey
      ? backgroundFitProgressState.progress
      : null
  const isBackgroundFitProgressVisible =
    backgroundFitProgress !== null && backgroundFitProgress.totalBackgroundCount > 0
  const isBackgroundFitViewLoading =
    shouldLoadBackgroundFitView &&
    completedBackgroundFitView === null &&
    backgroundFitErrorMessage === null
  const backgroundFitDetail = useMemo<{
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
  const activeDetailType: 'background' | 'perk' =
    backgroundFitDetail === null ? 'perk' : 'background'
  const selectedBackgroundFitKey =
    backgroundFitDetail === null ? null : getBackgroundFitKey(backgroundFitDetail.backgroundFit)
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

  useEffect(() => {
    if (
      !shouldLoadBackgroundFitView ||
      completedBackgroundFitView !== null ||
      backgroundFitErrorMessage !== null
    ) {
      return
    }

    let isCancelled = false
    clearBackgroundFitCompletionProgressTimeout()
    const backgroundFitProgressByViewKey = backgroundFitProgressByViewKeyRef.current
    const backgroundFitWorkerClient = getBackgroundFitWorkerClient()
    let requestId = 0
    const backgroundFitCalculation = backgroundFitWorkerClient.calculateBackgroundFitView(
      {
        optionalPickedPerkIds,
        pickedPerkIds,
        studyResourceFilter: {
          shouldAllowBook: shouldAllowBackgroundStudyBook,
          shouldAllowScroll: shouldAllowBackgroundStudyScroll,
          shouldAllowSecondScroll: shouldAllowSecondBackgroundStudyScroll,
        },
      },
      {
        onPartialView(view, progress) {
          if (isCancelled || latestBackgroundFitRequestIdRef.current !== requestId) {
            return
          }

          backgroundFitProgressByViewKey.set(backgroundFitViewKey, progress)

          startTransition(() => {
            setBackgroundFitProgressState({
              key: backgroundFitViewKey,
              progress,
            })
            setBackgroundFitPartialViewState({
              key: backgroundFitViewKey,
              view,
            })
          })
        },
        onProgress(progress) {
          if (isCancelled || latestBackgroundFitRequestIdRef.current !== requestId) {
            return
          }

          backgroundFitProgressByViewKey.set(backgroundFitViewKey, progress)

          startTransition(() => {
            setBackgroundFitProgressState({
              key: backgroundFitViewKey,
              progress,
            })
          })
        },
      },
    )

    requestId = backgroundFitCalculation.requestId
    latestBackgroundFitRequestIdRef.current = requestId

    backgroundFitCalculation.promise
      .then((nextBackgroundFitView) => {
        if (isCancelled || latestBackgroundFitRequestIdRef.current !== requestId) {
          return
        }

        const latestProgress = backgroundFitProgressByViewKey.get(backgroundFitViewKey)
        const completionProgress =
          latestProgress && latestProgress.totalBackgroundCount > 0
            ? {
                checkedBackgroundCount: latestProgress.totalBackgroundCount,
                totalBackgroundCount: latestProgress.totalBackgroundCount,
              }
            : null

        startTransition(() => {
          setBackgroundFitErrorState(null)
          setBackgroundFitPartialViewState(null)
          setBackgroundFitProgressState(
            completionProgress === null
              ? null
              : {
                  key: backgroundFitViewKey,
                  progress: completionProgress,
                },
          )
          setBackgroundFitViewState({
            key: backgroundFitViewKey,
            view: nextBackgroundFitView,
          })
        })

        if (completionProgress !== null) {
          const completionProgressDurationMs = Math.max(
            backgroundFitCompletionProgressMinimumDurationMs,
            completionProgress.totalBackgroundCount *
              backgroundFitProgressCountMinimumStepDurationMs +
              backgroundFitProgressCompletionPaddingMs,
          )

          backgroundFitCompletionProgressTimeoutRef.current = window.setTimeout(() => {
            backgroundFitCompletionProgressTimeoutRef.current = null
            backgroundFitProgressByViewKey.delete(backgroundFitViewKey)

            if (latestBackgroundFitRequestIdRef.current !== requestId) {
              return
            }

            startTransition(() => {
              setBackgroundFitProgressState((currentProgressState) =>
                currentProgressState?.key === backgroundFitViewKey ? null : currentProgressState,
              )
            })
          }, completionProgressDurationMs)
        }
      })
      .catch((error: unknown) => {
        if (isCancelled || latestBackgroundFitRequestIdRef.current !== requestId) {
          return
        }

        backgroundFitProgressByViewKey.delete(backgroundFitViewKey)
        setBackgroundFitErrorState({
          key: backgroundFitViewKey,
          message: error instanceof Error ? error.message : 'Background fit calculation failed.',
        })
        setBackgroundFitPartialViewState(null)
        setBackgroundFitProgressState(null)
      })

    return () => {
      isCancelled = true
      backgroundFitProgressByViewKey.delete(backgroundFitViewKey)
    }
  }, [
    backgroundFitErrorMessage,
    completedBackgroundFitView,
    backgroundFitViewKey,
    clearBackgroundFitCompletionProgressTimeout,
    getBackgroundFitWorkerClient,
    optionalPickedPerkIds,
    pickedPerkIds,
    shouldAllowBackgroundStudyBook,
    shouldAllowBackgroundStudyScroll,
    shouldAllowSecondBackgroundStudyScroll,
    shouldLoadBackgroundFitView,
  ])

  const visiblePerkCountsByCategory = useMemo(
    () => getVisiblePerkCountsByCategory(visiblePerks),
    [visiblePerks],
  )
  const visiblePerkCountsByCategoryPerkGroup = useMemo(
    () => getVisiblePerkCountsByCategoryPerkGroup(visiblePerks),
    [visiblePerks],
  )
  const displayedCategoryNames = useMemo(
    () =>
      [...availableCategories].toSorted((leftCategoryName, rightCategoryName) =>
        compareDisplayedCategories({
          leftCategoryName,
          normalizedSearchPhrase: normalizedPerkSearchPhrase,
          rightCategoryName,
          perkGroupOptionsByCategory: perkGroupOptionsByCategory,
          visiblePerkCountsByCategory,
        }),
      ),
    [
      availableCategories,
      normalizedPerkSearchPhrase,
      perkGroupOptionsByCategory,
      visiblePerkCountsByCategory,
    ],
  )
  const displayedPerkGroupOptionsByCategory = useMemo(
    () =>
      new Map(
        displayedCategoryNames.map((categoryName) => {
          const perkGroupOptions = perkGroupOptionsByCategory.get(categoryName) ?? []

          return [
            categoryName,
            [...perkGroupOptions].toSorted((leftPerkGroupOption, rightPerkGroupOption) =>
              compareDisplayedPerkGroupOptions({
                categoryName: categoryName,
                leftPerkGroupOption,
                normalizedSearchPhrase: normalizedPerkSearchPhrase,
                rightPerkGroupOption,
                visiblePerkCountsByCategoryPerkGroup,
              }),
            ),
          ] as const
        }),
      ),
    [
      displayedCategoryNames,
      normalizedPerkSearchPhrase,
      perkGroupOptionsByCategory,
      visiblePerkCountsByCategoryPerkGroup,
    ],
  )
  const pickedPerkRequirementById = useMemo<Map<string, BuildRequirement>>(
    () =>
      new Map(
        pickedBuildPerks.map((pickedBuildPerk) => [
          pickedBuildPerk.perkId,
          pickedBuildPerk.isOptional ? 'optional' : 'must-have',
        ]),
      ),
    [pickedBuildPerks],
  )
  const selectedPerkRequirement = selectedPerk
    ? (pickedPerkRequirementById.get(selectedPerk.id) ?? null)
    : null
  const mustHavePickedPerkCountsByCategory = useMemo(
    () => getPickedPerkCountsByCategory(mustHavePickedPerks),
    [mustHavePickedPerks],
  )
  const optionalPickedPerkCountsByCategory = useMemo(
    () => getPickedPerkCountsByCategory(optionalPickedPerks),
    [optionalPickedPerks],
  )
  const pickedPerkRequirementCountsByCategory = useMemo(
    () =>
      getPickedPerkRequirementCounts(
        mustHavePickedPerkCountsByCategory,
        optionalPickedPerkCountsByCategory,
      ),
    [mustHavePickedPerkCountsByCategory, optionalPickedPerkCountsByCategory],
  )
  const mustHavePickedPerkCountsByPerkGroup = useMemo(
    () => getPickedPerkCountsByPerkGroup(mustHavePickedPerks),
    [mustHavePickedPerks],
  )
  const optionalPickedPerkCountsByPerkGroup = useMemo(
    () => getPickedPerkCountsByPerkGroup(optionalPickedPerks),
    [optionalPickedPerks],
  )
  const pickedPerkRequirementCountsByPerkGroup = useMemo(
    () =>
      getPickedPerkRequirementCounts(
        mustHavePickedPerkCountsByPerkGroup,
        optionalPickedPerkCountsByPerkGroup,
      ),
    [mustHavePickedPerkCountsByPerkGroup, optionalPickedPerkCountsByPerkGroup],
  )
  const groupedBackgroundSources = useMemo(
    () =>
      selectedPerk
        ? groupBackgroundSources(selectedPerk.backgroundSources, (backgroundSource) =>
            backgroundFitEngine.getBackgroundPerkGroupProbability(
              backgroundSource.backgroundId,
              backgroundSource.categoryName,
              backgroundSource.perkGroupId,
            ),
          )
        : [],
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
        setQuery(urlState.query)
        setPickedBuildPerks(
          createPickedBuildPerkState(urlState.pickedPerkIds, urlState.optionalPerkIds),
        )
        setCategoryFilterMode(
          urlState.categoryFilterMode ??
            getCategoryFilterModeFromSelection({
              selectedCategoryNames: urlState.selectedCategoryNames,
              selectedPerkGroupIdsByCategory: urlState.selectedPerkGroupIdsByCategory,
            }),
        )
        setSelectedCategoryNames(urlState.selectedCategoryNames)
        setExpandedCategoryNames(urlState.selectedCategoryNames)
        setSelectedPerkGroupIdsByCategory(urlState.selectedPerkGroupIdsByCategory)
        setShouldAllowBackgroundStudyBook(urlState.shouldAllowBackgroundStudyBook)
        setShouldAllowBackgroundStudyScroll(urlState.shouldAllowBackgroundStudyScroll)
        setShouldAllowSecondBackgroundStudyScroll(urlState.shouldAllowSecondBackgroundStudyScroll)
        setShouldIncludeOriginPerkGroups(urlState.shouldIncludeOriginPerkGroups)
        setShouldIncludeAncientScrollPerkGroups(urlState.shouldIncludeAncientScrollPerkGroups)
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
    [clearAllHover, resetShareBuildStatus],
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

  useEffect(() => {
    startTransition(() => {
      setSelectedPerkGroupIdsByCategory((currentSelectedPerkGroupIdsByCategory) =>
        removeHiddenSelectedPerkGroupIds(currentSelectedPerkGroupIdsByCategory, {
          shouldIncludeAncientScrollPerkGroups,
          shouldIncludeOriginPerkGroups,
        }),
      )
    })
  }, [shouldIncludeAncientScrollPerkGroups, shouldIncludeOriginPerkGroups])

  function requestPerkResultListScrollReset() {
    setPerkResultListScrollResetKey((currentScrollResetKey) => currentScrollResetKey + 1)
  }

  function requestNextUrlHistoryEntry() {
    urlHistoryWriteModeRef.current = 'push'
  }

  function recordDetailHistoryEntry(urlState: BuildPlannerUrlState) {
    setDetailHistoryState((currentDetailHistoryState) =>
      recordDetailHistoryUrlState(currentDetailHistoryState, urlState),
    )
  }

  function isSelectedPerkDetail(perkId: string) {
    return activeDetailSelection.type === 'perk' && selectedPerkId === perkId
  }

  function clearSelectedPerkDetail() {
    setSelectedPerkId(null)
    setActiveDetailSelection({ type: 'perk' })
  }

  function clearCategoryFilterSelection() {
    requestPerkResultListScrollReset()
    setCategoryFilterMode('none')
    setExpandedCategoryNames([])
    setSelectedCategoryNames([])
    setSelectedPerkGroupIdsByCategory({})
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
      requestPerkResultListScrollReset()
      setQuery('')
      setCategoryFilterMode('all')
      setExpandedCategoryNames([])
      setSelectedCategoryNames([])
      setSelectedPerkGroupIdsByCategory({})
    })
  }

  function handlePerkSearchChange(nextQuery: string) {
    setQuery(nextQuery)

    if (
      nextQuery.trim().length > 0 &&
      hasActiveCategoryFilterSelection(
        categoryFilterMode,
        selectedCategoryNames,
        selectedPerkGroupIdsByCategory,
      )
    ) {
      startTransition(() => {
        clearCategoryFilterSelection()
      })
    }
  }

  function handleSelectPerk(perkId: string) {
    requestNextUrlHistoryEntry()

    if (isSelectedPerkDetail(perkId)) {
      clearSelectedPerkDetail()
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
      setPickedBuildPerks((currentPickedBuildPerks) =>
        addPickedBuildPerk(currentPickedBuildPerks, perkId, requirement),
      )
      clearBuildPerkTooltip(perkId)
    })
  }

  function handleRemovePickedPerk(perkId: string) {
    requestNextUrlHistoryEntry()
    startTransition(() => {
      setPickedBuildPerks((currentPickedBuildPerks) =>
        currentPickedBuildPerks.filter((pickedBuildPerk) => pickedBuildPerk.perkId !== perkId),
      )
      clearPerkHover(perkId)
      clearBuildPerkTooltip(perkId)
      clearPerkGroupHover()
    })
  }

  function handleTogglePickedPerkOptional(perkId: string) {
    requestNextUrlHistoryEntry()
    startTransition(() => {
      setPickedBuildPerks((currentPickedBuildPerks) => {
        const pickedBuildPerk = currentPickedBuildPerks.find(
          (currentPickedBuildPerk) => currentPickedBuildPerk.perkId === perkId,
        )

        if (!pickedBuildPerk) {
          return currentPickedBuildPerks
        }

        const remainingPickedBuildPerks = currentPickedBuildPerks.filter(
          (currentPickedBuildPerk) => currentPickedBuildPerk.perkId !== perkId,
        )
        const nextPickedBuildPerk = {
          isOptional: !pickedBuildPerk.isOptional,
          perkId,
        }

        if (nextPickedBuildPerk.isOptional) {
          return [...remainingPickedBuildPerks, nextPickedBuildPerk]
        }

        const firstOptionalPerkIndex = remainingPickedBuildPerks.findIndex(
          (currentPickedBuildPerk) => currentPickedBuildPerk.isOptional,
        )

        if (firstOptionalPerkIndex === -1) {
          return [...remainingPickedBuildPerks, nextPickedBuildPerk]
        }

        return [
          ...remainingPickedBuildPerks.slice(0, firstOptionalPerkIndex),
          nextPickedBuildPerk,
          ...remainingPickedBuildPerks.slice(firstOptionalPerkIndex),
        ]
      })
      clearPerkHover(perkId)
      clearBuildPerkTooltip(perkId)
      clearPerkGroupHover()
    })
  }

  function handleClearBuild() {
    requestNextUrlHistoryEntry()
    startTransition(() => {
      setPickedBuildPerks([])
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
    })
    setSavedBuildOperationStatus('saved')
  }

  async function handleOverwriteSavedBuild(savedBuildId: string) {
    await overwriteSavedBuild(savedBuildId, {
      optionalPerkIds: optionalPickedPerkIds,
      pickedPerkIds,
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
      setPickedBuildPerks(
        createPickedBuildPerkState(savedBuild.availablePerkIds, savedBuild.optionalPerkIds),
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
      await copyBuildShareUrl(
        createSharedBuildUrlSearch(
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

  function selectPerkGroup(
    perkGroupSelection: { categoryName: string; perkGroupId: string } | null,
  ) {
    requestPerkResultListScrollReset()

    if (perkGroupSelection === null) {
      setCategoryFilterMode('none')
      setSelectedCategoryNames([])
      setExpandedCategoryNames([])
      setSelectedPerkGroupIdsByCategory({})
      return
    }

    setCategoryFilterMode('selection')
    setSelectedCategoryNames([perkGroupSelection.categoryName])
    setExpandedCategoryNames([perkGroupSelection.categoryName])
    setSelectedPerkGroupIdsByCategory({
      [perkGroupSelection.categoryName]: [perkGroupSelection.perkGroupId],
    })
  }

  function handleInspectPlannerPerk(
    perkId: string,
    perkGroupSelection?: { categoryName: string; perkGroupId: string },
  ) {
    const shouldDeselectPerk = isSelectedPerkDetail(perkId)
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
        clearSelectedPerkDetail()
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
      setQuery('')
      setSelectedPerkId(perkId)
      setActiveDetailSelection({ type: 'perk' })
      selectPerkGroup(nextPerkGroupSelection)
    })
  }

  function handleInspectPerkGroup(categoryName: string, perkGroupId: string) {
    requestNextUrlHistoryEntry()
    startTransition(() => {
      const isSelectedPerkGroup =
        selectedPerkGroupIdsByCategory[categoryName]?.includes(perkGroupId) ?? false

      setQuery('')
      selectPerkGroup(isSelectedPerkGroup ? null : { categoryName, perkGroupId })
    })
  }

  function handleSelectBuildPlannerPerkGroup(categoryName: string, perkGroupId: string) {
    requestNextUrlHistoryEntry()
    startTransition(() => {
      const isSelectedPerkGroup =
        selectedPerkGroupIdsByCategory[categoryName]?.includes(perkGroupId) ?? false

      setQuery('')
      selectPerkGroup(isSelectedPerkGroup ? null : { categoryName, perkGroupId })
    })
  }

  function handleCategoryExpandToggle(categoryName: string) {
    startTransition(() => {
      setExpandedCategoryNames((currentExpandedCategoryNames) =>
        currentExpandedCategoryNames.includes(categoryName)
          ? currentExpandedCategoryNames.filter(
              (expandedCategoryName) => expandedCategoryName !== categoryName,
            )
          : [...currentExpandedCategoryNames, categoryName],
      )
    })
  }

  function handleCategoryToggle(nextCategoryName: string) {
    requestNextUrlHistoryEntry()
    startTransition(() => {
      const isSelected = selectedCategoryNames.includes(nextCategoryName)

      requestPerkResultListScrollReset()
      setQuery('')

      if (isSelected) {
        setCategoryFilterMode('none')
        setExpandedCategoryNames([])
        setSelectedCategoryNames([])
        setSelectedPerkGroupIdsByCategory({})
        return
      }

      // Category chips are a drilldown control, so opening one category replaces the previous category and nested perk group filters.
      setCategoryFilterMode('selection')
      setExpandedCategoryNames([nextCategoryName])
      setSelectedCategoryNames([nextCategoryName])
      setSelectedPerkGroupIdsByCategory({})
    })
  }

  function handleResetCategoryPerkGroups(categoryName: string) {
    requestNextUrlHistoryEntry()
    startTransition(() => {
      requestPerkResultListScrollReset()
      setQuery('')
      setCategoryFilterMode('selection')
      setExpandedCategoryNames([categoryName])
      setSelectedCategoryNames([categoryName])
      setSelectedPerkGroupIdsByCategory({})
    })
  }

  function handlePerkGroupSelect(categoryName: string, perkGroupId: string) {
    requestNextUrlHistoryEntry()
    startTransition(() => {
      const isSelectedPerkGroup =
        selectedPerkGroupIdsByCategory[categoryName]?.includes(perkGroupId) ?? false

      setQuery('')

      if (isSelectedPerkGroup) {
        requestPerkResultListScrollReset()
        setCategoryFilterMode('none')
        setExpandedCategoryNames([categoryName])
        setSelectedCategoryNames([])
        setSelectedPerkGroupIdsByCategory({})
        return
      }

      selectPerkGroup({ categoryName, perkGroupId })
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
    <div className={styles.appShell} data-testid="app-shell">
      <div className={styles.backgroundRunes} aria-hidden="true" />
      <header className={styles.hero} data-testid="hero">
        <div className={styles.heroCopy}>
          <h1>Build planner</h1>
          <a
            aria-label="Open the Battle Brothers Legends mod repository on GitHub"
            className={joinClassNames(styles.eyebrow, styles.heroBrand)}
            href={legendsModRepositoryUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Battle Brothers{' '}
            <span className={styles.heroBrandEmphasis} data-testid="hero-brand-emphasis">
              Legends
            </span>
          </a>
        </div>
        <div className={styles.heroTopBar}>
          <div className={styles.heroTopActions}>
            <dl className={styles.heroMeta} aria-label="Perk catalog summary">
              <div>
                <dt>Perks</dt>
                <dd>{legendsPerksDataset.perkCount}</dd>
              </div>
              <div>
                <dt>Perk groups</dt>
                <dd>{legendsPerksDataset.perkGroupCount}</dd>
              </div>
              <div>
                <dt>Mod version</dt>
                <dd>{legendsPerksDataset.referenceVersion.replace(/^reference-mod_/, '')}</dd>
              </div>
              <div>
                <dt>Planner version</dt>
                <dd>{plannerVersion}</dd>
              </div>
            </dl>
            <a
              aria-label="Open the build planner repository on GitHub"
              className={styles.heroRepositoryLink}
              href={repositoryUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <GitHubIcon className={styles.heroRepositoryLinkIcon} />
            </a>
            <a
              aria-label="Open Piotr Piechowski projects"
              className={styles.heroRepositoryLink}
              href={personalProjectsUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <PersonIcon className={styles.heroRepositoryLinkIcon} />
            </a>
          </div>
        </div>
      </header>

      <BuildPlanner
        hasActiveBackgroundFitSearch={hasActiveBackgroundFitSearch}
        buildPerkHighlightPerkGroupKeys={buildPerkHighlightPerkGroupKeys}
        emphasizedCategoryNames={emphasizedCategoryNames}
        emphasizedPerkGroupKeys={emphasizedPerkGroupKeys}
        hoveredBuildPerk={hoveredBuildPerk}
        hoveredBuildPerkTooltip={hoveredBuildPerkTooltip}
        hoveredBuildPerkTooltipId={hoveredBuildPerkTooltipId}
        hoveredPerkId={hoveredPerkId}
        individualPerkGroups={buildPlannerGroups.individualPerkGroups}
        isSavedBuildsLoading={isSavedBuildsLoading}
        onClearBuild={handleClearBuild}
        onCloseBuildPerkHover={closeBuildPerkHover}
        onCloseBuildPerkTooltip={closeBuildPerkTooltip}
        onClosePerkGroupHover={closePerkGroupHover}
        onCopySavedBuildLink={handleCopySavedBuildLink}
        onDeleteSavedBuild={handleDeleteSavedBuild}
        onInspectPerkGroup={handleSelectBuildPlannerPerkGroup}
        onInspectPlannerPerk={handleInspectPlannerPerk}
        onLoadSavedBuild={handleLoadSavedBuild}
        onOpenBuildPerkHover={openBuildPerkHover}
        onOpenBuildPerkTooltip={openBuildPerkTooltip}
        onOpenPerkGroupHover={openPerkGroupHover}
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
        selectedEmphasisCategoryNames={selectedEmphasisCategoryNames}
        selectedEmphasisPerkGroupKeys={selectedEmphasisPerkGroupKeys}
        selectedBuildPlannerPerkId={
          activeDetailType === 'perk' && selectedPerk !== null ? selectedPerk.id : null
        }
        shareBuildStatus={shareBuildStatus}
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
          hoveredPerkId={hoveredPerkId}
          isExpanded={isBackgroundFitPanelExpanded}
          isLoadingBackgroundFitView={isBackgroundFitViewLoading || isBackgroundFitProgressVisible}
          onCloseBuildPerkHover={closeBuildPerkHover}
          onCloseBuildPerkTooltip={closeBuildPerkTooltip}
          onClearPerkGroupHover={clearPerkGroupHover}
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

        <DetailsPanel
          activeDetailType={activeDetailType}
          backgroundFitDetail={backgroundFitDetail}
          detailHistoryNavigationAvailability={detailHistoryNavigationAvailability}
          emphasizedCategoryNames={emphasizedCategoryNames}
          emphasizedPerkGroupKeys={emphasizedPerkGroupKeys}
          groupedBackgroundSources={groupedBackgroundSources}
          hoveredBuildPerkId={hoveredBuildPerk?.id ?? null}
          hoveredBuildPerkTooltipId={hoveredBuildPerkTooltipId}
          hoveredPerkId={hoveredPerkId}
          selectedEmphasisCategoryNames={selectedEmphasisCategoryNames}
          selectedEmphasisPerkGroupKeys={selectedEmphasisPerkGroupKeys}
          mustHavePickedPerkIds={mustHavePickedPerkIds}
          onAddPerkToBuild={handleAddPickedPerk}
          onCloseBuildPerkHover={closeBuildPerkHover}
          onCloseBuildPerkTooltip={closeBuildPerkTooltip}
          onClosePerkGroupHover={closePerkGroupHover}
          onInspectPerk={handleInspectPlannerPerk}
          onInspectPerkGroup={handleInspectPerkGroup}
          onNavigateDetailHistory={handleNavigateDetailHistory}
          onOpenBuildPerkHover={openBuildPerkHover}
          onOpenBuildPerkTooltip={openBuildPerkTooltip}
          onOpenPerkGroupHover={openPerkGroupHover}
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
          emphasizedCategoryNames={emphasizedCategoryNames}
          emphasizedPerkGroupKeys={emphasizedPerkGroupKeys}
          hoveredPerkId={hoveredPerkId}
          onClosePerkGroupHover={closePerkGroupHover}
          onCloseResultsPerkHover={closeResultsPerkHover}
          onAncientScrollPerkGroupsChange={handleAncientScrollPerkGroupsChange}
          onInspectPerkGroup={handleInspectPerkGroup}
          onOriginPerkGroupsChange={handleOriginPerkGroupsChange}
          onOpenPerkGroupHover={openPerkGroupHover}
          onOpenResultsPerkHover={openResultsPerkHover}
          onAddPerkToBuild={handleAddPickedPerk}
          onRemovePerkFromBuild={handleRemovePickedPerk}
          onSelectPerk={handleSelectPerk}
          pickedPerkRequirementById={pickedPerkRequirementById}
          query={query}
          selectedPerk={selectedPerk}
          selectedEmphasisCategoryNames={selectedEmphasisCategoryNames}
          selectedEmphasisPerkGroupKeys={selectedEmphasisPerkGroupKeys}
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
          emphasizedCategoryNames={emphasizedCategoryNames}
          emphasizedPerkGroupKeys={emphasizedPerkGroupKeys}
          hoveredPerkGroupKey={hoveredPerkGroupKey}
          isExpanded={isCategorySidebarExpanded}
          onCategoryExpandToggle={handleCategoryExpandToggle}
          onCategoryToggle={handleCategoryToggle}
          onClearCategorySelection={handleClearCategorySelection}
          onCloseCategoryHover={closeCategoryHover}
          onClosePerkGroupHover={closePerkGroupHover}
          onOpenCategoryHover={openCategoryHover}
          onOpenPerkGroupHover={openPerkGroupHover}
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
    </div>
  )
}
