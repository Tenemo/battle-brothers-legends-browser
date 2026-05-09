import { expect, test, type APIRequestContext } from '@playwright/test'
import { rootSeoMetadata } from '../../src/lib/seo-metadata'

const productionSiteUrl = rootSeoMetadata.url
const siteDescription = rootSeoMetadata.description
const socialImageUrl = rootSeoMetadata.image.url
const staticResourceProbeIntervals = process.env.PLAYWRIGHT_BASE_URL
  ? [1000, 2000, 5000, 5000]
  : [100, 250, 500]
const staticResourceProbeTimeoutMs = process.env.PLAYWRIGHT_BASE_URL ? 30000 : 5000
const staticResourceRequestTimeoutMs = Math.min(10000, Math.floor(staticResourceProbeTimeoutMs / 2))

type StaticResourceProbe = {
  bodyText: string
  contentType: string
  ok: boolean
  status: number | null
}

async function loadStaticResourceProbe(
  request: APIRequestContext,
  path: string,
  shouldReadText: boolean,
): Promise<StaticResourceProbe> {
  try {
    const response = await request.get(path, {
      headers: {
        'cache-control': 'no-store',
        pragma: 'no-cache',
      },
      timeout: staticResourceRequestTimeoutMs,
    })

    return {
      bodyText: shouldReadText ? await response.text() : '',
      contentType: response.headers()['content-type'] ?? '',
      ok: response.ok(),
      status: response.status(),
    }
  } catch {
    return {
      bodyText: '',
      contentType: '',
      ok: false,
      status: null,
    }
  }
}

function formatStaticResourceProbeFailure(path: string, probe: StaticResourceProbe): string {
  return `${path} status=${probe.status ?? 'unreachable'} contentType=${probe.contentType || 'missing'}`
}

async function expectStaticResource(
  request: APIRequestContext,
  path: string,
  {
    contentTypeIncludes,
    expectedSnippets = [],
    shouldReadText = expectedSnippets.length > 0,
  }: {
    contentTypeIncludes?: string
    expectedSnippets?: string[]
    shouldReadText?: boolean
  } = {},
): Promise<StaticResourceProbe> {
  let successfulProbe: StaticResourceProbe | null = null

  await expect
    .poll(
      async () => {
        const probe = await loadStaticResourceProbe(request, path, shouldReadText)
        const hasExpectedContentType =
          contentTypeIncludes === undefined || probe.contentType.includes(contentTypeIncludes)
        const missingSnippet =
          expectedSnippets.find((expectedSnippet) => !probe.bodyText.includes(expectedSnippet)) ??
          null

        if (probe.ok && hasExpectedContentType && missingSnippet === null) {
          successfulProbe = probe

          return 'ok'
        }

        return [
          formatStaticResourceProbeFailure(path, probe),
          contentTypeIncludes && !hasExpectedContentType
            ? `expected content type containing ${contentTypeIncludes}`
            : null,
          missingSnippet ? `missing ${missingSnippet}` : null,
        ]
          .filter((failureDetail): failureDetail is string => failureDetail !== null)
          .join(' ')
      },
      {
        intervals: staticResourceProbeIntervals,
        timeout: staticResourceProbeTimeoutMs,
      },
    )
    .toBe('ok')

  if (!successfulProbe) {
    throw new Error(`${path} did not return a successful static resource probe.`)
  }

  return successfulProbe
}

test('exposes the expected static SEO metadata contract', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(rootSeoMetadata.title)
  await expect(page.locator('meta[name="application-name"]')).toHaveAttribute(
    'content',
    rootSeoMetadata.applicationName,
  )
  await expect(page.locator('head meta[name="theme-color"]')).toHaveAttribute(
    'content',
    rootSeoMetadata.themeColor,
  )
  await expect(page.locator('head meta[name="color-scheme"]')).toHaveAttribute(
    'content',
    rootSeoMetadata.colorScheme,
  )
  await expect(page.locator('head meta[name="apple-mobile-web-app-title"]')).toHaveAttribute(
    'content',
    rootSeoMetadata.shortName,
  )
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', siteDescription)
  await expect(page.locator('meta[name="keywords"]')).toHaveAttribute(
    'content',
    rootSeoMetadata.keywords,
  )
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    rootSeoMetadata.robots,
  )
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    rootSeoMetadata.canonicalUrl,
  )
  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
    'content',
    rootSeoMetadata.applicationName,
  )
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
    'content',
    rootSeoMetadata.locale,
  )
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    rootSeoMetadata.title,
  )
  await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
    'content',
    siteDescription,
  )
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website')
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    'content',
    productionSiteUrl,
  )
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', socialImageUrl)
  await expect(page.locator('meta[property="og:image:secure_url"]')).toHaveAttribute(
    'content',
    socialImageUrl,
  )
  await expect(page.locator('meta[property="og:image:type"]')).toHaveAttribute(
    'content',
    rootSeoMetadata.image.type,
  )
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute(
    'content',
    rootSeoMetadata.image.width.toString(),
  )
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute(
    'content',
    rootSeoMetadata.image.height.toString(),
  )
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
    'content',
    rootSeoMetadata.image.alt,
  )
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    'content',
    'summary_large_image',
  )
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute(
    'content',
    rootSeoMetadata.title,
  )
  await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute(
    'content',
    siteDescription,
  )
  await expect(page.locator('meta[name="twitter:url"]')).toHaveAttribute(
    'content',
    productionSiteUrl,
  )
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
    'content',
    socialImageUrl,
  )
  await expect(page.locator('meta[name="twitter:image:alt"]')).toHaveAttribute(
    'content',
    rootSeoMetadata.image.alt,
  )

  const structuredDataText = await page.locator('script[type="application/ld+json"]').textContent()
  expect(structuredDataText).not.toBeNull()

  const structuredData = JSON.parse(structuredDataText ?? '{}')
  expect(structuredData).toMatchObject({
    '@context': 'https://schema.org',
  })
  expect(structuredData['@graph']).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        '@type': 'WebSite',
        '@id': `${productionSiteUrl}#website`,
        url: productionSiteUrl,
        name: rootSeoMetadata.title,
      }),
      expect.objectContaining({
        '@type': 'WebPage',
        '@id': `${productionSiteUrl}#webpage`,
        primaryImageOfPage: {
          '@id': `${productionSiteUrl}#social-image`,
        },
      }),
      expect.objectContaining({
        '@type': 'WebApplication',
        '@id': `${productionSiteUrl}#webapp`,
        url: productionSiteUrl,
        image: socialImageUrl,
      }),
      expect.objectContaining({
        '@type': 'ImageObject',
        '@id': `${productionSiteUrl}#social-image`,
        contentUrl: socialImageUrl,
      }),
    ]),
  )
})

test('serves robots, sitemap, and the social preview image', async ({ request }) => {
  const robotsResponse = await expectStaticResource(request, '/robots.txt', {
    contentTypeIncludes: 'text/plain',
    expectedSnippets: ['User-agent: *', 'Allow: /', `Sitemap: ${productionSiteUrl}sitemap.xml`],
  })
  const robotsText = robotsResponse.bodyText
  expect(robotsText).toContain('User-agent: *')
  expect(robotsText).toContain('Allow: /')
  expect(robotsText).toContain(`Sitemap: ${productionSiteUrl}sitemap.xml`)

  const sitemapResponse = await expectStaticResource(request, '/sitemap.xml', {
    contentTypeIncludes: 'xml',
    expectedSnippets: [`<loc>${productionSiteUrl}</loc>`],
  })
  const sitemapText = sitemapResponse.bodyText
  expect(sitemapText).toContain(`<loc>${productionSiteUrl}</loc>`)
  expect(sitemapText).not.toMatch(/<loc>[^<]*\?[^<]*<\/loc>/)

  await expectStaticResource(request, '/seo/og-image-v2.png', {
    contentTypeIncludes: 'image/png',
    shouldReadText: false,
  })

  await expectStaticResource(request, '/favicon/favicon-96x96.png', {
    shouldReadText: false,
  })

  await expectStaticResource(request, '/favicon/favicon.svg', {
    shouldReadText: false,
  })

  await expectStaticResource(request, '/favicon/favicon.ico', {
    shouldReadText: false,
  })

  await expectStaticResource(request, '/favicon/apple-touch-icon.png', {
    shouldReadText: false,
  })

  const manifestResponse = await expectStaticResource(request, '/favicon/site.webmanifest', {
    shouldReadText: true,
  })

  await expectStaticResource(request, '/favicon/web-app-manifest-192x192.png', {
    shouldReadText: false,
  })

  await expectStaticResource(request, '/favicon/web-app-manifest-512x512.png', {
    shouldReadText: false,
  })

  const manifest = JSON.parse(manifestResponse.bodyText)
  expect(manifest).toEqual({
    name: rootSeoMetadata.applicationName,
    short_name: rootSeoMetadata.shortName,
    description: rootSeoMetadata.description,
    icons: [
      {
        src: '/favicon/web-app-manifest-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/favicon/web-app-manifest-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
    theme_color: rootSeoMetadata.themeColor,
    background_color: rootSeoMetadata.themeColor,
    display: 'standalone',
    start_url: '/',
  })
})
