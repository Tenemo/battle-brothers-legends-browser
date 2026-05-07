import { describe, expect, test } from 'vitest'
import legendsBackgroundFitDatasetJson from '../src/data/legends-background-fit.json'
import {
  getBackgroundAccessPills,
  getOriginBackgroundPillLabel,
  isEventBackgroundFit,
  isOriginBackgroundFit,
} from '../src/lib/background-origin'
import type {
  LegendsBackgroundFitBackgroundDefinition,
  LegendsBackgroundFitDataset,
} from '../src/types/legends-perks'

const legendsBackgroundFitDataset = legendsBackgroundFitDatasetJson as LegendsBackgroundFitDataset

function getBackground(
  backgroundId: string,
  sourceFileName?: string,
): LegendsBackgroundFitBackgroundDefinition {
  const background = legendsBackgroundFitDataset.backgroundFitBackgrounds.find(
    (candidateBackground) =>
      candidateBackground.backgroundId === backgroundId &&
      (sourceFileName === undefined || candidateBackground.sourceFilePath.endsWith(sourceFileName)),
  )

  expect(background).toBeDefined()

  return background as LegendsBackgroundFitBackgroundDefinition
}

function getPillLabels(background: LegendsBackgroundFitBackgroundDefinition): string[] {
  return getBackgroundAccessPills(background).map((pill) => pill.label)
}

describe('background access source pills', () => {
  test('suppresses origin and event pills for regular random recruitment backgrounds', () => {
    const monk = getBackground('background.monk')

    expect(monk.hasRegularRecruitment).toBe(true)
    expect(monk.backgroundAccessContexts.map((context) => context.kind)).toEqual(
      expect.arrayContaining(['event', 'origin']),
    )
    expect(getBackgroundAccessPills(monk)).toEqual([])
    expect(isOriginBackgroundFit(monk)).toBe(false)
    expect(isEventBackgroundFit(monk)).toBe(false)
  })

  test('shows both source pills when a background is available from origins and events', () => {
    const berserker = getBackground('background.legend_berserker')
    const berserkerPills = getBackgroundAccessPills(berserker)

    expect(getPillLabels(berserker)).toEqual(['Origin', 'Event'])
    expect(berserkerPills.find((pill) => pill.kind === 'origin')?.title).toContain(
      'Berserker hiring roster',
    )
    expect(berserkerPills.find((pill) => pill.kind === 'event')?.title).toContain(
      'Facing Justice (Legendary) contract',
    )
    expect(berserkerPills.find((pill) => pill.kind === 'event')?.title).toContain(
      'Razed settlement situation',
    )

    const holyCrusader = getBackground('background.legend_crusader')
    const holyCrusaderPills = getBackgroundAccessPills(holyCrusader)

    expect(getPillLabels(holyCrusader)).toEqual(['Origin', 'Event'])
    expect(holyCrusaderPills.find((pill) => pill.kind === 'origin')?.title).toContain(
      'Crusader starting roster',
    )
    expect(holyCrusaderPills.find((pill) => pill.kind === 'event')?.title).toContain(
      'Undead crusader event',
    )
  })

  test('keeps origin-only and event-only backgrounds distinct', () => {
    const battleSister = getBackground('background.legend_battle_sister')
    const monkTurnedFlagellant = getBackground('background.monk_turned_flagellant')

    expect(getPillLabels(battleSister)).toEqual(['Origin'])
    expect(getOriginBackgroundPillLabel(battleSister)).toBe('Origin')
    expect(isEventBackgroundFit(battleSister)).toBe(false)
    expect(getBackgroundAccessPills(battleSister)[0]?.title).toContain('Sisterhood starting roster')

    expect(getPillLabels(monkTurnedFlagellant)).toEqual(['Event'])
    expect(isOriginBackgroundFit(monkTurnedFlagellant)).toBe(false)
    expect(isEventBackgroundFit(monkTurnedFlagellant)).toBe(true)
    expect(getBackgroundAccessPills(monkTurnedFlagellant)[0]?.title).toContain(
      'Flagellant vs monk event',
    )
  })

  test('adds source pills for Vala and Druid event recruitment without relying on names', () => {
    const vala = getBackground('background.legend_vala')
    const druid = getBackground('background.legend_druid')

    expect(getPillLabels(vala)).toEqual(['Origin', 'Event'])
    expect(getBackgroundAccessPills(vala).find((pill) => pill.kind === 'event')?.title).toContain(
      'From the bushes... event',
    )

    expect(getPillLabels(druid)).toEqual(['Origin', 'Event'])
    expect(getBackgroundAccessPills(druid).find((pill) => pill.kind === 'event')?.title).toContain(
      'Legend recruitment druid camp encounter',
    )
  })

  test('gives every displayed source pill a native browser tooltip reason', () => {
    const displayedAccessPills = legendsBackgroundFitDataset.backgroundFitBackgrounds.flatMap(
      (background) => getBackgroundAccessPills(background),
    )

    expect(displayedAccessPills.length).toBeGreaterThan(0)
    expect(displayedAccessPills.every((pill) => pill.title.length > pill.label.length)).toBe(true)
    expect(displayedAccessPills.every((pill) => pill.title.includes('regular recruitment'))).toBe(
      true,
    )
  })
})
