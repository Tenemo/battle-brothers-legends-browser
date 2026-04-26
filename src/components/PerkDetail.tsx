import {
  formatChanceLabel,
  formatMinimumTreesLabel,
  formatScenarioGrantLabel,
  getPerkDisplayIconPath,
  renderGameIcon,
  type GroupedBackgroundSource,
} from '../lib/perk-display'
import './PerkDetail.css'
import { getTierLabel } from '../lib/perk-search'
import type {
  LegendsFavoredEnemyTarget,
  LegendsPerkPlacement,
  LegendsPerkRecord,
} from '../types/legends-perks'
import { BuildToggleButton } from './SharedControls'

function renderPlacementDescription(placement: LegendsPerkPlacement) {
  return (
    <>
      {placement.treeDescriptions.length > 0 ? (
        <p className="detail-support">{placement.treeDescriptions.join(' / ')}</p>
      ) : null}
      {placement.treeAttributes.length > 0 ? (
        <p className="detail-support">{placement.treeAttributes.join(' / ')}</p>
      ) : null}
    </>
  )
}

function renderBackgroundSource(backgroundSource: GroupedBackgroundSource) {
  return (
    <>
      <div>
        <strong>{backgroundSource.backgroundNames.join(', ')}</strong>
        <p className="detail-support">
          {backgroundSource.categoryName} / {backgroundSource.treeName}
        </p>
      </div>
      <span className="detail-badge">
        {formatMinimumTreesLabel(backgroundSource.minimumTrees)} /{' '}
        {formatChanceLabel(backgroundSource.chance)}
      </span>
    </>
  )
}

function renderFavoredEnemyTarget(favoredEnemyTarget: LegendsFavoredEnemyTarget) {
  return (
    <>
      <div>
        <strong>{favoredEnemyTarget.entityName}</strong>
      </div>
      <span className="detail-badge">
        {favoredEnemyTarget.killsPerPercentBonus === null
          ? 'Varies'
          : `${favoredEnemyTarget.killsPerPercentBonus} kills / 1%`}
      </span>
    </>
  )
}

export function PerkDetail({
  groupedBackgroundSources,
  onTogglePerkPicked,
  selectedPerk,
  selectedPerkBuildSlot,
}: {
  groupedBackgroundSources: GroupedBackgroundSource[]
  onTogglePerkPicked: (perkId: string) => void
  selectedPerk: LegendsPerkRecord | null
  selectedPerkBuildSlot: number | null
}) {
  return (
    <section className="detail-panel" aria-live="polite">
      {selectedPerk === null ? (
        <div className="empty-state">
          <h2>Select a perk</h2>
          <p>Pick any entry from the list to inspect its placement, sources, and overlays.</p>
        </div>
      ) : (
        <>
          <div className="detail-header">
            <div className="detail-header-main">
              {renderGameIcon({
                className: 'perk-icon perk-icon-large',
                iconPath: getPerkDisplayIconPath(selectedPerk),
                label: `${selectedPerk.perkName} icon`,
              })}
              <div>
                <p className="eyebrow">{selectedPerk.primaryGroupName}</p>
                <h2>{selectedPerk.perkName}</h2>
                <p className="detail-meta">{selectedPerk.groupNames.join(', ')}</p>
              </div>
            </div>
            <div className="detail-header-actions">
              <p className="detail-header-build-status">
                {selectedPerkBuildSlot === null
                  ? 'Not in build'
                  : `Build slot ${selectedPerkBuildSlot}`}
              </p>
              <BuildToggleButton
                isPicked={selectedPerkBuildSlot !== null}
                onClick={() => onTogglePerkPicked(selectedPerk.id)}
                perkName={selectedPerk.perkName}
                source="detail"
              />
            </div>
          </div>

          <div className="detail-section">
            <h3>Details</h3>
            {selectedPerk.descriptionParagraphs.length > 0 ? (
              selectedPerk.descriptionParagraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))
            ) : (
              <p>No perk description is available in the local strings file.</p>
            )}
          </div>

          <div className="detail-section">
            <h3>Perk group placement</h3>
            {selectedPerk.placements.length > 0 ? (
              <ul className="detail-list">
                {selectedPerk.placements.map((placement) => (
                  <li
                    key={`${placement.categoryName}-${placement.treeId}-${placement.tier ?? 'none'}`}
                  >
                    <div className="detail-item-main">
                      {renderGameIcon({
                        className: 'perk-icon perk-icon-tiny',
                        iconPath: placement.treeIconPath ?? getPerkDisplayIconPath(selectedPerk),
                        label: `${placement.treeName} perk group icon`,
                      })}
                      <div>
                        <strong>
                          {placement.categoryName} / {placement.treeName}
                        </strong>
                        {renderPlacementDescription(placement)}
                      </div>
                    </div>
                    <span className="detail-badge">{getTierLabel(placement.tier)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>This perk is defined locally but not assigned to a parsed perk group.</p>
            )}
          </div>

          {selectedPerk.favoredEnemyTargets && selectedPerk.favoredEnemyTargets.length > 0 ? (
            <div className="detail-section">
              <h3>Favored enemy targets</h3>
              <ul className="detail-list">
                {selectedPerk.favoredEnemyTargets.map((favoredEnemyTarget) => (
                  <li key={favoredEnemyTarget.entityConstName}>
                    {renderFavoredEnemyTarget(favoredEnemyTarget)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="detail-section">
            <h3>Background sources</h3>
            {groupedBackgroundSources.length > 0 ? (
              <ul className="detail-list">
                {groupedBackgroundSources.map((backgroundSource) => (
                  <li
                    key={`${backgroundSource.categoryName}-${backgroundSource.treeId}-${
                      backgroundSource.minimumTrees ?? 'none'
                    }-${backgroundSource.chance ?? 'none'}`}
                  >
                    {renderBackgroundSource(backgroundSource)}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No matching dynamic background pools were found for this perk.</p>
            )}
          </div>

          <div className="detail-section">
            <h3>Scenario overlays</h3>
            {selectedPerk.scenarioSources.length > 0 ? (
              <ul className="detail-list">
                {selectedPerk.scenarioSources.map((scenarioSource) => (
                  <li
                    key={`${scenarioSource.scenarioId}-${scenarioSource.grantType}-${scenarioSource.sourceMethodName}`}
                  >
                    <div>
                      <strong>{scenarioSource.scenarioName}</strong>
                      <p className="detail-support">{formatScenarioGrantLabel(scenarioSource)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No scenario grants or build-time overlays were found for this perk.</p>
            )}
          </div>
        </>
      )}
    </section>
  )
}
