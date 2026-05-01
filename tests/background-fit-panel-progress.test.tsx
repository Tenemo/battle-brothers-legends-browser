import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { BackgroundFitPanel } from '../src/components/BackgroundFitPanel'
import type { BackgroundFitCalculationProgress } from '../src/lib/background-fit'

function createBackgroundFitPanelProgress(progress: BackgroundFitCalculationProgress) {
  return (
    <BackgroundFitPanel
      availableBackgroundVeteranPerkLevelIntervals={[2, 3, 4]}
      backgroundFitErrorMessage={null}
      backgroundFitProgress={progress}
      backgroundFitView={null}
      hoveredPerkId={null}
      isExpanded
      isLoadingBackgroundFitView
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
    />
  )
}

function renderBackgroundFitPanelProgress(progress: BackgroundFitCalculationProgress) {
  return render(createBackgroundFitPanelProgress(progress))
}

describe('background fit panel progress', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  test('animates processed background count with a minimum ten millisecond step', () => {
    vi.useFakeTimers()

    const { rerender } = renderBackgroundFitPanelProgress({
      checkedBackgroundCount: 5,
      totalBackgroundCount: 5,
    })

    const progressBar = screen.getByRole('progressbar', { name: 'Background fit progress' })

    expect(progressBar).toHaveAttribute('aria-valuenow', '5')
    expect(screen.getByText('Checking backgrounds 0/5.')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(9)
    })

    expect(progressBar).toHaveAttribute('aria-valuenow', '5')

    act(() => {
      vi.advanceTimersByTime(1)
    })

    expect(screen.getByText('Checking backgrounds 1/5.')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(40)
    })

    expect(screen.getByText('Checking backgrounds 5/5.')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(200)
    })

    rerender(
      createBackgroundFitPanelProgress({
        checkedBackgroundCount: 10,
        totalBackgroundCount: 10,
      }),
    )

    expect(screen.getByText('Checking backgrounds 5/10.')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(9)
    })

    expect(screen.getByText('Checking backgrounds 5/10.')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(1)
    })

    expect(screen.getByText('Checking backgrounds 6/10.')).toBeInTheDocument()
  })
})
