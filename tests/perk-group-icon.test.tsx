import { existsSync } from 'node:fs'
import path from 'node:path'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { BuildPerkGroupTile } from '../src/components/BuildPerkGroupTile'
import { AncientScrollPerkGroupMarker } from '../src/components/PerkGroupIcon'
import {
  ancientScrollIconPath,
  ancientScrollPerkGroupMarkerTestId,
} from '../src/lib/ancient-scroll-perk-group-display'

function renderBuildPerkGroupTile(
  perkGroupId: string,
  options: {
    emphasizedPerkGroupKeys?: ReadonlySet<string>
    selectedEmphasisPerkGroupKeys?: ReadonlySet<string>
  } = {},
) {
  const onClosePerkGroupHover = vi.fn()
  const onInspectPerkGroup = vi.fn()
  const onOpenPerkGroupHover = vi.fn()

  render(
    <BuildPerkGroupTile
      emphasizedCategoryNames={new Set()}
      emphasizedPerkGroupKeys={options.emphasizedPerkGroupKeys ?? new Set()}
      selectedEmphasisCategoryNames={new Set()}
      selectedEmphasisPerkGroupKeys={options.selectedEmphasisPerkGroupKeys ?? new Set()}
      groupLabel="Vala Chant"
      groupOptions={[
        {
          categoryName: 'Magic',
          perkGroupIconPath: 'ui/perks/fire_circle.png',
          perkGroupId,
          perkGroupLabel: 'Vala Chant',
        },
      ]}
      hoveredBuildPerkId={null}
      hoveredBuildPerkTooltipId={undefined}
      hoveredPerkId={null}
      onCloseBuildPerkHover={vi.fn()}
      onCloseBuildPerkTooltip={vi.fn()}
      onClosePerkGroupHover={onClosePerkGroupHover}
      onInspectPerk={vi.fn()}
      onInspectPerkGroup={onInspectPerkGroup}
      onOpenBuildPerkHover={vi.fn()}
      onOpenBuildPerkTooltip={vi.fn()}
      onOpenPerkGroupHover={onOpenPerkGroupHover}
      perks={[
        {
          perkId: 'perk.legend_sample',
          perkName: 'Sample perk',
        },
      ]}
    />,
  )

  return {
    onClosePerkGroupHover,
    onInspectPerkGroup,
    onOpenPerkGroupHover,
  }
}

describe('perk group icon', () => {
  test('marks ancient scroll perk groups on the whole group tile, not the icon frame', async () => {
    const user = userEvent.setup()
    const { onClosePerkGroupHover, onInspectPerkGroup, onOpenPerkGroupHover } =
      renderBuildPerkGroupTile('ValaChantMagicTree')

    const groupCard = screen.getByTestId('planner-group-card')
    const iconStackItem = screen.getByTestId('planner-card-icon-stack-item')
    const groupIcon = screen.getByTestId('planner-group-option-icon')
    const marker = screen.getByTestId(ancientScrollPerkGroupMarkerTestId)
    const markerIcon = marker.querySelector('img')

    expect(groupCard).toHaveAttribute('data-ancient-scroll-perk-group', 'true')
    expect(groupCard).toContainElement(marker)
    expect(iconStackItem).not.toContainElement(marker)
    expect(groupIcon).toHaveAttribute('src', '/game-icons/ui/perks/fire_circle.png')
    expect(marker).toHaveAccessibleName('Learnable using an ancient scroll')
    expect(marker).toHaveAttribute('title', 'Learnable using an ancient scroll')
    expect(markerIcon).toHaveAttribute('src', `/game-icons/${ancientScrollIconPath}`)
    expect(markerIcon).toHaveAttribute('aria-hidden', 'true')
    expect(
      existsSync(path.join(process.cwd(), 'public', 'game-icons', ancientScrollIconPath)),
    ).toBe(true)

    marker.focus()
    expect(onOpenPerkGroupHover).toHaveBeenCalledWith('Magic', 'ValaChantMagicTree')

    await user.keyboard('{Enter}')
    expect(onInspectPerkGroup).toHaveBeenCalledWith('Magic', 'ValaChantMagicTree')

    marker.blur()
    expect(onClosePerkGroupHover).toHaveBeenCalledWith('Magic::ValaChantMagicTree')
  })

  test('activates the primary perk group action from keyboard focus', async () => {
    const user = userEvent.setup()
    const { onInspectPerkGroup, onOpenPerkGroupHover } = renderBuildPerkGroupTile('AxeTree')
    const primaryPerkGroupButton = screen.getByRole('button', {
      name: 'Select perk group Vala Chant',
    })

    primaryPerkGroupButton.focus()
    await user.keyboard('{Enter}')

    expect(onOpenPerkGroupHover).toHaveBeenCalledWith('Magic', 'AxeTree')
    expect(onInspectPerkGroup).toHaveBeenCalledWith('Magic', 'AxeTree')
  })

  test('keeps passive ancient scroll markers as images', () => {
    render(<AncientScrollPerkGroupMarker />)

    const marker = screen.getByTestId(ancientScrollPerkGroupMarkerTestId)

    expect(marker.tagName).toBe('IMG')
    expect(marker).toHaveAccessibleName('Learnable using an ancient scroll')
    expect(marker).toHaveAttribute('src', `/game-icons/${ancientScrollIconPath}`)
    expect(marker).toHaveAttribute('title', 'Learnable using an ancient scroll')
  })

  test('does not mark regular perk group tiles', () => {
    renderBuildPerkGroupTile('AxeTree')

    expect(screen.getByTestId('planner-group-card')).toHaveAttribute(
      'data-ancient-scroll-perk-group',
      'false',
    )
    expect(screen.getByTestId('planner-group-option-icon')).toHaveAttribute(
      'src',
      '/game-icons/ui/perks/fire_circle.png',
    )
    expect(screen.queryByTestId(ancientScrollPerkGroupMarkerTestId)).not.toBeInTheDocument()
  })

  test('separates hover-only and selected perk group emphasis', () => {
    const perkGroupKey = 'Magic::AxeTree'

    renderBuildPerkGroupTile('AxeTree', {
      emphasizedPerkGroupKeys: new Set([perkGroupKey]),
    })

    expect(screen.getByTestId('planner-group-card')).toHaveAttribute('data-highlighted', 'true')
    expect(screen.getByTestId('planner-group-card')).toHaveAttribute(
      'data-selected-highlighted',
      'false',
    )
  })

  test('marks clicked perk group emphasis separately for persistent ornaments', () => {
    renderBuildPerkGroupTile('AxeTree', {
      selectedEmphasisPerkGroupKeys: new Set(['Magic::AxeTree']),
    })

    expect(screen.getByTestId('planner-group-card')).toHaveAttribute(
      'data-selected-highlighted',
      'true',
    )
  })
})
