export type GameIconImageWidth = 24 | 32 | 48 | 64
type GameIconUrlMode = 'direct' | 'netlify-image-cdn'

const gameIconImageQuality = 90
const maximumGameIconSourceWidth = 64
const gameIconCacheVersion = import.meta.env.VITE_PLANNER_VERSION
const shouldUseNetlifyImageCdn =
  import.meta.env.VITE_USE_NETLIFY_IMAGE_CDN === true ||
  import.meta.env.VITE_USE_NETLIFY_IMAGE_CDN === 'true'

export const gameIconImageWidths = {
  compact: 24,
  large: 64,
  picked: 32,
  row: 48,
} as const satisfies Record<string, GameIconImageWidth>

function getHighDensityGameIconImageWidth(width: GameIconImageWidth): GameIconImageWidth {
  if (width <= 24) {
    return 48
  }

  return maximumGameIconSourceWidth
}

function getDefaultGameIconUrlMode(): GameIconUrlMode {
  if (shouldUseNetlifyImageCdn) {
    return 'netlify-image-cdn'
  }

  if (typeof window === 'undefined') {
    return 'direct'
  }

  return window.location.hostname === 'battlebrothers.academy' ||
    window.location.hostname.endsWith('.netlify.app')
    ? 'netlify-image-cdn'
    : 'direct'
}

function createVersionedGameIconSourceUrl(iconPath: string): string {
  const sourceUrl = `/game-icons/${iconPath}`

  return gameIconCacheVersion
    ? `${sourceUrl}?v=${encodeURIComponent(gameIconCacheVersion)}`
    : sourceUrl
}

function createGameIconImageCdnUrl(iconPath: string, width: GameIconImageWidth): string {
  const imageParameters = new URLSearchParams({
    q: String(gameIconImageQuality),
    url: createVersionedGameIconSourceUrl(iconPath),
    w: String(width),
  })

  return `/.netlify/images?${imageParameters.toString()}`
}

export function getGameIconUrl(
  iconPath: string | null,
  width: GameIconImageWidth = maximumGameIconSourceWidth,
  mode: GameIconUrlMode = getDefaultGameIconUrlMode(),
): string | null {
  if (!iconPath) {
    return null
  }

  return mode === 'netlify-image-cdn'
    ? createGameIconImageCdnUrl(iconPath, width)
    : `/game-icons/${iconPath}`
}

export function getGameIconSrcSet(
  iconPath: string | null,
  width: GameIconImageWidth,
  mode: GameIconUrlMode = getDefaultGameIconUrlMode(),
): string | undefined {
  if (!iconPath || mode !== 'netlify-image-cdn' || width >= maximumGameIconSourceWidth) {
    return undefined
  }

  const highDensityWidth = getHighDensityGameIconImageWidth(width)

  return [
    `${createGameIconImageCdnUrl(iconPath, width)} 1x`,
    `${createGameIconImageCdnUrl(iconPath, highDensityWidth)} 2x`,
  ].join(', ')
}
