import { getPerkGroupHoverKey, renderGameIcon } from '../lib/perk-display'
import { BuildPerkPill, type BuildPerkPillSelection } from './BuildPerkPill'

export type BuildPerkGroupTileOption = {
  categoryName: string
  isSelectable?: boolean
  perkGroupIconPath: string | null
  perkGroupId: string
  perkGroupLabel: string
}

export type BuildPerkGroupTilePerk = {
  perkId: string | null
  perkName: string
}

function isSelectablePerkGroupOption(perkGroupOption: BuildPerkGroupTileOption): boolean {
  return perkGroupOption.isSelectable !== false
}

function getBuildPerkGroupTileClassName({
  className,
  hasHighlightedPerk,
  isHighlighted,
  isWide,
}: {
  className?: string
  hasHighlightedPerk: boolean
  isHighlighted: boolean
  isWide: boolean
}): string {
  return [
    'planner-group-card',
    isWide ? 'is-wide' : '',
    className,
    isHighlighted ? 'is-highlighted' : '',
    hasHighlightedPerk ? 'has-highlighted-perk' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function isPerkGroupOptionEmphasized({
  emphasizedCategoryNames,
  emphasizedPerkGroupKeys,
  perkGroupOption,
}: {
  emphasizedCategoryNames: ReadonlySet<string>
  emphasizedPerkGroupKeys: ReadonlySet<string>
  perkGroupOption: BuildPerkGroupTileOption
}): boolean {
  return (
    emphasizedPerkGroupKeys.has(getPerkGroupHoverKey(perkGroupOption)) ||
    emphasizedCategoryNames.has(perkGroupOption.categoryName)
  )
}

function renderPerkGroupOptionIcon({
  arePerkGroupOptionsInteractive,
  isOptionHighlighted,
  onClosePerkGroupHover,
  onInspectPerkGroup,
  onOpenPerkGroupHover,
  perkGroupOption,
}: {
  arePerkGroupOptionsInteractive: boolean
  isOptionHighlighted: boolean
  onClosePerkGroupHover: (perkGroupKey: string) => void
  onInspectPerkGroup: (categoryName: string, perkGroupId: string) => void
  onOpenPerkGroupHover: (categoryName: string, perkGroupId: string) => void
  perkGroupOption: BuildPerkGroupTileOption
}) {
  const perkGroupKey = getPerkGroupHoverKey(perkGroupOption)
  const icon = renderGameIcon({
    className: 'perk-icon perk-icon-group planner-group-option-icon',
    iconPath: perkGroupOption.perkGroupIconPath,
    label: `${perkGroupOption.perkGroupLabel} perk group icon`,
  })

  if (!arePerkGroupOptionsInteractive || !isSelectablePerkGroupOption(perkGroupOption)) {
    return (
      <span
        className="planner-card-icon-stack-item"
        key={`${perkGroupOption.categoryName}-${perkGroupOption.perkGroupId}`}
      >
        {icon}
      </span>
    )
  }

  return (
    <button
      aria-label={`Select perk group ${perkGroupOption.perkGroupLabel}`}
      className={
        isOptionHighlighted
          ? 'planner-group-option-button is-highlighted'
          : 'planner-group-option-button'
      }
      key={`${perkGroupOption.categoryName}-${perkGroupOption.perkGroupId}`}
      onBlur={() => onClosePerkGroupHover(perkGroupKey)}
      onClick={() => onInspectPerkGroup(perkGroupOption.categoryName, perkGroupOption.perkGroupId)}
      onFocus={() =>
        onOpenPerkGroupHover(perkGroupOption.categoryName, perkGroupOption.perkGroupId)
      }
      onMouseEnter={() =>
        onOpenPerkGroupHover(perkGroupOption.categoryName, perkGroupOption.perkGroupId)
      }
      onMouseLeave={() => onClosePerkGroupHover(perkGroupKey)}
      title={`Select ${perkGroupOption.perkGroupLabel} perk group`}
      type="button"
    >
      {icon}
    </button>
  )
}

export function BuildPerkGroupTile({
  arePerkGroupOptionsInteractive = true,
  className,
  emphasizedCategoryNames,
  emphasizedPerkGroupKeys,
  groupLabel,
  groupOptions,
  hoveredBuildPerkId,
  hoveredBuildPerkTooltipId,
  hoveredPerkId,
  isWide = false,
  metaClassName,
  metaLabel,
  onCloseBuildPerkHover,
  onCloseBuildPerkTooltip,
  onClosePerkGroupHover,
  onInspectPerk,
  onInspectPerkGroup,
  onOpenBuildPerkHover,
  onOpenBuildPerkTooltip,
  onOpenPerkGroupHover,
  perks,
}: {
  arePerkGroupOptionsInteractive?: boolean
  className?: string
  emphasizedCategoryNames: ReadonlySet<string>
  emphasizedPerkGroupKeys: ReadonlySet<string>
  groupLabel: string
  groupOptions: BuildPerkGroupTileOption[]
  hoveredBuildPerkId: string | null
  hoveredBuildPerkTooltipId: string | undefined
  hoveredPerkId: string | null
  isWide?: boolean
  metaClassName?: string
  metaLabel?: string
  onCloseBuildPerkHover: (perkId: string) => void
  onCloseBuildPerkTooltip: () => void
  onClosePerkGroupHover: (perkGroupKey: string) => void
  onInspectPerk: (perkId: string, perkGroupSelection?: BuildPerkPillSelection) => void
  onInspectPerkGroup: (categoryName: string, perkGroupId: string) => void
  onOpenBuildPerkHover: (perkId: string) => void
  onOpenBuildPerkTooltip: (perkId: string, currentTarget: HTMLElement) => void
  onOpenPerkGroupHover: (categoryName: string, perkGroupId: string) => void
  perks: BuildPerkGroupTilePerk[]
}) {
  const selectablePerkGroupOptions = groupOptions.filter(isSelectablePerkGroupOption)
  const primaryPerkGroupOption = selectablePerkGroupOptions[0]
  const areOptionIconsInteractive =
    arePerkGroupOptionsInteractive && selectablePerkGroupOptions.length > 1
  const isHighlighted = groupOptions.some((perkGroupOption) =>
    isPerkGroupOptionEmphasized({
      emphasizedCategoryNames,
      emphasizedPerkGroupKeys,
      perkGroupOption,
    }),
  )
  const hasHighlightedPerk =
    hoveredPerkId !== null && perks.some((perk) => perk.perkId === hoveredPerkId)
  const classNames = getBuildPerkGroupTileClassName({
    className,
    hasHighlightedPerk,
    isHighlighted,
    isWide,
  })
  const primaryPerkGroupSelection = primaryPerkGroupOption
    ? {
        categoryName: primaryPerkGroupOption.categoryName,
        perkGroupId: primaryPerkGroupOption.perkGroupId,
      }
    : undefined

  return (
    <article className={classNames}>
      {primaryPerkGroupOption ? (
        <button
          aria-label={`Select perk group ${groupLabel}`}
          className="planner-group-card-inspect"
          onBlur={() => onClosePerkGroupHover(getPerkGroupHoverKey(primaryPerkGroupOption))}
          onClick={() =>
            onInspectPerkGroup(
              primaryPerkGroupOption.categoryName,
              primaryPerkGroupOption.perkGroupId,
            )
          }
          onFocus={() =>
            onOpenPerkGroupHover(
              primaryPerkGroupOption.categoryName,
              primaryPerkGroupOption.perkGroupId,
            )
          }
          onMouseEnter={() =>
            onOpenPerkGroupHover(
              primaryPerkGroupOption.categoryName,
              primaryPerkGroupOption.perkGroupId,
            )
          }
          onMouseLeave={() => onClosePerkGroupHover(getPerkGroupHoverKey(primaryPerkGroupOption))}
          title={`Select ${groupLabel} perk group`}
          type="button"
        />
      ) : null}
      <div className="planner-group-card-header">
        <div className="planner-card-icon-stack">
          {groupOptions.map((perkGroupOption) =>
            renderPerkGroupOptionIcon({
              arePerkGroupOptionsInteractive: areOptionIconsInteractive,
              isOptionHighlighted: isPerkGroupOptionEmphasized({
                emphasizedCategoryNames,
                emphasizedPerkGroupKeys,
                perkGroupOption,
              }),
              onClosePerkGroupHover,
              onInspectPerkGroup,
              onOpenPerkGroupHover,
              perkGroupOption,
            }),
          )}
        </div>
        <div className="planner-group-card-copy">
          <div className="planner-slot-topline">
            <strong className="planner-slot-name" title={groupLabel}>
              {groupLabel}
            </strong>
            {metaLabel ? (
              <span
                className={['planner-slot-group-count', metaClassName].filter(Boolean).join(' ')}
              >
                {metaLabel}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="planner-pill-list">
        {perks.map((perk) =>
          perk.perkId ? (
            <BuildPerkPill
              hoveredBuildPerkId={hoveredBuildPerkId}
              hoveredBuildPerkTooltipId={hoveredBuildPerkTooltipId}
              hoveredPerkId={hoveredPerkId}
              key={`${groupLabel}-${perk.perkId}`}
              onCloseHover={onCloseBuildPerkHover}
              onCloseTooltip={onCloseBuildPerkTooltip}
              onInspectPerk={onInspectPerk}
              onOpenHover={onOpenBuildPerkHover}
              onOpenTooltip={onOpenBuildPerkTooltip}
              perkGroupSelection={primaryPerkGroupSelection}
              perkId={perk.perkId}
              perkName={perk.perkName}
            />
          ) : (
            <span className="planner-pill" key={`${groupLabel}-${perk.perkName}`}>
              {perk.perkName}
            </span>
          ),
        )}
      </div>
    </article>
  )
}
