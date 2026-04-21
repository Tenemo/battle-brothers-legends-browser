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

    expect(clarity?.backgroundSources).toEqual([
      expect.objectContaining({
        backgroundId: 'background.beast_slayer',
        backgroundName: 'Beast Slayer',
        categoryName: 'Traits',
        chance: null,
        minimumTrees: 7,
        treeName: 'Calm',
      }),
    ])
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
      'scenario.beast_hunters': 'Beast Slayers',
    })
    expect(technicalNameMappings.labelsByTechnicalName).not.toHaveProperty('onBuildPerkTree')
  })
})
