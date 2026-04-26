export type LegendsReferenceMetadata = {
  archiveDownloadUrl: string
  cacheFallbackReason?: string
  cachedAt: string
  githubRepository: string
  publishedAt: string
  referenceRootDirectoryPath: string
  releasePageUrl: string
  tagName: string
}

export const defaultLegendsGithubApiBaseUrl: string
export const defaultLegendsGithubRepository: string
export const defaultLegendsReferenceCacheDirectoryPath: string
export const defaultLegendsReferenceDirectoryPath: string
export const defaultLegendsReferenceMetadataFilePath: string

export function getLatestReleaseApiUrl(options?: {
  githubApiBaseUrl?: string
  githubRepository?: string
  requestedTagName?: string | null
}): string

export function findModLegendsDirectory(rootDirectoryPath: string): Promise<string | null>

export function readCachedLegendsReferenceMetadata(
  metadataFilePath?: string,
): Promise<LegendsReferenceMetadata | null>

export function fetchLatestLegendsReleaseDescriptor(options?: {
  fetchImpl?: typeof fetch
  githubApiBaseUrl?: string
  githubRepository?: string
  requestedTagName?: string | null
}): Promise<{
  archiveDownloadUrl: string
  publishedAt: string
  releasePageUrl: string
  tagName: string
}>

export function ensureLatestLegendsReference(options?: {
  cacheDirectoryPath?: string
  downloadArchiveImpl?: (
    downloadUrl: string,
    archiveFilePath: string,
    fetchImpl: typeof fetch,
  ) => Promise<void>
  extractArchiveImpl?: (archiveFilePath: string, extractionDirectoryPath: string) => Promise<void>
  fetchImpl?: typeof fetch
  githubApiBaseUrl?: string
  githubRepository?: string
  requestedTagName?: string | null
}): Promise<LegendsReferenceMetadata>
