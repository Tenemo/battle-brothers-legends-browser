import type {
  BackgroundFitMatch,
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
  getBackgroundFitKey,
  getCoveredPickedPerkNames,
  getPerkGroupHoverKey,
  getVisibleBackgroundDisambiguatorLabel,
  renderHighlightedText,
} from '../lib/perk-display'
import { BackgroundFitAccordionChevron } from './SharedControls'

export type BackgroundFitSummaryTooltipOpenHandler = (
  title: string,
  descriptionParagraphs: string[],
  currentTarget: HTMLSpanElement,
) => void

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

export function BackgroundFitTargetTree({ buildTargetTree }: { buildTargetTree: BuildTargetTree }) {
  return (
    <li className="background-fit-target">
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

function BackgroundFitMatchRow({
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
    <li>
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

function BackgroundFitSummaryBadge({
  label,
  onCloseTooltip,
  onOpenTooltip,
  tooltipCopy,
  tooltipTitle,
}: {
  label: string
  onCloseTooltip: () => void
  onOpenTooltip: BackgroundFitSummaryTooltipOpenHandler
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

export function BackgroundFitCard({
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
  onOpenSummaryTooltip: BackgroundFitSummaryTooltipOpenHandler
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
              <BackgroundFitSummaryBadge
                label={formatBackgroundFitPickablePerksLabel(
                  coveredPickedPerkCount,
                  pickedPerkCount,
                )}
                onCloseTooltip={onCloseSummaryTooltip}
                onOpenTooltip={onOpenSummaryTooltip}
                tooltipCopy={getBackgroundFitPickablePerksTooltipCopy(
                  coveredPickedPerkCount,
                  pickedPerkCount,
                )}
                tooltipTitle="Up to perks pickable"
              />
              <BackgroundFitSummaryBadge
                label={formatBackgroundFitGuaranteedPerksLabel(
                  guaranteedCoveredPickedPerkCount,
                  pickedPerkCount,
                )}
                onCloseTooltip={onCloseSummaryTooltip}
                onOpenTooltip={onOpenSummaryTooltip}
                tooltipCopy={getBackgroundFitGuaranteedPerksTooltipCopy(
                  guaranteedCoveredPickedPerkCount,
                  pickedPerkCount,
                )}
                tooltipTitle="Guaranteed perks pickable"
              />
            </div>
            <div className="background-fit-accordion-summary-row">
              <BackgroundFitSummaryBadge
                label={formatBackgroundFitMatchedGroupsLabel(
                  backgroundFit.matches.length,
                  supportedBuildTargetTreeCount,
                )}
                onCloseTooltip={onCloseSummaryTooltip}
                onOpenTooltip={onOpenSummaryTooltip}
                tooltipCopy={getBackgroundFitMatchedGroupsTooltipCopy(
                  backgroundFit.matches.length,
                  supportedBuildTargetTreeCount,
                )}
                tooltipTitle="Matched groups"
              />
              <BackgroundFitSummaryBadge
                label={formatBackgroundFitMaximumTotalGroupsLabel(
                  backgroundFit.maximumTotalGroupCount,
                )}
                onCloseTooltip={onCloseSummaryTooltip}
                onOpenTooltip={onOpenSummaryTooltip}
                tooltipCopy={getBackgroundFitMaximumTotalGroupsTooltipCopy(
                  backgroundFit.maximumTotalGroupCount,
                )}
                tooltipTitle="Maximum total groups"
              />
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
                  {guaranteedMatches.map((match) => (
                    <BackgroundFitMatchRow
                      hoveredPerkGroupKey={hoveredPerkGroupKey}
                      key={`${match.categoryName}-${match.treeId}`}
                      match={match}
                      onClosePerkGroupHover={onClosePerkGroupHover}
                      onInspectPerkGroup={onInspectPerkGroup}
                      onOpenPerkGroupHover={onOpenPerkGroupHover}
                    />
                  ))}
                </ul>
              </div>
            ) : null}

            {probabilisticMatches.length > 0 ? (
              <div className="background-fit-match-section">
                <p className="background-fit-section-label">Possible</p>
                <ul className="background-fit-match-list">
                  {probabilisticMatches.map((match) => (
                    <BackgroundFitMatchRow
                      hoveredPerkGroupKey={hoveredPerkGroupKey}
                      key={`${match.categoryName}-${match.treeId}`}
                      match={match}
                      onClosePerkGroupHover={onClosePerkGroupHover}
                      onInspectPerkGroup={onInspectPerkGroup}
                      onOpenPerkGroupHover={onOpenPerkGroupHover}
                    />
                  ))}
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
