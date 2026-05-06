import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRootDirectoryPath = path.resolve(__dirname, '..')
const manifestFilePathCandidates = [
  path.join(projectRootDirectoryPath, '.netlify', 'generated-edge-functions', 'manifest.json'),
  path.join(projectRootDirectoryPath, '.netlify', 'edge-functions-dist', 'manifest.json'),
  path.join(projectRootDirectoryPath, '.netlify', 'edge-functions', 'manifest.json'),
]

const requiredExcludedPaths = [
  '/assets/*',
  '/favicon/*',
  '/game-icons/*',
  '/robots.txt',
  '/seo/*',
  '/sitemap.xml',
  '/social/*',
]
const requiredAgentCategoryHeaderName = 'netlify-agent-category'
const requiredAgentCategoryHeaderPattern =
  '^(page-preview|crawler|ai-agent|tooling|other|none)(;|$)'

type EdgeManifestRoute = Record<string, unknown>

type EdgeManifest = {
  routes?: unknown
}

function fail(message: string): never {
  throw new Error(`Netlify edge manifest check failed: ${message}`)
}

function normalizeArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value
  }

  if (typeof value === 'string') {
    return [value]
  }

  return []
}

function getRouteFunctionName(route: EdgeManifestRoute): string | null {
  const functionName = route.function ?? route.functionName ?? route.function_name ?? null

  return typeof functionName === 'string' ? functionName : null
}

function routeMatchesRoot(route: EdgeManifestRoute): boolean {
  const routePaths = normalizeArray(route.path)

  if (routePaths.includes('/*')) {
    return true
  }

  const routePatterns = normalizeArray(route.pattern)

  return routePatterns.some((routePattern) => {
    if (typeof routePattern !== 'string') {
      return false
    }

    return routePattern === '^/(.*)$' || routePattern === '^/.*$' || routePattern.includes('/(.*)')
  })
}

function getExcludedPatterns(route: EdgeManifestRoute): unknown[] {
  return [
    ...normalizeArray(route.excludedPath),
    ...normalizeArray(route.excluded_path),
    ...normalizeArray(route.excludedPatterns),
    ...normalizeArray(route.excluded_patterns),
  ]
}

function normalizeRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
}

function getHeaderPattern(route: EdgeManifestRoute, headerName: string): string | null {
  const headerSources = [route.header, route.headers]

  for (const headerSource of headerSources) {
    const headers = normalizeRecord(headerSource)

    if (!headers) {
      continue
    }

    const headerCondition = headers[headerName] ?? headers[headerName.toLowerCase()]

    if (typeof headerCondition === 'string') {
      return headerCondition
    }

    const normalizedHeaderCondition = normalizeRecord(headerCondition)
    const pattern = normalizedHeaderCondition?.pattern ?? normalizedHeaderCondition?.value

    if (typeof pattern === 'string') {
      return pattern
    }
  }

  return null
}

function excludedPatternMatchesRequiredPath(
  excludedPattern: string,
  requiredPath: string,
): boolean {
  if (excludedPattern === requiredPath) {
    return true
  }

  const requiredPrefix = requiredPath.endsWith('/*') ? requiredPath.slice(0, -2) : requiredPath
  const normalizedPattern = excludedPattern.replaceAll('\\/', '/').replaceAll('\\.', '.')

  return normalizedPattern.includes(requiredPrefix)
}

async function readManifest(): Promise<EdgeManifest> {
  const readErrors: string[] = []

  for (const manifestFilePath of manifestFilePathCandidates) {
    try {
      return JSON.parse(await readFile(manifestFilePath, 'utf8')) as EdgeManifest
    } catch (error) {
      readErrors.push(
        `${manifestFilePath}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  fail(`could not read an edge manifest. Tried: ${readErrors.join('; ')}`)
}

const manifest = await readManifest()
const routes = Array.isArray(manifest.routes)
  ? manifest.routes.filter(
      (route): route is EdgeManifestRoute => typeof route === 'object' && route !== null,
    )
  : []
const buildSeoRoute = routes.find((route) => getRouteFunctionName(route) === 'build-seo')

if (!buildSeoRoute) {
  fail('build-seo route is missing.')
}

if (!routeMatchesRoot(buildSeoRoute)) {
  fail(`build-seo route does not cover /*. Route: ${JSON.stringify(buildSeoRoute)}`)
}

const excludedPatterns = getExcludedPatterns(buildSeoRoute)

for (const requiredExcludedPath of requiredExcludedPaths) {
  if (
    !excludedPatterns.some((excludedPattern) =>
      excludedPatternMatchesRequiredPath(String(excludedPattern), requiredExcludedPath),
    )
  ) {
    fail(`build-seo route is missing the ${requiredExcludedPath} exclusion.`)
  }
}

const agentCategoryHeaderPattern = getHeaderPattern(buildSeoRoute, requiredAgentCategoryHeaderName)

if (agentCategoryHeaderPattern !== requiredAgentCategoryHeaderPattern) {
  fail(
    `build-seo route must only run for non-browser Netlify user-agent categories. Expected ${requiredAgentCategoryHeaderName}=${requiredAgentCategoryHeaderPattern}, got ${String(
      agentCategoryHeaderPattern,
    )}.`,
  )
}

console.log(
  'Netlify edge manifest contains the expected build-seo route, exclusions, and user-agent category condition.',
)
