import { render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { BackgroundFitPanel } from '../src/components/BackgroundFitPanel'
import type { BackgroundFitCalculationProgress } from '../src/lib/background-fit'
import { PlannerInteractionTestProvider } from './PlannerInteractionTestProvider'

function createBackgroundFitPanelProgress(progress: BackgroundFitCalculationProgress) {
  return (
    <PlannerInteractionTestProvider>
      <BackgroundFitPanel
        availableBackgroundVeteranPerkLevelIntervals={[2, 3, 4]}
        backgroundFitErrorMessage={null}
        backgroundFitProgress={progress}
        backgroundFitView={null}
        isExpanded
        isLoadingBackgroundFitView
        mustHavePickedPerkCount={1}
        onBackgroundStudyBookChange={vi.fn()}
        onBackgroundStudyScrollChange={vi.fn()}
        onBackgroundVeteranPerkLevelIntervalChange={vi.fn()}
        onEventBackgroundsChange={vi.fn()}
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
        shouldIncludeEventBackgrounds={false}
        shouldIncludeOriginBackgrounds={false}
      />
    </PlannerInteractionTestProvider>
  )
}

function renderBackgroundFitPanelProgress(progress: BackgroundFitCalculationProgress) {
  return render(createStrictModeBackgroundFitPanelProgress(progress))
}

function createStrictModeBackgroundFitPanelProgress(progress: BackgroundFitCalculationProgress) {
  return <StrictMode>{createBackgroundFitPanelProgress(progress)}</StrictMode>
}

describe('background fit panel progress', () => {
  test('renders clamped worker progress directly', () => {
    const { rerender } = renderBackgroundFitPanelProgress({
      checkedBackgroundCount: 5,
      totalBackgroundCount: 5,
    })

    const progressBar = screen.getByRole('progressbar', { name: 'Background fit progress' })

    expect(progressBar).toHaveAttribute('aria-valuenow', '5')
    expect(screen.getByText('Checking backgrounds 5/5.')).toBeInTheDocument()

    rerender(
      createStrictModeBackgroundFitPanelProgress({
        checkedBackgroundCount: 12,
        totalBackgroundCount: 10,
      }),
    )

    expect(progressBar).toHaveAttribute('aria-valuenow', '10')
    expect(screen.getByText('Checking backgrounds 10/10.')).toBeInTheDocument()

    rerender(
      createStrictModeBackgroundFitPanelProgress({
        checkedBackgroundCount: -3,
        totalBackgroundCount: 10,
      }),
    )

    expect(progressBar).toHaveAttribute('aria-valuenow', '0')
    expect(screen.getByText('Checking backgrounds 0/10.')).toBeInTheDocument()
  })

  test('updates the displayed count from the latest worker progress without timer state', () => {
    const { rerender } = renderBackgroundFitPanelProgress({
      checkedBackgroundCount: 8,
      totalBackgroundCount: 10,
    })

    expect(screen.getByText('Checking backgrounds 8/10.')).toBeInTheDocument()

    rerender(
      createStrictModeBackgroundFitPanelProgress({
        checkedBackgroundCount: 3,
        totalBackgroundCount: 10,
      }),
    )

    expect(screen.getByText('Checking backgrounds 3/10.')).toBeInTheDocument()

    rerender(
      createStrictModeBackgroundFitPanelProgress({
        checkedBackgroundCount: 8,
        totalBackgroundCount: 10,
      }),
    )

    expect(screen.getByText('Checking backgrounds 8/10.')).toBeInTheDocument()
  })
})
