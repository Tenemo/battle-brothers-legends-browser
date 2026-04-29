import { type KeyboardEvent, useEffect, useId, useRef } from 'react'
import { CircleAlert, RotateCcw, X } from 'lucide-react'
import { joinClassNames } from '../lib/class-names'
import styles from './BuildPlanner.module.scss'

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
      className={styles.dialogBackdrop}
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
        className={styles.clearBuildDialog}
        role="alertdialog"
      >
        <span aria-hidden="true" className={styles.clearBuildDialogIcon}>
          <CircleAlert className={styles.clearBuildDialogIconSvg} />
        </span>
        <div className={styles.clearBuildDialogCopy}>
          <h2 id={titleId}>Clear this build?</h2>
          <p id={descriptionId}>
            This removes {pickedPerkLabel} from the current planner. Saved builds are not affected.
          </p>
          <p className={styles.clearBuildDialogWarning}>This cannot be undone.</p>
        </div>
        <div className={styles.clearBuildDialogActions}>
          <button
            className={joinClassNames(styles.plannerActionButton, styles.savedBuildPrimaryButton)}
            onClick={onCancel}
            ref={keepBuildButtonRef}
            type="button"
          >
            <X aria-hidden="true" className={styles.plannerButtonIcon} />
            Keep build
          </button>
          <button
            className={joinClassNames(styles.plannerActionButton, styles.clearBuildConfirmButton)}
            onClick={onConfirm}
            type="button"
          >
            <RotateCcw aria-hidden="true" className={styles.plannerButtonIcon} />
            Clear build
          </button>
        </div>
      </section>
    </div>
  )
}
