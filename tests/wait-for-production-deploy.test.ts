import { describe, expect, test } from 'vitest'
import {
  formatProductionReadinessStatus,
  isProductionReadinessStatusSuccessful,
  normalizeAbsoluteOrigin,
  normalizeCommitSha,
  parsePositiveInteger,
  parseWaitForProductionDeployArgs,
  readCommitSha,
  waitForProductionDeploy,
  type ProductionReadinessStatus,
  type WaitForProductionDeployOptions,
} from '../scripts/wait-for-production-deploy.ts'

const expectedCommitSha = '0123456789abcdef0123456789abcdef01234567'

function createStatus({
  commitSha = expectedCommitSha,
  homepageOk = true,
  versionOk = true,
}: {
  commitSha?: string | null
  homepageOk?: boolean
  versionOk?: boolean
} = {}): ProductionReadinessStatus {
  return {
    homepage: {
      contentType: homepageOk ? 'text/html; charset=utf-8' : 'application/json',
      missingSnippet: homepageOk ? null : '<title>Battle Brothers Legends build planner</title>',
      ok: homepageOk,
      statusCode: homepageOk ? 200 : 503,
      url: 'https://battlebrothers.academy/',
    },
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

  test('reads only valid commit values from version payloads', () => {
    expect(readCommitSha({ commitSha: expectedCommitSha.toUpperCase() })).toBe(expectedCommitSha)
    expect(readCommitSha({ commitSha: 'local' })).toBeNull()
    expect(readCommitSha({ version: '2.1.0' })).toBeNull()
    expect(readCommitSha(null)).toBeNull()
  })

  test('requires both exact version commit and healthy homepage markers', () => {
    expect(isProductionReadinessStatusSuccessful(createStatus(), expectedCommitSha)).toBe(true)
    expect(
      isProductionReadinessStatusSuccessful(
        createStatus({ commitSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }),
        expectedCommitSha,
      ),
    ).toBe(false)
    expect(
      isProductionReadinessStatusSuccessful(createStatus({ homepageOk: false }), expectedCommitSha),
    ).toBe(false)
  })

  test('waits for consecutive stable readiness checks and resets after failures', async () => {
    const observedLogMessages: string[] = []
    const statuses = [
      createStatus(),
      createStatus({ commitSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }),
      createStatus(),
      createStatus(),
    ]

    await waitForProductionDeploy(createOptions(), {
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
  })
})
