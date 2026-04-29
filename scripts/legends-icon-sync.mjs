import { spawn } from 'node:child_process'
import {
  access,
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

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRootDirectoryPath = path.resolve(__dirname, '..')
const defaultDatasetFilePath = path.join(
  projectRootDirectoryPath,
  'src',
  'data',
  'legends-perks.json',
)
const defaultIconOutputDirectoryPath = path.join(projectRootDirectoryPath, 'public', 'game-icons')
const defaultStagingIconOutputDirectoryPath = path.join(
  projectRootDirectoryPath,
  'public',
  'game-icons-staging',
)
const defaultSteamRootDirectoryPaths = [
  process.env.BATTLE_BROTHERS_STEAM_ROOT,
  process.env['PROGRAMFILES(X86)'] ? path.join(process.env['PROGRAMFILES(X86)'], 'Steam') : null,
  process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, 'Steam') : null,
]

function normalizeRelativeIconPath(relativeIconPath) {
  return relativeIconPath.replaceAll('\\', '/').replace(/^\/+/, '')
}

function sortUniqueStrings(values) {
  return [...new Set(values.filter(Boolean))].toSorted((leftValue, rightValue) =>
    leftValue.localeCompare(rightValue),
  )
}

async function pathExists(targetPath) {
  try {
    await access(targetPath)
    return true
  } catch {
    return false
  }
}

function chunkValues(values, maximumChunkLength) {
  const chunks = []

  for (let index = 0; index < values.length; index += maximumChunkLength) {
    chunks.push(values.slice(index, index + maximumChunkLength))
  }

  return chunks
}

function runCommand(commandName, commandArguments) {
  return new Promise((resolve, reject) => {
    const childProcess = spawn(commandName, commandArguments, {
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
    let standardOutput = ''
    let standardError = ''

    childProcess.stdout.on('data', (chunk) => {
      standardOutput += chunk.toString()
    })

    childProcess.stderr.on('data', (chunk) => {
      standardError += chunk.toString()
    })

    childProcess.on('error', reject)

    childProcess.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolve(standardOutput)
        return
      }

      reject(
        new Error(
          `Command failed: ${commandName} ${commandArguments.join(' ')}\n${standardError.trim()}`,
        ),
      )
    })
  })
}

export function collectRequiredGameIconPaths(dataset) {
  const iconPaths = new Set()

  for (const backgroundFitBackground of dataset.backgroundFitBackgrounds) {
    if (backgroundFitBackground.iconPath) {
      iconPaths.add(normalizeRelativeIconPath(backgroundFitBackground.iconPath))
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

export function getArchiveEntryPathFromIconPath(iconPath) {
  return `gfx/${normalizeRelativeIconPath(iconPath)}`
}

export function buildIconExtractionPlan(iconPaths, archiveEntriesByArchivePath) {
  const entriesByArchivePath = new Map()
  const missingIconPaths = []

  for (const iconPath of iconPaths) {
    const archiveEntryPath = getArchiveEntryPathFromIconPath(iconPath)
    const matchingArchivePath = [...archiveEntriesByArchivePath.keys()].find((archivePath) =>
      archiveEntriesByArchivePath.get(archivePath).has(archiveEntryPath),
    )

    if (!matchingArchivePath) {
      missingIconPaths.push(iconPath)
      continue
    }

    if (!entriesByArchivePath.has(matchingArchivePath)) {
      entriesByArchivePath.set(matchingArchivePath, [])
    }

    entriesByArchivePath.get(matchingArchivePath).push(archiveEntryPath)
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

async function readDatasetFile(datasetFilePath = defaultDatasetFilePath) {
  return JSON.parse(await readFile(datasetFilePath, 'utf8'))
}

async function findSteamLibraryDirectoryPaths() {
  const steamLibraryDirectoryPaths = new Set()

  for (const steamRootDirectoryPath of defaultSteamRootDirectoryPaths.filter(Boolean)) {
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
) {
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

async function getRelevantArchivePaths(gameDirectoryPath) {
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

async function listArchiveEntries(archivePath) {
  const archiveListingOutput = await runCommand('tar', ['-tf', archivePath])

  return new Set(
    archiveListingOutput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  )
}

async function extractArchiveEntries(archivePath, archiveEntryPaths, extractionDirectoryPath) {
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
}) {
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
  dataset = null,
  datasetFilePath = defaultDatasetFilePath,
  gameDirectoryPath = null,
  outputDirectoryPath = defaultIconOutputDirectoryPath,
} = {}) {
  const resolvedDataset = dataset ?? (await readDatasetFile(datasetFilePath))
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

  const archiveEntriesByArchivePath = new Map()

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
