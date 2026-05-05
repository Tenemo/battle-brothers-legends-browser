import { startTransition, useEffect, useId, useRef, useState } from 'react'
import {
  getPerkDisplayIconPath,
  getPerkGroupHoverKey,
  formatMorePerkResultsLabel,
  renderGameIcon,
  renderHighlightedText,
} from '../lib/perk-display'
import { joinClassNames } from '../lib/class-names'
import { gameIconImageWidths } from '../lib/game-icon-url'
import {
  usePlannerInteractionActions,
  usePlannerInteractionState,
} from '../lib/planner-interaction-context-values'
import { getPerkPreviewParagraphs } from '../lib/perk-search'
import type { LegendsPerkPlacement, LegendsPerkRecord } from '../types/legends-perks'
import { isAncientScrollLearnablePerkGroupId } from '../lib/origin-and-ancient-scroll-perk-groups'
import { AncientScrollPerkGroupMarker, PerkGroupIcon } from './PerkGroupIcon'
import {
  BuildToggleButton,
  ClearableSearchField,
  FunnelIcon,
  type BuildRequirement,
} from './SharedControls'
import sharedStyles from './SharedControls.module.scss'
import styles from './PerkResults.module.scss'

const mobilePerkResultBatchSize = 12
const desktopInitialPerkResultBatchSize = 24
const desktopPerkResultBatchSize = 48
const desktopPerkResultBatchDelayMs = 250
const mobilePerkResultMediaQuery = '(max-width: 760px)'
const perkFilterTooltips = {
  ancientScrollPerks: 'Shows perk groups that are only available through ancient scroll sources.',
  originPerkGroups: 'Shows perk groups that come only from origins and are hidden by default.',
} as const

function getInitialShouldUseDesktopPerkResultWindow(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return !window.matchMedia(mobilePerkResultMediaQuery).matches
}

function renderPerkPlacementChip({
  emphasizedCategoryNames,
  emphasizedPerkGroupKeys,
  hoveredPerkPlacementCategoryNames,
  hoveredPerkPlacementPerkGroupKeys,
  keyPrefix,
  perk,
  selectedEmphasisCategoryNames,
  selectedEmphasisPerkGroupKeys,
  onClosePerkGroupHover,
  onInspectPerkGroup,
  onOpenPerkGroupHover,
  placement,
  query,
}: {
  emphasizedCategoryNames: ReadonlySet<string>
  emphasizedPerkGroupKeys: ReadonlySet<string>
  hoveredPerkPlacementCategoryNames: ReadonlySet<string>
  hoveredPerkPlacementPerkGroupKeys: ReadonlySet<string>
  keyPrefix: string
  perk: LegendsPerkRecord
  selectedEmphasisCategoryNames: ReadonlySet<string>
  selectedEmphasisPerkGroupKeys: ReadonlySet<string>
  onClosePerkGroupHover: (perkGroupKey: string) => void
  onInspectPerkGroup: (categoryName: string, perkGroupId: string) => void
  onOpenPerkGroupHover: (categoryName: string, perkGroupId: string) => void
  placement: LegendsPerkPlacement
  query: string
}) {
  const perkGroupKey = getPerkGroupHoverKey(placement)
  const isAncientScrollPerkGroup = isAncientScrollLearnablePerkGroupId(placement.perkGroupId)
  const isHighlighted =
    emphasizedPerkGroupKeys.has(perkGroupKey) ||
    emphasizedCategoryNames.has(placement.categoryName) ||
    hoveredPerkPlacementPerkGroupKeys.has(perkGroupKey) ||
    hoveredPerkPlacementCategoryNames.has(placement.categoryName)
  const isSelectedHighlighted =
    selectedEmphasisPerkGroupKeys.has(perkGroupKey) ||
    selectedEmphasisCategoryNames.has(placement.categoryName)

  return (
    <button
      aria-label={`Select perk group ${placement.perkGroupName}`}
      className={styles.perkPlacementChip}
      data-ancient-scroll-perk-group={isAncientScrollPerkGroup}
      data-highlighted={isHighlighted}
      data-selected-highlighted={isSelectedHighlighted}
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
      <PerkGroupIcon
        className={joinClassNames(
          sharedStyles.perkIcon,
          sharedStyles.perkIconGroup,
          styles.perkPlacementIcon,
        )}
        iconPath={placement.perkGroupIconPath ?? getPerkDisplayIconPath(perk)}
        label={`${placement.perkGroupName} perk group icon`}
        testId="perk-placement-icon"
      />
      <span className={styles.perkPlacementLabel} data-testid="perk-placement-label">
        {renderHighlightedText({
          highlightClassName: sharedStyles.searchHighlight,
          keyPrefix: `${keyPrefix}-group`,
          query,
          text: placement.perkGroupName,
        })}
      </span>
      {isAncientScrollPerkGroup ? <AncientScrollPerkGroupMarker /> : null}
    </button>
  )
}

function renderPerkPlacements({
  emphasizedCategoryNames,
  emphasizedPerkGroupKeys,
  hoveredPerkPlacementCategoryNames,
  hoveredPerkPlacementPerkGroupKeys,
  selectedEmphasisCategoryNames,
  selectedEmphasisPerkGroupKeys,
  onClosePerkGroupHover,
  onInspectPerkGroup,
  onOpenPerkGroupHover,
  perk,
  query,
}: {
  emphasizedCategoryNames: ReadonlySet<string>
  emphasizedPerkGroupKeys: ReadonlySet<string>
  hoveredPerkPlacementCategoryNames: ReadonlySet<string>
  hoveredPerkPlacementPerkGroupKeys: ReadonlySet<string>
  selectedEmphasisCategoryNames: ReadonlySet<string>
  selectedEmphasisPerkGroupKeys: ReadonlySet<string>
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
      hoveredPerkPlacementCategoryNames,
      hoveredPerkPlacementPerkGroupKeys,
      keyPrefix: `${perk.id}-placement-${placementIndex}`,
      onClosePerkGroupHover,
      onInspectPerkGroup,
      onOpenPerkGroupHover,
      perk,
      placement,
      query,
      selectedEmphasisCategoryNames,
      selectedEmphasisPerkGroupKeys,
    }),
  )
}

export function PerkResults({
  onAddPerkToBuild,
  onAncientScrollPerkGroupsChange,
  onInspectPerkGroup,
  onOriginPerkGroupsChange,
  onRemovePerkFromBuild,
  onSelectPerk,
  pickedPerkRequirementById,
  perkResultListScrollResetKey,
  query,
  selectedPerk,
  setQuery,
  shouldIncludeAncientScrollPerkGroups,
  shouldIncludeOriginPerkGroups,
  visiblePerkResultSetKey,
  visiblePerks,
}: {
  onAddPerkToBuild: (perkId: string, requirement: BuildRequirement) => void
  onAncientScrollPerkGroupsChange: (shouldIncludeAncientScrollPerkGroups: boolean) => void
  onInspectPerkGroup: (categoryName: string, perkGroupId: string) => void
  onOriginPerkGroupsChange: (shouldIncludeOriginPerkGroups: boolean) => void
  onRemovePerkFromBuild: (perkId: string) => void
  onSelectPerk: (perkId: string) => void
  pickedPerkRequirementById: ReadonlyMap<string, BuildRequirement>
  perkResultListScrollResetKey: number
  query: string
  selectedPerk: LegendsPerkRecord | null
  setQuery: (query: string) => void
  shouldIncludeAncientScrollPerkGroups: boolean
  shouldIncludeOriginPerkGroups: boolean
  visiblePerkResultSetKey: string
  visiblePerks: LegendsPerkRecord[]
}) {
  const {
    emphasizedCategoryNames,
    emphasizedPerkGroupKeys,
    hoveredPerkPlacementCategoryNames,
    hoveredPerkPlacementPerkGroupKeys,
    hoveredPerkId,
    selectedEmphasisCategoryNames,
    selectedEmphasisPerkGroupKeys,
  } = usePlannerInteractionState()
  const {
    closePerkGroupHover: onClosePerkGroupHover,
    closeResultsPerkHover: onCloseResultsPerkHover,
    openPerkGroupHover: onOpenPerkGroupHover,
    openResultsPerkHover: onOpenResultsPerkHover,
  } = usePlannerInteractionActions()
  const [isPerkFilterMenuOpen, setIsPerkFilterMenuOpen] = useState(false)
  const [shouldUseDesktopPerkResultWindow, setShouldUseDesktopPerkResultWindow] = useState(
    getInitialShouldUseDesktopPerkResultWindow,
  )
  const [mobilePerkResultWindow, setMobilePerkResultWindow] = useState({
    resultSetKey: '',
    visiblePerkCount: mobilePerkResultBatchSize,
  })
  const [desktopPerkResultWindow, setDesktopPerkResultWindow] = useState({
    resultSetKey: '',
    visiblePerkCount: desktopInitialPerkResultBatchSize,
  })
  const perkFilterMenuId = useId()
  const perkFilterMenuRef = useRef<HTMLDivElement | null>(null)
  const resultsListRef = useRef<HTMLUListElement | null>(null)
  const effectiveMobileVisiblePerkCount =
    mobilePerkResultWindow.resultSetKey === visiblePerkResultSetKey
      ? mobilePerkResultWindow.visiblePerkCount
      : mobilePerkResultBatchSize
  const effectiveDesktopVisiblePerkCount =
    desktopPerkResultWindow.resultSetKey === visiblePerkResultSetKey
      ? desktopPerkResultWindow.visiblePerkCount
      : desktopInitialPerkResultBatchSize
  const displayedPerkCount = shouldUseDesktopPerkResultWindow
    ? effectiveDesktopVisiblePerkCount
    : effectiveMobileVisiblePerkCount
  const displayedPerks = visiblePerks.slice(0, displayedPerkCount)
  const hiddenMobilePerkCount = !shouldUseDesktopPerkResultWindow
    ? Math.max(visiblePerks.length - displayedPerks.length, 0)
    : 0
  const hasActivePerkSourceFilter =
    shouldIncludeOriginPerkGroups || shouldIncludeAncientScrollPerkGroups
  const nextMobilePerkResultBatchSize = Math.min(mobilePerkResultBatchSize, hiddenMobilePerkCount)

  function handleShowMoreMobilePerkResults() {
    setMobilePerkResultWindow({
      resultSetKey: visiblePerkResultSetKey,
      visiblePerkCount: Math.min(
        effectiveMobileVisiblePerkCount + mobilePerkResultBatchSize,
        visiblePerks.length,
      ),
    })
  }

  useEffect(() => {
    if (
      !shouldUseDesktopPerkResultWindow ||
      effectiveDesktopVisiblePerkCount >= visiblePerks.length
    ) {
      return
    }

    const desktopPerkResultBatchTimeout = window.setTimeout(() => {
      startTransition(() => {
        setDesktopPerkResultWindow((currentDesktopPerkResultWindow) => {
          const currentDesktopVisiblePerkCount =
            currentDesktopPerkResultWindow.resultSetKey === visiblePerkResultSetKey
              ? currentDesktopPerkResultWindow.visiblePerkCount
              : desktopInitialPerkResultBatchSize

          if (currentDesktopVisiblePerkCount >= visiblePerks.length) {
            return currentDesktopPerkResultWindow
          }

          return {
            resultSetKey: visiblePerkResultSetKey,
            visiblePerkCount: Math.min(
              currentDesktopVisiblePerkCount + desktopPerkResultBatchSize,
              visiblePerks.length,
            ),
          }
        })
      })
    }, desktopPerkResultBatchDelayMs)

    return () => {
      window.clearTimeout(desktopPerkResultBatchTimeout)
    }
  }, [
    effectiveDesktopVisiblePerkCount,
    shouldUseDesktopPerkResultWindow,
    visiblePerkResultSetKey,
    visiblePerks.length,
  ])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const mobilePerkResultMediaQueryList = window.matchMedia(mobilePerkResultMediaQuery)
    function handleMobilePerkResultMediaChange(event: { matches: boolean }) {
      setShouldUseDesktopPerkResultWindow(!event.matches)
    }

    handleMobilePerkResultMediaChange(mobilePerkResultMediaQueryList)
    mobilePerkResultMediaQueryList.addEventListener('change', handleMobilePerkResultMediaChange)

    return () => {
      mobilePerkResultMediaQueryList.removeEventListener(
        'change',
        handleMobilePerkResultMediaChange,
      )
    }
  }, [])

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

  useEffect(() => {
    const resultsList = resultsListRef.current

    if (resultsList === null) {
      return
    }

    if (typeof resultsList.scrollTo === 'function') {
      resultsList.scrollTo({
        top: 0,
      })
      return
    }

    resultsList.scrollTop = 0
  }, [perkResultListScrollResetKey, visiblePerkResultSetKey])

  return (
    <section className={styles.resultsPanel} aria-label="Perk results" data-testid="results-panel">
      <div className={styles.toolbar}>
        <ClearableSearchField
          clearLabel="Clear perk search"
          inputId="perk-results-search"
          label="Search perks"
          onValueChange={setQuery}
          placeholder="Search perks"
          testId="perk-results-search-field"
          trailingControl={
            <div
              className={sharedStyles.filterMenu}
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
                className={sharedStyles.filterButton}
                data-active-filter={hasActivePerkSourceFilter}
                data-perk-filter-button="true"
                data-testid="perk-filter-button"
                onClick={() =>
                  setIsPerkFilterMenuOpen((wasPerkFilterMenuOpen) => !wasPerkFilterMenuOpen)
                }
                type="button"
              >
                <FunnelIcon
                  className={sharedStyles.filterIcon}
                  isFilled={hasActivePerkSourceFilter}
                  testId="perk-filter-icon"
                />
              </button>
              {isPerkFilterMenuOpen ? (
                <div
                  aria-label="Perk filters"
                  className={sharedStyles.filterPopover}
                  id={perkFilterMenuId}
                  role="group"
                >
                  <label
                    className={sharedStyles.filterOption}
                    title={perkFilterTooltips.originPerkGroups}
                  >
                    <input
                      checked={shouldIncludeOriginPerkGroups}
                      data-testid="origin-perk-groups-checkbox"
                      onChange={(event) => onOriginPerkGroupsChange(event.target.checked)}
                      type="checkbox"
                    />
                    <span>Origin perk groups</span>
                  </label>
                  <label
                    className={sharedStyles.filterOption}
                    title={perkFilterTooltips.ancientScrollPerks}
                  >
                    <input
                      checked={shouldIncludeAncientScrollPerkGroups}
                      data-testid="ancient-scroll-perk-groups-checkbox"
                      onChange={(event) => onAncientScrollPerkGroupsChange(event.target.checked)}
                      type="checkbox"
                    />
                    <span>Ancient scroll perks</span>
                  </label>
                </div>
              ) : null}
            </div>
          }
          value={query}
        />
      </div>

      <ul
        className={joinClassNames(styles.resultsList, 'app-scrollbar')}
        data-scroll-container="true"
        data-testid="results-list"
        ref={resultsListRef}
      >
        {visiblePerks.length === 0 ? (
          <li className={sharedStyles.emptyState} data-testid="empty-state">
            <h2>No perks found</h2>
            <p>Try a broader search or switch the category filters.</p>
          </li>
        ) : (
          <>
            {displayedPerks.map((perk) => {
              const isSelected = perk.id === selectedPerk?.id
              const pickedRequirement = pickedPerkRequirementById.get(perk.id) ?? null
              const isPicked = pickedRequirement !== null
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
                      className: joinClassNames(
                        sharedStyles.perkIcon,
                        sharedStyles.perkIconSmall,
                        styles.perkRowIcon,
                      ),
                      imageWidth: gameIconImageWidths.row,
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
                        className={joinClassNames(styles.perkContext, styles.perkPlacementList)}
                        data-testid="perk-placement-list"
                      >
                        {renderPerkPlacements({
                          emphasizedCategoryNames,
                          emphasizedPerkGroupKeys,
                          hoveredPerkPlacementCategoryNames,
                          hoveredPerkPlacementPerkGroupKeys,
                          onClosePerkGroupHover,
                          onInspectPerkGroup,
                          onOpenPerkGroupHover,
                          perk,
                          query,
                          selectedEmphasisCategoryNames,
                          selectedEmphasisPerkGroupKeys,
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
                    onAddMustHave={() => onAddPerkToBuild(perk.id, 'must-have')}
                    onAddOptional={() => onAddPerkToBuild(perk.id, 'optional')}
                    onRemove={() => onRemovePerkFromBuild(perk.id)}
                    pickedRequirement={pickedRequirement}
                    perkName={perk.perkName}
                    source="results"
                  />
                </li>
              )
            })}
            {hiddenMobilePerkCount > 0 ? (
              <li className={styles.showMoreResultsItem}>
                <button
                  className={styles.showMoreResultsButton}
                  data-testid="show-more-results-button"
                  onClick={handleShowMoreMobilePerkResults}
                  type="button"
                >
                  {formatMorePerkResultsLabel(nextMobilePerkResultBatchSize)}
                </button>
              </li>
            ) : null}
          </>
        )}
      </ul>
    </section>
  )
}
