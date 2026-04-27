import { useBuildPerkTooltipPreview } from '../lib/use-build-perk-tooltip-preview'

export type BuildPerkPillSelection = {
  categoryName: string
  perkGroupId: string
}

function getBuildPerkPillClassName({
  isHighlighted,
  isTooltipPending,
}: {
  isHighlighted: boolean
  isTooltipPending: boolean
}): string {
  return [
    'planner-pill',
    isHighlighted ? 'is-highlighted' : '',
    isTooltipPending ? 'is-tooltip-pending' : '',
  ]
    .filter(Boolean)
    .join(' ')
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
  onOpenHover: (perkId: string) => void
  onOpenTooltip: (perkId: string, currentTarget: HTMLElement) => void
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
      className={getBuildPerkPillClassName({
        isHighlighted: hoveredPerkId === perkId,
        isTooltipPending: activeTooltipIndicatorPerkId === perkId,
      })}
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
