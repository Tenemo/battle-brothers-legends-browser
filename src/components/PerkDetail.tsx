import type { ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Split } from 'lucide-react'
import { formatDisplayBulletText } from '../lib/bullet-display'
import {
  formatBackgroundSourceProbabilityLabel,
  formatScenarioGrantLabel,
  getVisibleBackgroundPillLabel,
  getPerkDisplayIconPath,
  renderGameIcon,
  type GroupedBackgroundSource,
} from '../lib/perk-display'
import type {
  BackgroundFitMatch,
  BuildTargetPerkGroup,
  RankedBackgroundFit,
} from '../lib/background-fit'
import { brightTraitIconPath, skillBookIconPath } from '../lib/background-study-resource-display'
import { ancientScrollIconPath } from '../lib/ancient-scroll-perk-group-display'
import type {
  BackgroundStudyResourceFilter,
  StudyReachabilityRequirement,
  StudyResourceRequirementProfile,
} from '../lib/background-study-reachability'
import {
  formatBackgroundVeteranPerkLevelIntervalBadge,
  formatBackgroundVeteranPerkLevelIntervalTitle,
} from '../lib/background-veteran-perks'
import { joinClassNames } from '../lib/class-names'
import { getTierLabel } from '../lib/perk-search'
import type { LegendsFavouredEnemyTarget, LegendsPerkRecord } from '../types/legends-perks'
import {
  BackgroundFitMatchSections,
  BackgroundFitMetricSummary,
  BackgroundFitStudyResourceBadges,
} from './BackgroundFitCard'
import { BuildPerkGroupTile, type BuildPerkGroupTileOption } from './BuildPerkGroupTile'
import type { BuildPerkPillSelection } from './BuildPerkPill'
import { BuildToggleButton } from './SharedControls'
import sharedStyles from './SharedControls.module.scss'
import catenaryChainIconPath from '../assets/catenary-chain.svg'
import styles from './PerkDetail.module.scss'

type PerkDetailProps = {
  activeDetailType: 'background' | 'perk'
  backgroundFitDetail: { backgroundFit: RankedBackgroundFit; rank: number } | null
  detailHistoryNavigationAvailability: DetailHistoryNavigationAvailability
  emphasizedCategoryNames: ReadonlySet<string>
  emphasizedPerkGroupKeys: ReadonlySet<string>
  selectedEmphasisCategoryNames: ReadonlySet<string>
  selectedEmphasisPerkGroupKeys: ReadonlySet<string>
  groupedBackgroundSources: GroupedBackgroundSource[]
  hoveredBuildPerkId: string | null
  hoveredBuildPerkTooltipId: string | undefined
  hoveredPerkId: string | null
  isSelectedPerkPicked: boolean
  mustHavePickedPerkIds: string[]
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
  onTogglePerkPicked: (perkId: string) => void
  optionalPickedPerkIds: string[]
  mustHavePickedPerkCount: number
  optionalPickedPerkCount: number
  pickedPerkCount: number
  selectedPerk: LegendsPerkRecord | null
  studyResourceFilter: BackgroundStudyResourceFilter
  supportedBuildTargetPerkGroups: BuildTargetPerkGroup[]
}

type DetailHistoryNavigationAvailability = {
  next: boolean
  previous: boolean
}

type StudyResourceRequirementEntry = {
  iconAlt: string
  iconPath: string
  key: string
  label: string
  requirement: StudyReachabilityRequirement | null
  resourceType: 'book' | 'bright' | 'scroll'
  support: string
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

export function DetailsPanel({
  activeDetailType,
  backgroundFitDetail,
  detailHistoryNavigationAvailability,
  emphasizedCategoryNames,
  emphasizedPerkGroupKeys,
  selectedEmphasisCategoryNames,
  selectedEmphasisPerkGroupKeys,
  groupedBackgroundSources,
  hoveredBuildPerkId,
  hoveredBuildPerkTooltipId,
  hoveredPerkId,
  isSelectedPerkPicked,
  mustHavePickedPerkIds,
  onCloseBuildPerkHover,
  onCloseBuildPerkTooltip,
  onClosePerkGroupHover,
  onInspectPerk,
  onInspectPerkGroup,
  onNavigateDetailHistory,
  onOpenBuildPerkHover,
  onOpenBuildPerkTooltip,
  onOpenPerkGroupHover,
  onTogglePerkPicked,
  optionalPickedPerkIds,
  mustHavePickedPerkCount,
  optionalPickedPerkCount,
  pickedPerkCount,
  selectedPerk,
  studyResourceFilter,
  supportedBuildTargetPerkGroups,
}: PerkDetailProps) {
  const selectedBackgroundFitDetail = activeDetailType === 'background' ? backgroundFitDetail : null

  return (
    <aside aria-label="Details" className={styles.detailPanel} data-testid="perk-detail-panel">
      <div
        aria-live="polite"
        className={joinClassNames(styles.detailPanelBody, 'app-scrollbar')}
        data-scroll-container="true"
        data-testid="perk-detail-panel-body"
      >
        {selectedBackgroundFitDetail ? (
          <BackgroundDetail
            backgroundFit={selectedBackgroundFitDetail.backgroundFit}
            emphasizedCategoryNames={emphasizedCategoryNames}
            emphasizedPerkGroupKeys={emphasizedPerkGroupKeys}
            selectedEmphasisCategoryNames={selectedEmphasisCategoryNames}
            selectedEmphasisPerkGroupKeys={selectedEmphasisPerkGroupKeys}
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
            onNavigateDetailHistory={onNavigateDetailHistory}
            onOpenBuildPerkHover={onOpenBuildPerkHover}
            onOpenBuildPerkTooltip={onOpenBuildPerkTooltip}
            onOpenPerkGroupHover={onOpenPerkGroupHover}
            optionalPickedPerkIds={optionalPickedPerkIds}
            optionalPickedPerkCount={optionalPickedPerkCount}
            pickedPerkCount={pickedPerkCount}
            rank={selectedBackgroundFitDetail.rank}
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
                  isPicked={isSelectedPerkPicked}
                  onClick={() => onTogglePerkPicked(selectedPerk.id)}
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

export const PerkDetail = DetailsPanel

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

function getRequirementKey(requirement: StudyReachabilityRequirement): string {
  return `${requirement.categoryName}::${requirement.perkGroupId}`
}

function getBuildTargetPerkGroupKey(buildTargetPerkGroup: BuildTargetPerkGroup): string {
  return `${buildTargetPerkGroup.categoryName}::${buildTargetPerkGroup.perkGroupId}`
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
    const scopedPickedPerkIds: string[] = []
    const scopedPickedPerkNames: string[] = []

    for (const [pickedPerkIndex, pickedPerkId] of match.pickedPerkIds.entries()) {
      if (!pickedPerkIdSet.has(pickedPerkId)) {
        continue
      }

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
        pickedPerkIds: scopedPickedPerkIds,
        pickedPerkNames: scopedPickedPerkNames,
      },
    ]
  })
}

function getStudyResourceRequirementEntries(
  studyResourceRequirementProfile: StudyResourceRequirementProfile | null,
): StudyResourceRequirementEntry[] {
  if (studyResourceRequirementProfile === null) {
    return []
  }

  const entries: StudyResourceRequirementEntry[] = []

  if (studyResourceRequirementProfile.bookRequirement) {
    entries.push({
      iconAlt: 'Skill book',
      iconPath: skillBookIconPath,
      key: `book-${getRequirementKey(studyResourceRequirementProfile.bookRequirement)}`,
      label: 'Skill book',
      requirement: studyResourceRequirementProfile.bookRequirement,
      resourceType: 'book',
      support: 'Learn this perk group with a skill book.',
    })
  }

  for (const [
    scrollIndex,
    scrollRequirement,
  ] of studyResourceRequirementProfile.scrollRequirements.entries()) {
    entries.push({
      iconAlt: 'Ancient scroll',
      iconPath: ancientScrollIconPath,
      key: `scroll-${scrollIndex}-${getRequirementKey(scrollRequirement)}`,
      label: 'Ancient scroll',
      requirement: scrollRequirement,
      resourceType: 'scroll',
      support: 'Learn this perk group with an ancient scroll.',
    })
  }

  if (studyResourceRequirementProfile.requiresBright) {
    entries.push({
      iconAlt: 'Bright trait',
      iconPath: brightTraitIconPath,
      key: 'bright',
      label: 'Bright',
      requirement: null,
      resourceType: 'bright',
      support: 'Needed to read a second ancient scroll.',
    })
  }

  return entries
}

function getAdditionalStudyResourceRequirementEntries({
  baseStudyResourceRequirementProfile,
  fullStudyResourceRequirementProfile,
}: {
  baseStudyResourceRequirementProfile: StudyResourceRequirementProfile | null
  fullStudyResourceRequirementProfile: StudyResourceRequirementProfile | null
}): StudyResourceRequirementEntry[] {
  const baseRequirementKeys = new Set(
    getStudyResourceRequirementEntries(baseStudyResourceRequirementProfile).map(
      (entry) => entry.key,
    ),
  )

  return getStudyResourceRequirementEntries(fullStudyResourceRequirementProfile).filter(
    (entry) => !baseRequirementKeys.has(entry.key),
  )
}

function StudyResourceRequirementList({
  buildTargetPerkGroupByKey,
  emptyMessage,
  emphasizedCategoryNames,
  emphasizedPerkGroupKeys,
  selectedEmphasisCategoryNames,
  selectedEmphasisPerkGroupKeys,
  entries,
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
}: {
  buildTargetPerkGroupByKey: ReadonlyMap<string, BuildTargetPerkGroup>
  emptyMessage: string
  emphasizedCategoryNames: ReadonlySet<string>
  emphasizedPerkGroupKeys: ReadonlySet<string>
  selectedEmphasisCategoryNames: ReadonlySet<string>
  selectedEmphasisPerkGroupKeys: ReadonlySet<string>
  entries: StudyResourceRequirementEntry[]
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
}) {
  return (
    <div className={styles.detailStudyResourceSection} data-testid="detail-study-resource-section">
      <p className={styles.detailMatchSectionLabel}>Learn with book/scrolls</p>
      {entries.length > 0 ? (
        <ul className={styles.detailStudyResourceList}>
          {entries.map((entry) => {
            const buildTargetPerkGroup =
              entry.requirement === null
                ? null
                : (buildTargetPerkGroupByKey.get(getRequirementKey(entry.requirement)) ?? null)

            return (
              <li key={entry.key}>
                <div
                  className={styles.detailStudyResourceTileFrame}
                  data-has-resource-icon={entry.resourceType !== 'scroll'}
                  data-study-resource-type={entry.resourceType}
                  data-testid="detail-study-resource-tile-frame"
                >
                  {entry.resourceType === 'scroll' ? null : (
                    <img
                      alt={entry.iconAlt}
                      className={styles.detailStudyResourceTileIcon}
                      decoding="async"
                      loading="lazy"
                      src={`/game-icons/${entry.iconPath}`}
                      title={entry.label}
                    />
                  )}
                  <BuildPerkGroupTile
                    arePerkGroupOptionsInteractive={buildTargetPerkGroup !== null}
                    className={styles.detailStudyResourceTile}
                    emphasizedCategoryNames={emphasizedCategoryNames}
                    emphasizedPerkGroupKeys={emphasizedPerkGroupKeys}
                    selectedEmphasisCategoryNames={selectedEmphasisCategoryNames}
                    selectedEmphasisPerkGroupKeys={selectedEmphasisPerkGroupKeys}
                    groupLabel={buildTargetPerkGroup?.perkGroupName ?? entry.label}
                    groupOptions={getStudyResourceTileOptions(entry, buildTargetPerkGroup)}
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
                    perks={getStudyResourceTilePerks(entry, buildTargetPerkGroup)}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className={styles.detailBackgroundFitEmptyMessage}>{emptyMessage}</p>
      )}
    </div>
  )
}

function getStudyResourceTileOptions(
  entry: StudyResourceRequirementEntry,
  buildTargetPerkGroup: BuildTargetPerkGroup | null,
): BuildPerkGroupTileOption[] {
  if (buildTargetPerkGroup) {
    return [
      {
        categoryName: buildTargetPerkGroup.categoryName,
        perkGroupIconPath: buildTargetPerkGroup.perkGroupIconPath,
        perkGroupId: buildTargetPerkGroup.perkGroupId,
        perkGroupLabel: buildTargetPerkGroup.perkGroupName,
      },
    ]
  }

  return [
    {
      categoryName: 'Study resources',
      isSelectable: false,
      perkGroupIconPath: entry.iconPath,
      perkGroupId: entry.key,
      perkGroupLabel: entry.label,
    },
  ]
}

function getStudyResourceTilePerks(
  entry: StudyResourceRequirementEntry,
  buildTargetPerkGroup: BuildTargetPerkGroup | null,
): { perkId: string | null; perkName: string }[] {
  if (!buildTargetPerkGroup) {
    return [{ perkId: null, perkName: entry.support }]
  }

  return buildTargetPerkGroup.pickedPerkNames.map((perkName, pickedPerkIndex) => ({
    perkId: buildTargetPerkGroup.pickedPerkIds[pickedPerkIndex] ?? null,
    perkName,
  }))
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
  mustHavePickedPerkIds,
  mustHavePickedPerkCount,
  onCloseBuildPerkHover,
  onCloseBuildPerkTooltip,
  onClosePerkGroupHover,
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
  mustHavePickedPerkIds: string[]
  mustHavePickedPerkCount: number
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
  const buildTargetPerkGroupByKey = new Map(
    supportedBuildTargetPerkGroups.map((buildTargetPerkGroup) => [
      getBuildTargetPerkGroupKey(buildTargetPerkGroup),
      buildTargetPerkGroup,
    ]),
  )
  const optionalStudyResourceRequirementEntries = getAdditionalStudyResourceRequirementEntries({
    baseStudyResourceRequirementProfile: backgroundFit.mustHaveStudyResourceRequirement,
    fullStudyResourceRequirementProfile: backgroundFit.fullBuildStudyResourceRequirement,
  })

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

      <div className={styles.detailSection} data-testid="detail-section">
        <h3>Background fit</h3>
        <BackgroundFitMetricSummary
          backgroundFit={backgroundFit}
          mustHavePickedPerkCount={mustHavePickedPerkCount}
          optionalPickedPerkCount={optionalPickedPerkCount}
          pickedPerkCount={pickedPerkCount}
          studyResourceFilter={studyResourceFilter}
        />
      </div>

      <div className={styles.detailSection} data-testid="detail-section">
        <h3>Matched perk groups</h3>
        <div className={styles.detailBackgroundFitMatchColumns}>
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
            <StudyResourceRequirementList
              buildTargetPerkGroupByKey={buildTargetPerkGroupByKey}
              emptyMessage="No book or scroll needed for must-have perks."
              emphasizedCategoryNames={emphasizedCategoryNames}
              emphasizedPerkGroupKeys={emphasizedPerkGroupKeys}
              selectedEmphasisCategoryNames={selectedEmphasisCategoryNames}
              selectedEmphasisPerkGroupKeys={selectedEmphasisPerkGroupKeys}
              entries={getStudyResourceRequirementEntries(
                backgroundFit.mustHaveStudyResourceRequirement,
              )}
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
            <StudyResourceRequirementList
              buildTargetPerkGroupByKey={buildTargetPerkGroupByKey}
              emptyMessage={
                optionalPickedPerkIds.length === 0
                  ? 'No optional perks in this build.'
                  : 'No additional book or scroll needed for optional perks.'
              }
              emphasizedCategoryNames={emphasizedCategoryNames}
              emphasizedPerkGroupKeys={emphasizedPerkGroupKeys}
              selectedEmphasisCategoryNames={selectedEmphasisCategoryNames}
              selectedEmphasisPerkGroupKeys={selectedEmphasisPerkGroupKeys}
              entries={optionalStudyResourceRequirementEntries}
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
          </div>
        </div>
      </div>
    </>
  )
}
