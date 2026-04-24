import { Buffer } from 'node:buffer'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import type { Config } from '@netlify/functions'
import { Resvg } from '@resvg/resvg-js'

import { createBuildSharePreviewPayloadFromSearch } from '../../src/lib/build-share-preview.ts'
import {
  buildSocialImageWidth,
  createBuildSocialImageSvg,
} from '../../src/lib/build-social-image.ts'
import type { BuildSharePreviewPayload, BuildSharePreviewPerk } from '../../src/lib/build-share-preview.ts'

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

const dayInSeconds = 60 * 60 * 24
const hourInSeconds = 60 * 60
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

function getGameIconsDirectory(): string {
  return path.resolve(process.cwd(), 'public', 'game-icons')
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

function renderBuildSocialImagePng(payload: BuildSharePreviewPayload): Uint8Array {
  const svg = createBuildSocialImageSvg(payload, {
    resolveIconDataUrl: getIconDataUrl,
  })
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: buildSocialImageWidth,
    },
    font: {
      loadSystemFonts: true,
      sansSerifFamily: 'Arial',
    },
  })

  return resvg.render().asPng()
}

function createFallbackPayload(): BuildSharePreviewPayload {
  return createBuildSharePreviewPayloadFromSearch('')
}

function renderBuildSocialImagePngWithFallback(payload: BuildSharePreviewPayload): Uint8Array {
  try {
    return renderBuildSocialImagePng(payload)
  } catch (renderError) {
    try {
      return renderBuildSocialImagePng(createFallbackPayload())
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

export function createBuildSocialImageResponse(requestUrl: URL): BuildSocialImageResponse {
  const payload = createBuildSharePreviewPayloadFromSearch(requestUrl.searchParams)
  const body = renderBuildSocialImagePngWithFallback(payload)
  const cachePolicy = payload.status === 'found' ? successfulImageCachePolicy : fallbackImageCachePolicy

  return {
    body,
    headers: buildHeaders({
      byteLength: body.byteLength,
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

export default async function buildSocialImage(request: Request): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response(null, {
      headers: {
        allow: 'GET, HEAD',
      },
      status: 405,
    })
  }

  try {
    const imageResponse = createBuildSocialImageResponse(new URL(request.url))

    return new Response(request.method === 'HEAD' ? null : Buffer.from(imageResponse.body), {
      headers: imageResponse.headers,
      status: imageResponse.status,
    })
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Failed to render build social image.')

    return createBuildSocialImageErrorResponse(request.method)
  }
}

export const config: Config = {
  path: '/social/build.png',
}
