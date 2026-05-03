import type { ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { PerkResults } from '../src/components/PerkResults'

type PerkResultsProps = ComponentProps<typeof PerkResults>

function createPerkResults(overrides: Partial<PerkResultsProps> = {}) {
  return (
    <PerkResults
      emphasizedCategoryNames={new Set()}
      emphasizedPerkGroupKeys={new Set()}
      hoveredPerkId={null}
      onAddPerkToBuild={vi.fn()}
      onAncientScrollPerkGroupsChange={vi.fn()}
      onClosePerkGroupHover={vi.fn()}
      onCloseResultsPerkHover={vi.fn()}
      onInspectPerkGroup={vi.fn()}
      onOpenPerkGroupHover={vi.fn()}
      onOpenResultsPerkHover={vi.fn()}
      onOriginPerkGroupsChange={vi.fn()}
      onRemovePerkFromBuild={vi.fn()}
      onSelectPerk={vi.fn()}
      pickedPerkRequirementById={new Map()}
      perkResultListScrollResetKey={0}
      query=""
      selectedEmphasisCategoryNames={new Set()}
      selectedEmphasisPerkGroupKeys={new Set()}
      selectedPerk={null}
      setQuery={vi.fn()}
      shouldIncludeAncientScrollPerkGroups
      shouldIncludeOriginPerkGroups={false}
      visiblePerkResultSetKey="empty"
      visiblePerks={[]}
      {...overrides}
    />
  )
}

function getFilterOptionLabel(labelText: string): HTMLLabelElement {
  const label = screen.getByText(labelText).closest('label')

  expect(label).not.toBeNull()

  return label as HTMLLabelElement
}

describe('perk result filters', () => {
  test('describes every perk filter option with a native tooltip', async () => {
    const user = userEvent.setup()

    render(createPerkResults())

    await user.click(screen.getByRole('button', { name: 'Filter perks' }))

    expect(getFilterOptionLabel('Origin perk groups')).toHaveAttribute(
      'title',
      'Shows perk groups that come only from origins and are hidden by default.',
    )
    expect(getFilterOptionLabel('Ancient scroll perks')).toHaveAttribute(
      'title',
      'Shows perk groups that are only available through ancient scroll sources.',
    )
  })
})
