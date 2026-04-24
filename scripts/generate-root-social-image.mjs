import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { Resvg } from '@resvg/resvg-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRootDirectoryPath = path.resolve(__dirname, '..')
const socialImageWidth = 1200
const socialImageHeight = 630
const socialImagePath = path.join(projectRootDirectoryPath, 'public', 'seo', 'og-image-v2.png')
const bookIconPath = path.join(
  projectRootDirectoryPath,
  'public',
  'game-icons',
  'ui',
  'perks',
  'perk_21.png',
)
const fontDirectoryPath = path.join(projectRootDirectoryPath, 'scripts', 'assets', 'fonts')
const cinzelBoldFontPath = path.join(fontDirectoryPath, 'Cinzel.ttf')
const sourceSansRegularFontPath = path.join(fontDirectoryPath, 'SourceSans3-Regular.ttf')
const sourceSansSemiBoldFontPath = path.join(fontDirectoryPath, 'SourceSans3-Semibold.ttf')
const sourceSansBoldFontPath = path.join(fontDirectoryPath, 'SourceSans3-Bold.ttf')

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export async function createRootSocialImageSvg({
  bookIconDataUrl = '',
} = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${socialImageWidth}" height="${socialImageHeight}" viewBox="0 0 ${socialImageWidth} ${socialImageHeight}" role="img" aria-label="${escapeXml(
    'Battle Brothers Legends perks browser social preview.',
  )}">
  <defs>
    <pattern id="diagonal-texture" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="28" stroke="#21170f" stroke-width="2" stroke-opacity="0.35" />
    </pattern>
    <radialGradient id="panel-light" cx="42%" cy="34%" r="70%">
      <stop offset="0%" stop-color="#2b2018" stop-opacity="0.5" />
      <stop offset="100%" stop-color="#100c0a" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#080706" />
  <rect width="1200" height="630" fill="url(#diagonal-texture)" />
  <rect x="65" y="65" width="1070" height="502" fill="#16100d" stroke="#6f4f27" stroke-width="2" />
  <rect x="65" y="65" width="1070" height="502" fill="url(#panel-light)" />
  <g transform="translate(184 174)">
    <rect x="0" y="0" width="172" height="172" rx="86" fill="#090908" fill-opacity="0.42" />
    <circle cx="86" cy="86" r="80" fill="#0f1111" stroke="#343432" stroke-width="4" />
    <circle cx="86" cy="86" r="76" fill="#151615" stroke="#575653" stroke-width="2" />
    ${
      bookIconDataUrl
        ? `<image href="${bookIconDataUrl}" x="20" y="18" width="132" height="132" preserveAspectRatio="xMidYMid meet" />`
        : ''
    }
  </g>
  <rect x="184" y="422" width="172" height="8" fill="#d8a45a" />
  <text x="430" y="216" fill="#e0a846" font-family="Source Sans 3, Arial, sans-serif" font-size="24" font-weight="400">
    <tspan>Battle Brothers </tspan><tspan font-weight="700">Legends</tspan>
  </text>
  <text x="432" y="266" fill="#8b5838" font-family="Cinzel, Georgia, serif" font-size="42" font-weight="700">PERKS BROWSER</text>
  <text x="430" y="264" fill="#f4eee6" font-family="Cinzel, Georgia, serif" font-size="42" font-weight="700">PERKS BROWSER</text>
  <text x="430" y="336" fill="#fffaf0" font-family="Source Sans 3, Arial, sans-serif" font-size="27" font-weight="600">
    <tspan x="430" dy="0">Search perks, inspect tree placement, and plan builds</tspan>
    <tspan x="430" dy="32">with exact in-mod labels and real game icons.</tspan>
  </text>
  <text x="430" y="476" fill="#ded4c1" font-family="Source Sans 3, Arial, sans-serif" font-size="24" font-weight="700">battlebrothers.academy</text>
</svg>`
}

async function createBookIconDataUrl() {
  const bookIcon = await readFile(bookIconPath)
  return `data:image/png;base64,${bookIcon.toString('base64')}`
}

export async function renderRootSocialImagePng() {
  const svg = await createRootSocialImageSvg({
    bookIconDataUrl: await createBookIconDataUrl(),
  })
  const renderer = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: socialImageWidth,
    },
    font: {
      defaultFontFamily: 'Source Sans 3',
      fontFiles: [
        sourceSansRegularFontPath,
        sourceSansSemiBoldFontPath,
        sourceSansBoldFontPath,
        cinzelBoldFontPath,
      ],
      loadSystemFonts: false,
      sansSerifFamily: 'Source Sans 3',
      serifFamily: 'Cinzel',
    },
  })

  return renderer.render().asPng()
}

export async function generateRootSocialImage() {
  const png = await renderRootSocialImagePng()

  await mkdir(path.dirname(socialImagePath), {
    recursive: true,
  })
  await writeFile(socialImagePath, png)

  return {
    byteLength: png.byteLength,
    path: socialImagePath,
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await generateRootSocialImage()
  console.log(`Generated ${path.relative(projectRootDirectoryPath, result.path)} (${result.byteLength} bytes).`)
}
