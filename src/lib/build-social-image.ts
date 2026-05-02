import type {
  BuildSharePreviewBackgroundFit,
  BuildSharePreviewPayload,
  BuildSharePreviewPerk,
} from './build-share-preview'
import {
  escapeXml,
  renderSocialImageBackground,
  renderSocialImageBrand,
  renderSocialImageDefinitions,
  renderSocialImageFooter,
  socialImageHeight,
  socialImageWidth,
} from './social-image-markup'
import { socialImageColors, socialImageFontFamilies } from './social-image-style'

export const buildSocialImageWidth = socialImageWidth
export const buildSocialImageHeight = socialImageHeight

type BuildSocialImageOptions = {
  resolveBackgroundIconDataUrl?: (backgroundFit: BuildSharePreviewBackgroundFit) => string | null
  resolvePerkIconDataUrl?: (perk: BuildSharePreviewPerk) => string | null
}

const maxVisibleIcons = 20
const maxVisiblePerkNames = 10
const ellipsis = '...'

function formatExpectedBuildPerkCount(expectedBuildPerkCount: number): string {
  const roundedExpectedBuildPerkCount = Math.round(expectedBuildPerkCount * 10) / 10

  return Number.isInteger(roundedExpectedBuildPerkCount)
    ? roundedExpectedBuildPerkCount.toFixed(0)
    : roundedExpectedBuildPerkCount.toFixed(1)
}

function estimateCharacterWidth(character: string): number {
  if (character === ' ') {
    return 0.42
  }

  if (/[.,'`:;|!ilI1-]/u.test(character)) {
    return 0.52
  }

  if (/[MWOQG@#%&0-9]/u.test(character)) {
    return 1.18
  }

  if (/[A-Z]/u.test(character)) {
    return 1.04
  }

  return 0.9
}

function estimateVisualWidth(value: string): number {
  return [...value].reduce(
    (totalWidth, character) => totalWidth + estimateCharacterWidth(character),
    0,
  )
}

function truncateLineByVisualWidth(value: string, maxWidth: number): string {
  if (estimateVisualWidth(value) <= maxWidth) {
    return value
  }

  const ellipsisWidth = estimateVisualWidth(ellipsis)
  const truncatedCharacters: string[] = []
  let currentWidth = 0

  for (const character of value) {
    const nextWidth = currentWidth + estimateCharacterWidth(character)

    if (nextWidth + ellipsisWidth > maxWidth) {
      break
    }

    truncatedCharacters.push(character)
    currentWidth = nextWidth
  }

  return `${truncatedCharacters.join('').trimEnd()}${ellipsis}`
}

function wrapTextByVisualWidth(value: string, maxLineWidth: number, maxLines: number): string[] {
  const words = value.trim().split(/\s+/u).filter(Boolean)

  if (words.length === 0) {
    return []
  }

  const lines: string[] = []
  let currentLine = ''
  let didTruncate = false

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word

    if (estimateVisualWidth(nextLine) <= maxLineWidth) {
      currentLine = nextLine
      continue
    }

    if (currentLine) {
      lines.push(currentLine)
      currentLine =
        estimateVisualWidth(word) > maxLineWidth
          ? truncateLineByVisualWidth(word, maxLineWidth)
          : word
    } else {
      lines.push(truncateLineByVisualWidth(word, maxLineWidth))
      currentLine = ''
    }

    if (lines.length === maxLines) {
      didTruncate = true
      break
    }
  }

  if (lines.length < maxLines && currentLine) {
    lines.push(currentLine)
  }

  if (lines.length > maxLines) {
    lines.length = maxLines
    didTruncate = true
  }

  if (didTruncate && lines.length > 0 && !lines[lines.length - 1].endsWith(ellipsis)) {
    lines[lines.length - 1] = truncateLineByVisualWidth(
      `${lines[lines.length - 1]} ${ellipsis}`,
      maxLineWidth,
    )
  }

  return lines
}

function renderTextLines({
  fill,
  fontSize,
  fontWeight,
  lines,
  lineStep,
  x,
  y,
}: {
  fill: string
  fontSize: number
  fontWeight: number
  lines: string[]
  lineStep: number
  x: number
  y: number
}): string {
  return lines
    .map(
      (line, lineIndex) =>
        `<text x="${x}" y="${
          y + lineIndex * lineStep
        }" fill="${fill}" font-family="${socialImageFontFamilies.body}" font-size="${fontSize}" font-weight="${fontWeight}">${escapeXml(
          line,
        )}</text>`,
    )
    .join('')
}

function renderPerkNameRows(payload: BuildSharePreviewPayload, startY: number): string {
  const perkRows = payload.pickedPerks.slice(0, maxVisiblePerkNames).map((perk, perkIndex) => {
    const rowY = startY + perkIndex * 29
    const name = truncateLineByVisualWidth(perk.perkName, 30)

    return `<g transform="translate(80 ${rowY})">
      <circle cx="7" cy="7" r="4" fill="${socialImageColors.accent}" />
      <text x="24" y="14" fill="${socialImageColors.textPrimary}" font-family="${socialImageFontFamilies.body}" font-size="23" font-weight="600">${escapeXml(
        name,
      )}</text>
    </g>`
  })
  const hiddenCount = payload.pickedPerks.length - maxVisiblePerkNames

  if (hiddenCount > 0) {
    perkRows.push(
      `<text x="80" y="${
        startY + maxVisiblePerkNames * 29 + 8
      }" fill="${socialImageColors.textMuted}" font-family="${socialImageFontFamilies.body}" font-size="21" font-weight="600">+${hiddenCount} more perks</text>`,
    )
  }

  return perkRows.join('')
}

function renderIconCell({
  hiddenCount,
  iconDataUrl,
  index,
  perkName,
  x,
  y,
}: {
  hiddenCount?: number
  iconDataUrl: string | null
  index: number
  perkName: string
  x: number
  y: number
}): string {
  const clipPathId = `perk-icon-clip-${index}`

  if (hiddenCount !== undefined && hiddenCount > 0) {
    return `<g transform="translate(${x} ${y})">
      <rect width="56" height="56" rx="13" fill="${socialImageColors.iconCellMuted}" stroke="${socialImageColors.iconStroke}" stroke-width="2" />
      <text x="28" y="36" fill="${socialImageColors.iconCellText}" font-family="${socialImageFontFamilies.body}" font-size="22" font-weight="700" text-anchor="middle">+${hiddenCount}</text>
    </g>`
  }

  const iconMarkup = iconDataUrl
    ? `<defs><clipPath id="${clipPathId}"><rect x="${x}" y="${y}" width="56" height="56" rx="13" /></clipPath></defs>
      <image href="${iconDataUrl}" x="${x}" y="${y}" width="56" height="56" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipPathId})" />`
    : `<rect x="${x}" y="${y}" width="56" height="56" rx="13" fill="${socialImageColors.iconCellEmpty}" />`

  return `<g>
    <rect x="${x - 3}" y="${y - 3}" width="62" height="62" rx="15" fill="${socialImageColors.iconCell}" stroke="${socialImageColors.iconStroke}" stroke-width="2" />
    ${iconMarkup}
    <title>${escapeXml(perkName)}</title>
  </g>`
}

function renderIconGrid(
  payload: BuildSharePreviewPayload,
  resolvePerkIconDataUrl: BuildSocialImageOptions['resolvePerkIconDataUrl'],
): string {
  const visiblePerks = payload.pickedPerks.slice(0, maxVisibleIcons)
  const hiddenCount = payload.pickedPerks.length - maxVisibleIcons

  return visiblePerks
    .map((perk, perkIndex) => {
      const iconIndex = hiddenCount > 0 && perkIndex === maxVisibleIcons - 1 ? undefined : perkIndex
      const columnIndex = perkIndex % 5
      const rowIndex = Math.floor(perkIndex / 5)
      const x = 664 + columnIndex * 88
      const y = 80 + rowIndex * 70

      return renderIconCell({
        hiddenCount: iconIndex === undefined ? hiddenCount + 1 : undefined,
        iconDataUrl: iconIndex === undefined ? null : (resolvePerkIconDataUrl?.(perk) ?? null),
        index: perkIndex,
        perkName: perk.perkName,
        x,
        y,
      })
    })
    .join('')
}

function renderBackgroundIcon({
  backgroundFit,
  iconDataUrl,
  index,
  x,
  y,
}: {
  backgroundFit: BuildSharePreviewBackgroundFit
  iconDataUrl: string | null
  index: number
  x: number
  y: number
}): string {
  const clipPathId = `background-fit-icon-clip-${index}`

  const iconMarkup = iconDataUrl
    ? `<defs><clipPath id="${clipPathId}"><rect x="${x}" y="${y}" width="38" height="38" rx="8" /></clipPath></defs>
      <image href="${iconDataUrl}" x="${x}" y="${y}" width="38" height="38" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipPathId})" />`
    : `<rect x="${x}" y="${y}" width="38" height="38" rx="8" fill="${socialImageColors.iconCellEmpty}" />`

  return `<g>
    <rect x="${x - 2}" y="${y - 2}" width="42" height="42" rx="10" fill="${socialImageColors.iconCell}" stroke="${socialImageColors.iconStroke}" stroke-width="1.5" />
    ${iconMarkup}
    <title>${escapeXml(backgroundFit.backgroundName)}</title>
  </g>`
}

function renderBackgroundFits(
  payload: BuildSharePreviewPayload,
  resolveBackgroundIconDataUrl: BuildSocialImageOptions['resolveBackgroundIconDataUrl'],
): string {
  if (payload.topBackgroundFits.length === 0) {
    return `<text x="664" y="442" fill="${socialImageColors.textPrimary}" font-family="${socialImageFontFamilies.body}" font-size="25" font-weight="700">Background fit</text>
      <text x="664" y="480" fill="${socialImageColors.textMuted}" font-family="${socialImageFontFamilies.body}" font-size="21" font-weight="500">Pick perks to compare backgrounds.</text>`
  }

  return payload.topBackgroundFits
    .map((backgroundFit, backgroundFitIndex) => {
      const rowY = 446 + backgroundFitIndex * 52
      const expectedCoverageRatio =
        payload.pickedPerkCount === 0
          ? 0
          : backgroundFit.expectedCoveredPickedPerkCount / payload.pickedPerkCount
      const scoreWidth = Math.max(
        backgroundFit.expectedCoveredPickedPerkCount === 0 ? 0 : 28,
        Math.min(
          160,
          backgroundFit.expectedCoveredPickedPerkCount === 0 ? 0 : expectedCoverageRatio * 160,
        ),
      )
      const name = truncateLineByVisualWidth(backgroundFit.backgroundName, 16)
      const expectedBuildPerkCount = formatExpectedBuildPerkCount(
        backgroundFit.expectedCoveredPickedPerkCount,
      )

      return `<g transform="translate(664 ${rowY})">
        ${renderBackgroundIcon({
          backgroundFit,
          iconDataUrl: resolveBackgroundIconDataUrl?.(backgroundFit) ?? null,
          index: backgroundFitIndex,
          x: 0,
          y: -28,
        })}
        <text x="54" y="-8" fill="${socialImageColors.textPrimary}" font-family="${socialImageFontFamilies.body}" font-size="22" font-weight="700">${escapeXml(
          name,
        )}</text>
        <rect x="270" y="-24" width="160" height="11" rx="5.5" fill="${socialImageColors.progressTrack}" />
        <rect x="270" y="-24" width="${scoreWidth.toFixed(1)}" height="11" rx="5.5" fill="${socialImageColors.accent}" />
        <text x="270" y="9" fill="${socialImageColors.progressText}" font-family="${socialImageFontFamilies.body}" font-size="16" font-weight="600">${expectedBuildPerkCount}/${payload.pickedPerkCount} expected perks</text>
      </g>`
    })
    .join('')
}

export function createBuildSocialImageSvg(
  payload: BuildSharePreviewPayload,
  { resolveBackgroundIconDataUrl, resolvePerkIconDataUrl }: BuildSocialImageOptions = {},
): string {
  const isEmpty = payload.status === 'empty'
  const titleLines = isEmpty
    ? wrapTextByVisualWidth('Plan a Legends build', 13.5, 2)
    : wrapTextByVisualWidth(`${payload.pickedPerkCount} picked perks`, 17, 2)
  const emptySubtitle = 'Browse perks, choose a build, and share the link.'
  const perkListStartY = 190 + (titleLines.length - 1) * 62

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${buildSocialImageWidth}" height="${buildSocialImageHeight}" viewBox="0 0 ${buildSocialImageWidth} ${buildSocialImageHeight}" role="img" aria-label="${escapeXml(
    payload.imageAlt,
  )}">
    ${renderSocialImageDefinitions()}
    ${renderSocialImageBackground()}
    <rect x="48" y="32" width="528" height="538" rx="24" fill="${socialImageColors.panel}" fill-opacity="0.9" stroke="${socialImageColors.panelStroke}" stroke-width="2" />
    <rect x="624" y="32" width="528" height="326" rx="24" fill="${socialImageColors.panel}" fill-opacity="0.88" stroke="${socialImageColors.panelStroke}" stroke-width="2" />
    <rect x="624" y="376" width="528" height="194" rx="24" fill="${socialImageColors.panel}" fill-opacity="0.88" stroke="${socialImageColors.panelStroke}" stroke-width="2" />
    ${renderSocialImageBrand()}
    ${renderTextLines({
      fill: socialImageColors.title,
      fontSize: 56,
      fontWeight: 700,
      lineStep: 62,
      lines: titleLines,
      x: 80,
      y: 150,
    })}
    ${
      isEmpty
        ? `<text x="80" y="${titleLines.length > 1 ? 240 : 206}" fill="${socialImageColors.textMuted}" font-family="${socialImageFontFamilies.body}" font-size="24" font-weight="500">${escapeXml(
            truncateLineByVisualWidth(emptySubtitle, 30),
          )}</text>`
        : ''
    }
    ${isEmpty ? '' : renderPerkNameRows(payload, perkListStartY)}
    <text x="664" y="64" fill="${socialImageColors.accent}" font-family="${socialImageFontFamilies.body}" font-size="20" font-weight="700">Picked perks</text>
    ${renderIconGrid(payload, resolvePerkIconDataUrl)}
    <text x="664" y="410" fill="${socialImageColors.accent}" font-family="${socialImageFontFamilies.body}" font-size="20" font-weight="700">Best background fits</text>
    ${renderBackgroundFits(payload, resolveBackgroundIconDataUrl)}
    ${renderSocialImageFooter({
      referenceVersion: payload.referenceVersion,
      siteUrlFontSize: 18,
      siteUrlY: 620,
    })}
  </svg>`
}
