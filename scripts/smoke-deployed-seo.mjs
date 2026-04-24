const crawlerUserAgent =
  'facebookexternalhit/1.1 (+https://www.facebook.com/externalhit_uatext.php)'
const buildPerks = ['Clarity', 'Perfect Focus']

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

async function fetchImageHead(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': crawlerUserAgent,
    },
    method: 'HEAD',
    redirect: 'follow',
  })

  if (!response.ok) {
    fail(`${url.toString()} returned ${response.status}.`)
  }

  const contentType = response.headers.get('content-type') ?? ''

  if (contentType !== 'image/png') {
    fail(`${url.toString()} returned ${contentType || 'no content type'} instead of image/png.`)
  }

  const contentLength = Number(response.headers.get('content-length') ?? '0')

  if (!Number.isFinite(contentLength) || contentLength <= 1000) {
    fail(`${url.toString()} returned an unexpectedly small image.`)
  }

  return response
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  printUsage()
  process.exit(0)
}

const baseUrl = normalizeBaseUrl(process.argv[2] ?? process.env.DEPLOY_SMOKE_BASE_URL)
const rootHtml = await fetchHtml(baseUrl)

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

const sharedBuildUrl = new URL(baseUrl)

for (const perkName of buildPerks) {
  sharedBuildUrl.searchParams.append('build', perkName)
}

const sharedBuildHtml = await fetchHtml(sharedBuildUrl)

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
  openGraphImageUrl.pathname !== '/social/build.png'
) {
  fail(
    `shared build image URL was ${openGraphImageUrl.toString()} instead of a deployed social image URL.`,
  )
}

for (const perkName of buildPerks) {
  if (!openGraphImageUrl.searchParams.getAll('build').includes(perkName)) {
    fail(`shared build image URL is missing ${perkName}.`)
  }
}

const sharedBuildImageResponse = await fetchImageHead(openGraphImageUrl)
const sharedBuildNetlifyCache =
  sharedBuildImageResponse.headers.get('netlify-cdn-cache-control') ?? ''

if (!sharedBuildNetlifyCache.includes('durable')) {
  fail('shared build image is missing durable Netlify CDN caching.')
}

await fetchImageHead(new URL('/social/build.png', baseUrl))

console.log(`Deployed SEO smoke checks passed for ${baseUrl.origin}.`)
