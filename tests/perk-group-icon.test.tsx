import { existsSync } from 'node:fs'
import path from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { BuildPerkGroupTile } from '../src/components/BuildPerkGroupTile'
import {
  ancientScrollIconPath,
  ancientScrollPerkGroupMarkerTestId,
} from '../src/lib/ancient-scroll-perk-group-display'

function renderBuildPerkGroupTile(perkGroupId: string) {
  render(
    <BuildPerkGroupTile
      emphasizedCategoryNames={new Set()}
      emphasizedPerkGroupKeys={new Set()}
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
      onClosePerkGroupHover={vi.fn()}
      onInspectPerk={vi.fn()}
      onInspectPerkGroup={vi.fn()}
      onOpenBuildPerkHover={vi.fn()}
      onOpenBuildPerkTooltip={vi.fn()}
      onOpenPerkGroupHover={vi.fn()}
      perks={[
        {
          perkId: 'perk.legend_sample',
          perkName: 'Sample perk',
        },
      ]}
    />,
  )
}

describe('perk group icon', () => {
  test('marks ancient scroll perk groups on the whole group tile, not the icon frame', () => {
    renderBuildPerkGroupTile('ValaChantMagicTree')

    const groupCard = screen.getByTestId('planner-group-card')
    const iconStackItem = screen.getByTestId('planner-card-icon-stack-item')
    const groupIcon = screen.getByTestId('planner-group-option-icon')
    const marker = screen.getByTestId(ancientScrollPerkGroupMarkerTestId)

    expect(groupCard).toHaveAttribute('data-ancient-scroll-perk-group', 'true')
    expect(groupCard).toContainElement(marker)
    expect(iconStackItem).not.toContainElement(marker)
    expect(groupIcon).toHaveAttribute('src', '/game-icons/ui/perks/fire_circle.png')
    expect(marker).toHaveAttribute('src', `/game-icons/${ancientScrollIconPath}`)
    expect(marker).toHaveAttribute('title', 'Learnable using an ancient scroll')
    expect(
      existsSync(path.join(process.cwd(), 'public', 'game-icons', ancientScrollIconPath)),
    ).toBe(true)
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
})
