import type {
  LegendsPerkCatalogBackgroundSourceTable,
  LegendsPerkCatalogRecord,
  LegendsPerkRecord,
} from '../types/legends-perks'

export function hydrateCatalogPerks(
  perks: LegendsPerkCatalogRecord[],
  backgroundSourceTable: LegendsPerkCatalogBackgroundSourceTable,
): LegendsPerkRecord[] {
  return perks.map((perk) => {
    const perkGroupNameById = new Map(
      perk.placements.map((placement) => [placement.perkGroupId, placement.perkGroupName]),
    )
    const backgroundSources = (backgroundSourceTable.perkSourcesByPerkId[perk.id] ?? []).flatMap(
      ([backgroundNameIndex, perkGroupIdIndex, probabilityIndex]) => {
        const backgroundName = backgroundSourceTable.backgroundNames[backgroundNameIndex]
        const perkGroupId = backgroundSourceTable.perkGroupIds[perkGroupIdIndex]
        const probability = backgroundSourceTable.probabilities[probabilityIndex]

        if (!backgroundName || !perkGroupId || typeof probability !== 'number') {
          return []
        }

        return [
          {
            backgroundName,
            perkGroupId,
            perkGroupName: perkGroupNameById.get(perkGroupId) ?? perkGroupId,
            probability,
          },
        ]
      },
    )
    const hydratedPerk = {
      ...perk,
      backgroundSources,
      searchText: '',
    }

    return hydratedPerk
  })
}

export function getPerkGroupCount(perks: readonly Pick<LegendsPerkRecord, 'placements'>[]): number {
  return new Set(perks.flatMap((perk) => perk.placements.map((placement) => placement.perkGroupId)))
    .size
}
