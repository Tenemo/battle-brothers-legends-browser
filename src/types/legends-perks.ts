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
  backgroundName: string
  perkGroupId: string
  perkGroupName: string
  probability: number
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
  perkConstName?: string
  perkName: string
  placements: LegendsPerkPlacement[]
  primaryCategoryName: string
  scenarioSources: LegendsPerkScenarioSource[]
  searchText: string
}

export type LegendsPerkUrlRecord = Pick<LegendsPerkRecord, 'id' | 'perkName'>

export type LegendsPerkCatalogBackgroundSourceEntry = number[]

export type LegendsPerkCatalogBackgroundSourceTable = {
  backgroundNames: string[]
  perkGroupIds: string[]
  perkSourcesByPerkId: Record<string, LegendsPerkCatalogBackgroundSourceEntry[]>
  probabilities: number[]
}

export type LegendsPerkCatalogRecord = Omit<
  LegendsPerkRecord,
  'backgroundSources' | 'perkConstName' | 'searchText'
>

export type LegendsBackgroundFitPerkRecord = Pick<
  LegendsPerkRecord,
  'id' | 'iconPath' | 'perkName' | 'placements'
>

export type LegendsBuildSharePreviewPerkRecord = LegendsBackgroundFitPerkRecord

export type LegendsBackgroundFitCategoryDefinition = {
  chance: number | null
  minimumPerkGroups: number | null
  perkGroupIds: string[]
}

export type LegendsBackgroundCampResourceModifierGroup = 'capacity' | 'skill' | 'terrain'

type LegendsBackgroundCampResourceModifierValueKind = 'flat' | 'percent'

export type LegendsBackgroundCampResourceModifier = {
  group: LegendsBackgroundCampResourceModifierGroup
  label: string
  modifierKey: string
  value: number
  valueKind: LegendsBackgroundCampResourceModifierValueKind
}

export type LegendsBackgroundTrait = {
  description: string | null
  iconPath: string | null
  traitName: string
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
  excludedTraits: LegendsBackgroundTrait[]
  excludedTraitNames: string[]
  guaranteedTraits: LegendsBackgroundTrait[]
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

export type LegendsPerkCatalogDataset = {
  backgroundSourceTable: LegendsPerkCatalogBackgroundSourceTable
  perks: LegendsPerkCatalogRecord[]
  referenceVersion: string
}

export type LegendsBackgroundFitDataset = Pick<
  LegendsPerksDataset,
  'backgroundFitBackgrounds' | 'backgroundFitRules' | 'referenceVersion'
> & {
  perks: LegendsBuildSharePreviewPerkRecord[]
}

export type LegendsPlannerMetadataDataset = {
  availableBackgroundVeteranPerkLevelIntervals: number[]
  backgroundUrlOptions: Array<
    Pick<LegendsBackgroundFitBackgroundDefinition, 'backgroundId' | 'sourceFilePath'>
  >
  referenceVersion: string
}
