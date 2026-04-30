import { useId, type RefObject } from 'react'
import { Link, Split } from 'lucide-react'
import catenaryChainUrl from '../assets/catenary-chain.svg'
import { joinClassNames } from '../lib/class-names'
import type {
  BuildPlannerGroupedPerkGroup,
  BuildPlannerPerkGroupRequirementOption,
} from '../lib/build-planner'
import {
  formatPickedPerkCountLabel,
  getPerkDisplayIconPath,
  getPerkGroupHoverKey,
  renderGameIcon,
} from '../lib/perk-display'
import type { LegendsPerkRecord } from '../types/legends-perks'
import { BuildPerkGroupTile, type BuildPerkGroupTileOption } from './BuildPerkGroupTile'
import { PlannerSectionChevron } from './SharedControls'
import type { BuildPlannerPickedPerk, PlannerPerkGroupSelection } from './build-planner-types'
import sharedStyles from './SharedControls.module.scss'
import styles from './BuildPlanner.module.scss'

function getPlannerGroupLabel(perkGroupOptions: BuildPlannerPerkGroupRequirementOption[]): string {
  return [
    ...new Set(perkGroupOptions.map((perkGroupOption) => perkGroupOption.perkGroupLabel)),
  ].join(' / ')
}

function isSelectablePlannerPerkGroupOption(
  perkGroupOption: BuildPlannerPerkGroupRequirementOption,
): boolean {
  return perkGroupOption.categoryName !== 'No perk group'
}

function getPlannerGroupTileOptions(
  perkGroupOptions: BuildPlannerPerkGroupRequirementOption[],
): BuildPerkGroupTileOption[] {
  return perkGroupOptions.map((perkGroupOption) => ({
    categoryName: perkGroupOption.categoryName,
    isSelectable: isSelectablePlannerPerkGroupOption(perkGroupOption),
    perkGroupIconPath: perkGroupOption.perkGroupIconPath,
    perkGroupId: perkGroupOption.perkGroupId,
    perkGroupLabel: perkGroupOption.perkGroupLabel,
  }))
}

function getPrimaryPlannerPerkGroupSelection(
  perk: LegendsPerkRecord,
): PlannerPerkGroupSelection | undefined {
  const primaryPlacement = perk.placements[0]

  return primaryPlacement
    ? {
        categoryName: primaryPlacement.categoryName,
        perkGroupId: primaryPlacement.perkGroupId,
      }
    : undefined
}

function isPlannerPerkGroupOptionEmphasized({
  emphasizedCategoryNames,
  emphasizedPerkGroupKeys,
  perkGroupOption,
}: {
  emphasizedCategoryNames: ReadonlySet<string>
  emphasizedPerkGroupKeys: ReadonlySet<string>
  perkGroupOption: BuildPlannerPerkGroupRequirementOption
}): boolean {
  return (
    emphasizedPerkGroupKeys.has(getPerkGroupHoverKey(perkGroupOption)) ||
    emphasizedCategoryNames.has(perkGroupOption.categoryName)
  )
}

function getHighlightedBuildPerkIdsForEmphasis({
  buildPerkHighlightPerkGroupKeys,
  emphasizedCategoryNames,
  individualPerkGroups,
  sharedPerkGroups,
}: {
  buildPerkHighlightPerkGroupKeys: ReadonlySet<string>
  emphasizedCategoryNames: ReadonlySet<string>
  individualPerkGroups: BuildPlannerGroupedPerkGroup[]
  sharedPerkGroups: BuildPlannerGroupedPerkGroup[]
}): Set<string> {
  const highlightedBuildPerkIds = new Set<string>()

  if (emphasizedCategoryNames.size === 0 && buildPerkHighlightPerkGroupKeys.size === 0) {
    return highlightedBuildPerkIds
  }

  for (const plannerPerkGroup of [...sharedPerkGroups, ...individualPerkGroups]) {
    const isMatchingGroup = plannerPerkGroup.perkGroupOptions.some((perkGroupOption) =>
      isPlannerPerkGroupOptionEmphasized({
        emphasizedCategoryNames,
        emphasizedPerkGroupKeys: buildPerkHighlightPerkGroupKeys,
        perkGroupOption,
      }),
    )

    if (!isMatchingGroup) {
      continue
    }

    for (const perkId of plannerPerkGroup.perkIds) {
      highlightedBuildPerkIds.add(perkId)
    }
  }

  return highlightedBuildPerkIds
}

function PlannerSlotRequirementChain() {
  return (
    <span
      aria-label="Must-have perk"
      className={styles.plannerSlotRequirementChain}
      data-testid="planner-slot-requirement-chain"
      role="img"
      title="Must-have perk"
    >
      <img
        alt=""
        aria-hidden="true"
        className={styles.plannerSlotRequirementImage}
        data-testid="planner-slot-requirement-chain-image"
        draggable={false}
        src={catenaryChainUrl}
      />
    </span>
  )
}

export function BuildPlannerRequirementLegend() {
  return (
    <div
      aria-label="Picked perk requirement legend"
      className={styles.plannerRequirementLegend}
      data-testid="planner-requirement-legend"
    >
      <div
        className={joinClassNames(styles.plannerSlot, styles.plannerSlotPerk)}
        data-requirement="must-have"
        data-testid="planner-requirement-legend-tile"
      >
        <PlannerSlotRequirementChain />
        <div className={styles.plannerSlotPerkInspect}>
          <span className={styles.plannerPickedPerkName} data-testid="planner-picked-perk-name">
            Must-have
          </span>
        </div>
      </div>
      <div
        className={joinClassNames(styles.plannerSlot, styles.plannerSlotPerk)}
        data-requirement="optional"
        data-testid="planner-requirement-legend-tile"
      >
        <div className={styles.plannerSlotPerkInspect}>
          <span className={styles.plannerPickedPerkName} data-testid="planner-picked-perk-name">
            Optional
          </span>
        </div>
      </div>
    </div>
  )
}

function PlannerSectionToggle({
  buttonId,
  controlledSectionId,
  isExpanded,
  isCollapsedChip = false,
  label,
  onToggle,
}: {
  buttonId: string
  controlledSectionId: string
  isExpanded: boolean
  isCollapsedChip?: boolean
  label: string
  onToggle: () => void
}) {
  return (
    <button
      aria-controls={controlledSectionId}
      aria-expanded={isExpanded}
      aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${label.toLowerCase()}`}
      className={joinClassNames(styles.plannerRowLabel, styles.plannerSectionToggle)}
      data-collapsed-chip={isCollapsedChip}
      data-testid="planner-section-toggle"
      id={buttonId}
      onClick={onToggle}
      title={`${isExpanded ? 'Collapse' : 'Expand'} ${label.toLowerCase()}`}
      type="button"
    >
      <PlannerSectionChevron className={styles.plannerSectionChevron} isExpanded={isExpanded} />
      <span className={styles.plannerSectionToggleLabel}>{label}</span>
    </button>
  )
}

function renderPlannerGroupCard({
  emphasizedCategoryNames,
  emphasizedPerkGroupKeys,
  groupedPerkGroup,
  hoveredBuildPerkId,
  hoveredBuildPerkTooltipId,
  hoveredPerkId,
  keyPrefix,
  onCloseHover,
  onClosePerkGroupHover,
  onCloseTooltip,
  onInspectPerkGroup,
  onInspectPerk,
  onOpenHover,
  onOpenTooltip,
  onOpenPerkGroupHover,
}: {
  emphasizedCategoryNames: ReadonlySet<string>
  emphasizedPerkGroupKeys: ReadonlySet<string>
  groupedPerkGroup: BuildPlannerGroupedPerkGroup
  hoveredBuildPerkId: string | null
  hoveredBuildPerkTooltipId: string | undefined
  hoveredPerkId: string | null
  keyPrefix: string
  onCloseHover: (perkId: string) => void
  onClosePerkGroupHover: (perkGroupKey: string) => void
  onCloseTooltip: () => void
  onInspectPerkGroup: (categoryName: string, perkGroupId: string) => void
  onInspectPerk: (perkId: string, perkGroupSelection?: PlannerPerkGroupSelection) => void
  onOpenHover: (perkId: string, perkGroupSelection?: PlannerPerkGroupSelection) => void
  onOpenTooltip: (
    perkId: string,
    currentTarget: HTMLElement,
    perkGroupSelection?: PlannerPerkGroupSelection,
  ) => void
  onOpenPerkGroupHover: (categoryName: string, perkGroupId: string) => void
}) {
  const plannerGroupLabel = getPlannerGroupLabel(groupedPerkGroup.perkGroupOptions)

  return (
    <BuildPerkGroupTile
      emphasizedCategoryNames={emphasizedCategoryNames}
      emphasizedPerkGroupKeys={emphasizedPerkGroupKeys}
      groupLabel={plannerGroupLabel}
      groupOptions={getPlannerGroupTileOptions(groupedPerkGroup.perkGroupOptions)}
      hoveredBuildPerkId={hoveredBuildPerkId}
      hoveredBuildPerkTooltipId={hoveredBuildPerkTooltipId}
      hoveredPerkId={hoveredPerkId}
      key={`${keyPrefix}-${groupedPerkGroup.perkIds.join('::')}::${plannerGroupLabel}`}
      metaLabel={formatPickedPerkCountLabel(groupedPerkGroup.perkNames.length)}
      onCloseBuildPerkHover={onCloseHover}
      onCloseBuildPerkTooltip={onCloseTooltip}
      onClosePerkGroupHover={onClosePerkGroupHover}
      onInspectPerk={onInspectPerk}
      onInspectPerkGroup={onInspectPerkGroup}
      onOpenBuildPerkHover={onOpenHover}
      onOpenBuildPerkTooltip={onOpenTooltip}
      onOpenPerkGroupHover={onOpenPerkGroupHover}
      perks={groupedPerkGroup.perkNames.map((perkName, perkIndex) => ({
        perkId: groupedPerkGroup.perkIds[perkIndex] ?? null,
        perkName,
      }))}
    />
  )
}

export function BuildPlannerBoard({
  activeBuildPerkTooltipIndicatorPerkId,
  buildPerkHighlightPerkGroupKeys,
  clearBuildPerkTooltipPointerPreviewSuppression,
  clearPendingBuildPerkTooltip,
  closeBuildPerkTooltipPreview,
  emphasizedCategoryNames,
  emphasizedPerkGroupKeys,
  hoveredBuildPerkId,
  hoveredBuildPerkTooltipId,
  hoveredPerkId,
  individualPerkGroups,
  isIndividualPerkGroupsSectionExpanded,
  isSharedPerkGroupsSectionExpanded,
  onCloseBuildPerkHover,
  onCloseBuildPerkTooltip,
  onClosePerkGroupHover,
  onInspectPerkGroup,
  onInspectPlannerPerk,
  onOpenBuildPerkHover,
  onOpenBuildPerkTooltip,
  onOpenPerkGroupHover,
  onRemovePickedPerk,
  onTogglePickedPerkOptional,
  onToggleIndividualPerkGroupsSection,
  onToggleSharedPerkGroupsSection,
  openBuildPerkTooltipPreview,
  pickedPerks,
  plannerBoardRef,
  sharedPerkGroups,
  suppressBuildPerkTooltipPreviewUntilPointerMove,
}: {
  activeBuildPerkTooltipIndicatorPerkId: string | null
  buildPerkHighlightPerkGroupKeys: ReadonlySet<string>
  clearBuildPerkTooltipPointerPreviewSuppression: () => void
  clearPendingBuildPerkTooltip: () => void
  closeBuildPerkTooltipPreview: (perkId: string, relatedTarget?: EventTarget | null) => void
  emphasizedCategoryNames: ReadonlySet<string>
  emphasizedPerkGroupKeys: ReadonlySet<string>
  hoveredBuildPerkId: string | null
  hoveredBuildPerkTooltipId: string | undefined
  hoveredPerkId: string | null
  individualPerkGroups: BuildPlannerGroupedPerkGroup[]
  isIndividualPerkGroupsSectionExpanded: boolean
  isSharedPerkGroupsSectionExpanded: boolean
  onCloseBuildPerkHover: (perkId: string) => void
  onCloseBuildPerkTooltip: () => void
  onClosePerkGroupHover: (perkGroupKey: string) => void
  onInspectPerkGroup: (categoryName: string, perkGroupId: string) => void
  onInspectPlannerPerk: (perkId: string, perkGroupSelection?: PlannerPerkGroupSelection) => void
  onOpenBuildPerkHover: (perkId: string, perkGroupSelection?: PlannerPerkGroupSelection) => void
  onOpenBuildPerkTooltip: (
    perkId: string,
    currentTarget: HTMLElement,
    perkGroupSelection?: PlannerPerkGroupSelection,
  ) => void
  onOpenPerkGroupHover: (categoryName: string, perkGroupId: string) => void
  onRemovePickedPerk: (perkId: string) => void
  onTogglePickedPerkOptional: (perkId: string) => void
  onToggleIndividualPerkGroupsSection: () => void
  onToggleSharedPerkGroupsSection: () => void
  openBuildPerkTooltipPreview: (
    perkId: string,
    currentTarget: HTMLElement,
    perkGroupSelection?: PlannerPerkGroupSelection,
  ) => void
  pickedPerks: BuildPlannerPickedPerk[]
  plannerBoardRef: RefObject<HTMLDivElement | null>
  sharedPerkGroups: BuildPlannerGroupedPerkGroup[]
  suppressBuildPerkTooltipPreviewUntilPointerMove: () => void
}) {
  const sharedPerkGroupsToggleId = useId()
  const sharedPerkGroupsSectionId = useId()
  const individualPerkGroupsToggleId = useId()
  const individualPerkGroupsSectionId = useId()
  const hasPickedPerks = pickedPerks.length > 0
  const hasIndividualPerkGroups = individualPerkGroups.length > 0
  const highlightedBuildPerkIdsForEmphasis = getHighlightedBuildPerkIdsForEmphasis({
    buildPerkHighlightPerkGroupKeys,
    emphasizedCategoryNames,
    individualPerkGroups,
    sharedPerkGroups,
  })
  const shouldShowSharedCollapsedToggleWithPerks = !isSharedPerkGroupsSectionExpanded
  const shouldShowIndividualCollapsedToggleWithPerks =
    !isSharedPerkGroupsSectionExpanded && !isIndividualPerkGroupsSectionExpanded
  const shouldShowIndividualCollapsedToggleWithShared =
    isSharedPerkGroupsSectionExpanded && !isIndividualPerkGroupsSectionExpanded

  return (
    <div
      className={joinClassNames(styles.plannerBoard, 'app-scrollbar')}
      data-planner-board="true"
      data-scroll-container="true"
      data-testid="planner-board"
      onScrollCapture={() => {
        clearPendingBuildPerkTooltip()
        onCloseBuildPerkTooltip()
      }}
      ref={plannerBoardRef}
    >
      <div className={styles.plannerRow} data-testid="planner-row">
        <div
          className={styles.plannerRowLabelStack}
          data-has-collapsed-section={
            shouldShowSharedCollapsedToggleWithPerks || shouldShowIndividualCollapsedToggleWithPerks
          }
        >
          <span className={styles.plannerRowLabel}>Perks</span>
          {shouldShowSharedCollapsedToggleWithPerks ? (
            <PlannerSectionToggle
              buttonId={sharedPerkGroupsToggleId}
              controlledSectionId={sharedPerkGroupsSectionId}
              isCollapsedChip
              isExpanded={isSharedPerkGroupsSectionExpanded}
              label="Perk groups for 2+ perks"
              onToggle={onToggleSharedPerkGroupsSection}
            />
          ) : null}
          {shouldShowIndividualCollapsedToggleWithPerks ? (
            <PlannerSectionToggle
              buttonId={individualPerkGroupsToggleId}
              controlledSectionId={individualPerkGroupsSectionId}
              isCollapsedChip
              isExpanded={isIndividualPerkGroupsSectionExpanded}
              label="Perk groups for individual perks"
              onToggle={onToggleIndividualPerkGroupsSection}
            />
          ) : null}
        </div>
        <div className={styles.plannerTrackScroll}>
          <div
            className={joinClassNames(styles.plannerTrack, styles.plannerTrackPerks)}
            data-planner-collection="picked-perks"
            data-testid="build-perks-bar"
          >
            {hasPickedPerks ? (
              pickedPerks.map((pickedPerk) => {
                const primaryPerkGroupSelection = getPrimaryPlannerPerkGroupSelection(pickedPerk)
                const isHighlighted =
                  hoveredPerkId === pickedPerk.id ||
                  highlightedBuildPerkIdsForEmphasis.has(pickedPerk.id)
                const isTooltipIndicatorActive =
                  activeBuildPerkTooltipIndicatorPerkId === pickedPerk.id

                return (
                  <div
                    className={joinClassNames(styles.plannerSlot, styles.plannerSlotPerk)}
                    data-highlighted={isHighlighted}
                    data-planner-item="picked-perk"
                    data-requirement={pickedPerk.isOptional ? 'optional' : 'must-have'}
                    data-testid="planner-slot-perk"
                    data-tooltip-pending={isTooltipIndicatorActive}
                    key={pickedPerk.id}
                    onBlurCapture={(event) => {
                      if (
                        event.relatedTarget instanceof Node &&
                        event.currentTarget.contains(event.relatedTarget)
                      ) {
                        return
                      }

                      closeBuildPerkTooltipPreview(pickedPerk.id)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        clearPendingBuildPerkTooltip()
                        onCloseBuildPerkTooltip()
                      }
                    }}
                    onMouseEnter={(event) =>
                      openBuildPerkTooltipPreview(
                        pickedPerk.id,
                        event.currentTarget,
                        primaryPerkGroupSelection,
                      )
                    }
                    onMouseLeave={(event) =>
                      closeBuildPerkTooltipPreview(pickedPerk.id, event.relatedTarget)
                    }
                    onMouseMove={(event) => {
                      clearBuildPerkTooltipPointerPreviewSuppression()

                      if (
                        hoveredBuildPerkId === pickedPerk.id ||
                        activeBuildPerkTooltipIndicatorPerkId === pickedPerk.id
                      ) {
                        return
                      }

                      openBuildPerkTooltipPreview(
                        pickedPerk.id,
                        event.currentTarget,
                        primaryPerkGroupSelection,
                      )
                    }}
                  >
                    {!pickedPerk.isOptional ? <PlannerSlotRequirementChain /> : null}
                    <button
                      aria-describedby={
                        hoveredBuildPerkId === pickedPerk.id ? hoveredBuildPerkTooltipId : undefined
                      }
                      aria-label={`View ${pickedPerk.perkName} from build planner`}
                      className={styles.plannerSlotPerkInspect}
                      onClick={() => {
                        clearPendingBuildPerkTooltip()
                        onCloseBuildPerkTooltip()
                        onInspectPlannerPerk(pickedPerk.id)
                      }}
                      onFocus={() => onOpenBuildPerkHover(pickedPerk.id, primaryPerkGroupSelection)}
                      type="button"
                    >
                      {renderGameIcon({
                        className: joinClassNames(sharedStyles.perkIcon, sharedStyles.perkIconTiny),
                        iconPath: getPerkDisplayIconPath(pickedPerk),
                        label: `${pickedPerk.perkName} build icon`,
                        testId: 'planner-picked-perk-icon',
                      })}
                      <strong
                        className={styles.plannerPickedPerkName}
                        data-testid="planner-picked-perk-name"
                      >
                        {pickedPerk.perkName}
                      </strong>
                    </button>
                    <div
                      className={styles.plannerSlotActionPanel}
                      data-testid="planner-slot-action-panel"
                    >
                      <button
                        aria-label={
                          pickedPerk.isOptional
                            ? `Mark ${pickedPerk.perkName} as must-have`
                            : `Mark ${pickedPerk.perkName} as optional`
                        }
                        className={joinClassNames(
                          styles.plannerSlotOverlayButton,
                          styles.plannerSlotOptionalButton,
                        )}
                        data-testid="planner-slot-optional-button"
                        onClick={() => {
                          suppressBuildPerkTooltipPreviewUntilPointerMove()
                          onCloseBuildPerkTooltip()
                          onCloseBuildPerkHover(pickedPerk.id)
                          onTogglePickedPerkOptional(pickedPerk.id)
                        }}
                        title={
                          pickedPerk.isOptional
                            ? `Mark ${pickedPerk.perkName} as must-have`
                            : `Mark ${pickedPerk.perkName} as optional`
                        }
                        type="button"
                      >
                        {pickedPerk.isOptional ? (
                          <Link aria-hidden="true" className={styles.plannerSlotActionIcon} />
                        ) : (
                          <Split aria-hidden="true" className={styles.plannerSlotActionIcon} />
                        )}
                      </button>
                      <button
                        aria-label={`Remove ${pickedPerk.perkName} from build`}
                        className={joinClassNames(
                          styles.plannerSlotOverlayButton,
                          styles.plannerSlotRemoveButton,
                        )}
                        data-testid="planner-slot-remove-button"
                        onClick={() => {
                          clearPendingBuildPerkTooltip()
                          onCloseBuildPerkTooltip()
                          onCloseBuildPerkHover(pickedPerk.id)
                          onRemovePickedPerk(pickedPerk.id)
                        }}
                        title={`Remove ${pickedPerk.perkName} from build`}
                        type="button"
                      >
                        <span aria-hidden="true" className={sharedStyles.searchClearIcon} />
                      </button>
                    </div>
                  </div>
                )
              })
            ) : (
              <div
                className={joinClassNames(styles.plannerSlot, styles.plannerSlotPlaceholder)}
                data-placeholder="true"
              >
                <div className={styles.plannerSlotCopy}>
                  <strong className={styles.plannerSlotName}>Pick a perk to start</strong>
                  <p className={styles.plannerSlotMeta} data-testid="planner-slot-meta">
                    Use the star in the detail panel or the search results list.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isSharedPerkGroupsSectionExpanded ? (
        <div className={styles.plannerRow} data-testid="planner-row">
          <div
            className={styles.plannerRowLabelStack}
            data-has-collapsed-section={shouldShowIndividualCollapsedToggleWithShared}
          >
            <PlannerSectionToggle
              buttonId={sharedPerkGroupsToggleId}
              controlledSectionId={sharedPerkGroupsSectionId}
              isExpanded={isSharedPerkGroupsSectionExpanded}
              label="Perk groups for 2+ perks"
              onToggle={onToggleSharedPerkGroupsSection}
            />
            {shouldShowIndividualCollapsedToggleWithShared ? (
              <PlannerSectionToggle
                buttonId={individualPerkGroupsToggleId}
                controlledSectionId={individualPerkGroupsSectionId}
                isCollapsedChip
                isExpanded={isIndividualPerkGroupsSectionExpanded}
                label="Perk groups for individual perks"
                onToggle={onToggleIndividualPerkGroupsSection}
              />
            ) : null}
          </div>
          <div
            aria-label="Perk groups for 2+ perks"
            className={styles.plannerSection}
            data-testid="build-shared-groups-list"
            id={sharedPerkGroupsSectionId}
            role="region"
          >
            {sharedPerkGroups.length > 0 ? (
              <div className={styles.plannerGroupList} data-planner-collection="shared-groups">
                {sharedPerkGroups.map((sharedPerkGroup) =>
                  renderPlannerGroupCard({
                    emphasizedCategoryNames,
                    emphasizedPerkGroupKeys,
                    groupedPerkGroup: sharedPerkGroup,
                    hoveredBuildPerkId,
                    hoveredBuildPerkTooltipId,
                    hoveredPerkId,
                    keyPrefix: 'shared',
                    onCloseHover: onCloseBuildPerkHover,
                    onClosePerkGroupHover,
                    onCloseTooltip: onCloseBuildPerkTooltip,
                    onInspectPerkGroup,
                    onInspectPerk: onInspectPlannerPerk,
                    onOpenHover: onOpenBuildPerkHover,
                    onOpenTooltip: onOpenBuildPerkTooltip,
                    onOpenPerkGroupHover,
                  }),
                )}
              </div>
            ) : (
              <div className={styles.plannerSectionPlaceholder}>
                <strong className={styles.plannerSlotName}>
                  Perk groups covering 2 or more picked perks will appear here
                </strong>
                <p className={styles.plannerSlotMeta} data-testid="planner-slot-meta">
                  When multiple picked perks share a perk group, it will show up here with every
                  covered perk listed on the card.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          className={styles.plannerSection}
          data-testid="build-shared-groups-list"
          hidden
          id={sharedPerkGroupsSectionId}
        />
      )}

      {isIndividualPerkGroupsSectionExpanded ? (
        <div className={styles.plannerRow} data-testid="planner-row">
          <div className={styles.plannerRowLabelStack}>
            <PlannerSectionToggle
              buttonId={individualPerkGroupsToggleId}
              controlledSectionId={individualPerkGroupsSectionId}
              isExpanded={isIndividualPerkGroupsSectionExpanded}
              label="Perk groups for individual perks"
              onToggle={onToggleIndividualPerkGroupsSection}
            />
          </div>
          <div
            aria-label="Perk groups for individual perks"
            className={styles.plannerSection}
            data-testid="build-individual-groups-list"
            id={individualPerkGroupsSectionId}
            role="region"
          >
            {hasPickedPerks ? (
              hasIndividualPerkGroups ? (
                <div
                  className={styles.plannerGroupList}
                  data-planner-collection="individual-groups"
                >
                  {individualPerkGroups.map((individualPerkGroup) =>
                    renderPlannerGroupCard({
                      emphasizedCategoryNames,
                      emphasizedPerkGroupKeys,
                      groupedPerkGroup: individualPerkGroup,
                      hoveredBuildPerkId,
                      hoveredBuildPerkTooltipId,
                      hoveredPerkId,
                      keyPrefix: 'individual',
                      onCloseHover: onCloseBuildPerkHover,
                      onClosePerkGroupHover,
                      onCloseTooltip: onCloseBuildPerkTooltip,
                      onInspectPerkGroup,
                      onInspectPerk: onInspectPlannerPerk,
                      onOpenHover: onOpenBuildPerkHover,
                      onOpenTooltip: onOpenBuildPerkTooltip,
                      onOpenPerkGroupHover,
                    }),
                  )}
                </div>
              ) : (
                <div className={styles.plannerSectionPlaceholder}>
                  <strong className={styles.plannerSlotName}>
                    This build has no individual-only perk groups
                  </strong>
                  <p className={styles.plannerSlotMeta} data-testid="planner-slot-meta">
                    Every available perk group for the current build already covers two or more
                    picked perks.
                  </p>
                </div>
              )
            ) : (
              <div className={styles.plannerSectionPlaceholder}>
                <strong className={styles.plannerSlotName}>
                  Individual perk groups will appear here
                </strong>
                <p className={styles.plannerSlotMeta} data-testid="planner-slot-meta">
                  Perk groups that only match one picked perk are merged by perk and shown here.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          className={styles.plannerSection}
          data-testid="build-individual-groups-list"
          hidden
          id={individualPerkGroupsSectionId}
        />
      )}
    </div>
  )
}
