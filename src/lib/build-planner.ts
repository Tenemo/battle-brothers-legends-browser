import type { LegendsPerkPlacement, LegendsPerkRecord } from '../types/legends-perks'

type BuildPlannerPerkGroupRequirement = {
  categoryName: string
  perkGroupIconPath: string | null
  perkGroupId: string
  perkGroupName: string
}

export type BuildPlannerPerkGroupRequirementOption = BuildPlannerPerkGroupRequirement & {
  perkGroupLabel: string
}

export type BuildPlannerGroupedPerkGroup = {
  perkGroupOptions: BuildPlannerPerkGroupRequirementOption[]
  perkIconPaths: Array<string | null>
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
  const seenPerkGroupIds = new Set<string>()
  const perkGroupRequirements: BuildPlannerPerkGroupRequirement[] = []

  for (const placement of placements) {
    if (seenPerkGroupIds.has(placement.perkGroupId)) {
      continue
    }

    seenPerkGroupIds.add(placement.perkGroupId)
    perkGroupRequirements.push({
      categoryName: placement.categoryName,
      perkGroupIconPath: placement.perkGroupIconPath,
      perkGroupId: placement.perkGroupId,
      perkGroupName: placement.perkGroupName,
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
  const perkGroupNameCounts = new Map<string, number>()

  for (const perkGroupRequirement of perkGroupRequirements) {
    perkGroupNameCounts.set(
      perkGroupRequirement.perkGroupName,
      (perkGroupNameCounts.get(perkGroupRequirement.perkGroupName) ?? 0) + 1,
    )
  }

  return perkGroupRequirements.map((perkGroupRequirement) => ({
    ...perkGroupRequirement,
    perkGroupLabel:
      perkGroupNameCounts.get(perkGroupRequirement.perkGroupName) === 1
        ? perkGroupRequirement.perkGroupName
        : `${perkGroupRequirement.categoryName}: ${perkGroupRequirement.perkGroupName}`,
  }))
}

function getPerkGroupRequirementOptions(
  perk: LegendsPerkRecord,
): BuildPlannerPerkGroupRequirementOption[] {
  return getRequirementOptionsWithLabels(getPerkGroupRequirements(perk))
}

function getBuildPlannerPerkIconPath(perk: LegendsPerkRecord): string | null {
  return perk.iconPath ?? perk.placements[0]?.perkGroupIconPath ?? null
}

function getNoPerkGroupPlacementOption(perkId: string): BuildPlannerPerkGroupRequirementOption {
  return {
    categoryName: 'No perk group',
    perkGroupIconPath: null,
    perkGroupId: `no-perk-group-placement::${perkId}`,
    perkGroupLabel: 'No perk group placement',
    perkGroupName: 'No perk group placement',
  }
}

function getPlannerGroupSortLabel(group: BuildPlannerGroupedPerkGroup): string {
  return group.perkGroupOptions.map((perkGroupOption) => perkGroupOption.perkGroupLabel).join(' / ')
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
        perkIconPaths: matchedPerks.map((matchedPerk) => getBuildPlannerPerkIconPath(matchedPerk)),
        perkIds: matchedPerks.map((matchedPerk) => matchedPerk.id),
        perkNames: matchedPerks.map((matchedPerk) => matchedPerk.perkName),
      })
    }

    groupedPerkGroupsByMatchKey.get(matchKey)?.perkGroupOptions.push({
      categoryName: group.categoryName,
      perkGroupIconPath: group.perkGroupIconPath,
      perkGroupId: group.perkGroupId,
      perkGroupLabel: group.perkGroupLabel,
      perkGroupName: group.perkGroupName,
    })
  }

  return [...groupedPerkGroupsByMatchKey.values()]
    .map((groupedPerkGroup) => ({
      ...groupedPerkGroup,
      perkGroupOptions: groupedPerkGroup.perkGroupOptions.toSorted((leftOption, rightOption) => {
        const leftOrder =
          groupsById.get(leftOption.perkGroupId)?.encounterOrder ?? Number.POSITIVE_INFINITY
        const rightOrder =
          groupsById.get(rightOption.perkGroupId)?.encounterOrder ?? Number.POSITIVE_INFINITY

        return (
          leftOrder - rightOrder ||
          leftOption.perkGroupLabel.localeCompare(rightOption.perkGroupLabel)
        )
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
      if (!groupsById.has(perkGroupOption.perkGroupId)) {
        groupsById.set(perkGroupOption.perkGroupId, {
          ...perkGroupOption,
          coveredPerkIds: new Set(),
          encounterOrder: nextEncounterOrder,
        })
        nextEncounterOrder += 1
      }

      groupsById.get(perkGroupOption.perkGroupId)?.coveredPerkIds.add(pickedPerk.id)
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
