import {
  createRootSeoMetadata,
  injectSeoIntoHtml,
  rootSeoMetadata,
  type SeoMetadata,
} from './seo-metadata'
import { createBuildShareSeoPayloadFromSearch } from './build-share-seo'
import { createSeoStructuredData } from './seo-structured-data'
import {
  socialImageHeight as buildSocialImageHeight,
  socialImageWidth as buildSocialImageWidth,
} from './social-image-markup.ts'

const sitePath = '/'
const buildShareRobots = 'noindex, follow, noarchive, max-image-preview:large'

function createAbsoluteUrl(pathname: string, origin: string): string {
  return new URL(pathname, origin).toString()
}

function createBuildSeoMetadata({
  origin,
  search,
}: {
  origin: string
  search: string | URLSearchParams
}): SeoMetadata {
  const buildShareSeoPayload = createBuildShareSeoPayloadFromSearch(search)

  if (buildShareSeoPayload.status === 'empty') {
    return createRootSeoMetadata(origin)
  }

  const rootUrlForOrigin = createAbsoluteUrl(sitePath, origin)
  const buildUrl = createAbsoluteUrl(`/${buildShareSeoPayload.canonicalSearch}`, origin)
  const imageUrl = createAbsoluteUrl(buildShareSeoPayload.imagePath, origin)
  const image: SeoMetadata['image'] = {
    alt: buildShareSeoPayload.imageAlt,
    height: buildSocialImageHeight,
    type: 'image/png',
    url: imageUrl,
    width: buildSocialImageWidth,
  }

  return {
    applicationName: rootSeoMetadata.applicationName,
    canonicalUrl: rootUrlForOrigin,
    colorScheme: rootSeoMetadata.colorScheme,
    description: buildShareSeoPayload.description,
    image,
    keywords: rootSeoMetadata.keywords,
    locale: rootSeoMetadata.locale,
    robots: buildShareRobots,
    shortName: rootSeoMetadata.shortName,
    structuredData: createSeoStructuredData({
      applicationTitle: rootSeoMetadata.title,
      applicationUrl: rootUrlForOrigin,
      description: buildShareSeoPayload.description,
      image,
      pageTitle: buildShareSeoPayload.title,
      pageUrl: buildUrl,
      websiteTitle: rootSeoMetadata.title,
      websiteUrl: rootUrlForOrigin,
    }),
    themeColor: rootSeoMetadata.themeColor,
    title: buildShareSeoPayload.title,
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
