import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { format, resolveConfig } from 'prettier'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRootDirectoryPath = path.resolve(__dirname, '..')
const sourceDatasetPath = path.join(
  projectRootDirectoryPath,
  'src',
  'data',
  'legends-background-fit.json',
)
const generatedDataPath = path.join(
  projectRootDirectoryPath,
  'src',
  'data',
  'build-share-seo-data.generated.ts',
)

type BuildShareSeoPerkRecord = {
  id: string
  perkName: string
}

type BuildShareSeoData = {
  perks: BuildShareSeoPerkRecord[]
  referenceVersion: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Expected ${fieldName} to be a non-empty string.`)
  }

  return value
}

function readPerkRecord(value: unknown, index: number): BuildShareSeoPerkRecord {
  if (!isRecord(value)) {
    throw new Error(`Expected perks[${index}] to be an object.`)
  }

  return {
    id: readRequiredString(value.id, `perks[${index}].id`),
    perkName: readRequiredString(value.perkName, `perks[${index}].perkName`),
  }
}

function escapeNonAsciiInSource(source: string): string {
  let escapedSource = ''

  for (const character of source) {
    const codePoint = character.codePointAt(0)

    if (codePoint === undefined) {
      escapedSource += character
      continue
    }

    if (codePoint <= 0x7f) {
      escapedSource += character
      continue
    }

    escapedSource +=
      codePoint <= 0xffff
        ? `\\u${codePoint.toString(16).padStart(4, '0')}`
        : `\\u{${codePoint.toString(16)}}`
  }

  return escapedSource
}

async function readBuildShareSeoData(): Promise<BuildShareSeoData> {
  const dataset = JSON.parse(await readFile(sourceDatasetPath, 'utf8')) as unknown

  if (!isRecord(dataset)) {
    throw new Error('Expected legends background fit dataset to be an object.')
  }

  if (!Array.isArray(dataset.perks)) {
    throw new Error('Expected legends background fit dataset perks to be an array.')
  }

  return {
    perks: dataset.perks.map(readPerkRecord),
    referenceVersion: readRequiredString(dataset.referenceVersion, 'referenceVersion'),
  }
}

async function createGeneratedSource(data: BuildShareSeoData): Promise<string> {
  const serializedData = escapeNonAsciiInSource(JSON.stringify(data, null, 2))
  const prettierOptions = await resolveConfig(generatedDataPath)

  return format(
    `type BuildShareSeoPerkRecord = {
  id: string
  perkName: string
}

type BuildShareSeoData = {
  perks: BuildShareSeoPerkRecord[]
  referenceVersion: string
}

export const buildShareSeoData = ${serializedData} satisfies BuildShareSeoData

export type { BuildShareSeoPerkRecord }
`,
    {
      ...prettierOptions,
      parser: 'typescript',
    },
  )
}

export async function generateBuildShareSeoData(): Promise<{
  path: string
  perkCount: number
  referenceVersion: string
}> {
  const data = await readBuildShareSeoData()

  await mkdir(path.dirname(generatedDataPath), {
    recursive: true,
  })
  await writeFile(generatedDataPath, await createGeneratedSource(data))

  return {
    path: generatedDataPath,
    perkCount: data.perks.length,
    referenceVersion: data.referenceVersion,
  }
}

const entryPointPath = process.argv[1]

if (entryPointPath && import.meta.url === pathToFileURL(entryPointPath).href) {
  const result = await generateBuildShareSeoData()

  console.log(
    `Generated ${path.relative(projectRootDirectoryPath, result.path)} for ${result.perkCount} perks from Legends ${result.referenceVersion}.`,
  )
}
