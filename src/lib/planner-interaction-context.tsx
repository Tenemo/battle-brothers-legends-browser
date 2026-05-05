import { useMemo, type ReactNode } from 'react'
import {
  PlannerInteractionActionsContext,
  PlannerInteractionStateContext,
  type PlannerInteraction,
} from './planner-interaction-context-values'

export function PlannerInteractionProvider({
  children,
  interaction,
}: {
  children: ReactNode
  interaction: PlannerInteraction
}) {
  const stateValue = useMemo(
    () => ({
      buildPerkHighlightPerkGroupKeys: interaction.buildPerkHighlightPerkGroupKeys,
      emphasizedCategoryNames: interaction.emphasizedCategoryNames,
      emphasizedPerkGroupKeys: interaction.emphasizedPerkGroupKeys,
      hoveredBuildPerk: interaction.hoveredBuildPerk,
      hoveredBuildPerkTooltip: interaction.hoveredBuildPerkTooltip,
      hoveredBuildPerkTooltipId: interaction.hoveredBuildPerkTooltipId,
      hoveredPerkGroupKey: interaction.hoveredPerkGroupKey,
      hoveredPerkId: interaction.hoveredPerkId,
      hoveredPerkPlacementCategoryNames: interaction.hoveredPerkPlacementCategoryNames,
      hoveredPerkPlacementPerkGroupKeys: interaction.hoveredPerkPlacementPerkGroupKeys,
      selectedEmphasisCategoryNames: interaction.selectedEmphasisCategoryNames,
      selectedEmphasisPerkGroupKeys: interaction.selectedEmphasisPerkGroupKeys,
    }),
    [
      interaction.buildPerkHighlightPerkGroupKeys,
      interaction.emphasizedCategoryNames,
      interaction.emphasizedPerkGroupKeys,
      interaction.hoveredBuildPerk,
      interaction.hoveredBuildPerkTooltip,
      interaction.hoveredBuildPerkTooltipId,
      interaction.hoveredPerkGroupKey,
      interaction.hoveredPerkId,
      interaction.hoveredPerkPlacementCategoryNames,
      interaction.hoveredPerkPlacementPerkGroupKeys,
      interaction.selectedEmphasisCategoryNames,
      interaction.selectedEmphasisPerkGroupKeys,
    ],
  )
  const actionsValue = useMemo(
    () => ({
      clearAllHover: interaction.clearAllHover,
      clearBuildPerkTooltip: interaction.clearBuildPerkTooltip,
      clearPerkGroupHover: interaction.clearPerkGroupHover,
      clearPerkHover: interaction.clearPerkHover,
      closeCategoryHover: interaction.closeCategoryHover,
      closeBuildPerkHover: interaction.closeBuildPerkHover,
      closeBuildPerkTooltip: interaction.closeBuildPerkTooltip,
      closePerkGroupHover: interaction.closePerkGroupHover,
      closeResultsPerkHover: interaction.closeResultsPerkHover,
      openCategoryHover: interaction.openCategoryHover,
      openBuildPerkHover: interaction.openBuildPerkHover,
      openBuildPerkTooltip: interaction.openBuildPerkTooltip,
      openPerkGroupHover: interaction.openPerkGroupHover,
      openResultsPerkHover: interaction.openResultsPerkHover,
    }),
    [
      interaction.clearAllHover,
      interaction.clearBuildPerkTooltip,
      interaction.clearPerkGroupHover,
      interaction.clearPerkHover,
      interaction.closeCategoryHover,
      interaction.closeBuildPerkHover,
      interaction.closeBuildPerkTooltip,
      interaction.closePerkGroupHover,
      interaction.closeResultsPerkHover,
      interaction.openCategoryHover,
      interaction.openBuildPerkHover,
      interaction.openBuildPerkTooltip,
      interaction.openPerkGroupHover,
      interaction.openResultsPerkHover,
    ],
  )

  return (
    <PlannerInteractionStateContext.Provider value={stateValue}>
      <PlannerInteractionActionsContext.Provider value={actionsValue}>
        {children}
      </PlannerInteractionActionsContext.Provider>
    </PlannerInteractionStateContext.Provider>
  )
}
