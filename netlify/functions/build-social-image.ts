import { Buffer } from 'node:buffer'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Config } from '@netlify/functions'
import { Resvg } from '@resvg/resvg-js'

import { createBuildSharePreviewPayloadFromSearch } from '../../src/lib/build-share-preview'
import { buildSocialImageWidth, createBuildSocialImageSvg } from '../../src/lib/build-social-image'
import type {
  BuildSharePreviewPayload,
  BuildSharePreviewPerk,
} from '../../src/lib/build-share-preview'

type BuildSocialImageCachePolicy = {
  browser: string
  cdn: string
  netlifyCdn: string
}

type BuildSocialImageResponse = {
  body: Uint8Array
  headers: Record<string, string>
  status: number
}

type BuildSocialImageRenderResult = {
  body: Uint8Array
  usedFallback: boolean
}

type BuildSocialImageResponseOptions = {
  renderPng?: (payload: BuildSharePreviewPayload) => Uint8Array
}

type BuildSocialImageHandlerOptions = {
  createResponse?: (requestUrl: URL) => BuildSocialImageResponse
}

type BuildSocialImageSearchSource = {
  isLegacyRoute: boolean
  searchParams: URLSearchParams
}

const dayInSeconds = 60 * 60 * 24
const hourInSeconds = 60 * 60
const buildSocialImagePathPrefix = '/social/builds/'
const legacyBuildSocialImagePath = '/social/build.png'
const socialImageFontFamily = 'Source Sans 3'
const socialImageFontFileNames = [
  'source-sans-3-latin-400-normal.woff',
  'source-sans-3-latin-600-normal.woff',
  'source-sans-3-latin-700-normal.woff',
]
const successfulImageCachePolicy: BuildSocialImageCachePolicy = {
  browser: 'public, max-age=0, must-revalidate',
  cdn: `public, max-age=${30 * dayInSeconds}, stale-while-revalidate=${30 * dayInSeconds}`,
  netlifyCdn: `public, durable, max-age=${30 * dayInSeconds}, stale-while-revalidate=${30 * dayInSeconds}`,
}
const fallbackImageCachePolicy: BuildSocialImageCachePolicy = {
  browser: `public, max-age=${hourInSeconds}, stale-while-revalidate=${dayInSeconds}`,
  cdn: `public, max-age=${hourInSeconds}, stale-while-revalidate=${dayInSeconds}`,
  netlifyCdn: `public, durable, max-age=${hourInSeconds}, stale-while-revalidate=${dayInSeconds}`,
}
const legacyImageCachePolicy: BuildSocialImageCachePolicy = {
  browser: 'no-store, max-age=0',
  cdn: 'no-store',
  netlifyCdn: 'no-store',
}

function getGameIconsDirectory(): string {
  return path.resolve(process.cwd(), 'public', 'game-icons')
}

function getCurrentModuleDirectory(): string {
  return path.dirname(fileURLToPath(import.meta.url))
}

function getSocialImageFontFileCandidates(fileName: string): string[] {
  const moduleDirectory = getCurrentModuleDirectory()
  const fontPath = path.join('@fontsource', 'source-sans-3', 'files', fileName)

  return [
    path.resolve(process.cwd(), 'node_modules', fontPath),
    path.resolve(moduleDirectory, 'node_modules', fontPath),
    path.resolve(moduleDirectory, '..', 'node_modules', fontPath),
    path.resolve(moduleDirectory, '..', '..', 'node_modules', fontPath),
    path.resolve(moduleDirectory, '..', '..', '..', 'node_modules', fontPath),
  ]
}

export function resolveBuildSocialImageFontFiles(): string[] {
  const resolvedFontFilePaths: string[] = []
  const seenFontFilePaths = new Set<string>()

  for (const fontFileName of socialImageFontFileNames) {
    const fontFilePath = getSocialImageFontFileCandidates(fontFileName).find((candidatePath) =>
      existsSync(candidatePath),
    )

    if (fontFilePath && !seenFontFilePaths.has(fontFilePath)) {
      resolvedFontFilePaths.push(fontFilePath)
      seenFontFilePaths.add(fontFilePath)
    }
  }

  return resolvedFontFilePaths
}

function resolveIconFilePath(iconPath: string | null): string | null {
  if (!iconPath || iconPath.includes('\0')) {
    return null
  }

  const gameIconsDirectory = getGameIconsDirectory()
  const iconFilePath = path.resolve(gameIconsDirectory, iconPath)
  const relativeIconFilePath = path.relative(gameIconsDirectory, iconFilePath)

  if (relativeIconFilePath.startsWith('..') || path.isAbsolute(relativeIconFilePath)) {
    return null
  }

  return iconFilePath
}

function getIconDataUrl(perk: BuildSharePreviewPerk): string | null {
  const iconFilePath = resolveIconFilePath(perk.iconPath)

  if (!iconFilePath || !existsSync(iconFilePath)) {
    return null
  }

  return `data:image/png;base64,${readFileSync(iconFilePath).toString('base64')}`
}

export function renderBuildSocialImagePng(payload: BuildSharePreviewPayload): Uint8Array {
  const svg = createBuildSocialImageSvg(payload, {
    resolveIconDataUrl: getIconDataUrl,
  })
  const fontFiles = resolveBuildSocialImageFontFiles()
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: buildSocialImageWidth,
    },
    font: {
      defaultFontFamily: socialImageFontFamily,
      fontFiles,
      loadSystemFonts: fontFiles.length === 0,
      sansSerifFamily: socialImageFontFamily,
    },
  })

  return resvg.render().asPng()
}

function createFallbackPayload(): BuildSharePreviewPayload {
  return createBuildSharePreviewPayloadFromSearch('')
}

function renderBuildSocialImagePngWithFallback(
  payload: BuildSharePreviewPayload,
  renderPng: (payload: BuildSharePreviewPayload) => Uint8Array = renderBuildSocialImagePng,
): BuildSocialImageRenderResult {
  try {
    return {
      body: renderPng(payload),
      usedFallback: false,
    }
  } catch (renderError) {
    try {
      return {
        body: renderPng(createFallbackPayload()),
        usedFallback: true,
      }
    } catch (fallbackRenderError) {
      throw new AggregateError(
        [renderError, fallbackRenderError],
        'Failed to render build social image, including fallback image.',
        {
          cause: fallbackRenderError,
        },
      )
    }
  }
}

function buildHeaders({
  byteLength,
  cachePolicy,
}: {
  byteLength: number
  cachePolicy: BuildSocialImageCachePolicy
}): Record<string, string> {
  return {
    'cache-control': cachePolicy.browser,
    'cdn-cache-control': cachePolicy.cdn,
    'content-length': byteLength.toString(),
    'content-type': 'image/png',
    'netlify-cdn-cache-control': cachePolicy.netlifyCdn,
  }
}

export function createBuildSocialImageSearchParamsFromPathname(
  pathname: string,
): URLSearchParams | null {
  if (!pathname.startsWith(buildSocialImagePathPrefix)) {
    return null
  }

  const pathTail = pathname.slice(buildSocialImagePathPrefix.length)
  const pathSegments = pathTail.split('/')

  if (pathSegments.length !== 2) {
    return new URLSearchParams()
  }

  const [encodedReference, encodedBuildFileName] = pathSegments

  if (!encodedReference || !encodedBuildFileName.toLowerCase().endsWith('.png')) {
    return new URLSearchParams()
  }

  try {
    decodeURIComponent(encodedReference)

    const encodedBuild = encodedBuildFileName.slice(0, -'.png'.length)
    const build = decodeURIComponent(encodedBuild)

    if (!build.trim()) {
      return new URLSearchParams()
    }

    return new URLSearchParams({
      build,
    })
  } catch {
    return new URLSearchParams()
  }
}

function getBuildSocialImageSearchSource(requestUrl: URL): BuildSocialImageSearchSource {
  const pathSearchParams = createBuildSocialImageSearchParamsFromPathname(requestUrl.pathname)

  if (pathSearchParams) {
    return {
      isLegacyRoute: false,
      searchParams: pathSearchParams,
    }
  }

  return {
    isLegacyRoute: requestUrl.pathname === legacyBuildSocialImagePath,
    searchParams: new URLSearchParams(requestUrl.searchParams),
  }
}

export function createBuildSocialImageResponse(
  requestUrl: URL,
  { renderPng }: BuildSocialImageResponseOptions = {},
): BuildSocialImageResponse {
  const searchSource = getBuildSocialImageSearchSource(requestUrl)
  const payload = createBuildSharePreviewPayloadFromSearch(searchSource.searchParams)
  const renderedImage = renderBuildSocialImagePngWithFallback(payload, renderPng)
  const cachePolicy = searchSource.isLegacyRoute
    ? legacyImageCachePolicy
    : payload.status === 'found' && !renderedImage.usedFallback
      ? successfulImageCachePolicy
      : fallbackImageCachePolicy

  return {
    body: renderedImage.body,
    headers: buildHeaders({
      byteLength: renderedImage.body.byteLength,
      cachePolicy,
    }),
    status: 200,
  }
}

function createBuildSocialImageErrorResponse(requestMethod: string): Response {
  return new Response(requestMethod === 'HEAD' ? null : 'Failed to render image.', {
    headers: {
      'cache-control': 'no-store, max-age=0',
      'content-type': 'text/plain; charset=utf-8',
    },
    status: 500,
  })
}

export function createBuildSocialImageHandler({
  createResponse = createBuildSocialImageResponse,
}: BuildSocialImageHandlerOptions = {}): (request: Request) => Promise<Response> {
  return async function buildSocialImage(request: Request): Promise<Response> {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response(null, {
        headers: {
          allow: 'GET, HEAD',
        },
        status: 405,
      })
    }

    try {
      const imageResponse = createResponse(new URL(request.url))

      return new Response(request.method === 'HEAD' ? null : Buffer.from(imageResponse.body), {
        headers: imageResponse.headers,
        status: imageResponse.status,
      })
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'Failed to render build social image.')

      return createBuildSocialImageErrorResponse(request.method)
    }
  }
}

const buildSocialImage = createBuildSocialImageHandler()

export default buildSocialImage

export const config: Config = {
  path: ['/social/builds/:reference/:build.png', '/social/build.png'],
}
