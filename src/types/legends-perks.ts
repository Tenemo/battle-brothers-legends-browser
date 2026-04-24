type LegendsSourceFile = {
  path: string
  role: string
}

export type LegendsDynamicBackgroundCategoryName =
  | 'Weapon'
  | 'Defense'
  | 'Traits'
  | 'Enemy'
  | 'Class'
  | 'Profession'
  | 'Magic'

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

export type LegendsBackgroundFitCategoryDefinition = {
  chance: number | null
  minimumTrees: number | null
  treeIds: string[]
}

export type LegendsBackgroundFitBackgroundDefinition = {
  backgroundId: string
  backgroundName: string
  categories: Partial<
    Record<LegendsDynamicBackgroundCategoryName, LegendsBackgroundFitCategoryDefinition>
  >
  sourceFilePath: string
}

export type LegendsBackgroundFitClassWeaponDependency = {
  classTreeId: string
  weaponTreeId: string
}

type LegendsBackgroundFitRules = {
  classWeaponDependencies: LegendsBackgroundFitClassWeaponDependency[]
}

export type LegendsPerksDataset = {
  backgroundFitBackgrounds: LegendsBackgroundFitBackgroundDefinition[]
  backgroundFitRules: LegendsBackgroundFitRules
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
