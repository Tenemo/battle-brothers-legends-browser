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
  dynamicBackgroundCategoryNames,
  getCategoryPriority,
  isDynamicBackgroundCategoryName,
} from './perk-categories'

const deterministicDynamicBackgroundCategoryNameSet = new Set<LegendsDynamicBackgroundCategoryName>(
  ['Weapon', 'Defense', 'Traits'],
)

const chanceDynamicBackgroundCategoryNameSet = new Set<LegendsDynamicBackgroundCategoryName>([
  'Enemy',
  'Profession',
  'Magic',
])

type BackgroundProbabilityRecord = {
  backgroundDefinition: LegendsBackgroundFitBackgroundDefinition
  maximumTotalGroupCount: number
  probabilitiesByTreeId: Map<string, number>
}

type ClassWeaponDependencyByClassTreeId = Map<string, Set<string>>

type BackgroundProbabilityContext = {
  classWeaponDependencyByClassTreeId: ClassWeaponDependencyByClassTreeId
  treeIdsByCategory: Map<LegendsDynamicBackgroundCategoryName, string[]>
}

export type BuildTargetTree = {
  categoryName: string
  pickedPerkCount: number
  pickedPerkNames: string[]
  treeId: string
  treeName: string
}

export type BackgroundFitMatch = BuildTargetTree & {
  isGuaranteed: boolean
  probability: number
}

export type RankedBackgroundFit = {
  backgroundId: string
  backgroundName: string
  disambiguator: string | null
  expectedMatchedTreeCount: number
  guaranteedMatchedTreeCount: number
  iconPath: string | null
  maximumTotalGroupCount: number
  matches: BackgroundFitMatch[]
  sourceFilePath: string
}

export type BackgroundFitView = {
  rankedBackgroundFits: RankedBackgroundFit[]
  supportedBuildTargetTrees: BuildTargetTree[]
  unsupportedBuildTargetTrees: BuildTargetTree[]
}

type BackgroundFitEngine = {
  getBackgroundFitView: (pickedPerks: LegendsPerkRecord[]) => BackgroundFitView
}

function compareBuildTargetTrees(leftTree: BuildTargetTree, rightTree: BuildTargetTree): number {
  return (
    rightTree.pickedPerkCount - leftTree.pickedPerkCount ||
    getCategoryPriority(leftTree.categoryName) - getCategoryPriority(rightTree.categoryName) ||
    leftTree.treeName.localeCompare(rightTree.treeName) ||
    leftTree.treeId.localeCompare(rightTree.treeId)
  )
}

function clampProbability(probability: number): number {
  return Math.max(0, Math.min(1, probability))
}

function getExpectedSuccessfulDrawCount(
  attemptCount: number,
  successProbability: number,
  availableTreeCount: number,
): number {
  if (attemptCount <= 0 || successProbability <= 0 || availableTreeCount <= 0) {
    return 0
  }

  if (successProbability >= 1) {
    return Math.min(attemptCount, availableTreeCount)
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
      Math.min(successCount, availableTreeCount) * successCountProbability,
    0,
  )
}

function getAdditionalRandomTreeCount(
  categoryDefinition: LegendsBackgroundFitCategoryDefinition,
  availableTreeCount: number,
): number {
  const explicitTreeCount = new Set(categoryDefinition.treeIds).size

  return Math.min(
    Math.max(0, (categoryDefinition.minimumTrees ?? 0) - explicitTreeCount),
    availableTreeCount,
  )
}

function getChanceAttemptCount(categoryDefinition: LegendsBackgroundFitCategoryDefinition): number {
  const explicitTreeCount = new Set(categoryDefinition.treeIds).size

  return Math.max(0, (categoryDefinition.minimumTrees ?? 0) - explicitTreeCount + 1)
}

function buildTreeIdsByCategory(
  perks: LegendsPerkRecord[],
): Map<LegendsDynamicBackgroundCategoryName, string[]> {
  const treeIdsByCategory = new Map<LegendsDynamicBackgroundCategoryName, Set<string>>()

  for (const categoryName of dynamicBackgroundCategoryNames) {
    treeIdsByCategory.set(categoryName, new Set())
  }

  for (const perk of perks) {
    for (const placement of perk.placements) {
      if (!isDynamicBackgroundCategoryName(placement.categoryName)) {
        continue
      }

      treeIdsByCategory.get(placement.categoryName)?.add(placement.treeId)
    }
  }

  return new Map(
    [...treeIdsByCategory.entries()].map(([categoryName, treeIds]) => [
      categoryName,
      [...treeIds].toSorted((leftTreeId, rightTreeId) => leftTreeId.localeCompare(rightTreeId)),
    ]),
  )
}

function buildClassWeaponDependencyByClassTreeId(
  classWeaponDependencies: LegendsBackgroundFitClassWeaponDependency[],
): ClassWeaponDependencyByClassTreeId {
  const classWeaponDependencyByClassTreeId: ClassWeaponDependencyByClassTreeId = new Map()

  for (const classWeaponDependency of classWeaponDependencies) {
    if (!classWeaponDependencyByClassTreeId.has(classWeaponDependency.classTreeId)) {
      classWeaponDependencyByClassTreeId.set(classWeaponDependency.classTreeId, new Set())
    }

    classWeaponDependencyByClassTreeId
      .get(classWeaponDependency.classTreeId)
      ?.add(classWeaponDependency.weaponTreeId)
  }

  return classWeaponDependencyByClassTreeId
}

function addExplicitTreeProbabilities(
  probabilitiesByTreeId: Map<string, number>,
  explicitTreeIds: string[],
): Set<string> {
  const explicitTreeIdSet = new Set<string>()

  for (const treeId of explicitTreeIds) {
    explicitTreeIdSet.add(treeId)
    probabilitiesByTreeId.set(treeId, 1)
  }

  return explicitTreeIdSet
}

function getRemainingTreeIds(poolTreeIds: string[], explicitTreeIdSet: Set<string>): string[] {
  return poolTreeIds.filter((treeId) => !explicitTreeIdSet.has(treeId))
}

function isClassTreeEligible(
  classTreeId: string,
  presentWeaponTreeIdSet: Set<string>,
  classWeaponDependencyByClassTreeId: ClassWeaponDependencyByClassTreeId,
): boolean {
  const requiredWeaponTreeIdSet = classWeaponDependencyByClassTreeId.get(classTreeId)

  if (!requiredWeaponTreeIdSet || requiredWeaponTreeIdSet.size === 0) {
    return true
  }

  for (const requiredWeaponTreeId of requiredWeaponTreeIdSet) {
    if (presentWeaponTreeIdSet.has(requiredWeaponTreeId)) {
      return true
    }
  }

  return false
}

function getEligibleRemainingClassTreeIds(
  poolTreeIds: string[],
  explicitTreeIdSet: Set<string>,
  presentWeaponTreeIdSet: Set<string>,
  classWeaponDependencyByClassTreeId: ClassWeaponDependencyByClassTreeId,
): string[] {
  return poolTreeIds.filter(
    (treeId) =>
      !explicitTreeIdSet.has(treeId) &&
      isClassTreeEligible(treeId, presentWeaponTreeIdSet, classWeaponDependencyByClassTreeId),
  )
}

function addDeterministicCategoryProbabilities(
  probabilitiesByTreeId: Map<string, number>,
  categoryDefinition: LegendsBackgroundFitCategoryDefinition,
  poolTreeIds: string[],
): void {
  const explicitTreeIdSet = addExplicitTreeProbabilities(
    probabilitiesByTreeId,
    categoryDefinition.treeIds,
  )
  const remainingTreeIds = getRemainingTreeIds(poolTreeIds, explicitTreeIdSet)
  const additionalRandomTreeCount = getAdditionalRandomTreeCount(
    categoryDefinition,
    remainingTreeIds.length,
  )
  const marginalProbability =
    remainingTreeIds.length === 0 ? 0 : additionalRandomTreeCount / remainingTreeIds.length

  for (const treeId of remainingTreeIds) {
    probabilitiesByTreeId.set(treeId, marginalProbability)
  }
}

function addChanceCategoryProbabilities(
  probabilitiesByTreeId: Map<string, number>,
  categoryDefinition: LegendsBackgroundFitCategoryDefinition,
  poolTreeIds: string[],
): void {
  const explicitTreeIdSet = addExplicitTreeProbabilities(
    probabilitiesByTreeId,
    categoryDefinition.treeIds,
  )
  const remainingTreeIds = getRemainingTreeIds(poolTreeIds, explicitTreeIdSet)
  const marginalProbability =
    remainingTreeIds.length === 0
      ? 0
      : getExpectedSuccessfulDrawCount(
          getChanceAttemptCount(categoryDefinition),
          clampProbability(categoryDefinition.chance ?? 0),
          remainingTreeIds.length,
        ) / remainingTreeIds.length

  for (const treeId of remainingTreeIds) {
    probabilitiesByTreeId.set(treeId, marginalProbability)
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
  probabilitiesByTreeId: Map<string, number>,
  categoryDefinition: LegendsBackgroundFitCategoryDefinition,
  poolTreeIds: string[],
  weaponCategoryDefinition: LegendsBackgroundFitCategoryDefinition,
  weaponPoolTreeIds: string[],
  classWeaponDependencyByClassTreeId: ClassWeaponDependencyByClassTreeId,
): void {
  const explicitTreeIdSet = addExplicitTreeProbabilities(
    probabilitiesByTreeId,
    categoryDefinition.treeIds,
  )
  const explicitWeaponTreeIdSet = new Set<string>(weaponCategoryDefinition.treeIds)
  const remainingWeaponTreeIds = getRemainingTreeIds(weaponPoolTreeIds, explicitWeaponTreeIdSet)
  const randomWeaponTreeCount = getAdditionalRandomTreeCount(
    weaponCategoryDefinition,
    remainingWeaponTreeIds.length,
  )
  const totalWeaponSubsetCount = countCombinations(
    remainingWeaponTreeIds.length,
    randomWeaponTreeCount,
  )
  const subsetProbability = totalWeaponSubsetCount === 0 ? 0 : 1 / totalWeaponSubsetCount
  const successProbability = clampProbability(categoryDefinition.chance ?? 0)
  const classAttemptCount = getChanceAttemptCount(categoryDefinition)

  if (randomWeaponTreeCount === 0) {
    const presentWeaponTreeIdSet = new Set<string>(explicitWeaponTreeIdSet)
    const eligibleRemainingTreeIds = getEligibleRemainingClassTreeIds(
      poolTreeIds,
      explicitTreeIdSet,
      presentWeaponTreeIdSet,
      classWeaponDependencyByClassTreeId,
    )

    const marginalProbability =
      eligibleRemainingTreeIds.length === 0
        ? 0
        : getExpectedSuccessfulDrawCount(
            classAttemptCount,
            successProbability,
            eligibleRemainingTreeIds.length,
          ) / eligibleRemainingTreeIds.length

    for (const treeId of eligibleRemainingTreeIds) {
      probabilitiesByTreeId.set(treeId, marginalProbability)
    }

    return
  }

  forEachSubsetOfSize(remainingWeaponTreeIds, randomWeaponTreeCount, (weaponTreeSubset) => {
    const presentWeaponTreeIdSet = new Set<string>(explicitWeaponTreeIdSet)

    for (const weaponTreeId of weaponTreeSubset) {
      presentWeaponTreeIdSet.add(weaponTreeId)
    }

    const eligibleRemainingTreeIds = getEligibleRemainingClassTreeIds(
      poolTreeIds,
      explicitTreeIdSet,
      presentWeaponTreeIdSet,
      classWeaponDependencyByClassTreeId,
    )

    if (eligibleRemainingTreeIds.length === 0) {
      return
    }

    const marginalProbability =
      (getExpectedSuccessfulDrawCount(
        classAttemptCount,
        successProbability,
        eligibleRemainingTreeIds.length,
      ) /
        eligibleRemainingTreeIds.length) *
      subsetProbability

    for (const treeId of eligibleRemainingTreeIds) {
      probabilitiesByTreeId.set(
        treeId,
        (probabilitiesByTreeId.get(treeId) ?? 0) + marginalProbability,
      )
    }
  })
}

function getMaximumEligibleRemainingClassTreeCount(
  categoryDefinition: LegendsBackgroundFitCategoryDefinition,
  poolTreeIds: string[],
  weaponCategoryDefinition: LegendsBackgroundFitCategoryDefinition,
  weaponPoolTreeIds: string[],
  classWeaponDependencyByClassTreeId: ClassWeaponDependencyByClassTreeId,
): number {
  const explicitTreeIdSet = new Set<string>(categoryDefinition.treeIds)
  const explicitWeaponTreeIdSet = new Set<string>(weaponCategoryDefinition.treeIds)
  const remainingWeaponTreeIds = getRemainingTreeIds(weaponPoolTreeIds, explicitWeaponTreeIdSet)
  const randomWeaponTreeCount = getAdditionalRandomTreeCount(
    weaponCategoryDefinition,
    remainingWeaponTreeIds.length,
  )

  if (randomWeaponTreeCount === 0) {
    return getEligibleRemainingClassTreeIds(
      poolTreeIds,
      explicitTreeIdSet,
      explicitWeaponTreeIdSet,
      classWeaponDependencyByClassTreeId,
    ).length
  }

  let maximumEligibleRemainingClassTreeCount = 0

  forEachSubsetOfSize(remainingWeaponTreeIds, randomWeaponTreeCount, (weaponTreeSubset) => {
    const presentWeaponTreeIdSet = new Set<string>(explicitWeaponTreeIdSet)

    for (const weaponTreeId of weaponTreeSubset) {
      presentWeaponTreeIdSet.add(weaponTreeId)
    }

    maximumEligibleRemainingClassTreeCount = Math.max(
      maximumEligibleRemainingClassTreeCount,
      getEligibleRemainingClassTreeIds(
        poolTreeIds,
        explicitTreeIdSet,
        presentWeaponTreeIdSet,
        classWeaponDependencyByClassTreeId,
      ).length,
    )
  })

  return maximumEligibleRemainingClassTreeCount
}

function getMaximumCategoryTreeCount(
  backgroundDefinition: LegendsBackgroundFitBackgroundDefinition,
  categoryName: LegendsDynamicBackgroundCategoryName,
  context: BackgroundProbabilityContext,
): number {
  const categoryDefinition = backgroundDefinition.categories[categoryName]

  if (!categoryDefinition) {
    return 0
  }

  const poolTreeIds = context.treeIdsByCategory.get(categoryName) ?? []
  const explicitTreeIdSet = new Set<string>(categoryDefinition.treeIds)
  const explicitTreeCount = explicitTreeIdSet.size
  const remainingTreeIds = getRemainingTreeIds(poolTreeIds, explicitTreeIdSet)

  if (deterministicDynamicBackgroundCategoryNameSet.has(categoryName)) {
    return (
      explicitTreeCount + getAdditionalRandomTreeCount(categoryDefinition, remainingTreeIds.length)
    )
  }

  if (categoryName === 'Enemy' || categoryName === 'Profession') {
    if (clampProbability(categoryDefinition.chance ?? 0) <= 0) {
      return explicitTreeCount
    }

    return (
      explicitTreeCount +
      Math.min(getChanceAttemptCount(categoryDefinition), remainingTreeIds.length)
    )
  }

  if (categoryName === 'Class') {
    if (clampProbability(categoryDefinition.chance ?? 0) <= 0) {
      return explicitTreeCount
    }

    return (
      explicitTreeCount +
      Math.min(
        getChanceAttemptCount(categoryDefinition),
        getMaximumEligibleRemainingClassTreeCount(
          categoryDefinition,
          poolTreeIds,
          backgroundDefinition.categories.Weapon ?? {
            chance: null,
            minimumTrees: 0,
            treeIds: [],
          },
          context.treeIdsByCategory.get('Weapon') ?? [],
          context.classWeaponDependencyByClassTreeId,
        ),
      )
    )
  }

  // In Legends 19.3.17, GetDynamicPerkTree's magic loop never appends random trees.
  return explicitTreeCount
}

function getMaximumTotalGroupCount(
  backgroundDefinition: LegendsBackgroundFitBackgroundDefinition,
  context: BackgroundProbabilityContext,
): number {
  return dynamicBackgroundCategoryNames.reduce(
    (maximumTotalGroupCount, categoryName) =>
      maximumTotalGroupCount +
      getMaximumCategoryTreeCount(backgroundDefinition, categoryName, context),
    0,
  )
}

export function calculateBackgroundTreeProbabilities(
  backgroundDefinition: LegendsBackgroundFitBackgroundDefinition,
  context: BackgroundProbabilityContext,
): Map<string, number> {
  const probabilitiesByTreeId = new Map<string, number>()

  for (const categoryName of dynamicBackgroundCategoryNames) {
    const categoryDefinition = backgroundDefinition.categories[categoryName]
    const poolTreeIds = context.treeIdsByCategory.get(categoryName) ?? []

    if (!categoryDefinition || poolTreeIds.length === 0) {
      continue
    }

    if (deterministicDynamicBackgroundCategoryNameSet.has(categoryName)) {
      addDeterministicCategoryProbabilities(probabilitiesByTreeId, categoryDefinition, poolTreeIds)
      continue
    }

    if (chanceDynamicBackgroundCategoryNameSet.has(categoryName)) {
      addChanceCategoryProbabilities(probabilitiesByTreeId, categoryDefinition, poolTreeIds)
      continue
    }

    if (categoryName === 'Class') {
      addClassCategoryProbabilities(
        probabilitiesByTreeId,
        categoryDefinition,
        poolTreeIds,
        backgroundDefinition.categories.Weapon ?? {
          chance: null,
          minimumTrees: 0,
          treeIds: [],
        },
        context.treeIdsByCategory.get('Weapon') ?? [],
        context.classWeaponDependencyByClassTreeId,
      )
    }
  }

  return probabilitiesByTreeId
}

export function getBuildTargetTrees(pickedPerks: LegendsPerkRecord[]): {
  supportedBuildTargetTrees: BuildTargetTree[]
  unsupportedBuildTargetTrees: BuildTargetTree[]
} {
  const buildTargetTreesById = new Map<
    string,
    BuildTargetTree & {
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

      if (!buildTargetTreesById.has(placementKey)) {
        buildTargetTreesById.set(placementKey, {
          categoryName: placement.categoryName,
          pickedPerkCount: 0,
          pickedPerkIdSet: new Set<string>(),
          pickedPerkNames: [],
          treeId: placement.treeId,
          treeName: placement.treeName,
        })
      }

      const buildTargetTree = buildTargetTreesById.get(placementKey)

      if (!buildTargetTree || buildTargetTree.pickedPerkIdSet.has(pickedPerk.id)) {
        continue
      }

      buildTargetTree.pickedPerkIdSet.add(pickedPerk.id)
      buildTargetTree.pickedPerkNames.push(pickedPerk.perkName)
      buildTargetTree.pickedPerkCount += 1
    }
  }

  const buildTargetTrees = [...buildTargetTreesById.values()]
    .map((buildTargetTree) => {
      const { pickedPerkIdSet, ...normalizedBuildTargetTree } = buildTargetTree
      void pickedPerkIdSet

      return normalizedBuildTargetTree
    })
    .toSorted(compareBuildTargetTrees)

  return {
    supportedBuildTargetTrees: buildTargetTrees.filter((buildTargetTree) =>
      isDynamicBackgroundCategoryName(buildTargetTree.categoryName),
    ),
    unsupportedBuildTargetTrees: buildTargetTrees.filter(
      (buildTargetTree) => !isDynamicBackgroundCategoryName(buildTargetTree.categoryName),
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
    leftMatch.treeName.localeCompare(rightMatch.treeName) ||
    leftMatch.treeId.localeCompare(rightMatch.treeId)
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
  const treeIdsByCategory = buildTreeIdsByCategory(dataset.perks)
  const classWeaponDependencyByClassTreeId = buildClassWeaponDependencyByClassTreeId(
    dataset.backgroundFitRules.classWeaponDependencies,
  )
  const backgroundProbabilityContext = {
    classWeaponDependencyByClassTreeId,
    treeIdsByCategory,
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
      maximumTotalGroupCount: getMaximumTotalGroupCount(
        backgroundDefinition,
        backgroundProbabilityContext,
      ),
      probabilitiesByTreeId: calculateBackgroundTreeProbabilities(
        backgroundDefinition,
        backgroundProbabilityContext,
      ),
    }))

  return {
    getBackgroundFitView(pickedPerks) {
      const { supportedBuildTargetTrees, unsupportedBuildTargetTrees } =
        getBuildTargetTrees(pickedPerks)

      return {
        rankedBackgroundFits: backgroundProbabilityRecords
          .map(({ backgroundDefinition, maximumTotalGroupCount, probabilitiesByTreeId }) => {
            const matches = supportedBuildTargetTrees
              .flatMap((buildTargetTree) => {
                const probability = probabilitiesByTreeId.get(buildTargetTree.treeId) ?? 0

                if (probability <= 0) {
                  return []
                }

                return [
                  {
                    ...buildTargetTree,
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
                (duplicateBackgroundNameCountByName.get(backgroundDefinition.backgroundName) ?? 0) >
                1
                  ? getBackgroundDisambiguator(backgroundDefinition)
                  : null,
              expectedMatchedTreeCount: matches.reduce(
                (expectedTreeCount, match) => expectedTreeCount + match.probability,
                0,
              ),
              guaranteedMatchedTreeCount: matches.filter((match) => match.isGuaranteed).length,
              iconPath: backgroundDefinition.iconPath ?? null,
              maximumTotalGroupCount,
              matches,
              sourceFilePath: backgroundDefinition.sourceFilePath,
            }
          })
          .toSorted(compareRankedBackgroundFits),
        supportedBuildTargetTrees,
        unsupportedBuildTargetTrees,
      }
    },
  }
}

function getPlacementGroupRequirementKey(placement: LegendsPerkPlacement): string {
  return `${placement.categoryName}::${placement.treeId}`
}
