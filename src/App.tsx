import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import '@fontsource/cinzel/700.css'
import '@fontsource/source-sans-3/400.css'
import '@fontsource/source-sans-3/600.css'
import '@fontsource/source-sans-3/700.css'
import './App.css'
import legendsPerksDatasetJson from './data/legends-perks.json'
import { getGameIconUrl } from './lib/game-icon-url'
import {
  createBackgroundFitEngine,
  type BackgroundFitView,
  type BackgroundFitMatch,
  type BuildTargetTree,
  type RankedBackgroundFit,
} from './lib/background-fit'
import {
  getBuildPlannerGroups,
  type BuildPlannerGroupedPerkGroup,
  type BuildPlannerPerkGroupRequirementOption,
} from './lib/build-planner'
import {
  buildPerkBrowserBuildUrlSearch,
  buildPerkBrowserUrlSearch,
  readPerkBrowserUrlStateFromLocation,
  type PerkBrowserUrlTreeOption,
} from './lib/perk-browser-url-state'
import {
  allTiersFilterValue,
  buildTierOptions,
  filterAndSortPerks,
  getPerkPreviewParagraphs,
  getTierLabel,
} from './lib/perk-search'
import type {
  LegendsFavoredEnemyTarget,
  LegendsPerkBackgroundSource,
  LegendsPerkPlacement,
  LegendsPerkRecord,
  LegendsPerkScenarioSource,
  LegendsPerksDataset,
} from './types/legends-perks'

const legendsPerksDataset = legendsPerksDatasetJson as LegendsPerksDataset
const allPerks = legendsPerksDataset.perks
const allPerksById = new Map(allPerks.map((perk) => [perk.id, perk]))
const backgroundFitEngine = createBackgroundFitEngine(legendsPerksDataset)
const repositoryUrl = 'https://github.com/Tenemo/battle-brothers-legends-browser'
const categoryOrder = ['Weapon', 'Defense', 'Traits', 'Enemy', 'Class', 'Profession', 'Magic', 'Other']
const buildPlannerGuidance =
  'Use the star in the detail panel or search results to collect perk picks, then review the shared perk groups and the remaining individual-perk groups below.'

type CategoryTreeOption = PerkBrowserUrlTreeOption & {
  perkCount: number
}

type GroupedBackgroundSource = {
  backgroundNames: string[]
  categoryName: string
  chance: number | null
  minimumTrees: number | null
  treeId: string
  treeName: string
}

type HoveredBuildPerkTooltip = {
  anchorRectangle: {
    bottom: number
    left: number
    right: number
    top: number
    width: number
  }
  perkId: string
}

type PerkGroupHoverTarget = {
  categoryName: string
  treeId: string
}

type TooltipAnchorRectangle = {
  bottom: number
  left: number
  right: number
  top: number
  width: number
}

type HoveredBackgroundFitSummaryTooltip = {
  anchorRectangle: TooltipAnchorRectangle
  descriptionParagraphs: string[]
  title: string
}

function getGroupCounts(perks: LegendsPerkRecord[]): Map<string, number> {
  const counts = new Map<string, number>()

  for (const perk of perks) {
    for (const groupName of perk.groupNames) {
      counts.set(groupName, (counts.get(groupName) ?? 0) + 1)
    }
  }

  return counts
}

function getPickedPerkCountsByGroup(pickedPerks: LegendsPerkRecord[]): Map<string, number> {
  const countsByGroup = new Map<string, number>()

  for (const pickedPerk of pickedPerks) {
    for (const groupName of new Set(pickedPerk.groupNames)) {
      countsByGroup.set(groupName, (countsByGroup.get(groupName) ?? 0) + 1)
    }
  }

  return countsByGroup
}

function getPickedPerkCountsByTree(pickedPerks: LegendsPerkRecord[]): Map<string, number> {
  const countsByTree = new Map<string, number>()

  for (const pickedPerk of pickedPerks) {
    for (const treeId of new Set(pickedPerk.placements.map((placement) => placement.treeId))) {
      countsByTree.set(treeId, (countsByTree.get(treeId) ?? 0) + 1)
    }
  }

  return countsByTree
}

function groupBackgroundSources(
  backgroundSources: LegendsPerkBackgroundSource[],
): GroupedBackgroundSource[] {
  const groupedBackgroundSources = new Map<string, GroupedBackgroundSource>()

  for (const backgroundSource of backgroundSources) {
    const key = [
      backgroundSource.categoryName,
      backgroundSource.treeId,
      backgroundSource.treeName,
      backgroundSource.minimumTrees ?? 'none',
      backgroundSource.chance ?? 'none',
    ].join('::')

    if (!groupedBackgroundSources.has(key)) {
      groupedBackgroundSources.set(key, {
        backgroundNames: [],
        categoryName: backgroundSource.categoryName,
        chance: backgroundSource.chance,
        minimumTrees: backgroundSource.minimumTrees,
        treeId: backgroundSource.treeId,
        treeName: backgroundSource.treeName,
      })
    }

    groupedBackgroundSources.get(key)?.backgroundNames.push(backgroundSource.backgroundName)
  }

  return [...groupedBackgroundSources.values()]
}

function getCategoryTreeOptions(perks: LegendsPerkRecord[]): Map<string, CategoryTreeOption[]> {
  const optionsByCategory = new Map<
    string,
    Map<string, { perkIds: Set<string>; treeId: string; treeName: string }>
  >()

  for (const perk of perks) {
    for (const placement of perk.placements) {
      if (!optionsByCategory.has(placement.categoryName)) {
        optionsByCategory.set(placement.categoryName, new Map())
      }

      const categoryOptions = optionsByCategory.get(placement.categoryName)

      if (!categoryOptions?.has(placement.treeId)) {
        categoryOptions?.set(placement.treeId, {
          perkIds: new Set(),
          treeId: placement.treeId,
          treeName: placement.treeName,
        })
      }

      categoryOptions?.get(placement.treeId)?.perkIds.add(perk.id)
    }
  }

  return new Map(
    [...optionsByCategory.entries()].map(([categoryName, treeOptions]) => [
      categoryName,
      [...treeOptions.values()]
        .map((treeOption) => ({
          perkCount: treeOption.perkIds.size,
          treeId: treeOption.treeId,
          treeName: treeOption.treeName,
        }))
        .toSorted((leftTreeOption, rightTreeOption) =>
          leftTreeOption.treeName.localeCompare(rightTreeOption.treeName),
        ),
    ]),
  )
}

function compareGroupNames(leftGroupName: string, rightGroupName: string): number {
  const leftPriority = categoryOrder.indexOf(leftGroupName)
  const rightPriority = categoryOrder.indexOf(rightGroupName)
  const normalizedLeftPriority = leftPriority === -1 ? Number.POSITIVE_INFINITY : leftPriority
  const normalizedRightPriority = rightPriority === -1 ? Number.POSITIVE_INFINITY : rightPriority

  return normalizedLeftPriority - normalizedRightPriority || leftGroupName.localeCompare(rightGroupName)
}

function normalizeSearchPhrase(value: string): string {
  return value.trim().toLocaleLowerCase()
}

function getSearchMatchPriority(text: string, normalizedSearchPhrase: string): number {
  if (normalizedSearchPhrase.length === 0) {
    return 2
  }

  const normalizedText = text.toLocaleLowerCase()

  if (normalizedText === normalizedSearchPhrase) {
    return 0
  }

  if (normalizedText.includes(normalizedSearchPhrase)) {
    return 1
  }

  return 2
}

function getVisiblePerkCountsByGroup(perks: LegendsPerkRecord[]): Map<string, number> {
  const countsByGroup = new Map<string, number>()

  for (const perk of perks) {
    for (const groupName of new Set(perk.groupNames)) {
      countsByGroup.set(groupName, (countsByGroup.get(groupName) ?? 0) + 1)
    }
  }

  return countsByGroup
}

function getVisiblePerkCountsByCategoryTree(perks: LegendsPerkRecord[]): Map<string, number> {
  const countsByCategoryTree = new Map<string, number>()

  for (const perk of perks) {
    for (const placement of perk.placements) {
      const categoryTreeKey = `${placement.categoryName}::${placement.treeId}`
      countsByCategoryTree.set(categoryTreeKey, (countsByCategoryTree.get(categoryTreeKey) ?? 0) + 1)
    }
  }

  return countsByCategoryTree
}

function compareDisplayedGroups({
  leftGroupName,
  normalizedSearchPhrase,
  rightGroupName,
  treeOptionsByGroup,
  visiblePerkCountsByGroup,
}: {
  leftGroupName: string
  normalizedSearchPhrase: string
  rightGroupName: string
  treeOptionsByGroup: Map<string, CategoryTreeOption[]>
  visiblePerkCountsByGroup: Map<string, number>
}): number {
  if (normalizedSearchPhrase.length === 0) {
    return compareGroupNames(leftGroupName, rightGroupName)
  }

  const leftTreeOptions = treeOptionsByGroup.get(leftGroupName) ?? []
  const rightTreeOptions = treeOptionsByGroup.get(rightGroupName) ?? []
  const leftGroupMatchPriority = getSearchMatchPriority(leftGroupName, normalizedSearchPhrase)
  const rightGroupMatchPriority = getSearchMatchPriority(rightGroupName, normalizedSearchPhrase)
  const leftTreeMatchPriority = Math.min(
    ...leftTreeOptions.map((treeOption) =>
      getSearchMatchPriority(treeOption.treeName, normalizedSearchPhrase),
    ),
    2,
  )
  const rightTreeMatchPriority = Math.min(
    ...rightTreeOptions.map((treeOption) =>
      getSearchMatchPriority(treeOption.treeName, normalizedSearchPhrase),
    ),
    2,
  )
  const leftVisiblePerkCount = visiblePerkCountsByGroup.get(leftGroupName) ?? 0
  const rightVisiblePerkCount = visiblePerkCountsByGroup.get(rightGroupName) ?? 0
  const leftHasVisiblePerksPriority = leftVisiblePerkCount > 0 ? 0 : 1
  const rightHasVisiblePerksPriority = rightVisiblePerkCount > 0 ? 0 : 1

  return (
    leftGroupMatchPriority - rightGroupMatchPriority ||
    leftTreeMatchPriority - rightTreeMatchPriority ||
    leftHasVisiblePerksPriority - rightHasVisiblePerksPriority ||
    rightVisiblePerkCount - leftVisiblePerkCount ||
    compareGroupNames(leftGroupName, rightGroupName)
  )
}

function compareDisplayedTreeOptions({
  categoryName,
  leftTreeOption,
  normalizedSearchPhrase,
  rightTreeOption,
  visiblePerkCountsByCategoryTree,
}: {
  categoryName: string
  leftTreeOption: CategoryTreeOption
  normalizedSearchPhrase: string
  rightTreeOption: CategoryTreeOption
  visiblePerkCountsByCategoryTree: Map<string, number>
}): number {
  if (normalizedSearchPhrase.length === 0) {
    return leftTreeOption.treeName.localeCompare(rightTreeOption.treeName)
  }

  const leftMatchPriority = getSearchMatchPriority(leftTreeOption.treeName, normalizedSearchPhrase)
  const rightMatchPriority = getSearchMatchPriority(rightTreeOption.treeName, normalizedSearchPhrase)
  const leftVisiblePerkCount =
    visiblePerkCountsByCategoryTree.get(`${categoryName}::${leftTreeOption.treeId}`) ?? 0
  const rightVisiblePerkCount =
    visiblePerkCountsByCategoryTree.get(`${categoryName}::${rightTreeOption.treeId}`) ?? 0
  const leftHasVisiblePerksPriority = leftVisiblePerkCount > 0 ? 0 : 1
  const rightHasVisiblePerksPriority = rightVisiblePerkCount > 0 ? 0 : 1

  return (
    leftMatchPriority - rightMatchPriority ||
    leftHasVisiblePerksPriority - rightHasVisiblePerksPriority ||
    rightVisiblePerkCount - leftVisiblePerkCount ||
    leftTreeOption.treeName.localeCompare(rightTreeOption.treeName)
  )
}

function renderHighlightedText(
  text: string,
  query: string,
  keyPrefix: string,
): ReactNode {
  const trimmedQuery = query.trim()
  const normalizedSearchPhrase = normalizeSearchPhrase(trimmedQuery)

  if (trimmedQuery.length === 0 || normalizedSearchPhrase.length === 0) {
    return text
  }

  const normalizedText = text.toLocaleLowerCase()
  const highlightedNodes: ReactNode[] = []
  let currentIndex = 0
  let matchIndex = normalizedText.indexOf(normalizedSearchPhrase)

  if (matchIndex === -1) {
    return text
  }

  while (matchIndex !== -1) {
    if (matchIndex > currentIndex) {
      highlightedNodes.push(text.slice(currentIndex, matchIndex))
    }

    const matchEndIndex = matchIndex + trimmedQuery.length
    highlightedNodes.push(
      <mark className="search-highlight" key={`${keyPrefix}-${matchIndex}`}>
        {text.slice(matchIndex, matchEndIndex)}
      </mark>,
    )
    currentIndex = matchEndIndex
    matchIndex = normalizedText.indexOf(normalizedSearchPhrase, currentIndex)
  }

  if (currentIndex < text.length) {
    highlightedNodes.push(text.slice(currentIndex))
  }

  return highlightedNodes
}

function getPerkContextLabel(perk: LegendsPerkRecord): string {
  const primaryPlacement = perk.placements[0]

  if (!primaryPlacement) {
    return `${perk.primaryGroupName} / No perk group placement`
  }

  const additionalPlacementsCount = Math.max(0, perk.placements.length - 1)
  const tierLabel = getTierLabel(primaryPlacement.tier)
  const placementLabel =
    additionalPlacementsCount > 0
      ? `${tierLabel} + ${additionalPlacementsCount} more`
      : tierLabel

  return `${perk.primaryGroupName} / ${primaryPlacement.treeName} / ${placementLabel}`
}

function getPerkDisplayIconPath(perk: LegendsPerkRecord): string | null {
  return perk.iconPath ?? perk.placements[0]?.treeIconPath ?? null
}

function formatChanceLabel(chance: number | null): string {
  if (chance === null) {
    return 'No chance override'
  }

  return `${Math.round(chance * 100)}% chance`
}

function formatMinimumTreesLabel(minimumTrees: number | null): string {
  if (minimumTrees === null) {
    return 'No minimum override'
  }

  return `Minimum ${minimumTrees}`
}

function formatScenarioGrantLabel(scenarioSource: LegendsPerkScenarioSource): string {
  if (scenarioSource.grantType === 'direct') {
    return 'Direct grant'
  }

  return `Random pool: ${scenarioSource.candidatePerkNames.join(', ')}`
}

function formatPickedPerkCountLabel(perkCount: number): string {
  return `${perkCount} perk${perkCount === 1 ? '' : 's'}`
}

function formatBackgroundFitProbabilityLabel(probability: number): string {
  const percentage = Math.round(probability * 1000) / 10

  return `${Number.isInteger(percentage) ? percentage.toFixed(0) : percentage.toFixed(1)}%`
}

function formatBackgroundFitScoreLabel(score: number): string {
  const roundedScore = Math.round(score * 10) / 10

  return Number.isInteger(roundedScore) ? roundedScore.toFixed(0) : roundedScore.toFixed(1)
}

function formatBackgroundDisambiguatorLabel(disambiguator: string): string {
  const sourceLabel = disambiguator.replace(/^background\./, '')
  const companionMatch = /^companion_(1h|2h|ranged)$/.exec(sourceLabel)
  const originCompanionMatch = /^legend_companion_(melee|ranged)$/.exec(sourceLabel)

  if (companionMatch) {
    return companionMatch[1] === '1h'
      ? 'starting shield'
      : companionMatch[1] === '2h'
        ? 'starting two-handed'
        : 'starting ranged'
  }

  if (originCompanionMatch) {
    return originCompanionMatch[1] === 'melee' ? 'origin melee' : 'origin ranged'
  }

  if (/^legend_.+_commander(?:_op)?$/.test(sourceLabel) || /^.+_legend_.+_commander$/.test(sourceLabel)) {
    return 'origin commander'
  }

  return sourceLabel.replace(/^legend_legion_/, 'legion_').replace(/^legend_/, '').replaceAll('_', ' ')
}

function normalizeBackgroundLabelForComparison(label: string): string {
  return label.trim().toLocaleLowerCase()
}

function getVisibleBackgroundDisambiguatorLabel(backgroundFit: RankedBackgroundFit): string | null {
  if (backgroundFit.disambiguator === null) {
    return null
  }

  const disambiguatorLabel = formatBackgroundDisambiguatorLabel(backgroundFit.disambiguator)

  return normalizeBackgroundLabelForComparison(disambiguatorLabel) ===
    normalizeBackgroundLabelForComparison(backgroundFit.backgroundName)
    ? null
    : disambiguatorLabel
}

function getBackgroundFitKey(backgroundFit: RankedBackgroundFit): string {
  return `${backgroundFit.backgroundId}::${backgroundFit.sourceFilePath}`
}

function getBackgroundFitSearchText(backgroundFit: RankedBackgroundFit): string {
  const sourceFileName = backgroundFit.sourceFilePath.split('/').at(-1) ?? backgroundFit.sourceFilePath
  const searchParts = [
    backgroundFit.backgroundName,
    backgroundFit.disambiguator,
    backgroundFit.disambiguator === null
      ? null
      : formatBackgroundDisambiguatorLabel(backgroundFit.disambiguator),
    backgroundFit.backgroundId,
    sourceFileName,
    backgroundFit.sourceFilePath,
  ]

  return searchParts
    .filter((searchPart): searchPart is string => typeof searchPart === 'string' && searchPart.length > 0)
    .join(' ')
    .toLocaleLowerCase()
}

function getCoveredPickedPerkNames(matches: BackgroundFitMatch[]): string[] {
  return [...new Set(matches.flatMap((match) => match.pickedPerkNames))]
}

function formatBackgroundFitPickablePerksLabel(
  coveredPickedPerkCount: number,
  pickedPerkCount: number,
): string {
  return `Up to ${coveredPickedPerkCount}/${pickedPerkCount} perks pickable`
}

function formatBackgroundFitGuaranteedPerksLabel(
  guaranteedCoveredPickedPerkCount: number,
  pickedPerkCount: number,
): string {
  return `Guaranteed ${guaranteedCoveredPickedPerkCount}/${pickedPerkCount} perks pickable`
}

function formatBackgroundFitMatchedGroupsLabel(
  matchedGroupCount: number,
  supportedBuildTargetTreeCount: number,
): string {
  return `${matchedGroupCount}/${supportedBuildTargetTreeCount} matched group${
    supportedBuildTargetTreeCount === 1 ? '' : 's'
  }`
}

function formatBackgroundFitMaximumTotalGroupsLabel(maximumTotalGroupCount: number): string {
  return `Maximum ${maximumTotalGroupCount} total groups`
}

function getPerkRowClassName({
  isHighlighted,
  isPicked,
  isSelected,
}: {
  isHighlighted: boolean
  isPicked: boolean
  isSelected: boolean
}): string {
  const classNames = ['perk-row']

  if (isPicked) {
    classNames.push('is-picked')
  }

  if (isSelected) {
    classNames.push('is-selected')
  }

  if (isHighlighted) {
    classNames.push('is-highlighted')
  }

  return classNames.join(' ')
}

function getBackgroundFitPickablePerksTooltipCopy(
  coveredPickedPerkCount: number,
  pickedPerkCount: number,
): string[] {
  return [
    `Best-case picked-perk coverage for this background: up to ${coveredPickedPerkCount} of your ${pickedPerkCount} picked perks can be covered if every relevant non-guaranteed perk group roll lands.`,
    'This counts picked perks, not perk groups, so multiple picked perks can be covered by the same matched group.',
  ]
}

function getBackgroundFitGuaranteedPerksTooltipCopy(
  guaranteedCoveredPickedPerkCount: number,
  pickedPerkCount: number,
): string[] {
  return [
    `Guaranteed picked-perk coverage for this background: ${guaranteedCoveredPickedPerkCount} of your ${pickedPerkCount} picked perks are covered before any optional rolls.`,
    'Only always-present perk group matches count here. Optional Enemy, Class, and Profession additions do not.',
  ]
}

function getBackgroundFitMatchedGroupsTooltipCopy(
  matchedGroupCount: number,
  supportedBuildTargetTreeCount: number,
): string[] {
  return [
    `Build perk group overlap for this build: this background matches ${matchedGroupCount} of the ${supportedBuildTargetTreeCount} supported build groups.`,
    'A matched group means the background can roll that perk group, whether the match is guaranteed or probabilistic.',
  ]
}

function getBackgroundFitMaximumTotalGroupsTooltipCopy(maximumTotalGroupCount: number): string[] {
  return [
    `Overall hard cap for this background across all dynamic perk groups: it can end up with at most ${maximumTotalGroupCount} total groups.`,
    'This is not limited to your build. It includes every dynamic group the background can gain after all fills and optional rolls.',
  ]
}

function getPlannerGroupCategoryLabel(
  perkGroupOptions: BuildPlannerPerkGroupRequirementOption[],
): string {
  return [...new Set(perkGroupOptions.map((perkGroupOption) => perkGroupOption.categoryName))].join(
    ' / ',
  )
}

function getPlannerGroupLabel(
  perkGroupOptions: BuildPlannerPerkGroupRequirementOption[],
): string {
  return [...new Set(perkGroupOptions.map((perkGroupOption) => perkGroupOption.treeLabel))].join(
    ' / ',
  )
}

function getPerkGroupHoverKey({ categoryName, treeId }: PerkGroupHoverTarget): string {
  return `${categoryName}::${treeId}`
}

function renderBackgroundFitTargetTree(buildTargetTree: BuildTargetTree, keyPrefix: string) {
  return (
    <li
      className="background-fit-target"
      key={`${keyPrefix}-${buildTargetTree.categoryName}-${buildTargetTree.treeId}`}
    >
      <div>
        <strong>{buildTargetTree.treeName}</strong>
        <p className="detail-support">
          {buildTargetTree.categoryName} / {buildTargetTree.pickedPerkNames.join(', ')}
        </p>
      </div>
      <span className="detail-badge">{formatPickedPerkCountLabel(buildTargetTree.pickedPerkCount)}</span>
    </li>
  )
}

function renderBackgroundFitMatch({
  hoveredPerkGroupKey,
  match,
  onClosePerkGroupHover,
  onInspectPerkGroup,
  onOpenPerkGroupHover,
}: {
  hoveredPerkGroupKey: string | null
  match: BackgroundFitMatch
  onClosePerkGroupHover: (perkGroupKey: string) => void
  onInspectPerkGroup: (categoryName: string, treeId: string) => void
  onOpenPerkGroupHover: (categoryName: string, treeId: string) => void
}) {
  const perkGroupKey = getPerkGroupHoverKey(match)
  const className =
    hoveredPerkGroupKey === perkGroupKey
      ? 'background-fit-match is-highlighted'
      : 'background-fit-match'

  return (
    <li key={`${match.categoryName}-${match.treeId}`}>
      <button
        aria-label={`Select perk group ${match.treeName}`}
        className={className}
        onBlur={() => onClosePerkGroupHover(perkGroupKey)}
        onClick={() => onInspectPerkGroup(match.categoryName, match.treeId)}
        onFocus={() => onOpenPerkGroupHover(match.categoryName, match.treeId)}
        onMouseEnter={() => onOpenPerkGroupHover(match.categoryName, match.treeId)}
        onMouseLeave={() => onClosePerkGroupHover(perkGroupKey)}
        type="button"
      >
        <div>
          <strong>{match.treeName}</strong>
          <p className="detail-support">
            {match.categoryName} / {formatPickedPerkCountLabel(match.pickedPerkCount)} /{' '}
            {match.pickedPerkNames.join(', ')}
          </p>
        </div>
        <span className="detail-badge">
          {match.isGuaranteed ? 'Guaranteed' : formatBackgroundFitProbabilityLabel(match.probability)}
        </span>
      </button>
    </li>
  )
}

function renderBackgroundFitSummaryBadge({
  label,
  onCloseTooltip,
  onOpenTooltip,
  tooltipCopy,
  tooltipTitle,
}: {
  label: string
  onCloseTooltip: () => void
  onOpenTooltip: (
    title: string,
    descriptionParagraphs: string[],
    currentTarget: HTMLSpanElement,
  ) => void
  tooltipCopy: string[]
  tooltipTitle: string
}) {
  return (
    <span
      aria-label={`${label}. ${tooltipCopy.join(' ')}`}
      className="detail-badge background-fit-summary-badge"
      onMouseEnter={(event) => onOpenTooltip(tooltipTitle, tooltipCopy, event.currentTarget)}
      onMouseLeave={onCloseTooltip}
    >
      {label}
    </span>
  )
}

function renderBackgroundFitCard({
  backgroundFit,
  expandedBackgroundFitKey,
  hoveredPerkGroupKey,
  onClearPerkGroupHover,
  onCloseSummaryTooltip,
  onClosePerkGroupHover,
  onInspectPerkGroup,
  onOpenPerkGroupHover,
  onOpenSummaryTooltip,
  onToggle,
  pickedPerkCount,
  query,
  rank,
  supportedBuildTargetTreeCount,
}: {
  backgroundFit: RankedBackgroundFit
  expandedBackgroundFitKey: string | null
  hoveredPerkGroupKey: string | null
  onClearPerkGroupHover: () => void
  onCloseSummaryTooltip: () => void
  onClosePerkGroupHover: (perkGroupKey: string) => void
  onInspectPerkGroup: (categoryName: string, treeId: string) => void
  onOpenPerkGroupHover: (categoryName: string, treeId: string) => void
  onOpenSummaryTooltip: (
    title: string,
    descriptionParagraphs: string[],
    currentTarget: HTMLSpanElement,
  ) => void
  onToggle: (backgroundFitKey: string) => void
  pickedPerkCount: number
  query: string
  rank: number
  supportedBuildTargetTreeCount: number
}) {
  const backgroundFitKey = getBackgroundFitKey(backgroundFit)
  const disambiguatorLabel = getVisibleBackgroundDisambiguatorLabel(backgroundFit)
  const guaranteedMatches = backgroundFit.matches.filter((match) => match.isGuaranteed)
  const probabilisticMatches = backgroundFit.matches.filter((match) => !match.isGuaranteed)
  const coveredPickedPerkCount = getCoveredPickedPerkNames(backgroundFit.matches).length
  const guaranteedCoveredPickedPerkCount = getCoveredPickedPerkNames(guaranteedMatches).length
  const isExpanded = expandedBackgroundFitKey === backgroundFitKey
  const accordionButtonId = `background-fit-card-button-${rank}`
  const accordionPanelId = `background-fit-card-panel-${rank}`

  return (
      <article
        className={
          backgroundFit.matches.length === 0
            ? isExpanded
              ? 'background-fit-card is-empty is-expanded'
              : 'background-fit-card is-empty'
            : isExpanded
              ? 'background-fit-card is-expanded'
              : 'background-fit-card'
        }
      >
      <button
        aria-controls={accordionPanelId}
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} background ${backgroundFit.backgroundName}${disambiguatorLabel ? ` (${disambiguatorLabel})` : ''}`}
        className="background-fit-accordion-trigger"
        id={accordionButtonId}
        onClick={() => {
          onClearPerkGroupHover()
          onToggle(backgroundFitKey)
        }}
        type="button"
      >
        <div className="background-fit-card-header">
          <div className="background-fit-card-header-main">
            <div className="background-fit-card-heading">
              <span className="background-fit-rank">{rank + 1}</span>
              <div className="background-fit-card-title-row">
                <h3>{renderHighlightedText(backgroundFit.backgroundName, query, `${backgroundFitKey}-name`)}</h3>
                {disambiguatorLabel ? (
                  <span className="background-fit-disambiguator">
                    {renderHighlightedText(disambiguatorLabel, query, `${backgroundFitKey}-disambiguator`)}
                  </span>
                ) : null}
              </div>
            </div>

            <span aria-hidden="true" className="background-fit-accordion-chevron-frame">
              <BackgroundFitAccordionChevron isExpanded={isExpanded} />
            </span>
          </div>

          <div className="background-fit-accordion-summary">
            <div className="background-fit-accordion-summary-row">
              {renderBackgroundFitSummaryBadge({
                label: formatBackgroundFitPickablePerksLabel(
                  coveredPickedPerkCount,
                  pickedPerkCount,
                ),
                onCloseTooltip: onCloseSummaryTooltip,
                onOpenTooltip: onOpenSummaryTooltip,
                tooltipCopy: getBackgroundFitPickablePerksTooltipCopy(
                  coveredPickedPerkCount,
                  pickedPerkCount,
                ),
                tooltipTitle: 'Up to perks pickable',
              })}
              {renderBackgroundFitSummaryBadge({
                label: formatBackgroundFitGuaranteedPerksLabel(
                  guaranteedCoveredPickedPerkCount,
                  pickedPerkCount,
                ),
                onCloseTooltip: onCloseSummaryTooltip,
                onOpenTooltip: onOpenSummaryTooltip,
                tooltipCopy: getBackgroundFitGuaranteedPerksTooltipCopy(
                  guaranteedCoveredPickedPerkCount,
                  pickedPerkCount,
                ),
                tooltipTitle: 'Guaranteed perks pickable',
              })}
            </div>
            <div className="background-fit-accordion-summary-row">
              {renderBackgroundFitSummaryBadge({
                label: formatBackgroundFitMatchedGroupsLabel(
                  backgroundFit.matches.length,
                  supportedBuildTargetTreeCount,
                ),
                onCloseTooltip: onCloseSummaryTooltip,
                onOpenTooltip: onOpenSummaryTooltip,
                tooltipCopy: getBackgroundFitMatchedGroupsTooltipCopy(
                  backgroundFit.matches.length,
                  supportedBuildTargetTreeCount,
                ),
                tooltipTitle: 'Matched groups',
              })}
              {renderBackgroundFitSummaryBadge({
                label: formatBackgroundFitMaximumTotalGroupsLabel(
                  backgroundFit.maximumTotalGroupCount,
                ),
                onCloseTooltip: onCloseSummaryTooltip,
                onOpenTooltip: onOpenSummaryTooltip,
                tooltipCopy: getBackgroundFitMaximumTotalGroupsTooltipCopy(
                  backgroundFit.maximumTotalGroupCount,
                ),
                tooltipTitle: 'Maximum total groups',
              })}
            </div>
          </div>
        </div>
      </button>

      <div
        aria-hidden={!isExpanded}
        aria-labelledby={accordionButtonId}
        className="background-fit-card-panel"
        id={accordionPanelId}
        role="region"
      >
        <div className="background-fit-card-panel-inner">
          <div className="background-fit-card-content">
            <div className="background-fit-score-row">
              <span className="detail-badge">
                Guaranteed groups {backgroundFit.guaranteedMatchedTreeCount}
              </span>
              <span className="detail-badge">
                Expected groups {formatBackgroundFitScoreLabel(backgroundFit.expectedMatchedTreeCount)}
              </span>
            </div>

            {guaranteedMatches.length > 0 ? (
              <div className="background-fit-match-section">
                <p className="background-fit-section-label">Guaranteed</p>
                <ul className="background-fit-match-list">
                  {guaranteedMatches.map((match) =>
                    renderBackgroundFitMatch({
                      hoveredPerkGroupKey,
                      match,
                      onClosePerkGroupHover,
                      onInspectPerkGroup,
                      onOpenPerkGroupHover,
                    }),
                  )}
                </ul>
              </div>
            ) : null}

            {probabilisticMatches.length > 0 ? (
              <div className="background-fit-match-section">
                <p className="background-fit-section-label">Possible</p>
                <ul className="background-fit-match-list">
                  {probabilisticMatches.map((match) =>
                    renderBackgroundFitMatch({
                      hoveredPerkGroupKey,
                      match,
                      onClosePerkGroupHover,
                      onInspectPerkGroup,
                      onOpenPerkGroupHover,
                    }),
                  )}
                </ul>
              </div>
            ) : null}

            {backgroundFit.matches.length === 0 ? (
              <p className="background-fit-empty-card">No supported build perk group overlap.</p>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
}

function BackgroundFitPanel({
  backgroundFitView,
  hoveredPerkGroupKey,
  isExpanded,
  onClearBuildPerkTooltip,
  onClearHoveredPerk,
  onClearPerkGroupHover,
  onClosePerkGroupHover,
  onInspectPerkGroup,
  onOpenPerkGroupHover,
  onSearchActivityChange,
  onToggleExpanded,
  pickedPerkCount,
}: {
  backgroundFitView: BackgroundFitView
  hoveredPerkGroupKey: string | null
  isExpanded: boolean
  onClearBuildPerkTooltip: () => void
  onClearHoveredPerk: () => void
  onClearPerkGroupHover: () => void
  onClosePerkGroupHover: (perkGroupKey: string) => void
  onInspectPerkGroup: (categoryName: string, treeId: string) => void
  onOpenPerkGroupHover: (categoryName: string, treeId: string) => void
  onSearchActivityChange: (hasActiveSearch: boolean) => void
  onToggleExpanded: () => void
  pickedPerkCount: number
}) {
  const [backgroundFitInputValue, setBackgroundFitInputValue] = useState('')
  const deferredBackgroundFitQuery = useDeferredValue(backgroundFitInputValue)
  const [hoveredBackgroundFitSummaryTooltip, setHoveredBackgroundFitSummaryTooltip] =
    useState<HoveredBackgroundFitSummaryTooltip | null>(null)
  const [backgroundFitAccordionState, setBackgroundFitAccordionState] = useState<{
    expandedBackgroundFitKey: string | null
    rankedBackgroundFitKeySignature: string
  }>({
    expandedBackgroundFitKey: null,
    rankedBackgroundFitKeySignature: '',
  })
  const backgroundFitPanelBodyRef = useRef<HTMLDivElement | null>(null)
  const hoveredBackgroundFitSummaryTooltipId =
    hoveredBackgroundFitSummaryTooltip === null ? undefined : 'background-fit-summary-tooltip'
  const hasPickedPerks = pickedPerkCount > 0
  const hasSupportedBackgroundFitTargets = backgroundFitView.supportedBuildTargetTrees.length > 0
  const hasUnsupportedBackgroundFitTargets = backgroundFitView.unsupportedBuildTargetTrees.length > 0
  const hasActiveBackgroundFitSearch = backgroundFitInputValue.trim().length > 0
  const normalizedBackgroundFitQuery = deferredBackgroundFitQuery.trim().toLocaleLowerCase()
  const visibleRankedBackgroundFits = useMemo(
    () =>
      normalizedBackgroundFitQuery.length === 0
        ? backgroundFitView.rankedBackgroundFits
        : backgroundFitView.rankedBackgroundFits.filter((backgroundFit) =>
            getBackgroundFitSearchText(backgroundFit).includes(normalizedBackgroundFitQuery),
          ),
    [backgroundFitView, normalizedBackgroundFitQuery],
  )
  const rankedBackgroundFitIndexByKey = useMemo(
    () =>
      new Map(
        backgroundFitView.rankedBackgroundFits.map((backgroundFit, backgroundFitIndex) => [
          getBackgroundFitKey(backgroundFit),
          backgroundFitIndex,
        ]),
      ),
    [backgroundFitView],
  )
  const rankedBackgroundFitKeySignature = useMemo(
    () =>
      backgroundFitView.rankedBackgroundFits
        .map((backgroundFit) => getBackgroundFitKey(backgroundFit))
        .join('|'),
    [backgroundFitView],
  )
  const expandedBackgroundFitKey =
    backgroundFitAccordionState.rankedBackgroundFitKeySignature === rankedBackgroundFitKeySignature
      ? backgroundFitAccordionState.expandedBackgroundFitKey
      : null

  useEffect(() => {
    onSearchActivityChange(hasActiveBackgroundFitSearch)
  }, [hasActiveBackgroundFitSearch, onSearchActivityChange])

  useEffect(() => {
    if (hoveredBackgroundFitSummaryTooltip === null || typeof window === 'undefined') {
      return
    }

    const handleWindowResize = () => {
      setHoveredBackgroundFitSummaryTooltip(null)
    }

    window.addEventListener('resize', handleWindowResize)

    return () => {
      window.removeEventListener('resize', handleWindowResize)
    }
  }, [hoveredBackgroundFitSummaryTooltip])

  useEffect(() => {
    if (!isExpanded) {
      return
    }

    const backgroundFitPanelBody = backgroundFitPanelBodyRef.current

    if (backgroundFitPanelBody === null) {
      return
    }

    if (typeof backgroundFitPanelBody.scrollTo === 'function') {
      backgroundFitPanelBody.scrollTo({
        top: 0,
      })
      return
    }

    backgroundFitPanelBody.scrollTop = 0
  }, [isExpanded, normalizedBackgroundFitQuery])

  return (
    <>
      {hoveredBackgroundFitSummaryTooltip !== null ? (
        <div
          className="build-perk-tooltip"
          id={hoveredBackgroundFitSummaryTooltipId}
          role="tooltip"
          style={getAnchoredTooltipStyle(hoveredBackgroundFitSummaryTooltip.anchorRectangle)}
        >
          <strong className="build-perk-tooltip-title">
            {hoveredBackgroundFitSummaryTooltip.title}
          </strong>
          <div className="build-perk-tooltip-copy">
            {hoveredBackgroundFitSummaryTooltip.descriptionParagraphs.map(
              (descriptionParagraph, descriptionParagraphIndex) => (
                <p key={`background-fit-summary-tooltip-${descriptionParagraphIndex}`}>
                  {descriptionParagraph}
                </p>
              ),
            )}
          </div>
        </div>
      ) : null}

      <aside
        aria-label="Background fit"
        className={isExpanded ? 'background-fit-panel is-expanded' : 'background-fit-panel is-collapsed'}
        data-testid="background-fit-panel"
      >
        <div
          aria-hidden={!isExpanded}
          className="background-fit-panel-body"
          data-testid="background-fit-panel-body"
          onScrollCapture={() => {
            setHoveredBackgroundFitSummaryTooltip(null)
            onClearPerkGroupHover()
          }}
          ref={backgroundFitPanelBodyRef}
        >
          <label className="search-field background-fit-search-field">
            <span className="visually-hidden">Search backgrounds</span>
            <input
              aria-label="Search backgrounds"
              onChange={(event) => {
                setHoveredBackgroundFitSummaryTooltip(null)
                onClearPerkGroupHover()
                setBackgroundFitInputValue(event.target.value)
              }}
              placeholder="Search backgrounds"
              type="search"
              value={backgroundFitInputValue}
            />
          </label>
          {!hasPickedPerks ? null : hasSupportedBackgroundFitTargets ? (
            <p className="background-fit-ranking-summary">
              Ranked by guaranteed perks pickable first, then total perks pickable.
            </p>
          ) : (
            <div className="background-fit-empty-state">
              <p className="background-fit-summary-copy">
                {hasUnsupportedBackgroundFitTargets
                  ? 'This build only contains unsupported categories for dynamic background perk groups.'
                  : 'Pick perks from Weapon, Defense, Traits, Enemy, Class, Profession, or Magic to rank backgrounds exactly.'}
              </p>
              {hasUnsupportedBackgroundFitTargets ? (
                <>
                  <p className="background-fit-section-label">Unsupported build perk groups</p>
                  <p className="results-note">
                    Background dynamic perk groups only roll Weapon, Defense, Traits, Enemy, Class,
                    Profession, and Magic.
                  </p>
                  <ul className="background-fit-target-list is-unsupported">
                    {backgroundFitView.unsupportedBuildTargetTrees.map((buildTargetTree) =>
                      renderBackgroundFitTargetTree(buildTargetTree, 'unsupported'),
                    )}
                  </ul>
                </>
              ) : null}
            </div>
          )}
          {visibleRankedBackgroundFits.length > 0 ? (
            <ol className="background-fit-ranking" data-testid="background-fit-ranking">
              {visibleRankedBackgroundFits.map((backgroundFit, backgroundFitIndex) => (
                <li key={`${backgroundFit.backgroundId}-${backgroundFit.sourceFilePath}`}>
                  {renderBackgroundFitCard({
                    backgroundFit,
                    expandedBackgroundFitKey,
                    hoveredPerkGroupKey,
                    onClearPerkGroupHover,
                    onCloseSummaryTooltip: () => setHoveredBackgroundFitSummaryTooltip(null),
                    onClosePerkGroupHover,
                    onInspectPerkGroup,
                    onOpenPerkGroupHover,
                    onOpenSummaryTooltip: (
                      title: string,
                      descriptionParagraphs: string[],
                      currentTarget: HTMLSpanElement,
                    ) => {
                      const { bottom, left, right, top, width } =
                        currentTarget.getBoundingClientRect()

                      onClearHoveredPerk()
                      onClearBuildPerkTooltip()
                      setHoveredBackgroundFitSummaryTooltip({
                        anchorRectangle: {
                          bottom,
                          left,
                          right,
                          top,
                          width,
                        },
                        descriptionParagraphs,
                        title,
                      })
                    },
                    onToggle: (backgroundFitKey: string) => {
                      setHoveredBackgroundFitSummaryTooltip(null)
                      onClearPerkGroupHover()
                      setBackgroundFitAccordionState({
                        expandedBackgroundFitKey:
                          expandedBackgroundFitKey === backgroundFitKey ? null : backgroundFitKey,
                        rankedBackgroundFitKeySignature,
                      })
                    },
                    pickedPerkCount,
                    query: deferredBackgroundFitQuery,
                    rank:
                      rankedBackgroundFitIndexByKey.get(getBackgroundFitKey(backgroundFit)) ??
                      backgroundFitIndex,
                    supportedBuildTargetTreeCount:
                      backgroundFitView.supportedBuildTargetTrees.length,
                  })}
                </li>
              ))}
            </ol>
          ) : (
            <div className="background-fit-empty-state">
              <p className="background-fit-summary-copy">
                No backgrounds match "{deferredBackgroundFitQuery.trim()}".
              </p>
              <p className="background-fit-summary-copy">
                Try a different background name or clear the search.
              </p>
            </div>
          )}
        </div>

        <button
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} background fit`}
          className="background-fit-rail-button"
          onClick={() => {
            setHoveredBackgroundFitSummaryTooltip(null)
            onClearPerkGroupHover()
            onToggleExpanded()
          }}
          type="button"
        >
          <span aria-hidden="true" className="background-fit-rail-button-icon">
            <BackgroundFitRailChevron isExpanded={isExpanded} />
          </span>
          {!isExpanded ? (
            <span aria-hidden="true" className="background-fit-rail-button-label">
              Background fit
            </span>
          ) : null}
        </button>
      </aside>
    </>
  )
}

function renderPlacementDescription(placement: LegendsPerkPlacement) {
  return (
    <>
      {placement.treeDescriptions.length > 0 ? (
        <p className="detail-support">{placement.treeDescriptions.join(' / ')}</p>
      ) : null}
      {placement.treeAttributes.length > 0 ? (
        <p className="detail-support">{placement.treeAttributes.join(' / ')}</p>
      ) : null}
    </>
  )
}

function renderBackgroundSource(backgroundSource: GroupedBackgroundSource) {
  return (
    <>
      <div>
        <strong>{backgroundSource.backgroundNames.join(', ')}</strong>
        <p className="detail-support">
          {backgroundSource.categoryName} / {backgroundSource.treeName}
        </p>
      </div>
      <span className="detail-badge">
        {formatMinimumTreesLabel(backgroundSource.minimumTrees)} /{' '}
        {formatChanceLabel(backgroundSource.chance)}
      </span>
    </>
  )
}

function renderFavoredEnemyTarget(favoredEnemyTarget: LegendsFavoredEnemyTarget) {
  return (
    <>
      <div>
        <strong>{favoredEnemyTarget.entityName}</strong>
      </div>
      <span className="detail-badge">
        {favoredEnemyTarget.killsPerPercentBonus === null
          ? 'Varies'
          : `${favoredEnemyTarget.killsPerPercentBonus} kills / 1%`}
      </span>
    </>
  )
}

function GitHubIcon({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 .297a12 12 0 0 0-3.79 23.39c.6.111.82-.26.82-.577v-2.234c-3.338.726-4.042-1.61-4.042-1.61a3.183 3.183 0 0 0-1.336-1.756c-1.092-.746.083-.731.083-.731a2.52 2.52 0 0 1 1.84 1.235 2.548 2.548 0 0 0 3.478.995 2.55 2.55 0 0 1 .76-1.598c-2.665-.303-5.466-1.332-5.466-5.93a4.64 4.64 0 0 1 1.235-3.22 4.3 4.3 0 0 1 .117-3.176s1.008-.322 3.3 1.23a11.47 11.47 0 0 1 6.006 0c2.29-1.552 3.297-1.23 3.297-1.23a4.297 4.297 0 0 1 .12 3.176 4.63 4.63 0 0 1 1.233 3.22c0 4.609-2.806 5.624-5.479 5.921a2.869 2.869 0 0 1 .814 2.228v3.301c0 .319.216.694.825.576A12.004 12.004 0 0 0 12 .297" />
    </svg>
  )
}

function renderGameIcon({
  className,
  iconPath,
  label,
}: {
  className: string
  iconPath: string | null
  label: string
}) {
  const iconUrl = getGameIconUrl(iconPath)

  if (!iconUrl) {
    return <div aria-hidden="true" className={`${className} is-placeholder`} />
  }

  return <img alt={label} className={className} decoding="async" loading="lazy" src={iconUrl} />
}

function renderPlannerGroupCard({
  groupedPerkGroup,
  hoveredPerkGroupKey,
  keyPrefix,
  onCloseTooltip,
  onInspectPerk,
  onOpenTooltip,
  hoveredPerkId,
  hoveredTooltipId,
}: {
  groupedPerkGroup: BuildPlannerGroupedPerkGroup
  hoveredPerkGroupKey: string | null
  keyPrefix: string
  onCloseTooltip: () => void
  onInspectPerk: (perkId: string) => void
  onOpenTooltip: (perkId: string, currentTarget: HTMLButtonElement) => void
  hoveredPerkId: string | null
  hoveredTooltipId: string | undefined
}) {
  const plannerGroupLabel = getPlannerGroupLabel(groupedPerkGroup.perkGroupOptions)
  const isHighlighted = groupedPerkGroup.perkGroupOptions.some(
    (perkGroupOption) =>
      hoveredPerkGroupKey ===
      getPerkGroupHoverKey({
        categoryName: perkGroupOption.categoryName,
        treeId: perkGroupOption.treeId,
      }),
  )

  return (
    <article
      className={isHighlighted ? 'planner-group-card is-highlighted' : 'planner-group-card'}
      key={`${keyPrefix}-${groupedPerkGroup.perkIds.join('::')}::${plannerGroupLabel}`}
    >
      <div className="planner-group-card-header">
        <div className="planner-card-icon-stack">
          {groupedPerkGroup.perkGroupOptions.map((perkGroupOption) => (
            <span className="planner-card-icon-stack-item" key={perkGroupOption.treeId}>
              {renderGameIcon({
                className: 'perk-icon perk-icon-group',
                iconPath: perkGroupOption.treeIconPath,
                label: `${perkGroupOption.treeLabel} perk group icon`,
              })}
            </span>
          ))}
        </div>
        <div className="planner-group-card-copy">
          <div className="planner-slot-topline">
            <span className="planner-slot-category">
              {getPlannerGroupCategoryLabel(groupedPerkGroup.perkGroupOptions)}
            </span>
            <span className="planner-slot-group-count">
              {formatPickedPerkCountLabel(groupedPerkGroup.perkNames.length)}
            </span>
          </div>
          <strong className="planner-slot-name" title={plannerGroupLabel}>
            {plannerGroupLabel}
          </strong>
        </div>
      </div>
      <div className="planner-pill-list">
        {groupedPerkGroup.perkNames.map((perkName, perkIndex) => {
          const perkId = groupedPerkGroup.perkIds[perkIndex]

            return perkId ? (
              <button
                aria-describedby={hoveredPerkId === perkId ? hoveredTooltipId : undefined}
                className={hoveredPerkId === perkId ? 'planner-pill is-highlighted' : 'planner-pill'}
                key={`${plannerGroupLabel}-${perkId}`}
                onBlur={onCloseTooltip}
                onClick={() => onInspectPerk(perkId)}
                onFocus={(event) => onOpenTooltip(perkId, event.currentTarget)}
              onMouseEnter={(event) => onOpenTooltip(perkId, event.currentTarget)}
              onMouseLeave={onCloseTooltip}
              type="button"
            >
              {perkName}
            </button>
          ) : (
            <span className="planner-pill" key={`${plannerGroupLabel}-${perkName}`}>
              {perkName}
            </span>
          )
        })}
      </div>
    </article>
  )
}

function getBuildPerkTooltipStyle(
  hoveredBuildPerkTooltip: HoveredBuildPerkTooltip,
): CSSProperties {
  return getAnchoredTooltipStyle(hoveredBuildPerkTooltip.anchorRectangle)
}

function getAnchoredTooltipStyle(anchorRectangle: TooltipAnchorRectangle): CSSProperties {
  if (typeof window === 'undefined') {
    return {}
  }

  const viewportPadding = 12
  const tooltipMaximumWidth = Math.min(360, window.innerWidth - viewportPadding * 2)
  const left = Math.max(
    viewportPadding,
    Math.min(
      anchorRectangle.left,
      window.innerWidth - tooltipMaximumWidth - viewportPadding,
    ),
  )

  return {
    left: `${left}px`,
    maxWidth: `${tooltipMaximumWidth}px`,
    top: `${anchorRectangle.bottom + 8}px`,
  }
}

function TreeChevron({ isExpanded }: { isExpanded: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={isExpanded ? 'tree-chevron is-expanded' : 'tree-chevron'}
      viewBox="0 0 12 12"
    >
      <path d="M4 2.5 7.5 6 4 9.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
    </svg>
  )
}

function BackgroundFitRailChevron({ isExpanded }: { isExpanded: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={isExpanded ? 'background-fit-rail-chevron is-expanded' : 'background-fit-rail-chevron'}
      viewBox="0 0 12 12"
    >
      <path d="M4 2.5 7.5 6 4 9.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
    </svg>
  )
}

function BackgroundFitAccordionChevron({ isExpanded }: { isExpanded: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={isExpanded ? 'background-fit-accordion-chevron is-expanded' : 'background-fit-accordion-chevron'}
      viewBox="0 0 12 12"
    >
      <path d="M4 2.5 7.5 6 4 9.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
    </svg>
  )
}

function BuildStar({ isPicked }: { isPicked: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={isPicked ? 'build-star is-picked' : 'build-star'}
      viewBox="0 0 24 24"
    >
      <path
        d="m12 3.45 2.67 5.41 5.97.87-4.32 4.21 1.02 5.95L12 17.07 6.66 19.89l1.02-5.95-4.32-4.21 5.97-.87L12 3.45Z"
        fill={isPicked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  )
}

function BuildPlannerInfoButton() {
  return (
    <span className="build-planner-info">
      <button
        aria-describedby="build-planner-info-tooltip"
        aria-label="Show build planner guidance"
        className="build-planner-info-button"
        type="button"
      >
        i
      </button>
      <span className="build-planner-info-tooltip" id="build-planner-info-tooltip">
        {buildPlannerGuidance}
      </span>
    </span>
  )
}

function BuildToggleButton({
  isCompact = false,
  isPicked,
  onClick,
  perkName,
  source,
}: {
  isCompact?: boolean
  isPicked: boolean
  onClick: () => void
  perkName: string
  source: 'detail' | 'results'
}) {
  const locationSuffix = source === 'results' ? ' from results' : ''
  const actionLabel = isPicked
    ? `Remove ${perkName} from build${locationSuffix}`
    : `Add ${perkName} to build${locationSuffix}`
  const titleLabel = isPicked ? `Remove ${perkName} from build` : `Add ${perkName} to build`

  return (
    <button
      aria-label={actionLabel}
      className={
        isCompact
          ? isPicked
            ? 'build-toggle-button is-compact is-picked'
            : 'build-toggle-button is-compact'
          : isPicked
            ? 'build-toggle-button is-picked'
            : 'build-toggle-button'
      }
      onClick={onClick}
      title={titleLabel}
      type="button"
    >
      <BuildStar isPicked={isPicked} />
    </button>
  )
}

const groupCounts = getGroupCounts(allPerks)
const categoryTreeOptionsByGroup = getCategoryTreeOptions(allPerks)
const availableGroups = [...groupCounts.keys()].toSorted(compareGroupNames)
const tierOptions = buildTierOptions(allPerks)

export default function App() {
  const [initialUrlState] = useState(() =>
    readPerkBrowserUrlStateFromLocation({
      availableGroupNames: availableGroups,
      perks: allPerks,
      tierOptions,
      treeOptionsByGroup: categoryTreeOptionsByGroup,
    }),
  )
  const [query, setQuery] = useState(initialUrlState.query)
  const [pickedPerkIds, setPickedPerkIds] = useState<string[]>(initialUrlState.pickedPerkIds)
  const [selectedGroupNames, setSelectedGroupNames] = useState<string[]>(
    initialUrlState.selectedGroupNames,
  )
  const [expandedGroupNames, setExpandedGroupNames] = useState<string[]>(
    initialUrlState.selectedGroupNames,
  )
  const [selectedTreeIdsByGroup, setSelectedTreeIdsByGroup] = useState<Record<string, string[]>>(
    initialUrlState.selectedTreeIdsByGroup,
  )
  const [hoveredPerkId, setHoveredPerkId] = useState<string | null>(null)
  const [hoveredPerkGroupKey, setHoveredPerkGroupKey] = useState<string | null>(null)
  const [hoveredBuildPerkTooltip, setHoveredBuildPerkTooltip] =
    useState<HoveredBuildPerkTooltip | null>(null)
  const [shareBuildStatus, setShareBuildStatus] = useState<'copied' | 'error' | 'idle'>('idle')
  const [isBackgroundFitPanelExpanded, setIsBackgroundFitPanelExpanded] = useState(true)
  const [hasActiveBackgroundFitSearch, setHasActiveBackgroundFitSearch] = useState(false)
  const normalizedPerkSearchPhrase = normalizeSearchPhrase(query)
  const visiblePerks = filterAndSortPerks(allPerks, {
    query,
    selectedGroupNames,
    selectedTreeIdsByGroup,
    tierValue: allTiersFilterValue,
  })
  const [selectedPerkId, setSelectedPerkId] = useState<string | null>(() => visiblePerks[0]?.id ?? null)
  const selectedPerk =
    visiblePerks.find((perk) => perk.id === selectedPerkId) ?? visiblePerks[0] ?? null
  const pickedPerks = useMemo(
    () =>
      pickedPerkIds.flatMap((pickedPerkId) => {
        const pickedPerk = allPerksById.get(pickedPerkId)

        return pickedPerk ? [pickedPerk] : []
      }),
    [pickedPerkIds],
  )
  const buildShareSearch = useMemo(
    () => buildPerkBrowserBuildUrlSearch(pickedPerkIds, allPerksById),
    [pickedPerkIds],
  )
  const buildPlannerGroups = useMemo(() => getBuildPlannerGroups(pickedPerks), [pickedPerks])
  const backgroundFitView = useMemo(
    () => backgroundFitEngine.getBackgroundFitView(pickedPerks),
    [pickedPerks],
  )
  const visiblePerkCountsByGroup = useMemo(() => getVisiblePerkCountsByGroup(visiblePerks), [visiblePerks])
  const visiblePerkCountsByCategoryTree = useMemo(
    () => getVisiblePerkCountsByCategoryTree(visiblePerks),
    [visiblePerks],
  )
  const displayedGroupNames = useMemo(
    () =>
      [...availableGroups].toSorted((leftGroupName, rightGroupName) =>
        compareDisplayedGroups({
          leftGroupName,
          normalizedSearchPhrase: normalizedPerkSearchPhrase,
          rightGroupName,
          treeOptionsByGroup: categoryTreeOptionsByGroup,
          visiblePerkCountsByGroup,
        }),
      ),
    [normalizedPerkSearchPhrase, visiblePerkCountsByGroup],
  )
  const displayedTreeOptionsByGroup = useMemo(
    () =>
      new Map(
        displayedGroupNames.map((groupName) => {
          const treeOptions = categoryTreeOptionsByGroup.get(groupName) ?? []

          return [
            groupName,
            [...treeOptions].toSorted((leftTreeOption, rightTreeOption) =>
              compareDisplayedTreeOptions({
                categoryName: groupName,
                leftTreeOption,
                normalizedSearchPhrase: normalizedPerkSearchPhrase,
                rightTreeOption,
                visiblePerkCountsByCategoryTree,
              }),
            ),
          ] as const
        }),
      ),
    [displayedGroupNames, normalizedPerkSearchPhrase, visiblePerkCountsByCategoryTree],
  )
  const sharedPerkGroups = buildPlannerGroups.sharedPerkGroups
  const individualPerkGroups = buildPlannerGroups.individualPerkGroups
  const pickedPerkCountsByGroup = getPickedPerkCountsByGroup(pickedPerks)
  const pickedPerkCountsByTree = getPickedPerkCountsByTree(pickedPerks)
  const pickedPerkOrderById = new Map(
    pickedPerkIds.map((pickedPerkId, pickedPerkIndex) => [pickedPerkId, pickedPerkIndex + 1]),
  )
  const selectedPerkBuildSlot = selectedPerk ? pickedPerkOrderById.get(selectedPerk.id) ?? null : null
  const groupedBackgroundSources = selectedPerk
    ? groupBackgroundSources(selectedPerk.backgroundSources)
    : []
  const hoveredBuildPerk =
    hoveredBuildPerkTooltip === null ? null : allPerksById.get(hoveredBuildPerkTooltip.perkId) ?? null
  const hoveredBuildPerkTooltipId =
    hoveredBuildPerk === null ? undefined : `build-perk-tooltip-${hoveredBuildPerk.id}`
  const hasPickedPerks = pickedPerks.length > 0
  const hasIndividualPerkGroups = individualPerkGroups.length > 0
  const selectedCategoryCount = selectedGroupNames.length
  const selectedTreeCount = Object.values(selectedTreeIdsByGroup).reduce(
    (treeCount, selectedTreeIds) => treeCount + selectedTreeIds.length,
    0,
  )

  function handleResetGroups() {
    startTransition(() => {
      setExpandedGroupNames([])
      setSelectedGroupNames([])
      setSelectedTreeIdsByGroup({})
    })
  }

  function handleTogglePerkPicked(perkId: string) {
    startTransition(() => {
      setPickedPerkIds((currentPickedPerkIds) =>
        currentPickedPerkIds.includes(perkId)
          ? currentPickedPerkIds.filter((currentPickedPerkId) => currentPickedPerkId !== perkId)
          : [...currentPickedPerkIds, perkId],
      )
      setHoveredBuildPerkTooltip((currentTooltip) =>
        currentTooltip?.perkId === perkId ? null : currentTooltip,
      )
    })
  }

  function handleRemovePickedPerk(perkId: string) {
    startTransition(() => {
      setPickedPerkIds((currentPickedPerkIds) =>
        currentPickedPerkIds.filter((currentPickedPerkId) => currentPickedPerkId !== perkId),
      )
      setHoveredPerkId((currentHoveredPerkId) =>
        currentHoveredPerkId === perkId ? null : currentHoveredPerkId,
      )
      setHoveredBuildPerkTooltip((currentTooltip) =>
        currentTooltip?.perkId === perkId ? null : currentTooltip,
      )
      setHoveredPerkGroupKey(null)
    })
  }

  function handleClearBuild() {
    startTransition(() => {
      setPickedPerkIds([])
      setHoveredPerkId(null)
      setHoveredPerkGroupKey(null)
      setHoveredBuildPerkTooltip(null)
      setShareBuildStatus('idle')
    })
  }

  function getBuildShareUrl(): string {
    const buildSharePath = buildShareSearch ? `/${buildShareSearch}` : '/'

    if (typeof window === 'undefined') {
      return buildSharePath
    }

    return new URL(buildSharePath, window.location.origin).toString()
  }

  async function copyTextToClipboard(text: string): Promise<void> {
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text)
        return
      } catch {
        // Fall back to the selection-based copy path below.
      }
    }

    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.setAttribute('readonly', '')
    textArea.style.position = 'fixed'
    textArea.style.top = '0'
    textArea.style.left = '-9999px'
    document.body.append(textArea)
    textArea.select()

    const didCopy = document.execCommand('copy')
    textArea.remove()

    if (!didCopy) {
      throw new Error('Clipboard copy failed.')
    }
  }

  async function handleShareBuild() {
    if (!hasPickedPerks) {
      return
    }

    try {
      await copyTextToClipboard(getBuildShareUrl())
      setShareBuildStatus('copied')
    } catch {
      setShareBuildStatus('error')
    }
  }

  function handleInspectPlannerPerk(perkId: string) {
    setSelectedPerkId(perkId)
  }

  function handleOpenBuildPerkTooltip(perkId: string, currentTarget: HTMLButtonElement) {
    const { bottom, left, right, top, width } = currentTarget.getBoundingClientRect()

    setHoveredPerkId(perkId)
    setHoveredPerkGroupKey(null)
    setHoveredBuildPerkTooltip({
      anchorRectangle: {
        bottom,
        left,
        right,
        top,
        width,
      },
      perkId,
    })
  }

  function handleCloseBuildPerkTooltip() {
    setHoveredPerkId(null)
    setHoveredBuildPerkTooltip(null)
  }

  function handleOpenResultsPerkHover(perkId: string) {
    setHoveredPerkId(perkId)
    setHoveredPerkGroupKey(null)
    setHoveredBuildPerkTooltip(null)
  }

  function handleCloseResultsPerkHover(perkId: string) {
    setHoveredPerkId((currentHoveredPerkId) =>
      currentHoveredPerkId === perkId ? null : currentHoveredPerkId,
    )
  }

  function handleOpenPerkGroupHover(categoryName: string, treeId: string) {
    setHoveredPerkGroupKey(getPerkGroupHoverKey({ categoryName, treeId }))
    setHoveredPerkId(null)
    setHoveredBuildPerkTooltip(null)
  }

  function handleClosePerkGroupHover(perkGroupKey: string) {
    setHoveredPerkGroupKey((currentHoveredPerkGroupKey) =>
      currentHoveredPerkGroupKey === perkGroupKey ? null : currentHoveredPerkGroupKey,
    )
  }

  function handleInspectPerkGroup(categoryName: string, treeId: string) {
    startTransition(() => {
      setQuery('')
      setSelectedGroupNames((currentSelectedGroupNames) =>
        currentSelectedGroupNames.includes(categoryName)
          ? currentSelectedGroupNames
          : [...currentSelectedGroupNames, categoryName],
      )
      setExpandedGroupNames((currentExpandedGroupNames) =>
        currentExpandedGroupNames.includes(categoryName)
          ? currentExpandedGroupNames
          : [...currentExpandedGroupNames, categoryName],
      )
      setSelectedTreeIdsByGroup((currentSelectedTreeIdsByGroup) => {
        const currentSelectedTreeIds = currentSelectedTreeIdsByGroup[categoryName] ?? []

        if (currentSelectedTreeIds.includes(treeId)) {
          return currentSelectedTreeIdsByGroup
        }

        return {
          ...currentSelectedTreeIdsByGroup,
          [categoryName]: [...currentSelectedTreeIds, treeId],
        }
      })
    })
  }

  function handleGroupToggle(nextGroupName: string) {
    startTransition(() => {
      const isSelected = selectedGroupNames.includes(nextGroupName)

      if (isSelected) {
        setExpandedGroupNames((currentExpandedGroupNames) =>
          currentExpandedGroupNames.filter((groupName) => groupName !== nextGroupName),
        )
        setSelectedGroupNames((currentSelectedGroupNames) =>
          currentSelectedGroupNames.filter((groupName) => groupName !== nextGroupName),
        )
        setSelectedTreeIdsByGroup((currentSelectedTreeIdsByGroup) => {
          const remainingSelectedTreeIdsByGroup = { ...currentSelectedTreeIdsByGroup }
          delete remainingSelectedTreeIdsByGroup[nextGroupName]

          return remainingSelectedTreeIdsByGroup
        })
        return
      }

      setExpandedGroupNames((currentExpandedGroupNames) =>
        currentExpandedGroupNames.includes(nextGroupName)
          ? currentExpandedGroupNames
          : [...currentExpandedGroupNames, nextGroupName],
      )
      setSelectedGroupNames((currentSelectedGroupNames) => [...currentSelectedGroupNames, nextGroupName])
    })
  }

  function handleResetGroupTrees(groupName: string) {
    startTransition(() =>
      setSelectedTreeIdsByGroup((currentSelectedTreeIdsByGroup) => ({
        ...currentSelectedTreeIdsByGroup,
        [groupName]: [],
      })),
    )
  }

  function handleTreeToggle(groupName: string, nextTreeId: string) {
    startTransition(() =>
      setSelectedTreeIdsByGroup((currentSelectedTreeIdsByGroup) => {
        const currentSelectedTreeIds = currentSelectedTreeIdsByGroup[groupName] ?? []
        const nextSelectedTreeIds = currentSelectedTreeIds.includes(nextTreeId)
          ? currentSelectedTreeIds.filter((treeId) => treeId !== nextTreeId)
          : [...currentSelectedTreeIds, nextTreeId]

        return {
          ...currentSelectedTreeIdsByGroup,
          [groupName]: nextSelectedTreeIds,
        }
      }),
    )
  }

  useEffect(() => {
    if (visiblePerks.length === 0) {
      if (selectedPerkId !== null) {
        startTransition(() => setSelectedPerkId(null))
      }

      return
    }

    if (!visiblePerks.some((perk) => perk.id === selectedPerkId)) {
      startTransition(() => setSelectedPerkId(visiblePerks[0].id))
    }
  }, [selectedPerkId, visiblePerks])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const nextSearch = buildPerkBrowserUrlSearch(
      {
        pickedPerkIds,
        query,
        selectedGroupNames,
        selectedTreeIdsByGroup,
        tierValue: allTiersFilterValue,
      },
      {
        availableGroupNames: availableGroups,
        perksById: allPerksById,
        treeOptionsByGroup: categoryTreeOptionsByGroup,
      },
    )

    if (window.location.search === nextSearch) {
      return
    }

    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${nextSearch}${window.location.hash}`,
    )
  }, [pickedPerkIds, query, selectedGroupNames, selectedTreeIdsByGroup])

  useEffect(() => {
    if (hoveredBuildPerkTooltip === null || typeof window === 'undefined') {
      return
    }

    const handleWindowResize = () => {
      setHoveredBuildPerkTooltip(null)
    }

    window.addEventListener('resize', handleWindowResize)

    return () => {
      window.removeEventListener('resize', handleWindowResize)
    }
  }, [hoveredBuildPerkTooltip])

  useEffect(() => {
    if (shareBuildStatus === 'idle') {
      return
    }

    const resetShareBuildStatusTimeout = window.setTimeout(() => {
      setShareBuildStatus('idle')
    }, 1600)

    return () => {
      window.clearTimeout(resetShareBuildStatusTimeout)
    }
  }, [shareBuildStatus])

  return (
      <div className="app-shell">
      <div className="background-runes" aria-hidden="true" />
      <header className="hero">
        <div className="hero-copy">
          <h1>Perks browser</h1>
          <p className="eyebrow hero-brand">
            Battle Brothers <span className="hero-brand-emphasis">Legends</span>
          </p>
        </div>
        <div className="hero-top-bar">
          <div className="hero-top-actions">
            <dl className="hero-meta" aria-label="Perk catalog summary">
              <div>
                <dt>Perks</dt>
                <dd>{legendsPerksDataset.perkCount}</dd>
              </div>
              <div>
                <dt>Perk groups</dt>
                <dd>{legendsPerksDataset.treeCount}</dd>
              </div>
              <div>
                <dt>Reference</dt>
                <dd>{legendsPerksDataset.referenceVersion.replace(/^reference-mod_/, '')}</dd>
              </div>
            </dl>
            <a
              aria-label="Open the battle-brothers-legends-browser repository on GitHub"
              className="hero-repository-link"
              href={repositoryUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <GitHubIcon className="hero-repository-link-icon" />
            </a>
          </div>
        </div>
      </header>

      <section
        aria-label="Build planner"
        className={
          hasActiveBackgroundFitSearch
            ? 'build-planner is-background-fit-search-active'
            : 'build-planner'
        }
      >
        <div className="build-planner-header">
          <div className="build-planner-title-row">
            <div className="build-planner-title">
              <h2>
                BUILD PLANNER
                {hasPickedPerks ? <BuildPlannerInfoButton /> : null}
              </h2>
            </div>
          </div>
          <div className="build-planner-actions">
            <p className="build-planner-count">
              {!hasPickedPerks
                ? 'No perks picked yet.'
                : `${pickedPerks.length} perk${pickedPerks.length === 1 ? '' : 's'} picked.`}
            </p>
            <button
              aria-label="Copy shared build link"
              className={
                shareBuildStatus === 'copied'
                  ? 'planner-action-button share-build-button is-confirmed'
                  : shareBuildStatus === 'error'
                    ? 'planner-action-button share-build-button is-error'
                    : 'planner-action-button share-build-button'
              }
              disabled={pickedPerks.length === 0}
              onClick={() => {
                void handleShareBuild()
              }}
              type="button"
            >
              {shareBuildStatus === 'copied'
                ? 'Copied'
                : shareBuildStatus === 'error'
                  ? 'Copy failed'
                  : 'Share build'}
            </button>
            <button
              aria-label="Clear build"
              className="planner-action-button"
              disabled={pickedPerks.length === 0}
              onClick={handleClearBuild}
              type="button"
            >
              Clear build
            </button>
          </div>
        </div>

        <div className="planner-board" onScrollCapture={handleCloseBuildPerkTooltip}>
          <div className="planner-row">
            <span className="planner-row-label">Perks</span>
            <div className="planner-track-scroll">
              <div className="planner-track planner-track-perks" data-testid="build-perks-bar">
                {hasPickedPerks ? (
                    pickedPerks.map((pickedPerk) => (
                      <button
                        aria-label={`Remove ${pickedPerk.perkName} from build`}
                        aria-describedby={
                          hoveredBuildPerk?.id === pickedPerk.id ? hoveredBuildPerkTooltipId : undefined
                        }
                        className={
                          hoveredPerkId === pickedPerk.id
                            ? 'planner-slot planner-slot-perk is-highlighted'
                            : 'planner-slot planner-slot-perk'
                        }
                        key={pickedPerk.id}
                        onBlur={handleCloseBuildPerkTooltip}
                        onClick={() => handleRemovePickedPerk(pickedPerk.id)}
                        onFocus={(event) => handleOpenBuildPerkTooltip(pickedPerk.id, event.currentTarget)}
                      onMouseEnter={(event) =>
                        handleOpenBuildPerkTooltip(pickedPerk.id, event.currentTarget)
                      }
                      onMouseLeave={handleCloseBuildPerkTooltip}
                      type="button"
                    >
                      {renderGameIcon({
                        className: 'perk-icon perk-icon-tiny',
                        iconPath: getPerkDisplayIconPath(pickedPerk),
                        label: `${pickedPerk.perkName} build icon`,
                      })}
                      <strong className="planner-picked-perk-name">{pickedPerk.perkName}</strong>
                      <span aria-hidden="true" className="planner-picked-perk-remove-indicator">
                        ×
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="planner-slot planner-slot-placeholder is-placeholder">
                    <div className="planner-slot-copy">
                      <strong className="planner-slot-name">Pick a perk to start</strong>
                      <p className="planner-slot-meta">
                        Use the star in the detail panel or the search results list.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="planner-row">
            <span className="planner-row-label">Perk groups for 2+ perks</span>
            <div className="planner-section" data-testid="build-shared-groups-list">
              {sharedPerkGroups.length > 0 ? (
                <div className="planner-group-list">
                  {sharedPerkGroups.map((sharedPerkGroup) =>
                    renderPlannerGroupCard({
                      groupedPerkGroup: sharedPerkGroup,
                      hoveredPerkGroupKey,
                      hoveredPerkId,
                      hoveredTooltipId: hoveredBuildPerkTooltipId,
                      keyPrefix: 'shared',
                      onCloseTooltip: handleCloseBuildPerkTooltip,
                      onInspectPerk: handleInspectPlannerPerk,
                      onOpenTooltip: handleOpenBuildPerkTooltip,
                    }),
                  )}
                </div>
              ) : (
                <div className="planner-section-placeholder">
                  <strong className="planner-slot-name">
                    Perk groups covering 2 or more picked perks will appear here
                  </strong>
                  <p className="planner-slot-meta">
                    When multiple picked perks share a perk group, it will show up here with every
                    covered perk listed on the card.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="planner-row">
            <span className="planner-row-label">Perk groups for individual perks</span>
            <div className="planner-section" data-testid="build-individual-groups-list">
              {hasPickedPerks ? (
                hasIndividualPerkGroups ? (
                  <div className="planner-group-list">
                    {individualPerkGroups.map((individualPerkGroup) =>
                      renderPlannerGroupCard({
                        groupedPerkGroup: individualPerkGroup,
                        hoveredPerkGroupKey,
                        hoveredPerkId,
                        hoveredTooltipId: hoveredBuildPerkTooltipId,
                        keyPrefix: 'individual',
                        onCloseTooltip: handleCloseBuildPerkTooltip,
                        onInspectPerk: handleInspectPlannerPerk,
                        onOpenTooltip: handleOpenBuildPerkTooltip,
                      }),
                    )}
                  </div>
                ) : (
                  <div className="planner-section-placeholder">
                    <strong className="planner-slot-name">
                      This build has no individual-perk-only groups
                    </strong>
                    <p className="planner-slot-meta">
                      Every available perk group for the current build already covers two or more
                      picked perks.
                    </p>
                  </div>
                )
              ) : (
                <div className="planner-section-placeholder">
                  <strong className="planner-slot-name">Single-perk groups will appear here</strong>
                  <p className="planner-slot-meta">
                    Groups that only match one picked perk are merged by perk and shown here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {hoveredBuildPerk !== null && hoveredBuildPerkTooltip !== null ? (
        <div
          className="build-perk-tooltip"
          id={hoveredBuildPerkTooltipId}
          role="tooltip"
          style={getBuildPerkTooltipStyle(hoveredBuildPerkTooltip)}
        >
          <strong className="build-perk-tooltip-title">{hoveredBuildPerk.perkName}</strong>
          <div className="build-perk-tooltip-copy">
            {getPerkPreviewParagraphs(hoveredBuildPerk).map((previewParagraph, previewParagraphIndex) => (
              <p key={`${hoveredBuildPerk.id}-tooltip-${previewParagraphIndex}`}>{previewParagraph}</p>
            ))}
          </div>
        </div>
      ) : null}

      <main
        className={
          isBackgroundFitPanelExpanded
            ? hasActiveBackgroundFitSearch
              ? 'workspace is-background-fit-expanded has-active-background-fit-search'
              : 'workspace is-background-fit-expanded'
            : 'workspace is-background-fit-collapsed'
        }
      >
        <BackgroundFitPanel
          backgroundFitView={backgroundFitView}
          hoveredPerkGroupKey={hoveredPerkGroupKey}
          isExpanded={isBackgroundFitPanelExpanded}
          onClearBuildPerkTooltip={() => setHoveredBuildPerkTooltip(null)}
          onClearHoveredPerk={() => setHoveredPerkId(null)}
          onClearPerkGroupHover={() => setHoveredPerkGroupKey(null)}
          onClosePerkGroupHover={handleClosePerkGroupHover}
          onInspectPerkGroup={handleInspectPerkGroup}
          onOpenPerkGroupHover={handleOpenPerkGroupHover}
          onSearchActivityChange={setHasActiveBackgroundFitSearch}
          onToggleExpanded={() => setIsBackgroundFitPanelExpanded((isExpanded) => !isExpanded)}
          pickedPerkCount={pickedPerks.length}
        />

        <aside className="sidebar" aria-label="Perk categories">
          <div className="panel-heading">
            <h2>Categories</h2>
            <p>Enable one or more categories, then narrow each one to the perk groups you want.</p>
          </div>
          <button
            aria-label="Reset all category filters"
            className={selectedGroupNames.length === 0 ? 'group-chip is-active' : 'group-chip'}
            onClick={handleResetGroups}
            type="button"
          >
            <span className="group-chip-start">
              <span className="group-label">All categories</span>
            </span>
            <span>{allPerks.length}</span>
          </button>
          {displayedGroupNames.map((availableGroupName) => {
            const activeTreeOptions = displayedTreeOptionsByGroup.get(availableGroupName) ?? []
            const isExpanded = expandedGroupNames.includes(availableGroupName)
            const isActive = selectedGroupNames.includes(availableGroupName)
            const pickedPerkCountInGroup = pickedPerkCountsByGroup.get(availableGroupName) ?? 0
            const selectedTreeIds = selectedTreeIdsByGroup[availableGroupName] ?? []
            const isHoveredCategory = hoveredPerkGroupKey?.startsWith(`${availableGroupName}::`) ?? false
            const hasVisibleHoveredTree =
              isHoveredCategory &&
              activeTreeOptions.some(
                (treeOption) =>
                  hoveredPerkGroupKey ===
                  getPerkGroupHoverKey({
                    categoryName: availableGroupName,
                    treeId: treeOption.treeId,
                  }),
              )
            const shouldHighlightCategory =
              isHoveredCategory && (!isExpanded || !hasVisibleHoveredTree)
            const categoryChipClassName = [
              'group-chip',
              isActive ? 'is-active' : '',
              shouldHighlightCategory ? 'is-highlighted' : '',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <div className={isExpanded ? 'category-card is-active' : 'category-card'} key={availableGroupName}>
                <button
                  aria-expanded={isExpanded}
                  aria-label={`${isActive ? 'Disable' : 'Enable'} category ${availableGroupName}`}
                  className={categoryChipClassName}
                  onClick={() => handleGroupToggle(availableGroupName)}
                  type="button"
                >
                  <span className="group-chip-start">
                    <TreeChevron isExpanded={isExpanded} />
                    <span className="group-label">
                      {renderHighlightedText(availableGroupName, query, `${availableGroupName}-group`)}
                    </span>
                  </span>
                  <span className="group-chip-end">
                    {pickedPerkCountInGroup > 0 ? (
                      <span aria-hidden="true" className="group-chip-picked-stars">
                        {Array.from({ length: pickedPerkCountInGroup }, (_, pickedPerkIndex) => (
                          <BuildStar
                            isPicked
                            key={`${availableGroupName}-picked-${pickedPerkIndex}`}
                          />
                        ))}
                      </span>
                    ) : null}
                    <span>{groupCounts.get(availableGroupName)}</span>
                  </span>
                </button>

                {isExpanded ? (
                <div className="subgroup-panel">
                  <p className="subgroup-heading">Perk groups</p>
                  <button
                    aria-label="Show all perk groups"
                    className={selectedTreeIds.length === 0 ? 'subgroup-chip is-active' : 'subgroup-chip'}
                    onClick={() => handleResetGroupTrees(availableGroupName)}
                    type="button"
                  >
                    <span className="subgroup-chip-start">All perk groups</span>
                    <span className="subgroup-chip-end">{groupCounts.get(availableGroupName)}</span>
                  </button>
                  {activeTreeOptions.map((treeOption) => {
                    const pickedPerkCountInTree = pickedPerkCountsByTree.get(treeOption.treeId) ?? 0
                    const isTreeHighlighted =
                      hoveredPerkGroupKey ===
                      getPerkGroupHoverKey({
                        categoryName: availableGroupName,
                        treeId: treeOption.treeId,
                      })
                    const treeChipClassName = [
                      'subgroup-chip',
                      selectedTreeIds.includes(treeOption.treeId) ? 'is-active' : '',
                      isTreeHighlighted ? 'is-highlighted' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')

                    return (
                      <button
                        aria-label={`Toggle perk group ${treeOption.treeName}`}
                        className={treeChipClassName}
                        key={treeOption.treeId}
                        onClick={() => handleTreeToggle(availableGroupName, treeOption.treeId)}
                        type="button"
                      >
                        <span className="subgroup-chip-start">
                          {renderHighlightedText(
                            treeOption.treeName,
                            query,
                            `${availableGroupName}-${treeOption.treeId}-tree`,
                          )}
                        </span>
                        <span className="subgroup-chip-end">
                          {pickedPerkCountInTree > 0 ? (
                            <span aria-hidden="true" className="group-chip-picked-stars">
                              {Array.from({ length: pickedPerkCountInTree }, (_, pickedPerkIndex) => (
                                <BuildStar isPicked key={`${treeOption.treeId}-picked-${pickedPerkIndex}`} />
                              ))}
                            </span>
                          ) : null}
                          <span>{treeOption.perkCount}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
                ) : null}
              </div>
            )
          })}
        </aside>

        <section className="results-panel" aria-label="Perk results">
          <div className="toolbar">
            <label className="search-field">
              <span className="visually-hidden">Search perks</span>
              <input
                aria-label="Search perks"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search perks, perk groups, backgrounds, scenarios, or enemy targets"
                type="search"
                value={query}
              />
            </label>
          </div>

          <div className="results-summary">
            <p>
              Showing <strong>{visiblePerks.length}</strong> perk
              {visiblePerks.length === 1 ? '' : 's'}
            </p>
            <p className="results-note">
              {selectedTreeCount > 0
                ? `Filtered to ${selectedCategoryCount} categor${selectedCategoryCount === 1 ? 'y' : 'ies'} and ${selectedTreeCount} perk group${selectedTreeCount === 1 ? '' : 's'}.`
                : selectedCategoryCount > 0
                  ? `Filtered to ${selectedCategoryCount} categor${selectedCategoryCount === 1 ? 'y' : 'ies'}.`
                : 'Ranked by exact perk names first, then perk group and category matches, then background, scenario, and full text.'}
            </p>
          </div>

          <div className="results-list" data-testid="results-list">
            {visiblePerks.length === 0 ? (
              <div className="empty-state">
                <h2>No perks found</h2>
                <p>Try a broader search, switch the category filters, or reset the tier filter.</p>
              </div>
            ) : (
              visiblePerks.map((perk) => {
                const isSelected = perk.id === selectedPerk?.id
                const pickedPerkOrder = pickedPerkOrderById.get(perk.id) ?? null
                const isPicked = pickedPerkOrder !== null
                const isHighlighted = hoveredPerkId === perk.id
                const previewParagraphs = getPerkPreviewParagraphs(perk)

                return (
                  <div
                    key={perk.id}
                    className={getPerkRowClassName({ isHighlighted, isPicked, isSelected })}
                    onBlurCapture={(event) => {
                      if (
                        event.relatedTarget instanceof Node &&
                        event.currentTarget.contains(event.relatedTarget)
                      ) {
                        return
                      }

                      handleCloseResultsPerkHover(perk.id)
                    }}
                    onFocusCapture={() => handleOpenResultsPerkHover(perk.id)}
                    onMouseEnter={() => handleOpenResultsPerkHover(perk.id)}
                    onMouseLeave={() => handleCloseResultsPerkHover(perk.id)}
                  >
                    <button
                      aria-label={`Inspect ${perk.perkName}`}
                      className="perk-row-select"
                      onClick={() => setSelectedPerkId(perk.id)}
                      type="button"
                    >
                      <div className="perk-row-layout">
                        {renderGameIcon({
                          className: 'perk-icon perk-icon-small',
                          iconPath: getPerkDisplayIconPath(perk),
                          label: `${perk.perkName} icon`,
                        })}
                        <div className="perk-row-copy">
                          <div className="perk-row-topline">
                            <span className="perk-name">
                              {renderHighlightedText(perk.perkName, query, `${perk.id}-name`)}
                            </span>
                            <div className="perk-row-badges">
                              <span className="tier-badge">
                                {getTierLabel(perk.placements[0]?.tier ?? null)}
                              </span>
                              {pickedPerkOrder !== null ? (
                                <span className="build-slot-badge">Build {pickedPerkOrder}</span>
                              ) : null}
                            </div>
                          </div>
                          <p className="perk-context">
                            {renderHighlightedText(
                              getPerkContextLabel(perk),
                              query,
                              `${perk.id}-context`,
                            )}
                          </p>
                          <div className="perk-preview">
                            {previewParagraphs.map((previewParagraph, previewParagraphIndex) => (
                              <p key={`${perk.id}-preview-${previewParagraphIndex}`}>
                                {renderHighlightedText(
                                  previewParagraph,
                                  query,
                                  `${perk.id}-preview-${previewParagraphIndex}`,
                                )}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                    <BuildToggleButton
                      isCompact
                      isPicked={isPicked}
                      onClick={() => handleTogglePerkPicked(perk.id)}
                      perkName={perk.perkName}
                      source="results"
                    />
                  </div>
                )
              })
            )}
          </div>
        </section>

        <section className="detail-panel" aria-live="polite">
          {selectedPerk === null ? (
            <div className="empty-state">
              <h2>Select a perk</h2>
              <p>Pick any entry from the list to inspect its placement, sources, and overlays.</p>
            </div>
          ) : (
            <>
              <div className="detail-header">
                <div className="detail-header-main">
                  {renderGameIcon({
                    className: 'perk-icon perk-icon-large',
                    iconPath: getPerkDisplayIconPath(selectedPerk),
                    label: `${selectedPerk.perkName} icon`,
                  })}
                  <div>
                    <p className="eyebrow">{selectedPerk.primaryGroupName}</p>
                    <h2>{selectedPerk.perkName}</h2>
                    <p className="detail-meta">{selectedPerk.groupNames.join(', ')}</p>
                  </div>
                </div>
                <div className="detail-header-actions">
                  <p className="detail-header-build-status">
                    {selectedPerkBuildSlot === null
                      ? 'Not in build'
                      : `Build slot ${selectedPerkBuildSlot}`}
                  </p>
                  <BuildToggleButton
                    isPicked={selectedPerkBuildSlot !== null}
                    onClick={() => handleTogglePerkPicked(selectedPerk.id)}
                    perkName={selectedPerk.perkName}
                    source="detail"
                  />
                </div>
              </div>

              <div className="detail-section">
                <h3>Details</h3>
                {selectedPerk.descriptionParagraphs.length > 0 ? (
                  selectedPerk.descriptionParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
                ) : (
                  <p>No perk description is available in the local strings file.</p>
                )}
              </div>

              <div className="detail-section">
                <h3>Perk group placement</h3>
                {selectedPerk.placements.length > 0 ? (
                  <ul className="detail-list">
                    {selectedPerk.placements.map((placement) => (
                      <li key={`${placement.categoryName}-${placement.treeId}-${placement.tier ?? 'none'}`}>
                        <div className="detail-item-main">
                          {renderGameIcon({
                            className: 'perk-icon perk-icon-tiny',
                            iconPath: placement.treeIconPath ?? getPerkDisplayIconPath(selectedPerk),
                            label: `${placement.treeName} perk group icon`,
                          })}
                          <div>
                            <strong>
                              {placement.categoryName} / {placement.treeName}
                            </strong>
                            {renderPlacementDescription(placement)}
                          </div>
                        </div>
                        <span className="detail-badge">{getTierLabel(placement.tier)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>This perk is defined locally but not assigned to a parsed perk group.</p>
                )}
              </div>

              {selectedPerk.favoredEnemyTargets && selectedPerk.favoredEnemyTargets.length > 0 ? (
                <div className="detail-section">
                  <h3>Favored enemy targets</h3>
                  <ul className="detail-list">
                    {selectedPerk.favoredEnemyTargets.map((favoredEnemyTarget) => (
                      <li key={favoredEnemyTarget.entityConstName}>
                        {renderFavoredEnemyTarget(favoredEnemyTarget)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="detail-section">
                <h3>Background sources</h3>
                {groupedBackgroundSources.length > 0 ? (
                  <ul className="detail-list">
                    {groupedBackgroundSources.map((backgroundSource) => (
                      <li
                        key={`${backgroundSource.categoryName}-${backgroundSource.treeId}-${backgroundSource.minimumTrees ?? 'none'}-${backgroundSource.chance ?? 'none'}`}
                      >
                        {renderBackgroundSource(backgroundSource)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No matching dynamic background pools were found for this perk.</p>
                )}
              </div>

              <div className="detail-section">
                <h3>Scenario overlays</h3>
                {selectedPerk.scenarioSources.length > 0 ? (
                  <ul className="detail-list">
                    {selectedPerk.scenarioSources.map((scenarioSource) => (
                      <li
                        key={`${scenarioSource.scenarioId}-${scenarioSource.grantType}-${scenarioSource.sourceMethodName}`}
                      >
                        <div>
                          <strong>{scenarioSource.scenarioName}</strong>
                          <p className="detail-support">{formatScenarioGrantLabel(scenarioSource)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No scenario grants or build-time overlays were found for this perk.</p>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}
