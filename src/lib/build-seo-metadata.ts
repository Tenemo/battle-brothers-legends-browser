import { injectSeoIntoHtml, rootSeoMetadata, type SeoMetadata } from './seo-metadata'
import { createBuildSharePreviewPayloadFromSearch } from './build-share-preview'
import { buildSocialImageHeight, buildSocialImageWidth } from './build-social-image'
import { createSeoStructuredData } from './seo-structured-data'

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
    structuredData: createSeoStructuredData({
      applicationTitle: rootSeoMetadata.title,
      applicationUrl: rootUrlForOrigin,
      description: buildSharePreviewPayload.description,
      image,
      pageTitle: buildSharePreviewPayload.title,
      pageUrl: buildUrl,
      websiteTitle: rootSeoMetadata.title,
      websiteUrl: rootUrlForOrigin,
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
