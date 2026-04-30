import path from 'node:path'
import { fileURLToPath } from 'node:url'

const commitShaPattern = /^[0-9a-f]{7,40}$/i
const defaultIntervalMs = 15_000
const defaultRequestTimeoutMs = 10_000
const defaultRequiredStableChecks = 2
const defaultTimeoutMs = 30 * 60 * 1000
const homepageExpectedSnippets = [
  '<title>Battle Brothers Legends build planner</title>',
  '<meta property="og:site_name" content="Battle Brothers Legends build planner" />',
]
const currentFilePath = fileURLToPath(import.meta.url)

function fail(message) {
  throw new Error(message)
}

export function normalizeAbsoluteOrigin(rawUrl, label) {
  let parsedUrl

  try {
    parsedUrl = new URL(rawUrl)
  } catch {
    fail(`${label} must be a valid absolute URL.`)
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    fail(`${label} must use the http or https protocol.`)
  }

  return parsedUrl.origin
}

export function normalizeCommitSha(rawCommitSha) {
  const commitSha = rawCommitSha.trim().toLowerCase()

  if (!commitShaPattern.test(commitSha)) {
    fail('The expected commit SHA must be a hexadecimal Git commit SHA.')
  }

  return commitSha
}

export function parsePositiveInteger(rawValue, fallback, label) {
  if (!rawValue) {
    return fallback
  }

  const parsedValue = Number(rawValue)

  if (!Number.isFinite(parsedValue) || !Number.isInteger(parsedValue) || parsedValue < 1) {
    fail(`${label} must be a positive integer.`)
  }

  return parsedValue
}

export function parseWaitForProductionDeployArgs(args) {
  const getArgValue = (flag) => {
    const flagIndex = args.indexOf(flag)

    if (flagIndex === -1) {
      return undefined
    }

    return args[flagIndex + 1]
  }

  const rawCommitSha = getArgValue('--commit')
  const rawWebBaseUrl = getArgValue('--web')

  if (!rawCommitSha) {
    fail('Missing required --commit argument.')
  }

  if (!rawWebBaseUrl) {
    fail('Missing required --web argument.')
  }

  return {
    expectedCommitSha: normalizeCommitSha(rawCommitSha),
    intervalMs: parsePositiveInteger(
      getArgValue('--interval-ms'),
      defaultIntervalMs,
      '--interval-ms',
    ),
    requestTimeoutMs: parsePositiveInteger(
      getArgValue('--request-timeout-ms'),
      defaultRequestTimeoutMs,
      '--request-timeout-ms',
    ),
    requiredStableChecks: parsePositiveInteger(
      getArgValue('--required-stable-checks'),
      defaultRequiredStableChecks,
      '--required-stable-checks',
    ),
    timeoutMs: parsePositiveInteger(getArgValue('--timeout-ms'), defaultTimeoutMs, '--timeout-ms'),
    webBaseUrl: normalizeAbsoluteOrigin(rawWebBaseUrl, '--web'),
  }
}

function createNoStoreUrl(baseUrl, endpointPath) {
  const url = new URL(endpointPath, baseUrl)

  url.searchParams.set('t', `${Date.now()}`)

  return url
}

async function getJsonResponse(url, requestTimeoutMs) {
  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      accept: 'application/json',
      'cache-control': 'no-store',
      pragma: 'no-cache',
    },
    signal: AbortSignal.timeout(requestTimeoutMs),
  })
  let body = null

  try {
    body = await response.json()
  } catch {
    body = null
  }

  return {
    body,
    statusCode: response.status,
  }
}

async function getHtmlResponse(url, requestTimeoutMs) {
  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'cache-control': 'no-store',
      pragma: 'no-cache',
    },
    signal: AbortSignal.timeout(requestTimeoutMs),
  })

  return {
    body: await response.text(),
    contentType: response.headers.get('content-type'),
    statusCode: response.status,
  }
}

export function readCommitSha(body) {
  if (typeof body !== 'object' || body === null) {
    return null
  }

  const commitSha = body.commitSha

  if (typeof commitSha !== 'string') {
    return null
  }

  const normalizedCommitSha = commitSha.trim().toLowerCase()

  return commitShaPattern.test(normalizedCommitSha) ? normalizedCommitSha : null
}

async function loadVersionStatus(webBaseUrl, requestTimeoutMs) {
  const url = createNoStoreUrl(webBaseUrl, '/version.json')

  try {
    const { body, statusCode } = await getJsonResponse(url, requestTimeoutMs)

    return {
      commitSha: readCommitSha(body),
      ok: statusCode >= 200 && statusCode < 300,
      statusCode,
      url: url.toString(),
    }
  } catch {
    return {
      commitSha: null,
      ok: false,
      statusCode: null,
      url: url.toString(),
    }
  }
}

async function loadHomepageStatus(webBaseUrl, requestTimeoutMs) {
  const url = createNoStoreUrl(webBaseUrl, '/')

  try {
    const { body, contentType, statusCode } = await getHtmlResponse(url, requestTimeoutMs)
    const missingSnippet =
      homepageExpectedSnippets.find((expectedSnippet) => !body.includes(expectedSnippet)) ?? null
    const isHtmlResponse = (contentType ?? '').includes('text/html')

    return {
      contentType,
      missingSnippet,
      ok: statusCode >= 200 && statusCode < 300 && isHtmlResponse && missingSnippet === null,
      statusCode,
      url: url.toString(),
    }
  } catch {
    return {
      contentType: null,
      missingSnippet: null,
      ok: false,
      statusCode: null,
      url: url.toString(),
    }
  }
}

export async function loadProductionReadinessStatus(options) {
  const [version, homepage] = await Promise.all([
    loadVersionStatus(options.webBaseUrl, options.requestTimeoutMs),
    loadHomepageStatus(options.webBaseUrl, options.requestTimeoutMs),
  ])

  return {
    homepage,
    version,
  }
}

export function isProductionReadinessStatusSuccessful(status, expectedCommitSha) {
  return status.version.ok && status.version.commitSha === expectedCommitSha && status.homepage.ok
}

function formatVersionStatus(status) {
  return `version: status=${status.statusCode ?? 'unreachable'}, commitSha=${status.commitSha ?? 'missing'}`
}

function formatHomepageStatus(status) {
  const markerStatus =
    status.statusCode == null
      ? 'markers=unreachable'
      : status.missingSnippet
        ? `markers=missing ${status.missingSnippet}`
        : status.ok
          ? 'markers=ok'
          : 'markers=unknown'

  return `homepage: status=${status.statusCode ?? 'unreachable'}, contentType=${status.contentType ?? 'missing'}, ${markerStatus}`
}

export function formatProductionReadinessStatus(status) {
  return [formatVersionStatus(status.version), formatHomepageStatus(status.homepage)].join(' ')
}

const sleep = async (delayMs) => {
  await new Promise((resolve) => {
    setTimeout(resolve, delayMs)
  })
}

export async function waitForProductionDeploy(options, dependencies = {}) {
  const loadStatus = dependencies.loadReadinessStatus ?? loadProductionReadinessStatus
  const log = dependencies.log ?? console.log
  const resolveNow = dependencies.now ?? Date.now
  const wait = dependencies.sleep ?? sleep
  const deadline = resolveNow() + options.timeoutMs
  let stableChecks = 0

  while (resolveNow() <= deadline) {
    const readinessStatus = await loadStatus(options)
    const isSuccessful = isProductionReadinessStatusSuccessful(
      readinessStatus,
      options.expectedCommitSha,
    )

    if (isSuccessful) {
      stableChecks += 1
      log(
        `Production readiness check ${stableChecks}/${options.requiredStableChecks} succeeded. ${formatProductionReadinessStatus(readinessStatus)}`,
      )

      if (stableChecks >= options.requiredStableChecks) {
        log(`Production site is stably serving commit ${options.expectedCommitSha}.`)
        return
      }
    } else {
      stableChecks = 0
      log(
        [
          `Waiting for production deploy ${options.expectedCommitSha}.`,
          formatProductionReadinessStatus(readinessStatus),
        ].join(' '),
      )
    }

    await wait(options.intervalMs)
  }

  fail(
    `Timed out waiting for production site ${options.webBaseUrl} to stably serve commit ${options.expectedCommitSha}.`,
  )
}

if (process.argv[1] && path.resolve(process.argv[1]) === currentFilePath) {
  await waitForProductionDeploy(parseWaitForProductionDeployArgs(process.argv.slice(2)))
}
