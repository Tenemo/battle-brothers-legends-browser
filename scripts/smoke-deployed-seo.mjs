import { createHash } from 'node:crypto'

const crawlerUserAgent =
  'facebookexternalhit/1.1 (+https://www.facebook.com/externalhit_uatext.php)'
const buildPerks = ['Clarity', 'Perfect Focus']
const comparisonBuildPerks = ['Student']
const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]
const productionOrigin = 'https://battlebrothers.academy'

function printUsage() {
  console.log(
    'Usage: node ./scripts/smoke-deployed-seo.mjs https://deploy-preview.example.netlify.app/',
  )
}

function fail(message) {
  throw new Error(`Deployed SEO smoke check failed: ${message}`)
}

function normalizeBaseUrl(value) {
  if (!value) {
    printUsage()
    fail('Pass a deployed site URL as the first argument or DEPLOY_SMOKE_BASE_URL.')
  }

  let baseUrl

  try {
    baseUrl = new URL(value)
  } catch {
    printUsage()
    fail(`${value} is not a valid URL.`)
  }

  baseUrl.pathname = '/'
  baseUrl.search = ''
  baseUrl.hash = ''

  return baseUrl
}

function expectIncludes({ label, text, value }) {
  if (!text.includes(value)) {
    fail(`${label} did not include ${value}.`)
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function decodeHtmlAttribute(value) {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
}

function readMetaContent(html, attributeName, attributeValue) {
  const pattern = new RegExp(
    `<meta\\s+${attributeName}="${escapeRegExp(attributeValue)}"\\s+content="([^"]*)"\\s*/?>`,
    'iu',
  )
  const match = pattern.exec(html)

  if (!match) {
    fail(`Missing ${attributeName}="${attributeValue}" meta tag.`)
  }

  return decodeHtmlAttribute(match[1])
}

function assertNoPreviewProductionOrigin(html, label, baseUrl) {
  if (baseUrl.origin === productionOrigin) {
    return
  }

  if (html.includes(`${productionOrigin}/`)) {
    fail(`${label} advertises production-domain URLs instead of ${baseUrl.origin}.`)
  }
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': crawlerUserAgent,
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    fail(`${url.toString()} returned ${response.status}.`)
  }

  const contentType = response.headers.get('content-type') ?? ''

  if (!contentType.includes('text/html')) {
    fail(`${url.toString()} returned ${contentType || 'no content type'} instead of HTML.`)
  }

  return response.text()
}

async function fetchImage(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': crawlerUserAgent,
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    fail(`${url.toString()} returned ${response.status}.`)
  }

  const contentType = response.headers.get('content-type') ?? ''

  if (contentType !== 'image/png') {
    fail(`${url.toString()} returned ${contentType || 'no content type'} instead of image/png.`)
  }

  const body = new Uint8Array(await response.arrayBuffer())

  if (body.byteLength <= 1000) {
    fail(`${url.toString()} returned an unexpectedly small image.`)
  }

  for (const [byteIndex, byteValue] of pngSignature.entries()) {
    if (body[byteIndex] !== byteValue) {
      fail(`${url.toString()} did not return a valid PNG signature.`)
    }
  }

  return {
    response,
    sha256: createHash('sha256').update(body).digest('hex'),
  }
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  printUsage()
  process.exit(0)
}

const baseUrl = normalizeBaseUrl(process.argv[2] ?? process.env.DEPLOY_SMOKE_BASE_URL)
const rootHtml = await fetchHtml(baseUrl)

assertNoPreviewProductionOrigin(rootHtml, 'root HTML', baseUrl)

expectIncludes({
  label: 'root HTML',
  text: rootHtml,
  value: '<title>Battle Brothers Legends perks browser</title>',
})
expectIncludes({
  label: 'root HTML',
  text: rootHtml,
  value: 'content="index, follow, max-image-preview:large"',
})

const rootOpenGraphImageUrl = new URL(readMetaContent(rootHtml, 'property', 'og:image'))
const rootTwitterImageUrl = new URL(readMetaContent(rootHtml, 'name', 'twitter:image'))

if (rootOpenGraphImageUrl.toString() !== rootTwitterImageUrl.toString()) {
  fail('Root Open Graph and Twitter image URLs do not match.')
}

if (
  rootOpenGraphImageUrl.origin !== baseUrl.origin ||
  rootOpenGraphImageUrl.pathname !== '/seo/og-image-v2.png'
) {
  fail(
    `root image URL was ${rootOpenGraphImageUrl.toString()} instead of a deployed root social image URL.`,
  )
}

await fetchImage(rootOpenGraphImageUrl)

const sharedBuildUrl = new URL(baseUrl)

for (const perkName of buildPerks) {
  sharedBuildUrl.searchParams.append('build', perkName)
}

const sharedBuildHtml = await fetchHtml(sharedBuildUrl)

assertNoPreviewProductionOrigin(sharedBuildHtml, 'shared build HTML', baseUrl)

expectIncludes({
  label: 'shared build HTML',
  text: sharedBuildHtml,
  value: '<title>Battle Brothers Legends build: 2 perks</title>',
})
expectIncludes({
  label: 'shared build HTML',
  text: sharedBuildHtml,
  value: 'content="noindex, follow, noarchive, max-image-preview:large"',
})

const openGraphImageUrl = new URL(readMetaContent(sharedBuildHtml, 'property', 'og:image'))
const twitterImageUrl = new URL(readMetaContent(sharedBuildHtml, 'name', 'twitter:image'))

if (openGraphImageUrl.toString() !== twitterImageUrl.toString()) {
  fail('Open Graph and Twitter image URLs do not match.')
}

if (
  openGraphImageUrl.origin !== baseUrl.origin ||
  !openGraphImageUrl.pathname.startsWith('/social/builds/')
) {
  fail(
    `shared build image URL was ${openGraphImageUrl.toString()} instead of a deployed social image URL.`,
  )
}

if (openGraphImageUrl.search) {
  fail(`shared build image URL unexpectedly used query params: ${openGraphImageUrl.toString()}.`)
}

const buildImagePathMatch = /^\/social\/builds\/([^/]+)\/([^/]+)\.png$/u.exec(
  openGraphImageUrl.pathname,
)

if (!buildImagePathMatch) {
  fail(`shared build image URL did not use the path-keyed build image route.`)
}

const [, sharedBuildReferencePathSegment, sharedBuildPathSegment] = buildImagePathMatch
const openGraphImageBuildPerks = decodeURIComponent(sharedBuildPathSegment).split(',')

for (const perkName of buildPerks) {
  if (!openGraphImageBuildPerks.includes(perkName)) {
    fail(`shared build image URL is missing ${perkName}.`)
  }
}

const sharedBuildImage = await fetchImage(openGraphImageUrl)
const sharedBuildNetlifyCache =
  sharedBuildImage.response.headers.get('netlify-cdn-cache-control') ??
  sharedBuildImage.response.headers.get('cdn-cache-control') ??
  ''

if (!sharedBuildNetlifyCache.includes('max-age=2592000')) {
  fail('shared build image is missing long-lived CDN caching.')
}

const comparisonImageUrl = new URL(
  `/social/builds/${sharedBuildReferencePathSegment}/${encodeURIComponent(
    comparisonBuildPerks.join(','),
  )}.png`,
  baseUrl,
)

const comparisonBuildImage = await fetchImage(comparisonImageUrl)

if (comparisonBuildImage.sha256 === sharedBuildImage.sha256) {
  fail('different shared build image URLs returned the same cached image.')
}

console.log(`Deployed SEO smoke checks passed for ${baseUrl.origin}.`)
