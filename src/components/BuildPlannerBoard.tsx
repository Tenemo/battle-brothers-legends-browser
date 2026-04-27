import { useId, type RefObject } from 'react'
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
import type { PlannerPerkGroupSelection } from './build-planner-types'

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
  emphasizedCategoryNames,
  emphasizedPerkGroupKeys,
  individualPerkGroups,
  sharedPerkGroups,
}: {
  emphasizedCategoryNames: ReadonlySet<string>
  emphasizedPerkGroupKeys: ReadonlySet<string>
  individualPerkGroups: BuildPlannerGroupedPerkGroup[]
  sharedPerkGroups: BuildPlannerGroupedPerkGroup[]
}): Set<string> {
  const highlightedBuildPerkIds = new Set<string>()

  if (emphasizedCategoryNames.size === 0 && emphasizedPerkGroupKeys.size === 0) {
    return highlightedBuildPerkIds
  }

  for (const plannerPerkGroup of [...sharedPerkGroups, ...individualPerkGroups]) {
    const isMatchingGroup = plannerPerkGroup.perkGroupOptions.some((perkGroupOption) =>
      isPlannerPerkGroupOptionEmphasized({
        emphasizedCategoryNames,
        emphasizedPerkGroupKeys,
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

function getPlannerSlotPerkClassName({
  isHighlighted,
  isTooltipIndicatorActive,
}: {
  isHighlighted: boolean
  isTooltipIndicatorActive: boolean
}): string {
  return [
    'planner-slot',
    'planner-slot-perk',
    isHighlighted ? 'is-highlighted' : '',
    isTooltipIndicatorActive ? 'is-tooltip-pending' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function PlannerSectionToggle({
  buttonId,
  className,
  controlledSectionId,
  isExpanded,
  label,
  onToggle,
}: {
  buttonId: string
  className?: string
  controlledSectionId: string
  isExpanded: boolean
  label: string
  onToggle: () => void
}) {
  return (
    <button
      aria-controls={controlledSectionId}
      aria-expanded={isExpanded}
      aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${label.toLowerCase()}`}
      className={['planner-row-label planner-section-toggle', className].filter(Boolean).join(' ')}
      id={buttonId}
      onClick={onToggle}
      title={`${isExpanded ? 'Collapse' : 'Expand'} ${label.toLowerCase()}`}
      type="button"
    >
      <PlannerSectionChevron isExpanded={isExpanded} />
      <span className="planner-section-toggle-label">{label}</span>
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
  onOpenHover: (perkId: string) => void
  onOpenTooltip: (perkId: string, currentTarget: HTMLElement) => void
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
  onToggleIndividualPerkGroupsSection,
  onToggleSharedPerkGroupsSection,
  openBuildPerkTooltipPreview,
  pickedPerks,
  plannerBoardRef,
  sharedPerkGroups,
}: {
  activeBuildPerkTooltipIndicatorPerkId: string | null
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
  onOpenBuildPerkHover: (perkId: string) => void
  onOpenBuildPerkTooltip: (perkId: string, currentTarget: HTMLElement) => void
  onOpenPerkGroupHover: (categoryName: string, perkGroupId: string) => void
  onRemovePickedPerk: (perkId: string) => void
  onToggleIndividualPerkGroupsSection: () => void
  onToggleSharedPerkGroupsSection: () => void
  openBuildPerkTooltipPreview: (perkId: string, currentTarget: HTMLElement) => void
  pickedPerks: LegendsPerkRecord[]
  plannerBoardRef: RefObject<HTMLDivElement | null>
  sharedPerkGroups: BuildPlannerGroupedPerkGroup[]
}) {
  const sharedPerkGroupsToggleId = useId()
  const sharedPerkGroupsSectionId = useId()
  const individualPerkGroupsToggleId = useId()
  const individualPerkGroupsSectionId = useId()
  const hasPickedPerks = pickedPerks.length > 0
  const hasIndividualPerkGroups = individualPerkGroups.length > 0
  const hasCollapsedPerkGroupSections =
    !isSharedPerkGroupsSectionExpanded || !isIndividualPerkGroupsSectionExpanded
  const highlightedBuildPerkIdsForEmphasis = getHighlightedBuildPerkIdsForEmphasis({
    emphasizedCategoryNames,
    emphasizedPerkGroupKeys,
    individualPerkGroups,
    sharedPerkGroups,
  })

  return (
    <div
      className="planner-board app-scrollbar"
      onScrollCapture={() => {
        clearPendingBuildPerkTooltip()
        onCloseBuildPerkTooltip()
      }}
      ref={plannerBoardRef}
    >
      <div className="planner-row">
        <span className="planner-row-label">Perks</span>
        <div className="planner-track-scroll">
          <div className="planner-track planner-track-perks" data-testid="build-perks-bar">
            {hasPickedPerks ? (
              pickedPerks.map((pickedPerk) => (
                <div
                  className={getPlannerSlotPerkClassName({
                    isHighlighted:
                      hoveredPerkId === pickedPerk.id ||
                      highlightedBuildPerkIdsForEmphasis.has(pickedPerk.id),
                    isTooltipIndicatorActive:
                      activeBuildPerkTooltipIndicatorPerkId === pickedPerk.id,
                  })}
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
                    openBuildPerkTooltipPreview(pickedPerk.id, event.currentTarget)
                  }
                  onMouseLeave={(event) =>
                    closeBuildPerkTooltipPreview(pickedPerk.id, event.relatedTarget)
                  }
                >
                  <button
                    aria-describedby={
                      hoveredBuildPerkId === pickedPerk.id ? hoveredBuildPerkTooltipId : undefined
                    }
                    aria-label={`View ${pickedPerk.perkName} from build planner`}
                    className="planner-slot-perk-inspect"
                    onClick={() => {
                      clearPendingBuildPerkTooltip()
                      onCloseBuildPerkTooltip()
                      onInspectPlannerPerk(pickedPerk.id)
                    }}
                    onFocus={() => onOpenBuildPerkHover(pickedPerk.id)}
                    type="button"
                  >
                    {renderGameIcon({
                      className: 'perk-icon perk-icon-tiny',
                      iconPath: getPerkDisplayIconPath(pickedPerk),
                      label: `${pickedPerk.perkName} build icon`,
                    })}
                    <strong className="planner-picked-perk-name">{pickedPerk.perkName}</strong>
                  </button>
                  <button
                    aria-label={`Remove ${pickedPerk.perkName} from build`}
                    className="search-clear-button planner-slot-remove-button"
                    onClick={() => onRemovePickedPerk(pickedPerk.id)}
                    type="button"
                  >
                    <span aria-hidden="true" className="search-clear-icon" />
                  </button>
                </div>
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

      {hasCollapsedPerkGroupSections ? (
        <div aria-label="Collapsed perk group sections" className="planner-collapsed-sections">
          {!isSharedPerkGroupsSectionExpanded ? (
            <PlannerSectionToggle
              buttonId={sharedPerkGroupsToggleId}
              className="is-collapsed-chip"
              controlledSectionId={sharedPerkGroupsSectionId}
              isExpanded={isSharedPerkGroupsSectionExpanded}
              label="Perk groups for 2+ perks"
              onToggle={onToggleSharedPerkGroupsSection}
            />
          ) : null}
          {!isIndividualPerkGroupsSectionExpanded ? (
            <PlannerSectionToggle
              buttonId={individualPerkGroupsToggleId}
              className="is-collapsed-chip"
              controlledSectionId={individualPerkGroupsSectionId}
              isExpanded={isIndividualPerkGroupsSectionExpanded}
              label="Perk groups for individual perks"
              onToggle={onToggleIndividualPerkGroupsSection}
            />
          ) : null}
        </div>
      ) : null}

      {isSharedPerkGroupsSectionExpanded ? (
        <div className="planner-row">
          <PlannerSectionToggle
            buttonId={sharedPerkGroupsToggleId}
            controlledSectionId={sharedPerkGroupsSectionId}
            isExpanded={isSharedPerkGroupsSectionExpanded}
            label="Perk groups for 2+ perks"
            onToggle={onToggleSharedPerkGroupsSection}
          />
          <div
            aria-label="Perk groups for 2+ perks"
            className="planner-section"
            data-testid="build-shared-groups-list"
            id={sharedPerkGroupsSectionId}
            role="region"
          >
            {sharedPerkGroups.length > 0 ? (
              <div className="planner-group-list">
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
      ) : (
        <div
          className="planner-section"
          data-testid="build-shared-groups-list"
          hidden
          id={sharedPerkGroupsSectionId}
        />
      )}

      {isIndividualPerkGroupsSectionExpanded ? (
        <div className="planner-row">
          <PlannerSectionToggle
            buttonId={individualPerkGroupsToggleId}
            controlledSectionId={individualPerkGroupsSectionId}
            isExpanded={isIndividualPerkGroupsSectionExpanded}
            label="Perk groups for individual perks"
            onToggle={onToggleIndividualPerkGroupsSection}
          />
          <div
            aria-label="Perk groups for individual perks"
            className="planner-section"
            data-testid="build-individual-groups-list"
            id={individualPerkGroupsSectionId}
            role="region"
          >
            {hasPickedPerks ? (
              hasIndividualPerkGroups ? (
                <div className="planner-group-list">
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
      ) : (
        <div
          className="planner-section"
          data-testid="build-individual-groups-list"
          hidden
          id={individualPerkGroupsSectionId}
        />
      )}
    </div>
  )
}
