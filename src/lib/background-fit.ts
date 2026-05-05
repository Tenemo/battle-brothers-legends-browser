import type {
  LegendsBackgroundFitBackgroundDefinition,
  LegendsBackgroundFitCategoryDefinition,
  LegendsBackgroundFitClassWeaponDependency,
  LegendsDynamicBackgroundCategoryName,
  LegendsPerkBackgroundSource,
  LegendsPerkPlacement,
  LegendsBackgroundFitPerkRecord,
  LegendsBackgroundFitDataset,
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
  getReachableStudyResourceRequirements,
  getMinimumStudyResourceRequirementProfile,
  type BackgroundStudyResourceFilter,
  type StudyResourceMaskCoverageProfile,
  type StudyResourceRequirementProfile,
  type StudyReachabilityRequirement,
} from './background-study-reachability'
import {
  runBackgroundFitViewGeneratorAsync,
  runBackgroundFitViewGeneratorToCompletion,
  type BackgroundFitAsyncControlOptions,
} from './background-fit-calculation-control'
export { isBackgroundFitCalculationCancelledError } from './background-fit-calculation-control'

const deterministicDynamicBackgroundCategoryNameSet = new Set<LegendsDynamicBackgroundCategoryName>(
  deterministicDynamicBackgroundCategoryNames,
)

const chanceDynamicBackgroundCategoryNameSet = new Set<LegendsDynamicBackgroundCategoryName>([
  ...chanceDynamicBackgroundCategoryNames,
])
const maximumBackgroundFitBuildCacheEntries = 8
const nativeOnlySummaryCacheKey = 'native-only'
const studyResourceStrategyProbabilityEpsilon = 1e-12

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
  chanceCalculation: BackgroundFitChanceCalculation
  maximumNativeCoveredPickedPerkCount: number
}

type BackgroundFitChanceCalculationProbabilityTerm = {
  nativeCoveredPickedPerkIdsByOutcome: string[][]
  outcomeCount: number
  probability: number
}

export type BackgroundFitChanceCalculation = {
  isNativeOutcomeIndependent: boolean
  probability: number
  successfulNativeOutcomeCount: number
  successfulNativeOutcomeProbabilityTerms: BackgroundFitChanceCalculationProbabilityTerm[]
  totalNativeOutcomeCount: number
}

export type BackgroundFitStudyResourceChanceBreakdownEntry = {
  calculation?: BackgroundFitChanceCalculation
  key: 'book' | 'book-and-scroll' | 'native' | 'scroll'
  probability: number
  shouldAllowBook: boolean
  shouldAllowScroll: boolean
  shouldAllowSecondScroll: boolean
}

export type BackgroundFitStudyResourceStrategyTarget = {
  categoryName: LegendsDynamicBackgroundCategoryName
  coveredPickedPerkIds: string[]
  coveredPickedPerkNames: string[]
  fixedTargetProbability: number
  marginalProbabilityGain: number
  perkGroupIconPath: string | null
  perkGroupId: string
  perkGroupName: string
}

export type BackgroundFitStudyResourceStrategy = {
  bookTargets: BackgroundFitStudyResourceStrategyTarget[]
  nativeProbability: number
  probability: number
  scrollTargets: BackgroundFitStudyResourceStrategyTarget[]
  selectedCombinationKey: BackgroundFitStudyResourceChanceBreakdownEntry['key']
  shouldAllowSecondScroll: boolean
}

type StudyResourceChanceBreakdownProfile = {
  key: BackgroundFitStudyResourceChanceBreakdownEntry['key']
  oneScrollEquivalentScopeCacheKey?: string
  oneScrollEquivalentStudyResourceCoverageProfile?: StudyResourceMaskCoverageProfile
  scopeCacheKey: string
  shouldAllowBook: boolean
  shouldAllowScroll: boolean
  shouldAllowSecondScroll: boolean
  studyResourceCoverageProfile: StudyResourceMaskCoverageProfile
}

export type BackgroundFitSummary = Omit<
  RankedBackgroundFit,
  | 'buildReachabilityProbability'
  | 'expectedCoveredMustHavePerkCount'
  | 'expectedCoveredOptionalPerkCount'
  | 'fullBuildReachabilityProbability'
  | 'fullBuildStudyResourceChanceBreakdown'
  | 'fullBuildStudyResourceStrategy'
  | 'guaranteedCoveredMustHavePerkCount'
  | 'guaranteedCoveredOptionalPerkCount'
  | 'maximumNativeCoveredPickedPerkCount'
  | 'mustHaveBuildReachabilityProbability'
  | 'mustHaveStudyResourceChanceBreakdown'
  | 'mustHaveStudyResourceStrategy'
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

type BackgroundFitPerkGroupMetadata = {
  categoryName: LegendsDynamicBackgroundCategoryName
  perkGroupIconPath: string | null
  perkGroupId: string
  perkGroupName: string
}

type BackgroundFitOtherPerkGroupPerk = {
  iconPath: string | null
  perkId: string
  perkName: string
}

export type BuildTargetPerkGroup = {
  categoryName: string
  pickedPerkCount: number
  pickedPerkIconPaths: Array<string | null>
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

export type BackgroundFitOtherPerkGroup = BackgroundFitPerkGroupMetadata & {
  isGuaranteed: boolean
  perks: BackgroundFitOtherPerkGroupPerk[]
  probability: number
}

export type RankedBackgroundFit = {
  backgroundId: string
  backgroundName: string
  backgroundTypeNames: string[]
  buildReachabilityProbability: number | null
  campResourceModifiers: LegendsBackgroundFitBackgroundDefinition['campResourceModifiers']
  dailyCost: number | null
  disambiguator: string | null
  excludedTalentAttributeNames: string[]
  excludedTraits: LegendsBackgroundFitBackgroundDefinition['excludedTraits']
  excludedTraitNames: string[]
  expectedCoveredMustHavePerkCount: number
  expectedCoveredOptionalPerkCount: number
  expectedCoveredPickedPerkCount: number
  expectedMatchedPerkGroupCount: number
  fullBuildStudyResourceChanceBreakdown?: BackgroundFitStudyResourceChanceBreakdownEntry[]
  fullBuildStudyResourceStrategy?: BackgroundFitStudyResourceStrategy
  fullBuildStudyResourceRequirement: StudyResourceRequirementProfile | null
  fullBuildReachabilityProbability: number | null
  guaranteedCoveredMustHavePerkCount: number
  guaranteedCoveredOptionalPerkCount: number
  guaranteedMatchedPerkGroupCount: number
  guaranteedTraits: LegendsBackgroundFitBackgroundDefinition['guaranteedTraits']
  guaranteedTraitNames: string[]
  iconPath: string | null
  maximumNativeCoveredPickedPerkCount: number
  maximumTotalPerkGroupCount: number
  matches: BackgroundFitMatch[]
  mustHaveBuildReachabilityProbability: number | null
  mustHaveStudyResourceChanceBreakdown?: BackgroundFitStudyResourceChanceBreakdownEntry[]
  mustHaveStudyResourceStrategy?: BackgroundFitStudyResourceStrategy
  mustHaveStudyResourceRequirement: StudyResourceRequirementProfile | null
  otherPerkGroups: BackgroundFitOtherPerkGroup[]
  sourceFilePath: string
  veteranPerkLevelInterval: number
}

export type BackgroundFitView = {
  rankedBackgroundFits: RankedBackgroundFit[]
  supportedBuildTargetPerkGroups: BuildTargetPerkGroup[]
  unsupportedBuildTargetPerkGroups: BuildTargetPerkGroup[]
}

type BackgroundFitSummaryView = {
  rankedBackgroundFitSummaries: BackgroundFitSummary[]
  supportedBuildTargetPerkGroups: BuildTargetPerkGroup[]
  unsupportedBuildTargetPerkGroups: BuildTargetPerkGroup[]
}

export type BackgroundFitCalculationProgress = {
  checkedBackgroundCount: number
  totalBackgroundCount: number
}

type BackgroundFitPartialView = BackgroundFitCalculationProgress & {
  view: BackgroundFitView
}

type BackgroundFitViewOptions = {
  onPartialView?: (partialView: BackgroundFitPartialView) => void
  onProgress?: (progress: BackgroundFitCalculationProgress) => void
  partialViewChunkSize?: number
  optionalPickedPerkIds?: ReadonlySet<string>
}

type BackgroundFitAsyncViewOptions = BackgroundFitViewOptions & BackgroundFitAsyncControlOptions

export type BackgroundFitEngine = {
  getBackgroundPerkGroupProbability: (
    backgroundId: string,
    categoryName: string,
    perkGroupId: string,
  ) => number
  getBackgroundFitView: (
    pickedPerks: LegendsBackgroundFitPerkRecord[],
    studyResourceFilter?: BackgroundStudyResourceFilter,
    options?: BackgroundFitViewOptions,
  ) => BackgroundFitView
  getBackgroundFitViewAsync: (
    pickedPerks: LegendsBackgroundFitPerkRecord[],
    studyResourceFilter?: BackgroundStudyResourceFilter,
    options?: BackgroundFitAsyncViewOptions,
  ) => Promise<BackgroundFitView>
  getBackgroundFitSummaryView: (
    pickedPerks: LegendsBackgroundFitPerkRecord[],
  ) => BackgroundFitSummaryView
  getPerkBackgroundSources: (perk: LegendsBackgroundFitPerkRecord) => LegendsPerkBackgroundSource[]
}

const defaultBackgroundFitPartialViewChunkSize = 8
const defaultBackgroundFitProgressChunkSize = 8

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

function buildPerkGroupMetadataByKey(
  perks: LegendsBackgroundFitPerkRecord[],
): Map<string, BackgroundFitPerkGroupMetadata> {
  const perkGroupMetadataByKey = new Map<string, BackgroundFitPerkGroupMetadata>()

  for (const perk of perks) {
    for (const placement of perk.placements) {
      if (!isDynamicBackgroundCategoryName(placement.categoryName)) {
        continue
      }

      const perkGroupKey = getPerkGroupProbabilityKey(placement.categoryName, placement.perkGroupId)
      const existingPerkGroupMetadata = perkGroupMetadataByKey.get(perkGroupKey)

      if (!existingPerkGroupMetadata) {
        perkGroupMetadataByKey.set(perkGroupKey, {
          categoryName: placement.categoryName,
          perkGroupIconPath: placement.perkGroupIconPath,
          perkGroupId: placement.perkGroupId,
          perkGroupName: placement.perkGroupName,
        })
        continue
      }

      if (
        existingPerkGroupMetadata.perkGroupIconPath === null &&
        placement.perkGroupIconPath !== null
      ) {
        perkGroupMetadataByKey.set(perkGroupKey, {
          ...existingPerkGroupMetadata,
          perkGroupIconPath: placement.perkGroupIconPath,
        })
      }
    }
  }

  return perkGroupMetadataByKey
}

function compareBackgroundFitOtherPerkGroupPerks(
  leftPerk: BackgroundFitOtherPerkGroupPerk,
  rightPerk: BackgroundFitOtherPerkGroupPerk,
): number {
  return (
    leftPerk.perkName.localeCompare(rightPerk.perkName) ||
    leftPerk.perkId.localeCompare(rightPerk.perkId)
  )
}

function buildPerksByPerkGroupKey(
  perks: LegendsBackgroundFitPerkRecord[],
): Map<string, BackgroundFitOtherPerkGroupPerk[]> {
  const perksByPerkGroupKey = new Map<string, BackgroundFitOtherPerkGroupPerk[]>()
  const seenPerkIdsByPerkGroupKey = new Map<string, Set<string>>()

  for (const perk of perks) {
    for (const placement of perk.placements) {
      if (!isDynamicBackgroundCategoryName(placement.categoryName)) {
        continue
      }

      const perkGroupKey = getPerkGroupProbabilityKey(placement.categoryName, placement.perkGroupId)
      let seenPerkIds = seenPerkIdsByPerkGroupKey.get(perkGroupKey)

      if (!seenPerkIds) {
        seenPerkIds = new Set()
        seenPerkIdsByPerkGroupKey.set(perkGroupKey, seenPerkIds)
      }

      if (seenPerkIds.has(perk.id)) {
        continue
      }

      seenPerkIds.add(perk.id)

      const perkGroupPerks = perksByPerkGroupKey.get(perkGroupKey) ?? []

      perkGroupPerks.push({
        iconPath: perk.iconPath,
        perkId: perk.id,
        perkName: perk.perkName,
      })
      perksByPerkGroupKey.set(perkGroupKey, perkGroupPerks)
    }
  }

  return new Map(
    [...perksByPerkGroupKey.entries()].map(([perkGroupKey, perkGroupPerks]) => [
      perkGroupKey,
      perkGroupPerks.toSorted(compareBackgroundFitOtherPerkGroupPerks),
    ]),
  )
}

function getPerkGroupProbabilityKey(categoryName: string, perkGroupId: string): string {
  return `${categoryName}::${perkGroupId}`
}

function parsePerkGroupProbabilityKey(perkGroupKey: string): PerkGroupRequirement | null {
  const separatorIndex = perkGroupKey.indexOf('::')

  if (separatorIndex === -1) {
    return null
  }

  const categoryName = perkGroupKey.slice(0, separatorIndex)
  const perkGroupId = perkGroupKey.slice(separatorIndex + 2)

  if (!isDynamicBackgroundCategoryName(categoryName) || perkGroupId.length === 0) {
    return null
  }

  return {
    categoryName,
    perkGroupId,
  }
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

  outcomeDistribution.set(coverageMask, (outcomeDistribution.get(coverageMask) ?? 0) + probability)
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
  return (
    projection.groupCoverageMaskByRequirementKey.get(
      getPerkGroupProbabilityKey(categoryName, perkGroupId),
    ) ?? 0n
  )
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

function createBackgroundFitProjection(
  pickedPerks: LegendsBackgroundFitPerkRecord[],
): BackgroundFitProjection {
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
  pickedPerks: LegendsBackgroundFitPerkRecord[],
  projection: BackgroundFitProjection,
): CoverageMask {
  let coverageMask = 0n

  for (const pickedPerk of pickedPerks) {
    coverageMask |= projection.pickedPerkMaskById.get(pickedPerk.id) ?? 0n
  }

  return coverageMask
}

function getPickedPerksCoveredByRequirement({
  pickedPerks,
  projection,
  requirement,
  targetMask,
}: {
  pickedPerks: LegendsBackgroundFitPerkRecord[]
  projection: BackgroundFitProjection
  requirement: StudyReachabilityRequirement
  targetMask: CoverageMask
}): LegendsBackgroundFitPerkRecord[] {
  const requirementCoverageMask =
    projection.groupCoverageMaskByRequirementKey.get(
      getPerkGroupProbabilityKey(requirement.categoryName, requirement.perkGroupId),
    ) ?? 0n
  const scopedRequirementCoverageMask = requirementCoverageMask & targetMask

  return pickedPerks.filter((pickedPerk) => {
    const pickedPerkMask = projection.pickedPerkMaskById.get(pickedPerk.id) ?? 0n

    return (pickedPerkMask & scopedRequirementCoverageMask) !== 0n
  })
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
  projection,
  studyResourceCoverageProfile,
}: {
  nativeOutcomeDistribution: BackgroundOutcomeDistribution
  projection: BackgroundFitProjection
  studyResourceCoverageProfile: StudyResourceMaskCoverageProfile
}): NativeOutcomeSummary {
  let buildReachabilityProbability = 0
  let maximumNativeCoveredPickedPerkCount = 0
  let successfulNativeOutcomeCount = 0
  let alwaysCoveredPickedPerkMask: CoverageMask | null = null
  const scopedNativeOutcomeDistribution: BackgroundOutcomeDistribution = new Map()
  const successfulNativeOutcomeProbabilityTermsByKey = new Map<
    string,
    BackgroundFitChanceCalculationProbabilityTerm
  >()

  const getNativeCoveredPickedPerkIds = (nativeCoveredPickedPerkMask: CoverageMask): string[] => {
    const nativeCoveredPickedPerkIds: string[] = []

    for (const [pickedPerkId, pickedPerkMask] of projection.pickedPerkMaskById) {
      if ((nativeCoveredPickedPerkMask & pickedPerkMask) !== 0n) {
        nativeCoveredPickedPerkIds.push(pickedPerkId)
      }
    }

    return nativeCoveredPickedPerkIds
  }

  const addSuccessfulNativeOutcomeProbabilityTerm = (
    probability: number,
    nativeCoveredPickedPerkMask: CoverageMask,
  ) => {
    const probabilityKey = probability.toString()
    const nativeCoveredPickedPerkIds = getNativeCoveredPickedPerkIds(nativeCoveredPickedPerkMask)
    const existingTerm = successfulNativeOutcomeProbabilityTermsByKey.get(probabilityKey)

    successfulNativeOutcomeCount += 1

    if (existingTerm) {
      existingTerm.outcomeCount += 1
      existingTerm.nativeCoveredPickedPerkIdsByOutcome.push(nativeCoveredPickedPerkIds)
      return
    }

    successfulNativeOutcomeProbabilityTermsByKey.set(probabilityKey, {
      nativeCoveredPickedPerkIdsByOutcome: [nativeCoveredPickedPerkIds],
      outcomeCount: 1,
      probability,
    })
  }

  /*
   * Native outcome masks are exact projected intersections between one complete background roll and
   * the picked perks that roll can cover. Collapse them to this scope before calculating
   * reachability so optional-only roll differences do not create noisy must-have expression terms.
   * The scoped outcomes are still disjoint after their probabilities are summed by coverage mask.
   */
  for (const [nativeCoveredPickedPerkMask, nativeOutcomeProbability] of nativeOutcomeDistribution) {
    addOutcomeProbability(
      scopedNativeOutcomeDistribution,
      studyResourceCoverageProfile.getScopedCoveredPickedPerkMask(nativeCoveredPickedPerkMask),
      nativeOutcomeProbability,
    )
  }

  for (const nativeCoveredPickedPerkMask of scopedNativeOutcomeDistribution.keys()) {
    alwaysCoveredPickedPerkMask =
      alwaysCoveredPickedPerkMask === null
        ? nativeCoveredPickedPerkMask
        : alwaysCoveredPickedPerkMask & nativeCoveredPickedPerkMask
    maximumNativeCoveredPickedPerkCount = Math.max(
      maximumNativeCoveredPickedPerkCount,
      studyResourceCoverageProfile.getCoveredPickedPerkCount(nativeCoveredPickedPerkMask),
    )
  }

  if (
    alwaysCoveredPickedPerkMask !== null &&
    studyResourceCoverageProfile.canCoverBuild(alwaysCoveredPickedPerkMask)
  ) {
    return {
      buildReachabilityProbability: 1,
      chanceCalculation: {
        isNativeOutcomeIndependent: true,
        probability: 1,
        successfulNativeOutcomeCount: 1,
        successfulNativeOutcomeProbabilityTerms: [
          {
            nativeCoveredPickedPerkIdsByOutcome: [
              getNativeCoveredPickedPerkIds(alwaysCoveredPickedPerkMask),
            ],
            outcomeCount: 1,
            probability: 1,
          },
        ],
        totalNativeOutcomeCount: 1,
      },
      maximumNativeCoveredPickedPerkCount,
    }
  }

  for (const [
    nativeCoveredPickedPerkMask,
    nativeOutcomeProbability,
  ] of scopedNativeOutcomeDistribution) {
    if (studyResourceCoverageProfile.canCoverBuild(nativeCoveredPickedPerkMask)) {
      buildReachabilityProbability += nativeOutcomeProbability
      addSuccessfulNativeOutcomeProbabilityTerm(
        nativeOutcomeProbability,
        nativeCoveredPickedPerkMask,
      )
    }
  }

  const clampedBuildReachabilityProbability = clampProbability(buildReachabilityProbability)

  return {
    buildReachabilityProbability: clampedBuildReachabilityProbability,
    chanceCalculation: {
      isNativeOutcomeIndependent: false,
      probability: clampedBuildReachabilityProbability,
      successfulNativeOutcomeCount,
      successfulNativeOutcomeProbabilityTerms: [
        ...successfulNativeOutcomeProbabilityTermsByKey.values(),
      ].toSorted(
        (leftTerm, rightTerm) =>
          rightTerm.probability - leftTerm.probability ||
          rightTerm.outcomeCount - leftTerm.outcomeCount,
      ),
      totalNativeOutcomeCount: scopedNativeOutcomeDistribution.size,
    },
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

  // GetDynamicPerkTree's magic loop never appends random perk groups.
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

export function getBuildTargetPerkGroups(pickedPerks: LegendsBackgroundFitPerkRecord[]): {
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
          pickedPerkIconPaths: [],
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
      buildTargetPerkGroup.pickedPerkIconPaths.push(getBackgroundFitPerkIconPath(pickedPerk))
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

function getBackgroundFitPerkIconPath(perk: LegendsBackgroundFitPerkRecord): string | null {
  return perk.iconPath ?? perk.placements[0]?.perkGroupIconPath ?? null
}

function getUniqueDynamicPerkPlacements(
  perk: LegendsBackgroundFitPerkRecord,
): DynamicPerkPlacement[] {
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

function compareBackgroundFitOtherPerkGroups(
  leftPerkGroup: BackgroundFitOtherPerkGroup,
  rightPerkGroup: BackgroundFitOtherPerkGroup,
): number {
  return (
    Number(rightPerkGroup.isGuaranteed) - Number(leftPerkGroup.isGuaranteed) ||
    rightPerkGroup.probability - leftPerkGroup.probability ||
    getCategoryPriority(leftPerkGroup.categoryName) -
      getCategoryPriority(rightPerkGroup.categoryName) ||
    leftPerkGroup.perkGroupName.localeCompare(rightPerkGroup.perkGroupName) ||
    leftPerkGroup.perkGroupId.localeCompare(rightPerkGroup.perkGroupId)
  )
}

function getOtherBackgroundPerkGroups({
  perksByPerkGroupKey,
  perkGroupMetadataByKey,
  probabilitiesByPerkGroupKey,
  supportedBuildTargetPerkGroups,
}: {
  perksByPerkGroupKey: ReadonlyMap<string, BackgroundFitOtherPerkGroupPerk[]>
  perkGroupMetadataByKey: ReadonlyMap<string, BackgroundFitPerkGroupMetadata>
  probabilitiesByPerkGroupKey: ReadonlyMap<string, number>
  supportedBuildTargetPerkGroups: BuildTargetPerkGroup[]
}): BackgroundFitOtherPerkGroup[] {
  const buildPerkGroupKeys = new Set(
    supportedBuildTargetPerkGroups.map((buildTargetPerkGroup) =>
      getPerkGroupProbabilityKey(
        buildTargetPerkGroup.categoryName,
        buildTargetPerkGroup.perkGroupId,
      ),
    ),
  )
  const otherPerkGroups: BackgroundFitOtherPerkGroup[] = []

  for (const [perkGroupKey, probability] of probabilitiesByPerkGroupKey) {
    if (probability <= 0 || buildPerkGroupKeys.has(perkGroupKey)) {
      continue
    }

    let perkGroupMetadata = perkGroupMetadataByKey.get(perkGroupKey)

    if (!perkGroupMetadata) {
      const fallbackRequirement = parsePerkGroupProbabilityKey(perkGroupKey)

      if (fallbackRequirement === null) {
        continue
      }

      perkGroupMetadata = {
        categoryName: fallbackRequirement.categoryName,
        perkGroupIconPath: null,
        perkGroupId: fallbackRequirement.perkGroupId,
        perkGroupName: fallbackRequirement.perkGroupId,
      }
    }
    const displayProbability = Math.min(1, probability)

    otherPerkGroups.push({
      ...perkGroupMetadata,
      isGuaranteed: displayProbability >= 1,
      perks: perksByPerkGroupKey.get(perkGroupKey) ?? [],
      probability: displayProbability,
    })
  }

  return otherPerkGroups.toSorted(compareBackgroundFitOtherPerkGroups)
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
      const pickedPerkIconPaths: Array<string | null> = []
      const pickedPerkNames: string[] = []

      for (const [pickedPerkIndex, pickedPerkId] of match.pickedPerkIds.entries()) {
        if (guaranteedPickedPerkIdSet.has(pickedPerkId)) {
          continue
        }

        pickedPerkIds.push(pickedPerkId)
        pickedPerkIconPaths.push(match.pickedPerkIconPaths[pickedPerkIndex] ?? null)
        pickedPerkNames.push(match.pickedPerkNames[pickedPerkIndex] ?? pickedPerkId)
      }

      if (pickedPerkIds.length === 0) {
        return []
      }

      return [
        {
          ...match,
          pickedPerkCount: pickedPerkIds.length,
          pickedPerkIconPaths,
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

function mergeSortedRankedBackgroundFits(
  leftRankedBackgroundFits: RankedBackgroundFit[],
  rightRankedBackgroundFits: RankedBackgroundFit[],
): RankedBackgroundFit[] {
  const mergedRankedBackgroundFits: RankedBackgroundFit[] = []
  let leftIndex = 0
  let rightIndex = 0

  while (
    leftIndex < leftRankedBackgroundFits.length &&
    rightIndex < rightRankedBackgroundFits.length
  ) {
    if (
      compareRankedBackgroundFits(
        leftRankedBackgroundFits[leftIndex],
        rightRankedBackgroundFits[rightIndex],
      ) <= 0
    ) {
      mergedRankedBackgroundFits.push(leftRankedBackgroundFits[leftIndex])
      leftIndex += 1
    } else {
      mergedRankedBackgroundFits.push(rightRankedBackgroundFits[rightIndex])
      rightIndex += 1
    }
  }

  return mergedRankedBackgroundFits
    .concat(leftRankedBackgroundFits.slice(leftIndex))
    .concat(rightRankedBackgroundFits.slice(rightIndex))
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

function getPickedPerksCacheKey(pickedPerks: LegendsBackgroundFitPerkRecord[]): string {
  return pickedPerks
    .map((pickedPerk) => pickedPerk.id)
    .toSorted()
    .join('\u0000')
}

function getBackgroundFitScopeCacheKey(
  prefix: string,
  pickedPerks: LegendsBackgroundFitPerkRecord[],
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

function getStudyResourceChanceBreakdownFilters(
  studyResourceFilter: BackgroundStudyResourceFilter | undefined,
): Array<
  Pick<
    BackgroundFitStudyResourceChanceBreakdownEntry,
    'key' | 'shouldAllowBook' | 'shouldAllowScroll' | 'shouldAllowSecondScroll'
  >
> {
  if (studyResourceFilter === undefined) {
    return []
  }

  const breakdownFilters: Array<
    Pick<
      BackgroundFitStudyResourceChanceBreakdownEntry,
      'key' | 'shouldAllowBook' | 'shouldAllowScroll' | 'shouldAllowSecondScroll'
    >
  > = [
    {
      key: 'native',
      shouldAllowBook: false,
      shouldAllowScroll: false,
      shouldAllowSecondScroll: false,
    },
  ]

  if (studyResourceFilter.shouldAllowBook) {
    breakdownFilters.push({
      key: 'book',
      shouldAllowBook: true,
      shouldAllowScroll: false,
      shouldAllowSecondScroll: false,
    })
  }

  if (studyResourceFilter.shouldAllowScroll) {
    breakdownFilters.push({
      key: 'scroll',
      shouldAllowBook: false,
      shouldAllowScroll: true,
      shouldAllowSecondScroll: studyResourceFilter.shouldAllowSecondScroll,
    })
  }

  if (studyResourceFilter.shouldAllowBook && studyResourceFilter.shouldAllowScroll) {
    breakdownFilters.push({
      key: 'book-and-scroll',
      shouldAllowBook: true,
      shouldAllowScroll: true,
      shouldAllowSecondScroll: studyResourceFilter.shouldAllowSecondScroll,
    })
  }

  return breakdownFilters
}

function getStudyResourceBreakdownResourceCount(
  entry: Pick<
    BackgroundFitStudyResourceChanceBreakdownEntry,
    'shouldAllowBook' | 'shouldAllowScroll' | 'shouldAllowSecondScroll'
  >,
): number {
  return (
    (entry.shouldAllowBook ? 1 : 0) +
    (entry.shouldAllowScroll ? (entry.shouldAllowSecondScroll ? 2 : 1) : 0)
  )
}

function compareStudyResourceBreakdownEntriesForStrategy(
  leftEntry: BackgroundFitStudyResourceChanceBreakdownEntry,
  rightEntry: BackgroundFitStudyResourceChanceBreakdownEntry,
): number {
  const probabilityDifference = rightEntry.probability - leftEntry.probability

  if (Math.abs(probabilityDifference) > studyResourceStrategyProbabilityEpsilon) {
    return probabilityDifference
  }

  const resourceCountDifference =
    getStudyResourceBreakdownResourceCount(leftEntry) -
    getStudyResourceBreakdownResourceCount(rightEntry)

  if (resourceCountDifference !== 0) {
    return resourceCountDifference
  }

  return leftEntry.key.localeCompare(rightEntry.key)
}

function getSelectedStudyResourceStrategyBreakdownEntry(
  entries: BackgroundFitStudyResourceChanceBreakdownEntry[],
): BackgroundFitStudyResourceChanceBreakdownEntry | null {
  return entries.toSorted(compareStudyResourceBreakdownEntriesForStrategy)[0] ?? null
}

function getStudyResourceFilterFromBreakdownEntry(
  entry: BackgroundFitStudyResourceChanceBreakdownEntry,
): BackgroundStudyResourceFilter {
  return {
    shouldAllowBook: entry.shouldAllowBook,
    shouldAllowScroll: entry.shouldAllowScroll,
    shouldAllowSecondScroll: entry.shouldAllowSecondScroll,
  }
}

function getStudyResourceBreakdownProbability(
  entries: BackgroundFitStudyResourceChanceBreakdownEntry[],
  filter: BackgroundStudyResourceFilter,
): number {
  const exactEntry = entries.find(
    (entry) =>
      entry.shouldAllowBook === filter.shouldAllowBook &&
      entry.shouldAllowScroll === filter.shouldAllowScroll &&
      entry.shouldAllowSecondScroll === filter.shouldAllowSecondScroll,
  )

  if (exactEntry) {
    return exactEntry.probability
  }

  return (
    entries.find(
      (entry) =>
        entry.shouldAllowBook === filter.shouldAllowBook &&
        entry.shouldAllowScroll === filter.shouldAllowScroll,
    )?.probability ?? 0
  )
}

function getStudyResourceStrategyBaselineFilter({
  entry,
  resourceKind,
}: {
  entry: BackgroundFitStudyResourceChanceBreakdownEntry
  resourceKind: 'book' | 'scroll'
}): BackgroundStudyResourceFilter {
  return resourceKind === 'book'
    ? {
        shouldAllowBook: false,
        shouldAllowScroll: entry.shouldAllowScroll,
        shouldAllowSecondScroll: entry.shouldAllowSecondScroll,
      }
    : {
        shouldAllowBook: entry.shouldAllowBook,
        shouldAllowScroll: false,
        shouldAllowSecondScroll: false,
      }
}

function compareStudyResourceStrategyTargets(
  leftTarget: BackgroundFitStudyResourceStrategyTarget,
  rightTarget: BackgroundFitStudyResourceStrategyTarget,
): number {
  const marginalProbabilityDifference =
    rightTarget.marginalProbabilityGain - leftTarget.marginalProbabilityGain

  if (Math.abs(marginalProbabilityDifference) > studyResourceStrategyProbabilityEpsilon) {
    return marginalProbabilityDifference
  }

  const fixedTargetProbabilityDifference =
    rightTarget.fixedTargetProbability - leftTarget.fixedTargetProbability

  if (Math.abs(fixedTargetProbabilityDifference) > studyResourceStrategyProbabilityEpsilon) {
    return fixedTargetProbabilityDifference
  }

  return (
    rightTarget.coveredPickedPerkIds.length - leftTarget.coveredPickedPerkIds.length ||
    getCategoryPriority(leftTarget.categoryName) - getCategoryPriority(rightTarget.categoryName) ||
    leftTarget.perkGroupName.localeCompare(rightTarget.perkGroupName) ||
    leftTarget.perkGroupId.localeCompare(rightTarget.perkGroupId)
  )
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

export function createBackgroundFitEngine(
  dataset: LegendsBackgroundFitDataset,
): BackgroundFitEngine {
  const perkGroupIdsByCategory = buildPerkGroupIdsByCategory(dataset.perks)
  const perkGroupMetadataByKey = buildPerkGroupMetadataByKey(dataset.perks)
  const perksByPerkGroupKey = buildPerksByPerkGroupKey(dataset.perks)
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
    const { backgroundDefinition, maximumTotalPerkGroupCount, probabilitiesByPerkGroupKey } =
      backgroundProbabilityRecord

    return {
      backgroundId: backgroundDefinition.backgroundId,
      backgroundName: backgroundDefinition.backgroundName,
      backgroundTypeNames: backgroundDefinition.backgroundTypeNames,
      campResourceModifiers: backgroundDefinition.campResourceModifiers,
      dailyCost: backgroundDefinition.dailyCost,
      disambiguator:
        (duplicateBackgroundNameCountByName.get(backgroundDefinition.backgroundName) ?? 0) > 1
          ? getBackgroundDisambiguator(backgroundDefinition)
          : null,
      excludedTalentAttributeNames: backgroundDefinition.excludedTalentAttributeNames,
      excludedTraits: backgroundDefinition.excludedTraits,
      excludedTraitNames: backgroundDefinition.excludedTraitNames,
      expectedCoveredPickedPerkCount: 0,
      expectedMatchedPerkGroupCount: 0,
      guaranteedMatchedPerkGroupCount: 0,
      guaranteedTraits: backgroundDefinition.guaranteedTraits,
      guaranteedTraitNames: backgroundDefinition.guaranteedTraitNames,
      iconPath: backgroundDefinition.iconPath ?? null,
      maximumTotalPerkGroupCount,
      matches: [],
      otherPerkGroups: getOtherBackgroundPerkGroups({
        perksByPerkGroupKey,
        perkGroupMetadataByKey,
        probabilitiesByPerkGroupKey,
        supportedBuildTargetPerkGroups: [],
      }),
      sourceFilePath: backgroundDefinition.sourceFilePath,
      veteranPerkLevelInterval: backgroundDefinition.veteranPerkLevelInterval,
    }
  }

  function getEmptyBackgroundFitSummaries(): BackgroundFitSummary[] {
    return backgroundProbabilityRecords
      .map(createEmptyBackgroundFitSummary)
      .toSorted(compareBackgroundFitSummaries)
  }

  function getBackgroundFitBuildCache(
    pickedPerks: LegendsBackgroundFitPerkRecord[],
  ): BackgroundFitBuildCache {
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
      projection: backgroundFitBuildCache.projection,
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
    pickedPerks: LegendsBackgroundFitPerkRecord[]
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
    pickedPerks: LegendsBackgroundFitPerkRecord[]
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
      backgroundTypeNames: backgroundDefinition.backgroundTypeNames,
      campResourceModifiers: backgroundDefinition.campResourceModifiers,
      dailyCost: backgroundDefinition.dailyCost,
      disambiguator:
        (duplicateBackgroundNameCountByName.get(backgroundDefinition.backgroundName) ?? 0) > 1
          ? getBackgroundDisambiguator(backgroundDefinition)
          : null,
      excludedTalentAttributeNames: backgroundDefinition.excludedTalentAttributeNames,
      excludedTraits: backgroundDefinition.excludedTraits,
      excludedTraitNames: backgroundDefinition.excludedTraitNames,
      expectedCoveredPickedPerkCount: calculateExpectedCoveredPickedPerkCountFromDistribution({
        nativeOutcomeDistribution: getCachedNativeOutcomeDistribution(
          backgroundFitBuildCache,
          cachedBackgroundFitRecord,
        ),
        pickedPerksMask: getPickedPerksCoverageMask(
          pickedPerks,
          backgroundFitBuildCache.projection,
        ),
      }),
      expectedMatchedPerkGroupCount: matches.reduce(
        (expectedPerkGroupCount, match) => expectedPerkGroupCount + match.probability,
        0,
      ),
      guaranteedMatchedPerkGroupCount: matches.filter((match) => match.isGuaranteed).length,
      guaranteedTraits: backgroundDefinition.guaranteedTraits,
      guaranteedTraitNames: backgroundDefinition.guaranteedTraitNames,
      iconPath: backgroundDefinition.iconPath ?? null,
      maximumTotalPerkGroupCount,
      matches,
      otherPerkGroups: getOtherBackgroundPerkGroups({
        perksByPerkGroupKey,
        perkGroupMetadataByKey,
        probabilitiesByPerkGroupKey,
        supportedBuildTargetPerkGroups,
      }),
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
    pickedPerks: LegendsBackgroundFitPerkRecord[]
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

  function* createBackgroundFitViewGenerator(
    pickedPerks: LegendsBackgroundFitPerkRecord[],
    studyResourceFilter: BackgroundStudyResourceFilter | undefined,
    options: BackgroundFitViewOptions,
  ): Generator<void, BackgroundFitView, void> {
    if (pickedPerks.length === 0) {
      const buildReachabilityProbability = studyResourceFilter === undefined ? null : 1
      const totalBackgroundCount = backgroundProbabilityRecords.length

      options.onProgress?.({
        checkedBackgroundCount: totalBackgroundCount,
        totalBackgroundCount,
      })

      return {
        rankedBackgroundFits: getEmptyBackgroundFitSummaries()
          .map(
            (backgroundFitSummary): RankedBackgroundFit => ({
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
            }),
          )
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
    const mustHavePickedPerkIdSet = new Set(mustHavePickedPerks.map((pickedPerk) => pickedPerk.id))
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
      backgroundFitBuildCache.projection.groupCoverageMaskByRequirementKey.get(requirementKey) ?? 0n
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
    const createStudyResourceChanceBreakdownProfiles = ({
      pickedPerks,
      scopePrefix,
      targetMask,
    }: {
      pickedPerks: LegendsBackgroundFitPerkRecord[]
      scopePrefix: string
      targetMask: CoverageMask
    }): StudyResourceChanceBreakdownProfile[] =>
      getStudyResourceChanceBreakdownFilters(studyResourceFilter).map((breakdownFilter) => {
        const filter = {
          shouldAllowBook: breakdownFilter.shouldAllowBook,
          shouldAllowScroll: breakdownFilter.shouldAllowScroll,
          shouldAllowSecondScroll: breakdownFilter.shouldAllowSecondScroll,
        } satisfies BackgroundStudyResourceFilter
        const oneScrollEquivalentFilter = breakdownFilter.shouldAllowSecondScroll
          ? ({
              ...filter,
              shouldAllowSecondScroll: false,
            } satisfies BackgroundStudyResourceFilter)
          : null
        const createCoverageProfile = (profileFilter: BackgroundStudyResourceFilter) =>
          createStudyResourceMaskCoverageProfile({
            filter: profileFilter,
            getRequirementCoverageMask,
            pickedPerks,
            targetMask,
          })

        return {
          ...breakdownFilter,
          oneScrollEquivalentScopeCacheKey: oneScrollEquivalentFilter
            ? getBackgroundFitScopeCacheKey(
                scopePrefix,
                pickedPerks,
                getStudyResourceFilterCacheKey(oneScrollEquivalentFilter),
              )
            : undefined,
          oneScrollEquivalentStudyResourceCoverageProfile: oneScrollEquivalentFilter
            ? createCoverageProfile(oneScrollEquivalentFilter)
            : undefined,
          scopeCacheKey: getBackgroundFitScopeCacheKey(
            scopePrefix,
            pickedPerks,
            getStudyResourceFilterCacheKey(filter),
          ),
          studyResourceCoverageProfile: createCoverageProfile(filter),
        }
      })
    const mustHaveStudyResourceChanceBreakdownProfiles = createStudyResourceChanceBreakdownProfiles(
      {
        pickedPerks: mustHavePickedPerks,
        scopePrefix: 'must-have',
        targetMask: getPickedPerksCoverageMask(
          mustHavePickedPerks,
          backgroundFitBuildCache.projection,
        ),
      },
    )
    const totalStudyResourceChanceBreakdownProfiles =
      optionalPickedPerks.length === 0
        ? mustHaveStudyResourceChanceBreakdownProfiles
        : createStudyResourceChanceBreakdownProfiles({
            pickedPerks,
            scopePrefix: 'total',
            targetMask: backgroundFitBuildCache.projection.allPickedMask,
          })

    const rankedBackgroundFits: RankedBackgroundFit[] = []
    let sortedRankedBackgroundFitsSnapshot: RankedBackgroundFit[] = []
    let sortedSnapshotSourceLength = 0
    const totalBackgroundCount = backgroundFitBuildCache.cachedBackgroundFitRecords.length
    let checkedBackgroundCount = 0
    let lastPartialViewCheckedBackgroundCount = 0
    let lastPartialViewRankedBackgroundFitCount = 0
    let lastReportedProgressCheckedBackgroundCount = -1
    const requestedPartialViewChunkSize =
      options.partialViewChunkSize ?? defaultBackgroundFitPartialViewChunkSize
    const partialViewChunkSize = Number.isFinite(requestedPartialViewChunkSize)
      ? Math.max(1, Math.floor(requestedPartialViewChunkSize))
      : defaultBackgroundFitPartialViewChunkSize
    const getSortedRankedBackgroundFits = (): RankedBackgroundFit[] => {
      if (sortedSnapshotSourceLength < rankedBackgroundFits.length) {
        const sortedNewRankedBackgroundFits = rankedBackgroundFits
          .slice(sortedSnapshotSourceLength)
          .toSorted(compareRankedBackgroundFits)

        sortedRankedBackgroundFitsSnapshot = mergeSortedRankedBackgroundFits(
          sortedRankedBackgroundFitsSnapshot,
          sortedNewRankedBackgroundFits,
        )
        sortedSnapshotSourceLength = rankedBackgroundFits.length
      }

      return sortedRankedBackgroundFitsSnapshot
    }
    const getCurrentBackgroundFitView = (): BackgroundFitView => ({
      rankedBackgroundFits: getSortedRankedBackgroundFits().slice(),
      supportedBuildTargetPerkGroups: backgroundFitBuildCache.supportedBuildTargetPerkGroups,
      unsupportedBuildTargetPerkGroups: backgroundFitBuildCache.unsupportedBuildTargetPerkGroups,
    })
    const reportProgress = ({ shouldForce = false } = {}) => {
      if (
        !shouldForce &&
        checkedBackgroundCount < totalBackgroundCount &&
        checkedBackgroundCount - lastReportedProgressCheckedBackgroundCount <
          defaultBackgroundFitProgressChunkSize
      ) {
        return
      }

      if (checkedBackgroundCount === lastReportedProgressCheckedBackgroundCount) {
        return
      }

      lastReportedProgressCheckedBackgroundCount = checkedBackgroundCount
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
    const getStudyResourceChanceBreakdown = (
      cachedBackgroundFitRecord: CachedBackgroundFitRecord,
      profiles: StudyResourceChanceBreakdownProfile[],
    ): BackgroundFitStudyResourceChanceBreakdownEntry[] =>
      profiles.map((profile) => {
        const nativeOutcomeSummary = getCachedNativeOutcomeSummary({
          backgroundFitBuildCache,
          cachedBackgroundFitRecord,
          studyResourceCoverageProfile: profile.studyResourceCoverageProfile,
          studyResourceFilterCacheKey: profile.scopeCacheKey,
        })
        const oneScrollEquivalentNativeOutcomeSummary =
          profile.oneScrollEquivalentScopeCacheKey &&
          profile.oneScrollEquivalentStudyResourceCoverageProfile
            ? getCachedNativeOutcomeSummary({
                backgroundFitBuildCache,
                cachedBackgroundFitRecord,
                studyResourceCoverageProfile:
                  profile.oneScrollEquivalentStudyResourceCoverageProfile,
                studyResourceFilterCacheKey: profile.oneScrollEquivalentScopeCacheKey,
              })
            : null
        const shouldAllowSecondScroll =
          profile.shouldAllowSecondScroll &&
          (oneScrollEquivalentNativeOutcomeSummary === null ||
            nativeOutcomeSummary.buildReachabilityProbability -
              oneScrollEquivalentNativeOutcomeSummary.buildReachabilityProbability >
              studyResourceStrategyProbabilityEpsilon)
        const effectiveNativeOutcomeSummary = shouldAllowSecondScroll
          ? nativeOutcomeSummary
          : (oneScrollEquivalentNativeOutcomeSummary ?? nativeOutcomeSummary)

        return {
          calculation: effectiveNativeOutcomeSummary.chanceCalculation,
          key: profile.key,
          probability: effectiveNativeOutcomeSummary.buildReachabilityProbability,
          shouldAllowBook: profile.shouldAllowBook,
          shouldAllowScroll: profile.shouldAllowScroll,
          shouldAllowSecondScroll,
        }
      })
    const getStudyResourceStrategyTargets = ({
      baselineProbability,
      cachedBackgroundFitRecord,
      pickedPerks,
      resourceKind,
      scopePrefix,
      selectedFilter,
      targetMask,
    }: {
      baselineProbability: number
      cachedBackgroundFitRecord: CachedBackgroundFitRecord
      pickedPerks: LegendsBackgroundFitPerkRecord[]
      resourceKind: 'book' | 'scroll'
      scopePrefix: string
      selectedFilter: BackgroundStudyResourceFilter
      targetMask: CoverageMask
    }): BackgroundFitStudyResourceStrategyTarget[] =>
      getReachableStudyResourceRequirements({ pickedPerks, resourceKind })
        .flatMap((requirement): BackgroundFitStudyResourceStrategyTarget[] => {
          const requirementKey = getPerkGroupProbabilityKey(
            requirement.categoryName,
            requirement.perkGroupId,
          )
          const fixedTargetProbability = getCachedNativeOutcomeSummary({
            backgroundFitBuildCache,
            cachedBackgroundFitRecord,
            studyResourceCoverageProfile: createStudyResourceMaskCoverageProfile({
              filter: selectedFilter,
              fixedBookRequirement: resourceKind === 'book' ? requirement : undefined,
              fixedScrollRequirements: resourceKind === 'scroll' ? [requirement] : [],
              getRequirementCoverageMask,
              pickedPerks,
              targetMask,
            }),
            studyResourceFilterCacheKey: getBackgroundFitScopeCacheKey(
              `${scopePrefix}-strategy-${resourceKind}-${requirementKey}`,
              pickedPerks,
              getStudyResourceFilterCacheKey(selectedFilter),
            ),
          }).buildReachabilityProbability
          const marginalProbabilityGain = clampProbability(
            fixedTargetProbability - baselineProbability,
          )

          if (marginalProbabilityGain <= studyResourceStrategyProbabilityEpsilon) {
            return []
          }

          const coveredPickedPerks = getPickedPerksCoveredByRequirement({
            pickedPerks,
            projection: backgroundFitBuildCache.projection,
            requirement,
            targetMask,
          })

          if (coveredPickedPerks.length === 0) {
            return []
          }

          const perkGroupMetadata = perkGroupMetadataByKey.get(requirementKey)

          return [
            {
              categoryName: requirement.categoryName,
              coveredPickedPerkIds: coveredPickedPerks.map((pickedPerk) => pickedPerk.id),
              coveredPickedPerkNames: coveredPickedPerks.map((pickedPerk) => pickedPerk.perkName),
              fixedTargetProbability,
              marginalProbabilityGain,
              perkGroupIconPath: perkGroupMetadata?.perkGroupIconPath ?? null,
              perkGroupId: requirement.perkGroupId,
              perkGroupName: perkGroupMetadata?.perkGroupName ?? requirement.perkGroupId,
            },
          ]
        })
        .toSorted(compareStudyResourceStrategyTargets)
    const getStudyResourceStrategy = ({
      cachedBackgroundFitRecord,
      chanceBreakdown,
      pickedPerks,
      scopePrefix,
      targetMask,
    }: {
      cachedBackgroundFitRecord: CachedBackgroundFitRecord
      chanceBreakdown: BackgroundFitStudyResourceChanceBreakdownEntry[]
      pickedPerks: LegendsBackgroundFitPerkRecord[]
      scopePrefix: string
      targetMask: CoverageMask
    }): BackgroundFitStudyResourceStrategy | undefined => {
      const nativeBreakdownEntry = chanceBreakdown.find((entry) => entry.key === 'native')
      const selectedBreakdownEntry = getSelectedStudyResourceStrategyBreakdownEntry(chanceBreakdown)

      if (
        !nativeBreakdownEntry ||
        !selectedBreakdownEntry ||
        selectedBreakdownEntry.key === 'native' ||
        selectedBreakdownEntry.probability - nativeBreakdownEntry.probability <=
          studyResourceStrategyProbabilityEpsilon
      ) {
        return undefined
      }

      const selectedFilter = getStudyResourceFilterFromBreakdownEntry(selectedBreakdownEntry)
      const bookBaselineProbability = selectedBreakdownEntry.shouldAllowBook
        ? getStudyResourceBreakdownProbability(
            chanceBreakdown,
            getStudyResourceStrategyBaselineFilter({
              entry: selectedBreakdownEntry,
              resourceKind: 'book',
            }),
          )
        : 0
      const scrollBaselineProbability = selectedBreakdownEntry.shouldAllowScroll
        ? getStudyResourceBreakdownProbability(
            chanceBreakdown,
            getStudyResourceStrategyBaselineFilter({
              entry: selectedBreakdownEntry,
              resourceKind: 'scroll',
            }),
          )
        : 0
      const bookTargets = selectedBreakdownEntry.shouldAllowBook
        ? getStudyResourceStrategyTargets({
            baselineProbability: bookBaselineProbability,
            cachedBackgroundFitRecord,
            pickedPerks,
            resourceKind: 'book',
            scopePrefix,
            selectedFilter,
            targetMask,
          })
        : []
      const scrollTargets = selectedBreakdownEntry.shouldAllowScroll
        ? getStudyResourceStrategyTargets({
            baselineProbability: scrollBaselineProbability,
            cachedBackgroundFitRecord,
            pickedPerks,
            resourceKind: 'scroll',
            scopePrefix,
            selectedFilter,
            targetMask,
          })
        : []

      if (bookTargets.length === 0 && scrollTargets.length === 0) {
        return undefined
      }

      return {
        bookTargets,
        nativeProbability: nativeBreakdownEntry.probability,
        probability: selectedBreakdownEntry.probability,
        scrollTargets,
        selectedCombinationKey: selectedBreakdownEntry.key,
        shouldAllowSecondScroll: selectedBreakdownEntry.shouldAllowSecondScroll,
      }
    }

    reportProgress({ shouldForce: true })

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
        yield
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
        yield
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
      const fullBuildStudyResourceChanceBreakdown =
        studyResourceFilter === undefined
          ? undefined
          : getStudyResourceChanceBreakdown(
              cachedBackgroundFitRecord,
              totalStudyResourceChanceBreakdownProfiles,
            )
      const mustHaveStudyResourceChanceBreakdown =
        studyResourceFilter === undefined
          ? undefined
          : getStudyResourceChanceBreakdown(
              cachedBackgroundFitRecord,
              mustHaveStudyResourceChanceBreakdownProfiles,
            )

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
        fullBuildStudyResourceChanceBreakdown: fullBuildStudyResourceChanceBreakdown,
        fullBuildStudyResourceStrategy:
          fullBuildStudyResourceChanceBreakdown === undefined
            ? undefined
            : getStudyResourceStrategy({
                cachedBackgroundFitRecord,
                chanceBreakdown: fullBuildStudyResourceChanceBreakdown,
                pickedPerks,
                scopePrefix: 'total',
                targetMask: backgroundFitBuildCache.projection.allPickedMask,
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
        mustHaveStudyResourceChanceBreakdown: mustHaveStudyResourceChanceBreakdown,
        mustHaveStudyResourceStrategy:
          mustHaveStudyResourceChanceBreakdown === undefined
            ? undefined
            : getStudyResourceStrategy({
                cachedBackgroundFitRecord,
                chanceBreakdown: mustHaveStudyResourceChanceBreakdown,
                pickedPerks: mustHavePickedPerks,
                scopePrefix: 'must-have',
                targetMask: getPickedPerksCoverageMask(
                  mustHavePickedPerks,
                  backgroundFitBuildCache.projection,
                ),
              }),
        mustHaveStudyResourceRequirement,
      }

      rankedBackgroundFits.push(rankedBackgroundFit)

      reportCheckedBackground()
      yield
    }

    return getCurrentBackgroundFitView()
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
      return runBackgroundFitViewGeneratorToCompletion(
        createBackgroundFitViewGenerator(pickedPerks, studyResourceFilter, options),
      )
    },
    getBackgroundFitViewAsync(pickedPerks, studyResourceFilter, options = {}) {
      return runBackgroundFitViewGeneratorAsync(
        createBackgroundFitViewGenerator(pickedPerks, studyResourceFilter, options),
        options,
      )
    },
  }
}

function getPlacementGroupRequirementKey(placement: LegendsPerkPlacement): string {
  return getPerkGroupProbabilityKey(placement.categoryName, placement.perkGroupId)
}
