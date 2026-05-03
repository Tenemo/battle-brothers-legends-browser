import type { StudyResourceRequirementProfile } from './background-study-reachability'
import { ancientScrollIconPath } from './ancient-scroll-perk-group-display'
import type { BackgroundFitStudyResourceChanceBreakdownEntry } from './background-fit'

type BackgroundStudyResourceBadgeKind = 'book' | 'bright' | 'scroll'

type BackgroundStudyResourceBadge = {
  iconPath: string
  isOptionalOnly: boolean
  kind: BackgroundStudyResourceBadgeKind
  label: string
  title: string
}

type BackgroundStudyResourceBadgeDisplay = {
  accessibleLabel: string
  badges: BackgroundStudyResourceBadge[]
}

type StudyResourceMustHaveImpact = {
  book: boolean
  bright: boolean
  scroll: boolean
  scrollCount: 0 | 1 | 2
}

export const backgroundStudyResourceBadgesTestId = 'background-fit-study-resource-badges'
export const backgroundStudyResourceBadgeTestId = 'background-fit-study-resource-badge'
export const skillBookIconPath = 'ui/items/misc/inventory_ledger_item.png'
export const brightTraitIconPath = 'ui/traits/trait_icon_11.png'

function getScrollBadgeTitle({
  isOptionalOnly,
  hasMustHaveImpact,
  requirementScopeLabel,
  scrollIndex,
  totalScrollCount,
}: {
  isOptionalOnly: boolean
  hasMustHaveImpact: boolean
  requirementScopeLabel: string
  scrollIndex: number
  totalScrollCount: number
}): string {
  if (hasMustHaveImpact) {
    return totalScrollCount === 1
      ? 'Ancient scroll can improve must-have build chance'
      : 'Ancient scrolls can improve must-have build chance'
  }

  if (isOptionalOnly) {
    return scrollIndex === 0
      ? 'Optional perks can use an ancient scroll'
      : 'Optional perks can use a second ancient scroll'
  }

  return totalScrollCount === 1
    ? `${requirementScopeLabel} requires an ancient scroll`
    : `${requirementScopeLabel} requires two ancient scrolls`
}

function hasMeaningfulProbabilityGain(leftProbability: number, rightProbability: number): boolean {
  return leftProbability - rightProbability > 1e-12
}

function getStudyResourceChanceBreakdownProbability(
  entries: BackgroundFitStudyResourceChanceBreakdownEntry[],
  {
    shouldAllowBook,
    shouldAllowScroll,
  }: {
    shouldAllowBook: boolean
    shouldAllowScroll: boolean
  },
): number {
  return (
    entries.find(
      (entry) =>
        entry.shouldAllowBook === shouldAllowBook && entry.shouldAllowScroll === shouldAllowScroll,
    )?.probability ?? 0
  )
}

function getStudyResourceMustHaveImpact(
  entries?: BackgroundFitStudyResourceChanceBreakdownEntry[],
): StudyResourceMustHaveImpact {
  if (!entries || entries.length === 0) {
    return {
      book: false,
      bright: false,
      scroll: false,
      scrollCount: 0,
    }
  }

  let doesBookImproveMustHaveChance = false
  let doesScrollImproveMustHaveChance = false
  let scrollCount: StudyResourceMustHaveImpact['scrollCount'] = 0

  for (const entry of entries) {
    if (entry.shouldAllowBook) {
      const chanceWithoutBook = getStudyResourceChanceBreakdownProbability(entries, {
        shouldAllowBook: false,
        shouldAllowScroll: entry.shouldAllowScroll,
      })

      if (hasMeaningfulProbabilityGain(entry.probability, chanceWithoutBook)) {
        doesBookImproveMustHaveChance = true
      }
    }

    if (entry.shouldAllowScroll) {
      const chanceWithoutScroll = getStudyResourceChanceBreakdownProbability(entries, {
        shouldAllowBook: entry.shouldAllowBook,
        shouldAllowScroll: false,
      })

      if (hasMeaningfulProbabilityGain(entry.probability, chanceWithoutScroll)) {
        doesScrollImproveMustHaveChance = true
        scrollCount = Math.max(
          scrollCount,
          entry.shouldAllowSecondScroll ? 2 : 1,
        ) as StudyResourceMustHaveImpact['scrollCount']
      }
    }
  }

  return {
    book: doesBookImproveMustHaveChance,
    bright: doesScrollImproveMustHaveChance && scrollCount === 2,
    scroll: doesScrollImproveMustHaveChance,
    scrollCount,
  }
}

export function getBackgroundStudyResourceBadgeDisplay({
  fullBuildStudyResourceRequirement,
  mustHaveStudyResourceChanceBreakdown,
  mustHaveStudyResourceRequirement,
}: {
  fullBuildStudyResourceRequirement: StudyResourceRequirementProfile | null
  mustHaveStudyResourceChanceBreakdown?: BackgroundFitStudyResourceChanceBreakdownEntry[]
  mustHaveStudyResourceRequirement: StudyResourceRequirementProfile | null
}): BackgroundStudyResourceBadgeDisplay | null {
  const displayedStudyResourceRequirement =
    fullBuildStudyResourceRequirement ?? mustHaveStudyResourceRequirement
  const mustHaveImpact = getStudyResourceMustHaveImpact(mustHaveStudyResourceChanceBreakdown)

  if (
    displayedStudyResourceRequirement === null &&
    !mustHaveImpact.book &&
    !mustHaveImpact.scroll &&
    !mustHaveImpact.bright
  ) {
    return null
  }

  const requirementComparisonProfile =
    fullBuildStudyResourceRequirement === null
      ? displayedStudyResourceRequirement
      : mustHaveStudyResourceRequirement
  const requirementScopeLabel =
    fullBuildStudyResourceRequirement === null ? 'Must-have build' : 'Full build'
  const displayedRequiredScrollCount = displayedStudyResourceRequirement?.requiredScrollCount ?? 0
  const requiredScrollCount = Math.max(
    displayedRequiredScrollCount,
    mustHaveImpact.scrollCount,
  ) as StudyResourceRequirementProfile['requiredScrollCount']
  const badges: BackgroundStudyResourceBadge[] = []

  if ((displayedStudyResourceRequirement?.requiresBook ?? false) || mustHaveImpact.book) {
    const isOptionalOnly =
      !mustHaveImpact.book && !(requirementComparisonProfile?.requiresBook ?? false)

    badges.push({
      iconPath: skillBookIconPath,
      isOptionalOnly,
      kind: 'book',
      label: 'Skill book',
      title: mustHaveImpact.book
        ? 'Skill book can improve must-have build chance'
        : isOptionalOnly
          ? 'Optional perks can use a skill book'
          : `${requirementScopeLabel} requires a skill book`,
    })
  }

  for (let scrollIndex = 0; scrollIndex < requiredScrollCount; scrollIndex += 1) {
    const isOptionalOnly =
      !mustHaveImpact.scroll &&
      scrollIndex >= (requirementComparisonProfile?.requiredScrollCount ?? 0)

    badges.push({
      iconPath: ancientScrollIconPath,
      isOptionalOnly,
      kind: 'scroll',
      label: 'Ancient scroll',
      title: getScrollBadgeTitle({
        hasMustHaveImpact: mustHaveImpact.scroll,
        isOptionalOnly,
        requirementScopeLabel,
        scrollIndex,
        totalScrollCount: requiredScrollCount,
      }),
    })
  }

  if ((displayedStudyResourceRequirement?.requiresBright ?? false) || mustHaveImpact.bright) {
    const isOptionalOnly =
      !mustHaveImpact.bright && !(requirementComparisonProfile?.requiresBright ?? false)

    badges.push({
      iconPath: brightTraitIconPath,
      isOptionalOnly,
      kind: 'bright',
      label: 'Bright',
      title: mustHaveImpact.bright
        ? 'Bright can improve must-have build chance by enabling a second ancient scroll'
        : isOptionalOnly
          ? 'Optional perks can use a second ancient scroll if Bright is available'
          : `${requirementScopeLabel} requires Bright to read a second ancient scroll`,
    })
  }

  if (badges.length === 0) {
    return null
  }

  return {
    accessibleLabel:
      mustHaveImpact.book || mustHaveImpact.scroll || mustHaveImpact.bright
        ? 'Study resources can improve must-have build chance'
        : `${requirementScopeLabel} study resource requirements`,
    badges,
  }
}
