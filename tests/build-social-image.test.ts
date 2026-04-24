import { Buffer } from 'node:buffer'
import { existsSync } from 'node:fs'
import { describe, expect, test, vi } from 'vitest'
import { createBuildSharePreviewPayloadFromSearch } from '../src/lib/build-share-preview'
import { createBuildSocialImageSvg } from '../src/lib/build-social-image'
import buildSocialImage, {
  config,
  createBuildSocialImageHandler,
  createBuildSocialImageResponse,
  renderBuildSocialImagePng,
  resolveBuildSocialImageFontFiles,
} from '../netlify/functions/build-social-image'

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

describe('build social image', () => {
  test('declares the public social image route', () => {
    expect(config.path).toBe('/social/build.png')
  })

  test('resolves bundled social image fonts', () => {
    const fontFiles = resolveBuildSocialImageFontFiles()

    expect(fontFiles).toHaveLength(3)
    expect(fontFiles).toEqual(
      expect.arrayContaining([
        expect.stringContaining('source-sans-3-latin-400-normal.woff'),
        expect.stringContaining('source-sans-3-latin-600-normal.woff'),
        expect.stringContaining('source-sans-3-latin-700-normal.woff'),
      ]),
    )
    expect(fontFiles.every((fontFile) => existsSync(fontFile))).toBe(true)
  })

  test('renders picked perks, shared groups, and background fits into the SVG', () => {
    const payload = createBuildSharePreviewPayloadFromSearch(
      '?build=Perfect+Focus&build=Peaceable&build=Clarity',
    )
    const svg = createBuildSocialImageSvg(payload)

    expect(svg).toContain('3 picked perks')
    expect(svg).toContain('Perfect Focus')
    expect(svg).toContain('Shared perk groups')
    expect(svg).toContain('Best background fits')
    expect(svg).not.toContain('<script')
  })

  test('renders ASCII footer separators for unsupported groups', () => {
    const payload = createBuildSharePreviewPayloadFromSearch('?build=Clarity')
    const svg = createBuildSocialImageSvg({
      ...payload,
      unsupportedTargetCount: 2,
    })

    expect(svg).toContain(' - 2 unsupported groups')
    expect([...svg].every((character) => character.charCodeAt(0) <= 0x7f)).toBe(true)
  })

  test('escapes XML and truncates long labels before rendering them', () => {
    const payload = createBuildSharePreviewPayloadFromSearch('?build=Clarity')
    const svg = createBuildSocialImageSvg({
      ...payload,
      imageAlt: 'Preview with <danger> & quotes',
      pickedPerks: [
        {
          iconPath: null,
          id: 'test',
          perkName: 'A very long perk name with <xml> & enough extra words to require trimming',
        },
      ],
      pickedPerkCount: 1,
      title: 'Battle Brothers Legends build: 1 perk',
    })

    expect(svg).toContain('&lt;danger&gt; &amp; quotes')
    expect(svg).toContain('&lt;xml&gt;')
    expect(svg).toContain('...')
  })

  test('renders a PNG when icon files are missing', () => {
    const payload = createBuildSharePreviewPayloadFromSearch('?build=Clarity')
    const body = renderBuildSocialImagePng({
      ...payload,
      pickedPerks: payload.pickedPerks.map((perk) => ({
        ...perk,
        iconPath: 'missing-icon.png',
      })),
    })

    expect(Buffer.from(body).subarray(0, 8)).toEqual(pngSignature)
  })

  test('returns a PNG with durable cache headers for a valid build', () => {
    const response = createBuildSocialImageResponse(
      new URL('https://battlebrothers.academy/social/build.png?build=Clarity&build=Perfect+Focus'),
    )

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toBe('image/png')
    expect(response.headers['cache-control']).toBe('public, max-age=0, must-revalidate')
    expect(response.headers['netlify-cdn-cache-control']).toContain('durable')
    expect(Buffer.from(response.body).subarray(0, 8)).toEqual(pngSignature)
  })

  test('uses shorter cache headers when the renderer falls back to the generic image', () => {
    let renderAttemptCount = 0
    const response = createBuildSocialImageResponse(
      new URL('https://battlebrothers.academy/social/build.png?build=Clarity'),
      {
        renderPng: () => {
          renderAttemptCount += 1

          if (renderAttemptCount === 1) {
            throw new Error('Primary render failed.')
          }

          return pngSignature
        },
      },
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual(pngSignature)
    expect(response.headers['netlify-cdn-cache-control']).toContain('max-age=3600')
    expect(response.headers['netlify-cdn-cache-control']).not.toContain('max-age=2592000')
  })

  test('serves HEAD without a response body and rejects unsupported methods', async () => {
    const headResponse = await buildSocialImage(
      new Request('https://battlebrothers.academy/social/build.png?build=Clarity', {
        method: 'HEAD',
      }),
    )
    const postResponse = await buildSocialImage(
      new Request('https://battlebrothers.academy/social/build.png', {
        method: 'POST',
      }),
    )

    expect(headResponse.status).toBe(200)
    expect(headResponse.headers.get('content-type')).toBe('image/png')
    expect(await headResponse.text()).toBe('')
    expect(postResponse.status).toBe(405)
    expect(postResponse.headers.get('allow')).toBe('GET, HEAD')
  })

  test('returns a no-store error response when image rendering fails completely', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const handler = createBuildSocialImageHandler({
      createResponse: () => {
        throw new Error('Renderer unavailable.')
      },
    })

    try {
      const response = await handler(new Request('https://battlebrothers.academy/social/build.png?build=Clarity'))

      expect(response.status).toBe(500)
      expect(response.headers.get('cache-control')).toBe('no-store, max-age=0')
      expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Renderer unavailable.')
      await expect(response.text()).resolves.toBe('Failed to render image.')
    } finally {
      consoleErrorSpy.mockRestore()
    }
  })
})
