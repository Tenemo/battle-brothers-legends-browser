import type { LegendsPerkPlacement, LegendsPerkRecord } from '../types/legends-perks'

export type BuildPlannerPerkGroupRequirement = {
  categoryName: string
  treeId: string
  treeName: string
}

export type GroupedBuildPlannerPerkGroupRequirement = {
  categoryName: string
  perkIds: string[]
  perkNames: string[]
  treeId: string
  treeLabel: string
  treeName: string
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

export function getPerkGroupRequirementLabel(perk: LegendsPerkRecord): string {
  const perkGroupRequirements = getPerkGroupRequirements(perk)

  if (perkGroupRequirements.length === 0) {
    return 'No perk group placement'
  }

  const treeNameCounts = new Map<string, number>()

  for (const perkGroupRequirement of perkGroupRequirements) {
    treeNameCounts.set(
      perkGroupRequirement.treeName,
      (treeNameCounts.get(perkGroupRequirement.treeName) ?? 0) + 1,
    )
  }

  return perkGroupRequirements
    .map((perkGroupRequirement) =>
      treeNameCounts.get(perkGroupRequirement.treeName) === 1
        ? perkGroupRequirement.treeName
        : `${perkGroupRequirement.categoryName}: ${perkGroupRequirement.treeName}`,
    )
    .join(' / ')
}

export function getGroupedBuildPerkGroupRequirements(
  pickedPerks: LegendsPerkRecord[],
): GroupedBuildPlannerPerkGroupRequirement[] {
  const groupedRequirementsByTreeId = new Map<
    string,
    Omit<GroupedBuildPlannerPerkGroupRequirement, 'treeLabel'>
  >()

  for (const pickedPerk of pickedPerks) {
    for (const perkGroupRequirement of getPerkGroupRequirements(pickedPerk)) {
      if (!groupedRequirementsByTreeId.has(perkGroupRequirement.treeId)) {
        groupedRequirementsByTreeId.set(perkGroupRequirement.treeId, {
          categoryName: perkGroupRequirement.categoryName,
          perkIds: [],
          perkNames: [],
          treeId: perkGroupRequirement.treeId,
          treeName: perkGroupRequirement.treeName,
        })
      }

      const groupedRequirement = groupedRequirementsByTreeId.get(perkGroupRequirement.treeId)

      if (!groupedRequirement) {
        continue
      }

      if (!groupedRequirement.perkIds.includes(pickedPerk.id)) {
        groupedRequirement.perkIds.push(pickedPerk.id)
        groupedRequirement.perkNames.push(pickedPerk.perkName)
      }
    }
  }

  const treeNameCounts = new Map<string, number>()

  for (const groupedRequirement of groupedRequirementsByTreeId.values()) {
    treeNameCounts.set(
      groupedRequirement.treeName,
      (treeNameCounts.get(groupedRequirement.treeName) ?? 0) + 1,
    )
  }

  return [...groupedRequirementsByTreeId.values()].map((groupedRequirement) => ({
    ...groupedRequirement,
    treeLabel:
      treeNameCounts.get(groupedRequirement.treeName) === 1
        ? groupedRequirement.treeName
        : `${groupedRequirement.categoryName}: ${groupedRequirement.treeName}`,
  }))
}
