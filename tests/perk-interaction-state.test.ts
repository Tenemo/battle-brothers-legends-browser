import { describe, expect, test } from 'vitest'
import {
  getCategoryOnlyEmphasisNames,
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
})
