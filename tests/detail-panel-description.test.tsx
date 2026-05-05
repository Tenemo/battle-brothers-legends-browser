import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { DetailPanel } from '../src/components/DetailPanel'
import type { LegendsPerkRecord } from '../src/types/legends-perks'
import { PlannerInteractionTestProvider } from './PlannerInteractionTestProvider'

const devastatingStrikes = {
  backgroundSources: [],
  categoryNames: ['Magic'],
  descriptionParagraphs: ['Passive: • All damage inflicted is increased by 10%.'],
  iconPath: null,
  id: 'perk.legend_devastating_strikes',
  perkConstName: 'LegendDevastatingStrikes',
  perkName: 'Devastating Strikes',
  placements: [],
  primaryCategoryName: 'Magic',
  scenarioSources: [],
  searchText: 'Devastating Strikes Magic Passive: • All damage inflicted is increased by 10%.',
} satisfies LegendsPerkRecord

function renderDetailPanel(selectedPerk: LegendsPerkRecord) {
  render(
    <PlannerInteractionTestProvider>
      <DetailPanel
        selectedDetailType="perk"
        selectedBackgroundFitDetail={null}
        detailHistoryNavigationAvailability={{
          next: false,
          previous: false,
        }}
        groupedBackgroundSources={[]}
        mustHavePickedPerkCount={0}
        mustHavePickedPerkIds={[]}
        onAddPerkToBuild={vi.fn()}
        onInspectPerk={vi.fn()}
        onInspectPerkGroup={vi.fn()}
        onNavigateDetailHistory={vi.fn()}
        onRemovePerkFromBuild={vi.fn()}
        optionalPickedPerkCount={0}
        optionalPickedPerkIds={[]}
        pickedPerkCount={0}
        selectedPerkRequirement={null}
        selectedPerk={selectedPerk}
        studyResourceFilter={{
          shouldAllowBook: true,
          shouldAllowScroll: true,
          shouldAllowSecondScroll: false,
        }}
        supportedBuildTargetPerkGroups={[]}
      />
    </PlannerInteractionTestProvider>,
  )
}

describe('detail panel descriptions', () => {
  test('renders effect headings on their own line before bullet text', () => {
    renderDetailPanel(devastatingStrikes)

    const descriptionParagraph = screen.getByTestId('perk-description-paragraph')
    const effectHeading = screen.getByTestId('perk-description-effect-heading')

    expect(effectHeading).toHaveTextContent('Passive:')
    expect(descriptionParagraph.querySelector('br')).not.toBeNull()
    expect(descriptionParagraph).toHaveTextContent(
      'Passive:– All damage inflicted is increased by 10%.',
    )
  })
})
