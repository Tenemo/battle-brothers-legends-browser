import { describe, expect, test } from 'vitest'
import legendsPlannerMetadata from '../src/data/legends-planner-metadata.json'
import {
  createRootSocialImageSvg,
  renderRootSocialImagePng,
} from '../scripts/generate-root-social-image.ts'

describe('root social image generation', () => {
  test('renders the requested default SEO image copy and brand styling', async () => {
    const svg = await createRootSocialImageSvg({
      bookIconDataUrl: 'data:image/png;base64,test',
    })

    expect(svg).toContain('<tspan>BATTLE BROTHERS </tspan><tspan font-weight="700">LEGENDS</tspan>')
    expect(svg).toContain('letter-spacing="0.1em"')
    expect(svg).toContain('font-weight="400" letter-spacing="0.1em"')
    expect(svg).toContain('font-family="Cinzel, serif"')
    expect(svg).toContain('letter-spacing="0.02em"')
    expect(svg).toContain('Build planner')
    expect(svg).toContain('Search perks, perk groups,')
    expect(svg).toContain('and plan Legends mod builds.')
    expect(svg).not.toContain('inspect perk groups')
    expect(svg).toContain('fill="url(#background)"')
    expect(svg).toContain('fill="url(#warm-accent)"')
    expect(svg).toContain('fill="url(#line-pattern)"')
    expect(svg).toContain('text-decoration="underline"')
    expect(svg).toContain(`Legends ${legendsPlannerMetadata.referenceVersion}`)
  })

  test('escapes an explicitly supplied release label', async () => {
    const svg = await createRootSocialImageSvg({ referenceVersion: 'preview <19.4.22> & next' })

    expect(svg).toContain('Legends preview &lt;19.4.22&gt; &amp; next')
    expect(svg).not.toContain('Legends preview <19.4.22> & next')
  })

  test('produces a non-empty PNG with the expected file signature', async () => {
    const png = await renderRootSocialImagePng()

    expect(png.byteLength).toBeGreaterThan(100_000)
    expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
  })
})
