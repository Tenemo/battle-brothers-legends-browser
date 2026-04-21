import { startTransition, useDeferredValue, useEffect, useState } from 'react'
import '@fontsource/cinzel/700.css'
import '@fontsource/source-sans-3/400.css'
import '@fontsource/source-sans-3/600.css'
import './App.css'
import legendsPerksDatasetJson from './data/legends-perks.json'
import { getGameIconUrl } from './lib/game-icon-url'
import { getPerkGroupRequirementLabel } from './lib/build-planner'
import {
  allTiersFilterValue,
  buildTierOptions,
  filterAndSortPerks,
  getPerkPreview,
  getTierLabel,
} from './lib/perk-search'
import type {
  LegendsFavoredEnemyTarget,
  LegendsPerkBackgroundSource,
  LegendsPerkPlacement,
  LegendsPerkRecord,
  LegendsPerkScenarioSource,
  LegendsPerksDataset,
} from './types/legends-perks'

const legendsPerksDataset = legendsPerksDatasetJson as LegendsPerksDataset
const allPerks = legendsPerksDataset.perks
const allPerksById = new Map(allPerks.map((perk) => [perk.id, perk]))
const categoryOrder = ['Weapon', 'Defense', 'Traits', 'Enemy', 'Class', 'Profession', 'Magic', 'Other']

type CategoryTreeOption = {
  perkCount: number
  treeId: string
  treeName: string
}

type GroupedBackgroundSource = {
  backgroundNames: string[]
  categoryName: string
  chance: number | null
  minimumTrees: number | null
  treeId: string
  treeName: string
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

function groupBackgroundSources(
  backgroundSources: LegendsPerkBackgroundSource[],
): GroupedBackgroundSource[] {
  const groupedBackgroundSources = new Map<string, GroupedBackgroundSource>()

  for (const backgroundSource of backgroundSources) {
    const key = [
      backgroundSource.categoryName,
      backgroundSource.treeId,
      backgroundSource.treeName,
      backgroundSource.minimumTrees ?? 'none',
      backgroundSource.chance ?? 'none',
    ].join('::')

    if (!groupedBackgroundSources.has(key)) {
      groupedBackgroundSources.set(key, {
        backgroundNames: [],
        categoryName: backgroundSource.categoryName,
        chance: backgroundSource.chance,
        minimumTrees: backgroundSource.minimumTrees,
        treeId: backgroundSource.treeId,
        treeName: backgroundSource.treeName,
      })
    }

    groupedBackgroundSources.get(key)?.backgroundNames.push(backgroundSource.backgroundName)
  }

  return [...groupedBackgroundSources.values()]
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

function compareGroupNames(leftGroupName: string, rightGroupName: string): number {
  const leftPriority = categoryOrder.indexOf(leftGroupName)
  const rightPriority = categoryOrder.indexOf(rightGroupName)
  const normalizedLeftPriority = leftPriority === -1 ? Number.POSITIVE_INFINITY : leftPriority
  const normalizedRightPriority = rightPriority === -1 ? Number.POSITIVE_INFINITY : rightPriority

  return normalizedLeftPriority - normalizedRightPriority || leftGroupName.localeCompare(rightGroupName)
}

function getPerkContextLabel(perk: LegendsPerkRecord): string {
  const primaryPlacement = perk.placements[0]

  if (!primaryPlacement) {
    return `${perk.primaryGroupName} / No tree placement`
  }

  const additionalPlacementsCount = Math.max(0, perk.placements.length - 1)
  const tierLabel = getTierLabel(primaryPlacement.tier)
  const placementLabel =
    additionalPlacementsCount > 0
      ? `${tierLabel} + ${additionalPlacementsCount} more`
      : tierLabel

  return `${perk.primaryGroupName} / ${primaryPlacement.treeName} / ${placementLabel}`
}

function getPerkDisplayIconPath(perk: LegendsPerkRecord): string | null {
  return perk.iconPath ?? perk.placements[0]?.treeIconPath ?? null
}

function formatChanceLabel(chance: number | null): string {
  if (chance === null) {
    return 'No chance override'
  }

  return `${Math.round(chance * 100)}% chance`
}

function formatMinimumTreesLabel(minimumTrees: number | null): string {
  if (minimumTrees === null) {
    return 'No minimum override'
  }

  return `Minimum ${minimumTrees}`
}

function formatScenarioGrantLabel(scenarioSource: LegendsPerkScenarioSource): string {
  if (scenarioSource.grantType === 'direct') {
    return 'Direct grant'
  }

  return `Random pool: ${scenarioSource.candidatePerkNames.join(', ')}`
}

function renderPlacementDescription(placement: LegendsPerkPlacement) {
  return (
    <>
      {placement.treeDescriptions.length > 0 ? (
        <p className="detail-support">{placement.treeDescriptions.join(' / ')}</p>
      ) : null}
      {placement.treeAttributes.length > 0 ? (
        <p className="detail-support">{placement.treeAttributes.join(' / ')}</p>
      ) : null}
    </>
  )
}

function renderBackgroundSource(backgroundSource: GroupedBackgroundSource) {
  return (
    <>
      <div>
        <strong>{backgroundSource.backgroundNames.join(', ')}</strong>
        <p className="detail-support">
          {backgroundSource.categoryName} / {backgroundSource.treeName}
        </p>
      </div>
      <span className="detail-badge">
        {formatMinimumTreesLabel(backgroundSource.minimumTrees)} /{' '}
        {formatChanceLabel(backgroundSource.chance)}
      </span>
    </>
  )
}

function renderFavoredEnemyTarget(favoredEnemyTarget: LegendsFavoredEnemyTarget) {
  return (
    <>
      <div>
        <strong>{favoredEnemyTarget.entityName}</strong>
      </div>
      <span className="detail-badge">
        {favoredEnemyTarget.killsPerPercentBonus === null
          ? 'Varies'
          : `${favoredEnemyTarget.killsPerPercentBonus} kills / 1%`}
      </span>
    </>
  )
}

function renderGameIcon({
  className,
  iconPath,
  label,
}: {
  className: string
  iconPath: string | null
  label: string
}) {
  const iconUrl = getGameIconUrl(iconPath)

  if (!iconUrl) {
    return <div aria-hidden="true" className={`${className} is-placeholder`} />
  }

  return <img alt={label} className={className} decoding="async" loading="lazy" src={iconUrl} />
}

function TreeChevron({ isExpanded }: { isExpanded: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={isExpanded ? 'tree-chevron is-expanded' : 'tree-chevron'}
      viewBox="0 0 12 12"
    >
      <path d="M4 2.5 7.5 6 4 9.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
    </svg>
  )
}

function BuildStar({ isPicked }: { isPicked: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={isPicked ? 'build-star is-picked' : 'build-star'}
      viewBox="0 0 24 24"
    >
      <path
        d="m12 3.45 2.67 5.41 5.97.87-4.32 4.21 1.02 5.95L12 17.07 6.66 19.89l1.02-5.95-4.32-4.21 5.97-.87L12 3.45Z"
        fill={isPicked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  )
}

function BuildToggleButton({
  isCompact = false,
  isPicked,
  onClick,
  perkName,
  source,
}: {
  isCompact?: boolean
  isPicked: boolean
  onClick: () => void
  perkName: string
  source: 'detail' | 'results'
}) {
  const locationSuffix = source === 'results' ? ' from results' : ''
  const actionLabel = isPicked
    ? `Remove ${perkName} from build${locationSuffix}`
    : `Add ${perkName} to build${locationSuffix}`
  const titleLabel = isPicked ? `Remove ${perkName} from build` : `Add ${perkName} to build`

  return (
    <button
      aria-label={actionLabel}
      className={
        isCompact
          ? isPicked
            ? 'build-toggle-button is-compact is-picked'
            : 'build-toggle-button is-compact'
          : isPicked
            ? 'build-toggle-button is-picked'
            : 'build-toggle-button'
      }
      onClick={onClick}
      title={titleLabel}
      type="button"
    >
      <BuildStar isPicked={isPicked} />
    </button>
  )
}

const groupCounts = getGroupCounts(allPerks)
const categoryTreeOptionsByGroup = getCategoryTreeOptions(allPerks)
const availableGroups = [...groupCounts.keys()].toSorted(compareGroupNames)
const tierOptions = buildTierOptions(allPerks)

export default function App() {
  const [query, setQuery] = useState('')
  const [pickedPerkIds, setPickedPerkIds] = useState<string[]>([])
  const [selectedGroupNames, setSelectedGroupNames] = useState<string[]>([])
  const [expandedGroupNames, setExpandedGroupNames] = useState<string[]>([])
  const [selectedTreeIdsByGroup, setSelectedTreeIdsByGroup] = useState<Record<string, string[]>>({})
  const [tierValue, setTierValue] = useState(allTiersFilterValue)
  const deferredQuery = useDeferredValue(query)
  const visiblePerks = filterAndSortPerks(allPerks, {
    query: deferredQuery,
    selectedGroupNames,
    selectedTreeIdsByGroup,
    tierValue,
  })
  const [selectedPerkId, setSelectedPerkId] = useState<string | null>(() => visiblePerks[0]?.id ?? null)
  const selectedPerk =
    visiblePerks.find((perk) => perk.id === selectedPerkId) ?? visiblePerks[0] ?? null
  const pickedPerks = pickedPerkIds.flatMap((pickedPerkId) => {
    const pickedPerk = allPerksById.get(pickedPerkId)

    return pickedPerk ? [pickedPerk] : []
  })
  const pickedPerkOrderById = new Map(
    pickedPerkIds.map((pickedPerkId, pickedPerkIndex) => [pickedPerkId, pickedPerkIndex + 1]),
  )
  const selectedPerkBuildSlot = selectedPerk ? pickedPerkOrderById.get(selectedPerk.id) ?? null : null
  const groupedBackgroundSources = selectedPerk
    ? groupBackgroundSources(selectedPerk.backgroundSources)
    : []
  const hasPickedPerks = pickedPerks.length > 0
  const buildPlannerTrackStyle = {
    gridTemplateColumns: `repeat(${Math.max(pickedPerks.length, 1)}, minmax(11rem, 1fr))`,
  }
  const selectedCategoryCount = selectedGroupNames.length
  const selectedTreeCount = Object.values(selectedTreeIdsByGroup).reduce(
    (treeCount, selectedTreeIds) => treeCount + selectedTreeIds.length,
    0,
  )
  const hasActiveFilters =
    query.trim().length > 0 ||
    tierValue !== allTiersFilterValue ||
    selectedCategoryCount > 0 ||
    selectedTreeCount > 0

  function handleResetGroups() {
    startTransition(() => {
      setExpandedGroupNames([])
      setSelectedGroupNames([])
      setSelectedTreeIdsByGroup({})
    })
  }

  function handleClearAllFilters() {
    startTransition(() => {
      setQuery('')
      setTierValue(allTiersFilterValue)
      setExpandedGroupNames([])
      setSelectedGroupNames([])
      setSelectedTreeIdsByGroup({})
    })
  }

  function handleTogglePerkPicked(perkId: string) {
    startTransition(() =>
      setPickedPerkIds((currentPickedPerkIds) =>
        currentPickedPerkIds.includes(perkId)
          ? currentPickedPerkIds.filter((currentPickedPerkId) => currentPickedPerkId !== perkId)
          : [...currentPickedPerkIds, perkId],
      ),
    )
  }

  function handleRemovePickedPerk(perkId: string) {
    startTransition(() =>
      setPickedPerkIds((currentPickedPerkIds) =>
        currentPickedPerkIds.filter((currentPickedPerkId) => currentPickedPerkId !== perkId),
      ),
    )
  }

  function handleClearBuild() {
    startTransition(() => setPickedPerkIds([]))
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
      setSelectedGroupNames((currentSelectedGroupNames) => [...currentSelectedGroupNames, nextGroupName])
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

  return (
    <div className="app-shell">
      <div className="background-runes" aria-hidden="true" />
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Battle Brothers legends</p>
          <h1>Perks browser</h1>
          <p className="hero-summary">
            Local Legends perk data, actual game icons, and exact in-mod labels.
          </p>
        </div>
        <dl className="hero-meta">
          <div>
            <dt>Perks</dt>
            <dd>{legendsPerksDataset.perkCount}</dd>
          </div>
          <div>
            <dt>Trees</dt>
            <dd>{legendsPerksDataset.treeCount}</dd>
          </div>
          <div>
            <dt>Reference</dt>
            <dd>{legendsPerksDataset.referenceVersion.replace(/^reference-mod_/, '')}</dd>
          </div>
        </dl>
      </header>

      <section className="build-planner" aria-label="Build planner">
        <div className="build-planner-header">
          <div>
            <p className="eyebrow">Build planner</p>
            <h2>Picked perks</h2>
            <p className="build-planner-summary">
              Use the star in the detail panel or search results to map each perk to the groups that can unlock it.
            </p>
          </div>
          <div className="build-planner-actions">
            <p className="build-planner-count">
              {!hasPickedPerks
                ? 'No perks picked yet.'
                : `${pickedPerks.length} perk${pickedPerks.length === 1 ? '' : 's'} picked.`}
            </p>
            <button
              aria-label="Clear build"
              className="planner-action-button"
              disabled={pickedPerks.length === 0}
              onClick={handleClearBuild}
              type="button"
            >
              Clear build
            </button>
          </div>
        </div>

        <div className="planner-board">
          <div className="planner-row">
            <span className="planner-row-label">Perks</span>
            <div className="planner-track-scroll">
              <div
                className="planner-track planner-track-perks"
                data-testid="build-perks-bar"
                style={buildPlannerTrackStyle}
              >
                {hasPickedPerks ? (
                  pickedPerks.map((pickedPerk, pickedPerkIndex) => (
                    <div className="planner-slot planner-slot-perk" key={pickedPerk.id}>
                      {renderGameIcon({
                        className: 'perk-icon perk-icon-tiny',
                        iconPath: getPerkDisplayIconPath(pickedPerk),
                        label: `${pickedPerk.perkName} build icon`,
                      })}
                      <div className="planner-slot-copy">
                        <div className="planner-slot-topline">
                          <span className="planner-slot-order">#{pickedPerkIndex + 1}</span>
                          <button
                            aria-label={`Remove ${pickedPerk.perkName} from build`}
                            className="planner-slot-remove"
                            onClick={() => handleRemovePickedPerk(pickedPerk.id)}
                            type="button"
                          >
                            Remove
                          </button>
                        </div>
                        <strong className="planner-slot-name">{pickedPerk.perkName}</strong>
                        <p className="planner-slot-meta">{getPerkContextLabel(pickedPerk)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="planner-slot planner-slot-placeholder is-placeholder">
                    <div className="planner-slot-copy">
                      <strong className="planner-slot-name">Pick a perk to start</strong>
                      <p className="planner-slot-meta">
                        Use the star in the detail panel or the search results list.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="planner-row">
            <span className="planner-row-label">Perk groups</span>
            <div className="planner-track-scroll">
              <div
                className="planner-track planner-track-groups"
                data-testid="build-groups-bar"
                style={buildPlannerTrackStyle}
              >
                {hasPickedPerks ? (
                  pickedPerks.map((pickedPerk, pickedPerkIndex) => (
                    <div className="planner-slot planner-slot-group" key={pickedPerk.id}>
                      <span className="planner-slot-order">#{pickedPerkIndex + 1}</span>
                      <strong className="planner-slot-name">
                        {getPerkGroupRequirementLabel(pickedPerk)}
                      </strong>
                      <p className="planner-slot-meta">Possible perk groups for this slot.</p>
                    </div>
                  ))
                ) : (
                  <div className="planner-slot planner-slot-placeholder is-placeholder">
                    <strong className="planner-slot-name">Required perk groups will appear here</strong>
                    <p className="planner-slot-meta">
                      Each slot lists every tree that can unlock the perk above it.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="workspace">
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
          {availableGroups.map((availableGroupName) => {
            const activeTreeOptions = categoryTreeOptionsByGroup.get(availableGroupName) ?? []
            const isExpanded = expandedGroupNames.includes(availableGroupName)
            const isActive = selectedGroupNames.includes(availableGroupName)
            const selectedTreeIds = selectedTreeIdsByGroup[availableGroupName] ?? []

            return (
              <div className={isExpanded ? 'category-card is-active' : 'category-card'} key={availableGroupName}>
                <button
                  aria-expanded={isExpanded}
                  aria-label={`${isActive ? 'Disable' : 'Enable'} category ${availableGroupName}`}
                  className={isActive ? 'group-chip is-active' : 'group-chip'}
                  onClick={() => handleGroupToggle(availableGroupName)}
                  type="button"
                >
                  <span className="group-chip-start">
                    <TreeChevron isExpanded={isExpanded} />
                    <span className="group-label">{availableGroupName}</span>
                  </span>
                  <span>{groupCounts.get(availableGroupName)}</span>
                </button>

                {isExpanded ? (
                <div className="subgroup-panel">
                  <p className="subgroup-heading">Perk groups</p>
                  <button
                    aria-label="Show all perk groups"
                    className={selectedTreeIds.length === 0 ? 'subgroup-chip is-active' : 'subgroup-chip'}
                    onClick={() => handleResetGroupTrees(availableGroupName)}
                    type="button"
                  >
                    <span>All perk groups</span>
                    <span>{groupCounts.get(availableGroupName)}</span>
                  </button>
                  {activeTreeOptions.map((treeOption) => (
                    <button
                      aria-label={`Toggle perk group ${treeOption.treeName}`}
                      className={
                        selectedTreeIds.includes(treeOption.treeId)
                          ? 'subgroup-chip is-active'
                          : 'subgroup-chip'
                      }
                      key={treeOption.treeId}
                      onClick={() => handleTreeToggle(availableGroupName, treeOption.treeId)}
                      type="button"
                    >
                      <span>{treeOption.treeName}</span>
                      <span>{treeOption.perkCount}</span>
                    </button>
                  ))}
                </div>
                ) : null}
              </div>
            )
          })}
        </aside>

        <section className="results-panel" aria-label="Perk results">
          <div className="toolbar">
            <label className="search-field">
              <span className="visually-hidden">Search perks</span>
              <input
                aria-label="Search perks"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search perks, trees, backgrounds, scenarios, or enemy targets"
                type="search"
                value={query}
              />
            </label>

            <label className="tier-filter">
              <span>Tier</span>
              <select
                aria-label="Filter by tier"
                onChange={(event) => setTierValue(event.target.value)}
                value={tierValue}
              >
                <option value={allTiersFilterValue}>All tiers</option>
                {tierOptions.map((availableTierValue) => (
                  <option key={availableTierValue} value={availableTierValue}>
                    {availableTierValue === 'no-tier'
                      ? 'No tier'
                      : getTierLabel(Number(availableTierValue))}
                  </option>
                ))}
              </select>
            </label>

            <button
              aria-label="Clear all filters"
              className="clear-filters-button"
              disabled={!hasActiveFilters}
              onClick={handleClearAllFilters}
              type="button"
            >
              Clear all
            </button>
          </div>

          <div className="results-summary">
            <p>
              Showing <strong>{visiblePerks.length}</strong> perk
              {visiblePerks.length === 1 ? '' : 's'}
            </p>
            <p className="results-note">
              {selectedTreeCount > 0
                ? `Filtered to ${selectedCategoryCount} categor${selectedCategoryCount === 1 ? 'y' : 'ies'} and ${selectedTreeCount} perk group${selectedTreeCount === 1 ? '' : 's'}.`
                : selectedCategoryCount > 0
                  ? `Filtered to ${selectedCategoryCount} categor${selectedCategoryCount === 1 ? 'y' : 'ies'}.`
                : 'Ranked by exact perk names first, then tree and category matches, then background, scenario, and full text.'}
            </p>
          </div>

          <div className="results-list" data-testid="results-list">
            {visiblePerks.length === 0 ? (
              <div className="empty-state">
                <h2>No perks found</h2>
                <p>Try a broader search, switch the category filters, or reset the tier filter.</p>
              </div>
            ) : (
              visiblePerks.map((perk) => {
                const isSelected = perk.id === selectedPerk?.id
                const pickedPerkOrder = pickedPerkOrderById.get(perk.id) ?? null
                const isPicked = pickedPerkOrder !== null

                return (
                  <div
                    key={perk.id}
                    className={isPicked
                      ? isSelected
                        ? 'perk-row is-selected is-picked'
                        : 'perk-row is-picked'
                      : isSelected
                        ? 'perk-row is-selected'
                        : 'perk-row'}
                  >
                    <button
                      aria-label={`Inspect ${perk.perkName}`}
                      className="perk-row-select"
                      onClick={() => setSelectedPerkId(perk.id)}
                      type="button"
                    >
                      <div className="perk-row-layout">
                        {renderGameIcon({
                          className: 'perk-icon perk-icon-small',
                          iconPath: getPerkDisplayIconPath(perk),
                          label: `${perk.perkName} icon`,
                        })}
                        <div className="perk-row-copy">
                          <div className="perk-row-topline">
                            <span className="perk-name">{perk.perkName}</span>
                            <div className="perk-row-badges">
                              <span className="tier-badge">
                                {getTierLabel(perk.placements[0]?.tier ?? null)}
                              </span>
                              {pickedPerkOrder !== null ? (
                                <span className="build-slot-badge">Build {pickedPerkOrder}</span>
                              ) : null}
                            </div>
                          </div>
                          <p className="perk-context">
                            {getPerkContextLabel(perk)}
                          </p>
                          <p className="perk-preview">{getPerkPreview(perk)}</p>
                        </div>
                      </div>
                    </button>
                    <BuildToggleButton
                      isCompact
                      isPicked={isPicked}
                      onClick={() => handleTogglePerkPicked(perk.id)}
                      perkName={perk.perkName}
                      source="results"
                    />
                  </div>
                )
              })
            )}
          </div>
        </section>

        <section className="detail-panel" aria-live="polite">
          {selectedPerk === null ? (
            <div className="empty-state">
              <h2>Select a perk</h2>
              <p>Pick any entry from the list to inspect its placement, sources, and overlays.</p>
            </div>
          ) : (
            <>
              <div className="detail-header">
                <div className="detail-header-main">
                  {renderGameIcon({
                    className: 'perk-icon perk-icon-large',
                    iconPath: getPerkDisplayIconPath(selectedPerk),
                    label: `${selectedPerk.perkName} icon`,
                  })}
                  <div>
                    <p className="eyebrow">{selectedPerk.primaryGroupName}</p>
                    <h2>{selectedPerk.perkName}</h2>
                    <p className="detail-meta">{selectedPerk.groupNames.join(', ')}</p>
                  </div>
                </div>
                <div className="detail-header-actions">
                  <p className="detail-header-build-status">
                    {selectedPerkBuildSlot === null
                      ? 'Not in build'
                      : `Build slot ${selectedPerkBuildSlot}`}
                  </p>
                  <BuildToggleButton
                    isPicked={selectedPerkBuildSlot !== null}
                    onClick={() => handleTogglePerkPicked(selectedPerk.id)}
                    perkName={selectedPerk.perkName}
                    source="detail"
                  />
                </div>
              </div>

              <div className="detail-section">
                <h3>Details</h3>
                {selectedPerk.descriptionParagraphs.length > 0 ? (
                  selectedPerk.descriptionParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
                ) : (
                  <p>No perk description is available in the local strings file.</p>
                )}
              </div>

              <div className="detail-section">
                <h3>Tree placement</h3>
                {selectedPerk.placements.length > 0 ? (
                  <ul className="detail-list">
                    {selectedPerk.placements.map((placement) => (
                      <li key={`${placement.categoryName}-${placement.treeId}-${placement.tier ?? 'none'}`}>
                        <div className="detail-item-main">
                          {renderGameIcon({
                            className: 'perk-icon perk-icon-tiny',
                            iconPath: placement.treeIconPath ?? getPerkDisplayIconPath(selectedPerk),
                            label: `${placement.treeName} tree icon`,
                          })}
                          <div>
                            <strong>
                              {placement.categoryName} / {placement.treeName}
                            </strong>
                            {renderPlacementDescription(placement)}
                          </div>
                        </div>
                        <span className="detail-badge">{getTierLabel(placement.tier)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>This perk is defined locally but not assigned to a parsed perk tree.</p>
                )}
              </div>

              {selectedPerk.favoredEnemyTargets && selectedPerk.favoredEnemyTargets.length > 0 ? (
                <div className="detail-section">
                  <h3>Favored enemy targets</h3>
                  <ul className="detail-list">
                    {selectedPerk.favoredEnemyTargets.map((favoredEnemyTarget) => (
                      <li key={favoredEnemyTarget.entityConstName}>
                        {renderFavoredEnemyTarget(favoredEnemyTarget)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="detail-section">
                <h3>Background sources</h3>
                {groupedBackgroundSources.length > 0 ? (
                  <ul className="detail-list">
                    {groupedBackgroundSources.map((backgroundSource) => (
                      <li
                        key={`${backgroundSource.categoryName}-${backgroundSource.treeId}-${backgroundSource.minimumTrees ?? 'none'}-${backgroundSource.chance ?? 'none'}`}
                      >
                        {renderBackgroundSource(backgroundSource)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No matching dynamic background pools were found for this perk.</p>
                )}
              </div>

              <div className="detail-section">
                <h3>Scenario overlays</h3>
                {selectedPerk.scenarioSources.length > 0 ? (
                  <ul className="detail-list">
                    {selectedPerk.scenarioSources.map((scenarioSource) => (
                      <li
                        key={`${scenarioSource.scenarioId}-${scenarioSource.grantType}-${scenarioSource.sourceMethodName}`}
                      >
                        <div>
                          <strong>{scenarioSource.scenarioName}</strong>
                          <p className="detail-support">{formatScenarioGrantLabel(scenarioSource)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No scenario grants or build-time overlays were found for this perk.</p>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}
