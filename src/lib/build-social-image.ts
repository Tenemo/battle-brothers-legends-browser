import type { BuildSharePreviewPayload, BuildSharePreviewPerk } from './build-share-preview'

export const buildSocialImageWidth = 1200
export const buildSocialImageHeight = 630

type BuildSocialImageOptions = {
  resolveIconDataUrl?: (perk: BuildSharePreviewPerk) => string | null
}

const maxVisibleIcons = 12
const maxVisiblePerkNames = 6
const maxVisibleSharedGroups = 1
const ellipsis = '...'

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
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
      currentLine = estimateVisualWidth(word) > maxLineWidth ? truncateLineByVisualWidth(word, maxLineWidth) : word
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
    lines[lines.length - 1] = truncateLineByVisualWidth(`${lines[lines.length - 1]} ${ellipsis}`, maxLineWidth)
  }

  return lines
}

function renderTextLines({
  className,
  fill,
  fontSize,
  fontWeight,
  lines,
  lineStep,
  x,
  y,
}: {
  className?: string
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
        `<text${className ? ` class="${className}"` : ''} x="${x}" y="${
          y + lineIndex * lineStep
        }" fill="${fill}" font-family="Inter, Arial, sans-serif" font-size="${fontSize}" font-weight="${fontWeight}">${escapeXml(
          line,
        )}</text>`,
    )
    .join('')
}

function renderPerkNameRows(payload: BuildSharePreviewPayload): string {
  const perkRows = payload.pickedPerks.slice(0, maxVisiblePerkNames).map((perk, perkIndex) => {
    const rowY = 256 + perkIndex * 32
    const name = truncateLineByVisualWidth(perk.perkName, 30)

    return `<g transform="translate(96 ${rowY})">
      <circle cx="7" cy="7" r="4" fill="#c89d66" />
      <text x="24" y="14" fill="#f2e9df" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="600">${escapeXml(
        name,
      )}</text>
    </g>`
  })
  const hiddenCount = payload.pickedPerks.length - maxVisiblePerkNames

  if (hiddenCount > 0) {
    perkRows.push(`<text x="120" y="${
      264 + maxVisiblePerkNames * 32
    }" fill="#bda98f" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="600">+${hiddenCount} more perks</text>`)
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
      <text x="28" y="36" fill="#f2d6ad" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700" text-anchor="middle">+${hiddenCount}</text>
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
  resolveIconDataUrl: BuildSocialImageOptions['resolveIconDataUrl'],
): string {
  const visiblePerks = payload.pickedPerks.slice(0, maxVisibleIcons)
  const hiddenCount = payload.pickedPerks.length - maxVisibleIcons

  return visiblePerks
    .map((perk, perkIndex) => {
      const iconIndex = hiddenCount > 0 && perkIndex === maxVisibleIcons - 1 ? undefined : perkIndex
      const columnIndex = perkIndex % 4
      const rowIndex = Math.floor(perkIndex / 4)
      const x = 672 + columnIndex * 86
      const y = 122 + rowIndex * 64

      return renderIconCell({
        hiddenCount: iconIndex === undefined ? hiddenCount + 1 : undefined,
        iconDataUrl: iconIndex === undefined ? null : resolveIconDataUrl?.(perk) ?? null,
        index: perkIndex,
        perkName: perk.perkName,
        x,
        y,
      })
    })
    .join('')
}

function renderBackgroundFits(payload: BuildSharePreviewPayload): string {
  if (payload.topBackgroundFits.length === 0) {
    return `<text x="682" y="424" fill="#f2e9df" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="700">Background fit</text>
      <text x="682" y="464" fill="#bda98f" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="500">Pick perks to compare backgrounds.</text>`
  }

  return payload.topBackgroundFits
    .map((backgroundFit, backgroundFitIndex) => {
      const rowY = 418 + backgroundFitIndex * 48
      const scoreWidth = Math.max(
        28,
        Math.min(
          178,
          backgroundFit.maximumTotalGroupCount === 0
            ? 28
            : (backgroundFit.expectedMatchedTreeCount / backgroundFit.maximumTotalGroupCount) * 178,
        ),
      )
      const name = truncateLineByVisualWidth(backgroundFit.backgroundName, 13.4)
      const matchSummary =
        backgroundFit.matchLabels.length === 0
          ? `${backgroundFit.matchedGroupCount} matched groups`
          : truncateLineByVisualWidth(backgroundFit.matchLabels.join(', '), 18)

      return `<g transform="translate(682 ${rowY})">
        <text x="0" y="0" fill="#f2e9df" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700">${escapeXml(
          name,
        )}</text>
        <text x="0" y="23" fill="#bda98f" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="500">${escapeXml(
          matchSummary,
        )}</text>
        <rect x="250" y="-17" width="178" height="12" rx="6" fill="#2a211b" />
        <rect x="250" y="-17" width="${scoreWidth.toFixed(1)}" height="12" rx="6" fill="#c89d66" />
        <text x="250" y="23" fill="#d9c6aa" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="600">${backgroundFit.expectedMatchedTreeCount.toFixed(
          1,
        )}/${backgroundFit.maximumTotalGroupCount} expected groups</text>
      </g>`
    })
    .join('')
}

function renderSharedGroups(payload: BuildSharePreviewPayload): string {
  const visibleSharedGroups = payload.sharedGroups.slice(0, maxVisibleSharedGroups)

  if (visibleSharedGroups.length === 0) {
    return `<text x="96" y="554" fill="#bda98f" font-family="Inter, Arial, sans-serif" font-size="21" font-weight="500">No shared perk groups yet.</text>`
  }

  return visibleSharedGroups
    .map((sharedGroup, sharedGroupIndex) => {
      const rowY = 526 + sharedGroupIndex * 34

      return `<g transform="translate(96 ${rowY})">
        <text x="0" y="0" fill="#f2e9df" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="700">${escapeXml(
          truncateLineByVisualWidth(sharedGroup.groupLabel, 30),
        )}</text>
        <text x="0" y="24" fill="#bda98f" font-family="Inter, Arial, sans-serif" font-size="17" font-weight="500">${sharedGroup.perkCount} covered perks</text>
      </g>`
    })
    .join('')
}

export function createBuildSocialImageSvg(
  payload: BuildSharePreviewPayload,
  { resolveIconDataUrl }: BuildSocialImageOptions = {},
): string {
  const isEmpty = payload.status === 'empty'
  const titleLines = isEmpty
    ? wrapTextByVisualWidth('Plan a Legends build', 13.5, 2)
    : wrapTextByVisualWidth(`${payload.pickedPerkCount} picked perks`, 17, 2)
  const rawSubtitle = isEmpty
    ? 'Browse perks, choose a build, and share the link.'
    : payload.pickedPerks
        .slice(0, 4)
        .map((perk) => perk.perkName)
        .join(', ')
  const subtitle = truncateLineByVisualWidth(rawSubtitle, isEmpty ? 30 : 34)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${buildSocialImageWidth}" height="${buildSocialImageHeight}" viewBox="0 0 ${buildSocialImageWidth} ${buildSocialImageHeight}" role="img" aria-label="${escapeXml(
    payload.imageAlt,
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
    </defs>
    <rect width="1200" height="630" fill="url(#background)" />
    <rect width="1200" height="630" fill="url(#warm-accent)" />
    <rect width="1200" height="630" fill="url(#line-pattern)" opacity="0.32" />
    <rect x="64" y="64" width="512" height="502" rx="24" fill="#130f0c" fill-opacity="0.9" stroke="#5d4129" stroke-width="2" />
    <rect x="624" y="64" width="512" height="250" rx="24" fill="#130f0c" fill-opacity="0.88" stroke="#5d4129" stroke-width="2" />
    <rect x="624" y="344" width="512" height="222" rx="24" fill="#130f0c" fill-opacity="0.88" stroke="#5d4129" stroke-width="2" />
    <text x="96" y="116" fill="#c89d66" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="700">Battle Brothers legends build</text>
    ${renderTextLines({
      fill: '#f6eee5',
      fontSize: 56,
      fontWeight: 700,
      lineStep: 62,
      lines: titleLines,
      x: 96,
      y: 182,
    })}
    <text x="96" y="${titleLines.length > 1 ? 272 : 238}" fill="#bda98f" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="500">${escapeXml(
      subtitle,
    )}</text>
    ${isEmpty ? '' : renderPerkNameRows(payload)}
    <text x="96" y="496" fill="#c89d66" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="700">Shared perk groups</text>
    ${renderSharedGroups(payload)}
    <text x="664" y="106" fill="#c89d66" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="700">Picked perks</text>
    ${renderIconGrid(payload, resolveIconDataUrl)}
    <text x="682" y="386" fill="#c89d66" font-family="Inter, Arial, sans-serif" font-size="20" font-weight="700">Best background fits</text>
    ${renderBackgroundFits(payload)}
    <text x="682" y="554" fill="#80644a" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="600">Legends ${escapeXml(
      payload.referenceVersion.replace(/^reference-mod_/u, ''),
    )}${payload.unsupportedTargetCount > 0 ? ` · ${payload.unsupportedTargetCount} unsupported groups` : ''}</text>
  </svg>`
}
