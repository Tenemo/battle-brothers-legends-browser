import type { PlannerInteraction } from '../src/lib/planner-interaction-context-values'

const noop = () => {}

export function createTestPlannerInteraction(
  overrides: Partial<PlannerInteraction> = {},
): PlannerInteraction {
  return {
    buildPerkHighlightPerkGroupKeys: new Set(),
    clearAllHover: noop,
    clearBuildPerkTooltip: noop,
    clearPerkGroupHover: noop,
    clearPerkHover: noop,
    closeBuildPerkHover: noop,
    closeBuildPerkTooltip: noop,
    closeCategoryHover: noop,
    closePerkGroupHover: noop,
    closeResultsPerkHover: noop,
    emphasizedCategoryNames: new Set(),
    emphasizedPerkGroupKeys: new Set(),
    hoveredBuildPerk: null,
    hoveredBuildPerkTooltip: null,
    hoveredBuildPerkTooltipId: undefined,
    hoveredPerkGroupKey: null,
    hoveredPerkId: null,
    openBuildPerkHover: noop,
    openBuildPerkTooltip: noop,
    openCategoryHover: noop,
    openPerkGroupHover: noop,
    openResultsPerkHover: noop,
    selectedEmphasisCategoryNames: new Set(),
    selectedEmphasisPerkGroupKeys: new Set(),
    ...overrides,
  }
}
