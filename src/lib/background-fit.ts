import type {
  LegendsBackgroundFitBackgroundDefinition,
  LegendsBackgroundFitCategoryDefinition,
  LegendsBackgroundFitClassWeaponDependency,
  LegendsDynamicBackgroundCategoryName,
  LegendsPerkBackgroundSource,
  LegendsPerkPlacement,
  LegendsPerkRecord,
  LegendsPerksDataset,
} from '../types/legends-perks'
import {
  chanceDynamicBackgroundCategoryNames,
  deterministicDynamicBackgroundCategoryNames,
  dynamicBackgroundCategoryNames,
  getCategoryPriority,
  isDynamicBackgroundCategoryName,
} from './dynamic-background-categories'
import {
  isBuildReachableWithStudyResources,
  type BackgroundStudyResourceFilter,
} from './background-study-reachability'

const deterministicDynamicBackgroundCategoryNameSet = new Set<LegendsDynamicBackgroundCategoryName>(
  deterministicDynamicBackgroundCategoryNames,
)

const chanceDynamicBackgroundCategoryNameSet = new Set<LegendsDynamicBackgroundCategoryName>([
  ...chanceDynamicBackgroundCategoryNames,
])

type BackgroundProbabilityRecord = {
  backgroundDefinition: LegendsBackgroundFitBackgroundDefinition
  maximumTotalPerkGroupCount: number
  probabilitiesByPerkGroupKey: Map<string, number>
}

type ClassWeaponDependencyByClassPerkGroupId = Map<string, Set<string>>

type BackgroundProbabilityContext = {
  classWeaponDependencyByClassPerkGroupId: ClassWeaponDependencyByClassPerkGroupId
  perkGroupIdsByCategory: Map<LegendsDynamicBackgroundCategoryName, string[]>
}

type PerkGroupRequirement = {
  categoryName: LegendsDynamicBackgroundCategoryName
  perkGroupId: string
}

type DynamicPerkPlacement = LegendsPerkPlacement & {
  categoryName: LegendsDynamicBackgroundCategoryName
}

export type BuildTargetPerkGroup = {
  categoryName: string
  pickedPerkCount: number
  pickedPerkIds: string[]
  pickedPerkNames: string[]
  perkGroupIconPath: string | null
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
  expectedCoveredPickedPerkCount: number
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
  getBackgroundPerkGroupProbability: (
    backgroundId: string,
    categoryName: string,
    perkGroupId: string,
  ) => number
  getBackgroundFitView: (
    pickedPerks: LegendsPerkRecord[],
    studyResourceFilter?: BackgroundStudyResourceFilter,
  ) => BackgroundFitView
  getPerkBackgroundSources: (perk: LegendsPerkRecord) => LegendsPerkBackgroundSource[]
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

function comparePerkBackgroundSources(
  leftSource: LegendsPerkBackgroundSource,
  rightSource: LegendsPerkBackgroundSource,
): number {
  return (
    leftSource.backgroundName.localeCompare(rightSource.backgroundName) ||
    getCategoryPriority(leftSource.categoryName) - getCategoryPriority(rightSource.categoryName) ||
    leftSource.perkGroupName.localeCompare(rightSource.perkGroupName) ||
    leftSource.backgroundId.localeCompare(rightSource.backgroundId) ||
    leftSource.perkGroupId.localeCompare(rightSource.perkGroupId)
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

function getPerkGroupProbabilityKey(categoryName: string, perkGroupId: string): string {
  return `${categoryName}::${perkGroupId}`
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

function getCategoryDefinition(
  backgroundDefinition: LegendsBackgroundFitBackgroundDefinition,
  categoryName: LegendsDynamicBackgroundCategoryName,
): LegendsBackgroundFitCategoryDefinition {
  return (
    backgroundDefinition.categories[categoryName] ?? {
      chance: null,
      minimumPerkGroups: 0,
      perkGroupIds: [],
    }
  )
}

function hasEveryPerkGroup(
  perkGroupIdSet: Set<string>,
  requiredPerkGroupIds: Set<string>,
): boolean {
  for (const requiredPerkGroupId of requiredPerkGroupIds) {
    if (!perkGroupIdSet.has(requiredPerkGroupId)) {
      return false
    }
  }

  return true
}

function getExplicitOnlyCategoryRequiredProbability(
  categoryDefinition: LegendsBackgroundFitCategoryDefinition,
  requiredPerkGroupIds: Set<string>,
): number {
  if (requiredPerkGroupIds.size === 0) {
    return 1
  }

  const explicitPerkGroupIdSet = new Set(categoryDefinition.perkGroupIds)

  return hasEveryPerkGroup(explicitPerkGroupIdSet, requiredPerkGroupIds) ? 1 : 0
}

function getDeterministicCategoryRequiredProbability(
  categoryDefinition: LegendsBackgroundFitCategoryDefinition,
  poolPerkGroupIds: string[],
  requiredPerkGroupIds: Set<string>,
): number {
  if (requiredPerkGroupIds.size === 0) {
    return 1
  }

  const poolPerkGroupIdSet = new Set(poolPerkGroupIds)
  const explicitPerkGroupIdSet = new Set(categoryDefinition.perkGroupIds)
  const randomRequiredPerkGroupIds = new Set<string>()

  for (const requiredPerkGroupId of requiredPerkGroupIds) {
    if (explicitPerkGroupIdSet.has(requiredPerkGroupId)) {
      continue
    }

    if (!poolPerkGroupIdSet.has(requiredPerkGroupId)) {
      return 0
    }

    randomRequiredPerkGroupIds.add(requiredPerkGroupId)
  }

  if (randomRequiredPerkGroupIds.size === 0) {
    return 1
  }

  const remainingPerkGroupIds = getRemainingPerkGroupIds(poolPerkGroupIds, explicitPerkGroupIdSet)
  const randomPerkGroupCount = getAdditionalRandomPerkGroupCount(
    categoryDefinition,
    remainingPerkGroupIds.length,
  )

  if (randomRequiredPerkGroupIds.size > randomPerkGroupCount) {
    return 0
  }

  const totalCombinationCount = countCombinations(
    remainingPerkGroupIds.length,
    randomPerkGroupCount,
  )

  if (totalCombinationCount === 0) {
    return 0
  }

  return (
    countCombinations(
      remainingPerkGroupIds.length - randomRequiredPerkGroupIds.size,
      randomPerkGroupCount - randomRequiredPerkGroupIds.size,
    ) / totalCombinationCount
  )
}

function getChanceSelectedCountDistribution(
  attemptCount: number,
  successProbability: number,
  availablePerkGroupCount: number,
): Map<number, number> {
  const selectedCountDistribution = new Map<number, number>()

  if (attemptCount <= 0 || successProbability <= 0 || availablePerkGroupCount <= 0) {
    selectedCountDistribution.set(0, 1)
    return selectedCountDistribution
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

  for (const [successCount, successCountProbability] of successCountDistribution.entries()) {
    const selectedCount = Math.min(successCount, availablePerkGroupCount)

    selectedCountDistribution.set(
      selectedCount,
      (selectedCountDistribution.get(selectedCount) ?? 0) + successCountProbability,
    )
  }

  return selectedCountDistribution
}

function getChanceRequiredPerkGroupsFromAvailableProbability({
  attemptCount,
  availablePerkGroupIds,
  requiredPerkGroupIds,
  successProbability,
}: {
  attemptCount: number
  availablePerkGroupIds: string[]
  requiredPerkGroupIds: Set<string>
  successProbability: number
}): number {
  if (requiredPerkGroupIds.size === 0) {
    return 1
  }

  const availablePerkGroupIdSet = new Set(availablePerkGroupIds)

  for (const requiredPerkGroupId of requiredPerkGroupIds) {
    if (!availablePerkGroupIdSet.has(requiredPerkGroupId)) {
      return 0
    }
  }

  if (attemptCount <= 0 || successProbability <= 0) {
    return 0
  }

  const availablePerkGroupCount = availablePerkGroupIds.length
  const requiredPerkGroupCount = requiredPerkGroupIds.size
  const selectedCountDistribution = getChanceSelectedCountDistribution(
    attemptCount,
    successProbability,
    availablePerkGroupCount,
  )

  let probability = 0

  for (const [selectedCount, selectedCountProbability] of selectedCountDistribution) {
    if (selectedCount < requiredPerkGroupCount) {
      continue
    }

    probability +=
      selectedCountProbability *
      (countCombinations(
        availablePerkGroupCount - requiredPerkGroupCount,
        selectedCount - requiredPerkGroupCount,
      ) /
        countCombinations(availablePerkGroupCount, selectedCount))
  }

  return probability
}

function getChanceCategoryRequiredProbability(
  categoryDefinition: LegendsBackgroundFitCategoryDefinition,
  poolPerkGroupIds: string[],
  requiredPerkGroupIds: Set<string>,
): number {
  if (requiredPerkGroupIds.size === 0) {
    return 1
  }

  const poolPerkGroupIdSet = new Set(poolPerkGroupIds)
  const explicitPerkGroupIdSet = new Set(categoryDefinition.perkGroupIds)
  const randomRequiredPerkGroupIds = new Set<string>()

  for (const requiredPerkGroupId of requiredPerkGroupIds) {
    if (explicitPerkGroupIdSet.has(requiredPerkGroupId)) {
      continue
    }

    if (!poolPerkGroupIdSet.has(requiredPerkGroupId)) {
      return 0
    }

    randomRequiredPerkGroupIds.add(requiredPerkGroupId)
  }

  if (randomRequiredPerkGroupIds.size === 0) {
    return 1
  }

  return getChanceRequiredPerkGroupsFromAvailableProbability({
    attemptCount: getChanceAttemptCount(categoryDefinition),
    availablePerkGroupIds: getRemainingPerkGroupIds(poolPerkGroupIds, explicitPerkGroupIdSet),
    requiredPerkGroupIds: randomRequiredPerkGroupIds,
    successProbability: clampProbability(categoryDefinition.chance ?? 0),
  })
}

function forEachDeterministicCategoryOutcome(
  categoryDefinition: LegendsBackgroundFitCategoryDefinition,
  poolPerkGroupIds: string[],
  callback: (perkGroupIdSet: Set<string>, probability: number) => void,
): void {
  const explicitPerkGroupIdSet = new Set(categoryDefinition.perkGroupIds)
  const remainingPerkGroupIds = getRemainingPerkGroupIds(poolPerkGroupIds, explicitPerkGroupIdSet)
  const randomPerkGroupCount = getAdditionalRandomPerkGroupCount(
    categoryDefinition,
    remainingPerkGroupIds.length,
  )
  const totalCombinationCount = countCombinations(
    remainingPerkGroupIds.length,
    randomPerkGroupCount,
  )

  if (totalCombinationCount === 0) {
    return
  }

  forEachSubsetOfSize(remainingPerkGroupIds, randomPerkGroupCount, (perkGroupSubset) => {
    callback(new Set([...explicitPerkGroupIdSet, ...perkGroupSubset]), 1 / totalCombinationCount)
  })
}

function getClassAndWeaponRequiredProbability({
  backgroundDefinition,
  classRequiredPerkGroupIds,
  context,
  weaponRequiredPerkGroupIds,
}: {
  backgroundDefinition: LegendsBackgroundFitBackgroundDefinition
  classRequiredPerkGroupIds: Set<string>
  context: BackgroundProbabilityContext
  weaponRequiredPerkGroupIds: Set<string>
}): number {
  const weaponCategoryDefinition = getCategoryDefinition(backgroundDefinition, 'Weapon')
  const weaponPoolPerkGroupIds = context.perkGroupIdsByCategory.get('Weapon') ?? []
  const classCategoryDefinition = getCategoryDefinition(backgroundDefinition, 'Class')
  const classPoolPerkGroupIds = context.perkGroupIdsByCategory.get('Class') ?? []
  const classPoolPerkGroupIdSet = new Set(classPoolPerkGroupIds)
  const explicitClassPerkGroupIdSet = new Set(classCategoryDefinition.perkGroupIds)
  const randomRequiredClassPerkGroupIds = new Set<string>()

  for (const requiredClassPerkGroupId of classRequiredPerkGroupIds) {
    if (explicitClassPerkGroupIdSet.has(requiredClassPerkGroupId)) {
      continue
    }

    if (!classPoolPerkGroupIdSet.has(requiredClassPerkGroupId)) {
      return 0
    }

    randomRequiredClassPerkGroupIds.add(requiredClassPerkGroupId)
  }

  if (randomRequiredClassPerkGroupIds.size === 0) {
    return getDeterministicCategoryRequiredProbability(
      weaponCategoryDefinition,
      weaponPoolPerkGroupIds,
      weaponRequiredPerkGroupIds,
    )
  }

  const classAttemptCount = getChanceAttemptCount(classCategoryDefinition)
  const classSuccessProbability = clampProbability(classCategoryDefinition.chance ?? 0)

  if (classAttemptCount <= 0 || classSuccessProbability <= 0) {
    return 0
  }

  let probability = 0

  forEachDeterministicCategoryOutcome(
    weaponCategoryDefinition,
    weaponPoolPerkGroupIds,
    (weaponPerkGroupIdSet, weaponProbability) => {
      if (!hasEveryPerkGroup(weaponPerkGroupIdSet, weaponRequiredPerkGroupIds)) {
        return
      }

      probability +=
        weaponProbability *
        getChanceRequiredPerkGroupsFromAvailableProbability({
          attemptCount: classAttemptCount,
          availablePerkGroupIds: getEligibleRemainingClassPerkGroupIds(
            classPoolPerkGroupIds,
            explicitClassPerkGroupIdSet,
            weaponPerkGroupIdSet,
            context.classWeaponDependencyByClassPerkGroupId,
          ),
          requiredPerkGroupIds: randomRequiredClassPerkGroupIds,
          successProbability: classSuccessProbability,
        })
    },
  )

  return probability
}

function getRequirementSubsetProbability({
  backgroundDefinition,
  context,
  requirements,
}: {
  backgroundDefinition: LegendsBackgroundFitBackgroundDefinition
  context: BackgroundProbabilityContext
  requirements: PerkGroupRequirement[]
}): number {
  const requiredPerkGroupIdsByCategory = new Map<
    LegendsDynamicBackgroundCategoryName,
    Set<string>
  >()

  for (const requirement of requirements) {
    if (!requiredPerkGroupIdsByCategory.has(requirement.categoryName)) {
      requiredPerkGroupIdsByCategory.set(requirement.categoryName, new Set())
    }

    requiredPerkGroupIdsByCategory.get(requirement.categoryName)?.add(requirement.perkGroupId)
  }

  const classRequiredPerkGroupIds = requiredPerkGroupIdsByCategory.get('Class') ?? new Set<string>()
  let probability = 1

  if (classRequiredPerkGroupIds.size > 0) {
    probability *= getClassAndWeaponRequiredProbability({
      backgroundDefinition,
      classRequiredPerkGroupIds,
      context,
      weaponRequiredPerkGroupIds: requiredPerkGroupIdsByCategory.get('Weapon') ?? new Set<string>(),
    })
  }

  for (const categoryName of dynamicBackgroundCategoryNames) {
    if (categoryName === 'Class') {
      continue
    }

    if (categoryName === 'Weapon' && classRequiredPerkGroupIds.size > 0) {
      continue
    }

    const requiredPerkGroupIds = requiredPerkGroupIdsByCategory.get(categoryName)

    if (!requiredPerkGroupIds || requiredPerkGroupIds.size === 0) {
      continue
    }

    const categoryDefinition = getCategoryDefinition(backgroundDefinition, categoryName)
    const poolPerkGroupIds = context.perkGroupIdsByCategory.get(categoryName) ?? []

    if (deterministicDynamicBackgroundCategoryNameSet.has(categoryName)) {
      probability *= getDeterministicCategoryRequiredProbability(
        categoryDefinition,
        poolPerkGroupIds,
        requiredPerkGroupIds,
      )
      continue
    }

    if (chanceDynamicBackgroundCategoryNameSet.has(categoryName)) {
      probability *= getChanceCategoryRequiredProbability(
        categoryDefinition,
        poolPerkGroupIds,
        requiredPerkGroupIds,
      )
      continue
    }

    probability *= getExplicitOnlyCategoryRequiredProbability(
      categoryDefinition,
      requiredPerkGroupIds,
    )
  }

  return probability
}

function getSupportedPerkGroupRequirements(pickedPerk: LegendsPerkRecord): PerkGroupRequirement[] {
  const seenRequirementKeys = new Set<string>()
  const requirements: PerkGroupRequirement[] = []

  for (const placement of pickedPerk.placements) {
    if (!isDynamicBackgroundCategoryName(placement.categoryName)) {
      continue
    }

    const requirementKey = getPlacementGroupRequirementKey(placement)

    if (seenRequirementKeys.has(requirementKey)) {
      continue
    }

    seenRequirementKeys.add(requirementKey)
    requirements.push({
      categoryName: placement.categoryName,
      perkGroupId: placement.perkGroupId,
    })
  }

  return requirements
}

function getPerkCoverageProbability({
  backgroundDefinition,
  context,
  requirements,
}: {
  backgroundDefinition: LegendsBackgroundFitBackgroundDefinition
  context: BackgroundProbabilityContext
  requirements: PerkGroupRequirement[]
}): number {
  if (requirements.length === 0) {
    return 0
  }

  let coverageProbability = 0

  for (let requirementMask = 1; requirementMask < 1 << requirements.length; requirementMask += 1) {
    const requirementSubset: PerkGroupRequirement[] = []

    for (let requirementIndex = 0; requirementIndex < requirements.length; requirementIndex += 1) {
      if ((requirementMask & (1 << requirementIndex)) !== 0) {
        requirementSubset.push(requirements[requirementIndex])
      }
    }

    const subsetProbability = getRequirementSubsetProbability({
      backgroundDefinition,
      context,
      requirements: requirementSubset,
    })

    coverageProbability +=
      requirementSubset.length % 2 === 1 ? subsetProbability : -subsetProbability
  }

  return clampProbability(coverageProbability)
}

function calculateExpectedCoveredPickedPerkCount(
  backgroundDefinition: LegendsBackgroundFitBackgroundDefinition,
  pickedPerks: LegendsPerkRecord[],
  context: BackgroundProbabilityContext,
): number {
  return pickedPerks.reduce(
    (expectedCoveredPickedPerkCount, pickedPerk) =>
      expectedCoveredPickedPerkCount +
      getPerkCoverageProbability({
        backgroundDefinition,
        context,
        requirements: getSupportedPerkGroupRequirements(pickedPerk),
      }),
    0,
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
      probabilitiesByPerkGroupKey.set(
        getPerkGroupProbabilityKey(categoryName, perkGroupId),
        marginalProbability,
      )
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
        const probabilityKey = getPerkGroupProbabilityKey(categoryName, perkGroupId)

        probabilitiesByPerkGroupKey.set(
          probabilityKey,
          (probabilitiesByPerkGroupKey.get(probabilityKey) ?? 0) + marginalProbability,
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
          pickedPerkIds: [],
          pickedPerkNames: [],
          perkGroupIconPath: placement.perkGroupIconPath,
          perkGroupId: placement.perkGroupId,
          perkGroupName: placement.perkGroupName,
        })
      }

      const buildTargetPerkGroup = buildTargetPerkGroupsById.get(placementKey)

      if (!buildTargetPerkGroup || buildTargetPerkGroup.pickedPerkIdSet.has(pickedPerk.id)) {
        continue
      }

      buildTargetPerkGroup.pickedPerkIdSet.add(pickedPerk.id)
      buildTargetPerkGroup.pickedPerkIds.push(pickedPerk.id)
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

function getUniqueDynamicPerkPlacements(perk: LegendsPerkRecord): DynamicPerkPlacement[] {
  const seenPlacementKeys = new Set<string>()
  const dynamicPlacements: DynamicPerkPlacement[] = []

  for (const placement of perk.placements) {
    const placementKey = getPlacementGroupRequirementKey(placement)

    if (
      !isDynamicBackgroundCategoryName(placement.categoryName) ||
      seenPlacementKeys.has(placementKey)
    ) {
      continue
    }

    seenPlacementKeys.add(placementKey)
    dynamicPlacements.push({
      ...placement,
      categoryName: placement.categoryName,
    })
  }

  return dynamicPlacements
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

function normalizeBackgroundFitMatches(matches: BackgroundFitMatch[]): BackgroundFitMatch[] {
  const guaranteedPickedPerkIdSet = new Set(
    matches.filter((match) => match.isGuaranteed).flatMap((match) => match.pickedPerkIds),
  )

  if (guaranteedPickedPerkIdSet.size === 0) {
    return matches
  }

  return matches
    .flatMap((match) => {
      if (match.isGuaranteed) {
        return [match]
      }

      const pickedPerkIds: string[] = []
      const pickedPerkNames: string[] = []

      for (const [pickedPerkIndex, pickedPerkId] of match.pickedPerkIds.entries()) {
        if (guaranteedPickedPerkIdSet.has(pickedPerkId)) {
          continue
        }

        pickedPerkIds.push(pickedPerkId)
        pickedPerkNames.push(match.pickedPerkNames[pickedPerkIndex] ?? pickedPerkId)
      }

      if (pickedPerkIds.length === 0) {
        return []
      }

      return [
        {
          ...match,
          pickedPerkCount: pickedPerkIds.length,
          pickedPerkIds,
          pickedPerkNames,
        },
      ]
    })
    .toSorted(compareBackgroundFitMatches)
}

export function getCoveredPickedPerkCount(matches: BackgroundFitMatch[]): number {
  return new Set(matches.flatMap((match) => match.pickedPerkIds)).size
}

export function getGuaranteedCoveredPickedPerkCount(matches: BackgroundFitMatch[]): number {
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
    rightBackgroundFit.expectedCoveredPickedPerkCount -
      leftBackgroundFit.expectedCoveredPickedPerkCount ||
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
      probabilitiesByPerkGroupKey: calculateBackgroundPerkGroupProbabilities(
        backgroundDefinition,
        backgroundProbabilityContext,
      ),
    }))
  const probabilityRecordByBackgroundId = new Map(
    backgroundProbabilityRecords.map((backgroundProbabilityRecord) => [
      backgroundProbabilityRecord.backgroundDefinition.backgroundId,
      backgroundProbabilityRecord,
    ]),
  )

  return {
    getBackgroundPerkGroupProbability(backgroundId, categoryName, perkGroupId) {
      return (
        probabilityRecordByBackgroundId
          .get(backgroundId)
          ?.probabilitiesByPerkGroupKey.get(
            getPerkGroupProbabilityKey(categoryName, perkGroupId),
          ) ?? 0
      )
    },
    getPerkBackgroundSources(perk) {
      const dynamicPlacements = getUniqueDynamicPerkPlacements(perk)

      return backgroundProbabilityRecords
        .flatMap(({ backgroundDefinition, probabilitiesByPerkGroupKey }) =>
          dynamicPlacements.flatMap((placement) => {
            const categoryDefinition = backgroundDefinition.categories[placement.categoryName]
            const probability =
              probabilitiesByPerkGroupKey.get(
                getPerkGroupProbabilityKey(placement.categoryName, placement.perkGroupId),
              ) ?? 0

            if (!categoryDefinition || probability <= 0) {
              return []
            }

            return [
              {
                backgroundId: backgroundDefinition.backgroundId,
                backgroundName: backgroundDefinition.backgroundName,
                categoryName: placement.categoryName,
                chance: categoryDefinition.chance ?? null,
                minimumPerkGroups: categoryDefinition.minimumPerkGroups ?? null,
                perkGroupId: placement.perkGroupId,
                perkGroupName: placement.perkGroupName,
              },
            ]
          }),
        )
        .toSorted(comparePerkBackgroundSources)
    },
    getBackgroundFitView(pickedPerks, studyResourceFilter) {
      const { supportedBuildTargetPerkGroups, unsupportedBuildTargetPerkGroups } =
        getBuildTargetPerkGroups(pickedPerks)

      return {
        rankedBackgroundFits: backgroundProbabilityRecords
          .filter(({ backgroundDefinition }) =>
            studyResourceFilter === undefined ||
            isBuildReachableWithStudyResources({
              canUseNativeRequirements: (requirements) =>
                getRequirementSubsetProbability({
                  backgroundDefinition,
                  context: backgroundProbabilityContext,
                  requirements,
                }) > 0,
              filter: studyResourceFilter,
              pickedPerks,
            }),
          )
          .map(
            ({ backgroundDefinition, maximumTotalPerkGroupCount, probabilitiesByPerkGroupKey }) => {
              const matches = normalizeBackgroundFitMatches(
                supportedBuildTargetPerkGroups
                  .flatMap((buildTargetPerkGroup) => {
                    const probability =
                      probabilitiesByPerkGroupKey.get(
                        getPerkGroupProbabilityKey(
                          buildTargetPerkGroup.categoryName,
                          buildTargetPerkGroup.perkGroupId,
                        ),
                      ) ?? 0

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
                  .toSorted(compareBackgroundFitMatches),
              )

              return {
                backgroundId: backgroundDefinition.backgroundId,
                backgroundName: backgroundDefinition.backgroundName,
                disambiguator:
                  (duplicateBackgroundNameCountByName.get(backgroundDefinition.backgroundName) ??
                    0) > 1
                    ? getBackgroundDisambiguator(backgroundDefinition)
                    : null,
                expectedCoveredPickedPerkCount: calculateExpectedCoveredPickedPerkCount(
                  backgroundDefinition,
                  pickedPerks,
                  backgroundProbabilityContext,
                ),
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
  return getPerkGroupProbabilityKey(placement.categoryName, placement.perkGroupId)
}
