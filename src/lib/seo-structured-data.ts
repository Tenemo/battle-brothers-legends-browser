type StructuredData = Record<string, unknown>

export type SeoStructuredDataImage = {
  alt: string
  height: number
  type: string
  url: string
  width: number
}

export type SeoStructuredData = {
  '@context': 'https://schema.org'
  '@graph': StructuredData[]
}

const siteLanguage = 'en'
const applicationCategory = 'ReferenceApplication'

function createSeoImageObject(image: SeoStructuredDataImage, pageUrl: string): StructuredData {
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

export function createSeoStructuredData({
  applicationTitle,
  applicationUrl,
  description,
  image,
  pageTitle,
  pageUrl,
  websiteTitle,
  websiteUrl,
}: {
  applicationTitle: string
  applicationUrl: string
  description: string
  image: SeoStructuredDataImage
  pageTitle: string
  pageUrl: string
  websiteTitle: string
  websiteUrl: string
}): SeoStructuredData {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${websiteUrl}#website`,
        description,
        inLanguage: siteLanguage,
        name: websiteTitle,
        url: websiteUrl,
      },
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        description,
        image: {
          '@id': `${pageUrl}#social-image`,
        },
        inLanguage: siteLanguage,
        isPartOf: {
          '@id': `${websiteUrl}#website`,
        },
        name: pageTitle,
        primaryImageOfPage: {
          '@id': `${pageUrl}#social-image`,
        },
        url: pageUrl,
      },
      {
        '@type': 'WebApplication',
        '@id': `${applicationUrl}#webapp`,
        applicationCategory,
        browserRequirements: 'JavaScript required',
        description,
        image: image.url,
        inLanguage: siteLanguage,
        isAccessibleForFree: true,
        isPartOf: {
          '@id': `${websiteUrl}#website`,
        },
        name: applicationTitle,
        operatingSystem: 'Any',
        url: applicationUrl,
      },
      createSeoImageObject(image, pageUrl),
    ],
  }
}
