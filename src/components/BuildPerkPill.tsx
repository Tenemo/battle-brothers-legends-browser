import { useCallback, useEffect, useRef, useState } from 'react'

export type BuildPerkPillSelection = {
  categoryName: string
  perkGroupId: string
}

const buildPerkPillTooltipCloseGraceMs = 120
const buildPerkPillTooltipOpenDelayMs = 750
const buildPerkPillTooltipTimerDelayMs = 250

function isBuildPerkTooltipTarget(relatedTarget: EventTarget | null): boolean {
  const buildPerkTooltip = document.querySelector('.build-perk-tooltip')

  return relatedTarget instanceof Node && buildPerkTooltip?.contains(relatedTarget) === true
}

function isBuildPerkTooltipHovered(): boolean {
  return document.querySelector('.build-perk-tooltip:hover') !== null
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
  const [isTooltipIndicatorActive, setIsTooltipIndicatorActive] = useState(false)
  const isPointerPreviewActiveRef = useRef(false)
  const tooltipCloseTimeoutRef = useRef<number | null>(null)
  const tooltipOpenTimeoutRef = useRef<number | null>(null)
  const tooltipTimerDelayTimeoutRef = useRef<number | null>(null)

  const clearTooltipOpenTimers = useCallback(() => {
    if (tooltipTimerDelayTimeoutRef.current !== null) {
      window.clearTimeout(tooltipTimerDelayTimeoutRef.current)
      tooltipTimerDelayTimeoutRef.current = null
    }

    if (tooltipOpenTimeoutRef.current !== null) {
      window.clearTimeout(tooltipOpenTimeoutRef.current)
      tooltipOpenTimeoutRef.current = null
    }
  }, [])

  const clearTooltipCloseTimer = useCallback(() => {
    if (tooltipCloseTimeoutRef.current !== null) {
      window.clearTimeout(tooltipCloseTimeoutRef.current)
      tooltipCloseTimeoutRef.current = null
    }
  }, [])

  const closeTooltipPreview = useCallback(
    (relatedTarget?: EventTarget | null) => {
      isPointerPreviewActiveRef.current = false
      clearTooltipOpenTimers()

      if (hoveredBuildPerkId !== perkId) {
        clearTooltipCloseTimer()
        setIsTooltipIndicatorActive(false)
        onCloseHover(perkId)
        return
      }

      if (isBuildPerkTooltipTarget(relatedTarget ?? null)) {
        return
      }

      clearTooltipCloseTimer()
      tooltipCloseTimeoutRef.current = window.setTimeout(() => {
        tooltipCloseTimeoutRef.current = null

        if (isBuildPerkTooltipHovered()) {
          return
        }

        setIsTooltipIndicatorActive(false)
        onCloseTooltip()
        onCloseHover(perkId)
      }, buildPerkPillTooltipCloseGraceMs)
    },
    [
      clearTooltipCloseTimer,
      clearTooltipOpenTimers,
      hoveredBuildPerkId,
      onCloseHover,
      onCloseTooltip,
      perkId,
    ],
  )

  const openTooltipPreview = useCallback(
    (currentTarget: HTMLElement) => {
      isPointerPreviewActiveRef.current = true
      clearTooltipCloseTimer()
      clearTooltipOpenTimers()
      onOpenHover(perkId)

      if (hoveredBuildPerkId === perkId) {
        setIsTooltipIndicatorActive(true)
        return
      }

      onCloseTooltip()

      tooltipTimerDelayTimeoutRef.current = window.setTimeout(() => {
        tooltipTimerDelayTimeoutRef.current = null
        setIsTooltipIndicatorActive(true)
      }, buildPerkPillTooltipTimerDelayMs)

      tooltipOpenTimeoutRef.current = window.setTimeout(() => {
        tooltipOpenTimeoutRef.current = null
        setIsTooltipIndicatorActive(true)
        onOpenTooltip(perkId, currentTarget)
      }, buildPerkPillTooltipOpenDelayMs)
    },
    [
      clearTooltipCloseTimer,
      clearTooltipOpenTimers,
      hoveredBuildPerkId,
      onCloseTooltip,
      onOpenHover,
      onOpenTooltip,
      perkId,
    ],
  )

  useEffect(() => {
    return () => {
      clearTooltipOpenTimers()
      clearTooltipCloseTimer()
    }
  }, [clearTooltipCloseTimer, clearTooltipOpenTimers])

  useEffect(() => {
    if (hoveredBuildPerkId !== perkId && !isPointerPreviewActiveRef.current) {
      setIsTooltipIndicatorActive(false)
    }
  }, [hoveredBuildPerkId, perkId])

  return (
    <button
      aria-describedby={hoveredBuildPerkId === perkId ? hoveredBuildPerkTooltipId : undefined}
      className={getBuildPerkPillClassName({
        isHighlighted: hoveredPerkId === perkId,
        isTooltipPending: isTooltipIndicatorActive,
      })}
      onBlur={() => closeTooltipPreview()}
      onClick={() => {
        isPointerPreviewActiveRef.current = false
        clearTooltipOpenTimers()
        clearTooltipCloseTimer()
        setIsTooltipIndicatorActive(false)
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
      onMouseLeave={(event) => closeTooltipPreview(event.relatedTarget)}
      type="button"
    >
      {perkName}
    </button>
  )
}
