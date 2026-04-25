import type { LegendsPerkPlacement, LegendsPerkRecord } from '../types/legends-perks'

type BuildPlannerPerkGroupRequirement = {
  categoryName: string
  treeIconPath: string | null
  treeId: string
  treeName: string
}

export type BuildPlannerPerkGroupRequirementOption = BuildPlannerPerkGroupRequirement & {
  treeLabel: string
}

export type BuildPlannerGroupedPerkGroup = {
  perkGroupOptions: BuildPlannerPerkGroupRequirementOption[]
  perkIds: string[]
  perkNames: string[]
}

type BuildPlannerGroups = {
  individualPerkGroups: BuildPlannerGroupedPerkGroup[]
  sharedPerkGroups: BuildPlannerGroupedPerkGroup[]
}

type BuildPlannerSearchGroup = BuildPlannerPerkGroupRequirementOption & {
  coveredPerkIds: Set<string>
  encounterOrder: number
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

function getPerkGroupRequirements(perk: LegendsPerkRecord): BuildPlannerPerkGroupRequirement[] {
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

function getPerkGroupRequirementOptions(
  perk: LegendsPerkRecord,
): BuildPlannerPerkGroupRequirementOption[] {
  return getRequirementOptionsWithLabels(getPerkGroupRequirements(perk))
}

function getNoPerkGroupPlacementOption(perkId: string): BuildPlannerPerkGroupRequirementOption {
  return {
    categoryName: 'No perk group',
    treeIconPath: null,
    treeId: `no-perk-group-placement::${perkId}`,
    treeLabel: 'No perk group placement',
    treeName: 'No perk group placement',
  }
}

function getPlannerGroupSortLabel(group: BuildPlannerGroupedPerkGroup): string {
  return group.perkGroupOptions.map((perkGroupOption) => perkGroupOption.treeLabel).join(' / ')
}

function getGroupedPerkGroups(
  pickedPerks: LegendsPerkRecord[],
  groupsById: Map<string, BuildPlannerSearchGroup>,
): BuildPlannerGroupedPerkGroup[] {
  const pickedPerkOrderById = new Map(
    pickedPerks.map((pickedPerk, pickedPerkIndex) => [pickedPerk.id, pickedPerkIndex]),
  )
  const groupedPerkGroupsByMatchKey = new Map<string, BuildPlannerGroupedPerkGroup>()

  for (const group of groupsById.values()) {
    const matchedPerks = pickedPerks.filter((pickedPerk) => group.coveredPerkIds.has(pickedPerk.id))

    if (matchedPerks.length === 0) {
      continue
    }

    const matchKey = matchedPerks.map((matchedPerk) => matchedPerk.id).join('::')

    if (!groupedPerkGroupsByMatchKey.has(matchKey)) {
      groupedPerkGroupsByMatchKey.set(matchKey, {
        perkGroupOptions: [],
        perkIds: matchedPerks.map((matchedPerk) => matchedPerk.id),
        perkNames: matchedPerks.map((matchedPerk) => matchedPerk.perkName),
      })
    }

    groupedPerkGroupsByMatchKey.get(matchKey)?.perkGroupOptions.push({
      categoryName: group.categoryName,
      treeIconPath: group.treeIconPath,
      treeId: group.treeId,
      treeLabel: group.treeLabel,
      treeName: group.treeName,
    })
  }

  return [...groupedPerkGroupsByMatchKey.values()]
    .map((groupedPerkGroup) => ({
      ...groupedPerkGroup,
      perkGroupOptions: groupedPerkGroup.perkGroupOptions.toSorted((leftOption, rightOption) => {
        const leftOrder =
          groupsById.get(leftOption.treeId)?.encounterOrder ?? Number.POSITIVE_INFINITY
        const rightOrder =
          groupsById.get(rightOption.treeId)?.encounterOrder ?? Number.POSITIVE_INFINITY

        return leftOrder - rightOrder || leftOption.treeLabel.localeCompare(rightOption.treeLabel)
      }),
    }))
    .toSorted((leftGroup, rightGroup) => {
      const leftFirstPerkOrder = leftGroup.perkIds
        .map((perkId) => pickedPerkOrderById.get(perkId) ?? Number.POSITIVE_INFINITY)
        .reduce(
          (lowestOrder, perkOrder) => Math.min(lowestOrder, perkOrder),
          Number.POSITIVE_INFINITY,
        )
      const rightFirstPerkOrder = rightGroup.perkIds
        .map((perkId) => pickedPerkOrderById.get(perkId) ?? Number.POSITIVE_INFINITY)
        .reduce(
          (lowestOrder, perkOrder) => Math.min(lowestOrder, perkOrder),
          Number.POSITIVE_INFINITY,
        )

      return (
        rightGroup.perkIds.length - leftGroup.perkIds.length ||
        leftFirstPerkOrder - rightFirstPerkOrder ||
        getPlannerGroupSortLabel(leftGroup).localeCompare(getPlannerGroupSortLabel(rightGroup))
      )
    })
}

export function getBuildPlannerGroups(pickedPerks: LegendsPerkRecord[]): BuildPlannerGroups {
  const groupsById = new Map<string, BuildPlannerSearchGroup>()
  let nextEncounterOrder = 0

  for (const pickedPerk of pickedPerks) {
    const perkGroupOptions = getPerkGroupRequirementOptions(pickedPerk)
    const normalizedPerkGroupOptions =
      perkGroupOptions.length > 0
        ? perkGroupOptions
        : [getNoPerkGroupPlacementOption(pickedPerk.id)]

    for (const perkGroupOption of normalizedPerkGroupOptions) {
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

  const groupedPerkGroups = getGroupedPerkGroups(pickedPerks, groupsById)

  return {
    individualPerkGroups: groupedPerkGroups.filter(
      (groupedPerkGroup) => groupedPerkGroup.perkIds.length === 1,
    ),
    sharedPerkGroups: groupedPerkGroups.filter(
      (groupedPerkGroup) => groupedPerkGroup.perkIds.length >= 2,
    ),
  }
}
