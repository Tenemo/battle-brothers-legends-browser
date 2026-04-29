import type {
  LegendsDynamicBackgroundCategoryName,
  LegendsPerkRecord,
} from '../types/legends-perks'
import { isDynamicBackgroundCategoryName } from './dynamic-background-categories'

export type BackgroundStudyResourceFilter = {
  shouldAllowBook: boolean
  shouldAllowScroll: boolean
  shouldAllowSecondScroll: boolean
}

export type StudyReachabilityRequirement = {
  categoryName: LegendsDynamicBackgroundCategoryName
  perkGroupId: string
}

export const defaultBackgroundStudyResourceFilter = {
  shouldAllowBook: true,
  shouldAllowScroll: true,
  shouldAllowSecondScroll: false,
} as const satisfies BackgroundStudyResourceFilter

const skillBookPerkGroupKeys = new Set([
  ...createPerkGroupKeys('Weapon', [
    'FistsTree',
    'MaceTree',
    'FlailTree',
    'HammerTree',
    'AxeTree',
    'CleaverTree',
    'SwordTree',
    'DaggerTree',
    'PolearmTree',
    'SpearTree',
    'CrossbowTree',
    'BowTree',
    'ThrowingTree',
    'SlingTree',
    'ShieldTree',
  ]),
  ...createPerkGroupKeys('Defense', [
    'HeavyArmorTree',
    'MediumArmorTree',
    'LightArmorTree',
    'ClothArmorTree',
  ]),
  ...createPerkGroupKeys('Class', [
    'BeastClassTree',
    'FaithClassTree',
    'NinetailsClassTree',
    'JugglerClassTree',
    'HoundmasterClassTree',
    'PoisonClassTree',
    'TailorClassTree',
  ]),
  ...createPerkGroupKeys('Profession', [
    'BarterProfessionTree',
    'CaravaneerProfessionTree',
    'ChefProfessionTree',
    'DogBreederProfessionTree',
    'FencingTeacherProfessionTree',
    'HealerProfessionTree',
    'HerbalistProfessionTree',
    'MinerProfessionTree',
    'RepairProfessionTree',
    'WoodworkingProfessionTree',
  ]),
  ...createPerkGroupKeys('Traits', [
    'AgileTree',
    'IndestructibleTree',
    'MartyrTree',
    'ViciousTree',
    'DeviousTree',
    'InspirationalTree',
    'IntelligentTree',
    'CalmTree',
    'FastTree',
    'LargeTree',
    'OrganisedTree',
    'SturdyTree',
    'FitTree',
    'TrainedTree',
  ]),
  ...createPerkGroupKeys('Enemy', [
    'BeastTree',
    'OccultTree',
    'UndeadTree',
    'GreenskinTree',
    'CivilizationTree',
    'OutlawTree',
    'SwordmastersTree',
  ]),
])

const ancientScrollPerkGroupKeys = new Set([
  ...createPerkGroupKeys('Magic', [
    'ValaChantMagicTree',
    'ValaTranceMagicTree',
    'RangerHuntMagicTree',
    'BasicNecroMagicTree',
    'WarlockMagicTree',
    'VampireMagicTree',
    'ZombieMagicTree',
    'BerserkerMagicTree',
    'DruidMagicTree',
    'CaptainMagicTree',
    'IllusionistMagicTree',
    'ConjurationMagicTree',
    'TransmutationMagicTree',
    'EvocationMagicTree',
    'PhilosophyMagicTree',
    'AssassinMagicTree',
    'BardMagicTree',
    'StavesMagicTree',
  ]),
])

function createPerkGroupKey(
  categoryName: LegendsDynamicBackgroundCategoryName,
  perkGroupId: string,
): string {
  return `${categoryName}::${perkGroupId}`
}

function createPerkGroupKeys(
  categoryName: LegendsDynamicBackgroundCategoryName,
  perkGroupIds: string[],
): string[] {
  return perkGroupIds.map((perkGroupId) => createPerkGroupKey(categoryName, perkGroupId))
}

function getScrollSlotCount(filter: BackgroundStudyResourceFilter): number {
  if (!filter.shouldAllowScroll) {
    return 0
  }

  return filter.shouldAllowSecondScroll ? 2 : 1
}

function isSkillBookReachableRequirement(requirement: StudyReachabilityRequirement): boolean {
  return skillBookPerkGroupKeys.has(
    createPerkGroupKey(requirement.categoryName, requirement.perkGroupId),
  )
}

function isAncientScrollReachableRequirement(requirement: StudyReachabilityRequirement): boolean {
  return ancientScrollPerkGroupKeys.has(
    createPerkGroupKey(requirement.categoryName, requirement.perkGroupId),
  )
}

function getPickedPerkRequirementOptions(
  pickedPerks: LegendsPerkRecord[],
): StudyReachabilityRequirement[][] {
  const pickedPerkRequirementOptions: StudyReachabilityRequirement[][] = []

  for (const pickedPerk of pickedPerks) {
    const seenRequirementKeys = new Set<string>()
    const requirementOptions: StudyReachabilityRequirement[] = []

    for (const placement of pickedPerk.placements) {
      if (!isDynamicBackgroundCategoryName(placement.categoryName)) {
        continue
      }

      const requirementKey = createPerkGroupKey(placement.categoryName, placement.perkGroupId)

      if (seenRequirementKeys.has(requirementKey)) {
        continue
      }

      seenRequirementKeys.add(requirementKey)
      requirementOptions.push({
        categoryName: placement.categoryName,
        perkGroupId: placement.perkGroupId,
      })
    }

    if (requirementOptions.length > 0) {
      pickedPerkRequirementOptions.push(requirementOptions)
    }
  }

  return pickedPerkRequirementOptions.toSorted(
    (leftOptions, rightOptions) => leftOptions.length - rightOptions.length,
  )
}

function getRequirementMapKey(requirementMap: Map<string, StudyReachabilityRequirement>): string {
  return [...requirementMap.keys()].toSorted().join(',')
}

function getScrollAssignmentKey(scrollRequirementKeys: readonly string[]): string {
  return [...scrollRequirementKeys].toSorted().join(',')
}

export function isBuildReachableWithStudyResources({
  canUseNativeRequirements,
  filter,
  pickedPerks,
}: {
  canUseNativeRequirements: (requirements: StudyReachabilityRequirement[]) => boolean
  filter: BackgroundStudyResourceFilter
  pickedPerks: LegendsPerkRecord[]
}): boolean {
  const pickedPerkRequirementOptions = getPickedPerkRequirementOptions(pickedPerks)

  if (pickedPerkRequirementOptions.length === 0) {
    return true
  }

  const scrollSlotCount = getScrollSlotCount(filter)
  const failedStateKeys = new Set<string>()
  const nativeRequirementResultByKey = new Map<string, boolean>()

  function canUseNativeRequirementMap(
    nativeRequirementMap: Map<string, StudyReachabilityRequirement>,
  ): boolean {
    const nativeRequirementMapKey = getRequirementMapKey(nativeRequirementMap)
    const cachedResult = nativeRequirementResultByKey.get(nativeRequirementMapKey)

    if (cachedResult !== undefined) {
      return cachedResult
    }

    const result = canUseNativeRequirements([...nativeRequirementMap.values()])
    nativeRequirementResultByKey.set(nativeRequirementMapKey, result)

    return result
  }

  function visit({
    assignedBookRequirementKey,
    assignedScrollRequirementKeys,
    nativeRequirementMap,
    pickedPerkIndex,
  }: {
    assignedBookRequirementKey: string | null
    assignedScrollRequirementKeys: string[]
    nativeRequirementMap: Map<string, StudyReachabilityRequirement>
    pickedPerkIndex: number
  }): boolean {
    const stateKey = [
      pickedPerkIndex,
      getRequirementMapKey(nativeRequirementMap),
      assignedBookRequirementKey ?? '',
      getScrollAssignmentKey(assignedScrollRequirementKeys),
    ].join('|')

    if (failedStateKeys.has(stateKey)) {
      return false
    }

    if (pickedPerkIndex === pickedPerkRequirementOptions.length) {
      return canUseNativeRequirementMap(nativeRequirementMap)
    }

    const requirementOptions = pickedPerkRequirementOptions[pickedPerkIndex]

    for (const requirement of requirementOptions) {
      const requirementKey = createPerkGroupKey(requirement.categoryName, requirement.perkGroupId)
      const nextNativeRequirementMap = new Map(nativeRequirementMap)
      nextNativeRequirementMap.set(requirementKey, requirement)

      if (
        visit({
          assignedBookRequirementKey,
          assignedScrollRequirementKeys,
          nativeRequirementMap: nextNativeRequirementMap,
          pickedPerkIndex: pickedPerkIndex + 1,
        })
      ) {
        return true
      }

      if (
        filter.shouldAllowBook &&
        isSkillBookReachableRequirement(requirement) &&
        (assignedBookRequirementKey === null || assignedBookRequirementKey === requirementKey) &&
        visit({
          assignedBookRequirementKey: requirementKey,
          assignedScrollRequirementKeys,
          nativeRequirementMap,
          pickedPerkIndex: pickedPerkIndex + 1,
        })
      ) {
        return true
      }

      if (scrollSlotCount > 0 && isAncientScrollReachableRequirement(requirement)) {
        const hasAssignedScrollRequirement =
          assignedScrollRequirementKeys.includes(requirementKey)
        const canAssignAdditionalScrollRequirement =
          assignedScrollRequirementKeys.length < scrollSlotCount

        if (
          (hasAssignedScrollRequirement || canAssignAdditionalScrollRequirement) &&
          visit({
            assignedBookRequirementKey,
            assignedScrollRequirementKeys: hasAssignedScrollRequirement
              ? assignedScrollRequirementKeys
              : [...assignedScrollRequirementKeys, requirementKey].toSorted(),
            nativeRequirementMap,
            pickedPerkIndex: pickedPerkIndex + 1,
          })
        ) {
          return true
        }
      }
    }

    failedStateKeys.add(stateKey)
    return false
  }

  /*
   * The search chooses one valid perk-group placement for each picked perk. A branch can cover
   * that placement natively, with the single skill-book slot, or with one of the limited ancient
   * scroll slots. Only the native branch accumulates requirements for the background probability
   * engine; book and scroll branches consume their item slots instead. This prevents alternate
   * placements from being counted as simultaneous requirements and keeps the expensive native
   * joint-probability check memoized by the exact native requirement set.
   */
  return visit({
    assignedBookRequirementKey: null,
    assignedScrollRequirementKeys: [],
    nativeRequirementMap: new Map(),
    pickedPerkIndex: 0,
  })
}
