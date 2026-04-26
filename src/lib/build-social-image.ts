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

export const buildSocialImageWidth = socialImageWidth
export const buildSocialImageHeight = socialImageHeight

type BuildSocialImageOptions = {
  resolveBackgroundIconDataUrl?: (backgroundFit: BuildSharePreviewBackgroundFit) => string | null
  resolvePerkIconDataUrl?: (perk: BuildSharePreviewPerk) => string | null
}

const maxVisibleIcons = 20
const maxVisiblePerkNames = 10
const ellipsis = '...'

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
  className,
  fill,
  fontFamily = 'Source Sans 3, Arial, sans-serif',
  fontSize,
  fontWeight,
  letterSpacing,
  lines,
  lineStep,
  x,
  y,
}: {
  className?: string
  fill: string
  fontFamily?: string
  fontSize: number
  fontWeight: number
  letterSpacing?: string
  lines: string[]
  lineStep: number
  x: number
  y: number
}): string {
  return lines
    .map(
      (line, lineIndex) =>
        `<text${className ? ` class="${className}"` : ''} x="${x}" y="${
          y + lineIndex * lineStep
        }" fill="${fill}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}"${
          letterSpacing ? ` letter-spacing="${letterSpacing}"` : ''
        }>${escapeXml(line)}</text>`,
    )
    .join('')
}

function renderPerkNameRows(payload: BuildSharePreviewPayload, startY: number): string {
  const perkRows = payload.pickedPerks.slice(0, maxVisiblePerkNames).map((perk, perkIndex) => {
    const rowY = startY + perkIndex * 29
    const name = truncateLineByVisualWidth(perk.perkName, 30)

    return `<g transform="translate(80 ${rowY})">
      <circle cx="7" cy="7" r="4" fill="#c89d66" />
      <text x="24" y="14" fill="#f2e9df" font-family="Source Sans 3, Arial, sans-serif" font-size="23" font-weight="600">${escapeXml(
        name,
      )}</text>
    </g>`
  })
  const hiddenCount = payload.pickedPerks.length - maxVisiblePerkNames

  if (hiddenCount > 0) {
    perkRows.push(
      `<text x="80" y="${
        startY + maxVisiblePerkNames * 29 + 8
      }" fill="#bda98f" font-family="Source Sans 3, Arial, sans-serif" font-size="21" font-weight="600">+${hiddenCount} more perks</text>`,
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
      <rect width="56" height="56" rx="13" fill="#211a15" stroke="#76563b" stroke-width="2" />
      <text x="28" y="36" fill="#f2d6ad" font-family="Source Sans 3, Arial, sans-serif" font-size="22" font-weight="700" text-anchor="middle">+${hiddenCount}</text>
    </g>`
  }

  const iconMarkup = iconDataUrl
    ? `<defs><clipPath id="${clipPathId}"><rect x="${x}" y="${y}" width="56" height="56" rx="13" /></clipPath></defs>
      <image href="${iconDataUrl}" x="${x}" y="${y}" width="56" height="56" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipPathId})" />`
    : `<rect x="${x}" y="${y}" width="56" height="56" rx="13" fill="#221b16" />`

  return `<g>
    <rect x="${x - 3}" y="${y - 3}" width="62" height="62" rx="15" fill="#18130f" stroke="#76563b" stroke-width="2" />
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
    : `<rect x="${x}" y="${y}" width="38" height="38" rx="8" fill="#221b16" />`

  return `<g>
    <rect x="${x - 2}" y="${y - 2}" width="42" height="42" rx="10" fill="#18130f" stroke="#76563b" stroke-width="1.5" />
    ${iconMarkup}
    <title>${escapeXml(backgroundFit.backgroundName)}</title>
  </g>`
}

function renderBackgroundFits(
  payload: BuildSharePreviewPayload,
  resolveBackgroundIconDataUrl: BuildSocialImageOptions['resolveBackgroundIconDataUrl'],
): string {
  if (payload.topBackgroundFits.length === 0) {
    return `<text x="664" y="442" fill="#f2e9df" font-family="Source Sans 3, Arial, sans-serif" font-size="25" font-weight="700">Background fit</text>
      <text x="664" y="480" fill="#bda98f" font-family="Source Sans 3, Arial, sans-serif" font-size="21" font-weight="500">Pick perks to compare backgrounds.</text>`
  }

  return payload.topBackgroundFits
    .map((backgroundFit, backgroundFitIndex) => {
      const rowY = 446 + backgroundFitIndex * 52
      const scoreWidth = Math.max(
        28,
        Math.min(
          160,
          backgroundFit.maximumTotalGroupCount === 0
            ? 28
            : (backgroundFit.expectedMatchedTreeCount / backgroundFit.maximumTotalGroupCount) * 160,
        ),
      )
      const name = truncateLineByVisualWidth(backgroundFit.backgroundName, 16)

      return `<g transform="translate(664 ${rowY})">
        ${renderBackgroundIcon({
          backgroundFit,
          iconDataUrl: resolveBackgroundIconDataUrl?.(backgroundFit) ?? null,
          index: backgroundFitIndex,
          x: 0,
          y: -28,
        })}
        <text x="54" y="-8" fill="#f2e9df" font-family="Source Sans 3, Arial, sans-serif" font-size="22" font-weight="700">${escapeXml(
          name,
        )}</text>
        <rect x="270" y="-24" width="160" height="11" rx="5.5" fill="#2a211b" />
        <rect x="270" y="-24" width="${scoreWidth.toFixed(1)}" height="11" rx="5.5" fill="#c89d66" />
        <text x="270" y="9" fill="#d9c6aa" font-family="Source Sans 3, Arial, sans-serif" font-size="16" font-weight="600">${backgroundFit.expectedMatchedTreeCount.toFixed(
          1,
        )}/${backgroundFit.maximumTotalGroupCount} expected groups</text>
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
    <rect x="48" y="32" width="528" height="538" rx="24" fill="#130f0c" fill-opacity="0.9" stroke="#5d4129" stroke-width="2" />
    <rect x="624" y="32" width="528" height="326" rx="24" fill="#130f0c" fill-opacity="0.88" stroke="#5d4129" stroke-width="2" />
    <rect x="624" y="376" width="528" height="194" rx="24" fill="#130f0c" fill-opacity="0.88" stroke="#5d4129" stroke-width="2" />
    ${renderSocialImageBrand()}
    ${renderTextLines({
      fill: '#f6eee5',
      fontSize: 56,
      fontWeight: 700,
      lineStep: 62,
      lines: titleLines,
      x: 80,
      y: 150,
    })}
    ${
      isEmpty
        ? `<text x="80" y="${titleLines.length > 1 ? 240 : 206}" fill="#bda98f" font-family="Source Sans 3, Arial, sans-serif" font-size="24" font-weight="500">${escapeXml(
            truncateLineByVisualWidth(emptySubtitle, 30),
          )}</text>`
        : ''
    }
    ${isEmpty ? '' : renderPerkNameRows(payload, perkListStartY)}
    <text x="664" y="64" fill="#c89d66" font-family="Source Sans 3, Arial, sans-serif" font-size="20" font-weight="700">Picked perks</text>
    ${renderIconGrid(payload, resolvePerkIconDataUrl)}
    <text x="664" y="410" fill="#c89d66" font-family="Source Sans 3, Arial, sans-serif" font-size="20" font-weight="700">Best background fits</text>
    ${renderBackgroundFits(payload, resolveBackgroundIconDataUrl)}
    ${renderSocialImageFooter({
      referenceVersion: payload.referenceVersion,
      siteUrlFontSize: 18,
      siteUrlY: 620,
    })}
  </svg>`
}
