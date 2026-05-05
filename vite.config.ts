import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { normalizePath, type Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import { injectRootSeoIntoHtml } from './src/lib/seo-metadata'

const commitShaPattern = /^[0-9a-f]{7,40}$/i
const packageJsonUrl = new URL('./package.json', import.meta.url)
const packageJsonPath = normalizePath(fileURLToPath(packageJsonUrl))
const plannerVersionVirtualModuleId = 'virtual:planner-version'
const resolvedPlannerVersionVirtualModuleId = `\0${plannerVersionVirtualModuleId}`

function readPlannerVersion(): string {
  const packageJson = JSON.parse(readFileSync(packageJsonUrl, 'utf8')) as { version?: unknown }
  const plannerVersion = packageJson.version

  if (typeof plannerVersion !== 'string' || plannerVersion.length === 0) {
    throw new Error('package.json must define a non-empty version string.')
  }

  return plannerVersion
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

function createPlannerVersionPlugin(): Plugin {
  return {
    name: 'battle-brothers-planner-version',
    configureServer(server) {
      server.watcher.add(packageJsonPath)
    },
    buildStart() {
      this.addWatchFile(packageJsonPath)
    },
    resolveId(id) {
      return id === plannerVersionVirtualModuleId ? resolvedPlannerVersionVirtualModuleId : null
    },
    load(id) {
      if (id !== resolvedPlannerVersionVirtualModuleId) {
        return null
      }

      return `export const plannerVersion = ${JSON.stringify(readPlannerVersion())};\n`
    },
    handleHotUpdate({ file, server }) {
      if (normalizePath(file) !== packageJsonPath) {
        return
      }

      const plannerVersionModule = server.moduleGraph.getModuleById(
        resolvedPlannerVersionVirtualModuleId,
      )

      if (plannerVersionModule) {
        server.moduleGraph.invalidateModule(plannerVersionModule)
      }

      server.ws.send({ type: 'full-reload' })

      return []
    },
  }
}

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 2500,
    sourcemap: true,
  },
  plugins: [
    react(),
    createPlannerVersionPlugin(),
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
              version: readPlannerVersion(),
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
