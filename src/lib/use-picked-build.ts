import { useMemo, useState } from 'react'
import type { BuildRequirement } from '../components/SharedControls'
import type { LegendsPerkRecord } from '../types/legends-perks'
import { getBuildPlannerGroups } from './build-planner'
import { createSharedBuildUrlSearch } from './build-planner-url-state'
import {
  getPickedPerkCountsByCategory,
  getPickedPerkCountsByPerkGroup,
} from './category-filter-model'
import { getPerksWithOriginAndAncientScrollPerkGroupsFiltered } from './origin-and-ancient-scroll-perk-groups'

type PickedBuildPerkState = {
  isOptional: boolean
  perkId: string
}

type PickedPerkRequirementCounts = {
  mustHave: number
  optional: number
}

type UsePickedBuildOptions = {
  allPerksById: Map<string, LegendsPerkRecord>
  initialOptionalPerkIds: string[]
  initialPickedPerkIds: string[]
  shouldIncludeAncientScrollPerkGroups: boolean
  shouldIncludeOriginPerkGroups: boolean
}

function createPickedBuildPerkState(
  pickedPerkIds: string[],
  optionalPerkIds: string[],
): PickedBuildPerkState[] {
  const optionalPerkIdSet = new Set(optionalPerkIds)

  return pickedPerkIds.map((perkId) => ({
    isOptional: optionalPerkIdSet.has(perkId),
    perkId,
  }))
}

function getPickedBuildPerkIds(pickedBuildPerks: PickedBuildPerkState[]): string[] {
  return pickedBuildPerks.map((pickedBuildPerk) => pickedBuildPerk.perkId)
}

function getOptionalPickedBuildPerkIds(pickedBuildPerks: PickedBuildPerkState[]): string[] {
  return pickedBuildPerks.flatMap((pickedBuildPerk) =>
    pickedBuildPerk.isOptional ? [pickedBuildPerk.perkId] : [],
  )
}

function addPickedBuildPerk(
  pickedBuildPerks: PickedBuildPerkState[],
  perkId: string,
  requirement: BuildRequirement,
): PickedBuildPerkState[] {
  if (pickedBuildPerks.some((pickedBuildPerk) => pickedBuildPerk.perkId === perkId)) {
    return pickedBuildPerks
  }

  const nextPickedBuildPerk = {
    isOptional: requirement === 'optional',
    perkId,
  }

  if (nextPickedBuildPerk.isOptional) {
    return [...pickedBuildPerks, nextPickedBuildPerk]
  }

  const firstOptionalPerkIndex = pickedBuildPerks.findIndex(
    (pickedBuildPerk) => pickedBuildPerk.isOptional,
  )

  if (firstOptionalPerkIndex === -1) {
    return [...pickedBuildPerks, nextPickedBuildPerk]
  }

  return [
    ...pickedBuildPerks.slice(0, firstOptionalPerkIndex),
    nextPickedBuildPerk,
    ...pickedBuildPerks.slice(firstOptionalPerkIndex),
  ]
}

function togglePickedBuildPerkOptional(
  pickedBuildPerks: PickedBuildPerkState[],
  perkId: string,
): PickedBuildPerkState[] {
  const pickedBuildPerk = pickedBuildPerks.find(
    (currentPickedBuildPerk) => currentPickedBuildPerk.perkId === perkId,
  )

  if (!pickedBuildPerk) {
    return pickedBuildPerks
  }

  const remainingPickedBuildPerks = pickedBuildPerks.filter(
    (currentPickedBuildPerk) => currentPickedBuildPerk.perkId !== perkId,
  )
  const nextPickedBuildPerk = {
    isOptional: !pickedBuildPerk.isOptional,
    perkId,
  }

  if (nextPickedBuildPerk.isOptional) {
    return [...remainingPickedBuildPerks, nextPickedBuildPerk]
  }

  const firstOptionalPerkIndex = remainingPickedBuildPerks.findIndex(
    (currentPickedBuildPerk) => currentPickedBuildPerk.isOptional,
  )

  if (firstOptionalPerkIndex === -1) {
    return [...remainingPickedBuildPerks, nextPickedBuildPerk]
  }

  return [
    ...remainingPickedBuildPerks.slice(0, firstOptionalPerkIndex),
    nextPickedBuildPerk,
    ...remainingPickedBuildPerks.slice(firstOptionalPerkIndex),
  ]
}

function getPickedPerkRequirementCounts(
  mustHavePickedPerkCounts: ReadonlyMap<string, number>,
  optionalPickedPerkCounts: ReadonlyMap<string, number>,
): Map<string, PickedPerkRequirementCounts> {
  const countKeys = new Set([
    ...mustHavePickedPerkCounts.keys(),
    ...optionalPickedPerkCounts.keys(),
  ])

  return new Map(
    [...countKeys].map((countKey) => [
      countKey,
      {
        mustHave: mustHavePickedPerkCounts.get(countKey) ?? 0,
        optional: optionalPickedPerkCounts.get(countKey) ?? 0,
      },
    ]),
  )
}

export function usePickedBuild({
  allPerksById,
  initialOptionalPerkIds,
  initialPickedPerkIds,
  shouldIncludeAncientScrollPerkGroups,
  shouldIncludeOriginPerkGroups,
}: UsePickedBuildOptions) {
  const [pickedBuildPerks, setPickedBuildPerks] = useState<PickedBuildPerkState[]>(() =>
    createPickedBuildPerkState(initialPickedPerkIds, initialOptionalPerkIds),
  )
  const pickedPerkIds = useMemo(() => getPickedBuildPerkIds(pickedBuildPerks), [pickedBuildPerks])
  const optionalPickedPerkIds = useMemo(
    () => getOptionalPickedBuildPerkIds(pickedBuildPerks),
    [pickedBuildPerks],
  )
  const pickedPerks = useMemo(
    () =>
      pickedBuildPerks.flatMap((pickedBuildPerk) => {
        const pickedPerk = allPerksById.get(pickedBuildPerk.perkId)

        return pickedPerk ? [{ ...pickedPerk, isOptional: pickedBuildPerk.isOptional }] : []
      }),
    [allPerksById, pickedBuildPerks],
  )
  const mustHavePickedPerks = useMemo(
    () => pickedPerks.filter((pickedPerk) => !pickedPerk.isOptional),
    [pickedPerks],
  )
  const optionalPickedPerks = useMemo(
    () => pickedPerks.filter((pickedPerk) => pickedPerk.isOptional),
    [pickedPerks],
  )
  const mustHavePickedPerkIds = useMemo(
    () => mustHavePickedPerks.map((pickedPerk) => pickedPerk.id),
    [mustHavePickedPerks],
  )
  const plannerGroupPerks = useMemo(
    () =>
      getPerksWithOriginAndAncientScrollPerkGroupsFiltered(pickedPerks, {
        shouldIncludeAncientScrollPerkGroups,
        shouldIncludeOriginPerkGroups,
      }),
    [pickedPerks, shouldIncludeAncientScrollPerkGroups, shouldIncludeOriginPerkGroups],
  )
  const buildShareSearch = useMemo(
    () => createSharedBuildUrlSearch(pickedPerkIds, allPerksById, optionalPickedPerkIds),
    [allPerksById, optionalPickedPerkIds, pickedPerkIds],
  )
  const buildPlannerGroups = useMemo(
    () => getBuildPlannerGroups(plannerGroupPerks),
    [plannerGroupPerks],
  )
  const pickedPerkRequirementById = useMemo<Map<string, BuildRequirement>>(
    () =>
      new Map(
        pickedBuildPerks.map((pickedBuildPerk) => [
          pickedBuildPerk.perkId,
          pickedBuildPerk.isOptional ? 'optional' : 'must-have',
        ]),
      ),
    [pickedBuildPerks],
  )
  const mustHavePickedPerkCountsByCategory = useMemo(
    () => getPickedPerkCountsByCategory(mustHavePickedPerks),
    [mustHavePickedPerks],
  )
  const optionalPickedPerkCountsByCategory = useMemo(
    () => getPickedPerkCountsByCategory(optionalPickedPerks),
    [optionalPickedPerks],
  )
  const pickedPerkRequirementCountsByCategory = useMemo(
    () =>
      getPickedPerkRequirementCounts(
        mustHavePickedPerkCountsByCategory,
        optionalPickedPerkCountsByCategory,
      ),
    [mustHavePickedPerkCountsByCategory, optionalPickedPerkCountsByCategory],
  )
  const mustHavePickedPerkCountsByPerkGroup = useMemo(
    () => getPickedPerkCountsByPerkGroup(mustHavePickedPerks),
    [mustHavePickedPerks],
  )
  const optionalPickedPerkCountsByPerkGroup = useMemo(
    () => getPickedPerkCountsByPerkGroup(optionalPickedPerks),
    [optionalPickedPerks],
  )
  const pickedPerkRequirementCountsByPerkGroup = useMemo(
    () =>
      getPickedPerkRequirementCounts(
        mustHavePickedPerkCountsByPerkGroup,
        optionalPickedPerkCountsByPerkGroup,
      ),
    [mustHavePickedPerkCountsByPerkGroup, optionalPickedPerkCountsByPerkGroup],
  )

  return {
    addPickedPerk(perkId: string, requirement: BuildRequirement) {
      setPickedBuildPerks((currentPickedBuildPerks) =>
        addPickedBuildPerk(currentPickedBuildPerks, perkId, requirement),
      )
    },
    buildPlannerGroups,
    buildShareSearch,
    clearPickedPerks() {
      setPickedBuildPerks([])
    },
    hasPickedPerks: pickedPerks.length > 0,
    mustHavePickedPerkIds,
    mustHavePickedPerks,
    optionalPickedPerkIds,
    pickedPerkIds,
    pickedPerkRequirementById,
    pickedPerkRequirementCountsByCategory,
    pickedPerkRequirementCountsByPerkGroup,
    pickedPerks,
    removePickedPerk(perkId: string) {
      setPickedBuildPerks((currentPickedBuildPerks) =>
        currentPickedBuildPerks.filter((pickedBuildPerk) => pickedBuildPerk.perkId !== perkId),
      )
    },
    replacePickedPerks(pickedPerkIds: string[], optionalPerkIds: string[]) {
      setPickedBuildPerks(createPickedBuildPerkState(pickedPerkIds, optionalPerkIds))
    },
    togglePickedPerkOptional(perkId: string) {
      setPickedBuildPerks((currentPickedBuildPerks) =>
        togglePickedBuildPerkOptional(currentPickedBuildPerks, perkId),
      )
    },
  }
}
