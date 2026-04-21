import { describe, expect, test } from 'vitest'
import {
  getTechnicalNameLabel,
  technicalNameMatchesDisplayName,
} from '../src/lib/technical-name-display'

describe('technical name display', () => {
  test('uses exact labels generated from the local reference data', () => {
    expect(getTechnicalNameLabel('AxeTree')).toBe('Axe')
    expect(getTechnicalNameLabel('LegendFavouredEnemyBeast')).toBe('Favoured Enemy - Beasts')
    expect(getTechnicalNameLabel('LegendBear')).toBe('Bear')
  })

  test('does not guess labels for technical names that do not have a local mapping', () => {
    expect(getTechnicalNameLabel('onBuildPerkTree')).toBeNull()
    expect(getTechnicalNameLabel('WeaponAxe')).toBeNull()
  })

  test('can detect when a technical name resolves to the same visible label', () => {
    expect(technicalNameMatchesDisplayName('LegendBear', 'Bear')).toBe(true)
    expect(technicalNameMatchesDisplayName('AxeTree', 'Axe')).toBe(true)
    expect(technicalNameMatchesDisplayName('onBuildPerkTree', 'Build-time perk tree')).toBe(false)
    expect(technicalNameMatchesDisplayName('LegendBear', 'Direwolf')).toBe(false)
  })
})
