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

export type GroupedBuildPlannerPerkGroupRequirement = {
  categoryLabel: string
  perkIds: string[]
  perkNames: string[]
  perkGroupOptions: BuildPlannerPerkGroupRequirementOption[]
  requirementId: string
  treeLabel: string
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

export function getPerkGroupRequirementLabel(perk: LegendsPerkRecord): string {
  const perkGroupRequirements = getRequirementOptionsWithLabels(getPerkGroupRequirements(perk))

  if (perkGroupRequirements.length === 0) {
    return 'No perk group placement'
  }

  return perkGroupRequirements.map((perkGroupRequirement) => perkGroupRequirement.treeLabel).join(' / ')
}

export function getGroupedBuildPerkGroupRequirements(
  pickedPerks: LegendsPerkRecord[],
): GroupedBuildPlannerPerkGroupRequirement[] {
  const groupedRequirementsByRequirementId = new Map<
    string,
    Omit<GroupedBuildPlannerPerkGroupRequirement, 'categoryLabel' | 'treeLabel'>
  >()

  for (const pickedPerk of pickedPerks) {
    const perkGroupOptions = getRequirementOptionsWithLabels(getPerkGroupRequirements(pickedPerk))
    const requirementId =
      perkGroupOptions.length === 0
        ? 'no-perk-group-placement'
        : perkGroupOptions
            .map((perkGroupOption) => perkGroupOption.treeId)
            .toSorted((leftTreeId, rightTreeId) => leftTreeId.localeCompare(rightTreeId))
            .join('::')

    if (!groupedRequirementsByRequirementId.has(requirementId)) {
      groupedRequirementsByRequirementId.set(requirementId, {
        perkGroupOptions,
        perkIds: [],
        perkNames: [],
        requirementId,
      })
    }

    const groupedRequirement = groupedRequirementsByRequirementId.get(requirementId)

    if (!groupedRequirement) {
      continue
    }

    if (!groupedRequirement.perkIds.includes(pickedPerk.id)) {
      groupedRequirement.perkIds.push(pickedPerk.id)
      groupedRequirement.perkNames.push(pickedPerk.perkName)
    }
  }

  return [...groupedRequirementsByRequirementId.values()].map((groupedRequirement) => ({
    ...groupedRequirement,
    categoryLabel:
      groupedRequirement.perkGroupOptions.length === 0
        ? 'No perk group'
        : [...new Set(groupedRequirement.perkGroupOptions.map((perkGroupOption) => perkGroupOption.categoryName))].join(
            ' / ',
          ),
    treeLabel:
      groupedRequirement.perkGroupOptions.length === 0
        ? 'No perk group placement'
        : groupedRequirement.perkGroupOptions
            .map((perkGroupOption) => perkGroupOption.treeLabel)
            .join(' / '),
  }))
}
