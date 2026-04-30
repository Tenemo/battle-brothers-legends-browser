import {
  formatBackgroundSourceProbabilityLabel,
  formatScenarioGrantLabel,
  getVisibleBackgroundPillLabel,
  getPerkDisplayIconPath,
  renderGameIcon,
  type GroupedBackgroundSource,
} from '../lib/perk-display'
import type { RankedBackgroundFit } from '../lib/background-fit'
import type { BackgroundStudyResourceFilter } from '../lib/background-study-reachability'
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
import { BuildPerkGroupTile } from './BuildPerkGroupTile'
import type { BuildPerkPillSelection } from './BuildPerkPill'
import { BuildToggleButton } from './SharedControls'
import sharedStyles from './SharedControls.module.scss'
import styles from './PerkDetail.module.scss'

type PerkDetailProps = {
  activeDetailType: 'background' | 'perk'
  backgroundFitDetail: { backgroundFit: RankedBackgroundFit; rank: number } | null
  emphasizedCategoryNames: ReadonlySet<string>
  emphasizedPerkGroupKeys: ReadonlySet<string>
  groupedBackgroundSources: GroupedBackgroundSource[]
  hoveredBuildPerkId: string | null
  hoveredBuildPerkTooltipId: string | undefined
  hoveredPerkId: string | null
  isSelectedPerkPicked: boolean
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
  onTogglePerkPicked: (perkId: string) => void
  mustHavePickedPerkCount: number
  optionalPickedPerkCount: number
  pickedPerkCount: number
  selectedPerk: LegendsPerkRecord | null
  studyResourceFilter: BackgroundStudyResourceFilter
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

export function DetailsPanel({
  activeDetailType,
  backgroundFitDetail,
  emphasizedCategoryNames,
  emphasizedPerkGroupKeys,
  groupedBackgroundSources,
  hoveredBuildPerkId,
  hoveredBuildPerkTooltipId,
  hoveredPerkId,
  isSelectedPerkPicked,
  onCloseBuildPerkHover,
  onCloseBuildPerkTooltip,
  onClosePerkGroupHover,
  onInspectPerk,
  onInspectPerkGroup,
  onOpenBuildPerkHover,
  onOpenBuildPerkTooltip,
  onOpenPerkGroupHover,
  onTogglePerkPicked,
  mustHavePickedPerkCount,
  optionalPickedPerkCount,
  pickedPerkCount,
  selectedPerk,
  studyResourceFilter,
}: PerkDetailProps) {
  const selectedBackgroundFitDetail =
    activeDetailType === 'background' ? backgroundFitDetail : null

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
            hoveredBuildPerkId={hoveredBuildPerkId}
            hoveredBuildPerkTooltipId={hoveredBuildPerkTooltipId}
            hoveredPerkId={hoveredPerkId}
            mustHavePickedPerkCount={mustHavePickedPerkCount}
            onCloseBuildPerkHover={onCloseBuildPerkHover}
            onCloseBuildPerkTooltip={onCloseBuildPerkTooltip}
            onClosePerkGroupHover={onClosePerkGroupHover}
            onInspectPerk={onInspectPerk}
            onInspectPerkGroup={onInspectPerkGroup}
            onOpenBuildPerkHover={onOpenBuildPerkHover}
            onOpenBuildPerkTooltip={onOpenBuildPerkTooltip}
            onOpenPerkGroupHover={onOpenPerkGroupHover}
            optionalPickedPerkCount={optionalPickedPerkCount}
            pickedPerkCount={pickedPerkCount}
            rank={selectedBackgroundFitDetail.rank}
            studyResourceFilter={studyResourceFilter}
          />
        ) : selectedPerk === null ? (
          <div className={sharedStyles.emptyState} data-testid="empty-state">
            <h2>Select a perk or background</h2>
            <p>Pick any perk or background to inspect its details.</p>
          </div>
        ) : (
          <>
            <div className={styles.detailHeader}>
              <div className={styles.detailHeaderMain}>
                {renderGameIcon({
                  className: joinClassNames(sharedStyles.perkIcon, sharedStyles.perkIconLarge),
                  iconPath: getPerkDisplayIconPath(selectedPerk),
                  label: `${selectedPerk.perkName} icon`,
                  testId: 'detail-perk-icon',
                })}
                <div>
                  <p className={styles.eyebrow}>{selectedPerk.primaryCategoryName}</p>
                  <h2>{selectedPerk.perkName}</h2>
                </div>
              </div>
              <div className={styles.detailHeaderActions}>
                <BuildToggleButton
                  isPicked={isSelectedPerkPicked}
                  onClick={() => onTogglePerkPicked(selectedPerk.id)}
                  perkName={selectedPerk.perkName}
                  source="detail"
                />
              </div>
            </div>

            <div className={styles.detailSection} data-testid="detail-section">
              <h3>Details</h3>
              {selectedPerk.descriptionParagraphs.length > 0 ? (
                selectedPerk.descriptionParagraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
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

function BackgroundDetail({
  backgroundFit,
  emphasizedCategoryNames,
  emphasizedPerkGroupKeys,
  hoveredBuildPerkId,
  hoveredBuildPerkTooltipId,
  hoveredPerkId,
  mustHavePickedPerkCount,
  onCloseBuildPerkHover,
  onCloseBuildPerkTooltip,
  onClosePerkGroupHover,
  onInspectPerk,
  onInspectPerkGroup,
  onOpenBuildPerkHover,
  onOpenBuildPerkTooltip,
  onOpenPerkGroupHover,
  optionalPickedPerkCount,
  pickedPerkCount,
  rank,
  studyResourceFilter,
}: {
  backgroundFit: RankedBackgroundFit
  emphasizedCategoryNames: ReadonlySet<string>
  emphasizedPerkGroupKeys: ReadonlySet<string>
  hoveredBuildPerkId: string | null
  hoveredBuildPerkTooltipId: string | undefined
  hoveredPerkId: string | null
  mustHavePickedPerkCount: number
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
  optionalPickedPerkCount: number
  pickedPerkCount: number
  rank: number
  studyResourceFilter: BackgroundStudyResourceFilter
}) {
  const backgroundPillLabel = getVisibleBackgroundPillLabel(backgroundFit)
  const veteranPerkLevelIntervalLabel = formatBackgroundVeteranPerkLevelIntervalBadge(
    backgroundFit.veteranPerkLevelInterval,
  )
  const veteranPerkLevelIntervalTitle = formatBackgroundVeteranPerkLevelIntervalTitle(
    backgroundFit.veteranPerkLevelInterval,
  )
  return (
    <>
      <div className={styles.detailHeader}>
        <div className={styles.detailHeaderMain}>
          {renderGameIcon({
            className: joinClassNames(sharedStyles.perkIcon, sharedStyles.perkIconLarge),
            iconPath: backgroundFit.iconPath,
            label: `${backgroundFit.backgroundName} background icon`,
            testId: 'detail-background-icon',
          })}
          <div>
            <p className={styles.eyebrow}>Background rank {rank + 1}</p>
            <h2>{backgroundFit.backgroundName}</h2>
            <div className={styles.detailBadgeRow}>
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
            </div>
          </div>
        </div>
        <div className={styles.detailHeaderActions}>
          <BackgroundFitStudyResourceBadges backgroundFit={backgroundFit} />
        </div>
      </div>

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
        <div className={styles.detailBackgroundFitMatches}>
          <BackgroundFitMatchSections
            backgroundFit={backgroundFit}
            emphasizedCategoryNames={emphasizedCategoryNames}
            emphasizedPerkGroupKeys={emphasizedPerkGroupKeys}
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
      </div>
    </>
  )
}
