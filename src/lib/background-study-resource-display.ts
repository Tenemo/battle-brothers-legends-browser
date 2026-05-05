import { ancientScrollIconPath } from './ancient-scroll-perk-group-display'
import type {
  BackgroundFitStudyResourceStrategy,
  BackgroundFitStudyResourceStrategyTarget,
} from './background-fit'
import { getCategoryPriority } from './dynamic-background-categories'

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

type StudyResourceStrategyScope = 'full-build' | 'must-have'

export const backgroundStudyResourceBadgesTestId = 'background-fit-study-resource-badges'
export const backgroundStudyResourceBadgeTestId = 'background-fit-study-resource-badge'
export const skillBookIconPath = 'ui/items/misc/inventory_ledger_item.png'
export const brightTraitIconPath = 'ui/traits/trait_icon_11.png'

function compareStudyResourceStrategyTargetsForDisplay(
  leftTarget: BackgroundFitStudyResourceStrategyTarget,
  rightTarget: BackgroundFitStudyResourceStrategyTarget,
): number {
  return (
    getCategoryPriority(leftTarget.categoryName) - getCategoryPriority(rightTarget.categoryName) ||
    leftTarget.perkGroupName.localeCompare(rightTarget.perkGroupName) ||
    leftTarget.perkGroupId.localeCompare(rightTarget.perkGroupId)
  )
}

function formatStudyResourceStrategyTargetNames(
  targets: BackgroundFitStudyResourceStrategyTarget[],
): string {
  const targetNames = targets
    .toSorted(compareStudyResourceStrategyTargetsForDisplay)
    .map((target) => target.perkGroupName)

  if (targetNames.length <= 2) {
    return targetNames.join(' or ')
  }

  return `${targetNames.slice(0, -1).join(', ')}, or ${targetNames[targetNames.length - 1]}`
}

function getStrategyScopeChanceLabel(scope: StudyResourceStrategyScope): string {
  return scope === 'must-have' ? 'must-have chance' : 'full build chance'
}

function getStudyResourceStrategyBadgeTitle({
  resourceKind,
  scope,
  strategy,
}: {
  resourceKind: 'book' | 'scroll'
  scope: StudyResourceStrategyScope
  strategy: BackgroundFitStudyResourceStrategy
}): string {
  const targets = resourceKind === 'book' ? strategy.bookTargets : strategy.scrollTargets
  const resourceLabel = resourceKind === 'book' ? 'Skill book' : 'Ancient scroll'

  return `${resourceLabel} improves ${getStrategyScopeChanceLabel(scope)}: ${formatStudyResourceStrategyTargetNames(
    targets,
  )}`
}

function getDisplayedStudyResourceStrategy({
  fullBuildStudyResourceStrategy,
  mustHaveStudyResourceStrategy,
}: {
  fullBuildStudyResourceStrategy?: BackgroundFitStudyResourceStrategy
  mustHaveStudyResourceStrategy?: BackgroundFitStudyResourceStrategy
}): { scope: StudyResourceStrategyScope; strategy: BackgroundFitStudyResourceStrategy } | null {
  if (mustHaveStudyResourceStrategy) {
    return {
      scope: 'must-have',
      strategy: mustHaveStudyResourceStrategy,
    }
  }

  if (fullBuildStudyResourceStrategy) {
    return {
      scope: 'full-build',
      strategy: fullBuildStudyResourceStrategy,
    }
  }

  return null
}

function getUniqueStudyResourceStrategyTargetCount(
  targets: BackgroundFitStudyResourceStrategyTarget[],
): number {
  return new Set(targets.map((target) => `${target.categoryName}\u0000${target.perkGroupId}`)).size
}

export function getBackgroundStudyResourceBadgeDisplay({
  fullBuildStudyResourceStrategy,
  mustHaveStudyResourceStrategy,
}: {
  fullBuildStudyResourceStrategy?: BackgroundFitStudyResourceStrategy
  mustHaveStudyResourceStrategy?: BackgroundFitStudyResourceStrategy
}): BackgroundStudyResourceBadgeDisplay | null {
  const displayedStrategy = getDisplayedStudyResourceStrategy({
    fullBuildStudyResourceStrategy,
    mustHaveStudyResourceStrategy,
  })

  if (!displayedStrategy) {
    return null
  }

  const { scope, strategy } = displayedStrategy
  const badges: BackgroundStudyResourceBadge[] = []

  if (strategy.bookTargets.length > 0) {
    badges.push({
      iconPath: skillBookIconPath,
      isOptionalOnly: false,
      kind: 'book',
      label: 'Skill book',
      title: getStudyResourceStrategyBadgeTitle({
        resourceKind: 'book',
        scope,
        strategy,
      }),
    })
  }

  if (strategy.scrollTargets.length > 0) {
    const scrollTitle = getStudyResourceStrategyBadgeTitle({
      resourceKind: 'scroll',
      scope,
      strategy,
    })
    const shouldShowSecondScroll =
      strategy.shouldAllowSecondScroll &&
      getUniqueStudyResourceStrategyTargetCount(strategy.scrollTargets) > 1
    const scrollBadgeCount = shouldShowSecondScroll ? 2 : 1

    for (let scrollIndex = 0; scrollIndex < scrollBadgeCount; scrollIndex += 1) {
      badges.push({
        iconPath: ancientScrollIconPath,
        isOptionalOnly: false,
        kind: 'scroll',
        label: 'Ancient scroll',
        title: scrollTitle,
      })
    }

    if (shouldShowSecondScroll) {
      badges.push({
        iconPath: brightTraitIconPath,
        isOptionalOnly: false,
        kind: 'bright',
        label: 'Bright',
        title: `Bright enables the second ancient scroll for ${getStrategyScopeChanceLabel(
          scope,
        )}: ${formatStudyResourceStrategyTargetNames(strategy.scrollTargets)}`,
      })
    }
  }

  if (badges.length === 0) {
    return null
  }

  return {
    accessibleLabel: `Study resources improve ${getStrategyScopeChanceLabel(scope)}`,
    badges,
  }
}
