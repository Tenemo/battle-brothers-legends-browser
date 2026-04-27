import { type FormEvent, useEffect, useId, useRef, useState } from 'react'
import { Copy, Download, Save, Trash2, X } from 'lucide-react'
import type { SavedBuildPersistenceState } from '../lib/saved-builds-storage'
import type { LegendsPerkRecord } from '../types/legends-perks'
import type { BuildPlannerSavedBuild, SavedBuildOperationStatus } from './build-planner-types'

function getDefaultSavedBuildName(savedBuilds: BuildPlannerSavedBuild[]): string {
  const savedBuildNames = new Set(savedBuilds.map((savedBuild) => savedBuild.name))

  for (
    let savedBuildNumber = 1;
    savedBuildNumber <= savedBuilds.length + 2;
    savedBuildNumber += 1
  ) {
    const savedBuildName = `Build ${savedBuildNumber}`

    if (!savedBuildNames.has(savedBuildName)) {
      return savedBuildName
    }
  }

  return `Build ${savedBuilds.length + 1}`
}

function formatSavedBuildUpdatedAt(updatedAt: string): string {
  const updatedAtDate = new Date(updatedAt)

  if (!Number.isFinite(updatedAtDate.getTime())) {
    return 'Unknown date'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(updatedAtDate)
}

function getSavedBuildPersistenceLabel(
  savedBuildPersistenceState: SavedBuildPersistenceState,
): string {
  switch (savedBuildPersistenceState) {
    case 'persistent':
      return 'Storage: protected'
    case 'best-effort':
      return 'Storage: best effort'
    case 'unavailable':
      return 'Storage: unavailable'
    case 'unknown':
      return 'Storage: checking'
  }
}

function getSavedBuildOperationStatusLabel(
  savedBuildOperationStatus: SavedBuildOperationStatus,
): string | null {
  switch (savedBuildOperationStatus) {
    case 'saved':
      return 'Saved build'
    case 'deleted':
      return 'Deleted build'
    case 'loaded':
      return 'Loaded build'
    case 'copied':
      return 'Copied link'
    case 'copy-error':
      return 'Copy failed'
    case 'idle':
      return null
  }
}

export function SavedBuildsDialog({
  isSavedBuildsLoading,
  onClose,
  onCopySavedBuildLink,
  onDeleteSavedBuild,
  onLoadSavedBuild,
  onSaveCurrentBuild,
  pickedPerks,
  savedBuildOperationStatus,
  savedBuildPersistenceState,
  savedBuilds,
  savedBuildsErrorMessage,
}: {
  isSavedBuildsLoading: boolean
  onClose: () => void
  onCopySavedBuildLink: (savedBuildId: string) => Promise<void>
  onDeleteSavedBuild: (savedBuildId: string) => Promise<void>
  onLoadSavedBuild: (savedBuildId: string) => void
  onSaveCurrentBuild: (name: string) => Promise<void>
  pickedPerks: LegendsPerkRecord[]
  savedBuildOperationStatus: SavedBuildOperationStatus
  savedBuildPersistenceState: SavedBuildPersistenceState
  savedBuilds: BuildPlannerSavedBuild[]
  savedBuildsErrorMessage: string | null
}) {
  const titleId = useId()
  const nameInputId = useId()
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const [buildName, setBuildName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [pendingSavedBuildId, setPendingSavedBuildId] = useState<string | null>(null)
  const hasPickedPerks = pickedPerks.length > 0
  const defaultSavedBuildName = getDefaultSavedBuildName(savedBuilds)
  const statusLabel = savedBuildsErrorMessage
    ? savedBuildsErrorMessage
    : getSavedBuildOperationStatusLabel(savedBuildOperationStatus)

  useEffect(() => {
    nameInputRef.current?.focus()
  }, [])

  async function handleSaveCurrentBuild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!hasPickedPerks || isSaving) {
      return
    }

    try {
      setIsSaving(true)
      await onSaveCurrentBuild(buildName.trim() || defaultSavedBuildName)
      setBuildName('')
    } catch {
      // The storage hook exposes the error message in the dialog status area.
    } finally {
      setIsSaving(false)
    }
  }

  async function handleCopySavedBuildLink(savedBuildId: string) {
    try {
      setPendingSavedBuildId(savedBuildId)
      await onCopySavedBuildLink(savedBuildId)
    } catch {
      // The copy handler exposes the failure state in the dialog status area.
    } finally {
      setPendingSavedBuildId(null)
    }
  }

  async function handleDeleteSavedBuild(savedBuildId: string) {
    try {
      setPendingSavedBuildId(savedBuildId)
      await onDeleteSavedBuild(savedBuildId)
    } catch {
      // The storage hook exposes the error message in the dialog status area.
    } finally {
      setPendingSavedBuildId(null)
    }
  }

  return (
    <div
      className="saved-builds-dialog-backdrop"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          onClose()
        }
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="saved-builds-dialog"
        role="dialog"
      >
        <div className="saved-builds-dialog-header">
          <div>
            <h2 id={titleId}>Saved builds</h2>
            <p className="saved-builds-storage-status">
              {getSavedBuildPersistenceLabel(savedBuildPersistenceState)}
            </p>
          </div>
          <button
            aria-label="Close saved builds"
            className="planner-action-button saved-builds-close-button"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="planner-button-icon" />
            Close
          </button>
        </div>

        <form className="saved-build-form" onSubmit={handleSaveCurrentBuild}>
          <label htmlFor={nameInputId}>Build name</label>
          <div className="saved-build-form-row">
            <input
              disabled={!hasPickedPerks || isSaving}
              id={nameInputId}
              onChange={(event) => setBuildName(event.target.value)}
              placeholder={defaultSavedBuildName}
              ref={nameInputRef}
              type="text"
              value={buildName}
            />
            <button
              className="planner-action-button saved-build-primary-button"
              disabled={!hasPickedPerks || isSaving}
              type="submit"
            >
              <Save aria-hidden="true" className="planner-button-icon" />
              {isSaving ? 'Saving' : 'Save current'}
            </button>
          </div>
        </form>

        {statusLabel ? (
          <p
            className={
              savedBuildsErrorMessage
                ? 'saved-builds-status-message is-error'
                : 'saved-builds-status-message'
            }
            role={savedBuildsErrorMessage ? 'alert' : 'status'}
          >
            {statusLabel}
          </p>
        ) : null}

        <div className="saved-builds-list app-scrollbar" data-testid="saved-builds-list">
          {isSavedBuildsLoading ? (
            <p className="saved-builds-empty">Loading saved builds.</p>
          ) : savedBuilds.length === 0 ? (
            <p className="saved-builds-empty">No saved builds yet.</p>
          ) : (
            savedBuilds.map((savedBuild) => {
              const visiblePerkNames = savedBuild.perkNames.slice(0, 4)
              const remainingPerkNameCount = savedBuild.perkNames.length - visiblePerkNames.length
              const perkSummary =
                savedBuild.missingPerkCount > 0
                  ? `${savedBuild.availablePerkIds.length} of ${savedBuild.pickedPerkCount} perks available. ${savedBuild.missingPerkCount} unavailable.`
                  : `${savedBuild.pickedPerkCount} perk${savedBuild.pickedPerkCount === 1 ? '' : 's'}.`
              const isPending = pendingSavedBuildId === savedBuild.id

              return (
                <article className="saved-build-card" key={savedBuild.id}>
                  <div className="saved-build-card-copy">
                    <strong className="saved-build-card-name">{savedBuild.name}</strong>
                    <p className="saved-build-card-meta">{perkSummary}</p>
                    <p className="saved-build-card-preview">
                      {visiblePerkNames.length > 0
                        ? `${visiblePerkNames.join(', ')}${remainingPerkNameCount > 0 ? `, +${remainingPerkNameCount}` : ''}`
                        : 'No available perks'}
                    </p>
                    <p className="saved-build-card-meta">
                      Updated {formatSavedBuildUpdatedAt(savedBuild.updatedAt)}
                    </p>
                  </div>
                  <div className="saved-build-card-actions">
                    <button
                      aria-label={`Load saved build ${savedBuild.name}`}
                      className="planner-action-button saved-build-primary-button"
                      disabled={savedBuild.availablePerkIds.length === 0 || isPending}
                      onClick={() => {
                        onLoadSavedBuild(savedBuild.id)
                        onClose()
                      }}
                      type="button"
                    >
                      <Download aria-hidden="true" className="planner-button-icon" />
                      Load
                    </button>
                    <button
                      aria-label={`Copy saved build ${savedBuild.name} link`}
                      className="planner-action-button"
                      disabled={savedBuild.availablePerkIds.length === 0 || isPending}
                      onClick={() => {
                        void handleCopySavedBuildLink(savedBuild.id)
                      }}
                      type="button"
                    >
                      <Copy aria-hidden="true" className="planner-button-icon" />
                      Copy link
                    </button>
                    <button
                      aria-label={`Delete saved build ${savedBuild.name}`}
                      className="planner-action-button saved-build-delete-button"
                      disabled={isPending}
                      onClick={() => {
                        void handleDeleteSavedBuild(savedBuild.id)
                      }}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" className="planner-button-icon" />
                      Delete
                    </button>
                  </div>
                </article>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}
