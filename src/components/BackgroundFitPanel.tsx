import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import './BackgroundFitPanel.css'
import type { BackgroundFitView } from '../lib/background-fit'
import {
  getAnchoredTooltipStyle,
  getBackgroundFitKey,
  getBackgroundFitSearchText,
  type TooltipAnchorRectangle,
} from '../lib/perk-display'
import {
  BackgroundFitCard,
  BackgroundFitTargetTree,
  type BackgroundFitSummaryTooltipOpenHandler,
} from './BackgroundFitCard'
import { BackgroundFitRailChevron } from './SharedControls'

type HoveredBackgroundFitSummaryTooltip = {
  anchorRectangle: TooltipAnchorRectangle
  descriptionParagraphs: string[]
  title: string
}

export function BackgroundFitPanel({
  backgroundFitView,
  hoveredPerkGroupKey,
  isExpanded,
  onClearBuildPerkTooltip,
  onClearHoveredPerk,
  onClearPerkGroupHover,
  onClosePerkGroupHover,
  onInspectPerkGroup,
  onOpenPerkGroupHover,
  onSearchActivityChange,
  onToggleExpanded,
  pickedPerkCount,
}: {
  backgroundFitView: BackgroundFitView
  hoveredPerkGroupKey: string | null
  isExpanded: boolean
  onClearBuildPerkTooltip: () => void
  onClearHoveredPerk: () => void
  onClearPerkGroupHover: () => void
  onClosePerkGroupHover: (perkGroupKey: string) => void
  onInspectPerkGroup: (categoryName: string, treeId: string) => void
  onOpenPerkGroupHover: (categoryName: string, treeId: string) => void
  onSearchActivityChange: (hasActiveSearch: boolean) => void
  onToggleExpanded: () => void
  pickedPerkCount: number
}) {
  const [backgroundFitInputValue, setBackgroundFitInputValue] = useState('')
  const deferredBackgroundFitQuery = useDeferredValue(backgroundFitInputValue)
  const [hoveredBackgroundFitSummaryTooltip, setHoveredBackgroundFitSummaryTooltip] =
    useState<HoveredBackgroundFitSummaryTooltip | null>(null)
  const [backgroundFitAccordionState, setBackgroundFitAccordionState] = useState<{
    expandedBackgroundFitKey: string | null
    rankedBackgroundFitKeySignature: string
  }>({
    expandedBackgroundFitKey: null,
    rankedBackgroundFitKeySignature: '',
  })
  const backgroundFitPanelBodyRef = useRef<HTMLDivElement | null>(null)
  const hoveredBackgroundFitSummaryTooltipId =
    hoveredBackgroundFitSummaryTooltip === null ? undefined : 'background-fit-summary-tooltip'
  const hasPickedPerks = pickedPerkCount > 0
  const hasSupportedBackgroundFitTargets = backgroundFitView.supportedBuildTargetTrees.length > 0
  const hasUnsupportedBackgroundFitTargets =
    backgroundFitView.unsupportedBuildTargetTrees.length > 0
  const hasActiveBackgroundFitSearch = backgroundFitInputValue.trim().length > 0
  const normalizedBackgroundFitQuery = deferredBackgroundFitQuery.trim().toLowerCase()
  const visibleRankedBackgroundFits = useMemo(
    () =>
      normalizedBackgroundFitQuery.length === 0
        ? backgroundFitView.rankedBackgroundFits
        : backgroundFitView.rankedBackgroundFits.filter((backgroundFit) =>
            getBackgroundFitSearchText(backgroundFit).includes(normalizedBackgroundFitQuery),
          ),
    [backgroundFitView, normalizedBackgroundFitQuery],
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
  const handleOpenBackgroundFitSummaryTooltip: BackgroundFitSummaryTooltipOpenHandler = (
    title,
    descriptionParagraphs,
    currentTarget,
  ) => {
    const { bottom, left, right, top, width } = currentTarget.getBoundingClientRect()

    onClearHoveredPerk()
    onClearBuildPerkTooltip()
    setHoveredBackgroundFitSummaryTooltip({
      anchorRectangle: {
        bottom,
        left,
        right,
        top,
        width,
      },
      descriptionParagraphs,
      title,
    })
  }

  useEffect(() => {
    onSearchActivityChange(hasActiveBackgroundFitSearch)
  }, [hasActiveBackgroundFitSearch, onSearchActivityChange])

  useEffect(() => {
    if (hoveredBackgroundFitSummaryTooltip === null || typeof window === 'undefined') {
      return
    }

    const handleWindowResize = () => {
      setHoveredBackgroundFitSummaryTooltip(null)
    }

    window.addEventListener('resize', handleWindowResize)

    return () => {
      window.removeEventListener('resize', handleWindowResize)
    }
  }, [hoveredBackgroundFitSummaryTooltip])

  useEffect(() => {
    if (!isExpanded) {
      return
    }

    const backgroundFitPanelBody = backgroundFitPanelBodyRef.current

    if (backgroundFitPanelBody === null) {
      return
    }

    if (typeof backgroundFitPanelBody.scrollTo === 'function') {
      backgroundFitPanelBody.scrollTo({
        top: 0,
      })
      return
    }

    backgroundFitPanelBody.scrollTop = 0
  }, [isExpanded, normalizedBackgroundFitQuery])

  return (
    <>
      {hoveredBackgroundFitSummaryTooltip !== null ? (
        <div
          className="build-perk-tooltip"
          id={hoveredBackgroundFitSummaryTooltipId}
          role="tooltip"
          style={getAnchoredTooltipStyle(hoveredBackgroundFitSummaryTooltip.anchorRectangle)}
        >
          <strong className="build-perk-tooltip-title">
            {hoveredBackgroundFitSummaryTooltip.title}
          </strong>
          <div className="build-perk-tooltip-copy">
            {hoveredBackgroundFitSummaryTooltip.descriptionParagraphs.map(
              (descriptionParagraph, descriptionParagraphIndex) => (
                <p key={`background-fit-summary-tooltip-${descriptionParagraphIndex}`}>
                  {descriptionParagraph}
                </p>
              ),
            )}
          </div>
        </div>
      ) : null}

      <aside
        aria-label="Background fit"
        className={
          isExpanded ? 'background-fit-panel is-expanded' : 'background-fit-panel is-collapsed'
        }
        data-testid="background-fit-panel"
      >
        <div
          aria-hidden={!isExpanded}
          className="background-fit-panel-body"
          data-testid="background-fit-panel-body"
          onScrollCapture={() => {
            setHoveredBackgroundFitSummaryTooltip(null)
            onClearPerkGroupHover()
          }}
          ref={backgroundFitPanelBodyRef}
        >
          <label className="search-field background-fit-search-field">
            <span className="visually-hidden">Search backgrounds</span>
            <input
              aria-label="Search backgrounds"
              onChange={(event) => {
                setHoveredBackgroundFitSummaryTooltip(null)
                onClearPerkGroupHover()
                setBackgroundFitInputValue(event.target.value)
              }}
              placeholder="Search backgrounds"
              type="search"
              value={backgroundFitInputValue}
            />
          </label>
          {!hasPickedPerks ? null : hasSupportedBackgroundFitTargets ? (
            <p className="background-fit-ranking-summary">
              Ranked by guaranteed perks pickable first, then total perks pickable.
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
                    {backgroundFitView.unsupportedBuildTargetTrees.map((buildTargetTree) => (
                      <BackgroundFitTargetTree
                        buildTargetTree={buildTargetTree}
                        key={`unsupported-${buildTargetTree.categoryName}-${buildTargetTree.treeId}`}
                      />
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          )}
          {visibleRankedBackgroundFits.length > 0 ? (
            <ol className="background-fit-ranking" data-testid="background-fit-ranking">
              {visibleRankedBackgroundFits.map((backgroundFit, backgroundFitIndex) => (
                <li key={`${backgroundFit.backgroundId}-${backgroundFit.sourceFilePath}`}>
                  <BackgroundFitCard
                    backgroundFit={backgroundFit}
                    expandedBackgroundFitKey={expandedBackgroundFitKey}
                    hoveredPerkGroupKey={hoveredPerkGroupKey}
                    onClearPerkGroupHover={onClearPerkGroupHover}
                    onClosePerkGroupHover={onClosePerkGroupHover}
                    onCloseSummaryTooltip={() => setHoveredBackgroundFitSummaryTooltip(null)}
                    onInspectPerkGroup={onInspectPerkGroup}
                    onOpenPerkGroupHover={onOpenPerkGroupHover}
                    onOpenSummaryTooltip={handleOpenBackgroundFitSummaryTooltip}
                    onToggle={(backgroundFitKey: string) => {
                      setHoveredBackgroundFitSummaryTooltip(null)
                      onClearPerkGroupHover()
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
                    supportedBuildTargetTreeCount={
                      backgroundFitView.supportedBuildTargetTrees.length
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

        <button
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} background fit`}
          className="background-fit-rail-button"
          onClick={() => {
            setHoveredBackgroundFitSummaryTooltip(null)
            onClearPerkGroupHover()
            onToggleExpanded()
          }}
          type="button"
        >
          <span aria-hidden="true" className="background-fit-rail-button-icon">
            <BackgroundFitRailChevron isExpanded={isExpanded} />
          </span>
          {!isExpanded ? (
            <span aria-hidden="true" className="background-fit-rail-button-label">
              Background fit
            </span>
          ) : null}
        </button>
      </aside>
    </>
  )
}
