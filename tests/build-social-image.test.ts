import { Buffer } from 'node:buffer'
import { existsSync } from 'node:fs'
import type { Context } from '@netlify/functions'
import { describe, expect, test, vi } from 'vitest'
import { createBuildSharePreviewPayloadFromSearch } from '../src/lib/build-share-preview'
import { createBuildSocialImageSvg } from '../src/lib/build-social-image'
import buildSocialImage, {
  config,
  createBuildSocialImageSearchParamsFromPathname,
  createBuildSocialImageSearchParamsFromRouteParams,
  createBuildSocialImageHandler,
  createBuildSocialImageResponse,
  renderBuildSocialImagePng,
  resolveBuildSocialImageFontFiles,
} from '../netlify/functions/build-social-image'

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
const buildSocialImageContext = {
  params: {
    buildSlug: 'Clarity',
    reference: 'reference-mod_19.3.17',
  },
} as unknown as Context

describe('build social image', () => {
  test('declares the public social image route', () => {
    expect(config.path).toBe('/social/builds/:reference/:buildSlug.png')
  })

  test('resolves bundled social image fonts', () => {
    const fontFiles = resolveBuildSocialImageFontFiles()

    expect(fontFiles).toHaveLength(3)
    expect(fontFiles).toEqual(
      expect.arrayContaining([
        expect.stringContaining('SourceSans3-Regular.ttf'),
        expect.stringContaining('SourceSans3-Semibold.ttf'),
        expect.stringContaining('SourceSans3-Bold.ttf'),
      ]),
    )
    expect(fontFiles.every((fontFile) => existsSync(fontFile))).toBe(true)
  })

  test('renders picked perks and background fits into the SVG without duplicated sections', () => {
    const payload = createBuildSharePreviewPayloadFromSearch(
      '?build=Perfect+Focus,Peaceable,Clarity',
    )
    const svg = createBuildSocialImageSvg(payload)

    expect(svg).toContain('3 picked perks')
    expect(svg).toContain('Perfect Focus')
    expect(svg).toContain('Best background fits')
    expect(svg).toContain('expected perks')
    expect(svg).not.toContain('expected perk groups')
    expect(svg).toContain('BATTLE BROTHERS')
    expect(svg).toContain('LEGENDS')
    expect(svg).not.toContain('LEGENDS</tspan><tspan> BUILD')
    expect(svg).toContain('battlebrothers.academy')
    expect(svg).toContain('text-decoration="underline"')
    expect(svg).not.toContain('Shared perk groups')
    expect(svg).not.toContain('>Perfect Focus, Peaceable, Clarity<')
    expect(svg).not.toContain('<script')
  })

  test('tightens dense build list spacing and spaces preview rows consistently', () => {
    const payload = createBuildSharePreviewPayloadFromSearch('?build=Clarity')
    const svg = createBuildSocialImageSvg({
      ...payload,
      pickedPerkCount: 19,
      pickedPerks: Array.from({ length: 19 }, (_, perkIndex) => ({
        iconPath: null,
        perkName: `Perk ${perkIndex + 1}`,
      })),
      topBackgroundFits: [1, 2, 3].map((backgroundIndex) => ({
        backgroundName: `Background ${backgroundIndex}`,
        expectedCoveredPickedPerkCount: backgroundIndex + 0.5,
        guaranteedCoveredPickedPerkCount: backgroundIndex,
        iconPath: null,
      })),
    })

    expect(svg).toContain('19 picked perks')
    expect(svg).toContain('+9 more perks')
    expect(svg).toContain('Background 1')
    expect(svg).toContain('Background 2')
    expect(svg).toContain('Background 3')
  })

  test('renders background icons when they are available', () => {
    const payload = createBuildSharePreviewPayloadFromSearch(
      '?build=Perfect+Focus,Peaceable,Clarity',
    )
    const [firstBackgroundFit, ...remainingBackgroundFits] = payload.topBackgroundFits
    if (!firstBackgroundFit) {
      throw new Error('Expected at least one background fit.')
    }
    const svg = createBuildSocialImageSvg(
      {
        ...payload,
        topBackgroundFits: [
          {
            ...firstBackgroundFit,
            iconPath: 'ui/backgrounds/background_06.png',
          },
          ...remainingBackgroundFits,
        ],
      },
      {
        resolveBackgroundIconDataUrl: (backgroundFit) =>
          backgroundFit.iconPath ? 'data:image/png;base64,background' : null,
      },
    )

    expect(svg).toContain('background-fit-icon-clip-0')
    expect(svg).toContain('data:image/png;base64,background')
  })

  test('escapes XML and truncates long labels before rendering them', () => {
    const payload = createBuildSharePreviewPayloadFromSearch('?build=Clarity')
    const svg = createBuildSocialImageSvg({
      ...payload,
      imageAlt: 'Preview with <danger> & quotes',
      pickedPerks: [
        {
          iconPath: null,
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

  test('renders a PNG when icon files are missing', async () => {
    const payload = createBuildSharePreviewPayloadFromSearch('?build=Clarity')
    const body = await renderBuildSocialImagePng({
      ...payload,
      pickedPerks: payload.pickedPerks.map((perk) => ({
        ...perk,
        iconPath: 'missing-icon.png',
      })),
    })

    expect(Buffer.from(body).subarray(0, 8)).toEqual(pngSignature)
  })

  test('extracts canonical build search params from the path route', () => {
    const searchParams = createBuildSocialImageSearchParamsFromPathname(
      '/social/builds/reference-mod_19.3.17/Clarity%2CPerfect%20Focus.png',
    )

    expect(searchParams?.get('build')).toBe('Clarity,Perfect Focus')
  })

  test('extracts canonical build search params from Netlify route params', () => {
    const searchParams = createBuildSocialImageSearchParamsFromRouteParams({
      buildSlug: 'Browbeater%27s%20Bludgeon%2CBlacksmiths%20Technique',
      reference: '19.3.17',
    })

    expect(searchParams?.get('build')).toBe("Browbeater's Bludgeon,Blacksmiths Technique")
  })

  test('uses Netlify route params before falling back to the request path', async () => {
    const renderedBuilds: string[] = []
    const response = await createBuildSocialImageResponse(
      new URL('https://battlebrothers.academy/social/builds/%E0%A4%A/Student.png'),
      {
        renderPng: (payload) => {
          renderedBuilds.push(payload.pickedPerks.map((perk) => perk.perkName).join(','))

          return pngSignature
        },
        routeParams: {
          buildSlug: 'Clarity%2CPerfect%20Focus',
          reference: 'reference-mod_19.3.17',
        },
      },
    )

    expect(response.status).toBe(200)
    expect(renderedBuilds).toEqual(['Clarity,Perfect Focus'])
  })

  test('falls back to the generic payload for malformed path routes', async () => {
    const renderedStatuses: string[] = []
    const response = await createBuildSocialImageResponse(
      new URL('https://battlebrothers.academy/social/builds/%E0%A4%A/Clarity.png'),
      {
        renderPng: (payload) => {
          renderedStatuses.push(payload.status)

          return pngSignature
        },
      },
    )

    expect(response.status).toBe(200)
    expect(renderedStatuses).toEqual(['empty'])
    expect(response.headers['content-type']).toBe('image/png')
  })

  test('passes different path builds as distinct render payloads', async () => {
    const renderedBuilds: string[] = []
    const renderPng = (payload: ReturnType<typeof createBuildSharePreviewPayloadFromSearch>) => {
      renderedBuilds.push(payload.pickedPerks.map((perk) => perk.perkName).join(','))

      return pngSignature
    }

    await createBuildSocialImageResponse(
      new URL('https://battlebrothers.academy/social/builds/reference-mod_19.3.17/Student.png'),
      {
        renderPng,
      },
    )
    await createBuildSocialImageResponse(
      new URL('https://battlebrothers.academy/social/builds/reference-mod_19.3.17/Colossus.png'),
      {
        renderPng,
      },
    )

    expect(renderedBuilds).toEqual(['Student', 'Colossus'])
  })

  test('returns a PNG with durable cache headers for a valid build', async () => {
    const response = await createBuildSocialImageResponse(
      new URL(
        'https://battlebrothers.academy/social/builds/reference-mod_19.3.17/Clarity%2CPerfect%20Focus.png',
      ),
    )

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toBe('image/png')
    expect(response.headers['cache-control']).toBe('public, max-age=0, must-revalidate')
    expect(response.headers['netlify-cdn-cache-control']).toContain('durable')
    expect(response.headers['netlify-vary']).toBeUndefined()
    expect(Buffer.from(response.body).subarray(0, 8)).toEqual(pngSignature)
  })

  test('uses shorter cache headers when the renderer falls back to the generic image', async () => {
    let renderAttemptCount = 0
    const response = await createBuildSocialImageResponse(
      new URL('https://battlebrothers.academy/social/builds/reference-mod_19.3.17/Clarity.png'),
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
    expect(response.headers['netlify-vary']).toBeUndefined()
  })

  test('serves HEAD without a response body and rejects unsupported methods', async () => {
    const headResponse = await buildSocialImage(
      new Request(
        'https://battlebrothers.academy/social/builds/reference-mod_19.3.17/Clarity.png',
        {
          method: 'HEAD',
        },
      ),
      buildSocialImageContext,
    )
    const postResponse = await buildSocialImage(
      new Request(
        'https://battlebrothers.academy/social/builds/reference-mod_19.3.17/Clarity.png',
        {
          method: 'POST',
        },
      ),
      buildSocialImageContext,
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
      const response = await handler(
        new Request(
          'https://battlebrothers.academy/social/builds/reference-mod_19.3.17/Clarity.png',
        ),
        buildSocialImageContext,
      )

      expect(response.status).toBe(500)
      expect(response.headers.get('cache-control')).toBe('no-store, max-age=0')
      expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8')
      expect(response.headers.get('netlify-vary')).toBeNull()
      expect(consoleErrorSpy).toHaveBeenCalledWith('Renderer unavailable.')
      await expect(response.text()).resolves.toBe('Failed to render image.')
    } finally {
      consoleErrorSpy.mockRestore()
    }
  })

  test('falls back to path parsing when Netlify context params are missing', async () => {
    const renderedBuilds: string[] = []
    const handler = createBuildSocialImageHandler({
      createResponse: async (requestUrl, options) =>
        createBuildSocialImageResponse(requestUrl, {
          ...options,
          renderPng: (payload) => {
            renderedBuilds.push(payload.pickedPerks.map((perk) => perk.perkName).join(','))

            return pngSignature
          },
        }),
    })

    const response = await handler(
      new Request(
        'https://battlebrothers.academy/social/builds/reference-mod_19.3.17/Clarity%2CPerfect%20Focus.png',
      ),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')
    expect(renderedBuilds).toEqual(['Clarity,Perfect Focus'])
  })
})
