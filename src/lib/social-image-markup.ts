export const socialImageWidth = 1200
export const socialImageHeight = 630

type SocialImageDefinitionsOptions = {
  includePanelLight?: boolean
}

type SocialImageFooterOptions = {
  referenceVersion: string
  siteUrlFontSize: number
  siteUrlY: number
}

type SocialImageBrandOptions = {
  fontSize?: number
  x?: number
  y?: number
}

export function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export function formatSocialImageReferenceVersion(referenceVersion: string): string {
  return referenceVersion.replace(/^reference-mod_/u, '')
}

export function renderSocialImageDefinitions({
  includePanelLight = false,
}: SocialImageDefinitionsOptions = {}): string {
  return `<defs>
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
    </pattern>${
      includePanelLight
        ? `
    <radialGradient id="panel-light" cx="42%" cy="34%" r="70%">
      <stop offset="0%" stop-color="#2b2018" stop-opacity="0.5" />
      <stop offset="100%" stop-color="#100c0a" stop-opacity="0" />
    </radialGradient>`
        : ''
    }
  </defs>`
}

export function renderSocialImageBackground(): string {
  return `<rect width="${socialImageWidth}" height="${socialImageHeight}" fill="url(#background)" />
  <rect width="${socialImageWidth}" height="${socialImageHeight}" fill="url(#warm-accent)" />
  <rect width="${socialImageWidth}" height="${socialImageHeight}" fill="url(#line-pattern)" opacity="0.32" />`
}

export function renderSocialImageBrand({
  fontSize = 16,
  x = 80,
  y = 98,
}: SocialImageBrandOptions = {}): string {
  return `<text x="${x}" y="${y}" fill="#ddb07b" font-family="Source Sans 3, serif" font-size="${fontSize}" font-weight="400" letter-spacing="0.16em">
    <tspan>BATTLE BROTHERS </tspan><tspan font-weight="700">LEGENDS</tspan>
  </text>`
}

export function renderSocialImageFooter({
  referenceVersion,
  siteUrlFontSize,
  siteUrlY,
}: SocialImageFooterOptions): string {
  return `<text x="12" y="${siteUrlY}" fill="#ded4c1" font-family="Source Sans 3, Arial, sans-serif" font-size="${siteUrlFontSize}" font-weight="700" text-decoration="underline">battlebrothers.academy</text>
  <text x="${socialImageWidth - 12}" y="${siteUrlY}" fill="#80644a" font-family="Source Sans 3, Arial, sans-serif" font-size="${siteUrlFontSize}" font-weight="600" text-anchor="end">Legends ${escapeXml(
    formatSocialImageReferenceVersion(referenceVersion),
  )}</text>`
}
