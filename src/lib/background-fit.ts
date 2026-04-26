import type {
  LegendsBackgroundFitBackgroundDefinition,
  LegendsBackgroundFitCategoryDefinition,
  LegendsBackgroundFitClassWeaponDependency,
  LegendsDynamicBackgroundCategoryName,
  LegendsPerkPlacement,
  LegendsPerkRecord,
  LegendsPerksDataset,
} from '../types/legends-perks'
import {
  chanceDynamicBackgroundCategoryNames,
  deterministicDynamicBackgroundCategoryNames,
  dynamicBackgroundCategoryNames,
} from './dynamic-background-categories'
import {
  getCategoryPriority,
  isDynamicBackgroundCategoryName,
} from './perk-categories'

const deterministicDynamicBackgroundCategoryNameSet = new Set<LegendsDynamicBackgroundCategoryName>(
  deterministicDynamicBackgroundCategoryNames,
)

const chanceDynamicBackgroundCategoryNameSet = new Set<LegendsDynamicBackgroundCategoryName>([
  ...chanceDynamicBackgroundCategoryNames,
])

type BackgroundProbabilityRecord = {
  backgroundDefinition: LegendsBackgroundFitBackgroundDefinition
  maximumTotalPerkGroupCount: number
  probabilitiesByPerkGroupId: Map<string, number>
}

type ClassWeaponDependencyByClassPerkGroupId = Map<string, Set<string>>

type BackgroundProbabilityContext = {
  classWeaponDependencyByClassPerkGroupId: ClassWeaponDependencyByClassPerkGroupId
  perkGroupIdsByCategory: Map<LegendsDynamicBackgroundCategoryName, string[]>
}

export type BuildTargetPerkGroup = {
  categoryName: string
  pickedPerkCount: number
  pickedPerkNames: string[]
  perkGroupId: string
  perkGroupName: string
}

export type BackgroundFitMatch = BuildTargetPerkGroup & {
  isGuaranteed: boolean
  probability: number
}

export type RankedBackgroundFit = {
  backgroundId: string
  backgroundName: string
  disambiguator: string | null
  expectedMatchedPerkGroupCount: number
  guaranteedMatchedPerkGroupCount: number
  iconPath: string | null
  maximumTotalPerkGroupCount: number
  matches: BackgroundFitMatch[]
  sourceFilePath: string
}

export type BackgroundFitView = {
  rankedBackgroundFits: RankedBackgroundFit[]
  supportedBuildTargetPerkGroups: BuildTargetPerkGroup[]
  unsupportedBuildTargetPerkGroups: BuildTargetPerkGroup[]
}

type BackgroundFitEngine = {
  getBackgroundFitView: (pickedPerks: LegendsPerkRecord[]) => BackgroundFitView
}

function compareBuildTargetPerkGroups(
  leftPerkGroup: BuildTargetPerkGroup,
  rightPerkGroup: BuildTargetPerkGroup,
): number {
  return (
    rightPerkGroup.pickedPerkCount - leftPerkGroup.pickedPerkCount ||
    getCategoryPriority(leftPerkGroup.categoryName) -
      getCategoryPriority(rightPerkGroup.categoryName) ||
    leftPerkGroup.perkGroupName.localeCompare(rightPerkGroup.perkGroupName) ||
    leftPerkGroup.perkGroupId.localeCompare(rightPerkGroup.perkGroupId)
  )
}

function clampProbability(probability: number): number {
  return Math.max(0, Math.min(1, probability))
}

function getExpectedSuccessfulDrawCount(
  attemptCount: number,
  successProbability: number,
  availablePerkGroupCount: number,
): number {
  if (attemptCount <= 0 || successProbability <= 0 || availablePerkGroupCount <= 0) {
    return 0
  }

  if (successProbability >= 1) {
    return Math.min(attemptCount, availablePerkGroupCount)
  }

  // Track the success-count distribution so repeated chance rolls can be capped by pool size.
  const successCountDistribution = new Array<number>(attemptCount + 1).fill(0)
  successCountDistribution[0] = 1

  for (let attemptIndex = 0; attemptIndex < attemptCount; attemptIndex += 1) {
    const nextSuccessCountDistribution = new Array<number>(attemptCount + 1).fill(0)

    for (
      let successCountIndex = 0;
      successCountIndex < successCountDistribution.length;
      successCountIndex += 1
    ) {
      const currentProbability = successCountDistribution[successCountIndex]

      if (currentProbability === 0) {
        continue
      }

      nextSuccessCountDistribution[successCountIndex] +=
        currentProbability * (1 - successProbability)
      nextSuccessCountDistribution[successCountIndex + 1] += currentProbability * successProbability
    }

    for (
      let successCountIndex = 0;
      successCountIndex < nextSuccessCountDistribution.length;
      successCountIndex += 1
    ) {
      successCountDistribution[successCountIndex] = nextSuccessCountDistribution[successCountIndex]
    }
  }

  return successCountDistribution.reduce(
    (expectedSuccessfulDrawCount, successCountProbability, successCount) =>
      expectedSuccessfulDrawCount +
      Math.min(successCount, availablePerkGroupCount) * successCountProbability,
    0,
  )
}

function getAdditionalRandomPerkGroupCount(
  categoryDefinition: LegendsBackgroundFitCategoryDefinition,
  availablePerkGroupCount: number,
): number {
  const explicitPerkGroupCount = new Set(categoryDefinition.perkGroupIds).size

  return Math.min(
    Math.max(0, (categoryDefinition.minimumPerkGroups ?? 0) - explicitPerkGroupCount),
    availablePerkGroupCount,
  )
}

function getChanceAttemptCount(categoryDefinition: LegendsBackgroundFitCategoryDefinition): number {
  const explicitPerkGroupCount = new Set(categoryDefinition.perkGroupIds).size

  return Math.max(0, (categoryDefinition.minimumPerkGroups ?? 0) - explicitPerkGroupCount + 1)
}

function buildPerkGroupIdsByCategory(
  perks: LegendsPerkRecord[],
): Map<LegendsDynamicBackgroundCategoryName, string[]> {
  const perkGroupIdsByCategory = new Map<LegendsDynamicBackgroundCategoryName, Set<string>>()

  for (const categoryName of dynamicBackgroundCategoryNames) {
    perkGroupIdsByCategory.set(categoryName, new Set())
  }

  for (const perk of perks) {
    for (const placement of perk.placements) {
      if (!isDynamicBackgroundCategoryName(placement.categoryName)) {
        continue
      }

      perkGroupIdsByCategory.get(placement.categoryName)?.add(placement.perkGroupId)
    }
  }

  return new Map(
    [...perkGroupIdsByCategory.entries()].map(([categoryName, perkGroupIds]) => [
      categoryName,
      [...perkGroupIds].toSorted((leftPerkGroupId, rightPerkGroupId) =>
        leftPerkGroupId.localeCompare(rightPerkGroupId),
      ),
    ]),
  )
}

function buildClassWeaponDependencyByClassPerkGroupId(
  classWeaponDependencies: LegendsBackgroundFitClassWeaponDependency[],
): ClassWeaponDependencyByClassPerkGroupId {
  const classWeaponDependencyByClassPerkGroupId: ClassWeaponDependencyByClassPerkGroupId = new Map()

  for (const classWeaponDependency of classWeaponDependencies) {
    if (!classWeaponDependencyByClassPerkGroupId.has(classWeaponDependency.classPerkGroupId)) {
      classWeaponDependencyByClassPerkGroupId.set(classWeaponDependency.classPerkGroupId, new Set())
    }

    classWeaponDependencyByClassPerkGroupId
      .get(classWeaponDependency.classPerkGroupId)
      ?.add(classWeaponDependency.weaponPerkGroupId)
  }

  return classWeaponDependencyByClassPerkGroupId
}

function addExplicitPerkGroupProbabilities(
  probabilitiesByPerkGroupId: Map<string, number>,
  explicitPerkGroupIds: string[],
): Set<string> {
  const explicitPerkGroupIdSet = new Set<string>()

  for (const perkGroupId of explicitPerkGroupIds) {
    explicitPerkGroupIdSet.add(perkGroupId)
    probabilitiesByPerkGroupId.set(perkGroupId, 1)
  }

  return explicitPerkGroupIdSet
}

function getRemainingPerkGroupIds(
  poolPerkGroupIds: string[],
  explicitPerkGroupIdSet: Set<string>,
): string[] {
  return poolPerkGroupIds.filter((perkGroupId) => !explicitPerkGroupIdSet.has(perkGroupId))
}

function isClassPerkGroupEligible(
  classPerkGroupId: string,
  presentWeaponPerkGroupIdSet: Set<string>,
  classWeaponDependencyByClassPerkGroupId: ClassWeaponDependencyByClassPerkGroupId,
): boolean {
  const requiredWeaponPerkGroupIdSet = classWeaponDependencyByClassPerkGroupId.get(classPerkGroupId)

  if (!requiredWeaponPerkGroupIdSet || requiredWeaponPerkGroupIdSet.size === 0) {
    return true
  }

  for (const requiredWeaponPerkGroupId of requiredWeaponPerkGroupIdSet) {
    if (presentWeaponPerkGroupIdSet.has(requiredWeaponPerkGroupId)) {
      return true
    }
  }

  return false
}

function getEligibleRemainingClassPerkGroupIds(
  poolPerkGroupIds: string[],
  explicitPerkGroupIdSet: Set<string>,
  presentWeaponPerkGroupIdSet: Set<string>,
  classWeaponDependencyByClassPerkGroupId: ClassWeaponDependencyByClassPerkGroupId,
): string[] {
  return poolPerkGroupIds.filter(
    (perkGroupId) =>
      !explicitPerkGroupIdSet.has(perkGroupId) &&
      isClassPerkGroupEligible(
        perkGroupId,
        presentWeaponPerkGroupIdSet,
        classWeaponDependencyByClassPerkGroupId,
      ),
  )
}

function addDeterministicCategoryProbabilities(
  probabilitiesByPerkGroupId: Map<string, number>,
  categoryDefinition: LegendsBackgroundFitCategoryDefinition,
  poolPerkGroupIds: string[],
): void {
  const explicitPerkGroupIdSet = addExplicitPerkGroupProbabilities(
    probabilitiesByPerkGroupId,
    categoryDefinition.perkGroupIds,
  )
  const remainingPerkGroupIds = getRemainingPerkGroupIds(poolPerkGroupIds, explicitPerkGroupIdSet)
  const additionalRandomPerkGroupCount = getAdditionalRandomPerkGroupCount(
    categoryDefinition,
    remainingPerkGroupIds.length,
  )
  const marginalProbability =
    remainingPerkGroupIds.length === 0
      ? 0
      : additionalRandomPerkGroupCount / remainingPerkGroupIds.length

  for (const perkGroupId of remainingPerkGroupIds) {
    probabilitiesByPerkGroupId.set(perkGroupId, marginalProbability)
  }
}

function addChanceCategoryProbabilities(
  probabilitiesByPerkGroupId: Map<string, number>,
  categoryDefinition: LegendsBackgroundFitCategoryDefinition,
  poolPerkGroupIds: string[],
): void {
  const explicitPerkGroupIdSet = addExplicitPerkGroupProbabilities(
    probabilitiesByPerkGroupId,
    categoryDefinition.perkGroupIds,
  )
  const remainingPerkGroupIds = getRemainingPerkGroupIds(poolPerkGroupIds, explicitPerkGroupIdSet)
  const marginalProbability =
    remainingPerkGroupIds.length === 0
      ? 0
      : getExpectedSuccessfulDrawCount(
          getChanceAttemptCount(categoryDefinition),
          clampProbability(categoryDefinition.chance ?? 0),
          remainingPerkGroupIds.length,
        ) / remainingPerkGroupIds.length

  for (const perkGroupId of remainingPerkGroupIds) {
    probabilitiesByPerkGroupId.set(perkGroupId, marginalProbability)
  }
}

function forEachSubsetOfSize<T>(
  items: T[],
  subsetSize: number,
  callback: (subset: T[]) => void,
): void {
  if (subsetSize === 0) {
    callback([])
    return
  }

  const subset = new Array<T>(subsetSize)

  function visit(itemIndex: number, subsetIndex: number): void {
    if (subsetIndex === subsetSize) {
      callback([...subset])
      return
    }

    for (
      let candidateIndex = itemIndex;
      candidateIndex <= items.length - (subsetSize - subsetIndex);
      candidateIndex += 1
    ) {
      subset[subsetIndex] = items[candidateIndex]
      visit(candidateIndex + 1, subsetIndex + 1)
    }
  }

  visit(0, 0)
}

function countCombinations(itemCount: number, subsetSize: number): number {
  if (subsetSize < 0 || subsetSize > itemCount) {
    return 0
  }

  if (subsetSize === 0 || subsetSize === itemCount) {
    return 1
  }

  const normalizedSubsetSize = Math.min(subsetSize, itemCount - subsetSize)
  let combinationCount = 1

  for (let index = 1; index <= normalizedSubsetSize; index += 1) {
    combinationCount = (combinationCount * (itemCount - normalizedSubsetSize + index)) / index
  }

  return combinationCount
}

function addClassCategoryProbabilities(
  probabilitiesByPerkGroupId: Map<string, number>,
  categoryDefinition: LegendsBackgroundFitCategoryDefinition,
  poolPerkGroupIds: string[],
  weaponCategoryDefinition: LegendsBackgroundFitCategoryDefinition,
  weaponPoolPerkGroupIds: string[],
  classWeaponDependencyByClassPerkGroupId: ClassWeaponDependencyByClassPerkGroupId,
): void {
  const explicitPerkGroupIdSet = addExplicitPerkGroupProbabilities(
    probabilitiesByPerkGroupId,
    categoryDefinition.perkGroupIds,
  )
  const explicitWeaponPerkGroupIdSet = new Set<string>(weaponCategoryDefinition.perkGroupIds)
  const remainingWeaponPerkGroupIds = getRemainingPerkGroupIds(
    weaponPoolPerkGroupIds,
    explicitWeaponPerkGroupIdSet,
  )
  const randomWeaponPerkGroupCount = getAdditionalRandomPerkGroupCount(
    weaponCategoryDefinition,
    remainingWeaponPerkGroupIds.length,
  )
  const totalWeaponSubsetCount = countCombinations(
    remainingWeaponPerkGroupIds.length,
    randomWeaponPerkGroupCount,
  )
  const subsetProbability = totalWeaponSubsetCount === 0 ? 0 : 1 / totalWeaponSubsetCount
  const successProbability = clampProbability(categoryDefinition.chance ?? 0)
  const classAttemptCount = getChanceAttemptCount(categoryDefinition)

  // Class rolls can depend on which Weapon perk groups were randomly drawn first.
  if (randomWeaponPerkGroupCount === 0) {
    const presentWeaponPerkGroupIdSet = new Set<string>(explicitWeaponPerkGroupIdSet)
    const eligibleRemainingPerkGroupIds = getEligibleRemainingClassPerkGroupIds(
      poolPerkGroupIds,
      explicitPerkGroupIdSet,
      presentWeaponPerkGroupIdSet,
      classWeaponDependencyByClassPerkGroupId,
    )

    const marginalProbability =
      eligibleRemainingPerkGroupIds.length === 0
        ? 0
        : getExpectedSuccessfulDrawCount(
            classAttemptCount,
            successProbability,
            eligibleRemainingPerkGroupIds.length,
          ) / eligibleRemainingPerkGroupIds.length

    for (const perkGroupId of eligibleRemainingPerkGroupIds) {
      probabilitiesByPerkGroupId.set(perkGroupId, marginalProbability)
    }

    return
  }

  // Enumerate each possible Weapon subset to compute exact marginal Class probabilities.
  forEachSubsetOfSize(
    remainingWeaponPerkGroupIds,
    randomWeaponPerkGroupCount,
    (weaponPerkGroupSubset) => {
      const presentWeaponPerkGroupIdSet = new Set<string>(explicitWeaponPerkGroupIdSet)

      for (const weaponPerkGroupId of weaponPerkGroupSubset) {
        presentWeaponPerkGroupIdSet.add(weaponPerkGroupId)
      }

      const eligibleRemainingPerkGroupIds = getEligibleRemainingClassPerkGroupIds(
        poolPerkGroupIds,
        explicitPerkGroupIdSet,
        presentWeaponPerkGroupIdSet,
        classWeaponDependencyByClassPerkGroupId,
      )

      if (eligibleRemainingPerkGroupIds.length === 0) {
        return
      }

      const marginalProbability =
        (getExpectedSuccessfulDrawCount(
          classAttemptCount,
          successProbability,
          eligibleRemainingPerkGroupIds.length,
        ) /
          eligibleRemainingPerkGroupIds.length) *
        subsetProbability

      for (const perkGroupId of eligibleRemainingPerkGroupIds) {
        probabilitiesByPerkGroupId.set(
          perkGroupId,
          (probabilitiesByPerkGroupId.get(perkGroupId) ?? 0) + marginalProbability,
        )
      }
    },
  )
}

function getMaximumEligibleRemainingClassPerkGroupCount(
  categoryDefinition: LegendsBackgroundFitCategoryDefinition,
  poolPerkGroupIds: string[],
  weaponCategoryDefinition: LegendsBackgroundFitCategoryDefinition,
  weaponPoolPerkGroupIds: string[],
  classWeaponDependencyByClassPerkGroupId: ClassWeaponDependencyByClassPerkGroupId,
): number {
  const explicitPerkGroupIdSet = new Set<string>(categoryDefinition.perkGroupIds)
  const explicitWeaponPerkGroupIdSet = new Set<string>(weaponCategoryDefinition.perkGroupIds)
  const remainingWeaponPerkGroupIds = getRemainingPerkGroupIds(
    weaponPoolPerkGroupIds,
    explicitWeaponPerkGroupIdSet,
  )
  const randomWeaponPerkGroupCount = getAdditionalRandomPerkGroupCount(
    weaponCategoryDefinition,
    remainingWeaponPerkGroupIds.length,
  )

  if (randomWeaponPerkGroupCount === 0) {
    return getEligibleRemainingClassPerkGroupIds(
      poolPerkGroupIds,
      explicitPerkGroupIdSet,
      explicitWeaponPerkGroupIdSet,
      classWeaponDependencyByClassPerkGroupId,
    ).length
  }

  let maximumEligibleRemainingClassPerkGroupCount = 0

  forEachSubsetOfSize(
    remainingWeaponPerkGroupIds,
    randomWeaponPerkGroupCount,
    (weaponPerkGroupSubset) => {
      const presentWeaponPerkGroupIdSet = new Set<string>(explicitWeaponPerkGroupIdSet)

      for (const weaponPerkGroupId of weaponPerkGroupSubset) {
        presentWeaponPerkGroupIdSet.add(weaponPerkGroupId)
      }

      maximumEligibleRemainingClassPerkGroupCount = Math.max(
        maximumEligibleRemainingClassPerkGroupCount,
        getEligibleRemainingClassPerkGroupIds(
          poolPerkGroupIds,
          explicitPerkGroupIdSet,
          presentWeaponPerkGroupIdSet,
          classWeaponDependencyByClassPerkGroupId,
        ).length,
      )
    },
  )

  return maximumEligibleRemainingClassPerkGroupCount
}

function getMaximumCategoryPerkGroupCount(
  backgroundDefinition: LegendsBackgroundFitBackgroundDefinition,
  categoryName: LegendsDynamicBackgroundCategoryName,
  context: BackgroundProbabilityContext,
): number {
  const categoryDefinition = backgroundDefinition.categories[categoryName]

  if (!categoryDefinition) {
    return 0
  }

  const poolPerkGroupIds = context.perkGroupIdsByCategory.get(categoryName) ?? []
  const explicitPerkGroupIdSet = new Set<string>(categoryDefinition.perkGroupIds)
  const explicitPerkGroupCount = explicitPerkGroupIdSet.size
  const remainingPerkGroupIds = getRemainingPerkGroupIds(poolPerkGroupIds, explicitPerkGroupIdSet)

  if (deterministicDynamicBackgroundCategoryNameSet.has(categoryName)) {
    return (
      explicitPerkGroupCount +
      getAdditionalRandomPerkGroupCount(categoryDefinition, remainingPerkGroupIds.length)
    )
  }

  if (categoryName === 'Enemy' || categoryName === 'Profession') {
    if (clampProbability(categoryDefinition.chance ?? 0) <= 0) {
      return explicitPerkGroupCount
    }

    return (
      explicitPerkGroupCount +
      Math.min(getChanceAttemptCount(categoryDefinition), remainingPerkGroupIds.length)
    )
  }

  if (categoryName === 'Class') {
    if (clampProbability(categoryDefinition.chance ?? 0) <= 0) {
      return explicitPerkGroupCount
    }

    return (
      explicitPerkGroupCount +
      Math.min(
        getChanceAttemptCount(categoryDefinition),
        getMaximumEligibleRemainingClassPerkGroupCount(
          categoryDefinition,
          poolPerkGroupIds,
          backgroundDefinition.categories.Weapon ?? {
            chance: null,
            minimumPerkGroups: 0,
            perkGroupIds: [],
          },
          context.perkGroupIdsByCategory.get('Weapon') ?? [],
          context.classWeaponDependencyByClassPerkGroupId,
        ),
      )
    )
  }

  // In Legends 19.3.17, GetDynamicPerkTree's magic loop never appends random perk groups.
  return explicitPerkGroupCount
}

function getMaximumTotalPerkGroupCount(
  backgroundDefinition: LegendsBackgroundFitBackgroundDefinition,
  context: BackgroundProbabilityContext,
): number {
  return dynamicBackgroundCategoryNames.reduce(
    (maximumTotalPerkGroupCount, categoryName) =>
      maximumTotalPerkGroupCount +
      getMaximumCategoryPerkGroupCount(backgroundDefinition, categoryName, context),
    0,
  )
}

export function calculateBackgroundPerkGroupProbabilities(
  backgroundDefinition: LegendsBackgroundFitBackgroundDefinition,
  context: BackgroundProbabilityContext,
): Map<string, number> {
  const probabilitiesByPerkGroupId = new Map<string, number>()

  for (const categoryName of dynamicBackgroundCategoryNames) {
    const categoryDefinition = backgroundDefinition.categories[categoryName]
    const poolPerkGroupIds = context.perkGroupIdsByCategory.get(categoryName) ?? []

    if (!categoryDefinition || poolPerkGroupIds.length === 0) {
      continue
    }

    if (deterministicDynamicBackgroundCategoryNameSet.has(categoryName)) {
      addDeterministicCategoryProbabilities(
        probabilitiesByPerkGroupId,
        categoryDefinition,
        poolPerkGroupIds,
      )
      continue
    }

    if (chanceDynamicBackgroundCategoryNameSet.has(categoryName)) {
      addChanceCategoryProbabilities(
        probabilitiesByPerkGroupId,
        categoryDefinition,
        poolPerkGroupIds,
      )
      continue
    }

    if (categoryName === 'Class') {
      addClassCategoryProbabilities(
        probabilitiesByPerkGroupId,
        categoryDefinition,
        poolPerkGroupIds,
        backgroundDefinition.categories.Weapon ?? {
          chance: null,
          minimumPerkGroups: 0,
          perkGroupIds: [],
        },
        context.perkGroupIdsByCategory.get('Weapon') ?? [],
        context.classWeaponDependencyByClassPerkGroupId,
      )
    }
  }

  return probabilitiesByPerkGroupId
}

export function getBuildTargetPerkGroups(pickedPerks: LegendsPerkRecord[]): {
  supportedBuildTargetPerkGroups: BuildTargetPerkGroup[]
  unsupportedBuildTargetPerkGroups: BuildTargetPerkGroup[]
} {
  const buildTargetPerkGroupsById = new Map<
    string,
    BuildTargetPerkGroup & {
      pickedPerkIdSet: Set<string>
    }
  >()

  for (const pickedPerk of pickedPerks) {
    const seenPlacementKeys = new Set<string>()

    for (const placement of pickedPerk.placements) {
      const placementKey = getPlacementGroupRequirementKey(placement)

      if (seenPlacementKeys.has(placementKey)) {
        continue
      }

      seenPlacementKeys.add(placementKey)

      if (!buildTargetPerkGroupsById.has(placementKey)) {
        buildTargetPerkGroupsById.set(placementKey, {
          categoryName: placement.categoryName,
          pickedPerkCount: 0,
          pickedPerkIdSet: new Set<string>(),
          pickedPerkNames: [],
          perkGroupId: placement.perkGroupId,
          perkGroupName: placement.perkGroupName,
        })
      }

      const buildTargetPerkGroup = buildTargetPerkGroupsById.get(placementKey)

      if (!buildTargetPerkGroup || buildTargetPerkGroup.pickedPerkIdSet.has(pickedPerk.id)) {
        continue
      }

      buildTargetPerkGroup.pickedPerkIdSet.add(pickedPerk.id)
      buildTargetPerkGroup.pickedPerkNames.push(pickedPerk.perkName)
      buildTargetPerkGroup.pickedPerkCount += 1
    }
  }

  const buildTargetPerkGroups = [...buildTargetPerkGroupsById.values()]
    .map((buildTargetPerkGroup) => {
      const { pickedPerkIdSet, ...normalizedBuildTargetPerkGroup } = buildTargetPerkGroup
      void pickedPerkIdSet

      return normalizedBuildTargetPerkGroup
    })
    .toSorted(compareBuildTargetPerkGroups)

  return {
    supportedBuildTargetPerkGroups: buildTargetPerkGroups.filter((buildTargetPerkGroup) =>
      isDynamicBackgroundCategoryName(buildTargetPerkGroup.categoryName),
    ),
    unsupportedBuildTargetPerkGroups: buildTargetPerkGroups.filter(
      (buildTargetPerkGroup) => !isDynamicBackgroundCategoryName(buildTargetPerkGroup.categoryName),
    ),
  }
}

function compareBackgroundFitMatches(
  leftMatch: BackgroundFitMatch,
  rightMatch: BackgroundFitMatch,
): number {
  return (
    Number(rightMatch.isGuaranteed) - Number(leftMatch.isGuaranteed) ||
    rightMatch.probability - leftMatch.probability ||
    rightMatch.pickedPerkCount - leftMatch.pickedPerkCount ||
    getCategoryPriority(leftMatch.categoryName) - getCategoryPriority(rightMatch.categoryName) ||
    leftMatch.perkGroupName.localeCompare(rightMatch.perkGroupName) ||
    leftMatch.perkGroupId.localeCompare(rightMatch.perkGroupId)
  )
}

function getCoveredPickedPerkCount(matches: BackgroundFitMatch[]): number {
  return new Set(matches.flatMap((match) => match.pickedPerkNames)).size
}

function getGuaranteedCoveredPickedPerkCount(matches: BackgroundFitMatch[]): number {
  return getCoveredPickedPerkCount(matches.filter((match) => match.isGuaranteed))
}

function compareRankedBackgroundFits(
  leftBackgroundFit: RankedBackgroundFit,
  rightBackgroundFit: RankedBackgroundFit,
): number {
  const leftGuaranteedCoveredPickedPerkCount = getGuaranteedCoveredPickedPerkCount(
    leftBackgroundFit.matches,
  )
  const rightGuaranteedCoveredPickedPerkCount = getGuaranteedCoveredPickedPerkCount(
    rightBackgroundFit.matches,
  )
  const leftCoveredPickedPerkCount = getCoveredPickedPerkCount(leftBackgroundFit.matches)
  const rightCoveredPickedPerkCount = getCoveredPickedPerkCount(rightBackgroundFit.matches)

  return (
    rightGuaranteedCoveredPickedPerkCount - leftGuaranteedCoveredPickedPerkCount ||
    rightCoveredPickedPerkCount - leftCoveredPickedPerkCount ||
    leftBackgroundFit.backgroundName.localeCompare(rightBackgroundFit.backgroundName) ||
    leftBackgroundFit.backgroundId.localeCompare(rightBackgroundFit.backgroundId) ||
    leftBackgroundFit.sourceFilePath.localeCompare(rightBackgroundFit.sourceFilePath)
  )
}

function getBackgroundDisambiguator(
  backgroundDefinition: LegendsBackgroundFitBackgroundDefinition,
): string {
  const sourceFileName =
    backgroundDefinition.sourceFilePath.split('/').at(-1) ?? backgroundDefinition.backgroundId

  return sourceFileName.replace(/_background\.nut$/, '').replace(/\.nut$/, '')
}

export function createBackgroundFitEngine(dataset: LegendsPerksDataset): BackgroundFitEngine {
  const perkGroupIdsByCategory = buildPerkGroupIdsByCategory(dataset.perks)
  const classWeaponDependencyByClassPerkGroupId = buildClassWeaponDependencyByClassPerkGroupId(
    dataset.backgroundFitRules.classWeaponDependencies,
  )
  const backgroundProbabilityContext = {
    classWeaponDependencyByClassPerkGroupId,
    perkGroupIdsByCategory,
  } satisfies BackgroundProbabilityContext
  const duplicateBackgroundNameCountByName = new Map<string, number>()

  for (const backgroundDefinition of dataset.backgroundFitBackgrounds) {
    duplicateBackgroundNameCountByName.set(
      backgroundDefinition.backgroundName,
      (duplicateBackgroundNameCountByName.get(backgroundDefinition.backgroundName) ?? 0) + 1,
    )
  }

  const backgroundProbabilityRecords: BackgroundProbabilityRecord[] =
    dataset.backgroundFitBackgrounds.map((backgroundDefinition) => ({
      backgroundDefinition,
      maximumTotalPerkGroupCount: getMaximumTotalPerkGroupCount(
        backgroundDefinition,
        backgroundProbabilityContext,
      ),
      probabilitiesByPerkGroupId: calculateBackgroundPerkGroupProbabilities(
        backgroundDefinition,
        backgroundProbabilityContext,
      ),
    }))

  return {
    getBackgroundFitView(pickedPerks) {
      const { supportedBuildTargetPerkGroups, unsupportedBuildTargetPerkGroups } =
        getBuildTargetPerkGroups(pickedPerks)

      return {
        rankedBackgroundFits: backgroundProbabilityRecords
          .map(
            ({ backgroundDefinition, maximumTotalPerkGroupCount, probabilitiesByPerkGroupId }) => {
              const matches = supportedBuildTargetPerkGroups
                .flatMap((buildTargetPerkGroup) => {
                  const probability =
                    probabilitiesByPerkGroupId.get(buildTargetPerkGroup.perkGroupId) ?? 0

                  if (probability <= 0) {
                    return []
                  }

                  return [
                    {
                      ...buildTargetPerkGroup,
                      isGuaranteed: probability >= 1,
                      probability: Math.min(1, probability),
                    },
                  ]
                })
                .toSorted(compareBackgroundFitMatches)

              return {
                backgroundId: backgroundDefinition.backgroundId,
                backgroundName: backgroundDefinition.backgroundName,
                disambiguator:
                  (duplicateBackgroundNameCountByName.get(backgroundDefinition.backgroundName) ??
                    0) > 1
                    ? getBackgroundDisambiguator(backgroundDefinition)
                    : null,
                expectedMatchedPerkGroupCount: matches.reduce(
                  (expectedPerkGroupCount, match) => expectedPerkGroupCount + match.probability,
                  0,
                ),
                guaranteedMatchedPerkGroupCount: matches.filter((match) => match.isGuaranteed)
                  .length,
                iconPath: backgroundDefinition.iconPath ?? null,
                maximumTotalPerkGroupCount,
                matches,
                sourceFilePath: backgroundDefinition.sourceFilePath,
              }
            },
          )
          .toSorted(compareRankedBackgroundFits),
        supportedBuildTargetPerkGroups,
        unsupportedBuildTargetPerkGroups,
      }
    },
  }
}

function getPlacementGroupRequirementKey(placement: LegendsPerkPlacement): string {
  return `${placement.categoryName}::${placement.perkGroupId}`
}
