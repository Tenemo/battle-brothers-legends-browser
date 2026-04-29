import { useBuildPerkTooltipPreview } from '../lib/use-build-perk-tooltip-preview'
import styles from './BuildPlanner.module.scss'

export type BuildPerkPillSelection = {
  categoryName: string
  perkGroupId: string
}

export function BuildPerkPill({
  hoveredBuildPerkId,
  hoveredBuildPerkTooltipId,
  hoveredPerkId,
  onCloseHover,
  onCloseTooltip,
  onInspectPerk,
  onOpenHover,
  onOpenTooltip,
  perkGroupSelection,
  perkId,
  perkName,
}: {
  hoveredBuildPerkId: string | null
  hoveredBuildPerkTooltipId: string | undefined
  hoveredPerkId: string | null
  onCloseHover: (perkId: string) => void
  onCloseTooltip: () => void
  onInspectPerk: (perkId: string, perkGroupSelection?: BuildPerkPillSelection) => void
  onOpenHover: (perkId: string, perkGroupSelection?: BuildPerkPillSelection) => void
  onOpenTooltip: (
    perkId: string,
    currentTarget: HTMLElement,
    perkGroupSelection?: BuildPerkPillSelection,
  ) => void
  perkGroupSelection?: BuildPerkPillSelection
  perkId: string
  perkName: string
}) {
  const {
    activeTooltipIndicatorPerkId,
    clearPendingTooltip,
    closeTooltipPreview,
    openTooltipPreview,
  } = useBuildPerkTooltipPreview({
    hoveredBuildPerkId,
    onCloseHover,
    onCloseTooltip,
    onOpenHover,
    onOpenTooltip,
  })

  return (
    <button
      aria-describedby={hoveredBuildPerkId === perkId ? hoveredBuildPerkTooltipId : undefined}
      className={styles.plannerPill}
      data-highlighted={hoveredPerkId === perkId}
      data-testid="planner-pill"
      data-tooltip-pending={activeTooltipIndicatorPerkId === perkId}
      onBlur={() => closeTooltipPreview(perkId)}
      onClick={() => {
        clearPendingTooltip()
        onCloseTooltip()
        onInspectPerk(perkId, perkGroupSelection)
      }}
      onFocus={() => onOpenHover(perkId)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          closeTooltipPreview(perkId)
        }
      }}
      onMouseEnter={(event) => openTooltipPreview(perkId, event.currentTarget)}
      onMouseLeave={(event) => closeTooltipPreview(perkId, event.relatedTarget)}
      type="button"
    >
      {perkName}
    </button>
  )
}
