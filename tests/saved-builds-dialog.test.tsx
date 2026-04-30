import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { SavedBuildsDialog } from '../src/components/SavedBuildsDialog'
import type { SavedBuildPersistenceState } from '../src/lib/saved-builds-storage'

const savedBuild = {
  availablePerkIds: ['perk.legend_clarity'],
  id: 'saved-build-clarity',
  missingPerkCount: 0,
  name: 'Calm focus',
  optionalPerkIds: [],
  perkNames: ['Clarity'],
  pickedPerkCount: 1,
  referenceVersion: 'test-reference',
  updatedAt: '2026-04-30T12:00:00.000Z',
}

function renderSavedBuildsDialog(savedBuildPersistenceState: SavedBuildPersistenceState) {
  return render(
    <SavedBuildsDialog
      isSavedBuildsLoading={false}
      onClose={vi.fn()}
      onCopySavedBuildLink={vi.fn(async () => undefined)}
      onDeleteSavedBuild={vi.fn(async () => undefined)}
      onLoadSavedBuild={vi.fn()}
      onOverwriteSavedBuild={vi.fn(async () => undefined)}
      onSaveCurrentBuild={vi.fn(async () => undefined)}
      pickedPerks={[]}
      savedBuildOperationStatus="idle"
      savedBuildPersistenceState={savedBuildPersistenceState}
      savedBuilds={[savedBuild]}
      savedBuildsErrorMessage={null}
    />,
  )
}

describe('saved builds dialog', () => {
  test('names IndexedDB as the saved build storage mechanism', () => {
    const { rerender } = renderSavedBuildsDialog('persistent')

    expect(
      screen.getByText(
        'Saved in this browser using IndexedDB. The browser should not clear it automatically.',
      ),
    ).toHaveAttribute(
      'title',
      expect.stringContaining('The browser reports persistent storage is enabled'),
    )

    rerender(
      <SavedBuildsDialog
        isSavedBuildsLoading={false}
        onClose={vi.fn()}
        onCopySavedBuildLink={vi.fn(async () => undefined)}
        onDeleteSavedBuild={vi.fn(async () => undefined)}
        onLoadSavedBuild={vi.fn()}
        onOverwriteSavedBuild={vi.fn(async () => undefined)}
        onSaveCurrentBuild={vi.fn(async () => undefined)}
        pickedPerks={[]}
        savedBuildOperationStatus="idle"
        savedBuildPersistenceState="best-effort"
        savedBuilds={[savedBuild]}
        savedBuildsErrorMessage={null}
      />,
    )
    expect(
      screen.getByText(
        'Saved in this browser using IndexedDB. The browser may clear it if site data is cleared or storage is under pressure.',
      ),
    ).toHaveAttribute(
      'title',
      expect.stringContaining('Browser API state: not persistent'),
    )

    rerender(
      <SavedBuildsDialog
        isSavedBuildsLoading={false}
        onClose={vi.fn()}
        onCopySavedBuildLink={vi.fn(async () => undefined)}
        onDeleteSavedBuild={vi.fn(async () => undefined)}
        onLoadSavedBuild={vi.fn()}
        onOverwriteSavedBuild={vi.fn(async () => undefined)}
        onSaveCurrentBuild={vi.fn(async () => undefined)}
        pickedPerks={[]}
        savedBuildOperationStatus="idle"
        savedBuildPersistenceState="unavailable"
        savedBuilds={[savedBuild]}
        savedBuildsErrorMessage={null}
      />,
    )
    expect(
      screen.getByText(
        'Saved in this browser using IndexedDB. This browser does not report whether it may clear it automatically.',
      ),
    ).toHaveAttribute(
      'title',
      expect.stringContaining('does not expose the Storage API persistence status'),
    )

    rerender(
      <SavedBuildsDialog
        isSavedBuildsLoading={false}
        onClose={vi.fn()}
        onCopySavedBuildLink={vi.fn(async () => undefined)}
        onDeleteSavedBuild={vi.fn(async () => undefined)}
        onLoadSavedBuild={vi.fn()}
        onOverwriteSavedBuild={vi.fn(async () => undefined)}
        onSaveCurrentBuild={vi.fn(async () => undefined)}
        pickedPerks={[]}
        savedBuildOperationStatus="idle"
        savedBuildPersistenceState="unknown"
        savedBuilds={[savedBuild]}
        savedBuildsErrorMessage={null}
      />,
    )
    expect(
      screen.getByText(
        'Saved in this browser using IndexedDB. Checking whether the browser may clear it automatically.',
      ),
    ).toHaveAttribute(
      'title',
      expect.stringContaining('The app is checking the browser Storage API'),
    )
  })

  test('uses load build as the visible saved build action label', () => {
    renderSavedBuildsDialog('best-effort')

    expect(screen.getByRole('button', { name: 'Load saved build Calm focus' })).toHaveTextContent(
      'Load build',
    )
  })

  test('requires a second click before overwriting a saved build', async () => {
    const user = userEvent.setup()
    const onOverwriteSavedBuild = vi.fn(async () => undefined)

    render(
      <SavedBuildsDialog
        isSavedBuildsLoading={false}
        onClose={vi.fn()}
        onCopySavedBuildLink={vi.fn(async () => undefined)}
        onDeleteSavedBuild={vi.fn(async () => undefined)}
        onLoadSavedBuild={vi.fn()}
        onOverwriteSavedBuild={onOverwriteSavedBuild}
        onSaveCurrentBuild={vi.fn(async () => undefined)}
        pickedPerks={[
          {
            backgroundSources: [],
            categoryNames: ['Traits'],
            descriptionParagraphs: ['Calm focus'],
            iconPath: null,
            id: 'perk.legend_clarity',
            isOptional: false,
            perkConstName: 'LegendClarity',
            perkName: 'Clarity',
            placements: [],
            primaryCategoryName: 'Traits',
            scenarioSources: [],
            searchText: 'Clarity',
          },
        ]}
        savedBuildOperationStatus="idle"
        savedBuildPersistenceState="best-effort"
        savedBuilds={[savedBuild]}
        savedBuildsErrorMessage={null}
      />,
    )

    const overwriteSavedBuildButton = screen.getByRole('button', {
      name: 'Overwrite saved build Calm focus',
    })

    expect(overwriteSavedBuildButton).toHaveTextContent('Overwrite')

    await user.click(overwriteSavedBuildButton)

    expect(onOverwriteSavedBuild).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: 'Confirm overwrite saved build Calm focus' }),
    ).toHaveTextContent('Confirm?')

    await user.click(
      screen.getByRole('button', { name: 'Confirm overwrite saved build Calm focus' }),
    )

    expect(onOverwriteSavedBuild).toHaveBeenCalledWith('saved-build-clarity')
  })
})
