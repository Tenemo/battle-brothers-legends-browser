import { describe, expect, test } from 'vitest'
import {
  calculateBackgroundPerkGroupProbabilities,
  createBackgroundFitEngine,
  getBuildTargetPerkGroups,
} from '../src/lib/background-fit'
import { formatBackgroundFitExpectedBuildPerksLabel } from '../src/lib/perk-display'
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
  perkGroupId,
  perkGroupName,
}: {
  categoryName: string
  perkGroupId: string
  perkGroupName: string
}): LegendsPerkPlacement {
  return {
    categoryName,
    tier: 1,
    perkGroupAttributes: [],
    perkGroupDescriptions: [perkGroupName.toLowerCase()],
    perkGroupIconPath: null,
    perkGroupId,
    perkGroupName,
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
    categoryNames: [...new Set(placements.map((placement) => placement.categoryName))],
    iconPath: null,
    id,
    perkConstName,
    perkName,
    placements,
    primaryCategoryName: placements[0]?.categoryName ?? 'Other',
    scenarioSources: [],
    searchText: `${perkName} ${placements.map((placement) => placement.perkGroupName).join(' ')}`,
  }
}

function createEmptyCategoryDefinitions(): Record<
  LegendsDynamicBackgroundCategoryName,
  LegendsBackgroundFitCategoryDefinition
> {
  return {
    Class: { chance: 0, minimumPerkGroups: 0, perkGroupIds: [] },
    Defense: { chance: null, minimumPerkGroups: 0, perkGroupIds: [] },
    Enemy: { chance: 0, minimumPerkGroups: 0, perkGroupIds: [] },
    Magic: { chance: 0, minimumPerkGroups: 0, perkGroupIds: [] },
    Profession: { chance: 0, minimumPerkGroups: 0, perkGroupIds: [] },
    Traits: { chance: null, minimumPerkGroups: 0, perkGroupIds: [] },
    Weapon: { chance: null, minimumPerkGroups: 0, perkGroupIds: [] },
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
    iconPath: null,
    sourceFilePath: `backgrounds/${backgroundId}.nut`,
  }
}

const samplePerks: LegendsPerkRecord[] = [
  createPerk({
    id: 'perk.weapon.axe_one',
    perkConstName: 'SpecAxeOne',
    perkName: 'Axe drill',
    placements: [
      createPlacement({ categoryName: 'Weapon', perkGroupId: 'AxeTree', perkGroupName: 'Axe' }),
    ],
  }),
  createPerk({
    id: 'perk.weapon.axe_two',
    perkConstName: 'SpecAxeTwo',
    perkName: 'Axe finish',
    placements: [
      createPlacement({ categoryName: 'Weapon', perkGroupId: 'AxeTree', perkGroupName: 'Axe' }),
    ],
  }),
  createPerk({
    id: 'perk.weapon.bow',
    perkConstName: 'SpecBow',
    perkName: 'Bow drill',
    placements: [
      createPlacement({ categoryName: 'Weapon', perkGroupId: 'BowTree', perkGroupName: 'Bow' }),
    ],
  }),
  createPerk({
    id: 'perk.defense.heavy',
    perkConstName: 'LegendHeavy',
    perkName: 'Heavy armor stance',
    placements: [
      createPlacement({
        categoryName: 'Defense',
        perkGroupId: 'HeavyDefenseTree',
        perkGroupName: 'Heavy armor',
      }),
    ],
  }),
  createPerk({
    id: 'perk.traits.calm',
    perkConstName: 'LegendCalm',
    perkName: 'Calm focus',
    placements: [
      createPlacement({ categoryName: 'Traits', perkGroupId: 'CalmTree', perkGroupName: 'Calm' }),
    ],
  }),
  createPerk({
    id: 'perk.traits.bold',
    perkConstName: 'LegendBold',
    perkName: 'Bold spirit',
    placements: [
      createPlacement({ categoryName: 'Traits', perkGroupId: 'BoldTree', perkGroupName: 'Bold' }),
    ],
  }),
  createPerk({
    id: 'perk.traits.lucky',
    perkConstName: 'LegendLucky',
    perkName: 'Lucky break',
    placements: [
      createPlacement({ categoryName: 'Traits', perkGroupId: 'LuckyTree', perkGroupName: 'Lucky' }),
    ],
  }),
  createPerk({
    id: 'perk.enemy.beasts',
    perkConstName: 'LegendEnemyBeasts',
    perkName: 'Favoured Enemy - Beasts',
    placements: [
      createPlacement({ categoryName: 'Enemy', perkGroupId: 'BeastTree', perkGroupName: 'Beasts' }),
    ],
  }),
  createPerk({
    id: 'perk.enemy.raiders',
    perkConstName: 'LegendEnemyRaiders',
    perkName: 'Favoured Enemy - Raiders',
    placements: [
      createPlacement({
        categoryName: 'Enemy',
        perkGroupId: 'RaiderTree',
        perkGroupName: 'Raiders',
      }),
    ],
  }),
  createPerk({
    id: 'perk.enemy.occult',
    perkConstName: 'LegendEnemyOccult',
    perkName: 'Favoured Enemy - Occult',
    placements: [
      createPlacement({
        categoryName: 'Enemy',
        perkGroupId: 'OccultTree',
        perkGroupName: 'Occult',
      }),
    ],
  }),
  createPerk({
    id: 'perk.class.militia',
    perkConstName: 'LegendMilitia',
    perkName: 'Militia drill',
    placements: [
      createPlacement({
        categoryName: 'Class',
        perkGroupId: 'MilitiaClassTree',
        perkGroupName: 'Militia',
      }),
    ],
  }),
  createPerk({
    id: 'perk.class.archer',
    perkConstName: 'LegendArcher',
    perkName: 'Archer drill',
    placements: [
      createPlacement({
        categoryName: 'Class',
        perkGroupId: 'ArcherClassTree',
        perkGroupName: 'Archer',
      }),
    ],
  }),
  createPerk({
    id: 'perk.profession.blacksmith',
    perkConstName: 'LegendBlacksmith',
    perkName: 'Blacksmith craft',
    placements: [
      createPlacement({
        categoryName: 'Profession',
        perkGroupId: 'BlacksmithProfessionTree',
        perkGroupName: 'Blacksmith',
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
        perkGroupId: 'ScholarProfessionTree',
        perkGroupName: 'Scholar',
      }),
    ],
  }),
  createPerk({
    id: 'perk.other.forceful',
    perkConstName: 'LegendForceful',
    perkName: 'Forceful stance',
    placements: [
      createPlacement({
        categoryName: 'Other',
        perkGroupId: 'ForcefulTree',
        perkGroupName: 'Forceful',
      }),
    ],
  }),
]

const sampleDataset: LegendsPerksDataset = {
  backgroundFitBackgrounds: [
    createBackgroundDefinition({
      backgroundId: 'background.explicit_heavy',
      backgroundName: 'Heavy hand',
      overrides: {
        Defense: { minimumPerkGroups: 1, perkGroupIds: ['HeavyDefenseTree'] },
      },
    }),
    createBackgroundDefinition({
      backgroundId: 'background.traits_fill',
      backgroundName: 'Balanced scholar',
      overrides: {
        Traits: { minimumPerkGroups: 2, perkGroupIds: ['CalmTree'] },
      },
    }),
    createBackgroundDefinition({
      backgroundId: 'background.enemy_roll',
      backgroundName: 'Hunter',
      overrides: {
        Enemy: { chance: 0.5, minimumPerkGroups: 1, perkGroupIds: [] },
      },
    }),
    createBackgroundDefinition({
      backgroundId: 'background.class_roll',
      backgroundName: 'Militia captain',
      overrides: {
        Class: { chance: 1, minimumPerkGroups: 0, perkGroupIds: [] },
        Weapon: { minimumPerkGroups: 1, perkGroupIds: [] },
      },
    }),
    createBackgroundDefinition({
      backgroundId: 'background.profession_roll',
      backgroundName: 'Crafter',
      overrides: {
        Profession: { chance: 0.5, minimumPerkGroups: 1, perkGroupIds: [] },
      },
    }),
    createBackgroundDefinition({
      backgroundId: 'background.high_weight',
      backgroundName: 'Champion',
      overrides: {
        Weapon: { minimumPerkGroups: 1, perkGroupIds: ['AxeTree'] },
      },
    }),
    createBackgroundDefinition({
      backgroundId: 'background.low_weight',
      backgroundName: 'Champion',
      overrides: {
        Weapon: { minimumPerkGroups: 1, perkGroupIds: ['BowTree'] },
      },
    }),
  ],
  backgroundFitRules: {
    classWeaponDependencies: [
      {
        classPerkGroupId: 'ArcherClassTree',
        weaponPerkGroupId: 'BowTree',
      },
      {
        classPerkGroupId: 'MilitiaClassTree',
        weaponPerkGroupId: 'AxeTree',
      },
    ],
  },
  generatedAt: '2026-04-22T00:00:00.000Z',
  perkCount: samplePerks.length,
  perks: samplePerks,
  referenceRoot: 'tests/fixtures',
  referenceVersion: 'tests',
  sourceFiles: [],
  perkGroupCount: 11,
}

describe('background fit', () => {
  test('formats expected picked perk coverage with one decimal when needed', () => {
    expect(formatBackgroundFitExpectedBuildPerksLabel(10 / 3, 4)).toBe(
      'Expected 3.3/4 perks pickable',
    )
    expect(formatBackgroundFitExpectedBuildPerksLabel(3, 4)).toBe('Expected 3/4 perks pickable')
    expect(formatBackgroundFitExpectedBuildPerksLabel(0.25, 1)).toBe(
      'Expected 0.3/1 perks pickable',
    )
  })

  test('derives shared supported targets and separates unsupported categories', () => {
    expect(getBuildTargetPerkGroups([samplePerks[0], samplePerks[1], samplePerks[14]])).toEqual({
      supportedBuildTargetPerkGroups: [
        {
          categoryName: 'Weapon',
          pickedPerkCount: 2,
          pickedPerkIds: ['perk.weapon.axe_one', 'perk.weapon.axe_two'],
          pickedPerkNames: ['Axe drill', 'Axe finish'],
          perkGroupIconPath: null,
          perkGroupId: 'AxeTree',
          perkGroupName: 'Axe',
        },
      ],
      unsupportedBuildTargetPerkGroups: [
        {
          categoryName: 'Other',
          pickedPerkCount: 1,
          pickedPerkIds: ['perk.other.forceful'],
          pickedPerkNames: ['Forceful stance'],
          perkGroupIconPath: null,
          perkGroupId: 'ForcefulTree',
          perkGroupName: 'Forceful',
        },
      ],
    })
  })

  test('keeps explicit perk groups guaranteed', () => {
    const probabilitiesByPerkGroupId = calculateBackgroundPerkGroupProbabilities(
      sampleDataset.backgroundFitBackgrounds[0],
      {
        classWeaponDependencyByClassPerkGroupId: new Map(
          sampleDataset.backgroundFitRules.classWeaponDependencies.map((dependency) => [
            dependency.classPerkGroupId,
            new Set([dependency.weaponPerkGroupId]),
          ]),
        ),
        perkGroupIdsByCategory: new Map([
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

    expect(probabilitiesByPerkGroupId.get('HeavyDefenseTree')).toBe(1)
  })

  test('treats duplicate explicit background perk groups as one unique perk group', () => {
    const duplicateExplicitBackground = createBackgroundDefinition({
      backgroundId: 'background.duplicate_explicit',
      backgroundName: 'Duplicate explicit',
      overrides: {
        Weapon: { minimumPerkGroups: 2, perkGroupIds: ['AxeTree', 'AxeTree'] },
      },
    })
    const probabilitiesByPerkGroupId = calculateBackgroundPerkGroupProbabilities(
      duplicateExplicitBackground,
      {
        classWeaponDependencyByClassPerkGroupId: new Map(),
        perkGroupIdsByCategory: new Map([
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

    expect(probabilitiesByPerkGroupId.get('AxeTree')).toBe(1)
    expect(probabilitiesByPerkGroupId.get('BowTree')).toBe(1)
    expect(duplicateExplicitFit.expectedCoveredPickedPerkCount).toBe(2)
    expect(duplicateExplicitFit.maximumTotalPerkGroupCount).toBe(2)
    expect(duplicateExplicitFit.matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ perkGroupId: 'AxeTree' }),
        expect.objectContaining({ perkGroupId: 'BowTree' }),
      ]),
    )
  })

  test('calculates expected covered picked perks without double-counting alternate placements', () => {
    const engine = createBackgroundFitEngine(sampleDataset)
    const alternateCoveragePerk = createPerk({
      id: 'perk.traits.calm_or_bold',
      perkConstName: 'LegendCalmOrBold',
      perkName: 'Calm or bold',
      placements: [
        createPlacement({
          categoryName: 'Traits',
          perkGroupId: 'CalmTree',
          perkGroupName: 'Calm',
        }),
        createPlacement({
          categoryName: 'Traits',
          perkGroupId: 'BoldTree',
          perkGroupName: 'Bold',
        }),
      ],
    })
    const balancedScholarFit = engine
      .getBackgroundFitView([alternateCoveragePerk])
      .rankedBackgroundFits.find(
        (backgroundFit) => backgroundFit.backgroundId === 'background.traits_fill',
      )

    expect(balancedScholarFit?.expectedMatchedPerkGroupCount).toBe(1.5)
    expect(balancedScholarFit?.expectedCoveredPickedPerkCount).toBe(1)
  })

  test('calculates expected covered picked perks across deterministic fills and class dependencies', () => {
    const engine = createBackgroundFitEngine(sampleDataset)
    const balancedScholarFit = engine
      .getBackgroundFitView([samplePerks[4], samplePerks[5], samplePerks[6]])
      .rankedBackgroundFits.find(
        (backgroundFit) => backgroundFit.backgroundId === 'background.traits_fill',
      )
    const classRollFit = engine
      .getBackgroundFitView([samplePerks[10], samplePerks[11]])
      .rankedBackgroundFits.find(
        (backgroundFit) => backgroundFit.backgroundId === 'background.class_roll',
      )

    expect(balancedScholarFit?.expectedCoveredPickedPerkCount).toBe(2)
    expect(classRollFit?.expectedCoveredPickedPerkCount).toBe(1)
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
          perkGroupId: 'CalmTree',
        }),
        expect.objectContaining({
          isGuaranteed: false,
          probability: 0.5,
          perkGroupId: 'BoldTree',
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
        expect.objectContaining({ probability: 1 / 3, perkGroupId: 'BeastTree' }),
        expect.objectContaining({ probability: 1 / 3, perkGroupId: 'OccultTree' }),
        expect.objectContaining({ probability: 1 / 3, perkGroupId: 'RaiderTree' }),
      ]),
    )
    expect(professionRollFit?.matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ probability: 0.5, perkGroupId: 'BlacksmithProfessionTree' }),
        expect.objectContaining({ probability: 0.5, perkGroupId: 'ScholarProfessionTree' }),
      ]),
    )
  })

  test('changes class probabilities based on the exact weapon perk groups a background can produce', () => {
    const engine = createBackgroundFitEngine(sampleDataset)
    const classRollFit = engine
      .getBackgroundFitView([samplePerks[10], samplePerks[11]])
      .rankedBackgroundFits.find(
        (backgroundFit) => backgroundFit.backgroundId === 'background.class_roll',
      )

    expect(classRollFit?.matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ probability: 0.5, perkGroupId: 'ArcherClassTree' }),
        expect.objectContaining({ probability: 0.5, perkGroupId: 'MilitiaClassTree' }),
      ]),
    )
  })

  test('only treats explicit Magic perk groups as background-fit matches', () => {
    const magicPerk = createPerk({
      id: 'perk.magic.rune',
      perkConstName: 'LegendRune',
      perkName: 'Rune lesson',
      placements: [
        createPlacement({
          categoryName: 'Magic',
          perkGroupId: 'RuneMagicTree',
          perkGroupName: 'Rune magic',
        }),
      ],
    })
    const randomMagicBackground = createBackgroundDefinition({
      backgroundId: 'background.random_magic',
      backgroundName: 'Random magic',
      overrides: {
        Magic: { chance: 1, minimumPerkGroups: 1, perkGroupIds: [] },
      },
    })
    const explicitMagicBackground = createBackgroundDefinition({
      backgroundId: 'background.explicit_magic',
      backgroundName: 'Explicit magic',
      overrides: {
        Magic: { chance: 0, minimumPerkGroups: 1, perkGroupIds: ['RuneMagicTree'] },
      },
    })
    const engine = createBackgroundFitEngine({
      ...sampleDataset,
      backgroundFitBackgrounds: [randomMagicBackground, explicitMagicBackground],
      perks: [...samplePerks, magicPerk],
    })
    const backgroundFitsById = new Map(
      engine
        .getBackgroundFitView([magicPerk])
        .rankedBackgroundFits.map((backgroundFit) => [backgroundFit.backgroundId, backgroundFit]),
    )

    expect(backgroundFitsById.get('background.random_magic')).toEqual(
      expect.objectContaining({
        expectedCoveredPickedPerkCount: 0,
        matches: [],
        maximumTotalPerkGroupCount: 0,
      }),
    )
    expect(backgroundFitsById.get('background.explicit_magic')).toEqual(
      expect.objectContaining({
        expectedCoveredPickedPerkCount: 1,
        matches: [
          expect.objectContaining({
            isGuaranteed: true,
            perkGroupId: 'RuneMagicTree',
            probability: 1,
          }),
        ],
        maximumTotalPerkGroupCount: 1,
      }),
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
        matches: [expect.objectContaining({ pickedPerkCount: 2, perkGroupId: 'AxeTree' })],
      }),
      expect.objectContaining({
        backgroundId: 'background.low_weight',
        backgroundName: 'Champion',
        disambiguator: 'background.low_weight',
        matches: [expect.objectContaining({ pickedPerkCount: 1, perkGroupId: 'BowTree' })],
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

    expect(backgroundFitView.supportedBuildTargetPerkGroups).toEqual([])
    expect(backgroundFitView.unsupportedBuildTargetPerkGroups).toEqual([])
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

  test('tracks each backgrounds overall perk group cap separately from build matches', () => {
    const engine = createBackgroundFitEngine(sampleDataset)
    const backgroundFitView = engine.getBackgroundFitView([samplePerks[7]])

    expect(
      backgroundFitView.rankedBackgroundFits.find(
        (backgroundFit) => backgroundFit.backgroundId === 'background.enemy_roll',
      ),
    ).toEqual(
      expect.objectContaining({
        guaranteedMatchedPerkGroupCount: 0,
        maximumTotalPerkGroupCount: 2,
      }),
    )
    expect(
      backgroundFitView.rankedBackgroundFits.find(
        (backgroundFit) => backgroundFit.backgroundId === 'background.class_roll',
      ),
    ).toEqual(
      expect.objectContaining({
        maximumTotalPerkGroupCount: 2,
      }),
    )
  })
})
