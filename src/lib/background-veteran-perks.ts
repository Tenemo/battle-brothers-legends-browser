import type { LegendsBackgroundFitBackgroundDefinition } from '../types/legends-perks'

export const baselineBackgroundVeteranPerkLevelIntervals = [2, 3, 4] as const

export function getAvailableBackgroundVeteranPerkLevelIntervals(
  backgroundDefinitions: Pick<
    LegendsBackgroundFitBackgroundDefinition,
    'veteranPerkLevelInterval'
  >[],
): number[] {
  return [
    ...new Set([
      ...baselineBackgroundVeteranPerkLevelIntervals,
      ...backgroundDefinitions.flatMap((backgroundDefinition) =>
        Number.isInteger(backgroundDefinition.veteranPerkLevelInterval) &&
        backgroundDefinition.veteranPerkLevelInterval > 0
          ? [backgroundDefinition.veteranPerkLevelInterval]
          : [],
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

export function formatBackgroundVeteranPerkLevelIntervalTitle(interval: number): string {
  return `1 / ${interval} means this background gains 1 perk point every ${interval} veteran levels after level 12. The first veteran perk point is at level ${12 + interval}.`
}
