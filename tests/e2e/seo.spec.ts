import { expect, test } from '@playwright/test'
import { rootSeoMetadata } from '../../src/lib/seo-metadata'

const productionSiteUrl = rootSeoMetadata.url
const siteDescription = rootSeoMetadata.description
const socialImageUrl = rootSeoMetadata.image.url

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
  const robotsResponse = await request.get('/robots.txt')
  expect(robotsResponse.ok()).toBe(true)
  const robotsText = await robotsResponse.text()
  expect(robotsText).toContain('User-agent: *')
  expect(robotsText).toContain('Allow: /')
  expect(robotsText).toContain(`Sitemap: ${productionSiteUrl}sitemap.xml`)

  const sitemapResponse = await request.get('/sitemap.xml')
  expect(sitemapResponse.ok()).toBe(true)
  const sitemapText = await sitemapResponse.text()
  expect(sitemapText).toContain(`<loc>${productionSiteUrl}</loc>`)
  expect(sitemapText).not.toMatch(/<loc>[^<]*\?[^<]*<\/loc>/)

  const socialImageResponse = await request.get('/seo/og-image-v2.png')
  expect(socialImageResponse.ok()).toBe(true)

  const faviconPngResponse = await request.get('/favicon/favicon-96x96.png')
  expect(faviconPngResponse.ok()).toBe(true)

  const faviconSvgResponse = await request.get('/favicon/favicon.svg')
  expect(faviconSvgResponse.ok()).toBe(true)

  const faviconIcoResponse = await request.get('/favicon/favicon.ico')
  expect(faviconIcoResponse.ok()).toBe(true)

  const appleTouchIconResponse = await request.get('/favicon/apple-touch-icon.png')
  expect(appleTouchIconResponse.ok()).toBe(true)

  const manifestResponse = await request.get('/favicon/site.webmanifest')
  expect(manifestResponse.ok()).toBe(true)

  const webApplicationIcon192Response = await request.get('/favicon/web-app-manifest-192x192.png')
  expect(webApplicationIcon192Response.ok()).toBe(true)

  const webApplicationIcon512Response = await request.get('/favicon/web-app-manifest-512x512.png')
  expect(webApplicationIcon512Response.ok()).toBe(true)

  const manifest = await manifestResponse.json()
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
