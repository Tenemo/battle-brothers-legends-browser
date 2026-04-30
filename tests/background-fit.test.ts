import { describe, expect, test } from 'vitest'
import {
  calculateBackgroundPerkGroupProbabilities,
  createBackgroundFitEngine,
  getBuildTargetPerkGroups,
  getCoveredPickedPerkCount,
} from '../src/lib/background-fit'
import legendsPerksDatasetJson from '../src/data/legends-perks.json'
import {
  formatBackgroundFitBestNativeRollLabel,
  formatBackgroundFitBuildReachabilityLabel,
  formatBackgroundFitExpectedBuildPerksLabel,
  formatBackgroundFitGuaranteedPerksLabel,
  formatBackgroundFitProbabilityLabel,
  formatBackgroundSourceProbabilityLabel,
} from '../src/lib/perk-display'
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
    veteranPerkLevelInterval: 4,
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

const legendsPerksDataset = legendsPerksDatasetJson as LegendsPerksDataset

const noStudyResources = {
  shouldAllowBook: false,
  shouldAllowScroll: false,
  shouldAllowSecondScroll: false,
} as const

const defaultStudyResources = {
  shouldAllowBook: true,
  shouldAllowScroll: true,
  shouldAllowSecondScroll: false,
} as const

describe('background fit', () => {
  test('formats expected picked perk coverage with one decimal when needed', () => {
    expect(formatBackgroundFitExpectedBuildPerksLabel(10 / 3, 4)).toBe(
      'Expected 3.3/4 perks pickable',
    )
    expect(formatBackgroundFitExpectedBuildPerksLabel(3, 4)).toBe('Expected 3/4 perks pickable')
    expect(formatBackgroundFitExpectedBuildPerksLabel(0.25, 1)).toBe(
      'Expected 0.3/1 perks pickable',
    )
    expect(formatBackgroundFitExpectedBuildPerksLabel(2, 3, 'must-have perks')).toBe(
      'Expected 2/3 must-have perks pickable',
    )
    expect(formatBackgroundFitGuaranteedPerksLabel(1, 3, 'optional perks')).toBe(
      'Guaranteed 1/3 optional perks pickable',
    )
    expect(formatBackgroundFitBuildReachabilityLabel(0.25, 'Must-have build chance')).toBe(
      'Must-have build chance 25%',
    )
  })

  test('formats exact best native roll coverage separately from pickable overlap', () => {
    expect(formatBackgroundFitBestNativeRollLabel(2, 4)).toBe(
      'Best native roll covers 2/4 total perks',
    )
  })

  test('formats background source probabilities without internal minimum labels', () => {
    expect(formatBackgroundSourceProbabilityLabel(1)).toBe('Guaranteed')
    expect(formatBackgroundSourceProbabilityLabel(0.5)).toBe('50% chance')
    expect(formatBackgroundSourceProbabilityLabel(1 / 3)).toBe('33.3% chance')
    expect(formatBackgroundSourceProbabilityLabel(0.0075)).toBe('0.75% chance')
    expect(formatBackgroundSourceProbabilityLabel(0.0000001)).toBe('<0.01% chance')
    expect(formatBackgroundSourceProbabilityLabel(0.9999)).toBe('99.99% chance')
  })

  test('formats background fit percentages without rounding tiny chances to zero', () => {
    expect(formatBackgroundFitProbabilityLabel(1)).toBe('100%')
    expect(formatBackgroundFitProbabilityLabel(1 / 3)).toBe('33.3%')
    expect(formatBackgroundFitProbabilityLabel(0.0075)).toBe('0.75%')
    expect(formatBackgroundFitProbabilityLabel(0.000303)).toBe('0.03%')
    expect(formatBackgroundFitProbabilityLabel(0.000016666666666666647)).toBe('0.0017%')
    expect(formatBackgroundFitProbabilityLabel(0.0000001)).toBe('<0.0001%')
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

    expect(probabilitiesByPerkGroupId.get('Defense::HeavyDefenseTree')).toBe(1)
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

    expect(probabilitiesByPerkGroupId.get('Weapon::AxeTree')).toBe(1)
    expect(probabilitiesByPerkGroupId.get('Weapon::BowTree')).toBe(1)
    expect(duplicateExplicitFit.expectedCoveredPickedPerkCount).toBe(2)
    expect(duplicateExplicitFit.maximumNativeCoveredPickedPerkCount).toBe(2)
    expect(duplicateExplicitFit.maximumTotalPerkGroupCount).toBe(2)
    expect(duplicateExplicitFit.matches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ perkGroupId: 'AxeTree' }),
        expect.objectContaining({ perkGroupId: 'BowTree' }),
      ]),
    )
  })

  test('does not show lower-probability matches for guaranteed alternate placements', () => {
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

    expect(balancedScholarFit?.expectedMatchedPerkGroupCount).toBe(1)
    expect(balancedScholarFit?.expectedCoveredPickedPerkCount).toBe(1)
    expect(balancedScholarFit?.maximumNativeCoveredPickedPerkCount).toBe(1)
    expect(balancedScholarFit?.matches).toEqual([
      expect.objectContaining({
        isGuaranteed: true,
        perkGroupId: 'CalmTree',
      }),
    ])
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
    expect(balancedScholarFit?.maximumNativeCoveredPickedPerkCount).toBe(2)
    expect(classRollFit?.expectedCoveredPickedPerkCount).toBe(1)
    expect(classRollFit?.maximumNativeCoveredPickedPerkCount).toBe(1)
  })

  test('calculates exact best native roll coverage instead of marginal overlap union', () => {
    const oneRandomTraitBackground = createBackgroundDefinition({
      backgroundId: 'background.one_random_trait',
      backgroundName: 'One random trait',
      overrides: {
        Traits: { minimumPerkGroups: 1, perkGroupIds: [] },
      },
    })
    const engine = createBackgroundFitEngine({
      ...sampleDataset,
      backgroundFitBackgrounds: [oneRandomTraitBackground],
    })
    const oneRandomTraitFit = engine.getBackgroundFitView([
      samplePerks[4],
      samplePerks[5],
      samplePerks[6],
    ]).rankedBackgroundFits[0]

    expect(getCoveredPickedPerkCount(oneRandomTraitFit.matches)).toBe(3)
    expect(oneRandomTraitFit.expectedCoveredPickedPerkCount).toBe(1)
    expect(oneRandomTraitFit.maximumNativeCoveredPickedPerkCount).toBe(1)
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

  test('projects deterministic fills onto only relevant picked groups', () => {
    const engine = createBackgroundFitEngine({
      ...sampleDataset,
      backgroundFitBackgrounds: [
        createBackgroundDefinition({
          backgroundId: 'background.projected_traits',
          backgroundName: 'Projected traits',
          overrides: {
            Traits: { minimumPerkGroups: 2, perkGroupIds: [] },
          },
        }),
      ],
    })
    const [backgroundFit] = engine.getBackgroundFitView([samplePerks[4]], noStudyResources)
      .rankedBackgroundFits

    expect(backgroundFit).toEqual(
      expect.objectContaining({
        expectedCoveredPickedPerkCount: 2 / 3,
        maximumNativeCoveredPickedPerkCount: 1,
        mustHaveBuildReachabilityProbability: 2 / 3,
      }),
    )
    expect(backgroundFit.matches).toEqual([
      expect.objectContaining({
        perkGroupId: 'CalmTree',
        probability: 2 / 3,
      }),
    ])
  })

  test('merges alternate placements into one projected picked-perk mask', () => {
    const flexibleTraitPerk = createPerk({
      id: 'perk.traits.flexible',
      perkConstName: 'LegendFlexibleTrait',
      perkName: 'Flexible trait',
      placements: [
        createPlacement({ categoryName: 'Traits', perkGroupId: 'CalmTree', perkGroupName: 'Calm' }),
        createPlacement({ categoryName: 'Traits', perkGroupId: 'BoldTree', perkGroupName: 'Bold' }),
      ],
    })
    const engine = createBackgroundFitEngine({
      ...sampleDataset,
      backgroundFitBackgrounds: [
        createBackgroundDefinition({
          backgroundId: 'background.one_projected_trait',
          backgroundName: 'One projected trait',
          overrides: {
            Traits: { minimumPerkGroups: 1, perkGroupIds: [] },
          },
        }),
      ],
      perks: [...samplePerks, flexibleTraitPerk],
    })
    const [backgroundFit] = engine.getBackgroundFitView([flexibleTraitPerk], noStudyResources)
      .rankedBackgroundFits

    expect(backgroundFit).toEqual(
      expect.objectContaining({
        expectedCoveredPickedPerkCount: 2 / 3,
        maximumNativeCoveredPickedPerkCount: 1,
        mustHaveBuildReachabilityProbability: 2 / 3,
      }),
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
    expect(
      engine.getBackgroundPerkGroupProbability('background.enemy_roll', 'Enemy', 'BeastTree'),
    ).toBe(1 / 3)
    expect(
      engine.getBackgroundPerkGroupProbability(
        'background.profession_roll',
        'Profession',
        'BlacksmithProfessionTree',
      ),
    ).toBe(0.5)
  })

  test('derives perk background sources from exact background probabilities', () => {
    const engine = createBackgroundFitEngine(sampleDataset)
    const boldTraitSources = engine.getPerkBackgroundSources(samplePerks[5])

    expect(samplePerks[5].backgroundSources).toEqual([])
    expect(boldTraitSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundId: 'background.traits_fill',
          backgroundName: 'Balanced scholar',
          categoryName: 'Traits',
          minimumPerkGroups: 2,
          perkGroupId: 'BoldTree',
          perkGroupName: 'Bold',
        }),
      ]),
    )
    expect(
      engine.getBackgroundPerkGroupProbability('background.traits_fill', 'Traits', 'BoldTree'),
    ).toBe(0.5)
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
    expect(
      engine.getBackgroundPerkGroupProbability('background.class_roll', 'Class', 'ArcherClassTree'),
    ).toBe(0.5)
  })

  test('removes guaranteed picked perks from lower-probability background fit matches', () => {
    const tacticalManeuversPerk = createPerk({
      id: 'perk.traits.tactical_maneuvers',
      perkConstName: 'LegendTacticalManeuvers',
      perkName: 'Tactical maneuvers',
      placements: [
        createPlacement({
          categoryName: 'Traits',
          perkGroupId: 'AgileTree',
          perkGroupName: 'Agile',
        }),
        createPlacement({
          categoryName: 'Traits',
          perkGroupId: 'TrainedTree',
          perkGroupName: 'Trained',
        }),
        createPlacement({
          categoryName: 'Class',
          perkGroupId: 'JugglerClassTree',
          perkGroupName: 'Juggler',
        }),
      ],
    })
    const agileOnlyPerk = createPerk({
      id: 'perk.traits.agile_only',
      perkConstName: 'LegendAgileOnly',
      perkName: 'Agile footwork',
      placements: [
        createPlacement({
          categoryName: 'Traits',
          perkGroupId: 'AgileTree',
          perkGroupName: 'Agile',
        }),
      ],
    })
    const trainedBackground = createBackgroundDefinition({
      backgroundId: 'background.trained_rolls',
      backgroundName: 'Trained rolls',
      overrides: {
        Class: { chance: 0.5, minimumPerkGroups: 0, perkGroupIds: [] },
        Traits: { minimumPerkGroups: 2, perkGroupIds: ['TrainedTree'] },
      },
    })
    const engine = createBackgroundFitEngine({
      ...sampleDataset,
      backgroundFitBackgrounds: [trainedBackground],
      perks: [...samplePerks, tacticalManeuversPerk, agileOnlyPerk],
    })
    const trainedRollsFit = engine.getBackgroundFitView([tacticalManeuversPerk, agileOnlyPerk])
      .rankedBackgroundFits[0]
    const matchesByPerkGroupId = new Map(
      trainedRollsFit.matches.map((match) => [match.perkGroupId, match]),
    )

    expect(matchesByPerkGroupId.get('TrainedTree')).toEqual(
      expect.objectContaining({
        isGuaranteed: true,
        pickedPerkCount: 1,
        pickedPerkIds: ['perk.traits.tactical_maneuvers'],
        pickedPerkNames: ['Tactical maneuvers'],
        probability: 1,
      }),
    )
    expect(matchesByPerkGroupId.get('AgileTree')).toEqual(
      expect.objectContaining({
        isGuaranteed: false,
        pickedPerkCount: 1,
        pickedPerkIds: ['perk.traits.agile_only'],
        pickedPerkNames: ['Agile footwork'],
      }),
    )
    expect(matchesByPerkGroupId.has('JugglerClassTree')).toBe(false)
    expect(trainedRollsFit.expectedMatchedPerkGroupCount).toBe(
      trainedRollsFit.matches.reduce(
        (expectedPerkGroupCount, match) => expectedPerkGroupCount + match.probability,
        0,
      ),
    )
    expect(
      engine.getBackgroundPerkGroupProbability('background.trained_rolls', 'Traits', 'AgileTree'),
    ).toBe(0.25)
    expect(
      engine.getBackgroundPerkGroupProbability(
        'background.trained_rolls',
        'Class',
        'JugglerClassTree',
      ),
    ).toBe(0.5)
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
    expect(
      engine.getBackgroundPerkGroupProbability('background.random_magic', 'Magic', 'RuneMagicTree'),
    ).toBe(0)
    expect(
      engine.getBackgroundPerkGroupProbability(
        'background.explicit_magic',
        'Magic',
        'RuneMagicTree',
      ),
    ).toBe(1)
  })

  test('keeps same-id perk group probabilities scoped to their categories', () => {
    const classFaithPerk = createPerk({
      id: 'perk.class.faith',
      perkConstName: 'LegendClassFaith',
      perkName: 'Class faith',
      placements: [
        createPlacement({
          categoryName: 'Class',
          perkGroupId: 'SharedFaithTree',
          perkGroupName: 'Faith',
        }),
      ],
    })
    const magicFaithPerk = createPerk({
      id: 'perk.magic.faith',
      perkConstName: 'LegendMagicFaith',
      perkName: 'Magic faith',
      placements: [
        createPlacement({
          categoryName: 'Magic',
          perkGroupId: 'SharedFaithTree',
          perkGroupName: 'Faith',
        }),
      ],
    })
    const explicitMagicBackground = createBackgroundDefinition({
      backgroundId: 'background.explicit_shared_faith',
      backgroundName: 'Explicit shared faith',
      overrides: {
        Class: { chance: 0, minimumPerkGroups: 1, perkGroupIds: [] },
        Magic: { chance: 0, minimumPerkGroups: 1, perkGroupIds: ['SharedFaithTree'] },
      },
    })
    const engine = createBackgroundFitEngine({
      ...sampleDataset,
      backgroundFitBackgrounds: [explicitMagicBackground],
      perks: [...samplePerks, classFaithPerk, magicFaithPerk],
    })
    const backgroundFit = engine.getBackgroundFitView([classFaithPerk, magicFaithPerk])
      .rankedBackgroundFits[0]

    expect(
      engine.getBackgroundPerkGroupProbability(
        'background.explicit_shared_faith',
        'Class',
        'SharedFaithTree',
      ),
    ).toBe(0)
    expect(
      engine.getBackgroundPerkGroupProbability(
        'background.explicit_shared_faith',
        'Magic',
        'SharedFaithTree',
      ),
    ).toBe(1)
    expect(engine.getPerkBackgroundSources(classFaithPerk)).toEqual([])
    expect(engine.getPerkBackgroundSources(magicFaithPerk)).toEqual([
      expect.objectContaining({
        backgroundId: 'background.explicit_shared_faith',
        categoryName: 'Magic',
        perkGroupId: 'SharedFaithTree',
      }),
    ])
    expect(backgroundFit.matches).toEqual([
      expect.objectContaining({
        categoryName: 'Magic',
        perkGroupId: 'SharedFaithTree',
      }),
    ])
  })

  test('filters backgrounds that cannot reach the picked build with the selected study resources', () => {
    const calmPerk = createPerk({
      id: 'perk.traits.actual_calm',
      perkConstName: 'LegendActualCalm',
      perkName: 'Actual calm',
      placements: [
        createPlacement({
          categoryName: 'Traits',
          perkGroupId: 'CalmTree',
          perkGroupName: 'Calm',
        }),
      ],
    })
    const berserkerPerk = createPerk({
      id: 'perk.magic.actual_berserker',
      perkConstName: 'LegendActualBerserker',
      perkName: 'Actual berserker',
      placements: [
        createPlacement({
          categoryName: 'Magic',
          perkGroupId: 'BerserkerMagicTree',
          perkGroupName: 'Berserker',
        }),
      ],
    })
    const calmBackground = createBackgroundDefinition({
      backgroundId: 'background.calm_native',
      backgroundName: 'Calm native',
      overrides: {
        Traits: { minimumPerkGroups: 1, perkGroupIds: ['CalmTree'] },
      },
    })
    const emptyBackground = createBackgroundDefinition({
      backgroundId: 'background.empty_native',
      backgroundName: 'Empty native',
      overrides: {},
    })
    const engine = createBackgroundFitEngine({
      ...sampleDataset,
      backgroundFitBackgrounds: [calmBackground, emptyBackground],
      perks: [...samplePerks, calmPerk, berserkerPerk],
    })

    expect(
      engine
        .getBackgroundFitView([calmPerk, berserkerPerk], {
          shouldAllowBook: true,
          shouldAllowScroll: true,
          shouldAllowSecondScroll: false,
        })
        .rankedBackgroundFits.map((backgroundFit) => backgroundFit.backgroundId),
    ).toEqual(['background.calm_native', 'background.empty_native'])
    expect(
      engine
        .getBackgroundFitView([calmPerk, berserkerPerk], {
          shouldAllowBook: false,
          shouldAllowScroll: true,
          shouldAllowSecondScroll: false,
        })
        .rankedBackgroundFits.map((backgroundFit) => backgroundFit.backgroundId),
    ).toEqual(['background.calm_native'])
  })

  test('calculates exact build chance when one book can cover either missing trait', () => {
    const intelligentPerk = createPerk({
      id: 'perk.traits.intelligent',
      perkConstName: 'LegendIntelligent',
      perkName: 'Intelligent focus',
      placements: [
        createPlacement({
          categoryName: 'Traits',
          perkGroupId: 'IntelligentTree',
          perkGroupName: 'Intelligent',
        }),
      ],
    })
    const traitsFillBackground = createBackgroundDefinition({
      backgroundId: 'background.one_random_trait',
      backgroundName: 'One random trait',
      overrides: {
        Traits: { minimumPerkGroups: 1, perkGroupIds: [] },
      },
    })
    const engine = createBackgroundFitEngine({
      ...sampleDataset,
      backgroundFitBackgrounds: [traitsFillBackground],
      perks: [...samplePerks, intelligentPerk],
    })
    const [backgroundFit] = engine.getBackgroundFitView([samplePerks[4], intelligentPerk], {
      shouldAllowBook: true,
      shouldAllowScroll: false,
      shouldAllowSecondScroll: false,
    }).rankedBackgroundFits

    expect(backgroundFit).toEqual(
      expect.objectContaining({
        backgroundId: 'background.one_random_trait',
        buildReachabilityProbability: 0.5,
      }),
    )
  })

  test('calculates exact build chance for alternate placements without double-counting paths', () => {
    const flexibleWeaponPerk = createPerk({
      id: 'perk.weapon.flexible',
      perkConstName: 'SpecFlexibleWeapon',
      perkName: 'Flexible weapon drill',
      placements: [
        createPlacement({ categoryName: 'Weapon', perkGroupId: 'AxeTree', perkGroupName: 'Axe' }),
        createPlacement({ categoryName: 'Weapon', perkGroupId: 'BowTree', perkGroupName: 'Bow' }),
      ],
    })
    const oneRandomWeaponBackground = createBackgroundDefinition({
      backgroundId: 'background.one_random_weapon',
      backgroundName: 'One random weapon',
      overrides: {
        Weapon: { minimumPerkGroups: 1, perkGroupIds: [] },
      },
    })
    const engine = createBackgroundFitEngine({
      ...sampleDataset,
      backgroundFitBackgrounds: [oneRandomWeaponBackground],
      perks: [...samplePerks, flexibleWeaponPerk],
    })
    const [backgroundFit] = engine.getBackgroundFitView(
      [flexibleWeaponPerk],
      noStudyResources,
    ).rankedBackgroundFits

    expect(backgroundFit).toEqual(
      expect.objectContaining({
        backgroundId: 'background.one_random_weapon',
        buildReachabilityProbability: 1,
      }),
    )
  })

  test('returns zero build chance when native rolls cannot contain every required group', () => {
    const oneRandomWeaponBackground = createBackgroundDefinition({
      backgroundId: 'background.one_random_weapon',
      backgroundName: 'One random weapon',
      overrides: {
        Weapon: { minimumPerkGroups: 1, perkGroupIds: [] },
      },
    })
    const engine = createBackgroundFitEngine({
      ...sampleDataset,
      backgroundFitBackgrounds: [oneRandomWeaponBackground],
    })

    expect(
      engine.getBackgroundFitView([samplePerks[0], samplePerks[2]], noStudyResources)
        .rankedBackgroundFits,
    ).toEqual([])
    expect(
      engine.getBackgroundFitView([samplePerks[0], samplePerks[2]], {
        shouldAllowBook: true,
        shouldAllowScroll: false,
        shouldAllowSecondScroll: false,
      }).rankedBackgroundFits[0],
    ).toEqual(
      expect.objectContaining({
        buildReachabilityProbability: 1,
      }),
    )
  })

  test('calculates exact build chance for chance-based enemy rolls', () => {
    const enemyRollBackground = createBackgroundDefinition({
      backgroundId: 'background.enemy_roll',
      backgroundName: 'Enemy roll',
      overrides: {
        Enemy: { chance: 0.5, minimumPerkGroups: 1, perkGroupIds: [] },
      },
    })
    const engine = createBackgroundFitEngine({
      ...sampleDataset,
      backgroundFitBackgrounds: [enemyRollBackground],
    })
    const [backgroundFit] = engine.getBackgroundFitView(
      [samplePerks[7], samplePerks[9]],
      noStudyResources,
    ).rankedBackgroundFits

    expect(backgroundFit).toEqual(
      expect.objectContaining({
        backgroundId: 'background.enemy_roll',
        buildReachabilityProbability: 1 / 12,
      }),
    )
  })

  test('calculates exact build chance through class and weapon dependencies', () => {
    const engine = createBackgroundFitEngine(sampleDataset)
    const [backgroundFit] = engine.getBackgroundFitView(
      [samplePerks[11]],
      noStudyResources,
    ).rankedBackgroundFits

    expect(backgroundFit).toEqual(
      expect.objectContaining({
        backgroundId: 'background.class_roll',
        buildReachabilityProbability: 0.5,
      }),
    )
  })

  test('uses the configured scroll count when calculating full build chance', () => {
    const berserkerPerk = createPerk({
      id: 'perk.magic.actual_berserker',
      perkConstName: 'LegendActualBerserker',
      perkName: 'Actual berserker',
      placements: [
        createPlacement({
          categoryName: 'Magic',
          perkGroupId: 'BerserkerMagicTree',
          perkGroupName: 'Berserker',
        }),
      ],
    })
    const evocationPerk = createPerk({
      id: 'perk.magic.actual_evocation',
      perkConstName: 'LegendActualEvocation',
      perkName: 'Actual evocation',
      placements: [
        createPlacement({
          categoryName: 'Magic',
          perkGroupId: 'EvocationMagicTree',
          perkGroupName: 'Evocation',
        }),
      ],
    })
    const emptyBackground = createBackgroundDefinition({
      backgroundId: 'background.empty',
      backgroundName: 'Empty',
      overrides: {},
    })
    const engine = createBackgroundFitEngine({
      ...sampleDataset,
      backgroundFitBackgrounds: [emptyBackground],
      perks: [...samplePerks, berserkerPerk, evocationPerk],
    })

    expect(
      engine.getBackgroundFitView([berserkerPerk, evocationPerk], defaultStudyResources)
        .rankedBackgroundFits,
    ).toEqual([])
    expect(
      engine.getBackgroundFitView([berserkerPerk, evocationPerk], {
        shouldAllowBook: false,
        shouldAllowScroll: true,
        shouldAllowSecondScroll: true,
      }).rankedBackgroundFits[0],
    ).toEqual(
      expect.objectContaining({
        backgroundId: 'background.empty',
        buildReachabilityProbability: 1,
        fullBuildStudyResourceRequirement: {
          requiredScrollCount: 2,
          requiresBook: false,
          requiresBright: true,
        },
        mustHaveStudyResourceRequirement: {
          requiredScrollCount: 2,
          requiresBook: false,
          requiresBright: true,
        },
      }),
    )
  })

  test('reports full-build study resources separately from must-have resources', () => {
    const berserkerPerk = createPerk({
      id: 'perk.magic.actual_berserker',
      perkConstName: 'LegendActualBerserker',
      perkName: 'Actual berserker',
      placements: [
        createPlacement({
          categoryName: 'Magic',
          perkGroupId: 'BerserkerMagicTree',
          perkGroupName: 'Berserker',
        }),
      ],
    })
    const calmOnlyBackground = createBackgroundDefinition({
      backgroundId: 'background.calm_only',
      backgroundName: 'Calm only',
      overrides: {
        Traits: { minimumPerkGroups: 1, perkGroupIds: ['CalmTree'] },
      },
    })
    const engine = createBackgroundFitEngine({
      ...sampleDataset,
      backgroundFitBackgrounds: [calmOnlyBackground],
      perks: [...samplePerks, berserkerPerk],
    })
    const backgroundFit = engine.getBackgroundFitView(
      [samplePerks[4], berserkerPerk],
      defaultStudyResources,
      {
        optionalPickedPerkIds: new Set([berserkerPerk.id]),
      },
    ).rankedBackgroundFits[0]

    expect(backgroundFit).toEqual(
      expect.objectContaining({
        backgroundId: 'background.calm_only',
        fullBuildReachabilityProbability: 1,
        fullBuildStudyResourceRequirement: {
          requiredScrollCount: 1,
          requiresBook: false,
          requiresBright: false,
        },
        mustHaveBuildReachabilityProbability: 1,
        mustHaveStudyResourceRequirement: {
          requiredScrollCount: 0,
          requiresBook: false,
          requiresBright: false,
        },
      }),
    )
  })

  test('filters backgrounds by must-have perks while scoring optional perks separately', () => {
    const berserkerPerk = createPerk({
      id: 'perk.magic.actual_berserker',
      perkConstName: 'LegendActualBerserker',
      perkName: 'Actual berserker',
      placements: [
        createPlacement({
          categoryName: 'Magic',
          perkGroupId: 'BerserkerMagicTree',
          perkGroupName: 'Berserker',
        }),
      ],
    })
    const evocationPerk = createPerk({
      id: 'perk.magic.actual_evocation',
      perkConstName: 'LegendActualEvocation',
      perkName: 'Actual evocation',
      placements: [
        createPlacement({
          categoryName: 'Magic',
          perkGroupId: 'EvocationMagicTree',
          perkGroupName: 'Evocation',
        }),
      ],
    })
    const calmOnlyBackground = createBackgroundDefinition({
      backgroundId: 'background.calm_only',
      backgroundName: 'Calm only',
      overrides: {
        Traits: { minimumPerkGroups: 1, perkGroupIds: ['CalmTree'] },
      },
    })
    const engine = createBackgroundFitEngine({
      ...sampleDataset,
      backgroundFitBackgrounds: [calmOnlyBackground],
      perks: [...samplePerks, berserkerPerk, evocationPerk],
    })

    expect(
      engine.getBackgroundFitView(
        [samplePerks[4], berserkerPerk, evocationPerk],
        defaultStudyResources,
      ).rankedBackgroundFits,
    ).toEqual([])

    expect(
      engine.getBackgroundFitView(
        [samplePerks[4], berserkerPerk, evocationPerk],
        defaultStudyResources,
        {
          optionalPickedPerkIds: new Set([berserkerPerk.id, evocationPerk.id]),
        },
      ).rankedBackgroundFits[0],
    ).toEqual(
      expect.objectContaining({
        backgroundId: 'background.calm_only',
        buildReachabilityProbability: 1,
        expectedCoveredMustHavePerkCount: 1,
        expectedCoveredOptionalPerkCount: 0,
        fullBuildReachabilityProbability: 0,
        guaranteedCoveredMustHavePerkCount: 1,
        guaranteedCoveredOptionalPerkCount: 0,
        maximumNativeCoveredPickedPerkCount: 1,
        mustHaveBuildReachabilityProbability: 1,
      }),
    )
  })

  test('reports progress for each checked background while dropping zero must-have matches', () => {
    const progressLabels: string[] = []
    const calmOnlyBackground = createBackgroundDefinition({
      backgroundId: 'background.calm_only',
      backgroundName: 'Calm only',
      overrides: {
        Traits: { minimumPerkGroups: 1, perkGroupIds: ['CalmTree'] },
      },
    })
    const emptyBackground = createBackgroundDefinition({
      backgroundId: 'background.empty',
      backgroundName: 'Empty',
      overrides: {},
    })
    const engine = createBackgroundFitEngine({
      ...sampleDataset,
      backgroundFitBackgrounds: [calmOnlyBackground, emptyBackground],
    })

    const backgroundFitView = engine.getBackgroundFitView([samplePerks[4]], noStudyResources, {
      onProgress(progress) {
        progressLabels.push(
          `${progress.checkedBackgroundCount}/${progress.totalBackgroundCount}`,
        )
      },
    })

    expect(progressLabels).toEqual(['0/2', '1/2', '2/2'])
    expect(backgroundFitView.rankedBackgroundFits.map((backgroundFit) => backgroundFit.backgroundId))
      .toEqual(['background.calm_only'])
  })

  test('calculates small non-zero full build chances for dense real background fits', () => {
    const denseBuildPerkNames = [
      'Student',
      'Muscularity',
      'Battle Forged',
      'Immovable Object',
      'Brawny',
      'Steadfast',
      'Steel Brow',
      'Perfect Fit',
      'Axe Mastery',
      'Battle Flow',
      'Balance',
      'Mind over Body',
      'Lone Wolf',
      'Last Stand',
      'Berserk',
      'Killing Frenzy',
      'Swagger',
      'Rebound',
      'Fortified Mind',
      'Hold Out',
      'Underdog',
      'Assured Conquest',
      'Colossus',
      'Crippling Strikes',
      'Nine Lives',
      'Tactical Maneuvers',
      'Perfect Focus',
    ]
    const perksByName = new Map(legendsPerksDataset.perks.map((perk) => [perk.perkName, perk]))
    const denseBuildPerks = denseBuildPerkNames.map((perkName) => {
      const perk = perksByName.get(perkName)

      if (!perk) {
        throw new Error(`Missing dense build perk fixture: ${perkName}`)
      }

      return perk
    })
    const engine = createBackgroundFitEngine(legendsPerksDataset)
    const backgroundsByName = new Map(
      engine
        .getBackgroundFitView(denseBuildPerks, defaultStudyResources)
        .rankedBackgroundFits.map((backgroundFit) => [backgroundFit.backgroundName, backgroundFit]),
    )
    const bastardBuildChance = backgroundsByName.get('Bastard')?.buildReachabilityProbability ?? 0
    const footSoldierBuildChance =
      backgroundsByName.get('Foot Soldier')?.buildReachabilityProbability ?? 0

    expect(bastardBuildChance).toBeGreaterThan(0)
    expect(footSoldierBuildChance).toBeGreaterThan(0)
    expect(bastardBuildChance).toBeGreaterThan(footSoldierBuildChance)
    expect(bastardBuildChance).toBeLessThan(0.01)
    expect(footSoldierBuildChance).toBeLessThan(0.01)
  })

  test('keeps tiny must-have chances in raw probability order', () => {
    const betterTinyChanceBackground = createBackgroundDefinition({
      backgroundId: 'background.better_tiny_chance',
      backgroundName: 'Better tiny chance',
      overrides: {
        Enemy: { chance: 0.0000083334, minimumPerkGroups: 1, perkGroupIds: [] },
      },
    })
    const worseTinyChanceBackground = createBackgroundDefinition({
      backgroundId: 'background.worse_tiny_chance',
      backgroundName: 'Worse tiny chance',
      overrides: {
        Enemy: { chance: 0.0000060607, minimumPerkGroups: 1, perkGroupIds: [] },
      },
    })
    const engine = createBackgroundFitEngine({
      ...sampleDataset,
      backgroundFitBackgrounds: [worseTinyChanceBackground, betterTinyChanceBackground],
      perkCount: 1,
      perks: [samplePerks[7]],
    })
    const backgroundFitView = engine.getBackgroundFitView([samplePerks[7]], noStudyResources)
    const orderedBackgroundNames = backgroundFitView.rankedBackgroundFits.map(
      (backgroundFit) => backgroundFit.backgroundName,
    )
    const backgroundsByName = new Map(
      backgroundFitView.rankedBackgroundFits.map((backgroundFit) => [
        backgroundFit.backgroundName,
        backgroundFit,
      ]),
    )
    const betterMustHaveChance =
      backgroundsByName.get('Better tiny chance')?.mustHaveBuildReachabilityProbability ?? 0
    const worseMustHaveChance =
      backgroundsByName.get('Worse tiny chance')?.mustHaveBuildReachabilityProbability ?? 0

    expect(orderedBackgroundNames).toEqual(['Better tiny chance', 'Worse tiny chance'])
    expect(betterMustHaveChance).toBeGreaterThan(worseMustHaveChance)
    expect(formatBackgroundFitProbabilityLabel(betterMustHaveChance)).toBe('0.0017%')
    expect(formatBackgroundFitProbabilityLabel(worseMustHaveChance)).toBe('0.0012%')
  })

  test('ranks backgrounds by expected covered picked perks first and disambiguates duplicate names', () => {
    const engine = createBackgroundFitEngine(sampleDataset)
    const backgroundFitView = engine.getBackgroundFitView([
      samplePerks[0],
      samplePerks[1],
      samplePerks[2],
    ])

    const orderedBackgroundIds = backgroundFitView.rankedBackgroundFits.map(
      (backgroundFit) => backgroundFit.backgroundId,
    )

    expect(backgroundFitView.rankedBackgroundFits[0]).toEqual(
      expect.objectContaining({
        backgroundId: 'background.high_weight',
        matches: [expect.objectContaining({ pickedPerkCount: 2, perkGroupId: 'AxeTree' })],
      }),
    )
    expect(orderedBackgroundIds.indexOf('background.class_roll')).toBeLessThan(
      orderedBackgroundIds.indexOf('background.low_weight'),
    )
    expect(orderedBackgroundIds.indexOf('background.high_weight')).toBeLessThan(
      orderedBackgroundIds.indexOf('background.low_weight'),
    )
    expect(
      backgroundFitView.rankedBackgroundFits.find(
        (backgroundFit) => backgroundFit.backgroundId === 'background.high_weight',
      ),
    ).toEqual(
      expect.objectContaining({
        backgroundName: 'Champion',
        disambiguator: 'background.high_weight',
      }),
    )
    expect(
      backgroundFitView.rankedBackgroundFits.find(
        (backgroundFit) => backgroundFit.backgroundId === 'background.low_weight',
      ),
    ).toEqual(
      expect.objectContaining({
        backgroundName: 'Champion',
        disambiguator: 'background.low_weight',
      }),
    )
  })

  test('breaks ties on expected covered picked perks by guaranteed coverage', () => {
    const engine = createBackgroundFitEngine(sampleDataset)
    const backgroundFitView = engine.getBackgroundFitView([samplePerks[0], samplePerks[2]])
    const orderedBackgroundIds = backgroundFitView.rankedBackgroundFits.map(
      (backgroundFit) => backgroundFit.backgroundId,
    )

    expect(orderedBackgroundIds.indexOf('background.high_weight')).toBeLessThan(
      orderedBackgroundIds.indexOf('background.class_roll'),
    )
  })

  test('breaks ties on expected and guaranteed coverage by exact best native roll coverage', () => {
    const firstEnemyPerk = createPerk({
      id: 'perk.enemy.first',
      perkConstName: 'LegendEnemyFirst',
      perkName: 'Favoured Enemy - First',
      placements: [
        createPlacement({
          categoryName: 'Enemy',
          perkGroupId: 'FirstEnemyTree',
          perkGroupName: 'First enemy',
        }),
      ],
    })
    const secondEnemyPerk = createPerk({
      id: 'perk.enemy.second',
      perkConstName: 'LegendEnemySecond',
      perkName: 'Favoured Enemy - Second',
      placements: [
        createPlacement({
          categoryName: 'Enemy',
          perkGroupId: 'SecondEnemyTree',
          perkGroupName: 'Second enemy',
        }),
      ],
    })
    const oneNativeTraitBackground = createBackgroundDefinition({
      backgroundId: 'background.one_native_trait',
      backgroundName: 'One native trait',
      overrides: {
        Traits: { minimumPerkGroups: 1, perkGroupIds: [] },
      },
    })
    const twoPossibleEnemyBackground = createBackgroundDefinition({
      backgroundId: 'background.two_possible_enemy',
      backgroundName: 'Two possible enemy',
      overrides: {
        Enemy: { chance: 0.5, minimumPerkGroups: 1, perkGroupIds: [] },
      },
    })
    const engine = createBackgroundFitEngine({
      ...sampleDataset,
      backgroundFitBackgrounds: [oneNativeTraitBackground, twoPossibleEnemyBackground],
      perkCount: 4,
      perkGroupCount: 4,
      perks: [firstEnemyPerk, secondEnemyPerk, samplePerks[5], samplePerks[6]],
    })
    const backgroundFitView = engine.getBackgroundFitView([
      firstEnemyPerk,
      secondEnemyPerk,
      samplePerks[5],
      samplePerks[6],
    ])
    const orderedBackgroundIds = backgroundFitView.rankedBackgroundFits.map(
      (backgroundFit) => backgroundFit.backgroundId,
    )
    const backgroundFitsById = new Map(
      backgroundFitView.rankedBackgroundFits.map((backgroundFit) => [
        backgroundFit.backgroundId,
        backgroundFit,
      ]),
    )

    expect(backgroundFitsById.get('background.one_native_trait')).toEqual(
      expect.objectContaining({
        expectedCoveredPickedPerkCount: 1,
        guaranteedMatchedPerkGroupCount: 0,
        maximumNativeCoveredPickedPerkCount: 1,
      }),
    )
    expect(backgroundFitsById.get('background.two_possible_enemy')).toEqual(
      expect.objectContaining({
        expectedCoveredPickedPerkCount: 1,
        guaranteedMatchedPerkGroupCount: 0,
        maximumNativeCoveredPickedPerkCount: 2,
      }),
    )
    expect(orderedBackgroundIds.indexOf('background.two_possible_enemy')).toBeLessThan(
      orderedBackgroundIds.indexOf('background.one_native_trait'),
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
