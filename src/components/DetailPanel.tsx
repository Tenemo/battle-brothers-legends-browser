import { useId, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, ArrowRight, Split } from 'lucide-react'
import { formatDisplayBulletText } from '../lib/bullet-display'
import {
  formatBackgroundFitProbabilityLabel,
  formatBackgroundSourceProbabilityLabel,
  formatScenarioGrantLabel,
  getAnchoredTooltipStyle,
  getBackgroundFitKey,
  getVisibleBackgroundPillLabel,
  getPerkDisplayIconPath,
  renderGameIcon,
  type GroupedBackgroundSource,
  type TooltipAnchorRectangle,
} from '../lib/perk-display'
import type {
  BackgroundFitChanceCalculation,
  BackgroundFitOtherPerkGroup,
  BackgroundFitStudyResourceChanceBreakdownEntry,
  BackgroundFitStudyResourceStrategy,
  BackgroundFitStudyResourceStrategyTarget,
  BackgroundFitMatch,
  BuildTargetPerkGroup,
  RankedBackgroundFit,
} from '../lib/background-fit'
import { skillBookIconPath } from '../lib/background-study-resource-display'
import { ancientScrollIconPath } from '../lib/ancient-scroll-perk-group-display'
import type { BackgroundStudyResourceFilter } from '../lib/background-study-reachability'
import {
  backgroundCampResourceModifierGroupLabels,
  formatBackgroundCampResourceModifierValue,
} from '../lib/background-camp-resource-display'
import {
  getBackgroundTalentAttributeIconPath,
  getBackgroundTalentAttributeIconTestId,
  getGroupedCampResourceModifiers,
} from '../lib/background-metadata-display'
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
import type { BuildPerkPillSelection } from './BuildPerkPill'
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
  | 'chance-explanation'
  | 'matched-perk-groups'
  | 'other-native-perk-groups'

type DetailCollapsibleSectionExpandedStates = Partial<Record<DetailCollapsibleSectionKey, boolean>>

const defaultDetailCollapsibleSectionExpandedStates = {
  'background-details': false,
  'background-fit': true,
  'chance-explanation': false,
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
  className,
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
  className?: string
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
      className={joinClassNames(styles.detailCollapsibleSection, className)}
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

function getStudyResourceStrategyUsageResourceLabel(
  resourceKind: StudyResourceStrategyResourceKind,
): string {
  return resourceKind
}

function getStudyResourceStrategyUsageResourceKinds(
  strategy: BackgroundFitStudyResourceStrategy,
): StudyResourceStrategyResourceKind[] {
  return (['book', 'scroll'] as const).filter(
    (resourceKind) => getStudyResourceStrategyTargets({ resourceKind, strategy }).length > 0,
  )
}

function formatStudyResourceStrategyUsageHeading({
  scopeLabel,
  strategy,
}: {
  scopeLabel: string
  strategy: BackgroundFitStudyResourceStrategy
}): string | null {
  const resourceKinds = getStudyResourceStrategyUsageResourceKinds(strategy)

  if (resourceKinds.length === 0) {
    return null
  }

  const resourceUsageLabel = resourceKinds
    .map((resourceKind) => getStudyResourceStrategyUsageResourceLabel(resourceKind))
    .join('/')

  return `${scopeLabel} ${resourceUsageLabel} usage`
}

type StudyResourceStrategyCoveredPerk = {
  iconPath: string | null
  perkGroupSelection: BuildPerkPillSelection
  perkId: string
  perkName: string
}

type StudyResourcePlanPerkInteractionProps = {
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

function getStudyResourceStrategyTargetCoveredPerks({
  supportedBuildTargetPerkGroups,
  target,
}: {
  supportedBuildTargetPerkGroups: BuildTargetPerkGroup[]
  target: BackgroundFitStudyResourceStrategyTarget
}): StudyResourceStrategyCoveredPerk[] {
  return target.coveredPickedPerkIds.map((coveredPickedPerkId, coveredPerkIndex) => {
    const buildTargetPerkGroup = findBuildTargetPerkGroupForCoveredPerk({
      perkId: coveredPickedPerkId,
      supportedBuildTargetPerkGroups,
      target,
    })
    const buildTargetPerkIndex =
      buildTargetPerkGroup?.pickedPerkIds.indexOf(coveredPickedPerkId) ?? -1
    const perkGroupSelection = {
      categoryName: buildTargetPerkGroup?.categoryName ?? target.categoryName,
      perkGroupId: buildTargetPerkGroup?.perkGroupId ?? target.perkGroupId,
    }

    return {
      iconPath:
        buildTargetPerkIndex >= 0
          ? (buildTargetPerkGroup?.pickedPerkIconPaths[buildTargetPerkIndex] ?? null)
          : null,
      perkGroupSelection,
      perkId: coveredPickedPerkId,
      perkName: target.coveredPickedPerkNames[coveredPerkIndex] ?? coveredPickedPerkId,
    }
  })
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

function getStudyResourceStrategyTargetGroupOptions({
  resourceKind,
  target,
}: {
  resourceKind: StudyResourceStrategyResourceKind
  target: BackgroundFitStudyResourceStrategyTarget
}) {
  const resourceLabel = getStudyResourceStrategyResourceLabel(resourceKind)

  return [
    {
      categoryName: target.categoryName,
      perkGroupIconPath: target.perkGroupIconPath,
      perkGroupId: target.perkGroupId,
      perkGroupLabel: target.perkGroupName,
    },
    {
      categoryName: 'Study resource',
      iconLabel: `${resourceLabel} resource icon`,
      isSelectable: false,
      perkGroupIconPath: getStudyResourceStrategyResourceIconPath(resourceKind),
      perkGroupId: `study-resource-${resourceKind}`,
      perkGroupLabel: resourceLabel,
    },
  ]
}

function BackgroundFitStudyResourcePlanRow({
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
  resourceKind,
  selectedEmphasisCategoryNames,
  selectedEmphasisPerkGroupKeys,
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
  const resourcePlanHeading = `${resourceLabel} covers:`

  return (
    <div
      className={styles.detailStudyResourcePlanRow}
      data-resource-kind={resourceKind}
      data-testid="detail-study-resource-plan-row"
    >
      <h5 className={styles.detailStudyResourcePlanMain}>{resourcePlanHeading}</h5>
      <ul
        aria-label={`${resourceLabel} covered perk groups`}
        className={styles.detailStudyResourceTargetList}
      >
        {targets.map((target) => {
          const coveredPerks = getStudyResourceStrategyTargetCoveredPerks({
            supportedBuildTargetPerkGroups,
            target,
          })

          return (
            <li key={`${resourceKind}-${target.categoryName}-${target.perkGroupId}`}>
              <BuildPerkGroupTile
                arePerkGroupOptionsInteractive={false}
                className={styles.detailStudyResourceTargetTile}
                emphasizedCategoryNames={emphasizedCategoryNames}
                emphasizedPerkGroupKeys={emphasizedPerkGroupKeys}
                groupLabel={target.perkGroupName}
                groupOptions={getStudyResourceStrategyTargetGroupOptions({ resourceKind, target })}
                hoveredBuildPerkId={hoveredBuildPerkId}
                hoveredBuildPerkTooltipId={hoveredBuildPerkTooltipId}
                hoveredPerkId={hoveredPerkId}
                isWide
                onCloseBuildPerkHover={onCloseBuildPerkHover}
                onCloseBuildPerkTooltip={onCloseBuildPerkTooltip}
                onClosePerkGroupHover={onClosePerkGroupHover}
                onInspectPerk={onInspectPerk}
                onInspectPerkGroup={onInspectPerkGroup}
                onOpenBuildPerkHover={onOpenBuildPerkHover}
                onOpenBuildPerkTooltip={onOpenBuildPerkTooltip}
                onOpenPerkGroupHover={onOpenPerkGroupHover}
                perks={coveredPerks}
                selectedEmphasisCategoryNames={selectedEmphasisCategoryNames}
                selectedEmphasisPerkGroupKeys={selectedEmphasisPerkGroupKeys}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function BackgroundFitStudyResourcePlanScope({
  scopeLabel,
  strategy,
  ...interactionProps
}: {
  scopeLabel: string
  strategy: BackgroundFitStudyResourceStrategy
  supportedBuildTargetPerkGroups: BuildTargetPerkGroup[]
} & StudyResourcePlanPerkInteractionProps) {
  const heading = formatStudyResourceStrategyUsageHeading({ scopeLabel, strategy })

  if (heading === null) {
    return null
  }

  return (
    <section
      aria-label={heading}
      className={styles.detailStudyResourcePlanScope}
      data-testid="detail-study-resource-plan-scope"
    >
      <h4 className={styles.detailSubsectionHeading}>{heading}</h4>
      <div className={styles.detailStudyResourcePlanRows}>
        <BackgroundFitStudyResourcePlanRow
          {...interactionProps}
          resourceKind="book"
          strategy={strategy}
        />
        <BackgroundFitStudyResourcePlanRow
          {...interactionProps}
          resourceKind="scroll"
          strategy={strategy}
        />
      </div>
    </section>
  )
}

function BackgroundFitStudyResourcePlan({
  fullBuildStrategy,
  mustHaveStrategy,
  optionalPickedPerkCount,
  supportedBuildTargetPerkGroups,
  ...interactionProps
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
      <div className={styles.detailStudyResourcePlanScopes}>
        {mustHaveStrategy ? (
          <BackgroundFitStudyResourcePlanScope
            {...interactionProps}
            scopeLabel="Must-have"
            strategy={mustHaveStrategy}
            supportedBuildTargetPerkGroups={supportedBuildTargetPerkGroups}
          />
        ) : null}
        {shouldShowFullBuildStrategy && fullBuildStrategy ? (
          <BackgroundFitStudyResourcePlanScope
            {...interactionProps}
            scopeLabel="Full-build"
            strategy={fullBuildStrategy}
            supportedBuildTargetPerkGroups={supportedBuildTargetPerkGroups}
          />
        ) : null}
      </div>
    </div>
  )
}

type BackgroundFitChanceExplanationResourceLine = {
  coveredPerkNames: string[]
  resourceIconPath: string
  resourceKind: StudyResourceStrategyResourceKind
  resourceLabel: string
  targetGroupName: string
}

type BackgroundFitChanceExplanationScopeData = {
  calculation?: BackgroundFitChanceCalculation
  chanceBreakdownEntries?: BackgroundFitStudyResourceChanceBreakdownEntry[]
  nativeMatches: BackgroundFitMatch[]
  nativeProbability: number | null
  probability: number
  resourceLines: BackgroundFitChanceExplanationResourceLine[]
  scopeKey: 'full-build' | 'must-have'
  scopeLabel: string
  strategy?: BackgroundFitStudyResourceStrategy
}

type BackgroundFitNativeSuccessCondition = {
  matches: BackgroundFitMatch[]
}

type BackgroundFitChancePlanItem = {
  iconPath: string
  resourceKind: StudyResourceStrategyResourceKind
  text: string
}

type BackgroundFitNativeRollFactor = {
  categoryName: string
  explanation: string
  groupNames: string[]
  probability: number
}

type BackgroundFitNativeRollDerivation = {
  factors: BackgroundFitNativeRollFactor[]
  probability: number
}

type BackgroundFitNativeRollPath = {
  condition: BackgroundFitNativeSuccessCondition
  probability: number
  rollPatternCount: number
}

type SmallProbabilityFraction = {
  denominator: number
  numerator: number
}

function formatInlineList(items: readonly string[]): string {
  if (items.length === 0) {
    return ''
  }

  if (items.length === 1) {
    return items[0] ?? ''
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`
  }

  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`
}

function formatOrList(items: readonly string[]): string {
  if (items.length === 0) {
    return ''
  }

  if (items.length === 1) {
    return items[0] ?? ''
  }

  if (items.length === 2) {
    return `${items[0]} or ${items[1]}`
  }

  return `${items.slice(0, -1).join(', ')}, or ${items.at(-1)}`
}

function countCombinations(totalCount: number, selectedCount: number): number {
  if (selectedCount < 0 || selectedCount > totalCount) {
    return 0
  }

  const smallerSelectedCount = Math.min(selectedCount, totalCount - selectedCount)
  let combinationCount = 1

  for (let selectedIndex = 1; selectedIndex <= smallerSelectedCount; selectedIndex += 1) {
    combinationCount =
      (combinationCount * (totalCount - smallerSelectedCount + selectedIndex)) / selectedIndex
  }

  return combinationCount
}

function getSmallProbabilityFraction(
  probability: number,
  maximumDenominator = 500,
): SmallProbabilityFraction | null {
  let bestFraction: SmallProbabilityFraction | null = null
  let bestError = Number.POSITIVE_INFINITY

  for (let denominator = 1; denominator <= maximumDenominator; denominator += 1) {
    const numerator = Math.round(probability * denominator)

    if (numerator < 0 || numerator > denominator) {
      continue
    }

    const error = Math.abs(probability - numerator / denominator)

    if (error < bestError) {
      bestError = error
      bestFraction = { denominator, numerator }
    }
  }

  return bestFraction && bestError <= 1e-8 ? bestFraction : null
}

function formatNativeRollGroupKind(categoryName: string): string {
  const normalizedCategoryName = categoryName.trim().toLowerCase()

  if (normalizedCategoryName === 'traits') {
    return 'trait'
  }

  if (normalizedCategoryName.endsWith('s') && normalizedCategoryName.length > 1) {
    return normalizedCategoryName.slice(0, -1)
  }

  return normalizedCategoryName || 'native'
}

function getBackgroundFitMatchCategoryFactor(
  categoryName: string,
  matches: BackgroundFitMatch[],
): BackgroundFitNativeRollFactor | null {
  const groupNames = matches.map((match) => match.perkGroupName)

  if (matches.length === 1) {
    const nativeMatch = matches[0]!
    const probabilityLabel = formatBackgroundFitProbabilityLabel(nativeMatch.probability)

    return {
      categoryName,
      explanation: `${nativeMatch.perkGroupName} appears in ${probabilityLabel} of native rolls`,
      groupNames,
      probability: nativeMatch.probability,
    }
  }

  const firstProbability = matches[0]?.probability

  if (
    firstProbability === undefined ||
    !matches.every((match) =>
      areBackgroundFitProbabilitiesEqual(match.probability, firstProbability),
    )
  ) {
    return null
  }

  const fraction = getSmallProbabilityFraction(firstProbability)

  if (!fraction || fraction.numerator < matches.length) {
    return null
  }

  const fixedGroupCount = matches.length
  const freeSelectedGroupCount = fraction.numerator - fixedGroupCount
  const remainingGroupCount = fraction.denominator - fixedGroupCount
  const jointProbability =
    countCombinations(remainingGroupCount, freeSelectedGroupCount) /
    countCombinations(fraction.denominator, fraction.numerator)
  const groupKind = formatNativeRollGroupKind(categoryName)
  const marginalProbabilityLabel = formatBackgroundFitProbabilityLabel(firstProbability)
  const jointProbabilityLabel = formatBackgroundFitProbabilityLabel(jointProbability)
  const combinationExpression = `C(${remainingGroupCount}, ${freeSelectedGroupCount}) / C(${fraction.denominator}, ${fraction.numerator})`

  return {
    categoryName,
    explanation: `${categoryName} roll picks ${fraction.numerator} of ${fraction.denominator} ${groupKind} groups (${marginalProbabilityLabel} each), so ${formatInlineList(
      groupNames,
    )} together are ${combinationExpression} = ${jointProbabilityLabel}`,
    groupNames,
    probability: jointProbability,
  }
}

function getNativeRollDerivationForMatches(
  matches: BackgroundFitMatch[],
): BackgroundFitNativeRollDerivation | null {
  if (matches.length === 0) {
    return null
  }

  const matchesByCategoryName = new Map<string, BackgroundFitMatch[]>()

  for (const nativeMatch of matches) {
    const categoryMatches = matchesByCategoryName.get(nativeMatch.categoryName)

    if (categoryMatches) {
      categoryMatches.push(nativeMatch)
      continue
    }

    matchesByCategoryName.set(nativeMatch.categoryName, [nativeMatch])
  }

  const factors: BackgroundFitNativeRollFactor[] = []
  let probability = 1

  for (const [categoryName, categoryMatches] of matchesByCategoryName) {
    const factor = getBackgroundFitMatchCategoryFactor(categoryName, categoryMatches)

    if (!factor) {
      return null
    }

    factors.push(factor)
    probability *= factor.probability
  }

  return {
    factors,
    probability,
  }
}

function formatNativeRollDerivationCalculation(
  derivation: BackgroundFitNativeRollDerivation,
  probability: number,
): string {
  if (derivation.factors.length === 1) {
    const factor = derivation.factors[0]!

    return factor.groupNames.length === 1
      ? `${factor.explanation}, so this route is ${formatBackgroundFitProbabilityLabel(
          probability,
        )}.`
      : `${factor.explanation}.`
  }

  return `${derivation.factors
    .map((factor) => `${factor.explanation}.`)
    .join(' ')} Independent roll categories multiply: ${derivation.factors
    .map((factor) => formatBackgroundFitProbabilityLabel(factor.probability))
    .join(' x ')} = ${formatBackgroundFitProbabilityLabel(probability)}.`
}

function formatNativeRollDerivationSummary({
  derivation,
  probability,
}: {
  derivation: BackgroundFitNativeRollDerivation
  probability: number
}): string {
  return `Chance math: ${formatNativeRollDerivationCalculation(derivation, probability)}`
}

function getUniquePickedPerkIds(pickedPerkIdGroups: readonly string[][]): string[] {
  const uniquePickedPerkIds: string[] = []
  const seenPickedPerkIds = new Set<string>()

  for (const pickedPerkIds of pickedPerkIdGroups) {
    for (const pickedPerkId of pickedPerkIds) {
      if (seenPickedPerkIds.has(pickedPerkId)) {
        continue
      }

      seenPickedPerkIds.add(pickedPerkId)
      uniquePickedPerkIds.push(pickedPerkId)
    }
  }

  return uniquePickedPerkIds
}

function getStrategyCoveredPickedPerkIds({
  pickedPerkIdSet,
  strategy,
}: {
  pickedPerkIdSet: ReadonlySet<string>
  strategy?: BackgroundFitStudyResourceStrategy
}): Set<string> {
  const coveredPickedPerkIds = new Set<string>()

  if (!strategy) {
    return coveredPickedPerkIds
  }

  for (const resourceKind of ['book', 'scroll'] as const) {
    const targets = getStudyResourceStrategyTargets({ resourceKind, strategy })
    const resourceSlotCount = resourceKind === 'book' ? 1 : strategy.shouldAllowSecondScroll ? 2 : 1
    const targetsThatCanAllFit = targets.length <= resourceSlotCount
    const targetCoveredPickedPerkIdSets = targets.map(
      (target) => new Set(target.coveredPickedPerkIds),
    )

    for (const target of targets) {
      for (const coveredPickedPerkId of target.coveredPickedPerkIds) {
        const isCoveredByEveryAlternativeTarget = targetCoveredPickedPerkIdSets.every(
          (targetCoveredPickedPerkIdSet) => targetCoveredPickedPerkIdSet.has(coveredPickedPerkId),
        )

        if (
          pickedPerkIdSet.has(coveredPickedPerkId) &&
          (targetsThatCanAllFit || isCoveredByEveryAlternativeTarget)
        ) {
          coveredPickedPerkIds.add(coveredPickedPerkId)
        }
      }
    }
  }

  return coveredPickedPerkIds
}

function getGuaranteedNativePickedPerkIds({
  matches,
  pickedPerkIdSet,
}: {
  matches: BackgroundFitMatch[]
  pickedPerkIdSet: ReadonlySet<string>
}): Set<string> {
  const guaranteedPickedPerkIds = new Set<string>()

  for (const match of matches) {
    if (!match.isGuaranteed) {
      continue
    }

    for (const pickedPerkId of match.pickedPerkIds) {
      if (pickedPerkIdSet.has(pickedPerkId)) {
        guaranteedPickedPerkIds.add(pickedPerkId)
      }
    }
  }

  return guaranteedPickedPerkIds
}

function getChanceExplanationResourceLines({
  pickedPerkIdSet,
  redundantPickedPerkIdSet,
  strategy,
}: {
  pickedPerkIdSet: ReadonlySet<string>
  redundantPickedPerkIdSet: ReadonlySet<string>
  strategy?: BackgroundFitStudyResourceStrategy
}): BackgroundFitChanceExplanationResourceLine[] {
  if (!strategy) {
    return []
  }

  return (['book', 'scroll'] as const).flatMap((resourceKind) =>
    getStudyResourceStrategyTargets({ resourceKind, strategy }).flatMap((target) => {
      let coveredPerkNames = target.coveredPickedPerkIds.flatMap(
        (coveredPickedPerkId, coveredPickedPerkIndex) =>
          pickedPerkIdSet.has(coveredPickedPerkId) &&
          !redundantPickedPerkIdSet.has(coveredPickedPerkId)
            ? [target.coveredPickedPerkNames[coveredPickedPerkIndex] ?? coveredPickedPerkId]
            : [],
      )

      if (coveredPerkNames.length === 0) {
        coveredPerkNames = target.coveredPickedPerkIds.flatMap(
          (coveredPickedPerkId, coveredPickedPerkIndex) =>
            pickedPerkIdSet.has(coveredPickedPerkId)
              ? [target.coveredPickedPerkNames[coveredPickedPerkIndex] ?? coveredPickedPerkId]
              : [],
        )
      }

      if (coveredPerkNames.length === 0) {
        return []
      }

      return [
        {
          coveredPerkNames,
          resourceIconPath: getStudyResourceStrategyResourceIconPath(resourceKind),
          resourceKind,
          resourceLabel: getStudyResourceStrategyResourceLabel(resourceKind),
          targetGroupName: target.perkGroupName,
        },
      ]
    }),
  )
}

function getNativeProbabilityFromChanceBreakdown({
  chanceBreakdownEntries,
  fallbackProbability,
  strategy,
}: {
  chanceBreakdownEntries?: BackgroundFitStudyResourceChanceBreakdownEntry[]
  fallbackProbability: number
  strategy?: BackgroundFitStudyResourceStrategy
}): number | null {
  if (strategy) {
    return strategy.nativeProbability
  }

  return (
    chanceBreakdownEntries?.find((chanceBreakdownEntry) => chanceBreakdownEntry.key === 'native')
      ?.probability ?? fallbackProbability
  )
}

function areBackgroundFitProbabilitiesEqual(leftProbability: number, rightProbability: number) {
  return Math.abs(leftProbability - rightProbability) <= 1e-9
}

function getChanceBreakdownEntryForStudyResourceFilter({
  chanceBreakdownEntries,
  studyResourceFilter,
}: {
  chanceBreakdownEntries?: BackgroundFitStudyResourceChanceBreakdownEntry[]
  studyResourceFilter: BackgroundStudyResourceFilter
}): BackgroundFitStudyResourceChanceBreakdownEntry | undefined {
  const matchingResourceEntries = chanceBreakdownEntries?.filter(
    (chanceBreakdownEntry) =>
      chanceBreakdownEntry.shouldAllowBook === studyResourceFilter.shouldAllowBook &&
      chanceBreakdownEntry.shouldAllowScroll === studyResourceFilter.shouldAllowScroll,
  )

  return (
    matchingResourceEntries?.find(
      (chanceBreakdownEntry) =>
        chanceBreakdownEntry.shouldAllowSecondScroll ===
        studyResourceFilter.shouldAllowSecondScroll,
    ) ?? matchingResourceEntries?.[0]
  )
}

function getChanceExplanationCalculation({
  chanceBreakdownEntries,
  fallbackProbability,
  strategy,
  studyResourceFilter,
}: {
  chanceBreakdownEntries?: BackgroundFitStudyResourceChanceBreakdownEntry[]
  fallbackProbability: number
  strategy?: BackgroundFitStudyResourceStrategy
  studyResourceFilter: BackgroundStudyResourceFilter
}): BackgroundFitChanceCalculation | undefined {
  if (!chanceBreakdownEntries) {
    return undefined
  }

  const strategyEntry = strategy
    ? chanceBreakdownEntries.find(
        (chanceBreakdownEntry) =>
          chanceBreakdownEntry.key === strategy.selectedCombinationKey &&
          chanceBreakdownEntry.shouldAllowSecondScroll === strategy.shouldAllowSecondScroll &&
          areBackgroundFitProbabilitiesEqual(
            chanceBreakdownEntry.probability,
            strategy.probability,
          ),
      )
    : undefined
  const reportedFilterEntry = getChanceBreakdownEntryForStudyResourceFilter({
    chanceBreakdownEntries,
    studyResourceFilter,
  })
  const matchingProbabilityEntry = chanceBreakdownEntries.find((chanceBreakdownEntry) =>
    areBackgroundFitProbabilitiesEqual(chanceBreakdownEntry.probability, fallbackProbability),
  )

  return (
    strategyEntry?.calculation ??
    reportedFilterEntry?.calculation ??
    matchingProbabilityEntry?.calculation
  )
}

function getChanceExplanationScopeData({
  backgroundFit,
  chanceBreakdownEntries,
  pickedPerkIds,
  probability,
  scopeKey,
  scopeLabel,
  strategy,
  studyResourceFilter,
}: {
  backgroundFit: RankedBackgroundFit
  chanceBreakdownEntries?: BackgroundFitStudyResourceChanceBreakdownEntry[]
  pickedPerkIds: string[]
  probability: number | null
  scopeKey: BackgroundFitChanceExplanationScopeData['scopeKey']
  scopeLabel: string
  strategy?: BackgroundFitStudyResourceStrategy
  studyResourceFilter: BackgroundStudyResourceFilter
}): BackgroundFitChanceExplanationScopeData | null {
  if (pickedPerkIds.length === 0 || probability === null) {
    return null
  }

  const pickedPerkIdSet = new Set(pickedPerkIds)
  const resourceCoveredPickedPerkIds = getStrategyCoveredPickedPerkIds({
    pickedPerkIdSet,
    strategy,
  })
  const nativePickedPerkIds = pickedPerkIds.filter(
    (pickedPerkId) => !resourceCoveredPickedPerkIds.has(pickedPerkId),
  )
  const guaranteedNativePickedPerkIds = getGuaranteedNativePickedPerkIds({
    matches: backgroundFit.matches,
    pickedPerkIdSet,
  })

  return {
    calculation: getChanceExplanationCalculation({
      chanceBreakdownEntries,
      fallbackProbability: probability,
      strategy,
      studyResourceFilter,
    }),
    chanceBreakdownEntries,
    nativeMatches: getScopedBackgroundFitMatches(backgroundFit.matches, nativePickedPerkIds),
    nativeProbability: getNativeProbabilityFromChanceBreakdown({
      chanceBreakdownEntries,
      fallbackProbability: probability,
      strategy,
    }),
    probability,
    resourceLines: getChanceExplanationResourceLines({
      pickedPerkIdSet,
      redundantPickedPerkIdSet: guaranteedNativePickedPerkIds,
      strategy,
    }),
    scopeKey,
    scopeLabel,
    strategy,
  }
}

function getPossibleNativeMatches(
  scopeData: BackgroundFitChanceExplanationScopeData,
): BackgroundFitMatch[] {
  return scopeData.nativeMatches.filter((nativeMatch) => !nativeMatch.isGuaranteed)
}

function getNativeMatchKey(nativeMatch: BackgroundFitMatch): string {
  return `${nativeMatch.categoryName}::${nativeMatch.perkGroupId}`
}

function getNativeSuccessConditionKey(condition: BackgroundFitNativeSuccessCondition): string {
  return condition.matches.map(getNativeMatchKey).toSorted().join('|')
}

function isNativeSuccessConditionSubset({
  possibleSubsetCondition,
  possibleSupersetCondition,
}: {
  possibleSubsetCondition: BackgroundFitNativeSuccessCondition
  possibleSupersetCondition: BackgroundFitNativeSuccessCondition
}): boolean {
  if (possibleSubsetCondition.matches.length >= possibleSupersetCondition.matches.length) {
    return false
  }

  const possibleSupersetMatchKeys = new Set(
    possibleSupersetCondition.matches.map(getNativeMatchKey),
  )

  return possibleSubsetCondition.matches.every((nativeMatch) =>
    possibleSupersetMatchKeys.has(getNativeMatchKey(nativeMatch)),
  )
}

function getNativeSuccessConditions(
  scopeData: BackgroundFitChanceExplanationScopeData,
): BackgroundFitNativeSuccessCondition[] {
  if (!scopeData.calculation || scopeData.calculation.probability <= 0) {
    return []
  }

  const possibleNativeMatches = getPossibleNativeMatches(scopeData)
  const successConditionsByKey = new Map<string, BackgroundFitNativeSuccessCondition>()

  for (const term of scopeData.calculation.successfulNativeOutcomeProbabilityTerms) {
    for (const nativeCoveredPickedPerkIds of term.nativeCoveredPickedPerkIdsByOutcome) {
      const nativeCoveredPickedPerkIdSet = new Set(nativeCoveredPickedPerkIds)
      const matches = possibleNativeMatches.filter((nativeMatch) =>
        nativeMatch.pickedPerkIds.some((pickedPerkId) =>
          nativeCoveredPickedPerkIdSet.has(pickedPerkId),
        ),
      )

      if (matches.length === 0) {
        continue
      }

      const condition = {
        matches,
      } satisfies BackgroundFitNativeSuccessCondition
      const conditionKey = getNativeSuccessConditionKey(condition)

      if (!successConditionsByKey.has(conditionKey)) {
        successConditionsByKey.set(conditionKey, condition)
      }
    }
  }

  const successConditions = [...successConditionsByKey.values()]
  const minimalSuccessConditions = successConditions.filter(
    (successCondition) =>
      !successConditions.some((otherSuccessCondition) =>
        isNativeSuccessConditionSubset({
          possibleSubsetCondition: otherSuccessCondition,
          possibleSupersetCondition: successCondition,
        }),
      ),
  )

  return minimalSuccessConditions.toSorted(
    (leftCondition, rightCondition) =>
      leftCondition.matches.length - rightCondition.matches.length ||
      formatNativeSuccessCondition(leftCondition).localeCompare(
        formatNativeSuccessCondition(rightCondition),
      ),
  )
}

function getNativeSuccessConditionForCoveredPickedPerkIds({
  nativeCoveredPickedPerkIds,
  possibleNativeMatches,
}: {
  nativeCoveredPickedPerkIds: string[]
  possibleNativeMatches: BackgroundFitMatch[]
}): BackgroundFitNativeSuccessCondition {
  const nativeCoveredPickedPerkIdSet = new Set(nativeCoveredPickedPerkIds)

  return {
    matches: possibleNativeMatches.filter((nativeMatch) =>
      nativeMatch.pickedPerkIds.some((pickedPerkId) =>
        nativeCoveredPickedPerkIdSet.has(pickedPerkId),
      ),
    ),
  }
}

function getNativeRollPaths(
  scopeData: BackgroundFitChanceExplanationScopeData,
): BackgroundFitNativeRollPath[] {
  const calculation = scopeData.calculation

  if (!calculation || calculation.probability <= 0) {
    return []
  }

  const possibleNativeMatches = getPossibleNativeMatches(scopeData)
  const pathsByKey = new Map<string, BackgroundFitNativeRollPath>()

  for (const term of calculation.successfulNativeOutcomeProbabilityTerms) {
    for (const nativeCoveredPickedPerkIds of term.nativeCoveredPickedPerkIdsByOutcome) {
      const condition = getNativeSuccessConditionForCoveredPickedPerkIds({
        nativeCoveredPickedPerkIds,
        possibleNativeMatches,
      })
      const pathKey = `${getNativeSuccessConditionKey(condition)}::${term.probability}`
      const existingPath = pathsByKey.get(pathKey)

      if (existingPath) {
        existingPath.probability += term.probability
        existingPath.rollPatternCount += 1
        continue
      }

      pathsByKey.set(pathKey, {
        condition,
        probability: term.probability,
        rollPatternCount: 1,
      })
    }
  }

  return [...pathsByKey.values()].toSorted(
    (leftPath, rightPath) =>
      rightPath.probability - leftPath.probability ||
      formatNativeSuccessCondition(leftPath.condition).localeCompare(
        formatNativeSuccessCondition(rightPath.condition),
      ),
  )
}

function formatNativeSuccessCondition(condition: BackgroundFitNativeSuccessCondition): string {
  return formatInlineList(condition.matches.map((nativeMatch) => nativeMatch.perkGroupName))
}

function formatNativeSuccessConditionList(
  conditions: BackgroundFitNativeSuccessCondition[],
): string {
  return formatOrList(conditions.map(formatNativeSuccessCondition))
}

function getNativeSuccessConditionSummary({
  conditions,
  scopeData,
}: {
  conditions: BackgroundFitNativeSuccessCondition[]
  scopeData: BackgroundFitChanceExplanationScopeData
}): string {
  const hasResourceRoute = scopeData.resourceLines.length > 0

  if (scopeData.probability <= 0) {
    return hasResourceRoute
      ? 'No legal native roll plus that route can cover every picked perk here.'
      : 'No legal native roll can cover every picked perk here.'
  }

  if (conditions.length === 0) {
    if (scopeData.calculation?.isNativeOutcomeIndependent) {
      return hasResourceRoute
        ? 'After that route, no random native group is still required.'
        : 'Guaranteed native groups already cover every picked perk here.'
    }

    return 'No picked perk group still has to roll natively, but this route still depends on a native-roll gate such as Bright or a class/weapon requirement.'
  }

  const conditionListLabel = formatNativeSuccessConditionList(conditions)

  return conditions.length === 1
    ? `The remaining native roll needs ${conditionListLabel}.`
    : `The remaining native roll needs ${conditionListLabel}.`
}

function getResourceLineTargetLabel(
  resourceLine: BackgroundFitChanceExplanationResourceLine,
): string {
  return `${resourceLine.targetGroupName} for ${formatInlineList(resourceLine.coveredPerkNames)}`
}

function getStudyResourceSlotCount({
  resourceKind,
  strategy,
}: {
  resourceKind: StudyResourceStrategyResourceKind
  strategy: BackgroundFitStudyResourceStrategy
}): number {
  return resourceKind === 'book' ? 1 : strategy.shouldAllowSecondScroll ? 2 : 1
}

function getStudyResourcePlanResourceLabel({
  resourceKind,
  slotCount,
}: {
  resourceKind: StudyResourceStrategyResourceKind
  slotCount: number
}): string {
  if (resourceKind === 'book') {
    return 'Skill book'
  }

  return slotCount > 1 ? 'Ancient scrolls' : 'Ancient scroll'
}

function getChancePlanItems(
  scopeData: BackgroundFitChanceExplanationScopeData,
): BackgroundFitChancePlanItem[] {
  const strategy = scopeData.strategy

  if (!strategy) {
    return []
  }

  return (['book', 'scroll'] as const).flatMap((resourceKind) => {
    const resourceLines = scopeData.resourceLines.filter(
      (resourceLine) => resourceLine.resourceKind === resourceKind,
    )

    if (resourceLines.length === 0) {
      return []
    }

    const slotCount = getStudyResourceSlotCount({ resourceKind, strategy })
    const resourceLabel = getStudyResourcePlanResourceLabel({ resourceKind, slotCount })
    const resourceVerb = slotCount > 1 ? 'cover' : 'covers'
    const targetLabels = resourceLines.map(getResourceLineTargetLabel)
    const text =
      resourceLines.length <= slotCount
        ? `${resourceLabel} ${resourceVerb} ${formatInlineList(targetLabels)}.`
        : slotCount === 1
          ? `${resourceLabel} covers one of ${formatOrList(targetLabels)}, depending on the native roll.`
          : `${resourceLabel} cover up to ${slotCount} of ${formatOrList(
              targetLabels,
            )}, depending on the native roll.`

    return [
      {
        iconPath: getStudyResourceStrategyResourceIconPath(resourceKind),
        resourceKind,
        text,
      },
    ]
  })
}

function BackgroundFitChancePlanList({ items }: { items: BackgroundFitChancePlanItem[] }) {
  if (items.length === 0) {
    return null
  }

  return (
    <ul aria-label="Selected route" className={styles.detailChanceExplanationResourceList}>
      {items.map((item) => (
        <li
          className={styles.detailChanceExplanationResourceItem}
          data-resource-kind={item.resourceKind}
          data-testid="detail-chance-explanation-resource-line"
          key={`${item.resourceKind}-${item.text}`}
        >
          <img
            alt=""
            aria-hidden="true"
            className={styles.detailChanceExplanationResourceIcon}
            decoding="async"
            loading="lazy"
            src={`/game-icons/${item.iconPath}`}
          />
          <span>{item.text}</span>
        </li>
      ))}
    </ul>
  )
}

function getChanceRouteLabel(entry: BackgroundFitStudyResourceChanceBreakdownEntry): string {
  if (entry.shouldAllowBook && entry.shouldAllowScroll) {
    return entry.shouldAllowSecondScroll
      ? 'Skill book + ancient scrolls'
      : 'Skill book + ancient scroll'
  }

  if (entry.shouldAllowBook) {
    return 'Skill book'
  }

  if (entry.shouldAllowScroll) {
    return entry.shouldAllowSecondScroll ? 'Ancient scrolls' : 'Ancient scroll'
  }

  return 'Native roll'
}

function BackgroundFitChanceRouteComparison({
  entries,
}: {
  entries?: BackgroundFitStudyResourceChanceBreakdownEntry[]
}) {
  if (!entries || entries.length <= 1) {
    return null
  }

  return (
    <div
      className={styles.detailChanceRouteComparison}
      data-testid="detail-chance-route-comparison"
    >
      <h5 className={styles.detailChanceExplanationMiniHeading}>Route comparison</h5>
      <dl className={styles.detailChanceRouteComparisonList}>
        {entries.map((entry) => (
          <div className={styles.detailChanceRouteComparisonRow} key={entry.key}>
            <dt>{getChanceRouteLabel(entry)}</dt>
            <dd>{formatBackgroundFitProbabilityLabel(entry.probability)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function getChanceMathSummary({
  conditions,
  scopeData,
}: {
  conditions: BackgroundFitNativeSuccessCondition[]
  scopeData: BackgroundFitChanceExplanationScopeData
}): string {
  const chanceLabel = formatBackgroundFitProbabilityLabel(scopeData.probability)
  const calculation = scopeData.calculation

  if (scopeData.probability <= 0) {
    return 'Chance math: no legal native roll satisfies the remaining condition.'
  }

  if (!calculation) {
    return `Chance math: the selected route totals ${chanceLabel}.`
  }

  if (conditions.length === 0) {
    return calculation.isNativeOutcomeIndependent
      ? `Chance math: no random native group is required, so the chance is ${chanceLabel}.`
      : `Chance math: ${calculation.successfulNativeOutcomeCount} legal native roll ${
          calculation.successfulNativeOutcomeCount === 1 ? 'pattern' : 'patterns'
        } satisfy the route, totaling ${chanceLabel}.`
  }

  const hasOnlySingleGroupConditions = conditions.every(
    (condition) => condition.matches.length === 1,
  )

  if (conditions.length === 1 && hasOnlySingleGroupConditions) {
    const nativeMatch = conditions[0]!.matches[0]!
    const nativeMatchProbabilityLabel = formatBackgroundFitProbabilityLabel(nativeMatch.probability)

    if (areBackgroundFitProbabilitiesEqual(nativeMatch.probability, scopeData.probability)) {
      return `Chance math: ${nativeMatch.perkGroupName} appears in ${nativeMatchProbabilityLabel} of native rolls, so this route is ${chanceLabel}.`
    }
  }

  if (conditions.length === 2 && hasOnlySingleGroupConditions) {
    const [leftCondition, rightCondition] = conditions
    const leftMatch = leftCondition!.matches[0]!
    const rightMatch = rightCondition!.matches[0]!
    const overlapProbability =
      leftMatch.probability + rightMatch.probability - scopeData.probability
    const isUsableOverlap =
      overlapProbability >= -1e-9 &&
      overlapProbability <= Math.min(leftMatch.probability, rightMatch.probability) + 1e-9

    if (isUsableOverlap) {
      return `Chance math: ${leftMatch.perkGroupName} ${formatBackgroundFitProbabilityLabel(
        leftMatch.probability,
      )} + ${rightMatch.perkGroupName} ${formatBackgroundFitProbabilityLabel(
        rightMatch.probability,
      )} - both ${formatBackgroundFitProbabilityLabel(Math.max(0, overlapProbability))} = ${chanceLabel}.`
    }
  }

  if (conditions.length === 1) {
    const derivation = getNativeRollDerivationForMatches(conditions[0]!.matches)

    if (
      derivation &&
      areBackgroundFitProbabilitiesEqual(derivation.probability, scopeData.probability)
    ) {
      return formatNativeRollDerivationSummary({
        derivation,
        probability: scopeData.probability,
      })
    }
  }

  return `Chance math: ${calculation.successfulNativeOutcomeCount} legal native roll ${
    calculation.successfulNativeOutcomeCount === 1 ? 'pattern satisfies' : 'patterns satisfy'
  } the remaining condition, totaling ${chanceLabel}. Open native roll details for the path list.`
}

function formatNativeRollPathLabel(path: BackgroundFitNativeRollPath): string {
  const conditionLabel = formatNativeSuccessCondition(path.condition)

  return conditionLabel || 'No picked native group'
}

function formatNativeRollPathProbabilityLabel(path: BackgroundFitNativeRollPath): string {
  const probabilityLabel = formatBackgroundFitProbabilityLabel(path.probability)

  return path.rollPatternCount === 1
    ? probabilityLabel
    : `${path.rollPatternCount} matching roll patterns total ${probabilityLabel}`
}

function getNativeRollPathDerivation(
  path: BackgroundFitNativeRollPath,
): BackgroundFitNativeRollDerivation | null {
  const derivation = getNativeRollDerivationForMatches(path.condition.matches)

  return derivation && areBackgroundFitProbabilitiesEqual(derivation.probability, path.probability)
    ? derivation
    : null
}

function BackgroundFitChanceExplanationNativeRollDetails({
  scopeData,
}: {
  scopeData: BackgroundFitChanceExplanationScopeData
}) {
  const calculation = scopeData.calculation

  if (!calculation) {
    return null
  }

  const chanceLabel = formatBackgroundFitProbabilityLabel(calculation.probability)
  const nativeRollPaths = getNativeRollPaths(scopeData)

  return (
    <details
      className={styles.detailChanceExplanationAdvanced}
      data-testid="detail-chance-explanation-advanced"
    >
      <summary>Native roll details</summary>
      <div className={styles.detailChanceExplanationCalculation}>
        {calculation.isNativeOutcomeIndependent ? (
          <p>
            No random native group remains after the selected route, so this scope is {chanceLabel}.
          </p>
        ) : (
          <p>
            {calculation.successfulNativeOutcomeCount} legal native roll{' '}
            {calculation.successfulNativeOutcomeCount === 1 ? 'path' : 'paths'} out of{' '}
            {calculation.totalNativeOutcomeCount} grouped native roll{' '}
            {calculation.totalNativeOutcomeCount === 1 ? 'pattern' : 'patterns'} total {chanceLabel}
            .
          </p>
        )}
        {calculation.isNativeOutcomeIndependent || nativeRollPaths.length === 0 ? null : (
          <ul
            className={styles.detailChanceNativeRollPathList}
            data-testid="detail-chance-native-roll-path-list"
          >
            {nativeRollPaths.map((path) => {
              const derivation = getNativeRollPathDerivation(path)

              return (
                <li
                  className={styles.detailChanceNativeRollPathItem}
                  data-testid="detail-chance-native-roll-path"
                  key={`${formatNativeSuccessCondition(path.condition)}-${path.probability}`}
                >
                  <div className={styles.detailChanceNativeRollPathHeader}>
                    <strong>{formatNativeRollPathLabel(path)}</strong>
                    <span>{formatNativeRollPathProbabilityLabel(path)}</span>
                  </div>
                  {derivation ? (
                    <p>{formatNativeRollDerivationCalculation(derivation, path.probability)}</p>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </details>
  )
}

function BackgroundFitChanceExplanationScope({
  scopeData,
  studyResourceFilter,
}: {
  scopeData: BackgroundFitChanceExplanationScopeData
  studyResourceFilter: BackgroundStudyResourceFilter
}) {
  const chanceLabel = formatBackgroundFitProbabilityLabel(scopeData.probability)
  const nativeChanceLabel =
    scopeData.nativeProbability === null
      ? null
      : formatBackgroundFitProbabilityLabel(scopeData.nativeProbability)
  const hasResourceRoute = scopeData.resourceLines.length > 0
  const hasEnabledStudyResources =
    studyResourceFilter.shouldAllowBook || studyResourceFilter.shouldAllowScroll
  const chancePlanItems = getChancePlanItems(scopeData)
  const nativeSuccessConditions = getNativeSuccessConditions(scopeData)

  return (
    <section
      aria-label={`${scopeData.scopeLabel} chance explanation`}
      className={styles.detailChanceExplanationScope}
      data-scope={scopeData.scopeKey}
      data-testid="detail-chance-explanation-scope"
    >
      <h4 className={styles.detailChanceExplanationScopeHeading}>
        <span>{scopeData.scopeLabel} chance</span>
        <strong>{chanceLabel}</strong>
      </h4>
      {scopeData.strategy && hasResourceRoute ? (
        <p className={styles.detailChanceExplanationCopy}>
          Best route improves this from {nativeChanceLabel ?? 'native-only'} native-only to{' '}
          {chanceLabel}.
        </p>
      ) : (
        <p className={styles.detailChanceExplanationCopy}>
          {hasEnabledStudyResources
            ? 'No allowed book or scroll route improves this, so the chance is native-only.'
            : 'Books and scrolls are disabled, so the chance is native-only.'}
        </p>
      )}
      <BackgroundFitChancePlanList items={chancePlanItems} />
      {scopeData.strategy?.shouldAllowSecondScroll ? (
        <p className={styles.detailChanceExplanationCopy}>
          A second ancient scroll only counts when Bright is available on that native roll.
        </p>
      ) : null}
      <p className={styles.detailChanceExplanationCopy}>
        {getNativeSuccessConditionSummary({
          conditions: nativeSuccessConditions,
          scopeData,
        })}
      </p>
      <p
        className={styles.detailChanceExplanationCalculation}
        data-testid="detail-chance-explanation-native-calculation"
      >
        {getChanceMathSummary({
          conditions: nativeSuccessConditions,
          scopeData,
        })}
      </p>
      <BackgroundFitChanceRouteComparison entries={scopeData.chanceBreakdownEntries} />
      <BackgroundFitChanceExplanationNativeRollDetails scopeData={scopeData} />
    </section>
  )
}

function BackgroundFitChanceExplanation({
  backgroundFit,
  isExpanded,
  mustHavePickedPerkIds,
  onExpandedChange,
  optionalPickedPerkCount,
  optionalPickedPerkIds,
  studyResourceFilter,
}: {
  backgroundFit: RankedBackgroundFit
  isExpanded: boolean
  mustHavePickedPerkIds: string[]
  onExpandedChange: (nextIsExpanded: boolean) => void
  optionalPickedPerkCount: number
  optionalPickedPerkIds: string[]
  studyResourceFilter: BackgroundStudyResourceFilter
}) {
  const fullBuildPickedPerkIds = getUniquePickedPerkIds([
    mustHavePickedPerkIds,
    optionalPickedPerkIds,
  ])
  const scopeDataList = [
    getChanceExplanationScopeData({
      backgroundFit,
      chanceBreakdownEntries: backgroundFit.mustHaveStudyResourceChanceBreakdown,
      pickedPerkIds: mustHavePickedPerkIds,
      probability: backgroundFit.mustHaveBuildReachabilityProbability,
      scopeKey: 'must-have',
      scopeLabel: 'Must-have',
      strategy: backgroundFit.mustHaveStudyResourceStrategy,
      studyResourceFilter,
    }),
    optionalPickedPerkCount > 0
      ? getChanceExplanationScopeData({
          backgroundFit,
          chanceBreakdownEntries: backgroundFit.fullBuildStudyResourceChanceBreakdown,
          pickedPerkIds: fullBuildPickedPerkIds,
          probability: backgroundFit.fullBuildReachabilityProbability,
          scopeKey: 'full-build',
          scopeLabel: 'Full build',
          strategy: backgroundFit.fullBuildStudyResourceStrategy,
          studyResourceFilter,
        })
      : null,
  ].filter((scopeData): scopeData is BackgroundFitChanceExplanationScopeData => scopeData !== null)

  if (scopeDataList.length === 0) {
    return null
  }

  return (
    <DetailCollapsibleSection
      className={styles.detailChanceExplanationSection}
      contentClassName={styles.detailChanceExplanation}
      contentTestId="detail-chance-explanation-content"
      isExpanded={isExpanded}
      onExpandedChange={onExpandedChange}
      sectionLabel="How chances combine"
      sectionTestId="detail-chance-explanation"
      toggleTestId="detail-chance-explanation-toggle"
    >
      <div className={styles.detailChanceExplanationScopes}>
        {scopeDataList.map((scopeData) => (
          <BackgroundFitChanceExplanationScope
            key={scopeData.scopeKey}
            scopeData={scopeData}
            studyResourceFilter={studyResourceFilter}
          />
        ))}
      </div>
    </DetailCollapsibleSection>
  )
}

function renderBackgroundTalentAttributes(attributeNames: readonly string[]) {
  if (attributeNames.length === 0) {
    return <span className={styles.detailMetadataNone}>None</span>
  }

  return (
    <ul
      className={styles.detailTalentAttributeList}
      data-testid="detail-background-talent-attribute-list"
    >
      {attributeNames.map((attributeName) => {
        const iconPath = getBackgroundTalentAttributeIconPath(attributeName)
        const iconTestId = getBackgroundTalentAttributeIconTestId(attributeName)

        return (
          <li key={attributeName}>
            {iconPath ? (
              <img
                alt=""
                aria-hidden="true"
                className={styles.detailTalentAttributeIcon}
                data-testid={iconTestId}
                decoding="async"
                loading="lazy"
                src={`/game-icons/${iconPath}`}
              />
            ) : (
              <span
                aria-hidden="true"
                className={styles.detailTalentAttributeIcon}
                data-placeholder="true"
                data-testid={iconTestId}
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
        {tooltip.trait.description ? <p>{tooltip.trait.description}</p> : null}
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

function BackgroundMetadataSectionContent({
  backgroundFit,
}: {
  backgroundFit: RankedBackgroundFit
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

  return (
    <>
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
    </>
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
  const backgroundFitIdentityKey = getBackgroundFitKey(backgroundFit)

  return (
    <DetailCollapsibleSection
      contentClassName={styles.detailMetadataSections}
      contentTestId="detail-background-metadata-content"
      isExpanded={isExpanded}
      onExpandedChange={onExpandedChange}
      sectionLabel="Background details"
      sectionTestId="detail-background-metadata-section"
      toggleTestId="detail-background-metadata-toggle"
    >
      <BackgroundMetadataSectionContent
        backgroundFit={backgroundFit}
        key={backgroundFitIdentityKey}
      />
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
  const rareOtherPerkGroupsHeading = 'Possible - under 1% chance'
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
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${rareOtherPerkGroupsHeading}, ${formatNativePerkGroupCount(otherPerkGroups.length, 'rare')}`}
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
          <span className={styles.detailOtherPerkGroupRareHeading}>
            {rareOtherPerkGroupsHeading}
          </span>
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
          data-testid="detail-background-fit-tables"
        >
          <BackgroundFitMetricSummary
            backgroundFit={backgroundFit}
            mustHavePickedPerkCount={mustHavePickedPerkCount}
            optionalPickedPerkCount={optionalPickedPerkCount}
            pickedPerkCount={pickedPerkCount}
            studyResourceFilter={studyResourceFilter}
          />
        </div>
        <BackgroundFitStudyResourcePlan
          emphasizedCategoryNames={emphasizedCategoryNames}
          emphasizedPerkGroupKeys={emphasizedPerkGroupKeys}
          fullBuildStrategy={backgroundFit.fullBuildStudyResourceStrategy}
          hoveredBuildPerkId={hoveredBuildPerkId}
          hoveredBuildPerkTooltipId={hoveredBuildPerkTooltipId}
          hoveredPerkId={hoveredPerkId}
          mustHaveStrategy={backgroundFit.mustHaveStudyResourceStrategy}
          onCloseBuildPerkHover={onCloseBuildPerkHover}
          onCloseBuildPerkTooltip={onCloseBuildPerkTooltip}
          onClosePerkGroupHover={onClosePerkGroupHover}
          onInspectPerk={onInspectPerk}
          onInspectPerkGroup={onInspectPerkGroup}
          onOpenBuildPerkHover={onOpenBuildPerkHover}
          onOpenBuildPerkTooltip={onOpenBuildPerkTooltip}
          onOpenPerkGroupHover={onOpenPerkGroupHover}
          optionalPickedPerkCount={optionalPickedPerkCount}
          selectedEmphasisCategoryNames={selectedEmphasisCategoryNames}
          selectedEmphasisPerkGroupKeys={selectedEmphasisPerkGroupKeys}
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
        <BackgroundFitChanceExplanation
          backgroundFit={backgroundFit}
          isExpanded={getDetailCollapsibleSectionExpandedState(
            detailCollapsibleSectionExpandedStates,
            'chance-explanation',
          )}
          mustHavePickedPerkIds={mustHavePickedPerkIds}
          onExpandedChange={(nextIsExpanded) =>
            onDetailCollapsibleSectionExpandedChange('chance-explanation', nextIsExpanded)
          }
          optionalPickedPerkCount={optionalPickedPerkCount}
          optionalPickedPerkIds={optionalPickedPerkIds}
          studyResourceFilter={studyResourceFilter}
        />
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
