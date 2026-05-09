import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  formatProductionReadinessStatus,
  isProductionReadinessStatusSuccessful,
  loadProductionReadinessStatus,
  normalizeAbsoluteOrigin,
  normalizeCommitSha,
  parsePositiveInteger,
  parseWaitForProductionDeployArgs,
  readCommitSha,
  waitForProductionDeploy,
  type ProductionReadinessStatus,
  type StaticProbeStatus,
  type WaitForProductionDeployOptions,
} from '../scripts/wait-for-production-deploy.ts'

const expectedCommitSha = '0123456789abcdef0123456789abcdef01234567'

function createStaticStatus(overrides: Partial<StaticProbeStatus> = {}): StaticProbeStatus {
  return {
    contentType: 'text/plain; charset=utf-8',
    label: 'robots.txt',
    missingSnippet: null,
    ok: true,
    statusCode: 200,
    url: 'https://battlebrothers.academy/robots.txt',
    ...overrides,
  }
}

function createStatus({
  commitSha = expectedCommitSha,
  homepageOk = true,
  staticFiles = [createStaticStatus()],
  versionOk = true,
}: {
  commitSha?: string | null
  homepageOk?: boolean
  staticFiles?: StaticProbeStatus[]
  versionOk?: boolean
} = {}): ProductionReadinessStatus {
  return {
    homepage: {
      assetUrls: ['https://battlebrothers.academy/assets/index.js'],
      contentType: homepageOk ? 'text/html; charset=utf-8' : 'application/json',
      missingSnippet: homepageOk ? null : '<title>Battle Brothers Legends build planner</title>',
      ok: homepageOk,
      statusCode: homepageOk ? 200 : 503,
      url: 'https://battlebrothers.academy/',
    },
    staticFiles,
    version: {
      commitSha,
      ok: versionOk,
      statusCode: versionOk ? 200 : 404,
      url: 'https://battlebrothers.academy/version.json',
    },
  }
}

function createOptions(overrides: Partial<WaitForProductionDeployOptions> = {}) {
  return {
    expectedCommitSha,
    intervalMs: 10,
    requestTimeoutMs: 100,
    requiredStableChecks: 2,
    timeoutMs: 100,
    webBaseUrl: 'https://battlebrothers.academy',
    ...overrides,
  }
}

describe('wait for production deploy', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('parses and normalizes commit, url, and timing arguments', () => {
    const options = parseWaitForProductionDeployArgs([
      '--commit',
      expectedCommitSha.toUpperCase(),
      '--web',
      'https://battlebrothers.academy/shared?build=Student',
      '--timeout-ms',
      '30000',
      '--interval-ms',
      '2500',
      '--request-timeout-ms',
      '500',
      '--required-stable-checks',
      '3',
    ])

    expect(options).toEqual({
      expectedCommitSha,
      intervalMs: 2500,
      requestTimeoutMs: 500,
      requiredStableChecks: 3,
      timeoutMs: 30000,
      webBaseUrl: 'https://battlebrothers.academy',
    })

    expect(
      parseWaitForProductionDeployArgs(['--web', 'https://battlebrothers.academy']),
    ).toMatchObject({
      expectedCommitSha: null,
      webBaseUrl: 'https://battlebrothers.academy',
    })
  })

  test('rejects misleading production wait inputs', () => {
    expect(() => normalizeAbsoluteOrigin('file:///tmp/index.html', '--web')).toThrow(
      '--web must use the http or https protocol.',
    )
    expect(() => normalizeCommitSha('not-a-commit')).toThrow(
      'The expected commit SHA must be a hexadecimal Git commit SHA.',
    )
    expect(() => parsePositiveInteger('0', 1, '--interval-ms')).toThrow(
      '--interval-ms must be a positive integer.',
    )
  })

  test('rejects present flags without usable values', () => {
    const cases = [
      {
        args: ['--web', 'https://battlebrothers.academy', '--commit'],
        errorMessage: 'Missing value for --commit argument.',
      },
      {
        args: ['--commit', '--web', 'https://battlebrothers.academy'],
        errorMessage: 'Missing value for --commit argument.',
      },
      {
        args: ['--web', 'https://battlebrothers.academy', '--interval-ms', '--timeout-ms', '1000'],
        errorMessage: 'Missing value for --interval-ms argument.',
      },
    ]

    for (const { args, errorMessage } of cases) {
      expect(() => parseWaitForProductionDeployArgs(args)).toThrow(errorMessage)
    }
  })

  test('reads only valid commit values from version payloads', () => {
    expect(readCommitSha({ commitSha: expectedCommitSha.toUpperCase() })).toBe(expectedCommitSha)
    expect(readCommitSha({ commitSha: 'local' })).toBeNull()
    expect(readCommitSha({ version: '2.1.0' })).toBeNull()
    expect(readCommitSha(null)).toBeNull()
  })

  test('requires healthy homepage markers and exact commit when requested', () => {
    expect(isProductionReadinessStatusSuccessful(createStatus(), expectedCommitSha)).toBe(true)
    expect(isProductionReadinessStatusSuccessful(createStatus(), null)).toBe(true)
    expect(
      isProductionReadinessStatusSuccessful(
        createStatus({ commitSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }),
        expectedCommitSha,
      ),
    ).toBe(false)
    expect(
      isProductionReadinessStatusSuccessful(createStatus({ homepageOk: false }), expectedCommitSha),
    ).toBe(false)
    expect(
      isProductionReadinessStatusSuccessful(
        createStatus({
          staticFiles: [
            createStaticStatus({
              contentType: 'text/html',
              label: 'robots.txt',
              ok: false,
              statusCode: 404,
            }),
          ],
        }),
        expectedCommitSha,
      ),
    ).toBe(false)
    expect(isProductionReadinessStatusSuccessful(createStatus({ commitSha: null }), null)).toBe(
      false,
    )
  })

  test('waits for consecutive stable readiness checks and resets after failures', async () => {
    const observedLogMessages: string[] = []
    const statuses = [
      createStatus(),
      createStatus({ commitSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }),
      createStatus(),
      createStatus(),
    ]

    const readinessStatus = await waitForProductionDeploy(createOptions(), {
      loadReadinessStatus: () => {
        const status = statuses.shift()

        if (!status) {
          throw new Error('unexpected extra readiness check')
        }

        return status
      },
      log: (message) => {
        observedLogMessages.push(message)
      },
      sleep: async () => {},
    })

    expect(statuses).toHaveLength(0)
    expect(readinessStatus.version.commitSha).toBe(expectedCommitSha)
    expect(observedLogMessages).toEqual([
      expect.stringContaining('Production readiness check 1/2 succeeded.'),
      expect.stringContaining('Waiting for production deploy'),
      expect.stringContaining('Production readiness check 1/2 succeeded.'),
      expect.stringContaining('Production readiness check 2/2 succeeded.'),
      expect.stringContaining(`Production site is stably serving commit ${expectedCommitSha}.`),
    ])
  })

  test('times out when the live version never reaches the requested commit', async () => {
    let now = 0

    await expect(
      waitForProductionDeploy(createOptions({ timeoutMs: 20 }), {
        loadReadinessStatus: () =>
          createStatus({ commitSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }),
        log: () => {},
        now: () => now,
        sleep: async (delayMs) => {
          now += delayMs
        },
      }),
    ).rejects.toThrow(
      `Timed out waiting for production site https://battlebrothers.academy to stably serve commit ${expectedCommitSha}.`,
    )
  })

  test('can wait for healthy production without requiring a specific commit', async () => {
    const observedLogMessages: string[] = []

    await waitForProductionDeploy(createOptions({ expectedCommitSha: null }), {
      loadReadinessStatus: () => createStatus(),
      log: (message) => {
        observedLogMessages.push(message)
      },
      sleep: async () => {},
    })

    expect(observedLogMessages).toContainEqual(
      expect.stringContaining(`Production site is stably ready at commit ${expectedCommitSha}.`),
    )
  })

  test('formats readiness diagnostics with missing markers and version details', () => {
    const failedHomepageStatus = formatProductionReadinessStatus(
      createStatus({ homepageOk: false }),
    )

    expect(failedHomepageStatus).toContain('homepage: status=503, contentType=application/json')
    expect(failedHomepageStatus).toContain(
      'markers=missing <title>Battle Brothers Legends build planner</title>',
    )
    expect(
      formatProductionReadinessStatus(createStatus({ commitSha: null, versionOk: false })),
    ).toContain('version: status=404, commitSha=missing')
    expect(
      formatProductionReadinessStatus(
        createStatus({
          staticFiles: [
            createStaticStatus({
              contentType: 'text/plain',
              missingSnippet: 'Sitemap: https://battlebrothers.academy/sitemap.xml',
              ok: false,
            }),
          ],
        }),
      ),
    ).toContain(
      'static: robots.txt=200 contentType=text/plain missing Sitemap: https://battlebrothers.academy/sitemap.xml',
    )
  })

  test('cancels unread static response bodies after recording their status and headers', async () => {
    const cancelledPaths: string[] = []
    const createTextResponse = (body: string, contentType: string) =>
      new Response(body, {
        headers: {
          'content-type': contentType,
        },
        status: 200,
      })
    const createUnreadStaticResponse = (pathname: string, contentType: string) =>
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(pathname))
          },
          cancel() {
            cancelledPaths.push(pathname)
          },
        }),
        {
          headers: {
            'content-type': contentType,
          },
          status: 200,
        },
      )

    vi.stubGlobal('fetch', async (input: Parameters<typeof fetch>[0]) => {
      const requestUrl = new URL(input instanceof Request ? input.url : input.toString())

      switch (requestUrl.pathname) {
        case '/':
          return createTextResponse(
            [
              '<title>Battle Brothers Legends build planner</title>',
              '<meta property="og:site_name" content="Battle Brothers Legends build planner" />',
              '<script src="/assets/app.js"></script>',
            ].join(''),
            'text/html; charset=utf-8',
          )
        case '/assets/app.js':
          return createUnreadStaticResponse(requestUrl.pathname, 'application/javascript')
        case '/robots.txt':
          return createTextResponse(
            'User-agent: *\nAllow: /\n\nSitemap: https://battlebrothers.academy/sitemap.xml\n',
            'text/plain; charset=utf-8',
          )
        case '/seo/og-image-v2.png':
          return createUnreadStaticResponse(requestUrl.pathname, 'image/png')
        case '/sitemap.xml':
          return createTextResponse(
            '<urlset><url><loc>https://battlebrothers.academy/</loc></url></urlset>',
            'application/xml',
          )
        case '/version.json':
          return createTextResponse(
            JSON.stringify({ commitSha: expectedCommitSha }),
            'application/json',
          )
        default:
          throw new Error(`Unexpected probe path: ${requestUrl.pathname}`)
      }
    })

    const readinessStatus = await loadProductionReadinessStatus(createOptions())

    expect(readinessStatus.staticFiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'social image',
          ok: true,
        }),
        expect.objectContaining({
          label: '/assets/app.js',
          ok: true,
        }),
      ]),
    )
    expect(cancelledPaths.toSorted()).toEqual(['/assets/app.js', '/seo/og-image-v2.png'])
  })
})
