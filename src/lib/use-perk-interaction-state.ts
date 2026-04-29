import { useEffect, useMemo, useReducer } from 'react'
import { getPerkGroupHoverKey, type TooltipAnchorRectangle } from './perk-display'
import type { LegendsPerkRecord } from '../types/legends-perks'

export type HoveredBuildPerkTooltip = {
  anchorRectangle: TooltipAnchorRectangle
  perkId: string
}

type PerkGroupReference = {
  categoryName: string
  perkGroupId: string
}

type SelectedPerkGroupIdsByCategory = Record<string, string[]>

type PerkInteractionState = {
  hoveredBuildPerkTooltip: HoveredBuildPerkTooltip | null
  hoveredPerkGroupReference: PerkGroupReference | null
  hoveredPerkId: string | null
}

type PerkInteractionAction =
  | { type: 'clear-all-hover' }
  | { perkId: string; type: 'clear-build-perk-tooltip' }
  | { type: 'clear-perk-group-hover' }
  | { perkId: string; type: 'clear-perk-hover' }
  | { type: 'close-build-perk-tooltip' }
  | { perkGroupKey: string; type: 'close-perk-group-hover' }
  | { perkId: string; type: 'open-build-perk-hover' }
  | {
      anchorRectangle: TooltipAnchorRectangle
      perkId: string
      type: 'open-build-perk-tooltip'
    }
  | { perkGroupReference: PerkGroupReference; type: 'open-perk-group-hover' }
  | { perkId: string; type: 'open-results-perk-hover' }

const initialPerkInteractionState: PerkInteractionState = {
  hoveredBuildPerkTooltip: null,
  hoveredPerkGroupReference: null,
  hoveredPerkId: null,
}

function getPerkGroupReferenceKey(perkGroupReference: PerkGroupReference | null): string | null {
  return perkGroupReference === null ? null : getPerkGroupHoverKey(perkGroupReference)
}

function perkInteractionReducer(
  state: PerkInteractionState,
  action: PerkInteractionAction,
): PerkInteractionState {
  switch (action.type) {
    case 'clear-all-hover':
      return initialPerkInteractionState

    case 'clear-build-perk-tooltip':
      return state.hoveredBuildPerkTooltip?.perkId === action.perkId
        ? {
            ...state,
            hoveredBuildPerkTooltip: null,
          }
        : state

    case 'clear-perk-group-hover':
      return state.hoveredPerkGroupReference === null
        ? state
        : {
            ...state,
            hoveredPerkGroupReference: null,
          }

    case 'clear-perk-hover':
      return state.hoveredPerkId === action.perkId
        ? {
            ...state,
            hoveredPerkId: null,
          }
        : state

    case 'close-build-perk-tooltip':
      return state.hoveredBuildPerkTooltip === null
        ? state
        : {
            ...state,
            hoveredBuildPerkTooltip: null,
          }

    case 'close-perk-group-hover':
      return getPerkGroupReferenceKey(state.hoveredPerkGroupReference) === action.perkGroupKey
        ? {
            ...state,
            hoveredPerkGroupReference: null,
          }
        : state

    case 'open-build-perk-hover':
      return {
        ...state,
        hoveredPerkGroupReference: null,
        hoveredPerkId: action.perkId,
      }

    case 'open-build-perk-tooltip':
      return {
        hoveredBuildPerkTooltip: {
          anchorRectangle: action.anchorRectangle,
          perkId: action.perkId,
        },
        hoveredPerkGroupReference: null,
        hoveredPerkId: action.perkId,
      }

    case 'open-perk-group-hover':
      return {
        hoveredBuildPerkTooltip: null,
        hoveredPerkGroupReference: action.perkGroupReference,
        hoveredPerkId: null,
      }

    case 'open-results-perk-hover':
      return {
        hoveredBuildPerkTooltip: null,
        hoveredPerkGroupReference: null,
        hoveredPerkId: action.perkId,
      }
  }
}

export function getSelectedPerkGroupKeys(
  selectedPerkGroupIdsByCategory: SelectedPerkGroupIdsByCategory,
): Set<string> {
  const selectedPerkGroupKeys = new Set<string>()

  for (const [categoryName, perkGroupIds] of Object.entries(selectedPerkGroupIdsByCategory)) {
    for (const perkGroupId of perkGroupIds) {
      selectedPerkGroupKeys.add(getPerkGroupHoverKey({ categoryName, perkGroupId }))
    }
  }

  return selectedPerkGroupKeys
}

export function getCategoryOnlyEmphasisNames({
  selectedCategoryNames,
  selectedPerkGroupIdsByCategory,
}: {
  selectedCategoryNames: string[]
  selectedPerkGroupIdsByCategory: SelectedPerkGroupIdsByCategory
}): Set<string> {
  const categoryOnlyEmphasisNames = new Set<string>()

  for (const categoryName of selectedCategoryNames) {
    const selectedPerkGroupIds = selectedPerkGroupIdsByCategory[categoryName] ?? []

    if (selectedPerkGroupIds.length === 0) {
      categoryOnlyEmphasisNames.add(categoryName)
    }
  }

  return categoryOnlyEmphasisNames
}

export function getEmphasizedPerkGroupKeys({
  hoveredPerkGroupReference,
  selectedPerkGroupIdsByCategory,
}: {
  hoveredPerkGroupReference: PerkGroupReference | null
  selectedPerkGroupIdsByCategory: SelectedPerkGroupIdsByCategory
}): Set<string> {
  const emphasizedPerkGroupKeys = getSelectedPerkGroupKeys(selectedPerkGroupIdsByCategory)

  if (hoveredPerkGroupReference !== null) {
    emphasizedPerkGroupKeys.add(getPerkGroupHoverKey(hoveredPerkGroupReference))
  }

  return emphasizedPerkGroupKeys
}

export function usePerkInteractionState({
  allPerksById,
  selectedCategoryNames,
  selectedPerkGroupIdsByCategory,
}: {
  allPerksById: Map<string, LegendsPerkRecord>
  selectedCategoryNames: string[]
  selectedPerkGroupIdsByCategory: SelectedPerkGroupIdsByCategory
}) {
  const [state, dispatch] = useReducer(perkInteractionReducer, initialPerkInteractionState)
  const hoveredPerkGroupKey = getPerkGroupReferenceKey(state.hoveredPerkGroupReference)
  const hoveredBuildPerk = useMemo(
    () =>
      state.hoveredBuildPerkTooltip === null
        ? null
        : (allPerksById.get(state.hoveredBuildPerkTooltip.perkId) ?? null),
    [allPerksById, state.hoveredBuildPerkTooltip],
  )
  const hoveredBuildPerkTooltipId =
    hoveredBuildPerk === null ? undefined : `build-perk-tooltip-${hoveredBuildPerk.id}`
  const emphasizedCategoryNames = useMemo(
    () =>
      getCategoryOnlyEmphasisNames({
        selectedCategoryNames,
        selectedPerkGroupIdsByCategory,
      }),
    [selectedCategoryNames, selectedPerkGroupIdsByCategory],
  )
  const emphasizedPerkGroupKeys = useMemo(
    () =>
      getEmphasizedPerkGroupKeys({
        hoveredPerkGroupReference: state.hoveredPerkGroupReference,
        selectedPerkGroupIdsByCategory,
      }),
    [selectedPerkGroupIdsByCategory, state.hoveredPerkGroupReference],
  )

  function clearAllHover() {
    dispatch({ type: 'clear-all-hover' })
  }

  function clearPerkHover(perkId: string) {
    dispatch({ perkId, type: 'clear-perk-hover' })
  }

  function clearBuildPerkTooltip(perkId: string) {
    dispatch({ perkId, type: 'clear-build-perk-tooltip' })
  }

  function clearPerkGroupHover() {
    dispatch({ type: 'clear-perk-group-hover' })
  }

  function closeBuildPerkTooltip() {
    dispatch({ type: 'close-build-perk-tooltip' })
  }

  function openBuildPerkTooltip(perkId: string, currentTarget: HTMLElement) {
    const { bottom, left, right, top, width } = currentTarget.getBoundingClientRect()

    dispatch({
      anchorRectangle: {
        bottom,
        left,
        right,
        top,
        width,
      },
      perkId,
      type: 'open-build-perk-tooltip',
    })
  }

  function openBuildPerkHover(perkId: string) {
    dispatch({ perkId, type: 'open-build-perk-hover' })
  }

  function openResultsPerkHover(perkId: string) {
    dispatch({ perkId, type: 'open-results-perk-hover' })
  }

  function openPerkGroupHover(categoryName: string, perkGroupId: string) {
    dispatch({
      perkGroupReference: { categoryName, perkGroupId },
      type: 'open-perk-group-hover',
    })
  }

  function closePerkGroupHover(perkGroupKey: string) {
    dispatch({ perkGroupKey, type: 'close-perk-group-hover' })
  }

  useEffect(() => {
    if (state.hoveredBuildPerkTooltip === null || typeof window === 'undefined') {
      return
    }

    // The tooltip is positioned from a captured anchor rectangle, which is stale after resizing.
    const handleWindowResize = () => {
      dispatch({ type: 'close-build-perk-tooltip' })
    }

    window.addEventListener('resize', handleWindowResize)

    return () => {
      window.removeEventListener('resize', handleWindowResize)
    }
  }, [state.hoveredBuildPerkTooltip])

  return {
    clearAllHover,
    clearBuildPerkTooltip,
    clearPerkGroupHover,
    clearPerkHover,
    closeBuildPerkHover: clearPerkHover,
    closeBuildPerkTooltip,
    closePerkGroupHover,
    closeResultsPerkHover: clearPerkHover,
    emphasizedCategoryNames,
    emphasizedPerkGroupKeys,
    hoveredBuildPerk,
    hoveredBuildPerkTooltip: state.hoveredBuildPerkTooltip,
    hoveredBuildPerkTooltipId,
    hoveredPerkGroupKey,
    hoveredPerkId: state.hoveredPerkId,
    openBuildPerkHover,
    openBuildPerkTooltip,
    openPerkGroupHover,
    openResultsPerkHover,
  }
}
