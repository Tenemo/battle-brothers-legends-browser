import { describe, expect, test } from 'vitest'
import { formatBackgroundCampResourceModifierValue } from '../src/lib/background-camp-resource-display'
import type { LegendsBackgroundCampResourceModifier } from '../src/types/legends-perks'

function createModifier(
  value: number,
  valueKind: LegendsBackgroundCampResourceModifier['valueKind'],
): LegendsBackgroundCampResourceModifier {
  return {
    group: valueKind === 'flat' ? 'capacity' : 'skill',
    label: 'Test modifier',
    modifierKey: 'Test',
    value,
    valueKind,
  }
}

describe('background camp resource display', () => {
  test('formats flat and percent modifier values without hiding signs or decimals', () => {
    expect(formatBackgroundCampResourceModifierValue(createModifier(13, 'flat'))).toBe('+13')
    expect(formatBackgroundCampResourceModifierValue(createModifier(-5, 'flat'))).toBe('-5')
    expect(formatBackgroundCampResourceModifierValue(createModifier(0.3, 'percent'))).toBe('+30%')
    expect(formatBackgroundCampResourceModifierValue(createModifier(0.005, 'percent'))).toBe(
      '+0.5%',
    )
    expect(formatBackgroundCampResourceModifierValue(createModifier(-0.05, 'percent'))).toBe('-5%')
  })
})
