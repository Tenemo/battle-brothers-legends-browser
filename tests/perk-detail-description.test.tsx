import { render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { DetailsPanel } from '../src/components/PerkDetail'
import type { LegendsPerkRecord } from '../src/types/legends-perks'

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

function renderPerkDetail(selectedPerk: LegendsPerkRecord) {
  render(
    <DetailsPanel
      activeDetailType="perk"
      backgroundFitDetail={null}
      emphasizedCategoryNames={new Set()}
      emphasizedPerkGroupKeys={new Set()}
      selectedEmphasisCategoryNames={new Set()}
      selectedEmphasisPerkGroupKeys={new Set()}
      groupedBackgroundSources={[]}
      hoveredBuildPerkId={null}
      hoveredBuildPerkTooltipId={undefined}
      hoveredPerkId={null}
      isSelectedPerkPicked={false}
      mustHavePickedPerkCount={0}
      mustHavePickedPerkIds={[]}
      onCloseBuildPerkHover={vi.fn()}
      onCloseBuildPerkTooltip={vi.fn()}
      onClosePerkGroupHover={vi.fn()}
      onInspectPerk={vi.fn()}
      onInspectPerkGroup={vi.fn()}
      onNavigateDetailHistory={vi.fn()}
      onOpenBuildPerkHover={vi.fn()}
      onOpenBuildPerkTooltip={vi.fn()}
      onOpenPerkGroupHover={vi.fn()}
      onTogglePerkPicked={vi.fn()}
      optionalPickedPerkCount={0}
      optionalPickedPerkIds={[]}
      pickedPerkCount={0}
      selectedPerk={selectedPerk}
      studyResourceFilter={{
        shouldAllowBook: true,
        shouldAllowScroll: true,
        shouldAllowSecondScroll: false,
      }}
      supportedBuildTargetPerkGroups={[]}
    />,
  )
}

describe('perk detail descriptions', () => {
  test('renders effect headings on their own line before bullet text', () => {
    renderPerkDetail(devastatingStrikes)

    const descriptionParagraph = screen.getByTestId('perk-description-paragraph')
    const effectHeading = screen.getByTestId('perk-description-effect-heading')

    expect(effectHeading).toHaveTextContent('Passive:')
    expect(descriptionParagraph.querySelector('br')).not.toBeNull()
    expect(descriptionParagraph).toHaveTextContent(
      'Passive:• All damage inflicted is increased by 10%.',
    )
  })
})
