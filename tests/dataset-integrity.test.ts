import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import legendsPerksDatasetJson from '../src/data/legends-perks.json'
import type { LegendsPerkRecord, LegendsPerksDataset } from '../src/types/legends-perks'

const legendsPerksDataset = legendsPerksDatasetJson as LegendsPerksDataset

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

function getDuplicatePerkNames(perks: LegendsPerkRecord[]): Map<string, string[]> {
  const perkIdsByName = new Map<string, string[]>()

  for (const perk of perks) {
    perkIdsByName.set(perk.perkName, [...(perkIdsByName.get(perk.perkName) ?? []), perk.id])
  }

  return new Map([...perkIdsByName.entries()].filter(([, perkIds]) => perkIds.length > 1))
}

function getReferencedGameIconPaths(dataset: LegendsPerksDataset): string[] {
  const iconPaths = new Set<string>()

  for (const backgroundFitBackground of dataset.backgroundFitBackgrounds) {
    if (backgroundFitBackground.iconPath) {
      iconPaths.add(backgroundFitBackground.iconPath)
    }
  }

  for (const perk of dataset.perks) {
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

function getDuplicateBackgroundFitTreeEntries(dataset: LegendsPerksDataset): string[] {
  const duplicateEntries: string[] = []

  for (const backgroundFitBackground of dataset.backgroundFitBackgrounds) {
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

function getUnstableBackgroundMetadataEntries(dataset: LegendsPerksDataset): string[] {
  const unstableEntries: string[] = []

  for (const backgroundFitBackground of dataset.backgroundFitBackgrounds) {
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

function getDuplicateCampResourceModifierEntries(dataset: LegendsPerksDataset): string[] {
  const duplicateEntries: string[] = []

  for (const backgroundFitBackground of dataset.backgroundFitBackgrounds) {
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
  test('keeps top-level counts and source provenance internally consistent', () => {
    const perkGroupIds = new Set(
      legendsPerksDataset.perks.flatMap((perk) =>
        perk.placements.map((placement) => placement.perkGroupId),
      ),
    )

    expect(legendsPerksDataset.perks).toHaveLength(legendsPerksDataset.perkCount)
    expect(perkGroupIds.size).toBe(legendsPerksDataset.perkGroupCount)
    expect(new Set(legendsPerksDataset.perks.map((perk) => perk.id)).size).toBe(
      legendsPerksDataset.perks.length,
    )
    expect(new Set(legendsPerksDataset.sourceFiles.map((sourceFile) => sourceFile.path)).size).toBe(
      legendsPerksDataset.sourceFiles.length,
    )
    expect(legendsPerksDataset.sourceFiles.length).toBeGreaterThan(0)
  })

  test('keeps duplicate names and missing generated data explicit', () => {
    expect(getDuplicatePerkNames(legendsPerksDataset.perks)).toEqual(
      expectedDuplicatePerkNamesByName,
    )
    expect(
      new Set(
        legendsPerksDataset.perks
          .filter((perk) => perk.descriptionParagraphs.length === 0)
          .map((perk) => perk.id),
      ),
    ).toEqual(expectedPerksWithoutDescriptions)
    expect(
      new Set(
        legendsPerksDataset.perks
          .filter((perk) => perk.placements.length === 0)
          .map((perk) => perk.id),
      ),
    ).toEqual(expectedPerksWithoutPlacements)
  })

  test('keeps raw perk group descriptions out of generated app data', () => {
    const placementsWithRawDescriptions = legendsPerksDataset.perks.flatMap((perk) =>
      perk.placements.filter((placement) => Object.hasOwn(placement, 'perkGroupDescriptions')),
    )
    const perksWithCivilizationFlavourText = legendsPerksDataset.perks.filter((perk) =>
      perk.searchText.includes('law-abiding fools'),
    )

    expect(placementsWithRawDescriptions).toEqual([])
    expect(perksWithCivilizationFlavourText).toEqual([])
  })

  test('only references game icons that exist in the served asset directory', () => {
    const missingIconPaths = getReferencedGameIconPaths(legendsPerksDataset).filter(
      (iconPath) => !existsSync(path.join(process.cwd(), 'public', 'game-icons', iconPath)),
    )

    expect(missingIconPaths).toEqual([])
  })

  test('keeps background fit explicit perk group ids unique per background category', () => {
    expect(getDuplicateBackgroundFitTreeEntries(legendsPerksDataset)).toEqual([])
  })

  test('keeps background detail metadata stable and non-duplicated', () => {
    expect(getUnstableBackgroundMetadataEntries(legendsPerksDataset)).toEqual([])
    expect(getDuplicateCampResourceModifierEntries(legendsPerksDataset)).toEqual([])
  })
})
