import { type FormEvent, type KeyboardEvent, useEffect, useId, useRef, useState } from 'react'
import { Copy, Download, Save, Trash2, X } from 'lucide-react'
import { joinClassNames } from '../lib/class-names'
import type { SavedBuildPersistenceState } from '../lib/saved-builds-storage'
import { useModalBackgroundInert } from '../lib/use-modal-background-inert'
import type {
  BuildPlannerPickedPerk,
  BuildPlannerSavedBuild,
  SavedBuildOperationStatus,
} from './build-planner-types'
import plannerStyles from './BuildPlanner.module.scss'
import styles from './SavedBuildsDialog.module.scss'

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
      return 'Saved in this browser using IndexedDB. The browser should not clear it automatically.'
    case 'best-effort':
      return 'Saved in this browser using IndexedDB. The browser may clear it if site data is cleared or storage is under pressure.'
    case 'unavailable':
      return 'Saved in this browser using IndexedDB. This browser does not report whether it may clear it automatically.'
    case 'unknown':
      return 'Saved in this browser using IndexedDB. Checking whether the browser may clear it automatically.'
  }
}

function getSavedBuildPersistenceTooltip(
  savedBuildPersistenceState: SavedBuildPersistenceState,
): string {
  const storageScope =
    'Saved builds are stored in IndexedDB for this browser profile and this site. They are not uploaded or synced by this app.'

  switch (savedBuildPersistenceState) {
    case 'persistent':
      return `${storageScope} The browser reports persistent storage is enabled, so it should not evict these saves automatically under storage pressure. Clearing site data, using a different browser profile, using a different device, or private browsing can still remove or hide them.`
    case 'best-effort':
      return `${storageScope} Browser API state: not persistent. The saves still persist normally across reloads and browser restarts, but the browser may evict them under storage pressure, and clearing site data will remove them. This is common for localhost development sites or sites the browser has not granted persistent storage to.`
    case 'unavailable':
      return `${storageScope} This browser does not expose the Storage API persistence status here, so the app cannot tell whether these saves are protected from browser eviction. Clearing site data, using a different browser profile, using a different device, or private browsing can remove or hide them.`
    case 'unknown':
      return `${storageScope} The app is checking the browser Storage API, or the browser did not return a persistence status. Until that check completes, the app cannot tell whether these saves are protected from browser eviction.`
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

function getFocusableSavedBuildsDialogElements(dialogElement: HTMLElement): HTMLElement[] {
  return [
    ...dialogElement.querySelectorAll<HTMLElement>(
      [
        'button:not(:disabled)',
        'input:not(:disabled)',
        'select:not(:disabled)',
        'textarea:not(:disabled)',
        'a[href]',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', '),
    ),
  ].filter((element) => element.getAttribute('aria-hidden') !== 'true')
}

function keepKeyboardFocusInsideSavedBuildsDialog(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== 'Tab') {
    return
  }

  const focusableElements = getFocusableSavedBuildsDialogElements(event.currentTarget)

  if (focusableElements.length === 0) {
    event.preventDefault()
    return
  }

  const firstFocusableElement = focusableElements[0]
  const lastFocusableElement = focusableElements.at(-1) ?? firstFocusableElement
  const activeElement = document.activeElement

  if (!event.currentTarget.contains(activeElement)) {
    event.preventDefault()
    firstFocusableElement.focus()
    return
  }

  if (event.shiftKey && activeElement === firstFocusableElement) {
    event.preventDefault()
    lastFocusableElement.focus()
    return
  }

  if (!event.shiftKey && activeElement === lastFocusableElement) {
    event.preventDefault()
    firstFocusableElement.focus()
  }
}

export function SavedBuildsDialog({
  isSavedBuildsLoading,
  onClose,
  onCopySavedBuildLink,
  onDeleteSavedBuild,
  onLoadSavedBuild,
  onOverwriteSavedBuild,
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
  onOverwriteSavedBuild: (savedBuildId: string) => Promise<void>
  onSaveCurrentBuild: (name: string) => Promise<void>
  pickedPerks: BuildPlannerPickedPerk[]
  savedBuildOperationStatus: SavedBuildOperationStatus
  savedBuildPersistenceState: SavedBuildPersistenceState
  savedBuilds: BuildPlannerSavedBuild[]
  savedBuildsErrorMessage: string | null
}) {
  const titleId = useId()
  const nameInputId = useId()
  const dialogBackdropRef = useRef<HTMLDivElement | null>(null)
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const [buildName, setBuildName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [confirmingOverwriteSavedBuildId, setConfirmingOverwriteSavedBuildId] = useState<
    string | null
  >(null)
  const [pendingSavedBuildId, setPendingSavedBuildId] = useState<string | null>(null)
  const hasPickedPerks = pickedPerks.length > 0
  const defaultSavedBuildName = getDefaultSavedBuildName(savedBuilds)
  const isSavedBuildActionPending = isSaving || pendingSavedBuildId !== null
  const statusLabel = savedBuildsErrorMessage
    ? savedBuildsErrorMessage
    : getSavedBuildOperationStatusLabel(savedBuildOperationStatus)

  useModalBackgroundInert(dialogBackdropRef)

  useEffect(() => {
    if (nameInputRef.current && !nameInputRef.current.disabled) {
      nameInputRef.current.focus()
      return
    }

    const firstFocusableElement = dialogBackdropRef.current
      ? getFocusableSavedBuildsDialogElements(dialogBackdropRef.current)[0]
      : null

    firstFocusableElement?.focus()
  }, [])

  async function handleSaveCurrentBuild(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!hasPickedPerks || isSavedBuildActionPending) {
      return
    }

    try {
      setIsSaving(true)
      setConfirmingOverwriteSavedBuildId(null)
      await onSaveCurrentBuild(buildName.trim() || defaultSavedBuildName)
      setBuildName('')
    } catch {
      // The storage hook exposes the error message in the dialog status area.
    } finally {
      setIsSaving(false)
    }
  }

  async function handleCopySavedBuildLink(savedBuildId: string) {
    if (isSavedBuildActionPending) {
      return
    }

    try {
      setConfirmingOverwriteSavedBuildId(null)
      setPendingSavedBuildId(savedBuildId)
      await onCopySavedBuildLink(savedBuildId)
    } catch {
      // The copy handler exposes the failure state in the dialog status area.
    } finally {
      setPendingSavedBuildId(null)
    }
  }

  async function handleDeleteSavedBuild(savedBuildId: string) {
    if (isSavedBuildActionPending) {
      return
    }

    try {
      setConfirmingOverwriteSavedBuildId(null)
      setPendingSavedBuildId(savedBuildId)
      await onDeleteSavedBuild(savedBuildId)
    } catch {
      // The storage hook exposes the error message in the dialog status area.
    } finally {
      setPendingSavedBuildId(null)
    }
  }

  async function handleOverwriteSavedBuild(savedBuildId: string) {
    if (!hasPickedPerks || isSavedBuildActionPending) {
      return
    }

    if (confirmingOverwriteSavedBuildId !== savedBuildId) {
      setConfirmingOverwriteSavedBuildId(savedBuildId)
      return
    }

    try {
      setPendingSavedBuildId(savedBuildId)
      await onOverwriteSavedBuild(savedBuildId)
      setConfirmingOverwriteSavedBuildId(null)
    } catch {
      // The storage hook exposes the error message in the dialog status area.
    } finally {
      setPendingSavedBuildId(null)
    }
  }

  return (
    <div
      className={styles.dialogBackdrop}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          onClose()
          return
        }

        keepKeyboardFocusInsideSavedBuildsDialog(event)
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
      ref={dialogBackdropRef}
    >
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className={styles.savedBuildsDialog}
        role="dialog"
      >
        <div className={styles.savedBuildsDialogHeader}>
          <div>
            <h2 id={titleId}>Saved builds</h2>
            <p
              className={styles.savedBuildsStorageStatus}
              title={getSavedBuildPersistenceTooltip(savedBuildPersistenceState)}
            >
              {getSavedBuildPersistenceLabel(savedBuildPersistenceState)}
            </p>
          </div>
          <button
            aria-label="Close saved builds"
            className={joinClassNames(
              plannerStyles.plannerActionButton,
              styles.savedBuildsCloseButton,
            )}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className={plannerStyles.plannerButtonIcon} />
            Close
          </button>
        </div>

        <form className={styles.savedBuildForm} onSubmit={handleSaveCurrentBuild}>
          <label htmlFor={nameInputId}>Build name</label>
          <div className={styles.savedBuildFormRow}>
            <input
              disabled={!hasPickedPerks || isSavedBuildActionPending}
              id={nameInputId}
              onChange={(event) => setBuildName(event.target.value)}
              placeholder={defaultSavedBuildName}
              ref={nameInputRef}
              type="text"
              value={buildName}
            />
            <button
              className={joinClassNames(
                plannerStyles.plannerActionButton,
                styles.savedBuildPrimaryButton,
              )}
              disabled={!hasPickedPerks || isSavedBuildActionPending}
              type="submit"
            >
              <Save aria-hidden="true" className={plannerStyles.plannerButtonIcon} />
              {isSaving ? 'Saving' : 'Save current'}
            </button>
          </div>
        </form>

        {statusLabel ? (
          <p
            className={styles.savedBuildsStatusMessage}
            data-status={savedBuildsErrorMessage ? 'error' : 'success'}
            role={savedBuildsErrorMessage ? 'alert' : 'status'}
          >
            {statusLabel}
          </p>
        ) : null}

        <div
          className={joinClassNames(styles.savedBuildsList, 'app-scrollbar')}
          data-scroll-container="true"
          data-testid="saved-builds-list"
        >
          {isSavedBuildsLoading ? (
            <p className={styles.savedBuildsEmpty}>Loading saved builds.</p>
          ) : savedBuilds.length === 0 ? (
            <p className={styles.savedBuildsEmpty}>No saved builds yet.</p>
          ) : (
            savedBuilds.map((savedBuild) => {
              const visiblePerkNames = savedBuild.perkNames.slice(0, 4)
              const remainingPerkNameCount = savedBuild.perkNames.length - visiblePerkNames.length
              const perkSummary =
                savedBuild.missingPerkCount > 0
                  ? `${savedBuild.availablePerkIds.length} of ${savedBuild.pickedPerkCount} perks available. ${savedBuild.missingPerkCount} unavailable.`
                  : `${savedBuild.pickedPerkCount} perk${savedBuild.pickedPerkCount === 1 ? '' : 's'}.`
              const isConfirmingOverwrite = confirmingOverwriteSavedBuildId === savedBuild.id

              return (
                <article
                  className={styles.savedBuildCard}
                  data-testid="saved-build-card"
                  key={savedBuild.id}
                >
                  <div className={styles.savedBuildCardCopy}>
                    <strong className={styles.savedBuildCardName}>{savedBuild.name}</strong>
                    <p className={styles.savedBuildCardMeta}>{perkSummary}</p>
                    <p className={styles.savedBuildCardPreview}>
                      {visiblePerkNames.length > 0
                        ? `${visiblePerkNames.join(', ')}${remainingPerkNameCount > 0 ? `, +${remainingPerkNameCount}` : ''}`
                        : 'No available perks'}
                    </p>
                    <p className={styles.savedBuildCardMeta}>
                      Updated {formatSavedBuildUpdatedAt(savedBuild.updatedAt)}
                    </p>
                  </div>
                  <div className={styles.savedBuildCardActions}>
                    <button
                      aria-label={`Load saved build ${savedBuild.name}`}
                      className={joinClassNames(
                        plannerStyles.plannerActionButton,
                        styles.savedBuildPrimaryButton,
                      )}
                      disabled={
                        savedBuild.availablePerkIds.length === 0 || isSavedBuildActionPending
                      }
                      onClick={() => {
                        onLoadSavedBuild(savedBuild.id)
                        onClose()
                      }}
                      type="button"
                    >
                      <Download aria-hidden="true" className={plannerStyles.plannerButtonIcon} />
                      Load build
                    </button>
                    <button
                      aria-label={
                        isConfirmingOverwrite
                          ? `Confirm overwrite saved build ${savedBuild.name}`
                          : `Overwrite saved build ${savedBuild.name}`
                      }
                      className={joinClassNames(
                        plannerStyles.plannerActionButton,
                        styles.savedBuildPrimaryButton,
                      )}
                      disabled={!hasPickedPerks || isSavedBuildActionPending}
                      onClick={() => {
                        void handleOverwriteSavedBuild(savedBuild.id)
                      }}
                      type="button"
                    >
                      <Save aria-hidden="true" className={plannerStyles.plannerButtonIcon} />
                      {isConfirmingOverwrite ? 'Confirm?' : 'Overwrite'}
                    </button>
                    <button
                      aria-label={`Copy saved build ${savedBuild.name} link`}
                      className={plannerStyles.plannerActionButton}
                      disabled={
                        savedBuild.availablePerkIds.length === 0 || isSavedBuildActionPending
                      }
                      onClick={() => {
                        void handleCopySavedBuildLink(savedBuild.id)
                      }}
                      type="button"
                    >
                      <Copy aria-hidden="true" className={plannerStyles.plannerButtonIcon} />
                      Copy link
                    </button>
                    <button
                      aria-label={`Delete saved build ${savedBuild.name}`}
                      className={joinClassNames(
                        plannerStyles.plannerActionButton,
                        styles.savedBuildDeleteButton,
                      )}
                      disabled={isSavedBuildActionPending}
                      onClick={() => {
                        void handleDeleteSavedBuild(savedBuild.id)
                      }}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" className={plannerStyles.plannerButtonIcon} />
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
