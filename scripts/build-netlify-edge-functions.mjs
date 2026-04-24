import { rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { build } from 'esbuild'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRootDirectoryPath = path.resolve(__dirname, '..')
const edgeFunctionOutputDirectoryPath = path.join(
  projectRootDirectoryPath,
  'netlify',
  'generated-edge-functions',
)

await rm(edgeFunctionOutputDirectoryPath, {
  force: true,
  recursive: true,
})

await build({
  absWorkingDir: projectRootDirectoryPath,
  bundle: true,
  entryNames: '[name]',
  entryPoints: ['netlify/edge-functions/build-seo.ts'],
  format: 'esm',
  legalComments: 'none',
  logLevel: 'info',
  outdir: edgeFunctionOutputDirectoryPath,
  platform: 'neutral',
  target: 'es2023',
})
