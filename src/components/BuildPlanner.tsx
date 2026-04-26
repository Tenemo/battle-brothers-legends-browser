import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react'
import {
  Check,
  CircleAlert,
  Copy,
  Download,
  FolderOpen,
  RotateCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import type {
  BuildPlannerGroupedPerkGroup,
  BuildPlannerPerkGroupRequirementOption,
} from '../lib/build-planner'
import type { SavedBuildPersistenceState } from '../lib/saved-builds-storage'
import './BuildPlanner.css'
import { getPerkPreviewParagraphs } from '../lib/perk-search'
import {
  formatPickedPerkCountLabel,
  getAnchoredTooltipStyle,
  getPerkDisplayIconPath,
  getPerkGroupHoverKey,
  renderGameIcon,
} from '../lib/perk-display'
import type { HoveredBuildPerkTooltip } from '../lib/use-perk-hover-state'
import type { LegendsPerkRecord } from '../types/legends-perks'

export type BuildPlannerSavedBuild = {
  availablePerkIds: string[]
  id: string
  missingPerkCount: number
  name: string
  perkNames: string[]
  pickedPerkCount: number
  referenceVersion: string
  updatedAt: string
}

export type SavedBuildOperationStatus =
  | 'copied'
  | 'copy-error'
  | 'deleted'
  | 'idle'
  | 'loaded'
  | 'saved'

type PlannerPerkGroupSelection = {
  categoryName: string
  perkGroupId: string
}

const buildPlannerGuidance =
  'Use the star in the detail panel or search results to collect perk picks, then review the shared perk groups and the remaining individual-perk groups below.'
const buildPlannerScrollConstraintMinimumWidth = 1280
const buildPlannerScrollConstraintMaximumWidth = 2560
const maximumVisiblePlannerContentRows = 2

function getVisualRowCount(elements: HTMLElement[]): number {
  const rowTops: number[] = []

  for (const element of elements) {
    const elementBox = element.getBoundingClientRect()

    if (elementBox.width === 0 || elementBox.height === 0) {
      continue
    }

    if (!rowTops.some((rowTop) => Math.abs(rowTop - elementBox.top) <= 2)) {
      rowTops.push(elementBox.top)
    }
  }

  return rowTops.length
}

function hasPlannerContentPastVisibleRows(plannerBoard: HTMLElement): boolean {
  const plannerCollections = [
    {
      itemSelector: '.planner-slot-perk',
      listSelector: '.planner-track-perks',
    },
    {
      itemSelector: '.planner-group-card',
      listSelector: '[data-testid="build-shared-groups-list"] .planner-group-list',
    },
    {
      itemSelector: '.planner-group-card',
      listSelector: '[data-testid="build-individual-groups-list"] .planner-group-list',
    },
  ]

  return plannerCollections.some(({ itemSelector, listSelector }) => {
    const plannerCollection = plannerBoard.querySelector(listSelector)

    if (!(plannerCollection instanceof HTMLElement)) {
      return false
    }

    const plannerItems = [...plannerCollection.querySelectorAll(itemSelector)].filter(
      (element): element is HTMLElement => element instanceof HTMLElement,
    )

    return getVisualRowCount(plannerItems) > maximumVisiblePlannerContentRows
  })
}

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

function getPlannerGroupCategoryLabel(
  perkGroupOptions: BuildPlannerPerkGroupRequirementOption[],
): string {
  return [...new Set(perkGroupOptions.map((perkGroupOption) => perkGroupOption.categoryName))].join(
    ' / ',
  )
}

function getPlannerGroupLabel(perkGroupOptions: BuildPlannerPerkGroupRequirementOption[]): string {
  return [
    ...new Set(perkGroupOptions.map((perkGroupOption) => perkGroupOption.perkGroupLabel)),
  ].join(' / ')
}

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

function BuildPlannerInfoButton() {
  const tooltipId = useId()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <span
      className="build-planner-info"
      onBlurCapture={(event) => {
        if (
          event.relatedTarget instanceof Node &&
          event.currentTarget.contains(event.relatedTarget)
        ) {
          return
        }

        setIsOpen(false)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setIsOpen(false)
        }
      }}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        aria-controls={isOpen ? tooltipId : undefined}
        aria-describedby={isOpen ? tooltipId : undefined}
        aria-expanded={isOpen}
        aria-label="Show build planner guidance"
        className="build-planner-info-button"
        onClick={() => setIsOpen((currentIsOpen) => !currentIsOpen)}
        onFocus={() => setIsOpen(true)}
        type="button"
      >
        i
      </button>
      {isOpen ? (
        <span className="build-planner-info-tooltip" id={tooltipId} role="tooltip">
          {buildPlannerGuidance}
        </span>
      ) : null}
    </span>
  )
}

function ClearBuildConfirmationDialog({
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

function SavedBuildsDialog({
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

        <div className="saved-builds-list" data-testid="saved-builds-list">
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

function renderPlannerGroupCard({
  groupedPerkGroup,
  hoveredPerkGroupKey,
  hoveredPerkId,
  hoveredTooltipId,
  keyPrefix,
  onCloseHover,
  onCloseTooltip,
  onInspectPerk,
  onOpenHover,
  onOpenTooltip,
}: {
  groupedPerkGroup: BuildPlannerGroupedPerkGroup
  hoveredPerkGroupKey: string | null
  hoveredPerkId: string | null
  hoveredTooltipId: string | undefined
  keyPrefix: string
  onCloseHover: (perkId: string) => void
  onCloseTooltip: () => void
  onInspectPerk: (perkId: string, perkGroupSelection?: PlannerPerkGroupSelection) => void
  onOpenHover: (perkId: string) => void
  onOpenTooltip: (perkId: string, currentTarget: HTMLButtonElement) => void
}) {
  const plannerGroupLabel = getPlannerGroupLabel(groupedPerkGroup.perkGroupOptions)
  const isHighlighted = groupedPerkGroup.perkGroupOptions.some(
    (perkGroupOption) =>
      hoveredPerkGroupKey ===
      getPerkGroupHoverKey({
        categoryName: perkGroupOption.categoryName,
        perkGroupId: perkGroupOption.perkGroupId,
      }),
  )

  return (
    <article
      className={isHighlighted ? 'planner-group-card is-highlighted' : 'planner-group-card'}
      key={`${keyPrefix}-${groupedPerkGroup.perkIds.join('::')}::${plannerGroupLabel}`}
    >
      <div className="planner-group-card-header">
        <div className="planner-card-icon-stack">
          {groupedPerkGroup.perkGroupOptions.map((perkGroupOption) => (
            <span className="planner-card-icon-stack-item" key={perkGroupOption.perkGroupId}>
              {renderGameIcon({
                className: 'perk-icon perk-icon-group',
                iconPath: perkGroupOption.perkGroupIconPath,
                label: `${perkGroupOption.perkGroupLabel} perk group icon`,
              })}
            </span>
          ))}
        </div>
        <div className="planner-group-card-copy">
          <div className="planner-slot-topline">
            <span className="planner-slot-category">
              {getPlannerGroupCategoryLabel(groupedPerkGroup.perkGroupOptions)}
            </span>
            <span className="planner-slot-group-count">
              {formatPickedPerkCountLabel(groupedPerkGroup.perkNames.length)}
            </span>
          </div>
          <strong className="planner-slot-name" title={plannerGroupLabel}>
            {plannerGroupLabel}
          </strong>
        </div>
      </div>
      <div className="planner-pill-list">
        {groupedPerkGroup.perkNames.map((perkName, perkIndex) => {
          const perkId = groupedPerkGroup.perkIds[perkIndex]
          const perkGroupSelection = groupedPerkGroup.perkGroupOptions[0]

          return perkId ? (
            <button
              aria-describedby={hoveredPerkId === perkId ? hoveredTooltipId : undefined}
              className={hoveredPerkId === perkId ? 'planner-pill is-highlighted' : 'planner-pill'}
              key={`${plannerGroupLabel}-${perkId}`}
              onBlur={() => {
                onCloseTooltip()
                onCloseHover(perkId)
              }}
              onClick={() => {
                onInspectPerk(
                  perkId,
                  perkGroupSelection
                    ? {
                        categoryName: perkGroupSelection.categoryName,
                        perkGroupId: perkGroupSelection.perkGroupId,
                      }
                    : undefined,
                )
              }}
              onFocus={(event) => onOpenTooltip(perkId, event.currentTarget)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  onCloseTooltip()
                }
              }}
              onMouseEnter={() => onOpenHover(perkId)}
              onMouseLeave={() => onCloseHover(perkId)}
              type="button"
            >
              {perkName}
            </button>
          ) : (
            <span className="planner-pill" key={`${plannerGroupLabel}-${perkName}`}>
              {perkName}
            </span>
          )
        })}
      </div>
    </article>
  )
}

export function BuildPlanner({
  hasActiveBackgroundFitSearch,
  hoveredBuildPerk,
  hoveredBuildPerkTooltip,
  hoveredBuildPerkTooltipId,
  hoveredPerkGroupKey,
  hoveredPerkId,
  individualPerkGroups,
  isSavedBuildsLoading,
  onClearBuild,
  onCloseBuildPerkHover,
  onCloseBuildPerkTooltip,
  onCopySavedBuildLink,
  onDeleteSavedBuild,
  onInspectPlannerPerk,
  onLoadSavedBuild,
  onOpenBuildPerkHover,
  onOpenBuildPerkTooltip,
  onRemovePickedPerk,
  onSaveCurrentBuild,
  onShareBuild,
  pickedPerks,
  savedBuildOperationStatus,
  savedBuildPersistenceState,
  savedBuilds,
  savedBuildsErrorMessage,
  shareBuildStatus,
  sharedPerkGroups,
}: {
  hasActiveBackgroundFitSearch: boolean
  hoveredBuildPerk: LegendsPerkRecord | null
  hoveredBuildPerkTooltip: HoveredBuildPerkTooltip | null
  hoveredBuildPerkTooltipId: string | undefined
  hoveredPerkGroupKey: string | null
  hoveredPerkId: string | null
  individualPerkGroups: BuildPlannerGroupedPerkGroup[]
  isSavedBuildsLoading: boolean
  onClearBuild: () => void
  onCloseBuildPerkHover: (perkId: string) => void
  onCloseBuildPerkTooltip: () => void
  onCopySavedBuildLink: (savedBuildId: string) => Promise<void>
  onDeleteSavedBuild: (savedBuildId: string) => Promise<void>
  onInspectPlannerPerk: (perkId: string, perkGroupSelection?: PlannerPerkGroupSelection) => void
  onLoadSavedBuild: (savedBuildId: string) => void
  onOpenBuildPerkHover: (perkId: string) => void
  onOpenBuildPerkTooltip: (perkId: string, currentTarget: HTMLButtonElement) => void
  onRemovePickedPerk: (perkId: string) => void
  onSaveCurrentBuild: (name: string) => Promise<void>
  onShareBuild: () => Promise<void>
  pickedPerks: LegendsPerkRecord[]
  savedBuildOperationStatus: SavedBuildOperationStatus
  savedBuildPersistenceState: SavedBuildPersistenceState
  savedBuilds: BuildPlannerSavedBuild[]
  savedBuildsErrorMessage: string | null
  shareBuildStatus: 'copied' | 'error' | 'idle'
  sharedPerkGroups: BuildPlannerGroupedPerkGroup[]
}) {
  const hasPickedPerks = pickedPerks.length > 0
  const hasIndividualPerkGroups = individualPerkGroups.length > 0
  const plannerBoardRef = useRef<HTMLDivElement | null>(null)
  const clearBuildButtonRef = useRef<HTMLButtonElement | null>(null)
  const [isPlannerScrollConstrained, setIsPlannerScrollConstrained] = useState(false)
  const [isClearBuildDialogOpen, setIsClearBuildDialogOpen] = useState(false)
  const [isSavedBuildsDialogOpen, setIsSavedBuildsDialogOpen] = useState(false)
  const updatePlannerScrollConstraint = useCallback(() => {
    const plannerBoard = plannerBoardRef.current
    const shouldConstrainPlanner =
      plannerBoard !== null &&
      window.innerWidth >= buildPlannerScrollConstraintMinimumWidth &&
      window.innerWidth < buildPlannerScrollConstraintMaximumWidth &&
      hasPlannerContentPastVisibleRows(plannerBoard)

    setIsPlannerScrollConstrained((currentShouldConstrainPlanner) =>
      currentShouldConstrainPlanner === shouldConstrainPlanner
        ? currentShouldConstrainPlanner
        : shouldConstrainPlanner,
    )
  }, [])
  const buildPlannerClassName = [
    'build-planner',
    hasPickedPerks ? 'has-picked-perks' : '',
    isPlannerScrollConstrained ? 'is-scroll-constrained' : '',
    hasActiveBackgroundFitSearch ? 'is-background-fit-search-active' : '',
  ]
    .filter(Boolean)
    .join(' ')

  useEffect(() => {
    let animationFrameId = 0

    function schedulePlannerScrollConstraintUpdate() {
      window.cancelAnimationFrame(animationFrameId)
      animationFrameId = window.requestAnimationFrame(updatePlannerScrollConstraint)
    }

    schedulePlannerScrollConstraintUpdate()
    window.addEventListener('resize', schedulePlannerScrollConstraintUpdate)

    const plannerBoard = plannerBoardRef.current
    const plannerResizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(schedulePlannerScrollConstraintUpdate)

    if (plannerBoard !== null) {
      plannerResizeObserver?.observe(plannerBoard)
      plannerBoard
        .querySelectorAll('.planner-track-perks, .planner-group-list')
        .forEach((plannerCollection) => plannerResizeObserver?.observe(plannerCollection))
    }

    return () => {
      window.cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', schedulePlannerScrollConstraintUpdate)
      plannerResizeObserver?.disconnect()
    }
  }, [
    individualPerkGroups.length,
    pickedPerks.length,
    sharedPerkGroups.length,
    updatePlannerScrollConstraint,
  ])

  function handleCloseClearBuildDialog() {
    setIsClearBuildDialogOpen(false)
    window.setTimeout(() => {
      clearBuildButtonRef.current?.focus()
    }, 0)
  }

  function handleConfirmClearBuild() {
    setIsClearBuildDialogOpen(false)

    if (hasPickedPerks) {
      onClearBuild()
    }
  }

  return (
    <>
      <section aria-label="Build planner" className={buildPlannerClassName}>
        <div className="build-planner-header">
          <div className="build-planner-title-row">
            <div className="build-planner-title">
              <h2>Build planner</h2>
              {hasPickedPerks ? <BuildPlannerInfoButton /> : null}
            </div>
          </div>
          <div className="build-planner-actions">
            <p className="build-planner-count">
              {!hasPickedPerks
                ? 'No perks picked yet.'
                : `${pickedPerks.length} perk${pickedPerks.length === 1 ? '' : 's'} picked.`}
            </p>
            <button
              aria-label="Save current build"
              className="planner-action-button saved-build-action-button"
              disabled={!hasPickedPerks}
              onClick={() => setIsSavedBuildsDialogOpen(true)}
              type="button"
            >
              <Save aria-hidden="true" className="planner-button-icon" />
              Save build
            </button>
            <button
              aria-label="Open saved builds"
              className="planner-action-button saved-build-action-button"
              onClick={() => setIsSavedBuildsDialogOpen(true)}
              type="button"
            >
              <FolderOpen aria-hidden="true" className="planner-button-icon" />
              Saved builds
            </button>
            <button
              aria-label="Copy build link"
              className={
                shareBuildStatus === 'copied'
                  ? 'planner-action-button share-build-button is-confirmed'
                  : shareBuildStatus === 'error'
                    ? 'planner-action-button share-build-button is-error'
                    : 'planner-action-button share-build-button'
              }
              disabled={pickedPerks.length === 0}
              onClick={() => {
                void onShareBuild()
              }}
              type="button"
            >
              {shareBuildStatus === 'copied' ? (
                <Check aria-hidden="true" className="planner-button-icon" />
              ) : shareBuildStatus === 'error' ? (
                <CircleAlert aria-hidden="true" className="planner-button-icon" />
              ) : (
                <Copy aria-hidden="true" className="planner-button-icon" />
              )}
              {shareBuildStatus === 'copied'
                ? 'Copied'
                : shareBuildStatus === 'error'
                  ? 'Copy failed'
                  : 'Copy build link'}
            </button>
            <button
              aria-label="Clear build"
              className="planner-action-button clear-build-action-button"
              disabled={pickedPerks.length === 0}
              onClick={() => setIsClearBuildDialogOpen(true)}
              ref={clearBuildButtonRef}
              type="button"
            >
              <RotateCcw aria-hidden="true" className="planner-button-icon" />
              Clear build
            </button>
          </div>
        </div>

        <div
          className="planner-board"
          onScrollCapture={onCloseBuildPerkTooltip}
          ref={plannerBoardRef}
        >
          <div className="planner-row">
            <span className="planner-row-label">Perks</span>
            <div className="planner-track-scroll">
              <div className="planner-track planner-track-perks" data-testid="build-perks-bar">
                {hasPickedPerks ? (
                  pickedPerks.map((pickedPerk) => (
                    <div
                      className={
                        hoveredPerkId === pickedPerk.id
                          ? 'planner-slot planner-slot-perk is-highlighted'
                          : 'planner-slot planner-slot-perk'
                      }
                      key={pickedPerk.id}
                      onBlurCapture={(event) => {
                        if (
                          event.relatedTarget instanceof Node &&
                          event.currentTarget.contains(event.relatedTarget)
                        ) {
                          return
                        }

                        onCloseBuildPerkTooltip()
                        onCloseBuildPerkHover(pickedPerk.id)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') {
                          onCloseBuildPerkTooltip()
                        }
                      }}
                      onMouseEnter={() => onOpenBuildPerkHover(pickedPerk.id)}
                      onMouseLeave={() => onCloseBuildPerkHover(pickedPerk.id)}
                    >
                      <button
                        aria-describedby={
                          hoveredBuildPerk?.id === pickedPerk.id
                            ? hoveredBuildPerkTooltipId
                            : undefined
                        }
                        aria-label={`View ${pickedPerk.perkName} from build planner`}
                        className="planner-slot-perk-inspect"
                        onClick={() => onInspectPlannerPerk(pickedPerk.id)}
                        onFocus={(event) =>
                          onOpenBuildPerkTooltip(pickedPerk.id, event.currentTarget)
                        }
                        type="button"
                      >
                        {renderGameIcon({
                          className: 'perk-icon perk-icon-tiny',
                          iconPath: getPerkDisplayIconPath(pickedPerk),
                          label: `${pickedPerk.perkName} build icon`,
                        })}
                        <strong className="planner-picked-perk-name">{pickedPerk.perkName}</strong>
                      </button>
                      <button
                        aria-label={`Remove ${pickedPerk.perkName} from build`}
                        className="search-clear-button planner-slot-remove-button"
                        onClick={() => onRemovePickedPerk(pickedPerk.id)}
                        onFocus={onCloseBuildPerkTooltip}
                        type="button"
                      >
                        <span aria-hidden="true" className="search-clear-icon" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="planner-slot planner-slot-placeholder is-placeholder">
                    <div className="planner-slot-copy">
                      <strong className="planner-slot-name">Pick a perk to start</strong>
                      <p className="planner-slot-meta">
                        Use the star in the detail panel or the search results list.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="planner-row">
            <span className="planner-row-label">Perk groups for 2+ perks</span>
            <div className="planner-section" data-testid="build-shared-groups-list">
              {sharedPerkGroups.length > 0 ? (
                <div className="planner-group-list">
                  {sharedPerkGroups.map((sharedPerkGroup) =>
                    renderPlannerGroupCard({
                      groupedPerkGroup: sharedPerkGroup,
                      hoveredPerkGroupKey,
                      hoveredPerkId,
                      hoveredTooltipId: hoveredBuildPerkTooltipId,
                      keyPrefix: 'shared',
                      onCloseHover: onCloseBuildPerkHover,
                      onCloseTooltip: onCloseBuildPerkTooltip,
                      onInspectPerk: onInspectPlannerPerk,
                      onOpenHover: onOpenBuildPerkHover,
                      onOpenTooltip: onOpenBuildPerkTooltip,
                    }),
                  )}
                </div>
              ) : (
                <div className="planner-section-placeholder">
                  <strong className="planner-slot-name">
                    Perk groups covering 2 or more picked perks will appear here
                  </strong>
                  <p className="planner-slot-meta">
                    When multiple picked perks share a perk group, it will show up here with every
                    covered perk listed on the card.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="planner-row">
            <span className="planner-row-label">Perk groups for individual perks</span>
            <div className="planner-section" data-testid="build-individual-groups-list">
              {hasPickedPerks ? (
                hasIndividualPerkGroups ? (
                  <div className="planner-group-list">
                    {individualPerkGroups.map((individualPerkGroup) =>
                      renderPlannerGroupCard({
                        groupedPerkGroup: individualPerkGroup,
                        hoveredPerkGroupKey,
                        hoveredPerkId,
                        hoveredTooltipId: hoveredBuildPerkTooltipId,
                        keyPrefix: 'individual',
                        onCloseHover: onCloseBuildPerkHover,
                        onCloseTooltip: onCloseBuildPerkTooltip,
                        onInspectPerk: onInspectPlannerPerk,
                        onOpenHover: onOpenBuildPerkHover,
                        onOpenTooltip: onOpenBuildPerkTooltip,
                      }),
                    )}
                  </div>
                ) : (
                  <div className="planner-section-placeholder">
                    <strong className="planner-slot-name">
                      This build has no individual-only perk groups
                    </strong>
                    <p className="planner-slot-meta">
                      Every available perk group for the current build already covers two or more
                      picked perks.
                    </p>
                  </div>
                )
              ) : (
                <div className="planner-section-placeholder">
                  <strong className="planner-slot-name">
                    Individual perk groups will appear here
                  </strong>
                  <p className="planner-slot-meta">
                    Perk groups that only match one picked perk are merged by perk and shown here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {isSavedBuildsDialogOpen ? (
        <SavedBuildsDialog
          isSavedBuildsLoading={isSavedBuildsLoading}
          onClose={() => setIsSavedBuildsDialogOpen(false)}
          onCopySavedBuildLink={onCopySavedBuildLink}
          onDeleteSavedBuild={onDeleteSavedBuild}
          onLoadSavedBuild={onLoadSavedBuild}
          onSaveCurrentBuild={onSaveCurrentBuild}
          pickedPerks={pickedPerks}
          savedBuildOperationStatus={savedBuildOperationStatus}
          savedBuildPersistenceState={savedBuildPersistenceState}
          savedBuilds={savedBuilds}
          savedBuildsErrorMessage={savedBuildsErrorMessage}
        />
      ) : null}

      {isClearBuildDialogOpen && hasPickedPerks ? (
        <ClearBuildConfirmationDialog
          onCancel={handleCloseClearBuildDialog}
          onConfirm={handleConfirmClearBuild}
          pickedPerkCount={pickedPerks.length}
        />
      ) : null}

      {hoveredBuildPerk !== null && hoveredBuildPerkTooltip !== null ? (
        <div
          className="build-perk-tooltip"
          id={hoveredBuildPerkTooltipId}
          role="tooltip"
          style={getAnchoredTooltipStyle(hoveredBuildPerkTooltip.anchorRectangle)}
        >
          <strong className="build-perk-tooltip-title">{hoveredBuildPerk.perkName}</strong>
          <div className="build-perk-tooltip-copy">
            {getPerkPreviewParagraphs(hoveredBuildPerk).map(
              (previewParagraph, previewParagraphIndex) => (
                <p key={`${hoveredBuildPerk.id}-tooltip-${previewParagraphIndex}`}>
                  {previewParagraph}
                </p>
              ),
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}
