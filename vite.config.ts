import { createReadStream, readFileSync, statSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { normalizePath, type Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import { injectRootSeoIntoHtml } from './src/lib/seo-metadata'

const commitShaPattern = /^[0-9a-f]{7,40}$/i
const packageJsonUrl = new URL('./package.json', import.meta.url)
const packageJsonPath = normalizePath(fileURLToPath(packageJsonUrl))
const publicDirectoryPath = fileURLToPath(new URL('./public/', import.meta.url))
const plannerVersionVirtualModuleId = 'virtual:planner-version'
const resolvedPlannerVersionVirtualModuleId = `\0${plannerVersionVirtualModuleId}`
const localImageContentTypes = new Map([
  ['.gif', 'image/gif'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
])

type MiddlewareNext = (error?: unknown) => void

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

function shouldEmitBuildSourcemaps(): boolean {
  return process.env.BUILD_SOURCEMAPS === 'true'
}

function shouldUseNetlifyImageCdn(): boolean {
  return process.env.NETLIFY === 'true' || process.env.USE_NETLIFY_IMAGE_CDN === 'true'
}

function createBuildChunkName(id: string): string | undefined {
  if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) {
    return 'react-vendor'
  }

  if (id.includes('/node_modules/scheduler/')) {
    return 'react-vendor'
  }

  if (id.includes('/node_modules/lucide-react/')) {
    return 'icon-vendor'
  }

  if (
    id.endsWith('/src/data/legends-perk-catalog.json') ||
    id.endsWith('/src/data/legends-planner-metadata.json')
  ) {
    return 'planner-data'
  }

  return undefined
}

function getLocalNetlifyImageFilePath(requestUrl: string | undefined): string | null {
  if (!requestUrl) {
    return null
  }

  const imageRequestUrl = new URL(requestUrl, 'http://localhost')
  const sourceImageUrl = imageRequestUrl.searchParams.get('url')

  if (!sourceImageUrl?.startsWith('/')) {
    return null
  }

  const sourceImagePath = new URL(sourceImageUrl, 'http://localhost').pathname
  const resolvedImagePath = path.resolve(publicDirectoryPath, sourceImagePath.replace(/^\/+/u, ''))
  const normalizedPublicDirectoryPath = path.resolve(publicDirectoryPath)

  if (
    resolvedImagePath !== normalizedPublicDirectoryPath &&
    !resolvedImagePath.startsWith(`${normalizedPublicDirectoryPath}${path.sep}`)
  ) {
    return null
  }

  return resolvedImagePath
}

function serveLocalNetlifyImage(
  request: IncomingMessage,
  response: ServerResponse,
  next: MiddlewareNext,
) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    next()
    return
  }

  const imageFilePath = getLocalNetlifyImageFilePath(request.url)

  if (!imageFilePath) {
    next()
    return
  }

  let imageFileStat: ReturnType<typeof statSync>

  try {
    imageFileStat = statSync(imageFilePath)
  } catch {
    next()
    return
  }

  if (!imageFileStat.isFile()) {
    next()
    return
  }

  response.statusCode = 200
  response.setHeader(
    'Content-Type',
    localImageContentTypes.get(path.extname(imageFilePath).toLowerCase()) ??
      'application/octet-stream',
  )
  response.setHeader('Content-Length', String(imageFileStat.size))
  response.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')

  if (request.method === 'HEAD') {
    response.end()
    return
  }

  const imageFileStream = createReadStream(imageFilePath)

  imageFileStream.on('error', (error) => {
    if (!response.headersSent) {
      next(error)
      return
    }

    response.destroy(error)
  })
  imageFileStream.pipe(response)
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

function createLocalNetlifyImageCdnPlugin(): Plugin {
  return {
    name: 'battle-brothers-local-netlify-image-cdn',
    configurePreviewServer(server) {
      server.middlewares.use('/.netlify/images', serveLocalNetlifyImage)
    },
    configureServer(server) {
      server.middlewares.use('/.netlify/images', serveLocalNetlifyImage)
    },
  }
}

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks: createBuildChunkName,
      },
    },
    sourcemap: shouldEmitBuildSourcemaps(),
  },
  define: {
    'import.meta.env.VITE_PLANNER_VERSION': JSON.stringify(readPlannerVersion()),
    'import.meta.env.VITE_USE_NETLIFY_IMAGE_CDN': JSON.stringify(shouldUseNetlifyImageCdn()),
  },
  plugins: [
    react(),
    createPlannerVersionPlugin(),
    createLocalNetlifyImageCdnPlugin(),
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
