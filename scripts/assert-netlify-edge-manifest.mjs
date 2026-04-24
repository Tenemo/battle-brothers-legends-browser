import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRootDirectoryPath = path.resolve(__dirname, '..')
const manifestFilePathCandidates = [
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

function fail(message) {
  throw new Error(`Netlify edge manifest check failed: ${message}`)
}

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value
  }

  if (typeof value === 'string') {
    return [value]
  }

  return []
}

function getRouteFunctionName(route) {
  return route.function ?? route.functionName ?? route.function_name ?? null
}

function routeMatchesRoot(route) {
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

function getExcludedPatterns(route) {
  return [
    ...normalizeArray(route.excludedPath),
    ...normalizeArray(route.excluded_path),
    ...normalizeArray(route.excludedPatterns),
    ...normalizeArray(route.excluded_patterns),
  ]
}

function excludedPatternMatchesRequiredPath(excludedPattern, requiredPath) {
  if (excludedPattern === requiredPath) {
    return true
  }

  const requiredPrefix = requiredPath.endsWith('/*') ? requiredPath.slice(0, -2) : requiredPath
  const normalizedPattern = excludedPattern.replaceAll('\\/', '/').replaceAll('\\.', '.')

  return normalizedPattern.includes(requiredPrefix)
}

async function readManifest() {
  const readErrors = []

  for (const manifestFilePath of manifestFilePathCandidates) {
    try {
      return JSON.parse(await readFile(manifestFilePath, 'utf8'))
    } catch (error) {
      readErrors.push(`${manifestFilePath}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  fail(`could not read an edge manifest. Tried: ${readErrors.join('; ')}`)
}

const manifest = await readManifest()
const routes = Array.isArray(manifest.routes) ? manifest.routes : []
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

console.log('Netlify edge manifest contains the expected build-seo route and exclusions.')
