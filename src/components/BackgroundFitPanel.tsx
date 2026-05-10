import {
  useDeferredValue,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import type { ComputeItemKey, VirtuosoHandle } from 'react-virtuoso'
import { joinClassNames } from '../lib/class-names'
import {
  usePlannerInteractionActions,
  usePlannerInteractionState,
} from '../lib/planner-interaction-context-values'
import type {
  BackgroundFitCalculationProgress,
  BackgroundFitView,
  RankedBackgroundFit,
} from '../lib/background-fit'
import { getBackgroundAccessPills } from '../lib/background-origin'
import {
  formatBackgroundVeteranPerkLevelIntervalFilterLabel,
  getBackgroundVeteranPerkLevelIntervals,
} from '../lib/background-veteran-perks'
import { getBackgroundFitKey, getBackgroundFitSearchText } from '../lib/perk-display'
import { BackgroundFitCard, BackgroundFitTargetPerkGroup } from './BackgroundFitCard'
import { BackgroundFitRailChevron, ClearableSearchField, FunnelIcon } from './SharedControls'
import { VirtualizedList } from './VirtualizedList'
import sharedStyles from './SharedControls.module.scss'
import styles from './BackgroundFitPanel.module.scss'

const backgroundFitDefaultItemHeight = 128
const backgroundFitInitialItemCount = 16
const backgroundFitViewportIncrease = {
  bottom: 1400,
  top: 900,
} as const
const backgroundFitMinimumOverscanItemCount = {
  bottom: 8,
  top: 5,
} as const
const backgroundFitOverscan = {
  main: 620,
  reverse: 360,
} as const
const emptyBackgroundFitView: BackgroundFitView = {
  rankedBackgroundFits: [],
  supportedBuildTargetPerkGroups: [],
  unsupportedBuildTargetPerkGroups: [],
}
const backgroundFilterTooltips = {
  eventBackgrounds:
    'Shows backgrounds that are not available from regular recruitment but can be gained from events, contracts, encounters, or settlement situations.',
  originBackgrounds:
    'Shows backgrounds that are not available from regular recruitment but can be gained from origin starts or origin hiring rosters.',
  studyBook:
    'Counts one eligible skill book when checking whether a background can reach the picked build.',
  studyScroll:
    'Counts one eligible ancient scroll when checking whether a background can reach the picked build.',
  secondStudyScroll:
    'Counts a second ancient scroll when Bright is available and the first scroll is allowed.',
} as const

const getBackgroundFitItemKey: ComputeItemKey<RankedBackgroundFit, unknown> = (
  _index,
  backgroundFit,
) => `${backgroundFit.backgroundId}-${backgroundFit.sourceFilePath}`

function getEstimatedBackgroundFitHeight(backgroundFit: RankedBackgroundFit): number {
  const metricCount =
    3 +
    (backgroundFit.fullBuildReachabilityProbability === null ? 0 : 1) +
    (backgroundFit.expectedCoveredOptionalPerkCount > 0 ? 1 : 0)
  const titleLineCount =
    backgroundFit.backgroundName.length + (backgroundFit.disambiguator?.length ?? 0) > 30 ? 2 : 1
  const estimatedHeight = 82 + metricCount * 20 + titleLineCount * 18

  return Math.min(190, Math.max(118, estimatedHeight))
}

function formatBackgroundVeteranPerkLevelIntervalFilterTitle(interval: number): string {
  if (interval === 2) {
    return 'Shows backgrounds that gain 1 perk point every 2 veteran levels after level 12. Random Solo and The Free Company origin overrides are excluded because they cover most backgrounds in the game and cause their starting brothers to use this interval.'
  }

  return `Shows backgrounds that gain 1 perk point every ${interval} veteran levels after level 12.`
}

function getClampedCheckedBackgroundCount(progress: BackgroundFitCalculationProgress): number {
  return Math.min(
    progress.totalBackgroundCount,
    Math.max(0, Math.floor(progress.checkedBackgroundCount)),
  )
}

function BackgroundFitProgressIndicator({
  progress,
}: {
  progress: BackgroundFitCalculationProgress
}) {
  const actualCheckedBackgroundCount = getClampedCheckedBackgroundCount(progress)
  const displayedProgressPercent =
    progress.totalBackgroundCount > 0
      ? Math.min(
          100,
          Math.max(0, (actualCheckedBackgroundCount / progress.totalBackgroundCount) * 100),
        )
      : 0
  const progressBarStyle = {
    '--background-fit-progress-value': `${displayedProgressPercent}%`,
  } as CSSProperties

  return (
    <>
      <p className={styles.backgroundFitProgressText}>
        Checking backgrounds {actualCheckedBackgroundCount}/{progress.totalBackgroundCount}.
      </p>
      <div
        aria-label="Background fit progress"
        aria-valuemax={progress.totalBackgroundCount}
        aria-valuemin={0}
        aria-valuenow={actualCheckedBackgroundCount}
        aria-valuetext={`${actualCheckedBackgroundCount}/${progress.totalBackgroundCount} backgrounds checked`}
        className={styles.backgroundFitProgressBar}
        role="progressbar"
      >
        <div
          aria-hidden="true"
          className={styles.backgroundFitProgressBarValue}
          style={progressBarStyle}
        />
      </div>
    </>
  )
}

export function BackgroundFitPanel({
  backgroundFitView,
  backgroundFitErrorMessage,
  backgroundFitProgress,
  isExpanded,
  isLoadingBackgroundFitView,
  onSelectBackgroundFit,
  onBackgroundStudyBookChange,
  onBackgroundStudyScrollChange,
  onBackgroundVeteranPerkLevelIntervalChange,
  onEventBackgroundsChange,
  onOriginBackgroundsChange,
  onSearchActivityChange,
  onSecondBackgroundStudyScrollChange,
  onToggleExpanded,
  mustHavePickedPerkCount,
  optionalPickedPerkCount,
  pickedPerkCount,
  shouldAllowBackgroundStudyBook,
  shouldAllowBackgroundStudyScroll,
  shouldAllowSecondBackgroundStudyScroll,
  availableBackgroundVeteranPerkLevelIntervals,
  selectedBackgroundVeteranPerkLevelIntervals,
  selectedBackgroundFitKey,
  shouldIncludeEventBackgrounds,
  shouldIncludeOriginBackgrounds,
}: {
  backgroundFitView: BackgroundFitView | null
  backgroundFitErrorMessage: string | null
  backgroundFitProgress: BackgroundFitCalculationProgress | null
  isExpanded: boolean
  isLoadingBackgroundFitView: boolean
  onSelectBackgroundFit: (backgroundFitKey: string) => void
  onBackgroundStudyBookChange: (shouldAllowBackgroundStudyBook: boolean) => void
  onBackgroundStudyScrollChange: (shouldAllowBackgroundStudyScroll: boolean) => void
  onBackgroundVeteranPerkLevelIntervalChange: (
    interval: number,
    shouldIncludeInterval: boolean,
  ) => void
  onEventBackgroundsChange: (shouldIncludeEventBackgrounds: boolean) => void
  onOriginBackgroundsChange: (shouldIncludeOriginBackgrounds: boolean) => void
  onSearchActivityChange: (hasActiveSearch: boolean) => void
  onSecondBackgroundStudyScrollChange: (shouldAllowSecondBackgroundStudyScroll: boolean) => void
  onToggleExpanded: () => void
  mustHavePickedPerkCount: number
  optionalPickedPerkCount: number
  pickedPerkCount: number
  shouldAllowBackgroundStudyBook: boolean
  shouldAllowBackgroundStudyScroll: boolean
  shouldAllowSecondBackgroundStudyScroll: boolean
  availableBackgroundVeteranPerkLevelIntervals: number[]
  selectedBackgroundVeteranPerkLevelIntervals: number[]
  selectedBackgroundFitKey: string | null
  shouldIncludeEventBackgrounds: boolean
  shouldIncludeOriginBackgrounds: boolean
}) {
  const { hoveredPerkId } = usePlannerInteractionState()
  const {
    clearPerkGroupHover: onClearPerkGroupHover,
    closeBuildPerkHover: onCloseBuildPerkHover,
    closeBuildPerkTooltip: onCloseBuildPerkTooltip,
  } = usePlannerInteractionActions()
  const effectiveBackgroundFitView = backgroundFitView ?? emptyBackgroundFitView
  const [backgroundFitInputValue, setBackgroundFitInputValue] = useState('')
  const [isBackgroundFilterMenuOpen, setIsBackgroundFilterMenuOpen] = useState(false)
  const deferredBackgroundFitQuery = useDeferredValue(backgroundFitInputValue)
  const backgroundFitFilterMenuId = useId()
  const backgroundFitResultsScrollRef = useRef<HTMLElement | null>(null)
  const backgroundFitResultsVirtuosoRef = useRef<VirtuosoHandle | null>(null)
  const backgroundFitFilterButtonRef = useRef<HTMLButtonElement | null>(null)
  const backgroundFitFilterMenuRef = useRef<HTMLDivElement | null>(null)
  const backgroundFitFilterPopoverRef = useRef<HTMLDivElement | null>(null)
  const [backgroundFitFilterPopoverPlacement, setBackgroundFitFilterPopoverPlacement] =
    useState<CSSProperties | null>(null)
  const hasPickedPerks = pickedPerkCount > 0
  const hasSupportedBackgroundFitTargets =
    effectiveBackgroundFitView.supportedBuildTargetPerkGroups.length > 0
  const hasUnsupportedBackgroundFitTargets =
    effectiveBackgroundFitView.unsupportedBuildTargetPerkGroups.length > 0
  const hasBuildReachabilityProbability = effectiveBackgroundFitView.rankedBackgroundFits.some(
    (backgroundFit) => backgroundFit.buildReachabilityProbability !== null,
  )
  const selectedBackgroundVeteranPerkLevelIntervalSet = useMemo(
    () => new Set(selectedBackgroundVeteranPerkLevelIntervals),
    [selectedBackgroundVeteranPerkLevelIntervals],
  )
  const hasActiveBackgroundFilter =
    shouldIncludeEventBackgrounds ||
    shouldIncludeOriginBackgrounds ||
    shouldAllowBackgroundStudyBook ||
    shouldAllowBackgroundStudyScroll ||
    (shouldAllowBackgroundStudyScroll && shouldAllowSecondBackgroundStudyScroll) ||
    selectedBackgroundVeteranPerkLevelIntervalSet.size > 0
  const hasActiveBackgroundFitSearch = backgroundFitInputValue.trim().length > 0
  const shouldShowInitialBackgroundFitIdleState =
    backgroundFitView === null && !hasPickedPerks && !hasActiveBackgroundFitSearch
  const shouldShowBackgroundFitRankingStatus =
    hasPickedPerks && (isLoadingBackgroundFitView || hasSupportedBackgroundFitTargets)
  const backgroundFitRankingSummaryText =
    isLoadingBackgroundFitView || hasBuildReachabilityProbability
      ? 'Ranked by must-have build chance.'
      : 'Ranked by expected perks pickable.'
  const normalizedBackgroundFitQuery = deferredBackgroundFitQuery.trim().toLowerCase()
  const backgroundFitEmptyResultTarget =
    normalizedBackgroundFitQuery.length > 0
      ? `"${deferredBackgroundFitQuery.trim()}"`
      : 'the selected filters'
  const visibleRankedBackgroundFits = useMemo(
    () =>
      effectiveBackgroundFitView.rankedBackgroundFits.filter((backgroundFit) => {
        const backgroundAccessPills = getBackgroundAccessPills(backgroundFit)

        if (backgroundAccessPills.length > 0) {
          const shouldIncludeSpecialBackground = backgroundAccessPills.some(
            (backgroundAccessPill) =>
              (shouldIncludeOriginBackgrounds && backgroundAccessPill.kind === 'origin') ||
              (shouldIncludeEventBackgrounds && backgroundAccessPill.kind === 'event'),
          )

          if (!shouldIncludeSpecialBackground) {
            return false
          }
        }

        if (
          !getBackgroundVeteranPerkLevelIntervals(backgroundFit).some((interval) =>
            selectedBackgroundVeteranPerkLevelIntervalSet.has(interval),
          )
        ) {
          return false
        }

        return (
          normalizedBackgroundFitQuery.length === 0 ||
          getBackgroundFitSearchText(backgroundFit).includes(normalizedBackgroundFitQuery)
        )
      }),
    [
      effectiveBackgroundFitView,
      normalizedBackgroundFitQuery,
      selectedBackgroundVeteranPerkLevelIntervalSet,
      shouldIncludeEventBackgrounds,
      shouldIncludeOriginBackgrounds,
    ],
  )
  const rankedBackgroundFitIndexByKey = useMemo(
    () =>
      new Map(
        effectiveBackgroundFitView.rankedBackgroundFits.map((backgroundFit, backgroundFitIndex) => [
          getBackgroundFitKey(backgroundFit),
          backgroundFitIndex,
        ]),
      ),
    [effectiveBackgroundFitView],
  )
  const backgroundFitHeightEstimates = useMemo(
    () => visibleRankedBackgroundFits.map(getEstimatedBackgroundFitHeight),
    [visibleRankedBackgroundFits],
  )

  const setBackgroundFitResultsScrollerRef = useCallback((ref: HTMLElement | null | Window) => {
    backgroundFitResultsScrollRef.current = ref instanceof HTMLElement ? ref : null
  }, [])

  const clearBackgroundFitInteractiveHover = useCallback(() => {
    onClearPerkGroupHover()
    onCloseBuildPerkTooltip()

    if (hoveredPerkId !== null) {
      onCloseBuildPerkHover(hoveredPerkId)
    }
  }, [hoveredPerkId, onClearPerkGroupHover, onCloseBuildPerkHover, onCloseBuildPerkTooltip])

  const updateBackgroundFitFilterPopoverPlacement = useCallback(() => {
    const filterButton = backgroundFitFilterButtonRef.current
    const filterPopover = backgroundFitFilterPopoverRef.current

    if (filterButton === null || filterPopover === null) {
      return
    }

    const filterButtonRectangle = filterButton.getBoundingClientRect()
    const filterPopoverRectangle = filterPopover.getBoundingClientRect()
    const viewportMargin = 8
    const popoverGap = 8
    const maximumLeft = Math.max(
      viewportMargin,
      window.innerWidth - viewportMargin - filterPopoverRectangle.width,
    )
    const left = Math.min(
      maximumLeft,
      Math.max(viewportMargin, filterButtonRectangle.right - filterPopoverRectangle.width),
    )
    const topBelowButton = filterButtonRectangle.bottom + popoverGap
    const topAboveButton = filterButtonRectangle.top - filterPopoverRectangle.height - popoverGap
    const hasRoomBelow =
      topBelowButton + filterPopoverRectangle.height <= window.innerHeight - viewportMargin
    const top = hasRoomBelow
      ? topBelowButton
      : Math.max(
          viewportMargin,
          Math.min(
            topAboveButton,
            window.innerHeight - viewportMargin - filterPopoverRectangle.height,
          ),
        )

    setBackgroundFitFilterPopoverPlacement({
      left,
      top,
    })
  }, [])

  const closeBackgroundFitFilterMenu = useCallback(() => {
    setIsBackgroundFilterMenuOpen(false)
    setBackgroundFitFilterPopoverPlacement(null)
  }, [])

  const renderBackgroundFit = useCallback(
    (backgroundFitIndex: number, backgroundFit: RankedBackgroundFit) => (
      <BackgroundFitCard
        backgroundFit={backgroundFit}
        isSelected={selectedBackgroundFitKey === getBackgroundFitKey(backgroundFit)}
        mustHavePickedPerkCount={mustHavePickedPerkCount}
        onSelect={(backgroundFitKey: string) => {
          clearBackgroundFitInteractiveHover()
          onSelectBackgroundFit(backgroundFitKey)
        }}
        optionalPickedPerkCount={optionalPickedPerkCount}
        pickedPerkCount={pickedPerkCount}
        query={deferredBackgroundFitQuery}
        rank={
          rankedBackgroundFitIndexByKey.get(getBackgroundFitKey(backgroundFit)) ??
          backgroundFitIndex
        }
        studyResourceFilter={{
          shouldAllowBook: shouldAllowBackgroundStudyBook,
          shouldAllowScroll: shouldAllowBackgroundStudyScroll,
          shouldAllowSecondScroll: shouldAllowSecondBackgroundStudyScroll,
        }}
      />
    ),
    [
      clearBackgroundFitInteractiveHover,
      deferredBackgroundFitQuery,
      mustHavePickedPerkCount,
      onSelectBackgroundFit,
      optionalPickedPerkCount,
      pickedPerkCount,
      rankedBackgroundFitIndexByKey,
      selectedBackgroundFitKey,
      shouldAllowBackgroundStudyBook,
      shouldAllowBackgroundStudyScroll,
      shouldAllowSecondBackgroundStudyScroll,
    ],
  )

  useEffect(() => {
    if (!isExpanded) {
      return
    }

    const backgroundFitResultsScroll = backgroundFitResultsScrollRef.current

    backgroundFitResultsVirtuosoRef.current?.scrollTo({
      top: 0,
    })

    if (backgroundFitResultsScroll === null) {
      return
    }

    if (typeof backgroundFitResultsScroll.scrollTo === 'function') {
      backgroundFitResultsScroll.scrollTo({
        top: 0,
      })
      return
    }

    backgroundFitResultsScroll.scrollTop = 0
  }, [
    isExpanded,
    normalizedBackgroundFitQuery,
    selectedBackgroundVeteranPerkLevelIntervalSet,
    shouldIncludeEventBackgrounds,
    shouldIncludeOriginBackgrounds,
  ])

  useEffect(() => {
    if (!isBackgroundFilterMenuOpen) {
      return
    }

    function handleDocumentPointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        (backgroundFitFilterMenuRef.current?.contains(event.target) ||
          backgroundFitFilterPopoverRef.current?.contains(event.target))
      ) {
        return
      }

      closeBackgroundFitFilterMenu()
    }

    document.addEventListener('pointerdown', handleDocumentPointerDown)

    return () => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown)
    }
  }, [closeBackgroundFitFilterMenu, isBackgroundFilterMenuOpen])

  useLayoutEffect(() => {
    if (!isBackgroundFilterMenuOpen) {
      return
    }

    updateBackgroundFitFilterPopoverPlacement()

    window.addEventListener('resize', updateBackgroundFitFilterPopoverPlacement)
    window.addEventListener('scroll', updateBackgroundFitFilterPopoverPlacement, true)

    return () => {
      window.removeEventListener('resize', updateBackgroundFitFilterPopoverPlacement)
      window.removeEventListener('scroll', updateBackgroundFitFilterPopoverPlacement, true)
    }
  }, [isBackgroundFilterMenuOpen, updateBackgroundFitFilterPopoverPlacement])

  return (
    <>
      <aside
        aria-label="Background fit"
        className={styles.backgroundFitPanel}
        data-expanded={isExpanded}
        data-testid="background-fit-panel"
      >
        <div
          aria-hidden={!isExpanded}
          className={styles.backgroundFitPanelBody}
          data-testid="background-fit-panel-content"
          inert={isExpanded ? undefined : true}
        >
          <h2 className="visually-hidden">Ranked backgrounds</h2>
          <ClearableSearchField
            className={styles.backgroundFitSearchField}
            clearLabel="Clear background search"
            inputId="background-fit-search"
            label="Search backgrounds"
            onValueChange={(nextValue) => {
              clearBackgroundFitInteractiveHover()
              setBackgroundFitInputValue(nextValue)
              onSearchActivityChange(nextValue.trim().length > 0)
            }}
            placeholder="Search backgrounds"
            testId="background-fit-search-field"
            trailingControl={
              <div
                className={sharedStyles.filterMenu}
                onKeyDown={(event) => {
                  if (event.key !== 'Escape') {
                    return
                  }

                  event.preventDefault()
                  closeBackgroundFitFilterMenu()
                  backgroundFitFilterButtonRef.current?.focus()
                }}
                ref={backgroundFitFilterMenuRef}
              >
                <button
                  aria-controls={backgroundFitFilterMenuId}
                  aria-expanded={isBackgroundFilterMenuOpen}
                  aria-label="Filter backgrounds"
                  className={sharedStyles.filterButton}
                  data-active-filter={hasActiveBackgroundFilter}
                  data-background-fit-filter-button="true"
                  data-testid="background-fit-filter-button"
                  onClick={() => {
                    clearBackgroundFitInteractiveHover()

                    if (isBackgroundFilterMenuOpen) {
                      closeBackgroundFitFilterMenu()
                      return
                    }

                    setBackgroundFitFilterPopoverPlacement(null)
                    setIsBackgroundFilterMenuOpen(true)
                  }}
                  ref={backgroundFitFilterButtonRef}
                  type="button"
                >
                  <FunnelIcon
                    className={sharedStyles.filterIcon}
                    isFilled={hasActiveBackgroundFilter}
                    testId="background-fit-filter-icon"
                  />
                </button>
                {isBackgroundFilterMenuOpen && typeof document !== 'undefined'
                  ? createPortal(
                      <div
                        aria-label="Background filters"
                        className={joinClassNames(
                          sharedStyles.filterPopover,
                          styles.backgroundFitFilterPopover,
                        )}
                        id={backgroundFitFilterMenuId}
                        onKeyDown={(event) => {
                          if (event.key !== 'Escape') {
                            return
                          }

                          event.preventDefault()
                          closeBackgroundFitFilterMenu()
                          backgroundFitFilterButtonRef.current?.focus()
                        }}
                        ref={backgroundFitFilterPopoverRef}
                        role="group"
                        style={backgroundFitFilterPopoverPlacement ?? undefined}
                      >
                        <label
                          className={sharedStyles.filterOption}
                          title={backgroundFilterTooltips.originBackgrounds}
                        >
                          <input
                            checked={shouldIncludeOriginBackgrounds}
                            data-testid="origin-backgrounds-checkbox"
                            onChange={(event) => {
                              clearBackgroundFitInteractiveHover()
                              onOriginBackgroundsChange(event.target.checked)
                            }}
                            type="checkbox"
                          />
                          <span>Origin backgrounds</span>
                        </label>
                        <label
                          className={sharedStyles.filterOption}
                          title={backgroundFilterTooltips.eventBackgrounds}
                        >
                          <input
                            checked={shouldIncludeEventBackgrounds}
                            data-testid="event-backgrounds-checkbox"
                            onChange={(event) => {
                              clearBackgroundFitInteractiveHover()
                              onEventBackgroundsChange(event.target.checked)
                            }}
                            type="checkbox"
                          />
                          <span>Event backgrounds</span>
                        </label>
                        <label
                          className={sharedStyles.filterOption}
                          title={backgroundFilterTooltips.studyBook}
                        >
                          <input
                            checked={shouldAllowBackgroundStudyBook}
                            data-testid="background-study-book-checkbox"
                            onChange={(event) => {
                              clearBackgroundFitInteractiveHover()
                              onBackgroundStudyBookChange(event.target.checked)
                            }}
                            type="checkbox"
                          />
                          <span>Allow a book</span>
                        </label>
                        <label
                          className={sharedStyles.filterOption}
                          title={backgroundFilterTooltips.studyScroll}
                        >
                          <input
                            checked={shouldAllowBackgroundStudyScroll}
                            data-testid="background-study-scroll-checkbox"
                            onChange={(event) => {
                              clearBackgroundFitInteractiveHover()
                              onBackgroundStudyScrollChange(event.target.checked)
                            }}
                            type="checkbox"
                          />
                          <span>Allow a scroll</span>
                        </label>
                        <label
                          className={sharedStyles.filterOption}
                          title={backgroundFilterTooltips.secondStudyScroll}
                        >
                          <input
                            checked={
                              shouldAllowBackgroundStudyScroll &&
                              shouldAllowSecondBackgroundStudyScroll
                            }
                            data-testid="background-study-second-scroll-checkbox"
                            disabled={!shouldAllowBackgroundStudyScroll}
                            onChange={(event) => {
                              clearBackgroundFitInteractiveHover()
                              onSecondBackgroundStudyScrollChange(event.target.checked)
                            }}
                            type="checkbox"
                          />
                          <span>Allow two scrolls</span>
                        </label>
                        {availableBackgroundVeteranPerkLevelIntervals.map((interval) => (
                          <label
                            className={sharedStyles.filterOption}
                            key={interval}
                            title={formatBackgroundVeteranPerkLevelIntervalFilterTitle(interval)}
                          >
                            <input
                              checked={selectedBackgroundVeteranPerkLevelIntervalSet.has(interval)}
                              data-testid={`background-veteran-perk-${interval}-checkbox`}
                              onChange={(event) => {
                                clearBackgroundFitInteractiveHover()
                                onBackgroundVeteranPerkLevelIntervalChange(
                                  interval,
                                  event.target.checked,
                                )
                              }}
                              type="checkbox"
                            />
                            <span>
                              {formatBackgroundVeteranPerkLevelIntervalFilterLabel(interval)}
                            </span>
                          </label>
                        ))}
                      </div>,
                      document.body,
                    )
                  : null}
              </div>
            }
            value={backgroundFitInputValue}
          />
          {shouldShowBackgroundFitRankingStatus ? (
            <div
              className={styles.backgroundFitStatus}
              data-testid="background-fit-status"
              data-loading={isLoadingBackgroundFitView}
            >
              <p
                aria-hidden={isLoadingBackgroundFitView}
                className={styles.backgroundFitRankingSummary}
                data-testid="background-fit-ranking-summary"
              >
                {backgroundFitRankingSummaryText}
              </p>
              <div
                aria-hidden={!isLoadingBackgroundFitView}
                className={styles.backgroundFitLoadingSlot}
                data-testid="background-fit-loading-slot"
              >
                {isLoadingBackgroundFitView &&
                backgroundFitProgress &&
                backgroundFitProgress.totalBackgroundCount > 0 ? (
                  <BackgroundFitProgressIndicator progress={backgroundFitProgress} />
                ) : isLoadingBackgroundFitView ? (
                  <p className={styles.backgroundFitProgressText}>Calculating background fits.</p>
                ) : null}
              </div>
            </div>
          ) : !hasPickedPerks || hasSupportedBackgroundFitTargets ? null : (
            <div className={styles.backgroundFitEmptyState}>
              <p className={styles.backgroundFitSummaryCopy}>
                {hasUnsupportedBackgroundFitTargets
                  ? 'This build only contains unsupported categories for dynamic background perk groups.'
                  : 'Pick perks from Weapon, Defense, Traits, Enemy, Class, Profession, or Magic to rank backgrounds exactly.'}
              </p>
              {hasUnsupportedBackgroundFitTargets ? (
                <>
                  <p className={styles.backgroundFitSectionLabel}>Unsupported build perk groups</p>
                  <p className={styles.backgroundFitSummaryCopy}>
                    Background dynamic perk groups only roll Weapon, Defense, Traits, Enemy, Class,
                    Profession, and Magic.
                  </p>
                  <ul className={styles.backgroundFitTargetList} data-unsupported="true">
                    {effectiveBackgroundFitView.unsupportedBuildTargetPerkGroups.map(
                      (buildTargetPerkGroup) => (
                        <BackgroundFitTargetPerkGroup
                          buildTargetPerkGroup={buildTargetPerkGroup}
                          key={`unsupported-${buildTargetPerkGroup.categoryName}-${buildTargetPerkGroup.perkGroupId}`}
                        />
                      ),
                    )}
                  </ul>
                </>
              ) : null}
            </div>
          )}
          {backgroundFitErrorMessage === null && visibleRankedBackgroundFits.length > 0 ? (
            <VirtualizedList
              className={joinClassNames(styles.backgroundFitResultsScroll, 'app-scrollbar')}
              computeItemKey={getBackgroundFitItemKey}
              data={visibleRankedBackgroundFits}
              defaultItemHeight={backgroundFitDefaultItemHeight}
              heightEstimates={backgroundFitHeightEstimates}
              increaseViewportBy={backgroundFitViewportIncrease}
              initialItemCount={backgroundFitInitialItemCount}
              isAriaHidden={!isExpanded}
              itemClassName={styles.backgroundFitRankingItem}
              itemContent={renderBackgroundFit}
              listClassName={styles.backgroundFitRanking}
              minOverscanItemCount={backgroundFitMinimumOverscanItemCount}
              onScroll={clearBackgroundFitInteractiveHover}
              overscan={backgroundFitOverscan}
              scrollerRef={setBackgroundFitResultsScrollerRef}
              style={{ height: '100%' }}
              testId="background-fit-panel-body"
              virtuosoRef={backgroundFitResultsVirtuosoRef}
            />
          ) : (
            <div
              aria-hidden={!isExpanded}
              className={joinClassNames(styles.backgroundFitResultsScroll, 'app-scrollbar')}
              data-scroll-container="true"
              data-testid="background-fit-panel-body"
              onScrollCapture={() => {
                clearBackgroundFitInteractiveHover()
              }}
              ref={(ref) => {
                backgroundFitResultsScrollRef.current = ref
              }}
            >
              {backgroundFitErrorMessage !== null ? (
                <div className={styles.backgroundFitEmptyState}>
                  <p className={styles.backgroundFitSummaryCopy}>{backgroundFitErrorMessage}</p>
                </div>
              ) : isLoadingBackgroundFitView || shouldShowInitialBackgroundFitIdleState ? null : (
                <div className={styles.backgroundFitEmptyState}>
                  <p className={styles.backgroundFitSummaryCopy}>
                    No backgrounds match {backgroundFitEmptyResultTarget}.
                  </p>
                  <p className={styles.backgroundFitSummaryCopy}>
                    Try a different background name or clear the search.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} background fit`}
          className={styles.backgroundFitRailButton}
          onClick={() => {
            clearBackgroundFitInteractiveHover()
            onToggleExpanded()
          }}
          type="button"
        >
          <span aria-hidden="true" className={styles.backgroundFitRailButtonIcon}>
            <BackgroundFitRailChevron
              className={styles.backgroundFitRailChevron}
              isExpanded={isExpanded}
            />
          </span>
          <span aria-hidden="true" className={styles.backgroundFitRailButtonLabel}>
            Background fit
          </span>
        </button>
      </aside>
    </>
  )
}
