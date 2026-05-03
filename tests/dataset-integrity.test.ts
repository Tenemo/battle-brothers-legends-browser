import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import legendsBackgroundFitDatasetJson from '../src/data/legends-background-fit.json'
import legendsPerkCatalogDatasetJson from '../src/data/legends-perk-catalog.json'
import { createBackgroundFitEngine } from '../src/lib/background-fit'
import { getPerkGroupCount, hydrateCatalogPerks } from '../src/lib/legends-data'
import { filterAndSortPerks } from '../src/lib/perk-search'
import type {
  LegendsBackgroundFitBackgroundDefinition,
  LegendsBackgroundFitDataset,
  LegendsPerkCatalogDataset,
  LegendsPerkCatalogRecord,
} from '../src/types/legends-perks'

const legendsBackgroundFitDataset = legendsBackgroundFitDatasetJson as LegendsBackgroundFitDataset
const legendsPerkCatalogDataset = legendsPerkCatalogDatasetJson as LegendsPerkCatalogDataset

const expectedDuplicatePerkNamesByName = new Map<string, string[]>([
  ['Chain Lightning', ['perk.legend_chain_lightning', 'perk.legend_magic_chain_lightning']],
  ['Daze', ['perk.legend_daze', 'perk.legend_magic_daze']],
  ['Levitate', ['perk.legend_levitation', 'perk.legend_magic_levitate']],
  ['Sleep', ['perk.legend_sleep', 'perk.legend_magic_sleep']],
  ['Teleport', ['perk.legend_teleport', 'perk.legend_magic_teleport']],
])

const expectedPerksWithoutDescriptions = new Set(['perk.battering_ram', 'perk.captain'])

const expectedPerksWithoutPlacements = new Set([
  'perk.battering_ram',
  'perk.captain',
  'perk.footwork',
  'perk.legend_adaptive',
  'perk.legend_become_berserker',
  'perk.legend_boondock_blade',
  'perk.legend_bribe',
  'perk.legend_brink_of_death',
  'perk.legend_bruiser',
  'perk.legend_call_lightning',
  'perk.legend_climb',
  'perk.legend_composure',
  'perk.legend_deathtouch',
  'perk.legend_deflect',
  'perk.legend_enthrall',
  'perk.legend_escape_artist',
  'perk.legend_forceful_swing',
  'perk.legend_guide_steps',
  'perk.legend_hex',
  'perk.legend_hidden',
  'perk.legend_horse_bitting',
  'perk.legend_horse_charge',
  'perk.legend_horse_collection',
  'perk.legend_horse_desensitization',
  'perk.legend_horse_flying_change',
  'perk.legend_horse_impulsion',
  'perk.legend_horse_lead_change',
  'perk.legend_horse_leg_control',
  'perk.legend_horse_liberty',
  'perk.legend_horse_longeing',
  'perk.legend_horse_movement',
  'perk.legend_horse_parthian_shot',
  'perk.legend_horse_passage',
  'perk.legend_horse_piaffe',
  'perk.legend_horse_pirouette',
  'perk.legend_horse_tempi_change',
  'perk.legend_infectious_rage',
  'perk.legend_ironside',
  'perk.legend_magic_burning_hands',
  'perk.legend_magic_chain_lightning',
  'perk.legend_magic_circle_of_protection',
  'perk.legend_magic_hailstone',
  'perk.legend_magic_healing_wind',
  'perk.legend_magic_imbue',
  'perk.legend_magic_levitate',
  'perk.legend_magic_soothing_wind',
  'perk.legend_magic_teleport',
  'perk.legend_mark_target',
  'perk.legend_mastery_burning_hands',
  'perk.legend_mastery_chain_lightning',
  'perk.legend_mastery_dual_wield',
  'perk.legend_mastery_hailstone',
  'perk.legend_poison_immunity',
  'perk.legend_possess_undead',
  'perk.legend_prepare_graze',
  'perk.legend_prepared_for_anything',
  'perk.legend_relax',
  'perk.legend_resurrectionist',
  'perk.legend_sleep',
  'perk.legend_specialist_cultist',
  'perk.legend_specialist_shield_push',
  'perk.legend_sprint',
  'perk.legend_staff_block',
  'perk.legend_strict_sermons',
  'perk.legend_summon_catapult',
  'perk.legend_taste_the_pain',
  'perk.legend_teacher',
  'perk.legend_throw_sand',
  'perk.legend_untouchable',
  'perk.legend_vala_trance_perspective',
  'perk.perk_legend_zombie_bite',
  'perk.rotation',
  'perk.stalwart',
  'perk.sundering_strikes',
])

function getDuplicatePerkNames(
  perks: Array<Pick<LegendsPerkCatalogRecord, 'id' | 'perkName'>>,
): Map<string, string[]> {
  const perkIdsByName = new Map<string, string[]>()

  for (const perk of perks) {
    perkIdsByName.set(perk.perkName, [...(perkIdsByName.get(perk.perkName) ?? []), perk.id])
  }

  return new Map([...perkIdsByName.entries()].filter(([, perkIds]) => perkIds.length > 1))
}

function getReferencedGameIconPaths({
  backgroundFitBackgrounds,
  perks,
}: {
  backgroundFitBackgrounds: LegendsBackgroundFitBackgroundDefinition[]
  perks: LegendsPerkCatalogRecord[]
}): string[] {
  const iconPaths = new Set<string>()

  for (const backgroundFitBackground of backgroundFitBackgrounds) {
    if (backgroundFitBackground.iconPath) {
      iconPaths.add(backgroundFitBackground.iconPath)
    }
  }

  for (const perk of perks) {
    if (perk.iconPath) {
      iconPaths.add(perk.iconPath)
    }

    for (const placement of perk.placements) {
      if (placement.perkGroupIconPath) {
        iconPaths.add(placement.perkGroupIconPath)
      }
    }
  }

  return [...iconPaths].toSorted((leftIconPath, rightIconPath) =>
    leftIconPath.localeCompare(rightIconPath),
  )
}

function getDuplicateBackgroundFitTreeEntries(
  backgroundFitBackgrounds: LegendsBackgroundFitBackgroundDefinition[],
): string[] {
  const duplicateEntries: string[] = []

  for (const backgroundFitBackground of backgroundFitBackgrounds) {
    for (const [categoryName, categoryDefinition] of Object.entries(
      backgroundFitBackground.categories,
    )) {
      const seenPerkGroupIds = new Set<string>()

      for (const perkGroupId of categoryDefinition?.perkGroupIds ?? []) {
        if (seenPerkGroupIds.has(perkGroupId)) {
          duplicateEntries.push(
            `${backgroundFitBackground.backgroundName}::${backgroundFitBackground.sourceFilePath}::${categoryName}::${perkGroupId}`,
          )
        }

        seenPerkGroupIds.add(perkGroupId)
      }
    }
  }

  return duplicateEntries.toSorted((leftEntry, rightEntry) => leftEntry.localeCompare(rightEntry))
}

function getUnstableBackgroundMetadataEntries(
  backgroundFitBackgrounds: LegendsBackgroundFitBackgroundDefinition[],
): string[] {
  const unstableEntries: string[] = []

  for (const backgroundFitBackground of backgroundFitBackgrounds) {
    const nameLists = [
      ['background type', backgroundFitBackground.backgroundTypeNames],
      ['excluded trait', backgroundFitBackground.excludedTraitNames],
      ['guaranteed trait', backgroundFitBackground.guaranteedTraitNames],
      ['excluded talent attribute', backgroundFitBackground.excludedTalentAttributeNames],
    ] as const

    for (const [nameListLabel, names] of nameLists) {
      const sortedUniqueNames = [...new Set(names)].toSorted((leftName, rightName) =>
        leftName.localeCompare(rightName),
      )

      if (names.join('::') !== sortedUniqueNames.join('::')) {
        unstableEntries.push(
          `${backgroundFitBackground.backgroundName}::${backgroundFitBackground.sourceFilePath}::${nameListLabel}`,
        )
      }
    }
  }

  return unstableEntries.toSorted((leftEntry, rightEntry) => leftEntry.localeCompare(rightEntry))
}

function getDuplicateCampResourceModifierEntries(
  backgroundFitBackgrounds: LegendsBackgroundFitBackgroundDefinition[],
): string[] {
  const duplicateEntries: string[] = []

  for (const backgroundFitBackground of backgroundFitBackgrounds) {
    const seenModifierKeys = new Set<string>()

    for (const modifier of backgroundFitBackground.campResourceModifiers) {
      if (modifier.value === 0) {
        duplicateEntries.push(
          `${backgroundFitBackground.backgroundName}::${backgroundFitBackground.sourceFilePath}::${modifier.modifierKey}::zero`,
        )
      }

      if (seenModifierKeys.has(modifier.modifierKey)) {
        duplicateEntries.push(
          `${backgroundFitBackground.backgroundName}::${backgroundFitBackground.sourceFilePath}::${modifier.modifierKey}`,
        )
      }

      seenModifierKeys.add(modifier.modifierKey)
    }
  }

  return duplicateEntries.toSorted((leftEntry, rightEntry) => leftEntry.localeCompare(rightEntry))
}

describe('generated dataset integrity', () => {
  test('keeps only the compact runtime data files in src/data', () => {
    expect(readdirSync(path.join(process.cwd(), 'src', 'data')).toSorted()).toEqual([
      'legends-background-fit.json',
      'legends-perk-catalog.json',
    ])
    expect(Object.keys(legendsPerkCatalogDataset)).toEqual(['referenceVersion', 'perks'])
    expect(Object.keys(legendsBackgroundFitDataset)).toEqual([
      'backgroundFitBackgrounds',
      'backgroundFitRules',
      'referenceVersion',
      'perks',
    ])
  })

  test('keeps catalog and background fit projections aligned', () => {
    const backgroundFitPerksById = new Map(
      legendsBackgroundFitDataset.perks.map((perk) => [perk.id, perk]),
    )

    expect(legendsPerkCatalogDataset.referenceVersion).toBe(
      legendsBackgroundFitDataset.referenceVersion,
    )
    expect(backgroundFitPerksById.size).toBe(legendsPerkCatalogDataset.perks.length)
    expect(getPerkGroupCount(legendsPerkCatalogDataset.perks)).toBeGreaterThan(0)

    for (const catalogPerk of legendsPerkCatalogDataset.perks) {
      expect(backgroundFitPerksById.get(catalogPerk.id)).toEqual({
        iconPath: catalogPerk.iconPath,
        id: catalogPerk.id,
        perkName: catalogPerk.perkName,
        placements: catalogPerk.placements,
      })
    }
  })

  test('keeps derived fields out of the catalog data file', () => {
    const derivedFieldEntries = legendsPerkCatalogDataset.perks.flatMap((perk) =>
      ['backgroundSources', 'perkConstName', 'searchText'].flatMap((fieldName) =>
        Object.hasOwn(perk, fieldName) ? [`${perk.id}::${fieldName}`] : [],
      ),
    )
    const placementsWithRawDescriptions = legendsPerkCatalogDataset.perks.flatMap((perk) =>
      perk.placements.filter((placement) => Object.hasOwn(placement, 'perkGroupDescriptions')),
    )

    expect(derivedFieldEntries).toEqual([])
    expect(placementsWithRawDescriptions).toEqual([])
    expect(JSON.stringify(legendsPerkCatalogDataset)).not.toContain('law-abiding fools')
  })

  test('keeps duplicate names and missing generated data explicit', () => {
    expect(getDuplicatePerkNames(legendsPerkCatalogDataset.perks)).toEqual(
      expectedDuplicatePerkNamesByName,
    )
    expect(
      new Set(
        legendsPerkCatalogDataset.perks
          .filter((perk) => perk.descriptionParagraphs.length === 0)
          .map((perk) => perk.id),
      ),
    ).toEqual(expectedPerksWithoutDescriptions)
    expect(
      new Set(
        legendsPerkCatalogDataset.perks
          .filter((perk) => perk.placements.length === 0)
          .map((perk) => perk.id),
      ),
    ).toEqual(expectedPerksWithoutPlacements)
  })

  test('hydrates background source search text without storing it in the catalog', () => {
    const runtimePerks = hydrateCatalogPerks(
      legendsPerkCatalogDataset.perks,
      createBackgroundFitEngine(legendsBackgroundFitDataset),
    )
    const apprenticeSearchResults = filterAndSortPerks(runtimePerks, {
      query: 'Apprentice',
      selectedCategoryNames: [],
      selectedPerkGroupIdsByCategory: {},
    })

    expect(apprenticeSearchResults.map((perk) => perk.perkName)).toContain('Adrenaline')
    expect(
      legendsPerkCatalogDataset.perks.some((perk) => Object.hasOwn(perk, 'backgroundSources')),
    ).toBe(false)
  })

  test('only references game icons that exist in the served asset directory', () => {
    const missingIconPaths = getReferencedGameIconPaths({
      backgroundFitBackgrounds: legendsBackgroundFitDataset.backgroundFitBackgrounds,
      perks: legendsPerkCatalogDataset.perks,
    }).filter(
      (iconPath) => !existsSync(path.join(process.cwd(), 'public', 'game-icons', iconPath)),
    )

    expect(missingIconPaths).toEqual([])
  })

  test('keeps background fit explicit perk group ids unique per background category', () => {
    expect(
      getDuplicateBackgroundFitTreeEntries(legendsBackgroundFitDataset.backgroundFitBackgrounds),
    ).toEqual([])
  })

  test('keeps background detail metadata stable and non-duplicated', () => {
    expect(
      getUnstableBackgroundMetadataEntries(legendsBackgroundFitDataset.backgroundFitBackgrounds),
    ).toEqual([])
    expect(
      getDuplicateCampResourceModifierEntries(legendsBackgroundFitDataset.backgroundFitBackgrounds),
    ).toEqual([])
  })
})
