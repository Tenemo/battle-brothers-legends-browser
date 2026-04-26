import { createWriteStream } from 'node:fs'
import { access, cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRootDirectoryPath = path.resolve(__dirname, '..')

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

function normalizeWhitespace(value) {
  return value.replace(/[ \t]+/g, ' ').trim()
}

function createFetchHeaders() {
  return {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'battle-brothers-legends-browser',
  }
}

export function getLatestReleaseApiUrl({
  githubApiBaseUrl = defaultLegendsGithubApiBaseUrl,
  githubRepository = defaultLegendsGithubRepository,
  requestedTagName = process.env.LEGENDS_REFERENCE_TAG ?? null,
} = {}) {
  if (requestedTagName) {
    return `${githubApiBaseUrl}/repos/${githubRepository}/releases/tags/${encodeURIComponent(requestedTagName)}`
  }

  return `${githubApiBaseUrl}/repos/${githubRepository}/releases/latest`
}

async function pathExists(targetPath) {
  try {
    await access(targetPath)
    return true
  } catch {
    return false
  }
}

function sanitizeReleaseTagName(tagName) {
  return normalizeWhitespace(tagName).replace(/[<>:"/\\|?*]+/g, '-')
}

async function runCommand(commandName, commandArguments) {
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

async function downloadArchiveFile(downloadUrl, archiveFilePath, fetchImpl) {
  const response = await fetchImpl(downloadUrl, {
    headers: createFetchHeaders(),
    redirect: 'follow',
  })

  if (!response.ok || !response.body) {
    throw new Error(`Unable to download ${downloadUrl}. GitHub returned ${response.status}.`)
  }

  await mkdir(path.dirname(archiveFilePath), { recursive: true })
  await pipeline(Readable.fromWeb(response.body), createWriteStream(archiveFilePath))
}

async function extractArchiveFile(archiveFilePath, extractionDirectoryPath) {
  await mkdir(extractionDirectoryPath, { recursive: true })
  await runCommand('tar', ['-xf', archiveFilePath, '-C', extractionDirectoryPath])
}

export async function findModLegendsDirectory(rootDirectoryPath) {
  const pendingDirectoryPaths = [rootDirectoryPath]

  while (pendingDirectoryPaths.length > 0) {
    const currentDirectoryPath = pendingDirectoryPaths.shift()
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
) {
  if (!(await pathExists(metadataFilePath))) {
    return null
  }

  return JSON.parse(await readFile(metadataFilePath, 'utf8'))
}

export async function fetchLatestLegendsReleaseDescriptor({
  fetchImpl = fetch,
  githubApiBaseUrl = defaultLegendsGithubApiBaseUrl,
  githubRepository = defaultLegendsGithubRepository,
  requestedTagName = process.env.LEGENDS_REFERENCE_TAG ?? null,
} = {}) {
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

  return {
    archiveDownloadUrl: releasePayload.tarball_url,
    publishedAt: releasePayload.published_at,
    releasePageUrl: releasePayload.html_url,
    tagName: releasePayload.tag_name,
  }
}

function createReferenceMetadata({
  githubRepository,
  releaseDescriptor,
  referenceRootDirectoryPath,
}) {
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
}) {
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

    await rm(currentDirectoryPath, { force: true, recursive: true })
    await mkdir(currentDirectoryPath, { recursive: true })
    await cp(extractedReferenceRootDirectoryPath, path.join(currentDirectoryPath, 'mod_legends'), {
      recursive: true,
    })

    if (await pathExists(extractedScriptsDirectoryPath)) {
      await cp(extractedScriptsDirectoryPath, path.join(currentDirectoryPath, 'scripts'), {
        recursive: true,
      })
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
    await rm(temporaryDirectoryPath, { force: true, recursive: true })
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
} = {}) {
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
