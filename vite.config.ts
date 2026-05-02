import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { injectRootSeoIntoHtml } from './src/lib/seo-metadata'

const commitShaPattern = /^[0-9a-f]{7,40}$/i
const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version?: unknown }
const plannerVersion = packageJson.version

if (typeof plannerVersion !== 'string' || plannerVersion.length === 0) {
  throw new Error('package.json must define a non-empty version string.')
}

function getBuildCommitSha(): string | null {
  const rawCommitSha = process.env.COMMIT_REF ?? process.env.GITHUB_SHA ?? null

  if (!rawCommitSha) {
    return null
  }

  const commitSha = rawCommitSha.trim().toLowerCase()

  if (!commitShaPattern.test(commitSha)) {
    return null
  }

  return commitSha
}

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 2500,
  },
  plugins: [
    react(),
    {
      name: 'battle-brothers-root-seo',
      transformIndexHtml(html) {
        return injectRootSeoIntoHtml(html)
      },
    },
    {
      name: 'battle-brothers-version-json',
      generateBundle() {
        this.emitFile({
          fileName: 'version.json',
          source: `${JSON.stringify(
            {
              commitSha: getBuildCommitSha(),
              version: plannerVersion,
            },
            null,
            2,
          )}\n`,
          type: 'asset',
        })
      },
    },
  ],
  server: {
    watch: {
      ignored: [
        '**/.cache/**',
        '**/.netlify/**',
        '**/dist/**',
        '**/netlify/generated-edge-functions/**',
        '**/playwright-report/**',
        '**/public/game-icons-staging/**',
        '**/test-results/**',
      ],
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    setupFiles: ['./vitest.setup.ts'],
  },
})
