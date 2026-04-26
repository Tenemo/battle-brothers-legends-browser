import type { CategoryPerkGroupOption } from '../lib/category-filter-model'
import { getPerkGroupHoverKey, renderHighlightedText } from '../lib/perk-display'
import { BuildStar, CategoryChevron } from './SharedControls'

type CategorySidebarProps = {
  allPerkCount: number
  displayedCategoryNames: string[]
  displayedPerkGroupOptionsByCategory: Map<string, CategoryPerkGroupOption[]>
  expandedCategoryNames: string[]
  categoryCounts: Map<string, number>
  hoveredPerkGroupKey: string | null
  onCategoryToggle: (categoryName: string) => void
  onResetCategoryPerkGroups: (categoryName: string) => void
  onResetCategories: () => void
  onPerkGroupToggle: (categoryName: string, perkGroupId: string) => void
  pickedPerkCountsByCategory: Map<string, number>
  pickedPerkCountsByPerkGroup: Map<string, number>
  query: string
  selectedCategoryNames: string[]
  selectedPerkGroupIdsByCategory: Record<string, string[]>
}

function renderPickedStars(keyPrefix: string, count: number) {
  if (count <= 0) {
    return null
  }

  return (
    <span aria-hidden="true" className="category-chip-picked-stars">
      {Array.from({ length: count }, (_, pickedPerkIndex) => (
        <BuildStar isPicked key={`${keyPrefix}-picked-${pickedPerkIndex}`} />
      ))}
    </span>
  )
}

export function CategorySidebar({
  allPerkCount,
  displayedCategoryNames,
  displayedPerkGroupOptionsByCategory,
  expandedCategoryNames,
  categoryCounts,
  hoveredPerkGroupKey,
  onCategoryToggle,
  onResetCategoryPerkGroups,
  onResetCategories,
  onPerkGroupToggle,
  pickedPerkCountsByCategory,
  pickedPerkCountsByPerkGroup,
  query,
  selectedCategoryNames,
  selectedPerkGroupIdsByCategory,
}: CategorySidebarProps) {
  return (
    <aside className="sidebar app-scrollbar" aria-label="Perk categories">
      <div className="panel-heading">
        <h2>Categories</h2>
        <p>Enable one or more categories, then narrow each one to the perk groups you want.</p>
      </div>
      <button
        aria-label="Reset all category filters"
        aria-pressed={selectedCategoryNames.length === 0}
        className={selectedCategoryNames.length === 0 ? 'category-chip is-active' : 'category-chip'}
        onClick={onResetCategories}
        type="button"
      >
        <span className="category-chip-start">
          <span className="category-label">All categories</span>
        </span>
        <span>{allPerkCount}</span>
      </button>
      {displayedCategoryNames.map((availableCategoryName) => {
        const activePerkGroupOptions =
          displayedPerkGroupOptionsByCategory.get(availableCategoryName) ?? []
        const isExpanded = expandedCategoryNames.includes(availableCategoryName)
        const isActive = selectedCategoryNames.includes(availableCategoryName)
        const pickedPerkCountInCategory = pickedPerkCountsByCategory.get(availableCategoryName) ?? 0
        const selectedPerkGroupIds = selectedPerkGroupIdsByCategory[availableCategoryName] ?? []
        const isHoveredCategory =
          hoveredPerkGroupKey?.startsWith(`${availableCategoryName}::`) ?? false
        const hasVisibleHoveredPerkGroup =
          isHoveredCategory &&
          activePerkGroupOptions.some(
            (perkGroupOption) =>
              hoveredPerkGroupKey ===
              getPerkGroupHoverKey({
                categoryName: availableCategoryName,
                perkGroupId: perkGroupOption.perkGroupId,
              }),
          )
        const shouldHighlightCategory =
          isHoveredCategory && (!isExpanded || !hasVisibleHoveredPerkGroup)
        const categoryChipClassName = [
          'category-chip',
          isActive ? 'is-active' : '',
          shouldHighlightCategory ? 'is-highlighted' : '',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <div
            className={isExpanded ? 'category-card is-active' : 'category-card'}
            key={availableCategoryName}
          >
            <button
              aria-expanded={isExpanded}
              aria-label={`${isActive ? 'Disable' : 'Enable'} category ${availableCategoryName}`}
              aria-pressed={isActive}
              className={categoryChipClassName}
              onClick={() => onCategoryToggle(availableCategoryName)}
              type="button"
            >
              <span className="category-chip-start">
                <CategoryChevron isExpanded={isExpanded} />
                <span className="category-label">
                  {renderHighlightedText(
                    availableCategoryName,
                    query,
                    `${availableCategoryName}-group`,
                  )}
                </span>
              </span>
              <span className="category-chip-end">
                {renderPickedStars(availableCategoryName, pickedPerkCountInCategory)}
                <span>{categoryCounts.get(availableCategoryName)}</span>
              </span>
            </button>

            {isExpanded ? (
              <div className="perk-group-panel">
                <p className="perk-group-heading">Perk groups</p>
                <button
                  aria-label="Show all perk groups"
                  aria-pressed={selectedPerkGroupIds.length === 0}
                  className={
                    selectedPerkGroupIds.length === 0
                      ? 'perk-group-chip is-active'
                      : 'perk-group-chip'
                  }
                  onClick={() => onResetCategoryPerkGroups(availableCategoryName)}
                  type="button"
                >
                  <span className="perk-group-chip-start">All perk groups</span>
                  <span className="perk-group-chip-end">
                    {categoryCounts.get(availableCategoryName)}
                  </span>
                </button>
                {activePerkGroupOptions.map((perkGroupOption) => {
                  const pickedPerkCountInPerkGroup =
                    pickedPerkCountsByPerkGroup.get(perkGroupOption.perkGroupId) ?? 0
                  const isPerkGroupHighlighted =
                    hoveredPerkGroupKey ===
                    getPerkGroupHoverKey({
                      categoryName: availableCategoryName,
                      perkGroupId: perkGroupOption.perkGroupId,
                    })
                  const perkGroupChipClassName = [
                    'perk-group-chip',
                    selectedPerkGroupIds.includes(perkGroupOption.perkGroupId) ? 'is-active' : '',
                    isPerkGroupHighlighted ? 'is-highlighted' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')

                  return (
                    <button
                      aria-label={`Toggle perk group ${perkGroupOption.perkGroupName}`}
                      aria-pressed={selectedPerkGroupIds.includes(perkGroupOption.perkGroupId)}
                      className={perkGroupChipClassName}
                      key={perkGroupOption.perkGroupId}
                      onClick={() =>
                        onPerkGroupToggle(availableCategoryName, perkGroupOption.perkGroupId)
                      }
                      type="button"
                    >
                      <span className="perk-group-chip-start">
                        {renderHighlightedText(
                          perkGroupOption.perkGroupName,
                          query,
                          `${availableCategoryName}-${perkGroupOption.perkGroupId}-perk-group`,
                        )}
                      </span>
                      <span className="perk-group-chip-end">
                        {renderPickedStars(perkGroupOption.perkGroupId, pickedPerkCountInPerkGroup)}
                        <span>{perkGroupOption.perkCount}</span>
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
