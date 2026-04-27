import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react'
import './BackgroundFitPanel.css'
import type { BackgroundFitView } from '../lib/background-fit'
import { isOriginBackgroundFit } from '../lib/background-origin'
import { getBackgroundFitKey, getBackgroundFitSearchText } from '../lib/perk-display'
import { BackgroundFitCard, BackgroundFitTargetPerkGroup } from './BackgroundFitCard'
import { BackgroundFitRailChevron, ClearableSearchField, FunnelIcon } from './SharedControls'

export function BackgroundFitPanel({
  backgroundFitView,
  emphasizedCategoryNames,
  emphasizedPerkGroupKeys,
  hoveredBuildPerkId,
  hoveredBuildPerkTooltipId,
  hoveredPerkId,
  isExpanded,
  onCloseBuildPerkHover,
  onCloseBuildPerkTooltip,
  onClearPerkGroupHover,
  onClosePerkGroupHover,
  onInspectPerkGroup,
  onInspectPlannerPerk,
  onOpenBuildPerkHover,
  onOpenBuildPerkTooltip,
  onOpenPerkGroupHover,
  onOriginBackgroundsChange,
  onSearchActivityChange,
  onToggleExpanded,
  pickedPerkCount,
  shouldIncludeOriginBackgrounds,
}: {
  backgroundFitView: BackgroundFitView
  emphasizedCategoryNames: ReadonlySet<string>
  emphasizedPerkGroupKeys: ReadonlySet<string>
  hoveredBuildPerkId: string | null
  hoveredBuildPerkTooltipId: string | undefined
  hoveredPerkId: string | null
  isExpanded: boolean
  onCloseBuildPerkHover: (perkId: string) => void
  onCloseBuildPerkTooltip: () => void
  onClearPerkGroupHover: () => void
  onClosePerkGroupHover: (perkGroupKey: string) => void
  onInspectPerkGroup: (categoryName: string, perkGroupId: string) => void
  onInspectPlannerPerk: (
    perkId: string,
    perkGroupSelection?: { categoryName: string; perkGroupId: string },
  ) => void
  onOpenBuildPerkHover: (perkId: string) => void
  onOpenBuildPerkTooltip: (perkId: string, currentTarget: HTMLElement) => void
  onOpenPerkGroupHover: (categoryName: string, perkGroupId: string) => void
  onOriginBackgroundsChange: (shouldIncludeOriginBackgrounds: boolean) => void
  onSearchActivityChange: (hasActiveSearch: boolean) => void
  onToggleExpanded: () => void
  pickedPerkCount: number
  shouldIncludeOriginBackgrounds: boolean
}) {
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
    backgroundFitView.supportedBuildTargetPerkGroups.length > 0
  const hasUnsupportedBackgroundFitTargets =
    backgroundFitView.unsupportedBuildTargetPerkGroups.length > 0
  const hasActiveBackgroundFitSearch = backgroundFitInputValue.trim().length > 0
  const normalizedBackgroundFitQuery = deferredBackgroundFitQuery.trim().toLowerCase()
  const visibleRankedBackgroundFits = useMemo(
    () =>
      backgroundFitView.rankedBackgroundFits.filter((backgroundFit) => {
        if (!shouldIncludeOriginBackgrounds && isOriginBackgroundFit(backgroundFit)) {
          return false
        }

        return (
          normalizedBackgroundFitQuery.length === 0 ||
          getBackgroundFitSearchText(backgroundFit).includes(normalizedBackgroundFitQuery)
        )
      }),
    [backgroundFitView, normalizedBackgroundFitQuery, shouldIncludeOriginBackgrounds],
  )
  const rankedBackgroundFitIndexByKey = useMemo(
    () =>
      new Map(
        backgroundFitView.rankedBackgroundFits.map((backgroundFit, backgroundFitIndex) => [
          getBackgroundFitKey(backgroundFit),
          backgroundFitIndex,
        ]),
      ),
    [backgroundFitView],
  )
  const rankedBackgroundFitKeySignature = useMemo(
    () =>
      backgroundFitView.rankedBackgroundFits
        .map((backgroundFit) => getBackgroundFitKey(backgroundFit))
        .join('|'),
    [backgroundFitView],
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
  }, [isExpanded, normalizedBackgroundFitQuery, shouldIncludeOriginBackgrounds])

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
        className={
          isExpanded ? 'background-fit-panel is-expanded' : 'background-fit-panel is-collapsed'
        }
        data-testid="background-fit-panel"
      >
        <div aria-hidden={!isExpanded} className="background-fit-panel-body" hidden={!isExpanded}>
          <ClearableSearchField
            className="background-fit-search-field"
            clearLabel="Clear background search"
            inputId="background-fit-search"
            label="Search backgrounds"
            onValueChange={(nextValue) => {
              clearBackgroundFitInteractiveHover()
              setBackgroundFitInputValue(nextValue)
            }}
            placeholder="Search backgrounds"
            trailingControl={
              <div
                className="background-fit-filter-menu"
                onKeyDown={(event) => {
                  if (event.key !== 'Escape') {
                    return
                  }

                  event.preventDefault()
                  setIsBackgroundFilterMenuOpen(false)
                  event.currentTarget
                    .querySelector<HTMLButtonElement>('.background-fit-filter-button')
                    ?.focus()
                }}
                ref={backgroundFitFilterMenuRef}
              >
                <button
                  aria-controls={backgroundFitFilterMenuId}
                  aria-expanded={isBackgroundFilterMenuOpen}
                  aria-label="Filter backgrounds"
                  className="background-fit-filter-button has-active-filter"
                  onClick={() => {
                    clearBackgroundFitInteractiveHover()
                    setIsBackgroundFilterMenuOpen(
                      (wasBackgroundFilterMenuOpen) => !wasBackgroundFilterMenuOpen,
                    )
                  }}
                  type="button"
                >
                  <FunnelIcon className="background-fit-filter-icon" isFilled />
                </button>
                {isBackgroundFilterMenuOpen ? (
                  <div
                    aria-label="Background filters"
                    className="background-fit-filter-popover"
                    id={backgroundFitFilterMenuId}
                    role="group"
                  >
                    <label className="background-fit-filter-option">
                      <input
                        checked={shouldIncludeOriginBackgrounds}
                        onChange={(event) => {
                          clearBackgroundFitInteractiveHover()
                          onOriginBackgroundsChange(event.target.checked)
                        }}
                        type="checkbox"
                      />
                      <span>Origin backgrounds</span>
                    </label>
                  </div>
                ) : null}
              </div>
            }
            value={backgroundFitInputValue}
          />
          {!hasPickedPerks ? null : hasSupportedBackgroundFitTargets ? (
            <p className="background-fit-ranking-summary">
              Ranked by expected perks pickable first, then guaranteed perks, then best-case
              coverage.
            </p>
          ) : (
            <div className="background-fit-empty-state">
              <p className="background-fit-summary-copy">
                {hasUnsupportedBackgroundFitTargets
                  ? 'This build only contains unsupported categories for dynamic background perk groups.'
                  : 'Pick perks from Weapon, Defense, Traits, Enemy, Class, Profession, or Magic to rank backgrounds exactly.'}
              </p>
              {hasUnsupportedBackgroundFitTargets ? (
                <>
                  <p className="background-fit-section-label">Unsupported build perk groups</p>
                  <p className="results-note">
                    Background dynamic perk groups only roll Weapon, Defense, Traits, Enemy, Class,
                    Profession, and Magic.
                  </p>
                  <ul className="background-fit-target-list is-unsupported">
                    {backgroundFitView.unsupportedBuildTargetPerkGroups.map(
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
            className="background-fit-results-scroll app-scrollbar"
            data-testid="background-fit-panel-body"
            onScrollCapture={() => {
              clearBackgroundFitInteractiveHover()
            }}
            ref={backgroundFitResultsScrollRef}
          >
            {visibleRankedBackgroundFits.length > 0 ? (
              <ol className="background-fit-ranking" data-testid="background-fit-ranking">
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
                      pickedPerkCount={pickedPerkCount}
                      query={deferredBackgroundFitQuery}
                      rank={
                        rankedBackgroundFitIndexByKey.get(getBackgroundFitKey(backgroundFit)) ??
                        backgroundFitIndex
                      }
                    />
                  </li>
                ))}
              </ol>
            ) : (
              <div className="background-fit-empty-state">
                <p className="background-fit-summary-copy">
                  No backgrounds match "{deferredBackgroundFitQuery.trim()}".
                </p>
                <p className="background-fit-summary-copy">
                  Try a different background name or clear the search.
                </p>
              </div>
            )}
          </div>
        </div>

        <button
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} background fit`}
          className="background-fit-rail-button"
          onClick={() => {
            clearBackgroundFitInteractiveHover()
            onToggleExpanded()
          }}
          type="button"
        >
          <span aria-hidden="true" className="background-fit-rail-button-icon">
            <BackgroundFitRailChevron isExpanded={isExpanded} />
          </span>
          <span aria-hidden="true" className="background-fit-rail-button-label">
            Background fit
          </span>
        </button>
      </aside>
    </>
  )
}
