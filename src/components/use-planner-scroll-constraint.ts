import { useEffect, useMemo, useRef, useState } from 'react'

const buildPlannerScrollConstraintMinimumWidth = 1280
const buildPlannerScrollConstraintMaximumWidth = 2560
const maximumVisiblePlannerContentRows = 2
const maximumVisibleCompactPlannerContentRows = 4
const compactDesktopMediaQuery =
  '(min-width: 1280px) and (max-width: 1919px), (min-width: 1920px) and (max-height: 1200px)'
const rootFontSizeFallback = 16
const defaultAppInlinePaddingRem = 0.8 * 2
const defaultPlannerInlinePaddingRem = 0.56 * 2
const compactPlannerInlinePaddingRem = 0.42 * 2
const defaultPlannerRowLabelWidthRem = 10.4
const defaultPlannerRowGapRem = 0.56
const compactPlannerRowGapRem = 0.42
const pickedPerkItemWidthRem = 8.04
const defaultGroupItemWidthRem = 14
const compactGroupItemWidthRem = 11.4
const defaultPlannerTrackGapRem = 0.42
const compactPlannerTrackGapRem = 0.34

function hasPlannerContentPastVisibleRows(plannerContentRowCounts: number[]): boolean {
  return plannerContentRowCounts.some(
    (plannerContentRowCount) => plannerContentRowCount > maximumVisiblePlannerContentRows,
  )
}

function hasPlannerContentPastCompactBudget(plannerContentRowCounts: number[]): boolean {
  return (
    plannerContentRowCounts.reduce(
      (totalPlannerContentRowCount, plannerContentRowCount) =>
        totalPlannerContentRowCount + plannerContentRowCount,
      0,
    ) > maximumVisibleCompactPlannerContentRows
  )
}

function isPlannerScrollConstraintViewport(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.innerWidth >= buildPlannerScrollConstraintMinimumWidth &&
    window.innerWidth < buildPlannerScrollConstraintMaximumWidth
  )
}

function getRootFontSize(): number {
  if (typeof window === 'undefined') {
    return rootFontSizeFallback
  }

  const rootFontSize = Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize)

  return Number.isFinite(rootFontSize) && rootFontSize > 0 ? rootFontSize : rootFontSizeFallback
}

function getPlannerContentWidthRem(): number {
  const rootFontSize = getRootFontSize()
  const isCompactDesktop =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(compactDesktopMediaQuery).matches
  const plannerInlinePaddingRem = isCompactDesktop
    ? compactPlannerInlinePaddingRem
    : defaultPlannerInlinePaddingRem
  const plannerRowGapRem = isCompactDesktop ? compactPlannerRowGapRem : defaultPlannerRowGapRem

  return Math.max(
    window.innerWidth / rootFontSize -
      defaultAppInlinePaddingRem -
      plannerInlinePaddingRem -
      defaultPlannerRowLabelWidthRem -
      plannerRowGapRem,
    0,
  )
}

function getItemsPerPlannerRow(itemWidthRem: number, trackGapRem: number): number {
  const contentWidthRem = getPlannerContentWidthRem()

  if (contentWidthRem <= 0) {
    return 1
  }

  return Math.max(Math.floor((contentWidthRem + trackGapRem) / (itemWidthRem + trackGapRem)), 1)
}

function getPlannerRowCount(itemCount: number, itemWidthRem: number, trackGapRem: number): number {
  if (itemCount <= 0) {
    return 0
  }

  return Math.ceil(itemCount / getItemsPerPlannerRow(itemWidthRem, trackGapRem))
}

function getEstimatedPlannerContentRowCounts({
  individualPerkGroupCount,
  isIndividualPerkGroupsSectionExpanded,
  isSharedPerkGroupsSectionExpanded,
  pickedPerkCount,
  sharedPerkGroupCount,
}: {
  individualPerkGroupCount: number
  isIndividualPerkGroupsSectionExpanded: boolean
  isSharedPerkGroupsSectionExpanded: boolean
  pickedPerkCount: number
  sharedPerkGroupCount: number
}): number[] {
  const isCompactDesktop =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(compactDesktopMediaQuery).matches
  const plannerTrackGapRem = isCompactDesktop
    ? compactPlannerTrackGapRem
    : defaultPlannerTrackGapRem
  const groupItemWidthRem = isCompactDesktop ? compactGroupItemWidthRem : defaultGroupItemWidthRem

  return [
    getPlannerRowCount(pickedPerkCount, pickedPerkItemWidthRem, plannerTrackGapRem),
    isSharedPerkGroupsSectionExpanded
      ? getPlannerRowCount(sharedPerkGroupCount, groupItemWidthRem, plannerTrackGapRem)
      : 0,
    isIndividualPerkGroupsSectionExpanded
      ? getPlannerRowCount(individualPerkGroupCount, groupItemWidthRem, plannerTrackGapRem)
      : 0,
  ]
}

function shouldConstrainPlannerScroll({
  individualPerkGroupCount,
  isIndividualPerkGroupsSectionExpanded,
  isSharedPerkGroupsSectionExpanded,
  pickedPerkCount,
  sharedPerkGroupCount,
}: {
  individualPerkGroupCount: number
  isIndividualPerkGroupsSectionExpanded: boolean
  isSharedPerkGroupsSectionExpanded: boolean
  pickedPerkCount: number
  sharedPerkGroupCount: number
}): boolean {
  if (!isPlannerScrollConstraintViewport()) {
    return false
  }

  const plannerContentRowCounts = getEstimatedPlannerContentRowCounts({
    individualPerkGroupCount,
    isIndividualPerkGroupsSectionExpanded,
    isSharedPerkGroupsSectionExpanded,
    pickedPerkCount,
    sharedPerkGroupCount,
  })

  return (
    hasPlannerContentPastVisibleRows(plannerContentRowCounts) ||
    hasPlannerContentPastCompactBudget(plannerContentRowCounts)
  )
}

export function usePlannerScrollConstraint({
  individualPerkGroupCount,
  isIndividualPerkGroupsSectionExpanded,
  isSharedPerkGroupsSectionExpanded,
  pickedPerkCount,
  sharedPerkGroupCount,
}: {
  individualPerkGroupCount: number
  isIndividualPerkGroupsSectionExpanded: boolean
  isSharedPerkGroupsSectionExpanded: boolean
  pickedPerkCount: number
  sharedPerkGroupCount: number
}) {
  const plannerBoardRef = useRef<HTMLDivElement | null>(null)
  const [viewportResizeRevision, setViewportResizeRevision] = useState(0)

  useEffect(() => {
    function handleResize() {
      setViewportResizeRevision(
        (currentViewportResizeRevision) => currentViewportResizeRevision + 1,
      )
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const isPlannerScrollConstrained = useMemo(() => {
    void viewportResizeRevision

    return shouldConstrainPlannerScroll({
      individualPerkGroupCount,
      isIndividualPerkGroupsSectionExpanded,
      isSharedPerkGroupsSectionExpanded,
      pickedPerkCount,
      sharedPerkGroupCount,
    })
  }, [
    individualPerkGroupCount,
    isIndividualPerkGroupsSectionExpanded,
    isSharedPerkGroupsSectionExpanded,
    pickedPerkCount,
    sharedPerkGroupCount,
    viewportResizeRevision,
  ])

  return {
    isPlannerScrollConstrained,
    plannerBoardRef,
  }
}
