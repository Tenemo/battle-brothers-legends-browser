import { startTransition, useCallback, useEffect, useMemo, useState } from 'react'
import '@fontsource/cinzel/700.css'
import '@fontsource/source-sans-3/400.css'
import '@fontsource/source-sans-3/600.css'
import '@fontsource/source-sans-3/700.css'
import styles from './App.module.scss'
import { BackgroundFitPanel } from './components/BackgroundFitPanel'
import {
  BuildPlanner,
  type BuildPlannerSavedBuild,
  type SavedBuildOperationStatus,
} from './components/BuildPlanner'
import { CategorySidebar } from './components/CategorySidebar'
import { PerkDetail } from './components/PerkDetail'
import { PerkResults } from './components/PerkResults'
import { GitHubIcon } from './components/SharedControls'
import legendsPerksDatasetJson from './data/legends-perks.json'
import { createBackgroundFitEngine } from './lib/background-fit'
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
import { compareCategoryNames } from './lib/dynamic-background-categories'
import { buildPerkBrowserBuildUrlSearch } from './lib/perk-browser-url-state'
import { groupBackgroundSources, normalizeSearchPhrase } from './lib/perk-display'
import { filterAndSortPerks } from './lib/perk-search'
import {
  getPerksWithOriginAndAncientScrollPerkGroupsFiltered,
  isOriginOrAncientScrollOnlyPerkGroupId,
} from './lib/origin-and-ancient-scroll-perk-groups'
import { copyBuildShareUrl, useBuildShareLink } from './lib/use-build-share-link'
import { cx } from './lib/class-names'
import {
  usePerkBrowserUrlSync,
  useInitialPerkBrowserUrlState,
} from './lib/use-perk-browser-url-sync'
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
const mediumDesktopBackgroundFitMediaQuery = '(min-width: 1280px) and (max-width: 1439px)'
const plannerVersion = __PLANNER_VERSION__

const allCategoryCounts = getCategoryCounts(allPerks)
const allPerkGroupOptionsByCategory = getCategoryPerkGroupOptions(allPerks)
const allAvailableCategories = [...allCategoryCounts.keys()].toSorted(compareCategoryNames)

function getInitialBackgroundFitExpandedState() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true
  }

  return !window.matchMedia(mediumDesktopBackgroundFitMediaQuery).matches
}

export default function App() {
  const initialUrlState = useInitialPerkBrowserUrlState({
    availableCategoryNames: allAvailableCategories,
    perks: allPerks,
    perkGroupOptionsByCategory: allPerkGroupOptionsByCategory,
  })
  const [query, setQuery] = useState(initialUrlState.query)
  const [pickedPerkIds, setPickedPerkIds] = useState<string[]>(initialUrlState.pickedPerkIds)
  const [selectedCategoryNames, setSelectedCategoryNames] = useState<string[]>(
    initialUrlState.selectedCategoryNames,
  )
  const [expandedCategoryNames, setExpandedCategoryNames] = useState<string[]>(
    initialUrlState.selectedCategoryNames,
  )
  const [selectedPerkGroupIdsByCategory, setSelectedPerkGroupIdsByCategory] = useState<
    Record<string, string[]>
  >(initialUrlState.selectedPerkGroupIdsByCategory)
  const [
    shouldIncludeOriginAndAncientScrollPerkGroups,
    setShouldIncludeOriginAndAncientScrollPerkGroups,
  ] = useState(initialUrlState.shouldIncludeOriginAndAncientScrollPerkGroups)
  const [shouldIncludeOriginBackgrounds, setShouldIncludeOriginBackgrounds] = useState(
    initialUrlState.shouldIncludeOriginBackgrounds,
  )
  const [isBackgroundFitPanelExpanded, setIsBackgroundFitPanelExpanded] = useState(
    getInitialBackgroundFitExpandedState,
  )
  const [isPerkDetailPanelExpanded, setIsPerkDetailPanelExpanded] = useState(true)
  const [hasActiveBackgroundFitSearch, setHasActiveBackgroundFitSearch] = useState(false)
  const {
    clearAllHover,
    clearBuildPerkTooltip,
    clearPerkGroupHover,
    clearPerkHover,
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
    openBuildPerkHover,
    openBuildPerkTooltip,
    openPerkGroupHover,
    openResultsPerkHover,
  } = usePerkInteractionState({
    allPerksById,
    selectedCategoryNames,
    selectedPerkGroupIdsByCategory,
  })
  const catalogPerks = useMemo(
    () =>
      shouldIncludeOriginAndAncientScrollPerkGroups
        ? allPerks
        : getPerksWithOriginAndAncientScrollPerkGroupsFiltered(allPerks),
    [shouldIncludeOriginAndAncientScrollPerkGroups],
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
        query,
        selectedCategoryNames,
        selectedPerkGroupIdsByCategory,
      }),
    [catalogPerks, query, selectedCategoryNames, selectedPerkGroupIdsByCategory],
  )
  const [selectedPerkId, setSelectedPerkId] = useState<string | null>(
    () => visiblePerks[0]?.id ?? null,
  )
  const selectedPerk = useMemo(
    () => visiblePerks.find((perk) => perk.id === selectedPerkId) ?? visiblePerks[0] ?? null,
    [selectedPerkId, visiblePerks],
  )
  const pickedPerks = useMemo(
    () =>
      pickedPerkIds.flatMap((pickedPerkId) => {
        const pickedPerk = allPerksById.get(pickedPerkId)

        return pickedPerk ? [pickedPerk] : []
      }),
    [pickedPerkIds],
  )
  const buildShareSearch = useMemo(
    () => buildPerkBrowserBuildUrlSearch(pickedPerkIds, allPerksById),
    [pickedPerkIds],
  )
  const hasPickedPerks = pickedPerks.length > 0
  const { handleShareBuild, resetShareBuildStatus, shareBuildStatus } = useBuildShareLink({
    buildShareSearch,
    hasPickedPerks,
  })
  const {
    deleteSavedBuild,
    isSavedBuildsLoading,
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

        return {
          availablePerkIds: availablePerks.map((perk) => perk.id),
          id: savedBuild.id,
          missingPerkCount: savedBuild.pickedPerkIds.length - availablePerks.length,
          name: savedBuild.name,
          perkNames: availablePerks.map((perk) => perk.perkName),
          pickedPerkCount: savedBuild.pickedPerkIds.length,
          referenceVersion: savedBuild.referenceVersion,
          updatedAt: savedBuild.updatedAt,
        }
      }),
    [savedBuilds],
  )
  const buildPlannerGroups = useMemo(() => getBuildPlannerGroups(pickedPerks), [pickedPerks])
  const backgroundFitView = useMemo(
    () => backgroundFitEngine.getBackgroundFitView(pickedPerks),
    [pickedPerks],
  )
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
  const pickedPerkCountsByCategory = useMemo(
    () => getPickedPerkCountsByCategory(pickedPerks),
    [pickedPerks],
  )
  const pickedPerkCountsByPerkGroup = useMemo(
    () => getPickedPerkCountsByPerkGroup(pickedPerks),
    [pickedPerks],
  )
  const pickedPerkOrderById = useMemo(
    () =>
      new Map(
        pickedPerkIds.map((pickedPerkId, pickedPerkIndex) => [pickedPerkId, pickedPerkIndex + 1]),
      ),
    [pickedPerkIds],
  )
  const isSelectedPerkPicked = selectedPerk ? pickedPerkOrderById.has(selectedPerk.id) : false
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
  const selectedCategoryCount = selectedCategoryNames.length
  const selectedPerkGroupCount = useMemo(
    () =>
      Object.values(selectedPerkGroupIdsByCategory).reduce(
        (perkGroupCount, selectedPerkGroupIds) => perkGroupCount + selectedPerkGroupIds.length,
        0,
      ),
    [selectedPerkGroupIdsByCategory],
  )
  const handleUrlStateChange = useCallback(
    (urlState: typeof initialUrlState) => {
      startTransition(() => {
        setQuery(urlState.query)
        setPickedPerkIds(urlState.pickedPerkIds)
        setSelectedCategoryNames(urlState.selectedCategoryNames)
        setExpandedCategoryNames(urlState.selectedCategoryNames)
        setSelectedPerkGroupIdsByCategory(urlState.selectedPerkGroupIdsByCategory)
        setShouldIncludeOriginAndAncientScrollPerkGroups(
          urlState.shouldIncludeOriginAndAncientScrollPerkGroups,
        )
        setShouldIncludeOriginBackgrounds(urlState.shouldIncludeOriginBackgrounds)
        clearAllHover()
        resetShareBuildStatus()
      })
    },
    [clearAllHover, resetShareBuildStatus],
  )

  usePerkBrowserUrlSync(
    {
      pickedPerkIds,
      query,
      selectedCategoryNames,
      selectedPerkGroupIdsByCategory,
      shouldIncludeOriginAndAncientScrollPerkGroups,
      shouldIncludeOriginBackgrounds,
    },
    {
      availableCategoryNames: allAvailableCategories,
      perksById: allPerksById,
      perkGroupOptionsByCategory: allPerkGroupOptionsByCategory,
    },
    handleUrlStateChange,
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

  function handleResetCategories() {
    startTransition(() => {
      setExpandedCategoryNames([])
      setSelectedCategoryNames([])
      setSelectedPerkGroupIdsByCategory({})
    })
  }

  function handleOriginAndAncientScrollPerkGroupsChange(
    shouldIncludeRestrictedPerkGroups: boolean,
  ) {
    startTransition(() => {
      setShouldIncludeOriginAndAncientScrollPerkGroups(shouldIncludeRestrictedPerkGroups)

      if (shouldIncludeRestrictedPerkGroups) {
        return
      }

      setSelectedPerkGroupIdsByCategory((currentSelectedPerkGroupIdsByCategory) =>
        Object.fromEntries(
          Object.entries(currentSelectedPerkGroupIdsByCategory)
            .map(([categoryName, selectedPerkGroupIds]) => [
              categoryName,
              selectedPerkGroupIds.filter(
                (perkGroupId) => !isOriginOrAncientScrollOnlyPerkGroupId(perkGroupId),
              ),
            ])
            .filter(([, selectedPerkGroupIds]) => selectedPerkGroupIds.length > 0),
        ),
      )
    })
  }

  function handleTogglePerkPicked(perkId: string) {
    startTransition(() => {
      setPickedPerkIds((currentPickedPerkIds) =>
        currentPickedPerkIds.includes(perkId)
          ? currentPickedPerkIds.filter((currentPickedPerkId) => currentPickedPerkId !== perkId)
          : [...currentPickedPerkIds, perkId],
      )
      clearBuildPerkTooltip(perkId)
    })
  }

  function handleRemovePickedPerk(perkId: string) {
    startTransition(() => {
      setPickedPerkIds((currentPickedPerkIds) =>
        currentPickedPerkIds.filter((currentPickedPerkId) => currentPickedPerkId !== perkId),
      )
      clearPerkHover(perkId)
      clearBuildPerkTooltip(perkId)
      clearPerkGroupHover()
    })
  }

  function handleClearBuild() {
    startTransition(() => {
      setPickedPerkIds([])
      clearAllHover()
      resetShareBuildStatus()
    })
  }

  async function handleSaveCurrentBuild(name: string) {
    await saveCurrentBuild({
      name,
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

    startTransition(() => {
      setPickedPerkIds(savedBuild.availablePerkIds)
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
        buildPerkBrowserBuildUrlSearch(savedBuild.availablePerkIds, allPerksById),
      )
      setSavedBuildOperationStatus('copied')
    } catch {
      setSavedBuildOperationStatus('copy-error')
    }
  }

  function selectPerkGroup(
    perkGroupSelection: { categoryName: string; perkGroupId: string } | null,
  ) {
    if (perkGroupSelection === null) {
      setSelectedCategoryNames([])
      setExpandedCategoryNames([])
      setSelectedPerkGroupIdsByCategory({})
      return
    }

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
    const inspectedPerk = allPerksById.get(perkId)
    const nextPerkGroupSelection = perkGroupSelection ?? inspectedPerk?.placements[0] ?? null

    startTransition(() => {
      setQuery('')
      setSelectedPerkId(perkId)
      selectPerkGroup(nextPerkGroupSelection)
    })
  }

  function handleInspectPerkGroup(categoryName: string, perkGroupId: string) {
    startTransition(() => {
      setQuery('')
      selectPerkGroup({ categoryName, perkGroupId })
    })
  }

  function handleCategoryToggle(nextCategoryName: string) {
    startTransition(() => {
      const isSelected = selectedCategoryNames.includes(nextCategoryName)

      if (isSelected) {
        setExpandedCategoryNames([])
        setSelectedCategoryNames([])
        setSelectedPerkGroupIdsByCategory({})
        return
      }

      // Category chips are a drilldown control, so opening one category replaces the previous category and nested perk group filters.
      setExpandedCategoryNames([nextCategoryName])
      setSelectedCategoryNames([nextCategoryName])
      setSelectedPerkGroupIdsByCategory({})
    })
  }

  function handleResetCategoryPerkGroups(categoryName: string) {
    startTransition(() =>
      setSelectedPerkGroupIdsByCategory((currentSelectedPerkGroupIdsByCategory) => ({
        ...currentSelectedPerkGroupIdsByCategory,
        [categoryName]: [],
      })),
    )
  }

  function handlePerkGroupSelect(categoryName: string, perkGroupId: string) {
    startTransition(() => {
      selectPerkGroup({ categoryName, perkGroupId })
    })
  }

  useEffect(() => {
    if (visiblePerks.length === 0) {
      if (selectedPerkId !== null) {
        startTransition(() => setSelectedPerkId(null))
      }

      return
    }

    if (!visiblePerks.some((perk) => perk.id === selectedPerkId)) {
      startTransition(() => setSelectedPerkId(visiblePerks[0].id))
    }
  }, [selectedPerkId, visiblePerks])

  return (
    <div className={styles.appShell} data-testid="app-shell">
      <div className={styles.backgroundRunes} aria-hidden="true" />
      <header className={styles.hero} data-testid="hero">
        <div className={styles.heroCopy}>
          <h1>Build planner</h1>
          <a
            aria-label="Open the Battle Brothers Legends mod repository on GitHub"
            className={cx(styles.eyebrow, styles.heroBrand)}
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
          </div>
        </div>
      </header>

      <BuildPlanner
        hasActiveBackgroundFitSearch={hasActiveBackgroundFitSearch}
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
        onInspectPerkGroup={handleInspectPerkGroup}
        onInspectPlannerPerk={handleInspectPlannerPerk}
        onLoadSavedBuild={handleLoadSavedBuild}
        onOpenBuildPerkHover={openBuildPerkHover}
        onOpenBuildPerkTooltip={openBuildPerkTooltip}
        onOpenPerkGroupHover={openPerkGroupHover}
        onRemovePickedPerk={handleRemovePickedPerk}
        onSaveCurrentBuild={handleSaveCurrentBuild}
        onShareBuild={handleShareBuild}
        pickedPerks={pickedPerks}
        savedBuildOperationStatus={savedBuildOperationStatus}
        savedBuildPersistenceState={savedBuildPersistenceState}
        savedBuilds={savedBuildViews}
        savedBuildsErrorMessage={savedBuildsErrorMessage}
        shareBuildStatus={shareBuildStatus}
        sharedPerkGroups={buildPlannerGroups.sharedPerkGroups}
      />

      <main
        className={styles.workspace}
        data-background-fit-collapsed={!isBackgroundFitPanelExpanded}
        data-background-fit-search-active={hasActiveBackgroundFitSearch}
        data-detail-collapsed={!isPerkDetailPanelExpanded}
        data-testid="workspace"
      >
        <BackgroundFitPanel
          backgroundFitView={backgroundFitView}
          emphasizedCategoryNames={emphasizedCategoryNames}
          emphasizedPerkGroupKeys={emphasizedPerkGroupKeys}
          hoveredBuildPerkId={hoveredBuildPerk?.id ?? null}
          hoveredBuildPerkTooltipId={hoveredBuildPerkTooltipId}
          hoveredPerkId={hoveredPerkId}
          isExpanded={isBackgroundFitPanelExpanded}
          onCloseBuildPerkHover={closeBuildPerkHover}
          onCloseBuildPerkTooltip={closeBuildPerkTooltip}
          onClearPerkGroupHover={clearPerkGroupHover}
          onClosePerkGroupHover={closePerkGroupHover}
          onInspectPerkGroup={handleInspectPerkGroup}
          onInspectPlannerPerk={handleInspectPlannerPerk}
          onOpenBuildPerkHover={openBuildPerkHover}
          onOpenBuildPerkTooltip={openBuildPerkTooltip}
          onOpenPerkGroupHover={openPerkGroupHover}
          onOriginBackgroundsChange={setShouldIncludeOriginBackgrounds}
          onSearchActivityChange={setHasActiveBackgroundFitSearch}
          onToggleExpanded={() => setIsBackgroundFitPanelExpanded((isExpanded) => !isExpanded)}
          pickedPerkCount={pickedPerks.length}
          shouldIncludeOriginBackgrounds={shouldIncludeOriginBackgrounds}
        />

        <CategorySidebar
          allPerkCount={catalogPerks.length}
          displayedCategoryNames={displayedCategoryNames}
          displayedPerkGroupOptionsByCategory={displayedPerkGroupOptionsByCategory}
          expandedCategoryNames={expandedCategoryNames}
          categoryCounts={categoryCounts}
          emphasizedCategoryNames={emphasizedCategoryNames}
          emphasizedPerkGroupKeys={emphasizedPerkGroupKeys}
          hoveredPerkGroupKey={hoveredPerkGroupKey}
          onCategoryToggle={handleCategoryToggle}
          onResetCategoryPerkGroups={handleResetCategoryPerkGroups}
          onResetCategories={handleResetCategories}
          onPerkGroupSelect={handlePerkGroupSelect}
          pickedPerkCountsByCategory={pickedPerkCountsByCategory}
          pickedPerkCountsByPerkGroup={pickedPerkCountsByPerkGroup}
          query={query}
          selectedCategoryNames={selectedCategoryNames}
          selectedPerkGroupIdsByCategory={selectedPerkGroupIdsByCategory}
        />

        <PerkResults
          emphasizedCategoryNames={emphasizedCategoryNames}
          emphasizedPerkGroupKeys={emphasizedPerkGroupKeys}
          hoveredPerkId={hoveredPerkId}
          onClosePerkGroupHover={closePerkGroupHover}
          onCloseResultsPerkHover={closeResultsPerkHover}
          onOriginAndAncientScrollPerkGroupsChange={handleOriginAndAncientScrollPerkGroupsChange}
          onInspectPerkGroup={handleInspectPerkGroup}
          onOpenPerkGroupHover={openPerkGroupHover}
          onOpenResultsPerkHover={openResultsPerkHover}
          onSelectPerk={setSelectedPerkId}
          onTogglePerkPicked={handleTogglePerkPicked}
          pickedPerkOrderById={pickedPerkOrderById}
          query={query}
          selectedCategoryCount={selectedCategoryCount}
          selectedPerk={selectedPerk}
          selectedPerkGroupCount={selectedPerkGroupCount}
          setQuery={setQuery}
          shouldIncludeOriginAndAncientScrollPerkGroups={
            shouldIncludeOriginAndAncientScrollPerkGroups
          }
          visiblePerks={visiblePerks}
        />

        <PerkDetail
          emphasizedCategoryNames={emphasizedCategoryNames}
          emphasizedPerkGroupKeys={emphasizedPerkGroupKeys}
          groupedBackgroundSources={groupedBackgroundSources}
          hoveredBuildPerkId={hoveredBuildPerk?.id ?? null}
          hoveredBuildPerkTooltipId={hoveredBuildPerkTooltipId}
          hoveredPerkId={hoveredPerkId}
          isSelectedPerkPicked={isSelectedPerkPicked}
          isExpanded={isPerkDetailPanelExpanded}
          onCloseBuildPerkHover={closeBuildPerkHover}
          onCloseBuildPerkTooltip={closeBuildPerkTooltip}
          onClosePerkGroupHover={closePerkGroupHover}
          onInspectPerk={handleInspectPlannerPerk}
          onInspectPerkGroup={handleInspectPerkGroup}
          onOpenBuildPerkHover={openBuildPerkHover}
          onOpenBuildPerkTooltip={openBuildPerkTooltip}
          onOpenPerkGroupHover={openPerkGroupHover}
          onToggleExpanded={() => setIsPerkDetailPanelExpanded((isExpanded) => !isExpanded)}
          onTogglePerkPicked={handleTogglePerkPicked}
          selectedPerk={selectedPerk}
        />
      </main>
    </div>
  )
}
