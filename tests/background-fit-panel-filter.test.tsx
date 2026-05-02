import type { ComponentProps } from 'react'
import { render, screen } from '@testing-library/react'
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
})
