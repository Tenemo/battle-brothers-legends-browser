import { describe, expect, test } from 'vitest'
import legendsBackgroundFitDatasetJson from '../src/data/legends-background-fit.json'
import { getOriginBackgroundPillLabel, isOriginBackgroundFit } from '../src/lib/background-origin'
import type { RankedBackgroundFit } from '../src/lib/background-fit'
import { getVisibleBackgroundPillLabel } from '../src/lib/perk-display'
import type { LegendsBackgroundFitDataset } from '../src/types/legends-perks'

const legendsBackgroundFitDataset = legendsBackgroundFitDatasetJson as LegendsBackgroundFitDataset

function createBackgroundFit({
  backgroundId,
  backgroundName,
  disambiguator = null,
  sourceFileName,
}: {
  backgroundId: string
  backgroundName: string
  disambiguator?: string | null
  sourceFileName: string
}): RankedBackgroundFit {
  return {
    backgroundId,
    backgroundName,
    backgroundTypeNames: [],
    buildReachabilityProbability: null,
    campResourceModifiers: [],
    dailyCost: null,
    disambiguator,
    excludedTalentAttributeNames: [],
    excludedTraitNames: [],
    expectedCoveredMustHavePerkCount: 0,
    expectedCoveredOptionalPerkCount: 0,
    expectedCoveredPickedPerkCount: 0,
    expectedMatchedPerkGroupCount: 0,
    fullBuildReachabilityProbability: null,
    fullBuildStudyResourceRequirement: null,
    guaranteedCoveredMustHavePerkCount: 0,
    guaranteedCoveredOptionalPerkCount: 0,
    guaranteedMatchedPerkGroupCount: 0,
    guaranteedTraitNames: [],
    iconPath: null,
    matches: [],
    maximumNativeCoveredPickedPerkCount: 0,
    maximumTotalPerkGroupCount: 0,
    mustHaveBuildReachabilityProbability: null,
    mustHaveStudyResourceRequirement: null,
    sourceFilePath: `.cache/legends-public/current/scripts/skills/backgrounds/${sourceFileName}`,
    veteranPerkLevelInterval: 4,
  }
}

function getBackgroundSourceFileLabel(sourceFilePath: string): string {
  const sourceFileName = sourceFilePath.split('/').at(-1) ?? sourceFilePath

  return sourceFileName.replace(/_background\.nut$/u, '').replace(/\.nut$/u, '')
}

function getImportedBackgroundFits(): RankedBackgroundFit[] {
  const duplicateBackgroundNameCountByName = new Map<string, number>()

  for (const backgroundDefinition of legendsBackgroundFitDataset.backgroundFitBackgrounds) {
    duplicateBackgroundNameCountByName.set(
      backgroundDefinition.backgroundName,
      (duplicateBackgroundNameCountByName.get(backgroundDefinition.backgroundName) ?? 0) + 1,
    )
  }

  return legendsBackgroundFitDataset.backgroundFitBackgrounds.map(
    (backgroundDefinition): RankedBackgroundFit => ({
      ...backgroundDefinition,
      buildReachabilityProbability: null,
      disambiguator:
        (duplicateBackgroundNameCountByName.get(backgroundDefinition.backgroundName) ?? 0) > 1
          ? getBackgroundSourceFileLabel(backgroundDefinition.sourceFilePath)
          : null,
      expectedCoveredMustHavePerkCount: 0,
      expectedCoveredOptionalPerkCount: 0,
      expectedCoveredPickedPerkCount: 0,
      expectedMatchedPerkGroupCount: 0,
      fullBuildReachabilityProbability: null,
      fullBuildStudyResourceRequirement: null,
      guaranteedCoveredMustHavePerkCount: 0,
      guaranteedCoveredOptionalPerkCount: 0,
      guaranteedMatchedPerkGroupCount: 0,
      matches: [],
      maximumNativeCoveredPickedPerkCount: 0,
      maximumTotalPerkGroupCount: 0,
      mustHaveBuildReachabilityProbability: null,
      mustHaveStudyResourceRequirement: null,
    }),
  )
}

describe('background origin detection', () => {
  test('detects unique origin backgrounds that are not duplicate-name disambiguation cases', () => {
    const originBackgroundFits = [
      createBackgroundFit({
        backgroundId: 'background.legend_battle_sister',
        backgroundName: 'Battle Sister',
        sourceFileName: 'legend_battle_sister_background.nut',
      }),
      createBackgroundFit({
        backgroundId: 'background.legend_lonewolf',
        backgroundName: 'Lone Wolf',
        sourceFileName: 'legend_lonewolf_background.nut',
      }),
      createBackgroundFit({
        backgroundId: 'background.legend_preserver',
        backgroundName: 'Preserver',
        sourceFileName: 'legend_preserver_background.nut',
      }),
      createBackgroundFit({
        backgroundId: 'background.legend_puppet_master',
        backgroundName: 'Puppet Master',
        sourceFileName: 'legend_puppet_master_background.nut',
      }),
      createBackgroundFit({
        backgroundId: 'background.legend_warlock_summoner',
        backgroundName: 'Summoner',
        sourceFileName: 'legend_warlock_summoner_background.nut',
      }),
    ]

    expect(
      originBackgroundFits.every((backgroundFit) => isOriginBackgroundFit(backgroundFit)),
    ).toBe(true)
    expect(
      originBackgroundFits.map((backgroundFit) => getOriginBackgroundPillLabel(backgroundFit)),
    ).toEqual([
      'Origin: Sisterhood',
      'Origin: Lone wolf',
      'Origin: Necromancer',
      'Origin: Necromancer',
      'Origin: Necromancer',
    ])
  })

  test('detects the missed origin-gated backgrounds with explicit pill labels', () => {
    const originBackgroundFits = [
      {
        backgroundFit: createBackgroundFit({
          backgroundId: 'background.legend_husk',
          backgroundName: 'Husk',
          sourceFileName: 'legend_husk_background.nut',
        }),
        pillLabel: 'Origin: Davkul',
      },
      {
        backgroundFit: createBackgroundFit({
          backgroundId: 'background.legend_lurker',
          backgroundName: 'Lurker',
          sourceFileName: 'legend_lurker_background.nut',
        }),
        pillLabel: 'Origin: Davkul',
      },
      {
        backgroundFit: createBackgroundFit({
          backgroundId: 'background.legend_magister',
          backgroundName: 'Magister',
          sourceFileName: 'legend_magister_background.nut',
        }),
        pillLabel: 'Origin: Davkul',
      },
      {
        backgroundFit: createBackgroundFit({
          backgroundId: 'background.legend_guildmaster',
          backgroundName: 'Guild Master',
          sourceFileName: 'legend_guildmaster_background.nut',
        }),
        pillLabel: 'Origin: Beast slayers',
      },
      {
        backgroundFit: createBackgroundFit({
          backgroundId: 'background.legend_bounty_hunter',
          backgroundName: 'Bounty Hunter',
          sourceFileName: 'legend_bounty_hunter_background.nut',
        }),
        pillLabel: 'Origin: Assassin',
      },
      {
        backgroundFit: createBackgroundFit({
          backgroundId: 'background.bladedancer',
          backgroundName: 'Bladedancer',
          sourceFileName: 'legend_bladedancer_background.nut',
        }),
        pillLabel: 'Origin: Nomad',
      },
      {
        backgroundFit: createBackgroundFit({
          backgroundId: 'background.legend_youngblood',
          backgroundName: 'Youngblood',
          sourceFileName: 'legend_youngblood_background.nut',
        }),
        pillLabel: 'Origin: Crusader/Inquisition',
      },
      {
        backgroundFit: createBackgroundFit({
          backgroundId: 'background.crusader',
          backgroundName: 'Crusader',
          sourceFileName: 'crusader_background.nut',
        }),
        pillLabel: 'Origin: Crusader/Inquisition',
      },
      {
        backgroundFit: createBackgroundFit({
          backgroundId: 'background.legend_pilgrim',
          backgroundName: 'Pilgrim',
          sourceFileName: 'legend_pilgrim_background.nut',
        }),
        pillLabel: 'Origin: Crusader',
      },
      {
        backgroundFit: createBackgroundFit({
          backgroundId: 'background.legend_leech_peddler',
          backgroundName: 'Leech Peddler',
          sourceFileName: 'legend_leech_peddler_background.nut',
        }),
        pillLabel: 'Origin: Peasant militia',
      },
      {
        backgroundFit: createBackgroundFit({
          backgroundId: 'background.legend_nightwatch',
          backgroundName: 'Night Watch',
          sourceFileName: 'legend_nightwatch_background.nut',
        }),
        pillLabel: 'Origin: Peasant militia',
      },
      {
        backgroundFit: createBackgroundFit({
          backgroundId: 'background.legend_man_at_arms',
          backgroundName: 'Man-At-Arms',
          sourceFileName: 'legend_man_at_arms_background.nut',
        }),
        pillLabel: 'Origin: Peasant militia',
      },
    ]

    expect(
      originBackgroundFits.map(({ backgroundFit }) => isOriginBackgroundFit(backgroundFit)),
    ).toEqual(originBackgroundFits.map(() => true))
    expect(
      originBackgroundFits.map(({ backgroundFit }) => getOriginBackgroundPillLabel(backgroundFit)),
    ).toEqual(originBackgroundFits.map(({ pillLabel }) => pillLabel))
  })

  test('labels unique commander and berserker origin backgrounds directly', () => {
    const originBackgroundFits = [
      createBackgroundFit({
        backgroundId: 'background.legend_berserker',
        backgroundName: 'Berserker',
        sourceFileName: 'legend_berserker_background.nut',
      }),
      createBackgroundFit({
        backgroundId: 'background.legend_commander_druid',
        backgroundName: 'Druid Commander',
        sourceFileName: 'legend_druid_commander_background.nut',
      }),
      createBackgroundFit({
        backgroundId: 'background.mage_legend_commander_mage',
        backgroundName: 'Mage',
        sourceFileName: 'mage_legend_mage_commander_background.nut',
      }),
      createBackgroundFit({
        backgroundId: 'background.legend_commander_necro',
        backgroundName: 'Master Necromancer',
        sourceFileName: 'legend_necro_commander_background.nut',
      }),
      createBackgroundFit({
        backgroundId: 'background.legend_peddler_commander',
        backgroundName: 'Merchant',
        sourceFileName: 'legend_peddler_commander_background.nut',
      }),
      createBackgroundFit({
        backgroundId: 'background.legend_commander_noble',
        backgroundName: 'Noble Usurper',
        sourceFileName: 'legend_noble_commander_background.nut',
      }),
      createBackgroundFit({
        backgroundId: 'background.legend_commander_witch',
        backgroundName: 'Seer',
        sourceFileName: 'legend_witch_commander_background.nut',
      }),
    ]

    expect(
      originBackgroundFits.map((backgroundFit) => getOriginBackgroundPillLabel(backgroundFit)),
    ).toEqual([
      'Origin: Berserker',
      'Origin: Commander',
      'Origin: Commander',
      'Origin: Commander',
      'Origin: Commander',
      'Origin: Commander',
      'Origin: Commander',
    ])
  })

  test('detects every Legion origin background', () => {
    const legionBackgroundFits = [
      'legend_legion_auxiliary',
      'legend_legion_centurion',
      'legend_legion_gladiator',
      'legend_legion_honour_guard',
      'legend_legion_legate',
      'legend_legion_legionary',
      'legend_legion_prefect',
      'legend_legion_slave',
    ].map((sourceLabel) =>
      createBackgroundFit({
        backgroundId: `background.${sourceLabel}`,
        backgroundName: sourceLabel,
        sourceFileName: `${sourceLabel}_background.nut`,
      }),
    )

    expect(
      legionBackgroundFits.every((backgroundFit) => isOriginBackgroundFit(backgroundFit)),
    ).toBe(true)
    expect(
      legionBackgroundFits.map((backgroundFit) => getOriginBackgroundPillLabel(backgroundFit)),
    ).toEqual(legionBackgroundFits.map(() => 'Origin: Legion'))
  })

  test('does not classify Puppet as origin-only because it is also recruitable elsewhere', () => {
    const puppetBackgroundFit = createBackgroundFit({
      backgroundId: 'background.legend_puppet',
      backgroundName: 'Puppet',
      sourceFileName: 'legend_puppet_background.nut',
    })

    expect(isOriginBackgroundFit(puppetBackgroundFit)).toBe(false)
    expect(getOriginBackgroundPillLabel(puppetBackgroundFit)).toBeNull()
  })

  test('does not classify generally recruitable or inactive backgrounds as origin-only', () => {
    const nonOriginBackgroundFits = [
      createBackgroundFit({
        backgroundId: 'background.legend_puppet',
        backgroundName: 'Puppet',
        sourceFileName: 'legend_puppet_background.nut',
      }),
      createBackgroundFit({
        backgroundId: 'background.legend_illusionist',
        backgroundName: 'Illusionist',
        sourceFileName: 'legend_illusionist_background.nut',
      }),
      createBackgroundFit({
        backgroundId: 'background.legend_druid',
        backgroundName: 'Druid',
        sourceFileName: 'legend_druid_background.nut',
      }),
      createBackgroundFit({
        backgroundId: 'background.legend_ranger',
        backgroundName: 'Ranger',
        sourceFileName: 'legend_ranger_background.nut',
      }),
      createBackgroundFit({
        backgroundId: 'background.legend_vala',
        backgroundName: 'Vala',
        sourceFileName: 'legend_vala_background.nut',
      }),
      createBackgroundFit({
        backgroundId: 'background.belly_dancer',
        backgroundName: 'Belly Dancer',
        sourceFileName: 'belly_dancer_background.nut',
      }),
      createBackgroundFit({
        backgroundId: 'background.legend_cannibal',
        backgroundName: 'Cannibal',
        sourceFileName: 'legend_cannibal_background.nut',
      }),
      createBackgroundFit({
        backgroundId: 'background.pimp',
        backgroundName: 'Pimp',
        sourceFileName: 'pimp_background.nut',
      }),
      createBackgroundFit({
        backgroundId: 'background.anatomist',
        backgroundName: 'Anatomist',
        sourceFileName: 'anatomist_background.nut',
      }),
      createBackgroundFit({
        backgroundId: 'background.paladin',
        backgroundName: 'Oathtaker',
        sourceFileName: 'paladin_background.nut',
      }),
      createBackgroundFit({
        backgroundId: 'background.manhunter',
        backgroundName: 'Manhunter',
        sourceFileName: 'manhunter_background.nut',
      }),
      createBackgroundFit({
        backgroundId: 'background.gladiator',
        backgroundName: 'Gladiator',
        sourceFileName: 'gladiator_background.nut',
      }),
      createBackgroundFit({
        backgroundId: 'background.legend_horse',
        backgroundName: 'Horse',
        sourceFileName: 'legend_horse.nut',
      }),
      createBackgroundFit({
        backgroundId: 'background.legend_horserider',
        backgroundName: 'Horse Rider',
        sourceFileName: 'legend_horserider.nut',
      }),
      createBackgroundFit({
        backgroundId: 'background.legend_necro',
        backgroundName: 'Warlock',
        sourceFileName: 'legend_necro_background.nut',
      }),
      createBackgroundFit({
        backgroundId: 'background.legend_warlock',
        backgroundName: 'Warlock',
        sourceFileName: 'legend_warlock_background.nut',
      }),
      createBackgroundFit({
        backgroundId: 'background.legend_trader',
        backgroundName: 'Trader',
        sourceFileName: 'legend_trader_background.nut',
      }),
    ]

    expect(
      nonOriginBackgroundFits.map((backgroundFit) => isOriginBackgroundFit(backgroundFit)),
    ).toEqual(nonOriginBackgroundFits.map(() => false))
    expect(
      nonOriginBackgroundFits.map((backgroundFit) => getOriginBackgroundPillLabel(backgroundFit)),
    ).toEqual(nonOriginBackgroundFits.map(() => null))
  })

  test('classifies the confirmed imported origin-only backgrounds', () => {
    const expectedOriginBackgroundIds = new Set([
      'background.bladedancer',
      'background.crusader',
      'background.legend_battle_sister',
      'background.legend_berserker',
      'background.legend_bounty_hunter',
      'background.legend_guildmaster',
      'background.legend_husk',
      'background.legend_leech_peddler',
      'background.legend_lonewolf',
      'background.legend_legion_auxiliary',
      'background.legend_legion_centurion',
      'background.legend_legion_gladiator',
      'background.legend_legion_honour_guard',
      'background.legend_legion_legate',
      'background.legend_legion_legionary',
      'background.legend_legion_prefect',
      'background.legend_legion_slave',
      'background.legend_lurker',
      'background.legend_magister',
      'background.legend_man_at_arms',
      'background.legend_nightwatch',
      'background.legend_pilgrim',
      'background.legend_preserver',
      'background.legend_puppet_master',
      'background.legend_warlock_summoner',
      'background.legend_youngblood',
    ])
    const importedBackgroundFits = legendsBackgroundFitDataset.backgroundFitBackgrounds
      .filter((backgroundFit) => expectedOriginBackgroundIds.has(backgroundFit.backgroundId))
      .map(
        (backgroundFit): RankedBackgroundFit => ({
          ...backgroundFit,
          buildReachabilityProbability: null,
          disambiguator: null,
          expectedCoveredMustHavePerkCount: 0,
          expectedCoveredOptionalPerkCount: 0,
          expectedCoveredPickedPerkCount: 0,
          expectedMatchedPerkGroupCount: 0,
          fullBuildReachabilityProbability: null,
          fullBuildStudyResourceRequirement: null,
          guaranteedCoveredMustHavePerkCount: 0,
          guaranteedCoveredOptionalPerkCount: 0,
          guaranteedMatchedPerkGroupCount: 0,
          matches: [],
          maximumNativeCoveredPickedPerkCount: 0,
          maximumTotalPerkGroupCount: 0,
          mustHaveBuildReachabilityProbability: null,
          mustHaveStudyResourceRequirement: null,
        }),
      )

    expect(
      importedBackgroundFits.map((backgroundFit) => backgroundFit.backgroundId).sort(),
    ).toEqual([...expectedOriginBackgroundIds].sort())
    expect(
      importedBackgroundFits.every((backgroundFit) => isOriginBackgroundFit(backgroundFit)),
    ).toBe(true)
    expect(
      importedBackgroundFits.every(
        (backgroundFit) => getOriginBackgroundPillLabel(backgroundFit) !== null,
      ),
    ).toBe(true)
  })

  test('shows a visible pill for every imported background hidden by the origin filter', () => {
    const originBackgroundFitsWithoutVisiblePills = getImportedBackgroundFits()
      .filter((backgroundFit) => isOriginBackgroundFit(backgroundFit))
      .filter((backgroundFit) => getVisibleBackgroundPillLabel(backgroundFit) === null)
      .map((backgroundFit) => ({
        backgroundId: backgroundFit.backgroundId,
        backgroundName: backgroundFit.backgroundName,
        sourceFilePath: backgroundFit.sourceFilePath,
      }))

    expect(originBackgroundFitsWithoutVisiblePills).toEqual([])
  })

  test('uses consistent category prefixes for every imported visible background pill', () => {
    const visibleBackgroundPillLabels = [
      ...new Set(
        getImportedBackgroundFits()
          .map((backgroundFit) => getVisibleBackgroundPillLabel(backgroundFit))
          .filter((pillLabel): pillLabel is string => pillLabel !== null),
      ),
    ].toSorted((leftPillLabel, rightPillLabel) => leftPillLabel.localeCompare(rightPillLabel))

    expect(visibleBackgroundPillLabels).toEqual([
      'Origin: Assassin',
      'Origin: Beast slayers',
      'Origin: Berserker',
      'Origin: Commander',
      'Origin: Crusader',
      'Origin: Crusader/Inquisition',
      'Origin: Davkul',
      'Origin: Legion',
      'Origin: Lone wolf',
      'Origin: Melee',
      'Origin: Necromancer',
      'Origin: Nomad',
      'Origin: Peasant militia',
      'Origin: Ranged',
      'Origin: Sisterhood',
      'Starting: Ranged',
      'Starting: Shield',
      'Starting: Two-handed',
      'Variant: Converted cultist',
      'Variant: Necro',
    ])
  })
})
