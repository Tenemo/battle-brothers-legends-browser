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
  tier: number | null
  perkGroupAttributes: string[]
  perkGroupDescriptions: string[]
  perkGroupIconPath: string | null
  perkGroupId: string
  perkGroupName: string
}

export type LegendsFavouredEnemyTarget = {
  entityConstName: string
  entityName: string
  killsPerPercentBonus: number | null
}

export type LegendsPerkBackgroundSource = {
  backgroundId: string
  backgroundName: string
  categoryName: string
  chance: number | null
  minimumPerkGroups: number | null
  perkGroupId: string
  perkGroupName: string
}

export type LegendsPerkScenarioSource = {
  candidatePerkNames: string[]
  grantType: 'direct' | 'random-pool'
  scenarioId: string
  scenarioName: string
  sourceMethodName: string
}

export type LegendsPerkRecord = {
  backgroundSources: LegendsPerkBackgroundSource[]
  descriptionParagraphs: string[]
  favouredEnemyTargets?: LegendsFavouredEnemyTarget[]
  categoryNames: string[]
  iconPath: string | null
  id: string
  perkConstName: string
  perkName: string
  placements: LegendsPerkPlacement[]
  primaryCategoryName: string
  scenarioSources: LegendsPerkScenarioSource[]
  searchText: string
}

export type LegendsBackgroundFitCategoryDefinition = {
  chance: number | null
  minimumPerkGroups: number | null
  perkGroupIds: string[]
}

export type LegendsBackgroundFitBackgroundDefinition = {
  backgroundId: string
  backgroundName: string
  categories: Partial<
    Record<LegendsDynamicBackgroundCategoryName, LegendsBackgroundFitCategoryDefinition>
  >
  iconPath: string | null
  sourceFilePath: string
}

export type LegendsBackgroundFitClassWeaponDependency = {
  classPerkGroupId: string
  weaponPerkGroupId: string
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
  perkGroupCount: number
}
