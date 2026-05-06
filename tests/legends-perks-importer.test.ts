import {
  cp as copyDirectory,
  mkdir,
  mkdtemp,
  readFile,
  rm as removePath,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import { beforeAll, describe, expect, test } from 'vitest'
import { createDataset, createImporterDiagnostics } from '../scripts/legends-perks-importer.ts'
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
    expect(
      clarity?.placements.some((placement) => Object.hasOwn(placement, 'perkGroupDescriptions')),
    ).toBe(false)
    expect(clarity?.searchText).not.toContain('is calm')

    expect(clarity?.backgroundSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundName: 'Beast Slayer',
          perkGroupName: 'Calm',
          probability: expect.any(Number),
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
        veteranPerkLevelInterval: 4,
      }),
    )
  })

  test('imports background detail metadata from create bodies and static trait grants', () => {
    const beastSlayerBackground = dataset.backgroundFitBackgrounds.find(
      (background) => background.backgroundId === 'background.beast_slayer',
    )
    const prizefighterBackground = dataset.backgroundFitBackgrounds.find(
      (background) => background.backgroundId === 'legend_gladiator_prizefighter_background',
    )

    expect(beastSlayerBackground).toEqual(
      expect.objectContaining({
        backgroundTypeNames: ['Crusader', 'Educated', 'Ranger'],
        dailyCost: 6,
        excludedTalentAttributeNames: ['Ranged skill'],
        excludedTraits: [
          {
            description: 'Afraid of walking dead.',
            iconPath: 'ui/traits/trait_icon_50.png',
            traitName: 'Fear of Undead',
          },
        ],
        excludedTraitNames: ['Fear of Undead'],
        guaranteedTraits: [
          {
            description: 'Has no firm loyalty.',
            iconPath: 'ui/traits/disloyal_trait.png',
            traitName: 'Disloyal',
          },
          {
            description: 'Moves with unusual speed.',
            iconPath: 'ui/traits/trait_icon_32.png',
            traitName: 'Quick',
          },
        ],
        guaranteedTraitNames: ['Disloyal', 'Quick'],
        startingAttributeRanges: [
          {
            attributeKey: 'Hitpoints',
            attributeName: 'Hitpoints',
            iconPath: 'ui/icons/health_va11.png',
            maximum: 63,
            minimum: 51,
            modifierMaximum: 3,
            modifierMinimum: 1,
          },
          {
            attributeKey: 'Bravery',
            attributeName: 'Resolve',
            iconPath: 'ui/icons/bravery_va11.png',
            maximum: 42,
            minimum: 39,
            modifierMaximum: 2,
            modifierMinimum: -1,
          },
          {
            attributeKey: 'Stamina',
            attributeName: 'Fatigue',
            iconPath: 'ui/icons/fatigue_va11.png',
            maximum: 114,
            minimum: 104,
            modifierMaximum: 4,
            modifierMinimum: 4,
          },
          {
            attributeKey: 'Initiative',
            attributeName: 'Initiative',
            iconPath: 'ui/icons/initiative_va11.png',
            maximum: 112,
            minimum: 110,
            modifierMaximum: 12,
            modifierMinimum: 10,
          },
          {
            attributeKey: 'MeleeSkill',
            attributeName: 'Melee skill',
            iconPath: 'ui/icons/melee_skill_va11.png',
            maximum: 55,
            minimum: 53,
            modifierMaximum: 5,
            modifierMinimum: 3,
          },
          {
            attributeKey: 'RangedSkill',
            attributeName: 'Ranged skill',
            iconPath: 'ui/icons/ranged_skill_va11.png',
            maximum: 40,
            minimum: 40,
            modifierMaximum: 0,
            modifierMinimum: 0,
          },
          {
            attributeKey: 'MeleeDefense',
            attributeName: 'Melee defense',
            iconPath: 'ui/icons/melee_defense_va11.png',
            maximum: 1,
            minimum: -2,
            modifierMaximum: 1,
            modifierMinimum: -2,
          },
          {
            attributeKey: 'RangedDefense',
            attributeName: 'Ranged defense',
            iconPath: 'ui/icons/ranged_defense_va11.png',
            maximum: 2,
            minimum: 0,
            modifierMaximum: 2,
            modifierMinimum: 0,
          },
        ],
      }),
    )
    expect(beastSlayerBackground?.campResourceModifiers).toEqual(
      expect.arrayContaining([
        {
          group: 'capacity',
          label: 'Tools and supplies capacity',
          modifierKey: 'ArmorParts',
          value: 13,
          valueKind: 'flat',
        },
        {
          group: 'skill',
          label: 'Repairing',
          modifierKey: 'Repair',
          value: 0.3,
          valueKind: 'percent',
        },
        {
          group: 'terrain',
          label: 'Plains',
          modifierKey: 'Terrain.2',
          value: 0.15,
          valueKind: 'percent',
        },
        {
          group: 'terrain',
          label: 'Hills',
          modifierKey: 'Terrain.4',
          value: -0.05,
          valueKind: 'percent',
        },
      ]),
    )
    expect(
      beastSlayerBackground?.campResourceModifiers.some(
        (modifier) => modifier.modifierKey === 'Barter',
      ),
    ).toBe(false)

    expect(prizefighterBackground).toEqual(
      expect.objectContaining({
        backgroundTypeNames: ['Combat', 'Lowborn'],
        dailyCost: 12,
        excludedTalentAttributeNames: ['Fatigue', 'Hitpoints'],
        excludedTraits: [],
        excludedTraitNames: [],
        guaranteedTraits: [
          {
            description: 'Learns quickly.',
            iconPath: 'ui/traits/trait_icon_11.png',
            traitName: 'Bright',
          },
        ],
        guaranteedTraitNames: ['Bright'],
      }),
    )
    expect(prizefighterBackground?.campResourceModifiers).toEqual(
      expect.arrayContaining([
        {
          group: 'capacity',
          label: 'Ammo capacity',
          modifierKey: 'Ammo',
          value: 21,
          valueKind: 'flat',
        },
        {
          group: 'skill',
          label: 'Training',
          modifierKey: 'Training',
          value: 0.1,
          valueKind: 'percent',
        },
      ]),
    )
  })

  test('fills hook-only background trait descriptions from vanilla trait metadata', async () => {
    const temporaryRootDirectoryPath = path.join(
      process.cwd(),
      'node_modules',
      '.tmp',
      'legends-importer-vanilla-traits',
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

      await copyDirectory(
        path.dirname(fixtureReferenceRootDirectoryPath),
        temporaryReferenceDirectoryPath,
        {
          recursive: true,
        },
      )

      const beastHunterBackgroundFilePath = path.join(
        temporaryReferenceDirectoryPath,
        'mod_legends',
        'hooks',
        'skills',
        'backgrounds',
        'beast_hunter_background.nut',
      )
      const beastHunterBackgroundSource = await readFile(beastHunterBackgroundFilePath, 'utf8')

      await writeFile(
        beastHunterBackgroundFilePath,
        beastHunterBackgroundSource.replace(
          '      ::Legends.Traits.getID(::Legends.Trait.FearUndead)\n    ];',
          [
            '      ::Legends.Traits.getID(::Legends.Trait.FearUndead),',
            '      ::Legends.Traits.getID(::Legends.Trait.Hesistant),',
            '      "hate undead",',
            '      "lucky_trait"',
            '    ];',
          ].join('\n'),
        ),
        'utf8',
      )

      const datasetWithVanillaTraits = await createDataset(
        path.join(temporaryReferenceDirectoryPath, 'mod_legends'),
      )
      const beastSlayerBackground = datasetWithVanillaTraits.backgroundFitBackgrounds.find(
        (background) => background.backgroundId === 'background.beast_slayer',
      )

      expect(beastSlayerBackground?.excludedTraits).toEqual([
        {
          description: 'Afraid of walking dead.',
          iconPath: 'ui/traits/trait_icon_50.png',
          traitName: 'Fear of Undead',
        },
        {
          description:
            "Some past event in this character's life has fueled a burning hatred for all things that refuse to stay six feet underground.",
          iconPath: 'ui/traits/trait_icon_50.png',
          traitName: 'Hate for Undead',
        },
        {
          description: 'Umm... well... maybe. This character is hesitant to act.',
          iconPath: 'ui/traits/trait_icon_25.png',
          traitName: 'Hesitant',
        },
        {
          description:
            "This character has a natural talent for getting out of harm's way in the last second.",
          iconPath: 'ui/traits/trait_icon_54.png',
          traitName: 'Lucky',
        },
      ])
      expect(beastSlayerBackground?.excludedTraitNames).toEqual([
        'Fear of Undead',
        'Hate for Undead',
        'Hesitant',
        'Lucky',
      ])
    } finally {
      await removePath(temporaryFixtureDirectoryPath, { force: true, recursive: true })
    }
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

  test('applies fixed origin roster veteran intervals without changing normal backgrounds', () => {
    const loneWolfBackground = dataset.backgroundFitBackgrounds.find(
      (background) => background.backgroundId === 'background.legend_lonewolf',
    )
    const beastSlayerBackground = dataset.backgroundFitBackgrounds.find(
      (background) => background.backgroundId === 'background.beast_slayer',
    )
    const valaBackground = dataset.backgroundFitBackgrounds.find(
      (background) => background.backgroundId === 'background.legend_vala',
    )

    expect(loneWolfBackground).toEqual(
      expect.objectContaining({
        backgroundId: 'background.legend_lonewolf',
        backgroundName: 'Lone Wolf',
        sourceFilePath:
          'tests/fixtures/legends-reference/scripts/skills/backgrounds/legend_lonewolf_background.nut',
        veteranPerkLevelInterval: 2,
      }),
    )
    expect(valaBackground).toEqual(
      expect.objectContaining({
        backgroundId: 'background.legend_vala',
        backgroundName: 'Vala',
        sourceFilePath:
          'tests/fixtures/legends-reference/scripts/skills/backgrounds/legend_vala_background.nut',
        veteranPerkLevelInterval: 2,
      }),
    )
    expect(beastSlayerBackground).toEqual(
      expect.objectContaining({
        backgroundId: 'background.beast_slayer',
        backgroundName: 'Beast Slayer',
        veteranPerkLevelInterval: 4,
      }),
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
        veteranPerkLevelInterval: 3,
      }),
    )
    expect(legionaryBackground).toEqual(
      expect.objectContaining({
        backgroundId: 'background.legend_legionary',
        backgroundName: 'Legionary',
        iconPath: 'ui/backgrounds/background_puppet.png',
        sourceFilePath:
          'tests/fixtures/legends-reference/scripts/skills/backgrounds/legend_legionary_background.nut',
        veteranPerkLevelInterval: 4,
      }),
    )

    expect(clarity?.backgroundSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundName: 'Gladiator Prizefighter',
          perkGroupName: 'Calm',
          probability: expect.any(Number),
        }),
      ]),
    )
    expect(axeMastery?.backgroundSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundName: 'Gladiator Prizefighter',
          perkGroupName: 'Axe',
          probability: expect.any(Number),
        }),
        expect.objectContaining({
          backgroundName: 'Legionary',
          perkGroupName: 'Axe',
          probability: expect.any(Number),
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

      await copyDirectory(
        path.dirname(fixtureReferenceRootDirectoryPath),
        temporaryReferenceDirectoryPath,
        {
          recursive: true,
        },
      )

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
            '    // this.getContainer().getActor().setVeteranPerks(2);',
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
            '    this.getContainer().getActor().setVeteranPerks(2);',
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
          veteranPerkLevelInterval: 4,
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
      await removePath(temporaryFixtureDirectoryPath, { force: true, recursive: true })
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

      await copyDirectory(
        path.dirname(fixtureReferenceRootDirectoryPath),
        temporaryReferenceDirectoryPath,
        {
          recursive: true,
        },
      )

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
      await removePath(temporaryFixtureDirectoryPath, { force: true, recursive: true })
    }
  })
})
