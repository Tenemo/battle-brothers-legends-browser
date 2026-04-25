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
    expect(svg).toContain('fill="url(#background)"')
    expect(svg).toContain('fill="url(#warm-accent)"')
    expect(svg).toContain('fill="url(#line-pattern)"')
    expect(svg).toContain('width="258" height="258"')
    expect(svg).toContain('<text x="4" y="618"')
    expect(svg).toContain('<line x1="4" y1="626" x2="310"')
    expect(svg).not.toContain('PERKS BROWSER')
    expect(svg).not.toContain('width="172" height="8"')
  })

  test('produces a non-empty PNG with the expected file signature', async () => {
    const png = await renderRootSocialImagePng()

    expect(png.byteLength).toBeGreaterThan(100_000)
    expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  })
})
