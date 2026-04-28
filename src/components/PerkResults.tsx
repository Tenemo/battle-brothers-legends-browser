import { useEffect, useId, useRef, useState } from 'react'
import {
  getPerkDisplayIconPath,
  getPerkGroupHoverKey,
  renderGameIcon,
  renderHighlightedText,
} from '../lib/perk-display'
import { cx } from '../lib/class-names'
import { getPerkPreviewParagraphs } from '../lib/perk-search'
import type { LegendsPerkPlacement, LegendsPerkRecord } from '../types/legends-perks'
import { BuildToggleButton, ClearableSearchField, FunnelIcon } from './SharedControls'
import backgroundFitStyles from './BackgroundFitPanel.module.scss'
import sharedStyles from './SharedControls.module.scss'
import styles from './PerkResults.module.scss'

function renderPerkPlacementChip({
  emphasizedCategoryNames,
  emphasizedPerkGroupKeys,
  keyPrefix,
  perk,
  onClosePerkGroupHover,
  onInspectPerkGroup,
  onOpenPerkGroupHover,
  placement,
  query,
}: {
  emphasizedCategoryNames: ReadonlySet<string>
  emphasizedPerkGroupKeys: ReadonlySet<string>
  keyPrefix: string
  perk: LegendsPerkRecord
  onClosePerkGroupHover: (perkGroupKey: string) => void
  onInspectPerkGroup: (categoryName: string, perkGroupId: string) => void
  onOpenPerkGroupHover: (categoryName: string, perkGroupId: string) => void
  placement: LegendsPerkPlacement
  query: string
}) {
  const perkGroupKey = getPerkGroupHoverKey(placement)
  const isHighlighted =
    emphasizedPerkGroupKeys.has(perkGroupKey) || emphasizedCategoryNames.has(placement.categoryName)

  return (
    <button
      aria-label={`Select perk group ${placement.perkGroupName}`}
      className={styles.perkPlacementChip}
      data-highlighted={isHighlighted}
      data-testid="perk-placement-chip"
      key={keyPrefix}
      onBlur={() => onClosePerkGroupHover(perkGroupKey)}
      onClick={() => onInspectPerkGroup(placement.categoryName, placement.perkGroupId)}
      onFocus={() => onOpenPerkGroupHover(placement.categoryName, placement.perkGroupId)}
      onMouseEnter={(event) => {
        event.stopPropagation()
        onOpenPerkGroupHover(placement.categoryName, placement.perkGroupId)
      }}
      onMouseLeave={() => onClosePerkGroupHover(perkGroupKey)}
      type="button"
    >
      {renderGameIcon({
        className: cx(sharedStyles.perkIcon, sharedStyles.perkIconGroup, styles.perkPlacementIcon),
        iconPath: placement.perkGroupIconPath ?? getPerkDisplayIconPath(perk),
        label: `${placement.perkGroupName} perk group icon`,
        testId: 'perk-placement-icon',
      })}
      <span className={styles.perkPlacementLabel} data-testid="perk-placement-label">
        {renderHighlightedText({
          highlightClassName: sharedStyles.searchHighlight,
          keyPrefix: `${keyPrefix}-group`,
          query,
          text: placement.perkGroupName,
        })}
      </span>
    </button>
  )
}

function renderPerkPlacements({
  emphasizedCategoryNames,
  emphasizedPerkGroupKeys,
  onClosePerkGroupHover,
  onInspectPerkGroup,
  onOpenPerkGroupHover,
  perk,
  query,
}: {
  emphasizedCategoryNames: ReadonlySet<string>
  emphasizedPerkGroupKeys: ReadonlySet<string>
  onClosePerkGroupHover: (perkGroupKey: string) => void
  onInspectPerkGroup: (categoryName: string, perkGroupId: string) => void
  onOpenPerkGroupHover: (categoryName: string, perkGroupId: string) => void
  perk: LegendsPerkRecord
  query: string
}) {
  if (perk.placements.length === 0) {
    return (
      <span className={styles.perkPlacementEmpty} data-testid="perk-placement-empty">
        No perk group placement
      </span>
    )
  }

  return perk.placements.map((placement, placementIndex) =>
    renderPerkPlacementChip({
      emphasizedCategoryNames,
      emphasizedPerkGroupKeys,
      keyPrefix: `${perk.id}-placement-${placementIndex}`,
      onClosePerkGroupHover,
      onInspectPerkGroup,
      onOpenPerkGroupHover,
      perk,
      placement,
      query,
    }),
  )
}

export function PerkResults({
  emphasizedCategoryNames,
  emphasizedPerkGroupKeys,
  onCloseResultsPerkHover,
  onClosePerkGroupHover,
  onInspectPerkGroup,
  onOriginAndAncientScrollPerkGroupsChange,
  onOpenResultsPerkHover,
  onOpenPerkGroupHover,
  onSelectPerk,
  onTogglePerkPicked,
  pickedPerkOrderById,
  query,
  selectedCategoryCount,
  selectedPerk,
  selectedPerkGroupCount,
  setQuery,
  shouldIncludeOriginAndAncientScrollPerkGroups,
  visiblePerks,
  hoveredPerkId,
}: {
  emphasizedCategoryNames: ReadonlySet<string>
  emphasizedPerkGroupKeys: ReadonlySet<string>
  hoveredPerkId: string | null
  onClosePerkGroupHover: (perkGroupKey: string) => void
  onCloseResultsPerkHover: (perkId: string) => void
  onInspectPerkGroup: (categoryName: string, perkGroupId: string) => void
  onOriginAndAncientScrollPerkGroupsChange: (
    shouldIncludeOriginAndAncientScrollPerkGroups: boolean,
  ) => void
  onOpenPerkGroupHover: (categoryName: string, perkGroupId: string) => void
  onOpenResultsPerkHover: (perkId: string) => void
  onSelectPerk: (perkId: string) => void
  onTogglePerkPicked: (perkId: string) => void
  pickedPerkOrderById: Map<string, number>
  query: string
  selectedCategoryCount: number
  selectedPerk: LegendsPerkRecord | null
  selectedPerkGroupCount: number
  setQuery: (query: string) => void
  shouldIncludeOriginAndAncientScrollPerkGroups: boolean
  visiblePerks: LegendsPerkRecord[]
}) {
  const [isPerkFilterMenuOpen, setIsPerkFilterMenuOpen] = useState(false)
  const perkFilterMenuId = useId()
  const perkFilterMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isPerkFilterMenuOpen) {
      return
    }

    function handleDocumentPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && perkFilterMenuRef.current?.contains(event.target)) {
        return
      }

      setIsPerkFilterMenuOpen(false)
    }

    document.addEventListener('pointerdown', handleDocumentPointerDown)

    return () => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown)
    }
  }, [isPerkFilterMenuOpen])

  return (
    <section className={styles.resultsPanel} aria-label="Perk results" data-testid="results-panel">
      <div className={styles.toolbar}>
        <ClearableSearchField
          clearLabel="Clear perk search"
          inputId="perk-results-search"
          label="Search perks"
          onValueChange={setQuery}
          placeholder="Search perks, perk groups, backgrounds, scenarios, or enemy targets"
          testId="perk-results-search-field"
          trailingControl={
            <div
              className={backgroundFitStyles.backgroundFitFilterMenu}
              onKeyDown={(event) => {
                if (event.key !== 'Escape') {
                  return
                }

                event.preventDefault()
                setIsPerkFilterMenuOpen(false)
                event.currentTarget
                  .querySelector<HTMLButtonElement>('[data-perk-filter-button="true"]')
                  ?.focus()
              }}
              ref={perkFilterMenuRef}
            >
              <button
                aria-controls={perkFilterMenuId}
                aria-expanded={isPerkFilterMenuOpen}
                aria-label="Filter perks"
                className={backgroundFitStyles.backgroundFitFilterButton}
                data-active-filter={shouldIncludeOriginAndAncientScrollPerkGroups}
                data-perk-filter-button="true"
                data-testid="perk-filter-button"
                onClick={() =>
                  setIsPerkFilterMenuOpen((wasPerkFilterMenuOpen) => !wasPerkFilterMenuOpen)
                }
                type="button"
              >
                <FunnelIcon
                  className={backgroundFitStyles.backgroundFitFilterIcon}
                  isFilled={shouldIncludeOriginAndAncientScrollPerkGroups}
                  testId="perk-filter-icon"
                />
              </button>
              {isPerkFilterMenuOpen ? (
                <div
                  aria-label="Perk filters"
                  className={backgroundFitStyles.backgroundFitFilterPopover}
                  id={perkFilterMenuId}
                  role="group"
                >
                  <label className={backgroundFitStyles.backgroundFitFilterOption}>
                    <input
                      checked={shouldIncludeOriginAndAncientScrollPerkGroups}
                      data-testid="origin-scroll-perk-groups-checkbox"
                      onChange={(event) =>
                        onOriginAndAncientScrollPerkGroupsChange(event.target.checked)
                      }
                      type="checkbox"
                    />
                    <span>Origin and ancient scroll perk groups</span>
                  </label>
                </div>
              ) : null}
            </div>
          }
          value={query}
        />
      </div>

      <div className={styles.resultsSummary}>
        <p>
          Showing <strong>{visiblePerks.length}</strong> perk
          {visiblePerks.length === 1 ? '' : 's'}
        </p>
        <p className={styles.resultsNote}>
          {selectedPerkGroupCount > 0
            ? `Filtered to ${selectedCategoryCount} categor${selectedCategoryCount === 1 ? 'y' : 'ies'} and ${selectedPerkGroupCount} perk group${selectedPerkGroupCount === 1 ? '' : 's'}.`
            : selectedCategoryCount > 0
              ? `Filtered to ${selectedCategoryCount} categor${selectedCategoryCount === 1 ? 'y' : 'ies'}.`
              : 'Ranked by exact perk names first, then perk group and category matches, then background, scenario, and full text.'}
        </p>
      </div>

      <ul
        className={cx(styles.resultsList, 'app-scrollbar')}
        data-scroll-container="true"
        data-testid="results-list"
      >
        {visiblePerks.length === 0 ? (
          <li className={sharedStyles.emptyState} data-testid="empty-state">
            <h2>No perks found</h2>
            <p>Try a broader search or switch the category filters.</p>
          </li>
        ) : (
          visiblePerks.map((perk) => {
            const isSelected = perk.id === selectedPerk?.id
            const isPicked = pickedPerkOrderById.has(perk.id)
            const isHighlighted = hoveredPerkId === perk.id
            const previewParagraphs = getPerkPreviewParagraphs(perk)

            return (
              <li
                className={styles.perkRow}
                data-highlighted={isHighlighted}
                data-picked={isPicked}
                data-selected={isSelected}
                data-testid="perk-row"
                key={perk.id}
                onBlurCapture={(event) => {
                  if (
                    event.relatedTarget instanceof Node &&
                    event.currentTarget.contains(event.relatedTarget)
                  ) {
                    return
                  }

                  onCloseResultsPerkHover(perk.id)
                }}
                onFocusCapture={() => onOpenResultsPerkHover(perk.id)}
                onMouseEnter={() => onOpenResultsPerkHover(perk.id)}
                onMouseLeave={() => onCloseResultsPerkHover(perk.id)}
              >
                <button
                  aria-label={`Inspect ${perk.perkName}`}
                  className={styles.perkRowSelect}
                  onClick={() => onSelectPerk(perk.id)}
                  type="button"
                />
                <div className={styles.perkRowLayout}>
                  {renderGameIcon({
                    className: cx(
                      sharedStyles.perkIcon,
                      sharedStyles.perkIconSmall,
                      styles.perkRowIcon,
                    ),
                    iconPath: getPerkDisplayIconPath(perk),
                    label: `${perk.perkName} icon`,
                    testId: 'perk-row-icon',
                  })}
                  <div className={styles.perkRowCopy}>
                    <div className={styles.perkRowTopline}>
                      <span className={styles.perkName} data-testid="perk-name">
                        {renderHighlightedText({
                          highlightClassName: sharedStyles.searchHighlight,
                          keyPrefix: `${perk.id}-name`,
                          query,
                          text: perk.perkName,
                        })}
                      </span>
                    </div>
                  </div>
                  <div className={styles.perkRowContextSlot}>
                    <div
                      className={cx(styles.perkContext, styles.perkPlacementList)}
                      data-testid="perk-placement-list"
                    >
                      {renderPerkPlacements({
                        emphasizedCategoryNames,
                        emphasizedPerkGroupKeys,
                        onClosePerkGroupHover,
                        onInspectPerkGroup,
                        onOpenPerkGroupHover,
                        perk,
                        query,
                      })}
                    </div>
                    <div className={styles.perkPreview} data-testid="perk-preview">
                      {previewParagraphs.map((previewParagraph, previewParagraphIndex) => (
                        <p key={`${perk.id}-preview-${previewParagraphIndex}`}>
                          {renderHighlightedText({
                            highlightClassName: sharedStyles.searchHighlight,
                            keyPrefix: `${perk.id}-preview-${previewParagraphIndex}`,
                            query,
                            text: previewParagraph,
                          })}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
                <BuildToggleButton
                  className={styles.buildToggleButtonInRow}
                  isCompact
                  isPicked={isPicked}
                  onClick={() => onTogglePerkPicked(perk.id)}
                  perkName={perk.perkName}
                  source="results"
                />
              </li>
            )
          })
        )}
      </ul>
    </section>
  )
}
