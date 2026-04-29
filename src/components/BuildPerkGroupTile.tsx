import { getPerkGroupHoverKey, renderGameIcon } from '../lib/perk-display'
import { cx } from '../lib/class-names'
import { BuildPerkPill, type BuildPerkPillSelection } from './BuildPerkPill'
import sharedStyles from './SharedControls.module.scss'
import styles from './BuildPlanner.module.scss'

export type BuildPerkGroupTileOption = {
  categoryName: string
  isSelectable?: boolean
  perkGroupIconPath: string | null
  perkGroupId: string
  perkGroupLabel: string
}

type BuildPerkGroupTilePerk = {
  perkId: string | null
  perkName: string
}

function isSelectablePerkGroupOption(perkGroupOption: BuildPerkGroupTileOption): boolean {
  return perkGroupOption.isSelectable !== false
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
  optionIconClassName,
  perkGroupOption,
}: {
  arePerkGroupOptionsInteractive: boolean
  isOptionHighlighted: boolean
  onClosePerkGroupHover: (perkGroupKey: string) => void
  onInspectPerkGroup: (categoryName: string, perkGroupId: string) => void
  onOpenPerkGroupHover: (categoryName: string, perkGroupId: string) => void
  optionIconClassName?: string
  perkGroupOption: BuildPerkGroupTileOption
}) {
  const perkGroupKey = getPerkGroupHoverKey(perkGroupOption)
  const icon = renderGameIcon({
    className: cx(
      sharedStyles.perkIcon,
      sharedStyles.perkIconGroup,
      styles.plannerGroupOptionIcon,
      optionIconClassName,
    ),
    iconPath: perkGroupOption.perkGroupIconPath,
    label: `${perkGroupOption.perkGroupLabel} perk group icon`,
    testId: 'planner-group-option-icon',
  })

  if (!arePerkGroupOptionsInteractive || !isSelectablePerkGroupOption(perkGroupOption)) {
    return (
      <span
        className={styles.plannerCardIconStackItem}
        data-testid="planner-card-icon-stack-item"
        key={`${perkGroupOption.categoryName}-${perkGroupOption.perkGroupId}`}
      >
        {icon}
      </span>
    )
  }

  return (
    <button
      aria-label={`Select perk group ${perkGroupOption.perkGroupLabel}`}
      className={styles.plannerGroupOptionButton}
      data-highlighted={isOptionHighlighted}
      data-testid="planner-group-option-button"
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
  metaTestId,
  onCloseBuildPerkHover,
  onCloseBuildPerkTooltip,
  onClosePerkGroupHover,
  onInspectPerk,
  onInspectPerkGroup,
  onOpenBuildPerkHover,
  onOpenBuildPerkTooltip,
  onOpenPerkGroupHover,
  optionIconClassName,
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
  metaTestId?: string
  onCloseBuildPerkHover: (perkId: string) => void
  onCloseBuildPerkTooltip: () => void
  onClosePerkGroupHover: (perkGroupKey: string) => void
  onInspectPerk: (perkId: string, perkGroupSelection?: BuildPerkPillSelection) => void
  onInspectPerkGroup: (categoryName: string, perkGroupId: string) => void
  onOpenBuildPerkHover: (perkId: string) => void
  onOpenBuildPerkTooltip: (perkId: string, currentTarget: HTMLElement) => void
  onOpenPerkGroupHover: (categoryName: string, perkGroupId: string) => void
  optionIconClassName?: string
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
  const primaryPerkGroupSelection = primaryPerkGroupOption
    ? {
        categoryName: primaryPerkGroupOption.categoryName,
        perkGroupId: primaryPerkGroupOption.perkGroupId,
      }
    : undefined

  return (
    <article
      className={cx(styles.plannerGroupCard, className)}
      data-has-highlighted-perk={hasHighlightedPerk}
      data-highlighted={isHighlighted}
      data-planner-item="group-card"
      data-testid="planner-group-card"
      data-wide={isWide}
    >
      {primaryPerkGroupOption ? (
        <button
          aria-label={`Select perk group ${groupLabel}`}
          className={styles.plannerGroupCardInspect}
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
      <div className={styles.plannerGroupCardHeader}>
        <div className={styles.plannerCardIconStack}>
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
              optionIconClassName,
              perkGroupOption,
            }),
          )}
        </div>
        <div className={styles.plannerGroupCardCopy}>
          <div className={styles.plannerSlotTopline}>
            <strong className={styles.plannerSlotName} data-testid="planner-slot-name" title={groupLabel}>
              {groupLabel}
            </strong>
            {metaLabel ? (
              <span
                className={cx(styles.plannerSlotGroupCount, metaClassName)}
                data-testid={metaTestId ?? 'planner-slot-group-count'}
              >
                {metaLabel}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <div className={styles.plannerPillList} data-testid="planner-pill-list">
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
            <span className={styles.plannerPill} key={`${groupLabel}-${perk.perkName}`}>
              {perk.perkName}
            </span>
          ),
        )}
      </div>
    </article>
  )
}
