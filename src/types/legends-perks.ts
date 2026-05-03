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

export type LegendsPerkUrlRecord = Pick<LegendsPerkRecord, 'id' | 'perkName'>

export type LegendsBackgroundFitPerkRecord = Pick<
  LegendsPerkRecord,
  'id' | 'perkName' | 'placements'
>

export type LegendsBuildSharePreviewPerkRecord = LegendsBackgroundFitPerkRecord &
  Pick<LegendsPerkRecord, 'iconPath'>

export type LegendsBackgroundFitCategoryDefinition = {
  chance: number | null
  minimumPerkGroups: number | null
  perkGroupIds: string[]
}

export type LegendsBackgroundCampResourceModifierGroup = 'capacity' | 'skill' | 'terrain'

export type LegendsBackgroundCampResourceModifierValueKind = 'flat' | 'percent'

export type LegendsBackgroundCampResourceModifier = {
  group: LegendsBackgroundCampResourceModifierGroup
  label: string
  modifierKey: string
  value: number
  valueKind: LegendsBackgroundCampResourceModifierValueKind
}

export type LegendsBackgroundFitBackgroundDefinition = {
  backgroundId: string
  backgroundName: string
  backgroundTypeNames: string[]
  categories: Partial<
    Record<LegendsDynamicBackgroundCategoryName, LegendsBackgroundFitCategoryDefinition>
  >
  campResourceModifiers: LegendsBackgroundCampResourceModifier[]
  dailyCost: number | null
  excludedTalentAttributeNames: string[]
  excludedTraitNames: string[]
  guaranteedTraitNames: string[]
  iconPath: string | null
  sourceFilePath: string
  veteranPerkLevelInterval: number
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

export type LegendsPerkCatalogDataset = Omit<
  LegendsPerksDataset,
  'backgroundFitBackgrounds' | 'backgroundFitRules'
>

export type LegendsBackgroundFitDataset = Pick<
  LegendsPerksDataset,
  'backgroundFitBackgrounds' | 'backgroundFitRules'
> & {
  perks: LegendsBackgroundFitPerkRecord[]
}

export type LegendsBuildSharePreviewDataset = Pick<
  LegendsPerksDataset,
  'backgroundFitBackgrounds' | 'backgroundFitRules' | 'referenceVersion'
> & {
  perks: LegendsBuildSharePreviewPerkRecord[]
}
