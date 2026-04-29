import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { injectRootSeoIntoHtml } from './src/lib/seo-metadata'

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version?: unknown }
const plannerVersion = packageJson.version

if (typeof plannerVersion !== 'string' || plannerVersion.length === 0) {
  throw new Error('package.json must define a non-empty version string.')
}

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 2500,
  },
  define: {
    __PLANNER_VERSION__: JSON.stringify(plannerVersion),
  },
  plugins: [
    react(),
    {
      name: 'battle-brothers-root-seo',
      transformIndexHtml(html) {
        return injectRootSeoIntoHtml(html)
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
