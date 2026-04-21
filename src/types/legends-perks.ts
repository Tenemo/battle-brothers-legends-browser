export type LegendsSourceFile = {
  path: string
  role: string
}

export type LegendsPerkPlacement = {
  categoryName: string
  sourceFilePath: string
  tier: number | null
  treeAttributes: string[]
  treeDescriptions: string[]
  treeIconPath: string | null
  treeId: string
  treeName: string
}

export type LegendsFavoredEnemyTarget = {
  entityConstName: string
  entityName: string
  killsPerPercentBonus: number | null
}

export type LegendsPerkBackgroundSource = {
  backgroundId: string
  backgroundName: string
  categoryName: string
  chance: number | null
  minimumTrees: number | null
  sourceFilePath: string
  treeId: string
  treeName: string
}

export type LegendsPerkScenarioSource = {
  candidatePerkNames: string[]
  grantType: 'direct' | 'random-pool'
  scenarioId: string
  scenarioName: string
  sourceFilePath: string
  sourceMethodName: string
}

export type LegendsPerkRecord = {
  backgroundSources: LegendsPerkBackgroundSource[]
  descriptionParagraphs: string[]
  favoredEnemyTargets?: LegendsFavoredEnemyTarget[]
  groupNames: string[]
  iconPath: string | null
  id: string
  perkConstName: string
  perkName: string
  placements: LegendsPerkPlacement[]
  primaryGroupName: string
  scenarioSources: LegendsPerkScenarioSource[]
  scriptPath: string | null
  searchText: string
  sourceFilePaths: string[]
}

export type LegendsPerksDataset = {
  generatedAt: string
  perkCount: number
  perks: LegendsPerkRecord[]
  referenceRoot: string
  referenceVersion: string
  sourceFiles: LegendsSourceFile[]
  treeCount: number
}

export type LegendsTechnicalNameMappings = {
  labelsByTechnicalName: Record<string, string>
}
