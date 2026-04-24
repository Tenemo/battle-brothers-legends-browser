import { describe, expect, test } from 'vitest'
import { injectSeoIntoHtml, rootSeoMetadata } from '../src/lib/seo-metadata'
import { renderDocumentHtml, resolveSeoMetadataForUrl } from '../src/lib/build-seo-metadata'

const baseHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta name="battle-brothers-seo-start" content="1" />
    <title>placeholder</title>
    <meta name="battle-brothers-seo-end" content="1" />
  </head>
  <body><div id="root"></div></body>
</html>`

describe('SEO metadata', () => {
  test('keeps root metadata indexable', () => {
    const metadata = resolveSeoMetadataForUrl(new URL('https://battlebrothers.academy/'))

    expect(metadata.title).toBe(rootSeoMetadata.title)
    expect(metadata.robots).toBe('index, follow, max-image-preview:large')
    expect(metadata.canonicalUrl).toBe(rootSeoMetadata.canonicalUrl)
  })

  test('creates noindex metadata for valid shared build urls', () => {
    const metadata = resolveSeoMetadataForUrl(
      new URL('https://battlebrothers.academy/?build=Clarity&build=Perfect+Focus'),
    )

    expect(metadata.title).toBe('Battle Brothers Legends build: 2 perks')
    expect(metadata.description).toContain('Clarity')
    expect(metadata.robots).toBe('noindex, follow, noarchive, max-image-preview:large')
    expect(metadata.canonicalUrl).toBe('https://battlebrothers.academy/')
    expect(metadata.url).toBe('https://battlebrothers.academy/?build=Clarity,Perfect+Focus')
    expect(metadata.image.url).toContain('https://battlebrothers.academy/social/build.png?')
    expect(metadata.image.url).toContain('build=Clarity%2CPerfect+Focus')
  })

  test('injects shared build metadata into the document head', () => {
    const html = renderDocumentHtml({
      baseHtml,
      requestUrl: new URL('https://battlebrothers.academy/?build=Clarity&build=Perfect+Focus'),
    })

    expect(html).toContain('<title>Battle Brothers Legends build: 2 perks</title>')
    expect(html).toContain('content="noindex, follow, noarchive, max-image-preview:large"')
    expect(html).toContain('property="og:image"')
    expect(html).toContain('/social/build.png?')
  })

  test('throws a clear error when SEO markers are missing', () => {
    expect(() => injectSeoIntoHtml('<html><head></head><body></body></html>')).toThrow(
      'SEO start marker is missing from index.html.',
    )
  })
})
