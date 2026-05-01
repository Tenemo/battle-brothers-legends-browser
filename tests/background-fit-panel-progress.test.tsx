import { act, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
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
  return render(createStrictModeBackgroundFitPanelProgress(progress))
}

function createStrictModeBackgroundFitPanelProgress(progress: BackgroundFitCalculationProgress) {
  return <StrictMode>{createBackgroundFitPanelProgress(progress)}</StrictMode>
}

function advanceProgressTimersByStepCount(stepCount: number) {
  for (let stepIndex = 0; stepIndex < stepCount; stepIndex += 1) {
    act(() => {
      vi.advanceTimersByTime(backgroundFitProgressCountMinimumStepDurationMs)
    })
  }
}

const backgroundFitProgressCountMinimumStepDurationMs = 10

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

    advanceProgressTimersByStepCount(4)

    expect(screen.getByText('Checking backgrounds 5/5.')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(200)
    })

    rerender(
      createStrictModeBackgroundFitPanelProgress({
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

  test('does not move the displayed count backward when worker progress arrives out of order', () => {
    vi.useFakeTimers()

    const { rerender } = renderBackgroundFitPanelProgress({
      checkedBackgroundCount: 8,
      totalBackgroundCount: 10,
    })

    advanceProgressTimersByStepCount(5)

    expect(screen.getByText('Checking backgrounds 5/10.')).toBeInTheDocument()

    rerender(
      createStrictModeBackgroundFitPanelProgress({
        checkedBackgroundCount: 3,
        totalBackgroundCount: 10,
      }),
    )

    act(() => {
      vi.advanceTimersByTime(10)
    })

    expect(screen.getByText('Checking backgrounds 5/10.')).toBeInTheDocument()

    rerender(
      createStrictModeBackgroundFitPanelProgress({
        checkedBackgroundCount: 8,
        totalBackgroundCount: 10,
      }),
    )

    act(() => {
      vi.advanceTimersByTime(10)
    })

    expect(screen.getByText('Checking backgrounds 6/10.')).toBeInTheDocument()
  })
})
