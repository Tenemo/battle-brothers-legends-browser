import { createContext, useContext } from 'react'
import type { usePerkInteractionState } from './use-perk-interaction-state'

export type PlannerInteraction = ReturnType<typeof usePerkInteractionState>

type PlannerInteractionState = Pick<
  PlannerInteraction,
  | 'buildPerkHighlightPerkGroupKeys'
  | 'emphasizedCategoryNames'
  | 'emphasizedPerkGroupKeys'
  | 'hoveredBuildPerk'
  | 'hoveredBuildPerkTooltip'
  | 'hoveredBuildPerkTooltipId'
  | 'hoveredPerkGroupKey'
  | 'hoveredPerkId'
  | 'hoveredPerkPlacementCategoryNames'
  | 'hoveredPerkPlacementPerkGroupKeys'
  | 'selectedEmphasisCategoryNames'
  | 'selectedEmphasisPerkGroupKeys'
>

type PlannerInteractionActions = Pick<
  PlannerInteraction,
  | 'clearAllHover'
  | 'clearBuildPerkTooltip'
  | 'clearPerkGroupHover'
  | 'clearPerkHover'
  | 'closeCategoryHover'
  | 'closeBuildPerkHover'
  | 'closeBuildPerkTooltip'
  | 'closePerkGroupHover'
  | 'closeResultsPerkHover'
  | 'openCategoryHover'
  | 'openBuildPerkHover'
  | 'openBuildPerkTooltip'
  | 'openPerkGroupHover'
  | 'openResultsPerkHover'
>

export const PlannerInteractionStateContext = createContext<PlannerInteractionState | null>(null)
export const PlannerInteractionActionsContext = createContext<PlannerInteractionActions | null>(
  null,
)

export function usePlannerInteractionState() {
  const interactionState = useContext(PlannerInteractionStateContext)

  if (interactionState === null) {
    throw new Error('usePlannerInteractionState must be used inside PlannerInteractionProvider')
  }

  return interactionState
}

export function usePlannerInteractionActions() {
  const interactionActions = useContext(PlannerInteractionActionsContext)

  if (interactionActions === null) {
    throw new Error('usePlannerInteractionActions must be used inside PlannerInteractionProvider')
  }

  return interactionActions
}
