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
  const { hoveredBuildPerk, hoveredBuildPerkTooltipId, hoveredPerkId } =
    usePlannerInteractionState()
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
    openTooltipPreviewImmediately,
    openTooltipPreview,
  } = useBuildPerkTooltipPreview({
    hoveredBuildPerkId,
    onCloseHover,
    onCloseTooltip,
    onOpenHover,
    onOpenTooltip,
  })
  const isTooltipOpenForPerk = hoveredBuildPerkId === perkId
  const controlledTooltipId =
    isTooltipOpenForPerk && hoveredBuildPerkTooltipId
      ? hoveredBuildPerkTooltipId
      : `build-perk-tooltip-${perkId}`

  function focusFirstTooltipAction() {
    window.setTimeout(() => {
      const tooltipElement = document.getElementById(controlledTooltipId)
      const firstTooltipAction =
        tooltipElement?.querySelector<HTMLButtonElement>('button:not([disabled])')

      firstTooltipAction?.focus()
    }, 0)
  }

  return (
    <button
      aria-controls={isTooltipOpenForPerk ? controlledTooltipId : undefined}
      aria-describedby={isTooltipOpenForPerk ? controlledTooltipId : undefined}
      aria-expanded={isTooltipOpenForPerk}
      aria-keyshortcuts="ArrowDown"
      className={styles.plannerPill}
      data-highlighted={hoveredPerkId === perkId}
      data-testid="planner-pill"
      data-tooltip-pending={activeTooltipIndicatorPerkId === perkId}
      onBlur={(event) => closeTooltipPreview(perkId, event.relatedTarget)}
      onClick={() => {
        clearPendingTooltip()
        onCloseTooltip()
        onInspectPerk(perkId, perkGroupSelection)
      }}
      onFocus={(event) =>
        openTooltipPreviewImmediately(
          perkId,
          event.currentTarget,
          perkGroupSelection,
          pillHoverOptions,
        )
      }
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          clearPendingTooltip()
          onCloseTooltip()
          onCloseHover(perkId)
          return
        }

        if (event.key === 'ArrowDown') {
          event.preventDefault()
          openTooltipPreviewImmediately(
            perkId,
            event.currentTarget,
            perkGroupSelection,
            pillHoverOptions,
          )
          focusFirstTooltipAction()
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
