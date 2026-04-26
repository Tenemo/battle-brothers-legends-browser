import { startTransition, useEffect, useMemo, useState } from 'react'
import '@fontsource/cinzel/700.css'
import '@fontsource/source-sans-3/400.css'
import '@fontsource/source-sans-3/600.css'
import '@fontsource/source-sans-3/700.css'
import './App.css'
import { BackgroundFitPanel } from './components/BackgroundFitPanel'
import { BuildPlanner, type HoveredBuildPerkTooltip } from './components/BuildPlanner'
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
import {
  buildPerkBrowserBuildUrlSearch,
  buildPerkBrowserUrlSearch,
  readPerkBrowserUrlStateFromLocation,
} from './lib/perk-browser-url-state'
import {
  getPerkGroupHoverKey,
  groupBackgroundSources,
  normalizeSearchPhrase,
} from './lib/perk-display'
import { filterAndSortPerks } from './lib/perk-search'
import type { LegendsPerksDataset } from './types/legends-perks'

const legendsPerksDataset = legendsPerksDatasetJson as LegendsPerksDataset
const allPerks = legendsPerksDataset.perks
const allPerksById = new Map(allPerks.map((perk) => [perk.id, perk]))
const backgroundFitEngine = createBackgroundFitEngine(legendsPerksDataset)
const repositoryUrl = 'https://github.com/Tenemo/battle-brothers-legends-browser'

const categoryCounts = getCategoryCounts(allPerks)
const perkGroupOptionsByCategory = getCategoryPerkGroupOptions(allPerks)
const availableCategories = [...categoryCounts.keys()].toSorted(compareCategoryNames)

export default function App() {
  const [initialUrlState] = useState(() =>
    readPerkBrowserUrlStateFromLocation({
      availableCategoryNames: availableCategories,
      perks: allPerks,
      perkGroupOptionsByCategory: perkGroupOptionsByCategory,
    }),
  )
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
  const [hoveredPerkId, setHoveredPerkId] = useState<string | null>(null)
  const [hoveredPerkGroupKey, setHoveredPerkGroupKey] = useState<string | null>(null)
  const [hoveredBuildPerkTooltip, setHoveredBuildPerkTooltip] =
    useState<HoveredBuildPerkTooltip | null>(null)
  const [shareBuildStatus, setShareBuildStatus] = useState<'copied' | 'error' | 'idle'>('idle')
  const [isBackgroundFitPanelExpanded, setIsBackgroundFitPanelExpanded] = useState(true)
  const [hasActiveBackgroundFitSearch, setHasActiveBackgroundFitSearch] = useState(false)
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
  const hoveredBuildPerk =
    hoveredBuildPerkTooltip === null
      ? null
      : (allPerksById.get(hoveredBuildPerkTooltip.perkId) ?? null)
  const hoveredBuildPerkTooltipId =
    hoveredBuildPerk === null ? undefined : `build-perk-tooltip-${hoveredBuildPerk.id}`
  const hasPickedPerks = pickedPerks.length > 0
  const selectedCategoryCount = selectedCategoryNames.length
  const selectedPerkGroupCount = Object.values(selectedPerkGroupIdsByCategory).reduce(
    (perkGroupCount, selectedPerkGroupIds) => perkGroupCount + selectedPerkGroupIds.length,
    0,
  )

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
      setHoveredBuildPerkTooltip((currentTooltip) =>
        currentTooltip?.perkId === perkId ? null : currentTooltip,
      )
    })
  }

  function handleRemovePickedPerk(perkId: string) {
    startTransition(() => {
      setPickedPerkIds((currentPickedPerkIds) =>
        currentPickedPerkIds.filter((currentPickedPerkId) => currentPickedPerkId !== perkId),
      )
      setHoveredPerkId((currentHoveredPerkId) =>
        currentHoveredPerkId === perkId ? null : currentHoveredPerkId,
      )
      setHoveredBuildPerkTooltip((currentTooltip) =>
        currentTooltip?.perkId === perkId ? null : currentTooltip,
      )
      setHoveredPerkGroupKey(null)
    })
  }

  function handleClearBuild() {
    startTransition(() => {
      setPickedPerkIds([])
      setHoveredPerkId(null)
      setHoveredPerkGroupKey(null)
      setHoveredBuildPerkTooltip(null)
      setShareBuildStatus('idle')
    })
  }

  function getBuildShareUrl(): string {
    const buildSharePath = buildShareSearch ? `/${buildShareSearch}` : '/'

    if (typeof window === 'undefined') {
      return buildSharePath
    }

    return new URL(buildSharePath, window.location.origin).toString()
  }

  async function copyTextToClipboard(text: string): Promise<void> {
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text)
        return
      } catch {
        // Fall back to the selection-based copy path below.
      }
    }

    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.setAttribute('readonly', '')
    textArea.style.position = 'fixed'
    textArea.style.top = '0'
    textArea.style.left = '-9999px'
    document.body.append(textArea)
    textArea.select()

    const didCopy = document.execCommand('copy')
    textArea.remove()

    if (!didCopy) {
      throw new Error('Clipboard copy failed.')
    }
  }

  async function handleShareBuild() {
    if (!hasPickedPerks) {
      return
    }

    try {
      await copyTextToClipboard(getBuildShareUrl())
      setShareBuildStatus('copied')
    } catch {
      setShareBuildStatus('error')
    }
  }

  function handleInspectPlannerPerk(perkId: string) {
    setSelectedPerkId(perkId)
  }

  function handleOpenBuildPerkTooltip(perkId: string, currentTarget: HTMLButtonElement) {
    const { bottom, left, right, top, width } = currentTarget.getBoundingClientRect()

    setHoveredPerkId(perkId)
    setHoveredPerkGroupKey(null)
    setHoveredBuildPerkTooltip({
      anchorRectangle: {
        bottom,
        left,
        right,
        top,
        width,
      },
      perkId,
    })
  }

  function handleOpenBuildPerkHover(perkId: string) {
    setHoveredPerkId(perkId)
    setHoveredPerkGroupKey(null)
  }

  function handleCloseBuildPerkHover(perkId: string) {
    setHoveredPerkId((currentHoveredPerkId) =>
      currentHoveredPerkId === perkId ? null : currentHoveredPerkId,
    )
  }

  function handleCloseBuildPerkTooltip() {
    setHoveredBuildPerkTooltip(null)
  }

  function handleOpenResultsPerkHover(perkId: string) {
    setHoveredPerkId(perkId)
    setHoveredPerkGroupKey(null)
    setHoveredBuildPerkTooltip(null)
  }

  function handleCloseResultsPerkHover(perkId: string) {
    setHoveredPerkId((currentHoveredPerkId) =>
      currentHoveredPerkId === perkId ? null : currentHoveredPerkId,
    )
  }

  function handleOpenPerkGroupHover(categoryName: string, perkGroupId: string) {
    setHoveredPerkGroupKey(getPerkGroupHoverKey({ categoryName, perkGroupId }))
    setHoveredPerkId(null)
    setHoveredBuildPerkTooltip(null)
  }

  function handleClosePerkGroupHover(perkGroupKey: string) {
    setHoveredPerkGroupKey((currentHoveredPerkGroupKey) =>
      currentHoveredPerkGroupKey === perkGroupKey ? null : currentHoveredPerkGroupKey,
    )
  }

  function handleInspectPerkGroup(categoryName: string, perkGroupId: string) {
    startTransition(() => {
      setQuery('')
      setSelectedCategoryNames((currentSelectedCategoryNames) =>
        currentSelectedCategoryNames.includes(categoryName)
          ? currentSelectedCategoryNames
          : [...currentSelectedCategoryNames, categoryName],
      )
      setExpandedCategoryNames((currentExpandedCategoryNames) =>
        currentExpandedCategoryNames.includes(categoryName)
          ? currentExpandedCategoryNames
          : [...currentExpandedCategoryNames, categoryName],
      )
      setSelectedPerkGroupIdsByCategory((currentSelectedPerkGroupIdsByCategory) => {
        const currentSelectedPerkGroupIds =
          currentSelectedPerkGroupIdsByCategory[categoryName] ?? []

        if (currentSelectedPerkGroupIds.includes(perkGroupId)) {
          return currentSelectedPerkGroupIdsByCategory
        }

        return {
          ...currentSelectedPerkGroupIdsByCategory,
          [categoryName]: [...currentSelectedPerkGroupIds, perkGroupId],
        }
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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const nextSearch = buildPerkBrowserUrlSearch(
      {
        pickedPerkIds,
        query,
        selectedCategoryNames,
        selectedPerkGroupIdsByCategory,
      },
      {
        availableCategoryNames: availableCategories,
        perksById: allPerksById,
        perkGroupOptionsByCategory: perkGroupOptionsByCategory,
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
  }, [pickedPerkIds, query, selectedCategoryNames, selectedPerkGroupIdsByCategory])

  useEffect(() => {
    if (hoveredBuildPerkTooltip === null || typeof window === 'undefined') {
      return
    }

    const handleWindowResize = () => {
      setHoveredBuildPerkTooltip(null)
    }

    window.addEventListener('resize', handleWindowResize)

    return () => {
      window.removeEventListener('resize', handleWindowResize)
    }
  }, [hoveredBuildPerkTooltip])

  useEffect(() => {
    if (shareBuildStatus === 'idle') {
      return
    }

    const resetShareBuildStatusTimeout = window.setTimeout(() => {
      setShareBuildStatus('idle')
    }, 1600)

    return () => {
      window.clearTimeout(resetShareBuildStatusTimeout)
    }
  }, [shareBuildStatus])

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
        onClearBuild={handleClearBuild}
        onCloseBuildPerkHover={handleCloseBuildPerkHover}
        onCloseBuildPerkTooltip={handleCloseBuildPerkTooltip}
        onInspectPlannerPerk={handleInspectPlannerPerk}
        onOpenBuildPerkHover={handleOpenBuildPerkHover}
        onOpenBuildPerkTooltip={handleOpenBuildPerkTooltip}
        onRemovePickedPerk={handleRemovePickedPerk}
        onShareBuild={handleShareBuild}
        pickedPerks={pickedPerks}
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
          onClearPerkGroupHover={() => setHoveredPerkGroupKey(null)}
          onClosePerkGroupHover={handleClosePerkGroupHover}
          onInspectPerkGroup={handleInspectPerkGroup}
          onOpenPerkGroupHover={handleOpenPerkGroupHover}
          onSearchActivityChange={setHasActiveBackgroundFitSearch}
          onToggleExpanded={() => setIsBackgroundFitPanelExpanded((isExpanded) => !isExpanded)}
          pickedPerkCount={pickedPerks.length}
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
          hoveredPerkId={hoveredPerkId}
          onCloseResultsPerkHover={handleCloseResultsPerkHover}
          onOpenResultsPerkHover={handleOpenResultsPerkHover}
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
