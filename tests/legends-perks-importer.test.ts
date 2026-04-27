import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { beforeAll, describe, expect, test } from 'vitest'
import { createDataset, createImporterDiagnostics } from '../scripts/legends-perks-importer.mjs'
import type { LegendsPerksDataset } from '../src/types/legends-perks'

const fixtureReferenceRootDirectoryPath = path.resolve(
  process.cwd(),
  'tests',
  'fixtures',
  'legends-reference',
  'mod_legends',
)

describe('legends perks importer', () => {
  let dataset: LegendsPerksDataset

  beforeAll(async () => {
    dataset = await createDataset(fixtureReferenceRootDirectoryPath)
  })

  test('parses local perk group placement and background dynamic sources', () => {
    const clarity = dataset.perks.find((perk) => perk.perkConstName === 'LegendClarity')
    const beastSlayerBackground = dataset.backgroundFitBackgrounds.find(
      (background) => background.backgroundId === 'background.beast_slayer',
    )

    expect(clarity).toMatchObject({
      categoryNames: ['Traits'],
      perkName: 'Clarity',
      placements: [
        {
          categoryName: 'Traits',
          tier: 5,
          perkGroupName: 'Calm',
        },
      ],
      primaryCategoryName: 'Traits',
    })

    expect(clarity?.backgroundSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundId: 'background.beast_slayer',
          backgroundName: 'Beast Slayer',
          categoryName: 'Traits',
          chance: null,
          minimumPerkGroups: 7,
          perkGroupName: 'Calm',
        }),
      ]),
    )

    expect(beastSlayerBackground).toEqual(
      expect.objectContaining({
        backgroundId: 'background.beast_slayer',
        backgroundName: 'Beast Slayer',
        categories: expect.objectContaining({
          Enemy: expect.objectContaining({
            chance: 0.05,
            minimumPerkGroups: 2,
            perkGroupIds: ['BeastTree'],
          }),
          Traits: expect.objectContaining({
            chance: null,
            minimumPerkGroups: 7,
            perkGroupIds: ['CalmTree'],
          }),
          Weapon: expect.objectContaining({
            chance: null,
            minimumPerkGroups: 8,
            perkGroupIds: [],
          }),
        }),
        iconPath: 'ui/backgrounds/background_57.png',
      }),
    )
  })

  test('merges perk string overrides from hooks after the base perk strings file', () => {
    const clarity = dataset.perks.find((perk) => perk.perkConstName === 'LegendClarity')

    expect(clarity?.descriptionParagraphs).toEqual([
      'The hook override replaces the base string.',
      'Passive: â€¢ Gain calm certainty from the hook override.',
    ])
    expect(dataset.sourceFiles).toEqual(
      expect.arrayContaining([
        {
          path: 'tests/fixtures/legends-reference/mod_legends/!!config/perk_strings.nut',
          role: 'perk strings',
        },
        {
          path: 'tests/fixtures/legends-reference/mod_legends/hooks/config/perk_strings.nut',
          role: 'perk strings',
        },
      ]),
    )
  })

  test('parses favoured enemy targets, scaling values, and entity names from the local files', () => {
    const favouredEnemyBeast = dataset.perks.find(
      (perk) => perk.perkConstName === 'LegendFavouredEnemyBeast',
    )

    expect(favouredEnemyBeast).toMatchObject({
      categoryNames: ['Enemy'],
      perkName: 'Favoured Enemy - Beasts',
      placements: [
        {
          categoryName: 'Enemy',
          tier: 3,
          perkGroupName: 'Beasts',
        },
      ],
    })
    expect(favouredEnemyBeast?.favouredEnemyTargets).toEqual([
      {
        entityConstName: 'LegendBear',
        entityName: 'Bear',
        killsPerPercentBonus: 2,
      },
      {
        entityConstName: 'Spider',
        entityName: 'Spider',
        killsPerPercentBonus: 8,
      },
    ])
  })

  test('normalizes fallback mastery perk names when the source strings only define descriptions', () => {
    const axeMastery = dataset.perks.find((perk) => perk.perkConstName === 'SpecAxe')

    expect(axeMastery).toMatchObject({
      categoryNames: ['Weapon'],
      id: 'perk.mastery.axe',
      perkName: 'Axe Mastery',
      placements: [
        {
          categoryName: 'Weapon',
          tier: 3,
          perkGroupName: 'Axe',
        },
      ],
    })
    expect(axeMastery?.descriptionParagraphs).toEqual([
      'Master combat with axes and destroying shields.',
      'Passive: â€¢ Skills build up less fatigue.',
      'â€¢ Split Shield deals more damage and Round Swing gains accuracy.',
    ])
  })

  test('parses direct and random scenario overlays plus local source provenance', () => {
    const favouredEnemyBeast = dataset.perks.find(
      (perk) => perk.perkConstName === 'LegendFavouredEnemyBeast',
    )
    const peaceful = dataset.perks.find((perk) => perk.perkConstName === 'LegendPeaceful')

    expect(favouredEnemyBeast?.scenarioSources).toEqual([
      expect.objectContaining({
        candidatePerkNames: ['Favoured Enemy - Beasts', 'Favoured Enemy - Occult'],
        grantType: 'random-pool',
        scenarioId: 'scenario.beast_hunters',
        scenarioName: 'Beast Slayers',
        sourceMethodName: 'onBuildPerkTree',
      }),
      expect.objectContaining({
        candidatePerkNames: ['Favoured Enemy - Beasts'],
        grantType: 'direct',
        scenarioId: 'scenario.lone_wolf',
        scenarioName: 'Lone Wolf',
        sourceMethodName: 'direct grant',
      }),
    ])

    expect(peaceful?.scenarioSources).toEqual([
      expect.objectContaining({
        candidatePerkNames: ['Peaceful'],
        grantType: 'direct',
        scenarioId: 'scenario.trader',
        scenarioName: 'Trader',
        sourceMethodName: 'onBuildPerkTree',
      }),
    ])

    expect(dataset.referenceRoot).toBe('tests/fixtures/legends-reference/mod_legends')
    expect(dataset.referenceVersion).toBe('legends-reference')
    expect(dataset.sourceFiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'tests/fixtures/legends-reference/mod_legends/!!config/perks_defs.nut',
          role: 'perk definitions',
        }),
        expect.objectContaining({
          path: 'tests/fixtures/legends-reference/mod_legends/hooks/scenarios/world/beast_hunters_scenario.nut',
          role: 'scenario perk sources',
        }),
      ]),
    )
  })

  test('extracts class-to-weapon dependency rules from the dynamic perk group builder', () => {
    expect(dataset.backgroundFitRules.classWeaponDependencies).toEqual([
      {
        classPerkGroupId: 'MilitiaClassTree',
        weaponPerkGroupId: 'AxeTree',
      },
    ])
  })

  test('adds script-only playable backgrounds and falls back to the script id when m.ID is missing', () => {
    const clarity = dataset.perks.find((perk) => perk.perkConstName === 'LegendClarity')
    const axeMastery = dataset.perks.find((perk) => perk.perkConstName === 'SpecAxe')
    const prizefighterBackground = dataset.backgroundFitBackgrounds.find(
      (background) => background.backgroundId === 'legend_gladiator_prizefighter_background',
    )
    const legionaryBackground = dataset.backgroundFitBackgrounds.find(
      (background) => background.backgroundId === 'background.legend_legionary',
    )

    expect(prizefighterBackground).toEqual(
      expect.objectContaining({
        backgroundId: 'legend_gladiator_prizefighter_background',
        backgroundName: 'Gladiator Prizefighter',
        categories: expect.objectContaining({
          Enemy: expect.objectContaining({
            perkGroupIds: ['BeastTree'],
          }),
          Traits: expect.objectContaining({
            perkGroupIds: ['CalmTree'],
          }),
          Weapon: expect.objectContaining({
            perkGroupIds: ['AxeTree'],
          }),
        }),
        iconPath: 'ui/backgrounds/background_gladiator_prizefighter.png',
        sourceFilePath:
          'tests/fixtures/legends-reference/scripts/skills/backgrounds/legend_gladiator_prizefighter_background.nut',
      }),
    )
    expect(legionaryBackground).toEqual(
      expect.objectContaining({
        backgroundId: 'background.legend_legionary',
        backgroundName: 'Legionary',
        iconPath: 'ui/backgrounds/background_puppet.png',
        sourceFilePath:
          'tests/fixtures/legends-reference/scripts/skills/backgrounds/legend_legionary_background.nut',
      }),
    )

    expect(clarity?.backgroundSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundId: 'legend_gladiator_prizefighter_background',
          backgroundName: 'Gladiator Prizefighter',
          perkGroupName: 'Calm',
        }),
      ]),
    )
    expect(axeMastery?.backgroundSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundId: 'legend_gladiator_prizefighter_background',
          backgroundName: 'Gladiator Prizefighter',
          perkGroupName: 'Axe',
        }),
        expect.objectContaining({
          backgroundId: 'background.legend_legionary',
          backgroundName: 'Legionary',
          perkGroupName: 'Axe',
        }),
      ]),
    )
  })

  test('keeps dormant script backgrounds out of the dataset when they are only commented out', () => {
    expect(
      dataset.backgroundFitBackgrounds.find(
        (background) => background.backgroundId === 'background.legend_dormant',
      ),
    ).toBeUndefined()
    expect(
      dataset.perks.some((perk) =>
        perk.backgroundSources.some(
          (backgroundSource) => backgroundSource.backgroundName === 'Dormant',
        ),
      ),
    ).toBe(false)
  })

  test('ignores commented-out assignments and calls in scanned Squirrel bodies', async () => {
    const temporaryRootDirectoryPath = path.join(
      process.cwd(),
      'node_modules',
      '.tmp',
      'legends-importer-comment-safety',
    )

    await mkdir(temporaryRootDirectoryPath, { recursive: true })

    const temporaryFixtureDirectoryPath = await mkdtemp(
      path.join(temporaryRootDirectoryPath, 'reference-'),
    )

    try {
      const temporaryReferenceDirectoryPath = path.join(
        temporaryFixtureDirectoryPath,
        'legends-reference',
      )

      await cp(path.dirname(fixtureReferenceRootDirectoryPath), temporaryReferenceDirectoryPath, {
        recursive: true,
      })

      const beastHunterBackgroundFilePath = path.join(
        temporaryReferenceDirectoryPath,
        'mod_legends',
        'hooks',
        'skills',
        'backgrounds',
        'beast_hunter_background.nut',
      )
      const traderScenarioFilePath = path.join(
        temporaryReferenceDirectoryPath,
        'mod_legends',
        'hooks',
        'scenarios',
        'world',
        'trader_scenario.nut',
      )
      const beastHunterBackgroundSource = await readFile(beastHunterBackgroundFilePath, 'utf8')
      const traderScenarioSource = await readFile(traderScenarioFilePath, 'utf8')

      await writeFile(
        beastHunterBackgroundFilePath,
        beastHunterBackgroundSource.replace(
          '  {\n    this.character_background.create();',
          [
            '  {',
            '    // this.m.ID = "background.commented_out";',
            '    // this.m.Name = "Commented out background";',
            '    // this.m.PerkTreeDynamicMins.Enemy = 99;',
            '    /*',
            '    this.m.PerkTreeDynamic = {',
            '      Weapon = [::Const.Perks.AxeTree],',
            '      Defense = [],',
            '      Traits = [],',
            '      Enemy = [],',
            '      Class = [],',
            '      Profession = [],',
            '      Magic = []',
            '    };',
            '    */',
            '    this.character_background.create();',
          ].join('\n'),
        ),
        'utf8',
      )
      await writeFile(
        traderScenarioFilePath,
        traderScenarioSource.replace(
          '    this.addScenarioPerk(_background, ::Const.Perks.PerkDefs.LegendPeaceful, 0, true);',
          [
            '    // this.addScenarioPerk(_background, ::Const.Perks.PerkDefs.LegendFavouredEnemyBeast, 0, true);',
            '    this.addScenarioPerk(_background, ::Const.Perks.PerkDefs.LegendPeaceful, 0, true);',
          ].join('\n'),
        ),
        'utf8',
      )

      const datasetWithCommentedSource = await createDataset(
        path.join(temporaryReferenceDirectoryPath, 'mod_legends'),
      )
      const beastSlayerBackground = datasetWithCommentedSource.backgroundFitBackgrounds.find(
        (background) => background.backgroundId === 'background.beast_slayer',
      )
      const favouredEnemyBeast = datasetWithCommentedSource.perks.find(
        (perk) => perk.perkConstName === 'LegendFavouredEnemyBeast',
      )
      const peaceful = datasetWithCommentedSource.perks.find(
        (perk) => perk.perkConstName === 'LegendPeaceful',
      )

      expect(beastSlayerBackground).toEqual(
        expect.objectContaining({
          backgroundId: 'background.beast_slayer',
          backgroundName: 'Beast Slayer',
          categories: expect.objectContaining({
            Enemy: expect.objectContaining({
              minimumPerkGroups: 2,
              perkGroupIds: ['BeastTree'],
            }),
            Weapon: expect.objectContaining({
              perkGroupIds: [],
            }),
          }),
        }),
      )
      expect(
        datasetWithCommentedSource.backgroundFitBackgrounds.some(
          (background) => background.backgroundId === 'background.commented_out',
        ),
      ).toBe(false)
      expect(favouredEnemyBeast?.scenarioSources).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            scenarioId: 'scenario.trader',
          }),
        ]),
      )
      expect(peaceful?.scenarioSources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            scenarioId: 'scenario.trader',
            scenarioName: 'Trader',
          }),
        ]),
      )
    } finally {
      await rm(temporaryFixtureDirectoryPath, { force: true, recursive: true })
    }
  })

  test('reports skipped parser failures without dropping other scenario data', async () => {
    const temporaryRootDirectoryPath = path.join(
      process.cwd(),
      'node_modules',
      '.tmp',
      'legends-importer-diagnostics',
    )

    await mkdir(temporaryRootDirectoryPath, { recursive: true })

    const temporaryFixtureDirectoryPath = await mkdtemp(
      path.join(temporaryRootDirectoryPath, 'reference-'),
    )

    try {
      const temporaryReferenceDirectoryPath = path.join(
        temporaryFixtureDirectoryPath,
        'legends-reference',
      )

      await cp(path.dirname(fixtureReferenceRootDirectoryPath), temporaryReferenceDirectoryPath, {
        recursive: true,
      })

      const traderScenarioFilePath = path.join(
        temporaryReferenceDirectoryPath,
        'mod_legends',
        'hooks',
        'scenarios',
        'world',
        'trader_scenario.nut',
      )
      const traderScenarioSource = await readFile(traderScenarioFilePath, 'utf8')

      await writeFile(
        traderScenarioFilePath,
        traderScenarioSource.replace(
          '  o.onBuildPerkTree <- function ( _background )\n  {',
          [
            '  o.onBuildPerkTree <- function ( _background )',
            '  {',
            '    local brokenDiagnosticValue = [;',
            '    this.addScenarioPerk(_background, [;, 0, true);',
          ].join('\n'),
        ),
        'utf8',
      )

      const diagnostics = createImporterDiagnostics()
      const datasetWithWarnings = await createDataset(
        path.join(temporaryReferenceDirectoryPath, 'mod_legends'),
        { diagnostics },
      )
      const peaceful = datasetWithWarnings.perks.find(
        (perk) => perk.perkConstName === 'LegendPeaceful',
      )

      expect(peaceful?.scenarioSources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            scenarioId: 'scenario.trader',
            scenarioName: 'Trader',
            sourceMethodName: 'onBuildPerkTree',
          }),
        ]),
      )
      expect(diagnostics.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: 'parse-warning',
            parserContext: 'local brokenDiagnosticValue assignment',
            sourceFilePath: expect.stringContaining('trader_scenario.nut'),
          }),
          expect.objectContaining({
            kind: 'parse-warning',
            parserContext: 'onBuildPerkTree scenario perk argument',
            sourceFilePath: expect.stringContaining('trader_scenario.nut'),
          }),
        ]),
      )
    } finally {
      await rm(temporaryFixtureDirectoryPath, { force: true, recursive: true })
    }
  })
})
