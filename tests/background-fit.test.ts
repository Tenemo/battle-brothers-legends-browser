import { describe, expect, test } from 'vitest'
import {
  calculateBackgroundTreeProbabilities,
  createBackgroundFitEngine,
  getBuildTargetTrees,
} from '../src/lib/background-fit'
import type {
  LegendsBackgroundFitBackgroundDefinition,
  LegendsBackgroundFitCategoryDefinition,
  LegendsDynamicBackgroundCategoryName,
  LegendsPerkPlacement,
  LegendsPerkRecord,
  LegendsPerksDataset,
} from '../src/types/legends-perks'

function createPlacement({
  categoryName,
  treeId,
  treeName,
}: {
  categoryName: string
  treeId: string
  treeName: string
}): LegendsPerkPlacement {
  return {
    categoryName,
    sourceFilePath: `reference/${treeId}.nut`,
    tier: 1,
    treeAttributes: [],
    treeDescriptions: [treeName.toLowerCase()],
    treeIconPath: null,
    treeId,
    treeName,
  }
}

function createPerk({
  id,
  perkConstName,
  perkName,
  placements,
}: {
  id: string
  perkConstName: string
  perkName: string
  placements: LegendsPerkPlacement[]
}): LegendsPerkRecord {
  return {
    backgroundSources: [],
    descriptionParagraphs: [perkName],
    groupNames: [...new Set(placements.map((placement) => placement.categoryName))],
    iconPath: null,
    id,
    perkConstName,
    perkName,
    placements,
    primaryGroupName: placements[0]?.categoryName ?? 'Other',
    scenarioSources: [],
    scriptPath: null,
    searchText: `${perkName} ${placements.map((placement) => placement.treeName).join(' ')}`,
    sourceFilePaths: placements.map((placement) => placement.sourceFilePath),
  }
}

function createEmptyCategoryDefinitions(): Record<
  LegendsDynamicBackgroundCategoryName,
  LegendsBackgroundFitCategoryDefinition
> {
  return {
    Class: { chance: 0, minimumTrees: 0, treeIds: [] },
    Defense: { chance: null, minimumTrees: 0, treeIds: [] },
    Enemy: { chance: 0, minimumTrees: 0, treeIds: [] },
    Magic: { chance: 0, minimumTrees: 0, treeIds: [] },
    Profession: { chance: 0, minimumTrees: 0, treeIds: [] },
    Traits: { chance: null, minimumTrees: 0, treeIds: [] },
    Weapon: { chance: null, minimumTrees: 0, treeIds: [] },
  }
}

function createBackgroundDefinition({
  backgroundId,
  backgroundName,
  overrides,
}: {
  backgroundId: string
  backgroundName: string
  overrides: Partial<
    Record<LegendsDynamicBackgroundCategoryName, Partial<LegendsBackgroundFitCategoryDefinition>>
  >
}): LegendsBackgroundFitBackgroundDefinition {
  const categories = createEmptyCategoryDefinitions()

  for (const [categoryName, categoryOverride] of Object.entries(overrides)) {
    Object.assign(
      categories[categoryName as LegendsDynamicBackgroundCategoryName],
      categoryOverride,
    )
  }

  return {
    backgroundId,
    backgroundName,
    categories,
    sourceFilePath: `backgrounds/${backgroundId}.nut`,
  }
}

const samplePerks: LegendsPerkRecord[] = [
  createPerk({
    id: 'perk.weapon.axe_one',
    perkConstName: 'SpecAxeOne',
    perkName: 'Axe drill',
    placements: [createPlacement({ categoryName: 'Weapon', treeId: 'AxeTree', treeName: 'Axe' })],
  }),
  createPerk({
    id: 'perk.weapon.axe_two',
    perkConstName: 'SpecAxeTwo',
    perkName: 'Axe finish',
    placements: [createPlacement({ categoryName: 'Weapon', treeId: 'AxeTree', treeName: 'Axe' })],
  }),
  createPerk({
    id: 'perk.weapon.bow',
    perkConstName: 'SpecBow',
    perkName: 'Bow drill',
    placements: [createPlacement({ categoryName: 'Weapon', treeId: 'BowTree', treeName: 'Bow' })],
  }),
  createPerk({
    id: 'perk.defense.heavy',
    perkConstName: 'LegendHeavy',
    perkName: 'Heavy armor stance',
    placements: [
      createPlacement({
        categoryName: 'Defense',
        treeId: 'HeavyDefenseTree',
        treeName: 'Heavy armor',
      }),
    ],
  }),
  createPerk({
    id: 'perk.traits.calm',
    perkConstName: 'LegendCalm',
    perkName: 'Calm focus',
    placements: [createPlacement({ categoryName: 'Traits', treeId: 'CalmTree', treeName: 'Calm' })],
  }),
  createPerk({
    id: 'perk.traits.bold',
    perkConstName: 'LegendBold',
    perkName: 'Bold spirit',
    placements: [createPlacement({ categoryName: 'Traits', treeId: 'BoldTree', treeName: 'Bold' })],
  }),
  createPerk({
    id: 'perk.traits.lucky',
    perkConstName: 'LegendLucky',
    perkName: 'Lucky break',
    placements: [
      createPlacement({ categoryName: 'Traits', treeId: 'LuckyTree', treeName: 'Lucky' }),
    ],
  }),
  createPerk({
    id: 'perk.enemy.beasts',
    perkConstName: 'LegendEnemyBeasts',
    perkName: 'Favoured Enemy - Beasts',
    placements: [
      createPlacement({ categoryName: 'Enemy', treeId: 'BeastTree', treeName: 'Beasts' }),
    ],
  }),
  createPerk({
    id: 'perk.enemy.raiders',
    perkConstName: 'LegendEnemyRaiders',
    perkName: 'Favoured Enemy - Raiders',
    placements: [
      createPlacement({ categoryName: 'Enemy', treeId: 'RaiderTree', treeName: 'Raiders' }),
    ],
  }),
  createPerk({
    id: 'perk.enemy.occult',
    perkConstName: 'LegendEnemyOccult',
    perkName: 'Favoured Enemy - Occult',
    placements: [
      createPlacement({ categoryName: 'Enemy', treeId: 'OccultTree', treeName: 'Occult' }),
    ],
  }),
  createPerk({
    id: 'perk.class.militia',
    perkConstName: 'LegendMilitia',
    perkName: 'Militia drill',
    placements: [
      createPlacement({ categoryName: 'Class', treeId: 'MilitiaClassTree', treeName: 'Militia' }),
    ],
  }),
  createPerk({
    id: 'perk.class.archer',
    perkConstName: 'LegendArcher',
    perkName: 'Archer drill',
    placements: [
      createPlacement({ categoryName: 'Class', treeId: 'ArcherClassTree', treeName: 'Archer' }),
    ],
  }),
  createPerk({
    id: 'perk.profession.blacksmith',
    perkConstName: 'LegendBlacksmith',
    perkName: 'Blacksmith craft',
    placements: [
      createPlacement({
        categoryName: 'Profession',
        treeId: 'BlacksmithProfessionTree',
        treeName: 'Blacksmith',
      }),
    ],
  }),
  createPerk({
    id: 'perk.profession.scholar',
    perkConstName: 'LegendScholar',
    perkName: 'Scholar craft',
    placements: [
      createPlacement({
        categoryName: 'Profession',
        treeId: 'ScholarProfessionTree',
        treeName: 'Scholar',
      }),
    ],
  }),
  createPerk({
    id: 'perk.other.forceful',
    perkConstName: 'LegendForceful',
    perkName: 'Forceful stance',
    placements: [
      createPlacement({ categoryName: 'Other', treeId: 'ForcefulTree', treeName: 'Forceful' }),
    ],
  }),
]

const sampleDataset: LegendsPerksDataset = {
  backgroundFitBackgrounds: [
    createBackgroundDefinition({
      backgroundId: 'background.explicit_heavy',
      backgroundName: 'Heavy hand',
      overrides: {
        Defense: { minimumTrees: 1, treeIds: ['HeavyDefenseTree'] },
      },
    }),
    createBackgroundDefinition({
      backgroundId: 'background.traits_fill',
      backgroundName: 'Balanced scholar',
      overrides: {
        Traits: { minimumTrees: 2, treeIds: ['CalmTree'] },
      },
    }),
    createBackgroundDefinition({
      backgroundId: 'background.enemy_roll',
      backgroundName: 'Hunter',
      overrides: {
        Enemy: { chance: 0.5, minimumTrees: 1, treeIds: [] },
      },
    }),
    createBackgroundDefinition({
      backgroundId: 'background.class_roll',
      backgroundName: 'Militia captain',
      overrides: {
        Class: { chance: 1, minimumTrees: 0, treeIds: [] },
        Weapon: { minimumTrees: 1, treeIds: [] },
      },
    }),
    createBackgroundDefinition({
      backgroundId: 'background.profession_roll',
      backgroundName: 'Crafter',
      overrides: {
        Profession: { chance: 0.5, minimumTrees: 1, treeIds: [] },
      },
    }),
    createBackgroundDefinition({
      backgroundId: 'background.high_weight',
      backgroundName: 'Champion',
      overrides: {
        Weapon: { minimumTrees: 1, treeIds: ['AxeTree'] },
      },
    }),
    createBackgroundDefinition({
      backgroundId: 'background.low_weight',
      backgroundName: 'Champion',
      overrides: {
        Weapon: { minimumTrees: 1, treeIds: ['BowTree'] },
      },
    }),
  ],
  backgroundFitRules: {
    classWeaponDependencies: [
      {
        classTreeId: 'ArcherClassTree',
        weaponTreeId: 'BowTree',
      },
      {
        classTreeId: 'MilitiaClassTree',
        weaponTreeId: 'AxeTree',
      },
    ],
  },
  generatedAt: '2026-04-22T00:00:00.000Z',
  perkCount: samplePerks.length,
  perks: samplePerks,
  referenceRoot: 'tests/fixtures',
  referenceVersion: 'tests',
  sourceFiles: [],
  treeCount: 11,
}

describe('background fit', () => {
  test('derives shared supported targets and separates unsupported categories', () => {
    expect(getBuildTargetTrees([samplePerks[0], samplePerks[1], samplePerks[14]])).toEqual({
      supportedBuildTargetTrees: [
        {
          categoryName: 'Weapon',
          pickedPerkCount: 2,
          pickedPerkNames: ['Axe drill', 'Axe finish'],
          treeId: 'AxeTree',
          treeName: 'Axe',
        },
      ],
      unsupportedBuildTargetTrees: [
        {
          categoryName: 'Other',
          pickedPerkCount: 1,
          pickedPerkNames: ['Forceful stance'],
          treeId: 'ForcefulTree',
          treeName: 'Forceful',
        },
      ],
    })
  })

  test('keeps explicit trees guaranteed', () => {
    const probabilitiesByTreeId = calculateBackgroundTreeProbabilities(
      sampleDataset.backgroundFitBackgrounds[0],
      {
        classWeaponDependencyByClassTreeId: new Map(
          sampleDataset.backgroundFitRules.classWeaponDependencies.map((dependency) => [
            dependency.classTreeId,
            new Set([dependency.weaponTreeId]),
          ]),
        ),
        treeIdsByCategory: new Map([
          ['Class', ['ArcherClassTree', 'MilitiaClassTree']],
          ['Defense', ['HeavyDefenseTree']],
          ['Enemy', ['BeastTree', 'OccultTree', 'RaiderTree']],
          ['Magic', []],
          ['Profession', ['BlacksmithProfessionTree', 'ScholarProfessionTree']],
          ['Traits', ['BoldTree', 'CalmTree', 'LuckyTree']],
          ['Weapon', ['AxeTree', 'BowTree']],
        ]),
      },
    )

    expect(probabilitiesByTreeId.get('HeavyDefenseTree')).toBe(1)
  })

  test('treats duplicate explicit background trees as one unique perk group', () => {
    const duplicateExplicitBackground = createBackgroundDefinition({
      backgroundId: 'background.duplicate_explicit',
      backgroundName: 'Duplicate explicit',
      overrides: {
        Weapon: { minimumTrees: 2, treeIds: ['AxeTree', 'AxeTree'] },
      },
    })
    const probabilitiesByTreeId = calculateBackgroundTreeProbabilities(
      duplicateExplicitBackground,
      {
        classWeaponDependencyByClassTreeId: new Map(),
        treeIdsByCategory: new Map([
          ['Class', []],
          ['Defense', []],
          ['Enemy', []],
          ['Magic', []],
          ['Profession', []],
          ['Traits', []],
          ['Weapon', ['AxeTree', 'BowTree']],
        ]),
      },
    )
    const engine = createBackgroundFitEngine({
      ...sampleDataset,
      backgroundFitBackgrounds: [duplicateExplicitBackground],
    })
    const duplicateExplicitFit = engine.getBackgroundFitView([samplePerks[0], samplePerks[2]])
      .rankedBackgroundFits[0]

    expect(probabilitiesByTreeId.get('AxeTree')).toBe(1)
    expect(probabilitiesByTreeId.get('BowTree')).toBe(1)
    expect(duplicateExplicitFit.maximumTotalGroupCount).toBe(2)
    expect(duplicateExplicitFit.matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ treeId: 'AxeTree' }),
        expect.objectContaining({ treeId: 'BowTree' }),
      ]),
    )
  })

  test('uses exact fill-to-minimum probabilities for deterministic categories', () => {
    const engine = createBackgroundFitEngine(sampleDataset)
    const backgroundFitView = engine.getBackgroundFitView([
      samplePerks[3],
      samplePerks[4],
      samplePerks[5],
    ])
    const balancedScholar = backgroundFitView.rankedBackgroundFits.find(
      (backgroundFit) => backgroundFit.backgroundId === 'background.traits_fill',
    )

    expect(balancedScholar?.matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          isGuaranteed: true,
          probability: 1,
          treeId: 'CalmTree',
        }),
        expect.objectContaining({
          isGuaranteed: false,
          probability: 0.5,
          treeId: 'BoldTree',
        }),
      ]),
    )
  })

  test('uses exact chance-attempt probabilities for enemy and profession rolls', () => {
    const engine = createBackgroundFitEngine(sampleDataset)
    const enemyRollFit = engine
      .getBackgroundFitView([samplePerks[7], samplePerks[8], samplePerks[9]])
      .rankedBackgroundFits.find(
        (backgroundFit) => backgroundFit.backgroundId === 'background.enemy_roll',
      )
    const professionRollFit = engine
      .getBackgroundFitView([samplePerks[12], samplePerks[13]])
      .rankedBackgroundFits.find(
        (backgroundFit) => backgroundFit.backgroundId === 'background.profession_roll',
      )

    expect(enemyRollFit?.matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ probability: 1 / 3, treeId: 'BeastTree' }),
        expect.objectContaining({ probability: 1 / 3, treeId: 'OccultTree' }),
        expect.objectContaining({ probability: 1 / 3, treeId: 'RaiderTree' }),
      ]),
    )
    expect(professionRollFit?.matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ probability: 0.5, treeId: 'BlacksmithProfessionTree' }),
        expect.objectContaining({ probability: 0.5, treeId: 'ScholarProfessionTree' }),
      ]),
    )
  })

  test('changes class probabilities based on the exact weapon trees a background can produce', () => {
    const engine = createBackgroundFitEngine(sampleDataset)
    const classRollFit = engine
      .getBackgroundFitView([samplePerks[10], samplePerks[11]])
      .rankedBackgroundFits.find(
        (backgroundFit) => backgroundFit.backgroundId === 'background.class_roll',
      )

    expect(classRollFit?.matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ probability: 0.5, treeId: 'ArcherClassTree' }),
        expect.objectContaining({ probability: 0.5, treeId: 'MilitiaClassTree' }),
      ]),
    )
  })

  test('ranks backgrounds by guaranteed covered picked perks first and disambiguates duplicate names', () => {
    const engine = createBackgroundFitEngine(sampleDataset)
    const backgroundFitView = engine.getBackgroundFitView([
      samplePerks[0],
      samplePerks[1],
      samplePerks[2],
    ])

    expect(backgroundFitView.rankedBackgroundFits.slice(0, 2)).toEqual([
      expect.objectContaining({
        backgroundId: 'background.high_weight',
        backgroundName: 'Champion',
        disambiguator: 'background.high_weight',
        matches: [expect.objectContaining({ pickedPerkCount: 2, treeId: 'AxeTree' })],
      }),
      expect.objectContaining({
        backgroundId: 'background.low_weight',
        backgroundName: 'Champion',
        disambiguator: 'background.low_weight',
        matches: [expect.objectContaining({ pickedPerkCount: 1, treeId: 'BowTree' })],
      }),
    ])
  })

  test('breaks ties on guaranteed covered picked perks by total covered picked perks', () => {
    const engine = createBackgroundFitEngine(sampleDataset)
    const backgroundFitView = engine.getBackgroundFitView([
      samplePerks[3],
      samplePerks[4],
      samplePerks[5],
    ])
    const orderedBackgroundIds = backgroundFitView.rankedBackgroundFits.map(
      (backgroundFit) => backgroundFit.backgroundId,
    )

    expect(orderedBackgroundIds.indexOf('background.traits_fill')).toBeLessThan(
      orderedBackgroundIds.indexOf('background.explicit_heavy'),
    )
  })

  test('keeps matching backgrounds ahead of backgrounds with no supported build matches', () => {
    const engine = createBackgroundFitEngine(sampleDataset)
    const backgroundFitView = engine.getBackgroundFitView([samplePerks[0], samplePerks[1]])
    const orderedBackgroundIds = backgroundFitView.rankedBackgroundFits.map(
      (backgroundFit) => backgroundFit.backgroundId,
    )

    expect(orderedBackgroundIds.indexOf('background.high_weight')).toBeLessThan(
      orderedBackgroundIds.indexOf('background.enemy_roll'),
    )
    expect(orderedBackgroundIds.indexOf('background.low_weight')).toBeLessThan(
      orderedBackgroundIds.indexOf('background.enemy_roll'),
    )
  })

  test('returns every background alphabetically when no perks are selected', () => {
    const engine = createBackgroundFitEngine(sampleDataset)
    const backgroundFitView = engine.getBackgroundFitView([])

    expect(backgroundFitView.supportedBuildTargetTrees).toEqual([])
    expect(backgroundFitView.unsupportedBuildTargetTrees).toEqual([])
    expect(
      backgroundFitView.rankedBackgroundFits.map((backgroundFit) => backgroundFit.backgroundName),
    ).toEqual([
      'Balanced scholar',
      'Champion',
      'Champion',
      'Crafter',
      'Heavy hand',
      'Hunter',
      'Militia captain',
    ])
  })

  test('tracks each backgrounds overall group cap separately from build matches', () => {
    const engine = createBackgroundFitEngine(sampleDataset)
    const backgroundFitView = engine.getBackgroundFitView([samplePerks[7]])

    expect(
      backgroundFitView.rankedBackgroundFits.find(
        (backgroundFit) => backgroundFit.backgroundId === 'background.enemy_roll',
      ),
    ).toEqual(
      expect.objectContaining({
        guaranteedMatchedTreeCount: 0,
        maximumTotalGroupCount: 2,
      }),
    )
    expect(
      backgroundFitView.rankedBackgroundFits.find(
        (backgroundFit) => backgroundFit.backgroundId === 'background.class_roll',
      ),
    ).toEqual(
      expect.objectContaining({
        maximumTotalGroupCount: 2,
      }),
    )
  })
})
