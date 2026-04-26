import type { LegendsPerksDataset } from '../src/types/legends-perks'

export const defaultReferenceRootDirectoryPath: string

export function createDataset(
  referenceRootDirectoryPath?: string,
  options?: { referenceVersion?: string },
): Promise<LegendsPerksDataset>

export function writeDatasetFile(
  dataset: LegendsPerksDataset,
  outputFilePath?: string,
): Promise<void>
