import { type MouseEvent, useId, useRef, useState } from 'react'
import { Check, CircleAlert, Copy, FolderOpen, RotateCcw, Save } from 'lucide-react'
import { joinClassNames } from '../lib/class-names'
import type { BuildPlannerGroupedPerkGroup } from '../lib/build-planner'
import { getAnchoredTooltipStyle } from '../lib/perk-display'
import { getPerkPreviewParagraphs } from '../lib/perk-search'
import { useBuildPerkTooltipPreview } from '../lib/use-build-perk-tooltip-preview'
import type { HoveredBuildPerkTooltip } from '../lib/use-perk-interaction-state'
import type { SavedBuildPersistenceState } from '../lib/saved-builds-storage'
import type { LegendsPerkRecord } from '../types/legends-perks'
import { BuildPlannerBoard } from './BuildPlannerBoard'
import { ClearBuildConfirmationDialog } from './ClearBuildConfirmationDialog'
import { SavedBuildsDialog } from './SavedBuildsDialog'
import type {
  BuildPlannerSavedBuild,
  PlannerPerkGroupSelection,
  SavedBuildOperationStatus,
} from './build-planner-types'
import { usePlannerScrollConstraint } from './use-planner-scroll-constraint'
import styles from './BuildPlanner.module.scss'

export type { BuildPlannerSavedBuild, SavedBuildOperationStatus } from './build-planner-types'

const buildPlannerGuidance =
  'Use the star in the detail panel or search results to collect perk picks, then review the shared perk groups and the remaining individual-perk groups below.'

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
        i
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
  emphasizedCategoryNames,
  emphasizedPerkGroupKeys,
  hasActiveBackgroundFitSearch,
  hoveredBuildPerk,
  hoveredBuildPerkTooltip,
  hoveredBuildPerkTooltipId,
  hoveredPerkId,
  individualPerkGroups,
  isSavedBuildsLoading,
  onClearBuild,
  onCloseBuildPerkHover,
  onCloseBuildPerkTooltip,
  onClosePerkGroupHover,
  onCopySavedBuildLink,
  onDeleteSavedBuild,
  onInspectPerkGroup,
  onInspectPlannerPerk,
  onLoadSavedBuild,
  onOpenBuildPerkHover,
  onOpenBuildPerkTooltip,
  onOpenPerkGroupHover,
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
  emphasizedCategoryNames: ReadonlySet<string>
  emphasizedPerkGroupKeys: ReadonlySet<string>
  hasActiveBackgroundFitSearch: boolean
  hoveredBuildPerk: LegendsPerkRecord | null
  hoveredBuildPerkTooltip: HoveredBuildPerkTooltip | null
  hoveredBuildPerkTooltipId: string | undefined
  hoveredPerkId: string | null
  individualPerkGroups: BuildPlannerGroupedPerkGroup[]
  isSavedBuildsLoading: boolean
  onClearBuild: () => void
  onCloseBuildPerkHover: (perkId: string) => void
  onCloseBuildPerkTooltip: () => void
  onClosePerkGroupHover: (perkGroupKey: string) => void
  onCopySavedBuildLink: (savedBuildId: string) => Promise<void>
  onDeleteSavedBuild: (savedBuildId: string) => Promise<void>
  onInspectPerkGroup: (categoryName: string, perkGroupId: string) => void
  onInspectPlannerPerk: (perkId: string, perkGroupSelection?: PlannerPerkGroupSelection) => void
  onLoadSavedBuild: (savedBuildId: string) => void
  onOpenBuildPerkHover: (perkId: string, perkGroupSelection?: PlannerPerkGroupSelection) => void
  onOpenBuildPerkTooltip: (
    perkId: string,
    currentTarget: HTMLElement,
    perkGroupSelection?: PlannerPerkGroupSelection,
  ) => void
  onOpenPerkGroupHover: (categoryName: string, perkGroupId: string) => void
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
    clearTooltipCloseTimer,
    closeTooltipPreview,
    openTooltipPreview,
  } = useBuildPerkTooltipPreview({
    hoveredBuildPerkId: hoveredBuildPerk?.id ?? null,
    onCloseHover: onCloseBuildPerkHover,
    onCloseTooltip: onCloseBuildPerkTooltip,
    onOpenHover: onOpenBuildPerkHover,
    onOpenTooltip: onOpenBuildPerkTooltip,
  })
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
            <div className={styles.buildPlannerTitle}>
              <h2>Build planner</h2>
              {hasPickedPerks ? <BuildPlannerInfoButton /> : null}
            </div>
          </div>
          <div className={styles.buildPlannerActions}>
            <p className={styles.buildPlannerCount} data-testid="build-planner-count">
              {!hasPickedPerks
                ? 'No perks picked yet.'
                : `${pickedPerks.length} perk${pickedPerks.length === 1 ? '' : 's'} picked.`}
            </p>
            <button
              aria-label="Save current build"
              className={joinClassNames(styles.plannerActionButton, styles.savedBuildActionButton)}
              disabled={!hasPickedPerks}
              onClick={handleOpenSavedBuildsDialog}
              type="button"
            >
              <Save aria-hidden="true" className={styles.plannerButtonIcon} />
              Save build
            </button>
            <button
              aria-label="Open saved builds"
              className={joinClassNames(styles.plannerActionButton, styles.savedBuildActionButton)}
              onClick={handleOpenSavedBuildsDialog}
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
          emphasizedCategoryNames={emphasizedCategoryNames}
          emphasizedPerkGroupKeys={emphasizedPerkGroupKeys}
          hoveredBuildPerkId={hoveredBuildPerk?.id ?? null}
          hoveredBuildPerkTooltipId={hoveredBuildPerkTooltipId}
          hoveredPerkId={hoveredPerkId}
          individualPerkGroups={individualPerkGroups}
          isIndividualPerkGroupsSectionExpanded={isIndividualPerkGroupsSectionExpanded}
          isSharedPerkGroupsSectionExpanded={isSharedPerkGroupsSectionExpanded}
          onCloseBuildPerkHover={onCloseBuildPerkHover}
          onCloseBuildPerkTooltip={onCloseBuildPerkTooltip}
          onClosePerkGroupHover={onClosePerkGroupHover}
          onInspectPerkGroup={onInspectPerkGroup}
          onInspectPlannerPerk={onInspectPlannerPerk}
          onOpenBuildPerkHover={onOpenBuildPerkHover}
          onOpenBuildPerkTooltip={onOpenBuildPerkTooltip}
          onOpenPerkGroupHover={onOpenPerkGroupHover}
          onRemovePickedPerk={onRemovePickedPerk}
          onToggleIndividualPerkGroupsSection={handleToggleIndividualPerkGroupsSection}
          onToggleSharedPerkGroupsSection={handleToggleSharedPerkGroupsSection}
          openBuildPerkTooltipPreview={openTooltipPreview}
          pickedPerks={pickedPerks}
          plannerBoardRef={plannerBoardRef}
          sharedPerkGroups={sharedPerkGroups}
        />
      </section>

      {isSavedBuildsDialogOpen ? (
        <SavedBuildsDialog
          isSavedBuildsLoading={isSavedBuildsLoading}
          onClose={handleCloseSavedBuildsDialog}
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
          className={styles.buildPerkTooltip}
          data-build-perk-tooltip="true"
          data-testid="build-perk-tooltip"
          id={hoveredBuildPerkTooltipId}
          onMouseEnter={clearTooltipCloseTimer}
          onMouseLeave={() => {
            clearPendingTooltip()
            onCloseBuildPerkTooltip()
            onCloseBuildPerkHover(hoveredBuildPerk.id)
          }}
          role="tooltip"
          style={getAnchoredTooltipStyle(hoveredBuildPerkTooltip.anchorRectangle)}
        >
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
