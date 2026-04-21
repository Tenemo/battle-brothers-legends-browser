import type { LegendsPerksDataset } from '../src/types/legends-perks'

export function collectRequiredGameIconPaths(dataset: LegendsPerksDataset): string[]

export function getArchiveEntryPathFromIconPath(iconPath: string): string

export function buildIconExtractionPlan(
  iconPaths: string[],
  archiveEntriesByArchivePath: Map<string, Set<string>>,
): {
  entriesByArchivePath: Map<string, string[]>
  missingIconPaths: string[]
}

export function findBattleBrothersGameDirectoryPath(
  requestedGameDirectoryPath?: string | null,
): Promise<string | null>

export function syncLegendsIcons(options?: {
  dataset?: LegendsPerksDataset | null
  datasetFilePath?: string
  gameDirectoryPath?: string | null
  outputDirectoryPath?: string
}): Promise<{
  archivePaths: string[]
  extractedIconCount: number
  gameDirectoryPath: string
  missingIconPaths: string[]
  outputDirectoryPath: string
}>
