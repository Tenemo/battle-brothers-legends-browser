import type { LegendsPerkPlacement, LegendsPerkRecord } from '../types/legends-perks'

export type BuildPlannerPerkGroupRequirement = {
  categoryName: string
  treeId: string
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
