import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import './BackgroundFitPanel.css'
import type {
  BackgroundFitMatch,
  BackgroundFitView,
  BuildTargetTree,
  RankedBackgroundFit,
} from '../lib/background-fit'
import {
  formatBackgroundFitGuaranteedPerksLabel,
  formatBackgroundFitMatchedGroupsLabel,
  formatBackgroundFitMaximumTotalGroupsLabel,
  formatBackgroundFitPickablePerksLabel,
  formatBackgroundFitProbabilityLabel,
  formatBackgroundFitScoreLabel,
  formatPickedPerkCountLabel,
  getAnchoredTooltipStyle,
  getBackgroundFitKey,
  getBackgroundFitSearchText,
  getCoveredPickedPerkNames,
  getPerkGroupHoverKey,
  getVisibleBackgroundDisambiguatorLabel,
  renderHighlightedText,
  type TooltipAnchorRectangle,
} from '../lib/perk-display'
import { BackgroundFitAccordionChevron, BackgroundFitRailChevron } from './SharedControls'

type HoveredBackgroundFitSummaryTooltip = {
  anchorRectangle: TooltipAnchorRectangle
  descriptionParagraphs: string[]
  title: string
}

function getBackgroundFitPickablePerksTooltipCopy(
  coveredPickedPerkCount: number,
  pickedPerkCount: number,
): string[] {
  return [
    `Best-case picked-perk coverage for this background: up to ${coveredPickedPerkCount} of your ${pickedPerkCount} picked perks can be covered if every relevant non-guaranteed perk group roll lands.`,
    'This counts picked perks, not perk groups, so multiple picked perks can be covered by the same matched group.',
  ]
}

function getBackgroundFitGuaranteedPerksTooltipCopy(
  guaranteedCoveredPickedPerkCount: number,
  pickedPerkCount: number,
): string[] {
  return [
    `Guaranteed picked-perk coverage for this background: ${guaranteedCoveredPickedPerkCount} of your ${pickedPerkCount} picked perks are covered before any optional rolls.`,
    'Only always-present perk group matches count here. Optional Enemy, Class, and Profession additions do not.',
  ]
}

function getBackgroundFitMatchedGroupsTooltipCopy(
  matchedGroupCount: number,
  supportedBuildTargetTreeCount: number,
): string[] {
  return [
    `Build perk group overlap for this build: this background matches ${matchedGroupCount} of the ${supportedBuildTargetTreeCount} supported build groups.`,
    'A matched group means the background can roll that perk group, whether the match is guaranteed or probabilistic.',
  ]
}

function getBackgroundFitMaximumTotalGroupsTooltipCopy(maximumTotalGroupCount: number): string[] {
  return [
    `Overall hard cap for this background across all dynamic perk groups: it can end up with at most ${maximumTotalGroupCount} total groups.`,
    'This is not limited to your build. It includes every dynamic group the background can gain after all fills and optional rolls.',
  ]
}

function renderBackgroundFitTargetTree(buildTargetTree: BuildTargetTree, keyPrefix: string) {
  return (
    <li
      className="background-fit-target"
      key={`${keyPrefix}-${buildTargetTree.categoryName}-${buildTargetTree.treeId}`}
    >
      <div>
        <strong>{buildTargetTree.treeName}</strong>
        <p className="detail-support">
          {buildTargetTree.categoryName} / {buildTargetTree.pickedPerkNames.join(', ')}
        </p>
      </div>
      <span className="detail-badge">
        {formatPickedPerkCountLabel(buildTargetTree.pickedPerkCount)}
      </span>
    </li>
  )
}

function renderBackgroundFitMatch({
  hoveredPerkGroupKey,
  match,
  onClosePerkGroupHover,
  onInspectPerkGroup,
  onOpenPerkGroupHover,
}: {
  hoveredPerkGroupKey: string | null
  match: BackgroundFitMatch
  onClosePerkGroupHover: (perkGroupKey: string) => void
  onInspectPerkGroup: (categoryName: string, treeId: string) => void
  onOpenPerkGroupHover: (categoryName: string, treeId: string) => void
}) {
  const perkGroupKey = getPerkGroupHoverKey(match)
  const className =
    hoveredPerkGroupKey === perkGroupKey
      ? 'background-fit-match is-highlighted'
      : 'background-fit-match'

  return (
    <li key={`${match.categoryName}-${match.treeId}`}>
      <button
        aria-label={`Select perk group ${match.treeName}`}
        className={className}
        onBlur={() => onClosePerkGroupHover(perkGroupKey)}
        onClick={() => onInspectPerkGroup(match.categoryName, match.treeId)}
        onFocus={() => onOpenPerkGroupHover(match.categoryName, match.treeId)}
        onMouseEnter={() => onOpenPerkGroupHover(match.categoryName, match.treeId)}
        onMouseLeave={() => onClosePerkGroupHover(perkGroupKey)}
        type="button"
      >
        <div>
          <strong>{match.treeName}</strong>
          <p className="detail-support">
            {match.categoryName} / {formatPickedPerkCountLabel(match.pickedPerkCount)} /{' '}
            {match.pickedPerkNames.join(', ')}
          </p>
        </div>
        <span className="detail-badge">
          {match.isGuaranteed
            ? 'Guaranteed'
            : formatBackgroundFitProbabilityLabel(match.probability)}
        </span>
      </button>
    </li>
  )
}

function renderBackgroundFitSummaryBadge({
  label,
  onCloseTooltip,
  onOpenTooltip,
  tooltipCopy,
  tooltipTitle,
}: {
  label: string
  onCloseTooltip: () => void
  onOpenTooltip: (
    title: string,
    descriptionParagraphs: string[],
    currentTarget: HTMLSpanElement,
  ) => void
  tooltipCopy: string[]
  tooltipTitle: string
}) {
  return (
    <span
      aria-label={`${label}. ${tooltipCopy.join(' ')}`}
      className="detail-badge background-fit-summary-badge"
      onMouseEnter={(event) => onOpenTooltip(tooltipTitle, tooltipCopy, event.currentTarget)}
      onMouseLeave={onCloseTooltip}
    >
      {label}
    </span>
  )
}

function renderBackgroundFitCard({
  backgroundFit,
  expandedBackgroundFitKey,
  hoveredPerkGroupKey,
  onClearPerkGroupHover,
  onClosePerkGroupHover,
  onCloseSummaryTooltip,
  onInspectPerkGroup,
  onOpenPerkGroupHover,
  onOpenSummaryTooltip,
  onToggle,
  pickedPerkCount,
  query,
  rank,
  supportedBuildTargetTreeCount,
}: {
  backgroundFit: RankedBackgroundFit
  expandedBackgroundFitKey: string | null
  hoveredPerkGroupKey: string | null
  onClearPerkGroupHover: () => void
  onClosePerkGroupHover: (perkGroupKey: string) => void
  onCloseSummaryTooltip: () => void
  onInspectPerkGroup: (categoryName: string, treeId: string) => void
  onOpenPerkGroupHover: (categoryName: string, treeId: string) => void
  onOpenSummaryTooltip: (
    title: string,
    descriptionParagraphs: string[],
    currentTarget: HTMLSpanElement,
  ) => void
  onToggle: (backgroundFitKey: string) => void
  pickedPerkCount: number
  query: string
  rank: number
  supportedBuildTargetTreeCount: number
}) {
  const backgroundFitKey = getBackgroundFitKey(backgroundFit)
  const disambiguatorLabel = getVisibleBackgroundDisambiguatorLabel(backgroundFit)
  const guaranteedMatches = backgroundFit.matches.filter((match) => match.isGuaranteed)
  const probabilisticMatches = backgroundFit.matches.filter((match) => !match.isGuaranteed)
  const coveredPickedPerkCount = getCoveredPickedPerkNames(backgroundFit.matches).length
  const guaranteedCoveredPickedPerkCount = getCoveredPickedPerkNames(guaranteedMatches).length
  const isExpanded = expandedBackgroundFitKey === backgroundFitKey
  const accordionButtonId = `background-fit-card-button-${rank}`
  const accordionPanelId = `background-fit-card-panel-${rank}`

  return (
    <article
      className={
        backgroundFit.matches.length === 0
          ? isExpanded
            ? 'background-fit-card is-empty is-expanded'
            : 'background-fit-card is-empty'
          : isExpanded
            ? 'background-fit-card is-expanded'
            : 'background-fit-card'
      }
    >
      <button
        aria-controls={accordionPanelId}
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} background ${backgroundFit.backgroundName}${
          disambiguatorLabel ? ` (${disambiguatorLabel})` : ''
        }`}
        className="background-fit-accordion-trigger"
        id={accordionButtonId}
        onClick={() => {
          onClearPerkGroupHover()
          onToggle(backgroundFitKey)
        }}
        type="button"
      >
        <div className="background-fit-card-header">
          <div className="background-fit-card-header-main">
            <div className="background-fit-card-heading">
              <span className="background-fit-rank">{rank + 1}</span>
              <div className="background-fit-card-title-row">
                <h3>
                  {renderHighlightedText(
                    backgroundFit.backgroundName,
                    query,
                    `${backgroundFitKey}-name`,
                  )}
                </h3>
                {disambiguatorLabel ? (
                  <span className="background-fit-disambiguator">
                    {renderHighlightedText(
                      disambiguatorLabel,
                      query,
                      `${backgroundFitKey}-disambiguator`,
                    )}
                  </span>
                ) : null}
              </div>
            </div>

            <span aria-hidden="true" className="background-fit-accordion-chevron-frame">
              <BackgroundFitAccordionChevron isExpanded={isExpanded} />
            </span>
          </div>

          <div className="background-fit-accordion-summary">
            <div className="background-fit-accordion-summary-row">
              {renderBackgroundFitSummaryBadge({
                label: formatBackgroundFitPickablePerksLabel(
                  coveredPickedPerkCount,
                  pickedPerkCount,
                ),
                onCloseTooltip: onCloseSummaryTooltip,
                onOpenTooltip: onOpenSummaryTooltip,
                tooltipCopy: getBackgroundFitPickablePerksTooltipCopy(
                  coveredPickedPerkCount,
                  pickedPerkCount,
                ),
                tooltipTitle: 'Up to perks pickable',
              })}
              {renderBackgroundFitSummaryBadge({
                label: formatBackgroundFitGuaranteedPerksLabel(
                  guaranteedCoveredPickedPerkCount,
                  pickedPerkCount,
                ),
                onCloseTooltip: onCloseSummaryTooltip,
                onOpenTooltip: onOpenSummaryTooltip,
                tooltipCopy: getBackgroundFitGuaranteedPerksTooltipCopy(
                  guaranteedCoveredPickedPerkCount,
                  pickedPerkCount,
                ),
                tooltipTitle: 'Guaranteed perks pickable',
              })}
            </div>
            <div className="background-fit-accordion-summary-row">
              {renderBackgroundFitSummaryBadge({
                label: formatBackgroundFitMatchedGroupsLabel(
                  backgroundFit.matches.length,
                  supportedBuildTargetTreeCount,
                ),
                onCloseTooltip: onCloseSummaryTooltip,
                onOpenTooltip: onOpenSummaryTooltip,
                tooltipCopy: getBackgroundFitMatchedGroupsTooltipCopy(
                  backgroundFit.matches.length,
                  supportedBuildTargetTreeCount,
                ),
                tooltipTitle: 'Matched groups',
              })}
              {renderBackgroundFitSummaryBadge({
                label: formatBackgroundFitMaximumTotalGroupsLabel(
                  backgroundFit.maximumTotalGroupCount,
                ),
                onCloseTooltip: onCloseSummaryTooltip,
                onOpenTooltip: onOpenSummaryTooltip,
                tooltipCopy: getBackgroundFitMaximumTotalGroupsTooltipCopy(
                  backgroundFit.maximumTotalGroupCount,
                ),
                tooltipTitle: 'Maximum total groups',
              })}
            </div>
          </div>
        </div>
      </button>

      <div
        aria-hidden={!isExpanded}
        aria-labelledby={accordionButtonId}
        className="background-fit-card-panel"
        id={accordionPanelId}
        role="region"
      >
        <div className="background-fit-card-panel-inner">
          <div className="background-fit-card-content">
            <div className="background-fit-score-row">
              <span className="detail-badge">
                Guaranteed groups {backgroundFit.guaranteedMatchedTreeCount}
              </span>
              <span className="detail-badge">
                Expected groups{' '}
                {formatBackgroundFitScoreLabel(backgroundFit.expectedMatchedTreeCount)}
              </span>
            </div>

            {guaranteedMatches.length > 0 ? (
              <div className="background-fit-match-section">
                <p className="background-fit-section-label">Guaranteed</p>
                <ul className="background-fit-match-list">
                  {guaranteedMatches.map((match) =>
                    renderBackgroundFitMatch({
                      hoveredPerkGroupKey,
                      match,
                      onClosePerkGroupHover,
                      onInspectPerkGroup,
                      onOpenPerkGroupHover,
                    }),
                  )}
                </ul>
              </div>
            ) : null}

            {probabilisticMatches.length > 0 ? (
              <div className="background-fit-match-section">
                <p className="background-fit-section-label">Possible</p>
                <ul className="background-fit-match-list">
                  {probabilisticMatches.map((match) =>
                    renderBackgroundFitMatch({
                      hoveredPerkGroupKey,
                      match,
                      onClosePerkGroupHover,
                      onInspectPerkGroup,
                      onOpenPerkGroupHover,
                    }),
                  )}
                </ul>
              </div>
            ) : null}

            {backgroundFit.matches.length === 0 ? (
              <p className="background-fit-empty-card">No supported build perk group overlap.</p>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
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
                    {backgroundFitView.unsupportedBuildTargetTrees.map((buildTargetTree) =>
                      renderBackgroundFitTargetTree(buildTargetTree, 'unsupported'),
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
                  {renderBackgroundFitCard({
                    backgroundFit,
                    expandedBackgroundFitKey,
                    hoveredPerkGroupKey,
                    onClearPerkGroupHover,
                    onClosePerkGroupHover,
                    onCloseSummaryTooltip: () => setHoveredBackgroundFitSummaryTooltip(null),
                    onInspectPerkGroup,
                    onOpenPerkGroupHover,
                    onOpenSummaryTooltip: (
                      title: string,
                      descriptionParagraphs: string[],
                      currentTarget: HTMLSpanElement,
                    ) => {
                      const { bottom, left, right, top, width } =
                        currentTarget.getBoundingClientRect()

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
                    },
                    onToggle: (backgroundFitKey: string) => {
                      setHoveredBackgroundFitSummaryTooltip(null)
                      onClearPerkGroupHover()
                      setBackgroundFitAccordionState({
                        expandedBackgroundFitKey:
                          expandedBackgroundFitKey === backgroundFitKey ? null : backgroundFitKey,
                        rankedBackgroundFitKeySignature,
                      })
                    },
                    pickedPerkCount,
                    query: deferredBackgroundFitQuery,
                    rank:
                      rankedBackgroundFitIndexByKey.get(getBackgroundFitKey(backgroundFit)) ??
                      backgroundFitIndex,
                    supportedBuildTargetTreeCount:
                      backgroundFitView.supportedBuildTargetTrees.length,
                  })}
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
