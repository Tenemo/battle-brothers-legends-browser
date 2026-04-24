type StructuredData = Record<string, unknown>

type SeoImageMetadata = {
  alt: string
  height: number
  type: string
  url: string
  width: number
}

export type SeoMetadata = {
  applicationName: string
  canonicalUrl: string
  colorScheme: string
  description: string
  image: SeoImageMetadata
  keywords: string
  locale: string
  robots: string
  shortName: string
  structuredData: {
    '@context': 'https://schema.org'
    '@graph': StructuredData[]
  }
  themeColor: string
  title: string
  url: string
}

const siteOrigin = 'https://battlebrothers.academy'
const sitePath = '/'
const socialImagePath = '/seo/og-image-v2.png'
const siteLanguage = 'en'
const applicationCategory = 'ReferenceApplication'

const createAbsoluteUrl = (pathname: string, origin: string = siteOrigin): string =>
  new URL(pathname, origin).toString()

const createImageObject = (image: SeoImageMetadata, pageUrl: string): StructuredData => ({
  '@type': 'ImageObject',
  '@id': `${pageUrl}#social-image`,
  caption: image.alt,
  contentUrl: image.url,
  height: {
    '@type': 'QuantitativeValue',
    unitText: 'px',
    value: image.height,
  },
  url: image.url,
  width: {
    '@type': 'QuantitativeValue',
    unitText: 'px',
    value: image.width,
  },
})

const createRootStructuredData = ({
  description,
  image,
  title,
  url,
}: {
  description: string
  image: SeoImageMetadata
  title: string
  url: string
}): SeoMetadata['structuredData'] => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${url}#website`,
      description,
      inLanguage: siteLanguage,
      name: title,
      url,
    },
    {
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      description,
      image: {
        '@id': `${url}#social-image`,
      },
      inLanguage: siteLanguage,
      isPartOf: {
        '@id': `${url}#website`,
      },
      name: title,
      primaryImageOfPage: {
        '@id': `${url}#social-image`,
      },
      url,
    },
    {
      '@type': 'WebApplication',
      '@id': `${url}#webapp`,
      applicationCategory,
      browserRequirements: 'JavaScript required',
      description,
      image: image.url,
      inLanguage: siteLanguage,
      isAccessibleForFree: true,
      isPartOf: {
        '@id': `${url}#website`,
      },
      name: title,
      operatingSystem: 'Any',
      url,
    },
    createImageObject(image, url),
  ],
})

const rootUrl = createAbsoluteUrl(sitePath)
const socialImage: SeoImageMetadata = {
  alt: 'Student icon and build planner preview for the Battle Brothers Legends perks browser.',
  height: 630,
  type: 'image/png',
  url: createAbsoluteUrl(socialImagePath),
  width: 1200,
}

export const rootSeoMetadata: SeoMetadata = {
  applicationName: 'Battle Brothers Legends perks browser',
  canonicalUrl: rootUrl,
  colorScheme: 'dark',
  description:
    'Browse the Battle Brothers Legends perk catalog with exact in-mod labels, real game icons, build planning, and shareable filter URLs.',
  image: socialImage,
  keywords:
    'Battle Brothers, Legends mod, perks browser, perk trees, build planner, Battle Brothers Legends',
  locale: 'en_US',
  robots: 'index, follow, max-image-preview:large',
  shortName: 'Legends perks',
  structuredData: createRootStructuredData({
    description:
      'Browse the Battle Brothers Legends perk catalog with exact in-mod labels, real game icons, build planning, and shareable filter URLs.',
    image: socialImage,
    title: 'Battle Brothers Legends perks browser',
    url: rootUrl,
  }),
  themeColor: '#0c0908',
  title: 'Battle Brothers Legends perks browser',
  url: rootUrl,
}

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const renderMetaTag = (
  name: string,
  content: string,
  attribute: 'name' | 'property' = 'name',
): string => `<meta ${attribute}="${escapeHtml(name)}" content="${escapeHtml(content)}" />`

const renderLinkTag = (rel: string, href: string): string =>
  `<link rel="${escapeHtml(rel)}" href="${escapeHtml(href)}" />`

const serializeStructuredData = (value: unknown): string =>
  JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')

const renderRootSeoHead = (metadata: SeoMetadata = rootSeoMetadata): string =>
  [
    renderMetaTag('application-name', metadata.applicationName),
    renderMetaTag('apple-mobile-web-app-title', metadata.shortName),
    renderMetaTag('color-scheme', metadata.colorScheme),
    renderMetaTag('description', metadata.description),
    renderMetaTag('format-detection', 'telephone=no'),
    renderMetaTag('keywords', metadata.keywords),
    renderMetaTag('robots', metadata.robots),
    renderMetaTag('theme-color', metadata.themeColor),
    renderMetaTag('og:site_name', metadata.applicationName, 'property'),
    renderMetaTag('og:locale', metadata.locale, 'property'),
    renderMetaTag('og:title', metadata.title, 'property'),
    renderMetaTag('og:description', metadata.description, 'property'),
    renderMetaTag('og:type', 'website', 'property'),
    renderMetaTag('og:url', metadata.url, 'property'),
    renderMetaTag('og:image', metadata.image.url, 'property'),
    renderMetaTag('og:image:secure_url', metadata.image.url, 'property'),
    renderMetaTag('og:image:type', metadata.image.type, 'property'),
    renderMetaTag('og:image:width', metadata.image.width.toString(), 'property'),
    renderMetaTag('og:image:height', metadata.image.height.toString(), 'property'),
    renderMetaTag('og:image:alt', metadata.image.alt, 'property'),
    renderMetaTag('twitter:card', 'summary_large_image'),
    renderMetaTag('twitter:title', metadata.title),
    renderMetaTag('twitter:description', metadata.description),
    renderMetaTag('twitter:url', metadata.url),
    renderMetaTag('twitter:image', metadata.image.url),
    renderMetaTag('twitter:image:alt', metadata.image.alt),
    renderLinkTag('canonical', metadata.canonicalUrl),
    `<script type="application/ld+json">${serializeStructuredData(metadata.structuredData)}</script>`,
    `<title>${escapeHtml(metadata.title)}</title>`,
  ].join('\n    ')

export function injectSeoIntoHtml(html: string, metadata: SeoMetadata = rootSeoMetadata): string {
  const startMarkerPattern = /<meta\s+name=["']battle-brothers-seo-start["'][^>]*>/i
  const endMarkerPattern = /<meta\s+name=["']battle-brothers-seo-end["'][^>]*>/i
  const startMarkerMatch = startMarkerPattern.exec(html)
  const endMarkerMatch = endMarkerPattern.exec(html)

  if (!startMarkerMatch || startMarkerMatch.index === undefined) {
    throw new Error('SEO start marker is missing from index.html.')
  }

  if (!endMarkerMatch || endMarkerMatch.index === undefined) {
    throw new Error('SEO end marker is missing from index.html.')
  }

  if (startMarkerMatch.index >= endMarkerMatch.index) {
    throw new Error('SEO markers are out of order in index.html.')
  }

  const endMarkerEndIndex = endMarkerMatch.index + endMarkerMatch[0].length
  const startMarker = startMarkerMatch[0]
  const endMarker = endMarkerMatch[0]

  return `${html.slice(0, startMarkerMatch.index)}${startMarker}\n    ${renderRootSeoHead(metadata)}\n    ${endMarker}${html.slice(
    endMarkerEndIndex,
  )}`
}

export function injectRootSeoIntoHtml(
  html: string,
  metadata: SeoMetadata = rootSeoMetadata,
): string {
  return injectSeoIntoHtml(html, metadata)
}
