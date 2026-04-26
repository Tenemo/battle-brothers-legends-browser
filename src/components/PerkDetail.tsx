import {
  formatChanceLabel,
  formatMinimumPerkGroupsLabel,
  formatScenarioGrantLabel,
  getPerkDisplayIconPath,
  renderGameIcon,
  type GroupedBackgroundSource,
} from '../lib/perk-display'
import './PerkDetail.css'
import { getTierLabel } from '../lib/perk-search'
import type {
  LegendsFavouredEnemyTarget,
  LegendsPerkPlacement,
  LegendsPerkRecord,
} from '../types/legends-perks'
import { BuildToggleButton, DetailPanelRailChevron } from './SharedControls'

function renderPlacementDescription(placement: LegendsPerkPlacement) {
  return (
    <>
      {placement.perkGroupDescriptions.length > 0 ? (
        <p className="detail-support">{placement.perkGroupDescriptions.join(' / ')}</p>
      ) : null}
      {placement.perkGroupAttributes.length > 0 ? (
        <p className="detail-support">{placement.perkGroupAttributes.join(' / ')}</p>
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
          {backgroundSource.categoryName} / {backgroundSource.perkGroupName}
        </p>
      </div>
      <span className="detail-badge">
        {formatMinimumPerkGroupsLabel(backgroundSource.minimumPerkGroups)} /{' '}
        {formatChanceLabel(backgroundSource.chance)}
      </span>
    </>
  )
}

function renderFavouredEnemyTarget(favouredEnemyTarget: LegendsFavouredEnemyTarget) {
  return (
    <>
      <div>
        <strong>{favouredEnemyTarget.entityName}</strong>
      </div>
      <span className="detail-badge">
        {favouredEnemyTarget.killsPerPercentBonus === null
          ? 'Varies'
          : `${favouredEnemyTarget.killsPerPercentBonus} kills / 1%`}
      </span>
    </>
  )
}

export function PerkDetail({
  groupedBackgroundSources,
  isExpanded,
  onToggleExpanded,
  onTogglePerkPicked,
  selectedPerk,
  selectedPerkBuildSlot,
}: {
  groupedBackgroundSources: GroupedBackgroundSource[]
  isExpanded: boolean
  onToggleExpanded: () => void
  onTogglePerkPicked: (perkId: string) => void
  selectedPerk: LegendsPerkRecord | null
  selectedPerkBuildSlot: number | null
}) {
  return (
    <aside
      aria-label="Perk details"
      className={isExpanded ? 'detail-panel is-expanded' : 'detail-panel is-collapsed'}
      data-testid="perk-detail-panel"
    >
      <button
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} perk details`}
        className="detail-panel-rail-button"
        onClick={onToggleExpanded}
        type="button"
      >
        <span aria-hidden="true" className="detail-panel-rail-button-icon">
          <DetailPanelRailChevron isExpanded={isExpanded} />
        </span>
        <span aria-hidden="true" className="detail-panel-rail-button-label">
          Perk details
        </span>
      </button>

      <div
        aria-hidden={!isExpanded}
        aria-live="polite"
        className="detail-panel-body"
        data-testid="perk-detail-panel-body"
        hidden={!isExpanded}
      >
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
                  <p className="eyebrow">{selectedPerk.primaryCategoryName}</p>
                  <h2>{selectedPerk.perkName}</h2>
                  <p className="detail-meta">{selectedPerk.categoryNames.join(', ')}</p>
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
                      key={`${placement.categoryName}-${placement.perkGroupId}-${placement.tier ?? 'none'}`}
                    >
                      <div className="detail-item-main">
                        {renderGameIcon({
                          className: 'perk-icon perk-icon-tiny',
                          iconPath:
                            placement.perkGroupIconPath ?? getPerkDisplayIconPath(selectedPerk),
                          label: `${placement.perkGroupName} perk group icon`,
                        })}
                        <div>
                          <strong>
                            {placement.categoryName} / {placement.perkGroupName}
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

            {selectedPerk.favouredEnemyTargets && selectedPerk.favouredEnemyTargets.length > 0 ? (
              <div className="detail-section">
                <h3>Favoured enemy targets</h3>
                <ul className="detail-list">
                  {selectedPerk.favouredEnemyTargets.map((favouredEnemyTarget) => (
                    <li key={favouredEnemyTarget.entityConstName}>
                      {renderFavouredEnemyTarget(favouredEnemyTarget)}
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
                      key={`${backgroundSource.categoryName}-${backgroundSource.perkGroupId}-${
                        backgroundSource.minimumPerkGroups ?? 'none'
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
      </div>
    </aside>
  )
}
