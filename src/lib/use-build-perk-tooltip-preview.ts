import { useCallback, useEffect, useRef, useState } from 'react'

const buildPerkTooltipCloseGraceMs = 120
const buildPerkTooltipOpenDelayMs = 750
const buildPerkTooltipTimerDelayMs = 250

function isBuildPerkTooltipTarget(relatedTarget: EventTarget | null): boolean {
  const buildPerkTooltip = document.querySelector('.build-perk-tooltip')

  return relatedTarget instanceof Node && buildPerkTooltip?.contains(relatedTarget) === true
}

function isBuildPerkTooltipHovered(): boolean {
  return document.querySelector('.build-perk-tooltip:hover') !== null
}

export function useBuildPerkTooltipPreview({
  hoveredBuildPerkId,
  onCloseHover,
  onCloseTooltip,
  onOpenHover,
  onOpenTooltip,
}: {
  hoveredBuildPerkId: string | null
  onCloseHover: (perkId: string) => void
  onCloseTooltip: () => void
  onOpenHover: (perkId: string) => void
  onOpenTooltip: (perkId: string, currentTarget: HTMLElement) => void
}) {
  const [activeTooltipIndicatorPerkId, setActiveTooltipIndicatorPerkId] = useState<string | null>(
    null,
  )
  const pointerPreviewPerkIdRef = useRef<string | null>(null)
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

  const clearPendingTooltip = useCallback(() => {
    pointerPreviewPerkIdRef.current = null
    clearTooltipOpenTimers()
    clearTooltipCloseTimer()
    setActiveTooltipIndicatorPerkId(null)
  }, [clearTooltipCloseTimer, clearTooltipOpenTimers])

  const closeTooltipPreview = useCallback(
    (perkId: string, relatedTarget?: EventTarget | null) => {
      pointerPreviewPerkIdRef.current = null
      clearTooltipOpenTimers()

      if (hoveredBuildPerkId !== perkId) {
        clearTooltipCloseTimer()
        setActiveTooltipIndicatorPerkId(null)
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

        setActiveTooltipIndicatorPerkId(null)
        onCloseTooltip()
        onCloseHover(perkId)
      }, buildPerkTooltipCloseGraceMs)
    },
    [
      clearTooltipCloseTimer,
      clearTooltipOpenTimers,
      hoveredBuildPerkId,
      onCloseHover,
      onCloseTooltip,
    ],
  )

  const openTooltipPreview = useCallback(
    (perkId: string, currentTarget: HTMLElement) => {
      pointerPreviewPerkIdRef.current = perkId
      clearTooltipCloseTimer()
      clearTooltipOpenTimers()
      onOpenHover(perkId)

      if (hoveredBuildPerkId === perkId) {
        setActiveTooltipIndicatorPerkId(perkId)
        return
      }

      onCloseTooltip()

      tooltipTimerDelayTimeoutRef.current = window.setTimeout(() => {
        tooltipTimerDelayTimeoutRef.current = null
        setActiveTooltipIndicatorPerkId(perkId)
      }, buildPerkTooltipTimerDelayMs)

      tooltipOpenTimeoutRef.current = window.setTimeout(() => {
        tooltipOpenTimeoutRef.current = null
        setActiveTooltipIndicatorPerkId(perkId)
        onOpenTooltip(perkId, currentTarget)
      }, buildPerkTooltipOpenDelayMs)
    },
    [
      clearTooltipCloseTimer,
      clearTooltipOpenTimers,
      hoveredBuildPerkId,
      onCloseTooltip,
      onOpenHover,
      onOpenTooltip,
    ],
  )

  useEffect(() => {
    return () => {
      clearTooltipOpenTimers()
      clearTooltipCloseTimer()
    }
  }, [clearTooltipCloseTimer, clearTooltipOpenTimers])

  useEffect(() => {
    if (
      activeTooltipIndicatorPerkId !== null &&
      hoveredBuildPerkId !== activeTooltipIndicatorPerkId &&
      pointerPreviewPerkIdRef.current !== activeTooltipIndicatorPerkId
    ) {
      setActiveTooltipIndicatorPerkId(null)
    }
  }, [activeTooltipIndicatorPerkId, hoveredBuildPerkId])

  return {
    activeTooltipIndicatorPerkId,
    clearPendingTooltip,
    clearTooltipCloseTimer,
    closeTooltipPreview,
    openTooltipPreview,
  }
}
