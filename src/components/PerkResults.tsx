import {
  getPerkContextLabel,
  getPerkDisplayIconPath,
  getPerkRowClassName,
  renderGameIcon,
  renderHighlightedText,
} from '../lib/perk-display'
import './PerkResults.css'
import { getPerkPreviewParagraphs, getTierLabel } from '../lib/perk-search'
import type { LegendsPerkRecord } from '../types/legends-perks'
import { BuildToggleButton, ClearableSearchField } from './SharedControls'

export function PerkResults({
  onCloseResultsPerkHover,
  onOpenResultsPerkHover,
  onSelectPerk,
  onTogglePerkPicked,
  pickedPerkOrderById,
  query,
  selectedCategoryCount,
  selectedPerk,
  selectedTreeCount,
  setQuery,
  visiblePerks,
  hoveredPerkId,
}: {
  hoveredPerkId: string | null
  onCloseResultsPerkHover: (perkId: string) => void
  onOpenResultsPerkHover: (perkId: string) => void
  onSelectPerk: (perkId: string) => void
  onTogglePerkPicked: (perkId: string) => void
  pickedPerkOrderById: Map<string, number>
  query: string
  selectedCategoryCount: number
  selectedPerk: LegendsPerkRecord | null
  selectedTreeCount: number
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
          {selectedTreeCount > 0
            ? `Filtered to ${selectedCategoryCount} categor${selectedCategoryCount === 1 ? 'y' : 'ies'} and ${selectedTreeCount} perk group${selectedTreeCount === 1 ? '' : 's'}.`
            : selectedCategoryCount > 0
              ? `Filtered to ${selectedCategoryCount} categor${selectedCategoryCount === 1 ? 'y' : 'ies'}.`
              : 'Ranked by exact perk names first, then perk group and category matches, then background, scenario, and full text.'}
        </p>
      </div>

      <div className="results-list" data-testid="results-list">
        {visiblePerks.length === 0 ? (
          <div className="empty-state">
            <h2>No perks found</h2>
            <p>Try a broader search or switch the category filters.</p>
          </div>
        ) : (
          visiblePerks.map((perk) => {
            const isSelected = perk.id === selectedPerk?.id
            const pickedPerkOrder = pickedPerkOrderById.get(perk.id) ?? null
            const isPicked = pickedPerkOrder !== null
            const isHighlighted = hoveredPerkId === perk.id
            const previewParagraphs = getPerkPreviewParagraphs(perk)

            return (
              <div
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
                >
                  <div className="perk-row-layout">
                    {renderGameIcon({
                      className: 'perk-icon perk-icon-small',
                      iconPath: getPerkDisplayIconPath(perk),
                      label: `${perk.perkName} icon`,
                    })}
                    <div className="perk-row-copy">
                      <div className="perk-row-topline">
                        <span className="perk-name">
                          {renderHighlightedText(perk.perkName, query, `${perk.id}-name`)}
                        </span>
                        <div className="perk-row-badges">
                          <span className="tier-badge">
                            {getTierLabel(perk.placements[0]?.tier ?? null)}
                          </span>
                          {pickedPerkOrder !== null ? (
                            <span className="build-slot-badge">Build {pickedPerkOrder}</span>
                          ) : null}
                        </div>
                      </div>
                      <p className="perk-context">
                        {renderHighlightedText(
                          getPerkContextLabel(perk),
                          query,
                          `${perk.id}-context`,
                        )}
                      </p>
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
                </button>
                <BuildToggleButton
                  isCompact
                  isPicked={isPicked}
                  onClick={() => onTogglePerkPicked(perk.id)}
                  perkName={perk.perkName}
                  source="results"
                />
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
