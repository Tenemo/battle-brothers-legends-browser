import type { RankedBackgroundFit, RankedBackgroundFitPreview } from './background-fit'
import type { LegendsBackgroundAccessContextKind } from '../types/legends-perks'

type BackgroundAccessCandidate = Pick<
  RankedBackgroundFit | RankedBackgroundFitPreview,
  'backgroundAccessContexts' | 'hasRegularRecruitment'
>

export type BackgroundAccessPill = {
  kind: LegendsBackgroundAccessContextKind
  label: 'Event' | 'Origin'
  title: string
}

const backgroundAccessPillLabelsByKind = {
  event: 'Event',
  origin: 'Origin',
} satisfies Record<LegendsBackgroundAccessContextKind, BackgroundAccessPill['label']>

const backgroundAccessTitlePrefixesByKind = {
  event: 'Event access',
  origin: 'Origin access',
} satisfies Record<LegendsBackgroundAccessContextKind, string>

const backgroundAccessKindOrder: LegendsBackgroundAccessContextKind[] = ['origin', 'event']

export function getBackgroundSourceLabel(label: string): string {
  return label.replace(/^background\./, '').toLowerCase()
}

function getUniqueBackgroundAccessContextLabels(
  backgroundFit: BackgroundAccessCandidate,
  kind: LegendsBackgroundAccessContextKind,
): string[] {
  return [
    ...new Set(
      (backgroundFit.backgroundAccessContexts ?? [])
        .filter((context) => context.kind === kind)
        .map((context) => context.label),
    ),
  ].toSorted((leftLabel, rightLabel) => leftLabel.localeCompare(rightLabel))
}

export function getBackgroundAccessPills(
  backgroundFit: BackgroundAccessCandidate,
): BackgroundAccessPill[] {
  if (backgroundFit.hasRegularRecruitment ?? false) {
    return []
  }

  return backgroundAccessKindOrder.flatMap((kind) => {
    const contextLabels = getUniqueBackgroundAccessContextLabels(backgroundFit, kind)

    if (contextLabels.length === 0) {
      return []
    }

    return [
      {
        kind,
        label: backgroundAccessPillLabelsByKind[kind],
        title: `${backgroundAccessTitlePrefixesByKind[kind]}: ${contextLabels.join('; ')}. This background is not available from regular recruitment.`,
      },
    ]
  })
}

export function hasDisplayedBackgroundAccessKind(
  backgroundFit: BackgroundAccessCandidate,
  kind: LegendsBackgroundAccessContextKind,
): boolean {
  return getBackgroundAccessPills(backgroundFit).some((pill) => pill.kind === kind)
}

export function hasAnyDisplayedBackgroundAccess(backgroundFit: BackgroundAccessCandidate): boolean {
  return getBackgroundAccessPills(backgroundFit).length > 0
}

export function isOriginBackgroundFit(backgroundFit: BackgroundAccessCandidate): boolean {
  return hasDisplayedBackgroundAccessKind(backgroundFit, 'origin')
}

export function isEventBackgroundFit(backgroundFit: BackgroundAccessCandidate): boolean {
  return hasDisplayedBackgroundAccessKind(backgroundFit, 'event')
}

export function getOriginBackgroundPillLabel(
  backgroundFit: BackgroundAccessCandidate,
): string | null {
  return isOriginBackgroundFit(backgroundFit) ? backgroundAccessPillLabelsByKind.origin : null
}
