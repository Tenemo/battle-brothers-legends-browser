import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { Resvg } from '@resvg/resvg-js'

import {
  escapeXml,
  renderSocialImageBackground,
  renderSocialImageBrand,
  renderSocialImageDefinitions,
  renderSocialImageFooter,
  socialImageHeight,
  socialImageWidth,
} from '../src/lib/social-image-markup.ts'
import { socialImageColors, socialImageFontFamilies } from '../src/lib/social-image-style.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRootDirectoryPath = path.resolve(__dirname, '..')
const socialImagePath = path.join(projectRootDirectoryPath, 'public', 'seo', 'og-image-v2.png')
const bookIconPath = path.join(
  projectRootDirectoryPath,
  'public',
  'game-icons',
  'ui',
  'perks',
  'perk_21.png',
)
const legendsPerkCatalogDataPath = path.join(
  projectRootDirectoryPath,
  'src',
  'data',
  'legends-perk-catalog.json',
)
const fontDirectoryPath = path.join(projectRootDirectoryPath, 'scripts', 'assets', 'fonts')
const cinzelRegularFontPath = path.join(fontDirectoryPath, 'Cinzel.ttf')
const cinzelBoldFontPath = path.join(fontDirectoryPath, 'Cinzel-Bold.ttf')
const sourceSansRegularFontPath = path.join(fontDirectoryPath, 'SourceSans3-Regular.ttf')
const sourceSansSemiBoldFontPath = path.join(fontDirectoryPath, 'SourceSans3-Semibold.ttf')
const sourceSansBoldFontPath = path.join(fontDirectoryPath, 'SourceSans3-Bold.ttf')
const fallbackLegendsReferenceVersion = '19.3.22'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export async function createRootSocialImageSvg({
  bookIconDataUrl = '',
  referenceVersion = fallbackLegendsReferenceVersion,
}: {
  bookIconDataUrl?: string
  referenceVersion?: string
} = {}): Promise<string> {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${socialImageWidth}" height="${socialImageHeight}" viewBox="0 0 ${socialImageWidth} ${socialImageHeight}" role="img" aria-label="${escapeXml(
    'Battle Brothers Legends build planner social preview.',
  )}">
  ${renderSocialImageDefinitions({ includePanelLight: true })}
  ${renderSocialImageBackground()}
  <rect x="65" y="65" width="1070" height="502" fill="${socialImageColors.panel}" stroke="${socialImageColors.panelStroke}" stroke-width="2" />
  <rect x="65" y="65" width="1070" height="502" fill="url(#panel-light)" />
  <text x="96" y="154" fill="${socialImageColors.title}" font-family="${socialImageFontFamilies.brand}" font-size="78" font-weight="700" letter-spacing="0.02em">Build planner</text>
  ${renderSocialImageBrand({
    fontSize: 26,
    x: 99,
    y: 214,
  })}
  <g transform="translate(126 268)">
    <rect x="0" y="0" width="258" height="258" rx="129" fill="#090908" fill-opacity="0.42" />
    <circle cx="129" cy="129" r="120" fill="#0f1111" stroke="#343432" stroke-width="6" />
    <circle cx="129" cy="129" r="114" fill="#151615" stroke="#575653" stroke-width="3" />
    ${
      bookIconDataUrl
        ? `<image href="${bookIconDataUrl}" x="30" y="27" width="198" height="198" preserveAspectRatio="xMidYMid meet" />`
        : ''
    }
  </g>
  <text x="430" y="344" fill="${socialImageColors.textPrimary}" font-family="${socialImageFontFamilies.brand}" font-size="40" font-weight="700" letter-spacing="0.02em">
    <tspan x="430" dy="0">Search perks, perk groups,</tspan>
    <tspan x="430" dy="50">and plan Legends mod builds.</tspan>
  </text>
  ${renderSocialImageFooter({
    referenceVersion,
    siteUrlFontSize: 24,
    siteUrlY: 614,
  })}
</svg>`
}

async function createBookIconDataUrl(): Promise<string> {
  const bookIcon = await readFile(bookIconPath)
  return `data:image/png;base64,${bookIcon.toString('base64')}`
}

async function readLegendsReferenceVersion(): Promise<string> {
  try {
    const legendsPerkCatalogData = JSON.parse(
      await readFile(legendsPerkCatalogDataPath, 'utf8'),
    ) as unknown

    return isRecord(legendsPerkCatalogData) &&
      typeof legendsPerkCatalogData.referenceVersion === 'string'
      ? legendsPerkCatalogData.referenceVersion
      : fallbackLegendsReferenceVersion
  } catch {
    return fallbackLegendsReferenceVersion
  }
}

export async function renderRootSocialImagePng(): Promise<Uint8Array> {
  const svg = await createRootSocialImageSvg({
    bookIconDataUrl: await createBookIconDataUrl(),
    referenceVersion: await readLegendsReferenceVersion(),
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
        cinzelRegularFontPath,
        cinzelBoldFontPath,
      ],
      loadSystemFonts: false,
      sansSerifFamily: 'Source Sans 3',
      serifFamily: 'Cinzel',
    },
  })

  return renderer.render().asPng()
}

export async function generateRootSocialImage(): Promise<{
  byteLength: number
  path: string
}> {
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
