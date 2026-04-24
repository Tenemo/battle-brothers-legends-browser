import {
  injectSeoIntoHtml,
  rootSeoMetadata,
  type SeoMetadata,
} from './seo-metadata'
import { createBuildSharePreviewPayloadFromSearch } from './build-share-preview'
import { buildSocialImageHeight, buildSocialImageWidth } from './build-social-image'

const sitePath = '/'
const siteLanguage = 'en'
const applicationCategory = 'ReferenceApplication'
const buildShareRobots = 'noindex, follow, noarchive, max-image-preview:large'

function createAbsoluteUrl(pathname: string, origin: string): string {
  return new URL(pathname, origin).toString()
}

function createImageObject(image: SeoMetadata['image'], pageUrl: string): Record<string, unknown> {
  return {
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
  }
}

function createBuildStructuredData({
  description,
  image,
  title,
  url,
}: {
  description: string
  image: SeoMetadata['image']
  title: string
  url: string
}): SeoMetadata['structuredData'] {
  const origin = new URL(url).origin

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        description,
        inLanguage: siteLanguage,
        name: rootSeoMetadata.title,
        url: `${origin}/`,
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
          '@id': `${origin}/#website`,
        },
        name: title,
        primaryImageOfPage: {
          '@id': `${url}#social-image`,
        },
        url,
      },
      {
        '@type': 'WebApplication',
        '@id': `${origin}/#webapp`,
        applicationCategory,
        browserRequirements: 'JavaScript required',
        description,
        image: image.url,
        inLanguage: siteLanguage,
        isAccessibleForFree: true,
        isPartOf: {
          '@id': `${origin}/#website`,
        },
        name: rootSeoMetadata.title,
        operatingSystem: 'Any',
        url: `${origin}/`,
      },
      createImageObject(image, url),
    ],
  }
}

export function createBuildSeoMetadata({
  origin,
  search,
}: {
  origin: string
  search: string | URLSearchParams
}): SeoMetadata {
  const buildSharePreviewPayload = createBuildSharePreviewPayloadFromSearch(search)

  if (buildSharePreviewPayload.status === 'empty') {
    return rootSeoMetadata
  }

  const rootUrlForOrigin = createAbsoluteUrl(sitePath, origin)
  const buildUrl = createAbsoluteUrl(`/${buildSharePreviewPayload.canonicalSearch}`, origin)
  const imageUrl = createAbsoluteUrl(buildSharePreviewPayload.imagePath, origin)
  const image: SeoMetadata['image'] = {
    alt: buildSharePreviewPayload.imageAlt,
    height: buildSocialImageHeight,
    type: 'image/png',
    url: imageUrl,
    width: buildSocialImageWidth,
  }

  return {
    applicationName: rootSeoMetadata.applicationName,
    canonicalUrl: rootUrlForOrigin,
    colorScheme: rootSeoMetadata.colorScheme,
    description: buildSharePreviewPayload.description,
    image,
    keywords: rootSeoMetadata.keywords,
    locale: rootSeoMetadata.locale,
    robots: buildShareRobots,
    shortName: rootSeoMetadata.shortName,
    structuredData: createBuildStructuredData({
      description: buildSharePreviewPayload.description,
      image,
      title: buildSharePreviewPayload.title,
      url: buildUrl,
    }),
    themeColor: rootSeoMetadata.themeColor,
    title: buildSharePreviewPayload.title,
    url: buildUrl,
  }
}

export function resolveSeoMetadataForUrl(requestUrl: URL): SeoMetadata {
  return createBuildSeoMetadata({
    origin: requestUrl.origin,
    search: requestUrl.searchParams,
  })
}

export function renderDocumentHtml({
  baseHtml,
  requestUrl,
}: {
  baseHtml: string
  requestUrl: URL
}): string {
  return injectSeoIntoHtml(baseHtml, resolveSeoMetadataForUrl(requestUrl))
}
