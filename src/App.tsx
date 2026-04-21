import { startTransition, useDeferredValue, useEffect, useState } from 'react'
import '@fontsource/cinzel/700.css'
import '@fontsource/source-sans-3/400.css'
import '@fontsource/source-sans-3/600.css'
import './App.css'
import legendsPerksDatasetJson from './data/legends-perks.json'
import { getGameIconUrl } from './lib/game-icon-url'
import {
  allGroupsFilterValue,
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
const categoryOrder = ['Weapon', 'Defense', 'Traits', 'Enemy', 'Class', 'Profession', 'Magic', 'Other']

type CategoryTreeOption = {
  perkCount: number
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

function renderBackgroundSource(backgroundSource: LegendsPerkBackgroundSource) {
  return (
    <>
      <div>
        <strong>{backgroundSource.backgroundName}</strong>
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

const groupCounts = getGroupCounts(allPerks)
const categoryTreeOptionsByGroup = getCategoryTreeOptions(allPerks)
const availableGroups = [...groupCounts.keys()].toSorted(compareGroupNames)
const tierOptions = buildTierOptions(allPerks)

export default function App() {
  const [query, setQuery] = useState('')
  const [groupName, setGroupName] = useState(allGroupsFilterValue)
  const [expandedGroupName, setExpandedGroupName] = useState<string | null>(null)
  const [selectedTreeIds, setSelectedTreeIds] = useState<string[]>([])
  const [tierValue, setTierValue] = useState(allTiersFilterValue)
  const deferredQuery = useDeferredValue(query)
  const visiblePerks = filterAndSortPerks(allPerks, {
    groupName,
    query: deferredQuery,
    selectedTreeIds,
    tierValue,
  })
  const [selectedPerkId, setSelectedPerkId] = useState<string | null>(() => visiblePerks[0]?.id ?? null)
  const selectedPerk =
    visiblePerks.find((perk) => perk.id === selectedPerkId) ?? visiblePerks[0] ?? null
  const activeTreeOptions =
    expandedGroupName === null ? [] : (categoryTreeOptionsByGroup.get(expandedGroupName) ?? [])

  function handleResetGroups() {
    startTransition(() => {
      setExpandedGroupName(null)
      setGroupName(allGroupsFilterValue)
      setSelectedTreeIds([])
    })
  }

  function handleGroupToggle(nextGroupName: string) {
    startTransition(() => {
      if (groupName === nextGroupName) {
        setExpandedGroupName(null)
        setGroupName(allGroupsFilterValue)
        setSelectedTreeIds([])
        return
      }

      setExpandedGroupName(nextGroupName)
      setGroupName(nextGroupName)
      setSelectedTreeIds([])
    })
  }

  function handleTreeToggle(nextTreeId: string) {
    startTransition(() =>
      setSelectedTreeIds((currentSelectedTreeIds) =>
        currentSelectedTreeIds.includes(nextTreeId)
          ? currentSelectedTreeIds.filter((treeId) => treeId !== nextTreeId)
          : [...currentSelectedTreeIds, nextTreeId],
      ),
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

      <main className="workspace">
        <aside className="sidebar" aria-label="Perk categories">
          <div className="panel-heading">
            <h2>Categories</h2>
            <p>Open a category, then narrow it to one or more perk groups.</p>
          </div>
          <button
            aria-label="Filter all groups"
            className={groupName === allGroupsFilterValue ? 'group-chip is-active' : 'group-chip'}
            onClick={handleResetGroups}
            type="button"
          >
            <span className="group-chip-start">
              <span className="group-label">All categories</span>
            </span>
            <span>{allPerks.length}</span>
          </button>
          {availableGroups.map((availableGroupName) => {
            const isExpanded = expandedGroupName === availableGroupName
            const isActive = groupName === availableGroupName

            return (
              <div className={isExpanded ? 'category-card is-active' : 'category-card'} key={availableGroupName}>
                <button
                  aria-expanded={isExpanded}
                  aria-label={`${isExpanded ? 'Collapse' : 'Expand'} category ${availableGroupName}`}
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
                    onClick={() => setSelectedTreeIds([])}
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
                      onClick={() => handleTreeToggle(treeOption.treeId)}
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
          </div>

          <div className="results-summary">
            <p>
              Showing <strong>{visiblePerks.length}</strong> perk
              {visiblePerks.length === 1 ? '' : 's'}
            </p>
            <p className="results-note">
              {selectedTreeIds.length > 0
                ? `Filtered to ${selectedTreeIds.length} perk group${selectedTreeIds.length === 1 ? '' : 's'}.`
                : 'Ranked by exact perk names first, then tree and category matches, then background, scenario, and full text.'}
            </p>
          </div>

          <div className="results-list" data-testid="results-list">
            {visiblePerks.length === 0 ? (
              <div className="empty-state">
                <h2>No perks found</h2>
                <p>Try a broader search, switch the category filter, or reset the tier filter.</p>
              </div>
            ) : (
              visiblePerks.map((perk) => {
                const isSelected = perk.id === selectedPerk?.id

                return (
                  <button
                    key={perk.id}
                    className={isSelected ? 'perk-row is-selected' : 'perk-row'}
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
                          <span className="tier-badge">
                            {getTierLabel(perk.placements[0]?.tier ?? null)}
                          </span>
                        </div>
                        <p className="perk-context">
                          {getPerkContextLabel(perk)}
                        </p>
                        <p className="perk-preview">{getPerkPreview(perk)}</p>
                      </div>
                    </div>
                  </button>
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
                {selectedPerk.backgroundSources.length > 0 ? (
                  <ul className="detail-list">
                    {selectedPerk.backgroundSources.map((backgroundSource) => (
                      <li
                        key={`${backgroundSource.backgroundId}-${backgroundSource.categoryName}-${backgroundSource.treeId}`}
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
