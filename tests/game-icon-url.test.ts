import { describe, expect, test } from 'vitest'
import { gameIconImageWidths, getGameIconSrcSet, getGameIconUrl } from '../src/lib/game-icon-url'

describe('game icon URL', () => {
  test('keeps local and non-Netlify icon URLs direct', () => {
    expect(getGameIconUrl('ui/perks/perk_57.png', gameIconImageWidths.picked)).toBe(
      '/game-icons/ui/perks/perk_57.png',
    )
    expect(getGameIconSrcSet('ui/perks/perk_57.png', gameIconImageWidths.picked)).toBeUndefined()
  })

  test('routes Netlify game icons through the Image CDN with explicit width and quality', () => {
    expect(
      getGameIconUrl('ui/perks/perk_57.png', gameIconImageWidths.picked, 'netlify-image-cdn'),
    ).toMatch(
      /^\/\.netlify\/images\?q=90&url=%2Fgame-icons%2Fui%2Fperks%2Fperk_57\.png%3Fv%3D[^&]+&w=32$/u,
    )
  })

  test('creates density candidates without upscaling past the source icon width', () => {
    expect(
      getGameIconSrcSet('ui/perks/perk_57.png', gameIconImageWidths.compact, 'netlify-image-cdn'),
    ).toMatch(
      /^\/\.netlify\/images\?q=90&url=%2Fgame-icons%2Fui%2Fperks%2Fperk_57\.png%3Fv%3D[^&]+&w=24 1x, \/\.netlify\/images\?q=90&url=%2Fgame-icons%2Fui%2Fperks%2Fperk_57\.png%3Fv%3D[^&]+&w=48 2x$/u,
    )

    expect(
      getGameIconSrcSet('ui/perks/perk_57.png', gameIconImageWidths.row, 'netlify-image-cdn'),
    ).toMatch(
      /^\/\.netlify\/images\?q=90&url=%2Fgame-icons%2Fui%2Fperks%2Fperk_57\.png%3Fv%3D[^&]+&w=48 1x, \/\.netlify\/images\?q=90&url=%2Fgame-icons%2Fui%2Fperks%2Fperk_57\.png%3Fv%3D[^&]+&w=64 2x$/u,
    )
  })

  test('does not emit image attributes for missing icons or full-size density duplicates', () => {
    expect(getGameIconUrl(null, gameIconImageWidths.compact)).toBeNull()
    expect(
      getGameIconSrcSet(null, gameIconImageWidths.compact, 'netlify-image-cdn'),
    ).toBeUndefined()
    expect(
      getGameIconSrcSet('ui/perks/perk_57.png', gameIconImageWidths.large, 'netlify-image-cdn'),
    ).toBeUndefined()
  })
})
