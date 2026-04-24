import { Buffer } from 'node:buffer'
import { describe, expect, test } from 'vitest'
import { createBuildSharePreviewPayloadFromSearch } from '../src/lib/build-share-preview'
import { createBuildSocialImageSvg } from '../src/lib/build-social-image'
import buildSocialImage, {
  createBuildSocialImageResponse,
} from '../netlify/functions/build-social-image'

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

describe('build social image', () => {
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
})
