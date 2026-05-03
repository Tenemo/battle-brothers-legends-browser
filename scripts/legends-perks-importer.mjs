import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defaultLegendsReferenceDirectoryPath } from './ensure-legends-reference.mjs'
import {
  dynamicBackgroundCategoryChanceKeys,
  dynamicBackgroundCategoryMinimumKeys,
  dynamicBackgroundCategoryNames,
  dynamicBackgroundCategoryOrder,
} from '../src/lib/dynamic-background-categories.ts'
import { isOriginBackgroundSourceLabel } from '../src/lib/background-origin.ts'
import {
  SquirrelSubsetParser,
  collectTopLevelStatements,
  parseSquirrelValue,
  splitTopLevelCommaSeparated,
  unwrapArray,
  unwrapCall,
  unwrapReference,
  unwrapTable,
} from './squirrel-subset-parser.mjs'
import { sortUniqueStrings } from './script-utils.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRootDirectoryPath = path.resolve(__dirname, '..')

export const defaultReferenceRootDirectoryPath = defaultLegendsReferenceDirectoryPath

const defaultCategoryOrder = [...dynamicBackgroundCategoryOrder]
const fallbackVeteranPerkLevelInterval = 4

export function createImporterDiagnostics() {
  return {
    warnings: [],
  }
}

function summarizeDiagnosticSource(source) {
  return source.replace(/\s+/g, ' ').trim().slice(0, 180)
}

function describeDiagnosticError(error) {
  return error instanceof Error ? error.message : String(error)
}

function addImporterParseWarning(diagnosticContext, parserContext, source, error) {
  if (!diagnosticContext?.diagnostics) {
    return
  }

  // Keep unsupported Squirrel fragments non-fatal while making skipped parsing visible during sync.
  diagnosticContext.diagnostics.warnings.push({
    kind: 'parse-warning',
    message: `Unable to parse ${parserContext}.`,
    parserContext,
    source: summarizeDiagnosticSource(source),
    sourceFilePath: diagnosticContext.sourceFilePath ?? null,
    errorMessage: describeDiagnosticError(error),
  })
}

const favouredEnemyPerkConstByArrayName = {
  FavoriteBeast: 'LegendFavouredEnemyBeast',
  FavoriteCivilization: 'LegendFavouredEnemyCivilization',
  FavoriteGreenSkins: 'LegendFavouredEnemyGreenskin',
  FavoriteOccult: 'LegendFavouredEnemyOccult',
  FavoriteOutlaw: 'LegendFavouredEnemyOutlaw',
  FavoriteSwordmaster: 'LegendFavouredEnemySwordmaster',
  FavoriteUndead: 'LegendFavouredEnemyUndead',
}

const fallbackPerkNamesByIdentifier = {
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

const backgroundCampResourceModifierGroupsByKey = {
  Ammo: 'capacity',
  ArmorParts: 'capacity',
  Meds: 'capacity',
  Stash: 'capacity',
  Terrain: 'terrain',
}

const backgroundCampResourceModifierLabelsByKey = {
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

const backgroundTerrainLabelsByIndex = {
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

const backgroundTalentAttributeLabelsByConstName = {
  Bravery: 'Resolve',
  Fatigue: 'Fatigue',
  Hitpoints: 'Hitpoints',
  Initiative: 'Initiative',
  MeleeDefense: 'Melee defense',
  MeleeSkill: 'Melee skill',
  RangedDefense: 'Ranged defense',
  RangedSkill: 'Ranged skill',
}

function normalizeWhitespace(value) {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

function toPosixRelativePath(absolutePath) {
  return path.relative(projectRootDirectoryPath, absolutePath).replaceAll('\\', '/')
}

function getReferenceVersion(referenceRootDirectoryPath) {
  return path.basename(path.dirname(referenceRootDirectoryPath))
}

async function readReferenceVersionFromMetadata(referenceRootDirectoryPath) {
  const metadataFilePath = path.join(
    path.dirname(referenceRootDirectoryPath),
    'reference-metadata.json',
  )

  try {
    const referenceMetadata = JSON.parse(await readFile(metadataFilePath, 'utf8'))
    return typeof referenceMetadata.tagName === 'string' ? referenceMetadata.tagName : null
  } catch {
    return null
  }
}

async function readFileIfExists(filePath) {
  try {
    return await readFile(filePath, 'utf8')
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null
    }

    throw error
  }
}

async function readDirectoryNamesIfExists(directoryPath) {
  try {
    return await readdir(directoryPath, { withFileTypes: true })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return []
    }

    throw error
  }
}

async function collectNutFileEntriesRecursively(directoryPath) {
  const nutFileEntries = []
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

function getLastPathSegment(value) {
  return value.split('.').at(-1) ?? value
}

function getBackgroundScriptIdFromSourceFilePath(sourceFilePath) {
  return path.basename(sourceFilePath, path.extname(sourceFilePath))
}

function getScriptsRootDirectoryPath(referenceRootDirectoryPath) {
  return path.join(path.dirname(referenceRootDirectoryPath), 'scripts')
}

function normalizeConstReference(reference) {
  if (reference.startsWith('this.Const.')) {
    return `::Const.${reference.slice('this.Const.'.length)}`
  }

  return reference
}

function stripSquirrelComments(source) {
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

function prettifyIdentifier(value) {
  return normalizeWhitespace(
    value
      .replace(/^Legend/, 'Legend ')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' '),
  )
}

function resolveFallbackPerkName(perkIdentifier, perkConstName) {
  return fallbackPerkNamesByIdentifier[perkIdentifier] ?? prettifyIdentifier(perkConstName)
}

function resolvePerkName(perkDefinition, perkStringData) {
  return (
    (perkDefinition.nameConstName
      ? perkStringData.namesByConstName.get(perkDefinition.nameConstName)
      : null) ?? resolveFallbackPerkName(perkDefinition.identifier, perkDefinition.constName)
  )
}

function cleanRichText(value) {
  return normalizeWhitespace(
    value
      .replace(/\r/g, '')
      .replace(/\[(?:\/)?[^\]]+\]/g, '')
      .replace(/%[A-Za-z_]+%/g, '')
      .replace(/&nbsp;/gi, ' '),
  )
}

function splitDescriptionParagraphs(value) {
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

function getCategoryPriority(categoryOrder, categoryName) {
  const priority = categoryOrder.indexOf(categoryName)
  return priority === -1 ? Number.POSITIVE_INFINITY : priority
}

function asPrimitiveValue(value, localValues = new Map()) {
  const localReference = unwrapReference(value)

  if (localReference !== null && localValues.has(localReference)) {
    return localValues.get(localReference)
  }

  return value
}

function tableEntriesToMap(tableValue, localValues = new Map()) {
  const table = unwrapTable(asPrimitiveValue(tableValue, localValues))

  if (table === null) {
    return new Map()
  }

  const entries = new Map()

  for (const entry of table.entries) {
    if (entry.type !== 'property') {
      continue
    }

    entries.set(entry.key, asPrimitiveValue(entry.value, localValues))
  }

  return entries
}

function arrayValues(value, localValues = new Map()) {
  const arrayValue = unwrapArray(asPrimitiveValue(value, localValues))
  return arrayValue === null
    ? []
    : arrayValue.values.map((item) => asPrimitiveValue(item, localValues))
}

function stringValue(value, localValues = new Map()) {
  const resolvedValue = asPrimitiveValue(value, localValues)
  return typeof resolvedValue === 'string' ? resolvedValue : null
}

function numberValue(value, localValues = new Map()) {
  const resolvedValue = asPrimitiveValue(value, localValues)
  return typeof resolvedValue === 'number' && Number.isFinite(resolvedValue) ? resolvedValue : null
}

function referenceValue(value, localValues = new Map()) {
  return unwrapReference(asPrimitiveValue(value, localValues))
}

function stringArrayValue(value, localValues = new Map()) {
  return arrayValues(value, localValues)
    .map((item) => stringValue(item, localValues))
    .filter((item) => item !== null)
}

function numberArrayValue(value, localValues = new Map()) {
  return arrayValues(value, localValues)
    .map((item) => numberValue(item, localValues))
    .filter((item) => item !== null)
}

function referenceArrayValue(value, localValues = new Map()) {
  return arrayValues(value, localValues)
    .map((item) => referenceValue(item, localValues))
    .filter((item) => item !== null)
}

function resolveReferenceConstName(reference) {
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

function escapeForRegularExpression(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function extractAssignedValue(source, assignmentTarget, diagnosticContext = null) {
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

function extractNumericOperations(source, assignmentPrefix) {
  const pattern = new RegExp(
    `${escapeForRegularExpression(assignmentPrefix)}([A-Za-z0-9_]+)\\s*(\\+=|-=|=)\\s*([+-]?(?:\\d+\\.\\d+|\\d+|\\.\\d+))\\s*;`,
    'g',
  )
  const operations = []

  for (const match of source.matchAll(pattern)) {
    operations.push({
      key: match[1],
      operator: match[2],
      value: Number(match[3]),
    })
  }

  return operations
}

function findTopLevelStatementEnd(source, startIndex) {
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

function extractAssignmentExpressionSource(source, assignmentTarget) {
  const pattern = new RegExp(`${escapeForRegularExpression(assignmentTarget)}\\s*(?:<-|=)\\s*`, 'g')
  const match = pattern.exec(source)

  if (!match) {
    return null
  }

  const valueStartIndex = match.index + match[0].length
  const valueEndIndex = findTopLevelStatementEnd(source, valueStartIndex)
  return source.slice(valueStartIndex, valueEndIndex).trim()
}

function parseResourceModifierReference(reference) {
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

function resolveResourceModifierValue(value, resourceModifierValuesByKey) {
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

function cloneBackgroundModifiers(modifiers) {
  return Object.fromEntries(
    Object.entries(modifiers).map(([modifierKey, modifierValue]) => [
      modifierKey,
      Array.isArray(modifierValue) ? [...modifierValue] : modifierValue,
    ]),
  )
}

function cloneBackgroundDefinitionMetadata(backgroundDefinition) {
  return {
    backgroundTypeNames: [...backgroundDefinition.backgroundTypeNames],
    campResourceModifiers: backgroundDefinition.campResourceModifiers.map((modifier) => ({
      ...modifier,
    })),
    dailyCost: backgroundDefinition.dailyCost,
    excludedTalentAttributeNames: [...backgroundDefinition.excludedTalentAttributeNames],
    excludedTraitNames: [...backgroundDefinition.excludedTraitNames],
    guaranteedTraitNames: [...backgroundDefinition.guaranteedTraitNames],
    modifiers: cloneBackgroundModifiers(backgroundDefinition.modifiers),
  }
}

function getBackgroundCampResourceModifierGroup(modifierKey) {
  return backgroundCampResourceModifierGroupsByKey[modifierKey] ?? 'skill'
}

function getBackgroundCampResourceModifierValueKind(modifierKey) {
  return getBackgroundCampResourceModifierGroup(modifierKey) === 'capacity' ? 'flat' : 'percent'
}

function getBackgroundCampResourceModifierOrder(modifierKey) {
  const baseKey = modifierKey.split('.')[0]
  const order = backgroundCampResourceModifierOrder.indexOf(baseKey)
  return order === -1 ? Number.POSITIVE_INFINITY : order
}

function getBackgroundCampResourceModifierDetailOrder(modifierKey) {
  const [, detailKey] = modifierKey.split('.')
  const detailOrder = detailKey === undefined ? 0 : Number(detailKey)
  return Number.isFinite(detailOrder) ? detailOrder : Number.POSITIVE_INFINITY
}

function buildBackgroundCampResourceModifiers(modifiers) {
  const resourceModifiers = []

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

function parseResourceModifierValuesFile(fileSource) {
  const resourceModifierValuesByKey = new Map()
  const resourceModifierAssignment = collectTopLevelStatements(fileSource).find(
    (statement) =>
      statement.type === 'assignment' && statement.target === '::Const.LegendMod.ResourceModifiers',
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

function parseBackgroundTypeMetadataFile(fileSource) {
  const backgroundTypeNamesByKey = new Map()
  const backgroundTypeValuesByKey = new Map()

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

function resolveBackgroundTypeConstKey(reference) {
  const normalizedReference = normalizeConstReference(reference)
  const match = /^::Const\.BackgroundType\.([A-Za-z0-9_]+)$/u.exec(normalizedReference)
  return match?.[1] ?? null
}

function parseBackgroundTypeExpression(expressionSource) {
  return expressionSource
    .split('|')
    .map((expressionPart) => resolveBackgroundTypeConstKey(expressionPart.trim()))
    .filter((typeKey) => typeKey !== null)
}

function resolveBackgroundTypeNames(typeKeys, backgroundTypeMetadata) {
  return sortUniqueStrings(
    typeKeys.map(
      (typeKey) =>
        backgroundTypeMetadata.backgroundTypeNamesByKey.get(typeKey) ?? prettifyIdentifier(typeKey),
    ),
  )
}

function applyBackgroundTypeOperation(typeKeys, operationType, nextTypeKey) {
  if (nextTypeKey === 'None') {
    return operationType === 'set' ? ['None'] : typeKeys
  }

  const nextTypeKeys = typeKeys.filter((typeKey) => typeKey !== 'None')

  if (operationType === 'remove') {
    return nextTypeKeys.filter((typeKey) => typeKey !== nextTypeKey)
  }

  return nextTypeKeys.includes(nextTypeKey) ? nextTypeKeys : [...nextTypeKeys, nextTypeKey]
}

function applyCreateBodyBackgroundTypeOperations(typeKeys, createBody) {
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
}) {
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

function parseBaseBackgroundModifiers(fileSource, resourceModifierValuesByKey, diagnosticContext) {
  const modifiersValue = extractAssignedValue(fileSource, 'o.m.Modifiers', diagnosticContext)
  const modifiers = {}

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

function parseModifierAssignmentValue(valueSource, diagnosticContext) {
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
}) {
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

function resolveTraitConstNameFromValue(value) {
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

function resolveTraitName(traitReference, traitMetadata) {
  if (traitReference === null) {
    return null
  }

  if (traitMetadata.traitNamesByConstName.has(traitReference)) {
    return traitMetadata.traitNamesByConstName.get(traitReference)
  }

  if (traitMetadata.traitNamesByScriptId.has(traitReference)) {
    return traitMetadata.traitNamesByScriptId.get(traitReference)
  }

  return prettifyIdentifier(traitReference.replace(/_trait$/u, ''))
}

function parseTraitNamesFromArrayValue(value, traitMetadata) {
  return sortUniqueStrings(
    arrayValues(value)
      .map((item) => {
        const traitConstName = resolveTraitConstNameFromValue(item)

        if (traitConstName !== null) {
          return resolveTraitName(traitConstName, traitMetadata)
        }

        return resolveTraitName(stringValue(item), traitMetadata)
      })
      .filter((traitName) => traitName !== null),
  )
}

function parseGuaranteedTraitNamesFromSource(source, traitMetadata, diagnosticContext) {
  const traitNames = []

  for (const argumentList of extractCallArgumentLists(source, '::Legends.Traits.grant')) {
    const traitArgumentSource = argumentList[1]

    if (!traitArgumentSource) {
      continue
    }

    try {
      const traitConstName = resolveTraitConstNameFromValue(
        parseSquirrelValue(traitArgumentSource).value,
      )
      const traitName = resolveTraitName(traitConstName, traitMetadata)

      if (traitName !== null) {
        traitNames.push(traitName)
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

  return traitNames
}

function parseExcludedTalentAttributeNames(value) {
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

function parseTraitMetadataFileEntries(traitFileEntries) {
  const traitNamesByConstName = new Map()
  const traitNamesByScriptId = new Map()

  for (const traitFileEntry of traitFileEntries) {
    const uncommentedFileSource = stripSquirrelComments(traitFileEntry.fileSource)
    const traitConstName = resolveTraitConstNameFromValue(
      extractAssignedValue(uncommentedFileSource, 'this.m.ID'),
    )
    const traitName = stringValue(extractAssignedValue(uncommentedFileSource, 'this.m.Name'))
    const traitScriptId = path.posix.basename(
      traitFileEntry.sourceFilePath,
      path.posix.extname(traitFileEntry.sourceFilePath),
    )

    if (traitName === null) {
      continue
    }

    traitNamesByScriptId.set(traitScriptId, traitName)

    if (traitConstName !== null) {
      traitNamesByConstName.set(traitConstName, traitName)
    }
  }

  return {
    traitNamesByConstName,
    traitNamesByScriptId,
  }
}

function createBackgroundMetadataDefaults({
  backgroundTypeMetadata,
  characterBackgroundFileSource,
  diagnostics,
  resourceModifierValuesByKey,
  sourceFilePath,
}) {
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
    excludedTraitNames: [],
    guaranteedTraitNames: [],
    modifiers,
  }
}

function normalizeVeteranPerkLevelInterval(value) {
  return Number.isInteger(value) && value > 0 ? value : null
}

function extractSetVeteranPerksInterval(source, diagnosticContext = null) {
  const intervals = []

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

function parseDefaultVeteranPerkLevelInterval(fileSource, diagnosticContext = null) {
  const interval = normalizeVeteranPerkLevelInterval(
    numberValue(extractAssignedValue(fileSource, 'o.m.VeteranPerks', diagnosticContext)),
  )

  return interval ?? fallbackVeteranPerkLevelInterval
}

function extractCallArgumentLists(source, callee) {
  const argumentLists = []
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

function normalizeActorReceiver(receiver) {
  return receiver.replace(/\s+/g, '')
}

function extractActorReceiverAliases(source) {
  const aliases = new Map()
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

function resolveActorReceiverAlias(receiver, receiverAliases) {
  let resolvedReceiver = normalizeActorReceiver(receiver)
  const visitedReceivers = new Set()

  while (receiverAliases.has(resolvedReceiver) && !visitedReceivers.has(resolvedReceiver)) {
    visitedReceivers.add(resolvedReceiver)
    resolvedReceiver = receiverAliases.get(resolvedReceiver)
  }

  return resolvedReceiver
}

function extractReceiverMethodCallArgumentLists(source, methodName, diagnosticContext = null) {
  const calls = []
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

function collectPlayerTraitReceivers(source) {
  const receivers = new Set()

  for (const argumentList of extractCallArgumentLists(source, '::Legends.Traits.grant')) {
    const receiver = argumentList[0]
    const trait = argumentList[1]

    if (receiver && trait && /(?:^|\.)Player\b/.test(trait)) {
      receivers.add(normalizeActorReceiver(receiver))
    }
  }

  return receivers
}

function collectPlayerCharacterFlagReceivers(source) {
  const receivers = new Set()
  const pattern =
    /((?:[A-Za-z_][A-Za-z0-9_]*)(?:\s*\[[^\]]+\])?)\s*\.\s*getFlags\s*\(\s*\)\s*\.\s*set\s*\(\s*"IsPlayerCharacter"\s*,\s*true\s*\)/g

  for (const match of source.matchAll(pattern)) {
    receivers.add(normalizeActorReceiver(match[1]))
  }

  return receivers
}

function extractLocalAssignments(source, diagnosticContext = null) {
  const assignments = new Map()
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

function parseCategoryOrderFile(fileSource) {
  const statements = collectTopLevelStatements(fileSource)
  const orderAssignment = statements.find(
    (statement) =>
      statement.type === 'assignment' &&
      statement.target === '::Legends.Perks.PerkGroupCategoriesOrder',
  )

  if (!orderAssignment) {
    return defaultCategoryOrder
  }

  const categoryNames = stringArrayValue(orderAssignment.value)
  return categoryNames.length > 0 ? categoryNames : defaultCategoryOrder
}

function parsePerkStringsFile(fileSource) {
  const descriptionsByConstName = new Map()
  const namesByConstName = new Map()

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

function mergePerkStringData(perkStringDataEntries) {
  const descriptionsByConstName = new Map()
  const namesByConstName = new Map()

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

function parsePerkDefinitionsFile(fileSource, sourceFilePath) {
  const perkDefinitions = new Map()

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

function parsePerkGroupConfigFile(fileSource, sourceFilePath) {
  const localValues = new Map()
  const categoryDefinitions = []
  const perkGroupDefinitions = []

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

function parseEntityNamesFile(fileSource) {
  const entityNamesByConstName = new Map()

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

function parseFavouredEnemyConfigFile(fileSource) {
  const targetConstNamesByPerkConstName = new Map()
  const killsPerPercentBonusByEntityConstName = new Map()

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

function readFunctionAssignmentBody(wrapperStatements, assignmentTarget) {
  const assignment = wrapperStatements.find(
    (statement) =>
      statement.type === 'assignment' &&
      statement.target === assignmentTarget &&
      typeof statement.value === 'object' &&
      statement.value !== null &&
      statement.value.type === 'function',
  )

  return assignment?.value ?? null
}

function extractHookWrapperFunction(fileSource) {
  const wrapperStatement = collectTopLevelStatements(fileSource).find(
    (statement) =>
      statement.type === 'expression' &&
      unwrapCall(statement.expression)?.callee?.startsWith('::mods_hook') &&
      unwrapCall(statement.expression)?.arguments?.[1]?.type === 'function',
  )

  const wrapperFunction = unwrapCall(wrapperStatement?.expression)?.arguments?.[1]
  return wrapperFunction && wrapperFunction.type === 'function' ? wrapperFunction : null
}

function resolveMinimumValue(backgroundMinimums, categoryName) {
  const key = dynamicBackgroundCategoryMinimumKeys[categoryName]
  return key ? (backgroundMinimums[key] ?? null) : null
}

function resolveChanceValue(backgroundMinimums, categoryName) {
  const key = dynamicBackgroundCategoryChanceKeys[categoryName]
  return key ? (backgroundMinimums[key] ?? null) : null
}

function cloneMinimums(minimums) {
  return Object.fromEntries(Object.entries(minimums).map(([key, value]) => [key, value]))
}

function buildMinimumsObject(tableValue) {
  const entries = tableEntriesToMap(tableValue)
  const minimums = {}

  for (const [key, value] of entries.entries()) {
    const numericValue = numberValue(value)

    if (numericValue !== null) {
      minimums[key] = numericValue
    }
  }

  return minimums
}

function createDefaultBackgroundDefinition(
  backgroundScriptId,
  baseDynamicTreeValue,
  baseMinimums,
  backgroundMetadataDefaults,
  defaultVeteranPerkLevelInterval,
  sourceFilePath,
) {
  return {
    backgroundIdentifier: null,
    backgroundName: null,
    backgroundScriptId,
    dynamicTreeValue: baseDynamicTreeValue,
    iconPath: null,
    ...cloneBackgroundDefinitionMetadata(backgroundMetadataDefaults),
    minimums: cloneMinimums(baseMinimums),
    sourceFilePath,
    veteranPerkLevelInterval: defaultVeteranPerkLevelInterval,
  }
}

function applyBackgroundCreateBody({
  backgroundTypeMetadata,
  backgroundScriptId,
  baseBackgroundDefinition,
  createBody,
  diagnostics,
  metadataSource,
  preferScriptIdWhenIdentifierIsInherited,
  resourceModifierValuesByKey,
  sourceFilePath,
  traitMetadata,
}) {
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
  const excludedTraitNames =
    excludedTraitValue === null
      ? baseBackgroundDefinition.excludedTraitNames
      : parseTraitNamesFromArrayValue(excludedTraitValue, traitMetadata)
  const explicitGuaranteedTraitNames =
    guaranteedTraitValue === null
      ? []
      : parseTraitNamesFromArrayValue(guaranteedTraitValue, traitMetadata)
  const staticGuaranteedTraitNames = parseGuaranteedTraitNamesFromSource(
    uncommentedMetadataSource,
    traitMetadata,
    diagnosticContext,
  )
  const guaranteedTraitNames = sortUniqueStrings([
    ...baseBackgroundDefinition.guaranteedTraitNames,
    ...explicitGuaranteedTraitNames,
    ...staticGuaranteedTraitNames,
  ])
  const excludedTalentAttributeNames =
    excludedTalentAttributeValue === null
      ? baseBackgroundDefinition.excludedTalentAttributeNames
      : parseExcludedTalentAttributeNames(excludedTalentAttributeValue)
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
    backgroundName,
    backgroundScriptId,
    backgroundTypeNames,
    campResourceModifiers: buildBackgroundCampResourceModifiers(modifiers),
    dailyCost,
    dynamicTreeValue,
    excludedTalentAttributeNames,
    excludedTraitNames,
    guaranteedTraitNames,
    iconPath,
    minimums,
    modifiers,
    sourceFilePath,
    veteranPerkLevelInterval: baseBackgroundDefinition.veteranPerkLevelInterval,
  }
}

function parseBackgroundHookFile(
  fileSource,
  sourceFilePath,
  baseDynamicTreeValue,
  baseMinimums,
  backgroundMetadataDefaults,
  backgroundTypeMetadata,
  defaultVeteranPerkLevelInterval,
  diagnostics,
  resourceModifierValuesByKey,
  traitMetadata,
) {
  const wrapperFunction = extractHookWrapperFunction(fileSource)

  if (wrapperFunction === null) {
    return null
  }

  const wrapperStatements = collectTopLevelStatements(wrapperFunction.body)
  const createFunctionLiteral = readFunctionAssignmentBody(wrapperStatements, 'o.create')

  if (createFunctionLiteral === null) {
    return null
  }

  const backgroundDefinition = applyBackgroundCreateBody({
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

function parseBackgroundScriptFileDefinition(fileSource, sourceFilePath) {
  const backgroundScriptId = getBackgroundScriptIdFromSourceFilePath(sourceFilePath)
  const rootAssignment = collectTopLevelStatements(fileSource).find(
    (statement) =>
      statement.type === 'assignment' &&
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
    (entry) => entry.type === 'function-entry' && entry.name === 'create',
  )

  if (!createFunctionEntry) {
    return null
  }

  return {
    backgroundScriptId,
    createBody: createFunctionEntry.body,
    metadataSource: fileSource,
    parentBackgroundScriptId: path.posix.basename(inheritedBackgroundScriptPath),
    sourceFilePath,
    veteranPerkLevelInterval: extractSetVeteranPerksInterval(stripSquirrelComments(fileSource)),
  }
}

function resolveScriptBackgroundDefinitions(
  rawBackgroundDefinitionsByScriptId,
  baseDynamicTreeValue,
  baseMinimums,
  backgroundMetadataDefaults,
  backgroundTypeMetadata,
  defaultVeteranPerkLevelInterval,
  diagnostics,
  resourceModifierValuesByKey,
  traitMetadata,
) {
  const resolvedBackgroundDefinitionsByScriptId = new Map()

  function resolveBackground(backgroundScriptId, resolutionPath = new Set()) {
    if (resolvedBackgroundDefinitionsByScriptId.has(backgroundScriptId)) {
      return resolvedBackgroundDefinitionsByScriptId.get(backgroundScriptId)
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
          backgroundScriptId,
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
      backgroundTypeMetadata,
      backgroundScriptId,
      baseBackgroundDefinition,
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

function parseBackgroundFitRulesFile(fileSource, perkGroupDefinitions, diagnosticContext = null) {
  const dynamicPerkTreeAssignment = collectTopLevelStatements(fileSource).find(
    (statement) =>
      statement.type === 'assignment' &&
      statement.target === '::Const.Perks.GetDynamicPerkTree' &&
      typeof statement.value === 'object' &&
      statement.value !== null &&
      statement.value.type === 'function',
  )

  if (!dynamicPerkTreeAssignment || dynamicPerkTreeAssignment.value.type !== 'function') {
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

function buildBackgroundFitBackgrounds(backgrounds, perkGroupDefinitions) {
  return backgrounds
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
        excludedTraitNames: background.excludedTraitNames,
        guaranteedTraitNames: background.guaranteedTraitNames,
        iconPath: background.iconPath,
        sourceFilePath: background.sourceFilePath,
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
  backgroundScriptIdsByReference,
  reference,
  backgroundScriptIds,
) {
  backgroundScriptIdsByReference.set(normalizeConstReference(reference), backgroundScriptIds)
}

function parseCharacterBackgroundReferenceFile(fileSource, knownBackgroundScriptIds) {
  const backgroundScriptIdsByReference = new Map()
  const directlyPlayableBackgroundScriptIds = new Set()

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
  value,
  { backgroundScriptIdsByReference, knownBackgroundScriptIds, localValues },
  visitedReferences = new Set(),
) {
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
  fileEntries,
  knownBackgroundScriptIds,
  backgroundScriptIdsByReference,
  diagnostics,
) {
  const playableBackgroundScriptIds = new Set()

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

          let parsedValue

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

function resolveFixedLiteralBackgroundScriptIdsFromValue(value, knownBackgroundScriptIds) {
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
      (backgroundScriptId) =>
        backgroundScriptId !== null && knownBackgroundScriptIds.has(backgroundScriptId),
    )

  return backgroundScriptIds.length === 1 ? backgroundScriptIds : []
}

function collectScenarioVeteranPerkLevelIntervalsByBackgroundScriptId(
  fileEntries,
  knownBackgroundScriptIds,
  diagnostics,
) {
  const recordsByBackgroundScriptId = new Map()

  for (const fileEntry of fileEntries) {
    const uncommentedFileSource = stripSquirrelComments(fileEntry.fileSource)
    const diagnosticContext = { diagnostics, sourceFilePath: fileEntry.sourceFilePath }
    const receiverAliases = extractActorReceiverAliases(uncommentedFileSource)
    const playerTraitReceivers = collectPlayerTraitReceivers(uncommentedFileSource)
    const playerCharacterFlagReceivers = collectPlayerCharacterFlagReceivers(uncommentedFileSource)
    const actorsByReceiver = new Map()

    function getActorRecord(receiver) {
      const resolvedReceiver = resolveActorReceiverAlias(receiver, receiverAliases)

      if (!actorsByReceiver.has(resolvedReceiver)) {
        actorsByReceiver.set(resolvedReceiver, {
          backgroundScriptIds: [],
          isAvatar: false,
          veteranPerkLevelIntervals: [],
        })
      }

      return actorsByReceiver.get(resolvedReceiver)
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

        let parsedValue

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

function getBackgroundOriginCandidateLabels(background) {
  return [
    background.backgroundIdentifier,
    background.backgroundScriptId.replace(/_background$/u, ''),
    path.posix
      .basename(background.sourceFilePath, path.posix.extname(background.sourceFilePath))
      .replace(/_background$/u, ''),
  ].filter((label) => typeof label === 'string')
}

function isScenarioVeteranPerkLevelIntervalEligibleBackground(background) {
  return getBackgroundOriginCandidateLabels(background).some((label) =>
    isOriginBackgroundSourceLabel(label),
  )
}

function applyScenarioVeteranPerkLevelIntervals(
  backgrounds,
  scenarioVeteranPerkLevelRecordsByBackgroundScriptId,
) {
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

function parseScenarioHookFile(fileSource, sourceFilePath, diagnostics) {
  const diagnosticContext = { diagnostics, sourceFilePath }
  const wrapperFunction = extractHookWrapperFunction(fileSource)

  if (!wrapperFunction || wrapperFunction.type !== 'function') {
    return null
  }

  const wrapperStatements = collectTopLevelStatements(wrapperFunction.body)
  const memberValues = new Map()

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

  const directPerkConstNames = new Set()
  const overlayDefinitions = []

  for (const statement of wrapperStatements) {
    if (
      statement.type !== 'assignment' ||
      !statement.target.startsWith('o.') ||
      typeof statement.value !== 'object' ||
      statement.value === null ||
      statement.value.type !== 'function'
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

      let parsedArgumentValue

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

      let candidatePoolValue = null

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
        .filter(Boolean)

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
  perkConstName,
  targetConstNamesByPerkConstName,
  killsPerPercentBonusByEntityConstName,
  entityNamesByConstName,
) {
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

function buildSearchText(perkRecord) {
  const placementText = perkRecord.placements
    .flatMap((placement) => [placement.categoryName, placement.perkGroupName])
    .join(' ')

  const backgroundText = perkRecord.backgroundSources
    .map((backgroundSource) =>
      [
        backgroundSource.backgroundName,
        backgroundSource.categoryName,
        backgroundSource.perkGroupName,
      ].join(' '),
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

function comparePlacements(leftPlacement, rightPlacement, categoryOrder) {
  return (
    getCategoryPriority(categoryOrder, leftPlacement.categoryName) -
      getCategoryPriority(categoryOrder, rightPlacement.categoryName) ||
    leftPlacement.perkGroupName.localeCompare(rightPlacement.perkGroupName) ||
    (leftPlacement.tier ?? Number.POSITIVE_INFINITY) -
      (rightPlacement.tier ?? Number.POSITIVE_INFINITY)
  )
}

function compareBackgroundSources(leftSource, rightSource, categoryOrder) {
  return (
    leftSource.backgroundName.localeCompare(rightSource.backgroundName) ||
    getCategoryPriority(categoryOrder, leftSource.categoryName) -
      getCategoryPriority(categoryOrder, rightSource.categoryName) ||
    leftSource.perkGroupName.localeCompare(rightSource.perkGroupName)
  )
}

function compareScenarioSources(leftSource, rightSource) {
  return (
    leftSource.scenarioName.localeCompare(rightSource.scenarioName) ||
    leftSource.grantType.localeCompare(rightSource.grantType) ||
    leftSource.sourceMethodName.localeCompare(rightSource.sourceMethodName)
  )
}

export async function createDataset(
  referenceRootDirectoryPath = defaultReferenceRootDirectoryPath,
  options = {},
) {
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
  ).filter((perkStringFileEntry) => perkStringFileEntry !== null)

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
  const traitMetadata = parseTraitMetadataFileEntries(traitFileEntries)

  const perkGroupDefinitions = new Map()
  const perkGroupCategoryNames = new Map()
  const defaultCategoryNamesBySourceFilePath = new Map()

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
    if (perkGroupCategoryNames.has(perkGroupConstName)) {
      perkGroupDefinition.categoryName = perkGroupCategoryNames.get(perkGroupConstName)
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
  ).find(
    (statement) =>
      statement.type === 'expression' &&
      unwrapCall(statement.expression)?.callee?.startsWith('::mods_hook') &&
      unwrapCall(statement.expression)?.arguments?.[1]?.type === 'function',
  )
  const characterBackgroundWrapperFunction = unwrapCall(characterBackgroundWrapperCall?.expression)
    ?.arguments?.[1]

  if (
    !characterBackgroundWrapperFunction ||
    characterBackgroundWrapperFunction.type !== 'function'
  ) {
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
    .filter((background) => background !== null)
  const rawScriptBackgroundDefinitionsByScriptId = new Map(
    scriptBackgroundFileEntries
      .map((backgroundFileEntry) =>
        parseBackgroundScriptFileDefinition(
          backgroundFileEntry.fileSource,
          backgroundFileEntry.sourceFilePath,
        ),
      )
      .filter((backgroundDefinition) => backgroundDefinition !== null)
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
  const { backgroundScriptIdsByReference, directlyPlayableBackgroundScriptIds } =
    characterBackgroundReferencesFileSource
      ? parseCharacterBackgroundReferenceFile(
          characterBackgroundReferencesFileSource,
          knownBackgroundScriptIds,
        )
      : {
          backgroundScriptIdsByReference: new Map(),
          directlyPlayableBackgroundScriptIds: new Set(),
        }
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
  const backgroundFitBackgrounds = buildBackgroundFitBackgrounds(backgrounds, perkGroupDefinitions)

  const scenarios = scenarioFileEntries
    .map((scenarioFileEntry) =>
      parseScenarioHookFile(
        scenarioFileEntry.fileSource,
        scenarioFileEntry.sourceFilePath,
        diagnostics,
      ),
    )
    .filter((scenario) => scenario !== null)

  const placementsByPerkConstName = new Map()

  for (const perkGroupDefinition of perkGroupDefinitions.values()) {
    for (const [tierIndex, perkConstNames] of perkGroupDefinition.perkConstNamesByTier.entries()) {
      const tier = tierIndex + 1

      for (const perkConstName of perkConstNames) {
        if (!placementsByPerkConstName.has(perkConstName)) {
          placementsByPerkConstName.set(perkConstName, [])
        }

        placementsByPerkConstName.get(perkConstName).push({
          categoryName: perkGroupDefinition.categoryName ?? 'Other',
          tier,
          perkGroupIconPath: perkGroupDefinition.iconPath ?? null,
          perkGroupId: perkGroupDefinition.id,
          perkGroupName: perkGroupDefinition.name,
        })
      }
    }
  }

  const backgroundSourcesByPerkConstName = new Map()

  for (const background of backgrounds) {
    const dynamicTreeEntries = tableEntriesToMap(background.dynamicTreeValue)

    for (const [categoryName, perkGroupValue] of dynamicTreeEntries.entries()) {
      const perkGroupConstNames = referenceArrayValue(perkGroupValue).map(getLastPathSegment)
      const minimumPerkGroups = resolveMinimumValue(background.minimums, categoryName)
      const chance = resolveChanceValue(background.minimums, categoryName)

      for (const perkGroupConstName of perkGroupConstNames) {
        const perkGroupDefinition = perkGroupDefinitions.get(perkGroupConstName)

        if (!perkGroupDefinition) {
          continue
        }

        for (const perkConstNames of perkGroupDefinition.perkConstNamesByTier) {
          for (const perkConstName of perkConstNames) {
            if (!backgroundSourcesByPerkConstName.has(perkConstName)) {
              backgroundSourcesByPerkConstName.set(perkConstName, [])
            }

            backgroundSourcesByPerkConstName.get(perkConstName).push({
              backgroundId: background.backgroundIdentifier,
              backgroundName: background.backgroundName,
              categoryName,
              chance,
              minimumPerkGroups,
              perkGroupId: perkGroupDefinition.id,
              perkGroupName: perkGroupDefinition.name,
            })
          }
        }
      }
    }
  }

  const scenarioSourcesByPerkConstName = new Map()

  function addScenarioSource(perkConstName, scenarioSource) {
    if (!scenarioSourcesByPerkConstName.has(perkConstName)) {
      scenarioSourcesByPerkConstName.set(perkConstName, [])
    }

    scenarioSourcesByPerkConstName.get(perkConstName).push(scenarioSource)
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

  const perkRecords = []

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
    const backgroundSources = (backgroundSourcesByPerkConstName.get(perkDefinition.constName) ?? [])
      .filter((backgroundSource, index, backgroundSourcesList) => {
        const key = `${backgroundSource.backgroundId}::${backgroundSource.categoryName}::${backgroundSource.perkGroupId}`
        return (
          backgroundSourcesList.findIndex(
            (candidate) =>
              `${candidate.backgroundId}::${candidate.categoryName}::${candidate.perkGroupId}` ===
              key,
          ) === index
        )
      })
      .toSorted((leftSource, rightSource) =>
        compareBackgroundSources(leftSource, rightSource, categoryOrder),
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

    const perkRecord = {
      backgroundSources,
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

    perkRecord.searchText = buildSearchText(perkRecord)
    perkRecords.push(perkRecord)
  }

  const uniquePerkGroupIdentifiers = new Set(
    perkRecords.flatMap((perkRecord) =>
      perkRecord.placements.map((placement) => placement.perkGroupId),
    ),
  )

  const sourceFiles = [
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
}) {
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

function createPerkCatalogDataset(dataset) {
  return {
    referenceVersion: dataset.referenceVersion,
    perks: dataset.perks.map(createPerkCatalogRecord),
  }
}

function createBackgroundFitPerkRecord({ iconPath, id, perkName, placements }) {
  return {
    iconPath,
    id,
    perkName,
    placements,
  }
}

function createBackgroundFitDataset(dataset) {
  return {
    backgroundFitBackgrounds: dataset.backgroundFitBackgrounds,
    backgroundFitRules: dataset.backgroundFitRules,
    referenceVersion: dataset.referenceVersion,
    perks: dataset.perks.map(createBackgroundFitPerkRecord),
  }
}

async function writeJsonFile(outputFilePath, value) {
  await mkdir(path.dirname(outputFilePath), { recursive: true })
  await writeFile(outputFilePath, `${JSON.stringify(value)}\n`, 'utf8')
}

export async function writeDatasetFile(
  dataset,
  outputDirectoryPath = defaultDatasetOutputDirectoryPath,
) {
  await Promise.all([
    writeJsonFile(
      path.join(outputDirectoryPath, 'legends-background-fit.json'),
      createBackgroundFitDataset(dataset),
    ),
    writeJsonFile(
      path.join(outputDirectoryPath, 'legends-perk-catalog.json'),
      createPerkCatalogDataset(dataset),
    ),
  ])
}
