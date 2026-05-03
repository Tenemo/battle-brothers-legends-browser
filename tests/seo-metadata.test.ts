import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { injectRootSeoIntoHtml, injectSeoIntoHtml, rootSeoMetadata } from '../src/lib/seo-metadata'
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

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue)
  }

  // JSON-LD object key order can differ even when checked-in and generated metadata match.
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .toSorted(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([key, nestedValue]) => [key, sortJsonValue(nestedValue)]),
    )
  }

  return value
}

function serializeSeoElement(element: Element): string {
  const tagName = element.tagName.toLowerCase()

  if (tagName === 'title') {
    return `title:${element.textContent ?? ''}`
  }

  if (tagName === 'script') {
    return `script:${JSON.stringify(sortJsonValue(JSON.parse(element.textContent ?? '{}')))}`
  }

  return [
    tagName,
    element.getAttribute('name') ?? '',
    element.getAttribute('property') ?? '',
    element.getAttribute('rel') ?? '',
    element.getAttribute('href') ?? '',
    element.getAttribute('content') ?? '',
  ].join(':')
}

function getSeoBlockSignature(html: string): string[] {
  const document = new DOMParser().parseFromString(html, 'text/html')
  const headElements = [...document.head.children]
  const startMarkerIndex = headElements.findIndex(
    (element) => element.getAttribute('name') === 'battle-brothers-seo-start',
  )
  const endMarkerIndex = headElements.findIndex(
    (element) => element.getAttribute('name') === 'battle-brothers-seo-end',
  )

  return headElements.slice(startMarkerIndex + 1, endMarkerIndex).map(serializeSeoElement)
}

describe('SEO metadata', () => {
  test('keeps root metadata indexable', () => {
    const metadata = resolveSeoMetadataForUrl(new URL('https://battlebrothers.academy/'))

    expect(metadata.title).toBe(rootSeoMetadata.title)
    expect(metadata.robots).toBe('index, follow, max-image-preview:large')
    expect(metadata.canonicalUrl).toBe(rootSeoMetadata.canonicalUrl)
    expect(metadata.image.url).toBe('https://battlebrothers.academy/seo/og-image-v2.png')
  })

  test('creates request-origin root metadata for preview urls', () => {
    const metadata = resolveSeoMetadataForUrl(
      new URL('https://deploy-preview-1--battle-brothers-browser.netlify.app/?search=scholar'),
    )
    const structuredData = JSON.stringify(metadata.structuredData)

    expect(metadata.title).toBe(rootSeoMetadata.title)
    expect(metadata.robots).toBe('index, follow, max-image-preview:large')
    expect(metadata.canonicalUrl).toBe(
      'https://deploy-preview-1--battle-brothers-browser.netlify.app/',
    )
    expect(metadata.url).toBe('https://deploy-preview-1--battle-brothers-browser.netlify.app/')
    expect(metadata.image.url).toBe(
      'https://deploy-preview-1--battle-brothers-browser.netlify.app/seo/og-image-v2.png',
    )
    expect(structuredData).toContain(
      'https://deploy-preview-1--battle-brothers-browser.netlify.app/#social-image',
    )
    expect(structuredData).not.toContain('battlebrothers.academy')
  })

  test('keeps SEO replacement markers around injected metadata', () => {
    const html = injectSeoIntoHtml(baseHtml)

    expect(html).toContain('<meta name="battle-brothers-seo-start" content="1" />')
    expect(html).toContain('<title>Battle Brothers Legends build planner</title>')
    expect(html).toContain('<meta name="battle-brothers-seo-end" content="1" />')
  })

  test('creates noindex metadata for valid shared build urls', () => {
    const metadata = resolveSeoMetadataForUrl(
      new URL('https://battlebrothers.academy/?build=Clarity,Perfect+Focus'),
    )

    expect(metadata.title).toBe('Battle Brothers Legends build: 2 perks')
    expect(metadata.description).toContain('Clarity')
    expect(metadata.robots).toBe('noindex, follow, noarchive, max-image-preview:large')
    expect(metadata.canonicalUrl).toBe('https://battlebrothers.academy/')
    expect(metadata.url).toBe('https://battlebrothers.academy/?build=Clarity,Perfect+Focus')
    expect(metadata.image.url).toBe(
      'https://battlebrothers.academy/social/builds/19.3.22/Clarity%2CPerfect%20Focus.png',
    )
  })

  test('keeps duplicate-name build ids in shared SEO metadata', () => {
    const metadata = resolveSeoMetadataForUrl(
      new URL(
        'https://battlebrothers.academy/?build=Chain+Lightning--perk.legend_chain_lightning,Chain+Lightning--perk.legend_magic_chain_lightning',
      ),
    )

    expect(metadata.title).toBe('Battle Brothers Legends build: 2 perks')
    expect(metadata.url).toBe(
      'https://battlebrothers.academy/?build=Chain+Lightning--perk.legend_chain_lightning,Chain+Lightning--perk.legend_magic_chain_lightning',
    )
    expect(metadata.image.url).toBe(
      'https://battlebrothers.academy/social/builds/19.3.22/Chain%20Lightning--perk.legend_chain_lightning%2CChain%20Lightning--perk.legend_magic_chain_lightning.png',
    )
  })

  test('keeps optional perks in shared SEO image urls', () => {
    const metadata = resolveSeoMetadataForUrl(
      new URL('https://battlebrothers.academy/?build=Clarity,Perfect+Focus&optional=Perfect+Focus'),
    )

    expect(metadata.url).toBe(
      'https://battlebrothers.academy/?build=Clarity,Perfect+Focus&optional=Perfect+Focus',
    )
    expect(metadata.image.url).toBe(
      'https://battlebrothers.academy/social/builds/19.3.22/Clarity%2CPerfect%20Focus.png?optional=Perfect%20Focus',
    )
  })

  test('injects request-origin root metadata into preview documents', () => {
    const html = renderDocumentHtml({
      baseHtml,
      requestUrl: new URL('https://deploy-preview-1--battle-brothers-browser.netlify.app/'),
    })

    expect(html).toContain(
      '<link rel="canonical" href="https://deploy-preview-1--battle-brothers-browser.netlify.app/" />',
    )
    expect(html).toContain(
      'property="og:url" content="https://deploy-preview-1--battle-brothers-browser.netlify.app/"',
    )
    expect(html).toContain(
      'property="og:image" content="https://deploy-preview-1--battle-brothers-browser.netlify.app/seo/og-image-v2.png"',
    )
    expect(html).toContain(
      'name="twitter:url" content="https://deploy-preview-1--battle-brothers-browser.netlify.app/"',
    )
    expect(html).toContain(
      'name="twitter:image" content="https://deploy-preview-1--battle-brothers-browser.netlify.app/seo/og-image-v2.png"',
    )
    expect(html).not.toContain('battlebrothers.academy')
  })

  test('injects shared build metadata into the document head', () => {
    const html = renderDocumentHtml({
      baseHtml,
      requestUrl: new URL('https://battlebrothers.academy/?build=Clarity,Perfect+Focus'),
    })

    expect(html).toContain('<title>Battle Brothers Legends build: 2 perks</title>')
    expect(html).toContain('content="noindex, follow, noarchive, max-image-preview:large"')
    expect(html).toContain('property="og:image"')
    expect(html).toContain('/social/builds/')
  })

  test('throws a clear error when SEO markers are missing', () => {
    expect(() => injectSeoIntoHtml('<html><head></head><body></body></html>')).toThrow(
      'SEO start marker is missing from index.html.',
    )
  })

  test('keeps checked-in root SEO metadata in sync with generated metadata', async () => {
    const indexHtml = await readFile(path.resolve(process.cwd(), 'index.html'), 'utf8')

    expect(getSeoBlockSignature(indexHtml)).toEqual(
      getSeoBlockSignature(injectRootSeoIntoHtml(indexHtml)),
    )
  })
})
