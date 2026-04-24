import type { LegendsPerksDataset, LegendsTechnicalNameMappings } from '../src/types/legends-perks'

export const defaultReferenceRootDirectoryPath: string

export function createDataset(
  referenceRootDirectoryPath?: string,
  options?: { referenceVersion?: string },
): Promise<LegendsPerksDataset>

export function createTechnicalNameMappings(
  dataset: LegendsPerksDataset,
): LegendsTechnicalNameMappings

export function writeDatasetFile(
  dataset: LegendsPerksDataset,
  outputFilePath?: string,
): Promise<void>

export function writeTechnicalNameMappingsFile(
  technicalNameMappings: LegendsTechnicalNameMappings,
  outputFilePath?: string,
): Promise<void>
