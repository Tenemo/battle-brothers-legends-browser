import {
  getGuaranteedCoveredPickedPerkCount,
  type BackgroundFitMatch,
  type BuildTargetPerkGroup,
  type RankedBackgroundFit,
} from '../lib/background-fit'
import {
  formatBackgroundFitExpectedBuildPerksLabel,
  formatBackgroundFitBuildReachabilityLabel,
  formatBackgroundFitBestNativeRollLabel,
  formatBackgroundFitGuaranteedPerksLabel,
  formatBackgroundFitProbabilityLabel,
  formatBackgroundFitScoreLabel,
  formatPickedPerkCountLabel,
  getBackgroundFitKey,
  getVisibleBackgroundPillLabel,
  renderGameIcon,
  renderHighlightedText,
} from '../lib/perk-display'
import { joinClassNames } from '../lib/class-names'
import { BuildPerkGroupTile } from './BuildPerkGroupTile'
import { BackgroundFitAccordionChevron } from './SharedControls'
import sharedStyles from './SharedControls.module.scss'
import styles from './BackgroundFitPanel.module.scss'

function getBackgroundFitBestNativeRollSummaryCopy(
  maximumNativeCoveredPickedPerkCount: number,
  pickedPerkCount: number,
): string {
  return `One legal native background roll can cover ${maximumNativeCoveredPickedPerkCount} of ${pickedPerkCount} picked perks. Books and scrolls are not included.`
}

function getBackgroundFitGuaranteedPerksSummaryCopy(
  guaranteedCoveredPickedPerkCount: number,
  pickedPerkCount: number,
): string {
  return `Groups this background always has cover ${guaranteedCoveredPickedPerkCount} of ${pickedPerkCount} picked perks. Optional rolls, books, and scrolls are not included.`
}

function getBackgroundFitExpectedBuildPerksSummaryCopy(
  expectedCoveredPickedPerkCount: number,
  pickedPerkCount: number,
): string {
  return `After dynamic background rolls, this background covers an average of ${formatBackgroundFitScoreLabel(
    expectedCoveredPickedPerkCount,
  )} of ${pickedPerkCount} picked perks. Alternate perk-group placements count once per picked perk. Books and scrolls are not included.`
}

function getBackgroundFitBuildReachabilitySummaryCopy(probability: number): string {
  return `One legal native background roll plus the selected book and scroll filters can cover every picked perk with a ${formatBackgroundFitProbabilityLabel(
    probability,
  )} chance.`
}

export function BackgroundFitTargetPerkGroup({
  buildTargetPerkGroup,
}: {
  buildTargetPerkGroup: BuildTargetPerkGroup
}) {
  return (
    <li className={styles.backgroundFitTarget}>
      <div className={styles.backgroundFitPerkGroupMain}>
        {renderGameIcon({
          className: joinClassNames(
            sharedStyles.perkIcon,
            sharedStyles.perkIconGroup,
            styles.backgroundFitPerkGroupIcon,
          ),
          iconPath: buildTargetPerkGroup.perkGroupIconPath,
          label: `${buildTargetPerkGroup.perkGroupName} perk group icon`,
          testId: 'background-fit-perk-group-icon',
        })}
        <div>
          <strong>{buildTargetPerkGroup.perkGroupName}</strong>
          <p className={styles.backgroundFitTargetSupport}>
            {buildTargetPerkGroup.categoryName} / {buildTargetPerkGroup.pickedPerkNames.join(', ')}
          </p>
        </div>
      </div>
      <span className={styles.backgroundFitTargetBadge} data-testid="background-fit-target-badge">
        {formatPickedPerkCountLabel(buildTargetPerkGroup.pickedPerkCount)}
      </span>
    </li>
  )
}

function BackgroundFitMatchRow({
  emphasizedCategoryNames,
  emphasizedPerkGroupKeys,
  hoveredBuildPerkId,
  hoveredBuildPerkTooltipId,
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
  emphasizedCategoryNames: ReadonlySet<string>
  emphasizedPerkGroupKeys: ReadonlySet<string>
  hoveredBuildPerkId: string | null
  hoveredBuildPerkTooltipId: string | undefined
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
}) {
  return (
    <li>
      <BuildPerkGroupTile
        arePerkGroupOptionsInteractive={false}
        className={styles.backgroundFitMatch}
        emphasizedCategoryNames={emphasizedCategoryNames}
        emphasizedPerkGroupKeys={emphasizedPerkGroupKeys}
        groupLabel={match.perkGroupName}
        groupOptions={[
          {
            categoryName: match.categoryName,
            perkGroupIconPath: match.perkGroupIconPath,
            perkGroupId: match.perkGroupId,
            perkGroupLabel: match.perkGroupName,
          },
        ]}
        hoveredBuildPerkId={hoveredBuildPerkId}
        hoveredBuildPerkTooltipId={hoveredBuildPerkTooltipId}
        hoveredPerkId={hoveredPerkId}
        isWide
        metaClassName={styles.backgroundFitMatchProbabilityBadge}
        metaLabel={
          match.isGuaranteed ? 'Guaranteed' : formatBackgroundFitProbabilityLabel(match.probability)
        }
        metaTestId="background-fit-match-probability-badge"
        onCloseBuildPerkHover={onCloseBuildPerkHover}
        onCloseBuildPerkTooltip={onCloseBuildPerkTooltip}
        onClosePerkGroupHover={onClosePerkGroupHover}
        onInspectPerk={onInspectPlannerPerk}
        onInspectPerkGroup={onInspectPerkGroup}
        onOpenBuildPerkHover={onOpenBuildPerkHover}
        onOpenBuildPerkTooltip={onOpenBuildPerkTooltip}
        onOpenPerkGroupHover={onOpenPerkGroupHover}
        optionIconClassName={styles.backgroundFitPerkGroupIcon}
        perks={match.pickedPerkNames.map((perkName, perkIndex) => ({
          perkId: match.pickedPerkIds[perkIndex] ?? null,
          perkName,
        }))}
      />
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
      className={joinClassNames(styles.backgroundFitMetricBadge, className)}
      data-testid="background-fit-summary-badge"
      title={tooltip}
    >
      {label}
    </span>
  )
}

export function BackgroundFitCard({
  backgroundFit,
  emphasizedCategoryNames,
  emphasizedPerkGroupKeys,
  expandedBackgroundFitKey,
  hoveredBuildPerkId,
  hoveredBuildPerkTooltipId,
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
}: {
  backgroundFit: RankedBackgroundFit
  emphasizedCategoryNames: ReadonlySet<string>
  emphasizedPerkGroupKeys: ReadonlySet<string>
  expandedBackgroundFitKey: string | null
  hoveredBuildPerkId: string | null
  hoveredBuildPerkTooltipId: string | undefined
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
  onToggle: (backgroundFitKey: string) => void
  pickedPerkCount: number
  query: string
  rank: number
}) {
  const backgroundFitKey = getBackgroundFitKey(backgroundFit)
  const backgroundPillLabel = getVisibleBackgroundPillLabel(backgroundFit)
  const guaranteedMatches = backgroundFit.matches.filter((match) => match.isGuaranteed)
  const probabilisticMatches = backgroundFit.matches.filter((match) => !match.isGuaranteed)
  const guaranteedCoveredPickedPerkCount = getGuaranteedCoveredPickedPerkCount(
    backgroundFit.matches,
  )
  const isExpanded = expandedBackgroundFitKey === backgroundFitKey
  const accordionButtonId = `background-fit-card-button-${rank}`
  const accordionPanelId = `background-fit-card-panel-${rank}`

  return (
    <article
      className={styles.backgroundFitCard}
      data-empty={backgroundFit.matches.length === 0}
      data-expanded={isExpanded}
      data-testid="background-fit-card"
    >
      <button
        aria-controls={accordionPanelId}
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} background ${backgroundFit.backgroundName}${
          backgroundPillLabel ? ` (${backgroundPillLabel})` : ''
        }`}
        className={styles.backgroundFitAccordionTrigger}
        id={accordionButtonId}
        onClick={() => {
          onClearPerkGroupHover()
          onToggle(backgroundFitKey)
        }}
        type="button"
      >
        <div className={styles.backgroundFitCardHeader}>
          <div className={styles.backgroundFitCardHeaderMain}>
            <div className={styles.backgroundFitCardHeading}>
              <span className={styles.backgroundFitRank} data-testid="background-fit-rank">
                {rank + 1}
              </span>
              {renderGameIcon({
                className: joinClassNames(sharedStyles.perkIcon, styles.backgroundFitIcon),
                iconPath: backgroundFit.iconPath,
                label: `${backgroundFit.backgroundName} background icon`,
                testId: 'background-fit-icon',
              })}
              <div className={styles.backgroundFitCardTitleRow}>
                <h3>
                  {renderHighlightedText({
                    highlightClassName: sharedStyles.searchHighlight,
                    keyPrefix: `${backgroundFitKey}-name`,
                    query,
                    text: backgroundFit.backgroundName,
                  })}
                </h3>
                {backgroundPillLabel ? (
                  <span
                    className={styles.backgroundFitDisambiguator}
                    data-testid="background-fit-disambiguator"
                  >
                    {renderHighlightedText({
                      highlightClassName: sharedStyles.searchHighlight,
                      keyPrefix: `${backgroundFitKey}-disambiguator`,
                      query,
                      text: backgroundPillLabel,
                    })}
                  </span>
                ) : null}
              </div>
            </div>

            <span aria-hidden="true" className={styles.backgroundFitAccordionChevronFrame}>
              <BackgroundFitAccordionChevron
                className={styles.backgroundFitAccordionChevron}
                isExpanded={isExpanded}
              />
            </span>
          </div>

          <div className={styles.backgroundFitAccordionSummary}>
            <div
              className={styles.backgroundFitAccordionSummaryRow}
              data-testid="background-fit-accordion-summary-row"
            >
              {backgroundFit.buildReachabilityProbability === null ? null : (
                <BackgroundFitMetricBadge
                  className={styles.backgroundFitSummaryBadge}
                  label={formatBackgroundFitBuildReachabilityLabel(
                    backgroundFit.buildReachabilityProbability,
                  )}
                  tooltip={getBackgroundFitBuildReachabilitySummaryCopy(
                    backgroundFit.buildReachabilityProbability,
                  )}
                />
              )}
              <BackgroundFitMetricBadge
                className={styles.backgroundFitSummaryBadge}
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
                className={styles.backgroundFitSummaryBadge}
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
                className={styles.backgroundFitSummaryBadge}
                label={formatBackgroundFitBestNativeRollLabel(
                  backgroundFit.maximumNativeCoveredPickedPerkCount,
                  pickedPerkCount,
                )}
                tooltip={getBackgroundFitBestNativeRollSummaryCopy(
                  backgroundFit.maximumNativeCoveredPickedPerkCount,
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
        className={styles.backgroundFitCardPanel}
        data-testid="background-fit-card-panel"
        hidden={!isExpanded}
        id={accordionPanelId}
        role="region"
      >
        <div className={styles.backgroundFitCardPanelInner}>
          <div className={styles.backgroundFitCardContent}>
            {guaranteedMatches.length > 0 ? (
              <div className={styles.backgroundFitMatchSection}>
                <p className={styles.backgroundFitSectionLabel}>Guaranteed</p>
                <ul className={styles.backgroundFitMatchList}>
                  {guaranteedMatches.map((match) => (
                    <BackgroundFitMatchRow
                      emphasizedCategoryNames={emphasizedCategoryNames}
                      emphasizedPerkGroupKeys={emphasizedPerkGroupKeys}
                      hoveredBuildPerkId={hoveredBuildPerkId}
                      hoveredBuildPerkTooltipId={hoveredBuildPerkTooltipId}
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
              <div className={styles.backgroundFitMatchSection}>
                <p className={styles.backgroundFitSectionLabel}>Possible</p>
                <ul className={styles.backgroundFitMatchList}>
                  {probabilisticMatches.map((match) => (
                    <BackgroundFitMatchRow
                      emphasizedCategoryNames={emphasizedCategoryNames}
                      emphasizedPerkGroupKeys={emphasizedPerkGroupKeys}
                      hoveredBuildPerkId={hoveredBuildPerkId}
                      hoveredBuildPerkTooltipId={hoveredBuildPerkTooltipId}
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
              <p className={styles.backgroundFitEmptyCard}>
                No supported build perk group overlap.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
}
