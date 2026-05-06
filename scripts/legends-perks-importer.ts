import type { Dirent } from 'node:fs'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defaultLegendsReferenceDirectoryPath } from './ensure-legends-reference.ts'
import {
  dynamicBackgroundCategoryChanceKeys,
  dynamicBackgroundCategoryMinimumKeys,
  dynamicBackgroundCategoryNames,
  dynamicBackgroundCategoryOrder,
  isDynamicBackgroundCategoryName,
} from '../src/lib/dynamic-background-categories.ts'
import { isOriginBackgroundSourceLabel } from '../src/lib/background-origin.ts'
import {
  calculateBackgroundPerkGroupProbabilities,
  createBackgroundPerkGroupProbabilityContext,
  getPerkGroupProbabilityKey,
} from '../src/lib/background-fit-probabilities.ts'
import { getAvailableBackgroundVeteranPerkLevelIntervals } from '../src/lib/background-veteran-perks.ts'
import {
  SquirrelSubsetParser,
  collectTopLevelStatements,
  parseSquirrelValue,
  splitTopLevelCommaSeparated,
  unwrapArray,
  unwrapCall,
  unwrapReference,
  unwrapTable,
  type SquirrelAssignmentStatement,
  type SquirrelExpressionStatement,
  type SquirrelFunctionValue,
  type SquirrelStatement,
  type SquirrelTableFunctionEntry,
  type SquirrelValue,
} from './squirrel-subset-parser.ts'
import { sortUniqueStrings } from './script-utils.ts'
import { addImporterParseWarning, type ImporterDiagnosticContext } from './importer-diagnostics.ts'
import type {
  LegendsBackgroundCampResourceModifier,
  LegendsBackgroundCampResourceModifierGroup,
  LegendsBackgroundFitDataset,
  LegendsBackgroundFitBackgroundDefinition,
  LegendsBackgroundFitClassWeaponDependency,
  LegendsBackgroundFitPerkRecord,
  LegendsBackgroundStartingAttributeKey,
  LegendsBackgroundTrait,
  LegendsDynamicBackgroundCategoryName,
  LegendsFavouredEnemyTarget,
  LegendsPerkBackgroundSource,
  LegendsPerkCatalogBackgroundSourceTable,
  LegendsPerkCatalogDataset,
  LegendsPerkCatalogRecord,
  LegendsPerkPlacement,
  LegendsPerkRecord,
  LegendsPerksDataset,
  LegendsPlannerMetadataDataset,
} from '../src/types/legends-perks.ts'
export { createImporterDiagnostics } from './importer-diagnostics.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRootDirectoryPath = path.resolve(__dirname, '..')
const vanillaTraitMetadataFilePath = path.join(__dirname, 'vanilla-trait-metadata.json')

export const defaultReferenceRootDirectoryPath = defaultLegendsReferenceDirectoryPath

const defaultCategoryOrder = [...dynamicBackgroundCategoryOrder]
const fallbackVeteranPerkLevelInterval = 4

type NutFileEntry = {
  fileSource: string
  sourceFilePath: string
}

type PerkStringData = {
  descriptionsByConstName: Map<string, string>
  namesByConstName: Map<string, string>
}

type PerkDefinition = {
  constName: string
  descriptionConstName: string | null
  disabledIconPath: string | null
  iconPath: string | null
  identifier: string
  nameConstName: string | null
  scriptPath: string | null
  sourceFilePath: string
}

type PerkGroupDefinition = {
  categoryName: string | null
  constName: string
  descriptionLines: string[]
  iconPath: string | null
  id: string
  name: string
  perkConstNamesByTier: string[][]
  sourceFilePath: string
}

type BackgroundCampResourceModifierValueKind = 'flat' | 'percent'

type BackgroundCampResourceModifierRecord = Record<string, number | number[]>

type BackgroundAttributeRange = {
  maximum: number
  minimum: number
}

type BackgroundAttributeRangeRecord = Record<
  LegendsBackgroundStartingAttributeKey,
  BackgroundAttributeRange
>

type BackgroundAttributeRangeVariants = {
  defaultRanges: BackgroundAttributeRangeRecord | null
  femaleRanges: BackgroundAttributeRangeRecord | null
}

type BackgroundTypeMetadata = {
  backgroundTypeNamesByKey: Map<string, string>
  backgroundTypeValuesByKey: Map<string, number>
}

type TraitMetadataRecord = {
  description: string | null
  hasExplicitName: boolean
  iconPath: string | null
  shouldOverrideName?: boolean
  traitName: string
}

type TraitRecordInput = LegendsBackgroundTrait &
  Partial<Pick<TraitMetadataRecord, 'hasExplicitName' | 'shouldOverrideName'>>

type TraitMetadata = {
  traitRecordsByConstName: Map<string, TraitMetadataRecord>
  traitRecordsByName: Map<string, TraitMetadataRecord>
  traitRecordsByScriptId: Map<string, TraitMetadataRecord>
}

type BackgroundMetadataDefaults = Pick<
  LegendsBackgroundFitBackgroundDefinition,
  | 'backgroundTypeNames'
  | 'campResourceModifiers'
  | 'dailyCost'
  | 'excludedTalentAttributeNames'
  | 'excludedTraitNames'
  | 'excludedTraits'
  | 'guaranteedTraitNames'
  | 'guaranteedTraits'
>

type BackgroundMinimums = Record<string, number>

type ImportedBackgroundDefinition = BackgroundMetadataDefaults & {
  backgroundIdentifier: string | null
  attributeModifierRanges: BackgroundAttributeRangeRecord
  backgroundName: string | null
  backgroundScriptId: string
  canUseFemaleBackgroundTypeFromGenderSetting: boolean
  dynamicTreeValue: SquirrelValue
  femaleAttributeModifierRanges: BackgroundAttributeRangeRecord | null
  iconPath: string | null
  minimums: BackgroundMinimums
  modifiers: BackgroundCampResourceModifierRecord
  sourceFilePath: string
  veteranPerkLevelInterval: number
}

type ImportedResolvedBackgroundDefinition = ImportedBackgroundDefinition & {
  backgroundIdentifier: string
  backgroundName: string
}

type RawScriptBackgroundDefinition = {
  attributeModifierRanges: BackgroundAttributeRangeRecord | null
  backgroundScriptId: string
  canUseFemaleBackgroundTypeFromGenderSetting: boolean | null
  createBody: string
  femaleAttributeModifierRanges: BackgroundAttributeRangeRecord | null
  metadataSource: string
  parentBackgroundScriptId: string
  sourceFilePath: string
  veteranPerkLevelInterval: number | null
}

type BackgroundFitRules = {
  classWeaponDependencies: LegendsBackgroundFitClassWeaponDependency[]
}

type CharacterBackgroundReferenceFile = {
  backgroundScriptIdsByReference: Map<string, string[]>
  directlyPlayableBackgroundScriptIds: Set<string>
}

type BackgroundScriptReferenceResolutionContext = {
  backgroundScriptIdsByReference: Map<string, string[]>
  knownBackgroundScriptIds: Set<string>
  localValues: LocalSquirrelValues
}

type ScenarioVeteranPerkLevelRecord = {
  isAvatar: boolean
  veteranPerkLevelInterval: number
}

type ScenarioActorRecord = {
  backgroundScriptIds: string[]
  isAvatar: boolean
  veteranPerkLevelIntervals: number[]
}

type ScenarioDefinition = {
  directPerkConstNames: string[]
  overlayDefinitions: Array<{
    candidatePerkConstNames: string[]
    grantType: 'direct' | 'random-pool'
    sourceMethodName: string
  }>
  scenarioIdentifier: string
  scenarioName: string
  sourceFilePath: string
}

type ScenarioSourceDefinition = {
  candidatePerkConstNames: string[]
  grantType: 'direct' | 'random-pool'
  scenarioId: string
  scenarioName: string
  sourceFilePath: string
  sourceMethodName: string
}

type LocalSquirrelValues = Map<string, SquirrelValue>

type NumericOperation = {
  key: string
  operator: '+=' | '-=' | '='
  value: number
}

type CreateDatasetOptions = {
  diagnostics?: ImporterDiagnosticContext['diagnostics'] | null
  referenceVersion?: string | null
}

type PerkBackgroundSourceContext = {
  backgroundFitBackgrounds: LegendsBackgroundFitBackgroundDefinition[]
  perkRecord: LegendsPerkRecord
  probabilitiesByBackgroundId: Map<string, Map<string, number>>
}

type DynamicPerkPlacement = LegendsPerkPlacement & {
  categoryName: LegendsDynamicBackgroundCategoryName
}

const favouredEnemyPerkConstByArrayName: Record<string, string> = {
  FavoriteBeast: 'LegendFavouredEnemyBeast',
  FavoriteCivilization: 'LegendFavouredEnemyCivilization',
  FavoriteGreenSkins: 'LegendFavouredEnemyGreenskin',
  FavoriteOccult: 'LegendFavouredEnemyOccult',
  FavoriteOutlaw: 'LegendFavouredEnemyOutlaw',
  FavoriteSwordmaster: 'LegendFavouredEnemySwordmaster',
  FavoriteUndead: 'LegendFavouredEnemyUndead',
}

const fallbackPerkNamesByIdentifier: Record<string, string> = {
  'perk.mastery.axe': 'Axe Mastery',
  'perk.mastery.bow': 'Bow Mastery',
  'perk.mastery.cleaver': 'Cleaver Mastery',
  'perk.mastery.crossbow': 'Crossbow Mastery',
  'perk.mastery.dagger': 'Dagger Mastery',
  'perk.mastery.flail': 'Flail Mastery',
  'perk.mastery.hammer': 'Hammer Mastery',
  'perk.mastery.mace': 'Mace Mastery',
  'perk.mastery.polearm': 'Polearm Mastery',
  'perk.mastery.spear': 'Spear Mastery',
  'perk.mastery.sword': 'Sword Mastery',
  'perk.mastery.throwing': 'Throwing Mastery',
}

const backgroundCampResourceModifierGroupsByKey: Record<
  string,
  LegendsBackgroundCampResourceModifierGroup
> = {
  Ammo: 'capacity',
  ArmorParts: 'capacity',
  Meds: 'capacity',
  Stash: 'capacity',
  Terrain: 'terrain',
}

const backgroundCampResourceModifierLabelsByKey: Record<string, string> = {
  Ammo: 'Ammo capacity',
  ArmorParts: 'Tools and supplies capacity',
  Meds: 'Medicine capacity',
  Stash: 'Stash capacity',
  Healing: 'Healing',
  Injury: 'Injury recovery',
  Repair: 'Repairing',
  Salvage: 'Salvaging',
  Crafting: 'Crafting',
  Barter: 'Bartering',
  ToolConsumption: 'Tool consumption',
  MedConsumption: 'Medicine consumption',
  Hunting: 'Hunting',
  Fletching: 'Fletching',
  Scout: 'Scouting',
  Gathering: 'Gathering',
  Training: 'Training',
  Enchanting: 'Enchanting',
}

const backgroundCampResourceModifierOrder = [
  'Ammo',
  'ArmorParts',
  'Meds',
  'Stash',
  'Healing',
  'Injury',
  'Repair',
  'Salvage',
  'Crafting',
  'Barter',
  'ToolConsumption',
  'MedConsumption',
  'Hunting',
  'Fletching',
  'Scout',
  'Gathering',
  'Training',
  'Enchanting',
  'Terrain',
]

const backgroundTerrainLabelsByIndex: Record<number, string> = {
  2: 'Plains',
  3: 'Swamps',
  4: 'Hills',
  5: 'Forests',
  6: 'Snow forests',
  7: 'Leaf forests',
  8: 'Autumn forests',
  9: 'Mountains',
  11: 'Farmland',
  12: 'Snow',
  13: 'Badlands',
  14: 'Highlands',
  15: 'Steppes',
  17: 'Deserts',
  18: 'Oases',
}

const backgroundTalentAttributeLabelsByConstName: Record<string, string> = {
  Bravery: 'Resolve',
  Fatigue: 'Fatigue',
  Hitpoints: 'Hitpoints',
  Initiative: 'Initiative',
  MeleeDefense: 'Melee defense',
  MeleeSkill: 'Melee skill',
  RangedDefense: 'Ranged defense',
  RangedSkill: 'Ranged skill',
}

const backgroundStartingAttributeKeys: LegendsBackgroundStartingAttributeKey[] = [
  'Hitpoints',
  'Bravery',
  'Stamina',
  'Initiative',
  'MeleeSkill',
  'RangedSkill',
  'MeleeDefense',
  'RangedDefense',
]

const backgroundStartingAttributeLabelsByKey: Record<
  LegendsBackgroundStartingAttributeKey,
  string
> = {
  Bravery: backgroundTalentAttributeLabelsByConstName.Bravery,
  Hitpoints: backgroundTalentAttributeLabelsByConstName.Hitpoints,
  Initiative: backgroundTalentAttributeLabelsByConstName.Initiative,
  MeleeDefense: backgroundTalentAttributeLabelsByConstName.MeleeDefense,
  MeleeSkill: backgroundTalentAttributeLabelsByConstName.MeleeSkill,
  RangedDefense: backgroundTalentAttributeLabelsByConstName.RangedDefense,
  RangedSkill: backgroundTalentAttributeLabelsByConstName.RangedSkill,
  Stamina: backgroundTalentAttributeLabelsByConstName.Fatigue,
}

const backgroundStartingAttributeIconPathsByKey: Record<
  LegendsBackgroundStartingAttributeKey,
  string
> = {
  Bravery: 'ui/icons/bravery_va11.png',
  Hitpoints: 'ui/icons/health_va11.png',
  Initiative: 'ui/icons/initiative_va11.png',
  MeleeDefense: 'ui/icons/melee_defense_va11.png',
  MeleeSkill: 'ui/icons/melee_skill_va11.png',
  RangedDefense: 'ui/icons/ranged_defense_va11.png',
  RangedSkill: 'ui/icons/ranged_skill_va11.png',
  Stamina: 'ui/icons/fatigue_va11.png',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isAssignmentStatement(
  statement: SquirrelStatement,
): statement is SquirrelAssignmentStatement {
  return statement.type === 'assignment'
}

function isExpressionStatement(
  statement: SquirrelStatement,
): statement is SquirrelExpressionStatement {
  return statement.type === 'expression'
}

function isSquirrelFunctionValue(
  value: SquirrelValue | null | undefined,
): value is SquirrelFunctionValue {
  return isRecord(value) && value.type === 'function'
}

function hasResolvedBackgroundIdentity(
  backgroundDefinition: ImportedBackgroundDefinition,
): backgroundDefinition is ImportedResolvedBackgroundDefinition {
  return (
    backgroundDefinition.backgroundIdentifier !== null &&
    backgroundDefinition.backgroundName !== null
  )
}

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

function toPosixRelativePath(absolutePath: string): string {
  return path.relative(projectRootDirectoryPath, absolutePath).replaceAll('\\', '/')
}

function getReferenceVersion(referenceRootDirectoryPath: string): string {
  return path.basename(path.dirname(referenceRootDirectoryPath))
}

async function readReferenceVersionFromMetadata(
  referenceRootDirectoryPath: string,
): Promise<string | null> {
  const metadataFilePath = path.join(
    path.dirname(referenceRootDirectoryPath),
    'reference-metadata.json',
  )

  try {
    const referenceMetadata = JSON.parse(await readFile(metadataFilePath, 'utf8')) as unknown
    return isRecord(referenceMetadata) && typeof referenceMetadata.tagName === 'string'
      ? referenceMetadata.tagName
      : null
  } catch {
    return null
  }
}

async function readFileIfExists(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8')
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null
    }

    throw error
  }
}

async function readDirectoryNamesIfExists(directoryPath: string): Promise<Dirent[]> {
  try {
    return await readdir(directoryPath, { withFileTypes: true })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return []
    }

    throw error
  }
}

async function collectNutFileEntriesRecursively(directoryPath: string): Promise<NutFileEntry[]> {
  const nutFileEntries: NutFileEntry[] = []
  const directoryEntries = await readDirectoryNamesIfExists(directoryPath)

  for (const directoryEntry of directoryEntries) {
    const childPath = path.join(directoryPath, directoryEntry.name)

    if (directoryEntry.isDirectory()) {
      nutFileEntries.push(...(await collectNutFileEntriesRecursively(childPath)))
      continue
    }

    if (!directoryEntry.isFile() || !directoryEntry.name.endsWith('.nut')) {
      continue
    }

    nutFileEntries.push({
      fileSource: await readFile(childPath, 'utf8'),
      sourceFilePath: toPosixRelativePath(childPath),
    })
  }

  return nutFileEntries.toSorted((leftEntry, rightEntry) =>
    leftEntry.sourceFilePath.localeCompare(rightEntry.sourceFilePath),
  )
}

function getLastPathSegment(value: string): string {
  return value.split('.').at(-1) ?? value
}

function getBackgroundScriptIdFromSourceFilePath(sourceFilePath: string): string {
  return path.basename(sourceFilePath, path.extname(sourceFilePath))
}

function getScriptsRootDirectoryPath(referenceRootDirectoryPath: string): string {
  return path.join(path.dirname(referenceRootDirectoryPath), 'scripts')
}

function normalizeConstReference(reference: string): string {
  if (reference.startsWith('this.Const.')) {
    return `::Const.${reference.slice('this.Const.'.length)}`
  }

  return reference
}

function stripSquirrelComments(source: string): string {
  let strippedSource = ''
  let index = 0

  while (index < source.length) {
    const twoCharacters = source.slice(index, index + 2)
    const character = source[index]

    if (twoCharacters === '//') {
      while (index < source.length && source[index] !== '\n') {
        strippedSource += ' '
        index += 1
      }

      continue
    }

    if (twoCharacters === '/*') {
      strippedSource += '  '
      index += 2

      while (index < source.length && source.slice(index, index + 2) !== '*/') {
        strippedSource += source[index] === '\n' ? '\n' : ' '
        index += 1
      }

      if (source.slice(index, index + 2) === '*/') {
        strippedSource += '  '
        index += 2
      }

      continue
    }

    if (twoCharacters === '@"') {
      strippedSource += twoCharacters
      index += 2

      while (index < source.length) {
        strippedSource += source[index]

        if (source[index] === '"') {
          index += 1
          break
        }

        index += 1
      }

      continue
    }

    if (character === '"') {
      strippedSource += character
      index += 1

      while (index < source.length) {
        strippedSource += source[index]

        if (source[index] === '\\' && index + 1 < source.length) {
          strippedSource += source[index + 1]
          index += 2
          continue
        }

        if (source[index] === '"') {
          index += 1
          break
        }

        index += 1
      }

      continue
    }

    strippedSource += character
    index += 1
  }

  return strippedSource
}

function prettifyIdentifier(value: string): string {
  return normalizeWhitespace(
    value
      .replace(/^Legend/, 'Legend ')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' '),
  )
}

function resolveFallbackPerkName(perkIdentifier: string, perkConstName: string): string {
  return fallbackPerkNamesByIdentifier[perkIdentifier] ?? prettifyIdentifier(perkConstName)
}

function resolvePerkName(perkDefinition: PerkDefinition, perkStringData: PerkStringData): string {
  return (
    (perkDefinition.nameConstName
      ? perkStringData.namesByConstName.get(perkDefinition.nameConstName)
      : null) ?? resolveFallbackPerkName(perkDefinition.identifier, perkDefinition.constName)
  )
}

function cleanRichText(value: string): string {
  return normalizeWhitespace(
    value
      .replace(/\r/g, '')
      .replace(/\[(?:\/)?[^\]]+\]/g, '')
      .replace(/%[A-Za-z_]+%/g, '')
      .replace(/&nbsp;/gi, ' '),
  )
}

function splitDescriptionParagraphs(value: string): string[] {
  return value
    .replace(/\r/g, '')
    .split(/\n\s*\n+/)
    .map((paragraph) =>
      cleanRichText(
        paragraph
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .join(' '),
      ),
    )
    .filter(Boolean)
}

function getCategoryPriority(categoryOrder: string[], categoryName: string): number {
  const priority = categoryOrder.indexOf(categoryName)
  return priority === -1 ? Number.POSITIVE_INFINITY : priority
}

function asPrimitiveValue(
  value: SquirrelValue | null | undefined,
  localValues: LocalSquirrelValues = new Map(),
): SquirrelValue {
  if (value === undefined) {
    return null
  }

  const localReference = unwrapReference(value)

  if (localReference !== null && localValues.has(localReference)) {
    return localValues.get(localReference) ?? value
  }

  return value
}

function tableEntriesToMap(
  tableValue: SquirrelValue | null | undefined,
  localValues: LocalSquirrelValues = new Map(),
): Map<string, SquirrelValue> {
  const table = unwrapTable(asPrimitiveValue(tableValue, localValues))

  if (table === null) {
    return new Map<string, SquirrelValue>()
  }

  const entries = new Map<string, SquirrelValue>()

  for (const entry of table.entries) {
    if (entry.type !== 'property') {
      continue
    }

    entries.set(entry.key, asPrimitiveValue(entry.value, localValues))
  }

  return entries
}

function arrayValues(
  value: SquirrelValue | null | undefined,
  localValues: LocalSquirrelValues = new Map(),
): SquirrelValue[] {
  const arrayValue = unwrapArray(asPrimitiveValue(value, localValues))
  return arrayValue === null
    ? []
    : arrayValue.values.map((item) => asPrimitiveValue(item, localValues))
}

function stringValue(
  value: SquirrelValue | null | undefined,
  localValues: LocalSquirrelValues = new Map(),
): string | null {
  const resolvedValue = asPrimitiveValue(value, localValues)
  return typeof resolvedValue === 'string' ? resolvedValue : null
}

function numberValue(
  value: SquirrelValue | null | undefined,
  localValues: LocalSquirrelValues = new Map(),
): number | null {
  const resolvedValue = asPrimitiveValue(value, localValues)
  return typeof resolvedValue === 'number' && Number.isFinite(resolvedValue) ? resolvedValue : null
}

function referenceValue(
  value: SquirrelValue | null | undefined,
  localValues: LocalSquirrelValues = new Map(),
): string | null {
  return unwrapReference(asPrimitiveValue(value, localValues))
}

function stringArrayValue(
  value: SquirrelValue | null | undefined,
  localValues: LocalSquirrelValues = new Map(),
): string[] {
  return arrayValues(value, localValues)
    .map((item) => stringValue(item, localValues))
    .filter((item) => item !== null)
}

function numberArrayValue(
  value: SquirrelValue | null | undefined,
  localValues: LocalSquirrelValues = new Map(),
): number[] {
  return arrayValues(value, localValues)
    .map((item) => numberValue(item, localValues))
    .filter((item) => item !== null)
}

function referenceArrayValue(
  value: SquirrelValue | null | undefined,
  localValues: LocalSquirrelValues = new Map(),
): string[] {
  return arrayValues(value, localValues)
    .map((item) => referenceValue(item, localValues))
    .filter((item) => item !== null)
}

function createZeroBackgroundAttributeRanges(): BackgroundAttributeRangeRecord {
  return Object.fromEntries(
    backgroundStartingAttributeKeys.map((attributeKey) => [
      attributeKey,
      {
        maximum: 0,
        minimum: 0,
      },
    ]),
  ) as BackgroundAttributeRangeRecord
}

function cloneBackgroundAttributeRanges(
  attributeRanges: BackgroundAttributeRangeRecord,
): BackgroundAttributeRangeRecord {
  return Object.fromEntries(
    backgroundStartingAttributeKeys.map((attributeKey) => {
      const attributeRange = attributeRanges[attributeKey]

      return [
        attributeKey,
        {
          maximum: attributeRange.maximum,
          minimum: attributeRange.minimum,
        },
      ]
    }),
  ) as BackgroundAttributeRangeRecord
}

function normalizeBackgroundAttributeRange(
  firstValue: number,
  secondValue: number,
): BackgroundAttributeRange {
  return {
    maximum: Math.max(firstValue, secondValue),
    minimum: Math.min(firstValue, secondValue),
  }
}

function parseBackgroundAttributeRangesFromTableValue(
  tableValue: SquirrelValue | null | undefined,
  localValues: LocalSquirrelValues = new Map(),
): BackgroundAttributeRangeRecord | null {
  const tableEntries = tableEntriesToMap(tableValue, localValues)

  if (tableEntries.size === 0) {
    return null
  }

  const attributeRanges = createZeroBackgroundAttributeRanges()
  let parsedAttributeCount = 0

  for (const attributeKey of backgroundStartingAttributeKeys) {
    const rangeValues = numberArrayValue(tableEntries.get(attributeKey), localValues)

    if (rangeValues.length < 2) {
      continue
    }

    attributeRanges[attributeKey] = normalizeBackgroundAttributeRange(
      rangeValues[0],
      rangeValues[1],
    )
    parsedAttributeCount += 1
  }

  return parsedAttributeCount === 0 ? null : attributeRanges
}

function addBackgroundAttributeRanges(
  leftRanges: BackgroundAttributeRangeRecord,
  rightRanges: BackgroundAttributeRangeRecord,
): BackgroundAttributeRangeRecord {
  return Object.fromEntries(
    backgroundStartingAttributeKeys.map((attributeKey) => {
      const leftRange = leftRanges[attributeKey]
      const rightRange = rightRanges[attributeKey]

      return [
        attributeKey,
        {
          maximum: leftRange.maximum + rightRange.maximum,
          minimum: leftRange.minimum + rightRange.minimum,
        },
      ]
    }),
  ) as BackgroundAttributeRangeRecord
}

function mergeBackgroundAttributeRangeBounds(
  attributeRangeRecords: BackgroundAttributeRangeRecord[],
): BackgroundAttributeRangeRecord {
  if (attributeRangeRecords.length === 0) {
    return createZeroBackgroundAttributeRanges()
  }

  return Object.fromEntries(
    backgroundStartingAttributeKeys.map((attributeKey) => {
      const attributeRanges = attributeRangeRecords.map(
        (attributeRangeRecord) => attributeRangeRecord[attributeKey],
      )

      return [
        attributeKey,
        {
          maximum: Math.max(...attributeRanges.map((attributeRange) => attributeRange.maximum)),
          minimum: Math.min(...attributeRanges.map((attributeRange) => attributeRange.minimum)),
        },
      ]
    }),
  ) as BackgroundAttributeRangeRecord
}

function buildBackgroundStartingAttributeRanges({
  baseAttributeRanges,
  femaleBaseAttributeModifierRanges,
  background,
}: {
  baseAttributeRanges: BackgroundAttributeRangeRecord
  femaleBaseAttributeModifierRanges: BackgroundAttributeRangeRecord
  background: ImportedBackgroundDefinition
}): LegendsBackgroundFitBackgroundDefinition['startingAttributeRanges'] {
  const hasFixedFemaleBackgroundType = background.backgroundTypeNames.includes('Female')
  const canUseFemaleBackgroundType =
    hasFixedFemaleBackgroundType || background.canUseFemaleBackgroundTypeFromGenderSetting
  const femaleAttributeModifierRanges =
    background.femaleAttributeModifierRanges ?? background.attributeModifierRanges
  const attributeRangeVariants: {
    attributeModifierRanges: BackgroundAttributeRangeRecord
    baseAttributeRanges: BackgroundAttributeRangeRecord
  }[] = []

  if (!hasFixedFemaleBackgroundType) {
    attributeRangeVariants.push({
      attributeModifierRanges: background.attributeModifierRanges,
      baseAttributeRanges,
    })
  }

  if (canUseFemaleBackgroundType) {
    attributeRangeVariants.push(
      {
        attributeModifierRanges: femaleAttributeModifierRanges,
        baseAttributeRanges,
      },
      {
        attributeModifierRanges: femaleAttributeModifierRanges,
        baseAttributeRanges: addBackgroundAttributeRanges(
          baseAttributeRanges,
          femaleBaseAttributeModifierRanges,
        ),
      },
    )
  }

  const startingAttributeRanges = mergeBackgroundAttributeRangeBounds(
    attributeRangeVariants.map((variant) =>
      addBackgroundAttributeRanges(variant.baseAttributeRanges, variant.attributeModifierRanges),
    ),
  )
  const modifierAttributeRanges = mergeBackgroundAttributeRangeBounds(
    attributeRangeVariants.map((variant) => variant.attributeModifierRanges),
  )

  return backgroundStartingAttributeKeys.map((attributeKey) => {
    const startingAttributeRange = startingAttributeRanges[attributeKey]
    const modifierAttributeRange = modifierAttributeRanges[attributeKey]

    return {
      attributeKey,
      attributeName: backgroundStartingAttributeLabelsByKey[attributeKey],
      iconPath: backgroundStartingAttributeIconPathsByKey[attributeKey],
      maximum: startingAttributeRange.maximum,
      minimum: startingAttributeRange.minimum,
      modifierMaximum: modifierAttributeRange.maximum,
      modifierMinimum: modifierAttributeRange.minimum,
    }
  })
}

function resolveReferenceConstName(reference: string | null): string | null {
  if (reference === null) {
    return null
  }

  if (reference.startsWith('::Legends.Perk.')) {
    return getLastPathSegment(reference)
  }

  if (reference.startsWith('::Const.Perks.PerkDefs.')) {
    return getLastPathSegment(reference)
  }

  return null
}

function escapeForRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractAssignedValue(
  source: string,
  assignmentTarget: string,
  diagnosticContext: ImporterDiagnosticContext | null = null,
): SquirrelValue | null {
  const pattern = new RegExp(`${escapeForRegularExpression(assignmentTarget)}\\s*(?:<-|=)\\s*`, 'g')
  const match = pattern.exec(source)

  if (!match) {
    return null
  }

  try {
    return parseSquirrelValue(source, match.index + match[0].length).value
  } catch (error) {
    addImporterParseWarning(
      diagnosticContext,
      `${assignmentTarget} assignment`,
      source.slice(match.index),
      error,
    )
    return null
  }
}

function extractNumericOperations(source: string, assignmentPrefix: string): NumericOperation[] {
  const pattern = new RegExp(
    `${escapeForRegularExpression(assignmentPrefix)}([A-Za-z0-9_]+)\\s*(\\+=|-=|=)\\s*([+-]?(?:\\d+\\.\\d+|\\d+|\\.\\d+))\\s*;`,
    'g',
  )
  const operations: NumericOperation[] = []

  for (const match of source.matchAll(pattern)) {
    operations.push({
      key: match[1],
      operator: match[2] as NumericOperation['operator'],
      value: Number(match[3]),
    })
  }

  return operations
}

function findTopLevelStatementEnd(source: string, startIndex: number): number {
  let braceDepth = 0
  let bracketDepth = 0
  let parenthesesDepth = 0
  let index = startIndex

  while (index < source.length) {
    const twoCharacters = source.slice(index, index + 2)
    const character = source[index]

    if (twoCharacters === '@"') {
      index += 2
      const endIndex = source.indexOf('"', index)
      index = endIndex === -1 ? source.length : endIndex + 1
      continue
    }

    if (character === '"') {
      index += 1

      while (index < source.length) {
        if (source[index] === '\\') {
          index += 2
          continue
        }

        if (source[index] === '"') {
          index += 1
          break
        }

        index += 1
      }

      continue
    }

    if (character === '{') {
      braceDepth += 1
      index += 1
      continue
    }

    if (character === '}') {
      if (braceDepth === 0 && bracketDepth === 0 && parenthesesDepth === 0) {
        return index
      }

      braceDepth -= 1
      index += 1
      continue
    }

    if (character === '[') {
      bracketDepth += 1
      index += 1
      continue
    }

    if (character === ']') {
      bracketDepth -= 1
      index += 1
      continue
    }

    if (character === '(') {
      parenthesesDepth += 1
      index += 1
      continue
    }

    if (character === ')') {
      parenthesesDepth -= 1
      index += 1
      continue
    }

    if (character === ';' && braceDepth === 0 && bracketDepth === 0 && parenthesesDepth === 0) {
      return index
    }

    index += 1
  }

  return source.length
}

function extractAssignmentExpressionSource(
  source: string,
  assignmentTarget: string,
): string | null {
  const pattern = new RegExp(`${escapeForRegularExpression(assignmentTarget)}\\s*(?:<-|=)\\s*`, 'g')
  const match = pattern.exec(source)

  if (!match) {
    return null
  }

  const valueStartIndex = match.index + match[0].length
  const valueEndIndex = findTopLevelStatementEnd(source, valueStartIndex)
  return source.slice(valueStartIndex, valueEndIndex).trim()
}

function parseResourceModifierReference(reference: string): {
  modifierKey: string
  valueIndex: number
} | null {
  const normalizedReference = normalizeConstReference(reference)
  const match = /^::Const\.LegendMod\.ResourceModifiers\.([A-Za-z0-9_]+)\[(\d+)\]$/u.exec(
    normalizedReference,
  )

  if (!match) {
    return null
  }

  return {
    modifierKey: match[1],
    valueIndex: Number(match[2]),
  }
}

function resolveResourceModifierValue(
  value: SquirrelValue,
  resourceModifierValuesByKey: Map<string, number[]>,
): number | null {
  const directNumberValue = numberValue(value)

  if (directNumberValue !== null) {
    return directNumberValue
  }

  const reference = referenceValue(value)

  if (reference === null) {
    return null
  }

  const modifierReference = parseResourceModifierReference(reference)

  if (modifierReference === null) {
    return null
  }

  const modifierValues = resourceModifierValuesByKey.get(modifierReference.modifierKey) ?? []
  return modifierValues[modifierReference.valueIndex] ?? null
}

function cloneBackgroundModifiers(
  modifiers: BackgroundCampResourceModifierRecord,
): BackgroundCampResourceModifierRecord {
  return Object.fromEntries(
    Object.entries(modifiers).map(([modifierKey, modifierValue]) => [
      modifierKey,
      Array.isArray(modifierValue) ? [...modifierValue] : modifierValue,
    ]),
  )
}

function cloneBackgroundDefinitionMetadata(
  backgroundDefinition: BackgroundMetadataDefaults & {
    modifiers: BackgroundCampResourceModifierRecord
  },
): BackgroundMetadataDefaults & { modifiers: BackgroundCampResourceModifierRecord } {
  return {
    backgroundTypeNames: [...backgroundDefinition.backgroundTypeNames],
    campResourceModifiers: backgroundDefinition.campResourceModifiers.map((modifier) => ({
      ...modifier,
    })),
    dailyCost: backgroundDefinition.dailyCost,
    excludedTalentAttributeNames: [...backgroundDefinition.excludedTalentAttributeNames],
    excludedTraits: backgroundDefinition.excludedTraits.map((trait) => ({ ...trait })),
    excludedTraitNames: [...backgroundDefinition.excludedTraitNames],
    guaranteedTraits: backgroundDefinition.guaranteedTraits.map((trait) => ({ ...trait })),
    guaranteedTraitNames: [...backgroundDefinition.guaranteedTraitNames],
    modifiers: cloneBackgroundModifiers(backgroundDefinition.modifiers),
  }
}

function getBackgroundCampResourceModifierGroup(
  modifierKey: string,
): LegendsBackgroundCampResourceModifierGroup {
  return backgroundCampResourceModifierGroupsByKey[modifierKey] ?? 'skill'
}

function getBackgroundCampResourceModifierValueKind(
  modifierKey: string,
): BackgroundCampResourceModifierValueKind {
  return getBackgroundCampResourceModifierGroup(modifierKey) === 'capacity' ? 'flat' : 'percent'
}

function getBackgroundCampResourceModifierOrder(modifierKey: string): number {
  const baseKey = modifierKey.split('.')[0]
  const order = backgroundCampResourceModifierOrder.indexOf(baseKey)
  return order === -1 ? Number.POSITIVE_INFINITY : order
}

function getBackgroundCampResourceModifierDetailOrder(modifierKey: string): number {
  const [, detailKey] = modifierKey.split('.')
  const detailOrder = detailKey === undefined ? 0 : Number(detailKey)
  return Number.isFinite(detailOrder) ? detailOrder : Number.POSITIVE_INFINITY
}

function buildBackgroundCampResourceModifiers(
  modifiers: BackgroundCampResourceModifierRecord,
): LegendsBackgroundCampResourceModifier[] {
  const resourceModifiers: LegendsBackgroundCampResourceModifier[] = []

  for (const [modifierKey, modifierValue] of Object.entries(modifiers)) {
    if (Array.isArray(modifierValue)) {
      for (const [terrainIndex, terrainModifierValue] of modifierValue.entries()) {
        if (terrainModifierValue === 0) {
          continue
        }

        const terrainLabel =
          backgroundTerrainLabelsByIndex[terrainIndex] ?? `Terrain ${terrainIndex}`

        resourceModifiers.push({
          group: 'terrain',
          label: terrainLabel,
          modifierKey: `${modifierKey}.${terrainIndex}`,
          value: terrainModifierValue,
          valueKind: 'percent',
        })
      }

      continue
    }

    if (modifierValue === 0) {
      continue
    }

    resourceModifiers.push({
      group: getBackgroundCampResourceModifierGroup(modifierKey),
      label:
        backgroundCampResourceModifierLabelsByKey[modifierKey] ?? prettifyIdentifier(modifierKey),
      modifierKey,
      value: modifierValue,
      valueKind: getBackgroundCampResourceModifierValueKind(modifierKey),
    })
  }

  return resourceModifiers.toSorted(
    (leftModifier, rightModifier) =>
      getBackgroundCampResourceModifierOrder(leftModifier.modifierKey) -
        getBackgroundCampResourceModifierOrder(rightModifier.modifierKey) ||
      getBackgroundCampResourceModifierDetailOrder(leftModifier.modifierKey) -
        getBackgroundCampResourceModifierDetailOrder(rightModifier.modifierKey) ||
      leftModifier.modifierKey.localeCompare(rightModifier.modifierKey),
  )
}

function parseResourceModifierValuesFile(fileSource: string): Map<string, number[]> {
  const resourceModifierValuesByKey = new Map<string, number[]>()
  const resourceModifierAssignment = collectTopLevelStatements(fileSource).find(
    (statement): statement is SquirrelAssignmentStatement =>
      isAssignmentStatement(statement) &&
      statement.target === '::Const.LegendMod.ResourceModifiers',
  )

  if (!resourceModifierAssignment) {
    return resourceModifierValuesByKey
  }

  for (const [modifierKey, modifierValue] of tableEntriesToMap(
    resourceModifierAssignment.value,
  ).entries()) {
    resourceModifierValuesByKey.set(modifierKey, numberArrayValue(modifierValue))
  }

  return resourceModifierValuesByKey
}

function parseBackgroundTypeMetadataFile(fileSource: string): BackgroundTypeMetadata {
  const backgroundTypeNamesByKey = new Map<string, string>()
  const backgroundTypeValuesByKey = new Map<string, number>()

  for (const statement of collectTopLevelStatements(fileSource)) {
    if (statement.type !== 'assignment') {
      continue
    }

    if (statement.target === '::Const.BackgroundTypeName') {
      for (const [typeKey, typeNameValue] of tableEntriesToMap(statement.value).entries()) {
        const typeName = stringValue(typeNameValue)

        if (typeName !== null) {
          backgroundTypeNamesByKey.set(typeKey, typeName)
        }
      }

      continue
    }

    if (statement.target === '::Const.BackgroundType') {
      for (const [typeKey, typeValue] of tableEntriesToMap(statement.value).entries()) {
        const typeNumberValue = numberValue(typeValue)

        if (typeNumberValue !== null) {
          backgroundTypeValuesByKey.set(typeKey, typeNumberValue)
        }
      }
    }
  }

  return {
    backgroundTypeNamesByKey,
    backgroundTypeValuesByKey,
  }
}

function resolveBackgroundTypeConstKey(reference: string): string | null {
  const normalizedReference = normalizeConstReference(reference)
  const match = /^::Const\.BackgroundType\.([A-Za-z0-9_]+)$/u.exec(normalizedReference)
  return match?.[1] ?? null
}

function parseBackgroundTypeExpression(expressionSource: string): string[] {
  return expressionSource
    .split('|')
    .map((expressionPart) => resolveBackgroundTypeConstKey(expressionPart.trim()))
    .filter((typeKey) => typeKey !== null)
}

function resolveBackgroundTypeNames(
  typeKeys: string[],
  backgroundTypeMetadata: BackgroundTypeMetadata,
): string[] {
  return sortUniqueStrings(
    typeKeys.map(
      (typeKey) =>
        backgroundTypeMetadata.backgroundTypeNamesByKey.get(typeKey) ?? prettifyIdentifier(typeKey),
    ),
  )
}

function applyBackgroundTypeOperation(
  typeKeys: string[],
  operationType: 'add' | 'remove' | 'set',
  nextTypeKey: string,
): string[] {
  if (nextTypeKey === 'None') {
    return operationType === 'set' ? ['None'] : typeKeys
  }

  const nextTypeKeys = typeKeys.filter((typeKey) => typeKey !== 'None')

  if (operationType === 'remove') {
    return nextTypeKeys.filter((typeKey) => typeKey !== nextTypeKey)
  }

  return nextTypeKeys.includes(nextTypeKey) ? nextTypeKeys : [...nextTypeKeys, nextTypeKey]
}

function applyCreateBodyBackgroundTypeOperations(typeKeys: string[], createBody: string): string[] {
  let nextTypeKeys = [...typeKeys]
  const operationPattern =
    /\bthis\.(addBackgroundType|removeBackgroundType)\s*\(\s*((?:this|::)\.?(?:Const)\.BackgroundType\.[A-Za-z0-9_]+)\s*\)/gu

  for (const match of createBody.matchAll(operationPattern)) {
    const typeKey = resolveBackgroundTypeConstKey(match[2])

    if (typeKey === null) {
      continue
    }

    nextTypeKeys = applyBackgroundTypeOperation(
      nextTypeKeys,
      match[1] === 'removeBackgroundType' ? 'remove' : 'add',
      typeKey,
    )
  }

  return nextTypeKeys.length > 0 ? nextTypeKeys : ['None']
}

function parseBackgroundTypeNamesFromCreateBody({
  baseBackgroundTypeNames,
  backgroundTypeMetadata,
  createBody,
}: {
  baseBackgroundTypeNames: string[]
  backgroundTypeMetadata: BackgroundTypeMetadata
  createBody: string
}): string[] {
  const assignedExpressionSource = extractAssignmentExpressionSource(
    createBody,
    'this.m.BackgroundType',
  )
  const assignedTypeKeys =
    assignedExpressionSource === null
      ? baseBackgroundTypeNames.flatMap((typeName) => {
          for (const [
            typeKey,
            candidateTypeName,
          ] of backgroundTypeMetadata.backgroundTypeNamesByKey) {
            if (candidateTypeName === typeName) {
              return [typeKey]
            }
          }

          return typeName === 'None' ? ['None'] : []
        })
      : parseBackgroundTypeExpression(assignedExpressionSource)

  const typeKeys = applyCreateBodyBackgroundTypeOperations(
    assignedTypeKeys.length > 0 ? assignedTypeKeys : ['None'],
    createBody,
  )

  return resolveBackgroundTypeNames(typeKeys, backgroundTypeMetadata)
}

function parseBaseBackgroundModifiers(
  fileSource: string,
  resourceModifierValuesByKey: Map<string, number[]>,
  diagnosticContext: ImporterDiagnosticContext,
): BackgroundCampResourceModifierRecord {
  const modifiersValue = extractAssignedValue(fileSource, 'o.m.Modifiers', diagnosticContext)
  const modifiers: BackgroundCampResourceModifierRecord = {}

  if (modifiersValue === null) {
    return modifiers
  }

  for (const [modifierKey, modifierValue] of tableEntriesToMap(modifiersValue).entries()) {
    const arrayValue = unwrapArray(modifierValue)

    if (arrayValue !== null) {
      modifiers[modifierKey] = arrayValue.values.map(
        (item) => resolveResourceModifierValue(item, resourceModifierValuesByKey) ?? 0,
      )
      continue
    }

    modifiers[modifierKey] =
      resolveResourceModifierValue(modifierValue, resourceModifierValuesByKey) ?? 0
  }

  return modifiers
}

function parseModifierAssignmentValue(
  valueSource: string,
  diagnosticContext: ImporterDiagnosticContext,
): SquirrelValue | null {
  try {
    return parseSquirrelValue(valueSource).value
  } catch (error) {
    addImporterParseWarning(diagnosticContext, 'background modifier assignment', valueSource, error)
    return null
  }
}

function applyCreateBodyModifierOperations({
  createBody,
  diagnostics,
  modifiers,
  resourceModifierValuesByKey,
  sourceFilePath,
}: {
  createBody: string
  diagnostics: ImporterDiagnosticContext['diagnostics']
  modifiers: BackgroundCampResourceModifierRecord
  resourceModifierValuesByKey: Map<string, number[]>
  sourceFilePath: string
}): BackgroundCampResourceModifierRecord {
  const diagnosticContext = { diagnostics, sourceFilePath }
  const operationPattern = /\bthis\.m\.Modifiers\.([A-Za-z0-9_]+)\s*(\+=|-=|=)\s*/gu
  const nextModifiers = cloneBackgroundModifiers(modifiers)

  for (const match of createBody.matchAll(operationPattern)) {
    const modifierKey = match[1]
    const operator = match[2]
    const valueStartIndex = match.index + match[0].length
    const valueEndIndex = findTopLevelStatementEnd(createBody, valueStartIndex)
    const valueSource = createBody.slice(valueStartIndex, valueEndIndex).trim()
    const parsedValue = parseModifierAssignmentValue(valueSource, diagnosticContext)

    if (parsedValue === null) {
      continue
    }

    const arrayValue = unwrapArray(parsedValue)

    if (arrayValue !== null) {
      if (operator !== '=') {
        continue
      }

      nextModifiers[modifierKey] = arrayValue.values.map(
        (item) => resolveResourceModifierValue(item, resourceModifierValuesByKey) ?? 0,
      )
      continue
    }

    const numericValue = resolveResourceModifierValue(parsedValue, resourceModifierValuesByKey)

    if (numericValue === null) {
      continue
    }

    if (operator === '=') {
      nextModifiers[modifierKey] = numericValue
      continue
    }

    const previousValue =
      typeof nextModifiers[modifierKey] === 'number' ? nextModifiers[modifierKey] : 0
    nextModifiers[modifierKey] =
      operator === '+=' ? previousValue + numericValue : previousValue - numericValue
  }

  return nextModifiers
}

function resolveTraitConstNameFromValue(value: SquirrelValue | undefined): string | null {
  if (value === undefined) {
    return null
  }

  const reference = referenceValue(value)

  if (reference !== null) {
    const normalizedReference = normalizeConstReference(reference)
    const traitReferenceMatch = /^::Legends\.Trait\.([A-Za-z0-9_]+)$/u.exec(normalizedReference)

    return traitReferenceMatch?.[1] ?? null
  }

  const callValue = unwrapCall(value)

  if (callValue === null || callValue.callee !== '::Legends.Traits.getID') {
    return null
  }

  return resolveTraitConstNameFromValue(callValue.arguments[0])
}

// Legends hooks often reference vanilla traits without redefining the base icon assignment.
// These paths are backed by the game assets extracted by syncLegendsIcons.
const knownTraitIconPathsByLowercaseName = new Map(
  Object.entries({
    ailing: 'ui/traits/trait_icon_59.png',
    asthmatic: 'ui/traits/trait_icon_22.png',
    athletic: 'ui/traits/trait_icon_21.png',
    bleeder: 'ui/traits/trait_icon_16.png',
    bloodthirsty: 'ui/traits/trait_icon_42.png',
    brave: 'ui/traits/trait_icon_37.png',
    bright: 'ui/traits/trait_icon_11.png',
    brute: 'ui/traits/trait_icon_01.png',
    clubfooted: 'ui/traits/trait_icon_23.png',
    clumsy: 'ui/traits/trait_icon_36.png',
    cocky: 'ui/traits/trait_icon_24.png',
    craven: 'ui/traits/trait_icon_40.png',
    dastard: 'ui/traits/trait_icon_38.png',
    deathwish: 'ui/traits/trait_icon_13.png',
    determined: 'ui/traits/trait_icon_31.png',
    dexterous: 'ui/traits/trait_icon_34.png',
    disloyal: 'ui/traits/trait_icon_35.png',
    drunkard: 'ui/traits/trait_icon_29.png',
    dumb: 'ui/traits/trait_icon_17.png',
    'eagle eyes': 'ui/traits/trait_icon_09.png',
    fainthearted: 'ui/traits/trait_icon_41.png',
    fat: 'ui/traits/trait_icon_10.png',
    'fear beasts': 'ui/traits/trait_icon_48.png',
    'fear greenskins': 'ui/traits/trait_icon_49.png',
    'fear of undead': 'ui/traits/trait_icon_47.png',
    'fear undead': 'ui/traits/trait_icon_47.png',
    fearless: 'ui/traits/trait_icon_30.png',
    fragile: 'ui/traits/trait_icon_04.png',
    gluttonous: 'ui/traits/trait_icon_07.png',
    greedy: 'ui/traits/trait_icon_06.png',
    'hate beasts': 'ui/traits/trait_icon_51.png',
    'hate for beasts': 'ui/traits/trait_icon_51.png',
    'hate for greenskins': 'ui/traits/trait_icon_52.png',
    'hate greenskins': 'ui/traits/trait_icon_52.png',
    'hate for undead': 'ui/traits/trait_icon_50.png',
    'hate undead': 'ui/traits/trait_icon_50.png',
    hesitant: 'ui/traits/trait_icon_25.png',
    hesistant: 'ui/traits/trait_icon_25.png',
    huge: 'ui/traits/trait_icon_61.png',
    impatient: 'ui/traits/trait_icon_46.png',
    insecure: 'ui/traits/trait_icon_03.png',
    'iron jaw': 'ui/traits/trait_icon_44.png',
    'iron lungs': 'ui/traits/trait_icon_33.png',
    irrational: 'ui/traits/trait_icon_28.png',
    loyal: 'ui/traits/trait_icon_39.png',
    mad: 'ui/traits/trait_icon_76.png',
    'night blind': 'ui/traits/trait_icon_56.png',
    'night owl': 'ui/traits/trait_icon_57.png',
    old: 'skills/status_effect_60.png',
    optimist: 'ui/traits/trait_icon_19.png',
    paranoid: 'ui/traits/trait_icon_55.png',
    pessimist: 'ui/traits/trait_icon_20.png',
    quick: 'ui/traits/trait_icon_18.png',
    'short sighted': 'ui/traits/trait_icon_27.png',
    spartan: 'ui/traits/trait_icon_08.png',
    strong: 'ui/traits/trait_icon_15.png',
    superstitious: 'ui/traits/trait_icon_26.png',
    'sure footing': 'ui/traits/trait_icon_05.png',
    survivor: 'ui/traits/trait_icon_43.png',
    swift: 'ui/traits/trait_icon_53.png',
    teamplayer: 'ui/traits/trait_icon_58.png',
    'team player': 'ui/traits/trait_icon_58.png',
    tiny: 'ui/traits/trait_icon_02.png',
    tough: 'ui/traits/trait_icon_14.png',
    weasel: 'ui/traits/trait_icon_60.png',
  }),
)

function getKnownTraitIconPath(traitName: string): string | null {
  return knownTraitIconPathsByLowercaseName.get(traitName.toLocaleLowerCase('en-US')) ?? null
}

function normalizeTraitMetadataRecord(
  traitRecord: TraitRecordInput,
  fallbackTraitName = traitRecord.traitName,
): LegendsBackgroundTrait {
  return {
    description: traitRecord.description ?? null,
    iconPath: traitRecord.iconPath ?? getKnownTraitIconPath(traitRecord.traitName),
    traitName: traitRecord.hasExplicitName ? traitRecord.traitName : fallbackTraitName,
  }
}

function mergeTraitMetadataRecord(
  leftRecord: TraitMetadataRecord | undefined,
  rightRecord: TraitMetadataRecord,
): TraitMetadataRecord {
  if (!leftRecord) {
    return { ...rightRecord }
  }

  const shouldUseRightName =
    rightRecord.shouldOverrideName === false
      ? !leftRecord.hasExplicitName
      : rightRecord.hasExplicitName || !leftRecord.hasExplicitName

  return {
    description: leftRecord.description ?? rightRecord.description ?? null,
    hasExplicitName: leftRecord.hasExplicitName || rightRecord.hasExplicitName,
    iconPath: leftRecord.iconPath ?? rightRecord.iconPath ?? null,
    traitName: shouldUseRightName ? rightRecord.traitName : leftRecord.traitName,
  }
}

function setMergedTraitMetadataRecord(
  map: Map<string, TraitMetadataRecord>,
  key: string | null | undefined,
  traitRecord: TraitMetadataRecord,
): void {
  if (!key) {
    return
  }

  map.set(key, mergeTraitMetadataRecord(map.get(key), traitRecord))
}

function getTraitRecordNameKey(traitName: string): string {
  return normalizeWhitespace(traitName).toLocaleLowerCase('en-US')
}

const traitScriptIdCandidateAliasesByReference = new Map([
  ['hesistant', ['hesitant_trait', 'hesitant']],
])

function getTraitScriptIdCandidates(traitReference: string): string[] {
  const normalizedReference = traitReference.replace(/_trait$/u, '')
  const snakeReference = normalizedReference
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLocaleLowerCase('en-US')

  return [
    `${snakeReference}_trait`,
    snakeReference,
    ...(traitScriptIdCandidateAliasesByReference.get(snakeReference) ?? []),
  ]
}

function sortUniqueTraitRecords(traitRecords: TraitRecordInput[]): LegendsBackgroundTrait[] {
  const traitRecordsByName = new Map<string, LegendsBackgroundTrait>()

  for (const traitRecord of traitRecords) {
    const normalizedTraitRecord = normalizeTraitMetadataRecord(traitRecord)
    const traitRecordNameKey = getTraitRecordNameKey(normalizedTraitRecord.traitName)
    const existingTraitRecord = traitRecordsByName.get(traitRecordNameKey)

    traitRecordsByName.set(traitRecordNameKey, {
      description: existingTraitRecord?.description ?? normalizedTraitRecord.description,
      iconPath: existingTraitRecord?.iconPath ?? normalizedTraitRecord.iconPath,
      traitName: normalizedTraitRecord.traitName,
    })
  }

  return [...traitRecordsByName.values()].toSorted(
    (leftTraitRecord, rightTraitRecord) =>
      leftTraitRecord.traitName.localeCompare(rightTraitRecord.traitName) ||
      (leftTraitRecord.iconPath ?? '').localeCompare(rightTraitRecord.iconPath ?? ''),
  )
}

function resolveTraitRecord(
  traitReference: string | null,
  traitMetadata: TraitMetadata,
): LegendsBackgroundTrait | null {
  if (traitReference === null) {
    return null
  }

  const fallbackTraitName = prettifyIdentifier(traitReference.replace(/_trait$/u, ''))

  const constTraitRecord = traitMetadata.traitRecordsByConstName.get(traitReference)

  if (constTraitRecord) {
    return normalizeTraitMetadataRecord(constTraitRecord, fallbackTraitName)
  }

  const scriptTraitRecord = traitMetadata.traitRecordsByScriptId.get(traitReference)

  if (scriptTraitRecord) {
    return normalizeTraitMetadataRecord(scriptTraitRecord, fallbackTraitName)
  }

  for (const traitScriptIdCandidate of getTraitScriptIdCandidates(traitReference)) {
    const candidateTraitRecord = traitMetadata.traitRecordsByScriptId.get(traitScriptIdCandidate)

    if (candidateTraitRecord) {
      return normalizeTraitMetadataRecord(candidateTraitRecord, fallbackTraitName)
    }
  }

  const nameKey = getTraitRecordNameKey(fallbackTraitName)
  const namedTraitRecord = traitMetadata.traitRecordsByName.get(nameKey)

  if (namedTraitRecord) {
    return normalizeTraitMetadataRecord(namedTraitRecord)
  }

  return {
    description: null,
    iconPath: getKnownTraitIconPath(fallbackTraitName),
    traitName: fallbackTraitName,
  }
}

function parseTraitRecordsFromArrayValue(
  value: SquirrelValue,
  traitMetadata: TraitMetadata,
): LegendsBackgroundTrait[] {
  return sortUniqueTraitRecords(
    arrayValues(value)
      .map((item) => {
        const traitConstName = resolveTraitConstNameFromValue(item)

        if (traitConstName !== null) {
          return resolveTraitRecord(traitConstName, traitMetadata)
        }

        return resolveTraitRecord(stringValue(item), traitMetadata)
      })
      .filter((traitRecord): traitRecord is LegendsBackgroundTrait => traitRecord !== null),
  )
}

function parseGuaranteedTraitRecordsFromSource(
  source: string,
  traitMetadata: TraitMetadata,
  diagnosticContext: ImporterDiagnosticContext,
): LegendsBackgroundTrait[] {
  const traitRecords: LegendsBackgroundTrait[] = []

  for (const argumentList of extractCallArgumentLists(source, '::Legends.Traits.grant')) {
    const traitArgumentSource = argumentList[1]

    if (!traitArgumentSource) {
      continue
    }

    try {
      const traitConstName = resolveTraitConstNameFromValue(
        parseSquirrelValue(traitArgumentSource).value,
      )
      const traitRecord = resolveTraitRecord(traitConstName, traitMetadata)

      if (traitRecord !== null) {
        traitRecords.push(traitRecord)
      }
    } catch (error) {
      addImporterParseWarning(
        diagnosticContext,
        'background guaranteed trait grant argument',
        traitArgumentSource,
        error,
      )
    }
  }

  return sortUniqueTraitRecords(traitRecords)
}

function parseExcludedTalentAttributeNames(value: SquirrelValue): string[] {
  return sortUniqueStrings(
    referenceArrayValue(value)
      .map((reference) => getLastPathSegment(normalizeConstReference(reference)))
      .map(
        (attributeConstName) =>
          backgroundTalentAttributeLabelsByConstName[attributeConstName] ??
          prettifyIdentifier(attributeConstName),
      ),
  )
}

function parseBackgroundBaseAttributeRanges(
  fileSource: string,
  diagnosticContext: ImporterDiagnosticContext,
): {
  defaultRanges: BackgroundAttributeRangeRecord
  femaleModifierRanges: BackgroundAttributeRangeRecord
} {
  const baseAttributeAssignment = collectTopLevelStatements(fileSource).find(
    (statement): statement is SquirrelAssignmentStatement =>
      isAssignmentStatement(statement) && statement.target === '::Legends.Backgrounds.BaseAttr',
  )
  const baseAttributeEntries = tableEntriesToMap(baseAttributeAssignment?.value)
  const defaultRanges = parseBackgroundAttributeRangesFromTableValue(
    baseAttributeEntries.get('Default'),
  )
  const femaleModifierRanges =
    parseBackgroundAttributeRangesFromTableValue(baseAttributeEntries.get('Female')) ??
    createZeroBackgroundAttributeRanges()

  if (defaultRanges === null) {
    addImporterParseWarning(
      diagnosticContext,
      'background base attribute ranges',
      fileSource,
      new Error('Missing ::Legends.Backgrounds.BaseAttr.Default'),
    )

    return {
      defaultRanges: createZeroBackgroundAttributeRanges(),
      femaleModifierRanges,
    }
  }

  return {
    defaultRanges,
    femaleModifierRanges,
  }
}

function extractReturnedBackgroundAttributeRangeRecords(
  source: string,
  localValues: LocalSquirrelValues,
  diagnosticContext: ImporterDiagnosticContext,
): BackgroundAttributeRangeRecord[] {
  const returnedAttributeRangeRecords: BackgroundAttributeRangeRecord[] = []
  const returnPattern = /\breturn\s+/g

  for (const match of source.matchAll(returnPattern)) {
    try {
      const parsedValue = parseSquirrelValue(source, match.index + match[0].length).value
      const attributeRanges = parseBackgroundAttributeRangesFromTableValue(parsedValue, localValues)

      if (attributeRanges !== null) {
        returnedAttributeRangeRecords.push(attributeRanges)
      }
    } catch (error) {
      addImporterParseWarning(
        diagnosticContext,
        'background onChangeAttributes return value',
        source.slice(match.index),
        error,
      )
    }
  }

  return returnedAttributeRangeRecords
}

function parseBackgroundAttributeRangeVariantsFromFunction(
  functionValue: SquirrelFunctionValue | null,
  diagnosticContext: ImporterDiagnosticContext,
): BackgroundAttributeRangeVariants {
  if (functionValue === null) {
    return {
      defaultRanges: null,
      femaleRanges: null,
    }
  }

  const uncommentedFunctionBody = stripSquirrelComments(functionValue.body)
  const localValues = extractLocalAssignments(uncommentedFunctionBody, diagnosticContext)
  const returnedAttributeRangeRecords = extractReturnedBackgroundAttributeRangeRecords(
    uncommentedFunctionBody,
    localValues,
    diagnosticContext,
  )

  if (returnedAttributeRangeRecords.length === 0) {
    return {
      defaultRanges: null,
      femaleRanges: null,
    }
  }

  if (
    returnedAttributeRangeRecords.length > 1 &&
    /Const\.BackgroundType\.Female/u.test(uncommentedFunctionBody)
  ) {
    return {
      defaultRanges: returnedAttributeRangeRecords[returnedAttributeRangeRecords.length - 1],
      femaleRanges: returnedAttributeRangeRecords[0],
    }
  }

  return {
    defaultRanges: returnedAttributeRangeRecords[returnedAttributeRangeRecords.length - 1],
    femaleRanges: null,
  }
}

function parseCanUseFemaleBackgroundTypeFromGenderSetting(
  setGenderFunctionValue: SquirrelFunctionValue | null,
): boolean | null {
  if (setGenderFunctionValue === null) {
    return null
  }

  const uncommentedFunctionBody = stripSquirrelComments(setGenderFunctionValue.body)

  return (
    /\baddBackgroundType\s*\(\s*(?:::|this\.)?Const\.BackgroundType\.Female\s*\)/u.test(
      uncommentedFunctionBody,
    ) ||
    /\bm\.BackgroundType\s*(?:=|\|=)[^;]*\bConst\.BackgroundType\.Female\b/u.test(
      uncommentedFunctionBody,
    )
  )
}

function addTraitMetadataRecordToMaps(
  { traitRecordsByConstName, traitRecordsByName, traitRecordsByScriptId }: TraitMetadata,
  {
    constName = null,
    scriptId = null,
    traitRecord,
  }: {
    constName?: string | null
    scriptId?: string | null
    traitRecord: TraitMetadataRecord
  },
): void {
  setMergedTraitMetadataRecord(
    traitRecordsByName,
    getTraitRecordNameKey(traitRecord.traitName),
    traitRecord,
  )
  setMergedTraitMetadataRecord(traitRecordsByScriptId, scriptId, traitRecord)

  if (constName !== null) {
    setMergedTraitMetadataRecord(traitRecordsByConstName, constName, traitRecord)
  }
}

function normalizeFallbackTraitMetadataRecord(metadataRecord: {
  description: string | null
  iconPath: string | null
  scriptId: string
  traitName: string | null
}): TraitMetadataRecord {
  const traitName =
    metadataRecord.traitName ?? prettifyIdentifier(metadataRecord.scriptId.replace(/_trait$/u, ''))

  return {
    description:
      metadataRecord.description === null ? null : cleanRichText(metadataRecord.description),
    hasExplicitName: metadataRecord.traitName !== null,
    iconPath: metadataRecord.iconPath ?? null,
    shouldOverrideName: false,
    traitName,
  }
}

function parseTraitMetadataFileEntries(
  traitFileEntries: NutFileEntry[],
  fallbackTraitMetadataRecords: Array<{
    description: string | null
    iconPath: string | null
    scriptId: string
    traitName: string | null
  }> = [],
): TraitMetadata {
  const traitRecordsByConstName = new Map<string, TraitMetadataRecord>()
  const traitRecordsByName = new Map<string, TraitMetadataRecord>()
  const traitRecordsByScriptId = new Map<string, TraitMetadataRecord>()
  const traitMetadata = {
    traitRecordsByConstName,
    traitRecordsByName,
    traitRecordsByScriptId,
  }

  for (const traitFileEntry of traitFileEntries) {
    const uncommentedFileSource = stripSquirrelComments(traitFileEntry.fileSource)
    const traitConstName = resolveTraitConstNameFromValue(
      extractAssignedValue(uncommentedFileSource, 'this.m.ID'),
    )
    const explicitTraitName = stringValue(
      extractAssignedValue(uncommentedFileSource, 'this.m.Name'),
    )
    const iconPath = stringValue(extractAssignedValue(uncommentedFileSource, 'this.m.Icon'))
    const description = stringValue(
      extractAssignedValue(uncommentedFileSource, 'this.m.Description'),
    )
    const traitScriptId = path.posix.basename(
      traitFileEntry.sourceFilePath,
      path.posix.extname(traitFileEntry.sourceFilePath),
    )
    const traitName = explicitTraitName ?? prettifyIdentifier(traitScriptId.replace(/_trait$/u, ''))

    if (explicitTraitName === null && iconPath === null && description === null) {
      continue
    }

    const traitRecord = {
      description: description === null ? null : cleanRichText(description),
      hasExplicitName: explicitTraitName !== null,
      iconPath,
      traitName,
    }

    addTraitMetadataRecordToMaps(traitMetadata, {
      constName: traitConstName,
      scriptId: traitScriptId,
      traitRecord,
    })
  }

  for (const fallbackTraitMetadataRecord of fallbackTraitMetadataRecords) {
    addTraitMetadataRecordToMaps(traitMetadata, {
      scriptId: fallbackTraitMetadataRecord.scriptId,
      traitRecord: normalizeFallbackTraitMetadataRecord(fallbackTraitMetadataRecord),
    })
  }

  return traitMetadata
}

function createBackgroundMetadataDefaults({
  backgroundTypeMetadata,
  characterBackgroundFileSource,
  diagnostics,
  resourceModifierValuesByKey,
  sourceFilePath,
}: {
  backgroundTypeMetadata: BackgroundTypeMetadata
  characterBackgroundFileSource: string
  diagnostics: ImporterDiagnosticContext['diagnostics']
  resourceModifierValuesByKey: Map<string, number[]>
  sourceFilePath: string
}): BackgroundMetadataDefaults & { modifiers: BackgroundCampResourceModifierRecord } {
  const diagnosticContext = { diagnostics, sourceFilePath }
  const uncommentedFileSource = stripSquirrelComments(characterBackgroundFileSource)
  const backgroundTypeExpressionSource = extractAssignmentExpressionSource(
    uncommentedFileSource,
    'o.m.BackgroundType',
  )
  const backgroundTypeNames = resolveBackgroundTypeNames(
    backgroundTypeExpressionSource === null
      ? ['None']
      : parseBackgroundTypeExpression(backgroundTypeExpressionSource),
    backgroundTypeMetadata,
  )
  const modifiers = parseBaseBackgroundModifiers(
    uncommentedFileSource,
    resourceModifierValuesByKey,
    diagnosticContext,
  )

  return {
    backgroundTypeNames,
    campResourceModifiers: buildBackgroundCampResourceModifiers(modifiers),
    dailyCost: null,
    excludedTalentAttributeNames: [],
    excludedTraits: [],
    excludedTraitNames: [],
    guaranteedTraits: [],
    guaranteedTraitNames: [],
    modifiers,
  }
}

function normalizeVeteranPerkLevelInterval(value: number | null): number | null {
  return value !== null && Number.isInteger(value) && value > 0 ? value : null
}

function extractSetVeteranPerksInterval(
  source: string,
  diagnosticContext: ImporterDiagnosticContext | null = null,
): number | null {
  const intervals: number[] = []

  for (const argumentList of extractCallArgumentLists(source, 'setVeteranPerks')) {
    const intervalSource = argumentList[0]

    if (!intervalSource) {
      continue
    }

    try {
      const interval = normalizeVeteranPerkLevelInterval(
        numberValue(parseSquirrelValue(intervalSource).value),
      )

      if (interval !== null) {
        intervals.push(interval)
      }
    } catch (error) {
      addImporterParseWarning(diagnosticContext, 'setVeteranPerks argument', intervalSource, error)
    }
  }

  return intervals.at(-1) ?? null
}

function parseDefaultVeteranPerkLevelInterval(
  fileSource: string,
  diagnosticContext: ImporterDiagnosticContext | null = null,
): number {
  const interval = normalizeVeteranPerkLevelInterval(
    numberValue(extractAssignedValue(fileSource, 'o.m.VeteranPerks', diagnosticContext)),
  )

  return interval ?? fallbackVeteranPerkLevelInterval
}

function extractCallArgumentLists(source: string, callee: string): string[][] {
  const argumentLists: string[][] = []
  let searchIndex = 0
  const callPrefix = `${callee}(`

  while (searchIndex < source.length) {
    const matchIndex = source.indexOf(callPrefix, searchIndex)

    if (matchIndex === -1) {
      break
    }

    const openParenthesisIndex = matchIndex + callee.length
    const parser = new SquirrelSubsetParser(source)
    const closeParenthesisIndex = parser.findMatchingBoundary('(', ')', openParenthesisIndex)
    const argumentsSource = source.slice(openParenthesisIndex + 1, closeParenthesisIndex)
    argumentLists.push(splitTopLevelCommaSeparated(argumentsSource))
    searchIndex = closeParenthesisIndex + 1
  }

  return argumentLists
}

function normalizeActorReceiver(receiver: string): string {
  return receiver.replace(/\s+/g, '')
}

function extractActorReceiverAliases(source: string): Map<string, string> {
  const aliases = new Map<string, string>()
  const aliasPatterns = [
    /\blocal\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*((?:[A-Za-z_][A-Za-z0-9_]*)(?:\s*\[[^\]]+\])?)\s*;/g,
    /\b([A-Za-z_][A-Za-z0-9_]*)\s*=\s*((?:[A-Za-z_][A-Za-z0-9_]*)(?:\s*\[[^\]]+\])?)\s*;/g,
  ]

  for (const aliasPattern of aliasPatterns) {
    for (const match of source.matchAll(aliasPattern)) {
      const aliasName = normalizeActorReceiver(match[1])
      const receiverName = normalizeActorReceiver(match[2])

      if (aliasName !== receiverName) {
        aliases.set(aliasName, receiverName)
      }
    }
  }

  return aliases
}

function resolveActorReceiverAlias(receiver: string, receiverAliases: Map<string, string>): string {
  let resolvedReceiver = normalizeActorReceiver(receiver)
  const visitedReceivers = new Set<string>()

  while (receiverAliases.has(resolvedReceiver) && !visitedReceivers.has(resolvedReceiver)) {
    visitedReceivers.add(resolvedReceiver)
    resolvedReceiver = receiverAliases.get(resolvedReceiver) ?? resolvedReceiver
  }

  return resolvedReceiver
}

function extractReceiverMethodCallArgumentLists(
  source: string,
  methodName: string,
  diagnosticContext: ImporterDiagnosticContext | null = null,
): Array<{ argumentList: string[]; receiver: string }> {
  const calls: Array<{ argumentList: string[]; receiver: string }> = []
  const pattern = new RegExp(
    `((?:[A-Za-z_][A-Za-z0-9_]*)(?:\\s*\\[[^\\]]+\\])?)\\s*\\.\\s*${escapeForRegularExpression(
      methodName,
    )}\\s*\\(`,
    'g',
  )

  for (const match of source.matchAll(pattern)) {
    const openParenthesisIndex = match.index + match[0].lastIndexOf('(')

    try {
      const closeParenthesisIndex = new SquirrelSubsetParser(source).findMatchingBoundary(
        '(',
        ')',
        openParenthesisIndex,
      )
      const argumentsSource = source.slice(openParenthesisIndex + 1, closeParenthesisIndex)

      calls.push({
        argumentList: splitTopLevelCommaSeparated(argumentsSource),
        receiver: normalizeActorReceiver(match[1]),
      })
    } catch (error) {
      addImporterParseWarning(
        diagnosticContext,
        `${methodName} receiver method call`,
        source.slice(match.index),
        error,
      )
    }
  }

  return calls
}

function collectPlayerTraitReceivers(source: string): Set<string> {
  const receivers = new Set<string>()

  for (const argumentList of extractCallArgumentLists(source, '::Legends.Traits.grant')) {
    const receiver = argumentList[0]
    const trait = argumentList[1]

    if (receiver && trait && /(?:^|\.)Player\b/.test(trait)) {
      receivers.add(normalizeActorReceiver(receiver))
    }
  }

  return receivers
}

function collectPlayerCharacterFlagReceivers(source: string): Set<string> {
  const receivers = new Set<string>()
  const pattern =
    /((?:[A-Za-z_][A-Za-z0-9_]*)(?:\s*\[[^\]]+\])?)\s*\.\s*getFlags\s*\(\s*\)\s*\.\s*set\s*\(\s*"IsPlayerCharacter"\s*,\s*true\s*\)/g

  for (const match of source.matchAll(pattern)) {
    receivers.add(normalizeActorReceiver(match[1]))
  }

  return receivers
}

function extractLocalAssignments(
  source: string,
  diagnosticContext: ImporterDiagnosticContext | null = null,
): LocalSquirrelValues {
  const assignments: LocalSquirrelValues = new Map()
  const pattern = /\blocal\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*/g

  for (const match of source.matchAll(pattern)) {
    try {
      const parsedValue = parseSquirrelValue(source, match.index + match[0].length).value
      assignments.set(match[1], parsedValue)
    } catch (error) {
      addImporterParseWarning(
        diagnosticContext,
        `local ${match[1]} assignment`,
        source.slice(match.index),
        error,
      )
      continue
    }
  }

  return assignments
}

function parseCategoryOrderFile(fileSource: string): string[] {
  const statements = collectTopLevelStatements(fileSource)
  const orderAssignment = statements.find(
    (statement): statement is SquirrelAssignmentStatement =>
      isAssignmentStatement(statement) &&
      statement.target === '::Legends.Perks.PerkGroupCategoriesOrder',
  )

  if (!orderAssignment) {
    return defaultCategoryOrder
  }

  const categoryNames = stringArrayValue(orderAssignment.value)
  return categoryNames.length > 0 ? categoryNames : defaultCategoryOrder
}

function parsePerkStringsFile(fileSource: string): PerkStringData {
  const descriptionsByConstName = new Map<string, string>()
  const namesByConstName = new Map<string, string>()

  for (const statement of collectTopLevelStatements(fileSource)) {
    if (statement.type !== 'assignment') {
      continue
    }

    const assignedValue = stringValue(statement.value)

    if (assignedValue === null) {
      continue
    }

    if (statement.target.startsWith('::Const.Strings.PerkName.')) {
      namesByConstName.set(getLastPathSegment(statement.target), assignedValue)
      continue
    }

    if (statement.target.startsWith('::Const.Strings.PerkDescription.')) {
      descriptionsByConstName.set(getLastPathSegment(statement.target), assignedValue)
    }
  }

  return {
    descriptionsByConstName,
    namesByConstName,
  }
}

function mergePerkStringData(perkStringDataEntries: PerkStringData[]): PerkStringData {
  const descriptionsByConstName = new Map<string, string>()
  const namesByConstName = new Map<string, string>()

  for (const perkStringData of perkStringDataEntries) {
    for (const [constName, perkName] of perkStringData.namesByConstName.entries()) {
      namesByConstName.set(constName, perkName)
    }

    for (const [constName, perkDescription] of perkStringData.descriptionsByConstName.entries()) {
      descriptionsByConstName.set(constName, perkDescription)
    }
  }

  return {
    descriptionsByConstName,
    namesByConstName,
  }
}

function parsePerkDefinitionsFile(
  fileSource: string,
  sourceFilePath: string,
): Map<string, PerkDefinition> {
  const perkDefinitions = new Map<string, PerkDefinition>()

  for (const statement of collectTopLevelStatements(fileSource)) {
    if (statement.type !== 'expression') {
      continue
    }

    const expression = unwrapCall(statement.expression)

    if (expression === null || expression.callee !== 'perkDefObjects.push') {
      continue
    }

    const tableEntries = tableEntriesToMap(expression.arguments[0])
    const constName = stringValue(tableEntries.get('Const'))
    const identifier = stringValue(tableEntries.get('ID'))
    const scriptPath = stringValue(tableEntries.get('Script'))
    const iconPath = stringValue(tableEntries.get('Icon'))
    const disabledIconPath = stringValue(tableEntries.get('IconDisabled'))
    const nameConstReference = referenceValue(tableEntries.get('Name'))
    const descriptionConstReference = referenceValue(tableEntries.get('Tooltip'))

    if (constName === null || identifier === null) {
      continue
    }

    perkDefinitions.set(constName, {
      constName,
      descriptionConstName: descriptionConstReference
        ? getLastPathSegment(descriptionConstReference)
        : null,
      disabledIconPath,
      iconPath,
      identifier,
      nameConstName: nameConstReference ? getLastPathSegment(nameConstReference) : null,
      scriptPath,
      sourceFilePath,
    })
  }

  return perkDefinitions
}

function parsePerkGroupConfigFile(
  fileSource: string,
  sourceFilePath: string,
): {
  categoryDefinitions: Array<{
    categoryName: string
    perkGroupConstNames: string[]
    sourceFilePath: string
  }>
  perkGroupDefinitions: PerkGroupDefinition[]
} {
  const localValues: LocalSquirrelValues = new Map()
  const categoryDefinitions: Array<{
    categoryName: string
    perkGroupConstNames: string[]
    sourceFilePath: string
  }> = []
  const perkGroupDefinitions: PerkGroupDefinition[] = []

  for (const statement of collectTopLevelStatements(fileSource)) {
    if (statement.type === 'local-assignment') {
      localValues.set(statement.target, statement.value)
      continue
    }

    if (statement.type !== 'assignment' || !statement.target.startsWith('::Const.Perks.')) {
      continue
    }

    const tableEntries = tableEntriesToMap(statement.value, localValues)
    const perkGroupProperty = tableEntries.get('Tree')

    if (!perkGroupProperty) {
      continue
    }

    if (tableEntries.has('GroupsCategory')) {
      categoryDefinitions.push({
        categoryName: stringValue(tableEntries.get('GroupsCategory'), localValues) ?? 'Other',
        sourceFilePath,
        perkGroupConstNames: referenceArrayValue(perkGroupProperty, localValues).map(
          getLastPathSegment,
        ),
      })
      continue
    }

    const constName = getLastPathSegment(statement.target)
    const perkGroupRows = arrayValues(perkGroupProperty, localValues).map((row) =>
      referenceArrayValue(row, localValues).map(getLastPathSegment),
    )

    perkGroupDefinitions.push({
      categoryName: stringValue(tableEntries.get('Category'), localValues),
      constName,
      descriptionLines: stringArrayValue(tableEntries.get('Descriptions'), localValues).map(
        cleanRichText,
      ),
      iconPath: stringValue(tableEntries.get('Icon'), localValues),
      id: stringValue(tableEntries.get('ID'), localValues) ?? constName,
      name: stringValue(tableEntries.get('Name'), localValues) ?? prettifyIdentifier(constName),
      perkConstNamesByTier: perkGroupRows,
      sourceFilePath,
    })
  }

  return {
    categoryDefinitions,
    perkGroupDefinitions,
  }
}

function parseEntityNamesFile(fileSource: string): Map<string, string> {
  const entityNamesByConstName = new Map<string, string>()

  for (const statement of collectTopLevelStatements(fileSource)) {
    if (statement.type !== 'assignment' || !statement.target.startsWith('::Const.EntityType.')) {
      continue
    }

    const callValue = unwrapCall(statement.value)

    if (callValue === null || callValue.callee !== '::Const.EntityType.addNew') {
      continue
    }

    const constName = getLastPathSegment(statement.target)
    const entityName = stringValue(callValue.arguments[1])

    if (entityName !== null) {
      entityNamesByConstName.set(constName, cleanRichText(entityName))
    }
  }

  return entityNamesByConstName
}

function parseFavouredEnemyConfigFile(fileSource: string): {
  killsPerPercentBonusByEntityConstName: Map<string, number>
  targetConstNamesByPerkConstName: Map<string, string[]>
} {
  const targetConstNamesByPerkConstName = new Map<string, string[]>()
  const killsPerPercentBonusByEntityConstName = new Map<string, number>()

  for (const statement of collectTopLevelStatements(fileSource)) {
    if (
      statement.type === 'assignment' &&
      statement.target.startsWith('::Const.LegendMod.Favorite')
    ) {
      const arrayName = getLastPathSegment(statement.target)
      const perkConstName = favouredEnemyPerkConstByArrayName[arrayName]

      if (!perkConstName) {
        continue
      }

      targetConstNamesByPerkConstName.set(
        perkConstName,
        referenceArrayValue(statement.value).map(getLastPathSegment),
      )
      continue
    }

    if (
      statement.type !== 'assignment' ||
      statement.target !== '::Const.LegendMod.GetFavoriteEnemyValue'
    ) {
      continue
    }

    const functionLiteral = statement.value

    if (
      typeof functionLiteral !== 'object' ||
      functionLiteral === null ||
      functionLiteral.type !== 'function'
    ) {
      continue
    }

    const casePattern =
      /case\s+::Const\.EntityType\.([A-Za-z0-9_]+)\s*:\s*return\s+([+-]?(?:\d+\.\d+|\d+|\.?\d+));/g

    for (const match of functionLiteral.body.matchAll(casePattern)) {
      killsPerPercentBonusByEntityConstName.set(match[1], Number(match[2]))
    }
  }

  return {
    killsPerPercentBonusByEntityConstName,
    targetConstNamesByPerkConstName,
  }
}

function readFunctionAssignmentBody(
  wrapperStatements: SquirrelStatement[],
  assignmentTarget: string,
): SquirrelFunctionValue | null {
  const assignment = wrapperStatements.find(
    (statement): statement is SquirrelAssignmentStatement =>
      isAssignmentStatement(statement) &&
      statement.target === assignmentTarget &&
      isSquirrelFunctionValue(statement.value),
  )

  return isSquirrelFunctionValue(assignment?.value) ? assignment.value : null
}

function extractHookWrapperFunction(fileSource: string): SquirrelFunctionValue | null {
  const wrapperStatement = collectTopLevelStatements(fileSource).find((statement) => {
    if (!isExpressionStatement(statement)) {
      return false
    }

    const callValue = unwrapCall(statement.expression)

    return (
      callValue?.callee.startsWith('::mods_hook') === true &&
      isSquirrelFunctionValue(callValue.arguments[1])
    )
  })

  if (!wrapperStatement || !isExpressionStatement(wrapperStatement)) {
    return null
  }

  const wrapperFunction = unwrapCall(wrapperStatement.expression)?.arguments[1]
  return isSquirrelFunctionValue(wrapperFunction) ? wrapperFunction : null
}

function resolveMinimumValue(
  backgroundMinimums: BackgroundMinimums,
  categoryName: LegendsDynamicBackgroundCategoryName,
): number | null {
  const key = dynamicBackgroundCategoryMinimumKeys[categoryName]
  return key ? (backgroundMinimums[key] ?? null) : null
}

function resolveChanceValue(
  backgroundMinimums: BackgroundMinimums,
  categoryName: LegendsDynamicBackgroundCategoryName,
): number | null {
  const key =
    categoryName in dynamicBackgroundCategoryChanceKeys
      ? dynamicBackgroundCategoryChanceKeys[
          categoryName as keyof typeof dynamicBackgroundCategoryChanceKeys
        ]
      : null
  return key ? (backgroundMinimums[key] ?? null) : null
}

function cloneMinimums(minimums: BackgroundMinimums): BackgroundMinimums {
  return Object.fromEntries(Object.entries(minimums).map(([key, value]) => [key, value]))
}

function buildMinimumsObject(tableValue: SquirrelValue): BackgroundMinimums {
  const entries = tableEntriesToMap(tableValue)
  const minimums: BackgroundMinimums = {}

  for (const [key, value] of entries.entries()) {
    const numericValue = numberValue(value)

    if (numericValue !== null) {
      minimums[key] = numericValue
    }
  }

  return minimums
}

function createDefaultBackgroundDefinition(
  backgroundScriptId: string,
  baseDynamicTreeValue: SquirrelValue,
  baseMinimums: BackgroundMinimums,
  backgroundMetadataDefaults: BackgroundMetadataDefaults & {
    modifiers: BackgroundCampResourceModifierRecord
  },
  defaultVeteranPerkLevelInterval: number,
  sourceFilePath: string,
): ImportedBackgroundDefinition {
  return {
    backgroundIdentifier: null,
    attributeModifierRanges: createZeroBackgroundAttributeRanges(),
    backgroundName: null,
    backgroundScriptId,
    canUseFemaleBackgroundTypeFromGenderSetting: false,
    dynamicTreeValue: baseDynamicTreeValue,
    femaleAttributeModifierRanges: null,
    iconPath: null,
    ...cloneBackgroundDefinitionMetadata(backgroundMetadataDefaults),
    minimums: cloneMinimums(baseMinimums),
    sourceFilePath,
    veteranPerkLevelInterval: defaultVeteranPerkLevelInterval,
  }
}

function applyBackgroundCreateBody({
  attributeRangeVariants,
  backgroundTypeMetadata,
  backgroundScriptId,
  baseBackgroundDefinition,
  canUseFemaleBackgroundTypeFromGenderSetting,
  createBody,
  diagnostics,
  metadataSource,
  preferScriptIdWhenIdentifierIsInherited,
  resourceModifierValuesByKey,
  sourceFilePath,
  traitMetadata,
}: {
  attributeRangeVariants?: BackgroundAttributeRangeVariants | null
  backgroundScriptId: string
  backgroundTypeMetadata: BackgroundTypeMetadata
  baseBackgroundDefinition: ImportedBackgroundDefinition
  canUseFemaleBackgroundTypeFromGenderSetting?: boolean | null
  createBody: string
  diagnostics: ImporterDiagnosticContext['diagnostics']
  metadataSource?: string | null
  preferScriptIdWhenIdentifierIsInherited: boolean
  resourceModifierValuesByKey: Map<string, number[]>
  sourceFilePath: string
  traitMetadata: TraitMetadata
}): ImportedBackgroundDefinition {
  const diagnosticContext = { diagnostics, sourceFilePath }
  const uncommentedCreateBody = stripSquirrelComments(createBody)
  const uncommentedMetadataSource = stripSquirrelComments(metadataSource ?? createBody)
  const explicitBackgroundIdentifier = stringValue(
    extractAssignedValue(uncommentedCreateBody, 'this.m.ID', diagnosticContext),
  )
  const backgroundName =
    stringValue(extractAssignedValue(uncommentedCreateBody, 'this.m.Name', diagnosticContext)) ??
    baseBackgroundDefinition.backgroundName
  const iconPath =
    stringValue(extractAssignedValue(uncommentedCreateBody, 'this.m.Icon', diagnosticContext)) ??
    baseBackgroundDefinition.iconPath
  const dynamicTreeValue =
    extractAssignedValue(uncommentedCreateBody, 'this.m.PerkTreeDynamic', diagnosticContext) ??
    baseBackgroundDefinition.dynamicTreeValue
  const dailyCost =
    numberValue(
      extractAssignedValue(uncommentedCreateBody, 'this.m.DailyCost', diagnosticContext),
    ) ?? baseBackgroundDefinition.dailyCost
  const backgroundTypeNames = parseBackgroundTypeNamesFromCreateBody({
    backgroundTypeMetadata,
    baseBackgroundTypeNames: baseBackgroundDefinition.backgroundTypeNames,
    createBody: uncommentedCreateBody,
  })
  const modifiers = applyCreateBodyModifierOperations({
    createBody: uncommentedCreateBody,
    diagnostics,
    modifiers: baseBackgroundDefinition.modifiers,
    resourceModifierValuesByKey,
    sourceFilePath,
  })
  const excludedTraitValue = extractAssignedValue(
    uncommentedCreateBody,
    'this.m.Excluded',
    diagnosticContext,
  )
  const guaranteedTraitValue = extractAssignedValue(
    uncommentedCreateBody,
    'this.m.IsGuaranteed',
    diagnosticContext,
  )
  const excludedTalentAttributeValue = extractAssignedValue(
    uncommentedCreateBody,
    'this.m.ExcludedTalents',
    diagnosticContext,
  )
  const excludedTraits =
    excludedTraitValue === null
      ? baseBackgroundDefinition.excludedTraits
      : parseTraitRecordsFromArrayValue(excludedTraitValue, traitMetadata)
  const excludedTraitNames = excludedTraits.map((trait) => trait.traitName)
  const explicitGuaranteedTraits =
    guaranteedTraitValue === null
      ? []
      : parseTraitRecordsFromArrayValue(guaranteedTraitValue, traitMetadata)
  const staticGuaranteedTraits = parseGuaranteedTraitRecordsFromSource(
    uncommentedMetadataSource,
    traitMetadata,
    diagnosticContext,
  )
  const guaranteedTraits = sortUniqueTraitRecords([
    ...baseBackgroundDefinition.guaranteedTraits,
    ...explicitGuaranteedTraits,
    ...staticGuaranteedTraits,
  ])
  const guaranteedTraitNames = guaranteedTraits.map((trait) => trait.traitName)
  const excludedTalentAttributeNames =
    excludedTalentAttributeValue === null
      ? baseBackgroundDefinition.excludedTalentAttributeNames
      : parseExcludedTalentAttributeNames(excludedTalentAttributeValue)
  const attributeModifierRanges =
    attributeRangeVariants?.defaultRanges ??
    cloneBackgroundAttributeRanges(baseBackgroundDefinition.attributeModifierRanges)
  const femaleAttributeModifierRanges =
    attributeRangeVariants?.femaleRanges ??
    (baseBackgroundDefinition.femaleAttributeModifierRanges === null
      ? null
      : cloneBackgroundAttributeRanges(baseBackgroundDefinition.femaleAttributeModifierRanges))
  const minimums = cloneMinimums(baseBackgroundDefinition.minimums)

  for (const operation of extractNumericOperations(
    uncommentedCreateBody,
    'this.m.PerkTreeDynamicMins.',
  )) {
    if (!(operation.key in minimums)) {
      minimums[operation.key] = 0
    }

    if (operation.operator === '=') {
      minimums[operation.key] = operation.value
      continue
    }

    if (operation.operator === '+=') {
      minimums[operation.key] += operation.value
      continue
    }

    if (operation.operator === '-=') {
      minimums[operation.key] -= operation.value
    }
  }

  return {
    backgroundIdentifier:
      explicitBackgroundIdentifier ??
      (preferScriptIdWhenIdentifierIsInherited
        ? backgroundScriptId
        : (baseBackgroundDefinition.backgroundIdentifier ?? backgroundScriptId)),
    attributeModifierRanges,
    backgroundName,
    backgroundScriptId,
    backgroundTypeNames,
    canUseFemaleBackgroundTypeFromGenderSetting:
      canUseFemaleBackgroundTypeFromGenderSetting ??
      baseBackgroundDefinition.canUseFemaleBackgroundTypeFromGenderSetting,
    campResourceModifiers: buildBackgroundCampResourceModifiers(modifiers),
    dailyCost,
    dynamicTreeValue,
    excludedTalentAttributeNames,
    excludedTraits,
    excludedTraitNames,
    femaleAttributeModifierRanges,
    guaranteedTraits,
    guaranteedTraitNames,
    iconPath,
    minimums,
    modifiers,
    sourceFilePath,
    veteranPerkLevelInterval: baseBackgroundDefinition.veteranPerkLevelInterval,
  }
}

function parseBackgroundHookFile(
  fileSource: string,
  sourceFilePath: string,
  baseDynamicTreeValue: SquirrelValue,
  baseMinimums: BackgroundMinimums,
  backgroundMetadataDefaults: BackgroundMetadataDefaults & {
    modifiers: BackgroundCampResourceModifierRecord
  },
  backgroundTypeMetadata: BackgroundTypeMetadata,
  defaultVeteranPerkLevelInterval: number,
  diagnostics: ImporterDiagnosticContext['diagnostics'],
  resourceModifierValuesByKey: Map<string, number[]>,
  traitMetadata: TraitMetadata,
): ImportedBackgroundDefinition | null {
  const wrapperFunction = extractHookWrapperFunction(fileSource)

  if (wrapperFunction === null) {
    return null
  }

  const wrapperStatements = collectTopLevelStatements(wrapperFunction.body)
  const createFunctionLiteral = readFunctionAssignmentBody(wrapperStatements, 'o.create')
  const setGenderFunctionLiteral = readFunctionAssignmentBody(wrapperStatements, 'o.setGender')
  const attributeRangeVariants = parseBackgroundAttributeRangeVariantsFromFunction(
    readFunctionAssignmentBody(wrapperStatements, 'o.onChangeAttributes'),
    { diagnostics, sourceFilePath },
  )

  if (createFunctionLiteral === null) {
    return null
  }

  const backgroundDefinition = applyBackgroundCreateBody({
    attributeRangeVariants,
    backgroundTypeMetadata,
    backgroundScriptId: getBackgroundScriptIdFromSourceFilePath(sourceFilePath),
    baseBackgroundDefinition: createDefaultBackgroundDefinition(
      getBackgroundScriptIdFromSourceFilePath(sourceFilePath),
      baseDynamicTreeValue,
      baseMinimums,
      backgroundMetadataDefaults,
      defaultVeteranPerkLevelInterval,
      sourceFilePath,
    ),
    canUseFemaleBackgroundTypeFromGenderSetting:
      parseCanUseFemaleBackgroundTypeFromGenderSetting(setGenderFunctionLiteral),
    createBody: createFunctionLiteral.body,
    diagnostics,
    metadataSource: wrapperFunction.body,
    preferScriptIdWhenIdentifierIsInherited: false,
    resourceModifierValuesByKey,
    sourceFilePath,
    traitMetadata,
  })

  if (
    backgroundDefinition.backgroundIdentifier === null ||
    backgroundDefinition.backgroundName === null
  ) {
    return null
  }

  return {
    ...backgroundDefinition,
    veteranPerkLevelInterval:
      extractSetVeteranPerksInterval(stripSquirrelComments(fileSource), {
        diagnostics,
        sourceFilePath,
      }) ?? backgroundDefinition.veteranPerkLevelInterval,
  }
}

function parseBackgroundScriptFileDefinition(
  fileSource: string,
  sourceFilePath: string,
  diagnostics: ImporterDiagnosticContext['diagnostics'],
): RawScriptBackgroundDefinition | null {
  const backgroundScriptId = getBackgroundScriptIdFromSourceFilePath(sourceFilePath)
  const rootAssignment = collectTopLevelStatements(fileSource).find(
    (statement): statement is SquirrelAssignmentStatement =>
      isAssignmentStatement(statement) &&
      statement.target.startsWith('this.') &&
      getLastPathSegment(statement.target) === backgroundScriptId &&
      unwrapCall(statement.value)?.callee === 'this.inherit',
  )

  if (!rootAssignment) {
    return null
  }

  const inheritCall = unwrapCall(rootAssignment.value)
  const inheritedBackgroundScriptPath = stringValue(inheritCall?.arguments[0] ?? null)
  const backgroundDefinitionTable = inheritCall
    ? unwrapTable(inheritCall.arguments[1] ?? null)
    : null

  if (
    !inheritedBackgroundScriptPath?.startsWith('scripts/skills/backgrounds/') ||
    backgroundDefinitionTable === null
  ) {
    return null
  }

  const createFunctionEntry = backgroundDefinitionTable.entries.find(
    (entry): entry is SquirrelTableFunctionEntry =>
      entry.type === 'function-entry' && entry.name === 'create',
  )
  const attributeFunctionEntry =
    backgroundDefinitionTable.entries.find(
      (entry): entry is SquirrelTableFunctionEntry =>
        entry.type === 'function-entry' && entry.name === 'onChangeAttributes',
    ) ?? null
  const setGenderFunctionEntry =
    backgroundDefinitionTable.entries.find(
      (entry): entry is SquirrelTableFunctionEntry =>
        entry.type === 'function-entry' && entry.name === 'setGender',
    ) ?? null

  if (!createFunctionEntry) {
    return null
  }

  const attributeRangeVariants = parseBackgroundAttributeRangeVariantsFromFunction(
    attributeFunctionEntry === null
      ? null
      : {
          body: attributeFunctionEntry.body,
          name: attributeFunctionEntry.name,
          parameters: attributeFunctionEntry.parameters,
          source: attributeFunctionEntry.body,
          type: 'function',
        },
    { diagnostics, sourceFilePath },
  )

  return {
    attributeModifierRanges: attributeRangeVariants.defaultRanges,
    backgroundScriptId,
    canUseFemaleBackgroundTypeFromGenderSetting: parseCanUseFemaleBackgroundTypeFromGenderSetting(
      setGenderFunctionEntry === null
        ? null
        : {
            body: setGenderFunctionEntry.body,
            name: setGenderFunctionEntry.name,
            parameters: setGenderFunctionEntry.parameters,
            source: setGenderFunctionEntry.body,
            type: 'function',
          },
    ),
    createBody: createFunctionEntry.body,
    femaleAttributeModifierRanges: attributeRangeVariants.femaleRanges,
    metadataSource: fileSource,
    parentBackgroundScriptId: path.posix.basename(inheritedBackgroundScriptPath),
    sourceFilePath,
    veteranPerkLevelInterval: extractSetVeteranPerksInterval(stripSquirrelComments(fileSource)),
  }
}

function resolveScriptBackgroundDefinitions(
  rawBackgroundDefinitionsByScriptId: Map<string, RawScriptBackgroundDefinition>,
  baseDynamicTreeValue: SquirrelValue,
  baseMinimums: BackgroundMinimums,
  backgroundMetadataDefaults: BackgroundMetadataDefaults & {
    modifiers: BackgroundCampResourceModifierRecord
  },
  backgroundTypeMetadata: BackgroundTypeMetadata,
  defaultVeteranPerkLevelInterval: number,
  diagnostics: ImporterDiagnosticContext['diagnostics'],
  resourceModifierValuesByKey: Map<string, number[]>,
  traitMetadata: TraitMetadata,
): Map<string, ImportedBackgroundDefinition> {
  const resolvedBackgroundDefinitionsByScriptId = new Map<string, ImportedBackgroundDefinition>()

  function resolveBackground(
    backgroundScriptId: string,
    resolutionPath = new Set<string>(),
  ): ImportedBackgroundDefinition | null {
    if (resolvedBackgroundDefinitionsByScriptId.has(backgroundScriptId)) {
      return resolvedBackgroundDefinitionsByScriptId.get(backgroundScriptId) ?? null
    }

    const rawBackgroundDefinition = rawBackgroundDefinitionsByScriptId.get(backgroundScriptId)

    if (!rawBackgroundDefinition || resolutionPath.has(backgroundScriptId)) {
      return null
    }

    const nextResolutionPath = new Set(resolutionPath)
    nextResolutionPath.add(backgroundScriptId)

    const parentBackgroundDefinition =
      rawBackgroundDefinition.parentBackgroundScriptId === 'character_background'
        ? null
        : resolveBackground(rawBackgroundDefinition.parentBackgroundScriptId, nextResolutionPath)

    const baseBackgroundDefinition = parentBackgroundDefinition
      ? {
          ...parentBackgroundDefinition,
          attributeModifierRanges: cloneBackgroundAttributeRanges(
            parentBackgroundDefinition.attributeModifierRanges,
          ),
          backgroundScriptId,
          canUseFemaleBackgroundTypeFromGenderSetting:
            parentBackgroundDefinition.canUseFemaleBackgroundTypeFromGenderSetting,
          femaleAttributeModifierRanges:
            parentBackgroundDefinition.femaleAttributeModifierRanges === null
              ? null
              : cloneBackgroundAttributeRanges(
                  parentBackgroundDefinition.femaleAttributeModifierRanges,
                ),
          ...cloneBackgroundDefinitionMetadata(parentBackgroundDefinition),
          minimums: cloneMinimums(parentBackgroundDefinition.minimums),
          sourceFilePath: rawBackgroundDefinition.sourceFilePath,
        }
      : createDefaultBackgroundDefinition(
          backgroundScriptId,
          baseDynamicTreeValue,
          baseMinimums,
          backgroundMetadataDefaults,
          defaultVeteranPerkLevelInterval,
          rawBackgroundDefinition.sourceFilePath,
        )

    const resolvedBackgroundDefinition = applyBackgroundCreateBody({
      attributeRangeVariants: {
        defaultRanges: rawBackgroundDefinition.attributeModifierRanges,
        femaleRanges: rawBackgroundDefinition.femaleAttributeModifierRanges,
      },
      backgroundTypeMetadata,
      backgroundScriptId,
      baseBackgroundDefinition,
      canUseFemaleBackgroundTypeFromGenderSetting:
        rawBackgroundDefinition.canUseFemaleBackgroundTypeFromGenderSetting,
      createBody: rawBackgroundDefinition.createBody,
      diagnostics,
      metadataSource: rawBackgroundDefinition.metadataSource,
      preferScriptIdWhenIdentifierIsInherited:
        parentBackgroundDefinition !== null &&
        rawBackgroundDefinition.parentBackgroundScriptId !== backgroundScriptId,
      resourceModifierValuesByKey,
      sourceFilePath: rawBackgroundDefinition.sourceFilePath,
      traitMetadata,
    })

    if (resolvedBackgroundDefinition.backgroundName === null) {
      return null
    }

    const resolvedBackgroundDefinitionWithVeteranPerks = {
      ...resolvedBackgroundDefinition,
      veteranPerkLevelInterval:
        rawBackgroundDefinition.veteranPerkLevelInterval ??
        resolvedBackgroundDefinition.veteranPerkLevelInterval,
    }

    resolvedBackgroundDefinitionsByScriptId.set(
      backgroundScriptId,
      resolvedBackgroundDefinitionWithVeteranPerks,
    )
    return resolvedBackgroundDefinitionWithVeteranPerks
  }

  for (const backgroundScriptId of rawBackgroundDefinitionsByScriptId.keys()) {
    resolveBackground(backgroundScriptId)
  }

  return resolvedBackgroundDefinitionsByScriptId
}

function parseBackgroundFitRulesFile(
  fileSource: string,
  perkGroupDefinitions: Map<string, PerkGroupDefinition>,
  diagnosticContext: ImporterDiagnosticContext | null = null,
): BackgroundFitRules {
  const dynamicPerkTreeAssignment = collectTopLevelStatements(fileSource).find(
    (statement): statement is SquirrelAssignmentStatement =>
      isAssignmentStatement(statement) &&
      statement.target === '::Const.Perks.GetDynamicPerkTree' &&
      isSquirrelFunctionValue(statement.value),
  )

  if (!dynamicPerkTreeAssignment || !isSquirrelFunctionValue(dynamicPerkTreeAssignment.value)) {
    return {
      classWeaponDependencies: [],
    }
  }

  const uncommentedDynamicPerkTreeBody = stripSquirrelComments(dynamicPerkTreeAssignment.value.body)
  const localAssignments = extractLocalAssignments(
    uncommentedDynamicPerkTreeBody,
    diagnosticContext,
  )
  const weaponClassMapValue = localAssignments.get('weaponClassMap')

  if (!weaponClassMapValue) {
    return {
      classWeaponDependencies: [],
    }
  }

  return {
    classWeaponDependencies: arrayValues(weaponClassMapValue)
      .map((dependencyPairValue) =>
        referenceArrayValue(dependencyPairValue).map(getLastPathSegment),
      )
      .flatMap((dependencyPair) => {
        const [classTreeConstName, weaponTreeConstName] = dependencyPair
        const classTreeDefinition =
          classTreeConstName === undefined
            ? undefined
            : perkGroupDefinitions.get(classTreeConstName)
        const weaponTreeDefinition =
          weaponTreeConstName === undefined
            ? undefined
            : perkGroupDefinitions.get(weaponTreeConstName)

        if (!classTreeDefinition || !weaponTreeDefinition) {
          return []
        }

        return [
          {
            classPerkGroupId: classTreeDefinition.id,
            weaponPerkGroupId: weaponTreeDefinition.id,
          },
        ]
      })
      .filter(
        (dependency, index, dependencies) =>
          dependencies.findIndex(
            (candidate) =>
              candidate.classPerkGroupId === dependency.classPerkGroupId &&
              candidate.weaponPerkGroupId === dependency.weaponPerkGroupId,
          ) === index,
      )
      .toSorted(
        (leftDependency, rightDependency) =>
          leftDependency.classPerkGroupId.localeCompare(rightDependency.classPerkGroupId) ||
          leftDependency.weaponPerkGroupId.localeCompare(rightDependency.weaponPerkGroupId),
      ),
  }
}

function buildBackgroundFitBackgrounds(
  backgrounds: ImportedBackgroundDefinition[],
  perkGroupDefinitions: Map<string, PerkGroupDefinition>,
  baseAttributeRanges: BackgroundAttributeRangeRecord,
  femaleBaseAttributeModifierRanges: BackgroundAttributeRangeRecord,
): LegendsBackgroundFitBackgroundDefinition[] {
  return backgrounds
    .filter(hasResolvedBackgroundIdentity)
    .map((background) => {
      const dynamicTreeEntries = tableEntriesToMap(background.dynamicTreeValue)

      return {
        backgroundId: background.backgroundIdentifier,
        backgroundName: background.backgroundName,
        backgroundTypeNames: background.backgroundTypeNames,
        categories: Object.fromEntries(
          dynamicBackgroundCategoryNames.map((categoryName) => {
            const perkGroupValue = dynamicTreeEntries.get(categoryName)

            return [
              categoryName,
              {
                chance: resolveChanceValue(background.minimums, categoryName),
                minimumPerkGroups: resolveMinimumValue(background.minimums, categoryName),
                perkGroupIds: [
                  ...new Set(
                    referenceArrayValue(perkGroupValue)
                      .map(getLastPathSegment)
                      .flatMap((perkGroupConstName) => {
                        const perkGroupDefinition = perkGroupDefinitions.get(perkGroupConstName)
                        return perkGroupDefinition ? [perkGroupDefinition.id] : []
                      }),
                  ),
                ],
              },
            ]
          }),
        ),
        campResourceModifiers: background.campResourceModifiers,
        dailyCost: background.dailyCost,
        excludedTalentAttributeNames: background.excludedTalentAttributeNames,
        excludedTraits: background.excludedTraits,
        excludedTraitNames: background.excludedTraitNames,
        guaranteedTraits: background.guaranteedTraits,
        guaranteedTraitNames: background.guaranteedTraitNames,
        iconPath: background.iconPath,
        sourceFilePath: background.sourceFilePath,
        startingAttributeRanges: buildBackgroundStartingAttributeRanges({
          background,
          baseAttributeRanges,
          femaleBaseAttributeModifierRanges,
        }),
        veteranPerkLevelInterval: background.veteranPerkLevelInterval,
      }
    })
    .toSorted(
      (leftBackground, rightBackground) =>
        leftBackground.backgroundName.localeCompare(rightBackground.backgroundName) ||
        leftBackground.backgroundId.localeCompare(rightBackground.backgroundId) ||
        leftBackground.sourceFilePath.localeCompare(rightBackground.sourceFilePath) ||
        dynamicBackgroundCategoryNames.reduce((difference, categoryName) => {
          if (difference !== 0) {
            return difference
          }

          const leftCategory = leftBackground.categories[categoryName]
          const rightCategory = rightBackground.categories[categoryName]

          return (
            (leftCategory?.minimumPerkGroups ?? Number.NEGATIVE_INFINITY) -
              (rightCategory?.minimumPerkGroups ?? Number.NEGATIVE_INFINITY) ||
            (leftCategory?.chance ?? Number.NEGATIVE_INFINITY) -
              (rightCategory?.chance ?? Number.NEGATIVE_INFINITY) ||
            (leftCategory?.perkGroupIds.join('::') ?? '').localeCompare(
              rightCategory?.perkGroupIds.join('::') ?? '',
            )
          )
        }, 0),
    )
}

function setBackgroundScriptIdsByReference(
  backgroundScriptIdsByReference: Map<string, string[]>,
  reference: string,
  backgroundScriptIds: string[],
): void {
  backgroundScriptIdsByReference.set(normalizeConstReference(reference), backgroundScriptIds)
}

function parseCharacterBackgroundReferenceFile(
  fileSource: string,
  knownBackgroundScriptIds: Set<string>,
): CharacterBackgroundReferenceFile {
  const backgroundScriptIdsByReference = new Map<string, string[]>()
  const directlyPlayableBackgroundScriptIds = new Set<string>()

  for (const statement of collectTopLevelStatements(fileSource)) {
    if (statement.type !== 'assignment') {
      continue
    }

    const referencedBackgroundScriptIds = stringArrayValue(statement.value).filter(
      (backgroundScriptId) => knownBackgroundScriptIds.has(backgroundScriptId),
    )

    if (referencedBackgroundScriptIds.length === 0) {
      continue
    }

    setBackgroundScriptIdsByReference(
      backgroundScriptIdsByReference,
      statement.target,
      referencedBackgroundScriptIds,
    )

    if (statement.target.startsWith('::Const.Character')) {
      for (const backgroundScriptId of referencedBackgroundScriptIds) {
        directlyPlayableBackgroundScriptIds.add(backgroundScriptId)
      }
    }
  }

  return {
    backgroundScriptIdsByReference,
    directlyPlayableBackgroundScriptIds,
  }
}

function resolveBackgroundScriptIdsFromValue(
  value: SquirrelValue | null | undefined,
  {
    backgroundScriptIdsByReference,
    knownBackgroundScriptIds,
    localValues,
  }: BackgroundScriptReferenceResolutionContext,
  visitedReferences = new Set<string>(),
): string[] {
  const directString = stringValue(value)

  if (directString !== null) {
    return knownBackgroundScriptIds.has(directString) ? [directString] : []
  }

  const arrayValue = unwrapArray(value)

  if (arrayValue !== null) {
    return arrayValue.values.flatMap((item) =>
      resolveBackgroundScriptIdsFromValue(
        item,
        {
          backgroundScriptIdsByReference,
          knownBackgroundScriptIds,
          localValues,
        },
        visitedReferences,
      ),
    )
  }

  const reference = referenceValue(value)

  if (reference === null || visitedReferences.has(reference)) {
    return []
  }

  if (localValues.has(reference)) {
    const nextVisitedReferences = new Set(visitedReferences)
    nextVisitedReferences.add(reference)

    return resolveBackgroundScriptIdsFromValue(
      localValues.get(reference),
      {
        backgroundScriptIdsByReference,
        knownBackgroundScriptIds,
        localValues,
      },
      nextVisitedReferences,
    )
  }

  return backgroundScriptIdsByReference.get(normalizeConstReference(reference)) ?? []
}

function collectPlayableBackgroundScriptIdsFromFileEntries(
  fileEntries: NutFileEntry[],
  knownBackgroundScriptIds: Set<string>,
  backgroundScriptIdsByReference: Map<string, string[]>,
  diagnostics: ImporterDiagnosticContext['diagnostics'],
): Set<string> {
  const playableBackgroundScriptIds = new Set<string>()

  for (const fileEntry of fileEntries) {
    const uncommentedFileSource = stripSquirrelComments(fileEntry.fileSource)
    const diagnosticContext = { diagnostics, sourceFilePath: fileEntry.sourceFilePath }
    const localValues = extractLocalAssignments(uncommentedFileSource, diagnosticContext)

    for (const callee of ['setStartValuesEx', 'setStartValues', 'addBroToRoster']) {
      for (const argumentList of extractCallArgumentLists(uncommentedFileSource, callee)) {
        const candidateArgumentSources =
          callee === 'addBroToRoster' ? argumentList : argumentList.slice(0, 1)

        for (const candidateArgumentSource of candidateArgumentSources) {
          if (!candidateArgumentSource) {
            continue
          }

          let parsedValue: SquirrelValue

          try {
            parsedValue = parseSquirrelValue(candidateArgumentSource).value
          } catch (error) {
            addImporterParseWarning(
              diagnosticContext,
              `${callee} background argument`,
              candidateArgumentSource,
              error,
            )
            continue
          }

          for (const backgroundScriptId of resolveBackgroundScriptIdsFromValue(parsedValue, {
            backgroundScriptIdsByReference,
            knownBackgroundScriptIds,
            localValues,
          })) {
            playableBackgroundScriptIds.add(backgroundScriptId)
          }
        }
      }
    }
  }

  return playableBackgroundScriptIds
}

function resolveFixedLiteralBackgroundScriptIdsFromValue(
  value: SquirrelValue | null | undefined,
  knownBackgroundScriptIds: Set<string>,
): string[] {
  const directString = stringValue(value)

  if (directString !== null) {
    return knownBackgroundScriptIds.has(directString) ? [directString] : []
  }

  const arrayValue = unwrapArray(value)

  if (arrayValue === null) {
    return []
  }

  const backgroundScriptIds = arrayValue.values
    .map((item) => stringValue(item))
    .filter(
      (backgroundScriptId): backgroundScriptId is string =>
        backgroundScriptId !== null && knownBackgroundScriptIds.has(backgroundScriptId),
    )

  return backgroundScriptIds.length === 1 ? backgroundScriptIds : []
}

function collectScenarioVeteranPerkLevelIntervalsByBackgroundScriptId(
  fileEntries: NutFileEntry[],
  knownBackgroundScriptIds: Set<string>,
  diagnostics: ImporterDiagnosticContext['diagnostics'],
): Map<string, ScenarioVeteranPerkLevelRecord> {
  const recordsByBackgroundScriptId = new Map<string, ScenarioVeteranPerkLevelRecord>()

  for (const fileEntry of fileEntries) {
    const uncommentedFileSource = stripSquirrelComments(fileEntry.fileSource)
    const diagnosticContext = { diagnostics, sourceFilePath: fileEntry.sourceFilePath }
    const receiverAliases = extractActorReceiverAliases(uncommentedFileSource)
    const playerTraitReceivers = collectPlayerTraitReceivers(uncommentedFileSource)
    const playerCharacterFlagReceivers = collectPlayerCharacterFlagReceivers(uncommentedFileSource)
    const actorsByReceiver = new Map<string, ScenarioActorRecord>()

    function getActorRecord(receiver: string): ScenarioActorRecord {
      const resolvedReceiver = resolveActorReceiverAlias(receiver, receiverAliases)

      if (!actorsByReceiver.has(resolvedReceiver)) {
        actorsByReceiver.set(resolvedReceiver, {
          backgroundScriptIds: [],
          isAvatar: false,
          veteranPerkLevelIntervals: [],
        })
      }

      return actorsByReceiver.get(resolvedReceiver) as ScenarioActorRecord
    }

    for (const receiver of [...playerTraitReceivers, ...playerCharacterFlagReceivers]) {
      getActorRecord(receiver).isAvatar = true
    }

    for (const methodName of ['setStartValuesEx', 'setStartValues']) {
      for (const call of extractReceiverMethodCallArgumentLists(
        uncommentedFileSource,
        methodName,
        diagnosticContext,
      )) {
        const backgroundArgumentSource = call.argumentList[0]

        if (!backgroundArgumentSource) {
          continue
        }

        let parsedValue: SquirrelValue

        try {
          parsedValue = parseSquirrelValue(backgroundArgumentSource).value
        } catch (error) {
          addImporterParseWarning(
            diagnosticContext,
            `${methodName} scenario veteran background argument`,
            backgroundArgumentSource,
            error,
          )
          continue
        }

        const fixedBackgroundScriptIds = resolveFixedLiteralBackgroundScriptIdsFromValue(
          parsedValue,
          knownBackgroundScriptIds,
        )

        if (fixedBackgroundScriptIds.length !== 1) {
          continue
        }

        getActorRecord(call.receiver).backgroundScriptIds.push(...fixedBackgroundScriptIds)
      }
    }

    for (const call of extractReceiverMethodCallArgumentLists(
      uncommentedFileSource,
      'setVeteranPerks',
      diagnosticContext,
    )) {
      const intervalArgumentSource = call.argumentList[0]

      if (!intervalArgumentSource) {
        continue
      }

      try {
        const interval = normalizeVeteranPerkLevelInterval(
          numberValue(parseSquirrelValue(intervalArgumentSource).value),
        )

        if (interval !== null) {
          getActorRecord(call.receiver).veteranPerkLevelIntervals.push(interval)
        }
      } catch (error) {
        addImporterParseWarning(
          diagnosticContext,
          'setVeteranPerks scenario veteran interval argument',
          intervalArgumentSource,
          error,
        )
      }
    }

    for (const actorRecord of actorsByReceiver.values()) {
      const interval = actorRecord.veteranPerkLevelIntervals.at(-1)

      if (interval === undefined || actorRecord.backgroundScriptIds.length === 0) {
        continue
      }

      for (const backgroundScriptId of actorRecord.backgroundScriptIds) {
        const previousRecord = recordsByBackgroundScriptId.get(backgroundScriptId)

        if (previousRecord === undefined) {
          recordsByBackgroundScriptId.set(backgroundScriptId, {
            isAvatar: actorRecord.isAvatar,
            veteranPerkLevelInterval: interval,
          })
          continue
        }

        previousRecord.isAvatar ||= actorRecord.isAvatar

        if (interval < previousRecord.veteranPerkLevelInterval) {
          previousRecord.veteranPerkLevelInterval = interval
        }
      }
    }
  }

  return recordsByBackgroundScriptId
}

function getBackgroundOriginCandidateLabels(background: ImportedBackgroundDefinition): string[] {
  return [
    background.backgroundIdentifier,
    background.backgroundScriptId.replace(/_background$/u, ''),
    path.posix
      .basename(background.sourceFilePath, path.posix.extname(background.sourceFilePath))
      .replace(/_background$/u, ''),
  ].filter((label) => typeof label === 'string')
}

function isScenarioVeteranPerkLevelIntervalEligibleBackground(
  background: ImportedBackgroundDefinition,
): boolean {
  return getBackgroundOriginCandidateLabels(background).some((label) =>
    isOriginBackgroundSourceLabel(label),
  )
}

function applyScenarioVeteranPerkLevelIntervals(
  backgrounds: ImportedBackgroundDefinition[],
  scenarioVeteranPerkLevelRecordsByBackgroundScriptId: Map<string, ScenarioVeteranPerkLevelRecord>,
): ImportedBackgroundDefinition[] {
  return backgrounds.map((background) => {
    const scenarioVeteranPerkLevelRecord =
      scenarioVeteranPerkLevelRecordsByBackgroundScriptId.get(background.backgroundScriptId) ?? null

    if (
      scenarioVeteranPerkLevelRecord === null ||
      (!scenarioVeteranPerkLevelRecord.isAvatar &&
        !isScenarioVeteranPerkLevelIntervalEligibleBackground(background))
    ) {
      return background
    }

    return {
      ...background,
      veteranPerkLevelInterval: Math.min(
        background.veteranPerkLevelInterval,
        scenarioVeteranPerkLevelRecord.veteranPerkLevelInterval,
      ),
    }
  })
}

function parseScenarioHookFile(
  fileSource: string,
  sourceFilePath: string,
  diagnostics: ImporterDiagnosticContext['diagnostics'],
): ScenarioDefinition | null {
  const diagnosticContext = { diagnostics, sourceFilePath }
  const wrapperFunction = extractHookWrapperFunction(fileSource)

  if (!wrapperFunction || wrapperFunction.type !== 'function') {
    return null
  }

  const wrapperStatements = collectTopLevelStatements(wrapperFunction.body)
  const memberValues: LocalSquirrelValues = new Map()

  for (const statement of wrapperStatements) {
    if (statement.type === 'assignment' && statement.target.startsWith('o.m.')) {
      memberValues.set(getLastPathSegment(statement.target), statement.value)
    }
  }

  const createFunctionLiteral = readFunctionAssignmentBody(wrapperStatements, 'o.create')
  const createBody = createFunctionLiteral?.body ?? ''
  const uncommentedCreateBody = stripSquirrelComments(createBody)
  const scenarioIdentifier = stringValue(
    extractAssignedValue(uncommentedCreateBody, 'this.m.ID', diagnosticContext),
  )
  const scenarioName = stringValue(
    extractAssignedValue(uncommentedCreateBody, 'this.m.Name', diagnosticContext),
  )

  if (scenarioIdentifier === null || scenarioName === null) {
    return null
  }

  const directPerkConstNames = new Set<string>()
  const overlayDefinitions: ScenarioDefinition['overlayDefinitions'] = []

  for (const statement of wrapperStatements) {
    if (
      !isAssignmentStatement(statement) ||
      !statement.target.startsWith('o.') ||
      !isSquirrelFunctionValue(statement.value)
    ) {
      continue
    }

    const methodName = getLastPathSegment(statement.target)
    const functionBody = statement.value.body
    const uncommentedFunctionBody = stripSquirrelComments(functionBody)

    for (const argumentList of extractCallArgumentLists(
      uncommentedFunctionBody,
      '::Legends.Perks.grant',
    )) {
      const perkReferenceSource = argumentList[1]

      if (!perkReferenceSource) {
        continue
      }

      try {
        const perkReference = referenceValue(parseSquirrelValue(perkReferenceSource).value)
        const perkConstName = resolveReferenceConstName(perkReference)

        if (perkConstName !== null) {
          directPerkConstNames.add(perkConstName)
        }
      } catch (error) {
        addImporterParseWarning(
          diagnosticContext,
          `${methodName} grant perk argument`,
          perkReferenceSource,
          error,
        )
        continue
      }
    }

    if (methodName !== 'onBuildPerkTree') {
      continue
    }

    const localAssignments = extractLocalAssignments(uncommentedFunctionBody, diagnosticContext)

    for (const argumentList of extractCallArgumentLists(
      uncommentedFunctionBody,
      'this.addScenarioPerk',
    )) {
      const perkArgumentSource = argumentList[1]

      if (!perkArgumentSource) {
        continue
      }

      let parsedArgumentValue: SquirrelValue

      try {
        parsedArgumentValue = parseSquirrelValue(perkArgumentSource).value
      } catch (error) {
        addImporterParseWarning(
          diagnosticContext,
          `${methodName} scenario perk argument`,
          perkArgumentSource,
          error,
        )
        continue
      }

      const directPerkReference = referenceValue(parsedArgumentValue)
      const directPerkConstName = resolveReferenceConstName(directPerkReference)

      if (directPerkConstName !== null) {
        overlayDefinitions.push({
          candidatePerkConstNames: [directPerkConstName],
          grantType: 'direct',
          sourceMethodName: methodName,
        })
        continue
      }

      const localVariableName = referenceValue(parsedArgumentValue)

      if (localVariableName === null || !localAssignments.has(localVariableName)) {
        continue
      }

      const localValue = localAssignments.get(localVariableName)
      const localCall = unwrapCall(localValue)

      if (localCall === null || !localCall.callee.endsWith('.rand')) {
        continue
      }

      const candidateSourceReference = referenceValue(localCall.arguments[0])

      if (candidateSourceReference === null) {
        continue
      }

      let candidatePoolValue: SquirrelValue | null | undefined = null

      if (candidateSourceReference.startsWith('this.m.')) {
        candidatePoolValue = memberValues.get(getLastPathSegment(candidateSourceReference))
      } else if (localAssignments.has(candidateSourceReference)) {
        candidatePoolValue = localAssignments.get(candidateSourceReference)
      }

      if (candidatePoolValue === null) {
        continue
      }

      const candidatePerkConstNames = referenceArrayValue(candidatePoolValue)
        .map(resolveReferenceConstName)
        .filter((perkConstName): perkConstName is string => perkConstName !== null)

      if (candidatePerkConstNames.length === 0) {
        continue
      }

      overlayDefinitions.push({
        candidatePerkConstNames,
        grantType: 'random-pool',
        sourceMethodName: methodName,
      })
    }
  }

  return {
    directPerkConstNames: [...directPerkConstNames],
    overlayDefinitions,
    scenarioIdentifier,
    scenarioName,
    sourceFilePath,
  }
}

function buildFavouredEnemyTargets(
  perkConstName: string,
  targetConstNamesByPerkConstName: Map<string, string[]>,
  killsPerPercentBonusByEntityConstName: Map<string, number>,
  entityNamesByConstName: Map<string, string>,
): LegendsFavouredEnemyTarget[] {
  const targetConstNames = targetConstNamesByPerkConstName.get(perkConstName) ?? []

  if (targetConstNames.length === 0) {
    return []
  }

  return targetConstNames.map((entityConstName) => ({
    entityConstName,
    entityName: entityNamesByConstName.get(entityConstName) ?? prettifyIdentifier(entityConstName),
    killsPerPercentBonus: killsPerPercentBonusByEntityConstName.get(entityConstName) ?? null,
  }))
}

function buildSearchText(perkRecord: LegendsPerkRecord): string {
  const placementText = perkRecord.placements
    .flatMap((placement) => [placement.categoryName, placement.perkGroupName])
    .join(' ')

  const backgroundText = perkRecord.backgroundSources
    .map((backgroundSource) =>
      [backgroundSource.backgroundName, backgroundSource.perkGroupName].join(' '),
    )
    .join(' ')

  const scenarioText = perkRecord.scenarioSources
    .map((scenarioSource) => [scenarioSource.scenarioName, scenarioSource.grantType].join(' '))
    .join(' ')

  const favouredEnemyText = (perkRecord.favouredEnemyTargets ?? [])
    .map((target) => `${target.entityName} ${target.killsPerPercentBonus ?? ''}`.trim())
    .join(' ')

  return normalizeWhitespace(
    [
      perkRecord.perkName,
      perkRecord.primaryCategoryName,
      perkRecord.categoryNames.join(' '),
      perkRecord.descriptionParagraphs.join(' '),
      placementText,
      backgroundText,
      scenarioText,
      favouredEnemyText,
    ].join(' '),
  )
}

function comparePlacements(
  leftPlacement: LegendsPerkPlacement,
  rightPlacement: LegendsPerkPlacement,
  categoryOrder: string[],
): number {
  return (
    getCategoryPriority(categoryOrder, leftPlacement.categoryName) -
      getCategoryPriority(categoryOrder, rightPlacement.categoryName) ||
    leftPlacement.perkGroupName.localeCompare(rightPlacement.perkGroupName) ||
    (leftPlacement.tier ?? Number.POSITIVE_INFINITY) -
      (rightPlacement.tier ?? Number.POSITIVE_INFINITY)
  )
}

function compareBackgroundSources(
  leftSource: LegendsPerkBackgroundSource,
  rightSource: LegendsPerkBackgroundSource,
): number {
  return (
    leftSource.backgroundName.localeCompare(rightSource.backgroundName) ||
    leftSource.perkGroupName.localeCompare(rightSource.perkGroupName) ||
    leftSource.perkGroupId.localeCompare(rightSource.perkGroupId) ||
    rightSource.probability - leftSource.probability
  )
}

function getUniqueDynamicPerkPlacements(perkRecord: LegendsPerkRecord): DynamicPerkPlacement[] {
  const dynamicPerkPlacements: DynamicPerkPlacement[] = []
  const seenPlacementKeys = new Set<string>()

  for (const placement of perkRecord.placements) {
    if (!isDynamicBackgroundCategoryName(placement.categoryName)) {
      continue
    }

    const placementKey = `${placement.categoryName}::${placement.perkGroupId}`

    if (seenPlacementKeys.has(placementKey)) {
      continue
    }

    seenPlacementKeys.add(placementKey)
    dynamicPerkPlacements.push({
      ...placement,
      categoryName: placement.categoryName,
    })
  }

  return dynamicPerkPlacements
}

function getPerkBackgroundSources({
  backgroundFitBackgrounds,
  perkRecord,
  probabilitiesByBackgroundId,
}: PerkBackgroundSourceContext): LegendsPerkBackgroundSource[] {
  const dynamicPerkPlacements = getUniqueDynamicPerkPlacements(perkRecord)
  const backgroundSources = backgroundFitBackgrounds.flatMap((backgroundDefinition) => {
    const probabilitiesByPerkGroupKey =
      probabilitiesByBackgroundId.get(backgroundDefinition.backgroundId) ??
      new Map<string, number>()

    return dynamicPerkPlacements.flatMap((placement) => {
      const categoryDefinition = backgroundDefinition.categories[placement.categoryName]
      const probability =
        probabilitiesByPerkGroupKey.get(
          getPerkGroupProbabilityKey(placement.categoryName, placement.perkGroupId),
        ) ?? 0

      if (!categoryDefinition || probability <= 0) {
        return []
      }

      return [
        {
          backgroundName: backgroundDefinition.backgroundName,
          perkGroupId: placement.perkGroupId,
          perkGroupName: placement.perkGroupName,
          probability,
        },
      ]
    })
  })

  return backgroundSources
    .filter((backgroundSource, index, backgroundSourcesList) => {
      const key = `${backgroundSource.backgroundName}::${backgroundSource.perkGroupId}::${backgroundSource.probability}`

      return (
        backgroundSourcesList.findIndex(
          (candidate) =>
            `${candidate.backgroundName}::${candidate.perkGroupId}::${candidate.probability}` ===
            key,
        ) === index
      )
    })
    .toSorted(compareBackgroundSources)
}

function compareScenarioSources(
  leftSource: ScenarioSourceDefinition,
  rightSource: ScenarioSourceDefinition,
): number {
  return (
    leftSource.scenarioName.localeCompare(rightSource.scenarioName) ||
    leftSource.grantType.localeCompare(rightSource.grantType) ||
    leftSource.sourceMethodName.localeCompare(rightSource.sourceMethodName)
  )
}

export async function createDataset(
  referenceRootDirectoryPath = defaultReferenceRootDirectoryPath,
  options: CreateDatasetOptions = {},
): Promise<LegendsPerksDataset> {
  const diagnostics = options.diagnostics ?? null
  const scriptsRootDirectoryPath = getScriptsRootDirectoryPath(referenceRootDirectoryPath)
  const perkDefinitionsFilePath = path.join(
    referenceRootDirectoryPath,
    '!!config',
    'perks_defs.nut',
  )
  const characterBackgroundReferencesFilePath = path.join(
    referenceRootDirectoryPath,
    '!!config',
    'character_backgrounds.nut',
  )
  const perkStringCandidateFilePaths = [
    path.join(referenceRootDirectoryPath, '!!config', 'perk_strings.nut'),
    path.join(referenceRootDirectoryPath, 'hooks', 'config', 'perk_strings.nut'),
  ]
  const entityNamesFilePath = path.join(referenceRootDirectoryPath, '!!config', '_global.nut')
  const categoryOrderFilePath = path.join(
    referenceRootDirectoryPath,
    'afterHooks',
    'perk_to_perk_groups_mapping.nut',
  )
  const favouredEnemyConfigFilePath = path.join(
    referenceRootDirectoryPath,
    'config',
    'z_legends_fav_enemies.nut',
  )
  const backgroundTypeMetadataFilePath = path.join(
    referenceRootDirectoryPath,
    '!!config',
    'character.nut',
  )
  const resourceModifierValuesFilePath = path.join(
    referenceRootDirectoryPath,
    '!config',
    'mods_legend_resources.nut',
  )
  const vanillaTraitMetadataFileSource = await readFile(vanillaTraitMetadataFilePath, 'utf8')
  const vanillaTraitMetadataRecords = JSON.parse(vanillaTraitMetadataFileSource)
  const perkGroupRulesFilePath = path.join(referenceRootDirectoryPath, 'config', 'perks_tree.nut')
  const playerHookFilePath = path.join(
    referenceRootDirectoryPath,
    'hooks',
    'entity',
    'tactical',
    'player.nut',
  )
  const hookBackgroundDirectoryPath = path.join(
    referenceRootDirectoryPath,
    'hooks',
    'skills',
    'backgrounds',
  )
  const scriptBackgroundDirectoryPath = path.join(scriptsRootDirectoryPath, 'skills', 'backgrounds')
  const hookTraitDirectoryPath = path.join(referenceRootDirectoryPath, 'hooks', 'skills', 'traits')
  const scriptTraitDirectoryPath = path.join(scriptsRootDirectoryPath, 'skills', 'traits')
  const scenarioDirectoryPath = path.join(referenceRootDirectoryPath, 'hooks', 'scenarios', 'world')
  const scriptScenarioDirectoryPath = path.join(scriptsRootDirectoryPath, 'scenarios', 'world')
  const perkGroupDirectoryPath = path.join(referenceRootDirectoryPath, 'config')
  const characterBackgroundFilePath = path.join(
    hookBackgroundDirectoryPath,
    'character_background.nut',
  )
  const playableBackgroundScanDirectoryPaths = [
    path.join(referenceRootDirectoryPath, 'hooks', 'entity', 'world', 'settlements', 'buildings'),
    path.join(referenceRootDirectoryPath, 'hooks', 'events', 'events'),
    path.join(referenceRootDirectoryPath, 'hooks', 'scenarios', 'world'),
    path.join(scriptsRootDirectoryPath, 'entity', 'world', 'settlements', 'buildings'),
    path.join(scriptsRootDirectoryPath, 'events', 'events'),
    path.join(scriptsRootDirectoryPath, 'scenarios', 'world'),
  ]

  const [
    characterBackgroundReferencesFileSource,
    perkDefinitionsFileSource,
    entityNamesFileSource,
    categoryOrderFileSource,
    favouredEnemyConfigFileSource,
    backgroundTypeMetadataFileSource,
    resourceModifierValuesFileSource,
    perkGroupRulesFileSource,
    characterBackgroundFileSource,
    playerHookFileSource,
  ] = await Promise.all([
    readFileIfExists(characterBackgroundReferencesFilePath),
    readFile(perkDefinitionsFilePath, 'utf8'),
    readFile(entityNamesFilePath, 'utf8'),
    readFile(categoryOrderFilePath, 'utf8'),
    readFile(favouredEnemyConfigFilePath, 'utf8'),
    readFileIfExists(backgroundTypeMetadataFilePath),
    readFileIfExists(resourceModifierValuesFilePath),
    readFile(perkGroupRulesFilePath, 'utf8'),
    readFile(characterBackgroundFilePath, 'utf8'),
    readFileIfExists(playerHookFilePath),
  ])

  const perkStringFileEntries = (
    await Promise.all(
      perkStringCandidateFilePaths.map(async (perkStringFilePath) => {
        const fileSource = await readFileIfExists(perkStringFilePath)

        if (fileSource === null) {
          return null
        }

        return {
          fileSource,
          sourceFilePath: toPosixRelativePath(perkStringFilePath),
        }
      }),
    )
  ).filter(
    (perkStringFileEntry): perkStringFileEntry is NutFileEntry => perkStringFileEntry !== null,
  )

  if (perkStringFileEntries.length === 0) {
    throw new Error(
      `Unable to locate any perk strings files in ${referenceRootDirectoryPath}. Expected at least ${perkStringCandidateFilePaths[0]}.`,
    )
  }

  const perkGroupFileNames = (await readdir(perkGroupDirectoryPath))
    .filter((fileName) => /^z_perks_tree_.*\.nut$/i.test(fileName))
    .toSorted((left, right) => left.localeCompare(right))

  const treeFileEntries = await Promise.all(
    perkGroupFileNames.map(async (fileName) => {
      const absolutePath = path.join(perkGroupDirectoryPath, fileName)
      return {
        fileSource: await readFile(absolutePath, 'utf8'),
        sourceFilePath: toPosixRelativePath(absolutePath),
      }
    }),
  )

  const hookBackgroundFileNames = (await readdir(hookBackgroundDirectoryPath))
    .filter((fileName) => fileName.endsWith('.nut') && fileName !== 'character_background.nut')
    .toSorted((left, right) => left.localeCompare(right))

  const hookBackgroundFileEntries = await Promise.all(
    hookBackgroundFileNames.map(async (fileName) => {
      const absolutePath = path.join(hookBackgroundDirectoryPath, fileName)
      return {
        fileSource: await readFile(absolutePath, 'utf8'),
        sourceFilePath: toPosixRelativePath(absolutePath),
      }
    }),
  )

  const scriptBackgroundFileEntries = (
    await collectNutFileEntriesRecursively(scriptBackgroundDirectoryPath)
  ).filter(
    (backgroundFileEntry) =>
      !backgroundFileEntry.sourceFilePath.endsWith('/character_background.nut'),
  )
  const traitFileEntries = (
    await Promise.all(
      [hookTraitDirectoryPath, scriptTraitDirectoryPath].map((directoryPath) =>
        collectNutFileEntriesRecursively(directoryPath),
      ),
    )
  )
    .flat()
    .filter(
      (fileEntry, index, fileEntries) =>
        fileEntries.findIndex(
          (candidate) => candidate.sourceFilePath === fileEntry.sourceFilePath,
        ) === index,
    )
    .toSorted((leftEntry, rightEntry) =>
      leftEntry.sourceFilePath.localeCompare(rightEntry.sourceFilePath),
    )

  const scenarioFileNames = (await readdir(scenarioDirectoryPath))
    .filter((fileName) => fileName.endsWith('.nut'))
    .toSorted((left, right) => left.localeCompare(right))

  const scenarioFileEntries = await Promise.all(
    scenarioFileNames.map(async (fileName) => {
      const absolutePath = path.join(scenarioDirectoryPath, fileName)
      return {
        fileSource: await readFile(absolutePath, 'utf8'),
        sourceFilePath: toPosixRelativePath(absolutePath),
      }
    }),
  )
  const scenarioVeteranPerkFileEntries = (
    await Promise.all(
      [scenarioDirectoryPath, scriptScenarioDirectoryPath].map((directoryPath) =>
        collectNutFileEntriesRecursively(directoryPath),
      ),
    )
  )
    .flat()
    .filter(
      (fileEntry, index, fileEntries) =>
        fileEntries.findIndex(
          (candidate) => candidate.sourceFilePath === fileEntry.sourceFilePath,
        ) === index,
    )
    .toSorted((leftEntry, rightEntry) =>
      leftEntry.sourceFilePath.localeCompare(rightEntry.sourceFilePath),
    )

  const playableBackgroundScanFileEntries = (
    await Promise.all(
      playableBackgroundScanDirectoryPaths.map((directoryPath) =>
        collectNutFileEntriesRecursively(directoryPath),
      ),
    )
  )
    .flat()
    .filter(
      (fileEntry, index, fileEntries) =>
        fileEntries.findIndex(
          (candidate) => candidate.sourceFilePath === fileEntry.sourceFilePath,
        ) === index,
    )
    .toSorted((leftEntry, rightEntry) =>
      leftEntry.sourceFilePath.localeCompare(rightEntry.sourceFilePath),
    )

  const categoryOrder = parseCategoryOrderFile(categoryOrderFileSource)
  const perkStringData = mergePerkStringData(
    perkStringFileEntries.map((perkStringFileEntry) =>
      parsePerkStringsFile(perkStringFileEntry.fileSource),
    ),
  )
  const perkDefinitions = parsePerkDefinitionsFile(
    perkDefinitionsFileSource,
    toPosixRelativePath(perkDefinitionsFilePath),
  )
  const entityNamesByConstName = parseEntityNamesFile(entityNamesFileSource)
  const favouredEnemyConfig = parseFavouredEnemyConfigFile(favouredEnemyConfigFileSource)
  const backgroundTypeMetadata = backgroundTypeMetadataFileSource
    ? parseBackgroundTypeMetadataFile(backgroundTypeMetadataFileSource)
    : {
        backgroundTypeNamesByKey: new Map([['None', 'None']]),
        backgroundTypeValuesByKey: new Map([['None', 0]]),
      }
  const resourceModifierValuesByKey = resourceModifierValuesFileSource
    ? parseResourceModifierValuesFile(resourceModifierValuesFileSource)
    : new Map()
  const traitMetadata = parseTraitMetadataFileEntries(traitFileEntries, vanillaTraitMetadataRecords)

  const perkGroupDefinitions = new Map<string, PerkGroupDefinition>()
  const perkGroupCategoryNames = new Map<string, string>()
  const defaultCategoryNamesBySourceFilePath = new Map<string, string>()

  for (const treeFileEntry of treeFileEntries) {
    const parsedTreeConfig = parsePerkGroupConfigFile(
      treeFileEntry.fileSource,
      treeFileEntry.sourceFilePath,
    )

    for (const categoryDefinition of parsedTreeConfig.categoryDefinitions) {
      defaultCategoryNamesBySourceFilePath.set(
        categoryDefinition.sourceFilePath,
        categoryDefinition.categoryName,
      )

      for (const perkGroupConstName of categoryDefinition.perkGroupConstNames) {
        perkGroupCategoryNames.set(perkGroupConstName, categoryDefinition.categoryName)
      }
    }

    for (const perkGroupDefinition of parsedTreeConfig.perkGroupDefinitions) {
      perkGroupDefinitions.set(perkGroupDefinition.constName, perkGroupDefinition)
    }
  }

  for (const [perkGroupConstName, perkGroupDefinition] of perkGroupDefinitions.entries()) {
    const perkGroupCategoryName = perkGroupCategoryNames.get(perkGroupConstName)

    if (perkGroupCategoryName !== undefined) {
      perkGroupDefinition.categoryName = perkGroupCategoryName
      continue
    }

    if (perkGroupDefinition.categoryName) {
      continue
    }

    perkGroupDefinition.categoryName =
      defaultCategoryNamesBySourceFilePath.get(perkGroupDefinition.sourceFilePath) ?? 'Other'
  }

  const characterBackgroundWrapperCall = collectTopLevelStatements(
    characterBackgroundFileSource,
  ).find((statement): statement is SquirrelExpressionStatement => {
    if (!isExpressionStatement(statement)) {
      return false
    }

    const wrapperCall = unwrapCall(statement.expression)
    const wrapperCallback = wrapperCall?.arguments[1]

    return (
      wrapperCall?.callee.startsWith('::mods_hook') === true &&
      isSquirrelFunctionValue(wrapperCallback)
    )
  })
  const characterBackgroundWrapperFunction =
    unwrapCall(characterBackgroundWrapperCall?.expression)?.arguments[1] ?? null

  if (!isSquirrelFunctionValue(characterBackgroundWrapperFunction)) {
    throw new Error('Unable to read character background defaults from the reference directory.')
  }

  const uncommentedCharacterBackgroundBody = stripSquirrelComments(
    characterBackgroundWrapperFunction.body,
  )
  const baseMinimumsValue = extractAssignedValue(
    uncommentedCharacterBackgroundBody,
    'o.m.PerkTreeDynamicMins',
    { diagnostics, sourceFilePath: toPosixRelativePath(characterBackgroundFilePath) },
  )
  const baseDynamicTreeValue = extractAssignedValue(
    uncommentedCharacterBackgroundBody,
    'o.m.PerkTreeDynamicBase',
    { diagnostics, sourceFilePath: toPosixRelativePath(characterBackgroundFilePath) },
  )

  if (baseMinimumsValue === null || baseDynamicTreeValue === null) {
    throw new Error('Unable to parse the base background dynamic perk group defaults.')
  }

  const baseMinimums = buildMinimumsObject(baseMinimumsValue)
  const baseAttributeRangeDefinitions = parseBackgroundBaseAttributeRanges(
    characterBackgroundReferencesFileSource ?? '',
    {
      diagnostics,
      sourceFilePath: toPosixRelativePath(characterBackgroundReferencesFilePath),
    },
  )
  const backgroundMetadataDefaults = createBackgroundMetadataDefaults({
    backgroundTypeMetadata,
    characterBackgroundFileSource: characterBackgroundWrapperFunction.body,
    diagnostics,
    resourceModifierValuesByKey,
    sourceFilePath: toPosixRelativePath(characterBackgroundFilePath),
  })
  const defaultVeteranPerkLevelInterval =
    playerHookFileSource === null
      ? fallbackVeteranPerkLevelInterval
      : parseDefaultVeteranPerkLevelInterval(stripSquirrelComments(playerHookFileSource), {
          diagnostics,
          sourceFilePath: toPosixRelativePath(playerHookFilePath),
        })
  const hookBackgrounds = hookBackgroundFileEntries
    .map((backgroundFileEntry) =>
      parseBackgroundHookFile(
        backgroundFileEntry.fileSource,
        backgroundFileEntry.sourceFilePath,
        baseDynamicTreeValue,
        baseMinimums,
        backgroundMetadataDefaults,
        backgroundTypeMetadata,
        defaultVeteranPerkLevelInterval,
        diagnostics,
        resourceModifierValuesByKey,
        traitMetadata,
      ),
    )
    .filter((background): background is ImportedBackgroundDefinition => background !== null)
  const rawScriptBackgroundDefinitionsByScriptId = new Map(
    scriptBackgroundFileEntries
      .map((backgroundFileEntry) =>
        parseBackgroundScriptFileDefinition(
          backgroundFileEntry.fileSource,
          backgroundFileEntry.sourceFilePath,
          diagnostics,
        ),
      )
      .filter(
        (backgroundDefinition): backgroundDefinition is RawScriptBackgroundDefinition =>
          backgroundDefinition !== null,
      )
      .map((backgroundDefinition) => [
        backgroundDefinition.backgroundScriptId,
        backgroundDefinition,
      ]),
  )
  const resolvedScriptBackgroundDefinitionsByScriptId = resolveScriptBackgroundDefinitions(
    rawScriptBackgroundDefinitionsByScriptId,
    baseDynamicTreeValue,
    baseMinimums,
    backgroundMetadataDefaults,
    backgroundTypeMetadata,
    defaultVeteranPerkLevelInterval,
    diagnostics,
    resourceModifierValuesByKey,
    traitMetadata,
  )
  const knownBackgroundScriptIds = new Set([
    ...hookBackgroundFileEntries.map((backgroundFileEntry) =>
      getBackgroundScriptIdFromSourceFilePath(backgroundFileEntry.sourceFilePath),
    ),
    ...scriptBackgroundFileEntries.map((backgroundFileEntry) =>
      getBackgroundScriptIdFromSourceFilePath(backgroundFileEntry.sourceFilePath),
    ),
  ])
  const characterBackgroundReferenceFile: CharacterBackgroundReferenceFile =
    characterBackgroundReferencesFileSource
      ? parseCharacterBackgroundReferenceFile(
          characterBackgroundReferencesFileSource,
          knownBackgroundScriptIds,
        )
      : {
          backgroundScriptIdsByReference: new Map<string, string[]>(),
          directlyPlayableBackgroundScriptIds: new Set<string>(),
        }
  const { backgroundScriptIdsByReference, directlyPlayableBackgroundScriptIds } =
    characterBackgroundReferenceFile
  const playableBackgroundScriptIds = new Set(directlyPlayableBackgroundScriptIds)

  for (const backgroundScriptId of collectPlayableBackgroundScriptIdsFromFileEntries(
    playableBackgroundScanFileEntries,
    knownBackgroundScriptIds,
    backgroundScriptIdsByReference,
    diagnostics,
  )) {
    playableBackgroundScriptIds.add(backgroundScriptId)
  }

  const hookBackgroundScriptIds = new Set(
    hookBackgrounds.map((background) => background.backgroundScriptId),
  )
  const scriptBackgrounds = [...playableBackgroundScriptIds]
    .filter((backgroundScriptId) => !hookBackgroundScriptIds.has(backgroundScriptId))
    .flatMap((backgroundScriptId) => {
      const backgroundDefinition =
        resolvedScriptBackgroundDefinitionsByScriptId.get(backgroundScriptId) ?? null
      return backgroundDefinition && backgroundDefinition.backgroundName !== null
        ? [backgroundDefinition]
        : []
    })
  const scenarioVeteranPerkLevelRecordsByBackgroundScriptId =
    collectScenarioVeteranPerkLevelIntervalsByBackgroundScriptId(
      scenarioVeteranPerkFileEntries,
      knownBackgroundScriptIds,
      diagnostics,
    )
  const backgrounds = applyScenarioVeteranPerkLevelIntervals(
    [...hookBackgrounds, ...scriptBackgrounds],
    scenarioVeteranPerkLevelRecordsByBackgroundScriptId,
  )
  const backgroundFitRules = parseBackgroundFitRulesFile(
    perkGroupRulesFileSource,
    perkGroupDefinitions,
    { diagnostics, sourceFilePath: toPosixRelativePath(perkGroupRulesFilePath) },
  )
  const backgroundFitBackgrounds = buildBackgroundFitBackgrounds(
    backgrounds,
    perkGroupDefinitions,
    baseAttributeRangeDefinitions.defaultRanges,
    baseAttributeRangeDefinitions.femaleModifierRanges,
  )

  const scenarios = scenarioFileEntries
    .map((scenarioFileEntry) =>
      parseScenarioHookFile(
        scenarioFileEntry.fileSource,
        scenarioFileEntry.sourceFilePath,
        diagnostics,
      ),
    )
    .filter((scenario): scenario is ScenarioDefinition => scenario !== null)

  const placementsByPerkConstName = new Map<string, LegendsPerkPlacement[]>()

  for (const perkGroupDefinition of perkGroupDefinitions.values()) {
    for (const [tierIndex, perkConstNames] of perkGroupDefinition.perkConstNamesByTier.entries()) {
      const tier = tierIndex + 1

      for (const perkConstName of perkConstNames) {
        let placements = placementsByPerkConstName.get(perkConstName)

        if (!placements) {
          placements = []
          placementsByPerkConstName.set(perkConstName, placements)
        }

        placements.push({
          categoryName: perkGroupDefinition.categoryName ?? 'Other',
          tier,
          perkGroupIconPath: perkGroupDefinition.iconPath ?? null,
          perkGroupId: perkGroupDefinition.id,
          perkGroupName: perkGroupDefinition.name,
        })
      }
    }
  }

  const scenarioSourcesByPerkConstName = new Map<string, ScenarioSourceDefinition[]>()

  function addScenarioSource(
    perkConstName: string,
    scenarioSource: ScenarioSourceDefinition,
  ): void {
    let scenarioSources = scenarioSourcesByPerkConstName.get(perkConstName)

    if (!scenarioSources) {
      scenarioSources = []
      scenarioSourcesByPerkConstName.set(perkConstName, scenarioSources)
    }

    scenarioSources.push(scenarioSource)
  }

  for (const scenario of scenarios) {
    for (const perkConstName of scenario.directPerkConstNames) {
      addScenarioSource(perkConstName, {
        candidatePerkConstNames: [perkConstName],
        grantType: 'direct',
        scenarioId: scenario.scenarioIdentifier,
        scenarioName: scenario.scenarioName,
        sourceFilePath: scenario.sourceFilePath,
        sourceMethodName: 'direct grant',
      })
    }

    for (const overlayDefinition of scenario.overlayDefinitions) {
      for (const perkConstName of overlayDefinition.candidatePerkConstNames) {
        addScenarioSource(perkConstName, {
          candidatePerkConstNames: overlayDefinition.candidatePerkConstNames,
          grantType: overlayDefinition.grantType,
          scenarioId: scenario.scenarioIdentifier,
          scenarioName: scenario.scenarioName,
          sourceFilePath: scenario.sourceFilePath,
          sourceMethodName: overlayDefinition.sourceMethodName,
        })
      }
    }
  }

  const perkRecords: LegendsPerkRecord[] = []

  for (const perkDefinition of perkDefinitions.values()) {
    const perkName = resolvePerkName(perkDefinition, perkStringData)
    const descriptionSourceText = perkDefinition.descriptionConstName
      ? (perkStringData.descriptionsByConstName.get(perkDefinition.descriptionConstName) ?? '')
      : ''
    const descriptionParagraphs = splitDescriptionParagraphs(descriptionSourceText)
    const placements = (placementsByPerkConstName.get(perkDefinition.constName) ?? [])
      .filter((placement, index, placementsList) => {
        const key = `${placement.categoryName}::${placement.perkGroupId}::${placement.tier}`
        return (
          placementsList.findIndex(
            (candidate) =>
              `${candidate.categoryName}::${candidate.perkGroupId}::${candidate.tier}` === key,
          ) === index
        )
      })
      .toSorted((leftPlacement, rightPlacement) =>
        comparePlacements(leftPlacement, rightPlacement, categoryOrder),
      )
    const categoryNames = sortUniqueStrings(
      placements.length > 0 ? placements.map((placement) => placement.categoryName) : ['Other'],
    )
    const primaryCategoryName =
      categoryNames.toSorted(
        (leftCategoryName, rightCategoryName) =>
          getCategoryPriority(categoryOrder, leftCategoryName) -
            getCategoryPriority(categoryOrder, rightCategoryName) ||
          leftCategoryName.localeCompare(rightCategoryName),
      )[0] ?? 'Other'
    const favouredEnemyTargets = buildFavouredEnemyTargets(
      perkDefinition.constName,
      favouredEnemyConfig.targetConstNamesByPerkConstName,
      favouredEnemyConfig.killsPerPercentBonusByEntityConstName,
      entityNamesByConstName,
    )
    const scenarioSources = (scenarioSourcesByPerkConstName.get(perkDefinition.constName) ?? [])
      .filter((scenarioSource, index, scenarioSourcesList) => {
        const key = `${scenarioSource.scenarioId}::${scenarioSource.grantType}::${scenarioSource.sourceMethodName}::${scenarioSource.candidatePerkConstNames.join(',')}`
        return (
          scenarioSourcesList.findIndex(
            (candidate) =>
              `${candidate.scenarioId}::${candidate.grantType}::${candidate.sourceMethodName}::${candidate.candidatePerkConstNames.join(',')}` ===
              key,
          ) === index
        )
      })
      .toSorted(compareScenarioSources)
      .map((scenarioSource) => ({
        candidatePerkNames: scenarioSource.candidatePerkConstNames
          .map((candidatePerkConstName) => {
            const candidatePerkDefinition = perkDefinitions.get(candidatePerkConstName)

            return candidatePerkDefinition
              ? resolvePerkName(candidatePerkDefinition, perkStringData)
              : prettifyIdentifier(candidatePerkConstName)
          })
          .filter(Boolean),
        grantType: scenarioSource.grantType,
        scenarioId: scenarioSource.scenarioId,
        scenarioName: scenarioSource.scenarioName,
        sourceMethodName: scenarioSource.sourceMethodName,
      }))

    const perkRecord: LegendsPerkRecord = {
      backgroundSources: [],
      descriptionParagraphs,
      favouredEnemyTargets: favouredEnemyTargets.length > 0 ? favouredEnemyTargets : undefined,
      categoryNames,
      iconPath: perkDefinition.iconPath ?? null,
      id: perkDefinition.identifier,
      perkConstName: perkDefinition.constName,
      perkName,
      placements,
      primaryCategoryName,
      scenarioSources,
      searchText: '',
    }

    perkRecords.push(perkRecord)
  }

  const backgroundPerkGroupProbabilityContext = createBackgroundPerkGroupProbabilityContext({
    perks: perkRecords.map(createBackgroundFitPerkRecord),
    rules: backgroundFitRules,
  })
  const probabilitiesByBackgroundId = new Map(
    backgroundFitBackgrounds.map((backgroundDefinition) => [
      backgroundDefinition.backgroundId,
      calculateBackgroundPerkGroupProbabilities(
        backgroundDefinition,
        backgroundPerkGroupProbabilityContext,
      ),
    ]),
  )

  for (const perkRecord of perkRecords) {
    perkRecord.backgroundSources = getPerkBackgroundSources({
      backgroundFitBackgrounds,
      perkRecord,
      probabilitiesByBackgroundId,
    })
    perkRecord.searchText = buildSearchText(perkRecord)
  }

  const uniquePerkGroupIdentifiers = new Set(
    perkRecords.flatMap((perkRecord) =>
      perkRecord.placements.map((placement) => placement.perkGroupId),
    ),
  )

  const sourceFiles: LegendsPerksDataset['sourceFiles'] = [
    { path: toPosixRelativePath(perkDefinitionsFilePath), role: 'perk definitions' },
    ...perkStringFileEntries.map((perkStringFileEntry) => ({
      path: perkStringFileEntry.sourceFilePath,
      role: 'perk strings',
    })),
    { path: toPosixRelativePath(entityNamesFilePath), role: 'entity names' },
    { path: toPosixRelativePath(categoryOrderFilePath), role: 'perk category order' },
    { path: toPosixRelativePath(favouredEnemyConfigFilePath), role: 'favoured enemy metadata' },
    ...(backgroundTypeMetadataFileSource === null
      ? []
      : [
          {
            path: toPosixRelativePath(backgroundTypeMetadataFilePath),
            role: 'background type metadata',
          },
        ]),
    ...(resourceModifierValuesFileSource === null
      ? []
      : [
          {
            path: toPosixRelativePath(resourceModifierValuesFilePath),
            role: 'camp resource modifier metadata',
          },
        ]),
    { path: toPosixRelativePath(perkGroupRulesFilePath), role: 'background fit rules' },
    ...(playerHookFileSource === null
      ? []
      : [
          {
            path: toPosixRelativePath(playerHookFilePath),
            role: 'veteran perk default',
          },
        ]),
    ...(characterBackgroundReferencesFileSource
      ? [
          {
            path: toPosixRelativePath(characterBackgroundReferencesFilePath),
            role: 'playable background references',
          },
        ]
      : []),
    { path: toPosixRelativePath(characterBackgroundFilePath), role: 'background defaults' },
    ...treeFileEntries.map((treeFileEntry) => ({
      path: treeFileEntry.sourceFilePath,
      role: 'perk groups',
    })),
    ...[...hookBackgroundFileEntries, ...scriptBackgroundFileEntries].map(
      (backgroundFileEntry) => ({
        path: backgroundFileEntry.sourceFilePath,
        role: 'background dynamic pools',
      }),
    ),
    ...traitFileEntries.map((traitFileEntry) => ({
      path: traitFileEntry.sourceFilePath,
      role: 'trait metadata',
    })),
    {
      path: toPosixRelativePath(vanillaTraitMetadataFilePath),
      role: 'vanilla trait metadata',
    },
    ...scenarioVeteranPerkFileEntries.map((scenarioFileEntry) => ({
      path: scenarioFileEntry.sourceFilePath,
      role: 'scenario perk sources',
    })),
  ]
    .filter(
      (sourceFile, index, sourceFilesList) =>
        sourceFilesList.findIndex((candidate) => candidate.path === sourceFile.path) === index,
    )
    .toSorted((leftSourceFile, rightSourceFile) =>
      leftSourceFile.path.localeCompare(rightSourceFile.path),
    )

  return {
    backgroundFitBackgrounds,
    backgroundFitRules,
    generatedAt: new Date().toISOString(),
    perkCount: perkRecords.length,
    perks: perkRecords.toSorted((leftPerk, rightPerk) =>
      leftPerk.perkName.localeCompare(rightPerk.perkName),
    ),
    referenceRoot: toPosixRelativePath(referenceRootDirectoryPath),
    referenceVersion:
      options.referenceVersion ??
      (await readReferenceVersionFromMetadata(referenceRootDirectoryPath)) ??
      getReferenceVersion(referenceRootDirectoryPath),
    sourceFiles,
    perkGroupCount: uniquePerkGroupIdentifiers.size,
  }
}

const defaultDatasetOutputDirectoryPath = path.join(projectRootDirectoryPath, 'src', 'data')

function getMapValueOrThrow<Key, Value>(
  valuesByKey: Map<Key, Value>,
  key: Key,
  description: string,
): Value {
  const value = valuesByKey.get(key)

  if (value === undefined) {
    throw new Error(`Unable to resolve ${description}: ${String(key)}`)
  }

  return value
}

function createPerkCatalogRecord({
  categoryNames,
  descriptionParagraphs,
  favouredEnemyTargets,
  iconPath,
  id,
  perkName,
  placements,
  primaryCategoryName,
  scenarioSources,
}: LegendsPerkRecord): LegendsPerkCatalogRecord {
  return {
    categoryNames,
    descriptionParagraphs,
    ...(favouredEnemyTargets ? { favouredEnemyTargets } : {}),
    iconPath,
    id,
    perkName,
    placements,
    primaryCategoryName,
    scenarioSources,
  }
}

function createPerkBackgroundSourceTable(
  perks: LegendsPerkRecord[],
): LegendsPerkCatalogBackgroundSourceTable {
  const backgroundNames = sortUniqueStrings(
    perks.flatMap((perk) =>
      perk.backgroundSources.map((backgroundSource) => backgroundSource.backgroundName),
    ),
  )
  const perkGroupIds = sortUniqueStrings(
    perks.flatMap((perk) =>
      perk.backgroundSources.map((backgroundSource) => backgroundSource.perkGroupId),
    ),
  )
  const probabilities = [
    ...new Set(
      perks.flatMap((perk) =>
        perk.backgroundSources.map((backgroundSource) => backgroundSource.probability),
      ),
    ),
  ].toSorted((leftProbability, rightProbability) => rightProbability - leftProbability)
  const backgroundNameIndexByName = new Map(
    backgroundNames.map((backgroundName, backgroundNameIndex) => [
      backgroundName,
      backgroundNameIndex,
    ]),
  )
  const perkGroupIdIndexById = new Map(
    perkGroupIds.map((perkGroupId, perkGroupIdIndex) => [perkGroupId, perkGroupIdIndex]),
  )
  const probabilityIndexByValue = new Map(
    probabilities.map((probability, probabilityIndex) => [probability, probabilityIndex]),
  )
  const perkSourceEntriesByPerkId: Array<[string, number[][]]> = perks
    .map((perk): [string, number[][]] => [
      perk.id,
      perk.backgroundSources.map((backgroundSource) => [
        getMapValueOrThrow(
          backgroundNameIndexByName,
          backgroundSource.backgroundName,
          'background source name index',
        ),
        getMapValueOrThrow(
          perkGroupIdIndexById,
          backgroundSource.perkGroupId,
          'perk group source index',
        ),
        getMapValueOrThrow(
          probabilityIndexByValue,
          backgroundSource.probability,
          'background source probability index',
        ),
      ]),
    ])
    .filter(([, backgroundSources]) => backgroundSources.length > 0)
  const perkSourcesByPerkId: LegendsPerkCatalogBackgroundSourceTable['perkSourcesByPerkId'] =
    Object.fromEntries(perkSourceEntriesByPerkId)

  return {
    backgroundNames,
    perkGroupIds,
    perkSourcesByPerkId,
    probabilities,
  }
}

function createPerkCatalogDataset(dataset: LegendsPerksDataset): LegendsPerkCatalogDataset {
  return {
    backgroundSourceTable: createPerkBackgroundSourceTable(dataset.perks),
    referenceVersion: dataset.referenceVersion,
    perks: dataset.perks.map(createPerkCatalogRecord),
  }
}

function createBackgroundFitPerkRecord({
  iconPath,
  id,
  perkName,
  placements,
}: LegendsPerkRecord): LegendsBackgroundFitPerkRecord {
  return {
    iconPath,
    id,
    perkName,
    placements,
  }
}

function createBackgroundFitDataset(dataset: LegendsPerksDataset): LegendsBackgroundFitDataset {
  return {
    backgroundFitBackgrounds: dataset.backgroundFitBackgrounds,
    backgroundFitRules: dataset.backgroundFitRules,
    referenceVersion: dataset.referenceVersion,
    perks: dataset.perks.map(createBackgroundFitPerkRecord),
  }
}

function createPlannerMetadataDataset(dataset: LegendsPerksDataset): LegendsPlannerMetadataDataset {
  return {
    availableBackgroundVeteranPerkLevelIntervals: getAvailableBackgroundVeteranPerkLevelIntervals(
      dataset.backgroundFitBackgrounds,
    ),
    backgroundUrlOptions: dataset.backgroundFitBackgrounds.map(
      ({ backgroundId, sourceFilePath }) => ({
        backgroundId,
        sourceFilePath,
      }),
    ),
    referenceVersion: dataset.referenceVersion,
  }
}

async function writeJsonFile(outputFilePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(outputFilePath), { recursive: true })
  await writeFile(outputFilePath, `${JSON.stringify(value)}\n`, 'utf8')
}

export async function writeDatasetFile(
  dataset: LegendsPerksDataset,
  outputDirectoryPath = defaultDatasetOutputDirectoryPath,
): Promise<void> {
  await Promise.all([
    writeJsonFile(
      path.join(outputDirectoryPath, 'legends-background-fit.json'),
      createBackgroundFitDataset(dataset),
    ),
    writeJsonFile(
      path.join(outputDirectoryPath, 'legends-perk-catalog.json'),
      createPerkCatalogDataset(dataset),
    ),
    writeJsonFile(
      path.join(outputDirectoryPath, 'legends-planner-metadata.json'),
      createPlannerMetadataDataset(dataset),
    ),
  ])
}
