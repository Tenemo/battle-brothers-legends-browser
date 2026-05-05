import type {
  LegendsBackgroundFitBackgroundDefinition,
  LegendsBackgroundFitCategoryDefinition,
  LegendsBackgroundFitClassWeaponDependency,
  LegendsBackgroundFitPerkRecord,
  LegendsDynamicBackgroundCategoryName,
} from '../types/legends-perks'
import {
  chanceDynamicBackgroundCategoryNames,
  deterministicDynamicBackgroundCategoryNames,
  dynamicBackgroundCategoryNames,
  isDynamicBackgroundCategoryName,
} from './dynamic-background-categories.ts'

type ClassWeaponDependencyByClassPerkGroupId = Map<string, Set<string>>

type BackgroundPerkGroupProbabilityRules = {
  classWeaponDependencies: LegendsBackgroundFitClassWeaponDependency[]
}

export type BackgroundPerkGroupProbabilityContext = {
  classWeaponDependencyByClassPerkGroupId: ClassWeaponDependencyByClassPerkGroupId
  perkGroupIdsByCategory: Map<LegendsDynamicBackgroundCategoryName, string[]>
}

const deterministicDynamicBackgroundCategoryNameSet = new Set<LegendsDynamicBackgroundCategoryName>(
  deterministicDynamicBackgroundCategoryNames,
)
const chanceDynamicBackgroundCategoryNameSet = new Set<LegendsDynamicBackgroundCategoryName>([
  ...chanceDynamicBackgroundCategoryNames,
])

function clampProbability(probability: number): number {
  const clampedProbability = Math.max(0, Math.min(1, probability))

  if (Math.abs(clampedProbability) < 1e-12) {
    return 0
  }

  if (Math.abs(1 - clampedProbability) < 1e-12) {
    return 1
  }

  return clampedProbability
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

function buildPerkGroupIdsByCategory(
  perks: LegendsBackgroundFitPerkRecord[],
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

export function createBackgroundPerkGroupProbabilityContext({
  perks,
  rules,
}: {
  perks: LegendsBackgroundFitPerkRecord[]
  rules: BackgroundPerkGroupProbabilityRules
}): BackgroundPerkGroupProbabilityContext {
  return {
    classWeaponDependencyByClassPerkGroupId: buildClassWeaponDependencyByClassPerkGroupId(
      rules.classWeaponDependencies,
    ),
    perkGroupIdsByCategory: buildPerkGroupIdsByCategory(perks),
  }
}

export function getPerkGroupProbabilityKey(categoryName: string, perkGroupId: string): string {
  return `${categoryName}::${perkGroupId}`
}

function addExplicitPerkGroupProbabilities(
  probabilitiesByPerkGroupKey: Map<string, number>,
  categoryName: LegendsDynamicBackgroundCategoryName,
  explicitPerkGroupIds: string[],
): Set<string> {
  const explicitPerkGroupIdSet = new Set<string>()

  for (const perkGroupId of explicitPerkGroupIds) {
    explicitPerkGroupIdSet.add(perkGroupId)
    probabilitiesByPerkGroupKey.set(getPerkGroupProbabilityKey(categoryName, perkGroupId), 1)
  }

  return explicitPerkGroupIdSet
}

function getRemainingPerkGroupIds(
  poolPerkGroupIds: string[],
  explicitPerkGroupIdSet: Set<string>,
): string[] {
  return poolPerkGroupIds.filter((perkGroupId) => !explicitPerkGroupIdSet.has(perkGroupId))
}

function addDeterministicCategoryProbabilities(
  probabilitiesByPerkGroupKey: Map<string, number>,
  categoryName: LegendsDynamicBackgroundCategoryName,
  categoryDefinition: LegendsBackgroundFitCategoryDefinition,
  poolPerkGroupIds: string[],
): void {
  const explicitPerkGroupIdSet = addExplicitPerkGroupProbabilities(
    probabilitiesByPerkGroupKey,
    categoryName,
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
    probabilitiesByPerkGroupKey.set(
      getPerkGroupProbabilityKey(categoryName, perkGroupId),
      marginalProbability,
    )
  }
}

function addChanceCategoryProbabilities(
  probabilitiesByPerkGroupKey: Map<string, number>,
  categoryName: LegendsDynamicBackgroundCategoryName,
  categoryDefinition: LegendsBackgroundFitCategoryDefinition,
  poolPerkGroupIds: string[],
): void {
  const explicitPerkGroupIdSet = addExplicitPerkGroupProbabilities(
    probabilitiesByPerkGroupKey,
    categoryName,
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
    probabilitiesByPerkGroupKey.set(
      getPerkGroupProbabilityKey(categoryName, perkGroupId),
      marginalProbability,
    )
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

function addClassCategoryProbabilities(
  probabilitiesByPerkGroupKey: Map<string, number>,
  categoryName: LegendsDynamicBackgroundCategoryName,
  categoryDefinition: LegendsBackgroundFitCategoryDefinition,
  poolPerkGroupIds: string[],
  weaponCategoryDefinition: LegendsBackgroundFitCategoryDefinition,
  weaponPoolPerkGroupIds: string[],
  classWeaponDependencyByClassPerkGroupId: ClassWeaponDependencyByClassPerkGroupId,
): void {
  const explicitPerkGroupIdSet = addExplicitPerkGroupProbabilities(
    probabilitiesByPerkGroupKey,
    categoryName,
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
      probabilitiesByPerkGroupKey.set(
        getPerkGroupProbabilityKey(categoryName, perkGroupId),
        marginalProbability,
      )
    }

    return
  }

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
        const probabilityKey = getPerkGroupProbabilityKey(categoryName, perkGroupId)

        probabilitiesByPerkGroupKey.set(
          probabilityKey,
          (probabilitiesByPerkGroupKey.get(probabilityKey) ?? 0) + marginalProbability,
        )
      }
    },
  )
}

export function calculateBackgroundPerkGroupProbabilities(
  backgroundDefinition: LegendsBackgroundFitBackgroundDefinition,
  context: BackgroundPerkGroupProbabilityContext,
): Map<string, number> {
  const probabilitiesByPerkGroupKey = new Map<string, number>()

  for (const categoryName of dynamicBackgroundCategoryNames) {
    const categoryDefinition = backgroundDefinition.categories[categoryName]
    const poolPerkGroupIds = context.perkGroupIdsByCategory.get(categoryName) ?? []

    if (!categoryDefinition || poolPerkGroupIds.length === 0) {
      continue
    }

    if (deterministicDynamicBackgroundCategoryNameSet.has(categoryName)) {
      addDeterministicCategoryProbabilities(
        probabilitiesByPerkGroupKey,
        categoryName,
        categoryDefinition,
        poolPerkGroupIds,
      )
      continue
    }

    if (chanceDynamicBackgroundCategoryNameSet.has(categoryName)) {
      addChanceCategoryProbabilities(
        probabilitiesByPerkGroupKey,
        categoryName,
        categoryDefinition,
        poolPerkGroupIds,
      )
      continue
    }

    if (categoryName === 'Class') {
      addClassCategoryProbabilities(
        probabilitiesByPerkGroupKey,
        categoryName,
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
      continue
    }

    addExplicitPerkGroupProbabilities(
      probabilitiesByPerkGroupKey,
      categoryName,
      categoryDefinition.perkGroupIds,
    )
  }

  return probabilitiesByPerkGroupKey
}
