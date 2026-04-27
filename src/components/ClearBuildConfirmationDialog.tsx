import { type KeyboardEvent, useEffect, useId, useRef } from 'react'
import { CircleAlert, RotateCcw, X } from 'lucide-react'

function keepKeyboardFocusInsideDialog(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== 'Tab') {
    return
  }

  const focusableButtons = [
    ...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
  ]

  if (focusableButtons.length === 0) {
    return
  }

  const firstFocusableButton = focusableButtons[0]
  const lastFocusableButton = focusableButtons.at(-1) ?? firstFocusableButton

  if (event.shiftKey && document.activeElement === firstFocusableButton) {
    event.preventDefault()
    lastFocusableButton.focus()
    return
  }

  if (!event.shiftKey && document.activeElement === lastFocusableButton) {
    event.preventDefault()
    firstFocusableButton.focus()
  }
}

export function ClearBuildConfirmationDialog({
  onCancel,
  onConfirm,
  pickedPerkCount,
}: {
  onCancel: () => void
  onConfirm: () => void
  pickedPerkCount: number
}) {
  const titleId = useId()
  const descriptionId = useId()
  const keepBuildButtonRef = useRef<HTMLButtonElement | null>(null)
  const pickedPerkLabel = `${pickedPerkCount} picked perk${pickedPerkCount === 1 ? '' : 's'}`

  useEffect(() => {
    keepBuildButtonRef.current?.focus()
  }, [])

  return (
    <div
      className="clear-build-dialog-backdrop"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          onCancel()
          return
        }

        keepKeyboardFocusInsideDialog(event)
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel()
        }
      }}
    >
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="clear-build-dialog"
        role="alertdialog"
      >
        <span aria-hidden="true" className="clear-build-dialog-icon">
          <CircleAlert className="clear-build-dialog-icon-svg" />
        </span>
        <div className="clear-build-dialog-copy">
          <h2 id={titleId}>Clear this build?</h2>
          <p id={descriptionId}>
            This removes {pickedPerkLabel} from the current planner. Saved builds are not affected.
          </p>
          <p className="clear-build-dialog-warning">This cannot be undone.</p>
        </div>
        <div className="clear-build-dialog-actions">
          <button
            className="planner-action-button saved-build-primary-button"
            onClick={onCancel}
            ref={keepBuildButtonRef}
            type="button"
          >
            <X aria-hidden="true" className="planner-button-icon" />
            Keep build
          </button>
          <button
            className="planner-action-button clear-build-confirm-button"
            onClick={onConfirm}
            type="button"
          >
            <RotateCcw aria-hidden="true" className="planner-button-icon" />
            Clear build
          </button>
        </div>
      </section>
    </div>
  )
}
