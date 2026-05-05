import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ComputeItemKey, VirtuosoHandle } from 'react-virtuoso'
import {
  getPerkDisplayIconPath,
  getPerkGroupHoverKey,
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
import { VirtualizedList } from './VirtualizedList'
import sharedStyles from './SharedControls.module.scss'
import styles from './PerkResults.module.scss'

const mobilePerkResultMediaQuery = '(max-width: 760px)'
const perkResultDefaultItemHeight = 244
const perkResultInitialItemCount = 18
const perkResultViewportIncrease = {
  bottom: 1800,
  top: 1200,
} as const
const perkResultMinimumOverscanItemCount = {
  bottom: 8,
  top: 5,
} as const
const perkResultOverscan = {
  main: 720,
  reverse: 420,
} as const
const perkFilterTooltips = {
  ancientScrollPerks: 'Shows perk groups that are only available through ancient scroll sources.',
  originPerkGroups: 'Shows perk groups that come only from origins and are hidden by default.',
} as const

const getPerkResultItemKey: ComputeItemKey<LegendsPerkRecord, unknown> = (_index, perk) => perk.id

function getInitialShouldUseWindowPerkResultScroll(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia(mobilePerkResultMediaQuery).matches
}

function getEstimatedPerkResultHeight(perk: LegendsPerkRecord): number {
  const previewTextLength = getPerkPreviewParagraphs(perk).join(' ').length
  const placementLineCount = Math.max(1, Math.ceil(perk.placements.length / 3))
  const previewLineCount = Math.ceil(previewTextLength / 82)
  const estimatedHeight = 116 + placementLineCount * 31 + previewLineCount * 22

  return Math.min(460, Math.max(142, estimatedHeight))
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

const PerkResultRow = memo(function PerkResultRow({
  emphasizedCategoryNames,
  emphasizedPerkGroupKeys,
  hoveredPerkId,
  hoveredPerkPlacementCategoryNames,
  hoveredPerkPlacementPerkGroupKeys,
  onAddPerkToBuild,
  onClosePerkGroupHover,
  onCloseResultsPerkHover,
  onInspectPerkGroup,
  onOpenPerkGroupHover,
  onOpenResultsPerkHover,
  onRemovePerkFromBuild,
  onSelectPerk,
  perk,
  pickedRequirement,
  query,
  selectedEmphasisCategoryNames,
  selectedEmphasisPerkGroupKeys,
  selectedPerkId,
}: {
  emphasizedCategoryNames: ReadonlySet<string>
  emphasizedPerkGroupKeys: ReadonlySet<string>
  hoveredPerkId: string | null
  hoveredPerkPlacementCategoryNames: ReadonlySet<string>
  hoveredPerkPlacementPerkGroupKeys: ReadonlySet<string>
  onAddPerkToBuild: (perkId: string, requirement: BuildRequirement) => void
  onClosePerkGroupHover: (perkGroupKey: string) => void
  onCloseResultsPerkHover: (perkId: string) => void
  onInspectPerkGroup: (categoryName: string, perkGroupId: string) => void
  onOpenPerkGroupHover: (categoryName: string, perkGroupId: string) => void
  onOpenResultsPerkHover: (perkId: string) => void
  onRemovePerkFromBuild: (perkId: string) => void
  onSelectPerk: (perkId: string) => void
  perk: LegendsPerkRecord
  pickedRequirement: BuildRequirement | null
  query: string
  selectedEmphasisCategoryNames: ReadonlySet<string>
  selectedEmphasisPerkGroupKeys: ReadonlySet<string>
  selectedPerkId: string | null
}) {
  const isSelected = perk.id === selectedPerkId
  const isPicked = pickedRequirement !== null
  const isHighlighted = hoveredPerkId === perk.id
  const previewParagraphs = getPerkPreviewParagraphs(perk)

  return (
    <div
      className={styles.perkRow}
      data-highlighted={isHighlighted}
      data-picked={isPicked}
      data-selected={isSelected}
      data-testid="perk-row"
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
    </div>
  )
})

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
  const [shouldUseWindowPerkResultScroll, setShouldUseWindowPerkResultScroll] = useState(
    getInitialShouldUseWindowPerkResultScroll,
  )
  const perkFilterMenuId = useId()
  const perkFilterMenuRef = useRef<HTMLDivElement | null>(null)
  const resultsListRef = useRef<HTMLElement | null>(null)
  const resultsListVirtuosoRef = useRef<VirtuosoHandle | null>(null)
  const perkResultHeightEstimates = useMemo(
    () => visiblePerks.map(getEstimatedPerkResultHeight),
    [visiblePerks],
  )
  const hasActivePerkSourceFilter =
    shouldIncludeOriginPerkGroups || shouldIncludeAncientScrollPerkGroups
  const emptyPerkResults = useMemo(
    () => (
      <div className={sharedStyles.emptyState} data-testid="empty-state" role="listitem">
        <h2>No perks found</h2>
        <p>Try a broader search or switch the category filters.</p>
      </div>
    ),
    [],
  )

  const setResultsListScrollerRef = useCallback((ref: HTMLElement | null | Window) => {
    resultsListRef.current = ref instanceof HTMLElement ? ref : null
  }, [])

  const renderPerkResult = useCallback(
    (_index: number, perk: LegendsPerkRecord) => (
      <PerkResultRow
        emphasizedCategoryNames={emphasizedCategoryNames}
        emphasizedPerkGroupKeys={emphasizedPerkGroupKeys}
        hoveredPerkId={hoveredPerkId}
        hoveredPerkPlacementCategoryNames={hoveredPerkPlacementCategoryNames}
        hoveredPerkPlacementPerkGroupKeys={hoveredPerkPlacementPerkGroupKeys}
        onAddPerkToBuild={onAddPerkToBuild}
        onClosePerkGroupHover={onClosePerkGroupHover}
        onCloseResultsPerkHover={onCloseResultsPerkHover}
        onInspectPerkGroup={onInspectPerkGroup}
        onOpenPerkGroupHover={onOpenPerkGroupHover}
        onOpenResultsPerkHover={onOpenResultsPerkHover}
        onRemovePerkFromBuild={onRemovePerkFromBuild}
        onSelectPerk={onSelectPerk}
        perk={perk}
        pickedRequirement={pickedPerkRequirementById.get(perk.id) ?? null}
        query={query}
        selectedEmphasisCategoryNames={selectedEmphasisCategoryNames}
        selectedEmphasisPerkGroupKeys={selectedEmphasisPerkGroupKeys}
        selectedPerkId={selectedPerk?.id ?? null}
      />
    ),
    [
      emphasizedCategoryNames,
      emphasizedPerkGroupKeys,
      hoveredPerkId,
      hoveredPerkPlacementCategoryNames,
      hoveredPerkPlacementPerkGroupKeys,
      onAddPerkToBuild,
      onClosePerkGroupHover,
      onCloseResultsPerkHover,
      onInspectPerkGroup,
      onOpenPerkGroupHover,
      onOpenResultsPerkHover,
      onRemovePerkFromBuild,
      onSelectPerk,
      pickedPerkRequirementById,
      query,
      selectedEmphasisCategoryNames,
      selectedEmphasisPerkGroupKeys,
      selectedPerk,
    ],
  )

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const mobilePerkResultMediaQueryList = window.matchMedia(mobilePerkResultMediaQuery)
    function handleMobilePerkResultMediaChange(event: { matches: boolean }) {
      setShouldUseWindowPerkResultScroll(event.matches)
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

    resultsListVirtuosoRef.current?.scrollTo({
      top: 0,
    })

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

      <VirtualizedList
        className={joinClassNames(styles.resultsListScroller, 'app-scrollbar')}
        computeItemKey={getPerkResultItemKey}
        data={visiblePerks}
        defaultItemHeight={perkResultDefaultItemHeight}
        emptyPlaceholder={emptyPerkResults}
        heightEstimates={perkResultHeightEstimates}
        increaseViewportBy={perkResultViewportIncrease}
        initialItemCount={perkResultInitialItemCount}
        itemClassName={styles.resultsListItem}
        itemContent={renderPerkResult}
        listClassName={styles.resultsList}
        minOverscanItemCount={perkResultMinimumOverscanItemCount}
        overscan={perkResultOverscan}
        scrollerRef={setResultsListScrollerRef}
        style={shouldUseWindowPerkResultScroll ? undefined : { height: '100%' }}
        testId="results-list"
        useWindowScroll={shouldUseWindowPerkResultScroll}
        virtuosoRef={resultsListVirtuosoRef}
      />
    </section>
  )
}
