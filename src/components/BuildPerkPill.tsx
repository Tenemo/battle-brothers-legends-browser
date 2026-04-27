import { useCallback, useEffect, useRef, useState } from 'react'

export type BuildPerkPillSelection = {
  categoryName: string
  perkGroupId: string
}

const buildPerkPillTooltipOpenDelayMs = 500

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
  const [isTooltipPending, setIsTooltipPending] = useState(false)
  const tooltipTimeoutRef = useRef<number | null>(null)

  const clearPendingTooltip = useCallback(() => {
    if (tooltipTimeoutRef.current !== null) {
      window.clearTimeout(tooltipTimeoutRef.current)
      tooltipTimeoutRef.current = null
    }

    setIsTooltipPending(false)
  }, [])

  const closeTooltipPreview = useCallback(() => {
    clearPendingTooltip()
    onCloseTooltip()
    onCloseHover(perkId)
  }, [clearPendingTooltip, onCloseHover, onCloseTooltip, perkId])

  const openTooltipPreview = useCallback(
    (currentTarget: HTMLElement) => {
      clearPendingTooltip()
      onCloseTooltip()
      onOpenHover(perkId)
      setIsTooltipPending(true)

      tooltipTimeoutRef.current = window.setTimeout(() => {
        tooltipTimeoutRef.current = null
        setIsTooltipPending(false)
        onOpenTooltip(perkId, currentTarget)
      }, buildPerkPillTooltipOpenDelayMs)
    },
    [clearPendingTooltip, onCloseTooltip, onOpenHover, onOpenTooltip, perkId],
  )

  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current !== null) {
        window.clearTimeout(tooltipTimeoutRef.current)
      }
    }
  }, [])

  return (
    <button
      aria-describedby={hoveredBuildPerkId === perkId ? hoveredBuildPerkTooltipId : undefined}
      className={getBuildPerkPillClassName({
        isHighlighted: hoveredPerkId === perkId,
        isTooltipPending,
      })}
      onBlur={closeTooltipPreview}
      onClick={() => {
        clearPendingTooltip()
        onCloseTooltip()
        onInspectPerk(perkId, perkGroupSelection)
      }}
      onFocus={() => onOpenHover(perkId)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          closeTooltipPreview()
        }
      }}
      onMouseEnter={(event) => openTooltipPreview(event.currentTarget)}
      onMouseLeave={closeTooltipPreview}
      type="button"
    >
      {perkName}
    </button>
  )
}
