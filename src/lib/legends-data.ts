import type {
  LegendsBackgroundFitPerkRecord,
  LegendsPerkBackgroundSource,
  LegendsPerkCatalogRecord,
  LegendsPerkRecord,
} from '../types/legends-perks'
import { createPerkSearchText } from './perk-search'

type BackgroundSourceResolver = {
  getPerkBackgroundSources: (perk: LegendsBackgroundFitPerkRecord) => LegendsPerkBackgroundSource[]
}

export function hydrateCatalogPerks(
  perks: LegendsPerkCatalogRecord[],
  backgroundSourceResolver: BackgroundSourceResolver,
): LegendsPerkRecord[] {
  return perks.map((perk) => {
    const backgroundSources = backgroundSourceResolver.getPerkBackgroundSources(perk)

    return {
      ...perk,
      backgroundSources,
      searchText: createPerkSearchText({
        ...perk,
        backgroundSources,
      }),
    }
  })
}

export function getPerkGroupCount(perks: readonly Pick<LegendsPerkRecord, 'placements'>[]): number {
  return new Set(perks.flatMap((perk) => perk.placements.map((placement) => placement.perkGroupId)))
    .size
}
