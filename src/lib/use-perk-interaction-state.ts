import { useEffect, useMemo, useReducer } from 'react'
import { getPerkGroupHoverKey, type TooltipAnchorRectangle } from './perk-display'
import type { LegendsPerkRecord } from '../types/legends-perks'

export type HoveredBuildPerkTooltip = {
  anchorRectangle: TooltipAnchorRectangle
  perkId: string
}

export type PerkGroupReference = {
  categoryName: string
  perkGroupId: string
}

export type BuildPerkHoverOptions = {
  shouldEmphasizePerkGroup?: boolean
}

type SelectedPerkGroupIdsByCategory = Record<string, string[]>
type HoveredPerkGroupReferenceSource = 'build-perk' | 'perk-group'

type PerkInteractionState = {
  hoveredBuildPerkTooltip: HoveredBuildPerkTooltip | null
  hoveredCategoryName: string | null
  hoveredPerkGroupReference: PerkGroupReference | null
  hoveredPerkGroupReferenceSource: HoveredPerkGroupReferenceSource | null
  hoveredPerkId: string | null
}

type PerkInteractionAction =
  | { type: 'clear-all-hover' }
  | { categoryName: string; type: 'clear-category-hover' }
  | { perkId: string; type: 'clear-build-perk-tooltip' }
  | { type: 'clear-perk-group-hover' }
  | { perkId: string; type: 'clear-perk-hover' }
  | { type: 'close-build-perk-tooltip' }
  | { perkGroupKey: string; type: 'close-perk-group-hover' }
  | {
      perkGroupReference?: PerkGroupReference
      perkId: string
      shouldEmphasizePerkGroup?: boolean
      type: 'open-build-perk-hover'
    }
  | {
      anchorRectangle: TooltipAnchorRectangle
      perkGroupReference?: PerkGroupReference
      perkId: string
      shouldEmphasizePerkGroup?: boolean
      type: 'open-build-perk-tooltip'
    }
  | { categoryName: string; type: 'open-category-hover' }
  | { perkGroupReference: PerkGroupReference; type: 'open-perk-group-hover' }
  | { perkId: string; type: 'open-results-perk-hover' }

const initialPerkInteractionState: PerkInteractionState = {
  hoveredBuildPerkTooltip: null,
  hoveredCategoryName: null,
  hoveredPerkGroupReference: null,
  hoveredPerkGroupReferenceSource: null,
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

    case 'clear-category-hover':
      return state.hoveredCategoryName === action.categoryName
        ? {
            ...state,
            hoveredCategoryName: null,
          }
        : state

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
            hoveredPerkGroupReferenceSource: null,
          }

    case 'clear-perk-hover':
      return state.hoveredPerkId === action.perkId
        ? {
            ...state,
            hoveredPerkGroupReference: null,
            hoveredPerkGroupReferenceSource: null,
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
            hoveredPerkGroupReferenceSource: null,
          }
        : state

    case 'open-build-perk-hover':
      return {
        ...state,
        hoveredCategoryName: null,
        hoveredPerkGroupReference:
          action.shouldEmphasizePerkGroup === false ? null : (action.perkGroupReference ?? null),
        hoveredPerkGroupReferenceSource:
          action.shouldEmphasizePerkGroup === false || action.perkGroupReference === undefined
            ? null
            : 'build-perk',
        hoveredPerkId: action.perkId,
      }

    case 'open-build-perk-tooltip':
      return {
        hoveredBuildPerkTooltip: {
          anchorRectangle: action.anchorRectangle,
          perkId: action.perkId,
        },
        hoveredCategoryName: null,
        hoveredPerkGroupReference:
          action.shouldEmphasizePerkGroup === false ? null : (action.perkGroupReference ?? null),
        hoveredPerkGroupReferenceSource:
          action.shouldEmphasizePerkGroup === false || action.perkGroupReference === undefined
            ? null
            : 'build-perk',
        hoveredPerkId: action.perkId,
      }

    case 'open-category-hover':
      return {
        hoveredBuildPerkTooltip: null,
        hoveredCategoryName: action.categoryName,
        hoveredPerkGroupReference: null,
        hoveredPerkGroupReferenceSource: null,
        hoveredPerkId: null,
      }

    case 'open-perk-group-hover':
      return {
        hoveredBuildPerkTooltip: null,
        hoveredCategoryName: null,
        hoveredPerkGroupReference: action.perkGroupReference,
        hoveredPerkGroupReferenceSource: 'perk-group',
        hoveredPerkId: null,
      }

    case 'open-results-perk-hover':
      return {
        hoveredBuildPerkTooltip: null,
        hoveredCategoryName: null,
        hoveredPerkGroupReference: null,
        hoveredPerkGroupReferenceSource: null,
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

export function getEmphasizedCategoryNames({
  hoveredCategoryName,
  selectedCategoryNames,
  selectedPerkGroupIdsByCategory,
}: {
  hoveredCategoryName: string | null
  selectedCategoryNames: string[]
  selectedPerkGroupIdsByCategory: SelectedPerkGroupIdsByCategory
}): Set<string> {
  const emphasizedCategoryNames = getCategoryOnlyEmphasisNames({
    selectedCategoryNames,
    selectedPerkGroupIdsByCategory,
  })

  if (hoveredCategoryName !== null) {
    emphasizedCategoryNames.add(hoveredCategoryName)
  }

  return emphasizedCategoryNames
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

export function getBuildPerkHighlightPerkGroupKeys({
  hoveredPerkGroupReference,
  hoveredPerkGroupReferenceSource,
  selectedPerkGroupIdsByCategory,
}: {
  hoveredPerkGroupReference: PerkGroupReference | null
  hoveredPerkGroupReferenceSource: HoveredPerkGroupReferenceSource | null
  selectedPerkGroupIdsByCategory: SelectedPerkGroupIdsByCategory
}): Set<string> {
  const buildPerkHighlightPerkGroupKeys = getSelectedPerkGroupKeys(selectedPerkGroupIdsByCategory)

  if (hoveredPerkGroupReferenceSource === 'perk-group' && hoveredPerkGroupReference !== null) {
    buildPerkHighlightPerkGroupKeys.add(getPerkGroupHoverKey(hoveredPerkGroupReference))
  }

  return buildPerkHighlightPerkGroupKeys
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
      getEmphasizedCategoryNames({
        hoveredCategoryName: state.hoveredCategoryName,
        selectedCategoryNames,
        selectedPerkGroupIdsByCategory,
      }),
    [selectedCategoryNames, selectedPerkGroupIdsByCategory, state.hoveredCategoryName],
  )
  const emphasizedPerkGroupKeys = useMemo(
    () =>
      getEmphasizedPerkGroupKeys({
        hoveredPerkGroupReference: state.hoveredPerkGroupReference,
        selectedPerkGroupIdsByCategory,
      }),
    [selectedPerkGroupIdsByCategory, state.hoveredPerkGroupReference],
  )
  const buildPerkHighlightPerkGroupKeys = useMemo(
    () =>
      getBuildPerkHighlightPerkGroupKeys({
        hoveredPerkGroupReference: state.hoveredPerkGroupReference,
        hoveredPerkGroupReferenceSource: state.hoveredPerkGroupReferenceSource,
        selectedPerkGroupIdsByCategory,
      }),
    [
      selectedPerkGroupIdsByCategory,
      state.hoveredPerkGroupReference,
      state.hoveredPerkGroupReferenceSource,
    ],
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

  function openBuildPerkTooltip(
    perkId: string,
    currentTarget: HTMLElement,
    perkGroupReference?: PerkGroupReference,
    options: BuildPerkHoverOptions = {},
  ) {
    const { bottom, left, right, top, width } = currentTarget.getBoundingClientRect()

    dispatch({
      anchorRectangle: {
        bottom,
        left,
        right,
        top,
        width,
      },
      perkGroupReference,
      perkId,
      shouldEmphasizePerkGroup: options.shouldEmphasizePerkGroup,
      type: 'open-build-perk-tooltip',
    })
  }

  function openBuildPerkHover(
    perkId: string,
    perkGroupReference?: PerkGroupReference,
    options: BuildPerkHoverOptions = {},
  ) {
    dispatch({
      perkGroupReference,
      perkId,
      shouldEmphasizePerkGroup: options.shouldEmphasizePerkGroup,
      type: 'open-build-perk-hover',
    })
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

  function openCategoryHover(categoryName: string) {
    dispatch({ categoryName, type: 'open-category-hover' })
  }

  function closeCategoryHover(categoryName: string) {
    dispatch({ categoryName, type: 'clear-category-hover' })
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
    buildPerkHighlightPerkGroupKeys,
    closeCategoryHover,
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
    openCategoryHover,
    openBuildPerkHover,
    openBuildPerkTooltip,
    openPerkGroupHover,
    openResultsPerkHover,
  }
}
