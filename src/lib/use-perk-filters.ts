import { startTransition, useEffect, useMemo, useState } from 'react'
import type { LegendsPerkRecord } from '../types/legends-perks'
import type { BuildPlannerUrlState } from './build-planner-url-state'
import {
  compareDisplayedCategories,
  compareDisplayedPerkGroupOptions,
  getCategoryCounts,
  getCategoryPerkGroupOptions,
  getVisiblePerkCountsByCategory,
  getVisiblePerkCountsByCategoryPerkGroup,
} from './category-filter-model'
import {
  getCategoryFilterModeFromSelection,
  type CategoryFilterMode,
} from './category-filter-state'
import { compareCategoryNames } from './dynamic-background-categories'
import {
  getPerksWithOriginAndAncientScrollPerkGroupsFiltered,
  shouldKeepPerkGroupWithOriginAndAncientScrollFilters,
} from './origin-and-ancient-scroll-perk-groups'
import { normalizeSearchPhrase } from './perk-display'
import { filterAndSortPerks } from './perk-search'
import type { SavedBuildPlannerFilters } from './saved-builds-storage'

type PerkGroupSelection = {
  categoryName: string
  perkGroupId: string
}

type UsePerkFiltersOptions = {
  allPerks: LegendsPerkRecord[]
  initialUrlState: BuildPlannerUrlState
}

function removeHiddenSelectedPerkGroupIds(
  selectedPerkGroupIdsByCategory: Record<string, string[]>,
  filters: {
    shouldIncludeAncientScrollPerkGroups: boolean
    shouldIncludeOriginPerkGroups: boolean
  },
): Record<string, string[]> {
  let hasRemovedSelectedPerkGroupId = false
  const visibleSelectedPerkGroupIdsByCategory: Record<string, string[]> = {}

  for (const [categoryName, selectedPerkGroupIds] of Object.entries(
    selectedPerkGroupIdsByCategory,
  )) {
    const visibleSelectedPerkGroupIds = selectedPerkGroupIds.filter((perkGroupId) =>
      shouldKeepPerkGroupWithOriginAndAncientScrollFilters(perkGroupId, filters),
    )

    if (visibleSelectedPerkGroupIds.length !== selectedPerkGroupIds.length) {
      hasRemovedSelectedPerkGroupId = true
    }

    if (visibleSelectedPerkGroupIds.length > 0) {
      visibleSelectedPerkGroupIdsByCategory[categoryName] = visibleSelectedPerkGroupIds
    }
  }

  if (
    Object.keys(visibleSelectedPerkGroupIdsByCategory).length !==
    Object.keys(selectedPerkGroupIdsByCategory).length
  ) {
    hasRemovedSelectedPerkGroupId = true
  }

  return hasRemovedSelectedPerkGroupId
    ? visibleSelectedPerkGroupIdsByCategory
    : selectedPerkGroupIdsByCategory
}

function getSelectedPerkGroupIdsByCategorySignature(
  selectedPerkGroupIdsByCategory: Record<string, string[]>,
): string {
  return Object.entries(selectedPerkGroupIdsByCategory)
    .filter(([, selectedPerkGroupIds]) => selectedPerkGroupIds.length > 0)
    .toSorted(([leftCategoryName], [rightCategoryName]) =>
      compareCategoryNames(leftCategoryName, rightCategoryName),
    )
    .map(
      ([categoryName, selectedPerkGroupIds]) => `${categoryName}:${selectedPerkGroupIds.join(',')}`,
    )
    .join('\u0000')
}

function hasActiveCategoryFilterSelection(
  categoryFilterMode: CategoryFilterMode,
  selectedCategoryNames: string[],
  selectedPerkGroupIdsByCategory: Record<string, string[]>,
): boolean {
  return (
    categoryFilterMode !== 'none' ||
    selectedCategoryNames.length > 0 ||
    Object.values(selectedPerkGroupIdsByCategory).some(
      (selectedPerkGroupIds) => selectedPerkGroupIds.length > 0,
    )
  )
}

export function usePerkFilters({ allPerks, initialUrlState }: UsePerkFiltersOptions) {
  const [query, setQuery] = useState(initialUrlState.query)
  const [selectedCategoryNames, setSelectedCategoryNames] = useState<string[]>(
    initialUrlState.selectedCategoryNames,
  )
  const [categoryFilterMode, setCategoryFilterMode] = useState<CategoryFilterMode>(
    initialUrlState.categoryFilterMode ??
      getCategoryFilterModeFromSelection({
        selectedCategoryNames: initialUrlState.selectedCategoryNames,
        selectedPerkGroupIdsByCategory: initialUrlState.selectedPerkGroupIdsByCategory,
      }),
  )
  const [expandedCategoryNames, setExpandedCategoryNames] = useState<string[]>(
    initialUrlState.selectedCategoryNames,
  )
  const [selectedPerkGroupIdsByCategory, setSelectedPerkGroupIdsByCategory] = useState<
    Record<string, string[]>
  >(initialUrlState.selectedPerkGroupIdsByCategory)
  const [perkResultListScrollResetKey, setPerkResultListScrollResetKey] = useState(0)
  const [shouldIncludeOriginPerkGroups, setShouldIncludeOriginPerkGroups] = useState(
    initialUrlState.shouldIncludeOriginPerkGroups,
  )
  const [shouldIncludeAncientScrollPerkGroups, setShouldIncludeAncientScrollPerkGroups] = useState(
    initialUrlState.shouldIncludeAncientScrollPerkGroups,
  )
  const catalogPerks = useMemo(
    () =>
      getPerksWithOriginAndAncientScrollPerkGroupsFiltered(allPerks, {
        shouldIncludeAncientScrollPerkGroups,
        shouldIncludeOriginPerkGroups,
      }),
    [allPerks, shouldIncludeAncientScrollPerkGroups, shouldIncludeOriginPerkGroups],
  )
  const categoryCounts = useMemo(() => getCategoryCounts(catalogPerks), [catalogPerks])
  const perkGroupOptionsByCategory = useMemo(
    () => getCategoryPerkGroupOptions(catalogPerks),
    [catalogPerks],
  )
  const availableCategories = useMemo(
    () => [...categoryCounts.keys()].toSorted(compareCategoryNames),
    [categoryCounts],
  )
  const normalizedPerkSearchPhrase = useMemo(() => normalizeSearchPhrase(query), [query])
  const visiblePerks = useMemo(
    () =>
      filterAndSortPerks(catalogPerks, {
        categoryFilterMode,
        query,
        selectedCategoryNames,
        selectedPerkGroupIdsByCategory,
      }),
    [
      catalogPerks,
      categoryFilterMode,
      query,
      selectedCategoryNames,
      selectedPerkGroupIdsByCategory,
    ],
  )
  const visiblePerkResultSetKey = useMemo(
    () =>
      [
        categoryFilterMode,
        query,
        selectedCategoryNames.join('\u0000'),
        getSelectedPerkGroupIdsByCategorySignature(selectedPerkGroupIdsByCategory),
        shouldIncludeAncientScrollPerkGroups ? 'ancient-scroll-perks' : '',
        shouldIncludeOriginPerkGroups ? 'origin-perks' : '',
        String(visiblePerks.length),
      ].join('\u0001'),
    [
      categoryFilterMode,
      query,
      selectedCategoryNames,
      selectedPerkGroupIdsByCategory,
      shouldIncludeAncientScrollPerkGroups,
      shouldIncludeOriginPerkGroups,
      visiblePerks.length,
    ],
  )
  const visiblePerkCountsByCategory = useMemo(
    () => getVisiblePerkCountsByCategory(visiblePerks),
    [visiblePerks],
  )
  const visiblePerkCountsByCategoryPerkGroup = useMemo(
    () => getVisiblePerkCountsByCategoryPerkGroup(visiblePerks),
    [visiblePerks],
  )
  const displayedCategoryNames = useMemo(
    () =>
      [...availableCategories].toSorted((leftCategoryName, rightCategoryName) =>
        compareDisplayedCategories({
          leftCategoryName,
          normalizedSearchPhrase: normalizedPerkSearchPhrase,
          rightCategoryName,
          perkGroupOptionsByCategory: perkGroupOptionsByCategory,
          visiblePerkCountsByCategory,
        }),
      ),
    [
      availableCategories,
      normalizedPerkSearchPhrase,
      perkGroupOptionsByCategory,
      visiblePerkCountsByCategory,
    ],
  )
  const displayedPerkGroupOptionsByCategory = useMemo(
    () =>
      new Map(
        displayedCategoryNames.map((categoryName) => {
          const perkGroupOptions = perkGroupOptionsByCategory.get(categoryName) ?? []

          return [
            categoryName,
            [...perkGroupOptions].toSorted((leftPerkGroupOption, rightPerkGroupOption) =>
              compareDisplayedPerkGroupOptions({
                categoryName: categoryName,
                leftPerkGroupOption,
                normalizedSearchPhrase: normalizedPerkSearchPhrase,
                rightPerkGroupOption,
                visiblePerkCountsByCategoryPerkGroup,
              }),
            ),
          ] as const
        }),
      ),
    [
      displayedCategoryNames,
      normalizedPerkSearchPhrase,
      perkGroupOptionsByCategory,
      visiblePerkCountsByCategoryPerkGroup,
    ],
  )

  function requestPerkResultListScrollReset() {
    setPerkResultListScrollResetKey((currentScrollResetKey) => currentScrollResetKey + 1)
  }

  function clearCategoryFilterSelection(nextCategoryFilterMode: CategoryFilterMode = 'none') {
    requestPerkResultListScrollReset()
    setCategoryFilterMode(nextCategoryFilterMode)
    setExpandedCategoryNames([])
    setSelectedCategoryNames([])
    setSelectedPerkGroupIdsByCategory({})
  }

  function selectPerkGroup(perkGroupSelection: PerkGroupSelection | null) {
    requestPerkResultListScrollReset()

    if (perkGroupSelection === null) {
      setCategoryFilterMode('none')
      setSelectedCategoryNames([])
      setExpandedCategoryNames([])
      setSelectedPerkGroupIdsByCategory({})
      return
    }

    setCategoryFilterMode('selection')
    setSelectedCategoryNames([perkGroupSelection.categoryName])
    setExpandedCategoryNames([perkGroupSelection.categoryName])
    setSelectedPerkGroupIdsByCategory({
      [perkGroupSelection.categoryName]: [perkGroupSelection.perkGroupId],
    })
  }

  function isSelectedPerkGroup(categoryName: string, perkGroupId: string): boolean {
    return selectedPerkGroupIdsByCategory[categoryName]?.includes(perkGroupId) ?? false
  }

  useEffect(() => {
    startTransition(() => {
      setSelectedPerkGroupIdsByCategory((currentSelectedPerkGroupIdsByCategory) =>
        removeHiddenSelectedPerkGroupIds(currentSelectedPerkGroupIdsByCategory, {
          shouldIncludeAncientScrollPerkGroups,
          shouldIncludeOriginPerkGroups,
        }),
      )
    })
  }, [shouldIncludeAncientScrollPerkGroups, shouldIncludeOriginPerkGroups])

  return {
    applySavedBuildPlannerFilters(plannerFilters: SavedBuildPlannerFilters) {
      requestPerkResultListScrollReset()
      setQuery(plannerFilters.query)
      setCategoryFilterMode(plannerFilters.categoryFilterMode)
      setSelectedCategoryNames(plannerFilters.selectedCategoryNames)
      setExpandedCategoryNames(plannerFilters.selectedCategoryNames)
      setSelectedPerkGroupIdsByCategory(plannerFilters.selectedPerkGroupIdsByCategory)
      setShouldIncludeOriginPerkGroups(plannerFilters.shouldIncludeOriginPerkGroups)
      setShouldIncludeAncientScrollPerkGroups(plannerFilters.shouldIncludeAncientScrollPerkGroups)
    },
    applyUrlState(urlState: BuildPlannerUrlState) {
      setQuery(urlState.query)
      setCategoryFilterMode(
        urlState.categoryFilterMode ??
          getCategoryFilterModeFromSelection({
            selectedCategoryNames: urlState.selectedCategoryNames,
            selectedPerkGroupIdsByCategory: urlState.selectedPerkGroupIdsByCategory,
          }),
      )
      setSelectedCategoryNames(urlState.selectedCategoryNames)
      setExpandedCategoryNames(urlState.selectedCategoryNames)
      setSelectedPerkGroupIdsByCategory(urlState.selectedPerkGroupIdsByCategory)
      setShouldIncludeOriginPerkGroups(urlState.shouldIncludeOriginPerkGroups)
      setShouldIncludeAncientScrollPerkGroups(urlState.shouldIncludeAncientScrollPerkGroups)
    },
    catalogPerks,
    categoryCounts,
    categoryFilterMode,
    changePerkSearch(nextQuery: string) {
      setQuery(nextQuery)

      if (
        nextQuery.trim().length > 0 &&
        hasActiveCategoryFilterSelection(
          categoryFilterMode,
          selectedCategoryNames,
          selectedPerkGroupIdsByCategory,
        )
      ) {
        startTransition(() => {
          clearCategoryFilterSelection('all')
        })
      }
    },
    clearCategoryFilterSelection,
    displayedCategoryNames,
    displayedPerkGroupOptionsByCategory,
    expandedCategoryNames,
    inspectPerkGroup(categoryName: string, perkGroupId: string) {
      setQuery('')
      selectPerkGroup(
        isSelectedPerkGroup(categoryName, perkGroupId) ? null : { categoryName, perkGroupId },
      )
    },
    perkResultListScrollResetKey,
    query,
    resetCategoryPerkGroups(categoryName: string) {
      requestPerkResultListScrollReset()
      setQuery('')
      setCategoryFilterMode('selection')
      setExpandedCategoryNames([categoryName])
      setSelectedCategoryNames([categoryName])
      setSelectedPerkGroupIdsByCategory({})
    },
    selectAllCategories() {
      requestPerkResultListScrollReset()
      setQuery('')
      setCategoryFilterMode('all')
      setExpandedCategoryNames([])
      setSelectedCategoryNames([])
      setSelectedPerkGroupIdsByCategory({})
    },
    selectedCategoryNames,
    selectedPerkGroupIdsByCategory,
    selectPerkGroup,
    selectSidebarPerkGroup(categoryName: string, perkGroupId: string) {
      setQuery('')

      if (isSelectedPerkGroup(categoryName, perkGroupId)) {
        requestPerkResultListScrollReset()
        setCategoryFilterMode('none')
        setExpandedCategoryNames([categoryName])
        setSelectedCategoryNames([])
        setSelectedPerkGroupIdsByCategory({})
        return
      }

      selectPerkGroup({ categoryName, perkGroupId })
    },
    setPerkSearchQuery: setQuery,
    setShouldIncludeAncientScrollPerkGroups,
    setShouldIncludeOriginPerkGroups,
    shouldIncludeAncientScrollPerkGroups,
    shouldIncludeOriginPerkGroups,
    toggleCategory(categoryName: string) {
      const isSelected = selectedCategoryNames.includes(categoryName)

      requestPerkResultListScrollReset()
      setQuery('')

      if (isSelected) {
        setCategoryFilterMode('none')
        setExpandedCategoryNames([])
        setSelectedCategoryNames([])
        setSelectedPerkGroupIdsByCategory({})
        return
      }

      // Category chips are a drilldown control, so opening one category replaces the previous category and nested perk group filters.
      setCategoryFilterMode('selection')
      setExpandedCategoryNames([categoryName])
      setSelectedCategoryNames([categoryName])
      setSelectedPerkGroupIdsByCategory({})
    },
    toggleCategoryExpansion(categoryName: string) {
      setExpandedCategoryNames((currentExpandedCategoryNames) =>
        currentExpandedCategoryNames.includes(categoryName)
          ? currentExpandedCategoryNames.filter(
              (expandedCategoryName) => expandedCategoryName !== categoryName,
            )
          : [...currentExpandedCategoryNames, categoryName],
      )
    },
    visiblePerkResultSetKey,
    visiblePerks,
  }
}
