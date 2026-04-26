import type {
  BuildPlannerGroupedPerkGroup,
  BuildPlannerPerkGroupRequirementOption,
} from '../lib/build-planner'
import './BuildPlanner.css'
import { getPerkPreviewParagraphs } from '../lib/perk-search'
import {
  formatPickedPerkCountLabel,
  getAnchoredTooltipStyle,
  getPerkDisplayIconPath,
  getPerkGroupHoverKey,
  renderGameIcon,
  type TooltipAnchorRectangle,
} from '../lib/perk-display'
import type { LegendsPerkRecord } from '../types/legends-perks'

const buildPlannerGuidance =
  'Use the star in the detail panel or search results to collect perk picks, then review the shared perk groups and the remaining individual-perk groups below.'

export type HoveredBuildPerkTooltip = {
  anchorRectangle: TooltipAnchorRectangle
  perkId: string
}

function getPlannerGroupCategoryLabel(
  perkGroupOptions: BuildPlannerPerkGroupRequirementOption[],
): string {
  return [...new Set(perkGroupOptions.map((perkGroupOption) => perkGroupOption.categoryName))].join(
    ' / ',
  )
}

function getPlannerGroupLabel(perkGroupOptions: BuildPlannerPerkGroupRequirementOption[]): string {
  return [
    ...new Set(perkGroupOptions.map((perkGroupOption) => perkGroupOption.perkGroupLabel)),
  ].join(' / ')
}

function BuildPlannerInfoButton() {
  return (
    <span className="build-planner-info">
      <button
        aria-describedby="build-planner-info-tooltip"
        aria-label="Show build planner guidance"
        className="build-planner-info-button"
        type="button"
      >
        i
      </button>
      <span className="build-planner-info-tooltip" id="build-planner-info-tooltip">
        {buildPlannerGuidance}
      </span>
    </span>
  )
}

function renderPlannerGroupCard({
  groupedPerkGroup,
  hoveredPerkGroupKey,
  hoveredPerkId,
  hoveredTooltipId,
  keyPrefix,
  onCloseTooltip,
  onInspectPerk,
  onOpenTooltip,
}: {
  groupedPerkGroup: BuildPlannerGroupedPerkGroup
  hoveredPerkGroupKey: string | null
  hoveredPerkId: string | null
  hoveredTooltipId: string | undefined
  keyPrefix: string
  onCloseTooltip: () => void
  onInspectPerk: (perkId: string) => void
  onOpenTooltip: (perkId: string, currentTarget: HTMLButtonElement) => void
}) {
  const plannerGroupLabel = getPlannerGroupLabel(groupedPerkGroup.perkGroupOptions)
  const isHighlighted = groupedPerkGroup.perkGroupOptions.some(
    (perkGroupOption) =>
      hoveredPerkGroupKey ===
      getPerkGroupHoverKey({
        categoryName: perkGroupOption.categoryName,
        perkGroupId: perkGroupOption.perkGroupId,
      }),
  )

  return (
    <article
      className={isHighlighted ? 'planner-group-card is-highlighted' : 'planner-group-card'}
      key={`${keyPrefix}-${groupedPerkGroup.perkIds.join('::')}::${plannerGroupLabel}`}
    >
      <div className="planner-group-card-header">
        <div className="planner-card-icon-stack">
          {groupedPerkGroup.perkGroupOptions.map((perkGroupOption) => (
            <span className="planner-card-icon-stack-item" key={perkGroupOption.perkGroupId}>
              {renderGameIcon({
                className: 'perk-icon perk-icon-group',
                iconPath: perkGroupOption.perkGroupIconPath,
                label: `${perkGroupOption.perkGroupLabel} perk group icon`,
              })}
            </span>
          ))}
        </div>
        <div className="planner-group-card-copy">
          <div className="planner-slot-topline">
            <span className="planner-slot-category">
              {getPlannerGroupCategoryLabel(groupedPerkGroup.perkGroupOptions)}
            </span>
            <span className="planner-slot-group-count">
              {formatPickedPerkCountLabel(groupedPerkGroup.perkNames.length)}
            </span>
          </div>
          <strong className="planner-slot-name" title={plannerGroupLabel}>
            {plannerGroupLabel}
          </strong>
        </div>
      </div>
      <div className="planner-pill-list">
        {groupedPerkGroup.perkNames.map((perkName, perkIndex) => {
          const perkId = groupedPerkGroup.perkIds[perkIndex]

          return perkId ? (
            <button
              aria-describedby={hoveredPerkId === perkId ? hoveredTooltipId : undefined}
              className={hoveredPerkId === perkId ? 'planner-pill is-highlighted' : 'planner-pill'}
              key={`${plannerGroupLabel}-${perkId}`}
              onBlur={onCloseTooltip}
              onClick={() => onInspectPerk(perkId)}
              onFocus={(event) => onOpenTooltip(perkId, event.currentTarget)}
              onMouseEnter={(event) => onOpenTooltip(perkId, event.currentTarget)}
              onMouseLeave={onCloseTooltip}
              type="button"
            >
              {perkName}
            </button>
          ) : (
            <span className="planner-pill" key={`${plannerGroupLabel}-${perkName}`}>
              {perkName}
            </span>
          )
        })}
      </div>
    </article>
  )
}

export function BuildPlanner({
  hasActiveBackgroundFitSearch,
  hoveredBuildPerk,
  hoveredBuildPerkTooltip,
  hoveredBuildPerkTooltipId,
  hoveredPerkGroupKey,
  hoveredPerkId,
  individualPerkGroups,
  onClearBuild,
  onCloseBuildPerkTooltip,
  onInspectPlannerPerk,
  onOpenBuildPerkTooltip,
  onRemovePickedPerk,
  onShareBuild,
  pickedPerks,
  shareBuildStatus,
  sharedPerkGroups,
}: {
  hasActiveBackgroundFitSearch: boolean
  hoveredBuildPerk: LegendsPerkRecord | null
  hoveredBuildPerkTooltip: HoveredBuildPerkTooltip | null
  hoveredBuildPerkTooltipId: string | undefined
  hoveredPerkGroupKey: string | null
  hoveredPerkId: string | null
  individualPerkGroups: BuildPlannerGroupedPerkGroup[]
  onClearBuild: () => void
  onCloseBuildPerkTooltip: () => void
  onInspectPlannerPerk: (perkId: string) => void
  onOpenBuildPerkTooltip: (perkId: string, currentTarget: HTMLButtonElement) => void
  onRemovePickedPerk: (perkId: string) => void
  onShareBuild: () => Promise<void>
  pickedPerks: LegendsPerkRecord[]
  shareBuildStatus: 'copied' | 'error' | 'idle'
  sharedPerkGroups: BuildPlannerGroupedPerkGroup[]
}) {
  const hasPickedPerks = pickedPerks.length > 0
  const hasIndividualPerkGroups = individualPerkGroups.length > 0

  return (
    <>
      <section
        aria-label="Build planner"
        className={
          hasActiveBackgroundFitSearch
            ? 'build-planner is-background-fit-search-active'
            : 'build-planner'
        }
      >
        <div className="build-planner-header">
          <div className="build-planner-title-row">
            <div className="build-planner-title">
              <h2>
                Build planner
                {hasPickedPerks ? <BuildPlannerInfoButton /> : null}
              </h2>
            </div>
          </div>
          <div className="build-planner-actions">
            <p className="build-planner-count">
              {!hasPickedPerks
                ? 'No perks picked yet.'
                : `${pickedPerks.length} perk${pickedPerks.length === 1 ? '' : 's'} picked.`}
            </p>
            <button
              aria-label="Copy build link"
              className={
                shareBuildStatus === 'copied'
                  ? 'planner-action-button share-build-button is-confirmed'
                  : shareBuildStatus === 'error'
                    ? 'planner-action-button share-build-button is-error'
                    : 'planner-action-button share-build-button'
              }
              disabled={pickedPerks.length === 0}
              onClick={() => {
                void onShareBuild()
              }}
              type="button"
            >
              {shareBuildStatus === 'copied'
                ? 'Copied'
                : shareBuildStatus === 'error'
                  ? 'Copy failed'
                  : 'Copy build link'}
            </button>
            <button
              aria-label="Clear build"
              className="planner-action-button"
              disabled={pickedPerks.length === 0}
              onClick={onClearBuild}
              type="button"
            >
              Clear build
            </button>
          </div>
        </div>

        <div className="planner-board" onScrollCapture={onCloseBuildPerkTooltip}>
          <div className="planner-row">
            <span className="planner-row-label">Perks</span>
            <div className="planner-track-scroll">
              <div className="planner-track planner-track-perks" data-testid="build-perks-bar">
                {hasPickedPerks ? (
                  pickedPerks.map((pickedPerk) => (
                    <button
                      aria-describedby={
                        hoveredBuildPerk?.id === pickedPerk.id
                          ? hoveredBuildPerkTooltipId
                          : undefined
                      }
                      aria-label={`Remove ${pickedPerk.perkName} from build`}
                      className={
                        hoveredPerkId === pickedPerk.id
                          ? 'planner-slot planner-slot-perk is-highlighted'
                          : 'planner-slot planner-slot-perk'
                      }
                      key={pickedPerk.id}
                      onBlur={onCloseBuildPerkTooltip}
                      onClick={() => onRemovePickedPerk(pickedPerk.id)}
                      onFocus={(event) =>
                        onOpenBuildPerkTooltip(pickedPerk.id, event.currentTarget)
                      }
                      onMouseEnter={(event) =>
                        onOpenBuildPerkTooltip(pickedPerk.id, event.currentTarget)
                      }
                      onMouseLeave={onCloseBuildPerkTooltip}
                      type="button"
                    >
                      {renderGameIcon({
                        className: 'perk-icon perk-icon-tiny',
                        iconPath: getPerkDisplayIconPath(pickedPerk),
                        label: `${pickedPerk.perkName} build icon`,
                      })}
                      <strong className="planner-picked-perk-name">{pickedPerk.perkName}</strong>
                    </button>
                  ))
                ) : (
                  <div className="planner-slot planner-slot-placeholder is-placeholder">
                    <div className="planner-slot-copy">
                      <strong className="planner-slot-name">Pick a perk to start</strong>
                      <p className="planner-slot-meta">
                        Use the star in the detail panel or the search results list.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="planner-row">
            <span className="planner-row-label">Perk groups for 2+ perks</span>
            <div className="planner-section" data-testid="build-shared-groups-list">
              {sharedPerkGroups.length > 0 ? (
                <div className="planner-group-list">
                  {sharedPerkGroups.map((sharedPerkGroup) =>
                    renderPlannerGroupCard({
                      groupedPerkGroup: sharedPerkGroup,
                      hoveredPerkGroupKey,
                      hoveredPerkId,
                      hoveredTooltipId: hoveredBuildPerkTooltipId,
                      keyPrefix: 'shared',
                      onCloseTooltip: onCloseBuildPerkTooltip,
                      onInspectPerk: onInspectPlannerPerk,
                      onOpenTooltip: onOpenBuildPerkTooltip,
                    }),
                  )}
                </div>
              ) : (
                <div className="planner-section-placeholder">
                  <strong className="planner-slot-name">
                    Perk groups covering 2 or more picked perks will appear here
                  </strong>
                  <p className="planner-slot-meta">
                    When multiple picked perks share a perk group, it will show up here with every
                    covered perk listed on the card.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="planner-row">
            <span className="planner-row-label">Perk groups for individual perks</span>
            <div className="planner-section" data-testid="build-individual-groups-list">
              {hasPickedPerks ? (
                hasIndividualPerkGroups ? (
                  <div className="planner-group-list">
                    {individualPerkGroups.map((individualPerkGroup) =>
                      renderPlannerGroupCard({
                        groupedPerkGroup: individualPerkGroup,
                        hoveredPerkGroupKey,
                        hoveredPerkId,
                        hoveredTooltipId: hoveredBuildPerkTooltipId,
                        keyPrefix: 'individual',
                        onCloseTooltip: onCloseBuildPerkTooltip,
                        onInspectPerk: onInspectPlannerPerk,
                        onOpenTooltip: onOpenBuildPerkTooltip,
                      }),
                    )}
                  </div>
                ) : (
                  <div className="planner-section-placeholder">
                    <strong className="planner-slot-name">
                      This build has no individual-only perk groups
                    </strong>
                    <p className="planner-slot-meta">
                      Every available perk group for the current build already covers two or more
                      picked perks.
                    </p>
                  </div>
                )
              ) : (
                <div className="planner-section-placeholder">
                  <strong className="planner-slot-name">
                    Individual perk groups will appear here
                  </strong>
                  <p className="planner-slot-meta">
                    Perk groups that only match one picked perk are merged by perk and shown here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {hoveredBuildPerk !== null && hoveredBuildPerkTooltip !== null ? (
        <div
          className="build-perk-tooltip"
          id={hoveredBuildPerkTooltipId}
          role="tooltip"
          style={getAnchoredTooltipStyle(hoveredBuildPerkTooltip.anchorRectangle)}
        >
          <strong className="build-perk-tooltip-title">{hoveredBuildPerk.perkName}</strong>
          <div className="build-perk-tooltip-copy">
            {getPerkPreviewParagraphs(hoveredBuildPerk).map(
              (previewParagraph, previewParagraphIndex) => (
                <p key={`${hoveredBuildPerk.id}-tooltip-${previewParagraphIndex}`}>
                  {previewParagraph}
                </p>
              ),
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}
