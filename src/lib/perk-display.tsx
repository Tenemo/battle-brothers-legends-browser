import type { CSSProperties, ReactNode } from 'react'
import type { BackgroundFitMatch, RankedBackgroundFit } from './background-fit'
import { getTierLabel } from './perk-search'
import type {
  LegendsPerkBackgroundSource,
  LegendsPerkRecord,
  LegendsPerkScenarioSource,
} from '../types/legends-perks'

export type GroupedBackgroundSource = {
  backgroundNames: string[]
  categoryName: string
  chance: number | null
  minimumPerkGroups: number | null
  perkGroupId: string
  perkGroupName: string
}

type PerkGroupHoverTarget = {
  categoryName: string
  perkGroupId: string
}

export type TooltipAnchorRectangle = {
  bottom: number
  left: number
  right: number
  top: number
  width: number
}

export function normalizeSearchPhrase(value: string): string {
  return value.trim().toLowerCase()
}

export function getSearchMatchPriority(text: string, normalizedSearchPhrase: string): number {
  if (normalizedSearchPhrase.length === 0) {
    return 2
  }

  const normalizedText = text.toLowerCase()

  if (normalizedText === normalizedSearchPhrase) {
    return 0
  }

  if (normalizedText.includes(normalizedSearchPhrase)) {
    return 1
  }

  return 2
}

export function renderHighlightedText(text: string, query: string, keyPrefix: string): ReactNode {
  const trimmedQuery = query.trim()
  const normalizedSearchPhrase = normalizeSearchPhrase(trimmedQuery)

  if (trimmedQuery.length === 0 || normalizedSearchPhrase.length === 0) {
    return text
  }

  const normalizedText = text.toLowerCase()
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

export function groupBackgroundSources(
  backgroundSources: LegendsPerkBackgroundSource[],
): GroupedBackgroundSource[] {
  const groupedBackgroundSources = new Map<string, GroupedBackgroundSource>()

  for (const backgroundSource of backgroundSources) {
    const key = [
      backgroundSource.categoryName,
      backgroundSource.perkGroupId,
      backgroundSource.perkGroupName,
      backgroundSource.minimumPerkGroups ?? 'none',
      backgroundSource.chance ?? 'none',
    ].join('::')

    if (!groupedBackgroundSources.has(key)) {
      groupedBackgroundSources.set(key, {
        backgroundNames: [],
        categoryName: backgroundSource.categoryName,
        chance: backgroundSource.chance,
        minimumPerkGroups: backgroundSource.minimumPerkGroups,
        perkGroupId: backgroundSource.perkGroupId,
        perkGroupName: backgroundSource.perkGroupName,
      })
    }

    groupedBackgroundSources.get(key)?.backgroundNames.push(backgroundSource.backgroundName)
  }

  return [...groupedBackgroundSources.values()]
}

export function getPerkContextLabel(perk: LegendsPerkRecord): string {
  const primaryPlacement = perk.placements[0]

  if (!primaryPlacement) {
    return `${perk.primaryCategoryName} / No perk group placement`
  }

  const additionalPlacementsCount = Math.max(0, perk.placements.length - 1)
  const tierLabel = getTierLabel(primaryPlacement.tier)
  const placementLabel =
    additionalPlacementsCount > 0 ? `${tierLabel} + ${additionalPlacementsCount} more` : tierLabel

  return `${perk.primaryCategoryName} / ${primaryPlacement.perkGroupName} / ${placementLabel}`
}

export function getPerkDisplayIconPath(perk: LegendsPerkRecord): string | null {
  return perk.iconPath ?? perk.placements[0]?.perkGroupIconPath ?? null
}

export function formatChanceLabel(chance: number | null): string {
  if (chance === null) {
    return 'No chance override'
  }

  return `${Math.round(chance * 100)}% chance`
}

export function formatMinimumPerkGroupsLabel(minimumPerkGroups: number | null): string {
  if (minimumPerkGroups === null) {
    return 'No minimum override'
  }

  return `Minimum ${minimumPerkGroups}`
}

export function formatScenarioGrantLabel(scenarioSource: LegendsPerkScenarioSource): string {
  if (scenarioSource.grantType === 'direct') {
    return 'Direct grant'
  }

  return `Random pool: ${scenarioSource.candidatePerkNames.join(', ')}`
}

export function formatPickedPerkCountLabel(perkCount: number): string {
  return `${perkCount} perk${perkCount === 1 ? '' : 's'}`
}

export function formatBackgroundFitProbabilityLabel(probability: number): string {
  const percentage = Math.round(probability * 1000) / 10

  return `${Number.isInteger(percentage) ? percentage.toFixed(0) : percentage.toFixed(1)}%`
}

export function formatBackgroundFitScoreLabel(score: number): string {
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

  if (
    /^legend_.+_commander(?:_op)?$/.test(sourceLabel) ||
    /^.+_legend_.+_commander$/.test(sourceLabel)
  ) {
    return 'origin commander'
  }

  return sourceLabel
    .replace(/^legend_legion_/, 'legion_')
    .replace(/^legend_/, '')
    .replaceAll('_', ' ')
}

function normalizeBackgroundLabelForComparison(label: string): string {
  return label.trim().toLowerCase()
}

export function getVisibleBackgroundDisambiguatorLabel(
  backgroundFit: RankedBackgroundFit,
): string | null {
  if (backgroundFit.disambiguator === null) {
    return null
  }

  const disambiguatorLabel = formatBackgroundDisambiguatorLabel(backgroundFit.disambiguator)

  return normalizeBackgroundLabelForComparison(disambiguatorLabel) ===
    normalizeBackgroundLabelForComparison(backgroundFit.backgroundName)
    ? null
    : disambiguatorLabel
}

export function getBackgroundFitKey(backgroundFit: RankedBackgroundFit): string {
  return `${backgroundFit.backgroundId}::${backgroundFit.sourceFilePath}`
}

export function getBackgroundFitSearchText(backgroundFit: RankedBackgroundFit): string {
  const sourceFileName =
    backgroundFit.sourceFilePath.split('/').at(-1) ?? backgroundFit.sourceFilePath
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
    .filter(
      (searchPart): searchPart is string => typeof searchPart === 'string' && searchPart.length > 0,
    )
    .join(' ')
    .toLowerCase()
}

export function getCoveredPickedPerkNames(matches: BackgroundFitMatch[]): string[] {
  return [...new Set(matches.flatMap((match) => match.pickedPerkNames))]
}

export function formatBackgroundFitPickablePerksLabel(
  coveredPickedPerkCount: number,
  pickedPerkCount: number,
): string {
  return `Up to ${coveredPickedPerkCount}/${pickedPerkCount} perks pickable`
}

export function formatBackgroundFitGuaranteedPerksLabel(
  guaranteedCoveredPickedPerkCount: number,
  pickedPerkCount: number,
): string {
  return `Guaranteed ${guaranteedCoveredPickedPerkCount}/${pickedPerkCount} perks pickable`
}

export function formatBackgroundFitMatchedPerkGroupsLabel(
  matchedPerkGroupCount: number,
  supportedBuildTargetPerkGroupCount: number,
): string {
  return `${matchedPerkGroupCount}/${supportedBuildTargetPerkGroupCount} matched perk group${
    supportedBuildTargetPerkGroupCount === 1 ? '' : 's'
  }`
}

export function formatBackgroundFitMaximumTotalPerkGroupsLabel(
  maximumTotalPerkGroupCount: number,
): string {
  return `Maximum ${maximumTotalPerkGroupCount} total perk groups`
}

export function getPerkRowClassName({
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

export function getPerkGroupHoverKey({ categoryName, perkGroupId }: PerkGroupHoverTarget): string {
  return `${categoryName}::${perkGroupId}`
}

function getGameIconUrl(iconPath: string | null): string | null {
  return iconPath ? `/game-icons/${iconPath}` : null
}

export function renderGameIcon({
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

export function getAnchoredTooltipStyle(anchorRectangle: TooltipAnchorRectangle): CSSProperties {
  if (typeof window === 'undefined') {
    return {}
  }

  const viewportPadding = 12
  const tooltipMaximumWidth = Math.min(360, window.innerWidth - viewportPadding * 2)
  const left = Math.max(
    viewportPadding,
    Math.min(anchorRectangle.left, window.innerWidth - tooltipMaximumWidth - viewportPadding),
  )

  return {
    left: `${left}px`,
    maxWidth: `${tooltipMaximumWidth}px`,
    top: `${anchorRectangle.bottom + 8}px`,
  }
}
