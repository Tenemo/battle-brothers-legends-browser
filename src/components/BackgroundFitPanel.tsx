import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import './BackgroundFitPanel.css'
import type { BackgroundFitView } from '../lib/background-fit'
import { getBackgroundFitKey, getBackgroundFitSearchText } from '../lib/perk-display'
import { BackgroundFitCard, BackgroundFitTargetPerkGroup } from './BackgroundFitCard'
import { BackgroundFitRailChevron, ClearableSearchField } from './SharedControls'

export function BackgroundFitPanel({
  backgroundFitView,
  hoveredPerkGroupKey,
  isExpanded,
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
  onClearPerkGroupHover: () => void
  onClosePerkGroupHover: (perkGroupKey: string) => void
  onInspectPerkGroup: (categoryName: string, perkGroupId: string) => void
  onOpenPerkGroupHover: (categoryName: string, perkGroupId: string) => void
  onSearchActivityChange: (hasActiveSearch: boolean) => void
  onToggleExpanded: () => void
  pickedPerkCount: number
}) {
  const [backgroundFitInputValue, setBackgroundFitInputValue] = useState('')
  const deferredBackgroundFitQuery = useDeferredValue(backgroundFitInputValue)
  const [backgroundFitAccordionState, setBackgroundFitAccordionState] = useState<{
    expandedBackgroundFitKey: string | null
    rankedBackgroundFitKeySignature: string
  }>({
    expandedBackgroundFitKey: null,
    rankedBackgroundFitKeySignature: '',
  })
  const backgroundFitPanelBodyRef = useRef<HTMLDivElement | null>(null)
  const hasPickedPerks = pickedPerkCount > 0
  const hasSupportedBackgroundFitTargets =
    backgroundFitView.supportedBuildTargetPerkGroups.length > 0
  const hasUnsupportedBackgroundFitTargets =
    backgroundFitView.unsupportedBuildTargetPerkGroups.length > 0
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

  useEffect(() => {
    onSearchActivityChange(hasActiveBackgroundFitSearch)
  }, [hasActiveBackgroundFitSearch, onSearchActivityChange])

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
          hidden={!isExpanded}
          onScrollCapture={() => {
            onClearPerkGroupHover()
          }}
          ref={backgroundFitPanelBodyRef}
        >
          <ClearableSearchField
            className="background-fit-search-field"
            clearLabel="Clear background search"
            inputId="background-fit-search"
            label="Search backgrounds"
            onValueChange={(nextValue) => {
              onClearPerkGroupHover()
              setBackgroundFitInputValue(nextValue)
            }}
            placeholder="Search backgrounds"
            value={backgroundFitInputValue}
          />
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
                    onInspectPerkGroup={onInspectPerkGroup}
                    onOpenPerkGroupHover={onOpenPerkGroupHover}
                    onToggle={(backgroundFitKey: string) => {
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
                    supportedBuildTargetPerkGroupCount={
                      backgroundFitView.supportedBuildTargetPerkGroups.length
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
