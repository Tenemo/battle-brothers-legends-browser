import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react'
import { joinClassNames } from '../lib/class-names'
import type { BackgroundFitView } from '../lib/background-fit'
import { isOriginBackgroundFit } from '../lib/background-origin'
import {
  areBackgroundVeteranPerkLevelIntervalsDefault,
  formatBackgroundVeteranPerkLevelIntervalFilterLabel,
} from '../lib/background-veteran-perks'
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

export function BackgroundFitPanel({
  backgroundFitView,
  emphasizedCategoryNames,
  emphasizedPerkGroupKeys,
  hoveredBuildPerkId,
  hoveredBuildPerkTooltipId,
  hoveredPerkId,
  backgroundFitErrorMessage,
  isExpanded,
  isLoadingBackgroundFitView,
  onCloseBuildPerkHover,
  onCloseBuildPerkTooltip,
  onClearPerkGroupHover,
  onClosePerkGroupHover,
  onInspectPerkGroup,
  onInspectPlannerPerk,
  onOpenBuildPerkHover,
  onOpenBuildPerkTooltip,
  onOpenPerkGroupHover,
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
  shouldIncludeOriginBackgrounds,
}: {
  backgroundFitView: BackgroundFitView | null
  emphasizedCategoryNames: ReadonlySet<string>
  emphasizedPerkGroupKeys: ReadonlySet<string>
  hoveredBuildPerkId: string | null
  hoveredBuildPerkTooltipId: string | undefined
  hoveredPerkId: string | null
  backgroundFitErrorMessage: string | null
  isExpanded: boolean
  isLoadingBackgroundFitView: boolean
  onCloseBuildPerkHover: (perkId: string) => void
  onCloseBuildPerkTooltip: () => void
  onClearPerkGroupHover: () => void
  onClosePerkGroupHover: (perkGroupKey: string) => void
  onInspectPerkGroup: (categoryName: string, perkGroupId: string) => void
  onInspectPlannerPerk: (
    perkId: string,
    perkGroupSelection?: { categoryName: string; perkGroupId: string },
  ) => void
  onOpenBuildPerkHover: (
    perkId: string,
    perkGroupSelection?: { categoryName: string; perkGroupId: string },
  ) => void
  onOpenBuildPerkTooltip: (
    perkId: string,
    currentTarget: HTMLElement,
    perkGroupSelection?: { categoryName: string; perkGroupId: string },
  ) => void
  onOpenPerkGroupHover: (categoryName: string, perkGroupId: string) => void
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
  shouldIncludeOriginBackgrounds: boolean
}) {
  const effectiveBackgroundFitView = backgroundFitView ?? emptyBackgroundFitView
  const [backgroundFitInputValue, setBackgroundFitInputValue] = useState('')
  const [isBackgroundFilterMenuOpen, setIsBackgroundFilterMenuOpen] = useState(false)
  const deferredBackgroundFitQuery = useDeferredValue(backgroundFitInputValue)
  const backgroundFitFilterMenuId = useId()
  const [backgroundFitAccordionState, setBackgroundFitAccordionState] = useState<{
    expandedBackgroundFitKey: string | null
    rankedBackgroundFitKeySignature: string
  }>({
    expandedBackgroundFitKey: null,
    rankedBackgroundFitKeySignature: '',
  })
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
    !shouldAllowBackgroundStudyBook ||
    !shouldAllowBackgroundStudyScroll ||
    shouldAllowSecondBackgroundStudyScroll ||
    !areBackgroundVeteranPerkLevelIntervalsDefault(
      selectedBackgroundVeteranPerkLevelIntervals,
      availableBackgroundVeteranPerkLevelIntervals,
    )
  const hasActiveBackgroundFitSearch = backgroundFitInputValue.trim().length > 0
  const shouldShowBackgroundFitTargetSummary = hasPickedPerks && !isLoadingBackgroundFitView
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
  const rankedBackgroundFitKeySignature = useMemo(
    () =>
      effectiveBackgroundFitView.rankedBackgroundFits
        .map((backgroundFit) => getBackgroundFitKey(backgroundFit))
        .join('|'),
    [effectiveBackgroundFitView],
  )
  const expandedBackgroundFitKey =
    backgroundFitAccordionState.rankedBackgroundFitKeySignature === rankedBackgroundFitKeySignature
      ? backgroundFitAccordionState.expandedBackgroundFitKey
      : null

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
          hidden={!isExpanded}
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
                    <label className={sharedStyles.filterOption}>
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
                    <label className={sharedStyles.filterOption}>
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
                    <label className={sharedStyles.filterOption}>
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
                    <label className={sharedStyles.filterOption}>
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
                      <label className={sharedStyles.filterOption} key={interval}>
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
          {!shouldShowBackgroundFitTargetSummary ? null : hasSupportedBackgroundFitTargets ? (
            <p
              className={styles.backgroundFitRankingSummary}
              data-testid="background-fit-ranking-summary"
              hidden={hasActiveBackgroundFitSearch}
            >
              {hasBuildReachabilityProbability
                ? 'Ranked by must-have build chance.'
                : 'Ranked by expected perks pickable.'}
            </p>
          ) : (
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
            ) : isLoadingBackgroundFitView ? (
              <div className={styles.backgroundFitEmptyState}>
                <p className={styles.backgroundFitSummaryCopy}>Calculating background fits.</p>
              </div>
            ) : visibleRankedBackgroundFits.length > 0 ? (
              <ol className={styles.backgroundFitRanking} data-testid="background-fit-ranking">
                {visibleRankedBackgroundFits.map((backgroundFit, backgroundFitIndex) => (
                  <li key={`${backgroundFit.backgroundId}-${backgroundFit.sourceFilePath}`}>
                    <BackgroundFitCard
                      backgroundFit={backgroundFit}
                      expandedBackgroundFitKey={expandedBackgroundFitKey}
                      emphasizedCategoryNames={emphasizedCategoryNames}
                      emphasizedPerkGroupKeys={emphasizedPerkGroupKeys}
                      hoveredBuildPerkId={hoveredBuildPerkId}
                      hoveredBuildPerkTooltipId={hoveredBuildPerkTooltipId}
                      hoveredPerkId={hoveredPerkId}
                      onCloseBuildPerkHover={onCloseBuildPerkHover}
                      onCloseBuildPerkTooltip={onCloseBuildPerkTooltip}
                      onClearPerkGroupHover={onClearPerkGroupHover}
                      onClosePerkGroupHover={onClosePerkGroupHover}
                      onInspectPerkGroup={onInspectPerkGroup}
                      onInspectPlannerPerk={onInspectPlannerPerk}
                      onOpenBuildPerkHover={onOpenBuildPerkHover}
                      onOpenBuildPerkTooltip={onOpenBuildPerkTooltip}
                      onOpenPerkGroupHover={onOpenPerkGroupHover}
                      onToggle={(backgroundFitKey: string) => {
                        clearBackgroundFitInteractiveHover()
                        setBackgroundFitAccordionState({
                          expandedBackgroundFitKey:
                            expandedBackgroundFitKey === backgroundFitKey ? null : backgroundFitKey,
                          rankedBackgroundFitKeySignature,
                        })
                      }}
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
            ) : (
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
