import { describe, expect, test } from 'vitest'
import legendsPerksDatasetJson from '../src/data/legends-perks.json'
import {
  getPerksWithOriginAndAncientScrollPerkGroupsFiltered,
  isAncientScrollPerkGroupId,
  isOriginPerkGroupId,
  isOriginOrAncientScrollOnlyPerkGroupId,
} from '../src/lib/origin-and-ancient-scroll-perk-groups'
import { filterAndSortPerks } from '../src/lib/perk-search'
import type { LegendsPerksDataset } from '../src/types/legends-perks'

const legendsPerksDataset = legendsPerksDatasetJson as LegendsPerksDataset
const filteredPerks = getPerksWithOriginAndAncientScrollPerkGroupsFiltered(
  legendsPerksDataset.perks,
)
const filteredPerksByName = new Map(filteredPerks.map((perk) => [perk.perkName, perk]))

describe('origin and ancient scroll perk groups', () => {
  test('removes only restricted placements from perks that still spawn through normal groups', () => {
    const berserk = filteredPerksByName.get('Berserk')

    expect(berserk).toBeDefined()
    expect(berserk?.placements.map((placement) => placement.perkGroupName)).toEqual([
      'Vicious',
      'Aggressive',
    ])
    expect(berserk?.categoryNames).toEqual(['Traits', 'Other'])
    expect(berserk?.primaryCategoryName).toBe('Traits')
  })

  test('drops perks whose placements are only origin or ancient scroll perk groups', () => {
    expect(filteredPerksByName.has('Magic Missile')).toBe(false)
    expect(filteredPerksByName.has('Chain Lightning')).toBe(false)
    expect(filteredPerksByName.has('Ammunition Binding')).toBe(false)
  })

  test('can include origin perk groups without ancient scroll perk groups', () => {
    const originPerks = getPerksWithOriginAndAncientScrollPerkGroupsFiltered(
      legendsPerksDataset.perks,
      {
        shouldIncludeAncientScrollPerkGroups: false,
        shouldIncludeOriginPerkGroups: true,
      },
    )
    const originPerksByName = new Map(originPerks.map((perk) => [perk.perkName, perk]))
    const ammunitionBinding = originPerksByName.get('Ammunition Binding')
    const magicMissileFocus = originPerksByName.get('Magic Missile Focus')

    expect(ammunitionBinding?.placements.map((placement) => placement.perkGroupName)).toEqual([
      'ArcherCommand',
    ])
    expect(
      ammunitionBinding?.placements.every((placement) =>
        isOriginPerkGroupId(placement.perkGroupId),
      ),
    ).toBe(true)
    expect(magicMissileFocus?.placements.map((placement) => placement.perkGroupName)).toEqual([
      'Seer',
    ])
    expect(
      magicMissileFocus?.placements.some((placement) =>
        isAncientScrollPerkGroupId(placement.perkGroupId),
      ),
    ).toBe(false)
  })

  test('can include ancient scroll perk groups without origin perk groups', () => {
    const ancientScrollPerks = getPerksWithOriginAndAncientScrollPerkGroupsFiltered(
      legendsPerksDataset.perks,
      {
        shouldIncludeAncientScrollPerkGroups: true,
        shouldIncludeOriginPerkGroups: false,
      },
    )
    const ancientScrollPerksByName = new Map(
      ancientScrollPerks.map((perk) => [perk.perkName, perk]),
    )
    const ammunitionBinding = ancientScrollPerksByName.get('Ammunition Binding')
    const magicMissileFocus = ancientScrollPerksByName.get('Magic Missile Focus')

    expect(ammunitionBinding).toBeUndefined()
    expect(magicMissileFocus?.placements.map((placement) => placement.perkGroupName)).toEqual([
      'Evocation',
    ])
    expect(
      magicMissileFocus?.placements.every((placement) =>
        isAncientScrollPerkGroupId(placement.perkGroupId),
      ),
    ).toBe(true)
  })

  test('keeps overlapping origin and ancient scroll perk groups when either source filter is enabled', () => {
    const originPerks = getPerksWithOriginAndAncientScrollPerkGroupsFiltered(
      legendsPerksDataset.perks,
      {
        shouldIncludeAncientScrollPerkGroups: false,
        shouldIncludeOriginPerkGroups: true,
      },
    )
    const ancientScrollPerks = getPerksWithOriginAndAncientScrollPerkGroupsFiltered(
      legendsPerksDataset.perks,
      {
        shouldIncludeAncientScrollPerkGroups: true,
        shouldIncludeOriginPerkGroups: false,
      },
    )
    const originBerserk = originPerks.find((perk) => perk.perkName === 'Berserk')
    const ancientScrollBerserk = ancientScrollPerks.find((perk) => perk.perkName === 'Berserk')

    expect(originBerserk?.placements.map((placement) => placement.perkGroupName)).toContain(
      'Berserker',
    )
    expect(ancientScrollBerserk?.placements.map((placement) => placement.perkGroupName)).toContain(
      'Berserker',
    )
  })

  test('does not leave restricted placement or background source records behind', () => {
    for (const perk of filteredPerks) {
      expect(
        perk.placements.some((placement) =>
          isOriginOrAncientScrollOnlyPerkGroupId(placement.perkGroupId),
        ),
      ).toBe(false)
      expect(
        perk.backgroundSources.some((backgroundSource) =>
          isOriginOrAncientScrollOnlyPerkGroupId(backgroundSource.perkGroupId),
        ),
      ).toBe(false)
    }
  })

  test('keeps hidden group names out of filtered perk search text', () => {
    const berserk = filteredPerksByName.get('Berserk')
    const evocationResults = filterAndSortPerks(filteredPerks, {
      query: 'Evocation',
      selectedCategoryNames: [],
      selectedPerkGroupIdsByCategory: {},
    })
    const berserkerTreeResults = filterAndSortPerks(berserk ? [berserk] : [], {
      query: 'BerserkerMagicTree',
      selectedCategoryNames: [],
      selectedPerkGroupIdsByCategory: {},
    })

    expect(berserk?.searchText).not.toMatch(/BerserkerMagicTree/u)
    expect(evocationResults.map((perk) => perk.perkName)).toEqual([])
    expect(berserkerTreeResults.map((perk) => perk.perkName)).toEqual([])
  })
})
