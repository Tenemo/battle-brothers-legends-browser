import type { CategoryPerkGroupOption } from '../lib/category-filter-model'
import type { CategoryFilterMode } from '../lib/category-filter-state'
import { getPerkGroupHoverKey, renderHighlightedText } from '../lib/perk-display'
import { joinClassNames } from '../lib/class-names'
import { isAncientScrollLearnablePerkGroupId } from '../lib/origin-and-ancient-scroll-perk-groups'
import { AncientScrollPerkGroupMarker } from './PerkGroupIcon'
import { BuildStar, CategoryChevron, CategorySidebarRailChevron } from './SharedControls'
import sharedStyles from './SharedControls.module.scss'
import styles from './CategorySidebar.module.scss'

type CategorySidebarProps = {
  allPerkCount: number
  displayedCategoryNames: string[]
  displayedPerkGroupOptionsByCategory: Map<string, CategoryPerkGroupOption[]>
  emphasizedCategoryNames: ReadonlySet<string>
  emphasizedPerkGroupKeys: ReadonlySet<string>
  expandedCategoryNames: string[]
  categoryCounts: Map<string, number>
  categoryFilterMode: CategoryFilterMode
  hoveredPerkGroupKey: string | null
  isExpanded: boolean
  onCategoryExpandToggle: (categoryName: string) => void
  onCategoryToggle: (categoryName: string) => void
  onClearCategorySelection: () => void
  onCloseCategoryHover: (categoryName: string) => void
  onOpenCategoryHover: (categoryName: string) => void
  onResetCategoryPerkGroups: (categoryName: string) => void
  onPerkGroupSelect: (categoryName: string, perkGroupId: string) => void
  onSelectAllCategories: () => void
  onToggleExpanded: () => void
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
    <span aria-hidden="true" className={styles.categoryChipPickedStars}>
      {Array.from({ length: count }, (_unusedValue, pickedPerkIndex) => (
        <BuildStar
          className={styles.categoryChipPickedStar}
          isPicked
          key={`${keyPrefix}-picked-${pickedPerkIndex}`}
          testId="category-picked-star"
        />
      ))}
    </span>
  )
}

export function CategorySidebar({
  allPerkCount,
  displayedCategoryNames,
  displayedPerkGroupOptionsByCategory,
  emphasizedCategoryNames,
  emphasizedPerkGroupKeys,
  expandedCategoryNames,
  categoryCounts,
  categoryFilterMode,
  hoveredPerkGroupKey,
  isExpanded,
  onCategoryExpandToggle,
  onCategoryToggle,
  onClearCategorySelection,
  onCloseCategoryHover,
  onOpenCategoryHover,
  onResetCategoryPerkGroups,
  onPerkGroupSelect,
  onSelectAllCategories,
  onToggleExpanded,
  pickedPerkCountsByCategory,
  pickedPerkCountsByPerkGroup,
  query,
  selectedCategoryNames,
  selectedPerkGroupIdsByCategory,
}: CategorySidebarProps) {
  const hasActiveCategoryFilter =
    categoryFilterMode !== 'none' ||
    Object.values(selectedPerkGroupIdsByCategory).some(
      (selectedPerkGroupIds) => selectedPerkGroupIds.length > 0,
    )

  return (
    <aside
      aria-label="Perk categories"
      className={styles.sidebar}
      data-expanded={isExpanded}
      data-testid="category-sidebar"
    >
      <button
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} category filters`}
        className={styles.categorySidebarRailButton}
        onClick={onToggleExpanded}
        type="button"
      >
        <span aria-hidden="true" className={styles.categorySidebarRailButtonIcon}>
          <CategorySidebarRailChevron
            className={styles.categorySidebarRailChevron}
            isExpanded={isExpanded}
          />
        </span>
        <span aria-hidden="true" className={styles.categorySidebarRailButtonLabel}>
          Categories
        </span>
      </button>

      <div
        aria-hidden={!isExpanded}
        className={joinClassNames(styles.sidebarBody, 'app-scrollbar')}
        data-scroll-container="true"
        data-testid="category-sidebar-body"
        inert={isExpanded ? undefined : true}
      >
        <div className={styles.panelHeading}>
          <h2>Categories</h2>
          {hasActiveCategoryFilter ? (
            <button
              aria-label="Clear category selection"
              className={joinClassNames(sharedStyles.searchClearButton, styles.categoryClearButton)}
              onClick={onClearCategorySelection}
              type="button"
            >
              <span aria-hidden="true" className={sharedStyles.searchClearIcon} />
            </button>
          ) : null}
        </div>
        <button
          aria-label="Show all categories"
          aria-pressed={categoryFilterMode === 'all'}
          className={styles.categoryChip}
          onClick={onSelectAllCategories}
          type="button"
        >
          <span className={styles.categoryChipStart}>
            <span className={styles.categoryLabel}>All categories</span>
          </span>
          <span>{allPerkCount}</span>
        </button>
        {displayedCategoryNames.map((availableCategoryName) => {
          const activePerkGroupOptions =
            displayedPerkGroupOptionsByCategory.get(availableCategoryName) ?? []
          const isCategoryExpanded = expandedCategoryNames.includes(availableCategoryName)
          const isActive = selectedCategoryNames.includes(availableCategoryName)
          const pickedPerkCountInCategory =
            pickedPerkCountsByCategory.get(availableCategoryName) ?? 0
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
            emphasizedCategoryNames.has(availableCategoryName) ||
            (isHoveredCategory && (!isCategoryExpanded || !hasVisibleHoveredPerkGroup))
          return (
            <div
              className={styles.categoryCard}
              data-active={isCategoryExpanded}
              key={availableCategoryName}
            >
              <div
                className={styles.categoryChipFrame}
                data-highlighted={shouldHighlightCategory}
                data-selected={isActive}
                onBlurCapture={(event) => {
                  if (
                    event.relatedTarget instanceof Node &&
                    event.currentTarget.contains(event.relatedTarget)
                  ) {
                    return
                  }

                  onCloseCategoryHover(availableCategoryName)
                }}
                onMouseLeave={(event) => {
                  const activeElement = event.currentTarget.ownerDocument.activeElement

                  if (
                    activeElement instanceof Node &&
                    event.currentTarget.contains(activeElement)
                  ) {
                    return
                  }

                  onCloseCategoryHover(availableCategoryName)
                }}
              >
                <button
                  aria-expanded={isCategoryExpanded}
                  aria-label={`${isCategoryExpanded ? 'Collapse' : 'Expand'} category ${availableCategoryName}`}
                  className={styles.categoryDisclosureButton}
                  onClick={() => onCategoryExpandToggle(availableCategoryName)}
                  onFocus={() => onCloseCategoryHover(availableCategoryName)}
                  onMouseEnter={() => onCloseCategoryHover(availableCategoryName)}
                  type="button"
                >
                  <CategoryChevron
                    className={styles.categoryChevron}
                    isExpanded={isCategoryExpanded}
                  />
                </button>
                <button
                  aria-label={`${isActive ? 'Disable' : 'Enable'} category ${availableCategoryName}`}
                  aria-pressed={isActive}
                  className={styles.categorySelectButton}
                  data-highlighted={shouldHighlightCategory}
                  onClick={() => onCategoryToggle(availableCategoryName)}
                  onFocus={() => onOpenCategoryHover(availableCategoryName)}
                  onMouseEnter={() => onOpenCategoryHover(availableCategoryName)}
                  type="button"
                >
                  <span className={styles.categoryChipStart}>
                    <span className={styles.categoryLabel}>
                      {renderHighlightedText({
                        highlightClassName: sharedStyles.searchHighlight,
                        keyPrefix: `${availableCategoryName}-group`,
                        query,
                        text: availableCategoryName,
                      })}
                    </span>
                  </span>
                  <span className={styles.categoryChipEnd}>
                    {renderPickedStars(availableCategoryName, pickedPerkCountInCategory)}
                    <span>{categoryCounts.get(availableCategoryName)}</span>
                  </span>
                </button>
              </div>

              {isCategoryExpanded ? (
                <div className={styles.perkGroupPanel}>
                  <p className={styles.perkGroupHeading} data-testid="perk-group-heading">
                    Perk groups
                  </p>
                  <button
                    aria-label="Show all perk groups"
                    aria-pressed={selectedPerkGroupIds.length === 0}
                    className={styles.perkGroupChip}
                    onClick={() => onResetCategoryPerkGroups(availableCategoryName)}
                    type="button"
                  >
                    <span className={styles.perkGroupChipStart}>All perk groups</span>
                    <span className={styles.perkGroupChipEnd}>
                      {categoryCounts.get(availableCategoryName)}
                    </span>
                  </button>
                  {activePerkGroupOptions.map((perkGroupOption) => {
                    const pickedPerkCountInPerkGroup =
                      pickedPerkCountsByPerkGroup.get(perkGroupOption.perkGroupId) ?? 0
                    const isSelectedPerkGroup = selectedPerkGroupIds.includes(
                      perkGroupOption.perkGroupId,
                    )
                    const perkGroupKey = getPerkGroupHoverKey({
                      categoryName: availableCategoryName,
                      perkGroupId: perkGroupOption.perkGroupId,
                    })
                    const isPerkGroupHighlighted = emphasizedPerkGroupKeys.has(perkGroupKey)
                    const isAncientScrollPerkGroup = isAncientScrollLearnablePerkGroupId(
                      perkGroupOption.perkGroupId,
                    )
                    return (
                      <button
                        aria-label={`Select perk group ${perkGroupOption.perkGroupName}`}
                        aria-pressed={isSelectedPerkGroup}
                        className={styles.perkGroupChip}
                        data-ancient-scroll-perk-group={isAncientScrollPerkGroup}
                        data-highlighted={isPerkGroupHighlighted}
                        key={perkGroupOption.perkGroupId}
                        onClick={() =>
                          onPerkGroupSelect(availableCategoryName, perkGroupOption.perkGroupId)
                        }
                        type="button"
                      >
                        <span className={styles.perkGroupChipStart}>
                          <span className={styles.perkGroupLabel} data-testid="perk-group-label">
                            {renderHighlightedText({
                              highlightClassName: sharedStyles.searchHighlight,
                              keyPrefix: `${availableCategoryName}-${perkGroupOption.perkGroupId}-perk-group`,
                              query,
                              text: perkGroupOption.perkGroupName,
                            })}
                          </span>
                          {isAncientScrollPerkGroup ? (
                            <AncientScrollPerkGroupMarker
                              className={styles.perkGroupAncientScrollMarker}
                            />
                          ) : null}
                        </span>
                        <span className={styles.perkGroupChipEnd}>
                          {renderPickedStars(
                            perkGroupOption.perkGroupId,
                            pickedPerkCountInPerkGroup,
                          )}
                          <span data-testid="perk-group-count">{perkGroupOption.perkCount}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
