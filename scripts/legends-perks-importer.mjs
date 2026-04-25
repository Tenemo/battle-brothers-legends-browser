import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defaultLegendsReferenceDirectoryPath } from './ensure-legends-reference.mjs'
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

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRootDirectoryPath = path.resolve(__dirname, '..')

export const defaultReferenceRootDirectoryPath = defaultLegendsReferenceDirectoryPath

const defaultCategoryOrder = [
  'Weapon',
  'Defense',
  'Traits',
  'Enemy',
  'Class',
  'Profession',
  'Magic',
  'Other',
]

const dynamicBackgroundCategoryNames = [
  'Weapon',
  'Defense',
  'Traits',
  'Enemy',
  'Class',
  'Profession',
  'Magic',
]

const categoryMinimumKeyMap = {
  Class: 'Class',
  Defense: 'Defense',
  Enemy: 'Enemy',
  Magic: 'Magic',
  Profession: 'Profession',
  Traits: 'Traits',
  Weapon: 'Weapon',
}

const categoryChanceKeyMap = {
  Class: 'ClassChance',
  Enemy: 'EnemyChance',
  Magic: 'MagicChance',
  Profession: 'ProfessionChance',
}

const favoriteEnemyPerkConstByArrayName = {
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

function sortUniqueStrings(values) {
  return [...new Set(values.filter(Boolean))].toSorted((left, right) => left.localeCompare(right))
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

function referenceArrayValue(value, localValues = new Map()) {
  return arrayValues(value, localValues)
    .map((item) => referenceValue(item, localValues))
    .filter((item) => item !== null)
}

function resolveNumericRange(value) {
  const numericRange = arrayValues(value)
    .map((entry) => numberValue(entry))
    .filter((entry) => entry !== null)

  return numericRange.length === 2 ? numericRange : null
}

function formatAttributeLabel(attributeName) {
  const labelMap = {
    Bravery: 'Resolve',
    Hitpoints: 'Hitpoints',
    Initiative: 'Initiative',
    MeleeDefense: 'Melee defense',
    MeleeSkill: 'Melee skill',
    RangedDefense: 'Ranged defense',
    RangedSkill: 'Ranged skill',
    Stamina: 'Max fatigue',
  }

  return labelMap[attributeName] ?? prettifyIdentifier(attributeName)
}

function formatNumericModifier(value) {
  if (value > 0) {
    return `+${value}`
  }

  return String(value)
}

function formatAttributeRange(attributeName, numericRange) {
  const [minimumValue, maximumValue] = numericRange
  const label = formatAttributeLabel(attributeName)

  if (minimumValue === 0 && maximumValue === 0) {
    return null
  }

  if (minimumValue === maximumValue) {
    return `${label}: ${formatNumericModifier(minimumValue)}`
  }

  return `${label}: ${formatNumericModifier(minimumValue)} to ${formatNumericModifier(maximumValue)}`
}

function flattenTreeAttributes(attributesValue) {
  const attributesTable = unwrapTable(attributesValue)

  if (attributesTable === null) {
    return []
  }

  const lines = []

  for (const entry of attributesTable.entries) {
    if (entry.type !== 'property') {
      continue
    }

    const numericRange = resolveNumericRange(entry.value)

    if (numericRange === null) {
      continue
    }

    const line = formatAttributeRange(entry.key, numericRange)

    if (line !== null) {
      lines.push(line)
    }
  }

  return lines
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

function extractAssignedValue(source, assignmentTarget) {
  const pattern = new RegExp(`${escapeForRegularExpression(assignmentTarget)}\\s*(?:<-|=)\\s*`, 'g')
  const match = pattern.exec(source)

  if (!match) {
    return null
  }

  try {
    return parseSquirrelValue(source, match.index + match[0].length).value
  } catch {
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

function extractLocalAssignments(source) {
  const assignments = new Map()
  const pattern = /\blocal\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*/g

  for (const match of source.matchAll(pattern)) {
    try {
      const parsedValue = parseSquirrelValue(source, match.index + match[0].length).value
      assignments.set(match[1], parsedValue)
    } catch {
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

function parseTreeConfigFile(fileSource, sourceFilePath) {
  const localValues = new Map()
  const categoryDefinitions = []
  const treeDefinitions = []

  for (const statement of collectTopLevelStatements(fileSource)) {
    if (statement.type === 'local-assignment') {
      localValues.set(statement.target, statement.value)
      continue
    }

    if (statement.type !== 'assignment' || !statement.target.startsWith('::Const.Perks.')) {
      continue
    }

    const tableEntries = tableEntriesToMap(statement.value, localValues)
    const treeProperty = tableEntries.get('Tree')

    if (!treeProperty) {
      continue
    }

    if (tableEntries.has('GroupsCategory')) {
      categoryDefinitions.push({
        categoryName: stringValue(tableEntries.get('GroupsCategory'), localValues) ?? 'Other',
        sourceFilePath,
        treeConstNames: referenceArrayValue(treeProperty, localValues).map(getLastPathSegment),
      })
      continue
    }

    const constName = getLastPathSegment(statement.target)
    const treeRows = arrayValues(treeProperty, localValues).map((row) =>
      referenceArrayValue(row, localValues).map(getLastPathSegment),
    )

    treeDefinitions.push({
      attributeLines: flattenTreeAttributes(tableEntries.get('Attributes')),
      categoryName: stringValue(tableEntries.get('Category'), localValues),
      constName,
      descriptionLines: stringArrayValue(tableEntries.get('Descriptions'), localValues).map(
        cleanRichText,
      ),
      iconPath: stringValue(tableEntries.get('Icon'), localValues),
      id: stringValue(tableEntries.get('ID'), localValues) ?? constName,
      name: stringValue(tableEntries.get('Name'), localValues) ?? prettifyIdentifier(constName),
      perkConstNamesByTier: treeRows,
      sourceFilePath,
    })
  }

  return {
    categoryDefinitions,
    treeDefinitions,
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

function parseFavoriteEnemyConfigFile(fileSource) {
  const targetConstNamesByPerkConstName = new Map()
  const killsPerPercentBonusByEntityConstName = new Map()

  for (const statement of collectTopLevelStatements(fileSource)) {
    if (
      statement.type === 'assignment' &&
      statement.target.startsWith('::Const.LegendMod.Favorite')
    ) {
      const arrayName = getLastPathSegment(statement.target)
      const perkConstName = favoriteEnemyPerkConstByArrayName[arrayName]

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
  const key = categoryMinimumKeyMap[categoryName]
  return key ? (backgroundMinimums[key] ?? null) : null
}

function resolveChanceValue(backgroundMinimums, categoryName) {
  const key = categoryChanceKeyMap[categoryName]
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
  sourceFilePath,
) {
  return {
    backgroundIdentifier: null,
    backgroundName: null,
    backgroundScriptId,
    dynamicTreeValue: baseDynamicTreeValue,
    minimums: cloneMinimums(baseMinimums),
    sourceFilePath,
  }
}

function applyBackgroundCreateBody({
  backgroundScriptId,
  baseBackgroundDefinition,
  createBody,
  preferScriptIdWhenIdentifierIsInherited,
  sourceFilePath,
}) {
  const explicitBackgroundIdentifier = stringValue(extractAssignedValue(createBody, 'this.m.ID'))
  const backgroundName =
    stringValue(extractAssignedValue(createBody, 'this.m.Name')) ??
    baseBackgroundDefinition.backgroundName
  const dynamicTreeValue =
    extractAssignedValue(createBody, 'this.m.PerkTreeDynamic') ??
    baseBackgroundDefinition.dynamicTreeValue
  const minimums = cloneMinimums(baseBackgroundDefinition.minimums)

  for (const operation of extractNumericOperations(createBody, 'this.m.PerkTreeDynamicMins.')) {
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
    dynamicTreeValue,
    minimums,
    sourceFilePath,
  }
}

function parseBackgroundHookFile(fileSource, sourceFilePath, baseDynamicTreeValue, baseMinimums) {
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
    backgroundScriptId: getBackgroundScriptIdFromSourceFilePath(sourceFilePath),
    baseBackgroundDefinition: createDefaultBackgroundDefinition(
      getBackgroundScriptIdFromSourceFilePath(sourceFilePath),
      baseDynamicTreeValue,
      baseMinimums,
      sourceFilePath,
    ),
    createBody: createFunctionLiteral.body,
    preferScriptIdWhenIdentifierIsInherited: false,
    sourceFilePath,
  })

  if (
    backgroundDefinition.backgroundIdentifier === null ||
    backgroundDefinition.backgroundName === null
  ) {
    return null
  }

  return backgroundDefinition
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
    parentBackgroundScriptId: path.posix.basename(inheritedBackgroundScriptPath),
    sourceFilePath,
  }
}

function resolveScriptBackgroundDefinitions(
  rawBackgroundDefinitionsByScriptId,
  baseDynamicTreeValue,
  baseMinimums,
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
          minimums: cloneMinimums(parentBackgroundDefinition.minimums),
          sourceFilePath: rawBackgroundDefinition.sourceFilePath,
        }
      : createDefaultBackgroundDefinition(
          backgroundScriptId,
          baseDynamicTreeValue,
          baseMinimums,
          rawBackgroundDefinition.sourceFilePath,
        )

    const resolvedBackgroundDefinition = applyBackgroundCreateBody({
      backgroundScriptId,
      baseBackgroundDefinition,
      createBody: rawBackgroundDefinition.createBody,
      preferScriptIdWhenIdentifierIsInherited:
        parentBackgroundDefinition !== null &&
        rawBackgroundDefinition.parentBackgroundScriptId !== backgroundScriptId,
      sourceFilePath: rawBackgroundDefinition.sourceFilePath,
    })

    if (resolvedBackgroundDefinition.backgroundName === null) {
      return null
    }

    resolvedBackgroundDefinitionsByScriptId.set(backgroundScriptId, resolvedBackgroundDefinition)
    return resolvedBackgroundDefinition
  }

  for (const backgroundScriptId of rawBackgroundDefinitionsByScriptId.keys()) {
    resolveBackground(backgroundScriptId)
  }

  return resolvedBackgroundDefinitionsByScriptId
}

function parseBackgroundFitRulesFile(fileSource, treeDefinitions) {
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

  const localAssignments = extractLocalAssignments(dynamicPerkTreeAssignment.value.body)
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
          classTreeConstName === undefined ? undefined : treeDefinitions.get(classTreeConstName)
        const weaponTreeDefinition =
          weaponTreeConstName === undefined ? undefined : treeDefinitions.get(weaponTreeConstName)

        if (!classTreeDefinition || !weaponTreeDefinition) {
          return []
        }

        return [
          {
            classTreeId: classTreeDefinition.id,
            weaponTreeId: weaponTreeDefinition.id,
          },
        ]
      })
      .filter(
        (dependency, index, dependencies) =>
          dependencies.findIndex(
            (candidate) =>
              candidate.classTreeId === dependency.classTreeId &&
              candidate.weaponTreeId === dependency.weaponTreeId,
          ) === index,
      )
      .toSorted(
        (leftDependency, rightDependency) =>
          leftDependency.classTreeId.localeCompare(rightDependency.classTreeId) ||
          leftDependency.weaponTreeId.localeCompare(rightDependency.weaponTreeId),
      ),
  }
}

function buildBackgroundFitBackgrounds(backgrounds, treeDefinitions) {
  return backgrounds
    .map((background) => {
      const dynamicTreeEntries = tableEntriesToMap(background.dynamicTreeValue)

      return {
        backgroundId: background.backgroundIdentifier,
        backgroundName: background.backgroundName,
        categories: Object.fromEntries(
          dynamicBackgroundCategoryNames.map((categoryName) => {
            const treeValue = dynamicTreeEntries.get(categoryName)

            return [
              categoryName,
              {
                chance: resolveChanceValue(background.minimums, categoryName),
                minimumTrees: resolveMinimumValue(background.minimums, categoryName),
                treeIds: [
                  ...new Set(
                    referenceArrayValue(treeValue)
                      .map(getLastPathSegment)
                      .flatMap((treeConstName) => {
                        const treeDefinition = treeDefinitions.get(treeConstName)
                        return treeDefinition ? [treeDefinition.id] : []
                      }),
                  ),
                ],
              },
            ]
          }),
        ),
        sourceFilePath: background.sourceFilePath,
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
            (leftCategory?.minimumTrees ?? Number.NEGATIVE_INFINITY) -
              (rightCategory?.minimumTrees ?? Number.NEGATIVE_INFINITY) ||
            (leftCategory?.chance ?? Number.NEGATIVE_INFINITY) -
              (rightCategory?.chance ?? Number.NEGATIVE_INFINITY) ||
            (leftCategory?.treeIds.join('::') ?? '').localeCompare(
              rightCategory?.treeIds.join('::') ?? '',
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
) {
  const playableBackgroundScriptIds = new Set()

  for (const fileEntry of fileEntries) {
    const uncommentedFileSource = stripSquirrelComments(fileEntry.fileSource)
    const localValues = extractLocalAssignments(uncommentedFileSource)

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
          } catch {
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

function parseScenarioHookFile(fileSource, sourceFilePath) {
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
  const scenarioIdentifier = stringValue(extractAssignedValue(createBody, 'this.m.ID'))
  const scenarioName = stringValue(extractAssignedValue(createBody, 'this.m.Name'))

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

    for (const argumentList of extractCallArgumentLists(functionBody, '::Legends.Perks.grant')) {
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
      } catch {
        continue
      }
    }

    if (methodName !== 'onBuildPerkTree') {
      continue
    }

    const localAssignments = extractLocalAssignments(functionBody)

    for (const argumentList of extractCallArgumentLists(functionBody, 'this.addScenarioPerk')) {
      const perkArgumentSource = argumentList[1]

      if (!perkArgumentSource) {
        continue
      }

      let parsedArgumentValue

      try {
        parsedArgumentValue = parseSquirrelValue(perkArgumentSource).value
      } catch {
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

function buildFavoriteEnemyTargets(
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
    .flatMap((placement) => [
      placement.categoryName,
      placement.treeName,
      placement.treeDescriptions.join(' '),
      placement.treeAttributes.join(' '),
    ])
    .join(' ')

  const backgroundText = perkRecord.backgroundSources
    .map((backgroundSource) =>
      [
        backgroundSource.backgroundName,
        backgroundSource.categoryName,
        backgroundSource.treeName,
      ].join(' '),
    )
    .join(' ')

  const scenarioText = perkRecord.scenarioSources
    .map((scenarioSource) => [scenarioSource.scenarioName, scenarioSource.grantType].join(' '))
    .join(' ')

  const favoredEnemyText = (perkRecord.favoredEnemyTargets ?? [])
    .map((target) => `${target.entityName} ${target.killsPerPercentBonus ?? ''}`.trim())
    .join(' ')

  return normalizeWhitespace(
    [
      perkRecord.perkName,
      perkRecord.primaryGroupName,
      perkRecord.groupNames.join(' '),
      perkRecord.descriptionParagraphs.join(' '),
      placementText,
      backgroundText,
      scenarioText,
      favoredEnemyText,
    ].join(' '),
  )
}

function comparePlacements(leftPlacement, rightPlacement, categoryOrder) {
  return (
    getCategoryPriority(categoryOrder, leftPlacement.categoryName) -
      getCategoryPriority(categoryOrder, rightPlacement.categoryName) ||
    leftPlacement.treeName.localeCompare(rightPlacement.treeName) ||
    (leftPlacement.tier ?? Number.POSITIVE_INFINITY) -
      (rightPlacement.tier ?? Number.POSITIVE_INFINITY)
  )
}

function compareBackgroundSources(leftSource, rightSource, categoryOrder) {
  return (
    leftSource.backgroundName.localeCompare(rightSource.backgroundName) ||
    getCategoryPriority(categoryOrder, leftSource.categoryName) -
      getCategoryPriority(categoryOrder, rightSource.categoryName) ||
    leftSource.treeName.localeCompare(rightSource.treeName)
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
  const favoriteEnemyConfigFilePath = path.join(
    referenceRootDirectoryPath,
    'config',
    'z_legends_fav_enemies.nut',
  )
  const perksTreeRulesFilePath = path.join(referenceRootDirectoryPath, 'config', 'perks_tree.nut')
  const hookBackgroundDirectoryPath = path.join(
    referenceRootDirectoryPath,
    'hooks',
    'skills',
    'backgrounds',
  )
  const scriptBackgroundDirectoryPath = path.join(scriptsRootDirectoryPath, 'skills', 'backgrounds')
  const scenarioDirectoryPath = path.join(referenceRootDirectoryPath, 'hooks', 'scenarios', 'world')
  const treeDirectoryPath = path.join(referenceRootDirectoryPath, 'config')
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
    favoriteEnemyConfigFileSource,
    perksTreeRulesFileSource,
    characterBackgroundFileSource,
  ] = await Promise.all([
    readFileIfExists(characterBackgroundReferencesFilePath),
    readFile(perkDefinitionsFilePath, 'utf8'),
    readFile(entityNamesFilePath, 'utf8'),
    readFile(categoryOrderFilePath, 'utf8'),
    readFile(favoriteEnemyConfigFilePath, 'utf8'),
    readFile(perksTreeRulesFilePath, 'utf8'),
    readFile(characterBackgroundFilePath, 'utf8'),
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

  const treeFileNames = (await readdir(treeDirectoryPath))
    .filter((fileName) => /^z_perks_tree_.*\.nut$/i.test(fileName))
    .toSorted((left, right) => left.localeCompare(right))

  const treeFileEntries = await Promise.all(
    treeFileNames.map(async (fileName) => {
      const absolutePath = path.join(treeDirectoryPath, fileName)
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
  const favoriteEnemyConfig = parseFavoriteEnemyConfigFile(favoriteEnemyConfigFileSource)

  const treeDefinitions = new Map()
  const treeCategoryNames = new Map()
  const defaultCategoryNamesBySourceFilePath = new Map()

  for (const treeFileEntry of treeFileEntries) {
    const parsedTreeConfig = parseTreeConfigFile(
      treeFileEntry.fileSource,
      treeFileEntry.sourceFilePath,
    )

    for (const categoryDefinition of parsedTreeConfig.categoryDefinitions) {
      defaultCategoryNamesBySourceFilePath.set(
        categoryDefinition.sourceFilePath,
        categoryDefinition.categoryName,
      )

      for (const treeConstName of categoryDefinition.treeConstNames) {
        treeCategoryNames.set(treeConstName, categoryDefinition.categoryName)
      }
    }

    for (const treeDefinition of parsedTreeConfig.treeDefinitions) {
      treeDefinitions.set(treeDefinition.constName, treeDefinition)
    }
  }

  for (const [treeConstName, treeDefinition] of treeDefinitions.entries()) {
    if (treeCategoryNames.has(treeConstName)) {
      treeDefinition.categoryName = treeCategoryNames.get(treeConstName)
      continue
    }

    if (treeDefinition.categoryName) {
      continue
    }

    treeDefinition.categoryName =
      defaultCategoryNamesBySourceFilePath.get(treeDefinition.sourceFilePath) ?? 'Other'
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

  const baseMinimumsValue = extractAssignedValue(
    characterBackgroundWrapperFunction.body,
    'o.m.PerkTreeDynamicMins',
  )
  const baseDynamicTreeValue = extractAssignedValue(
    characterBackgroundWrapperFunction.body,
    'o.m.PerkTreeDynamicBase',
  )

  if (baseMinimumsValue === null || baseDynamicTreeValue === null) {
    throw new Error('Unable to parse the base background dynamic perk tree defaults.')
  }

  const baseMinimums = buildMinimumsObject(baseMinimumsValue)
  const hookBackgrounds = hookBackgroundFileEntries
    .map((backgroundFileEntry) =>
      parseBackgroundHookFile(
        backgroundFileEntry.fileSource,
        backgroundFileEntry.sourceFilePath,
        baseDynamicTreeValue,
        baseMinimums,
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
  const backgrounds = [...hookBackgrounds, ...scriptBackgrounds]
  const backgroundFitRules = parseBackgroundFitRulesFile(perksTreeRulesFileSource, treeDefinitions)
  const backgroundFitBackgrounds = buildBackgroundFitBackgrounds(backgrounds, treeDefinitions)

  const scenarios = scenarioFileEntries
    .map((scenarioFileEntry) =>
      parseScenarioHookFile(scenarioFileEntry.fileSource, scenarioFileEntry.sourceFilePath),
    )
    .filter((scenario) => scenario !== null)

  const placementsByPerkConstName = new Map()

  for (const treeDefinition of treeDefinitions.values()) {
    for (const [tierIndex, perkConstNames] of treeDefinition.perkConstNamesByTier.entries()) {
      const tier = tierIndex + 1

      for (const perkConstName of perkConstNames) {
        if (!placementsByPerkConstName.has(perkConstName)) {
          placementsByPerkConstName.set(perkConstName, [])
        }

        placementsByPerkConstName.get(perkConstName).push({
          categoryName: treeDefinition.categoryName ?? 'Other',
          sourceFilePath: treeDefinition.sourceFilePath,
          tier,
          treeAttributes: treeDefinition.attributeLines,
          treeDescriptions: treeDefinition.descriptionLines,
          treeIconPath: treeDefinition.iconPath ?? null,
          treeId: treeDefinition.id,
          treeName: treeDefinition.name,
        })
      }
    }
  }

  const backgroundSourcesByPerkConstName = new Map()

  for (const background of backgrounds) {
    const dynamicTreeEntries = tableEntriesToMap(background.dynamicTreeValue)

    for (const [categoryName, treeValue] of dynamicTreeEntries.entries()) {
      const treeConstNames = referenceArrayValue(treeValue).map(getLastPathSegment)
      const minimumTrees = resolveMinimumValue(background.minimums, categoryName)
      const chance = resolveChanceValue(background.minimums, categoryName)

      for (const treeConstName of treeConstNames) {
        const treeDefinition = treeDefinitions.get(treeConstName)

        if (!treeDefinition) {
          continue
        }

        for (const perkConstNames of treeDefinition.perkConstNamesByTier) {
          for (const perkConstName of perkConstNames) {
            if (!backgroundSourcesByPerkConstName.has(perkConstName)) {
              backgroundSourcesByPerkConstName.set(perkConstName, [])
            }

            backgroundSourcesByPerkConstName.get(perkConstName).push({
              backgroundId: background.backgroundIdentifier,
              backgroundName: background.backgroundName,
              categoryName,
              chance,
              minimumTrees,
              sourceFilePath: background.sourceFilePath,
              treeId: treeDefinition.id,
              treeName: treeDefinition.name,
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
        const key = `${placement.categoryName}::${placement.treeId}::${placement.tier}`
        return (
          placementsList.findIndex(
            (candidate) =>
              `${candidate.categoryName}::${candidate.treeId}::${candidate.tier}` === key,
          ) === index
        )
      })
      .toSorted((leftPlacement, rightPlacement) =>
        comparePlacements(leftPlacement, rightPlacement, categoryOrder),
      )
    const groupNames = sortUniqueStrings(
      placements.length > 0 ? placements.map((placement) => placement.categoryName) : ['Other'],
    )
    const primaryGroupName =
      groupNames.toSorted(
        (leftGroupName, rightGroupName) =>
          getCategoryPriority(categoryOrder, leftGroupName) -
            getCategoryPriority(categoryOrder, rightGroupName) ||
          leftGroupName.localeCompare(rightGroupName),
      )[0] ?? 'Other'
    const favoredEnemyTargets = buildFavoriteEnemyTargets(
      perkDefinition.constName,
      favoriteEnemyConfig.targetConstNamesByPerkConstName,
      favoriteEnemyConfig.killsPerPercentBonusByEntityConstName,
      entityNamesByConstName,
    )
    const backgroundSources = (backgroundSourcesByPerkConstName.get(perkDefinition.constName) ?? [])
      .filter((backgroundSource, index, backgroundSourcesList) => {
        const key = `${backgroundSource.backgroundId}::${backgroundSource.categoryName}::${backgroundSource.treeId}`
        return (
          backgroundSourcesList.findIndex(
            (candidate) =>
              `${candidate.backgroundId}::${candidate.categoryName}::${candidate.treeId}` === key,
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
        sourceFilePath: scenarioSource.sourceFilePath,
        sourceMethodName: scenarioSource.sourceMethodName,
      }))
    const sourceFilePaths = sortUniqueStrings([
      perkDefinition.sourceFilePath,
      ...perkStringFileEntries.map((perkStringFileEntry) => perkStringFileEntry.sourceFilePath),
      ...placements.map((placement) => placement.sourceFilePath),
      ...backgroundSources.map((backgroundSource) => backgroundSource.sourceFilePath),
      ...scenarioSources.map((scenarioSource) => scenarioSource.sourceFilePath),
      ...(favoredEnemyTargets.length > 0
        ? [
            toPosixRelativePath(favoriteEnemyConfigFilePath),
            toPosixRelativePath(entityNamesFilePath),
          ]
        : []),
    ])

    const perkRecord = {
      backgroundSources,
      descriptionParagraphs,
      favoredEnemyTargets: favoredEnemyTargets.length > 0 ? favoredEnemyTargets : undefined,
      groupNames,
      iconPath: perkDefinition.iconPath ?? null,
      id: perkDefinition.identifier,
      perkConstName: perkDefinition.constName,
      perkName,
      placements,
      primaryGroupName,
      scenarioSources,
      scriptPath: perkDefinition.scriptPath ?? null,
      sourceFilePaths,
      searchText: '',
    }

    perkRecord.searchText = buildSearchText(perkRecord)
    perkRecords.push(perkRecord)
  }

  const uniqueTreeIdentifiers = new Set(
    perkRecords.flatMap((perkRecord) => perkRecord.placements.map((placement) => placement.treeId)),
  )

  const sourceFiles = [
    { path: toPosixRelativePath(perkDefinitionsFilePath), role: 'perk definitions' },
    ...perkStringFileEntries.map((perkStringFileEntry) => ({
      path: perkStringFileEntry.sourceFilePath,
      role: 'perk strings',
    })),
    { path: toPosixRelativePath(entityNamesFilePath), role: 'entity names' },
    { path: toPosixRelativePath(categoryOrderFilePath), role: 'perk category order' },
    { path: toPosixRelativePath(favoriteEnemyConfigFilePath), role: 'favored enemy metadata' },
    { path: toPosixRelativePath(perksTreeRulesFilePath), role: 'background fit rules' },
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
      role: 'perk trees',
    })),
    ...[...hookBackgroundFileEntries, ...scriptBackgroundFileEntries].map(
      (backgroundFileEntry) => ({
        path: backgroundFileEntry.sourceFilePath,
        role: 'background dynamic pools',
      }),
    ),
    ...scenarioFileEntries.map((scenarioFileEntry) => ({
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
    treeCount: uniqueTreeIdentifiers.size,
  }
}

export async function writeDatasetFile(
  dataset,
  outputFilePath = path.join(projectRootDirectoryPath, 'src', 'data', 'legends-perks.json'),
) {
  await mkdir(path.dirname(outputFilePath), { recursive: true })
  await writeFile(outputFilePath, `${JSON.stringify(dataset, null, 2)}\n`, 'utf8')
}
