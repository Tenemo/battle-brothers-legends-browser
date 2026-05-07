import type {
  LegendsBackgroundFitBackgroundDefinition,
  LegendsBackgroundVeteranPerkLevelIntervalContext,
} from '../types/legends-perks'

export const baselineBackgroundVeteranPerkLevelIntervals = [2, 3, 4] as const

type BackgroundVeteranPerkLevelIntervalCandidate = Pick<
  LegendsBackgroundFitBackgroundDefinition,
  'veteranPerkLevelInterval'
> &
  Partial<
    Pick<
      LegendsBackgroundFitBackgroundDefinition,
      'veteranPerkLevelIntervalContexts' | 'veteranPerkLevelIntervals'
    >
  >

type BackgroundVeteranPerkLevelIntervalBadge = {
  interval: number
  label: string
  title: string
}

function isValidBackgroundVeteranPerkLevelInterval(interval: number): boolean {
  return Number.isInteger(interval) && interval > 0
}

function sortBackgroundVeteranPerkLevelIntervals(intervals: Iterable<number>): number[] {
  return [...new Set([...intervals].filter(isValidBackgroundVeteranPerkLevelInterval))].toSorted(
    (leftInterval, rightInterval) => leftInterval - rightInterval,
  )
}

function getBackgroundVeteranPerkLevelIntervalContexts(
  backgroundDefinition: BackgroundVeteranPerkLevelIntervalCandidate,
): LegendsBackgroundVeteranPerkLevelIntervalContext[] {
  if (backgroundDefinition.veteranPerkLevelIntervalContexts?.length) {
    return backgroundDefinition.veteranPerkLevelIntervalContexts
  }

  return [
    {
      interval: backgroundDefinition.veteranPerkLevelInterval,
      kind: 'native',
      label: 'Native background',
    },
  ]
}

export function getBackgroundVeteranPerkLevelIntervals(
  backgroundDefinition: BackgroundVeteranPerkLevelIntervalCandidate,
): number[] {
  if (backgroundDefinition.veteranPerkLevelIntervals?.length) {
    return sortBackgroundVeteranPerkLevelIntervals(backgroundDefinition.veteranPerkLevelIntervals)
  }

  return sortBackgroundVeteranPerkLevelIntervals(
    getBackgroundVeteranPerkLevelIntervalContexts(backgroundDefinition).map(
      (context) => context.interval,
    ),
  )
}

export function getAvailableBackgroundVeteranPerkLevelIntervals(
  backgroundDefinitions: BackgroundVeteranPerkLevelIntervalCandidate[],
): number[] {
  return [
    ...new Set([
      ...baselineBackgroundVeteranPerkLevelIntervals,
      ...backgroundDefinitions.flatMap((backgroundDefinition) =>
        getBackgroundVeteranPerkLevelIntervals(backgroundDefinition),
      ),
    ]),
  ].toSorted((leftInterval, rightInterval) => leftInterval - rightInterval)
}

export function normalizeBackgroundVeteranPerkLevelIntervals(
  intervals: readonly number[],
  availableIntervals: readonly number[],
): number[] {
  const intervalSet = new Set(intervals)

  return availableIntervals.filter((interval) => intervalSet.has(interval))
}

export function areBackgroundVeteranPerkLevelIntervalsDefault(
  intervals: readonly number[],
  availableIntervals: readonly number[],
): boolean {
  const normalizedIntervals = normalizeBackgroundVeteranPerkLevelIntervals(
    intervals,
    availableIntervals,
  )

  return (
    normalizedIntervals.length === availableIntervals.length &&
    normalizedIntervals.every((interval, index) => interval === availableIntervals[index])
  )
}

export function formatBackgroundVeteranPerkLevelIntervalBadge(interval: number): string {
  return `1 / ${interval}`
}

export function formatBackgroundVeteranPerkLevelIntervalFilterLabel(interval: number): string {
  return `Perk every ${interval} veteran levels`
}

function formatBackgroundVeteranPerkLevelIntervalGainSentence(interval: number): string {
  return `The character gains 1 perk point every ${interval} veteran levels after level 12. The first veteran perk point is at level ${12 + interval}.`
}

function formatNativeBackgroundVeteranPerkLevelIntervalTitle(interval: number): string {
  const label = formatBackgroundVeteranPerkLevelIntervalBadge(interval)
  const reason =
    interval === 4
      ? `${label} is the default Legends veteran perk interval for this background.`
      : `${label} is set by this background's game script.`

  return `${reason} ${formatBackgroundVeteranPerkLevelIntervalGainSentence(interval)}`
}

function formatOriginBackgroundVeteranPerkLevelIntervalTitle({
  interval,
  originNames,
}: {
  interval: number
  originNames: string[]
}): string {
  const label = formatBackgroundVeteranPerkLevelIntervalBadge(interval)
  const originReason =
    originNames.length === 1
      ? `${label} is set by the ${originNames[0]} origin for starting characters with this background.`
      : `${label} is set by these origins for starting characters with this background: ${originNames.join(
          ', ',
        )}.`

  return `${originReason} ${formatBackgroundVeteranPerkLevelIntervalGainSentence(interval)}`
}

export function getBackgroundVeteranPerkLevelIntervalBadges(
  backgroundDefinition: BackgroundVeteranPerkLevelIntervalCandidate,
): BackgroundVeteranPerkLevelIntervalBadge[] {
  const contextsByInterval = new Map<number, LegendsBackgroundVeteranPerkLevelIntervalContext[]>()

  for (const context of getBackgroundVeteranPerkLevelIntervalContexts(backgroundDefinition)) {
    if (!isValidBackgroundVeteranPerkLevelInterval(context.interval)) {
      continue
    }

    contextsByInterval.set(context.interval, [
      ...(contextsByInterval.get(context.interval) ?? []),
      context,
    ])
  }

  return [...contextsByInterval.entries()]
    .toSorted(([leftInterval], [rightInterval]) => leftInterval - rightInterval)
    .map(([interval, contexts]) => {
      const nativeContext = contexts.find((context) => context.kind === 'native') ?? null
      const originNames = [
        ...new Set(
          contexts
            .filter((context) => context.kind === 'origin')
            .map((context) => context.scenarioName ?? context.label)
            .filter((originName) => originName.length > 0),
        ),
      ].toSorted((leftName, rightName) => leftName.localeCompare(rightName))
      const label = formatBackgroundVeteranPerkLevelIntervalBadge(interval)
      const title =
        originNames.length > 0 && nativeContext === null
          ? formatOriginBackgroundVeteranPerkLevelIntervalTitle({
              interval,
              originNames,
            })
          : nativeContext !== null && originNames.length > 0
            ? `${formatNativeBackgroundVeteranPerkLevelIntervalTitle(
                interval,
              )} Also set by these origins for starting characters with this background: ${originNames.join(
                ', ',
              )}.`
            : formatNativeBackgroundVeteranPerkLevelIntervalTitle(interval)

      return {
        interval,
        label,
        title,
      }
    })
}
