import { describe, expect, test } from 'vitest'
import buildSeo from '../netlify/edge-functions/build-seo'

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
              'content-type': 'text/html; charset=utf-8',
            },
          }),
      } as never,
    )
    const html = await response.text()

    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(html).toContain('<title>Battle Brothers Legends build: 2 perks</title>')
    expect(html).toContain('content="noindex, follow, noarchive, max-image-preview:large"')
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
})
