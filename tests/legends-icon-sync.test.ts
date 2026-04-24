import { describe, expect, test } from 'vitest'
import {
  buildIconExtractionPlan,
  collectRequiredGameIconPaths,
  getArchiveEntryPathFromIconPath,
} from '../scripts/legends-icon-sync.mjs'
import type { LegendsPerksDataset } from '../src/types/legends-perks'

const sampleDataset: LegendsPerksDataset = {
  backgroundFitBackgrounds: [],
  backgroundFitRules: {
    classWeaponDependencies: [],
  },
  generatedAt: '2026-04-21T00:00:00.000Z',
  perkCount: 2,
  perks: [
    {
      backgroundSources: [],
      descriptionParagraphs: [],
      groupNames: ['Traits'],
      iconPath: 'ui/perks/clarity_circle.png',
      id: 'legend.clarity',
      perkConstName: 'LegendClarity',
      perkName: 'Clarity',
      placements: [
        {
          categoryName: 'Traits',
          sourceFilePath: 'config/z_perks_tree_traits.nut',
          tier: 2,
          treeAttributes: [],
          treeDescriptions: [],
          treeIconPath: 'ui/perks/clarity_circle.png',
          treeId: 'traits',
          treeName: 'Traits',
        },
      ],
      primaryGroupName: 'Traits',
      scenarioSources: [],
      scriptPath: null,
      searchText: 'clarity',
      sourceFilePaths: [],
    },
    {
      backgroundSources: [],
      descriptionParagraphs: [],
      groupNames: ['Other'],
      iconPath: null,
      id: 'legend.passive',
      perkConstName: 'LegendPassive',
      perkName: 'Passive perk',
      placements: [
        {
          categoryName: 'Other',
          sourceFilePath: 'config/z_perks_tree_other.nut',
          tier: 1,
          treeAttributes: [],
          treeDescriptions: [],
          treeIconPath: 'skills/passive_03.png',
          treeId: 'other',
          treeName: 'Other',
        },
      ],
      primaryGroupName: 'Other',
      scenarioSources: [],
      scriptPath: null,
      searchText: 'passive',
      sourceFilePaths: [],
    },
  ],
  referenceRoot: 'tests/fixtures/legends-reference/mod_legends',
  referenceVersion: 'legends-reference',
  sourceFiles: [],
  treeCount: 2,
}

describe('legends icon sync', () => {
  test('collects and deduplicates referenced perk icon paths', () => {
    expect(collectRequiredGameIconPaths(sampleDataset)).toEqual([
      'skills/passive_03.png',
      'ui/perks/clarity_circle.png',
    ])
  })

  test('maps dataset icon paths to archive entry paths', () => {
    expect(getArchiveEntryPathFromIconPath('ui/perks/clarity_circle.png')).toBe(
      'gfx/ui/perks/clarity_circle.png',
    )
    expect(getArchiveEntryPathFromIconPath('skills/passive_03.png')).toBe(
      'gfx/skills/passive_03.png',
    )
  })

  test('prefers the first archive that contains a matching icon entry and reports misses', () => {
    const archiveEntriesByArchivePath = new Map<string, Set<string>>([
      ['mod_legends-assets.zip', new Set(['gfx/ui/perks/clarity_circle.png'])],
      ['data_001.dat', new Set(['gfx/ui/perks/clarity_circle.png', 'gfx/skills/passive_03.png'])],
    ])

    const extractionPlan = buildIconExtractionPlan(
      ['ui/perks/clarity_circle.png', 'skills/passive_03.png', 'ui/perks/missing_icon.png'],
      archiveEntriesByArchivePath,
    )

    expect(extractionPlan.entriesByArchivePath.get('mod_legends-assets.zip')).toEqual([
      'gfx/ui/perks/clarity_circle.png',
    ])
    expect(extractionPlan.entriesByArchivePath.get('data_001.dat')).toEqual([
      'gfx/skills/passive_03.png',
    ])
    expect(extractionPlan.missingIconPaths).toEqual(['ui/perks/missing_icon.png'])
  })
})
