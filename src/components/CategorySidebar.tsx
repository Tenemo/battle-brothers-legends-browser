import type { CategoryTreeOption } from '../lib/category-filter-model'
import { getPerkGroupHoverKey, renderHighlightedText } from '../lib/perk-display'
import { BuildStar, TreeChevron } from './SharedControls'

type CategorySidebarProps = {
  allPerkCount: number
  displayedGroupNames: string[]
  displayedTreeOptionsByGroup: Map<string, CategoryTreeOption[]>
  expandedGroupNames: string[]
  groupCounts: Map<string, number>
  hoveredPerkGroupKey: string | null
  onGroupToggle: (groupName: string) => void
  onResetGroupTrees: (groupName: string) => void
  onResetGroups: () => void
  onTreeToggle: (groupName: string, treeId: string) => void
  pickedPerkCountsByGroup: Map<string, number>
  pickedPerkCountsByTree: Map<string, number>
  query: string
  selectedGroupNames: string[]
  selectedTreeIdsByGroup: Record<string, string[]>
}

function renderPickedStars(keyPrefix: string, count: number) {
  if (count <= 0) {
    return null
  }

  return (
    <span aria-hidden="true" className="group-chip-picked-stars">
      {Array.from({ length: count }, (_, pickedPerkIndex) => (
        <BuildStar isPicked key={`${keyPrefix}-picked-${pickedPerkIndex}`} />
      ))}
    </span>
  )
}

export function CategorySidebar({
  allPerkCount,
  displayedGroupNames,
  displayedTreeOptionsByGroup,
  expandedGroupNames,
  groupCounts,
  hoveredPerkGroupKey,
  onGroupToggle,
  onResetGroupTrees,
  onResetGroups,
  onTreeToggle,
  pickedPerkCountsByGroup,
  pickedPerkCountsByTree,
  query,
  selectedGroupNames,
  selectedTreeIdsByGroup,
}: CategorySidebarProps) {
  return (
    <aside className="sidebar" aria-label="Perk categories">
      <div className="panel-heading">
        <h2>Categories</h2>
        <p>Enable one or more categories, then narrow each one to the perk groups you want.</p>
      </div>
      <button
        aria-label="Reset all category filters"
        className={selectedGroupNames.length === 0 ? 'group-chip is-active' : 'group-chip'}
        onClick={onResetGroups}
        type="button"
      >
        <span className="group-chip-start">
          <span className="group-label">All categories</span>
        </span>
        <span>{allPerkCount}</span>
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
        const shouldHighlightCategory = isHoveredCategory && (!isExpanded || !hasVisibleHoveredTree)
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
              onClick={() => onGroupToggle(availableGroupName)}
              type="button"
            >
              <span className="group-chip-start">
                <TreeChevron isExpanded={isExpanded} />
                <span className="group-label">
                  {renderHighlightedText(availableGroupName, query, `${availableGroupName}-group`)}
                </span>
              </span>
              <span className="group-chip-end">
                {renderPickedStars(availableGroupName, pickedPerkCountInGroup)}
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
                  onClick={() => onResetGroupTrees(availableGroupName)}
                  type="button"
                >
                  <span className="subgroup-chip-start">All perk groups</span>
                  <span className="subgroup-chip-end">{groupCounts.get(availableGroupName)}</span>
                </button>
                {activeTreeOptions.map((treeOption) => {
                  const pickedPerkCountInTree = pickedPerkCountsByTree.get(treeOption.treeId) ?? 0
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
                      onClick={() => onTreeToggle(availableGroupName, treeOption.treeId)}
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
                        {renderPickedStars(treeOption.treeId, pickedPerkCountInTree)}
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
  )
}
