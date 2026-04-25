import { describe, expect, test } from 'vitest'
import {
  createRootSocialImageSvg,
  renderRootSocialImagePng,
} from '../scripts/generate-root-social-image.mjs'

describe('root social image generation', () => {
  test('renders the requested default SEO image copy and brand styling', async () => {
    const svg = await createRootSocialImageSvg({
      bookIconDataUrl: 'data:image/png;base64,test',
    })

    expect(svg).toContain('<tspan>BATTLE BROTHERS </tspan><tspan font-weight="700">LEGENDS</tspan>')
    expect(svg).toContain('letter-spacing="0.16em"')
    expect(svg).toContain('font-family="Cinzel, Georgia, serif"')
    expect(svg).toContain('letter-spacing="0.02em"')
    expect(svg).toContain('Perks browser')
    expect(svg).not.toContain('PERKS BROWSER')
  })

  test('produces a non-empty PNG with the expected file signature', async () => {
    const png = await renderRootSocialImagePng()

    expect(png.byteLength).toBeGreaterThan(100_000)
    expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  })
})
