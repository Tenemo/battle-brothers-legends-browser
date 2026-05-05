import { type ComponentProps } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { BuildPerkPill } from '../src/components/BuildPerkPill'
import { PlannerInteractionTestProvider } from './PlannerInteractionTestProvider'

type BuildPerkPillProps = ComponentProps<typeof BuildPerkPill>

const pillHoverOptions = {
  shouldEmphasizePerkGroup: false,
}

function renderBuildPerkPill(overrides: Partial<BuildPerkPillProps> = {}) {
  const interaction = {
    closeBuildPerkHover: vi.fn(),
    closeBuildPerkTooltip: vi.fn(),
    openBuildPerkHover: vi.fn(),
    openBuildPerkTooltip: vi.fn(),
  }
  const props: BuildPerkPillProps = {
    onInspectPerk: vi.fn(),
    perkIconPath: 'ui/perks/battle_forged.png',
    perkId: 'perk.battle_forged',
    perkName: 'Battle Forged',
    ...overrides,
  }

  render(
    <PlannerInteractionTestProvider interactionOverrides={interaction}>
      <BuildPerkPill {...props} />
    </PlannerInteractionTestProvider>,
  )

  return {
    button: screen.getByRole('button', { name: props.perkName }),
    interaction,
    props,
  }
}

describe('build perk pill', () => {
  test('renders a decorative perk icon without changing the accessible name', () => {
    const { button } = renderBuildPerkPill()

    const icon = screen.getByTestId('planner-pill-icon')

    expect(button).toHaveAccessibleName('Battle Forged')
    expect(icon).toHaveAttribute('alt', '')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    expect(icon).toHaveAttribute('src', '/game-icons/ui/perks/battle_forged.png')
  })

  test('passes the perk group selection through keyboard and pointer hover paths', () => {
    const perkGroupSelection = {
      categoryName: 'Defense',
      perkGroupId: 'HeavyArmorTree',
    }
    const { button, interaction, props } = renderBuildPerkPill({
      perkGroupSelection,
    })

    fireEvent.focus(button)

    expect(interaction.openBuildPerkHover).toHaveBeenLastCalledWith(
      props.perkId,
      perkGroupSelection,
      pillHoverOptions,
    )

    fireEvent.mouseEnter(button)

    expect(interaction.openBuildPerkHover).toHaveBeenLastCalledWith(
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
    const { button, interaction, props } = renderBuildPerkPill({
      perkGroupSelection,
    })

    fireEvent.click(button)

    expect(interaction.closeBuildPerkTooltip).toHaveBeenCalledTimes(1)
    expect(props.onInspectPerk).toHaveBeenCalledWith(props.perkId, perkGroupSelection)
  })
})
