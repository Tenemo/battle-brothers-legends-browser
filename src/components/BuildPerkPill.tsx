import {
  usePlannerInteractionActions,
  usePlannerInteractionState,
} from '../lib/planner-interaction-context-values'
import { useBuildPerkTooltipPreview } from '../lib/use-build-perk-tooltip-preview'
import type { BuildPerkHoverOptions } from '../lib/use-perk-interaction-state'
import styles from './BuildPlanner.module.scss'

export type BuildPerkPillSelection = {
  categoryName: string
  perkGroupId: string
}

const pillHoverOptions = {
  shouldEmphasizePerkGroup: false,
} as const satisfies BuildPerkHoverOptions

export function BuildPerkPill({
  onInspectPerk,
  perkGroupSelection,
  perkIconPath,
  perkId,
  perkName,
}: {
  onInspectPerk: (perkId: string, perkGroupSelection?: BuildPerkPillSelection) => void
  perkGroupSelection?: BuildPerkPillSelection
  perkIconPath: string | null
  perkId: string
  perkName: string
}) {
  const { hoveredBuildPerk, hoveredPerkId } = usePlannerInteractionState()
  const {
    closeBuildPerkHover: onCloseHover,
    closeBuildPerkTooltip: onCloseTooltip,
    openBuildPerkHover: onOpenHover,
    openBuildPerkTooltip: onOpenTooltip,
  } = usePlannerInteractionActions()
  const hoveredBuildPerkId = hoveredBuildPerk?.id ?? null
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
      onFocus={() => onOpenHover(perkId, perkGroupSelection, pillHoverOptions)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          closeTooltipPreview(perkId)
        }
      }}
      onMouseEnter={(event) =>
        openTooltipPreview(perkId, event.currentTarget, perkGroupSelection, pillHoverOptions)
      }
      onMouseLeave={(event) => closeTooltipPreview(perkId, event.relatedTarget)}
      type="button"
    >
      {perkIconPath ? (
        <img
          alt=""
          aria-hidden="true"
          className={styles.plannerPillIcon}
          data-testid="planner-pill-icon"
          decoding="async"
          loading="lazy"
          src={`/game-icons/${perkIconPath}`}
        />
      ) : null}
      <span className={styles.plannerPillLabel}>{perkName}</span>
    </button>
  )
}
