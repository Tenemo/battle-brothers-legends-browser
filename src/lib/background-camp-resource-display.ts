import type {
  LegendsBackgroundCampResourceModifier,
  LegendsBackgroundCampResourceModifierGroup,
} from '../types/legends-perks'

export const backgroundCampResourceModifierGroupLabels = {
  capacity: 'Company capacity',
  skill: 'Camp skills',
  terrain: 'Terrain movement',
} satisfies Record<LegendsBackgroundCampResourceModifierGroup, string>

export function formatBackgroundCampResourceModifierValue(
  modifier: Pick<LegendsBackgroundCampResourceModifier, 'value' | 'valueKind'>,
): string {
  const sign = modifier.value > 0 ? '+' : ''

  if (modifier.valueKind === 'flat') {
    return `${sign}${formatCompactNumber(modifier.value)}`
  }

  return `${sign}${formatCompactNumber(modifier.value * 100)}%`
}

function formatCompactNumber(value: number): string {
  if (Number.isInteger(value)) {
    return String(value)
  }

  return value.toFixed(2).replace(/0+$/u, '').replace(/\.$/u, '')
}
