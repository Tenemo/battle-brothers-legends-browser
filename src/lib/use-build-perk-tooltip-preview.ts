import { useCallback, useEffect, useRef, useState } from 'react'
import type { BuildPerkHoverOptions, PerkGroupReference } from './use-perk-interaction-state'

const buildPerkTooltipCloseGraceMs = 120
const buildPerkTooltipOpenDelayMs = 750
const buildPerkTooltipTimerDelayMs = 250

function isBuildPerkTooltipTarget(relatedTarget: EventTarget | null): boolean {
  const buildPerkTooltip = document.querySelector('[data-build-perk-tooltip="true"]')

  return relatedTarget instanceof Node && buildPerkTooltip?.contains(relatedTarget) === true
}

function isBuildPerkTooltipHovered(): boolean {
  return document.querySelector('[data-build-perk-tooltip="true"]:hover') !== null
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
  onOpenHover: (
    perkId: string,
    perkGroupReference?: PerkGroupReference,
    options?: BuildPerkHoverOptions,
  ) => void
  onOpenTooltip: (
    perkId: string,
    currentTarget: HTMLElement,
    perkGroupReference?: PerkGroupReference,
    options?: BuildPerkHoverOptions,
  ) => void
}) {
  const [activeTooltipIndicatorPerkId, setActiveTooltipIndicatorPerkId] = useState<string | null>(
    null,
  )
  const pointerPreviewPerkIdRef = useRef<string | null>(null)
  const isPointerPreviewSuppressedRef = useRef(false)
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
      isPointerPreviewSuppressedRef.current = false
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
    (
      perkId: string,
      currentTarget: HTMLElement,
      perkGroupReference?: PerkGroupReference,
      options?: BuildPerkHoverOptions,
    ) => {
      if (isPointerPreviewSuppressedRef.current) {
        return
      }

      pointerPreviewPerkIdRef.current = perkId
      clearTooltipCloseTimer()
      clearTooltipOpenTimers()
      onOpenHover(perkId, perkGroupReference, options)

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
        onOpenTooltip(perkId, currentTarget, perkGroupReference, options)
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

  const clearPointerPreviewSuppression = useCallback(() => {
    isPointerPreviewSuppressedRef.current = false
  }, [])

  const suppressTooltipPreviewUntilPointerMove = useCallback(() => {
    isPointerPreviewSuppressedRef.current = true
    clearPendingTooltip()
  }, [clearPendingTooltip])

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
    clearPointerPreviewSuppression,
    clearTooltipCloseTimer,
    closeTooltipPreview,
    openTooltipPreview,
    suppressTooltipPreviewUntilPointerMove,
  }
}
