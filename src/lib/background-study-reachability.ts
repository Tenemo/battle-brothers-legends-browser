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

export type StudyResourceRequirementProfile = {
  bookRequirement: StudyReachabilityRequirement | null
  requiresBook: boolean
  requiredScrollCount: 0 | 1 | 2
  requiresBright: boolean
  scrollRequirements: StudyReachabilityRequirement[]
}

type StudyResourceAssignmentCandidate = {
  assignedBookRequirementKey: string | null
  assignedScrollRequirementKeys: string[]
}

export type StudyResourceCoverageProfile = {
  canCoverBuild: (nativeCoveredPickedPerkMask: bigint) => boolean
  getCoveredPickedPerkCount: (coveredPickedPerkMask: bigint) => number
  getNativeCoveredPickedPerkMask: (nativeRequirementKeys: ReadonlySet<string>) => bigint
}

export type StudyResourceMaskCoverageProfile = {
  canCoverBuild: (nativeCoveredPickedPerkMask: bigint) => boolean
  getCoveredPickedPerkCount: (coveredPickedPerkMask: bigint) => number
}

const nativeStudyResourceRequirementProfile = {
  bookRequirement: null,
  requiredScrollCount: 0,
  requiresBook: false,
  requiresBright: false,
  scrollRequirements: [] as StudyReachabilityRequirement[],
} as const satisfies StudyResourceRequirementProfile

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
  if (categoryName.includes('::') || perkGroupId.includes('::')) {
    throw new Error(`Invalid study resource requirement key parts: ${categoryName}::${perkGroupId}`)
  }

  return `${categoryName}::${perkGroupId}`
}

function getStudyReachabilityRequirementFromKey(
  requirementKey: string,
): StudyReachabilityRequirement {
  const requirementKeyParts = requirementKey.split('::')

  if (requirementKeyParts.length !== 2) {
    throw new Error(`Invalid study resource requirement key: ${requirementKey}`)
  }

  const [categoryName, perkGroupId] = requirementKeyParts

  if (!categoryName || !perkGroupId || !isDynamicBackgroundCategoryName(categoryName)) {
    throw new Error(`Invalid study resource requirement key: ${requirementKey}`)
  }

  return {
    categoryName,
    perkGroupId,
  }
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
  const seenRequirementOptionKeys = new Set<string>()
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

    const requirementOptionKey = requirementOptions
      .map((requirement) => createPerkGroupKey(requirement.categoryName, requirement.perkGroupId))
      .toSorted()
      .join(',')

    if (requirementOptions.length > 0 && !seenRequirementOptionKeys.has(requirementOptionKey)) {
      seenRequirementOptionKeys.add(requirementOptionKey)
      pickedPerkRequirementOptions.push(requirementOptions)
    }
  }

  return pickedPerkRequirementOptions.toSorted(
    (leftOptions, rightOptions) => leftOptions.length - rightOptions.length,
  )
}

function getPickedPerkRequirementKeyOptions(pickedPerks: LegendsPerkRecord[]): string[][] {
  const pickedPerkRequirementKeyOptions: string[][] = []

  for (const pickedPerk of pickedPerks) {
    const seenRequirementKeys = new Set<string>()
    const requirementKeys: string[] = []

    for (const placement of pickedPerk.placements) {
      if (!isDynamicBackgroundCategoryName(placement.categoryName)) {
        continue
      }

      const requirementKey = createPerkGroupKey(placement.categoryName, placement.perkGroupId)

      if (seenRequirementKeys.has(requirementKey)) {
        continue
      }

      seenRequirementKeys.add(requirementKey)
      requirementKeys.push(requirementKey)
    }

    if (requirementKeys.length > 0) {
      pickedPerkRequirementKeyOptions.push(requirementKeys)
    }
  }

  return pickedPerkRequirementKeyOptions
}

function getRequirementMapKey(requirementMap: Map<string, StudyReachabilityRequirement>): string {
  return [...requirementMap.keys()].toSorted().join(',')
}

function getUniqueReachableRequirementKeys({
  isReachableRequirement,
  pickedPerkRequirementOptions,
}: {
  isReachableRequirement: (requirement: StudyReachabilityRequirement) => boolean
  pickedPerkRequirementOptions: StudyReachabilityRequirement[][]
}): string[] {
  const reachableRequirementKeys = new Set<string>()

  for (const requirementOptions of pickedPerkRequirementOptions) {
    for (const requirement of requirementOptions) {
      if (isReachableRequirement(requirement)) {
        reachableRequirementKeys.add(
          createPerkGroupKey(requirement.categoryName, requirement.perkGroupId),
        )
      }
    }
  }

  return [...reachableRequirementKeys].toSorted()
}

function getScrollRequirementKeySets(
  scrollRequirementKeys: string[],
  scrollSlotCount: number,
): string[][] {
  const scrollRequirementKeySets: string[][] = [[]]
  const subset: string[] = []
  const maximumSubsetSize = Math.min(scrollSlotCount, scrollRequirementKeys.length)

  function visit(startIndex: number, subsetSize: number): void {
    if (subset.length === subsetSize) {
      scrollRequirementKeySets.push([...subset])
      return
    }

    for (
      let candidateIndex = startIndex;
      candidateIndex <= scrollRequirementKeys.length - (subsetSize - subset.length);
      candidateIndex += 1
    ) {
      subset.push(scrollRequirementKeys[candidateIndex])
      visit(candidateIndex + 1, subsetSize)
      subset.pop()
    }
  }

  for (let subsetSize = 1; subsetSize <= maximumSubsetSize; subsetSize += 1) {
    visit(0, subsetSize)
  }

  return scrollRequirementKeySets
}

function getStudyResourceAssignmentResourceCount(
  studyResourceAssignmentCandidate: StudyResourceAssignmentCandidate,
): number {
  return (
    (studyResourceAssignmentCandidate.assignedBookRequirementKey === null ? 0 : 1) +
    studyResourceAssignmentCandidate.assignedScrollRequirementKeys.length
  )
}

function getStudyResourceAssignmentSortKey(
  studyResourceAssignmentCandidate: StudyResourceAssignmentCandidate,
): string {
  return [
    studyResourceAssignmentCandidate.assignedBookRequirementKey ?? '',
    ...studyResourceAssignmentCandidate.assignedScrollRequirementKeys,
  ].join('|')
}

function compareStudyResourceAssignmentCandidates(
  leftAssignmentCandidate: StudyResourceAssignmentCandidate,
  rightAssignmentCandidate: StudyResourceAssignmentCandidate,
): number {
  const scrollCountDifference =
    leftAssignmentCandidate.assignedScrollRequirementKeys.length -
    rightAssignmentCandidate.assignedScrollRequirementKeys.length

  if (scrollCountDifference !== 0) {
    return scrollCountDifference
  }

  const resourceCountDifference =
    getStudyResourceAssignmentResourceCount(leftAssignmentCandidate) -
    getStudyResourceAssignmentResourceCount(rightAssignmentCandidate)

  if (resourceCountDifference !== 0) {
    return resourceCountDifference
  }

  return getStudyResourceAssignmentSortKey(leftAssignmentCandidate).localeCompare(
    getStudyResourceAssignmentSortKey(rightAssignmentCandidate),
  )
}

function getStudyResourceAssignmentCandidates({
  bookRequirementKeys,
  scrollRequirementKeySets,
}: {
  bookRequirementKeys: (string | null)[]
  scrollRequirementKeySets: string[][]
}): StudyResourceAssignmentCandidate[] {
  const studyResourceAssignmentCandidates: StudyResourceAssignmentCandidate[] = []

  for (const assignedBookRequirementKey of bookRequirementKeys) {
    for (const assignedScrollRequirementKeys of scrollRequirementKeySets) {
      studyResourceAssignmentCandidates.push({
        assignedBookRequirementKey,
        assignedScrollRequirementKeys,
      })
    }
  }

  return studyResourceAssignmentCandidates.toSorted(compareStudyResourceAssignmentCandidates)
}

function createStudyResourceRequirementProfile(
  studyResourceAssignmentCandidate: StudyResourceAssignmentCandidate,
): StudyResourceRequirementProfile {
  const requiredScrollCount = studyResourceAssignmentCandidate.assignedScrollRequirementKeys
    .length as StudyResourceRequirementProfile['requiredScrollCount']

  if (
    studyResourceAssignmentCandidate.assignedBookRequirementKey === null &&
    requiredScrollCount === 0
  ) {
    return nativeStudyResourceRequirementProfile
  }

  return {
    bookRequirement:
      studyResourceAssignmentCandidate.assignedBookRequirementKey === null
        ? null
        : getStudyReachabilityRequirementFromKey(
            studyResourceAssignmentCandidate.assignedBookRequirementKey,
          ),
    requiredScrollCount,
    requiresBook: studyResourceAssignmentCandidate.assignedBookRequirementKey !== null,
    requiresBright: requiredScrollCount === 2,
    scrollRequirements: studyResourceAssignmentCandidate.assignedScrollRequirementKeys.map(
      getStudyReachabilityRequirementFromKey,
    ),
  }
}

export function isNativeStudyResourceRequirementProfile(
  studyResourceRequirementProfile: StudyResourceRequirementProfile,
): boolean {
  return (
    !studyResourceRequirementProfile.requiresBook &&
    studyResourceRequirementProfile.bookRequirement === null &&
    studyResourceRequirementProfile.requiredScrollCount === 0 &&
    !studyResourceRequirementProfile.requiresBright &&
    studyResourceRequirementProfile.scrollRequirements.length === 0
  )
}

function getPickedPerkMask(pickedPerkIndex: number): bigint {
  return 1n << BigInt(pickedPerkIndex)
}

function getAllPickedPerksMask(pickedPerkCount: number): bigint {
  let allPickedPerksMask = 0n

  for (let pickedPerkIndex = 0; pickedPerkIndex < pickedPerkCount; pickedPerkIndex += 1) {
    allPickedPerksMask |= getPickedPerkMask(pickedPerkIndex)
  }

  return allPickedPerksMask
}

function getCoveredPickedPerkMask({
  pickedPerkRequirementKeyOptions,
  requirementKeys,
}: {
  pickedPerkRequirementKeyOptions: string[][]
  requirementKeys: ReadonlySet<string>
}): bigint {
  let coveredPickedPerkMask = 0n

  for (const [
    pickedPerkIndex,
    requirementKeyOptions,
  ] of pickedPerkRequirementKeyOptions.entries()) {
    if (requirementKeyOptions.some((requirementKey) => requirementKeys.has(requirementKey))) {
      coveredPickedPerkMask |= getPickedPerkMask(pickedPerkIndex)
    }
  }

  return coveredPickedPerkMask
}

function getCoveredPickedPerkCount(coveredPickedPerkMask: bigint): number {
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

export function createStudyResourceCoverageProfile({
  filter,
  pickedPerks,
}: {
  filter: BackgroundStudyResourceFilter | null
  pickedPerks: LegendsPerkRecord[]
}): StudyResourceCoverageProfile {
  const pickedPerkRequirementKeyOptions = getPickedPerkRequirementKeyOptions(pickedPerks)
  const allPickedPerksMask = getAllPickedPerksMask(pickedPerkRequirementKeyOptions.length)
  const pickedPerkRequirementOptions = getPickedPerkRequirementOptions(pickedPerks)
  const bookRequirementKeys = filter?.shouldAllowBook
    ? [
        null,
        ...getUniqueReachableRequirementKeys({
          isReachableRequirement: isSkillBookReachableRequirement,
          pickedPerkRequirementOptions,
        }),
      ]
    : [null]
  const scrollSlotCount = filter === null ? 0 : getScrollSlotCount(filter)
  const scrollRequirementKeySets =
    scrollSlotCount > 0
      ? getScrollRequirementKeySets(
          getUniqueReachableRequirementKeys({
            isReachableRequirement: isAncientScrollReachableRequirement,
            pickedPerkRequirementOptions,
          }),
          scrollSlotCount,
        )
      : [[]]
  const studyCoveredPickedPerkMasks: bigint[] = []

  for (const assignedBookRequirementKey of bookRequirementKeys) {
    for (const assignedScrollRequirementKeys of scrollRequirementKeySets) {
      studyCoveredPickedPerkMasks.push(
        getCoveredPickedPerkMask({
          pickedPerkRequirementKeyOptions,
          requirementKeys: new Set([
            ...(assignedBookRequirementKey === null ? [] : [assignedBookRequirementKey]),
            ...assignedScrollRequirementKeys,
          ]),
        }),
      )
    }
  }

  return {
    canCoverBuild(nativeCoveredPickedPerkMask) {
      if (nativeCoveredPickedPerkMask === allPickedPerksMask) {
        return true
      }

      if (filter === null) {
        return false
      }

      return studyCoveredPickedPerkMasks.some(
        (studyCoveredPickedPerkMask) =>
          (nativeCoveredPickedPerkMask | studyCoveredPickedPerkMask) === allPickedPerksMask,
      )
    },
    getCoveredPickedPerkCount,
    getNativeCoveredPickedPerkMask(nativeRequirementKeys) {
      return getCoveredPickedPerkMask({
        pickedPerkRequirementKeyOptions,
        requirementKeys: nativeRequirementKeys,
      })
    },
  }
}

function getRequirementKeysCoverageMask({
  getRequirementCoverageMask,
  requirementKeys,
}: {
  getRequirementCoverageMask: (requirementKey: string) => bigint
  requirementKeys: Iterable<string>
}): bigint {
  let coverageMask = 0n

  for (const requirementKey of requirementKeys) {
    coverageMask |= getRequirementCoverageMask(requirementKey)
  }

  return coverageMask
}

export function createStudyResourceMaskCoverageProfile({
  filter,
  getRequirementCoverageMask,
  pickedPerks,
  targetMask,
}: {
  filter: BackgroundStudyResourceFilter | null
  getRequirementCoverageMask: (requirementKey: string) => bigint
  pickedPerks: LegendsPerkRecord[]
  targetMask: bigint
}): StudyResourceMaskCoverageProfile {
  const pickedPerkRequirementOptions = getPickedPerkRequirementOptions(pickedPerks)
  const bookRequirementKeys = filter?.shouldAllowBook
    ? [
        null,
        ...getUniqueReachableRequirementKeys({
          isReachableRequirement: isSkillBookReachableRequirement,
          pickedPerkRequirementOptions,
        }),
      ]
    : [null]
  const scrollSlotCount = filter === null ? 0 : getScrollSlotCount(filter)
  const scrollRequirementKeySets =
    scrollSlotCount > 0
      ? getScrollRequirementKeySets(
          getUniqueReachableRequirementKeys({
            isReachableRequirement: isAncientScrollReachableRequirement,
            pickedPerkRequirementOptions,
          }),
          scrollSlotCount,
        )
      : [[]]
  const studyCoveredPickedPerkMasks: bigint[] = []

  for (const assignedBookRequirementKey of bookRequirementKeys) {
    for (const assignedScrollRequirementKeys of scrollRequirementKeySets) {
      studyCoveredPickedPerkMasks.push(
        getRequirementKeysCoverageMask({
          getRequirementCoverageMask,
          requirementKeys: [
            ...(assignedBookRequirementKey === null ? [] : [assignedBookRequirementKey]),
            ...assignedScrollRequirementKeys,
          ],
        }),
      )
    }
  }

  return {
    canCoverBuild(nativeCoveredPickedPerkMask) {
      if ((nativeCoveredPickedPerkMask & targetMask) === targetMask) {
        return true
      }

      if (filter === null) {
        return false
      }

      return studyCoveredPickedPerkMasks.some(
        (studyCoveredPickedPerkMask) =>
          ((nativeCoveredPickedPerkMask | studyCoveredPickedPerkMask) & targetMask) === targetMask,
      )
    },
    getCoveredPickedPerkCount,
  }
}

export function isBuildCoveredByNativeAndStudyResources({
  filter,
  nativeRequirementKeys,
  pickedPerks,
}: {
  filter: BackgroundStudyResourceFilter
  nativeRequirementKeys: ReadonlySet<string>
  pickedPerks: LegendsPerkRecord[]
}): boolean {
  const studyResourceCoverageProfile = createStudyResourceCoverageProfile({
    filter,
    pickedPerks,
  })

  return studyResourceCoverageProfile.canCoverBuild(
    studyResourceCoverageProfile.getNativeCoveredPickedPerkMask(nativeRequirementKeys),
  )
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
  return (
    getMinimumStudyResourceRequirementProfile({
      canUseNativeRequirements,
      filter,
      pickedPerks,
    }) !== null
  )
}

export function getMinimumStudyResourceRequirementProfile({
  canUseNativeRequirements,
  filter,
  pickedPerks,
}: {
  canUseNativeRequirements: (requirements: StudyReachabilityRequirement[]) => boolean
  filter: BackgroundStudyResourceFilter
  pickedPerks: LegendsPerkRecord[]
}): StudyResourceRequirementProfile | null {
  const pickedPerkRequirementOptions = getPickedPerkRequirementOptions(pickedPerks)

  const scrollSlotCount = getScrollSlotCount(filter)
  const nativeRequirementResultByKey = new Map<string, boolean>()
  const bookRequirementKeys = filter.shouldAllowBook
    ? [
        null,
        ...getUniqueReachableRequirementKeys({
          isReachableRequirement: isSkillBookReachableRequirement,
          pickedPerkRequirementOptions,
        }),
      ]
    : [null]
  const scrollRequirementKeySets =
    scrollSlotCount > 0
      ? getScrollRequirementKeySets(
          getUniqueReachableRequirementKeys({
            isReachableRequirement: isAncientScrollReachableRequirement,
            pickedPerkRequirementOptions,
          }),
          scrollSlotCount,
        )
      : [[]]
  const studyResourceAssignmentCandidates = getStudyResourceAssignmentCandidates({
    bookRequirementKeys,
    scrollRequirementKeySets,
  })

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

  function canUseNativeOptionGroups(nativeOptionGroups: StudyReachabilityRequirement[][]): boolean {
    const failedNativeStateKeys = new Set<string>()
    const possibleNativeOptionGroups = nativeOptionGroups
      .map((nativeOptionGroup) =>
        nativeOptionGroup.filter((requirement) =>
          canUseNativeRequirementMap(
            new Map([
              [createPerkGroupKey(requirement.categoryName, requirement.perkGroupId), requirement],
            ]),
          ),
        ),
      )
      .toSorted((leftOptions, rightOptions) => leftOptions.length - rightOptions.length)

    if (possibleNativeOptionGroups.some((nativeOptionGroup) => nativeOptionGroup.length === 0)) {
      return false
    }

    function visitNative({
      nativeOptionGroupIndex,
      nativeRequirementMap,
    }: {
      nativeOptionGroupIndex: number
      nativeRequirementMap: Map<string, StudyReachabilityRequirement>
    }): boolean {
      const stateKey = `${nativeOptionGroupIndex}|${getRequirementMapKey(nativeRequirementMap)}`

      if (failedNativeStateKeys.has(stateKey)) {
        return false
      }

      if (nativeOptionGroupIndex === possibleNativeOptionGroups.length) {
        return true
      }

      const currentNativeOptionGroup = possibleNativeOptionGroups[nativeOptionGroupIndex]

      if (
        currentNativeOptionGroup.some((requirement) =>
          nativeRequirementMap.has(
            createPerkGroupKey(requirement.categoryName, requirement.perkGroupId),
          ),
        )
      ) {
        return visitNative({
          nativeOptionGroupIndex: nativeOptionGroupIndex + 1,
          nativeRequirementMap,
        })
      }

      for (const requirement of currentNativeOptionGroup) {
        const requirementKey = createPerkGroupKey(requirement.categoryName, requirement.perkGroupId)
        const nextNativeRequirementMap = new Map(nativeRequirementMap)
        nextNativeRequirementMap.set(requirementKey, requirement)

        if (
          canUseNativeRequirementMap(nextNativeRequirementMap) &&
          visitNative({
            nativeOptionGroupIndex: nativeOptionGroupIndex + 1,
            nativeRequirementMap: nextNativeRequirementMap,
          })
        ) {
          return true
        }
      }

      failedNativeStateKeys.add(stateKey)
      return false
    }

    return visitNative({
      nativeOptionGroupIndex: 0,
      nativeRequirementMap: new Map(),
    })
  }

  function canStudyAssignmentsReachBuild({
    assignedBookRequirementKey,
    assignedScrollRequirementKeys,
  }: {
    assignedBookRequirementKey: string | null
    assignedScrollRequirementKeys: string[]
  }): boolean {
    const studyRequirementKeys = new Set([
      ...(assignedBookRequirementKey === null ? [] : [assignedBookRequirementKey]),
      ...assignedScrollRequirementKeys,
    ])
    const nativeOptionGroups = pickedPerkRequirementOptions.filter((requirementOptions) =>
      requirementOptions.every(
        (requirement) =>
          !studyRequirementKeys.has(
            createPerkGroupKey(requirement.categoryName, requirement.perkGroupId),
          ),
      ),
    )

    return canUseNativeOptionGroups(nativeOptionGroups)
  }

  /*
   * The search first enumerates the small set of item assignments that matter for the current
   * picked perks: no book or one book group, and zero to the allowed number of distinct scroll
   * groups. For each assignment, any picked perk with at least one placement covered by an item is
   * already satisfied. The remaining picked perks are solved as native background requirements,
   * choosing exactly one placement per perk and memoizing the expensive joint native check by the
   * exact chosen requirement set. This keeps alternate placements from becoming simultaneous
   * requirements and avoids branching over every picked perk's book and scroll choices.
   */
  for (const studyResourceAssignmentCandidate of studyResourceAssignmentCandidates) {
    if (canStudyAssignmentsReachBuild(studyResourceAssignmentCandidate)) {
      return createStudyResourceRequirementProfile(studyResourceAssignmentCandidate)
    }
  }

  return null
}
