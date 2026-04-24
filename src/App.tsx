import { startTransition, useEffect, useMemo, useState } from 'react'
import '@fontsource/cinzel/700.css'
import '@fontsource/source-sans-3/400.css'
import '@fontsource/source-sans-3/600.css'
import '@fontsource/source-sans-3/700.css'
import './App.css'
import { BackgroundFitPanel } from './components/BackgroundFitPanel'
import { BuildPlanner, type HoveredBuildPerkTooltip } from './components/BuildPlanner'
import { PerkDetail } from './components/PerkDetail'
import { PerkResults } from './components/PerkResults'
import { BuildStar, GitHubIcon, TreeChevron } from './components/SharedControls'
import legendsPerksDatasetJson from './data/legends-perks.json'
import { createBackgroundFitEngine } from './lib/background-fit'
import { getBuildPlannerGroups } from './lib/build-planner'
import { compareCategoryNames } from './lib/perk-categories'
import {
  buildPerkBrowserBuildUrlSearch,
  buildPerkBrowserUrlSearch,
  readPerkBrowserUrlStateFromLocation,
  type PerkBrowserUrlTreeOption,
} from './lib/perk-browser-url-state'
import {
  getPerkGroupHoverKey,
  getSearchMatchPriority,
  groupBackgroundSources,
  normalizeSearchPhrase,
  renderHighlightedText,
} from './lib/perk-display'
import { allTiersFilterValue, buildTierOptions, filterAndSortPerks } from './lib/perk-search'
import type { LegendsPerkRecord, LegendsPerksDataset } from './types/legends-perks'

const legendsPerksDataset = legendsPerksDatasetJson as LegendsPerksDataset
const allPerks = legendsPerksDataset.perks
const allPerksById = new Map(allPerks.map((perk) => [perk.id, perk]))
const backgroundFitEngine = createBackgroundFitEngine(legendsPerksDataset)
const repositoryUrl = 'https://github.com/Tenemo/battle-brothers-legends-browser'

type CategoryTreeOption = PerkBrowserUrlTreeOption & {
  perkCount: number
}

function getGroupCounts(perks: LegendsPerkRecord[]): Map<string, number> {
  const counts = new Map<string, number>()

  for (const perk of perks) {
    for (const groupName of perk.groupNames) {
      counts.set(groupName, (counts.get(groupName) ?? 0) + 1)
    }
  }

  return counts
}

function getPickedPerkCountsByGroup(pickedPerks: LegendsPerkRecord[]): Map<string, number> {
  const countsByGroup = new Map<string, number>()

  for (const pickedPerk of pickedPerks) {
    for (const groupName of new Set(pickedPerk.groupNames)) {
      countsByGroup.set(groupName, (countsByGroup.get(groupName) ?? 0) + 1)
    }
  }

  return countsByGroup
}

function getPickedPerkCountsByTree(pickedPerks: LegendsPerkRecord[]): Map<string, number> {
  const countsByTree = new Map<string, number>()

  for (const pickedPerk of pickedPerks) {
    for (const treeId of new Set(pickedPerk.placements.map((placement) => placement.treeId))) {
      countsByTree.set(treeId, (countsByTree.get(treeId) ?? 0) + 1)
    }
  }

  return countsByTree
}

function getCategoryTreeOptions(perks: LegendsPerkRecord[]): Map<string, CategoryTreeOption[]> {
  const optionsByCategory = new Map<
    string,
    Map<string, { perkIds: Set<string>; treeId: string; treeName: string }>
  >()

  for (const perk of perks) {
    for (const placement of perk.placements) {
      if (!optionsByCategory.has(placement.categoryName)) {
        optionsByCategory.set(placement.categoryName, new Map())
      }

      const categoryOptions = optionsByCategory.get(placement.categoryName)

      if (!categoryOptions?.has(placement.treeId)) {
        categoryOptions?.set(placement.treeId, {
          perkIds: new Set(),
          treeId: placement.treeId,
          treeName: placement.treeName,
        })
      }

      categoryOptions?.get(placement.treeId)?.perkIds.add(perk.id)
    }
  }

  return new Map(
    [...optionsByCategory.entries()].map(([categoryName, treeOptions]) => [
      categoryName,
      [...treeOptions.values()]
        .map((treeOption) => ({
          perkCount: treeOption.perkIds.size,
          treeId: treeOption.treeId,
          treeName: treeOption.treeName,
        }))
        .toSorted((leftTreeOption, rightTreeOption) =>
          leftTreeOption.treeName.localeCompare(rightTreeOption.treeName),
        ),
    ]),
  )
}

function getVisiblePerkCountsByGroup(perks: LegendsPerkRecord[]): Map<string, number> {
  const countsByGroup = new Map<string, number>()

  for (const perk of perks) {
    for (const groupName of new Set(perk.groupNames)) {
      countsByGroup.set(groupName, (countsByGroup.get(groupName) ?? 0) + 1)
    }
  }

  return countsByGroup
}

function getVisiblePerkCountsByCategoryTree(perks: LegendsPerkRecord[]): Map<string, number> {
  const countsByCategoryTree = new Map<string, number>()

  for (const perk of perks) {
    for (const placement of perk.placements) {
      const categoryTreeKey = `${placement.categoryName}::${placement.treeId}`
      countsByCategoryTree.set(
        categoryTreeKey,
        (countsByCategoryTree.get(categoryTreeKey) ?? 0) + 1,
      )
    }
  }

  return countsByCategoryTree
}

function compareDisplayedGroups({
  leftGroupName,
  normalizedSearchPhrase,
  rightGroupName,
  treeOptionsByGroup,
  visiblePerkCountsByGroup,
}: {
  leftGroupName: string
  normalizedSearchPhrase: string
  rightGroupName: string
  treeOptionsByGroup: Map<string, CategoryTreeOption[]>
  visiblePerkCountsByGroup: Map<string, number>
}): number {
  if (normalizedSearchPhrase.length === 0) {
    return compareCategoryNames(leftGroupName, rightGroupName)
  }

  const leftTreeOptions = treeOptionsByGroup.get(leftGroupName) ?? []
  const rightTreeOptions = treeOptionsByGroup.get(rightGroupName) ?? []
  const leftGroupMatchPriority = getSearchMatchPriority(leftGroupName, normalizedSearchPhrase)
  const rightGroupMatchPriority = getSearchMatchPriority(rightGroupName, normalizedSearchPhrase)
  const leftTreeMatchPriority = Math.min(
    ...leftTreeOptions.map((treeOption) =>
      getSearchMatchPriority(treeOption.treeName, normalizedSearchPhrase),
    ),
    2,
  )
  const rightTreeMatchPriority = Math.min(
    ...rightTreeOptions.map((treeOption) =>
      getSearchMatchPriority(treeOption.treeName, normalizedSearchPhrase),
    ),
    2,
  )
  const leftVisiblePerkCount = visiblePerkCountsByGroup.get(leftGroupName) ?? 0
  const rightVisiblePerkCount = visiblePerkCountsByGroup.get(rightGroupName) ?? 0
  const leftHasVisiblePerksPriority = leftVisiblePerkCount > 0 ? 0 : 1
  const rightHasVisiblePerksPriority = rightVisiblePerkCount > 0 ? 0 : 1

  return (
    leftGroupMatchPriority - rightGroupMatchPriority ||
    leftTreeMatchPriority - rightTreeMatchPriority ||
    leftHasVisiblePerksPriority - rightHasVisiblePerksPriority ||
    rightVisiblePerkCount - leftVisiblePerkCount ||
    compareCategoryNames(leftGroupName, rightGroupName)
  )
}

function compareDisplayedTreeOptions({
  categoryName,
  leftTreeOption,
  normalizedSearchPhrase,
  rightTreeOption,
  visiblePerkCountsByCategoryTree,
}: {
  categoryName: string
  leftTreeOption: CategoryTreeOption
  normalizedSearchPhrase: string
  rightTreeOption: CategoryTreeOption
  visiblePerkCountsByCategoryTree: Map<string, number>
}): number {
  if (normalizedSearchPhrase.length === 0) {
    return leftTreeOption.treeName.localeCompare(rightTreeOption.treeName)
  }

  const leftMatchPriority = getSearchMatchPriority(leftTreeOption.treeName, normalizedSearchPhrase)
  const rightMatchPriority = getSearchMatchPriority(
    rightTreeOption.treeName,
    normalizedSearchPhrase,
  )
  const leftVisiblePerkCount =
    visiblePerkCountsByCategoryTree.get(`${categoryName}::${leftTreeOption.treeId}`) ?? 0
  const rightVisiblePerkCount =
    visiblePerkCountsByCategoryTree.get(`${categoryName}::${rightTreeOption.treeId}`) ?? 0
  const leftHasVisiblePerksPriority = leftVisiblePerkCount > 0 ? 0 : 1
  const rightHasVisiblePerksPriority = rightVisiblePerkCount > 0 ? 0 : 1

  return (
    leftMatchPriority - rightMatchPriority ||
    leftHasVisiblePerksPriority - rightHasVisiblePerksPriority ||
    rightVisiblePerkCount - leftVisiblePerkCount ||
    leftTreeOption.treeName.localeCompare(rightTreeOption.treeName)
  )
}

const groupCounts = getGroupCounts(allPerks)
const categoryTreeOptionsByGroup = getCategoryTreeOptions(allPerks)
const availableGroups = [...groupCounts.keys()].toSorted(compareCategoryNames)
const tierOptions = buildTierOptions(allPerks)

export default function App() {
  const [initialUrlState] = useState(() =>
    readPerkBrowserUrlStateFromLocation({
      availableGroupNames: availableGroups,
      perks: allPerks,
      tierOptions,
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
    tierValue: allTiersFilterValue,
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
        tierValue: allTiersFilterValue,
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

        <aside className="sidebar" aria-label="Perk categories">
          <div className="panel-heading">
            <h2>Categories</h2>
            <p>Enable one or more categories, then narrow each one to the perk groups you want.</p>
          </div>
          <button
            aria-label="Reset all category filters"
            className={selectedGroupNames.length === 0 ? 'group-chip is-active' : 'group-chip'}
            onClick={handleResetGroups}
            type="button"
          >
            <span className="group-chip-start">
              <span className="group-label">All categories</span>
            </span>
            <span>{allPerks.length}</span>
          </button>
          {displayedGroupNames.map((availableGroupName) => {
            const activeTreeOptions = displayedTreeOptionsByGroup.get(availableGroupName) ?? []
            const isExpanded = expandedGroupNames.includes(availableGroupName)
            const isActive = selectedGroupNames.includes(availableGroupName)
            const pickedPerkCountInGroup = pickedPerkCountsByGroup.get(availableGroupName) ?? 0
            const selectedTreeIds = selectedTreeIdsByGroup[availableGroupName] ?? []
            const isHoveredCategory =
              hoveredPerkGroupKey?.startsWith(`${availableGroupName}::`) ?? false
            const hasVisibleHoveredTree =
              isHoveredCategory &&
              activeTreeOptions.some(
                (treeOption) =>
                  hoveredPerkGroupKey ===
                  getPerkGroupHoverKey({
                    categoryName: availableGroupName,
                    treeId: treeOption.treeId,
                  }),
              )
            const shouldHighlightCategory =
              isHoveredCategory && (!isExpanded || !hasVisibleHoveredTree)
            const categoryChipClassName = [
              'group-chip',
              isActive ? 'is-active' : '',
              shouldHighlightCategory ? 'is-highlighted' : '',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <div
                className={isExpanded ? 'category-card is-active' : 'category-card'}
                key={availableGroupName}
              >
                <button
                  aria-expanded={isExpanded}
                  aria-label={`${isActive ? 'Disable' : 'Enable'} category ${availableGroupName}`}
                  className={categoryChipClassName}
                  onClick={() => handleGroupToggle(availableGroupName)}
                  type="button"
                >
                  <span className="group-chip-start">
                    <TreeChevron isExpanded={isExpanded} />
                    <span className="group-label">
                      {renderHighlightedText(
                        availableGroupName,
                        query,
                        `${availableGroupName}-group`,
                      )}
                    </span>
                  </span>
                  <span className="group-chip-end">
                    {pickedPerkCountInGroup > 0 ? (
                      <span aria-hidden="true" className="group-chip-picked-stars">
                        {Array.from({ length: pickedPerkCountInGroup }, (_, pickedPerkIndex) => (
                          <BuildStar
                            isPicked
                            key={`${availableGroupName}-picked-${pickedPerkIndex}`}
                          />
                        ))}
                      </span>
                    ) : null}
                    <span>{groupCounts.get(availableGroupName)}</span>
                  </span>
                </button>

                {isExpanded ? (
                  <div className="subgroup-panel">
                    <p className="subgroup-heading">Perk groups</p>
                    <button
                      aria-label="Show all perk groups"
                      className={
                        selectedTreeIds.length === 0 ? 'subgroup-chip is-active' : 'subgroup-chip'
                      }
                      onClick={() => handleResetGroupTrees(availableGroupName)}
                      type="button"
                    >
                      <span className="subgroup-chip-start">All perk groups</span>
                      <span className="subgroup-chip-end">
                        {groupCounts.get(availableGroupName)}
                      </span>
                    </button>
                    {activeTreeOptions.map((treeOption) => {
                      const pickedPerkCountInTree =
                        pickedPerkCountsByTree.get(treeOption.treeId) ?? 0
                      const isTreeHighlighted =
                        hoveredPerkGroupKey ===
                        getPerkGroupHoverKey({
                          categoryName: availableGroupName,
                          treeId: treeOption.treeId,
                        })
                      const treeChipClassName = [
                        'subgroup-chip',
                        selectedTreeIds.includes(treeOption.treeId) ? 'is-active' : '',
                        isTreeHighlighted ? 'is-highlighted' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')

                      return (
                        <button
                          aria-label={`Toggle perk group ${treeOption.treeName}`}
                          className={treeChipClassName}
                          key={treeOption.treeId}
                          onClick={() => handleTreeToggle(availableGroupName, treeOption.treeId)}
                          type="button"
                        >
                          <span className="subgroup-chip-start">
                            {renderHighlightedText(
                              treeOption.treeName,
                              query,
                              `${availableGroupName}-${treeOption.treeId}-tree`,
                            )}
                          </span>
                          <span className="subgroup-chip-end">
                            {pickedPerkCountInTree > 0 ? (
                              <span aria-hidden="true" className="group-chip-picked-stars">
                                {Array.from(
                                  { length: pickedPerkCountInTree },
                                  (_, pickedPerkIndex) => (
                                    <BuildStar
                                      isPicked
                                      key={`${treeOption.treeId}-picked-${pickedPerkIndex}`}
                                    />
                                  ),
                                )}
                              </span>
                            ) : null}
                            <span>{treeOption.perkCount}</span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            )
          })}
        </aside>

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
