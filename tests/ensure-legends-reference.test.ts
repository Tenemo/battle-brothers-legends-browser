import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import {
  ensureLatestLegendsReference,
  findModLegendsDirectory,
  getLatestReleaseApiUrl,
} from '../scripts/ensure-legends-reference.mjs'

const temporaryDirectoryPaths: string[] = []

async function createTemporaryDirectory() {
  const temporaryDirectoryPath = await mkdtemp(path.join(os.tmpdir(), 'legends-reference-test-'))
  temporaryDirectoryPaths.push(temporaryDirectoryPath)
  return temporaryDirectoryPath
}

afterEach(async () => {
  for (const temporaryDirectoryPath of temporaryDirectoryPaths.splice(0)) {
    await rm(temporaryDirectoryPath, { force: true, recursive: true })
  }
})

describe('ensure legends reference', () => {
  test('builds the correct GitHub API url for latest and pinned releases', () => {
    expect(getLatestReleaseApiUrl()).toBe(
      'https://api.github.com/repos/Battle-Brothers-Legends/Legends-public/releases/latest',
    )
    expect(getLatestReleaseApiUrl({ requestedTagName: '19.3.15' })).toBe(
      'https://api.github.com/repos/Battle-Brothers-Legends/Legends-public/releases/tags/19.3.15',
    )
  })

  test('finds a nested mod_legends directory inside an extracted archive', async () => {
    const rootDirectoryPath = await createTemporaryDirectory()
    const nestedModDirectoryPath = path.join(
      rootDirectoryPath,
      'Battle-Brothers-Legends-Legends-public-abcdef',
      'mod_legends',
    )

    await mkdir(nestedModDirectoryPath, { recursive: true })

    expect(await findModLegendsDirectory(rootDirectoryPath)).toBe(nestedModDirectoryPath)
  })

  test('downloads and caches the latest release into the gitignored dependency directory', async () => {
    const cacheDirectoryPath = await createTemporaryDirectory()
    let apiRequestCount = 0
    let archiveDownloadCount = 0
    const fetchImpl: typeof fetch = async (input) => {
      const requestUrl = String(input)

      if (requestUrl.includes('/releases/latest')) {
        apiRequestCount += 1

        return new Response(
          JSON.stringify({
            html_url: 'https://github.com/Battle-Brothers-Legends/Legends-public/releases/tag/19.3.15',
            published_at: '2026-04-21T20:09:00Z',
            tag_name: '19.3.15',
            zipball_url: 'https://example.invalid/legends-public-19.3.15.zip',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }

      archiveDownloadCount += 1
      return new Response(new Uint8Array([1, 2, 3]), { status: 200 })
    }

    const referenceMetadata = await ensureLatestLegendsReference({
      cacheDirectoryPath,
      downloadArchiveImpl: async (_downloadUrl, archiveFilePath) => {
        await mkdir(path.dirname(archiveFilePath), { recursive: true })
        await writeFile(archiveFilePath, 'placeholder archive', 'utf8')
      },
      extractArchiveImpl: async (_archiveFilePath, extractionDirectoryPath) => {
        await mkdir(path.join(extractionDirectoryPath, 'repo-root', 'mod_legends'), {
          recursive: true,
        })
        await writeFile(
          path.join(extractionDirectoryPath, 'repo-root', 'mod_legends', 'placeholder.nut'),
          '// fixture',
          'utf8',
        )
      },
      fetchImpl,
    })

    expect(referenceMetadata.tagName).toBe('19.3.15')
    expect(referenceMetadata.referenceRootDirectoryPath).toBe(
      path.join(cacheDirectoryPath, 'current', 'mod_legends'),
    )
    expect(apiRequestCount).toBe(1)
    expect(archiveDownloadCount).toBe(0)

    const cachedReferenceMetadata = await ensureLatestLegendsReference({
      cacheDirectoryPath,
      downloadArchiveImpl: async () => {
        throw new Error('unexpected archive download')
      },
      extractArchiveImpl: async () => {
        throw new Error('unexpected extraction')
      },
      fetchImpl,
    })

    expect(cachedReferenceMetadata.tagName).toBe('19.3.15')
    expect(apiRequestCount).toBe(2)
  })

  test('falls back to the cached dependency when GitHub is unavailable', async () => {
    const cacheDirectoryPath = await createTemporaryDirectory()

    await ensureLatestLegendsReference({
      cacheDirectoryPath,
      downloadArchiveImpl: async (_downloadUrl, archiveFilePath) => {
        await mkdir(path.dirname(archiveFilePath), { recursive: true })
        await writeFile(archiveFilePath, 'placeholder archive', 'utf8')
      },
      extractArchiveImpl: async (_archiveFilePath, extractionDirectoryPath) => {
        await mkdir(path.join(extractionDirectoryPath, 'repo-root', 'mod_legends'), {
          recursive: true,
        })
        await writeFile(
          path.join(extractionDirectoryPath, 'repo-root', 'mod_legends', 'placeholder.nut'),
          '// fixture',
          'utf8',
        )
      },
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            html_url: 'https://github.com/Battle-Brothers-Legends/Legends-public/releases/tag/19.3.15',
            published_at: '2026-04-21T20:09:00Z',
            tag_name: '19.3.15',
            zipball_url: 'https://example.invalid/legends-public-19.3.15.zip',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    })

    const cachedReferenceMetadata = await ensureLatestLegendsReference({
      cacheDirectoryPath,
      fetchImpl: async () => {
        throw new Error('GitHub is unavailable')
      },
    })

    expect(cachedReferenceMetadata.tagName).toBe('19.3.15')
    expect(cachedReferenceMetadata.cacheFallbackReason).toContain('GitHub is unavailable')
  })
})
