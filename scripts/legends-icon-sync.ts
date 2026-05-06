import {
  copyFile,
  cp as copyDirectory,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm as removePath,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pathExists, runCommand, sortUniqueStrings } from './script-utils.ts'
import type {
  LegendsBackgroundFitBackgroundDefinition,
  LegendsPerkCatalogRecord,
} from '../src/types/legends-perks.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRootDirectoryPath = path.resolve(__dirname, '..')
const defaultCatalogDatasetFilePath = path.join(
  projectRootDirectoryPath,
  'src',
  'data',
  'legends-perk-catalog.json',
)
const defaultBackgroundFitDatasetFilePath = path.join(
  projectRootDirectoryPath,
  'src',
  'data',
  'legends-background-fit.json',
)
const defaultIconOutputDirectoryPath = path.join(projectRootDirectoryPath, 'public', 'game-icons')
const defaultStagingIconOutputDirectoryPath = path.join(
  projectRootDirectoryPath,
  'public',
  'game-icons-staging',
)
const appRequiredGameIconPaths = [
  'ui/items/misc/inventory_ledger_item.png',
  'ui/items/trade/scroll.png',
  'ui/icons/bravery_va11.png',
  'ui/icons/fatigue_va11.png',
  'ui/icons/health_va11.png',
  'ui/icons/initiative_va11.png',
  'ui/icons/melee_defense_va11.png',
  'ui/icons/melee_skill_va11.png',
  'ui/icons/ranged_defense_va11.png',
  'ui/icons/ranged_skill_va11.png',
  'ui/traits/trait_icon_11.png',
]
const defaultSteamRootDirectoryPaths = [
  process.env.BATTLE_BROTHERS_STEAM_ROOT,
  process.env['PROGRAMFILES(X86)'] ? path.join(process.env['PROGRAMFILES(X86)'], 'Steam') : null,
  process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, 'Steam') : null,
]

type LegendsIconSourceDataset = {
  backgroundFitBackgrounds: LegendsBackgroundFitBackgroundDefinition[]
  perks: Pick<LegendsPerkCatalogRecord, 'iconPath' | 'placements'>[]
}

type IconExtractionPlan = {
  entriesByArchivePath: Map<string, string[]>
  missingIconPaths: string[]
}

type SyncLegendsIconsOptions = {
  backgroundFitDatasetFilePath?: string
  catalogDatasetFilePath?: string
  dataset?: LegendsIconSourceDataset | null
  gameDirectoryPath?: string | null
  outputDirectoryPath?: string
}

type SyncLegendsIconsResult = {
  archivePaths: string[]
  extractedIconCount: number
  gameDirectoryPath: string
  missingIconPaths: string[]
  outputDirectoryPath: string
}

function normalizeRelativeIconPath(relativeIconPath: string): string {
  return relativeIconPath.replaceAll('\\', '/').replace(/^\/+/, '')
}

function chunkValues<T>(values: T[], maximumChunkLength: number): T[][] {
  const chunks: T[][] = []

  for (let index = 0; index < values.length; index += maximumChunkLength) {
    chunks.push(values.slice(index, index + maximumChunkLength))
  }

  return chunks
}

export function collectRequiredGameIconPaths(dataset: LegendsIconSourceDataset): string[] {
  const iconPaths = new Set(appRequiredGameIconPaths.map(normalizeRelativeIconPath))

  for (const backgroundFitBackground of dataset.backgroundFitBackgrounds) {
    if (backgroundFitBackground.iconPath) {
      iconPaths.add(normalizeRelativeIconPath(backgroundFitBackground.iconPath))
    }

    for (const trait of [
      ...(backgroundFitBackground.excludedTraits ?? []),
      ...(backgroundFitBackground.guaranteedTraits ?? []),
    ]) {
      if (trait.iconPath) {
        iconPaths.add(normalizeRelativeIconPath(trait.iconPath))
      }
    }

    for (const attributeRange of backgroundFitBackground.startingAttributeRanges ?? []) {
      iconPaths.add(normalizeRelativeIconPath(attributeRange.iconPath))
    }
  }

  for (const perk of dataset.perks) {
    if (perk.iconPath) {
      iconPaths.add(normalizeRelativeIconPath(perk.iconPath))
    }

    for (const placement of perk.placements) {
      if (placement.perkGroupIconPath) {
        iconPaths.add(normalizeRelativeIconPath(placement.perkGroupIconPath))
      }
    }
  }

  return [...iconPaths].toSorted((leftValue, rightValue) => leftValue.localeCompare(rightValue))
}

export function getArchiveEntryPathFromIconPath(iconPath: string): string {
  return `gfx/${normalizeRelativeIconPath(iconPath)}`
}

export function buildIconExtractionPlan(
  iconPaths: string[],
  archiveEntriesByArchivePath: Map<string, Set<string>>,
): IconExtractionPlan {
  const entriesByArchivePath = new Map<string, string[]>()
  const missingIconPaths: string[] = []

  for (const iconPath of iconPaths) {
    const archiveEntryPath = getArchiveEntryPathFromIconPath(iconPath)
    const matchingArchivePath = [...archiveEntriesByArchivePath.keys()].find((archivePath) =>
      archiveEntriesByArchivePath.get(archivePath)?.has(archiveEntryPath),
    )

    if (!matchingArchivePath) {
      missingIconPaths.push(iconPath)
      continue
    }

    entriesByArchivePath.set(matchingArchivePath, [
      ...(entriesByArchivePath.get(matchingArchivePath) ?? []),
      archiveEntryPath,
    ])
  }

  for (const [archivePath, archiveEntryPaths] of entriesByArchivePath.entries()) {
    entriesByArchivePath.set(archivePath, sortUniqueStrings(archiveEntryPaths))
  }

  return {
    entriesByArchivePath,
    missingIconPaths: missingIconPaths.toSorted((leftValue, rightValue) =>
      leftValue.localeCompare(rightValue),
    ),
  }
}

async function readIconSourceDataset({
  backgroundFitDatasetFilePath = defaultBackgroundFitDatasetFilePath,
  catalogDatasetFilePath = defaultCatalogDatasetFilePath,
}: {
  backgroundFitDatasetFilePath?: string
  catalogDatasetFilePath?: string
} = {}): Promise<LegendsIconSourceDataset> {
  const [backgroundFitDataset, catalogDataset] = await Promise.all([
    readFile(backgroundFitDatasetFilePath, 'utf8').then(
      (source) =>
        JSON.parse(source) as {
          backgroundFitBackgrounds: LegendsBackgroundFitBackgroundDefinition[]
        },
    ),
    readFile(catalogDatasetFilePath, 'utf8').then(
      (source) =>
        JSON.parse(source) as {
          perks: Pick<LegendsPerkCatalogRecord, 'iconPath' | 'placements'>[]
        },
    ),
  ])

  return {
    backgroundFitBackgrounds: backgroundFitDataset.backgroundFitBackgrounds,
    perks: catalogDataset.perks,
  }
}

async function findSteamLibraryDirectoryPaths(): Promise<string[]> {
  const steamLibraryDirectoryPaths = new Set<string>()

  for (const steamRootDirectoryPath of defaultSteamRootDirectoryPaths.filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  )) {
    if (!(await pathExists(steamRootDirectoryPath))) {
      continue
    }

    steamLibraryDirectoryPaths.add(steamRootDirectoryPath)

    const libraryFoldersFilePath = path.join(
      steamRootDirectoryPath,
      'steamapps',
      'libraryfolders.vdf',
    )

    if (!(await pathExists(libraryFoldersFilePath))) {
      continue
    }

    const libraryFoldersFileSource = await readFile(libraryFoldersFilePath, 'utf8')
    const libraryPathPattern = /"path"\s+"([^"]+)"/g

    for (const match of libraryFoldersFileSource.matchAll(libraryPathPattern)) {
      steamLibraryDirectoryPaths.add(match[1].replaceAll('\\\\', '\\'))
    }
  }

  return [...steamLibraryDirectoryPaths]
}

export async function findBattleBrothersGameDirectoryPath(
  requestedGameDirectoryPath = process.env.BATTLE_BROTHERS_GAME_DIR ?? null,
): Promise<string | null> {
  if (requestedGameDirectoryPath) {
    const normalizedRequestedGameDirectoryPath = path.resolve(requestedGameDirectoryPath)

    if (await pathExists(path.join(normalizedRequestedGameDirectoryPath, 'data'))) {
      return normalizedRequestedGameDirectoryPath
    }
  }

  const steamLibraryDirectoryPaths = await findSteamLibraryDirectoryPaths()

  for (const steamLibraryDirectoryPath of steamLibraryDirectoryPaths) {
    const candidateGameDirectoryPath = path.join(
      steamLibraryDirectoryPath,
      'steamapps',
      'common',
      'Battle Brothers',
    )

    if (await pathExists(path.join(candidateGameDirectoryPath, 'data'))) {
      return candidateGameDirectoryPath
    }
  }

  return null
}

async function getRelevantArchivePaths(gameDirectoryPath: string): Promise<string[]> {
  const dataDirectoryPath = path.join(gameDirectoryPath, 'data')
  const dataFileNames = await readdir(dataDirectoryPath)
  const legendsAssetArchiveFileNames = dataFileNames
    .filter((fileName) => /^mod_legends-assets.*\.zip$/i.test(fileName))
    .toSorted((leftFileName, rightFileName) => rightFileName.localeCompare(leftFileName))
  const baseArchiveFileNames = dataFileNames
    .filter((fileName) => /^data_\d+\.dat$/i.test(fileName))
    .toSorted((leftFileName, rightFileName) => rightFileName.localeCompare(leftFileName))

  return [
    ...legendsAssetArchiveFileNames.map((fileName) => path.join(dataDirectoryPath, fileName)),
    ...baseArchiveFileNames.map((fileName) => path.join(dataDirectoryPath, fileName)),
  ]
}

async function listArchiveEntries(archivePath: string): Promise<Set<string>> {
  const archiveListingOutput = await runCommand('tar', ['-tf', archivePath])

  return new Set(
    archiveListingOutput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  )
}

async function extractArchiveEntries(
  archivePath: string,
  archiveEntryPaths: string[],
  extractionDirectoryPath: string,
): Promise<void> {
  for (const archiveEntryPathChunk of chunkValues(archiveEntryPaths, 48)) {
    await runCommand('tar', [
      '-xf',
      archivePath,
      '-C',
      extractionDirectoryPath,
      ...archiveEntryPathChunk,
    ])
  }
}

async function copyExtractedIconsToOutputDirectory({
  iconPaths,
  extractionDirectoryPath,
  outputDirectoryPath,
}: {
  iconPaths: string[]
  extractionDirectoryPath: string
  outputDirectoryPath: string
}): Promise<number> {
  let copiedIconCount = 0

  for (const iconPath of iconPaths) {
    const archiveEntryPath = getArchiveEntryPathFromIconPath(iconPath)
    const sourceFilePath = path.join(extractionDirectoryPath, ...archiveEntryPath.split('/'))

    if (!(await pathExists(sourceFilePath))) {
      continue
    }

    const targetFilePath = path.join(
      outputDirectoryPath,
      ...normalizeRelativeIconPath(iconPath).split('/'),
    )
    await mkdir(path.dirname(targetFilePath), { recursive: true })
    await copyFile(sourceFilePath, targetFilePath)
    copiedIconCount += 1
  }

  return copiedIconCount
}

export async function syncLegendsIcons({
  backgroundFitDatasetFilePath = defaultBackgroundFitDatasetFilePath,
  catalogDatasetFilePath = defaultCatalogDatasetFilePath,
  dataset = null,
  gameDirectoryPath = null,
  outputDirectoryPath = defaultIconOutputDirectoryPath,
}: SyncLegendsIconsOptions = {}): Promise<SyncLegendsIconsResult> {
  const resolvedDataset =
    dataset ??
    (await readIconSourceDataset({
      backgroundFitDatasetFilePath,
      catalogDatasetFilePath,
    }))
  const resolvedGameDirectoryPath = await findBattleBrothersGameDirectoryPath(gameDirectoryPath)

  if (!resolvedGameDirectoryPath) {
    throw new Error(
      'Unable to find a local Battle Brothers install. Set BATTLE_BROTHERS_GAME_DIR to the game folder to sync icons.',
    )
  }

  const iconPaths = collectRequiredGameIconPaths(resolvedDataset)
  const archivePaths = await getRelevantArchivePaths(resolvedGameDirectoryPath)

  if (archivePaths.length === 0) {
    throw new Error(
      `No readable Battle Brothers archives were found under ${resolvedGameDirectoryPath}.`,
    )
  }

  const archiveEntriesByArchivePath = new Map<string, Set<string>>()

  for (const archivePath of archivePaths) {
    archiveEntriesByArchivePath.set(archivePath, await listArchiveEntries(archivePath))
  }

  const extractionPlan = buildIconExtractionPlan(iconPaths, archiveEntriesByArchivePath)
  const extractionDirectoryPath = await mkdtemp(path.join(os.tmpdir(), 'battle-brothers-icons-'))
  const stagingOutputDirectoryPath =
    outputDirectoryPath === defaultIconOutputDirectoryPath
      ? defaultStagingIconOutputDirectoryPath
      : `${outputDirectoryPath}-staging`

  await removePath(stagingOutputDirectoryPath, { force: true, recursive: true })
  await mkdir(stagingOutputDirectoryPath, { recursive: true })

  try {
    for (const [archivePath, archiveEntryPaths] of extractionPlan.entriesByArchivePath.entries()) {
      await extractArchiveEntries(archivePath, archiveEntryPaths, extractionDirectoryPath)
    }

    const extractedIconCount = await copyExtractedIconsToOutputDirectory({
      extractionDirectoryPath,
      iconPaths,
      outputDirectoryPath: stagingOutputDirectoryPath,
    })

    await removePath(outputDirectoryPath, { force: true, recursive: true })
    await copyDirectory(stagingOutputDirectoryPath, outputDirectoryPath, { recursive: true })

    return {
      archivePaths,
      extractedIconCount,
      gameDirectoryPath: resolvedGameDirectoryPath,
      missingIconPaths: extractionPlan.missingIconPaths,
      outputDirectoryPath,
    }
  } finally {
    await removePath(extractionDirectoryPath, { force: true, recursive: true })
    await removePath(stagingOutputDirectoryPath, { force: true, recursive: true })
  }
}
