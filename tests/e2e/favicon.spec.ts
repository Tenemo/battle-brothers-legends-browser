import { expect, test } from '@playwright/test'

test('serves the student favicon assets across platforms', async ({ page, request }) => {
  await page.goto('/')

  await expect(page.locator('head meta[name="theme-color"]')).toHaveAttribute('content', '#0c0908')
  await expect(page.locator('head meta[name="color-scheme"]')).toHaveAttribute('content', 'dark')
  await expect(page.locator('head meta[name="apple-mobile-web-app-title"]')).toHaveAttribute(
    'content',
    'Legends perks',
  )
  await expect(page.locator('head link[rel="icon"][sizes="96x96"]')).toHaveAttribute(
    'href',
    '/favicon/favicon-96x96.png',
  )
  await expect(page.locator('head link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute(
    'href',
    '/favicon/favicon.svg',
  )
  await expect(page.locator('head link[rel="shortcut icon"]')).toHaveAttribute(
    'href',
    '/favicon/favicon.ico',
  )
  await expect(page.locator('head link[rel="apple-touch-icon"]')).toHaveAttribute(
    'href',
    '/favicon/apple-touch-icon.png',
  )
  await expect(page.locator('head link[rel="manifest"]')).toHaveAttribute(
    'href',
    '/favicon/site.webmanifest',
  )

  const faviconPngResponse = await request.get('/favicon/favicon-96x96.png')
  expect(faviconPngResponse.ok()).toBe(true)

  const faviconSvgResponse = await request.get('/favicon/favicon.svg')
  expect(faviconSvgResponse.ok()).toBe(true)

  const faviconIcoResponse = await request.get('/favicon/favicon.ico')
  expect(faviconIcoResponse.ok()).toBe(true)

  const appleTouchIconResponse = await request.get('/favicon/apple-touch-icon.png')
  expect(appleTouchIconResponse.ok()).toBe(true)

  const manifestResponse = await request.get('/favicon/site.webmanifest')
  expect(manifestResponse.ok()).toBe(true)

  const webApplicationIcon192Response = await request.get('/favicon/web-app-manifest-192x192.png')
  expect(webApplicationIcon192Response.ok()).toBe(true)

  const webApplicationIcon512Response = await request.get('/favicon/web-app-manifest-512x512.png')
  expect(webApplicationIcon512Response.ok()).toBe(true)

  const manifest = await manifestResponse.json()
  expect(manifest).toEqual({
    name: 'Battle Brothers legends perks browser',
    short_name: 'Legends perks',
    icons: [
      {
        src: '/favicon/web-app-manifest-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/favicon/web-app-manifest-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
    theme_color: '#0c0908',
    background_color: '#0c0908',
    display: 'standalone',
  })
})
