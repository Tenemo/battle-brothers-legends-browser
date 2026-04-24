import { describe, expect, test, vi } from 'vitest'
import buildSeo, { createBuildSeoHandler } from '../netlify/edge-functions/build-seo'
import { injectSeoIntoHtml } from '../src/lib/seo-metadata'

const baseHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta name="battle-brothers-seo-start" content="1" />
    <title>placeholder</title>
    <meta name="battle-brothers-seo-end" content="1" />
  </head>
  <body><div id="root"></div></body>
</html>`

describe('build SEO edge function', () => {
  test('injects build metadata into HTML responses', async () => {
    const response = await buildSeo(
      new Request('https://battlebrothers.academy/?build=Clarity&build=Perfect+Focus'),
      {
        next: async () =>
          new Response(baseHtml, {
            headers: {
              'content-encoding': 'br',
              'content-length': '12',
              'content-type': 'text/html; charset=utf-8',
              etag: '"old"',
              'last-modified': 'Wed, 21 Oct 2015 07:28:00 GMT',
            },
            status: 203,
            statusText: 'Non-authoritative information',
          }),
      } as never,
    )
    const html = await response.text()

    expect(response.status).toBe(203)
    expect(response.statusText).toBe('Non-authoritative information')
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(response.headers.get('content-encoding')).toBeNull()
    expect(response.headers.get('content-length')).toBeNull()
    expect(response.headers.get('etag')).toBeNull()
    expect(response.headers.get('last-modified')).toBeNull()
    expect(html).toContain('<title>Battle Brothers Legends build: 2 perks</title>')
    expect(html).toContain('content="noindex, follow, noarchive, max-image-preview:large"')
  })

  test('replaces root metadata after Vite has injected the static SEO head', async () => {
    const rootHtml = injectSeoIntoHtml(baseHtml)
    const response = await buildSeo(
      new Request(
        'https://battlebrothers.academy/?search=last+sta&build=Muscularity,Immovable+Object,Brawny,Steadfast,Steel+Brow',
      ),
      {
        next: async () =>
          new Response(rootHtml, {
            headers: {
              'content-type': 'text/html; charset=utf-8',
            },
          }),
      } as never,
    )
    const html = await response.text()

    expect(html).toContain('<title>Battle Brothers Legends build: 5 perks</title>')
    expect(html).toContain('content="noindex, follow, noarchive, max-image-preview:large"')
    expect(html).toContain('/social/build.png?')
    expect(html).toContain('Muscularity')
    expect(html).toContain('Steel+Brow')
    expect(html).not.toContain('content="https://battlebrothers.academy/seo/og-image-v2.png"')
  })

  test('passes through non-GET requests', async () => {
    const response = await buildSeo(new Request('https://battlebrothers.academy/', { method: 'POST' }), {
      next: async () =>
        new Response('passed through', {
          status: 202,
        }),
    } as never)

    expect(response.status).toBe(202)
    await expect(response.text()).resolves.toBe('passed through')
  })

  test('passes through non-HTML responses', async () => {
    const response = await buildSeo(new Request('https://battlebrothers.academy/data.json'), {
      next: async () =>
        Response.json({
          ok: true,
        }),
    } as never)

    await expect(response.json()).resolves.toEqual({ ok: true })
  })

  test('returns the original HTML response when metadata injection fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const handler = createBuildSeoHandler({
      renderHtml: () => {
        throw new Error('SEO markers are missing.')
      },
    })
    const originalResponse = new Response(baseHtml, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
      },
      status: 200,
    })
    try {
      const response = await handler(new Request('https://battlebrothers.academy/?build=Clarity'), {
        next: async () => originalResponse,
      } as never)

      expect(response).toBe(originalResponse)
      expect(consoleErrorSpy).toHaveBeenCalledWith('SEO markers are missing.')
      await expect(response.text()).resolves.toBe(baseHtml)
    } finally {
      consoleErrorSpy.mockRestore()
    }
  })
})
