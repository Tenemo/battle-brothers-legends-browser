import { Link } from 'lucide-react'
import type {
  BackgroundFitMatch,
  BuildTargetPerkGroup,
  RankedBackgroundFit,
} from '../lib/background-fit'
import {
  formatBackgroundFitExpectedBuildPerksLabel,
  formatBackgroundFitBuildReachabilityLabel,
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
import { usePlannerInteractionActions } from '../lib/planner-interaction-context-values'
import {
  backgroundStudyResourceBadgesTestId,
  backgroundStudyResourceBadgeTestId,
  getBackgroundStudyResourceBadgeDisplay,
} from '../lib/background-study-resource-display'
import {
  formatBackgroundVeteranPerkLevelIntervalBadge,
  formatBackgroundVeteranPerkLevelIntervalTitle,
} from '../lib/background-veteran-perks'
import type { BackgroundStudyResourceFilter } from '../lib/background-study-reachability'
import { isAncientScrollLearnablePerkGroupId } from '../lib/origin-and-ancient-scroll-perk-groups'
import { BuildPerkGroupTile } from './BuildPerkGroupTile'
import { AncientScrollPerkGroupMarker, PerkGroupIcon } from './PerkGroupIcon'
import sharedStyles from './SharedControls.module.scss'
import styles from './BackgroundFitPanel.module.scss'

function getBackgroundFitGuaranteedPerksSummaryCopy(
  guaranteedCoveredPickedPerkCount: number,
  pickedPerkCount: number,
  scopeLabel: string,
): string {
  return `Groups this background always has cover ${guaranteedCoveredPickedPerkCount} of ${pickedPerkCount} ${scopeLabel}. Optional rolls, books, and scrolls are not included.`
}

function getBackgroundFitExpectedBuildPerksSummaryCopy(
  expectedCoveredPickedPerkCount: number,
  pickedPerkCount: number,
  scopeLabel: string,
): string {
  return `After dynamic background rolls, this background covers an average of ${formatBackgroundFitScoreLabel(
    expectedCoveredPickedPerkCount,
  )} of ${pickedPerkCount} ${scopeLabel}. Alternate perk-group placements count once per picked perk. Books and scrolls are not included.`
}

function getBackgroundFitBuildReachabilitySummaryCopy(
  probability: number,
  buildScopeLabel: string,
  studyResourceFilter: BackgroundStudyResourceFilter,
): string {
  const studyResourceFilterPhrase = getBackgroundFitStudyResourceFilterPhrase(studyResourceFilter)

  if (probability <= 0) {
    return `No legal native background roll ${studyResourceFilterPhrase} can cover every picked perk for ${buildScopeLabel}.`
  }

  return `One legal native background roll ${studyResourceFilterPhrase} can cover every picked perk with a ${formatBackgroundFitProbabilityLabel(
    probability,
  )} chance for ${buildScopeLabel}.`
}

function getBackgroundFitRankTitle(backgroundFit: RankedBackgroundFit, rank: number): string {
  const rankLabel = rank + 1

  if (backgroundFit.buildReachabilityProbability !== null) {
    return `Background fit rank ${rankLabel}. Ranked first by must-have build chance, then full build chance, perk coverage, and background name.`
  }

  return `Background fit rank ${rankLabel}. Ranked by expected perks pickable, guaranteed perks, best native roll, and background name.`
}

function getBackgroundFitStudyResourceFilterPhrase(
  studyResourceFilter: BackgroundStudyResourceFilter,
): string {
  const enabledStudyResources: string[] = []

  if (studyResourceFilter.shouldAllowBook) {
    enabledStudyResources.push('up to one skill book')
  }

  if (studyResourceFilter.shouldAllowScroll) {
    enabledStudyResources.push(
      studyResourceFilter.shouldAllowSecondScroll
        ? 'up to two ancient scrolls if Bright is available'
        : 'up to one ancient scroll',
    )
  }

  if (enabledStudyResources.length === 0) {
    return 'without books or scrolls'
  }

  return `plus ${enabledStudyResources.join(' and ')}`
}

export function BackgroundFitTargetPerkGroup({
  buildTargetPerkGroup,
}: {
  buildTargetPerkGroup: BuildTargetPerkGroup
}) {
  const isAncientScrollPerkGroup = isAncientScrollLearnablePerkGroupId(
    buildTargetPerkGroup.perkGroupId,
  )

  return (
    <li
      className={styles.backgroundFitTarget}
      data-ancient-scroll-perk-group={isAncientScrollPerkGroup}
    >
      <div className={styles.backgroundFitPerkGroupMain}>
        <PerkGroupIcon
          className={joinClassNames(
            sharedStyles.perkIcon,
            sharedStyles.perkIconGroup,
            styles.backgroundFitPerkGroupIcon,
          )}
          iconPath={buildTargetPerkGroup.perkGroupIconPath}
          label={`${buildTargetPerkGroup.perkGroupName} perk group icon`}
          testId="background-fit-perk-group-icon"
        />
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
      {isAncientScrollPerkGroup ? <AncientScrollPerkGroupMarker /> : null}
    </li>
  )
}

function BackgroundFitMatchRow({
  match,
  onInspectPerkGroup,
  onInspectPlannerPerk,
}: {
  match: BackgroundFitMatch
  onInspectPerkGroup: (categoryName: string, perkGroupId: string) => void
  onInspectPlannerPerk: (
    perkId: string,
    perkGroupSelection?: { categoryName: string; perkGroupId: string },
  ) => void
}) {
  return (
    <li>
      <BuildPerkGroupTile
        arePerkGroupOptionsInteractive={false}
        className={styles.backgroundFitMatch}
        groupLabel={match.perkGroupName}
        groupOptions={[
          {
            categoryName: match.categoryName,
            perkGroupIconPath: match.perkGroupIconPath,
            perkGroupId: match.perkGroupId,
            perkGroupLabel: match.perkGroupName,
          },
        ]}
        isWide
        metaClassName={
          match.isGuaranteed
            ? styles.backgroundFitMatchGuaranteedText
            : styles.backgroundFitMatchProbabilityBadge
        }
        metaLabel={
          match.isGuaranteed ? 'Guaranteed' : formatBackgroundFitProbabilityLabel(match.probability)
        }
        metaTestId="background-fit-match-probability-badge"
        onInspectPerk={onInspectPlannerPerk}
        onInspectPerkGroup={onInspectPerkGroup}
        optionIconClassName={styles.backgroundFitPerkGroupIcon}
        perks={match.pickedPerkNames.map((perkName, perkIndex) => ({
          iconPath: match.pickedPerkIconPaths[perkIndex] ?? null,
          perkId: match.pickedPerkIds[perkIndex] ?? null,
          perkName,
        }))}
      />
    </li>
  )
}

type BackgroundFitMetric = {
  accessibleLabel: string
  icon: 'must-have' | null
  label: string
  tooltip: string
  value: string
}

const fullBuildChanceMetricLabel = 'Full build chance'
const mustHaveMetricIcon: BackgroundFitMetric['icon'] = 'must-have'
const mustHaveBuildChanceMetricLabel = 'Must-have build chance'
const noMetricIcon: BackgroundFitMetric['icon'] = null

function BackgroundFitMetricRow({
  accessibleLabel,
  icon,
  label,
  tooltip,
  value,
}: BackgroundFitMetric) {
  return (
    <div
      aria-label={`${accessibleLabel}. ${tooltip}`}
      className={styles.backgroundFitMetricRow}
      data-testid="background-fit-summary-metric"
      role="listitem"
      title={tooltip}
    >
      <span
        aria-hidden="true"
        className={styles.backgroundFitMetricIconCell}
        data-testid="background-fit-summary-icon-cell"
      >
        {icon === 'must-have' ? (
          <Link
            aria-hidden="true"
            className={styles.backgroundFitMetricMustHaveIcon}
            data-testid="background-fit-summary-must-have-icon"
          />
        ) : null}
      </span>
      <span className={styles.backgroundFitMetricLabel} data-testid="background-fit-summary-label">
        {label}
      </span>
      <span className={styles.backgroundFitMetricValue} data-testid="background-fit-summary-value">
        {value}
      </span>
    </div>
  )
}

export function BackgroundFitMetricTable({ metrics }: { metrics: BackgroundFitMetric[] }) {
  return (
    <div
      aria-label="Background fit summary"
      className={styles.backgroundFitMetricTable}
      data-testid="background-fit-summary-table"
      role="list"
    >
      {metrics.map((metric) => (
        <BackgroundFitMetricRow
          accessibleLabel={metric.accessibleLabel}
          icon={metric.icon}
          key={metric.accessibleLabel}
          label={metric.label}
          tooltip={metric.tooltip}
          value={metric.value}
        />
      ))}
    </div>
  )
}

export function BackgroundFitStudyResourceBadges({
  backgroundFit,
}: {
  backgroundFit: RankedBackgroundFit
}) {
  const studyResourceBadgeDisplay = getBackgroundStudyResourceBadgeDisplay({
    fullBuildStudyResourceStrategy: backgroundFit.fullBuildStudyResourceStrategy,
    mustHaveStudyResourceStrategy: backgroundFit.mustHaveStudyResourceStrategy,
  })

  if (studyResourceBadgeDisplay === null) {
    return null
  }

  return (
    <span
      aria-label={studyResourceBadgeDisplay.accessibleLabel}
      className={styles.backgroundFitStudyResourceBadges}
      data-testid={backgroundStudyResourceBadgesTestId}
    >
      {studyResourceBadgeDisplay.badges.map((studyResourceBadge, studyResourceBadgeIndex) => (
        <img
          alt={studyResourceBadge.title}
          className={joinClassNames(
            styles.backgroundFitStudyResourceBadge,
            studyResourceBadge.isOptionalOnly && styles.backgroundFitStudyResourceBadgeOptionalOnly,
          )}
          data-optional-only={studyResourceBadge.isOptionalOnly}
          data-study-resource-kind={studyResourceBadge.kind}
          data-testid={backgroundStudyResourceBadgeTestId}
          decoding="async"
          height="64"
          key={`${studyResourceBadge.kind}-${studyResourceBadgeIndex}`}
          loading="lazy"
          src={`/game-icons/${studyResourceBadge.iconPath}`}
          title={studyResourceBadge.title}
          width="64"
        />
      ))}
    </span>
  )
}

function createRatioValue(coveredPerkCount: number, pickedPerkCount: number): string {
  return `${coveredPerkCount}/${pickedPerkCount}`
}

function createExpectedRatioValue(
  expectedCoveredPickedPerkCount: number,
  pickedPerkCount: number,
): string {
  return `${formatBackgroundFitScoreLabel(expectedCoveredPickedPerkCount)}/${pickedPerkCount}`
}

function getBackgroundFitDetailsMetrics({
  backgroundFit,
  mustHavePickedPerkCount,
  optionalPickedPerkCount,
  pickedPerkCount,
  studyResourceFilter,
}: {
  backgroundFit: RankedBackgroundFit
  mustHavePickedPerkCount: number
  optionalPickedPerkCount: number
  pickedPerkCount: number
  studyResourceFilter: BackgroundStudyResourceFilter
}): BackgroundFitMetric[] {
  const guaranteedCoveredPickedPerkCount =
    backgroundFit.guaranteedCoveredMustHavePerkCount +
    backgroundFit.guaranteedCoveredOptionalPerkCount

  return [
    ...(backgroundFit.mustHaveBuildReachabilityProbability === null
      ? []
      : [
          {
            accessibleLabel: formatBackgroundFitBuildReachabilityLabel(
              backgroundFit.mustHaveBuildReachabilityProbability,
              mustHaveBuildChanceMetricLabel,
            ),
            icon: mustHaveMetricIcon,
            label: mustHaveBuildChanceMetricLabel,
            tooltip: getBackgroundFitBuildReachabilitySummaryCopy(
              backgroundFit.mustHaveBuildReachabilityProbability,
              'the must-have build',
              studyResourceFilter,
            ),
            value: formatBackgroundFitProbabilityLabel(
              backgroundFit.mustHaveBuildReachabilityProbability,
            ),
          },
        ]),
    ...(optionalPickedPerkCount > 0 && backgroundFit.fullBuildReachabilityProbability !== null
      ? [
          {
            accessibleLabel: formatBackgroundFitBuildReachabilityLabel(
              backgroundFit.fullBuildReachabilityProbability,
              fullBuildChanceMetricLabel,
            ),
            icon: noMetricIcon,
            label: fullBuildChanceMetricLabel,
            tooltip: getBackgroundFitBuildReachabilitySummaryCopy(
              backgroundFit.fullBuildReachabilityProbability,
              'the full build, including optional perks',
              studyResourceFilter,
            ),
            value: formatBackgroundFitProbabilityLabel(
              backgroundFit.fullBuildReachabilityProbability,
            ),
          },
        ]
      : []),
    {
      accessibleLabel: formatBackgroundFitExpectedBuildPerksLabel(
        backgroundFit.expectedCoveredMustHavePerkCount,
        mustHavePickedPerkCount,
        'must-have perks',
      ),
      icon: mustHaveMetricIcon,
      label: 'Expected must-have perks pickable',
      tooltip: getBackgroundFitExpectedBuildPerksSummaryCopy(
        backgroundFit.expectedCoveredMustHavePerkCount,
        mustHavePickedPerkCount,
        'must-have picked perks',
      ),
      value: createExpectedRatioValue(
        backgroundFit.expectedCoveredMustHavePerkCount,
        mustHavePickedPerkCount,
      ),
    },
    ...(optionalPickedPerkCount > 0
      ? [
          {
            accessibleLabel: formatBackgroundFitExpectedBuildPerksLabel(
              backgroundFit.expectedCoveredOptionalPerkCount,
              optionalPickedPerkCount,
              'optional perks',
            ),
            icon: noMetricIcon,
            label: 'Expected optional perks pickable',
            tooltip: getBackgroundFitExpectedBuildPerksSummaryCopy(
              backgroundFit.expectedCoveredOptionalPerkCount,
              optionalPickedPerkCount,
              'optional picked perks',
            ),
            value: createExpectedRatioValue(
              backgroundFit.expectedCoveredOptionalPerkCount,
              optionalPickedPerkCount,
            ),
          },
        ]
      : []),
    {
      accessibleLabel: formatBackgroundFitGuaranteedPerksLabel(
        guaranteedCoveredPickedPerkCount,
        pickedPerkCount,
        'perks',
      ),
      icon: noMetricIcon,
      label: 'Guaranteed perks pickable',
      tooltip: getBackgroundFitGuaranteedPerksSummaryCopy(
        guaranteedCoveredPickedPerkCount,
        pickedPerkCount,
        'picked perks in the full build',
      ),
      value: createRatioValue(guaranteedCoveredPickedPerkCount, pickedPerkCount),
    },
  ]
}

export function BackgroundFitMetricSummary({
  backgroundFit,
  mustHavePickedPerkCount,
  optionalPickedPerkCount,
  pickedPerkCount,
  studyResourceFilter,
}: {
  backgroundFit: RankedBackgroundFit
  mustHavePickedPerkCount: number
  optionalPickedPerkCount: number
  pickedPerkCount: number
  studyResourceFilter: BackgroundStudyResourceFilter
}) {
  return (
    <BackgroundFitMetricTable
      metrics={getBackgroundFitDetailsMetrics({
        backgroundFit,
        mustHavePickedPerkCount,
        optionalPickedPerkCount,
        pickedPerkCount,
        studyResourceFilter,
      })}
    />
  )
}

export function BackgroundFitMatchSections({
  backgroundFit,
  onInspectPerkGroup,
  onInspectPlannerPerk,
}: {
  backgroundFit: RankedBackgroundFit
  onInspectPerkGroup: (categoryName: string, perkGroupId: string) => void
  onInspectPlannerPerk: (
    perkId: string,
    perkGroupSelection?: { categoryName: string; perkGroupId: string },
  ) => void
}) {
  const guaranteedMatches = backgroundFit.matches.filter((match) => match.isGuaranteed)
  const probabilisticMatches = backgroundFit.matches.filter((match) => !match.isGuaranteed)

  return (
    <>
      {guaranteedMatches.length > 0 ? (
        <div className={styles.backgroundFitMatchSection}>
          <p className={styles.backgroundFitSectionLabel}>Guaranteed</p>
          <ul className={styles.backgroundFitMatchList}>
            {guaranteedMatches.map((match) => (
              <BackgroundFitMatchRow
                key={`${match.categoryName}-${match.perkGroupId}`}
                match={match}
                onInspectPerkGroup={onInspectPerkGroup}
                onInspectPlannerPerk={onInspectPlannerPerk}
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
                key={`${match.categoryName}-${match.perkGroupId}`}
                match={match}
                onInspectPerkGroup={onInspectPerkGroup}
                onInspectPlannerPerk={onInspectPlannerPerk}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {backgroundFit.matches.length === 0 ? (
        <p className={styles.backgroundFitEmptyCard}>No supported build perk group overlap.</p>
      ) : null}
    </>
  )
}

export function BackgroundFitCard({
  backgroundFit,
  onSelect,
  isSelected,
  mustHavePickedPerkCount,
  optionalPickedPerkCount,
  pickedPerkCount,
  query,
  rank,
  studyResourceFilter,
}: {
  backgroundFit: RankedBackgroundFit
  onSelect: (backgroundFitKey: string) => void
  isSelected: boolean
  mustHavePickedPerkCount: number
  optionalPickedPerkCount: number
  pickedPerkCount: number
  query: string
  rank: number
  studyResourceFilter: BackgroundStudyResourceFilter
}) {
  const { clearPerkGroupHover } = usePlannerInteractionActions()
  const backgroundFitKey = getBackgroundFitKey(backgroundFit)
  const backgroundPillLabel = getVisibleBackgroundPillLabel(backgroundFit)
  const veteranPerkLevelIntervalLabel = formatBackgroundVeteranPerkLevelIntervalBadge(
    backgroundFit.veteranPerkLevelInterval,
  )
  const veteranPerkLevelIntervalTitle = formatBackgroundVeteranPerkLevelIntervalTitle(
    backgroundFit.veteranPerkLevelInterval,
  )
  const rankTitle = getBackgroundFitRankTitle(backgroundFit, rank)
  const summaryMetrics = getBackgroundFitDetailsMetrics({
    backgroundFit,
    mustHavePickedPerkCount,
    optionalPickedPerkCount,
    pickedPerkCount,
    studyResourceFilter,
  })

  return (
    <article
      className={styles.backgroundFitCard}
      data-empty={backgroundFit.matches.length === 0}
      data-selected={isSelected}
      data-testid="background-fit-card"
    >
      <button
        aria-label={`Inspect background ${backgroundFit.backgroundName}${
          backgroundPillLabel ? ` (${backgroundPillLabel})` : ''
        } (${veteranPerkLevelIntervalLabel} veteran perk interval)`}
        aria-pressed={isSelected}
        className={styles.backgroundFitAccordionTrigger}
        onClick={() => {
          clearPerkGroupHover()
          onSelect(backgroundFitKey)
        }}
        type="button"
      >
        <div className={styles.backgroundFitCardHeader}>
          <div className={styles.backgroundFitCardHeaderMain}>
            <div className={styles.backgroundFitCardHeading}>
              <span
                aria-label={`Background fit rank ${rank + 1}`}
                className={styles.backgroundFitRank}
                data-testid="background-fit-rank"
                title={rankTitle}
              >
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

            <BackgroundFitStudyResourceBadges backgroundFit={backgroundFit} />
          </div>

          <div className={styles.backgroundFitAccordionSummary}>
            <div
              className={styles.backgroundFitAccordionSummaryRow}
              data-testid="background-fit-accordion-summary-row"
            >
              <BackgroundFitMetricTable metrics={summaryMetrics} />
            </div>
          </div>
        </div>
        <span
          aria-label={`${veteranPerkLevelIntervalLabel} veteran perk interval`}
          className={styles.backgroundFitVeteranPerkBadge}
          data-testid="background-fit-veteran-perk-badge"
          data-veteran-perk-interval={backgroundFit.veteranPerkLevelInterval}
          title={veteranPerkLevelIntervalTitle}
        >
          {veteranPerkLevelIntervalLabel}
        </span>
      </button>
    </article>
  )
}
