import { type MouseEvent, Suspense, lazy, useId, useRef, useState } from 'react'
import { Check, CircleAlert, Copy, FolderOpen, RotateCcw } from 'lucide-react'
import { joinClassNames } from '../lib/class-names'
import type { BuildPlannerGroupedPerkGroup } from '../lib/build-planner'
import {
  usePlannerInteractionActions,
  usePlannerInteractionState,
} from '../lib/planner-interaction-context-values'
import { getAnchoredTooltipStyle } from '../lib/perk-display'
import { getPerkPreviewParagraphs } from '../lib/perk-search'
import { useBuildPerkTooltipPreview } from '../lib/use-build-perk-tooltip-preview'
import type { SavedBuildPersistenceState } from '../lib/saved-builds-storage'
import { BuildPlannerBoard, BuildPlannerRequirementLegend } from './BuildPlannerBoard'
import { BuildToggleButton, type BuildRequirement } from './SharedControls'
import type {
  BuildPlannerPickedPerk,
  BuildPlannerSavedBuild,
  PlannerPerkGroupSelection,
  SavedBuildOperationStatus,
} from './build-planner-types'
import { usePlannerScrollConstraint } from './use-planner-scroll-constraint'
import styles from './BuildPlanner.module.scss'

export type { BuildPlannerSavedBuild, SavedBuildOperationStatus } from './build-planner-types'

const buildPlannerGuidance =
  'Use the chain/split control in the detail panel or search results to collect perk picks. Chain adds must-have perks for the main build chance; split adds optional perks for full-build coverage. Optional perks move to the end, stay visible, and are scored separately from must-have perks.'

function loadClearBuildConfirmationDialogModule() {
  return import('./ClearBuildConfirmationDialog')
}

function loadSavedBuildsDialogModule() {
  return import('./SavedBuildsDialog')
}

const ClearBuildConfirmationDialog = lazy(() =>
  loadClearBuildConfirmationDialogModule().then((dialogModule) => ({
    default: dialogModule.ClearBuildConfirmationDialog,
  })),
)

const SavedBuildsDialog = lazy(() =>
  loadSavedBuildsDialogModule().then((dialogModule) => ({
    default: dialogModule.SavedBuildsDialog,
  })),
)

function BuildPlannerInfoButton() {
  const tooltipId = useId()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <span
      className={styles.buildPlannerInfo}
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
        className={styles.buildPlannerInfoButton}
        onClick={() => setIsOpen((currentIsOpen) => !currentIsOpen)}
        onFocus={() => setIsOpen(true)}
        type="button"
      >
        {/* This is intentionally a lowercase handwritten-style i, not a roman numeral I. */}
        <span
          aria-hidden="true"
          className={styles.buildPlannerInfoGlyph}
          data-testid="build-planner-info-glyph"
        >
          i
        </span>
      </button>
      {isOpen ? (
        <span
          className={styles.buildPlannerInfoTooltip}
          data-testid="build-planner-info-tooltip"
          id={tooltipId}
          role="tooltip"
        >
          {buildPlannerGuidance}
        </span>
      ) : null}
    </span>
  )
}

export function BuildPlanner({
  hasActiveBackgroundFitSearch,
  individualPerkGroups,
  isSavedBuildsLoading,
  onAddPerkToBuild,
  onClearBuild,
  onCopySavedBuildLink,
  onDeleteSavedBuild,
  onInspectPerkGroup,
  onInspectPlannerPerk,
  onLoadSavedBuild,
  onOverwriteSavedBuild,
  onRemovePickedPerk,
  onTogglePickedPerkOptional,
  onSaveCurrentBuild,
  onShareBuild,
  pickedPerks,
  savedBuildOperationStatus,
  savedBuildPersistenceState,
  savedBuilds,
  savedBuildsErrorMessage,
  selectedBuildPlannerPerkId,
  shareBuildStatus,
  shouldRenderPerkGroupCards,
  sharedPerkGroups,
}: {
  hasActiveBackgroundFitSearch: boolean
  individualPerkGroups: BuildPlannerGroupedPerkGroup[]
  isSavedBuildsLoading: boolean
  onClearBuild: () => void
  onCopySavedBuildLink: (savedBuildId: string) => Promise<void>
  onDeleteSavedBuild: (savedBuildId: string) => Promise<void>
  onInspectPerkGroup: (categoryName: string, perkGroupId: string) => void
  onInspectPlannerPerk: (perkId: string, perkGroupSelection?: PlannerPerkGroupSelection) => void
  onLoadSavedBuild: (savedBuildId: string) => void
  onOverwriteSavedBuild: (savedBuildId: string) => Promise<void>
  onAddPerkToBuild: (perkId: string, requirement: BuildRequirement) => void
  onRemovePickedPerk: (perkId: string) => void
  onTogglePickedPerkOptional: (perkId: string) => void
  onSaveCurrentBuild: (name: string) => Promise<void>
  onShareBuild: () => Promise<void>
  pickedPerks: BuildPlannerPickedPerk[]
  savedBuildOperationStatus: SavedBuildOperationStatus
  savedBuildPersistenceState: SavedBuildPersistenceState
  savedBuilds: BuildPlannerSavedBuild[]
  savedBuildsErrorMessage: string | null
  selectedBuildPlannerPerkId: string | null
  shareBuildStatus: 'copied' | 'error' | 'idle'
  shouldRenderPerkGroupCards: boolean
  sharedPerkGroups: BuildPlannerGroupedPerkGroup[]
}) {
  const { hoveredBuildPerk, hoveredBuildPerkTooltip, hoveredBuildPerkTooltipId } =
    usePlannerInteractionState()
  const {
    closeBuildPerkHover: onCloseBuildPerkHover,
    closeBuildPerkTooltip: onCloseBuildPerkTooltip,
    openBuildPerkHover: onOpenBuildPerkHover,
    openBuildPerkTooltip: onOpenBuildPerkTooltip,
  } = usePlannerInteractionActions()
  const hasPickedPerks = pickedPerks.length > 0
  const clearBuildButtonRef = useRef<HTMLButtonElement | null>(null)
  const savedBuildsDialogReturnFocusElementRef = useRef<HTMLButtonElement | null>(null)
  const [isSharedPerkGroupsSectionExpanded, setIsSharedPerkGroupsSectionExpanded] = useState(true)
  const [isIndividualPerkGroupsSectionExpanded, setIsIndividualPerkGroupsSectionExpanded] =
    useState(true)
  const [isClearBuildDialogOpen, setIsClearBuildDialogOpen] = useState(false)
  const [isSavedBuildsDialogOpen, setIsSavedBuildsDialogOpen] = useState(false)
  const { isPlannerScrollConstrained, plannerBoardRef } = usePlannerScrollConstraint({
    individualPerkGroupCount: individualPerkGroups.length,
    isIndividualPerkGroupsSectionExpanded,
    isSharedPerkGroupsSectionExpanded,
    pickedPerkCount: pickedPerks.length,
    sharedPerkGroupCount: sharedPerkGroups.length,
  })
  const {
    activeTooltipIndicatorPerkId,
    clearPendingTooltip,
    clearPointerPreviewSuppression,
    clearTooltipCloseTimer,
    closeTooltipPreview,
    openTooltipPreview,
    suppressTooltipPreviewUntilPointerMove,
  } = useBuildPerkTooltipPreview({
    hoveredBuildPerkId: hoveredBuildPerk?.id ?? null,
    onCloseHover: onCloseBuildPerkHover,
    onCloseTooltip: onCloseBuildPerkTooltip,
    onOpenHover: onOpenBuildPerkHover,
    onOpenTooltip: onOpenBuildPerkTooltip,
  })
  const hoveredBuildPerkPickedPerk =
    hoveredBuildPerk === null
      ? undefined
      : pickedPerks.find((pickedPerk) => pickedPerk.id === hoveredBuildPerk.id)
  const hoveredBuildPerkPickedRequirement: BuildRequirement | null =
    hoveredBuildPerkPickedPerk === undefined
      ? null
      : hoveredBuildPerkPickedPerk.isOptional
        ? 'optional'
        : 'must-have'

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

  function handleOpenSavedBuildsDialog(event: MouseEvent<HTMLButtonElement>) {
    savedBuildsDialogReturnFocusElementRef.current = event.currentTarget
    setIsSavedBuildsDialogOpen(true)
  }

  function handleCloseSavedBuildsDialog() {
    setIsSavedBuildsDialogOpen(false)
    window.setTimeout(() => {
      savedBuildsDialogReturnFocusElementRef.current?.focus()
    }, 0)
  }

  function handleToggleSharedPerkGroupsSection() {
    clearPendingTooltip()
    onCloseBuildPerkTooltip()
    setIsSharedPerkGroupsSectionExpanded((isExpanded) => !isExpanded)
  }

  function handleToggleIndividualPerkGroupsSection() {
    clearPendingTooltip()
    onCloseBuildPerkTooltip()
    setIsIndividualPerkGroupsSectionExpanded((isExpanded) => !isExpanded)
  }

  return (
    <>
      <section
        aria-label="Build planner"
        className={styles.buildPlanner}
        data-background-fit-search-active={hasActiveBackgroundFitSearch}
        data-has-picked-perks={hasPickedPerks}
        data-scroll-constrained={isPlannerScrollConstrained}
      >
        <div className={styles.buildPlannerHeader} data-testid="build-planner-header">
          <div className={styles.buildPlannerTitleRow}>
            {hasPickedPerks ? <BuildPlannerInfoButton /> : null}
            <BuildPlannerRequirementLegend />
          </div>
          <div className={styles.buildPlannerActions}>
            <p className={styles.buildPlannerCount} data-testid="build-planner-count">
              {!hasPickedPerks
                ? 'No perks picked yet.'
                : `${pickedPerks.length} perk${pickedPerks.length === 1 ? '' : 's'} picked.`}
            </p>
            <button
              aria-label="Saved builds"
              className={joinClassNames(styles.plannerActionButton, styles.savedBuildActionButton)}
              onClick={handleOpenSavedBuildsDialog}
              onFocus={() => {
                void loadSavedBuildsDialogModule()
              }}
              onPointerEnter={() => {
                void loadSavedBuildsDialogModule()
              }}
              onPointerDown={() => {
                void loadSavedBuildsDialogModule()
              }}
              type="button"
            >
              <FolderOpen aria-hidden="true" className={styles.plannerButtonIcon} />
              Saved builds
            </button>
            <button
              aria-label="Copy build link"
              className={joinClassNames(styles.plannerActionButton, styles.shareBuildButton)}
              data-status={shareBuildStatus === 'idle' ? undefined : shareBuildStatus}
              disabled={pickedPerks.length === 0}
              onClick={() => {
                void onShareBuild()
              }}
              type="button"
            >
              {shareBuildStatus === 'copied' ? (
                <Check aria-hidden="true" className={styles.plannerButtonIcon} />
              ) : shareBuildStatus === 'error' ? (
                <CircleAlert aria-hidden="true" className={styles.plannerButtonIcon} />
              ) : (
                <Copy aria-hidden="true" className={styles.plannerButtonIcon} />
              )}
              {shareBuildStatus === 'copied'
                ? 'Copied'
                : shareBuildStatus === 'error'
                  ? 'Copy failed'
                  : 'Copy build link'}
            </button>
            <button
              aria-label="Clear build"
              className={joinClassNames(styles.plannerActionButton, styles.clearBuildActionButton)}
              data-testid="clear-build-button"
              disabled={pickedPerks.length === 0}
              onClick={() => setIsClearBuildDialogOpen(true)}
              onFocus={() => {
                void loadClearBuildConfirmationDialogModule()
              }}
              onPointerEnter={() => {
                void loadClearBuildConfirmationDialogModule()
              }}
              onPointerDown={() => {
                void loadClearBuildConfirmationDialogModule()
              }}
              ref={clearBuildButtonRef}
              type="button"
            >
              <RotateCcw aria-hidden="true" className={styles.plannerButtonIcon} />
              Clear build
            </button>
          </div>
        </div>

        <BuildPlannerBoard
          activeBuildPerkTooltipIndicatorPerkId={activeTooltipIndicatorPerkId}
          clearPendingBuildPerkTooltip={clearPendingTooltip}
          closeBuildPerkTooltipPreview={closeTooltipPreview}
          individualPerkGroups={individualPerkGroups}
          isIndividualPerkGroupsSectionExpanded={isIndividualPerkGroupsSectionExpanded}
          isSharedPerkGroupsSectionExpanded={isSharedPerkGroupsSectionExpanded}
          onInspectPerkGroup={onInspectPerkGroup}
          onInspectPlannerPerk={onInspectPlannerPerk}
          onRemovePickedPerk={onRemovePickedPerk}
          onTogglePickedPerkOptional={onTogglePickedPerkOptional}
          onToggleIndividualPerkGroupsSection={handleToggleIndividualPerkGroupsSection}
          onToggleSharedPerkGroupsSection={handleToggleSharedPerkGroupsSection}
          clearBuildPerkTooltipPointerPreviewSuppression={clearPointerPreviewSuppression}
          openBuildPerkTooltipPreview={openTooltipPreview}
          pickedPerks={pickedPerks}
          plannerBoardRef={plannerBoardRef}
          selectedBuildPlannerPerkId={selectedBuildPlannerPerkId}
          shouldRenderPerkGroupCards={shouldRenderPerkGroupCards}
          sharedPerkGroups={sharedPerkGroups}
          suppressBuildPerkTooltipPreviewUntilPointerMove={suppressTooltipPreviewUntilPointerMove}
        />
      </section>

      <Suspense fallback={null}>
        {isSavedBuildsDialogOpen ? (
          <SavedBuildsDialog
            isSavedBuildsLoading={isSavedBuildsLoading}
            onClose={handleCloseSavedBuildsDialog}
            onCopySavedBuildLink={onCopySavedBuildLink}
            onDeleteSavedBuild={onDeleteSavedBuild}
            onLoadSavedBuild={onLoadSavedBuild}
            onOverwriteSavedBuild={onOverwriteSavedBuild}
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
      </Suspense>

      {hoveredBuildPerk !== null && hoveredBuildPerkTooltip !== null ? (
        <div
          aria-label={`${hoveredBuildPerk.perkName} build preview and actions`}
          className={styles.buildPerkTooltip}
          data-build-perk-tooltip="true"
          data-testid="build-perk-tooltip"
          id={hoveredBuildPerkTooltipId}
          onBlurCapture={(event) => {
            if (
              event.relatedTarget instanceof Node &&
              event.currentTarget.contains(event.relatedTarget)
            ) {
              return
            }

            clearPendingTooltip()
            onCloseBuildPerkTooltip()
            onCloseBuildPerkHover(hoveredBuildPerk.id)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              clearPendingTooltip()
              onCloseBuildPerkTooltip()
              onCloseBuildPerkHover(hoveredBuildPerk.id)
            }
          }}
          onMouseEnter={clearTooltipCloseTimer}
          onMouseLeave={() => {
            clearPendingTooltip()
            onCloseBuildPerkTooltip()
            onCloseBuildPerkHover(hoveredBuildPerk.id)
          }}
          role="dialog"
          style={getAnchoredTooltipStyle(hoveredBuildPerkTooltip.anchorRectangle)}
        >
          <div className={styles.buildPerkTooltipAction} data-testid="build-perk-tooltip-action">
            <BuildToggleButton
              isCompact
              onAddMustHave={() => onAddPerkToBuild(hoveredBuildPerk.id, 'must-have')}
              onAddOptional={() => onAddPerkToBuild(hoveredBuildPerk.id, 'optional')}
              onRemove={() => onRemovePickedPerk(hoveredBuildPerk.id)}
              pickedRequirement={hoveredBuildPerkPickedRequirement}
              perkName={hoveredBuildPerk.perkName}
              source="tooltip"
            />
          </div>
          <div className={styles.buildPerkTooltipCopy}>
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
