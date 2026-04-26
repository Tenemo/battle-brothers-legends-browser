import { useEffect, useMemo, useState } from 'react'
import {
  getPerkGroupHoverKey,
  type TooltipAnchorRectangle,
} from './perk-display'
import type { LegendsPerkRecord } from '../types/legends-perks'

export type HoveredBuildPerkTooltip = {
  anchorRectangle: TooltipAnchorRectangle
  perkId: string
}

export function usePerkHoverState(allPerksById: Map<string, LegendsPerkRecord>) {
  const [hoveredPerkId, setHoveredPerkId] = useState<string | null>(null)
  const [hoveredPerkGroupKey, setHoveredPerkGroupKey] = useState<string | null>(null)
  const [hoveredBuildPerkTooltip, setHoveredBuildPerkTooltip] =
    useState<HoveredBuildPerkTooltip | null>(null)
  const hoveredBuildPerk = useMemo(
    () =>
      hoveredBuildPerkTooltip === null
        ? null
        : (allPerksById.get(hoveredBuildPerkTooltip.perkId) ?? null),
    [allPerksById, hoveredBuildPerkTooltip],
  )
  const hoveredBuildPerkTooltipId =
    hoveredBuildPerk === null ? undefined : `build-perk-tooltip-${hoveredBuildPerk.id}`

  function clearAllHover() {
    setHoveredPerkId(null)
    setHoveredPerkGroupKey(null)
    setHoveredBuildPerkTooltip(null)
  }

  function clearPerkHover(perkId: string) {
    setHoveredPerkId((currentHoveredPerkId) =>
      currentHoveredPerkId === perkId ? null : currentHoveredPerkId,
    )
  }

  function clearBuildPerkTooltip(perkId: string) {
    setHoveredBuildPerkTooltip((currentTooltip) =>
      currentTooltip?.perkId === perkId ? null : currentTooltip,
    )
  }

  function clearPerkGroupHover() {
    setHoveredPerkGroupKey(null)
  }

  function closeBuildPerkTooltip() {
    setHoveredBuildPerkTooltip(null)
  }

  function openBuildPerkTooltip(perkId: string, currentTarget: HTMLButtonElement) {
    const { bottom, left, right, top, width } = currentTarget.getBoundingClientRect()

    setHoveredPerkId(perkId)
    setHoveredPerkGroupKey(null)
    setHoveredBuildPerkTooltip({
      anchorRectangle: {
        bottom,
        left,
        right,
        top,
        width,
      },
      perkId,
    })
  }

  function openBuildPerkHover(perkId: string) {
    setHoveredPerkId(perkId)
    setHoveredPerkGroupKey(null)
  }

  function openResultsPerkHover(perkId: string) {
    setHoveredPerkId(perkId)
    setHoveredPerkGroupKey(null)
    setHoveredBuildPerkTooltip(null)
  }

  function openPerkGroupHover(categoryName: string, perkGroupId: string) {
    setHoveredPerkGroupKey(getPerkGroupHoverKey({ categoryName, perkGroupId }))
    setHoveredPerkId(null)
    setHoveredBuildPerkTooltip(null)
  }

  function closePerkGroupHover(perkGroupKey: string) {
    setHoveredPerkGroupKey((currentHoveredPerkGroupKey) =>
      currentHoveredPerkGroupKey === perkGroupKey ? null : currentHoveredPerkGroupKey,
    )
  }

  useEffect(() => {
    if (hoveredBuildPerkTooltip === null || typeof window === 'undefined') {
      return
    }

    // The tooltip is positioned from a captured anchor rectangle, which is stale after resizing.
    const handleWindowResize = () => {
      setHoveredBuildPerkTooltip(null)
    }

    window.addEventListener('resize', handleWindowResize)

    return () => {
      window.removeEventListener('resize', handleWindowResize)
    }
  }, [hoveredBuildPerkTooltip])

  return {
    clearAllHover,
    clearBuildPerkTooltip,
    clearPerkGroupHover,
    clearPerkHover,
    closeBuildPerkHover: clearPerkHover,
    closeBuildPerkTooltip,
    closePerkGroupHover,
    closeResultsPerkHover: clearPerkHover,
    hoveredBuildPerk,
    hoveredBuildPerkTooltip,
    hoveredBuildPerkTooltipId,
    hoveredPerkGroupKey,
    hoveredPerkId,
    openBuildPerkHover,
    openBuildPerkTooltip,
    openPerkGroupHover,
    openResultsPerkHover,
  }
}
