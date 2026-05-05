import { useCallback, useEffect, useRef, useState } from 'react'

const buildPlannerScrollConstraintMinimumWidth = 1280
const buildPlannerScrollConstraintMaximumWidth = 2560
const maximumVisiblePlannerContentRows = 2
const maximumVisibleCompactPlannerContentRows = 4

const plannerCollections = [
  {
    itemSelector: '[data-planner-item="picked-perk"]',
    listSelector: '[data-planner-collection="picked-perks"]',
  },
  {
    itemSelector: '[data-planner-item="group-card"]',
    listSelector: '[data-planner-collection="shared-groups"]',
  },
  {
    itemSelector: '[data-planner-item="group-card"]',
    listSelector: '[data-planner-collection="individual-groups"]',
  },
]

function getVisualRowCount(elements: HTMLElement[]): number {
  const rowTops: number[] = []

  for (const element of elements) {
    const elementBox = element.getBoundingClientRect()

    if (elementBox.width === 0 || elementBox.height === 0) {
      continue
    }

    if (!rowTops.some((rowTop) => Math.abs(rowTop - elementBox.top) <= 2)) {
      rowTops.push(elementBox.top)
    }
  }

  return rowTops.length
}

function getPlannerContentRowCounts(plannerBoard: HTMLElement): number[] {
  return plannerCollections.map(({ itemSelector, listSelector }) => {
    const plannerCollection = plannerBoard.querySelector(listSelector)

    if (!(plannerCollection instanceof HTMLElement)) {
      return 0
    }

    const plannerItems = [...plannerCollection.querySelectorAll(itemSelector)].filter(
      (element): element is HTMLElement => element instanceof HTMLElement,
    )

    return getVisualRowCount(plannerItems)
  })
}

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

function shouldStartWithPlannerScrollConstraint({
  individualPerkGroupCount,
  pickedPerkCount,
  sharedPerkGroupCount,
}: {
  individualPerkGroupCount: number
  pickedPerkCount: number
  sharedPerkGroupCount: number
}): boolean {
  return (
    isPlannerScrollConstraintViewport() &&
    (pickedPerkCount > 0 || sharedPerkGroupCount > 0 || individualPerkGroupCount > 0)
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
  const [isPlannerScrollConstrained, setIsPlannerScrollConstrained] = useState(() =>
    shouldStartWithPlannerScrollConstraint({
      individualPerkGroupCount,
      pickedPerkCount,
      sharedPerkGroupCount,
    }),
  )
  const updatePlannerScrollConstraint = useCallback(() => {
    const plannerBoard = plannerBoardRef.current
    const plannerContentRowCounts =
      plannerBoard === null ? [] : getPlannerContentRowCounts(plannerBoard)
    const shouldConstrainPlanner =
      plannerBoard !== null &&
      isPlannerScrollConstraintViewport() &&
      (hasPlannerContentPastVisibleRows(plannerContentRowCounts) ||
        hasPlannerContentPastCompactBudget(plannerContentRowCounts))

    setIsPlannerScrollConstrained((currentShouldConstrainPlanner) =>
      currentShouldConstrainPlanner === shouldConstrainPlanner
        ? currentShouldConstrainPlanner
        : shouldConstrainPlanner,
    )
  }, [])

  useEffect(() => {
    let animationFrameId = 0

    function schedulePlannerScrollConstraintUpdate() {
      window.cancelAnimationFrame(animationFrameId)
      animationFrameId = window.requestAnimationFrame(updatePlannerScrollConstraint)
    }

    schedulePlannerScrollConstraintUpdate()
    window.addEventListener('resize', schedulePlannerScrollConstraintUpdate)

    const plannerBoard = plannerBoardRef.current
    const plannerResizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(schedulePlannerScrollConstraintUpdate)

    if (plannerBoard !== null) {
      plannerResizeObserver?.observe(plannerBoard)
      plannerBoard
        .querySelectorAll('[data-planner-collection]')
        .forEach((plannerCollection) => plannerResizeObserver?.observe(plannerCollection))
    }

    return () => {
      window.cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', schedulePlannerScrollConstraintUpdate)
      plannerResizeObserver?.disconnect()
    }
  }, [
    individualPerkGroupCount,
    isIndividualPerkGroupsSectionExpanded,
    isSharedPerkGroupsSectionExpanded,
    pickedPerkCount,
    sharedPerkGroupCount,
    updatePlannerScrollConstraint,
  ])

  return {
    isPlannerScrollConstrained,
    plannerBoardRef,
  }
}
