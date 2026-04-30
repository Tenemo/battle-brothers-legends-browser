import { type ComponentProps } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { BuildPerkPill } from '../src/components/BuildPerkPill'

type BuildPerkPillProps = ComponentProps<typeof BuildPerkPill>

const pillHoverOptions = {
  shouldEmphasizePerkGroup: false,
}

function renderBuildPerkPill(overrides: Partial<BuildPerkPillProps> = {}) {
  const props: BuildPerkPillProps = {
    hoveredBuildPerkId: null,
    hoveredBuildPerkTooltipId: undefined,
    hoveredPerkId: null,
    onCloseHover: vi.fn(),
    onCloseTooltip: vi.fn(),
    onInspectPerk: vi.fn(),
    onOpenHover: vi.fn(),
    onOpenTooltip: vi.fn(),
    perkId: 'perk.battle_forged',
    perkName: 'Battle Forged',
    ...overrides,
  }

  render(<BuildPerkPill {...props} />)

  return {
    button: screen.getByRole('button', { name: props.perkName }),
    props,
  }
}

describe('build perk pill', () => {
  test('passes the perk group selection through keyboard and pointer hover paths', () => {
    const perkGroupSelection = {
      categoryName: 'Defense',
      perkGroupId: 'HeavyArmorTree',
    }
    const { button, props } = renderBuildPerkPill({
      perkGroupSelection,
    })

    fireEvent.focus(button)

    expect(props.onOpenHover).toHaveBeenLastCalledWith(
      props.perkId,
      perkGroupSelection,
      pillHoverOptions,
    )

    fireEvent.mouseEnter(button)

    expect(props.onOpenHover).toHaveBeenLastCalledWith(
      props.perkId,
      perkGroupSelection,
      pillHoverOptions,
    )
  })

  test('keeps the same group selection when inspecting the pill', () => {
    const perkGroupSelection = {
      categoryName: 'Class',
      perkGroupId: 'HammerClassTree',
    }
    const { button, props } = renderBuildPerkPill({
      perkGroupSelection,
    })

    fireEvent.click(button)

    expect(props.onCloseTooltip).toHaveBeenCalledTimes(1)
    expect(props.onInspectPerk).toHaveBeenCalledWith(props.perkId, perkGroupSelection)
  })
})
