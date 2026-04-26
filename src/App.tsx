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
  compareDisplayedGroups,
  compareDisplayedTreeOptions,
  getCategoryTreeOptions,
  getGroupCounts,
  getPickedPerkCountsByGroup,
  getPickedPerkCountsByTree,
  getVisiblePerkCountsByCategoryTree,
  getVisiblePerkCountsByGroup,
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

const groupCounts = getGroupCounts(allPerks)
const categoryTreeOptionsByGroup = getCategoryTreeOptions(allPerks)
const availableGroups = [...groupCounts.keys()].toSorted(compareCategoryNames)

export default function App() {
  const [initialUrlState] = useState(() =>
    readPerkBrowserUrlStateFromLocation({
      availableGroupNames: availableGroups,
      perks: allPerks,
      treeOptionsByGroup: categoryTreeOptionsByGroup,
    }),
  )
  const [query, setQuery] = useState(initialUrlState.query)
  const [pickedPerkIds, setPickedPerkIds] = useState<string[]>(initialUrlState.pickedPerkIds)
  const [selectedGroupNames, setSelectedGroupNames] = useState<string[]>(
    initialUrlState.selectedGroupNames,
  )
  const [expandedGroupNames, setExpandedGroupNames] = useState<string[]>(
    initialUrlState.selectedGroupNames,
  )
  const [selectedTreeIdsByGroup, setSelectedTreeIdsByGroup] = useState<Record<string, string[]>>(
    initialUrlState.selectedTreeIdsByGroup,
  )
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
    selectedGroupNames,
    selectedTreeIdsByGroup,
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
  const visiblePerkCountsByGroup = useMemo(
    () => getVisiblePerkCountsByGroup(visiblePerks),
    [visiblePerks],
  )
  const visiblePerkCountsByCategoryTree = useMemo(
    () => getVisiblePerkCountsByCategoryTree(visiblePerks),
    [visiblePerks],
  )
  const displayedGroupNames = useMemo(
    () =>
      [...availableGroups].toSorted((leftGroupName, rightGroupName) =>
        compareDisplayedGroups({
          leftGroupName,
          normalizedSearchPhrase: normalizedPerkSearchPhrase,
          rightGroupName,
          treeOptionsByGroup: categoryTreeOptionsByGroup,
          visiblePerkCountsByGroup,
        }),
      ),
    [normalizedPerkSearchPhrase, visiblePerkCountsByGroup],
  )
  const displayedTreeOptionsByGroup = useMemo(
    () =>
      new Map(
        displayedGroupNames.map((groupName) => {
          const treeOptions = categoryTreeOptionsByGroup.get(groupName) ?? []

          return [
            groupName,
            [...treeOptions].toSorted((leftTreeOption, rightTreeOption) =>
              compareDisplayedTreeOptions({
                categoryName: groupName,
                leftTreeOption,
                normalizedSearchPhrase: normalizedPerkSearchPhrase,
                rightTreeOption,
                visiblePerkCountsByCategoryTree,
              }),
            ),
          ] as const
        }),
      ),
    [displayedGroupNames, normalizedPerkSearchPhrase, visiblePerkCountsByCategoryTree],
  )
  const pickedPerkCountsByGroup = getPickedPerkCountsByGroup(pickedPerks)
  const pickedPerkCountsByTree = getPickedPerkCountsByTree(pickedPerks)
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
  const selectedCategoryCount = selectedGroupNames.length
  const selectedTreeCount = Object.values(selectedTreeIdsByGroup).reduce(
    (treeCount, selectedTreeIds) => treeCount + selectedTreeIds.length,
    0,
  )

  function handleResetGroups() {
    startTransition(() => {
      setExpandedGroupNames([])
      setSelectedGroupNames([])
      setSelectedTreeIdsByGroup({})
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

  function handleCloseBuildPerkTooltip() {
    setHoveredPerkId(null)
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

  function handleOpenPerkGroupHover(categoryName: string, treeId: string) {
    setHoveredPerkGroupKey(getPerkGroupHoverKey({ categoryName, treeId }))
    setHoveredPerkId(null)
    setHoveredBuildPerkTooltip(null)
  }

  function handleClosePerkGroupHover(perkGroupKey: string) {
    setHoveredPerkGroupKey((currentHoveredPerkGroupKey) =>
      currentHoveredPerkGroupKey === perkGroupKey ? null : currentHoveredPerkGroupKey,
    )
  }

  function handleInspectPerkGroup(categoryName: string, treeId: string) {
    startTransition(() => {
      setQuery('')
      setSelectedGroupNames((currentSelectedGroupNames) =>
        currentSelectedGroupNames.includes(categoryName)
          ? currentSelectedGroupNames
          : [...currentSelectedGroupNames, categoryName],
      )
      setExpandedGroupNames((currentExpandedGroupNames) =>
        currentExpandedGroupNames.includes(categoryName)
          ? currentExpandedGroupNames
          : [...currentExpandedGroupNames, categoryName],
      )
      setSelectedTreeIdsByGroup((currentSelectedTreeIdsByGroup) => {
        const currentSelectedTreeIds = currentSelectedTreeIdsByGroup[categoryName] ?? []

        if (currentSelectedTreeIds.includes(treeId)) {
          return currentSelectedTreeIdsByGroup
        }

        return {
          ...currentSelectedTreeIdsByGroup,
          [categoryName]: [...currentSelectedTreeIds, treeId],
        }
      })
    })
  }

  function handleGroupToggle(nextGroupName: string) {
    startTransition(() => {
      const isSelected = selectedGroupNames.includes(nextGroupName)

      if (isSelected) {
        setExpandedGroupNames((currentExpandedGroupNames) =>
          currentExpandedGroupNames.filter((groupName) => groupName !== nextGroupName),
        )
        setSelectedGroupNames((currentSelectedGroupNames) =>
          currentSelectedGroupNames.filter((groupName) => groupName !== nextGroupName),
        )
        setSelectedTreeIdsByGroup((currentSelectedTreeIdsByGroup) => {
          const remainingSelectedTreeIdsByGroup = { ...currentSelectedTreeIdsByGroup }
          delete remainingSelectedTreeIdsByGroup[nextGroupName]

          return remainingSelectedTreeIdsByGroup
        })
        return
      }

      setExpandedGroupNames((currentExpandedGroupNames) =>
        currentExpandedGroupNames.includes(nextGroupName)
          ? currentExpandedGroupNames
          : [...currentExpandedGroupNames, nextGroupName],
      )
      setSelectedGroupNames((currentSelectedGroupNames) => [
        ...currentSelectedGroupNames,
        nextGroupName,
      ])
    })
  }

  function handleResetGroupTrees(groupName: string) {
    startTransition(() =>
      setSelectedTreeIdsByGroup((currentSelectedTreeIdsByGroup) => ({
        ...currentSelectedTreeIdsByGroup,
        [groupName]: [],
      })),
    )
  }

  function handleTreeToggle(groupName: string, nextTreeId: string) {
    startTransition(() =>
      setSelectedTreeIdsByGroup((currentSelectedTreeIdsByGroup) => {
        const currentSelectedTreeIds = currentSelectedTreeIdsByGroup[groupName] ?? []
        const nextSelectedTreeIds = currentSelectedTreeIds.includes(nextTreeId)
          ? currentSelectedTreeIds.filter((treeId) => treeId !== nextTreeId)
          : [...currentSelectedTreeIds, nextTreeId]

        return {
          ...currentSelectedTreeIdsByGroup,
          [groupName]: nextSelectedTreeIds,
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
        selectedGroupNames,
        selectedTreeIdsByGroup,
      },
      {
        availableGroupNames: availableGroups,
        perksById: allPerksById,
        treeOptionsByGroup: categoryTreeOptionsByGroup,
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
  }, [pickedPerkIds, query, selectedGroupNames, selectedTreeIdsByGroup])

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
                <dd>{legendsPerksDataset.treeCount}</dd>
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
        onCloseBuildPerkTooltip={handleCloseBuildPerkTooltip}
        onInspectPlannerPerk={handleInspectPlannerPerk}
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
          onClearBuildPerkTooltip={() => setHoveredBuildPerkTooltip(null)}
          onClearHoveredPerk={() => setHoveredPerkId(null)}
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
          displayedGroupNames={displayedGroupNames}
          displayedTreeOptionsByGroup={displayedTreeOptionsByGroup}
          expandedGroupNames={expandedGroupNames}
          groupCounts={groupCounts}
          hoveredPerkGroupKey={hoveredPerkGroupKey}
          onGroupToggle={handleGroupToggle}
          onResetGroupTrees={handleResetGroupTrees}
          onResetGroups={handleResetGroups}
          onTreeToggle={handleTreeToggle}
          pickedPerkCountsByGroup={pickedPerkCountsByGroup}
          pickedPerkCountsByTree={pickedPerkCountsByTree}
          query={query}
          selectedGroupNames={selectedGroupNames}
          selectedTreeIdsByGroup={selectedTreeIdsByGroup}
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
          selectedTreeCount={selectedTreeCount}
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
