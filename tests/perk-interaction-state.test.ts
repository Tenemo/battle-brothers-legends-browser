import { describe, expect, test } from 'vitest'
import {
  getBuildPerkHighlightPerkGroupKeys,
  getCategoryOnlyEmphasisNames,
  getEmphasizedCategoryNames,
  getEmphasizedPerkGroupKeys,
  getSelectedPerkGroupKeys,
} from '../src/lib/use-perk-interaction-state'

function getSortedSetValues(values: Set<string>): string[] {
  return [...values].toSorted()
}

describe('perk interaction state selectors', () => {
  test('builds stable perk group keys for selected groups across categories', () => {
    expect(
      getSortedSetValues(
        getSelectedPerkGroupKeys({
          Magic: ['DeadeyeTree'],
          Other: [],
          Traits: ['CalmTree', 'LargeTree'],
        }),
      ),
    ).toEqual(['Magic::DeadeyeTree', 'Traits::CalmTree', 'Traits::LargeTree'])
  })

  test('keeps category emphasis only for categories without scoped group selections', () => {
    expect(
      getSortedSetValues(
        getCategoryOnlyEmphasisNames({
          selectedCategoryNames: ['Traits', 'Magic', 'Enemy', 'Weapon'],
          selectedPerkGroupIdsByCategory: {
            Enemy: [],
            Magic: ['DeadeyeTree'],
            Traits: ['CalmTree'],
          },
        }),
      ),
    ).toEqual(['Enemy', 'Weapon'])
  })

  test('combines durable category selections with the transient hovered category', () => {
    expect(
      getSortedSetValues(
        getEmphasizedCategoryNames({
          hoveredCategoryName: 'Weapon',
          selectedCategoryNames: ['Traits', 'Magic', 'Enemy'],
          selectedPerkGroupIdsByCategory: {
            Enemy: [],
            Magic: ['DeadeyeTree'],
            Traits: ['CalmTree'],
          },
        }),
      ),
    ).toEqual(['Enemy', 'Weapon'])
  })

  test('combines durable group selections with the transient hovered group', () => {
    expect(
      getSortedSetValues(
        getEmphasizedPerkGroupKeys({
          hoveredPerkGroupReference: {
            categoryName: 'Weapon',
            perkGroupId: 'AxeTree',
          },
          selectedPerkGroupIdsByCategory: {
            Magic: ['DeadeyeTree'],
            Traits: ['CalmTree', 'LargeTree'],
          },
        }),
      ),
    ).toEqual(['Magic::DeadeyeTree', 'Traits::CalmTree', 'Traits::LargeTree', 'Weapon::AxeTree'])
  })

  test('keeps build perk hover groups from highlighting peer build perks', () => {
    expect(
      getSortedSetValues(
        getBuildPerkHighlightPerkGroupKeys({
          hoveredPerkGroupReference: {
            categoryName: 'Weapon',
            perkGroupId: 'AxeTree',
          },
          hoveredPerkGroupReferenceSource: 'build-perk',
          selectedPerkGroupIdsByCategory: {
            Magic: ['DeadeyeTree'],
            Weapon: ['SwordTree'],
          },
        }),
      ),
    ).toEqual(['Magic::DeadeyeTree', 'Weapon::SwordTree'])
  })

  test('uses directly hovered groups to highlight matching build perks', () => {
    expect(
      getSortedSetValues(
        getBuildPerkHighlightPerkGroupKeys({
          hoveredPerkGroupReference: {
            categoryName: 'Weapon',
            perkGroupId: 'AxeTree',
          },
          hoveredPerkGroupReferenceSource: 'perk-group',
          selectedPerkGroupIdsByCategory: {
            Magic: ['DeadeyeTree'],
          },
        }),
      ),
    ).toEqual(['Magic::DeadeyeTree', 'Weapon::AxeTree'])
  })
})
