import {
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { joinClassNames } from '../lib/class-names'
import type { BackgroundFitCalculationProgress, BackgroundFitView } from '../lib/background-fit'
import { isOriginBackgroundFit } from '../lib/background-origin'
import { formatBackgroundVeteranPerkLevelIntervalFilterLabel } from '../lib/background-veteran-perks'
import { getBackgroundFitKey, getBackgroundFitSearchText } from '../lib/perk-display'
import { BackgroundFitCard, BackgroundFitTargetPerkGroup } from './BackgroundFitCard'
import { BackgroundFitRailChevron, ClearableSearchField, FunnelIcon } from './SharedControls'
import sharedStyles from './SharedControls.module.scss'
import styles from './BackgroundFitPanel.module.scss'

const emptyBackgroundFitView: BackgroundFitView = {
  rankedBackgroundFits: [],
  supportedBuildTargetPerkGroups: [],
  unsupportedBuildTargetPerkGroups: [],
}
const backgroundFitProgressCountMinimumStepDurationMs = 10
const backgroundFilterTooltips = {
  originBackgrounds: 'Shows origin-only backgrounds hidden from the default results.',
  studyBook: 'Counts one eligible skill book when checking whether a background can reach the picked build.',
  studyScroll:
    'Counts one eligible ancient scroll when checking whether a background can reach the picked build.',
  secondStudyScroll:
    'Counts a second ancient scroll when Bright is available and the first scroll is allowed.',
} as const

function formatBackgroundVeteranPerkLevelIntervalFilterTitle(interval: number): string {
  return `Shows backgrounds that gain 1 perk point every ${interval} veteran levels after level 12.`
}

function getClampedCheckedBackgroundCount(progress: BackgroundFitCalculationProgress): number {
  return Math.min(
    progress.totalBackgroundCount,
    Math.max(0, Math.floor(progress.checkedBackgroundCount)),
  )
}

function useDisplayedCheckedBackgroundCount(progress: BackgroundFitCalculationProgress): number {
  const targetCheckedBackgroundCount = getClampedCheckedBackgroundCount(progress)
  const [displayedCheckedBackgroundCount, setDisplayedCheckedBackgroundCount] = useState(0)
  const displayedCheckedBackgroundCountRef = useRef(0)
  const progressIntervalIdRef = useRef<number | null>(null)
  const targetCheckedBackgroundCountRef = useRef(targetCheckedBackgroundCount)

  useEffect(() => {
    function clearProgressInterval() {
      if (progressIntervalIdRef.current === null) {
        return
      }

      window.clearInterval(progressIntervalIdRef.current)
      progressIntervalIdRef.current = null
    }

    targetCheckedBackgroundCountRef.current = Math.max(
      displayedCheckedBackgroundCountRef.current,
      targetCheckedBackgroundCount,
    )

    if (
      displayedCheckedBackgroundCountRef.current >= targetCheckedBackgroundCountRef.current ||
      progressIntervalIdRef.current !== null
    ) {
      return
    }

    progressIntervalIdRef.current = window.setInterval(() => {
      let shouldClearProgressInterval = false

      setDisplayedCheckedBackgroundCount((currentCheckedBackgroundCount) => {
        if (currentCheckedBackgroundCount >= targetCheckedBackgroundCountRef.current) {
          displayedCheckedBackgroundCountRef.current = currentCheckedBackgroundCount
          shouldClearProgressInterval = true

          return currentCheckedBackgroundCount
        }

        const nextCheckedBackgroundCount = Math.min(
          currentCheckedBackgroundCount + 1,
          targetCheckedBackgroundCountRef.current,
        )

        displayedCheckedBackgroundCountRef.current = nextCheckedBackgroundCount
        shouldClearProgressInterval =
          nextCheckedBackgroundCount >= targetCheckedBackgroundCountRef.current

        return nextCheckedBackgroundCount
      })

      if (shouldClearProgressInterval) {
        clearProgressInterval()
      }
    }, backgroundFitProgressCountMinimumStepDurationMs)
  }, [targetCheckedBackgroundCount])

  useEffect(
    () => () => {
      if (progressIntervalIdRef.current !== null) {
        window.clearInterval(progressIntervalIdRef.current)
        progressIntervalIdRef.current = null
      }
    },
    [],
  )

  return displayedCheckedBackgroundCount
}

function BackgroundFitProgressIndicator({
  progress,
}: {
  progress: BackgroundFitCalculationProgress
}) {
  const displayedCheckedBackgroundCount = useDisplayedCheckedBackgroundCount(progress)
  const actualCheckedBackgroundCount = getClampedCheckedBackgroundCount(progress)
  const displayedProgressPercent =
    progress.totalBackgroundCount > 0
      ? Math.min(
          100,
          Math.max(0, (displayedCheckedBackgroundCount / progress.totalBackgroundCount) * 100),
        )
      : 0
  const progressBarStyle = {
    '--background-fit-progress-value': `${displayedProgressPercent}%`,
  } as CSSProperties

  return (
    <>
      <p className={styles.backgroundFitProgressText}>
        Checking backgrounds {displayedCheckedBackgroundCount}/{progress.totalBackgroundCount}.
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
  hoveredPerkId,
  backgroundFitErrorMessage,
  backgroundFitProgress,
  isExpanded,
  isLoadingBackgroundFitView,
  onCloseBuildPerkHover,
  onCloseBuildPerkTooltip,
  onClearPerkGroupHover,
  onSelectBackgroundFit,
  onBackgroundStudyBookChange,
  onBackgroundStudyScrollChange,
  onBackgroundVeteranPerkLevelIntervalChange,
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
  shouldIncludeOriginBackgrounds,
}: {
  backgroundFitView: BackgroundFitView | null
  hoveredPerkId: string | null
  backgroundFitErrorMessage: string | null
  backgroundFitProgress: BackgroundFitCalculationProgress | null
  isExpanded: boolean
  isLoadingBackgroundFitView: boolean
  onCloseBuildPerkHover: (perkId: string) => void
  onCloseBuildPerkTooltip: () => void
  onClearPerkGroupHover: () => void
  onSelectBackgroundFit: (backgroundFitKey: string) => void
  onBackgroundStudyBookChange: (shouldAllowBackgroundStudyBook: boolean) => void
  onBackgroundStudyScrollChange: (shouldAllowBackgroundStudyScroll: boolean) => void
  onBackgroundVeteranPerkLevelIntervalChange: (
    interval: number,
    shouldIncludeInterval: boolean,
  ) => void
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
  shouldIncludeOriginBackgrounds: boolean
}) {
  const effectiveBackgroundFitView = backgroundFitView ?? emptyBackgroundFitView
  const [backgroundFitInputValue, setBackgroundFitInputValue] = useState('')
  const [isBackgroundFilterMenuOpen, setIsBackgroundFilterMenuOpen] = useState(false)
  const deferredBackgroundFitQuery = useDeferredValue(backgroundFitInputValue)
  const backgroundFitFilterMenuId = useId()
  const backgroundFitResultsScrollRef = useRef<HTMLDivElement | null>(null)
  const backgroundFitFilterMenuRef = useRef<HTMLDivElement | null>(null)
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
    shouldIncludeOriginBackgrounds ||
    shouldAllowBackgroundStudyBook ||
    shouldAllowBackgroundStudyScroll ||
    (shouldAllowBackgroundStudyScroll && shouldAllowSecondBackgroundStudyScroll) ||
    selectedBackgroundVeteranPerkLevelIntervalSet.size > 0
  const hasActiveBackgroundFitSearch = backgroundFitInputValue.trim().length > 0
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
        if (!shouldIncludeOriginBackgrounds && isOriginBackgroundFit(backgroundFit)) {
          return false
        }

        if (
          !selectedBackgroundVeteranPerkLevelIntervalSet.has(backgroundFit.veteranPerkLevelInterval)
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

  function clearBackgroundFitInteractiveHover() {
    onClearPerkGroupHover()
    onCloseBuildPerkTooltip()

    if (hoveredPerkId !== null) {
      onCloseBuildPerkHover(hoveredPerkId)
    }
  }

  useEffect(() => {
    onSearchActivityChange(hasActiveBackgroundFitSearch)
  }, [hasActiveBackgroundFitSearch, onSearchActivityChange])

  useEffect(() => {
    if (!isExpanded) {
      return
    }

    const backgroundFitResultsScroll = backgroundFitResultsScrollRef.current

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
    shouldIncludeOriginBackgrounds,
  ])

  useEffect(() => {
    if (!isBackgroundFilterMenuOpen) {
      return
    }

    function handleDocumentPointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        backgroundFitFilterMenuRef.current?.contains(event.target)
      ) {
        return
      }

      setIsBackgroundFilterMenuOpen(false)
    }

    document.addEventListener('pointerdown', handleDocumentPointerDown)

    return () => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown)
    }
  }, [isBackgroundFilterMenuOpen])

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
          <ClearableSearchField
            className={styles.backgroundFitSearchField}
            clearLabel="Clear background search"
            inputId="background-fit-search"
            label="Search backgrounds"
            onValueChange={(nextValue) => {
              clearBackgroundFitInteractiveHover()
              setBackgroundFitInputValue(nextValue)
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
                  setIsBackgroundFilterMenuOpen(false)
                  event.currentTarget
                    .querySelector<HTMLButtonElement>('[data-background-fit-filter-button="true"]')
                    ?.focus()
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
                    setIsBackgroundFilterMenuOpen(
                      (wasBackgroundFilterMenuOpen) => !wasBackgroundFilterMenuOpen,
                    )
                  }}
                  type="button"
                >
                  <FunnelIcon
                    className={sharedStyles.filterIcon}
                    isFilled={hasActiveBackgroundFilter}
                    testId="background-fit-filter-icon"
                  />
                </button>
                {isBackgroundFilterMenuOpen ? (
                  <div
                    aria-label="Background filters"
                    className={sharedStyles.filterPopover}
                    id={backgroundFitFilterMenuId}
                    role="group"
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
                          shouldAllowBackgroundStudyScroll && shouldAllowSecondBackgroundStudyScroll
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
                        <span>{formatBackgroundVeteranPerkLevelIntervalFilterLabel(interval)}</span>
                      </label>
                    ))}
                  </div>
                ) : null}
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
          <div
            aria-hidden={!isExpanded}
            className={joinClassNames(styles.backgroundFitResultsScroll, 'app-scrollbar')}
            data-scroll-container="true"
            data-testid="background-fit-panel-body"
            onScrollCapture={() => {
              clearBackgroundFitInteractiveHover()
            }}
            ref={backgroundFitResultsScrollRef}
          >
            {backgroundFitErrorMessage !== null ? (
              <div className={styles.backgroundFitEmptyState}>
                <p className={styles.backgroundFitSummaryCopy}>{backgroundFitErrorMessage}</p>
              </div>
            ) : (
              <>
                {visibleRankedBackgroundFits.length > 0 ? (
                  <ol className={styles.backgroundFitRanking} data-testid="background-fit-ranking">
                    {visibleRankedBackgroundFits.map((backgroundFit, backgroundFitIndex) => (
                      <li key={`${backgroundFit.backgroundId}-${backgroundFit.sourceFilePath}`}>
                        <BackgroundFitCard
                          backgroundFit={backgroundFit}
                          onClearPerkGroupHover={onClearPerkGroupHover}
                          onSelect={(backgroundFitKey: string) => {
                            clearBackgroundFitInteractiveHover()
                            onSelectBackgroundFit(backgroundFitKey)
                          }}
                          isSelected={
                            selectedBackgroundFitKey === getBackgroundFitKey(backgroundFit)
                          }
                          mustHavePickedPerkCount={mustHavePickedPerkCount}
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
                      </li>
                    ))}
                  </ol>
                ) : isLoadingBackgroundFitView ? null : (
                  <div className={styles.backgroundFitEmptyState}>
                    <p className={styles.backgroundFitSummaryCopy}>
                      No backgrounds match {backgroundFitEmptyResultTarget}.
                    </p>
                    <p className={styles.backgroundFitSummaryCopy}>
                      Try a different background name or clear the search.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
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
