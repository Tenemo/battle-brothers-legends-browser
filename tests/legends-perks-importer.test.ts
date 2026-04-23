import path from 'node:path'
import { beforeAll, describe, expect, test } from 'vitest'
import {
  createDataset,
  createTechnicalNameMappings,
} from '../scripts/legends-perks-importer.mjs'
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

  test('parses local tree placement and background dynamic sources', () => {
    const clarity = dataset.perks.find((perk) => perk.perkConstName === 'LegendClarity')
    const beastSlayerBackground = dataset.backgroundFitBackgrounds.find(
      (background) => background.backgroundId === 'background.beast_slayer',
    )

    expect(clarity).toMatchObject({
      groupNames: ['Traits'],
      perkName: 'Clarity',
      placements: [
        {
          categoryName: 'Traits',
          tier: 5,
          treeName: 'Calm',
        },
      ],
      primaryGroupName: 'Traits',
    })

    expect(clarity?.backgroundSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundId: 'background.beast_slayer',
          backgroundName: 'Beast Slayer',
          categoryName: 'Traits',
          chance: null,
          minimumTrees: 7,
          treeName: 'Calm',
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
            minimumTrees: 2,
            treeIds: ['BeastTree'],
          }),
          Traits: expect.objectContaining({
            chance: null,
            minimumTrees: 7,
            treeIds: ['CalmTree'],
          }),
          Weapon: expect.objectContaining({
            chance: null,
            minimumTrees: 8,
            treeIds: [],
          }),
        }),
      }),
    )
  })

  test('merges perk string overrides from hooks after the base perk strings file', () => {
    const clarity = dataset.perks.find((perk) => perk.perkConstName === 'LegendClarity')

    expect(clarity?.descriptionParagraphs).toEqual([
      'The hook override replaces the base string.',
      'Passive: â€¢ Gain calm certainty from the hook override.',
    ])
    expect(clarity?.sourceFilePaths).toEqual(
      expect.arrayContaining([
        'tests/fixtures/legends-reference/mod_legends/!!config/perk_strings.nut',
        'tests/fixtures/legends-reference/mod_legends/hooks/config/perk_strings.nut',
      ]),
    )
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

  test('parses favored enemy targets, scaling values, and entity names from the local files', () => {
    const favoredEnemyBeast = dataset.perks.find(
      (perk) => perk.perkConstName === 'LegendFavouredEnemyBeast',
    )

    expect(favoredEnemyBeast).toMatchObject({
      groupNames: ['Enemy'],
      perkName: 'Favoured Enemy - Beasts',
      placements: [
        {
          categoryName: 'Enemy',
          tier: 3,
          treeName: 'Beasts',
        },
      ],
    })
    expect(favoredEnemyBeast?.favoredEnemyTargets).toEqual([
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
      groupNames: ['Weapon'],
      id: 'perk.mastery.axe',
      perkName: 'Axe Mastery',
      placements: [
        {
          categoryName: 'Weapon',
          tier: 3,
          treeName: 'Axe',
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
    const favoredEnemyBeast = dataset.perks.find(
      (perk) => perk.perkConstName === 'LegendFavouredEnemyBeast',
    )
    const peaceful = dataset.perks.find((perk) => perk.perkConstName === 'LegendPeaceful')

    expect(favoredEnemyBeast?.scenarioSources).toEqual([
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

  test('builds exact technical name mappings from the locally parsed data', () => {
    const technicalNameMappings = createTechnicalNameMappings(dataset)

    expect(technicalNameMappings.labelsByTechnicalName).toMatchObject({
      CalmTree: 'Calm',
      LegendBear: 'Bear',
      LegendClarity: 'Clarity',
      'perk.mastery.axe': 'Axe Mastery',
      SpecAxe: 'Axe Mastery',
      'scenario.beast_hunters': 'Beast Slayers',
    })
    expect(technicalNameMappings.labelsByTechnicalName).not.toHaveProperty('onBuildPerkTree')
  })

  test('extracts class-to-weapon dependency rules from the dynamic perk tree builder', () => {
    expect(dataset.backgroundFitRules.classWeaponDependencies).toEqual([
      {
        classTreeId: 'MilitiaClassTree',
        weaponTreeId: 'AxeTree',
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
            treeIds: ['BeastTree'],
          }),
          Traits: expect.objectContaining({
            treeIds: ['CalmTree'],
          }),
          Weapon: expect.objectContaining({
            treeIds: ['AxeTree'],
          }),
        }),
        sourceFilePath:
          'tests/fixtures/legends-reference/scripts/skills/backgrounds/legend_gladiator_prizefighter_background.nut',
      }),
    )
    expect(legionaryBackground).toEqual(
      expect.objectContaining({
        backgroundId: 'background.legend_legionary',
        backgroundName: 'Legionary',
        sourceFilePath:
          'tests/fixtures/legends-reference/scripts/skills/backgrounds/legend_legionary_background.nut',
      }),
    )

    expect(clarity?.backgroundSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundId: 'legend_gladiator_prizefighter_background',
          backgroundName: 'Gladiator Prizefighter',
          sourceFilePath:
            'tests/fixtures/legends-reference/scripts/skills/backgrounds/legend_gladiator_prizefighter_background.nut',
          treeName: 'Calm',
        }),
      ]),
    )
    expect(axeMastery?.backgroundSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundId: 'legend_gladiator_prizefighter_background',
          backgroundName: 'Gladiator Prizefighter',
          treeName: 'Axe',
        }),
        expect.objectContaining({
          backgroundId: 'background.legend_legionary',
          backgroundName: 'Legionary',
          treeName: 'Axe',
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
        perk.backgroundSources.some((backgroundSource) => backgroundSource.backgroundName === 'Dormant'),
      ),
    ).toBe(false)
  })
})
