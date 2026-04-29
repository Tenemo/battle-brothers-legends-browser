import type {
  LegendsPerkBackgroundSource,
  LegendsPerkPlacement,
  LegendsPerkRecord,
} from '../types/legends-perks'

export const originAndAncientScrollOnlyPerkGroupIds = new Set([
  'ArcherCommandTree',
  'AssassinLeftoverTree',
  'BerserkerMagicTree',
  'EvocationMagicTree',
  'SeerMagicTree',
])

export function isOriginOrAncientScrollOnlyPerkGroupId(perkGroupId: string): boolean {
  return originAndAncientScrollOnlyPerkGroupIds.has(perkGroupId)
}

function getFilteredCategoryNames(placements: LegendsPerkPlacement[]): string[] {
  const categoryNames: string[] = []

  for (const placement of placements) {
    if (!categoryNames.includes(placement.categoryName)) {
      categoryNames.push(placement.categoryName)
    }
  }

  return categoryNames
}

function buildFilteredSearchText({
  backgroundSources,
  categoryNames,
  perk,
  placements,
}: {
  backgroundSources: LegendsPerkBackgroundSource[]
  categoryNames: string[]
  perk: LegendsPerkRecord
  placements: LegendsPerkPlacement[]
}): string {
  return [
    perk.perkName,
    perk.perkConstName,
    ...categoryNames,
    ...placements.flatMap((placement) => [
      placement.categoryName,
      placement.perkGroupName,
      placement.perkGroupId,
      placement.tier === null ? '' : `Tier ${placement.tier}`,
    ]),
    ...perk.descriptionParagraphs,
    ...(perk.favouredEnemyTargets ?? []).flatMap((favouredEnemyTarget) => [
      favouredEnemyTarget.entityConstName,
      favouredEnemyTarget.entityName,
      favouredEnemyTarget.killsPerPercentBonus === null
        ? ''
        : String(favouredEnemyTarget.killsPerPercentBonus),
    ]),
    ...backgroundSources.flatMap((backgroundSource) => [
      backgroundSource.backgroundName,
      backgroundSource.categoryName,
      backgroundSource.perkGroupName,
    ]),
    ...perk.scenarioSources.flatMap((scenarioSource) => [
      scenarioSource.scenarioName,
      scenarioSource.scenarioId,
      scenarioSource.grantType,
      scenarioSource.sourceMethodName,
      ...scenarioSource.candidatePerkNames,
    ]),
  ]
    .filter((value) => value.length > 0)
    .join(' ')
}

export function getPerksWithOriginAndAncientScrollPerkGroupsFiltered(
  perks: LegendsPerkRecord[],
): LegendsPerkRecord[] {
  return perks.flatMap((perk) => {
    const placements = perk.placements.filter(
      (placement) => !isOriginOrAncientScrollOnlyPerkGroupId(placement.perkGroupId),
    )

    if (placements.length === 0) {
      return []
    }

    if (placements.length === perk.placements.length) {
      return [perk]
    }

    const backgroundSources = perk.backgroundSources.filter(
      (backgroundSource) => !isOriginOrAncientScrollOnlyPerkGroupId(backgroundSource.perkGroupId),
    )
    const categoryNames = getFilteredCategoryNames(placements)

    return [
      {
        ...perk,
        backgroundSources,
        categoryNames,
        placements,
        primaryCategoryName: categoryNames[0] ?? perk.primaryCategoryName,
        searchText: buildFilteredSearchText({
          backgroundSources,
          categoryNames,
          perk,
          placements,
        }),
      },
    ]
  })
}
