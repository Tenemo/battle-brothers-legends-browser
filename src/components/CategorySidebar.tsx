import { useEffect, useRef } from 'react'
import type { CategoryPerkGroupOption } from '../lib/category-filter-model'
import { getPerkGroupHoverKey, renderHighlightedText } from '../lib/perk-display'
import { cx } from '../lib/class-names'
import { BuildStar, CategoryChevron } from './SharedControls'
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
  hoveredPerkGroupKey: string | null
  onCategoryToggle: (categoryName: string) => void
  onResetCategoryPerkGroups: (categoryName: string) => void
  onResetCategories: () => void
  onPerkGroupSelect: (categoryName: string, perkGroupId: string) => void
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
      {Array.from({ length: count }, (_, pickedPerkIndex) => (
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
  hoveredPerkGroupKey,
  onCategoryToggle,
  onResetCategoryPerkGroups,
  onResetCategories,
  onPerkGroupSelect,
  pickedPerkCountsByCategory,
  pickedPerkCountsByPerkGroup,
  query,
  selectedCategoryNames,
  selectedPerkGroupIdsByCategory,
}: CategorySidebarProps) {
  const sidebarRef = useRef<HTMLElement | null>(null)
  const expandedCategoryNameSignature = expandedCategoryNames.join('\u0000')

  useEffect(() => {
    const sidebar = sidebarRef.current

    if (sidebar === null) {
      return
    }

    if (typeof sidebar.scrollTo === 'function') {
      sidebar.scrollTo({
        top: 0,
      })
      return
    }

    sidebar.scrollTop = 0
  }, [expandedCategoryNameSignature])

  return (
    <aside
      className={cx(styles.sidebar, 'app-scrollbar')}
      aria-label="Perk categories"
      data-scroll-container="true"
      data-testid="category-sidebar"
      ref={sidebarRef}
    >
      <div className={styles.panelHeading}>
        <h2>Categories</h2>
        <p>Enable categories, then choose one perk group to focus the results.</p>
      </div>
      <button
        aria-label="Reset all category filters"
        aria-pressed={selectedCategoryNames.length === 0}
        className={styles.categoryChip}
        onClick={onResetCategories}
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
          emphasizedCategoryNames.has(availableCategoryName) ||
          (isHoveredCategory && (!isExpanded || !hasVisibleHoveredPerkGroup))
        return (
          <div className={styles.categoryCard} data-active={isExpanded} key={availableCategoryName}>
            <button
              aria-expanded={isExpanded}
              aria-label={`${isActive ? 'Disable' : 'Enable'} category ${availableCategoryName}`}
              aria-pressed={isActive}
              className={styles.categoryChip}
              data-highlighted={shouldHighlightCategory}
              onClick={() => onCategoryToggle(availableCategoryName)}
              type="button"
            >
              <span className={styles.categoryChipStart}>
                <CategoryChevron className={styles.categoryChevron} isExpanded={isExpanded} />
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

            {isExpanded ? (
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
                  const perkGroupKey = getPerkGroupHoverKey({
                    categoryName: availableCategoryName,
                    perkGroupId: perkGroupOption.perkGroupId,
                  })
                  const isPerkGroupHighlighted =
                    emphasizedPerkGroupKeys.has(perkGroupKey) ||
                    emphasizedCategoryNames.has(availableCategoryName)
                  return (
                    <button
                      aria-label={`Select perk group ${perkGroupOption.perkGroupName}`}
                      aria-pressed={selectedPerkGroupIds.includes(perkGroupOption.perkGroupId)}
                      className={styles.perkGroupChip}
                      data-highlighted={isPerkGroupHighlighted}
                      key={perkGroupOption.perkGroupId}
                      onClick={() =>
                        onPerkGroupSelect(availableCategoryName, perkGroupOption.perkGroupId)
                      }
                      type="button"
                    >
                      <span className={styles.perkGroupChipStart}>
                        {renderHighlightedText({
                          highlightClassName: sharedStyles.searchHighlight,
                          keyPrefix: `${availableCategoryName}-${perkGroupOption.perkGroupId}-perk-group`,
                          query,
                          text: perkGroupOption.perkGroupName,
                        })}
                      </span>
                      <span className={styles.perkGroupChipEnd}>
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
