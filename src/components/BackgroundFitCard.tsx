import {
  getCoveredPickedPerkCount,
  getGuaranteedCoveredPickedPerkCount,
  type BackgroundFitMatch,
  type BuildTargetPerkGroup,
  type RankedBackgroundFit,
} from '../lib/background-fit'
import {
  formatBackgroundFitExpectedBuildPerksLabel,
  formatBackgroundFitGuaranteedPerksLabel,
  formatBackgroundFitMatchedPerkGroupsLabel,
  formatBackgroundFitPickablePerksLabel,
  formatBackgroundFitProbabilityLabel,
  formatBackgroundFitScoreLabel,
  formatPickedPerkCountLabel,
  getBackgroundFitKey,
  getPerkGroupHoverKey,
  getVisibleBackgroundPillLabel,
  renderGameIcon,
  renderHighlightedText,
} from '../lib/perk-display'
import { BackgroundFitAccordionChevron } from './SharedControls'

function getBackgroundFitPickablePerksSummaryCopy(
  coveredPickedPerkCount: number,
  pickedPerkCount: number,
): string {
  return `Best-case picked-perk coverage: up to ${coveredPickedPerkCount} of ${pickedPerkCount} picked perks can be covered if every relevant optional perk group appears.`
}

function getBackgroundFitGuaranteedPerksSummaryCopy(
  guaranteedCoveredPickedPerkCount: number,
  pickedPerkCount: number,
): string {
  return `Guaranteed picked-perk coverage: ${guaranteedCoveredPickedPerkCount} of ${pickedPerkCount} picked perks are covered before optional rolls.`
}

function getBackgroundFitMatchedPerkGroupsSummaryCopy(
  matchedPerkGroupCount: number,
  supportedBuildTargetPerkGroupCount: number,
): string {
  return `Matched build perk groups: this background can roll ${matchedPerkGroupCount} of ${supportedBuildTargetPerkGroupCount} supported build perk groups.`
}

function getBackgroundFitExpectedBuildPerksSummaryCopy(
  expectedCoveredPickedPerkCount: number,
  pickedPerkCount: number,
): string {
  return `Expected picked-perk coverage: ${formatBackgroundFitScoreLabel(
    expectedCoveredPickedPerkCount,
  )} of ${pickedPerkCount} picked perks are expected to be covered after dynamic perk group rolls.`
}

function getBackgroundFitGuaranteedPerkGroupsSummaryCopy(
  guaranteedMatchedPerkGroupCount: number,
): string {
  return `Guaranteed matched perk groups: ${guaranteedMatchedPerkGroupCount} build perk groups are always present.`
}

function getBackgroundFitExpectedPerkGroupsSummaryCopy(
  expectedMatchedPerkGroupCount: number,
): string {
  return `Expected matched perk groups: ${formatBackgroundFitScoreLabel(
    expectedMatchedPerkGroupCount,
  )} build perk groups are expected after dynamic rolls.`
}

export function BackgroundFitTargetPerkGroup({
  buildTargetPerkGroup,
}: {
  buildTargetPerkGroup: BuildTargetPerkGroup
}) {
  return (
    <li className="background-fit-target">
      <div className="background-fit-perk-group-main">
        {renderGameIcon({
          className: 'perk-icon perk-icon-group background-fit-perk-group-icon',
          iconPath: buildTargetPerkGroup.perkGroupIconPath,
          label: `${buildTargetPerkGroup.perkGroupName} perk group icon`,
        })}
        <div>
          <strong>{buildTargetPerkGroup.perkGroupName}</strong>
          <p className="detail-support">
            {buildTargetPerkGroup.categoryName} / {buildTargetPerkGroup.pickedPerkNames.join(', ')}
          </p>
        </div>
      </div>
      <span className="detail-badge">
        {formatPickedPerkCountLabel(buildTargetPerkGroup.pickedPerkCount)}
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
  onInspectPerkGroup: (categoryName: string, perkGroupId: string) => void
  onOpenPerkGroupHover: (categoryName: string, perkGroupId: string) => void
}) {
  const perkGroupKey = getPerkGroupHoverKey(match)
  const className =
    hoveredPerkGroupKey === perkGroupKey
      ? 'background-fit-match is-highlighted'
      : 'background-fit-match'

  return (
    <li>
      <button
        aria-label={`Select perk group ${match.perkGroupName}`}
        className={className}
        onBlur={() => onClosePerkGroupHover(perkGroupKey)}
        onClick={() => onInspectPerkGroup(match.categoryName, match.perkGroupId)}
        onFocus={() => onOpenPerkGroupHover(match.categoryName, match.perkGroupId)}
        onMouseEnter={() => onOpenPerkGroupHover(match.categoryName, match.perkGroupId)}
        onMouseLeave={() => onClosePerkGroupHover(perkGroupKey)}
        type="button"
      >
        <div className="background-fit-perk-group-main">
          {renderGameIcon({
            className: 'perk-icon perk-icon-group background-fit-perk-group-icon',
            iconPath: match.perkGroupIconPath,
            label: `${match.perkGroupName} perk group icon`,
          })}
          <div>
            <strong>{match.perkGroupName}</strong>
            <p className="detail-support">
              {match.categoryName} / {formatPickedPerkCountLabel(match.pickedPerkCount)} /{' '}
              {match.pickedPerkNames.join(', ')}
            </p>
          </div>
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

function BackgroundFitMetricBadge({
  className = '',
  label,
  tooltip,
}: {
  className?: string
  label: string
  tooltip: string
}) {
  return (
    <span
      aria-label={`${label}. ${tooltip}`}
      className={['detail-badge background-fit-metric-badge', className].filter(Boolean).join(' ')}
      title={tooltip}
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
  onInspectPerkGroup,
  onOpenPerkGroupHover,
  onToggle,
  pickedPerkCount,
  query,
  rank,
  supportedBuildTargetPerkGroupCount,
}: {
  backgroundFit: RankedBackgroundFit
  expandedBackgroundFitKey: string | null
  hoveredPerkGroupKey: string | null
  onClearPerkGroupHover: () => void
  onClosePerkGroupHover: (perkGroupKey: string) => void
  onInspectPerkGroup: (categoryName: string, perkGroupId: string) => void
  onOpenPerkGroupHover: (categoryName: string, perkGroupId: string) => void
  onToggle: (backgroundFitKey: string) => void
  pickedPerkCount: number
  query: string
  rank: number
  supportedBuildTargetPerkGroupCount: number
}) {
  const backgroundFitKey = getBackgroundFitKey(backgroundFit)
  const backgroundPillLabel = getVisibleBackgroundPillLabel(backgroundFit)
  const guaranteedMatches = backgroundFit.matches.filter((match) => match.isGuaranteed)
  const probabilisticMatches = backgroundFit.matches.filter((match) => !match.isGuaranteed)
  const coveredPickedPerkCount = getCoveredPickedPerkCount(backgroundFit.matches)
  const guaranteedCoveredPickedPerkCount = getGuaranteedCoveredPickedPerkCount(
    backgroundFit.matches,
  )
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
          backgroundPillLabel ? ` (${backgroundPillLabel})` : ''
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
              {renderGameIcon({
                className: 'perk-icon background-fit-icon',
                iconPath: backgroundFit.iconPath,
                label: `${backgroundFit.backgroundName} background icon`,
              })}
              <div className="background-fit-card-title-row">
                <h3>
                  {renderHighlightedText(
                    backgroundFit.backgroundName,
                    query,
                    `${backgroundFitKey}-name`,
                  )}
                </h3>
                {backgroundPillLabel ? (
                  <span className="background-fit-disambiguator">
                    {renderHighlightedText(
                      backgroundPillLabel,
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
              <BackgroundFitMetricBadge
                className="background-fit-summary-badge"
                label={formatBackgroundFitExpectedBuildPerksLabel(
                  backgroundFit.expectedCoveredPickedPerkCount,
                  pickedPerkCount,
                )}
                tooltip={getBackgroundFitExpectedBuildPerksSummaryCopy(
                  backgroundFit.expectedCoveredPickedPerkCount,
                  pickedPerkCount,
                )}
              />
              <BackgroundFitMetricBadge
                className="background-fit-summary-badge"
                label={formatBackgroundFitGuaranteedPerksLabel(
                  guaranteedCoveredPickedPerkCount,
                  pickedPerkCount,
                )}
                tooltip={getBackgroundFitGuaranteedPerksSummaryCopy(
                  guaranteedCoveredPickedPerkCount,
                  pickedPerkCount,
                )}
              />
              <BackgroundFitMetricBadge
                className="background-fit-summary-badge"
                label={formatBackgroundFitPickablePerksLabel(
                  coveredPickedPerkCount,
                  pickedPerkCount,
                )}
                tooltip={getBackgroundFitPickablePerksSummaryCopy(
                  coveredPickedPerkCount,
                  pickedPerkCount,
                )}
              />
            </div>
          </div>
        </div>
      </button>

      <div
        aria-hidden={!isExpanded}
        aria-labelledby={accordionButtonId}
        className="background-fit-card-panel"
        hidden={!isExpanded}
        id={accordionPanelId}
        role="region"
      >
        <div className="background-fit-card-panel-inner">
          <div className="background-fit-card-content">
            <div className="background-fit-score-row">
              <BackgroundFitMetricBadge
                label={formatBackgroundFitMatchedPerkGroupsLabel(
                  backgroundFit.matches.length,
                  supportedBuildTargetPerkGroupCount,
                )}
                tooltip={getBackgroundFitMatchedPerkGroupsSummaryCopy(
                  backgroundFit.matches.length,
                  supportedBuildTargetPerkGroupCount,
                )}
              />
              <BackgroundFitMetricBadge
                label={`Guaranteed perk groups ${backgroundFit.guaranteedMatchedPerkGroupCount}`}
                tooltip={getBackgroundFitGuaranteedPerkGroupsSummaryCopy(
                  backgroundFit.guaranteedMatchedPerkGroupCount,
                )}
              />
              <BackgroundFitMetricBadge
                label={`Expected perk groups ${formatBackgroundFitScoreLabel(
                  backgroundFit.expectedMatchedPerkGroupCount,
                )}`}
                tooltip={getBackgroundFitExpectedPerkGroupsSummaryCopy(
                  backgroundFit.expectedMatchedPerkGroupCount,
                )}
              />
            </div>

            {guaranteedMatches.length > 0 ? (
              <div className="background-fit-match-section">
                <p className="background-fit-section-label">Guaranteed</p>
                <ul className="background-fit-match-list">
                  {guaranteedMatches.map((match) => (
                    <BackgroundFitMatchRow
                      hoveredPerkGroupKey={hoveredPerkGroupKey}
                      key={`${match.categoryName}-${match.perkGroupId}`}
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
                      key={`${match.categoryName}-${match.perkGroupId}`}
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
