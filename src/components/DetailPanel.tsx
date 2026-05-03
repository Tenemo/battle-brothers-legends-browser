import { useId, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, ArrowRight, Split } from 'lucide-react'
import { formatDisplayBulletText } from '../lib/bullet-display'
import {
  formatBackgroundFitProbabilityLabel,
  formatBackgroundSourceProbabilityLabel,
  formatScenarioGrantLabel,
  getAnchoredTooltipStyle,
  getVisibleBackgroundPillLabel,
  getPerkDisplayIconPath,
  renderGameIcon,
  type GroupedBackgroundSource,
  type TooltipAnchorRectangle,
} from '../lib/perk-display'
import type {
  BackgroundFitOtherPerkGroup,
  BackgroundFitStudyResourceChanceBreakdownEntry,
  BackgroundFitStudyResourceStrategy,
  BackgroundFitStudyResourceStrategyTarget,
  BackgroundFitMatch,
  BuildTargetPerkGroup,
  RankedBackgroundFit,
} from '../lib/background-fit'
import {
  formatStudyResourceStrategyTargetNames,
  skillBookIconPath,
} from '../lib/background-study-resource-display'
import { ancientScrollIconPath } from '../lib/ancient-scroll-perk-group-display'
import type { BackgroundStudyResourceFilter } from '../lib/background-study-reachability'
import {
  backgroundCampResourceModifierGroupLabels,
  formatBackgroundCampResourceModifierValue,
} from '../lib/background-camp-resource-display'
import {
  formatBackgroundVeteranPerkLevelIntervalBadge,
  formatBackgroundVeteranPerkLevelIntervalTitle,
} from '../lib/background-veteran-perks'
import { joinClassNames } from '../lib/class-names'
import { getTierLabel } from '../lib/perk-search'
import { useBuildPerkTooltipPreview } from '../lib/use-build-perk-tooltip-preview'
import type {
  LegendsBackgroundTrait,
  LegendsFavouredEnemyTarget,
  LegendsPerkRecord,
} from '../types/legends-perks'
import type {
  LegendsBackgroundCampResourceModifier,
  LegendsBackgroundCampResourceModifierGroup,
} from '../types/legends-perks'
import {
  BackgroundFitMatchSections,
  BackgroundFitMetricSummary,
  BackgroundFitStudyResourceBadges,
} from './BackgroundFitCard'
import { BuildPerkGroupTile } from './BuildPerkGroupTile'
import { BuildPerkPill, type BuildPerkPillSelection } from './BuildPerkPill'
import { BuildToggleButton, PlannerSectionChevron, type BuildRequirement } from './SharedControls'
import sharedStyles from './SharedControls.module.scss'
import buildPlannerStyles from './BuildPlanner.module.scss'
import catenaryChainIconPath from '../assets/catenary-chain.svg'
import styles from './DetailPanel.module.scss'

type DetailPanelProps = {
  selectedDetailType: 'background' | 'perk'
  selectedBackgroundFitDetail: { backgroundFit: RankedBackgroundFit; rank: number } | null
  detailHistoryNavigationAvailability: DetailHistoryNavigationAvailability
  emphasizedCategoryNames: ReadonlySet<string>
  emphasizedPerkGroupKeys: ReadonlySet<string>
  selectedEmphasisCategoryNames: ReadonlySet<string>
  selectedEmphasisPerkGroupKeys: ReadonlySet<string>
  groupedBackgroundSources: GroupedBackgroundSource[]
  hoveredBuildPerkId: string | null
  hoveredBuildPerkTooltipId: string | undefined
  hoveredPerkId: string | null
  mustHavePickedPerkIds: string[]
  onAddPerkToBuild: (perkId: string, requirement: BuildRequirement) => void
  onCloseBuildPerkHover: (perkId: string) => void
  onCloseBuildPerkTooltip: () => void
  onClosePerkGroupHover: (perkGroupKey: string) => void
  onInspectPerk: (perkId: string, perkGroupSelection?: BuildPerkPillSelection) => void
  onInspectPerkGroup: (categoryName: string, perkGroupId: string) => void
  onNavigateDetailHistory: (direction: -1 | 1) => void
  onOpenBuildPerkHover: (perkId: string, perkGroupSelection?: BuildPerkPillSelection) => void
  onOpenBuildPerkTooltip: (
    perkId: string,
    currentTarget: HTMLElement,
    perkGroupSelection?: BuildPerkPillSelection,
  ) => void
  onOpenPerkGroupHover: (categoryName: string, perkGroupId: string) => void
  onRemovePerkFromBuild: (perkId: string) => void
  optionalPickedPerkIds: string[]
  mustHavePickedPerkCount: number
  optionalPickedPerkCount: number
  pickedPerkCount: number
  selectedPerkRequirement: BuildRequirement | null
  selectedPerk: LegendsPerkRecord | null
  studyResourceFilter: BackgroundStudyResourceFilter
  supportedBuildTargetPerkGroups: BuildTargetPerkGroup[]
}

type DetailHistoryNavigationAvailability = {
  next: boolean
  previous: boolean
}

type DetailCollapsibleSectionKey =
  | 'background-details'
  | 'background-fit'
  | 'matched-perk-groups'
  | 'other-native-perk-groups'

type DetailCollapsibleSectionExpandedStates = Partial<Record<DetailCollapsibleSectionKey, boolean>>

const defaultDetailCollapsibleSectionExpandedStates = {
  'background-details': false,
  'background-fit': true,
  'matched-perk-groups': true,
  'other-native-perk-groups': false,
} satisfies Record<DetailCollapsibleSectionKey, boolean>

function getDetailCollapsibleSectionExpandedState(
  expandedStates: DetailCollapsibleSectionExpandedStates,
  sectionKey: DetailCollapsibleSectionKey,
): boolean {
  return expandedStates[sectionKey] ?? defaultDetailCollapsibleSectionExpandedStates[sectionKey]
}

function renderBackgroundSource(backgroundSource: GroupedBackgroundSource) {
  return (
    <>
      <div>
        <span
          className={styles.detailBackgroundSourceNames}
          data-testid="detail-background-source-names"
        >
          {backgroundSource.backgroundNames.join(', ')}
        </span>
      </div>
      <span className={styles.detailBadge} data-testid="detail-badge">
        {formatBackgroundSourceProbabilityLabel(backgroundSource.probability)}
      </span>
    </>
  )
}

function renderFavouredEnemyTarget(favouredEnemyTarget: LegendsFavouredEnemyTarget) {
  return (
    <>
      <div>
        <strong>{favouredEnemyTarget.entityName}</strong>
      </div>
      <span className={styles.detailBadge} data-testid="detail-badge">
        {favouredEnemyTarget.killsPerPercentBonus === null
          ? 'Varies'
          : `${favouredEnemyTarget.killsPerPercentBonus} kills / 1%`}
      </span>
    </>
  )
}

function renderPerkDescriptionParagraph(paragraph: string): ReactNode {
  const effectHeadingMatch = paragraph
    .trim()
    .match(/^(Passive|Active|Specialist Weapon Perk):\s+(.+)$/u)

  if (!effectHeadingMatch) {
    return formatDisplayBulletText(paragraph)
  }

  return (
    <>
      <span data-testid="perk-description-effect-heading">{effectHeadingMatch[1]}:</span>
      <br />
      {formatDisplayBulletText(effectHeadingMatch[2])}
    </>
  )
}

export function DetailPanel({
  selectedDetailType,
  selectedBackgroundFitDetail,
  detailHistoryNavigationAvailability,
  emphasizedCategoryNames,
  emphasizedPerkGroupKeys,
  selectedEmphasisCategoryNames,
  selectedEmphasisPerkGroupKeys,
  groupedBackgroundSources,
  hoveredBuildPerkId,
  hoveredBuildPerkTooltipId,
  hoveredPerkId,
  mustHavePickedPerkIds,
  onAddPerkToBuild,
  onCloseBuildPerkHover,
  onCloseBuildPerkTooltip,
  onClosePerkGroupHover,
  onInspectPerk,
  onInspectPerkGroup,
  onNavigateDetailHistory,
  onOpenBuildPerkHover,
  onOpenBuildPerkTooltip,
  onOpenPerkGroupHover,
  onRemovePerkFromBuild,
  optionalPickedPerkIds,
  mustHavePickedPerkCount,
  optionalPickedPerkCount,
  pickedPerkCount,
  selectedPerkRequirement,
  selectedPerk,
  studyResourceFilter,
  supportedBuildTargetPerkGroups,
}: DetailPanelProps) {
  const displayedBackgroundFitDetail =
    selectedDetailType === 'background' ? selectedBackgroundFitDetail : null
  const [detailCollapsibleSectionExpandedStates, setDetailCollapsibleSectionExpandedStates] =
    useState<DetailCollapsibleSectionExpandedStates>({})

  function updateDetailCollapsibleSectionExpandedState(
    sectionKey: DetailCollapsibleSectionKey,
    nextIsExpanded: boolean,
  ) {
    setDetailCollapsibleSectionExpandedStates((currentExpandedStates) => {
      if (currentExpandedStates[sectionKey] === nextIsExpanded) {
        return currentExpandedStates
      }

      return {
        ...currentExpandedStates,
        [sectionKey]: nextIsExpanded,
      }
    })
  }

  return (
    <aside aria-label="Details" className={styles.detailPanel} data-testid="detail-panel">
      <div
        aria-live="polite"
        className={joinClassNames(styles.detailPanelBody, 'app-scrollbar')}
        data-scroll-container="true"
        data-testid="detail-panel-body"
      >
        {displayedBackgroundFitDetail ? (
          <BackgroundDetail
            backgroundFit={displayedBackgroundFitDetail.backgroundFit}
            emphasizedCategoryNames={emphasizedCategoryNames}
            emphasizedPerkGroupKeys={emphasizedPerkGroupKeys}
            selectedEmphasisCategoryNames={selectedEmphasisCategoryNames}
            selectedEmphasisPerkGroupKeys={selectedEmphasisPerkGroupKeys}
            detailCollapsibleSectionExpandedStates={detailCollapsibleSectionExpandedStates}
            detailHistoryNavigationAvailability={detailHistoryNavigationAvailability}
            hoveredBuildPerkId={hoveredBuildPerkId}
            hoveredBuildPerkTooltipId={hoveredBuildPerkTooltipId}
            hoveredPerkId={hoveredPerkId}
            mustHavePickedPerkIds={mustHavePickedPerkIds}
            mustHavePickedPerkCount={mustHavePickedPerkCount}
            onCloseBuildPerkHover={onCloseBuildPerkHover}
            onCloseBuildPerkTooltip={onCloseBuildPerkTooltip}
            onClosePerkGroupHover={onClosePerkGroupHover}
            onInspectPerk={onInspectPerk}
            onInspectPerkGroup={onInspectPerkGroup}
            onDetailCollapsibleSectionExpandedChange={updateDetailCollapsibleSectionExpandedState}
            onNavigateDetailHistory={onNavigateDetailHistory}
            onOpenBuildPerkHover={onOpenBuildPerkHover}
            onOpenBuildPerkTooltip={onOpenBuildPerkTooltip}
            onOpenPerkGroupHover={onOpenPerkGroupHover}
            optionalPickedPerkIds={optionalPickedPerkIds}
            optionalPickedPerkCount={optionalPickedPerkCount}
            pickedPerkCount={pickedPerkCount}
            rank={displayedBackgroundFitDetail.rank}
            studyResourceFilter={studyResourceFilter}
            supportedBuildTargetPerkGroups={supportedBuildTargetPerkGroups}
          />
        ) : selectedPerk === null ? (
          <div className={sharedStyles.emptyState} data-testid="empty-state">
            <h2>Select a perk or background</h2>
            <p>Pick any perk or background to inspect its details.</p>
          </div>
        ) : (
          <>
            <DetailHeader
              actions={
                <BuildToggleButton
                  onAddMustHave={() => onAddPerkToBuild(selectedPerk.id, 'must-have')}
                  onAddOptional={() => onAddPerkToBuild(selectedPerk.id, 'optional')}
                  onRemove={() => onRemovePerkFromBuild(selectedPerk.id)}
                  pickedRequirement={selectedPerkRequirement}
                  perkName={selectedPerk.perkName}
                  source="detail"
                />
              }
              eyebrow={selectedPerk.primaryCategoryName}
              iconLabel={`${selectedPerk.perkName} icon`}
              iconPath={getPerkDisplayIconPath(selectedPerk)}
              iconTestId="detail-perk-icon"
              navigationAvailability={detailHistoryNavigationAvailability}
              onNavigateHistory={onNavigateDetailHistory}
              title={selectedPerk.perkName}
            />

            <div className={styles.detailSection} data-testid="detail-section">
              <h3>Details</h3>
              {selectedPerk.descriptionParagraphs.length > 0 ? (
                selectedPerk.descriptionParagraphs.map((paragraph, paragraphIndex) => (
                  <p
                    data-testid="perk-description-paragraph"
                    key={`${paragraphIndex}-${paragraph}`}
                  >
                    {renderPerkDescriptionParagraph(paragraph)}
                  </p>
                ))
              ) : (
                <p>No perk description is available in the local strings file.</p>
              )}
            </div>

            <div className={styles.detailSection} data-testid="detail-section">
              <h3>Perk group placement</h3>
              {selectedPerk.placements.length > 0 ? (
                <ul className={styles.detailPlacementList}>
                  {selectedPerk.placements.map((placement) => (
                    <li
                      key={`${placement.categoryName}-${placement.perkGroupId}-${placement.tier ?? 'none'}`}
                    >
                      <BuildPerkGroupTile
                        className={styles.detailPlacementTile}
                        emphasizedCategoryNames={emphasizedCategoryNames}
                        emphasizedPerkGroupKeys={emphasizedPerkGroupKeys}
                        selectedEmphasisCategoryNames={selectedEmphasisCategoryNames}
                        selectedEmphasisPerkGroupKeys={selectedEmphasisPerkGroupKeys}
                        groupLabel={placement.perkGroupName}
                        groupOptions={[
                          {
                            categoryName: placement.categoryName,
                            perkGroupIconPath:
                              placement.perkGroupIconPath ?? getPerkDisplayIconPath(selectedPerk),
                            perkGroupId: placement.perkGroupId,
                            perkGroupLabel: placement.perkGroupName,
                          },
                        ]}
                        hoveredBuildPerkId={hoveredBuildPerkId}
                        hoveredBuildPerkTooltipId={hoveredBuildPerkTooltipId}
                        hoveredPerkId={hoveredPerkId}
                        isWide
                        metaClassName={styles.detailPlacementTierBadge}
                        metaLabel={getTierLabel(placement.tier)}
                        metaTestId="detail-placement-tier-badge"
                        onCloseBuildPerkHover={onCloseBuildPerkHover}
                        onCloseBuildPerkTooltip={onCloseBuildPerkTooltip}
                        onClosePerkGroupHover={onClosePerkGroupHover}
                        onInspectPerk={onInspectPerk}
                        onInspectPerkGroup={onInspectPerkGroup}
                        onOpenBuildPerkHover={onOpenBuildPerkHover}
                        onOpenBuildPerkTooltip={onOpenBuildPerkTooltip}
                        onOpenPerkGroupHover={onOpenPerkGroupHover}
                        perks={[
                          {
                            iconPath: getPerkDisplayIconPath(selectedPerk),
                            perkId: selectedPerk.id,
                            perkName: selectedPerk.perkName,
                          },
                        ]}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p>This perk is defined locally but not assigned to a parsed perk group.</p>
              )}
            </div>

            {selectedPerk.favouredEnemyTargets && selectedPerk.favouredEnemyTargets.length > 0 ? (
              <div className={styles.detailSection} data-testid="detail-section">
                <h3>Favoured enemy targets</h3>
                <ul className={styles.detailList}>
                  {selectedPerk.favouredEnemyTargets.map((favouredEnemyTarget) => (
                    <li key={favouredEnemyTarget.entityConstName}>
                      {renderFavouredEnemyTarget(favouredEnemyTarget)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className={styles.detailSection} data-testid="detail-section">
              <h3>Background sources</h3>
              {groupedBackgroundSources.length > 0 ? (
                <ul className={styles.detailList}>
                  {groupedBackgroundSources.map((backgroundSource) => (
                    <li
                      key={`${backgroundSource.probability}-${backgroundSource.backgroundNames.join('::')}`}
                    >
                      {renderBackgroundSource(backgroundSource)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No matching dynamic background pools were found for this perk.</p>
              )}
            </div>

            <div className={styles.detailSection} data-testid="detail-section">
              <h3>Scenario overlays</h3>
              {selectedPerk.scenarioSources.length > 0 ? (
                <ul className={styles.detailList}>
                  {selectedPerk.scenarioSources.map((scenarioSource) => (
                    <li
                      key={`${scenarioSource.scenarioId}-${scenarioSource.grantType}-${scenarioSource.sourceMethodName}`}
                    >
                      <div>
                        <strong>{scenarioSource.scenarioName}</strong>
                        <p className={styles.detailSupport}>
                          {formatScenarioGrantLabel(scenarioSource)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No scenario grants or build-time overlays were found for this perk.</p>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  )
}

function DetailHeader({
  actions,
  badgeRow,
  eyebrow,
  iconLabel,
  iconPath,
  iconTestId,
  navigationAvailability,
  onNavigateHistory,
  title,
}: {
  actions?: ReactNode
  badgeRow?: ReactNode
  eyebrow: string
  iconLabel: string
  iconPath: string | null
  iconTestId: string
  navigationAvailability: DetailHistoryNavigationAvailability
  onNavigateHistory: (direction: -1 | 1) => void
  title: string
}) {
  return (
    <div className={styles.detailHeader}>
      <div className={styles.detailHeaderMain}>
        {renderGameIcon({
          className: joinClassNames(sharedStyles.perkIcon, sharedStyles.perkIconLarge),
          iconPath,
          label: iconLabel,
          testId: iconTestId,
        })}
        <div>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h2>{title}</h2>
          {badgeRow}
        </div>
      </div>
      <div className={styles.detailHeaderActions} data-testid="detail-header-actions">
        <DetailHistoryNavigation
          navigationAvailability={navigationAvailability}
          onNavigateHistory={onNavigateHistory}
        />
        <div
          className={styles.detailHeaderPrimaryAction}
          data-testid="detail-header-primary-action"
        >
          {actions}
        </div>
      </div>
    </div>
  )
}

function DetailHistoryNavigation({
  navigationAvailability,
  onNavigateHistory,
}: {
  navigationAvailability: DetailHistoryNavigationAvailability
  onNavigateHistory: (direction: -1 | 1) => void
}) {
  return (
    <div className={styles.detailHistoryNavigation} aria-label="Detail history navigation">
      <button
        aria-label="Show previous detail"
        className={styles.detailHistoryButton}
        disabled={!navigationAvailability.previous}
        onClick={() => onNavigateHistory(-1)}
        title="Show previous detail"
        type="button"
      >
        <ArrowLeft aria-hidden="true" className={styles.detailHistoryIcon} />
      </button>
      <button
        aria-label="Show next detail"
        className={styles.detailHistoryButton}
        disabled={!navigationAvailability.next}
        onClick={() => onNavigateHistory(1)}
        title="Show next detail"
        type="button"
      >
        <ArrowRight aria-hidden="true" className={styles.detailHistoryIcon} />
      </button>
    </div>
  )
}

function DetailCollapsibleSection({
  children,
  contentClassName,
  contentTestId,
  count,
  countLabel,
  defaultExpanded = true,
  isExpanded,
  onExpandedChange,
  sectionLabel,
  sectionTestId = 'detail-section',
  toggleTestId,
}: {
  children: ReactNode
  contentClassName?: string
  contentTestId?: string
  count?: number
  countLabel?: string
  defaultExpanded?: boolean
  isExpanded?: boolean
  onExpandedChange?: (nextIsExpanded: boolean) => void
  sectionLabel: string
  sectionTestId?: string
  toggleTestId?: string
}) {
  const sectionContentId = useId()
  const [uncontrolledIsExpanded, setUncontrolledIsExpanded] = useState(defaultExpanded)
  const resolvedIsExpanded = isExpanded ?? uncontrolledIsExpanded

  function toggleExpanded() {
    const nextIsExpanded = !resolvedIsExpanded

    if (isExpanded === undefined) {
      setUncontrolledIsExpanded(nextIsExpanded)
    }

    onExpandedChange?.(nextIsExpanded)
  }

  return (
    <section
      className={styles.detailCollapsibleSection}
      data-expanded={resolvedIsExpanded}
      data-testid={sectionTestId}
    >
      <h3 className={styles.detailCollapsibleHeading}>
        <button
          aria-controls={sectionContentId}
          aria-expanded={resolvedIsExpanded}
          className={styles.detailCollapsibleToggle}
          data-testid={toggleTestId}
          onClick={toggleExpanded}
          title={`${resolvedIsExpanded ? 'Collapse' : 'Expand'} ${sectionLabel.toLowerCase()}`}
          type="button"
        >
          <PlannerSectionChevron
            className={styles.detailCollapsibleChevron}
            isExpanded={resolvedIsExpanded}
          />
          <span className={styles.detailCollapsibleToggleHeading}>{sectionLabel}</span>
          {count === undefined ? null : (
            <span
              aria-label={countLabel ?? `${count} ${sectionLabel.toLowerCase()}`}
              className={styles.detailCollapsibleToggleCount}
              data-testid={
                toggleTestId === undefined
                  ? undefined
                  : `${toggleTestId.replace(/-toggle$/u, '')}-count`
              }
            >
              {count}
            </span>
          )}
        </button>
      </h3>

      {resolvedIsExpanded ? (
        <div
          aria-label={sectionLabel}
          className={joinClassNames(styles.detailCollapsibleContent, contentClassName)}
          data-testid={contentTestId}
          id={sectionContentId}
          role="region"
        >
          {children}
        </div>
      ) : null}
    </section>
  )
}

function getScopedBackgroundFitMatches(
  matches: BackgroundFitMatch[],
  pickedPerkIds: readonly string[],
): BackgroundFitMatch[] {
  if (pickedPerkIds.length === 0) {
    return []
  }

  const pickedPerkIdSet = new Set(pickedPerkIds)

  return matches.flatMap((match) => {
    const scopedPickedPerkIconPaths: Array<string | null> = []
    const scopedPickedPerkIds: string[] = []
    const scopedPickedPerkNames: string[] = []

    for (const [pickedPerkIndex, pickedPerkId] of match.pickedPerkIds.entries()) {
      if (!pickedPerkIdSet.has(pickedPerkId)) {
        continue
      }

      scopedPickedPerkIconPaths.push(match.pickedPerkIconPaths[pickedPerkIndex] ?? null)
      scopedPickedPerkIds.push(pickedPerkId)
      scopedPickedPerkNames.push(match.pickedPerkNames[pickedPerkIndex] ?? pickedPerkId)
    }

    if (scopedPickedPerkIds.length === 0) {
      return []
    }

    return [
      {
        ...match,
        pickedPerkCount: scopedPickedPerkIds.length,
        pickedPerkIconPaths: scopedPickedPerkIconPaths,
        pickedPerkIds: scopedPickedPerkIds,
        pickedPerkNames: scopedPickedPerkNames,
      },
    ]
  })
}

function getChanceBreakdownLabel(entry: BackgroundFitStudyResourceChanceBreakdownEntry): string {
  if (entry.shouldAllowBook && entry.shouldAllowScroll) {
    return entry.shouldAllowSecondScroll
      ? 'Skill book and ancient scrolls'
      : 'Skill book and ancient scroll'
  }

  if (entry.shouldAllowBook) {
    return 'Skill book'
  }

  if (entry.shouldAllowScroll) {
    return entry.shouldAllowSecondScroll ? 'Ancient scrolls' : 'Ancient scroll'
  }

  return 'Native roll'
}

function BackgroundFitChanceBreakdown({
  entries,
}: {
  entries?: BackgroundFitStudyResourceChanceBreakdownEntry[]
}) {
  if (!entries || entries.length <= 1) {
    return null
  }

  return (
    <div
      aria-label="Must-have chance breakdown"
      className={styles.detailChanceBreakdown}
      data-testid="detail-chance-breakdown"
    >
      <h4 className={styles.detailSubsectionHeading}>Must-have chance breakdown</h4>
      <dl className={styles.detailChanceBreakdownList}>
        {entries.map((entry) => (
          <div className={styles.detailChanceBreakdownRow} key={entry.key}>
            <dt>{getChanceBreakdownLabel(entry)}</dt>
            <dd>{formatBackgroundFitProbabilityLabel(entry.probability)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

type StudyResourceStrategyResourceKind = 'book' | 'scroll'

function getStudyResourceStrategyTargets({
  resourceKind,
  strategy,
}: {
  resourceKind: StudyResourceStrategyResourceKind
  strategy: BackgroundFitStudyResourceStrategy
}): BackgroundFitStudyResourceStrategyTarget[] {
  return resourceKind === 'book' ? strategy.bookTargets : strategy.scrollTargets
}

function getStudyResourceStrategyResourceIconPath(
  resourceKind: StudyResourceStrategyResourceKind,
): string {
  return resourceKind === 'book' ? skillBookIconPath : ancientScrollIconPath
}

function getStudyResourceStrategyResourceLabel(
  resourceKind: StudyResourceStrategyResourceKind,
): string {
  return resourceKind === 'book' ? 'Skill book' : 'Ancient scroll'
}

type StudyResourceStrategyCoveredPerk = {
  iconPath: string | null
  perkGroupSelection: BuildPerkPillSelection
  perkId: string
  perkName: string
}

type StudyResourcePlanPerkInteractionProps = {
  hoveredBuildPerkId: string | null
  hoveredBuildPerkTooltipId: string | undefined
  hoveredPerkId: string | null
  onCloseBuildPerkHover: (perkId: string) => void
  onCloseBuildPerkTooltip: () => void
  onInspectPerk: (perkId: string, perkGroupSelection?: BuildPerkPillSelection) => void
  onOpenBuildPerkHover: (perkId: string, perkGroupSelection?: BuildPerkPillSelection) => void
  onOpenBuildPerkTooltip: (
    perkId: string,
    currentTarget: HTMLElement,
    perkGroupSelection?: BuildPerkPillSelection,
  ) => void
}

function findBuildTargetPerkGroupForCoveredPerk({
  perkId,
  supportedBuildTargetPerkGroups,
  target,
}: {
  perkId: string
  supportedBuildTargetPerkGroups: BuildTargetPerkGroup[]
  target: BackgroundFitStudyResourceStrategyTarget
}): BuildTargetPerkGroup | undefined {
  return (
    supportedBuildTargetPerkGroups.find(
      (buildTargetPerkGroup) =>
        buildTargetPerkGroup.categoryName === target.categoryName &&
        buildTargetPerkGroup.perkGroupId === target.perkGroupId &&
        buildTargetPerkGroup.pickedPerkIds.includes(perkId),
    ) ??
    supportedBuildTargetPerkGroups.find((buildTargetPerkGroup) =>
      buildTargetPerkGroup.pickedPerkIds.includes(perkId),
    )
  )
}

function getStudyResourceStrategyCoveredPerks({
  supportedBuildTargetPerkGroups,
  targets,
}: {
  supportedBuildTargetPerkGroups: BuildTargetPerkGroup[]
  targets: BackgroundFitStudyResourceStrategyTarget[]
}): StudyResourceStrategyCoveredPerk[] {
  const coveredPerks: StudyResourceStrategyCoveredPerk[] = []
  const coveredPerkIdSet = new Set<string>()

  for (const target of targets) {
    for (const [coveredPerkIndex, coveredPickedPerkId] of target.coveredPickedPerkIds.entries()) {
      if (coveredPerkIdSet.has(coveredPickedPerkId)) {
        continue
      }

      const buildTargetPerkGroup = findBuildTargetPerkGroupForCoveredPerk({
        perkId: coveredPickedPerkId,
        supportedBuildTargetPerkGroups,
        target,
      })
      const buildTargetPerkIndex =
        buildTargetPerkGroup?.pickedPerkIds.indexOf(coveredPickedPerkId) ?? -1

      coveredPerkIdSet.add(coveredPickedPerkId)
      coveredPerks.push({
        iconPath:
          buildTargetPerkIndex >= 0
            ? (buildTargetPerkGroup?.pickedPerkIconPaths[buildTargetPerkIndex] ?? null)
            : null,
        perkGroupSelection: {
          categoryName: target.categoryName,
          perkGroupId: target.perkGroupId,
        },
        perkId: coveredPickedPerkId,
        perkName: target.coveredPickedPerkNames[coveredPerkIndex] ?? coveredPickedPerkId,
      })
    }
  }

  return coveredPerks
}

function areStudyResourceStrategyTargetSetsEqual(
  leftTargets: BackgroundFitStudyResourceStrategyTarget[],
  rightTargets: BackgroundFitStudyResourceStrategyTarget[],
): boolean {
  if (leftTargets.length !== rightTargets.length) {
    return false
  }

  const leftKeys = leftTargets
    .map((target) => `${target.categoryName}::${target.perkGroupId}`)
    .toSorted()
  const rightKeys = rightTargets
    .map((target) => `${target.categoryName}::${target.perkGroupId}`)
    .toSorted()

  return leftKeys.every((leftKey, targetIndex) => leftKey === rightKeys[targetIndex])
}

function areStudyResourceStrategiesEquivalent(
  leftStrategy: BackgroundFitStudyResourceStrategy | undefined,
  rightStrategy: BackgroundFitStudyResourceStrategy | undefined,
): boolean {
  if (!leftStrategy || !rightStrategy) {
    return leftStrategy === rightStrategy
  }

  return (
    leftStrategy.selectedCombinationKey === rightStrategy.selectedCombinationKey &&
    leftStrategy.shouldAllowSecondScroll === rightStrategy.shouldAllowSecondScroll &&
    areStudyResourceStrategyTargetSetsEqual(leftStrategy.bookTargets, rightStrategy.bookTargets) &&
    areStudyResourceStrategyTargetSetsEqual(leftStrategy.scrollTargets, rightStrategy.scrollTargets)
  )
}

function BackgroundFitStudyResourcePlanRow({
  hoveredBuildPerkId,
  hoveredBuildPerkTooltipId,
  hoveredPerkId,
  onCloseBuildPerkHover,
  onCloseBuildPerkTooltip,
  onInspectPerk,
  onOpenBuildPerkHover,
  onOpenBuildPerkTooltip,
  resourceKind,
  strategy,
  supportedBuildTargetPerkGroups,
}: {
  resourceKind: StudyResourceStrategyResourceKind
  strategy: BackgroundFitStudyResourceStrategy
  supportedBuildTargetPerkGroups: BuildTargetPerkGroup[]
} & StudyResourcePlanPerkInteractionProps) {
  const targets = getStudyResourceStrategyTargets({ resourceKind, strategy })

  if (targets.length === 0) {
    return null
  }

  const resourceLabel = getStudyResourceStrategyResourceLabel(resourceKind)
  const targetNames = formatStudyResourceStrategyTargetNames(targets)
  const coveredPerks = getStudyResourceStrategyCoveredPerks({
    supportedBuildTargetPerkGroups,
    targets,
  })

  return (
    <div
      className={styles.detailStudyResourcePlanRow}
      data-resource-kind={resourceKind}
      data-testid="detail-study-resource-plan-row"
    >
      <img
        alt=""
        aria-hidden="true"
        className={styles.detailStudyResourcePlanIcon}
        decoding="async"
        loading="lazy"
        src={`/game-icons/${getStudyResourceStrategyResourceIconPath(resourceKind)}`}
      />
      <div className={styles.detailStudyResourcePlanText}>
        <p className={styles.detailStudyResourcePlanMain}>
          <span>{resourceLabel}: </span>
          <strong>{targetNames}</strong>
          {resourceKind === 'book' && targets.length > 1 ? (
            <span>, depending on native roll</span>
          ) : null}
        </p>
        {coveredPerks.length > 0 ? (
          <div className={styles.detailStudyResourcePlanSupport}>
            <span className={styles.detailStudyResourcePlanSupportLabel}>Covers</span>
            <ul
              aria-label={`Covered perks for ${resourceLabel.toLowerCase()}`}
              className={styles.detailStudyResourceCoveredPerkList}
            >
              {coveredPerks.map((coveredPerk) => (
                <li key={`${resourceKind}-${coveredPerk.perkId}`}>
                  <BuildPerkPill
                    hoveredBuildPerkId={hoveredBuildPerkId}
                    hoveredBuildPerkTooltipId={hoveredBuildPerkTooltipId}
                    hoveredPerkId={hoveredPerkId}
                    onCloseHover={onCloseBuildPerkHover}
                    onCloseTooltip={onCloseBuildPerkTooltip}
                    onInspectPerk={onInspectPerk}
                    onOpenHover={onOpenBuildPerkHover}
                    onOpenTooltip={onOpenBuildPerkTooltip}
                    perkGroupSelection={coveredPerk.perkGroupSelection}
                    perkIconPath={coveredPerk.iconPath}
                    perkId={coveredPerk.perkId}
                    perkName={coveredPerk.perkName}
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function BackgroundFitStudyResourcePlanScope({
  label,
  strategy,
  ...interactionProps
}: {
  label: string
  strategy: BackgroundFitStudyResourceStrategy
  supportedBuildTargetPerkGroups: BuildTargetPerkGroup[]
} & StudyResourcePlanPerkInteractionProps) {
  return (
    <section
      aria-label={label}
      className={styles.detailStudyResourcePlanScope}
      data-testid="detail-study-resource-plan-scope"
    >
      <h5 className={styles.detailStudyResourcePlanScopeHeading}>{label}</h5>
      <div className={styles.detailStudyResourcePlanRows}>
        <BackgroundFitStudyResourcePlanRow
          {...interactionProps}
          resourceKind="scroll"
          strategy={strategy}
        />
        <BackgroundFitStudyResourcePlanRow
          {...interactionProps}
          resourceKind="book"
          strategy={strategy}
        />
      </div>
    </section>
  )
}

function BackgroundFitStudyResourcePlan({
  fullBuildStrategy,
  hoveredBuildPerkId,
  hoveredBuildPerkTooltipId,
  hoveredPerkId,
  mustHaveStrategy,
  onCloseBuildPerkHover,
  onCloseBuildPerkTooltip,
  onInspectPerk,
  onOpenBuildPerkHover,
  onOpenBuildPerkTooltip,
  optionalPickedPerkCount,
  supportedBuildTargetPerkGroups,
}: {
  fullBuildStrategy?: BackgroundFitStudyResourceStrategy
  mustHaveStrategy?: BackgroundFitStudyResourceStrategy
  optionalPickedPerkCount: number
  supportedBuildTargetPerkGroups: BuildTargetPerkGroup[]
} & StudyResourcePlanPerkInteractionProps) {
  const shouldShowFullBuildStrategy =
    optionalPickedPerkCount > 0 &&
    fullBuildStrategy !== undefined &&
    !areStudyResourceStrategiesEquivalent(fullBuildStrategy, mustHaveStrategy)

  if (!mustHaveStrategy && !shouldShowFullBuildStrategy) {
    return null
  }

  return (
    <div className={styles.detailStudyResourcePlan} data-testid="detail-study-resource-plan">
      <h4 className={styles.detailSubsectionHeading}>Study resource plan</h4>
      <div className={styles.detailStudyResourcePlanScopes}>
        {mustHaveStrategy ? (
          <BackgroundFitStudyResourcePlanScope
            hoveredBuildPerkId={hoveredBuildPerkId}
            hoveredBuildPerkTooltipId={hoveredBuildPerkTooltipId}
            hoveredPerkId={hoveredPerkId}
            label="Must-have impact"
            onCloseBuildPerkHover={onCloseBuildPerkHover}
            onCloseBuildPerkTooltip={onCloseBuildPerkTooltip}
            onInspectPerk={onInspectPerk}
            onOpenBuildPerkHover={onOpenBuildPerkHover}
            onOpenBuildPerkTooltip={onOpenBuildPerkTooltip}
            strategy={mustHaveStrategy}
            supportedBuildTargetPerkGroups={supportedBuildTargetPerkGroups}
          />
        ) : null}
        {shouldShowFullBuildStrategy && fullBuildStrategy ? (
          <BackgroundFitStudyResourcePlanScope
            hoveredBuildPerkId={hoveredBuildPerkId}
            hoveredBuildPerkTooltipId={hoveredBuildPerkTooltipId}
            hoveredPerkId={hoveredPerkId}
            label="Full-build impact"
            onCloseBuildPerkHover={onCloseBuildPerkHover}
            onCloseBuildPerkTooltip={onCloseBuildPerkTooltip}
            onInspectPerk={onInspectPerk}
            onOpenBuildPerkHover={onOpenBuildPerkHover}
            onOpenBuildPerkTooltip={onOpenBuildPerkTooltip}
            strategy={fullBuildStrategy}
            supportedBuildTargetPerkGroups={supportedBuildTargetPerkGroups}
          />
        ) : null}
      </div>
    </div>
  )
}

const backgroundCampResourceModifierGroupOrder: LegendsBackgroundCampResourceModifierGroup[] = [
  'capacity',
  'skill',
  'terrain',
]

function getGroupedCampResourceModifiers(
  campResourceModifiers: LegendsBackgroundCampResourceModifier[],
): {
  group: LegendsBackgroundCampResourceModifierGroup
  modifiers: LegendsBackgroundCampResourceModifier[]
}[] {
  return backgroundCampResourceModifierGroupOrder.flatMap((group) => {
    const modifiers = campResourceModifiers.filter((modifier) => modifier.group === group)

    return modifiers.length > 0 ? [{ group, modifiers }] : []
  })
}

const backgroundTalentAttributeIconPathsByName: Readonly<Partial<Record<string, string>>> = {
  Fatigue: 'ui/icons/fatigue_va11.png',
  Hitpoints: 'ui/icons/health_va11.png',
  Initiative: 'ui/icons/initiative_va11.png',
  'Melee defense': 'ui/icons/melee_defense_va11.png',
  'Melee skill': 'ui/icons/melee_skill_va11.png',
  'Ranged defense': 'ui/icons/ranged_defense_va11.png',
  'Ranged skill': 'ui/icons/ranged_skill_va11.png',
  Resolve: 'ui/icons/bravery_va11.png',
}

function getBackgroundTalentAttributeIconPath(attributeName: string): string | null {
  return backgroundTalentAttributeIconPathsByName[attributeName] ?? null
}

function renderBackgroundTalentAttributes(attributeNames: readonly string[]) {
  if (attributeNames.length === 0) {
    return <span className={styles.detailMetadataNone}>None</span>
  }

  return (
    <ul className={styles.detailTalentAttributeList}>
      {attributeNames.map((attributeName) => {
        const iconPath = getBackgroundTalentAttributeIconPath(attributeName)

        return (
          <li key={attributeName}>
            {iconPath ? (
              <img
                alt=""
                aria-hidden="true"
                className={styles.detailTalentAttributeIcon}
                data-testid="detail-background-talent-attribute-icon"
                decoding="async"
                loading="lazy"
                src={`/game-icons/${iconPath}`}
              />
            ) : (
              <span
                aria-hidden="true"
                className={styles.detailTalentAttributeIcon}
                data-placeholder="true"
                data-testid="detail-background-talent-attribute-icon"
              />
            )}
            <span>{attributeName}</span>
          </li>
        )
      })}
    </ul>
  )
}

function renderBackgroundMetadataPlainTextValues(values: readonly string[]) {
  if (values.length === 0) {
    return <span className={styles.detailMetadataNone}>None</span>
  }

  return <span className={styles.detailMetadataValueText}>{values.join(', ')}</span>
}

type BackgroundTraitRelationship = 'excluded' | 'guaranteed'

type BackgroundTraitTooltipState = {
  anchorRectangle: TooltipAnchorRectangle
  relationship: BackgroundTraitRelationship
  trait: LegendsBackgroundTrait
  traitId: string
}

const backgroundTraitTooltipSelector = '[data-background-trait-tooltip="true"]'

function getBackgroundTraitId(
  trait: LegendsBackgroundTrait,
  relationship: BackgroundTraitRelationship,
) {
  return `${relationship}-${trait.traitName}-${trait.iconPath ?? 'no-icon'}`
}

function BackgroundTraitPill({
  activeTraitTooltipId,
  hoveredTraitId,
  onCloseTraitHover,
  onCloseTraitTooltip,
  onOpenTraitHover,
  onOpenTraitTooltip,
  relationship,
  trait,
}: {
  activeTraitTooltipId: string | undefined
  hoveredTraitId: string | null
  onCloseTraitHover: (traitId: string) => void
  onCloseTraitTooltip: () => void
  onOpenTraitHover: (traitId: string) => void
  onOpenTraitTooltip: (
    trait: LegendsBackgroundTrait,
    relationship: BackgroundTraitRelationship,
    traitId: string,
    currentTarget: HTMLElement,
  ) => void
  relationship: BackgroundTraitRelationship
  trait: LegendsBackgroundTrait
}) {
  const traitId = getBackgroundTraitId(trait, relationship)
  const {
    activeTooltipIndicatorPerkId,
    clearPendingTooltip,
    closeTooltipPreview,
    openTooltipPreview,
  } = useBuildPerkTooltipPreview({
    hoveredBuildPerkId: hoveredTraitId,
    onCloseHover: onCloseTraitHover,
    onCloseTooltip: onCloseTraitTooltip,
    onOpenHover: onOpenTraitHover,
    onOpenTooltip: (openedTraitId, currentTarget) => {
      onOpenTraitTooltip(trait, relationship, openedTraitId, currentTarget)
    },
    tooltipTargetSelector: backgroundTraitTooltipSelector,
  })

  return (
    <button
      aria-describedby={hoveredTraitId === traitId ? activeTraitTooltipId : undefined}
      className={joinClassNames(buildPlannerStyles.plannerPill, styles.detailTraitPill)}
      data-highlighted={hoveredTraitId === traitId}
      data-testid="detail-background-trait-pill"
      data-tooltip-pending={activeTooltipIndicatorPerkId === traitId}
      onBlur={() => closeTooltipPreview(traitId)}
      onClick={(event) => {
        clearPendingTooltip()
        onOpenTraitHover(traitId)
        onOpenTraitTooltip(trait, relationship, traitId, event.currentTarget)
      }}
      onFocus={() => onOpenTraitHover(traitId)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          closeTooltipPreview(traitId)
        }
      }}
      onMouseEnter={(event) => openTooltipPreview(traitId, event.currentTarget)}
      onMouseLeave={(event) => closeTooltipPreview(traitId, event.relatedTarget)}
      type="button"
    >
      {trait.iconPath ? (
        <img
          alt=""
          aria-hidden="true"
          className={styles.detailTraitIcon}
          data-testid="detail-background-trait-icon"
          decoding="async"
          loading="lazy"
          src={`/game-icons/${trait.iconPath}`}
        />
      ) : (
        <span
          aria-hidden="true"
          className={styles.detailTraitIcon}
          data-placeholder="true"
          data-testid="detail-background-trait-icon"
        />
      )}
      <span>{trait.traitName}</span>
    </button>
  )
}

function BackgroundTraitTooltip({
  onCloseTraitHover,
  onCloseTraitTooltip,
  tooltip,
  tooltipId,
}: {
  onCloseTraitHover: (traitId: string) => void
  onCloseTraitTooltip: () => void
  tooltip: BackgroundTraitTooltipState
  tooltipId: string
}) {
  const tooltipElement = (
    <div
      className={buildPlannerStyles.buildPerkTooltip}
      data-background-trait-tooltip="true"
      data-testid="detail-background-trait-tooltip"
      id={tooltipId}
      onMouseLeave={() => {
        onCloseTraitTooltip()
        onCloseTraitHover(tooltip.traitId)
      }}
      role="tooltip"
      style={getAnchoredTooltipStyle(tooltip.anchorRectangle)}
    >
      <div className={buildPlannerStyles.buildPerkTooltipCopy}>
        <p>{tooltip.trait.description || 'No trait description is available.'}</p>
      </div>
    </div>
  )

  return createPortal(tooltipElement, document.body)
}

function renderBackgroundMetadataTraits({
  activeTraitTooltipId,
  hoveredTraitId,
  onCloseTraitHover,
  onCloseTraitTooltip,
  onOpenTraitHover,
  onOpenTraitTooltip,
  relationship,
  traits,
}: {
  activeTraitTooltipId: string | undefined
  hoveredTraitId: string | null
  onCloseTraitHover: (traitId: string) => void
  onCloseTraitTooltip: () => void
  onOpenTraitHover: (traitId: string) => void
  onOpenTraitTooltip: (
    trait: LegendsBackgroundTrait,
    relationship: BackgroundTraitRelationship,
    traitId: string,
    currentTarget: HTMLElement,
  ) => void
  relationship: BackgroundTraitRelationship
  traits: readonly LegendsBackgroundTrait[]
}) {
  if (traits.length === 0) {
    return <span className={styles.detailMetadataNone}>None</span>
  }

  return (
    <ul className={styles.detailTraitPillList}>
      {traits.map((trait) => (
        <li key={`${relationship}-${trait.traitName}`}>
          <BackgroundTraitPill
            activeTraitTooltipId={activeTraitTooltipId}
            hoveredTraitId={hoveredTraitId}
            onCloseTraitHover={onCloseTraitHover}
            onCloseTraitTooltip={onCloseTraitTooltip}
            onOpenTraitHover={onOpenTraitHover}
            onOpenTraitTooltip={onOpenTraitTooltip}
            relationship={relationship}
            trait={trait}
          />
        </li>
      ))}
    </ul>
  )
}

function renderBackgroundMetadataScalar(value: number | null) {
  if (value === null) {
    return <span className={styles.detailMetadataNone}>None</span>
  }

  return <span className={styles.detailMetadataValueText}>{value}</span>
}

function BackgroundMetadataSubsection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className={styles.detailMetadataSection}>
      <h4 className={styles.detailMetadataHeading}>{title}</h4>
      <div className={styles.detailMetadataBody}>{children}</div>
    </section>
  )
}

function BackgroundMetadataFact({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className={styles.detailMetadataFact}>
      <dt>{label}:</dt>
      <dd>{children}</dd>
    </div>
  )
}

function BackgroundMetadataCampResourceModifierSubsection({
  group,
  modifiers,
}: {
  group: LegendsBackgroundCampResourceModifierGroup
  modifiers: LegendsBackgroundCampResourceModifier[]
}) {
  return (
    <BackgroundMetadataSubsection title={backgroundCampResourceModifierGroupLabels[group]}>
      <ul className={styles.detailCampResourceModifierList}>
        {modifiers.map((modifier) => (
          <li key={modifier.modifierKey}>
            <span
              className={styles.detailCampResourceModifierLabel}
              data-testid="detail-camp-resource-modifier-label"
            >
              {modifier.label}
            </span>
            <span
              className={styles.detailCampResourceModifierValue}
              data-testid="detail-camp-resource-modifier-value"
            >
              {formatBackgroundCampResourceModifierValue(modifier)}
            </span>
          </li>
        ))}
      </ul>
    </BackgroundMetadataSubsection>
  )
}

function BackgroundMetadataSection({
  backgroundFit,
  isExpanded,
  onExpandedChange,
}: {
  backgroundFit: RankedBackgroundFit
  isExpanded: boolean
  onExpandedChange: (nextIsExpanded: boolean) => void
}) {
  const backgroundTraitTooltipId = useId()
  const [hoveredTraitId, setHoveredTraitId] = useState<string | null>(null)
  const [traitTooltip, setTraitTooltip] = useState<BackgroundTraitTooltipState | null>(null)
  const groupedCampResourceModifiers = getGroupedCampResourceModifiers(
    backgroundFit.campResourceModifiers,
  )
  const columnCampResourceModifierGroups = groupedCampResourceModifiers.filter(
    ({ group }) => group === 'capacity' || group === 'skill',
  )
  const stackedCampResourceModifierGroups = groupedCampResourceModifiers.filter(
    ({ group }) => group !== 'capacity' && group !== 'skill',
  )

  function closeTraitHover(traitId: string) {
    setHoveredTraitId((currentTraitId) => (currentTraitId === traitId ? null : currentTraitId))
  }

  function closeTraitTooltip() {
    setTraitTooltip(null)
  }

  function openTraitTooltip(
    trait: LegendsBackgroundTrait,
    relationship: BackgroundTraitRelationship,
    traitId: string,
    currentTarget: HTMLElement,
  ) {
    setTraitTooltip({
      anchorRectangle: currentTarget.getBoundingClientRect(),
      relationship,
      trait,
      traitId,
    })
  }

  function updateExpandedState(nextIsExpanded: boolean) {
    if (!nextIsExpanded) {
      setHoveredTraitId(null)
      setTraitTooltip(null)
    }

    onExpandedChange(nextIsExpanded)
  }

  return (
    <DetailCollapsibleSection
      contentClassName={styles.detailMetadataSections}
      contentTestId="detail-background-metadata-content"
      isExpanded={isExpanded}
      onExpandedChange={updateExpandedState}
      sectionLabel="Background details"
      sectionTestId="detail-background-metadata-section"
      toggleTestId="detail-background-metadata-toggle"
    >
      <dl className={styles.detailMetadataFactList}>
        <BackgroundMetadataFact label="Daily cost">
          {renderBackgroundMetadataScalar(backgroundFit.dailyCost)}
        </BackgroundMetadataFact>
        <BackgroundMetadataFact label="Background type">
          {renderBackgroundMetadataPlainTextValues(backgroundFit.backgroundTypeNames)}
        </BackgroundMetadataFact>
      </dl>
      <BackgroundMetadataSubsection title="Excluded traits">
        {renderBackgroundMetadataTraits({
          activeTraitTooltipId: traitTooltip === null ? undefined : backgroundTraitTooltipId,
          hoveredTraitId,
          onCloseTraitHover: closeTraitHover,
          onCloseTraitTooltip: closeTraitTooltip,
          onOpenTraitHover: setHoveredTraitId,
          onOpenTraitTooltip: openTraitTooltip,
          relationship: 'excluded',
          traits: backgroundFit.excludedTraits,
        })}
      </BackgroundMetadataSubsection>
      <BackgroundMetadataSubsection title="Guaranteed traits">
        {renderBackgroundMetadataTraits({
          activeTraitTooltipId: traitTooltip === null ? undefined : backgroundTraitTooltipId,
          hoveredTraitId,
          onCloseTraitHover: closeTraitHover,
          onCloseTraitTooltip: closeTraitTooltip,
          onOpenTraitHover: setHoveredTraitId,
          onOpenTraitTooltip: openTraitTooltip,
          relationship: 'guaranteed',
          traits: backgroundFit.guaranteedTraits,
        })}
      </BackgroundMetadataSubsection>
      <BackgroundMetadataSubsection title="Excluded talent attributes">
        {renderBackgroundTalentAttributes(backgroundFit.excludedTalentAttributeNames)}
      </BackgroundMetadataSubsection>

      {columnCampResourceModifierGroups.length > 0 ? (
        <div
          className={styles.detailCampResourceModifierColumns}
          data-testid="detail-camp-resource-modifier-columns"
        >
          {columnCampResourceModifierGroups.map(({ group, modifiers }) => (
            <BackgroundMetadataCampResourceModifierSubsection
              group={group}
              key={group}
              modifiers={modifiers}
            />
          ))}
        </div>
      ) : null}
      {stackedCampResourceModifierGroups.map(({ group, modifiers }) => (
        <BackgroundMetadataCampResourceModifierSubsection
          group={group}
          key={group}
          modifiers={modifiers}
        />
      ))}
      {traitTooltip === null ? null : (
        <BackgroundTraitTooltip
          onCloseTraitHover={closeTraitHover}
          onCloseTraitTooltip={closeTraitTooltip}
          tooltip={traitTooltip}
          tooltipId={backgroundTraitTooltipId}
        />
      )}
    </DetailCollapsibleSection>
  )
}

type BackgroundFitOtherPerkGroupInteractionProps = {
  emphasizedCategoryNames: ReadonlySet<string>
  emphasizedPerkGroupKeys: ReadonlySet<string>
  hoveredBuildPerkId: string | null
  hoveredBuildPerkTooltipId: string | undefined
  hoveredPerkId: string | null
  onCloseBuildPerkHover: (perkId: string) => void
  onCloseBuildPerkTooltip: () => void
  onClosePerkGroupHover: (perkGroupKey: string) => void
  onInspectPerk: (perkId: string, perkGroupSelection?: BuildPerkPillSelection) => void
  onInspectPerkGroup: (categoryName: string, perkGroupId: string) => void
  onOpenBuildPerkHover: (perkId: string, perkGroupSelection?: BuildPerkPillSelection) => void
  onOpenBuildPerkTooltip: (
    perkId: string,
    currentTarget: HTMLElement,
    perkGroupSelection?: BuildPerkPillSelection,
  ) => void
  onOpenPerkGroupHover: (categoryName: string, perkGroupId: string) => void
  selectedEmphasisCategoryNames: ReadonlySet<string>
  selectedEmphasisPerkGroupKeys: ReadonlySet<string>
}

function BackgroundFitOtherPerkGroupTile({
  emphasizedCategoryNames,
  emphasizedPerkGroupKeys,
  hoveredBuildPerkId,
  hoveredBuildPerkTooltipId,
  hoveredPerkId,
  onCloseBuildPerkHover,
  onCloseBuildPerkTooltip,
  onClosePerkGroupHover,
  onInspectPerk,
  onInspectPerkGroup,
  onOpenBuildPerkHover,
  onOpenBuildPerkTooltip,
  onOpenPerkGroupHover,
  otherPerkGroup,
  selectedEmphasisCategoryNames,
  selectedEmphasisPerkGroupKeys,
}: BackgroundFitOtherPerkGroupInteractionProps & {
  otherPerkGroup: BackgroundFitOtherPerkGroup
}) {
  const otherPerkGroupPerks =
    otherPerkGroup.perks.length === 0
      ? [{ iconPath: null, perkId: null, perkName: 'No parsed perks' }]
      : otherPerkGroup.perks.map((perk) => ({
          iconPath: perk.iconPath,
          perkId: perk.perkId,
          perkName: perk.perkName,
        }))

  return (
    <BuildPerkGroupTile
      arePerkGroupOptionsInteractive={false}
      className={styles.detailOtherPerkGroupTile}
      emphasizedCategoryNames={emphasizedCategoryNames}
      emphasizedPerkGroupKeys={emphasizedPerkGroupKeys}
      selectedEmphasisCategoryNames={selectedEmphasisCategoryNames}
      selectedEmphasisPerkGroupKeys={selectedEmphasisPerkGroupKeys}
      groupLabel={otherPerkGroup.perkGroupName}
      groupOptions={[
        {
          categoryName: otherPerkGroup.categoryName,
          perkGroupIconPath: otherPerkGroup.perkGroupIconPath,
          perkGroupId: otherPerkGroup.perkGroupId,
          perkGroupLabel: otherPerkGroup.perkGroupName,
        },
      ]}
      hoveredBuildPerkId={hoveredBuildPerkId}
      hoveredBuildPerkTooltipId={hoveredBuildPerkTooltipId}
      hoveredPerkId={hoveredPerkId}
      isWide
      metaClassName={styles.detailOtherPerkGroupProbabilityBadge}
      metaLabel={
        otherPerkGroup.isGuaranteed
          ? 'Guaranteed'
          : formatBackgroundFitProbabilityLabel(otherPerkGroup.probability)
      }
      metaTestId="detail-other-perk-group-probability"
      onCloseBuildPerkHover={onCloseBuildPerkHover}
      onCloseBuildPerkTooltip={onCloseBuildPerkTooltip}
      onClosePerkGroupHover={onClosePerkGroupHover}
      onInspectPerk={onInspectPerk}
      onInspectPerkGroup={onInspectPerkGroup}
      onOpenBuildPerkHover={onOpenBuildPerkHover}
      onOpenBuildPerkTooltip={onOpenBuildPerkTooltip}
      onOpenPerkGroupHover={onOpenPerkGroupHover}
      perks={otherPerkGroupPerks}
    />
  )
}

function formatNativePerkGroupCount(count: number, labelPrefix: string) {
  const groupLabel = count === 1 ? 'group' : 'groups'

  return `${count} ${labelPrefix} native perk ${groupLabel}`
}

function BackgroundFitOtherPerkGroupList({
  label,
  otherPerkGroups,
  ...interactionProps
}: BackgroundFitOtherPerkGroupInteractionProps & {
  label: string
  otherPerkGroups: BackgroundFitOtherPerkGroup[]
}) {
  if (otherPerkGroups.length === 0) {
    return null
  }

  return (
    <div className={styles.detailOtherPerkGroupSection}>
      <div className={styles.detailOtherPerkGroupHeader}>
        <h4 className={styles.detailSubsectionHeading}>{label}</h4>
        <span
          aria-label={formatNativePerkGroupCount(otherPerkGroups.length, label.toLowerCase())}
          className={styles.detailOtherPerkGroupHeaderCount}
          data-testid="detail-other-perk-group-section-count"
        >
          {otherPerkGroups.length}
        </span>
      </div>
      <ul className={styles.detailOtherPerkGroupList}>
        {otherPerkGroups.map((otherPerkGroup) => (
          <li key={`${otherPerkGroup.categoryName}-${otherPerkGroup.perkGroupId}`}>
            <BackgroundFitOtherPerkGroupTile
              {...interactionProps}
              otherPerkGroup={otherPerkGroup}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

function BackgroundFitRareOtherPerkGroupList({
  otherPerkGroups,
  ...interactionProps
}: BackgroundFitOtherPerkGroupInteractionProps & {
  otherPerkGroups: BackgroundFitOtherPerkGroup[]
}) {
  const rareOtherPerkGroupsSectionId = useId()
  const [isExpanded, setIsExpanded] = useState(false)

  if (otherPerkGroups.length === 0) {
    return null
  }

  return (
    <div
      className={styles.detailOtherPerkGroupSection}
      data-expanded={isExpanded}
      data-testid="detail-rare-other-perk-groups"
    >
      <h4 className={styles.detailOtherPerkGroupHeader}>
        <button
          aria-controls={rareOtherPerkGroupsSectionId}
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} rare native perk groups`}
          className={styles.detailOtherPerkGroupRareToggle}
          data-testid="detail-rare-other-perk-groups-toggle"
          onClick={() => {
            setIsExpanded((wasExpanded) => !wasExpanded)
          }}
          title={`${isExpanded ? 'Collapse' : 'Expand'} rare native perk groups`}
          type="button"
        >
          <PlannerSectionChevron
            className={styles.detailOtherPerkGroupRareChevron}
            isExpanded={isExpanded}
          />
          <span className={styles.detailOtherPerkGroupRareHeading}>Possible - under 1% chance</span>
          <span
            aria-label={formatNativePerkGroupCount(otherPerkGroups.length, 'rare')}
            className={styles.detailOtherPerkGroupHeaderCount}
            data-testid="detail-rare-other-perk-groups-count"
          >
            {otherPerkGroups.length}
          </span>
        </button>
      </h4>

      {isExpanded ? (
        <ul
          className={styles.detailOtherPerkGroupList}
          data-testid="detail-rare-other-perk-groups-list"
          id={rareOtherPerkGroupsSectionId}
        >
          {otherPerkGroups.map((otherPerkGroup) => (
            <li key={`${otherPerkGroup.categoryName}-${otherPerkGroup.perkGroupId}`}>
              <BackgroundFitOtherPerkGroupTile
                {...interactionProps}
                otherPerkGroup={otherPerkGroup}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function BackgroundFitOtherPerkGroupsSection({
  backgroundFit,
  isExpanded,
  onExpandedChange,
  ...interactionProps
}: BackgroundFitOtherPerkGroupInteractionProps & {
  backgroundFit: RankedBackgroundFit
  isExpanded: boolean
  onExpandedChange: (nextIsExpanded: boolean) => void
}) {
  const guaranteedOtherPerkGroups = backgroundFit.otherPerkGroups.filter(
    (otherPerkGroup) => otherPerkGroup.isGuaranteed,
  )
  const possibleOtherPerkGroups = backgroundFit.otherPerkGroups.filter(
    (otherPerkGroup) => !otherPerkGroup.isGuaranteed && otherPerkGroup.probability >= 0.01,
  )
  const rareOtherPerkGroups = backgroundFit.otherPerkGroups.filter(
    (otherPerkGroup) => !otherPerkGroup.isGuaranteed && otherPerkGroup.probability < 0.01,
  )

  if (backgroundFit.otherPerkGroups.length === 0) {
    return null
  }

  return (
    <DetailCollapsibleSection
      contentClassName={styles.detailOtherPerkGroupContent}
      contentTestId="detail-other-perk-groups-section"
      count={backgroundFit.otherPerkGroups.length}
      countLabel={formatNativePerkGroupCount(backgroundFit.otherPerkGroups.length, 'other')}
      isExpanded={isExpanded}
      onExpandedChange={onExpandedChange}
      sectionLabel="Other native perk groups"
      sectionTestId="detail-other-perk-groups"
      toggleTestId="detail-other-perk-groups-toggle"
    >
      <p className={styles.detailOtherPerkGroupDescription}>
        Native perk groups this background can get outside the current build. Skill books and
        ancient scrolls are not included.
      </p>
      <BackgroundFitOtherPerkGroupList
        {...interactionProps}
        label="Guaranteed"
        otherPerkGroups={guaranteedOtherPerkGroups}
      />
      <BackgroundFitOtherPerkGroupList
        {...interactionProps}
        label="Possible"
        otherPerkGroups={possibleOtherPerkGroups}
      />
      <BackgroundFitRareOtherPerkGroupList
        {...interactionProps}
        otherPerkGroups={rareOtherPerkGroups}
      />
    </DetailCollapsibleSection>
  )
}

function BackgroundDetail({
  backgroundFit,
  detailHistoryNavigationAvailability,
  emphasizedCategoryNames,
  emphasizedPerkGroupKeys,
  selectedEmphasisCategoryNames,
  selectedEmphasisPerkGroupKeys,
  hoveredBuildPerkId,
  hoveredBuildPerkTooltipId,
  hoveredPerkId,
  detailCollapsibleSectionExpandedStates,
  mustHavePickedPerkIds,
  mustHavePickedPerkCount,
  onCloseBuildPerkHover,
  onCloseBuildPerkTooltip,
  onClosePerkGroupHover,
  onDetailCollapsibleSectionExpandedChange,
  onInspectPerk,
  onInspectPerkGroup,
  onNavigateDetailHistory,
  onOpenBuildPerkHover,
  onOpenBuildPerkTooltip,
  onOpenPerkGroupHover,
  optionalPickedPerkIds,
  optionalPickedPerkCount,
  pickedPerkCount,
  rank,
  studyResourceFilter,
  supportedBuildTargetPerkGroups,
}: {
  backgroundFit: RankedBackgroundFit
  detailHistoryNavigationAvailability: DetailHistoryNavigationAvailability
  emphasizedCategoryNames: ReadonlySet<string>
  emphasizedPerkGroupKeys: ReadonlySet<string>
  selectedEmphasisCategoryNames: ReadonlySet<string>
  selectedEmphasisPerkGroupKeys: ReadonlySet<string>
  hoveredBuildPerkId: string | null
  hoveredBuildPerkTooltipId: string | undefined
  hoveredPerkId: string | null
  detailCollapsibleSectionExpandedStates: DetailCollapsibleSectionExpandedStates
  mustHavePickedPerkIds: string[]
  mustHavePickedPerkCount: number
  onCloseBuildPerkHover: (perkId: string) => void
  onCloseBuildPerkTooltip: () => void
  onClosePerkGroupHover: (perkGroupKey: string) => void
  onDetailCollapsibleSectionExpandedChange: (
    sectionKey: DetailCollapsibleSectionKey,
    nextIsExpanded: boolean,
  ) => void
  onInspectPerk: (perkId: string, perkGroupSelection?: BuildPerkPillSelection) => void
  onInspectPerkGroup: (categoryName: string, perkGroupId: string) => void
  onNavigateDetailHistory: (direction: -1 | 1) => void
  onOpenBuildPerkHover: (perkId: string, perkGroupSelection?: BuildPerkPillSelection) => void
  onOpenBuildPerkTooltip: (
    perkId: string,
    currentTarget: HTMLElement,
    perkGroupSelection?: BuildPerkPillSelection,
  ) => void
  onOpenPerkGroupHover: (categoryName: string, perkGroupId: string) => void
  optionalPickedPerkIds: string[]
  optionalPickedPerkCount: number
  pickedPerkCount: number
  rank: number
  studyResourceFilter: BackgroundStudyResourceFilter
  supportedBuildTargetPerkGroups: BuildTargetPerkGroup[]
}) {
  const backgroundPillLabel = getVisibleBackgroundPillLabel(backgroundFit)
  const veteranPerkLevelIntervalLabel = formatBackgroundVeteranPerkLevelIntervalBadge(
    backgroundFit.veteranPerkLevelInterval,
  )
  const veteranPerkLevelIntervalTitle = formatBackgroundVeteranPerkLevelIntervalTitle(
    backgroundFit.veteranPerkLevelInterval,
  )
  const mustHaveBackgroundFit = {
    ...backgroundFit,
    matches: getScopedBackgroundFitMatches(backgroundFit.matches, mustHavePickedPerkIds),
  }
  const optionalBackgroundFit = {
    ...backgroundFit,
    matches: getScopedBackgroundFitMatches(backgroundFit.matches, optionalPickedPerkIds),
  }
  const hasMustHaveChanceBreakdown =
    (backgroundFit.mustHaveStudyResourceChanceBreakdown?.length ?? 0) > 1

  return (
    <>
      <DetailHeader
        badgeRow={
          <div className={styles.detailBadgeRow} data-testid="detail-badge-row">
            {backgroundPillLabel ? (
              <span className={styles.detailBadge} data-testid="detail-background-pill">
                {backgroundPillLabel}
              </span>
            ) : null}
            <span
              aria-label={`${veteranPerkLevelIntervalLabel} veteran perk interval`}
              className={styles.detailBadge}
              data-testid="detail-background-veteran-perk-badge"
              title={veteranPerkLevelIntervalTitle}
            >
              {veteranPerkLevelIntervalLabel}
            </span>
            <BackgroundFitStudyResourceBadges backgroundFit={backgroundFit} />
          </div>
        }
        eyebrow={`Background rank ${rank + 1}`}
        iconLabel={`${backgroundFit.backgroundName} background icon`}
        iconPath={backgroundFit.iconPath}
        iconTestId="detail-background-icon"
        navigationAvailability={detailHistoryNavigationAvailability}
        onNavigateHistory={onNavigateDetailHistory}
        title={backgroundFit.backgroundName}
      />

      <BackgroundMetadataSection
        backgroundFit={backgroundFit}
        isExpanded={getDetailCollapsibleSectionExpandedState(
          detailCollapsibleSectionExpandedStates,
          'background-details',
        )}
        onExpandedChange={(nextIsExpanded) =>
          onDetailCollapsibleSectionExpandedChange('background-details', nextIsExpanded)
        }
      />

      <DetailCollapsibleSection
        isExpanded={getDetailCollapsibleSectionExpandedState(
          detailCollapsibleSectionExpandedStates,
          'background-fit',
        )}
        onExpandedChange={(nextIsExpanded) =>
          onDetailCollapsibleSectionExpandedChange('background-fit', nextIsExpanded)
        }
        sectionLabel="Background fit"
      >
        <div
          className={styles.detailBackgroundFitTables}
          data-has-chance-breakdown={hasMustHaveChanceBreakdown}
          data-testid="detail-background-fit-tables"
        >
          <BackgroundFitMetricSummary
            backgroundFit={backgroundFit}
            mustHavePickedPerkCount={mustHavePickedPerkCount}
            optionalPickedPerkCount={optionalPickedPerkCount}
            pickedPerkCount={pickedPerkCount}
            studyResourceFilter={studyResourceFilter}
          />
          <BackgroundFitChanceBreakdown
            entries={backgroundFit.mustHaveStudyResourceChanceBreakdown}
          />
        </div>
        <BackgroundFitStudyResourcePlan
          fullBuildStrategy={backgroundFit.fullBuildStudyResourceStrategy}
          hoveredBuildPerkId={hoveredBuildPerkId}
          hoveredBuildPerkTooltipId={hoveredBuildPerkTooltipId}
          hoveredPerkId={hoveredPerkId}
          mustHaveStrategy={backgroundFit.mustHaveStudyResourceStrategy}
          onCloseBuildPerkHover={onCloseBuildPerkHover}
          onCloseBuildPerkTooltip={onCloseBuildPerkTooltip}
          onInspectPerk={onInspectPerk}
          onOpenBuildPerkHover={onOpenBuildPerkHover}
          onOpenBuildPerkTooltip={onOpenBuildPerkTooltip}
          optionalPickedPerkCount={optionalPickedPerkCount}
          supportedBuildTargetPerkGroups={supportedBuildTargetPerkGroups}
        />
      </DetailCollapsibleSection>

      <DetailCollapsibleSection
        contentClassName={styles.detailBackgroundFitMatchColumns}
        isExpanded={getDetailCollapsibleSectionExpandedState(
          detailCollapsibleSectionExpandedStates,
          'matched-perk-groups',
        )}
        onExpandedChange={(nextIsExpanded) =>
          onDetailCollapsibleSectionExpandedChange('matched-perk-groups', nextIsExpanded)
        }
        sectionLabel="Matched perk groups"
      >
        <div className={styles.detailBackgroundFitMatchColumn} data-requirement-scope="must-have">
          <span
            aria-label="Must-have perk groups"
            className={styles.detailRequirementChainOverlay}
            data-testid="detail-requirement-chain-overlay"
            role="img"
            title="Must-have perk groups"
          >
            <img
              alt=""
              aria-hidden="true"
              className={styles.detailRequirementChainImage}
              draggable={false}
              src={catenaryChainIconPath}
            />
          </span>
          <div className={styles.detailBackgroundFitMatchColumnHeader}>
            <h4>Must-have</h4>
          </div>
          <BackgroundFitMatchSections
            backgroundFit={mustHaveBackgroundFit}
            emphasizedCategoryNames={emphasizedCategoryNames}
            emphasizedPerkGroupKeys={emphasizedPerkGroupKeys}
            selectedEmphasisCategoryNames={selectedEmphasisCategoryNames}
            selectedEmphasisPerkGroupKeys={selectedEmphasisPerkGroupKeys}
            hoveredBuildPerkId={hoveredBuildPerkId}
            hoveredBuildPerkTooltipId={hoveredBuildPerkTooltipId}
            hoveredPerkId={hoveredPerkId}
            onCloseBuildPerkHover={onCloseBuildPerkHover}
            onCloseBuildPerkTooltip={onCloseBuildPerkTooltip}
            onClosePerkGroupHover={onClosePerkGroupHover}
            onInspectPerkGroup={onInspectPerkGroup}
            onInspectPlannerPerk={onInspectPerk}
            onOpenBuildPerkHover={onOpenBuildPerkHover}
            onOpenBuildPerkTooltip={onOpenBuildPerkTooltip}
            onOpenPerkGroupHover={onOpenPerkGroupHover}
          />
        </div>
        <div className={styles.detailBackgroundFitMatchColumn} data-requirement-scope="optional">
          <span
            aria-label="Optional perk groups"
            className={styles.detailRequirementOptionalOverlay}
            data-testid="detail-requirement-optional-overlay"
            role="img"
            title="Optional perk groups"
          >
            <Split aria-hidden="true" className={styles.detailRequirementOptionalIcon} />
          </span>
          <div className={styles.detailBackgroundFitMatchColumnHeader}>
            <h4>Optional</h4>
          </div>
          <BackgroundFitMatchSections
            backgroundFit={optionalBackgroundFit}
            emphasizedCategoryNames={emphasizedCategoryNames}
            emphasizedPerkGroupKeys={emphasizedPerkGroupKeys}
            selectedEmphasisCategoryNames={selectedEmphasisCategoryNames}
            selectedEmphasisPerkGroupKeys={selectedEmphasisPerkGroupKeys}
            hoveredBuildPerkId={hoveredBuildPerkId}
            hoveredBuildPerkTooltipId={hoveredBuildPerkTooltipId}
            hoveredPerkId={hoveredPerkId}
            onCloseBuildPerkHover={onCloseBuildPerkHover}
            onCloseBuildPerkTooltip={onCloseBuildPerkTooltip}
            onClosePerkGroupHover={onClosePerkGroupHover}
            onInspectPerkGroup={onInspectPerkGroup}
            onInspectPlannerPerk={onInspectPerk}
            onOpenBuildPerkHover={onOpenBuildPerkHover}
            onOpenBuildPerkTooltip={onOpenBuildPerkTooltip}
            onOpenPerkGroupHover={onOpenPerkGroupHover}
          />
        </div>
      </DetailCollapsibleSection>

      <BackgroundFitOtherPerkGroupsSection
        backgroundFit={backgroundFit}
        isExpanded={getDetailCollapsibleSectionExpandedState(
          detailCollapsibleSectionExpandedStates,
          'other-native-perk-groups',
        )}
        onExpandedChange={(nextIsExpanded) =>
          onDetailCollapsibleSectionExpandedChange('other-native-perk-groups', nextIsExpanded)
        }
        emphasizedCategoryNames={emphasizedCategoryNames}
        emphasizedPerkGroupKeys={emphasizedPerkGroupKeys}
        selectedEmphasisCategoryNames={selectedEmphasisCategoryNames}
        selectedEmphasisPerkGroupKeys={selectedEmphasisPerkGroupKeys}
        hoveredBuildPerkId={hoveredBuildPerkId}
        hoveredBuildPerkTooltipId={hoveredBuildPerkTooltipId}
        hoveredPerkId={hoveredPerkId}
        onCloseBuildPerkHover={onCloseBuildPerkHover}
        onCloseBuildPerkTooltip={onCloseBuildPerkTooltip}
        onClosePerkGroupHover={onClosePerkGroupHover}
        onInspectPerk={onInspectPerk}
        onInspectPerkGroup={onInspectPerkGroup}
        onOpenBuildPerkHover={onOpenBuildPerkHover}
        onOpenBuildPerkTooltip={onOpenBuildPerkTooltip}
        onOpenPerkGroupHover={onOpenPerkGroupHover}
      />
    </>
  )
}
