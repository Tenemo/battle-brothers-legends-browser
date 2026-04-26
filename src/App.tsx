import { startTransition, useEffect, useMemo, useState } from 'react'
import '@fontsource/cinzel/700.css'
import '@fontsource/source-sans-3/400.css'
import '@fontsource/source-sans-3/600.css'
import '@fontsource/source-sans-3/700.css'
import './App.css'
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
import { compareCategoryNames } from './lib/perk-categories'
import { buildPerkBrowserBuildUrlSearch } from './lib/perk-browser-url-state'
import { groupBackgroundSources, normalizeSearchPhrase } from './lib/perk-display'
import { filterAndSortPerks } from './lib/perk-search'
import { copyBuildShareUrl, useBuildShareLink } from './lib/use-build-share-link'
import {
  usePerkBrowserUrlSync,
  useInitialPerkBrowserUrlState,
} from './lib/use-perk-browser-url-sync'
import { usePerkHoverState } from './lib/use-perk-hover-state'
import { useSavedBuilds } from './lib/use-saved-builds'
import type { LegendsPerksDataset } from './types/legends-perks'

const legendsPerksDataset = legendsPerksDatasetJson as LegendsPerksDataset
const allPerks = legendsPerksDataset.perks
const allPerksById = new Map(allPerks.map((perk) => [perk.id, perk]))
const backgroundFitEngine = createBackgroundFitEngine(legendsPerksDataset)
const repositoryUrl = 'https://github.com/Tenemo/battle-brothers-legends-browser'
const mediumDesktopBackgroundFitMediaQuery = '(min-width: 1280px) and (max-width: 1439px)'

const categoryCounts = getCategoryCounts(allPerks)
const perkGroupOptionsByCategory = getCategoryPerkGroupOptions(allPerks)
const availableCategories = [...categoryCounts.keys()].toSorted(compareCategoryNames)

function getInitialBackgroundFitExpandedState() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true
  }

  return !window.matchMedia(mediumDesktopBackgroundFitMediaQuery).matches
}

export default function App() {
  const initialUrlState = useInitialPerkBrowserUrlState({
    availableCategoryNames: availableCategories,
    perks: allPerks,
    perkGroupOptionsByCategory: perkGroupOptionsByCategory,
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
  const [shouldIncludeOriginBackgrounds, setShouldIncludeOriginBackgrounds] = useState(
    initialUrlState.shouldIncludeOriginBackgrounds,
  )
  const [isBackgroundFitPanelExpanded, setIsBackgroundFitPanelExpanded] = useState(
    getInitialBackgroundFitExpandedState,
  )
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
    hoveredBuildPerk,
    hoveredBuildPerkTooltip,
    hoveredBuildPerkTooltipId,
    hoveredPerkGroupKey,
    hoveredPerkId,
    openBuildPerkHover,
    openBuildPerkTooltip,
    openPerkGroupHover,
    openResultsPerkHover,
  } = usePerkHoverState(allPerksById)
  const normalizedPerkSearchPhrase = normalizeSearchPhrase(query)
  const visiblePerks = filterAndSortPerks(allPerks, {
    query,
    selectedCategoryNames,
    selectedPerkGroupIdsByCategory,
  })
  const [selectedPerkId, setSelectedPerkId] = useState<string | null>(
    () => visiblePerks[0]?.id ?? null,
  )
  const selectedPerk =
    visiblePerks.find((perk) => perk.id === selectedPerkId) ?? visiblePerks[0] ?? null
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
    [normalizedPerkSearchPhrase, visiblePerkCountsByCategory],
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
    [displayedCategoryNames, normalizedPerkSearchPhrase, visiblePerkCountsByCategoryPerkGroup],
  )
  const pickedPerkCountsByCategory = getPickedPerkCountsByCategory(pickedPerks)
  const pickedPerkCountsByPerkGroup = getPickedPerkCountsByPerkGroup(pickedPerks)
  const pickedPerkOrderById = new Map(
    pickedPerkIds.map((pickedPerkId, pickedPerkIndex) => [pickedPerkId, pickedPerkIndex + 1]),
  )
  const selectedPerkBuildSlot = selectedPerk
    ? (pickedPerkOrderById.get(selectedPerk.id) ?? null)
    : null
  const groupedBackgroundSources = selectedPerk
    ? groupBackgroundSources(selectedPerk.backgroundSources)
    : []
  const selectedCategoryCount = selectedCategoryNames.length
  const selectedPerkGroupCount = Object.values(selectedPerkGroupIdsByCategory).reduce(
    (perkGroupCount, selectedPerkGroupIds) => perkGroupCount + selectedPerkGroupIds.length,
    0,
  )

  usePerkBrowserUrlSync(
    {
      pickedPerkIds,
      query,
      selectedCategoryNames,
      selectedPerkGroupIdsByCategory,
      shouldIncludeOriginBackgrounds,
    },
    {
      availableCategoryNames: availableCategories,
      perksById: allPerksById,
      perkGroupOptionsByCategory: perkGroupOptionsByCategory,
    },
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

  function handleInspectPlannerPerk(
    perkId: string,
    perkGroupSelection?: { categoryName: string; perkGroupId: string },
  ) {
    const inspectedPerk = allPerksById.get(perkId)
    const nextPerkGroupSelection = perkGroupSelection ?? inspectedPerk?.placements[0] ?? null

    startTransition(() => {
      setQuery('')
      setSelectedPerkId(perkId)

      if (nextPerkGroupSelection === null) {
        setSelectedCategoryNames([])
        setExpandedCategoryNames([])
        setSelectedPerkGroupIdsByCategory({})
        return
      }

      setSelectedCategoryNames([nextPerkGroupSelection.categoryName])
      setExpandedCategoryNames([nextPerkGroupSelection.categoryName])
      setSelectedPerkGroupIdsByCategory({
        [nextPerkGroupSelection.categoryName]: [nextPerkGroupSelection.perkGroupId],
      })
    })
  }

  function handleInspectPerkGroup(categoryName: string, perkGroupId: string) {
    startTransition(() => {
      setQuery('')
      setSelectedCategoryNames([categoryName])
      setExpandedCategoryNames([categoryName])
      setSelectedPerkGroupIdsByCategory({
        [categoryName]: [perkGroupId],
      })
    })
  }

  function handleCategoryToggle(nextCategoryName: string) {
    startTransition(() => {
      const isSelected = selectedCategoryNames.includes(nextCategoryName)

      if (isSelected) {
        setExpandedCategoryNames((currentExpandedCategoryNames) =>
          currentExpandedCategoryNames.filter((categoryName) => categoryName !== nextCategoryName),
        )
        setSelectedCategoryNames((currentSelectedCategoryNames) =>
          currentSelectedCategoryNames.filter((categoryName) => categoryName !== nextCategoryName),
        )
        setSelectedPerkGroupIdsByCategory((currentSelectedPerkGroupIdsByCategory) => {
          const remainingSelectedPerkGroupIdsByCategory = {
            ...currentSelectedPerkGroupIdsByCategory,
          }
          delete remainingSelectedPerkGroupIdsByCategory[nextCategoryName]

          return remainingSelectedPerkGroupIdsByCategory
        })
        return
      }

      setExpandedCategoryNames((currentExpandedCategoryNames) =>
        currentExpandedCategoryNames.includes(nextCategoryName)
          ? currentExpandedCategoryNames
          : [...currentExpandedCategoryNames, nextCategoryName],
      )
      setSelectedCategoryNames((currentSelectedCategoryNames) => [
        ...currentSelectedCategoryNames,
        nextCategoryName,
      ])
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

  function handlePerkGroupToggle(categoryName: string, nextPerkGroupId: string) {
    startTransition(() =>
      setSelectedPerkGroupIdsByCategory((currentSelectedPerkGroupIdsByCategory) => {
        const currentSelectedPerkGroupIds =
          currentSelectedPerkGroupIdsByCategory[categoryName] ?? []
        const nextSelectedPerkGroupIds = currentSelectedPerkGroupIds.includes(nextPerkGroupId)
          ? currentSelectedPerkGroupIds.filter((perkGroupId) => perkGroupId !== nextPerkGroupId)
          : [...currentSelectedPerkGroupIds, nextPerkGroupId]

        return {
          ...currentSelectedPerkGroupIdsByCategory,
          [categoryName]: nextSelectedPerkGroupIds,
        }
      }),
    )
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
    <div className="app-shell">
      <div className="background-runes" aria-hidden="true" />
      <header className="hero">
        <div className="hero-copy">
          <h1>Perks browser</h1>
          <p className="eyebrow hero-brand">
            Battle Brothers <span className="hero-brand-emphasis">Legends</span>
          </p>
        </div>
        <div className="hero-top-bar">
          <div className="hero-top-actions">
            <dl className="hero-meta" aria-label="Perk catalog summary">
              <div>
                <dt>Perks</dt>
                <dd>{legendsPerksDataset.perkCount}</dd>
              </div>
              <div>
                <dt>Perk groups</dt>
                <dd>{legendsPerksDataset.perkGroupCount}</dd>
              </div>
              <div>
                <dt>Reference</dt>
                <dd>{legendsPerksDataset.referenceVersion.replace(/^reference-mod_/, '')}</dd>
              </div>
            </dl>
            <a
              aria-label="Open the battle-brothers-legends-browser repository on GitHub"
              className="hero-repository-link"
              href={repositoryUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <GitHubIcon className="hero-repository-link-icon" />
            </a>
          </div>
        </div>
      </header>

      <BuildPlanner
        hasActiveBackgroundFitSearch={hasActiveBackgroundFitSearch}
        hoveredBuildPerk={hoveredBuildPerk}
        hoveredBuildPerkTooltip={hoveredBuildPerkTooltip}
        hoveredBuildPerkTooltipId={hoveredBuildPerkTooltipId}
        hoveredPerkGroupKey={hoveredPerkGroupKey}
        hoveredPerkId={hoveredPerkId}
        individualPerkGroups={buildPlannerGroups.individualPerkGroups}
        isSavedBuildsLoading={isSavedBuildsLoading}
        onClearBuild={handleClearBuild}
        onCloseBuildPerkHover={closeBuildPerkHover}
        onCloseBuildPerkTooltip={closeBuildPerkTooltip}
        onCopySavedBuildLink={handleCopySavedBuildLink}
        onDeleteSavedBuild={handleDeleteSavedBuild}
        onInspectPlannerPerk={handleInspectPlannerPerk}
        onLoadSavedBuild={handleLoadSavedBuild}
        onOpenBuildPerkHover={openBuildPerkHover}
        onOpenBuildPerkTooltip={openBuildPerkTooltip}
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
        className={
          isBackgroundFitPanelExpanded
            ? hasActiveBackgroundFitSearch
              ? 'workspace is-background-fit-expanded has-active-background-fit-search'
              : 'workspace is-background-fit-expanded'
            : 'workspace is-background-fit-collapsed'
        }
      >
        <BackgroundFitPanel
          backgroundFitView={backgroundFitView}
          hoveredPerkGroupKey={hoveredPerkGroupKey}
          isExpanded={isBackgroundFitPanelExpanded}
          onClearPerkGroupHover={clearPerkGroupHover}
          onClosePerkGroupHover={closePerkGroupHover}
          onInspectPerkGroup={handleInspectPerkGroup}
          onOpenPerkGroupHover={openPerkGroupHover}
          onOriginBackgroundsChange={setShouldIncludeOriginBackgrounds}
          onSearchActivityChange={setHasActiveBackgroundFitSearch}
          onToggleExpanded={() => setIsBackgroundFitPanelExpanded((isExpanded) => !isExpanded)}
          pickedPerkCount={pickedPerks.length}
          shouldIncludeOriginBackgrounds={shouldIncludeOriginBackgrounds}
        />

        <CategorySidebar
          allPerkCount={allPerks.length}
          displayedCategoryNames={displayedCategoryNames}
          displayedPerkGroupOptionsByCategory={displayedPerkGroupOptionsByCategory}
          expandedCategoryNames={expandedCategoryNames}
          categoryCounts={categoryCounts}
          hoveredPerkGroupKey={hoveredPerkGroupKey}
          onCategoryToggle={handleCategoryToggle}
          onResetCategoryPerkGroups={handleResetCategoryPerkGroups}
          onResetCategories={handleResetCategories}
          onPerkGroupToggle={handlePerkGroupToggle}
          pickedPerkCountsByCategory={pickedPerkCountsByCategory}
          pickedPerkCountsByPerkGroup={pickedPerkCountsByPerkGroup}
          query={query}
          selectedCategoryNames={selectedCategoryNames}
          selectedPerkGroupIdsByCategory={selectedPerkGroupIdsByCategory}
        />

        <PerkResults
          hoveredPerkGroupKey={hoveredPerkGroupKey}
          hoveredPerkId={hoveredPerkId}
          onClosePerkGroupHover={closePerkGroupHover}
          onCloseResultsPerkHover={closeResultsPerkHover}
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
          visiblePerks={visiblePerks}
        />

        <PerkDetail
          groupedBackgroundSources={groupedBackgroundSources}
          onTogglePerkPicked={handleTogglePerkPicked}
          selectedPerk={selectedPerk}
          selectedPerkBuildSlot={selectedPerkBuildSlot}
        />
      </main>
    </div>
  )
}
