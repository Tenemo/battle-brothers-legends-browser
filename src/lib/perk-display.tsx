import type { CSSProperties, ReactNode } from 'react'
import type { RankedBackgroundFit } from './background-fit'
import { getBackgroundSourceLabel, getOriginBackgroundPillLabel } from './background-origin'
import { getCategoryPriority } from './dynamic-background-categories'
import type {
  LegendsPerkBackgroundSource,
  LegendsPerkRecord,
  LegendsPerkScenarioSource,
} from '../types/legends-perks'

export type GroupedBackgroundSource = {
  backgroundNames: string[]
  categoryName: string
  probability: number
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
  getBackgroundSourceProbability: (backgroundSource: LegendsPerkBackgroundSource) => number = () =>
    1,
): GroupedBackgroundSource[] {
  const groupedBackgroundSources = new Map<string, GroupedBackgroundSource>()

  for (const backgroundSource of backgroundSources) {
    const probability = clampProbability(getBackgroundSourceProbability(backgroundSource))
    const key = [
      backgroundSource.categoryName,
      backgroundSource.perkGroupId,
      backgroundSource.perkGroupName,
      probability,
    ].join('::')

    if (!groupedBackgroundSources.has(key)) {
      groupedBackgroundSources.set(key, {
        backgroundNames: [],
        categoryName: backgroundSource.categoryName,
        probability,
        perkGroupId: backgroundSource.perkGroupId,
        perkGroupName: backgroundSource.perkGroupName,
      })
    }

    groupedBackgroundSources.get(key)?.backgroundNames.push(backgroundSource.backgroundName)
  }

  return [...groupedBackgroundSources.values()].toSorted(compareGroupedBackgroundSources)
}

function compareGroupedBackgroundSources(
  leftSource: GroupedBackgroundSource,
  rightSource: GroupedBackgroundSource,
): number {
  return (
    rightSource.probability - leftSource.probability ||
    getCategoryPriority(leftSource.categoryName) - getCategoryPriority(rightSource.categoryName) ||
    leftSource.perkGroupName.localeCompare(rightSource.perkGroupName) ||
    leftSource.backgroundNames.join(', ').localeCompare(rightSource.backgroundNames.join(', ')) ||
    leftSource.perkGroupId.localeCompare(rightSource.perkGroupId)
  )
}

export function getPerkDisplayIconPath(perk: LegendsPerkRecord): string | null {
  return perk.iconPath ?? perk.placements[0]?.perkGroupIconPath ?? null
}

function clampProbability(probability: number): number {
  return Math.max(0, Math.min(1, probability))
}

function formatProbabilityPercent(probability: number): string {
  const clampedProbability = clampProbability(probability)
  const percentage = clampedProbability * 100

  if (percentage === 0) {
    return '0%'
  }

  if (percentage > 0 && percentage < 0.01) {
    return '<0.01%'
  }

  const decimalPlaceOptions = percentage < 1 ? [2, 3, 4] : [1, 2, 3, 4]

  for (const decimalPlaces of decimalPlaceOptions) {
    const fixedPercentage = percentage.toFixed(decimalPlaces)

    if (clampedProbability >= 1 || Number(fixedPercentage) < 100) {
      return `${fixedPercentage.replace(/\.?0+$/u, '')}%`
    }
  }

  return '<100%'
}

export function formatBackgroundSourceProbabilityLabel(probability: number): string {
  if (probability >= 1) {
    return 'Guaranteed'
  }

  return `${formatProbabilityPercent(probability)} chance`
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

function formatBackgroundFitScoreLabel(score: number): string {
  const roundedScore = Math.round(score * 10) / 10

  return Number.isInteger(roundedScore) ? roundedScore.toFixed(0) : roundedScore.toFixed(1)
}

function formatBackgroundDisambiguatorLabel(disambiguator: string): string {
  const sourceLabel = getBackgroundSourceLabel(disambiguator)
  const companionMatch = /^companion_(1h|2h|ranged)$/.exec(sourceLabel)
  const originCompanionMatch = /^legend_companion_(melee|ranged)$/.exec(sourceLabel)

  if (companionMatch) {
    return companionMatch[1] === '1h'
      ? 'Starting: Shield'
      : companionMatch[1] === '2h'
        ? 'Starting: Two-handed'
        : 'Starting: Ranged'
  }

  if (originCompanionMatch) {
    return originCompanionMatch[1] === 'melee' ? 'Origin: Melee' : 'Origin: Ranged'
  }

  if (
    /^legend_.+_commander(?:_op)?$/.test(sourceLabel) ||
    /^.+_legend_.+_commander$/.test(sourceLabel)
  ) {
    return 'Origin: Commander'
  }

  const variantLabel = sourceLabel
    .replace(/^legend_legion_/, 'legion_')
    .replace(/^legend_/, '')
    .replaceAll('_', ' ')

  return `Variant: ${variantLabel.charAt(0).toUpperCase()}${variantLabel.slice(1)}`
}

function normalizeBackgroundLabelForComparison(label: string): string {
  return label.trim().toLowerCase()
}

function getComparableBackgroundDisambiguatorLabel(disambiguatorLabel: string): string {
  return disambiguatorLabel.replace(/^Variant:\s*/u, '')
}

function getVisibleBackgroundDisambiguatorLabel(backgroundFit: RankedBackgroundFit): string | null {
  if (backgroundFit.disambiguator === null) {
    return null
  }

  const disambiguatorLabel = formatBackgroundDisambiguatorLabel(backgroundFit.disambiguator)

  return normalizeBackgroundLabelForComparison(
    getComparableBackgroundDisambiguatorLabel(disambiguatorLabel),
  ) === normalizeBackgroundLabelForComparison(backgroundFit.backgroundName)
    ? null
    : disambiguatorLabel
}

export function getVisibleBackgroundPillLabel(backgroundFit: RankedBackgroundFit): string | null {
  // Unique origin backgrounds are not duplicate-name disambiguation cases, but still need a
  // visible source label so the origin filter is understandable from the list.
  return (
    getOriginBackgroundPillLabel(backgroundFit) ??
    getVisibleBackgroundDisambiguatorLabel(backgroundFit)
  )
}

export function getBackgroundFitKey(backgroundFit: RankedBackgroundFit): string {
  return `${backgroundFit.backgroundId}::${backgroundFit.sourceFilePath}`
}

export function getBackgroundFitSearchText(backgroundFit: RankedBackgroundFit): string {
  const sourceFileName =
    backgroundFit.sourceFilePath.split('/').at(-1) ?? backgroundFit.sourceFilePath
  const visibleBackgroundPillLabel = getVisibleBackgroundPillLabel(backgroundFit)
  const searchParts = [
    backgroundFit.backgroundName,
    backgroundFit.disambiguator,
    backgroundFit.disambiguator === null
      ? null
      : formatBackgroundDisambiguatorLabel(backgroundFit.disambiguator),
    visibleBackgroundPillLabel,
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

export function formatBackgroundFitPickablePerksLabel(
  coveredPickedPerkCount: number,
  pickedPerkCount: number,
): string {
  return `Up to ${coveredPickedPerkCount}/${pickedPerkCount} perks pickable`
}

export function formatBackgroundFitExpectedBuildPerksLabel(
  expectedCoveredPickedPerkCount: number,
  pickedPerkCount: number,
): string {
  return `Expected ${formatBackgroundFitScoreLabel(
    expectedCoveredPickedPerkCount,
  )}/${pickedPerkCount} perks pickable`
}

export function formatBackgroundFitGuaranteedPerksLabel(
  guaranteedCoveredPickedPerkCount: number,
  pickedPerkCount: number,
): string {
  return `Guaranteed ${guaranteedCoveredPickedPerkCount}/${pickedPerkCount} perks pickable`
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
    top: `${anchorRectangle.bottom}px`,
  }
}
