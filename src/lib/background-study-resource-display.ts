import type { StudyResourceRequirementProfile } from './background-study-reachability'
import { ancientScrollIconPath } from './ancient-scroll-perk-group-display'

export type BackgroundStudyResourceBadgeKind = 'book' | 'bright' | 'scroll'

export type BackgroundStudyResourceBadge = {
  iconPath: string
  isOptionalOnly: boolean
  kind: BackgroundStudyResourceBadgeKind
  label: string
  title: string
}

export type BackgroundStudyResourceBadgeDisplay = {
  accessibleLabel: string
  badges: BackgroundStudyResourceBadge[]
}

export const backgroundStudyResourceBadgesTestId = 'background-fit-study-resource-badges'
export const backgroundStudyResourceBadgeTestId = 'background-fit-study-resource-badge'
export const skillBookIconPath = 'ui/items/misc/inventory_ledger_item.png'
export const brightTraitIconPath = 'ui/traits/trait_icon_11.png'

function getScrollBadgeTitle({
  isOptionalOnly,
  requirementScopeLabel,
  scrollIndex,
  totalScrollCount,
}: {
  isOptionalOnly: boolean
  requirementScopeLabel: string
  scrollIndex: number
  totalScrollCount: number
}): string {
  if (isOptionalOnly) {
    return scrollIndex === 0
      ? 'Optional perks can use an ancient scroll'
      : 'Optional perks can use a second ancient scroll'
  }

  return totalScrollCount === 1
    ? `${requirementScopeLabel} requires an ancient scroll`
    : `${requirementScopeLabel} requires two ancient scrolls`
}

export function getBackgroundStudyResourceBadgeDisplay({
  fullBuildStudyResourceRequirement,
  mustHaveStudyResourceRequirement,
}: {
  fullBuildStudyResourceRequirement: StudyResourceRequirementProfile | null
  mustHaveStudyResourceRequirement: StudyResourceRequirementProfile | null
}): BackgroundStudyResourceBadgeDisplay | null {
  const displayedStudyResourceRequirement =
    fullBuildStudyResourceRequirement ?? mustHaveStudyResourceRequirement

  if (displayedStudyResourceRequirement === null) {
    return null
  }

  const requirementComparisonProfile =
    fullBuildStudyResourceRequirement === null
      ? displayedStudyResourceRequirement
      : mustHaveStudyResourceRequirement
  const requirementScopeLabel =
    fullBuildStudyResourceRequirement === null ? 'Must-have build' : 'Full build'
  const badges: BackgroundStudyResourceBadge[] = []

  if (displayedStudyResourceRequirement.requiresBook) {
    const isOptionalOnly = !(requirementComparisonProfile?.requiresBook ?? false)

    badges.push({
      iconPath: skillBookIconPath,
      isOptionalOnly,
      kind: 'book',
      label: 'Skill book',
      title: isOptionalOnly
        ? 'Optional perks can use a skill book'
        : `${requirementScopeLabel} requires a skill book`,
    })
  }

  for (
    let scrollIndex = 0;
    scrollIndex < displayedStudyResourceRequirement.requiredScrollCount;
    scrollIndex += 1
  ) {
    const isOptionalOnly = scrollIndex >= (requirementComparisonProfile?.requiredScrollCount ?? 0)

    badges.push({
      iconPath: ancientScrollIconPath,
      isOptionalOnly,
      kind: 'scroll',
      label: 'Ancient scroll',
      title: getScrollBadgeTitle({
        isOptionalOnly,
        requirementScopeLabel,
        scrollIndex,
        totalScrollCount: displayedStudyResourceRequirement.requiredScrollCount,
      }),
    })
  }

  if (displayedStudyResourceRequirement.requiresBright) {
    const isOptionalOnly = !(requirementComparisonProfile?.requiresBright ?? false)

    badges.push({
      iconPath: brightTraitIconPath,
      isOptionalOnly,
      kind: 'bright',
      label: 'Bright',
      title: isOptionalOnly
        ? 'Optional perks can use a second ancient scroll if Bright is available'
        : `${requirementScopeLabel} requires Bright to read a second ancient scroll`,
    })
  }

  if (badges.length === 0) {
    return null
  }

  return {
    accessibleLabel: `${requirementScopeLabel} study resource requirements`,
    badges,
  }
}
