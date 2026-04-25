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

export async function createRootSocialImageSvg({ bookIconDataUrl = '' } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${socialImageWidth}" height="${socialImageHeight}" viewBox="0 0 ${socialImageWidth} ${socialImageHeight}" role="img" aria-label="${escapeXml(
    'Battle Brothers Legends perks browser social preview.',
  )}">
  <defs>
    <linearGradient id="background" x1="0%" x2="100%" y1="0%" y2="100%">
      <stop offset="0%" stop-color="#0d0a08" />
      <stop offset="58%" stop-color="#17110d" />
      <stop offset="100%" stop-color="#21170f" />
    </linearGradient>
    <radialGradient id="warm-accent" cx="84%" cy="16%" r="62%">
      <stop offset="0%" stop-color="#7a4c28" stop-opacity="0.46" />
      <stop offset="100%" stop-color="#7a4c28" stop-opacity="0" />
    </radialGradient>
    <pattern id="line-pattern" width="44" height="44" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
      <path d="M0 0H44" stroke="#3d2a1c" stroke-opacity="0.36" stroke-width="1" />
    </pattern>
    <radialGradient id="panel-light" cx="42%" cy="34%" r="70%">
      <stop offset="0%" stop-color="#2b2018" stop-opacity="0.5" />
      <stop offset="100%" stop-color="#100c0a" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#background)" />
  <rect width="1200" height="630" fill="url(#warm-accent)" />
  <rect width="1200" height="630" fill="url(#line-pattern)" opacity="0.32" />
  <rect x="65" y="65" width="1070" height="502" fill="#16100d" stroke="#6f4f27" stroke-width="2" />
  <rect x="65" y="65" width="1070" height="502" fill="url(#panel-light)" />
  <g transform="translate(126 186)">
    <rect x="0" y="0" width="258" height="258" rx="129" fill="#090908" fill-opacity="0.42" />
    <circle cx="129" cy="129" r="120" fill="#0f1111" stroke="#343432" stroke-width="6" />
    <circle cx="129" cy="129" r="114" fill="#151615" stroke="#575653" stroke-width="3" />
    ${
      bookIconDataUrl
        ? `<image href="${bookIconDataUrl}" x="30" y="27" width="198" height="198" preserveAspectRatio="xMidYMid meet" />`
        : ''
    }
  </g>
  <text x="430" y="216" fill="#ddb07b" font-family="Source Sans 3, Arial, sans-serif" font-size="24" font-weight="400" letter-spacing="0.16em">
    <tspan>BATTLE BROTHERS </tspan><tspan font-weight="700">LEGENDS</tspan>
  </text>
  <text x="430" y="270" fill="#f4eee6" font-family="Cinzel, Georgia, serif" font-size="52" font-weight="700" letter-spacing="0.02em">Perks browser</text>
  <text x="430" y="336" fill="#fffaf0" font-family="Source Sans 3, Arial, sans-serif" font-size="27" font-weight="600">
    <tspan x="430" dy="0">Search perks, inspect tree placement, and plan builds</tspan>
    <tspan x="430" dy="32">with exact in-mod labels and real game icons.</tspan>
  </text>
  <text x="4" y="618" fill="#ded4c1" font-family="Source Sans 3, Arial, sans-serif" font-size="24" font-weight="700">battlebrothers.academy</text>
  <line x1="4" y1="626" x2="310" y2="626" stroke="#ded4c1" stroke-width="2" stroke-linecap="round" />
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
  console.log(
    `Generated ${path.relative(projectRootDirectoryPath, result.path)} (${result.byteLength} bytes).`,
  )
}
