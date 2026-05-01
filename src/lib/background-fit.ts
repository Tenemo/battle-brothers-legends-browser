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
  createStudyResourceMaskCoverageProfile,
  getMinimumStudyResourceRequirementProfile,
  type BackgroundStudyResourceFilter,
  type StudyResourceMaskCoverageProfile,
  type StudyResourceRequirementProfile,
  type StudyReachabilityRequirement,
} from './background-study-reachability'

const deterministicDynamicBackgroundCategoryNameSet = new Set<LegendsDynamicBackgroundCategoryName>(
  deterministicDynamicBackgroundCategoryNames,
)

const chanceDynamicBackgroundCategoryNameSet = new Set<LegendsDynamicBackgroundCategoryName>([
  ...chanceDynamicBackgroundCategoryNames,
])
const maximumBackgroundFitBuildCacheEntries = 8
const nativeOnlySummaryCacheKey = 'native-only'

type BackgroundProbabilityRecord = {
  backgroundDefinition: LegendsBackgroundFitBackgroundDefinition
  maximumTotalPerkGroupCount: number
  probabilitiesByPerkGroupKey: Map<string, number>
}

type CoverageMask = bigint

type BackgroundOutcomeDistribution = Map<CoverageMask, number>

type BackgroundFitProjection = {
  allPickedMask: CoverageMask
  groupCoverageMaskByRequirementKey: Map<string, CoverageMask>
  pickedPerkMaskById: Map<string, CoverageMask>
}

type NativeOutcomeSummary = {
  buildReachabilityProbability: number
  maximumNativeCoveredPickedPerkCount: number
}

export type BackgroundFitSummary = Omit<
  RankedBackgroundFit,
  | 'buildReachabilityProbability'
  | 'expectedCoveredMustHavePerkCount'
  | 'expectedCoveredOptionalPerkCount'
  | 'fullBuildReachabilityProbability'
  | 'guaranteedCoveredMustHavePerkCount'
  | 'guaranteedCoveredOptionalPerkCount'
  | 'maximumNativeCoveredPickedPerkCount'
  | 'mustHaveBuildReachabilityProbability'
  | 'fullBuildStudyResourceRequirement'
  | 'mustHaveStudyResourceRequirement'
>

type CachedBackgroundFitRecord = {
  backgroundProbabilityRecord: BackgroundProbabilityRecord
  baseBackgroundFit: BackgroundFitSummary | null
  expectedCoveredPickedPerkCountByScopeKey: Map<string, number>
  nativeOutcomeDistribution: BackgroundOutcomeDistribution | null
  nativeOutcomeSummaryByFilterKey: Map<string, NativeOutcomeSummary>
  nativeRequirementReachabilityByKey: Map<string, boolean>
  studyResourceRequirementByFilterKey: Map<string, StudyResourceRequirementProfile | null>
}

type BackgroundFitBuildCache = {
  cachedBackgroundFitRecords: CachedBackgroundFitRecord[]
  projection: BackgroundFitProjection
  supportedBuildTargetPerkGroups: BuildTargetPerkGroup[]
  unsupportedBuildTargetPerkGroups: BuildTargetPerkGroup[]
}

type FullCategoryOutcome = {
  perkGroupIds: Set<string>
  probability: number
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
  buildReachabilityProbability: number | null
  disambiguator: string | null
  expectedCoveredMustHavePerkCount: number
  expectedCoveredOptionalPerkCount: number
  expectedCoveredPickedPerkCount: number
  expectedMatchedPerkGroupCount: number
  fullBuildStudyResourceRequirement: StudyResourceRequirementProfile | null
  fullBuildReachabilityProbability: number | null
  guaranteedCoveredMustHavePerkCount: number
  guaranteedCoveredOptionalPerkCount: number
  guaranteedMatchedPerkGroupCount: number
  iconPath: string | null
  maximumNativeCoveredPickedPerkCount: number
  maximumTotalPerkGroupCount: number
  matches: BackgroundFitMatch[]
  mustHaveBuildReachabilityProbability: number | null
  mustHaveStudyResourceRequirement: StudyResourceRequirementProfile | null
  sourceFilePath: string
  veteranPerkLevelInterval: number
}

export type BackgroundFitView = {
  rankedBackgroundFits: RankedBackgroundFit[]
  supportedBuildTargetPerkGroups: BuildTargetPerkGroup[]
  unsupportedBuildTargetPerkGroups: BuildTargetPerkGroup[]
}

export type BackgroundFitSummaryView = {
  rankedBackgroundFitSummaries: BackgroundFitSummary[]
  supportedBuildTargetPerkGroups: BuildTargetPerkGroup[]
  unsupportedBuildTargetPerkGroups: BuildTargetPerkGroup[]
}

export type BackgroundFitCalculationProgress = {
  checkedBackgroundCount: number
  totalBackgroundCount: number
}

export type BackgroundFitPartialView = BackgroundFitCalculationProgress & {
  view: BackgroundFitView
}

export type BackgroundFitViewOptions = {
  onPartialView?: (partialView: BackgroundFitPartialView) => void
  onProgress?: (progress: BackgroundFitCalculationProgress) => void
  partialViewChunkSize?: number
  optionalPickedPerkIds?: ReadonlySet<string>
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
    options?: BackgroundFitViewOptions,
  ) => BackgroundFitView
  getBackgroundFitSummaryView: (pickedPerks: LegendsPerkRecord[]) => BackgroundFitSummaryView
  getPerkBackgroundSources: (perk: LegendsPerkRecord) => LegendsPerkBackgroundSource[]
}

const defaultBackgroundFitPartialViewChunkSize = 8

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

function getPickedPerkMask(pickedPerkIndex: number): CoverageMask {
  return 1n << BigInt(pickedPerkIndex)
}

function addOutcomeProbability(
  outcomeDistribution: BackgroundOutcomeDistribution,
  coverageMask: CoverageMask,
  probability: number,
): void {
  if (probability <= 0) {
    return
  }

  outcomeDistribution.set(
    coverageMask,
    (outcomeDistribution.get(coverageMask) ?? 0) + probability,
  )
}

function combineOutcomeDistributions(
  leftOutcomeDistribution: BackgroundOutcomeDistribution,
  rightOutcomeDistribution: BackgroundOutcomeDistribution,
): BackgroundOutcomeDistribution {
  const combinedOutcomeDistribution: BackgroundOutcomeDistribution = new Map()

  for (const [leftCoverageMask, leftProbability] of leftOutcomeDistribution) {
    for (const [rightCoverageMask, rightProbability] of rightOutcomeDistribution) {
      addOutcomeProbability(
        combinedOutcomeDistribution,
        leftCoverageMask | rightCoverageMask,
        leftProbability * rightProbability,
      )
    }
  }

  return combinedOutcomeDistribution
}

function getRequirementCoverageMask(
  projection: BackgroundFitProjection,
  categoryName: LegendsDynamicBackgroundCategoryName,
  perkGroupId: string,
): CoverageMask {
  return projection.groupCoverageMaskByRequirementKey.get(
    getPerkGroupProbabilityKey(categoryName, perkGroupId),
  ) ?? 0n
}

function getPerkGroupIdsCoverageMask({
  categoryName,
  perkGroupIds,
  projection,
}: {
  categoryName: LegendsDynamicBackgroundCategoryName
  perkGroupIds: Iterable<string>
  projection: BackgroundFitProjection
}): CoverageMask {
  let coverageMask = 0n

  for (const perkGroupId of perkGroupIds) {
    coverageMask |= getRequirementCoverageMask(projection, categoryName, perkGroupId)
  }

  return coverageMask
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

function createBackgroundFitProjection(pickedPerks: LegendsPerkRecord[]): BackgroundFitProjection {
  const groupCoverageMaskByRequirementKey = new Map<string, CoverageMask>()
  const pickedPerkMaskById = new Map<string, CoverageMask>()
  let pickedPerkIndex = 0

  for (const pickedPerk of pickedPerks) {
    const requirementKeys = new Set<string>()

    for (const placement of pickedPerk.placements) {
      if (!isDynamicBackgroundCategoryName(placement.categoryName)) {
        continue
      }

      requirementKeys.add(getPlacementGroupRequirementKey(placement))
    }

    if (requirementKeys.size === 0) {
      continue
    }

    const pickedPerkMask = getPickedPerkMask(pickedPerkIndex)
    pickedPerkMaskById.set(pickedPerk.id, pickedPerkMask)

    for (const requirementKey of requirementKeys) {
      groupCoverageMaskByRequirementKey.set(
        requirementKey,
        (groupCoverageMaskByRequirementKey.get(requirementKey) ?? 0n) | pickedPerkMask,
      )
    }

    pickedPerkIndex += 1
  }

  return {
    allPickedMask: pickedPerkIndex === 0 ? 0n : (1n << BigInt(pickedPerkIndex)) - 1n,
    groupCoverageMaskByRequirementKey,
    pickedPerkMaskById,
  }
}

function getPickedPerksCoverageMask(
  pickedPerks: LegendsPerkRecord[],
  projection: BackgroundFitProjection,
): CoverageMask {
  let coverageMask = 0n

  for (const pickedPerk of pickedPerks) {
    coverageMask |= projection.pickedPerkMaskById.get(pickedPerk.id) ?? 0n
  }

  return coverageMask
}

function addProjectedRandomOutcomeProbabilities({
  baseCoverageMask,
  categoryName,
  outcomeDistribution,
  projection,
  remainingPerkGroupIds,
  selectedPerkGroupCount,
  selectedPerkGroupCountProbability,
}: {
  baseCoverageMask: CoverageMask
  categoryName: LegendsDynamicBackgroundCategoryName
  outcomeDistribution: BackgroundOutcomeDistribution
  projection: BackgroundFitProjection
  remainingPerkGroupIds: string[]
  selectedPerkGroupCount: number
  selectedPerkGroupCountProbability: number
}): void {
  const totalCombinationCount = countCombinations(
    remainingPerkGroupIds.length,
    selectedPerkGroupCount,
  )

  if (totalCombinationCount === 0 || selectedPerkGroupCountProbability <= 0) {
    return
  }

  const relevantPerkGroups = remainingPerkGroupIds.flatMap((perkGroupId) => {
    const coverageMask = getRequirementCoverageMask(projection, categoryName, perkGroupId)

    return coverageMask === 0n ? [] : [{ coverageMask, perkGroupId }]
  })
  const irrelevantPerkGroupCount = remainingPerkGroupIds.length - relevantPerkGroups.length
  const minimumRelevantSubsetSize = Math.max(0, selectedPerkGroupCount - irrelevantPerkGroupCount)
  const maximumRelevantSubsetSize = Math.min(selectedPerkGroupCount, relevantPerkGroups.length)

  for (
    let relevantSubsetSize = minimumRelevantSubsetSize;
    relevantSubsetSize <= maximumRelevantSubsetSize;
    relevantSubsetSize += 1
  ) {
    const irrelevantSubsetSize = selectedPerkGroupCount - relevantSubsetSize
    const irrelevantCombinationCount = countCombinations(
      irrelevantPerkGroupCount,
      irrelevantSubsetSize,
    )

    if (irrelevantCombinationCount === 0) {
      continue
    }

    const subsetProbability =
      (selectedPerkGroupCountProbability * irrelevantCombinationCount) / totalCombinationCount

    forEachSubsetOfSize(relevantPerkGroups, relevantSubsetSize, (perkGroupSubset) => {
      let coverageMask = baseCoverageMask

      for (const perkGroup of perkGroupSubset) {
        coverageMask |= perkGroup.coverageMask
      }

      addOutcomeProbability(outcomeDistribution, coverageMask, subsetProbability)
    })
  }
}

function getDeterministicCategoryOutcomeDistribution({
  categoryDefinition,
  categoryName,
  poolPerkGroupIds,
  projection,
}: {
  categoryDefinition: LegendsBackgroundFitCategoryDefinition
  categoryName: LegendsDynamicBackgroundCategoryName
  poolPerkGroupIds: string[]
  projection: BackgroundFitProjection
}): BackgroundOutcomeDistribution {
  const outcomeDistribution: BackgroundOutcomeDistribution = new Map()
  const explicitPerkGroupIdSet = new Set(categoryDefinition.perkGroupIds)
  const remainingPerkGroupIds = getRemainingPerkGroupIds(poolPerkGroupIds, explicitPerkGroupIdSet)
  const randomPerkGroupCount = getAdditionalRandomPerkGroupCount(
    categoryDefinition,
    remainingPerkGroupIds.length,
  )

  addProjectedRandomOutcomeProbabilities({
    baseCoverageMask: getPerkGroupIdsCoverageMask({
      categoryName,
      perkGroupIds: explicitPerkGroupIdSet,
      projection,
    }),
    categoryName,
    outcomeDistribution,
    projection,
    remainingPerkGroupIds,
    selectedPerkGroupCount: randomPerkGroupCount,
    selectedPerkGroupCountProbability: 1,
  })

  return outcomeDistribution
}

function getChanceCategoryOutcomeDistribution({
  categoryDefinition,
  categoryName,
  poolPerkGroupIds,
  projection,
}: {
  categoryDefinition: LegendsBackgroundFitCategoryDefinition
  categoryName: LegendsDynamicBackgroundCategoryName
  poolPerkGroupIds: string[]
  projection: BackgroundFitProjection
}): BackgroundOutcomeDistribution {
  const outcomeDistribution: BackgroundOutcomeDistribution = new Map()
  const explicitPerkGroupIdSet = new Set(categoryDefinition.perkGroupIds)
  const remainingPerkGroupIds = getRemainingPerkGroupIds(poolPerkGroupIds, explicitPerkGroupIdSet)
  const selectedCountDistribution = getChanceSelectedCountDistribution(
    getChanceAttemptCount(categoryDefinition),
    clampProbability(categoryDefinition.chance ?? 0),
    remainingPerkGroupIds.length,
  )
  const baseCoverageMask = getPerkGroupIdsCoverageMask({
    categoryName,
    perkGroupIds: explicitPerkGroupIdSet,
    projection,
  })

  for (const [
    selectedPerkGroupCount,
    selectedPerkGroupCountProbability,
  ] of selectedCountDistribution) {
    addProjectedRandomOutcomeProbabilities({
      baseCoverageMask,
      categoryName,
      outcomeDistribution,
      projection,
      remainingPerkGroupIds,
      selectedPerkGroupCount,
      selectedPerkGroupCountProbability,
    })
  }

  return outcomeDistribution
}

function getExplicitOnlyCategoryOutcomeDistribution({
  categoryDefinition,
  categoryName,
  projection,
}: {
  categoryDefinition: LegendsBackgroundFitCategoryDefinition
  categoryName: LegendsDynamicBackgroundCategoryName
  projection: BackgroundFitProjection
}): BackgroundOutcomeDistribution {
  const outcomeDistribution: BackgroundOutcomeDistribution = new Map()

  addOutcomeProbability(
    outcomeDistribution,
    getPerkGroupIdsCoverageMask({
      categoryName,
      perkGroupIds: categoryDefinition.perkGroupIds,
      projection,
    }),
    1,
  )

  return outcomeDistribution
}

function getDeterministicFullCategoryOutcomes(
  categoryDefinition: LegendsBackgroundFitCategoryDefinition,
  poolPerkGroupIds: string[],
): FullCategoryOutcome[] {
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
  const fullCategoryOutcomes: FullCategoryOutcome[] = []

  if (totalCombinationCount === 0) {
    return fullCategoryOutcomes
  }

  forEachSubsetOfSize(remainingPerkGroupIds, randomPerkGroupCount, (perkGroupSubset) => {
    fullCategoryOutcomes.push({
      perkGroupIds: new Set([...explicitPerkGroupIdSet, ...perkGroupSubset]),
      probability: 1 / totalCombinationCount,
    })
  })

  return fullCategoryOutcomes
}

function getClassOutcomeDistributionForEligiblePool({
  categoryDefinition,
  eligibleRemainingClassPerkGroupIds,
  projection,
}: {
  categoryDefinition: LegendsBackgroundFitCategoryDefinition
  eligibleRemainingClassPerkGroupIds: string[]
  projection: BackgroundFitProjection
}): BackgroundOutcomeDistribution {
  const outcomeDistribution: BackgroundOutcomeDistribution = new Map()
  const explicitPerkGroupIdSet = new Set(categoryDefinition.perkGroupIds)
  const selectedCountDistribution = getChanceSelectedCountDistribution(
    getChanceAttemptCount(categoryDefinition),
    clampProbability(categoryDefinition.chance ?? 0),
    eligibleRemainingClassPerkGroupIds.length,
  )
  const baseCoverageMask = getPerkGroupIdsCoverageMask({
    categoryName: 'Class',
    perkGroupIds: explicitPerkGroupIdSet,
    projection,
  })

  for (const [
    selectedPerkGroupCount,
    selectedPerkGroupCountProbability,
  ] of selectedCountDistribution) {
    addProjectedRandomOutcomeProbabilities({
      baseCoverageMask,
      categoryName: 'Class',
      outcomeDistribution,
      projection,
      remainingPerkGroupIds: eligibleRemainingClassPerkGroupIds,
      selectedPerkGroupCount,
      selectedPerkGroupCountProbability,
    })
  }

  return outcomeDistribution
}

function getWeaponAndClassOutcomeDistribution({
  backgroundDefinition,
  context,
  projection,
}: {
  backgroundDefinition: LegendsBackgroundFitBackgroundDefinition
  context: BackgroundProbabilityContext
  projection: BackgroundFitProjection
}): BackgroundOutcomeDistribution {
  const outcomeDistribution: BackgroundOutcomeDistribution = new Map()
  const weaponCategoryDefinition = getCategoryDefinition(backgroundDefinition, 'Weapon')
  const weaponPoolPerkGroupIds = context.perkGroupIdsByCategory.get('Weapon') ?? []
  const classCategoryDefinition = getCategoryDefinition(backgroundDefinition, 'Class')
  const classPoolPerkGroupIds = context.perkGroupIdsByCategory.get('Class') ?? []
  const explicitClassPerkGroupIdSet = new Set(classCategoryDefinition.perkGroupIds)
  const weaponOutcomeBuckets = new Map<
    string,
    {
      eligibleRemainingClassPerkGroupIds: string[]
      probability: number
      weaponCoverageMask: CoverageMask
    }
  >()
  const classOutcomeDistributionByEligiblePoolKey = new Map<string, BackgroundOutcomeDistribution>()

  for (const weaponOutcome of getDeterministicFullCategoryOutcomes(
    weaponCategoryDefinition,
    weaponPoolPerkGroupIds,
  )) {
    const weaponCoverageMask = getPerkGroupIdsCoverageMask({
      categoryName: 'Weapon',
      perkGroupIds: weaponOutcome.perkGroupIds,
      projection,
    })
    const eligibleRemainingClassPerkGroupIds = getEligibleRemainingClassPerkGroupIds(
      classPoolPerkGroupIds,
      explicitClassPerkGroupIdSet,
      weaponOutcome.perkGroupIds,
      context.classWeaponDependencyByClassPerkGroupId,
    )
    const eligiblePoolKey = eligibleRemainingClassPerkGroupIds.join('\u0000')
    const weaponBucketKey = `${weaponCoverageMask.toString(16)}\u0001${eligiblePoolKey}`
    const existingBucket = weaponOutcomeBuckets.get(weaponBucketKey)

    if (existingBucket) {
      existingBucket.probability += weaponOutcome.probability
      continue
    }

    weaponOutcomeBuckets.set(weaponBucketKey, {
      eligibleRemainingClassPerkGroupIds,
      probability: weaponOutcome.probability,
      weaponCoverageMask,
    })
  }

  for (const {
    eligibleRemainingClassPerkGroupIds,
    probability,
    weaponCoverageMask,
  } of weaponOutcomeBuckets.values()) {
    const eligiblePoolKey = eligibleRemainingClassPerkGroupIds.join('\u0000')
    let classOutcomeDistribution = classOutcomeDistributionByEligiblePoolKey.get(eligiblePoolKey)

    if (!classOutcomeDistribution) {
      classOutcomeDistribution = getClassOutcomeDistributionForEligiblePool({
        categoryDefinition: classCategoryDefinition,
        eligibleRemainingClassPerkGroupIds,
        projection,
      })
      classOutcomeDistributionByEligiblePoolKey.set(eligiblePoolKey, classOutcomeDistribution)
    }

    for (const [classCoverageMask, classOutcomeProbability] of classOutcomeDistribution) {
      addOutcomeProbability(
        outcomeDistribution,
        weaponCoverageMask | classCoverageMask,
        probability * classOutcomeProbability,
      )
    }
  }

  return outcomeDistribution
}

function getCategoryOutcomeDistribution({
  backgroundDefinition,
  categoryName,
  context,
  projection,
}: {
  backgroundDefinition: LegendsBackgroundFitBackgroundDefinition
  categoryName: LegendsDynamicBackgroundCategoryName
  context: BackgroundProbabilityContext
  projection: BackgroundFitProjection
}): BackgroundOutcomeDistribution {
  const categoryDefinition = getCategoryDefinition(backgroundDefinition, categoryName)
  const poolPerkGroupIds = context.perkGroupIdsByCategory.get(categoryName) ?? []

  if (deterministicDynamicBackgroundCategoryNameSet.has(categoryName)) {
    return getDeterministicCategoryOutcomeDistribution({
      categoryDefinition,
      categoryName,
      poolPerkGroupIds,
      projection,
    })
  }

  if (chanceDynamicBackgroundCategoryNameSet.has(categoryName)) {
    return getChanceCategoryOutcomeDistribution({
      categoryDefinition,
      categoryName,
      poolPerkGroupIds,
      projection,
    })
  }

  return getExplicitOnlyCategoryOutcomeDistribution({
    categoryDefinition,
    categoryName,
    projection,
  })
}

function getBackgroundNativeOutcomeDistribution({
  backgroundDefinition,
  context,
  projection,
}: {
  backgroundDefinition: LegendsBackgroundFitBackgroundDefinition
  context: BackgroundProbabilityContext
  projection: BackgroundFitProjection
}): BackgroundOutcomeDistribution {
  let outcomeDistribution = getWeaponAndClassOutcomeDistribution({
    backgroundDefinition,
    context,
    projection,
  })

  for (const categoryName of dynamicBackgroundCategoryNames) {
    if (categoryName === 'Weapon' || categoryName === 'Class') {
      continue
    }

    outcomeDistribution = combineOutcomeDistributions(
      outcomeDistribution,
      getCategoryOutcomeDistribution({
        backgroundDefinition,
        categoryName,
        context,
        projection,
      }),
    )
  }

  return outcomeDistribution
}

function calculateNativeOutcomeSummary({
  nativeOutcomeDistribution,
  studyResourceCoverageProfile,
}: {
  nativeOutcomeDistribution: BackgroundOutcomeDistribution
  studyResourceCoverageProfile: StudyResourceMaskCoverageProfile
}): {
  buildReachabilityProbability: number
  maximumNativeCoveredPickedPerkCount: number
} {
  let buildReachabilityProbability = 0
  let maximumNativeCoveredPickedPerkCount = 0

  /*
   * Native outcome masks are exact projected intersections between one complete background roll and
   * the picked perks that roll can cover. Those outcomes are disjoint, so full-build probability is
   * the direct sum of masks where native groups plus the allowed study resources cover every target
   * perk. The best-native-roll metric stays exact because it is measured per legal outcome mask.
   */
  for (const [nativeCoveredPickedPerkMask, nativeOutcomeProbability] of nativeOutcomeDistribution) {
    maximumNativeCoveredPickedPerkCount = Math.max(
      maximumNativeCoveredPickedPerkCount,
      studyResourceCoverageProfile.getCoveredPickedPerkCount(nativeCoveredPickedPerkMask),
    )

    if (studyResourceCoverageProfile.canCoverBuild(nativeCoveredPickedPerkMask)) {
      buildReachabilityProbability += nativeOutcomeProbability
    }
  }

  return {
    buildReachabilityProbability: clampProbability(buildReachabilityProbability),
    maximumNativeCoveredPickedPerkCount,
  }
}

function calculateExpectedCoveredPickedPerkCountFromDistribution({
  nativeOutcomeDistribution,
  pickedPerksMask,
}: {
  nativeOutcomeDistribution: BackgroundOutcomeDistribution
  pickedPerksMask: CoverageMask
}): number {
  let expectedCoveredPickedPerkCount = 0
  const maximumCoveredPickedPerkCount = getCoveredPickedPerkMaskCount(pickedPerksMask)

  for (const [nativeCoveredPickedPerkMask, nativeOutcomeProbability] of nativeOutcomeDistribution) {
    expectedCoveredPickedPerkCount +=
      getCoveredPickedPerkMaskCount(nativeCoveredPickedPerkMask & pickedPerksMask) *
      nativeOutcomeProbability
  }

  const clampedExpectedCoveredPickedPerkCount = Math.max(
    0,
    Math.min(maximumCoveredPickedPerkCount, expectedCoveredPickedPerkCount),
  )
  const nearestIntegerExpectedCoveredPickedPerkCount = Math.round(
    clampedExpectedCoveredPickedPerkCount,
  )

  return Math.abs(
    clampedExpectedCoveredPickedPerkCount - nearestIntegerExpectedCoveredPickedPerkCount,
  ) < 1e-12
    ? nearestIntegerExpectedCoveredPickedPerkCount
    : clampedExpectedCoveredPickedPerkCount
}

function getCoveredPickedPerkMaskCount(coveredPickedPerkMask: CoverageMask): number {
  let remainingPickedPerkMask = coveredPickedPerkMask
  let coveredPickedPerkCount = 0

  while (remainingPickedPerkMask > 0n) {
    if ((remainingPickedPerkMask & 1n) === 1n) {
      coveredPickedPerkCount += 1
    }

    remainingPickedPerkMask >>= 1n
  }

  return coveredPickedPerkCount
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

  // In Legends 19.3.20, GetDynamicPerkTree's magic loop never appends random perk groups.
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

function getCoveredPickedPerkCountForPerkIds(
  matches: BackgroundFitMatch[],
  pickedPerkIds: ReadonlySet<string>,
): number {
  const coveredPickedPerkIds = new Set<string>()

  for (const match of matches) {
    for (const pickedPerkId of match.pickedPerkIds) {
      if (pickedPerkIds.has(pickedPerkId)) {
        coveredPickedPerkIds.add(pickedPerkId)
      }
    }
  }

  return coveredPickedPerkIds.size
}

export function getGuaranteedCoveredPickedPerkCount(matches: BackgroundFitMatch[]): number {
  return getCoveredPickedPerkCount(matches.filter((match) => match.isGuaranteed))
}

function getGuaranteedCoveredPickedPerkCountForPerkIds(
  matches: BackgroundFitMatch[],
  pickedPerkIds: ReadonlySet<string>,
): number {
  return getCoveredPickedPerkCountForPerkIds(
    matches.filter((match) => match.isGuaranteed),
    pickedPerkIds,
  )
}

function compareRankedBackgroundFits(
  leftBackgroundFit: RankedBackgroundFit,
  rightBackgroundFit: RankedBackgroundFit,
): number {
  const leftGuaranteedCoveredPickedPerkCount =
    leftBackgroundFit.guaranteedCoveredMustHavePerkCount +
    leftBackgroundFit.guaranteedCoveredOptionalPerkCount
  const rightGuaranteedCoveredPickedPerkCount =
    rightBackgroundFit.guaranteedCoveredMustHavePerkCount +
    rightBackgroundFit.guaranteedCoveredOptionalPerkCount

  return (
    (rightBackgroundFit.buildReachabilityProbability ?? 0) -
      (leftBackgroundFit.buildReachabilityProbability ?? 0) ||
    (rightBackgroundFit.fullBuildReachabilityProbability ?? 0) -
      (leftBackgroundFit.fullBuildReachabilityProbability ?? 0) ||
    rightBackgroundFit.expectedCoveredMustHavePerkCount -
      leftBackgroundFit.expectedCoveredMustHavePerkCount ||
    rightBackgroundFit.guaranteedCoveredMustHavePerkCount -
      leftBackgroundFit.guaranteedCoveredMustHavePerkCount ||
    rightBackgroundFit.expectedCoveredOptionalPerkCount -
      leftBackgroundFit.expectedCoveredOptionalPerkCount ||
    rightGuaranteedCoveredPickedPerkCount - leftGuaranteedCoveredPickedPerkCount ||
    rightBackgroundFit.maximumNativeCoveredPickedPerkCount -
      leftBackgroundFit.maximumNativeCoveredPickedPerkCount ||
    leftBackgroundFit.backgroundName.localeCompare(rightBackgroundFit.backgroundName) ||
    leftBackgroundFit.backgroundId.localeCompare(rightBackgroundFit.backgroundId) ||
    leftBackgroundFit.sourceFilePath.localeCompare(rightBackgroundFit.sourceFilePath)
  )
}

function insertRankedBackgroundFit(
  rankedBackgroundFits: RankedBackgroundFit[],
  nextBackgroundFit: RankedBackgroundFit,
) {
  let lowerIndex = 0
  let upperIndex = rankedBackgroundFits.length

  while (lowerIndex < upperIndex) {
    const middleIndex = Math.floor((lowerIndex + upperIndex) / 2)

    if (compareRankedBackgroundFits(nextBackgroundFit, rankedBackgroundFits[middleIndex]) < 0) {
      upperIndex = middleIndex
    } else {
      lowerIndex = middleIndex + 1
    }
  }

  rankedBackgroundFits.splice(lowerIndex, 0, nextBackgroundFit)
}

function compareBackgroundFitSummaries(
  leftBackgroundFit: BackgroundFitSummary,
  rightBackgroundFit: BackgroundFitSummary,
): number {
  const leftGuaranteedCoveredPickedPerkCount = getGuaranteedCoveredPickedPerkCount(
    leftBackgroundFit.matches,
  )
  const rightGuaranteedCoveredPickedPerkCount = getGuaranteedCoveredPickedPerkCount(
    rightBackgroundFit.matches,
  )

  return (
    rightGuaranteedCoveredPickedPerkCount - leftGuaranteedCoveredPickedPerkCount ||
    rightBackgroundFit.expectedCoveredPickedPerkCount -
      leftBackgroundFit.expectedCoveredPickedPerkCount ||
    rightBackgroundFit.guaranteedMatchedPerkGroupCount -
      leftBackgroundFit.guaranteedMatchedPerkGroupCount ||
    rightBackgroundFit.expectedMatchedPerkGroupCount -
      leftBackgroundFit.expectedMatchedPerkGroupCount ||
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

function getPickedPerksCacheKey(pickedPerks: LegendsPerkRecord[]): string {
  return pickedPerks
    .map((pickedPerk) => pickedPerk.id)
    .toSorted()
    .join('\u0000')
}

function getBackgroundFitScopeCacheKey(
  prefix: string,
  pickedPerks: LegendsPerkRecord[],
  studyResourceFilterCacheKey?: string,
): string {
  return [prefix, studyResourceFilterCacheKey ?? '', getPickedPerksCacheKey(pickedPerks)].join(
    '\u0001',
  )
}

function getStudyResourceFilterCacheKey(
  studyResourceFilter: BackgroundStudyResourceFilter | undefined,
): string {
  if (studyResourceFilter === undefined) {
    return nativeOnlySummaryCacheKey
  }

  return [
    studyResourceFilter.shouldAllowBook ? 'book' : 'no-book',
    studyResourceFilter.shouldAllowScroll ? 'scroll' : 'no-scroll',
    studyResourceFilter.shouldAllowSecondScroll ? 'second-scroll' : 'one-scroll',
  ].join('|')
}

function getRequirementSubsetCacheKey(requirements: StudyReachabilityRequirement[]): string {
  return requirements
    .map((requirement) =>
      getPerkGroupProbabilityKey(requirement.categoryName, requirement.perkGroupId),
    )
    .toSorted()
    .join(',')
}

function trimBackgroundFitBuildCache(
  backgroundFitBuildCacheByPickedPerksKey: Map<string, BackgroundFitBuildCache>,
): void {
  while (backgroundFitBuildCacheByPickedPerksKey.size > maximumBackgroundFitBuildCacheEntries) {
    const oldestCacheKey = backgroundFitBuildCacheByPickedPerksKey.keys().next().value

    if (oldestCacheKey === undefined) {
      return
    }

    backgroundFitBuildCacheByPickedPerksKey.delete(oldestCacheKey)
  }
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
  const backgroundFitBuildCacheByPickedPerksKey = new Map<string, BackgroundFitBuildCache>()

  function createEmptyBackgroundFitSummary(
    backgroundProbabilityRecord: BackgroundProbabilityRecord,
  ): BackgroundFitSummary {
    const { backgroundDefinition, maximumTotalPerkGroupCount } = backgroundProbabilityRecord

    return {
      backgroundId: backgroundDefinition.backgroundId,
      backgroundName: backgroundDefinition.backgroundName,
      disambiguator:
        (duplicateBackgroundNameCountByName.get(backgroundDefinition.backgroundName) ?? 0) > 1
          ? getBackgroundDisambiguator(backgroundDefinition)
          : null,
      expectedCoveredPickedPerkCount: 0,
      expectedMatchedPerkGroupCount: 0,
      guaranteedMatchedPerkGroupCount: 0,
      iconPath: backgroundDefinition.iconPath ?? null,
      maximumTotalPerkGroupCount,
      matches: [],
      sourceFilePath: backgroundDefinition.sourceFilePath,
      veteranPerkLevelInterval: backgroundDefinition.veteranPerkLevelInterval,
    }
  }

  function getEmptyBackgroundFitSummaries(): BackgroundFitSummary[] {
    return backgroundProbabilityRecords
      .map(createEmptyBackgroundFitSummary)
      .toSorted(compareBackgroundFitSummaries)
  }

  function getBackgroundFitBuildCache(pickedPerks: LegendsPerkRecord[]): BackgroundFitBuildCache {
    const pickedPerksCacheKey = getPickedPerksCacheKey(pickedPerks)
    const cachedBackgroundFitBuildCache =
      backgroundFitBuildCacheByPickedPerksKey.get(pickedPerksCacheKey)

    if (cachedBackgroundFitBuildCache) {
      backgroundFitBuildCacheByPickedPerksKey.delete(pickedPerksCacheKey)
      backgroundFitBuildCacheByPickedPerksKey.set(
        pickedPerksCacheKey,
        cachedBackgroundFitBuildCache,
      )

      return cachedBackgroundFitBuildCache
    }

    const { supportedBuildTargetPerkGroups, unsupportedBuildTargetPerkGroups } =
      getBuildTargetPerkGroups(pickedPerks)
    const backgroundFitBuildCache: BackgroundFitBuildCache = {
      cachedBackgroundFitRecords: backgroundProbabilityRecords.map(
        (backgroundProbabilityRecord) => ({
          backgroundProbabilityRecord,
          baseBackgroundFit: null,
          expectedCoveredPickedPerkCountByScopeKey: new Map(),
          nativeOutcomeDistribution: null,
          nativeOutcomeSummaryByFilterKey: new Map(),
          nativeRequirementReachabilityByKey: new Map(),
          studyResourceRequirementByFilterKey: new Map(),
        }),
      ),
      projection: createBackgroundFitProjection(pickedPerks),
      supportedBuildTargetPerkGroups,
      unsupportedBuildTargetPerkGroups,
    }

    backgroundFitBuildCacheByPickedPerksKey.set(pickedPerksCacheKey, backgroundFitBuildCache)
    trimBackgroundFitBuildCache(backgroundFitBuildCacheByPickedPerksKey)

    return backgroundFitBuildCache
  }

  function getCachedNativeOutcomeDistribution(
    backgroundFitBuildCache: BackgroundFitBuildCache,
    cachedBackgroundFitRecord: CachedBackgroundFitRecord,
  ): BackgroundOutcomeDistribution {
    if (cachedBackgroundFitRecord.nativeOutcomeDistribution) {
      return cachedBackgroundFitRecord.nativeOutcomeDistribution
    }

    cachedBackgroundFitRecord.nativeOutcomeDistribution = getBackgroundNativeOutcomeDistribution({
      backgroundDefinition:
        cachedBackgroundFitRecord.backgroundProbabilityRecord.backgroundDefinition,
      context: backgroundProbabilityContext,
      projection: backgroundFitBuildCache.projection,
    })

    return cachedBackgroundFitRecord.nativeOutcomeDistribution
  }

  function getCachedNativeOutcomeSummary({
    backgroundFitBuildCache,
    cachedBackgroundFitRecord,
    studyResourceCoverageProfile,
    studyResourceFilterCacheKey,
  }: {
    backgroundFitBuildCache: BackgroundFitBuildCache
    cachedBackgroundFitRecord: CachedBackgroundFitRecord
    studyResourceCoverageProfile: StudyResourceMaskCoverageProfile
    studyResourceFilterCacheKey: string
  }): NativeOutcomeSummary {
    const cachedNativeOutcomeSummary =
      cachedBackgroundFitRecord.nativeOutcomeSummaryByFilterKey.get(studyResourceFilterCacheKey)

    if (cachedNativeOutcomeSummary) {
      return cachedNativeOutcomeSummary
    }

    const nativeOutcomeSummary = calculateNativeOutcomeSummary({
      nativeOutcomeDistribution: getCachedNativeOutcomeDistribution(
        backgroundFitBuildCache,
        cachedBackgroundFitRecord,
      ),
      studyResourceCoverageProfile,
    })

    cachedBackgroundFitRecord.nativeOutcomeSummaryByFilterKey.set(
      studyResourceFilterCacheKey,
      nativeOutcomeSummary,
    )

    return nativeOutcomeSummary
  }

  function getCachedStudyResourceRequirement({
    cachedBackgroundFitRecord,
    pickedPerks,
    studyResourceFilter,
    studyResourceRequirementCacheKey,
  }: {
    cachedBackgroundFitRecord: CachedBackgroundFitRecord
    pickedPerks: LegendsPerkRecord[]
    studyResourceFilter: BackgroundStudyResourceFilter
    studyResourceRequirementCacheKey: string
  }): StudyResourceRequirementProfile | null {
    if (
      cachedBackgroundFitRecord.studyResourceRequirementByFilterKey.has(
        studyResourceRequirementCacheKey,
      )
    ) {
      return (
        cachedBackgroundFitRecord.studyResourceRequirementByFilterKey.get(
          studyResourceRequirementCacheKey,
        ) ?? null
      )
    }

    const backgroundDefinition =
      cachedBackgroundFitRecord.backgroundProbabilityRecord.backgroundDefinition
    const studyResourceRequirement = getMinimumStudyResourceRequirementProfile({
      canUseNativeRequirements: (requirements) => {
        const requirementSubsetCacheKey = getRequirementSubsetCacheKey(requirements)
        const cachedNativeRequirementReachability =
          cachedBackgroundFitRecord.nativeRequirementReachabilityByKey.get(
            requirementSubsetCacheKey,
          )

        if (cachedNativeRequirementReachability !== undefined) {
          return cachedNativeRequirementReachability
        }

        const nativeRequirementReachability =
          getRequirementSubsetProbability({
            backgroundDefinition,
            context: backgroundProbabilityContext,
            requirements,
          }) > 0

        cachedBackgroundFitRecord.nativeRequirementReachabilityByKey.set(
          requirementSubsetCacheKey,
          nativeRequirementReachability,
        )

        return nativeRequirementReachability
      },
      filter: studyResourceFilter,
      pickedPerks,
    })

    cachedBackgroundFitRecord.studyResourceRequirementByFilterKey.set(
      studyResourceRequirementCacheKey,
      studyResourceRequirement,
    )

    return studyResourceRequirement
  }

  function getCachedBackgroundFitBase({
    backgroundFitBuildCache,
    cachedBackgroundFitRecord,
    pickedPerks,
    supportedBuildTargetPerkGroups,
  }: {
    backgroundFitBuildCache: BackgroundFitBuildCache
    cachedBackgroundFitRecord: CachedBackgroundFitRecord
    pickedPerks: LegendsPerkRecord[]
    supportedBuildTargetPerkGroups: BuildTargetPerkGroup[]
  }): BackgroundFitSummary {
    if (cachedBackgroundFitRecord.baseBackgroundFit) {
      return cachedBackgroundFitRecord.baseBackgroundFit
    }

    const { backgroundDefinition, maximumTotalPerkGroupCount, probabilitiesByPerkGroupKey } =
      cachedBackgroundFitRecord.backgroundProbabilityRecord
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

    cachedBackgroundFitRecord.baseBackgroundFit = {
      backgroundId: backgroundDefinition.backgroundId,
      backgroundName: backgroundDefinition.backgroundName,
      disambiguator:
        (duplicateBackgroundNameCountByName.get(backgroundDefinition.backgroundName) ?? 0) > 1
          ? getBackgroundDisambiguator(backgroundDefinition)
          : null,
      expectedCoveredPickedPerkCount: calculateExpectedCoveredPickedPerkCountFromDistribution({
        nativeOutcomeDistribution: getCachedNativeOutcomeDistribution(
          backgroundFitBuildCache,
          cachedBackgroundFitRecord,
        ),
        pickedPerksMask: getPickedPerksCoverageMask(pickedPerks, backgroundFitBuildCache.projection),
      }),
      expectedMatchedPerkGroupCount: matches.reduce(
        (expectedPerkGroupCount, match) => expectedPerkGroupCount + match.probability,
        0,
      ),
      guaranteedMatchedPerkGroupCount: matches.filter((match) => match.isGuaranteed).length,
      iconPath: backgroundDefinition.iconPath ?? null,
      maximumTotalPerkGroupCount,
      matches,
      sourceFilePath: backgroundDefinition.sourceFilePath,
      veteranPerkLevelInterval: backgroundDefinition.veteranPerkLevelInterval,
    }

    return cachedBackgroundFitRecord.baseBackgroundFit
  }

  function getCachedExpectedCoveredPickedPerkCount({
    backgroundFitBuildCache,
    cachedBackgroundFitRecord,
    pickedPerks,
    scopeCacheKey,
  }: {
    backgroundFitBuildCache: BackgroundFitBuildCache
    cachedBackgroundFitRecord: CachedBackgroundFitRecord
    pickedPerks: LegendsPerkRecord[]
    scopeCacheKey: string
  }): number {
    const cachedExpectedCoveredPickedPerkCount =
      cachedBackgroundFitRecord.expectedCoveredPickedPerkCountByScopeKey.get(scopeCacheKey)

    if (cachedExpectedCoveredPickedPerkCount !== undefined) {
      return cachedExpectedCoveredPickedPerkCount
    }

    const expectedCoveredPickedPerkCount = calculateExpectedCoveredPickedPerkCountFromDistribution({
      nativeOutcomeDistribution: getCachedNativeOutcomeDistribution(
        backgroundFitBuildCache,
        cachedBackgroundFitRecord,
      ),
      pickedPerksMask: getPickedPerksCoverageMask(pickedPerks, backgroundFitBuildCache.projection),
    })

    cachedBackgroundFitRecord.expectedCoveredPickedPerkCountByScopeKey.set(
      scopeCacheKey,
      expectedCoveredPickedPerkCount,
    )

    return expectedCoveredPickedPerkCount
  }

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
    getBackgroundFitSummaryView(pickedPerks) {
      if (pickedPerks.length === 0) {
        return {
          rankedBackgroundFitSummaries: getEmptyBackgroundFitSummaries(),
          supportedBuildTargetPerkGroups: [],
          unsupportedBuildTargetPerkGroups: [],
        }
      }

      const backgroundFitBuildCache = getBackgroundFitBuildCache(pickedPerks)

      return {
        rankedBackgroundFitSummaries: backgroundFitBuildCache.cachedBackgroundFitRecords
          .map((cachedBackgroundFitRecord) =>
            getCachedBackgroundFitBase({
              backgroundFitBuildCache,
              cachedBackgroundFitRecord,
              pickedPerks,
              supportedBuildTargetPerkGroups:
                backgroundFitBuildCache.supportedBuildTargetPerkGroups,
            }),
          )
          .toSorted(compareBackgroundFitSummaries),
        supportedBuildTargetPerkGroups: backgroundFitBuildCache.supportedBuildTargetPerkGroups,
        unsupportedBuildTargetPerkGroups: backgroundFitBuildCache.unsupportedBuildTargetPerkGroups,
      }
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
    getBackgroundFitView(pickedPerks, studyResourceFilter, options = {}) {
      if (pickedPerks.length === 0) {
        const buildReachabilityProbability = studyResourceFilter === undefined ? null : 1
        const totalBackgroundCount = backgroundProbabilityRecords.length

        options.onProgress?.({
          checkedBackgroundCount: totalBackgroundCount,
          totalBackgroundCount,
        })

        return {
          rankedBackgroundFits: getEmptyBackgroundFitSummaries()
            .map((backgroundFitSummary): RankedBackgroundFit => ({
              ...backgroundFitSummary,
              buildReachabilityProbability,
              expectedCoveredMustHavePerkCount: 0,
              expectedCoveredOptionalPerkCount: 0,
              fullBuildStudyResourceRequirement: null,
              fullBuildReachabilityProbability: buildReachabilityProbability,
              guaranteedCoveredMustHavePerkCount: 0,
              guaranteedCoveredOptionalPerkCount: 0,
              maximumNativeCoveredPickedPerkCount: 0,
              mustHaveBuildReachabilityProbability: buildReachabilityProbability,
              mustHaveStudyResourceRequirement: null,
            }))
            .toSorted(compareRankedBackgroundFits),
          supportedBuildTargetPerkGroups: [],
          unsupportedBuildTargetPerkGroups: [],
        }
      }

      const backgroundFitBuildCache = getBackgroundFitBuildCache(pickedPerks)
      const studyResourceFilterCacheKey = getStudyResourceFilterCacheKey(studyResourceFilter)
      const optionalPickedPerkIdSet = options.optionalPickedPerkIds ?? new Set<string>()
      /*
       * Background eligibility is based only on must-have perks. Optional perks are still scored
       * against the same native outcome distribution, but they are not allowed to exclude a
       * background that can satisfy the required part of the build. Keeping the split here avoids
       * leaking display concepts into the combinatorics code that calculates legal native rolls,
       * books, and scrolls.
       */
      const mustHavePickedPerks = pickedPerks.filter(
        (pickedPerk) => !optionalPickedPerkIdSet.has(pickedPerk.id),
      )
      const optionalPickedPerks = pickedPerks.filter((pickedPerk) =>
        optionalPickedPerkIdSet.has(pickedPerk.id),
      )
      const mustHavePickedPerkIdSet = new Set(
        mustHavePickedPerks.map((pickedPerk) => pickedPerk.id),
      )
      const effectiveOptionalPickedPerkIdSet = new Set(
        optionalPickedPerks.map((pickedPerk) => pickedPerk.id),
      )
      const totalScopeCacheKey = getBackgroundFitScopeCacheKey(
        'total',
        pickedPerks,
        studyResourceFilterCacheKey,
      )
      const mustHaveScopeCacheKey = getBackgroundFitScopeCacheKey(
        'must-have',
        mustHavePickedPerks,
        studyResourceFilterCacheKey,
      )
      const optionalScopeCacheKey = getBackgroundFitScopeCacheKey(
        'optional',
        optionalPickedPerks,
        studyResourceFilterCacheKey,
      )
      const getRequirementCoverageMask = (requirementKey: string) =>
        backgroundFitBuildCache.projection.groupCoverageMaskByRequirementKey.get(requirementKey) ??
        0n
      const totalStudyResourceCoverageProfile = createStudyResourceMaskCoverageProfile({
        filter: studyResourceFilter ?? null,
        getRequirementCoverageMask,
        pickedPerks,
        targetMask: backgroundFitBuildCache.projection.allPickedMask,
      })
      const mustHaveStudyResourceCoverageProfile =
        optionalPickedPerks.length === 0
          ? totalStudyResourceCoverageProfile
          : createStudyResourceMaskCoverageProfile({
              filter: studyResourceFilter ?? null,
              getRequirementCoverageMask,
              pickedPerks: mustHavePickedPerks,
              targetMask: getPickedPerksCoverageMask(
                mustHavePickedPerks,
                backgroundFitBuildCache.projection,
              ),
            })

      const rankedBackgroundFits: RankedBackgroundFit[] = []
      const totalBackgroundCount = backgroundFitBuildCache.cachedBackgroundFitRecords.length
      let checkedBackgroundCount = 0
      let lastPartialViewCheckedBackgroundCount = 0
      let lastPartialViewRankedBackgroundFitCount = 0
      const requestedPartialViewChunkSize =
        options.partialViewChunkSize ?? defaultBackgroundFitPartialViewChunkSize
      const partialViewChunkSize = Number.isFinite(requestedPartialViewChunkSize)
        ? Math.max(1, Math.floor(requestedPartialViewChunkSize))
        : defaultBackgroundFitPartialViewChunkSize
      const getCurrentBackgroundFitView = (): BackgroundFitView => ({
        rankedBackgroundFits: rankedBackgroundFits.slice(),
        supportedBuildTargetPerkGroups: backgroundFitBuildCache.supportedBuildTargetPerkGroups,
        unsupportedBuildTargetPerkGroups: backgroundFitBuildCache.unsupportedBuildTargetPerkGroups,
      })
      const reportProgress = () => {
        options.onProgress?.({
          checkedBackgroundCount,
          totalBackgroundCount,
        })
      }
      const reportPartialView = () => {
        if (
          !options.onPartialView ||
          checkedBackgroundCount >= totalBackgroundCount ||
          rankedBackgroundFits.length === 0 ||
          rankedBackgroundFits.length === lastPartialViewRankedBackgroundFitCount
        ) {
          return
        }

        if (
          lastPartialViewRankedBackgroundFitCount > 0 &&
          checkedBackgroundCount - lastPartialViewCheckedBackgroundCount < partialViewChunkSize
        ) {
          return
        }

        lastPartialViewCheckedBackgroundCount = checkedBackgroundCount
        lastPartialViewRankedBackgroundFitCount = rankedBackgroundFits.length
        options.onPartialView({
          checkedBackgroundCount,
          totalBackgroundCount,
          view: getCurrentBackgroundFitView(),
        })
      }
      const reportCheckedBackground = () => {
        checkedBackgroundCount += 1
        reportProgress()
        reportPartialView()
      }

      reportProgress()

      for (const cachedBackgroundFitRecord of backgroundFitBuildCache.cachedBackgroundFitRecords) {
        const mustHaveStudyResourceRequirement =
          studyResourceFilter === undefined
            ? null
            : getCachedStudyResourceRequirement({
                cachedBackgroundFitRecord,
                pickedPerks: mustHavePickedPerks,
                studyResourceFilter,
                studyResourceRequirementCacheKey: mustHaveScopeCacheKey,
              })

        if (
          studyResourceFilter !== undefined &&
          mustHavePickedPerks.length > 0 &&
          !cachedBackgroundFitRecord.nativeOutcomeSummaryByFilterKey.has(mustHaveScopeCacheKey) &&
          mustHaveStudyResourceRequirement === null
        ) {
          reportCheckedBackground()
          continue
        }

        const mustHaveNativeOutcomeSummary = getCachedNativeOutcomeSummary({
          backgroundFitBuildCache,
          cachedBackgroundFitRecord,
          studyResourceCoverageProfile: mustHaveStudyResourceCoverageProfile,
          studyResourceFilterCacheKey: mustHaveScopeCacheKey,
        })

        if (
          studyResourceFilter !== undefined &&
          mustHavePickedPerks.length > 0 &&
          mustHaveNativeOutcomeSummary.buildReachabilityProbability <= 0
        ) {
          reportCheckedBackground()
          continue
        }

        const totalNativeOutcomeSummary =
          optionalPickedPerks.length === 0
            ? mustHaveNativeOutcomeSummary
            : getCachedNativeOutcomeSummary({
                backgroundFitBuildCache,
                cachedBackgroundFitRecord,
                studyResourceCoverageProfile: totalStudyResourceCoverageProfile,
                studyResourceFilterCacheKey: totalScopeCacheKey,
              })
        const fullBuildStudyResourceRequirement =
          studyResourceFilter === undefined ||
          totalNativeOutcomeSummary.buildReachabilityProbability <= 0
            ? null
            : optionalPickedPerks.length === 0
              ? mustHaveStudyResourceRequirement
              : getCachedStudyResourceRequirement({
                  cachedBackgroundFitRecord,
                  pickedPerks,
                  studyResourceFilter,
                  studyResourceRequirementCacheKey: totalScopeCacheKey,
                })
        const backgroundFitBase = getCachedBackgroundFitBase({
          backgroundFitBuildCache,
          cachedBackgroundFitRecord,
          pickedPerks,
          supportedBuildTargetPerkGroups: backgroundFitBuildCache.supportedBuildTargetPerkGroups,
        })

        const rankedBackgroundFit: RankedBackgroundFit = {
          ...backgroundFitBase,
          buildReachabilityProbability:
            studyResourceFilter === undefined
              ? null
              : mustHaveNativeOutcomeSummary.buildReachabilityProbability,
          expectedCoveredMustHavePerkCount:
            optionalPickedPerks.length === 0
              ? backgroundFitBase.expectedCoveredPickedPerkCount
              : getCachedExpectedCoveredPickedPerkCount({
                  backgroundFitBuildCache,
                  cachedBackgroundFitRecord,
                  pickedPerks: mustHavePickedPerks,
                  scopeCacheKey: mustHaveScopeCacheKey,
                }),
          expectedCoveredOptionalPerkCount:
            optionalPickedPerks.length === 0
              ? 0
              : getCachedExpectedCoveredPickedPerkCount({
                  backgroundFitBuildCache,
                  cachedBackgroundFitRecord,
                  pickedPerks: optionalPickedPerks,
                  scopeCacheKey: optionalScopeCacheKey,
                }),
          fullBuildStudyResourceRequirement,
          fullBuildReachabilityProbability:
            studyResourceFilter === undefined
              ? null
              : totalNativeOutcomeSummary.buildReachabilityProbability,
          guaranteedCoveredMustHavePerkCount: getGuaranteedCoveredPickedPerkCountForPerkIds(
            backgroundFitBase.matches,
            mustHavePickedPerkIdSet,
          ),
          guaranteedCoveredOptionalPerkCount:
            optionalPickedPerks.length === 0
              ? 0
              : getGuaranteedCoveredPickedPerkCountForPerkIds(
                  backgroundFitBase.matches,
                  effectiveOptionalPickedPerkIdSet,
                ),
          maximumNativeCoveredPickedPerkCount:
            totalNativeOutcomeSummary.maximumNativeCoveredPickedPerkCount,
          mustHaveBuildReachabilityProbability:
            studyResourceFilter === undefined
              ? null
              : mustHaveNativeOutcomeSummary.buildReachabilityProbability,
          mustHaveStudyResourceRequirement,
        }

        insertRankedBackgroundFit(rankedBackgroundFits, rankedBackgroundFit)

        reportCheckedBackground()
      }

      return getCurrentBackgroundFitView()
    },
  }
}

function getPlacementGroupRequirementKey(placement: LegendsPerkPlacement): string {
  return getPerkGroupProbabilityKey(placement.categoryName, placement.perkGroupId)
}
