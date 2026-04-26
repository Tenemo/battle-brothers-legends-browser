import { describe, expect, test } from 'vitest'
import legendsPerksDatasetJson from '../src/data/legends-perks.json'
import { getOriginBackgroundPillLabel, isOriginBackgroundFit } from '../src/lib/background-origin'
import type { RankedBackgroundFit } from '../src/lib/background-fit'
import type { LegendsPerksDataset } from '../src/types/legends-perks'

const legendsPerksDataset = legendsPerksDatasetJson as LegendsPerksDataset

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
    disambiguator,
    expectedCoveredPickedPerkCount: 0,
    expectedMatchedPerkGroupCount: 0,
    guaranteedMatchedPerkGroupCount: 0,
    iconPath: null,
    matches: [],
    maximumTotalPerkGroupCount: 0,
    sourceFilePath: `.cache/legends-public/current/scripts/skills/backgrounds/${sourceFileName}`,
  }
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

    expect(originBackgroundFits.every((backgroundFit) => isOriginBackgroundFit(backgroundFit))).toBe(
      true,
    )
    expect(originBackgroundFits.map((backgroundFit) => getOriginBackgroundPillLabel(backgroundFit)))
      .toEqual([
        'origin sisterhood',
        'origin lone wolf',
        'origin necromancer',
        'origin necromancer',
        'origin necromancer',
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

    expect(legionBackgroundFits.every((backgroundFit) => isOriginBackgroundFit(backgroundFit))).toBe(
      true,
    )
    expect(legionBackgroundFits.map((backgroundFit) => getOriginBackgroundPillLabel(backgroundFit)))
      .toEqual(legionBackgroundFits.map(() => 'origin legion'))
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

  test('classifies the confirmed imported origin-only backgrounds', () => {
    const expectedOriginBackgroundIds = new Set([
      'background.legend_battle_sister',
      'background.legend_lonewolf',
      'background.legend_legion_auxiliary',
      'background.legend_legion_centurion',
      'background.legend_legion_gladiator',
      'background.legend_legion_honour_guard',
      'background.legend_legion_legate',
      'background.legend_legion_legionary',
      'background.legend_legion_prefect',
      'background.legend_legion_slave',
      'background.legend_preserver',
      'background.legend_puppet_master',
      'background.legend_warlock_summoner',
    ])
    const importedBackgroundFits = legendsPerksDataset.backgroundFitBackgrounds
      .filter((backgroundFit) => expectedOriginBackgroundIds.has(backgroundFit.backgroundId))
      .map((backgroundFit): RankedBackgroundFit => ({
        ...backgroundFit,
        disambiguator: null,
        expectedCoveredPickedPerkCount: 0,
        expectedMatchedPerkGroupCount: 0,
        guaranteedMatchedPerkGroupCount: 0,
        matches: [],
        maximumTotalPerkGroupCount: 0,
      }))

    expect(importedBackgroundFits.map((backgroundFit) => backgroundFit.backgroundId).sort()).toEqual(
      [...expectedOriginBackgroundIds].sort(),
    )
    expect(importedBackgroundFits.every((backgroundFit) => isOriginBackgroundFit(backgroundFit)))
      .toBe(true)
    expect(
      importedBackgroundFits.every(
        (backgroundFit) => getOriginBackgroundPillLabel(backgroundFit) !== null,
      ),
    ).toBe(true)
  })
})
