import type { LegendsPerksDataset } from '../src/types/legends-perks'

export const defaultReferenceRootDirectoryPath: string

export type LegendsImporterWarning = {
  errorMessage: string
  kind: 'parse-warning'
  message: string
  parserContext: string
  source: string
  sourceFilePath: string | null
}

export type LegendsImporterDiagnostics = {
  warnings: LegendsImporterWarning[]
}

export function createImporterDiagnostics(): LegendsImporterDiagnostics

export function createDataset(
  referenceRootDirectoryPath?: string,
  options?: { diagnostics?: LegendsImporterDiagnostics | null; referenceVersion?: string },
): Promise<LegendsPerksDataset>

export function writeDatasetFile(
  dataset: LegendsPerksDataset,
  outputDirectoryPath?: string,
): Promise<void>
