import { describe, expect, test } from 'vitest'
import {
  defaultBackgroundStudyResourceFilter,
  isBuildReachableWithStudyResources,
  type BackgroundStudyResourceFilter,
  type StudyReachabilityRequirement,
} from '../src/lib/background-study-reachability'
import type { LegendsPerkPlacement, LegendsPerkRecord } from '../src/types/legends-perks'

const noStudyResources = {
  shouldAllowBook: false,
  shouldAllowScroll: false,
  shouldAllowSecondScroll: false,
} satisfies BackgroundStudyResourceFilter

const oneBookOnly = {
  shouldAllowBook: true,
  shouldAllowScroll: false,
  shouldAllowSecondScroll: false,
} satisfies BackgroundStudyResourceFilter

const oneScrollOnly = {
  shouldAllowBook: false,
  shouldAllowScroll: true,
  shouldAllowSecondScroll: false,
} satisfies BackgroundStudyResourceFilter

const twoScrollsOnly = {
  shouldAllowBook: false,
  shouldAllowScroll: true,
  shouldAllowSecondScroll: true,
} satisfies BackgroundStudyResourceFilter

function createRequirementKey(requirement: StudyReachabilityRequirement): string {
  return `${requirement.categoryName}::${requirement.perkGroupId}`
}

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
    perkGroupIconPath: null,
    perkGroupId,
    perkGroupName,
    tier: 1,
  }
}

function createPerk(id: string, placements: LegendsPerkPlacement[]): LegendsPerkRecord {
  return {
    backgroundSources: [],
    categoryNames: [...new Set(placements.map((placement) => placement.categoryName))],
    descriptionParagraphs: [id],
    iconPath: null,
    id,
    perkConstName: id.replace(/[^A-Za-z0-9]/gu, ''),
    perkName: id,
    placements,
    primaryCategoryName: placements[0]?.categoryName ?? 'Other',
    scenarioSources: [],
    searchText: id,
  }
}

function createNativeRequirementChecker(reachableRequirementSets: string[][]) {
  const reachableRequirementSetKeys = new Set(
    reachableRequirementSets.map((reachableRequirementSet) =>
      [...reachableRequirementSet].toSorted().join(','),
    ),
  )

  return (requirements: StudyReachabilityRequirement[]) =>
    reachableRequirementSetKeys.has(
      requirements
        .map((requirement) => createRequirementKey(requirement))
        .toSorted()
        .join(','),
    )
}

const calmPlacement = createPlacement({
  categoryName: 'Traits',
  perkGroupId: 'CalmTree',
  perkGroupName: 'Calm',
})
const intelligentPlacement = createPlacement({
  categoryName: 'Traits',
  perkGroupId: 'IntelligentTree',
  perkGroupName: 'Intelligent',
})
const berserkerPlacement = createPlacement({
  categoryName: 'Magic',
  perkGroupId: 'BerserkerMagicTree',
  perkGroupName: 'Berserker',
})
const evocationPlacement = createPlacement({
  categoryName: 'Magic',
  perkGroupId: 'EvocationMagicTree',
  perkGroupName: 'Evocation',
})

describe('background study reachability', () => {
  test('covers one book group and one scroll group with the default filter', () => {
    const pickedPerks = [
      createPerk('calm perk', [calmPlacement]),
      createPerk('berserker perk', [berserkerPlacement]),
    ]
    const noNativeGroups = createNativeRequirementChecker([[]])

    expect(
      isBuildReachableWithStudyResources({
        canUseNativeRequirements: noNativeGroups,
        filter: defaultBackgroundStudyResourceFilter,
        pickedPerks,
      }),
    ).toBe(true)
    expect(
      isBuildReachableWithStudyResources({
        canUseNativeRequirements: noNativeGroups,
        filter: oneScrollOnly,
        pickedPerks,
      }),
    ).toBe(false)
  })

  test('requires two scroll slots for two distinct missing scroll groups', () => {
    const pickedPerks = [
      createPerk('berserker perk', [berserkerPlacement]),
      createPerk('evocation perk', [evocationPlacement]),
    ]
    const noNativeGroups = createNativeRequirementChecker([[]])

    expect(
      isBuildReachableWithStudyResources({
        canUseNativeRequirements: noNativeGroups,
        filter: defaultBackgroundStudyResourceFilter,
        pickedPerks,
      }),
    ).toBe(false)
    expect(
      isBuildReachableWithStudyResources({
        canUseNativeRequirements: noNativeGroups,
        filter: twoScrollsOnly,
        pickedPerks,
      }),
    ).toBe(true)
  })

  test('does not let one book cover two distinct missing book groups', () => {
    const pickedPerks = [
      createPerk('calm perk', [calmPlacement]),
      createPerk('intelligent perk', [intelligentPlacement]),
    ]

    expect(
      isBuildReachableWithStudyResources({
        canUseNativeRequirements: createNativeRequirementChecker([[]]),
        filter: defaultBackgroundStudyResourceFilter,
        pickedPerks,
      }),
    ).toBe(false)
    expect(
      isBuildReachableWithStudyResources({
        canUseNativeRequirements: createNativeRequirementChecker([['Traits::CalmTree']]),
        filter: defaultBackgroundStudyResourceFilter,
        pickedPerks,
      }),
    ).toBe(true)
  })

  test('lets one book group cover multiple picked perks in the same group', () => {
    const pickedPerks = [
      createPerk('first calm perk', [calmPlacement]),
      createPerk('second calm perk', [calmPlacement]),
    ]
    const noNativeGroups = createNativeRequirementChecker([[]])

    expect(
      isBuildReachableWithStudyResources({
        canUseNativeRequirements: noNativeGroups,
        filter: oneBookOnly,
        pickedPerks,
      }),
    ).toBe(true)
    expect(
      isBuildReachableWithStudyResources({
        canUseNativeRequirements: noNativeGroups,
        filter: noStudyResources,
        pickedPerks,
      }),
    ).toBe(false)
  })

  test('chooses one alternate placement per picked perk instead of requiring every placement', () => {
    const flexiblePerk = createPerk('calm or berserker perk', [calmPlacement, berserkerPlacement])
    const noNativeGroups = createNativeRequirementChecker([[]])

    expect(
      isBuildReachableWithStudyResources({
        canUseNativeRequirements: noNativeGroups,
        filter: oneScrollOnly,
        pickedPerks: [flexiblePerk],
      }),
    ).toBe(true)
    expect(
      isBuildReachableWithStudyResources({
        canUseNativeRequirements: noNativeGroups,
        filter: noStudyResources,
        pickedPerks: [flexiblePerk],
      }),
    ).toBe(false)
  })

  test('uses native joint reachability instead of separate marginal reachability', () => {
    const pickedPerks = [
      createPerk('calm perk', [calmPlacement]),
      createPerk('intelligent perk', [intelligentPlacement]),
    ]
    const oneTraitAtATime = createNativeRequirementChecker([
      [],
      ['Traits::CalmTree'],
      ['Traits::IntelligentTree'],
    ])

    expect(
      isBuildReachableWithStudyResources({
        canUseNativeRequirements: oneTraitAtATime,
        filter: noStudyResources,
        pickedPerks,
      }),
    ).toBe(false)
    expect(
      isBuildReachableWithStudyResources({
        canUseNativeRequirements: oneTraitAtATime,
        filter: oneBookOnly,
        pickedPerks,
      }),
    ).toBe(true)
  })

  test('ignores unsupported-only picked perks because background fit cannot evaluate them', () => {
    const unsupportedPerk = createPerk('forceful perk', [
      createPlacement({
        categoryName: 'Other',
        perkGroupId: 'ForcefulTree',
        perkGroupName: 'Forceful',
      }),
    ])

    expect(
      isBuildReachableWithStudyResources({
        canUseNativeRequirements: () => {
          throw new Error('Unsupported-only builds should not ask for native requirements')
        },
        filter: noStudyResources,
        pickedPerks: [unsupportedPerk],
      }),
    ).toBe(true)
  })

  test('uses only active skill book pools from the mod item definitions', () => {
    const activeClassBookPerk = createPerk('juggler perk', [
      createPlacement({
        categoryName: 'Class',
        perkGroupId: 'JugglerClassTree',
        perkGroupName: 'Juggler',
      }),
    ])
    const inactiveClassBookPerk = createPerk('militia perk', [
      createPlacement({
        categoryName: 'Class',
        perkGroupId: 'MilitiaClassTree',
        perkGroupName: 'Militia',
      }),
    ])
    const noNativeGroups = createNativeRequirementChecker([[]])

    expect(
      isBuildReachableWithStudyResources({
        canUseNativeRequirements: noNativeGroups,
        filter: oneBookOnly,
        pickedPerks: [activeClassBookPerk],
      }),
    ).toBe(true)
    expect(
      isBuildReachableWithStudyResources({
        canUseNativeRequirements: noNativeGroups,
        filter: oneBookOnly,
        pickedPerks: [inactiveClassBookPerk],
      }),
    ).toBe(false)
  })
})
