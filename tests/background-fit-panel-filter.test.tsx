import type { ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { BackgroundFitPanel } from '../src/components/BackgroundFitPanel'

type BackgroundFitPanelProps = ComponentProps<typeof BackgroundFitPanel>

type BackgroundFilterOverrides = Partial<
  Pick<
    BackgroundFitPanelProps,
    | 'availableBackgroundVeteranPerkLevelIntervals'
    | 'selectedBackgroundVeteranPerkLevelIntervals'
    | 'shouldAllowBackgroundStudyBook'
    | 'shouldAllowBackgroundStudyScroll'
    | 'shouldAllowSecondBackgroundStudyScroll'
    | 'shouldIncludeOriginBackgrounds'
  >
>

function createBackgroundFitPanel(overrides: BackgroundFilterOverrides = {}) {
  return (
    <BackgroundFitPanel
      availableBackgroundVeteranPerkLevelIntervals={[2, 3, 4]}
      backgroundFitErrorMessage={null}
      backgroundFitProgress={null}
      backgroundFitView={null}
      hoveredPerkId={null}
      isExpanded
      isLoadingBackgroundFitView={false}
      mustHavePickedPerkCount={1}
      onBackgroundStudyBookChange={vi.fn()}
      onBackgroundStudyScrollChange={vi.fn()}
      onBackgroundVeteranPerkLevelIntervalChange={vi.fn()}
      onClearPerkGroupHover={vi.fn()}
      onCloseBuildPerkHover={vi.fn()}
      onCloseBuildPerkTooltip={vi.fn()}
      onOriginBackgroundsChange={vi.fn()}
      onSearchActivityChange={vi.fn()}
      onSecondBackgroundStudyScrollChange={vi.fn()}
      onSelectBackgroundFit={vi.fn()}
      onToggleExpanded={vi.fn()}
      optionalPickedPerkCount={0}
      pickedPerkCount={1}
      selectedBackgroundFitKey={null}
      selectedBackgroundVeteranPerkLevelIntervals={[2, 3, 4]}
      shouldAllowBackgroundStudyBook
      shouldAllowBackgroundStudyScroll
      shouldAllowSecondBackgroundStudyScroll={false}
      shouldIncludeOriginBackgrounds={false}
      {...overrides}
    />
  )
}

function getFilterBackgroundsButton() {
  return screen.getByRole('button', { name: 'Filter backgrounds' })
}

function getFilterOptionLabel(labelText: string): HTMLLabelElement {
  const label = screen.getByText(labelText).closest('label')

  expect(label).not.toBeNull()

  return label as HTMLLabelElement
}

describe('background fit panel filters', () => {
  test('marks any selected background filter as active', () => {
    const { rerender } = render(createBackgroundFitPanel())

    expect(getFilterBackgroundsButton()).toHaveAttribute('data-active-filter', 'true')

    rerender(
      createBackgroundFitPanel({
        selectedBackgroundVeteranPerkLevelIntervals: [4, 2, 3],
      }),
    )

    expect(getFilterBackgroundsButton()).toHaveAttribute('data-active-filter', 'true')

    const selectedFilters: BackgroundFilterOverrides[] = [
      { shouldIncludeOriginBackgrounds: true },
      { shouldAllowSecondBackgroundStudyScroll: true },
      { selectedBackgroundVeteranPerkLevelIntervals: [2, 4] },
      {
        availableBackgroundVeteranPerkLevelIntervals: [1, 2, 3],
        selectedBackgroundVeteranPerkLevelIntervals: [2, 3, 4],
      },
    ]

    for (const selectedFilter of selectedFilters) {
      rerender(createBackgroundFitPanel(selectedFilter))

      expect(getFilterBackgroundsButton()).toHaveAttribute('data-active-filter', 'true')
    }

    rerender(
      createBackgroundFitPanel({
        selectedBackgroundVeteranPerkLevelIntervals: [],
        shouldAllowBackgroundStudyBook: false,
        shouldAllowBackgroundStudyScroll: false,
        shouldAllowSecondBackgroundStudyScroll: true,
        shouldIncludeOriginBackgrounds: false,
      }),
    )

    expect(getFilterBackgroundsButton()).toHaveAttribute('data-active-filter', 'false')
  })

  test('describes every background filter option with a native tooltip', async () => {
    const user = userEvent.setup()

    render(createBackgroundFitPanel())

    await user.click(getFilterBackgroundsButton())

    expect(getFilterOptionLabel('Origin backgrounds')).toHaveAttribute(
      'title',
      'Shows origin-only backgrounds hidden from the default results.',
    )
    expect(getFilterOptionLabel('Allow a book')).toHaveAttribute(
      'title',
      'Counts one eligible skill book when checking whether a background can reach the picked build.',
    )
    expect(getFilterOptionLabel('Allow a scroll')).toHaveAttribute(
      'title',
      'Counts one eligible ancient scroll when checking whether a background can reach the picked build.',
    )
    expect(getFilterOptionLabel('Allow two scrolls')).toHaveAttribute(
      'title',
      'Counts a second ancient scroll when Bright is available and the first scroll is allowed.',
    )
    expect(getFilterOptionLabel('Perk every 2 veteran levels')).toHaveAttribute(
      'title',
      'Shows backgrounds that gain 1 perk point every 2 veteran levels after level 12.',
    )
    expect(getFilterOptionLabel('Perk every 3 veteran levels')).toHaveAttribute(
      'title',
      'Shows backgrounds that gain 1 perk point every 3 veteran levels after level 12.',
    )
    expect(getFilterOptionLabel('Perk every 4 veteran levels')).toHaveAttribute(
      'title',
      'Shows backgrounds that gain 1 perk point every 4 veteran levels after level 12.',
    )
  })
})
