import type { LegendsPerkPlacement, LegendsPerkRecord } from '../types/legends-perks'

export type BuildPlannerPerkGroupRequirement = {
  categoryName: string
  treeIconPath: string | null
  treeId: string
  treeName: string
}

export type BuildPlannerPerkGroupRequirementOption = BuildPlannerPerkGroupRequirement & {
  treeLabel: string
}

export type BuildPlannerRecommendedGroup = BuildPlannerPerkGroupRequirementOption & {
  perkIds: string[]
  perkNames: string[]
}

export type BuildPlannerAlternativeGroup = {
  perkGroupOptions: BuildPlannerPerkGroupRequirementOption[]
  perkIds: string[]
  perkNames: string[]
}

export type BuildPlannerRecommendation = {
  alternativeGroups: BuildPlannerAlternativeGroup[]
  recommendedGroups: BuildPlannerRecommendedGroup[]
}

type BuildPlannerSearchGroup = BuildPlannerPerkGroupRequirementOption & {
  coveredPerkIds: Set<string>
  encounterOrder: number
}

type BuildPlannerSelectedGroup = {
  groupId: string
  newlyCoveredPerkIds: string[]
}

function getUniquePerkGroupRequirements(
  placements: LegendsPerkPlacement[],
): BuildPlannerPerkGroupRequirement[] {
  const seenTreeIds = new Set<string>()
  const perkGroupRequirements: BuildPlannerPerkGroupRequirement[] = []

  for (const placement of placements) {
    if (seenTreeIds.has(placement.treeId)) {
      continue
    }

    seenTreeIds.add(placement.treeId)
    perkGroupRequirements.push({
      categoryName: placement.categoryName,
      treeIconPath: placement.treeIconPath,
      treeId: placement.treeId,
      treeName: placement.treeName,
    })
  }

  return perkGroupRequirements
}

export function getPerkGroupRequirements(
  perk: LegendsPerkRecord,
): BuildPlannerPerkGroupRequirement[] {
  return getUniquePerkGroupRequirements(perk.placements)
}

function getRequirementOptionsWithLabels(
  perkGroupRequirements: BuildPlannerPerkGroupRequirement[],
): BuildPlannerPerkGroupRequirementOption[] {
  const treeNameCounts = new Map<string, number>()

  for (const perkGroupRequirement of perkGroupRequirements) {
    treeNameCounts.set(
      perkGroupRequirement.treeName,
      (treeNameCounts.get(perkGroupRequirement.treeName) ?? 0) + 1,
    )
  }

  return perkGroupRequirements.map((perkGroupRequirement) => ({
    ...perkGroupRequirement,
    treeLabel:
      treeNameCounts.get(perkGroupRequirement.treeName) === 1
        ? perkGroupRequirement.treeName
        : `${perkGroupRequirement.categoryName}: ${perkGroupRequirement.treeName}`,
  }))
}

export function getPerkGroupRequirementOptions(
  perk: LegendsPerkRecord,
): BuildPlannerPerkGroupRequirementOption[] {
  return getRequirementOptionsWithLabels(getPerkGroupRequirements(perk))
}

export function getPerkGroupRequirementLabel(perk: LegendsPerkRecord): string {
  const perkGroupRequirements = getPerkGroupRequirementOptions(perk)

  if (perkGroupRequirements.length === 0) {
    return 'No perk group placement'
  }

  return perkGroupRequirements.map((perkGroupRequirement) => perkGroupRequirement.treeLabel).join(' / ')
}

function sortGroupIdsForPerk(
  groupIds: string[],
  groupsById: Map<string, BuildPlannerSearchGroup>,
  uncoveredPerkIds: Set<string>,
): string[] {
  return [...groupIds].toSorted((leftGroupId, rightGroupId) => {
    const leftGroup = groupsById.get(leftGroupId)
    const rightGroup = groupsById.get(rightGroupId)
    const leftUncoveredCoverageCount =
      leftGroup === undefined
        ? 0
        : [...leftGroup.coveredPerkIds].filter((perkId) => uncoveredPerkIds.has(perkId)).length
    const rightUncoveredCoverageCount =
      rightGroup === undefined
        ? 0
        : [...rightGroup.coveredPerkIds].filter((perkId) => uncoveredPerkIds.has(perkId)).length

    return (
      rightUncoveredCoverageCount - leftUncoveredCoverageCount ||
      (leftGroup?.encounterOrder ?? Number.POSITIVE_INFINITY) -
        (rightGroup?.encounterOrder ?? Number.POSITIVE_INFINITY) ||
      leftGroupId.localeCompare(rightGroupId)
    )
  })
}

function getOptimisticMinimumGroupCount(
  selectedGroupCount: number,
  uncoveredPerkIds: Set<string>,
  groupsById: Map<string, BuildPlannerSearchGroup>,
): number {
  if (uncoveredPerkIds.size === 0) {
    return selectedGroupCount
  }

  let maximumRemainingCoverageCount = 0

  for (const group of groupsById.values()) {
    let remainingCoverageCount = 0

    for (const coveredPerkId of group.coveredPerkIds) {
      if (uncoveredPerkIds.has(coveredPerkId)) {
        remainingCoverageCount += 1
      }
    }

    if (remainingCoverageCount > maximumRemainingCoverageCount) {
      maximumRemainingCoverageCount = remainingCoverageCount
    }
  }

  if (maximumRemainingCoverageCount === 0) {
    return Number.POSITIVE_INFINITY
  }

  return selectedGroupCount + Math.ceil(uncoveredPerkIds.size / maximumRemainingCoverageCount)
}

function getBestCoveringGroupSequence(
  perkIdsInBuildOrder: string[],
  groupIdsByPerkId: Map<string, string[]>,
  groupsById: Map<string, BuildPlannerSearchGroup>,
): BuildPlannerSelectedGroup[] {
  const initialUncoveredPerkIds = new Set(perkIdsInBuildOrder)
  let bestSelectedGroups: BuildPlannerSelectedGroup[] | null = null

  function search(
    selectedGroups: BuildPlannerSelectedGroup[],
    uncoveredPerkIds: Set<string>,
  ) {
    if (uncoveredPerkIds.size === 0) {
      if (
        bestSelectedGroups === null ||
        selectedGroups.length < bestSelectedGroups.length
      ) {
        bestSelectedGroups = selectedGroups
      }
      return
    }

    if (bestSelectedGroups !== null && selectedGroups.length >= bestSelectedGroups.length) {
      return
    }

    if (
      bestSelectedGroups !== null &&
      getOptimisticMinimumGroupCount(selectedGroups.length, uncoveredPerkIds, groupsById) >
        bestSelectedGroups.length
    ) {
      return
    }

    const nextPerkId = [...uncoveredPerkIds]
      .toSorted((leftPerkId, rightPerkId) => {
        const leftGroupCount = groupIdsByPerkId.get(leftPerkId)?.length ?? 0
        const rightGroupCount = groupIdsByPerkId.get(rightPerkId)?.length ?? 0
        const leftPerkOrder = perkIdsInBuildOrder.indexOf(leftPerkId)
        const rightPerkOrder = perkIdsInBuildOrder.indexOf(rightPerkId)

        return leftGroupCount - rightGroupCount || leftPerkOrder - rightPerkOrder
      })[0]

    if (nextPerkId === undefined) {
      return
    }

    const candidateGroupIds = sortGroupIdsForPerk(
      groupIdsByPerkId.get(nextPerkId) ?? [],
      groupsById,
      uncoveredPerkIds,
    )

    for (const candidateGroupId of candidateGroupIds) {
      const candidateGroup = groupsById.get(candidateGroupId)

      if (candidateGroup === undefined) {
        continue
      }

      const newlyCoveredPerkIds = perkIdsInBuildOrder.filter(
        (perkId) =>
          uncoveredPerkIds.has(perkId) && candidateGroup.coveredPerkIds.has(perkId),
      )

      if (newlyCoveredPerkIds.length === 0) {
        continue
      }

      const nextUncoveredPerkIds = new Set(
        [...uncoveredPerkIds].filter((perkId) => !candidateGroup.coveredPerkIds.has(perkId)),
      )

      search(
        [...selectedGroups, { groupId: candidateGroupId, newlyCoveredPerkIds }],
        nextUncoveredPerkIds,
      )
    }
  }

  search([], initialUncoveredPerkIds)

  return bestSelectedGroups ?? []
}

export function getBuildPlannerRecommendation(
  pickedPerks: LegendsPerkRecord[],
): BuildPlannerRecommendation {
  const groupIdsByPerkId = new Map<string, string[]>()
  const groupOptionsByPerkId = new Map<string, BuildPlannerPerkGroupRequirementOption[]>()
  const groupsById = new Map<string, BuildPlannerSearchGroup>()
  const perksWithoutPerkGroup = pickedPerks.filter(
    (pickedPerk) => getPerkGroupRequirementOptions(pickedPerk).length === 0,
  )
  const pickedPerksWithPerkGroups = pickedPerks.filter(
    (pickedPerk) => !perksWithoutPerkGroup.some((perkWithoutPerkGroup) => perkWithoutPerkGroup.id === pickedPerk.id),
  )

  let nextEncounterOrder = 0

  for (const pickedPerk of pickedPerksWithPerkGroups) {
    const perkGroupOptions = getPerkGroupRequirementOptions(pickedPerk)

    groupOptionsByPerkId.set(pickedPerk.id, perkGroupOptions)
    groupIdsByPerkId.set(
      pickedPerk.id,
      perkGroupOptions.map((perkGroupOption) => perkGroupOption.treeId),
    )

    for (const perkGroupOption of perkGroupOptions) {
      if (!groupsById.has(perkGroupOption.treeId)) {
        groupsById.set(perkGroupOption.treeId, {
          ...perkGroupOption,
          coveredPerkIds: new Set(),
          encounterOrder: nextEncounterOrder,
        })
        nextEncounterOrder += 1
      }

      groupsById.get(perkGroupOption.treeId)?.coveredPerkIds.add(pickedPerk.id)
    }
  }

  const selectedGroups = getBestCoveringGroupSequence(
    pickedPerksWithPerkGroups.map((pickedPerk) => pickedPerk.id),
    groupIdsByPerkId,
    groupsById,
  )
  const selectedGroupIds = new Set(selectedGroups.map((selectedGroup) => selectedGroup.groupId))
  const selectedGroupOrderById = new Map(
    selectedGroups.map((selectedGroup, selectedGroupIndex) => [selectedGroup.groupId, selectedGroupIndex]),
  )
  const assignedGroupIdByPerkId = new Map<string, string>()
  const pickedPerkOrderById = new Map(
    pickedPerks.map((pickedPerk, pickedPerkIndex) => [pickedPerk.id, pickedPerkIndex]),
  )

  for (const selectedGroup of selectedGroups) {
    const selectedSearchGroup = groupsById.get(selectedGroup.groupId)

    if (selectedSearchGroup === undefined) {
      continue
    }

    for (const pickedPerk of pickedPerksWithPerkGroups) {
      if (assignedGroupIdByPerkId.has(pickedPerk.id)) {
        continue
      }

      if (selectedSearchGroup.coveredPerkIds.has(pickedPerk.id)) {
        assignedGroupIdByPerkId.set(pickedPerk.id, selectedGroup.groupId)
      }
    }
  }

  const recommendedGroupsById = new Map<string, BuildPlannerRecommendedGroup>()

  for (const pickedPerk of pickedPerksWithPerkGroups) {
    const assignedGroupId = assignedGroupIdByPerkId.get(pickedPerk.id)
    const assignedGroup = assignedGroupId === undefined ? undefined : groupsById.get(assignedGroupId)

    if (assignedGroup === undefined) {
      continue
    }

    if (!recommendedGroupsById.has(assignedGroup.treeId)) {
      recommendedGroupsById.set(assignedGroup.treeId, {
        categoryName: assignedGroup.categoryName,
        perkIds: [],
        perkNames: [],
        treeIconPath: assignedGroup.treeIconPath,
        treeId: assignedGroup.treeId,
        treeLabel: assignedGroup.treeLabel,
        treeName: assignedGroup.treeName,
      })
    }

    const recommendedGroup = recommendedGroupsById.get(assignedGroup.treeId)

    if (recommendedGroup === undefined) {
      continue
    }

    recommendedGroup.perkIds.push(pickedPerk.id)
    recommendedGroup.perkNames.push(pickedPerk.perkName)
  }

  const recommendedGroups = [...recommendedGroupsById.values()].toSorted((leftGroup, rightGroup) => {
    const leftGroupOrder = selectedGroupOrderById.get(leftGroup.treeId) ?? Number.POSITIVE_INFINITY
    const rightGroupOrder = selectedGroupOrderById.get(rightGroup.treeId) ?? Number.POSITIVE_INFINITY

    return (
      rightGroup.perkIds.length - leftGroup.perkIds.length ||
      leftGroupOrder - rightGroupOrder ||
      leftGroup.treeLabel.localeCompare(rightGroup.treeLabel)
    )
  })

  if (perksWithoutPerkGroup.length > 0) {
    recommendedGroups.push({
      categoryName: 'No perk group',
      perkIds: perksWithoutPerkGroup.map((pickedPerk) => pickedPerk.id),
      perkNames: perksWithoutPerkGroup.map((pickedPerk) => pickedPerk.perkName),
      treeIconPath: null,
      treeId: 'no-perk-group-placement',
      treeLabel: 'No perk group placement',
      treeName: 'No perk group placement',
    })
  }

  const alternativeGroupsByMatchKey = new Map<string, BuildPlannerAlternativeGroup>()

  for (const group of groupsById.values()) {
    if (selectedGroupIds.has(group.treeId)) {
      continue
    }

    const matchedPerks = pickedPerksWithPerkGroups.filter((pickedPerk) =>
      group.coveredPerkIds.has(pickedPerk.id),
    )

    if (matchedPerks.length === 0) {
      continue
    }

    const matchKey = matchedPerks.map((matchedPerk) => matchedPerk.id).join('::')

    if (!alternativeGroupsByMatchKey.has(matchKey)) {
      alternativeGroupsByMatchKey.set(matchKey, {
        perkGroupOptions: [],
        perkIds: matchedPerks.map((matchedPerk) => matchedPerk.id),
        perkNames: matchedPerks.map((matchedPerk) => matchedPerk.perkName),
      })
    }

    alternativeGroupsByMatchKey.get(matchKey)?.perkGroupOptions.push({
      categoryName: group.categoryName,
      treeIconPath: group.treeIconPath,
      treeId: group.treeId,
      treeLabel: group.treeLabel,
      treeName: group.treeName,
    })
  }

  const alternativeGroups = [...alternativeGroupsByMatchKey.values()]
    .map((alternativeGroup) => ({
      ...alternativeGroup,
      perkGroupOptions: alternativeGroup.perkGroupOptions.toSorted((leftOption, rightOption) => {
        const leftOrder = groupsById.get(leftOption.treeId)?.encounterOrder ?? Number.POSITIVE_INFINITY
        const rightOrder = groupsById.get(rightOption.treeId)?.encounterOrder ?? Number.POSITIVE_INFINITY

        return leftOrder - rightOrder || leftOption.treeLabel.localeCompare(rightOption.treeLabel)
      }),
    }))
    .toSorted((leftGroup, rightGroup) => {
      const leftFirstPerkOrder =
        leftGroup.perkIds
          .map((perkId) => pickedPerkOrderById.get(perkId) ?? Number.POSITIVE_INFINITY)
          .reduce((lowestOrder, perkOrder) => Math.min(lowestOrder, perkOrder), Number.POSITIVE_INFINITY)
      const rightFirstPerkOrder =
        rightGroup.perkIds
          .map((perkId) => pickedPerkOrderById.get(perkId) ?? Number.POSITIVE_INFINITY)
          .reduce((lowestOrder, perkOrder) => Math.min(lowestOrder, perkOrder), Number.POSITIVE_INFINITY)
      const leftLabel = leftGroup.perkGroupOptions.map((perkGroupOption) => perkGroupOption.treeLabel).join(' / ')
      const rightLabel = rightGroup.perkGroupOptions.map((perkGroupOption) => perkGroupOption.treeLabel).join(' / ')

      return (
        rightGroup.perkIds.length - leftGroup.perkIds.length ||
        leftFirstPerkOrder - rightFirstPerkOrder ||
        leftLabel.localeCompare(rightLabel)
      )
    })

  return {
    alternativeGroups,
    recommendedGroups,
  }
}
