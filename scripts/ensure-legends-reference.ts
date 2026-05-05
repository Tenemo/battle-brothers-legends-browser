import { createWriteStream } from 'node:fs'
import {
  cp as copyDirectory,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm as removePath,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { pathExists, runCommand } from './script-utils.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRootDirectoryPath = path.resolve(__dirname, '..')

export type LegendsReferenceMetadata = {
  archiveDownloadUrl: string
  cacheFallbackReason?: string
  cachedAt: string
  githubRepository: string
  publishedAt: string
  referenceRootDirectoryPath: string
  releasePageUrl: string
  tagName: string
}

type LegendsReleaseDescriptor = {
  archiveDownloadUrl: string
  publishedAt: string
  releasePageUrl: string
  tagName: string
}

type DownloadArchiveImplementation = (
  downloadUrl: string,
  archiveFilePath: string,
  fetchImpl: typeof fetch,
) => Promise<void>

type ExtractArchiveImplementation = (
  archiveFilePath: string,
  extractionDirectoryPath: string,
) => Promise<void>

type EnsureLatestLegendsReferenceOptions = {
  cacheDirectoryPath?: string
  downloadArchiveImpl?: DownloadArchiveImplementation
  extractArchiveImpl?: ExtractArchiveImplementation
  fetchImpl?: typeof fetch
  githubApiBaseUrl?: string
  githubRepository?: string
  requestedTagName?: string | null
}

type GetLatestReleaseApiUrlOptions = {
  githubApiBaseUrl?: string
  githubRepository?: string
  requestedTagName?: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readRequiredStringProperty(value: Record<string, unknown>, propertyName: string): string {
  const propertyValue = value[propertyName]

  if (typeof propertyValue !== 'string') {
    throw new Error(`Legends release payload is missing string property ${propertyName}.`)
  }

  return propertyValue
}

export const defaultLegendsGithubRepository = 'Battle-Brothers-Legends/Legends-public'
export const defaultLegendsGithubApiBaseUrl = 'https://api.github.com'
export const defaultLegendsReferenceCacheDirectoryPath = path.join(
  projectRootDirectoryPath,
  '.cache',
  'legends-public',
)
export const defaultLegendsReferenceDirectoryPath = path.join(
  defaultLegendsReferenceCacheDirectoryPath,
  'current',
  'mod_legends',
)
export const defaultLegendsReferenceMetadataFilePath = path.join(
  defaultLegendsReferenceCacheDirectoryPath,
  'current',
  'reference-metadata.json',
)

function normalizeWhitespace(value: string): string {
  return value.replace(/[ \t]+/g, ' ').trim()
}

function createFetchHeaders(): Record<string, string> {
  return {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'battle-brothers-legends-browser',
  }
}

export function getLatestReleaseApiUrl({
  githubApiBaseUrl = defaultLegendsGithubApiBaseUrl,
  githubRepository = defaultLegendsGithubRepository,
  requestedTagName = process.env.LEGENDS_REFERENCE_TAG ?? null,
}: GetLatestReleaseApiUrlOptions = {}): string {
  if (requestedTagName) {
    return `${githubApiBaseUrl}/repos/${githubRepository}/releases/tags/${encodeURIComponent(requestedTagName)}`
  }

  return `${githubApiBaseUrl}/repos/${githubRepository}/releases/latest`
}

function sanitizeReleaseTagName(tagName: string): string {
  return normalizeWhitespace(tagName).replace(/[<>:"/\\|?*]+/g, '-')
}

const downloadArchiveFile: DownloadArchiveImplementation = async (
  downloadUrl,
  archiveFilePath,
  fetchImpl,
) => {
  const response = await fetchImpl(downloadUrl, {
    headers: createFetchHeaders(),
    redirect: 'follow',
  })

  if (!response.ok || !response.body) {
    throw new Error(`Unable to download ${downloadUrl}. GitHub returned ${response.status}.`)
  }

  await mkdir(path.dirname(archiveFilePath), { recursive: true })
  await pipeline(
    Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]),
    createWriteStream(archiveFilePath),
  )
}

const extractArchiveFile: ExtractArchiveImplementation = async (
  archiveFilePath,
  extractionDirectoryPath,
) => {
  await mkdir(extractionDirectoryPath, { recursive: true })
  await runCommand('tar', ['-xf', archiveFilePath, '-C', extractionDirectoryPath])
}

export async function findModLegendsDirectory(rootDirectoryPath: string): Promise<string | null> {
  const pendingDirectoryPaths = [rootDirectoryPath]

  while (pendingDirectoryPaths.length > 0) {
    const currentDirectoryPath = pendingDirectoryPaths.shift()

    if (currentDirectoryPath === undefined) {
      break
    }

    const directoryEntries = await readdir(currentDirectoryPath, { withFileTypes: true })

    for (const directoryEntry of directoryEntries) {
      if (!directoryEntry.isDirectory()) {
        continue
      }

      const childDirectoryPath = path.join(currentDirectoryPath, directoryEntry.name)

      if (directoryEntry.name === 'mod_legends') {
        return childDirectoryPath
      }

      pendingDirectoryPaths.push(childDirectoryPath)
    }
  }

  return null
}

export async function readCachedLegendsReferenceMetadata(
  metadataFilePath = defaultLegendsReferenceMetadataFilePath,
): Promise<LegendsReferenceMetadata | null> {
  if (!(await pathExists(metadataFilePath))) {
    return null
  }

  return JSON.parse(await readFile(metadataFilePath, 'utf8')) as LegendsReferenceMetadata
}

export async function fetchLatestLegendsReleaseDescriptor({
  fetchImpl = fetch,
  githubApiBaseUrl = defaultLegendsGithubApiBaseUrl,
  githubRepository = defaultLegendsGithubRepository,
  requestedTagName = process.env.LEGENDS_REFERENCE_TAG ?? null,
}: {
  fetchImpl?: typeof fetch
  githubApiBaseUrl?: string
  githubRepository?: string
  requestedTagName?: string | null
} = {}): Promise<LegendsReleaseDescriptor> {
  const latestReleaseApiUrl = getLatestReleaseApiUrl({
    githubApiBaseUrl,
    githubRepository,
    requestedTagName,
  })
  const response = await fetchImpl(latestReleaseApiUrl, {
    headers: createFetchHeaders(),
  })

  if (!response.ok) {
    throw new Error(
      `Unable to resolve the Legends release from ${latestReleaseApiUrl}. GitHub returned ${response.status}.`,
    )
  }

  const releasePayload = await response.json()

  if (!isRecord(releasePayload)) {
    throw new Error('Legends release payload was not a JSON object.')
  }

  return {
    archiveDownloadUrl: readRequiredStringProperty(releasePayload, 'tarball_url'),
    publishedAt: readRequiredStringProperty(releasePayload, 'published_at'),
    releasePageUrl: readRequiredStringProperty(releasePayload, 'html_url'),
    tagName: readRequiredStringProperty(releasePayload, 'tag_name'),
  }
}

function createReferenceMetadata({
  githubRepository,
  releaseDescriptor,
  referenceRootDirectoryPath,
}: {
  githubRepository: string
  releaseDescriptor: LegendsReleaseDescriptor
  referenceRootDirectoryPath: string
}): LegendsReferenceMetadata {
  return {
    archiveDownloadUrl: releaseDescriptor.archiveDownloadUrl,
    cachedAt: new Date().toISOString(),
    githubRepository,
    publishedAt: releaseDescriptor.publishedAt,
    referenceRootDirectoryPath,
    releasePageUrl: releaseDescriptor.releasePageUrl,
    tagName: releaseDescriptor.tagName,
  }
}

async function populateCurrentReferenceDirectory({
  archiveDownloadUrl,
  currentDirectoryPath,
  downloadArchiveImpl = downloadArchiveFile,
  extractArchiveImpl = extractArchiveFile,
  fetchImpl,
  githubRepository,
  releaseDescriptor,
}: {
  archiveDownloadUrl: string
  currentDirectoryPath: string
  downloadArchiveImpl?: DownloadArchiveImplementation
  extractArchiveImpl?: ExtractArchiveImplementation
  fetchImpl: typeof fetch
  githubRepository: string
  releaseDescriptor: LegendsReleaseDescriptor
}): Promise<LegendsReferenceMetadata> {
  const temporaryDirectoryPath = await mkdtemp(path.join(os.tmpdir(), 'legends-reference-'))

  try {
    const archiveFilePath = path.join(
      temporaryDirectoryPath,
      `${sanitizeReleaseTagName(releaseDescriptor.tagName)}.tar.gz`,
    )
    const extractionDirectoryPath = path.join(temporaryDirectoryPath, 'extract')

    await downloadArchiveImpl(archiveDownloadUrl, archiveFilePath, fetchImpl)
    await extractArchiveImpl(archiveFilePath, extractionDirectoryPath)

    const extractedReferenceRootDirectoryPath =
      await findModLegendsDirectory(extractionDirectoryPath)

    if (extractedReferenceRootDirectoryPath === null) {
      throw new Error('Downloaded Legends archive did not contain a mod_legends directory.')
    }

    const extractedScriptsDirectoryPath = path.join(
      path.dirname(extractedReferenceRootDirectoryPath),
      'scripts',
    )

    await removePath(currentDirectoryPath, { force: true, recursive: true })
    await mkdir(currentDirectoryPath, { recursive: true })
    await copyDirectory(
      extractedReferenceRootDirectoryPath,
      path.join(currentDirectoryPath, 'mod_legends'),
      {
        recursive: true,
      },
    )

    if (await pathExists(extractedScriptsDirectoryPath)) {
      await copyDirectory(
        extractedScriptsDirectoryPath,
        path.join(currentDirectoryPath, 'scripts'),
        {
          recursive: true,
        },
      )
    }

    const referenceMetadata = createReferenceMetadata({
      githubRepository,
      referenceRootDirectoryPath: path.join(currentDirectoryPath, 'mod_legends'),
      releaseDescriptor,
    })
    await writeFile(
      path.join(currentDirectoryPath, 'reference-metadata.json'),
      `${JSON.stringify(referenceMetadata, null, 2)}\n`,
      'utf8',
    )

    return referenceMetadata
  } finally {
    await removePath(temporaryDirectoryPath, { force: true, recursive: true })
  }
}

export async function ensureLatestLegendsReference({
  cacheDirectoryPath = defaultLegendsReferenceCacheDirectoryPath,
  downloadArchiveImpl = downloadArchiveFile,
  extractArchiveImpl = extractArchiveFile,
  fetchImpl = fetch,
  githubApiBaseUrl = defaultLegendsGithubApiBaseUrl,
  githubRepository = defaultLegendsGithubRepository,
  requestedTagName = process.env.LEGENDS_REFERENCE_TAG ?? null,
}: EnsureLatestLegendsReferenceOptions = {}): Promise<LegendsReferenceMetadata> {
  const currentDirectoryPath = path.join(cacheDirectoryPath, 'current')
  const expectedReferenceRootDirectoryPath = path.join(currentDirectoryPath, 'mod_legends')
  const expectedScriptsDirectoryPath = path.join(currentDirectoryPath, 'scripts')
  const cachedReferenceMetadataFromDisk = await readCachedLegendsReferenceMetadata(
    path.join(currentDirectoryPath, 'reference-metadata.json'),
  )
  const cachedReferenceMetadata = cachedReferenceMetadataFromDisk
    ? {
        ...cachedReferenceMetadataFromDisk,
        referenceRootDirectoryPath: expectedReferenceRootDirectoryPath,
      }
    : null

  try {
    const releaseDescriptor = await fetchLatestLegendsReleaseDescriptor({
      fetchImpl,
      githubApiBaseUrl,
      githubRepository,
      requestedTagName,
    })

    if (
      cachedReferenceMetadata?.tagName === releaseDescriptor.tagName &&
      (await pathExists(expectedReferenceRootDirectoryPath)) &&
      (await pathExists(expectedScriptsDirectoryPath))
    ) {
      return cachedReferenceMetadata
    }

    await mkdir(cacheDirectoryPath, { recursive: true })

    return await populateCurrentReferenceDirectory({
      archiveDownloadUrl: releaseDescriptor.archiveDownloadUrl,
      currentDirectoryPath,
      downloadArchiveImpl,
      extractArchiveImpl,
      fetchImpl,
      githubRepository,
      releaseDescriptor,
    })
  } catch (error) {
    if (cachedReferenceMetadata && (await pathExists(expectedReferenceRootDirectoryPath))) {
      return {
        ...cachedReferenceMetadata,
        cacheFallbackReason: error instanceof Error ? error.message : String(error),
      }
    }

    throw error
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const referenceMetadata = await ensureLatestLegendsReference()

  console.log(
    `Using Legends ${referenceMetadata.tagName} from ${referenceMetadata.releasePageUrl} at ${referenceMetadata.referenceRootDirectoryPath}.`,
  )

  if (referenceMetadata.cacheFallbackReason) {
    console.warn(
      `GitHub refresh failed. Reused the cached dependency instead:\n${referenceMetadata.cacheFallbackReason}`,
    )
  }
}
