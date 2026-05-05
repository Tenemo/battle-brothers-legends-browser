import { type ComponentProps } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
    expect(interaction.openBuildPerkTooltip).toHaveBeenLastCalledWith(
      props.perkId,
      button,
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

  test('moves keyboard users from the focused pill into the tooltip action', async () => {
    const perkGroupSelection = {
      categoryName: 'Defense',
      perkGroupId: 'HeavyArmorTree',
    }
    const { button, interaction, props } = renderBuildPerkPill({
      perkGroupSelection,
    })
    const tooltipElement = document.createElement('div')
    const tooltipAction = document.createElement('button')

    tooltipElement.dataset.buildPerkTooltip = 'true'
    tooltipElement.id = `build-perk-tooltip-${props.perkId}`
    tooltipAction.textContent = 'Add Battle Forged as optional from tooltip'
    tooltipElement.append(tooltipAction)
    document.body.append(tooltipElement)

    try {
      fireEvent.keyDown(button, { key: 'ArrowDown' })

      expect(interaction.openBuildPerkTooltip).toHaveBeenLastCalledWith(
        props.perkId,
        button,
        perkGroupSelection,
        pillHoverOptions,
      )
      await waitFor(() => expect(tooltipAction).toHaveFocus())
    } finally {
      tooltipElement.remove()
    }
  })

  test('dismisses the keyboard-opened tooltip with Escape from the focused pill', () => {
    const { button, interaction, props } = renderBuildPerkPill()

    fireEvent.focus(button)
    fireEvent.keyDown(button, { key: 'Escape' })

    expect(interaction.closeBuildPerkTooltip).toHaveBeenCalledTimes(1)
    expect(interaction.closeBuildPerkHover).toHaveBeenCalledWith(props.perkId)
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
