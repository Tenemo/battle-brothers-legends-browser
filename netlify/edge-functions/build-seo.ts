import type { Context } from '@netlify/edge-functions'
import { renderDocumentHtml } from '../../src/lib/build-seo-metadata'

type BuildSeoHandlerOptions = {
  renderHtml?: typeof renderDocumentHtml
}

const browserAgentCategoryPattern = /^browser(?:;|$)/u

function isHtmlResponse(response: Response): boolean {
  return (response.headers.get('content-type') ?? '').includes('text/html')
}

function hasBrowserAgentCategory(request: Request): boolean {
  const agentCategory = request.headers.get('netlify-agent-category')

  if (!agentCategory) {
    return false
  }

  return agentCategory
    .split(',')
    .some((agentCategoryPart) =>
      browserAgentCategoryPattern.test(agentCategoryPart.trim().toLowerCase()),
    )
}

export function createBuildSeoHandler({
  renderHtml = renderDocumentHtml,
}: BuildSeoHandlerOptions = {}): (request: Request, context: Context) => Promise<Response> {
  return async function buildSeo(request: Request, context: Context): Promise<Response> {
    if (request.method !== 'GET' || hasBrowserAgentCategory(request)) {
      return context.next()
    }

    const response = await context.next()

    if (!isHtmlResponse(response)) {
      return response
    }

    try {
      const html = await response.clone().text()
      const updatedHtml = renderHtml({
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
}

const buildSeo = createBuildSeoHandler()

export default buildSeo
