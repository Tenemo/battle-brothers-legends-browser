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
import { BuildPerkPill } from './BuildPerkPill'
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
  return `Expected picked-perk coverage: ${formatBackgroundFitExpectedBuildPerksLabel(
    expectedCoveredPickedPerkCount,
    pickedPerkCount,
  )} after dynamic perk group rolls.`
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
  hoveredBuildPerkId,
  hoveredBuildPerkTooltipId,
  hoveredPerkGroupKey,
  hoveredPerkId,
  match,
  onCloseBuildPerkHover,
  onCloseBuildPerkTooltip,
  onClosePerkGroupHover,
  onInspectPerkGroup,
  onInspectPlannerPerk,
  onOpenBuildPerkHover,
  onOpenBuildPerkTooltip,
  onOpenPerkGroupHover,
}: {
  hoveredBuildPerkId: string | null
  hoveredBuildPerkTooltipId: string | undefined
  hoveredPerkGroupKey: string | null
  hoveredPerkId: string | null
  match: BackgroundFitMatch
  onCloseBuildPerkHover: (perkId: string) => void
  onCloseBuildPerkTooltip: () => void
  onClosePerkGroupHover: (perkGroupKey: string) => void
  onInspectPerkGroup: (categoryName: string, perkGroupId: string) => void
  onInspectPlannerPerk: (
    perkId: string,
    perkGroupSelection?: { categoryName: string; perkGroupId: string },
  ) => void
  onOpenBuildPerkHover: (perkId: string) => void
  onOpenBuildPerkTooltip: (perkId: string, currentTarget: HTMLElement) => void
  onOpenPerkGroupHover: (categoryName: string, perkGroupId: string) => void
}) {
  const perkGroupKey = getPerkGroupHoverKey(match)
  const hasHighlightedPerk = hoveredPerkId !== null && match.pickedPerkIds.includes(hoveredPerkId)
  const className = [
    'background-fit-match',
    hoveredPerkGroupKey === perkGroupKey ? 'is-highlighted' : '',
    hasHighlightedPerk ? 'has-highlighted-perk' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <li>
      <article
        className={className}
        onMouseEnter={() => onOpenPerkGroupHover(match.categoryName, match.perkGroupId)}
        onMouseLeave={() => onClosePerkGroupHover(perkGroupKey)}
      >
        <div className="background-fit-match-topline">
          <button
            aria-label={`Select perk group ${match.perkGroupName}`}
            className="background-fit-match-group-button"
            onBlur={() => onClosePerkGroupHover(perkGroupKey)}
            onClick={() => onInspectPerkGroup(match.categoryName, match.perkGroupId)}
            onFocus={() => onOpenPerkGroupHover(match.categoryName, match.perkGroupId)}
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
              </div>
            </div>
          </button>
          <div className="background-fit-match-badges">
            <span className="detail-badge background-fit-category-badge">{match.categoryName}</span>
            <span className="detail-badge background-fit-match-probability-badge">
              {match.isGuaranteed
                ? 'Guaranteed'
                : formatBackgroundFitProbabilityLabel(match.probability)}
            </span>
          </div>
        </div>
        <div className="planner-pill-list background-fit-match-perk-list">
          {match.pickedPerkNames.map((perkName, perkIndex) => {
            const perkId = match.pickedPerkIds[perkIndex]

            return perkId ? (
              <BuildPerkPill
                hoveredBuildPerkId={hoveredBuildPerkId}
                hoveredBuildPerkTooltipId={hoveredBuildPerkTooltipId}
                hoveredPerkId={hoveredPerkId}
                key={`${match.categoryName}-${match.perkGroupId}-${perkId}`}
                onCloseHover={onCloseBuildPerkHover}
                onCloseTooltip={onCloseBuildPerkTooltip}
                onInspectPerk={onInspectPlannerPerk}
                onOpenHover={onOpenBuildPerkHover}
                onOpenTooltip={onOpenBuildPerkTooltip}
                perkGroupSelection={{
                  categoryName: match.categoryName,
                  perkGroupId: match.perkGroupId,
                }}
                perkId={perkId}
                perkName={perkName}
              />
            ) : (
              <span
                className="planner-pill"
                key={`${match.categoryName}-${match.perkGroupId}-${perkName}`}
              >
                {perkName}
              </span>
            )
          })}
        </div>
      </article>
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
  hoveredBuildPerkId,
  hoveredBuildPerkTooltipId,
  hoveredPerkGroupKey,
  hoveredPerkId,
  onCloseBuildPerkHover,
  onCloseBuildPerkTooltip,
  onClearPerkGroupHover,
  onClosePerkGroupHover,
  onInspectPerkGroup,
  onInspectPlannerPerk,
  onOpenBuildPerkHover,
  onOpenBuildPerkTooltip,
  onOpenPerkGroupHover,
  onToggle,
  pickedPerkCount,
  query,
  rank,
  supportedBuildTargetPerkGroupCount,
}: {
  backgroundFit: RankedBackgroundFit
  expandedBackgroundFitKey: string | null
  hoveredBuildPerkId: string | null
  hoveredBuildPerkTooltipId: string | undefined
  hoveredPerkGroupKey: string | null
  hoveredPerkId: string | null
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
                      hoveredBuildPerkId={hoveredBuildPerkId}
                      hoveredBuildPerkTooltipId={hoveredBuildPerkTooltipId}
                      hoveredPerkGroupKey={hoveredPerkGroupKey}
                      hoveredPerkId={hoveredPerkId}
                      key={`${match.categoryName}-${match.perkGroupId}`}
                      match={match}
                      onCloseBuildPerkHover={onCloseBuildPerkHover}
                      onCloseBuildPerkTooltip={onCloseBuildPerkTooltip}
                      onClosePerkGroupHover={onClosePerkGroupHover}
                      onInspectPerkGroup={onInspectPerkGroup}
                      onInspectPlannerPerk={onInspectPlannerPerk}
                      onOpenBuildPerkHover={onOpenBuildPerkHover}
                      onOpenBuildPerkTooltip={onOpenBuildPerkTooltip}
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
                      hoveredBuildPerkId={hoveredBuildPerkId}
                      hoveredBuildPerkTooltipId={hoveredBuildPerkTooltipId}
                      hoveredPerkGroupKey={hoveredPerkGroupKey}
                      hoveredPerkId={hoveredPerkId}
                      key={`${match.categoryName}-${match.perkGroupId}`}
                      match={match}
                      onCloseBuildPerkHover={onCloseBuildPerkHover}
                      onCloseBuildPerkTooltip={onCloseBuildPerkTooltip}
                      onClosePerkGroupHover={onClosePerkGroupHover}
                      onInspectPerkGroup={onInspectPerkGroup}
                      onInspectPlannerPerk={onInspectPlannerPerk}
                      onOpenBuildPerkHover={onOpenBuildPerkHover}
                      onOpenBuildPerkTooltip={onOpenBuildPerkTooltip}
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
