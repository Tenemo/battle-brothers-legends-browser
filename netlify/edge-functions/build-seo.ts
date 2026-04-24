import type { Config, Context } from '@netlify/edge-functions'
import { renderDocumentHtml } from '../../src/lib/build-seo-metadata.ts'

function isHtmlResponse(response: Response): boolean {
  return (response.headers.get('content-type') ?? '').includes('text/html')
}

export default async function buildSeo(request: Request, context: Context): Promise<Response> {
  if (request.method !== 'GET') {
    return context.next()
  }

  const response = await context.next()

  if (!isHtmlResponse(response)) {
    return response
  }

  try {
    const html = await response.clone().text()
    const updatedHtml = renderDocumentHtml({
      baseHtml: html,
      requestUrl: new URL(request.url),
    })
    const headers = new Headers(response.headers)

    headers.set('content-type', 'text/html; charset=utf-8')
    headers.delete('content-encoding')
    headers.delete('content-length')
    headers.delete('etag')
    headers.delete('last-modified')

    return new Response(updatedHtml, {
      headers,
      status: response.status,
      statusText: response.statusText,
    })
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Failed to inject build SEO metadata.')

    return response
  }
}

export const config: Config = {
  excludedPath: [
    '/assets/*',
    '/favicon/*',
    '/game-icons/*',
    '/robots.txt',
    '/seo/*',
    '/sitemap.xml',
    '/social/*',
  ],
  path: '/*',
}
