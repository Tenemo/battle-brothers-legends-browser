import {
  getPerkDisplayIconPath,
  getPerkGroupHoverKey,
  getPerkRowClassName,
  renderGameIcon,
  renderHighlightedText,
} from '../lib/perk-display'
import './PerkResults.css'
import { getPerkPreviewParagraphs } from '../lib/perk-search'
import type { LegendsPerkPlacement, LegendsPerkRecord } from '../types/legends-perks'
import { BuildToggleButton, ClearableSearchField } from './SharedControls'

function renderPerkPlacementChip({
  keyPrefix,
  perk,
  hoveredPerkGroupKey,
  onClosePerkGroupHover,
  onInspectPerkGroup,
  onOpenPerkGroupHover,
  placement,
  query,
}: {
  keyPrefix: string
  perk: LegendsPerkRecord
  hoveredPerkGroupKey: string | null
  onClosePerkGroupHover: (perkGroupKey: string) => void
  onInspectPerkGroup: (categoryName: string, perkGroupId: string) => void
  onOpenPerkGroupHover: (categoryName: string, perkGroupId: string) => void
  placement: LegendsPerkPlacement
  query: string
}) {
  const perkGroupKey = getPerkGroupHoverKey(placement)
  const className =
    hoveredPerkGroupKey === perkGroupKey
      ? 'perk-placement-chip is-highlighted'
      : 'perk-placement-chip'

  return (
    <button
      aria-label={`Select perk group ${placement.perkGroupName}`}
      className={className}
      key={keyPrefix}
      onBlur={() => onClosePerkGroupHover(perkGroupKey)}
      onClick={() => onInspectPerkGroup(placement.categoryName, placement.perkGroupId)}
      onFocus={() => onOpenPerkGroupHover(placement.categoryName, placement.perkGroupId)}
      onMouseEnter={(event) => {
        event.stopPropagation()
        onOpenPerkGroupHover(placement.categoryName, placement.perkGroupId)
      }}
      onMouseLeave={() => onClosePerkGroupHover(perkGroupKey)}
      type="button"
    >
      {renderGameIcon({
        className: 'perk-icon perk-icon-group perk-placement-icon',
        iconPath: placement.perkGroupIconPath ?? getPerkDisplayIconPath(perk),
        label: `${placement.perkGroupName} perk group icon`,
      })}
      <span className="perk-placement-label">
        {renderHighlightedText(placement.perkGroupName, query, `${keyPrefix}-group`)}
      </span>
    </button>
  )
}

function renderPerkPlacements({
  hoveredPerkGroupKey,
  onClosePerkGroupHover,
  onInspectPerkGroup,
  onOpenPerkGroupHover,
  perk,
  query,
}: {
  hoveredPerkGroupKey: string | null
  onClosePerkGroupHover: (perkGroupKey: string) => void
  onInspectPerkGroup: (categoryName: string, perkGroupId: string) => void
  onOpenPerkGroupHover: (categoryName: string, perkGroupId: string) => void
  perk: LegendsPerkRecord
  query: string
}) {
  if (perk.placements.length === 0) {
    return <span className="perk-placement-empty">No perk group placement</span>
  }

  return perk.placements.map((placement, placementIndex) =>
    renderPerkPlacementChip({
      hoveredPerkGroupKey,
      keyPrefix: `${perk.id}-placement-${placementIndex}`,
      onClosePerkGroupHover,
      onInspectPerkGroup,
      onOpenPerkGroupHover,
      perk,
      placement,
      query,
    }),
  )
}

export function PerkResults({
  onCloseResultsPerkHover,
  onClosePerkGroupHover,
  onInspectPerkGroup,
  onOpenResultsPerkHover,
  onOpenPerkGroupHover,
  onSelectPerk,
  onTogglePerkPicked,
  pickedPerkOrderById,
  query,
  selectedCategoryCount,
  selectedPerk,
  selectedPerkGroupCount,
  setQuery,
  visiblePerks,
  hoveredPerkId,
  hoveredPerkGroupKey,
}: {
  hoveredPerkGroupKey: string | null
  hoveredPerkId: string | null
  onClosePerkGroupHover: (perkGroupKey: string) => void
  onCloseResultsPerkHover: (perkId: string) => void
  onInspectPerkGroup: (categoryName: string, perkGroupId: string) => void
  onOpenPerkGroupHover: (categoryName: string, perkGroupId: string) => void
  onOpenResultsPerkHover: (perkId: string) => void
  onSelectPerk: (perkId: string) => void
  onTogglePerkPicked: (perkId: string) => void
  pickedPerkOrderById: Map<string, number>
  query: string
  selectedCategoryCount: number
  selectedPerk: LegendsPerkRecord | null
  selectedPerkGroupCount: number
  setQuery: (query: string) => void
  visiblePerks: LegendsPerkRecord[]
}) {
  return (
    <section className="results-panel" aria-label="Perk results">
      <div className="toolbar">
        <ClearableSearchField
          clearLabel="Clear perk search"
          inputId="perk-results-search"
          label="Search perks"
          onValueChange={setQuery}
          placeholder="Search perks, perk groups, backgrounds, scenarios, or enemy targets"
          value={query}
        />
      </div>

      <div className="results-summary">
        <p>
          Showing <strong>{visiblePerks.length}</strong> perk
          {visiblePerks.length === 1 ? '' : 's'}
        </p>
        <p className="results-note">
          {selectedPerkGroupCount > 0
            ? `Filtered to ${selectedCategoryCount} categor${selectedCategoryCount === 1 ? 'y' : 'ies'} and ${selectedPerkGroupCount} perk group${selectedPerkGroupCount === 1 ? '' : 's'}.`
            : selectedCategoryCount > 0
              ? `Filtered to ${selectedCategoryCount} categor${selectedCategoryCount === 1 ? 'y' : 'ies'}.`
              : 'Ranked by exact perk names first, then perk group and category matches, then background, scenario, and full text.'}
        </p>
      </div>

      <ul className="results-list app-scrollbar" data-testid="results-list">
        {visiblePerks.length === 0 ? (
          <li className="empty-state">
            <h2>No perks found</h2>
            <p>Try a broader search or switch the category filters.</p>
          </li>
        ) : (
          visiblePerks.map((perk) => {
            const isSelected = perk.id === selectedPerk?.id
            const isPicked = pickedPerkOrderById.has(perk.id)
            const isHighlighted = hoveredPerkId === perk.id
            const previewParagraphs = getPerkPreviewParagraphs(perk)

            return (
              <li
                key={perk.id}
                className={getPerkRowClassName({ isHighlighted, isPicked, isSelected })}
                onBlurCapture={(event) => {
                  if (
                    event.relatedTarget instanceof Node &&
                    event.currentTarget.contains(event.relatedTarget)
                  ) {
                    return
                  }

                  onCloseResultsPerkHover(perk.id)
                }}
                onFocusCapture={() => onOpenResultsPerkHover(perk.id)}
                onMouseEnter={() => onOpenResultsPerkHover(perk.id)}
                onMouseLeave={() => onCloseResultsPerkHover(perk.id)}
              >
                <button
                  aria-label={`Inspect ${perk.perkName}`}
                  className="perk-row-select"
                  onClick={() => onSelectPerk(perk.id)}
                  type="button"
                />
                <div className="perk-row-layout">
                  {renderGameIcon({
                    className: 'perk-icon perk-icon-small perk-row-icon',
                    iconPath: getPerkDisplayIconPath(perk),
                    label: `${perk.perkName} icon`,
                  })}
                  <div className="perk-row-copy">
                    <div className="perk-row-topline">
                      <span className="perk-name">
                        {renderHighlightedText(perk.perkName, query, `${perk.id}-name`)}
                      </span>
                    </div>
                  </div>
                  <div className="perk-row-context-slot">
                    <div className="perk-context perk-placement-list">
                      {renderPerkPlacements({
                        hoveredPerkGroupKey,
                        onClosePerkGroupHover,
                        onInspectPerkGroup,
                        onOpenPerkGroupHover,
                        perk,
                        query,
                      })}
                    </div>
                    <div className="perk-preview">
                      {previewParagraphs.map((previewParagraph, previewParagraphIndex) => (
                        <p key={`${perk.id}-preview-${previewParagraphIndex}`}>
                          {renderHighlightedText(
                            previewParagraph,
                            query,
                            `${perk.id}-preview-${previewParagraphIndex}`,
                          )}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
                <BuildToggleButton
                  isCompact
                  isPicked={isPicked}
                  onClick={() => onTogglePerkPicked(perk.id)}
                  perkName={perk.perkName}
                  source="results"
                />
              </li>
            )
          })
        )}
      </ul>
    </section>
  )
}
